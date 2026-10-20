import { builtinMultirangeType } from '../../../postgres/builtins/inventory.js'
import { arrayElementFamily, arrayInputPlan } from '../../shared/check-array-types.js'
import type { CatalogSnapshot, ColumnInfo, DomainInfo, TableInfo } from '../../../catalog/types.js'
import type { Config, GoTypeImport } from '../../../config/schema.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import {
  catalogTemporalType,
  catalogArrayType,
  catalogRangeType,
  catalogMultirangeType,
  catalogNumericType,
  catalogJsonType,
  catalogJsonbType,
  catalogJsonpathType,
  catalogPointType,
  catalogLineType,
  catalogLsegType,
  catalogMoneyType,
  catalogXidType,
  catalogCidType,
  catalogPgLsnType,
  catalogTidType,
  catalogInternalCharType,
  catalogXid8Type,
  catalogSnapshotType,
  catalogOidType,
  catalogPolygonType,
  catalogPathType,
  catalogCircleType,
  catalogBoxType,
} from '../../../sql-semantics/catalog-check-binder.js'
import { enumType, isRangeType, isMultirangeType } from '../../../sql-semantics/expressions.js'
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
    if (catalogArrayType(name, oid, domains, catalog.enums)) return 'ArrayValue'
    if (catalogRangeType(name, oid, domains)) return 'RangeValue'
    if (catalogMultirangeType(name, oid, domains)) return 'MultirangeValue'
    if (catalogJsonType(name, oid, domains)) return 'JsonValue'
    if (catalogJsonbType(name, oid, domains)) return 'JsonbValue'
    if (catalogJsonpathType(name, oid, domains)) return 'JsonpathValue'
    if (catalogNumericType(name, oid, domains)) return 'NumericValue'
    if (catalogPointType(name, oid, domains)) return 'PointValue'
    if (catalogLineType(name, oid, domains)) return 'LineValue'
    if (catalogLsegType(name, oid, domains)) return 'LsegValue'
    if (catalogMoneyType(name, oid, domains)) return 'MoneyValue'
    if (catalogXidType(name, oid, domains)) return 'XidValue'
    if (catalogCidType(name, oid, domains)) return 'CidValue'
    if (catalogPgLsnType(name, oid, domains)) return 'PgLsnValue'
    if (catalogInternalCharType(name, oid, domains)) return 'InternalCharValue'
    if (catalogTidType(name, oid, domains)) return 'TidValue'
    if (catalogXid8Type(name, oid, domains)) return 'Xid8Value'
    if (catalogSnapshotType(name, oid, domains)) return 'SnapshotValue'
    if (catalogOidType(name, oid, domains)) return 'OidValue'
    if (catalogPolygonType(name, oid, domains)) return 'PolygonValue'
    if (catalogPathType(name, oid, domains)) return 'PathValue'
    if (catalogCircleType(name, oid, domains)) return 'CircleValue'
    if (catalogBoxType(name, oid, domains)) return 'BoxValue'
    const type = catalogTemporalType(name, oid, domains)
    return type === 'pg_catalog."time"'
      ? 'TimeValue'
      : type === 'pg_catalog.timetz'
        ? 'TimetzValue'
        : type === 'pg_catalog."interval"'
          ? 'IntervalValue'
          : type === 'pg_catalog.date'
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
        config.sql.codegen?.checks,
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
              'Float4Value',
              'Float8Value',
              'PointValue',
              'LineValue',
              'LsegValue',
              'MoneyValue',
              'XidValue',
              'CidValue',
              'PgLsnValue',
              'TidValue',
              'InternalCharValue',
              'Xid8Value',
              'SnapshotValue',
              'RangeValue',
              'MultirangeValue',
              'JsonValue',
              'JsonbValue',
              'JsonpathValue',
              'ArrayValue',
              'OidValue',
              'PolygonValue',
              'PathValue',
              'CircleValue',
              'BoxValue',
              'NetworkValue',
              'UuidValue',
              'MacaddrValue',
              'Macaddr8Value',
              'ByteaValue',
              'BitValue',
              'NumericValue',
              'TimeValue',
              'TimetzValue',
              'IntervalValue',
              'DateValue',
              'TimestampValue',
              'TimestamptzValue',
              'EnumValue',
              'TextValue',
              'BoolValue',
            ].includes(item.rustType)
          )
            throw new Error(`Unsupported Go Rust CHECK input: ${item.rustType}`)
          const helper = item.type.startsWith('array:')
            ? item.nullness
              ? 'checkRustArrayNullness'
              : 'checkRustArray'
            : item.rustType === 'MultirangeValue'
              ? 'checkRustMultirange'
              : item.rustType === 'RangeValue'
                ? 'checkRustRange'
                : item.rustType === 'JsonpathValue'
                  ? 'checkRustJsonpath'
                  : item.rustType === 'JsonbValue'
                    ? 'checkRustJsonb'
                    : item.rustType === 'JsonValue'
                      ? 'checkRustJson'
                      : item.rustType === 'SnapshotValue'
                        ? 'checkRustSnapshot'
                        : item.type === 'pg_catalog.refcursor' && item.rustType === 'TextValue'
                          ? 'checkRustRefcursor'
                          : item.type === 'pg_catalog.name' && item.rustType === 'TextValue'
                            ? 'checkRustName'
                            : item.rustType === 'InternalCharValue'
                              ? 'checkRustInternalChar'
                              : item.rustType === 'XidValue'
                                ? 'checkRustXid'
                                : item.rustType === 'CidValue'
                                  ? 'checkRustCid'
                                  : item.rustType === 'PgLsnValue'
                                    ? 'checkRustPgLsn'
                                    : item.rustType === 'TidValue'
                                      ? 'checkRustTid'
                                      : item.rustType === 'Xid8Value'
                                        ? 'checkRustXid8'
                                        : item.rustType === 'OidValue'
                                          ? 'checkRustOid'
                                          : item.rustType === 'MoneyValue'
                                            ? 'checkRustMoney'
                                            : item.rustType === 'PolygonValue'
                                              ? 'checkRustPolygon'
                                              : item.rustType === 'PathValue'
                                                ? 'checkRustPath'
                                                : item.rustType === 'CircleValue'
                                                  ? 'checkRustCircle'
                                                  : item.rustType === 'BoxValue'
                                                    ? 'checkRustBox'
                                                    : item.rustType === 'LsegValue'
                                                      ? 'checkRustLseg'
                                                      : item.rustType === 'LineValue'
                                                        ? 'checkRustLine'
                                                        : item.rustType === 'PointValue'
                                                          ? 'checkRustPoint'
                                                          : item.rustType === 'TimeValue'
                                                            ? 'checkRustTime'
                                                            : item.rustType === 'TimetzValue'
                                                              ? 'checkRustTimetz'
                                                              : item.rustType === 'IntervalValue'
                                                                ? 'checkRustInterval'
                                                                : item.rustType === 'Float4Value'
                                                                  ? 'checkRustFloat4'
                                                                  : item.rustType === 'Float8Value'
                                                                    ? 'checkRustFloat8'
                                                                    : item.rustType === 'BitValue'
                                                                      ? 'checkRustBit'
                                                                      : item.rustType ===
                                                                          'UuidValue'
                                                                        ? 'checkRustUuid'
                                                                        : item.rustType ===
                                                                            'ByteaValue'
                                                                          ? 'checkRustBytea'
                                                                          : item.rustType ===
                                                                              'MacaddrValue'
                                                                            ? 'checkRustMacaddr'
                                                                            : item.rustType ===
                                                                                'Macaddr8Value'
                                                                              ? 'checkRustMacaddr8'
                                                                              : item.rustType ===
                                                                                  'NetworkValue'
                                                                                ? 'checkRustNetwork'
                                                                                : item.rustType ===
                                                                                    'NumericValue'
                                                                                  ? 'checkRustNumeric'
                                                                                  : item.rustType ===
                                                                                      'DateValue'
                                                                                    ? 'checkRustDate'
                                                                                    : item.rustType ===
                                                                                        'TimestampValue'
                                                                                      ? 'checkRustTimestamp'
                                                                                      : item.rustType ===
                                                                                          'TimestamptzValue'
                                                                                        ? 'checkRustTimestamptz'
                                                                                        : item.nullness
                                                                                          ? 'checkRustNullness'
                                                                                          : item.enum
                                                                                            ? 'checkRustEnum'
                                                                                            : item.rustType ===
                                                                                                'Int2Value'
                                                                                              ? 'checkRustInt2'
                                                                                              : item.rustType ===
                                                                                                  'Int4Value'
                                                                                                ? 'checkRustInt4'
                                                                                                : item.rustType ===
                                                                                                    'Int8Value'
                                                                                                  ? 'checkRustInt8'
                                                                                                  : item.rustType ===
                                                                                                        'TextValue' ||
                                                                                                      item.rustType ===
                                                                                                        'NetworkValue'
                                                                                                    ? 'checkRustText'
                                                                                                    : 'checkRustBool'
          rustInputAdapters.add(helper)
          if (item.rustType === 'ByteaValue') inputHelpers.add('checkPrimitive')
          if (item.rustType === 'Float4Value' || item.rustType === 'Float8Value')
            inputHelpers.add('checkInputFloat')
          if (
            item.type.startsWith('array:') ||
            item.rustType === 'RangeValue' ||
            item.rustType === 'MultirangeValue'
          ) {
            if (item.rustType === 'MultirangeValue') rustInputAdapters.add('checkRustRange')
            rustInputAdapters.add('checkRustArray')
            rustInputAdapters.add('checkRustArrayTree')
            rustInputAdapters.add('checkRustArrayElement')
          }
          if (
            item.rustType !== 'LineValue' &&
            item.rustType !== 'LsegValue' &&
            item.rustType !== 'MoneyValue' &&
            item.rustType !== 'XidValue' &&
            item.rustType !== 'CidValue' &&
            item.rustType !== 'PgLsnValue' &&
            item.rustType !== 'TidValue' &&
            item.rustType !== 'InternalCharValue' &&
            item.rustType !== 'Xid8Value' &&
            item.rustType !== 'SnapshotValue' &&
            item.rustType !== 'RangeValue' &&
            item.rustType !== 'MultirangeValue' &&
            item.rustType !== 'JsonValue' &&
            item.rustType !== 'JsonbValue' &&
            item.rustType !== 'JsonpathValue' &&
            item.rustType !== 'ArrayValue' &&
            item.rustType !== 'OidValue' &&
            item.rustType !== 'PolygonValue' &&
            item.rustType !== 'PathValue' &&
            item.rustType !== 'CircleValue' &&
            item.rustType !== 'BoxValue' &&
            item.rustType !== 'PointValue' &&
            item.rustType !== 'TimeValue' &&
            item.rustType !== 'TimetzValue' &&
            item.rustType !== 'IntervalValue' &&
            item.rustType !== 'Float4Value' &&
            item.rustType !== 'Float8Value' &&
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
          const multirange = builtinMultirangeType(item.type)
          return go.call(go.ident(helper), [
            go.selector(row, goName(item.name)),
            ...(multirange
              ? [
                  go.string(multirange.multirange),
                  go.string(multirange.identity),
                  go.string(multirange.subtype),
                  go.number(arrayElementFamily(multirange.subtype)!),
                ]
              : []),
            ...(item.type.startsWith('array:')
              ? [
                  go.string(item.type.slice('array:'.length)),
                  go.number(arrayElementFamily(item.type.slice('array:'.length))!),
                  ...arrayInputPlan(item.type).map((value) => go.string(value)),
                ]
              : []),
            ...(item.enum
              ? [
                  go.composite(
                    go.slice(go.ident('string')),
                    item.enum.values.map((label) => go.string(label)),
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
        portableCheckAtoms(plan.expression, false),
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
                type === 'pg_catalog.point' ||
                type === 'pg_catalog.line' ||
                type === 'pg_catalog.lseg' ||
                type === 'pg_catalog.box' ||
                type === 'pg_catalog."numeric"' ||
                isRangeType(type) ||
                isMultirangeType(type) ||
                type === 'pg_catalog."bit"' ||
                type === 'pg_catalog.varbit' ||
                type === 'pg_catalog.uuid' ||
                type === 'pg_catalog."time"' ||
                type === 'pg_catalog.timetz' ||
                type === 'pg_catalog."interval"' ||
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
        ...([
          'checkRustName',
          'checkRustRefcursor',
          'checkRustText',
          'checkRustJson',
          'checkRustJsonb',
          'checkRustJsonpath',
          'checkRustArrayElement',
        ].some((helper) => rustInputAdapters.has(helper))
          ? [{ path: 'unicode/utf8' }]
          : []),
        ...(rustInputAdapters.has('checkRustFloat4')
          ? [{ path: 'math' }, { path: 'reflect' }]
          : []),
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

const goRustAdapterSource = `func checkRustArrayNullness[T any](field CheckOptional[T],elementType string,elementKind int,tree ...string) checkruntime.BoolValue { return checkruntime.ArrayIsNull(checkRustArray(field,elementType,elementKind,tree...)) }
func checkRustArray[T any](field CheckOptional[T], elementType string, elementKind int,tree ...string) checkruntime.ArrayValue {
  if !field.Set { return checkruntime.ArrayUnknown() }
  if field.Null { return checkruntime.ArrayNull() }
  input,ok:=any(field.V).(checkruntime.ArrayValue)
  if !ok { return checkruntime.ArrayUnknown() }
  if input.Kind==checkruntime.ArrayValueUnknown || input.Kind==checkruntime.ArrayValueNull || input.Kind==checkruntime.ArrayValueError { return input }
  if input.Kind!=checkruntime.ArrayValueValue || input.Value.ElementType!=elementType || input.Value.ElementKind!=elementKind { return checkruntime.ArrayUnknown() }
  depth:=0
  if len(tree)>=2 { depth=len(tree[1])-1 }
  if !checkRustArrayTree(input,depth,tree...) { return checkruntime.ArrayUnknown() }
  if len(tree)>=2 { return checkruntime.ArrayFromCoercedTree(input,tree[0],tree[1]) }
  return checkruntime.ArrayFromCoercedValue(input,elementType,elementKind)
}
func checkRustArrayTree(input checkruntime.ArrayValue,depth int,tree ...string) bool {
  if input.Kind!=checkruntime.ArrayValueValue { return false }
  if len(input.Value.Dimensions)>6 || len(input.Value.Elements)>2147483647 { return false }
  for _,dimension:=range input.Value.Dimensions { if dimension.Lower < -2147483648 || dimension.Lower > 2147483647 || dimension.Length < -2147483648 || dimension.Length > 2147483647 { return false } }
  for _,cell:=range input.Value.Elements { if !checkRustArrayElement(cell,input.Value.ElementKind,depth,tree...) { return false } }
  return true
}
func checkRustArrayElement(input checkruntime.ArrayElement,family int,depth int,tree ...string) bool {
  if input.Kind < checkruntime.ArrayElementUnknown || input.Kind > checkruntime.ArrayElementMultirange { return false }
  if input.Kind==checkruntime.ArrayElementUnknown || input.Kind==checkruntime.ArrayElementNull || input.Kind==checkruntime.ArrayElementError { return true }
  if input.Kind==checkruntime.ArrayElementArray {
    if depth<1 || family!=41 { return false }
    return checkRustArrayTree(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:input.Array},depth-1,tree...)
  }
  if input.Kind==checkruntime.ArrayElementMultirange {
    if family!=43 || len(tree)!=6 || len(tree[5])!=1 { return false }
    p:=input.Multirange
    if p.TypeName!=tree[2] || p.RangeType!=tree[3] || p.ElementType!=tree[4] || p.ElementKind!=int(tree[5][0]) || len(p.Ranges)>2147483647 { return false }
    for _,span:=range p.Ranges {
      if span.Kind==checkruntime.RangeValueUnknown || span.Kind==checkruntime.RangeValueNull || span.Kind==checkruntime.RangeValueError { continue }
      if span.Kind!=checkruntime.RangeValueValue || !checkRustArrayElement(checkruntime.ArrayElement{Kind:checkruntime.ArrayElementRange,Range:span.Value},42,0,tree[0],tree[1],tree[3],tree[4],tree[5]) { return false }
    }
    return true
  }
  if input.Kind==checkruntime.ArrayElementRange {
    if family!=42 || len(tree)!=5 || len(tree[4])!=1 { return false }
    p:=input.Range
    if p.TypeName!=tree[2] || p.ElementType!=tree[3] || p.ElementKind!=int(tree[4][0]) || len(p.Bounds)>2 { return false }
    for _,bound:=range p.Bounds { if !checkRustArrayElement(bound,p.ElementKind,0) { return false } }
    return true
  }
  if input.Kind==checkruntime.ArrayElementInt2 {
  if input.Int2 < -2147483648 || input.Int2 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementInt4 {
  if input.Int4 < -2147483648 || input.Int4 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementEnum {
  if input.Enum.Ordinal < -2147483648 || input.Enum.Ordinal > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementDate {
  if input.Date < -2147483648 || input.Date > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementText {
  if !utf8.ValidString(input.Text) || strings.IndexByte(input.Text,0)>=0 { return false }
  }
  if input.Kind==checkruntime.ArrayElementNumeric {
  if !utf8.ValidString(input.Numeric) || strings.IndexByte(input.Numeric,0)>=0 { return false }
  }
  if input.Kind==checkruntime.ArrayElementJson {
  if !utf8.ValidString(input.Json.Source) || strings.IndexByte(input.Json.Source,0)>=0 { return false }
  if input.Json.Kind < -2147483648 || input.Json.Kind > 2147483647 { return false }
  if input.Json.Depth < 0 || input.Json.Depth > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementJsonb {
  if len(input.Jsonb.Characters)>2147483647 { return false }
  for _,element1:=range input.Jsonb.Characters {
    if !utf8.ValidRune(element1) || element1==0 { return false }
  }
  if len(input.Jsonb.Nodes)>2147483647 { return false }
  for _,element2:=range input.Jsonb.Nodes {
    if element2.Kind < -2147483648 || element2.Kind > 2147483647 { return false }
    if element2.Child < 0 || element2.Child > 2147483647 { return false }
    if element2.Next < 0 || element2.Next > 2147483647 { return false }
    if element2.KeyStart < 0 || element2.KeyStart > 2147483647 { return false }
    if element2.KeyEnd < 0 || element2.KeyEnd > 2147483647 { return false }
    if element2.TextStart < 0 || element2.TextStart > 2147483647 { return false }
    if element2.TextEnd < 0 || element2.TextEnd > 2147483647 { return false }
  }
  if input.Jsonb.Root < 0 || input.Jsonb.Root > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementNetwork {
  if input.Network.Family < 0 || input.Network.Family > 2147483647 { return false }
  if input.Network.Prefix < -2147483648 || input.Network.Prefix > 2147483647 { return false }
  if input.Network.Word0 < -2147483648 || input.Network.Word0 > 2147483647 { return false }
  if input.Network.Word1 < -2147483648 || input.Network.Word1 > 2147483647 { return false }
  if input.Network.Word2 < -2147483648 || input.Network.Word2 > 2147483647 { return false }
  if input.Network.Word3 < -2147483648 || input.Network.Word3 > 2147483647 { return false }
  if input.Network.Word4 < -2147483648 || input.Network.Word4 > 2147483647 { return false }
  if input.Network.Word5 < -2147483648 || input.Network.Word5 > 2147483647 { return false }
  if input.Network.Word6 < -2147483648 || input.Network.Word6 > 2147483647 { return false }
  if input.Network.Word7 < -2147483648 || input.Network.Word7 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementBit {
  if !utf8.ValidString(input.Bit) || strings.IndexByte(input.Bit,0)>=0 { return false }
  }
  if input.Kind==checkruntime.ArrayElementBytea {
  if !utf8.ValidString(input.Bytea) || strings.IndexByte(input.Bytea,0)>=0 { return false }
  }
  if input.Kind==checkruntime.ArrayElementMacaddr {
  if input.Macaddr.Word0 < -2147483648 || input.Macaddr.Word0 > 2147483647 { return false }
  if input.Macaddr.Word1 < -2147483648 || input.Macaddr.Word1 > 2147483647 { return false }
  if input.Macaddr.Word2 < -2147483648 || input.Macaddr.Word2 > 2147483647 { return false }
  if input.Macaddr.Word3 < -2147483648 || input.Macaddr.Word3 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementMacaddr8 {
  if input.Macaddr8.Word0 < -2147483648 || input.Macaddr8.Word0 > 2147483647 { return false }
  if input.Macaddr8.Word1 < -2147483648 || input.Macaddr8.Word1 > 2147483647 { return false }
  if input.Macaddr8.Word2 < -2147483648 || input.Macaddr8.Word2 > 2147483647 { return false }
  if input.Macaddr8.Word3 < -2147483648 || input.Macaddr8.Word3 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementUuid {
  if input.Uuid.Word0 < -2147483648 || input.Uuid.Word0 > 2147483647 { return false }
  if input.Uuid.Word1 < -2147483648 || input.Uuid.Word1 > 2147483647 { return false }
  if input.Uuid.Word2 < -2147483648 || input.Uuid.Word2 > 2147483647 { return false }
  if input.Uuid.Word3 < -2147483648 || input.Uuid.Word3 > 2147483647 { return false }
  if input.Uuid.Word4 < -2147483648 || input.Uuid.Word4 > 2147483647 { return false }
  if input.Uuid.Word5 < -2147483648 || input.Uuid.Word5 > 2147483647 { return false }
  if input.Uuid.Word6 < -2147483648 || input.Uuid.Word6 > 2147483647 { return false }
  if input.Uuid.Word7 < -2147483648 || input.Uuid.Word7 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementFloat4 {
  if input.Float4 < -2147483648 || input.Float4 > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementTimetz {
  if input.Timetz.Zone < -2147483648 || input.Timetz.Zone > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementInterval {
  if input.Interval.Months < -2147483648 || input.Interval.Months > 2147483647 { return false }
  if input.Interval.Days < -2147483648 || input.Interval.Days > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementPath {
  if len(input.Path.Points)>2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementPolygon {
  if len(input.Polygon.Points)>2147483647 { return false }
  if input.Polygon.Bounds.Kind!=checkruntime.BoxValueUnknown && input.Polygon.Bounds.Kind!=checkruntime.BoxValueNonNull && input.Polygon.Bounds.Kind!=checkruntime.BoxValueValue { return false }
  }
  if input.Kind==checkruntime.ArrayElementInternalChar {
  if input.InternalChar < -2147483648 || input.InternalChar > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementSnapshot {
  if len(input.Snapshot.Xip)>2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementJsonpath {
  if len(input.Jsonpath.Characters)>2147483647 { return false }
  for _,element6:=range input.Jsonpath.Characters {
    if !utf8.ValidRune(element6) || element6==0 { return false }
  }
  if len(input.Jsonpath.Nodes)>2147483647 { return false }
  for _,element7:=range input.Jsonpath.Nodes {
    if element7.Kind < -2147483648 || element7.Kind > 2147483647 { return false }
    if element7.Next < 0 || element7.Next > 2147483647 { return false }
    if element7.Left < 0 || element7.Left > 2147483647 { return false }
    if element7.Right < 0 || element7.Right > 2147483647 { return false }
    if element7.TextStart < 0 || element7.TextStart > 2147483647 { return false }
    if element7.TextEnd < 0 || element7.TextEnd > 2147483647 { return false }
    if element7.First < -2147483648 || element7.First > 2147483647 { return false }
    if element7.Last < -2147483648 || element7.Last > 2147483647 { return false }
    if element7.Flags < -2147483648 || element7.Flags > 2147483647 { return false }
  }
  if input.Jsonpath.Root < 0 || input.Jsonpath.Root > 2147483647 { return false }
  }
  if input.Kind==checkruntime.ArrayElementJsonpathStoredText && (!utf8.ValidString(input.JsonpathStoredText) || strings.IndexByte(input.JsonpathStoredText,0)>=0 || len(input.JsonpathStoredText)==0) { return false }
  if input.Kind==checkruntime.ArrayElementByteaUnspecified && input.ByteaUnspecified<0 { return false }
  actual:=checkruntime.ArrayElementFamily(input)
  return actual!=0 && actual==family
}
func checkRustXid[T any](field CheckOptional[T]) checkruntime.XidValue {
  if !field.Set { return checkruntime.XidUnknown() }
  if field.Null { return checkruntime.XidNull() }
  if value, ok := any(field.V).(checkruntime.XidValue); ok {
    if value.Kind == checkruntime.XidValueValue { return checkruntime.MakeXidValue(value.Value) }
    if value.Kind == checkruntime.XidValueUnknown || value.Kind == checkruntime.XidValueNull || value.Kind == checkruntime.XidValueError { return value }
  }
  return checkruntime.XidUnknown()
}
func checkRustCid[T any](field CheckOptional[T]) checkruntime.CidValue {
  if !field.Set { return checkruntime.CidUnknown() }
  if field.Null { return checkruntime.CidNull() }
  if value, ok := any(field.V).(checkruntime.CidValue); ok {
    if value.Kind == checkruntime.CidValueValue { return checkruntime.MakeCidValue(value.Value) }
    if value.Kind == checkruntime.CidValueUnknown || value.Kind == checkruntime.CidValueNull || value.Kind == checkruntime.CidValueError { return value }
  }
  return checkruntime.CidUnknown()
}
func checkRustPgLsn[T any](field CheckOptional[T]) checkruntime.PgLsnValue {
  if !field.Set { return checkruntime.PgLsnUnknown() }
  if field.Null { return checkruntime.PgLsnNull() }
  if value, ok := any(field.V).(checkruntime.PgLsnValue); ok {
    if value.Kind == checkruntime.PgLsnValueValue { return checkruntime.MakePgLsnBits(value.Value) }
    if value.Kind == checkruntime.PgLsnValueUnknown || value.Kind == checkruntime.PgLsnValueNull || value.Kind == checkruntime.PgLsnValueError { return value }
  }
  return checkruntime.PgLsnUnknown()
}
func checkRustInternalChar[T any](field CheckOptional[T]) checkruntime.InternalCharValue {
  if !field.Set { return checkruntime.InternalCharUnknown() }
  if field.Null { return checkruntime.InternalCharNull() }
  if value, ok := any(field.V).(checkruntime.InternalCharValue); ok {
    if value.Kind == checkruntime.InternalCharValueValue { return checkruntime.MakeInternalCharValue(value.Value) }
    if value.Kind == checkruntime.InternalCharValueUnknown || value.Kind == checkruntime.InternalCharValueNull || value.Kind == checkruntime.InternalCharValueError { return value }
  }
  return checkruntime.InternalCharUnknown()
}
func checkRustTid[T any](field CheckOptional[T]) checkruntime.TidValue {
  if !field.Set { return checkruntime.TidUnknown() }
  if field.Null { return checkruntime.TidNull() }
  if value, ok := any(field.V).(checkruntime.TidValue); ok {
    if value.Kind == checkruntime.TidValueValue { return checkruntime.MakeTidValue(value.Value) }
    if value.Kind == checkruntime.TidValueUnknown || value.Kind == checkruntime.TidValueNull || value.Kind == checkruntime.TidValueError { return value }
  }
  return checkruntime.TidUnknown()
}
func checkRustJsonpath[T any](field CheckOptional[T]) checkruntime.JsonpathValue {
  if !field.Set { return checkruntime.JsonpathUnknown() }
  if field.Null { return checkruntime.JsonpathNull() }
  if value, ok := any(field.V).(checkruntime.JsonpathValue); ok {
    if value.Kind == checkruntime.JsonpathValueStoredText {
      if len(value.StoredText)==0 || !utf8.ValidString(value.StoredText) || strings.IndexByte(value.StoredText,0)>=0 { return checkruntime.JsonpathUnknown() }
      return value
    }
    if value.Kind == checkruntime.JsonpathValueValue {
      payload := value.Value
      if payload.Root < 0 || payload.Root > 2147483647 || len(payload.Characters) > 2147483647 || len(payload.Nodes) > 2147483647 { return checkruntime.JsonpathUnknown() }
      for _, character := range payload.Characters { if !utf8.ValidRune(character) { return checkruntime.JsonpathUnknown() } }
      for _, node := range payload.Nodes {
        if node.Kind < -2147483648 || node.Kind > 2147483647 { return checkruntime.JsonpathUnknown() }
        for _, index := range []int{node.Next,node.Left,node.Right,node.TextStart,node.TextEnd} {
          if index < 0 || index > 2147483647 { return checkruntime.JsonpathUnknown() }
        }
      }
      return checkruntime.JsonpathFromCoercedValue(value)
    }
    if value.Kind == checkruntime.JsonpathValueUnknown || value.Kind == checkruntime.JsonpathValueNull || value.Kind == checkruntime.JsonpathValueError { return value }
  }
  return checkruntime.JsonpathUnknown()
}
func checkRustJsonb[T any](field CheckOptional[T]) checkruntime.JsonbValue {
  if !field.Set { return checkruntime.JsonbUnknown() }
  if field.Null { return checkruntime.JsonbNull() }
  if value, ok := any(field.V).(checkruntime.JsonbValue); ok {
    if value.Kind == checkruntime.JsonbValueValue {
      payload := value.Value
      if payload.Root < 0 || payload.Root > 2147483647 || len(payload.Characters) > 2147483647 || len(payload.Nodes) > 2147483647 { return checkruntime.JsonbUnknown() }
      for _, character := range payload.Characters { if !utf8.ValidRune(character) { return checkruntime.JsonbUnknown() } }
      for _, node := range payload.Nodes {
        if node.Kind < -2147483648 || node.Kind > 2147483647 { return checkruntime.JsonbUnknown() }
        for _, index := range []int{node.Child,node.Next,node.KeyStart,node.KeyEnd,node.TextStart,node.TextEnd} {
          if index < 0 || index > 2147483647 { return checkruntime.JsonbUnknown() }
        }
      }
      return checkruntime.JsonbFromCoercedValue(value)
    }
    if value.Kind == checkruntime.JsonbValueUnknown || value.Kind == checkruntime.JsonbValueNull || value.Kind == checkruntime.JsonbValueError { return value }
  }
  return checkruntime.JsonbUnknown()
}
func checkRustJson[T any](field CheckOptional[T]) checkruntime.JsonValue {
  if !field.Set { return checkruntime.JsonUnknown() }
  if field.Null { return checkruntime.JsonNull() }
  if value, ok := any(field.V).(checkruntime.JsonValue); ok {
    if value.Kind == checkruntime.JsonValueValue {
      if !utf8.ValidString(value.Value.Source) || strings.IndexByte(value.Value.Source,0) >= 0 { return checkruntime.JsonUnknown() }
      return checkruntime.MakeJsonValue(value.Value.Source)
    }
    if value.Kind == checkruntime.JsonValueUnknown || value.Kind == checkruntime.JsonValueNull || value.Kind == checkruntime.JsonValueError { return value }
  }
  return checkruntime.JsonUnknown()
}
func checkRustMultirange[T any](field CheckOptional[T], typeName string, rangeType string, elementType string, elementKind int) checkruntime.MultirangeValue {
  if !field.Set { return checkruntime.MultirangeUnknown() }
  if field.Null { return checkruntime.MultirangeNull() }
  value,ok:=any(field.V).(checkruntime.MultirangeValue)
  if !ok { return checkruntime.MultirangeUnknown() }
  if value.Kind==checkruntime.MultirangeValueUnknown || value.Kind==checkruntime.MultirangeValueNull || value.Kind==checkruntime.MultirangeValueError { return value }
  if value.Kind!=checkruntime.MultirangeValueValue { return checkruntime.MultirangeUnknown() }
  p:=value.Value
  if p.TypeName!=typeName || p.RangeType!=rangeType || p.ElementType!=elementType || p.ElementKind!=elementKind { return checkruntime.MultirangeUnknown() }
  for _,span:=range p.Ranges {
    if span.Kind==checkruntime.RangeValueValue && (span.Value.TypeName!=rangeType || span.Value.ElementType!=elementType || span.Value.ElementKind!=elementKind) { return checkruntime.MultirangeUnknown() }
    checked:=checkRustRange(CheckOptional[checkruntime.RangeValue]{Set:true,V:span})
    if checked.Kind==checkruntime.RangeValueUnknown { return checkruntime.MultirangeUnknown() }
    if checked.Kind==checkruntime.RangeValueError { return checkruntime.MultirangeValue{Kind:checkruntime.MultirangeValueError,Error:checked.Error} }
    if checked.Kind!=checkruntime.RangeValueValue || checked.Value.Empty { return checkruntime.MultirangeUnknown() }
  }
  return checkruntime.MakeCoercedMultirangeValue(p)
}
func checkRustRange[T any](field CheckOptional[T]) checkruntime.RangeValue {
  if !field.Set { return checkruntime.RangeUnknown() }
  if field.Null { return checkruntime.RangeNull() }
  value,ok:=any(field.V).(checkruntime.RangeValue)
  if !ok { return checkruntime.RangeUnknown() }
  if value.Kind==checkruntime.RangeValueUnknown || value.Kind==checkruntime.RangeValueNull || value.Kind==checkruntime.RangeValueError { return value }
  if value.Kind!=checkruntime.RangeValueValue { return checkruntime.RangeUnknown() }
  p:=value.Value
  if !utf8.ValidString(p.TypeName) || strings.IndexByte(p.TypeName,0)>=0 || !utf8.ValidString(p.ElementType) || strings.IndexByte(p.ElementType,0)>=0 || p.ElementKind < 1 || p.ElementKind > 2147483647 || len(p.Bounds)>2 { return checkruntime.RangeUnknown() }
  for _,bound:=range p.Bounds { if !checkRustArrayElement(bound,p.ElementKind,0) { return checkruntime.RangeUnknown() } }
  return checkruntime.MakeCoercedRangeValue(p)
}
func checkRustSnapshot[T any](field CheckOptional[T]) checkruntime.SnapshotValue {
  if !field.Set { return checkruntime.SnapshotUnknown() }
  if field.Null { return checkruntime.SnapshotNull() }
  if value, ok := any(field.V).(checkruntime.SnapshotValue); ok {
    if value.Kind == checkruntime.SnapshotValueValue {
      if len(value.Value.Xip) > 134217724 { return checkruntime.SnapshotUnknown() }
      return checkruntime.MakeSnapshotValue(value.Value)
    }
    if value.Kind == checkruntime.SnapshotValueUnknown || value.Kind == checkruntime.SnapshotValueNull || value.Kind == checkruntime.SnapshotValueError { return value }
  }
  return checkruntime.SnapshotUnknown()
}
func checkRustXid8[T any](field CheckOptional[T]) checkruntime.Xid8Value {
  if !field.Set { return checkruntime.Xid8Unknown() }
  if field.Null { return checkruntime.Xid8Null() }
  if value, ok := any(field.V).(checkruntime.Xid8Value); ok {
    if value.Kind == checkruntime.Xid8ValueValue { return checkruntime.MakeXid8Bits(value.Value) }
    if value.Kind == checkruntime.Xid8ValueUnknown || value.Kind == checkruntime.Xid8ValueNull || value.Kind == checkruntime.Xid8ValueError { return value }
  }
  return checkruntime.Xid8Unknown()
}
func checkRustOid[T any](field CheckOptional[T]) checkruntime.OidValue {
  if !field.Set { return checkruntime.OidUnknown() }
  if field.Null { return checkruntime.OidNull() }
  if value, ok := any(field.V).(checkruntime.OidValue); ok {
    if value.Kind == checkruntime.OidValueValue { return checkruntime.MakeOidValue(value.Value) }
    if value.Kind == checkruntime.OidValueUnknown || value.Kind == checkruntime.OidValueNull || value.Kind == checkruntime.OidValueError { return value }
  }
  return checkruntime.OidUnknown()
}
func checkRustMoney[T any](field CheckOptional[T]) checkruntime.MoneyValue {
  if !field.Set { return checkruntime.MoneyUnknown() }
  if field.Null { return checkruntime.MoneyNull() }
  if value, ok := any(field.V).(checkruntime.MoneyValue); ok { return value }
  return checkruntime.MoneyUnknown()
}
func checkRustPolygon[T any](field CheckOptional[T]) checkruntime.PolygonValue {
  if !field.Set { return checkruntime.PolygonUnknown() }
  if field.Null { return checkruntime.PolygonNull() }
  if value, ok := any(field.V).(checkruntime.PolygonValue); ok {
    if value.Kind == checkruntime.PolygonValueValue { return checkruntime.MakePolygonValue(value.Value) }
    if value.Kind == checkruntime.PolygonValueUnknown || value.Kind == checkruntime.PolygonValueNull || value.Kind == checkruntime.PolygonValueError { return value }
  }
  return checkruntime.PolygonUnknown()
}
func checkRustPath[T any](field CheckOptional[T]) checkruntime.PathValue {
  if !field.Set { return checkruntime.PathUnknown() }
  if field.Null { return checkruntime.PathNull() }
  if value, ok := any(field.V).(checkruntime.PathValue); ok {
    if value.Kind == checkruntime.PathValueValue { return checkruntime.MakePathValue(value.Value) }
    if value.Kind == checkruntime.PathValueUnknown || value.Kind == checkruntime.PathValueNull || value.Kind == checkruntime.PathValueError { return value }
  }
  return checkruntime.PathUnknown()
}
func checkRustCircle[T any](field CheckOptional[T]) checkruntime.CircleValue {
  if !field.Set { return checkruntime.CircleUnknown() }
  if field.Null { return checkruntime.CircleNull() }
  if value, ok := any(field.V).(checkruntime.CircleValue); ok { return value }
  return checkruntime.CircleUnknown()
}
func checkRustBox[T any](field CheckOptional[T]) checkruntime.BoxValue {
  if !field.Set { return checkruntime.BoxUnknown() }
  if field.Null { return checkruntime.BoxNull() }
  if value, ok := any(field.V).(checkruntime.BoxValue); ok {
    return value
  }
  return checkruntime.BoxUnknown()
}
func checkRustLseg[T any](field CheckOptional[T]) checkruntime.LsegValue {
  if !field.Set { return checkruntime.LsegUnknown() }
  if field.Null { return checkruntime.LsegNull() }
  if value, ok := any(field.V).(checkruntime.LsegValue); ok { return value }
  return checkruntime.LsegUnknown()
}
func checkRustLine[T any](field CheckOptional[T]) checkruntime.LineValue {
  if !field.Set { return checkruntime.LineUnknown() }
  if field.Null { return checkruntime.LineNull() }
  if value, ok := any(field.V).(checkruntime.LineValue); ok {
    if value.Kind == checkruntime.LineValueValue {
      valid := checkruntime.MakeLineBits(value.Value.A, value.Value.B, value.Value.C)
      if valid.Kind != checkruntime.LineValueValue { return valid }
    }
    return value
  }
  return checkruntime.LineUnknown()
}
func checkRustPoint[T any](field CheckOptional[T]) checkruntime.PointValue {
  if !field.Set { return checkruntime.PointUnknown() }
  if field.Null { return checkruntime.PointNull() }
  if value, ok := any(field.V).(checkruntime.PointValue); ok {
    return value
  }
  return checkruntime.PointUnknown()
}
func checkRustTime[T any](field CheckOptional[T]) checkruntime.TimeValue {
  if !field.Set { return checkruntime.TimeUnknown() }
  if field.Null { return checkruntime.TimeNull() }
  if value, ok := any(field.V).(checkruntime.TimeValue); ok {
    if value.Kind == checkruntime.TimeValueValue { return checkruntime.MakeTimeValue(value.Value) }
    return value
  }
  return checkruntime.TimeUnknown()
}
func checkRustTimetz[T any](field CheckOptional[T]) checkruntime.TimetzValue {
  if !field.Set { return checkruntime.TimetzUnknown() }
  if field.Null { return checkruntime.TimetzNull() }
  if value, ok := any(field.V).(checkruntime.TimetzValue); ok {
    if value.Kind == checkruntime.TimetzValueValue { return checkruntime.MakeTimetzValue(value.Value.Time, value.Value.Zone) }
    return value
  }
  return checkruntime.TimetzUnknown()
}
func checkRustInterval[T any](field CheckOptional[T]) checkruntime.IntervalValue {
  if !field.Set { return checkruntime.IntervalUnknown() }
  if field.Null { return checkruntime.IntervalNull() }
  if value, ok := any(field.V).(checkruntime.IntervalValue); ok {
    if value.Kind == checkruntime.IntervalValueValue && (value.Value.Months < -2147483648 || value.Value.Months > 2147483647 || value.Value.Days < -2147483648 || value.Value.Days > 2147483647) { return checkruntime.IntervalUnknown() }
    return value
  }
  return checkruntime.IntervalUnknown()
}
func checkRustTimestamp[T any](field CheckOptional[T]) checkruntime.TimestampValue {
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
func checkRustFloat4[T any](field CheckOptional[T]) checkruntime.Float4Value {
  if !field.Set { return checkruntime.Float4Unknown() }
  if field.Null { return checkruntime.Float4Null() }
  if value, ok := any(field.V).(checkruntime.Float4Value); ok { return value }
  raw := any(field.V)
  if value, ok := raw.(interface { SQLValid() bool; SQLValue() any }); ok {
    if !value.SQLValid() { return checkruntime.Float4Null() }
    raw = value.SQLValue()
  }
  native := reflect.ValueOf(raw)
  for native.IsValid() && native.Kind() == reflect.Pointer {
    if native.IsNil() { return checkruntime.Float4Null() }
    native = native.Elem()
  }
  if native.IsValid() && native.Kind() == reflect.Float32 {
    number := native.Convert(reflect.TypeOf(float32(0))).Interface().(float32)
    return checkruntime.MakeFloat4Bits(int(int32(math.Float32bits(number))))
  }
  input := checkInputFloat(field)
  if !input.Certain { return checkruntime.Float4Unknown() }
  if input.Value.Error != "" {
    if state, valid := checkRustState(input.Value.Error); valid {
      return checkruntime.Float4Value{Kind: checkruntime.Float4ValueError, Error: state}
    }
    return checkruntime.Float4Unknown()
  }
  if !input.Value.Valid { return checkruntime.Float4Null() }
  return checkruntime.MakeFloat4Value(input.Value.Value)
}
func checkRustFloat8[T any](field CheckOptional[T]) checkruntime.Float8Value {
  if !field.Set { return checkruntime.Float8Unknown() }
  if field.Null { return checkruntime.Float8Null() }
  if value, ok := any(field.V).(checkruntime.Float8Value); ok { return value }
  input := checkInputFloat(field)
  if !input.Certain { return checkruntime.Float8Unknown() }
  if input.Value.Error != "" {
    if state, valid := checkRustState(input.Value.Error); valid {
      return checkruntime.Float8Value{Kind: checkruntime.Float8ValueError, Error: state}
    }
    return checkruntime.Float8Unknown()
  }
  if !input.Value.Valid { return checkruntime.Float8Null() }
  return checkruntime.MakeFloat8Value(input.Value.Value)
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
    if value, ok := any(field.V).(checkruntime.PointValue); ok { return checkruntime.PointIsNull(value) }
    if value, ok := any(field.V).(checkruntime.TimeValue); ok { return checkruntime.TimeIsNull(value) }
    if value, ok := any(field.V).(checkruntime.TimetzValue); ok { return checkruntime.TimetzIsNull(value) }
    if value, ok := any(field.V).(checkruntime.IntervalValue); ok { return checkruntime.IntervalIsNull(value) }
    if value, ok := any(field.V).(checkruntime.TimestampValue); ok { return checkruntime.TimestampIsNull(value) }
    if value, ok := any(field.V).(checkruntime.TimestamptzValue); ok { return checkruntime.TimestamptzIsNull(value) }
  }
  input := checkInputNullness(field)
  if !input.Certain { return checkruntime.BoolUnknown() }
  return checkruntime.MakeBoolValue(input.Value.Value)
}
func checkRustEnum[T any](field CheckOptional[T], labels []string) checkruntime.EnumValue {
  input := checkInputText(field)
  if !input.Certain { return checkruntime.EnumUnknown() }
  if !input.Value.Valid { return checkruntime.EnumNull() }
  for order, label := range labels {
    if label == input.Value.Value {
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
func checkRustName[T any](field CheckOptional[T]) checkruntime.TextValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.TextUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok { return checkruntime.TextValue{Kind:checkruntime.TextValueError, Error:state} }
    return checkruntime.TextUnknown()
  }
  if !value.Value.Valid { return checkruntime.TextNull() }
  if !utf8.ValidString(value.Value.Value) { return checkruntime.TextUnknown() }
  return checkruntime.MakeNameTextValue(value.Value.Value)
}
func checkRustRefcursor[T any](field CheckOptional[T]) checkruntime.TextValue {
  value := checkInputText(field)
  if !value.Certain { return checkruntime.TextUnknown() }
  if value.Value.Error != "" {
    if state, ok := checkRustState(value.Value.Error); ok { return checkruntime.TextValue{Kind:checkruntime.TextValueError, Error:state} }
    return checkruntime.TextUnknown()
  }
  if !value.Value.Valid { return checkruntime.TextNull() }
  if !utf8.ValidString(value.Value.Value) { return checkruntime.TextUnknown() }
  return checkruntime.MakeRefcursorTextValue(value.Value.Value)
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
  if !utf8.ValidString(value.Value.Value) || strings.IndexByte(value.Value.Value,0) >= 0 { return checkruntime.TextUnknown() }
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
