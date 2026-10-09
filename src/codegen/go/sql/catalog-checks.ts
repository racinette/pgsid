import type { CatalogSnapshot, ColumnInfo, DomainInfo, TableInfo } from '../../../catalog/types.js'
import type { Config, GoTypeImport } from '../../../config/schema.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import {
  catalogTemporalType,
  catalogNumericType,
} from '../../../sql-semantics/catalog-check-binder.js'
import { enumLabelOid, enumType } from '../../../sql-semantics/expressions.js'
import { emitEvalBoolExpression } from '../../../sql-semantics/check-expressions.js'
import { portableCheckAtoms } from '../../shared/check-atom-support.js'
import { checkUnknownMessage } from '../../shared/check-diagnostics.js'
import { prepareCheckRustGroup } from '../../shared/check-rust-source.js'
import { transpileCheckRustFiles } from '../../shared/check-rust-transpile.js'
import { go, printGoFile, type GoExpression } from '../ast.js'
import { normalizeGoImports } from '../imports.js'
import { goName } from '../names.js'
import {
  addGoNullImport,
  nullableGoType,
  resolveGoColumnType,
  resolveGoPgType,
  storedGoColumnNotNull,
  storedGoDomainNotNull,
  type GoTypeContext,
} from '../type-mapping.js'
import { goEvalBoolBackend } from './check.js'
import { goCheckInputSource } from './check-inputs.js'
import { goSqlBackend } from './registry.js'
import { goSqlRuntime } from './runtime.js'

export function renderGoSchemaChecks(
  tables: readonly TableInfo[],
  packageName: string,
  domains: readonly DomainInfo[] = [],
  selectedDomains: readonly DomainInfo[] = domains,
  catalog: CatalogSnapshot,
  config: Config,
  context?: GoTypeContext,
): string {
  return renderGoSchemaCheckArtifacts(
    tables,
    packageName,
    domains,
    selectedDomains,
    catalog,
    config,
    context,
    undefined,
    false,
  ).checks
}

export function renderGoSchemaCheckArtifacts(
  tables: readonly TableInfo[],
  packageName: string,
  domains: readonly DomainInfo[],
  selectedDomains: readonly DomainInfo[],
  catalog: CatalogSnapshot,
  config: Config,
  context?: GoTypeContext,
  rustImportPath?: string,
  rust = true,
): {
  checks: string
  rust: string | null
  rustFiles: {
    regex: string
    operations: string
    runtime: string
    language: string
    checks: string
  } | null
} {
  const portableValueType = (name: string, oid: number | undefined): string | null => {
    if (catalogNumericType(name, oid, domains)) return 'NumericValue'
    const type = catalogTemporalType(name, oid, domains)
    return type === 'pg_catalog.date'
      ? 'DateValue'
      : type === 'pg_catalog."timestamp"'
        ? 'TimestampValue'
        : type === 'pg_catalog.timestamptz'
          ? 'TimestamptzValue'
          : null
  }
  const groups = catalogCheckGroups(tables, domains, selectedDomains, catalog.enums)
  if (!groups.length) return { checks: '', rust: null, rustFiles: null }
  const rustGroup = rust
    ? prepareCheckRustGroup(
        groups.flatMap((group) =>
          group.checks.map(({ plan, source }) => ({
            expression: portableCheckAtoms(plan.expression),
            identity: {
              schema: group.source.schema,
              kind: group.kind,
              owner: group.source.name,
              constraint: plan.name,
              declaredOn: { schema: source.schema, owner: source.name },
            },
          })),
        ),
      )
    : null
  if (rustGroup?.source && !rustImportPath)
    throw new Error('Go Rust CHECK module requires an import path')
  let rustIndex = 0
  const row = go.ident('row')
  const inputHelpers = new Set<string>()
  const rustInputAdapters = new Set<string>()
  const callInput = (helper: string, name: string): GoExpression => {
    inputHelpers.add(helper)
    return go.call(go.ident(helper), [go.selector(row, goName(name))])
  }
  const imports: GoTypeImport[] = []
  const schemaTypes = Boolean(config.sql.codegen?.go?.schema && context)
  const typeConfig: Config =
    !schemaTypes && config.sql.codegen?.go
      ? {
          ...config,
          sql: {
            ...config.sql,
            codegen: {
              ...config.sql.codegen,
              go: { ...config.sql.codegen.go, domains: false },
            },
          },
        }
      : config
  const groupInputs = groups.map((group) => {
    const table =
      group.kind === 'table'
        ? tables.find(
            (item) => item.schema === group.source.schema && item.name === group.source.name,
          )
        : undefined
    const domain =
      group.kind === 'domain'
        ? selectedDomains.find(
            (item) => item.schema === group.source.schema && item.name === group.source.name,
          )
        : undefined
    const columns: readonly ColumnInfo[] = table?.columns ?? []
    const fields = table
      ? columns.map((column) => {
          const portable = portableValueType(column.typeName, column.typeOid)
          if (rustGroup?.source && portable)
            return {
              names: [goName(column.name)],
              type: go.index(
                go.ident('CheckOptional'),
                go.selector(go.ident('checkruntime'), portable),
              ),
            }
          const resolved = schemaTypes
            ? resolveGoColumnType(table.schema, table.name, column, catalog, config, context)
            : resolveGoPgType(column.typeName, typeConfig, catalog, table.schema, column.typeOid)
          imports.push(...resolved.imports)
          const type = nullableGoType(resolved.type, storedGoColumnNotNull(column, catalog), config)
          addGoNullImport(imports, config, context, type)
          return { names: [goName(column.name)], type: go.index(go.ident('CheckOptional'), type) }
        })
      : domain
        ? (() => {
            const portable = portableValueType(domain.baseTypeName, domain.baseTypeOid)
            if (rustGroup?.source && portable)
              return [
                {
                  names: ['Value'],
                  type: go.index(
                    go.ident('CheckOptional'),
                    go.selector(go.ident('checkruntime'), portable),
                  ),
                },
              ]
            const resolved = resolveGoPgType(
              `${domain.schema}.${domain.name}`,
              typeConfig,
              catalog,
              domain.schema,
              domain.oid,
              schemaTypes ? context : undefined,
            )
            imports.push(...resolved.imports)
            const type = nullableGoType(
              resolved.type,
              storedGoDomainNotNull(domain, catalog),
              config,
            )
            addGoNullImport(imports, config, context, type)
            return [{ names: ['Value'], type: go.index(go.ident('CheckOptional'), type) }]
          })()
        : []
    return { ...group, fields, inputType: `${goName(group.name)}CheckInput` }
  })
  const inputHelper = (type: string): [string, string] | null => {
    if (type === 'pg_catalog.bool') return ['checkInputBoolean', 'SqlBoolean']
    if (/^pg_catalog\.int[248]$/u.test(type)) return ['checkInputInteger', 'SqlInteger']
    if (/^pg_catalog\.float[48]$/u.test(type)) return ['checkInputFloat', 'SqlFloat']
    if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type))
      return ['checkInputText', 'SqlText']
    return null
  }
  const backend = {
    ...goEvalBoolBackend,
    guardInputs: (names: readonly string[], expression: GoExpression): GoExpression =>
      go.call({
        kind: 'function-literal',
        parameters: [],
        results: [{ type: go.ident('EvalBool') }],
        body: [
          ...names.map((name) =>
            go.if(go.notEqual(callInput('checkTextKnown', name), go.ident('true')), [
              go.return(go.call(go.ident('evalBoolUncertain'))),
            ]),
          ),
          go.return(expression),
        ],
      }),
  }
  const emitted = groupInputs.map((group) => ({
    ...group,
    results: group.checks.map(({ plan }) => {
      const prepared = rustGroup?.checks[rustIndex++]
      const unknownMessage = checkUnknownMessage(
        plan.expression,
        prepared?.kind === 'unsupported' ? prepared.reason : undefined,
      )
      if (prepared?.kind === 'supported') {
        const arguments_ = prepared.inputs.map((item) => {
          if (
            ![
              'Int2Value',
              'Int4Value',
              'Int8Value',
              'NetworkValue',
              'UuidValue',
              'MacaddrValue',
              'Macaddr8Value',
              'ByteaValue',
              'BitValue',
              'NumericValue',
              'DateValue',
              'TimestampValue',
              'TimestamptzValue',
              'EnumValue',
              'TextValue',
              'BoolValue',
            ].includes(item.rustType)
          )
            throw new Error(`Unsupported Go Rust CHECK input: ${item.rustType}`)
          const helper =
            item.rustType === 'BitValue'
              ? 'checkRustBit'
              : item.rustType === 'UuidValue'
                ? 'checkRustUuid'
                : item.rustType === 'ByteaValue'
                  ? 'checkRustBytea'
                  : item.rustType === 'MacaddrValue'
                    ? 'checkRustMacaddr'
                    : item.rustType === 'Macaddr8Value'
                      ? 'checkRustMacaddr8'
                      : item.rustType === 'NetworkValue'
                        ? 'checkRustNetwork'
                        : item.rustType === 'NumericValue'
                          ? 'checkRustNumeric'
                          : item.rustType === 'DateValue'
                            ? 'checkRustDate'
                            : item.rustType === 'TimestampValue'
                              ? 'checkRustTimestamp'
                              : item.rustType === 'TimestamptzValue'
                                ? 'checkRustTimestamptz'
                                : item.nullness
                                  ? 'checkRustNullness'
                                  : item.enum
                                    ? 'checkRustEnum'
                                    : item.rustType === 'Int2Value'
                                      ? 'checkRustInt2'
                                      : item.rustType === 'Int4Value'
                                        ? 'checkRustInt4'
                                        : item.rustType === 'Int8Value'
                                          ? 'checkRustInt8'
                                          : item.rustType === 'TextValue' ||
                                              item.rustType === 'NetworkValue'
                                            ? 'checkRustText'
                                            : 'checkRustBool'
          rustInputAdapters.add(helper)
          if (item.rustType === 'ByteaValue') inputHelpers.add('checkPrimitive')
          if (
            item.rustType !== 'ByteaValue' &&
            item.rustType !== 'NumericValue' &&
            item.rustType !== 'DateValue' &&
            item.rustType !== 'TimestampValue' &&
            item.rustType !== 'TimestamptzValue'
          )
            inputHelpers.add(
              item.nullness
                ? 'checkInputNullness'
                : item.rustType === 'Int2Value' ||
                    item.rustType === 'Int4Value' ||
                    item.rustType === 'Int8Value'
                  ? 'checkInputInteger'
                  : item.rustType === 'TextValue' ||
                      item.rustType === 'NetworkValue' ||
                      item.rustType === 'UuidValue' ||
                      item.rustType === 'BitValue' ||
                      item.rustType === 'MacaddrValue' ||
                      item.rustType === 'Macaddr8Value'
                    ? 'checkInputText'
                    : item.enum
                      ? 'checkInputText'
                      : 'checkInputBoolean',
            )
          return go.call(go.ident(helper), [
            go.selector(row, goName(item.name)),
            ...(item.enum
              ? [
                  go.composite(
                    go.slice(go.ident('string')),
                    item.enum.values.map((label) => go.string(label)),
                  ),
                  go.composite(
                    go.slice(go.ident('int64')),
                    item.enum.values.map((_, ordinal) =>
                      go.number(enumLabelOid(item.enum!, ordinal) ?? 0),
                    ),
                  ),
                ]
              : []),
          ])
        })
        return {
          value: {
            expression: go.call(go.ident('checkRustOutcome'), [
              go.call(
                go.selector(
                  go.ident('checkrust'),
                  prepared.entryName.replace(/(^|_)([a-z0-9])/gu, (_, _separator, part: string) =>
                    part.toUpperCase(),
                  ),
                ),
                arguments_,
              ),
            ]),
          },
          helpers: ['evalBoolCertain', 'evalBoolUncertain'],
          unknownMessage,
        }
      }
      const result = emitEvalBoolExpression(
        portableCheckAtoms(plan.expression),
        { ...goSqlBackend, input: (name) => callInput('checkTextValue', name) },
        {
          ...backend,
          scalar: {
            ...backend.scalar,
            inputNullTest: (name, negated) => {
              const expression = callInput('checkInputNullness', name)
              return negated
                ? backend.scalar.logic('not', [
                    { type: 'pg_catalog.bool', expression, effect: 'partial' },
                  ])
                : { expression, helpers: ['EvalValue', 'SqlBoolean'] }
            },
            input: (type, name, definition) => {
              if (definition) {
                inputHelpers.add('checkInputEnum')
                return {
                  expression: go.call(go.ident('checkInputEnum'), [
                    go.selector(row, goName(name)),
                    go.string(enumType(definition)),
                    go.composite(
                      go.slice(go.ident('string')),
                      definition.values.map((label) => go.string(label)),
                    ),
                  ]),
                  helpers: ['EvalValue', 'SqlEnum', 'enumInput'],
                }
              }
              if (
                type === 'pg_catalog."numeric"' ||
                type === 'pg_catalog."bit"' ||
                type === 'pg_catalog.varbit' ||
                type === 'pg_catalog.uuid' ||
                type === 'pg_catalog.date' ||
                type === 'pg_catalog."timestamp"' ||
                type === 'pg_catalog.timestamptz'
              )
                return backend.scalar.uncertain(type)
              const helper = inputHelper(type)
              if (!helper) throw new Error(`Unsupported CHECK input type: ${type}`)
              return {
                expression: callInput(helper[0], name),
                helpers: ['EvalValue', helper[1]],
              }
            },
          },
        },
      )
      return { ...result, unknownMessage }
    }),
  }))
  const resultType = go.ident('CheckEvaluation')
  const inputSource = goCheckInputSource(inputHelpers)
  if (inputSource.reflect) imports.push({ path: 'reflect' })
  const rustFiles = rustGroup?.source
    ? (Object.fromEntries(
        Object.entries(
          transpileCheckRustFiles(rustGroup.source, `${rustImportPath}/checkrust/pg_catalog`).go,
        ).map(([name, source]) => [
          name,
          name === 'checks' ? source.replace(/^package generated\b/u, 'package checkrust') : source,
        ]),
      ) as { regex: string; operations: string; runtime: string; language: string; checks: string })
    : null
  return {
    checks: printGoFile({
      package: packageName,
      imports: normalizeGoImports([
        ...imports,
        ...(rustGroup?.source ? [{ path: 'strconv' }, { path: 'strings' }] : []),
        ...(rustGroup?.source ? [{ path: `${rustImportPath}/checkrust`, as: 'checkrust' }] : []),
        ...(rustGroup?.source
          ? [{ path: `${rustImportPath}/checkrust/checkruntime`, as: 'checkruntime' }]
          : []),
      ]),
      source: `${goSqlRuntime([...inputSource.runtime, ...emitted.flatMap((group) => group.results.flatMap((result) => result.helpers))], packageName)}
type CheckOptional[T any] struct { V T; Set bool; Null bool }
func KnownCheckValue[T any](value T) CheckOptional[T] { return CheckOptional[T]{V: value, Set: true} }
func NullCheckValue[T any]() CheckOptional[T] { return CheckOptional[T]{Set: true, Null: true} }

${inputSource.source}

${
  rustGroup?.source
    ? goRustAdapterSource
        .split(/(?=^func )/mu)
        .filter((source) => {
          const name = /^func ([a-zA-Z0-9]+)/u.exec(source)?.[1]
          return (
            name &&
            (rustInputAdapters.has(name) ||
              name === 'checkRustState' ||
              name === 'checkRustOutcome')
          )
        })
        .join('')
    : ''
}

type CheckViolationError struct { Owner, Constraint string }
func (e *CheckViolationError) Error() string {
  return "new row violates check constraint " + e.Constraint
}
func (e *CheckViolationError) SQLState() string { return "23514" }

type CheckEvaluationError struct { Owner, Constraint, State, Message string }
func (e *CheckEvaluationError) Error() string {
  return "check constraint " + e.Constraint + " evaluation failed: " + e.Message + " (SQLSTATE " + e.State + ")"
}
func (e *CheckEvaluationError) SQLState() string { return e.State }

func ValidateCheckInputs[T any](input T, evaluate func(T) []CheckEvaluation) error {
  for _, check := range evaluate(input) {
    if !check.Result.Certain { continue }
    value := check.Result.Value
    if value.Error != "" {
      return &CheckEvaluationError{Owner: check.Owner, Constraint: check.Constraint, State: value.Error, Message: check.Message}
    }
    if value.Valid && !value.Value {
      return &CheckViolationError{Owner: check.Owner, Constraint: check.Constraint}
    }
  }
  return nil
}
func checkEvaluation(owner, constraint string, result EvalBool, unknownMessage string) CheckEvaluation {
  evaluation := CheckEvaluation{Owner: owner, Constraint: constraint, Result: result}
  if !result.Certain { evaluation.Message = unknownMessage }
  if result.Certain && result.Value.Error != "" {
    evaluation.Message = "SQL evaluation failed (SQLSTATE " + result.Value.Error + ")"
    ${rustGroup?.source ? 'if state, valid := checkRustState(result.Value.Error); valid { evaluation.Message = checkruntime.SqlErrorMessage(state).Message }' : ''}
  }
  return evaluation
}`,
      declarations: [
        ...emitted.map(({ inputType, fields }) => go.type(inputType, go.struct(fields))),
        go.type(
          'CheckEvaluation',
          go.struct([
            { names: ['Owner'], type: go.ident('string') },
            { names: ['Constraint'], type: go.ident('string') },
            { names: ['Result'], type: go.ident('EvalBool') },
            { names: ['Message'], type: go.ident('string') },
          ]),
        ),
        ...emitted.map(({ name, kind, checks, results, inputType }) =>
          go.function(
            `Evaluate${goName(name)}${kind === 'domain' ? 'DomainChecks' : 'Checks'}`,
            [{ names: ['row'], type: go.ident(inputType) }],
            [{ type: go.slice(resultType) }],
            [
              go.return(
                go.composite(
                  go.slice(resultType),
                  results.map((result, index) =>
                    go.call(go.ident('checkEvaluation'), [
                      go.string(checks[index]!.owner),
                      go.string(checks[index]!.plan.name),
                      result.value.expression,
                      go.string(result.unknownMessage),
                    ]),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    }),
    rust: rustFiles?.checks ?? null,
    rustFiles,
  }
}

const goRustAdapterSource = `func checkRustTimestamp[T any](field CheckOptional[T]) checkruntime.TimestampValue {
  if !field.Set { return checkruntime.TimestampUnknown() }
  if field.Null { return checkruntime.TimestampNull() }
  if value, ok := any(field.V).(checkruntime.TimestampValue); ok { return value }
  return checkruntime.TimestampUnknown()
}
func checkRustTimestamptz[T any](field CheckOptional[T]) checkruntime.TimestamptzValue {
  if !field.Set { return checkruntime.TimestamptzUnknown() }
  if field.Null { return checkruntime.TimestamptzNull() }
  if value, ok := any(field.V).(checkruntime.TimestamptzValue); ok { return value }
  return checkruntime.TimestamptzUnknown()
}
func checkRustBit[T any](field CheckOptional[T]) checkruntime.BitValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.BitUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.BitValue{Kind: checkruntime.BitValueError, Error: state}
    }
    return checkruntime.BitUnknown()
  }
  if !value.Value.Valid { return checkruntime.BitNull() }
  return checkruntime.MakeBitValue(value.Value.Value)
}
func checkRustBytea[T any](field CheckOptional[T]) checkruntime.ByteaValue {
  if !field.Set { return checkruntime.ByteaUnknown() }
  if field.Null { return checkruntime.ByteaNull() }
  if value, ok := any(field.V).(checkruntime.ByteaValue); ok { return value }
  raw := any(field.V)
  if primitive, ok := checkPrimitive(raw); ok { raw = primitive }
  if raw == nil { return checkruntime.ByteaNull() }
  if bytes, ok := raw.([]byte); ok {
    const digits = "0123456789abcdef"
    hex := make([]byte, len(bytes) * 2)
    for index, value := range bytes { hex[index * 2] = digits[value / 16]; hex[index * 2 + 1] = digits[value % 16] }
    return checkruntime.MakeByteaValue(string(hex))
  }
  return checkruntime.ByteaUnknown()
}
func checkRustNetwork[T any](field CheckOptional[T]) checkruntime.NetworkValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.NetworkUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.NetworkValue{Kind: checkruntime.NetworkValueError, Error: state}
    }
    return checkruntime.NetworkUnknown()
  }
  if !value.Value.Valid { return checkruntime.NetworkNull() }
  return checkruntime.MakeNetworkValue(value.Value.Value)
}
func checkRustUuid[T any](field CheckOptional[T]) checkruntime.UuidValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.UuidUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.UuidValue{Kind: checkruntime.UuidValueError, Error: state}
    }
    return checkruntime.UuidUnknown()
  }
  if !value.Value.Valid { return checkruntime.UuidNull() }
  return checkruntime.MakeUuidValue(value.Value.Value)
}
func checkRustMacaddr[T any](field CheckOptional[T]) checkruntime.MacaddrValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.MacaddrUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.MacaddrValue{Kind: checkruntime.MacaddrValueError, Error: state}
    }
    return checkruntime.MacaddrUnknown()
  }
  if !value.Value.Valid { return checkruntime.MacaddrNull() }
  return checkruntime.MakeMacaddrValue(value.Value.Value)
}
func checkRustMacaddr8[T any](field CheckOptional[T]) checkruntime.Macaddr8Value {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.Macaddr8Unknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.Macaddr8Value{Kind: checkruntime.Macaddr8ValueError, Error: state}
    }
    return checkruntime.Macaddr8Unknown()
  }
  if !value.Value.Valid { return checkruntime.Macaddr8Null() }
  return checkruntime.MakeMacaddr8Value(value.Value.Value)
}
func checkRustNumeric[T any](field CheckOptional[T]) checkruntime.NumericValue {
  if !field.Set { return checkruntime.NumericUnknown() }
  if field.Null { return checkruntime.NumericNull() }
  if value, ok := any(field.V).(checkruntime.NumericValue); ok {
    if value.Kind == checkruntime.NumericValueValue { return checkruntime.MakeNumericValue(value.Value) }
    return value
  }
  if value, ok := any(field.V).(string); ok { return checkruntime.MakeNumericValue(value) }
  return checkruntime.NumericUnknown()
}
func checkRustDate[T any](field CheckOptional[T]) checkruntime.DateValue {
  if !field.Set { return checkruntime.DateUnknown() }
  if field.Null { return checkruntime.DateNull() }
  if value, ok := any(field.V).(checkruntime.DateValue); ok { return value }
  return checkruntime.DateUnknown()
}
func checkRustInt2[T any](field CheckOptional[T]) checkruntime.Int2Value {
  value := checkInputInteger(field)
  if !value.Certain { return checkruntime.Int2Unknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.Int2Value{Kind: checkruntime.Int2ValueError, Error: state}
    }
    return checkruntime.Int2Unknown()
  }
  if !value.Value.Valid { return checkruntime.Int2Null() }
  number := value.Value.Value
  if number < -32768 || number > 32767 { return checkruntime.Int2Unknown() }
  return checkruntime.MakeInt2Value(int(number))
}
func checkRustInt4[T any](field CheckOptional[T]) checkruntime.Int4Value {
  value := checkInputInteger(field)
  if !value.Certain { return checkruntime.Int4Unknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.Int4Value{Kind: checkruntime.Int4ValueError, Error: state}
    }
    return checkruntime.Int4Unknown()
  }
  if !value.Value.Valid { return checkruntime.Int4Null() }
  number := value.Value.Value
  if number < -2147483648 || number > 2147483647 { return checkruntime.Int4Unknown() }
  return checkruntime.MakeInt4Value(int(number))
}
func checkRustNullness[T any](field CheckOptional[T]) checkruntime.BoolValue {
  if field.Set && !field.Null {
    if value, ok := any(field.V).(checkruntime.NumericValue); ok {
      if value.Kind == checkruntime.NumericValueValue { return checkruntime.NumericIsNull(checkruntime.MakeNumericValue(value.Value)) }
      return checkruntime.NumericIsNull(value)
    }
    if value, ok := any(field.V).(checkruntime.DateValue); ok { return checkruntime.DateIsNull(value) }
    if value, ok := any(field.V).(checkruntime.TimestampValue); ok { return checkruntime.TimestampIsNull(value) }
    if value, ok := any(field.V).(checkruntime.TimestamptzValue); ok { return checkruntime.TimestamptzIsNull(value) }
  }
  input := checkInputNullness(field)
  if !input.Certain { return checkruntime.BoolUnknown() }
  return checkruntime.MakeBoolValue(input.Value.Value)
}
func checkRustEnum[T any](field CheckOptional[T], labels []string, oids []int64) checkruntime.EnumValue {
  input := checkInputText(field)
  if !input.Certain { return checkruntime.EnumUnknown() }
  if !input.Value.Valid { return checkruntime.EnumNull() }
  for order, label := range labels {
    if label == input.Value.Value {
      if order < len(oids) && oids[order] != 0 { return checkruntime.MakeCatalogEnumValue(order, oids[order]) }
      return checkruntime.MakeEnumValue(order)
    }
  }
  return checkruntime.EnumUnknown()
}
func checkRustInt8[T any](field CheckOptional[T]) checkruntime.Int8Value {
  value := checkInputInteger(field)
  if !value.Certain { return checkruntime.Int8Unknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: state}
    }
    return checkruntime.Int8Unknown()
  }
  if !value.Value.Valid { return checkruntime.Int8Null() }
  return checkruntime.MakeInt8Value(value.Value.Value)
}
func checkRustText[T any](field CheckOptional[T]) checkruntime.TextValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.TextUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.TextValue{Kind: checkruntime.TextValueError, Error: state}
    }
    return checkruntime.TextUnknown()
  }
  if !value.Value.Valid { return checkruntime.TextNull() }
  return checkruntime.MakeTextValue(value.Value.Value)
}
func checkRustBool[T any](field CheckOptional[T]) checkruntime.BoolValue {
  value := checkInputBoolean(field)
  if !value.Certain { return checkruntime.BoolUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkruntime.BoolValue{Kind: checkruntime.BoolValueError, Error: state}
    }
    return checkruntime.BoolUnknown()
  }
  if !value.Value.Valid { return checkruntime.BoolNull() }
  return checkruntime.MakeBoolValue(value.Value.Value)
}
func checkRustState(value string) (checkruntime.SqlError, bool) {
  if len(value) != 5 { return checkruntime.SqlError{}, false }
  state, error := strconv.ParseUint(value, 36, 32)
  if error != nil { return checkruntime.SqlError{}, false }
  return checkruntime.MakeSqlError(int(state)), true
}
func checkRustOutcome(value checkruntime.CheckOutcome) EvalBool {
  switch value.Kind {
  case checkruntime.CheckOutcomeTrue: return evalBoolCertain(SqlBoolean{Value: true, Valid: true})
  case checkruntime.CheckOutcomeFalse: return evalBoolCertain(SqlBoolean{Value: false, Valid: true})
  case checkruntime.CheckOutcomeNull: return evalBoolCertain(SqlBoolean{})
  case checkruntime.CheckOutcomeUnknown: return evalBoolUncertain()
  case checkruntime.CheckOutcomeError:
    state := strings.ToUpper(strconv.FormatInt(int64(value.Error.State), 36))
    for len(state) < 5 { state = "0" + state }
    return evalBoolCertain(SqlBoolean{Error: state})
  }
  panic("invalid Rust CHECK outcome")
}`
