import type { CatalogSnapshot, ColumnInfo, DomainInfo, TableInfo } from '../../../catalog/types.js'
import type { Config, GoTypeImport } from '../../../config/schema.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import { emitEvalBoolExpression } from '../../../sql-semantics/check-expressions.js'
import { portableCheckAtoms } from '../../shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../shared/check-rust-source.js'
import { transpileCheckRust } from '../../shared/check-rust-transpile.js'
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
): { checks: string; rust: string | null } {
  const groups = catalogCheckGroups(tables, domains, selectedDomains)
  if (!groups.length) return { checks: '', rust: null }
  const rustGroup = rust
    ? prepareCheckRustGroup(
        groups.flatMap((group) =>
          group.checks.map(({ plan }) => portableCheckAtoms(plan.expression)),
        ),
      )
    : null
  if (rustGroup?.source && !rustImportPath)
    throw new Error('Go Rust CHECK module requires an import path')
  let rustIndex = 0
  const row = go.ident('row')
  const inputHelpers = new Set<string>()
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
      if (prepared?.kind === 'supported') {
        const arguments_ = prepared.inputs.map((item) => {
          if (!['Int4Value', 'TextValue', 'BoolValue'].includes(item.rustType))
            throw new Error(`Unsupported Go Rust CHECK input: ${item.rustType}`)
          const helper =
            item.rustType === 'Int4Value'
              ? 'checkRustInt4'
              : item.rustType === 'TextValue'
                ? 'checkRustText'
                : 'checkRustBool'
          inputHelpers.add(
            item.rustType === 'Int4Value'
              ? 'checkInputInteger'
              : item.rustType === 'TextValue'
                ? 'checkInputText'
                : 'checkInputBoolean',
          )
          return go.call(go.ident(helper), [go.selector(row, goName(item.name))])
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
        }
      }
      return emitEvalBoolExpression(
        portableCheckAtoms(plan.expression),
        { ...goSqlBackend, input: (name) => callInput('checkTextValue', name) },
        {
          ...backend,
          scalar: {
            ...backend.scalar,
            input: (type, name) => {
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
    }),
  }))
  const resultType = go.ident('CheckEvaluation')
  const inputSource = goCheckInputSource(inputHelpers)
  if (inputSource.reflect) imports.push({ path: 'reflect' })
  return {
    checks: printGoFile({
      package: packageName,
      imports: normalizeGoImports([
        ...imports,
        ...(rustGroup?.source ? [{ path: 'strconv' }, { path: 'strings' }] : []),
        ...(rustGroup?.source ? [{ path: `${rustImportPath}/checkrust`, as: 'checkrust' }] : []),
      ]),
      source: `${goSqlRuntime([...inputSource.runtime, ...emitted.flatMap((group) => group.results.flatMap((result) => result.helpers))], packageName)}
type CheckOptional[T any] struct { V T; Set bool; Null bool }
func KnownCheckValue[T any](value T) CheckOptional[T] { return CheckOptional[T]{V: value, Set: true} }
func NullCheckValue[T any]() CheckOptional[T] { return CheckOptional[T]{Set: true, Null: true} }

${inputSource.source}

${rustGroup?.source ? goRustAdapterSource : ''}

type CheckViolationError struct { Owner, Constraint string }
func (e *CheckViolationError) Error() string {
  return "new row violates check constraint " + e.Constraint
}
func (e *CheckViolationError) SQLState() string { return "23514" }

type CheckEvaluationError struct { Owner, Constraint, State string }
func (e *CheckEvaluationError) Error() string {
  return "check constraint " + e.Constraint + " evaluation failed: " + e.State
}
func (e *CheckEvaluationError) SQLState() string { return e.State }

func ValidateCheckInputs[T any](input T, evaluate func(T) []CheckEvaluation) error {
  for _, check := range evaluate(input) {
    if !check.Result.Certain { continue }
    value := check.Result.Value
    if value.Error != "" {
      return &CheckEvaluationError{Owner: check.Owner, Constraint: check.Constraint, State: value.Error}
    }
    if value.Valid && !value.Value {
      return &CheckViolationError{Owner: check.Owner, Constraint: check.Constraint}
    }
  }
  return nil
}`,
      declarations: [
        ...emitted.map(({ inputType, fields }) => go.type(inputType, go.struct(fields))),
        go.type(
          'CheckEvaluation',
          go.struct([
            { names: ['Owner'], type: go.ident('string') },
            { names: ['Constraint'], type: go.ident('string') },
            { names: ['Result'], type: go.ident('EvalBool') },
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
                    go.composite(resultType, [
                      go.keyValue('Owner', go.string(checks[index]!.owner)),
                      go.keyValue('Constraint', go.string(checks[index]!.plan.name)),
                      go.keyValue('Result', result.value.expression),
                    ]),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    }),
    rust: rustGroup?.source
      ? transpileCheckRust(rustGroup.source).go.replace(
          /^package generated\b/u,
          'package checkrust',
        )
      : null,
  }
}

const goRustAdapterSource = `func checkRustInt4[T any](field CheckOptional[T]) checkrust.Int4Value {
  value := checkInputInteger(field)
  if !value.Certain { return checkrust.Int4Unknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkrust.Int4Value{Kind: checkrust.Int4ValueError, Error: state}
    }
    return checkrust.Int4Unknown()
  }
  if !value.Value.Valid { return checkrust.Int4Null() }
  number := value.Value.Value
  if number < -2147483648 || number > 2147483647 { return checkrust.Int4Unknown() }
  return checkrust.MakeInt4Value(int(number))
}
func checkRustText[T any](field CheckOptional[T]) checkrust.TextValue {
  value := checkInputText(field)
  if !value.Certain { return checkrust.TextUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkrust.TextValue{Kind: checkrust.TextValueError, Error: state}
    }
    return checkrust.TextUnknown()
  }
  if !value.Value.Valid { return checkrust.TextNull() }
  return checkrust.MakeTextValue(value.Value.Value)
}
func checkRustBool[T any](field CheckOptional[T]) checkrust.BoolValue {
  value := checkInputBoolean(field)
  if !value.Certain { return checkrust.BoolUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok {
      return checkrust.BoolValue{Kind: checkrust.BoolValueError, Error: state}
    }
    return checkrust.BoolUnknown()
  }
  if !value.Value.Valid { return checkrust.BoolNull() }
  return checkrust.MakeBoolValue(value.Value.Value)
}
func checkRustState(value string) (checkrust.SqlError, bool) {
  if len(value) != 5 { return checkrust.SqlError{}, false }
  state, error := strconv.ParseUint(value, 36, 32)
  if error != nil { return checkrust.SqlError{}, false }
  return checkrust.MakeSqlError(int(state)), true
}
func checkRustOutcome(value checkrust.CheckOutcome) EvalBool {
  switch value.Kind {
  case checkrust.CheckOutcomeTrue: return evalBoolCertain(SqlBoolean{Value: true, Valid: true})
  case checkrust.CheckOutcomeFalse: return evalBoolCertain(SqlBoolean{Value: false, Valid: true})
  case checkrust.CheckOutcomeNull: return evalBoolCertain(SqlBoolean{})
  case checkrust.CheckOutcomeUnknown: return evalBoolUncertain()
  case checkrust.CheckOutcomeError:
    state := strings.ToUpper(strconv.FormatInt(int64(value.Error.State), 36))
    for len(state) < 5 { state = "0" + state }
    return evalBoolCertain(SqlBoolean{Error: state})
  }
  panic("invalid Rust CHECK outcome")
}`
