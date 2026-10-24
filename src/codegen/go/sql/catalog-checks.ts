import {
  catalogCompositeType,
  compositeContainerProfile,
} from '../../../sql-semantics/composite-profiles.js'
import { compositeNodes } from '../../shared/check-composite-types.js'
import { multirangeTypeProfile, rangeTypeProfile } from '../../../sql-semantics/range-profiles.js'
import {
  arrayElementFamily,
  arrayRangeProfile,
  arrayMultirangeProfile,
  rangeBoundProfiles,
  arrayElementIdentity,
  arrayInputPlan,
} from '../../shared/check-array-types.js'
import type { CatalogSnapshot, ColumnInfo, DomainInfo, TableInfo } from '../../../catalog/types.js'
import type { Config, GoTypeImport } from '../../../config/schema.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import {
  catalogTemporalType,
  catalogArrayType,
  catalogVectorType,
  catalogRangeType,
  catalogMultirangeType,
  catalogNumericType,
  catalogJsonType,
  catalogJsonbType,
  catalogJsonpathType,
  catalogXmlType,
  catalogPointType,
  catalogLineType,
  catalogLsegType,
  catalogMoneyType,
  catalogAclitemType,
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
import {
  enumType,
  isRangeType,
  isMultirangeType,
  isArrayLikeType,
  arrayLikeElementType,
} from '../../../sql-semantics/expressions.js'
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
    if (catalogCompositeType(name, catalog.compositeTypeGraph, catalog.rangeTypes))
      return 'CompositeValue'
    if (
      catalogArrayType(
        name,
        oid,
        domains,
        catalog.enums,
        catalog.rangeTypes,
        undefined,
        catalog.compositeTypeGraph,
      )
    )
      return 'ArrayValue'
    if (catalogRangeType(name, oid, domains, catalog.rangeTypes)) return 'RangeValue'
    if (catalogMultirangeType(name, oid, domains, catalog.rangeTypes)) return 'MultirangeValue'
    if (catalogJsonType(name, oid, domains)) return 'JsonValue'
    if (catalogJsonbType(name, oid, domains)) return 'JsonbValue'
    if (catalogXmlType(name, oid, domains)) return 'XmlValue'
    if (catalogJsonpathType(name, oid, domains)) return 'JsonpathValue'
    if (catalogNumericType(name, oid, domains)) return 'NumericValue'
    if (catalogPointType(name, oid, domains)) return 'PointValue'
    if (catalogLineType(name, oid, domains)) return 'LineValue'
    if (catalogLsegType(name, oid, domains)) return 'LsegValue'
    if (catalogMoneyType(name, oid, domains)) return 'MoneyValue'
    if (catalogAclitemType(name, oid, domains)) return 'AclitemValue'
    if (catalogXidType(name, oid, domains)) return 'XidValue'
    if (catalogCidType(name, oid, domains)) return 'CidValue'
    if (catalogPgLsnType(name, oid, domains)) return 'PgLsnValue'
    if (catalogInternalCharType(name, oid, domains)) return 'InternalCharValue'
    if (catalogVectorType(name, oid, domains)) return 'ArrayValue'
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
  const groups = catalogCheckGroups(
    tables,
    domains,
    selectedDomains,
    catalog.enums,
    catalog.rangeTypes,
    catalog.compositeTypeGraph,
  )
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
  const boundProfileNode = (
    node: NonNullable<ReturnType<typeof rangeBoundProfiles>>[number],
  ): GoExpression => {
    const rt = (name: string) => go.selector(go.ident('checkruntime'), name)
    const scalar = (value: string | number | boolean) =>
      typeof value === 'string'
        ? go.string(value)
        : typeof value === 'boolean'
          ? go.ident(String(value))
          : go.number(value)
    const { fields = [], ...values } = node
    return go.composite(rt('RangeBoundProfile'), [
      ...Object.entries(values).map(([key, value]) =>
        go.keyValue(key[0]!.toUpperCase() + key.slice(1), scalar(value)),
      ),
      go.keyValue(
        'Fields',
        go.composite(
          go.slice(rt('RangeBoundField')),
          fields.map((field) =>
            go.composite(rt('RangeBoundField'), [
              go.keyValue('TypeName', go.string(field.typeName)),
              go.keyValue('Child', go.number(field.child)),
              go.keyValue('ComparisonAvailable', go.ident(String(field.comparisonAvailable))),
            ]),
          ),
        ),
      ),
    ])
  }

  const boundContext = (type: string): GoExpression => {
    const profile =
      rangeTypeProfile(type) ??
      multirangeTypeProfile(type) ??
      (type.startsWith('array:') ? (arrayRangeProfile(type) ?? arrayMultirangeProfile(type)) : null)
    const nodes = profile ? rangeBoundProfiles(profile, config.sql.codegen?.checks) : []
    if (!nodes) throw new Error('Missing compiled array-bound range context')
    const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
    const records = nodes.map(boundProfileNode)
    return go.composite(runtime('RangeBoundContext'), [
      go.keyValue('Nodes', go.composite(go.slice(runtime('RangeBoundProfile')), records)),
    ])
  }
  const compositeContext = (type: string): GoExpression => {
    const nodes = compositeNodes(type, config.sql.codegen?.checks)
    if (!nodes) throw new Error('Missing composite field context')
    const rt = (name: string) => go.selector(go.ident('checkruntime'), name)
    const bounds = (values: (typeof nodes)[number]['boundProfile']) =>
      go.composite(rt('RangeBoundContext'), [
        go.keyValue(
          'Nodes',
          go.composite(go.slice(rt('RangeBoundProfile')), values.map(boundProfileNode)),
        ),
      ])
    return go.composite(rt('CompositeTypePlan'), [
      go.keyValue('Kind', rt('CompositeTypePlanValue')),
      go.keyValue(
        'Value',
        go.composite(rt('CompositeTypeContext'), [
          go.keyValue(
            'Nodes',
            go.composite(
              go.slice(rt('CompositeTypeNode')),
              nodes.map((node) =>
                go.composite(rt('CompositeTypeNode'), [
                  go.keyValue('TypeName', go.string(node.typeName)),
                  go.keyValue('Kind', go.number(node.kind)),
                  go.keyValue('ElementType', go.string(node.elementType)),
                  go.keyValue('Child', go.number(node.child)),
                  go.keyValue(
                    'Fields',
                    go.composite(
                      go.slice(go.ident('int')),
                      node.fields.map((n) => go.number(n)),
                    ),
                  ),
                  go.keyValue('BoundProfile', bounds(node.boundProfile)),
                ]),
              ),
            ),
          ),
        ]),
      ),
    ])
  }
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
        config.sql.codegen?.checks,
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
              'AclitemValue',
              'XidValue',
              'CidValue',
              'PgLsnValue',
              'TidValue',
              'InternalCharValue',
              'Xid8Value',
              'SnapshotValue',
              'RangeValue',
              'MultirangeValue',
              'CompositeValue',
              'JsonValue',
              'JsonbValue',
              'JsonpathValue',
              'XmlValue',
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
          const compositeArray =
            isArrayLikeType(item.type) &&
            compositeContainerProfile(arrayLikeElementType(item.type)!)
          const helper = compositeArray
            ? item.nullness
              ? 'checkRustCompositeArrayNullness'
              : 'checkRustCompositeArray'
            : item.rustType === 'CompositeValue'
              ? 'checkRustComposite'
              : isArrayLikeType(item.type)
                ? item.nullness
                  ? 'checkRustArrayNullness'
                  : 'checkRustArray'
                : item.rustType === 'MultirangeValue'
                  ? 'checkRustMultirange'
                  : item.rustType === 'RangeValue'
                    ? 'checkRustRange'
                    : item.rustType === 'XmlValue'
                      ? 'checkRustXml'
                      : item.rustType === 'JsonpathValue'
                        ? 'checkRustJsonpath'
                        : item.rustType === 'JsonbValue'
                          ? 'checkRustJsonb'
                          : item.rustType === 'JsonValue'
                            ? 'checkRustJson'
                            : item.rustType === 'SnapshotValue'
                              ? 'checkRustSnapshot'
                              : item.type === 'pg_catalog.refcursor' &&
                                  item.rustType === 'TextValue'
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
                                                : item.rustType === 'AclitemValue'
                                                  ? 'checkRustAclitem'
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
                                                                    : item.rustType ===
                                                                        'TimetzValue'
                                                                      ? 'checkRustTimetz'
                                                                      : item.rustType ===
                                                                          'IntervalValue'
                                                                        ? 'checkRustInterval'
                                                                        : item.rustType ===
                                                                            'Float4Value'
                                                                          ? 'checkRustFloat4'
                                                                          : item.rustType ===
                                                                              'Float8Value'
                                                                            ? 'checkRustFloat8'
                                                                            : item.rustType ===
                                                                                'BitValue'
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
          if (item.rustType === 'CompositeValue' || compositeArray)
            rustInputAdapters.add('checkRustCompositeCell')
          if (compositeArray) rustInputAdapters.add('checkRustCompositeArray')
          if (item.rustType === 'ByteaValue') inputHelpers.add('checkPrimitive')
          if (item.rustType === 'Float4Value' || item.rustType === 'Float8Value')
            inputHelpers.add('checkInputFloat')
          if (
            isArrayLikeType(item.type) ||
            item.rustType === 'RangeValue' ||
            item.rustType === 'MultirangeValue' ||
            item.rustType === 'CompositeValue'
          ) {
            if (item.rustType === 'MultirangeValue') rustInputAdapters.add('checkRustRange')
            rustInputAdapters.add('checkRustArray')
            rustInputAdapters.add('checkRustArrayProfileWord')
            rustInputAdapters.add('checkRustArrayTree')
            rustInputAdapters.add('checkRustArrayTypedMetadata')
            rustInputAdapters.add('checkRustArrayElement')
            rustInputAdapters.add('checkRustProfiledBound')
            rustInputAdapters.add('checkRustRangeBoundMetadata')
          }
          if (
            item.rustType !== 'LineValue' &&
            item.rustType !== 'LsegValue' &&
            item.rustType !== 'MoneyValue' &&
            item.rustType !== 'AclitemValue' &&
            item.rustType !== 'XidValue' &&
            item.rustType !== 'CidValue' &&
            item.rustType !== 'PgLsnValue' &&
            item.rustType !== 'TidValue' &&
            item.rustType !== 'InternalCharValue' &&
            item.rustType !== 'Xid8Value' &&
            item.rustType !== 'SnapshotValue' &&
            item.rustType !== 'RangeValue' &&
            item.rustType !== 'MultirangeValue' &&
            item.rustType !== 'CompositeValue' &&
            item.rustType !== 'JsonValue' &&
            item.rustType !== 'JsonbValue' &&
            item.rustType !== 'XmlValue' &&
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
          const multirange = multirangeTypeProfile(item.type)
          const range = rangeTypeProfile(item.type)
          const enumDefinition = (range ?? multirange)?.subtypeEnum
          return go.call(go.ident(helper), [
            go.selector(row, goName(item.name)),
            ...(item.rustType === 'CompositeValue' || compositeArray
              ? [compositeContext(compositeArray ? arrayLikeElementType(item.type)! : item.type)]
              : []),
            ...(compositeArray
              ? [go.string(arrayElementIdentity(arrayLikeElementType(item.type)!))]
              : []),
            ...(multirange
              ? [
                  go.string(multirange.multirange),
                  go.string(multirange.identity),
                  go.string(multirange.subtype),
                  go.number(arrayElementFamily(multirange.elementType)!),
                ]
              : []),
            ...(range || multirange
              ? [
                  go.string(enumDefinition?.values.join('\0') ?? ''),
                  go.number(enumDefinition?.values.length ?? -1),
                  ...(rangeBoundProfiles((range ?? multirange)!, config.sql.codegen?.checks)?.length
                    ? [boundContext(item.type)]
                    : []),
                ]
              : []),
            ...(isArrayLikeType(item.type) && !compositeArray
              ? [
                  go.string(arrayElementIdentity(arrayLikeElementType(item.type)!)),
                  go.number(arrayElementFamily(arrayLikeElementType(item.type)!)!),
                  boundContext(item.type),
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
        const diagnosticEvaluation = prepared.diagnosticEntryName
          ? go.call(
              go.selector(
                go.ident('checkrust'),
                prepared.diagnosticEntryName.replace(
                  /(^|_)([a-z0-9])/gu,
                  (_, _separator, part: string) => part.toUpperCase(),
                ),
              ),
              arguments_,
            )
          : undefined
        if (diagnosticEvaluation) rustInputAdapters.add('checkRustEvaluation')
        return {
          ...(diagnosticEvaluation ? { diagnosticEvaluation } : {}),
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
          'checkRustXml',
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
                    'diagnosticEvaluation' in result && result.diagnosticEvaluation
                      ? go.call(go.ident('checkRustEvaluation'), [
                          go.string(checks[index]!.owner),
                          go.string(checks[index]!.plan.name),
                          result.diagnosticEvaluation,
                          go.string(result.unknownMessage),
                        ])
                      : go.call(go.ident('checkEvaluation'), [
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

const goRustAdapterSource = `func checkRustArrayNullness[T any](field CheckOptional[T],elementType string,elementKind int,boundProfile checkruntime.RangeBoundContext,tree ...string) checkruntime.BoolValue { return checkruntime.ArrayIsNull(checkRustArray(field,elementType,elementKind,boundProfile,tree...)) }
func checkRustArrayProfileWord(input string) int {
  word,width:=utf8.DecodeRuneInString(input)
  if width==0 || width!=len(input) || (word==utf8.RuneError && width==1) { return -1 }
  return int(word)
}
func checkRustArray[T any](field CheckOptional[T], elementType string, elementKind int,boundProfile checkruntime.RangeBoundContext,tree ...string) checkruntime.ArrayValue {
  if !field.Set { return checkruntime.ArrayUnknown() }
  if field.Null { return checkruntime.ArrayNull() }
  input,ok:=any(field.V).(checkruntime.ArrayValue)
  if !ok { return checkruntime.ArrayUnknown() }
  if input.Kind==checkruntime.ArrayValueUnknown || input.Kind==checkruntime.ArrayValueNull || input.Kind==checkruntime.ArrayValueError { return input }
  if input.Kind!=checkruntime.ArrayValueValue || input.Value.ElementType!=elementType || input.Value.ElementKind!=elementKind { return checkruntime.ArrayUnknown() }
  depth:=0
  if len(tree)>=2 { depth=len(tree[1])-1 }
  if !checkRustArrayTree(input,depth,boundProfile,tree...) { return checkruntime.ArrayUnknown() }
  input=checkRustArrayTypedMetadata(input,boundProfile,tree...)
  if len(boundProfile.Nodes)>0 {
    if len(tree)==7 { return checkruntime.ArrayFromCoercedRangeTypedProfileTree(input,tree[0],tree[1],tree[2],tree[3],checkRustArrayProfileWord(tree[4]),checkRustArrayProfileWord(tree[5]),checkRustArrayProfileWord(tree[6]),boundProfile) }
    if len(tree)==8 { return checkruntime.ArrayFromCoercedMultirangeTypedProfileTree(input,tree[0],tree[1],tree[2],tree[3],tree[4],checkRustArrayProfileWord(tree[5]),checkRustArrayProfileWord(tree[6]),checkRustArrayProfileWord(tree[7]),boundProfile) }
    return checkruntime.ArrayUnknown()
  }
  if len(tree)==9 { count,err:=strconv.Atoi(tree[8]);if err!=nil { return checkruntime.ArrayUnknown() };return checkruntime.ArrayFromCoercedRangeDefinedProfileTree(input,tree[0],tree[1],tree[2],tree[3],checkRustArrayProfileWord(tree[4]),checkRustArrayProfileWord(tree[5]),checkRustArrayProfileWord(tree[6]),tree[7],count) }
  if len(tree)==10 { count,err:=strconv.Atoi(tree[9]);if err!=nil { return checkruntime.ArrayUnknown() };return checkruntime.ArrayFromCoercedMultirangeDefinedProfileTree(input,tree[0],tree[1],tree[2],tree[3],tree[4],checkRustArrayProfileWord(tree[5]),checkRustArrayProfileWord(tree[6]),checkRustArrayProfileWord(tree[7]),tree[8],count) }
  if len(tree)==7 && checkRustArrayProfileWord(tree[4])>=0 && checkRustArrayProfileWord(tree[5])>=0 && checkRustArrayProfileWord(tree[6])>=0 { return checkruntime.ArrayFromCoercedRangeProfileTree(input,tree[0],tree[1],tree[2],tree[3],checkRustArrayProfileWord(tree[4]),checkRustArrayProfileWord(tree[5]),checkRustArrayProfileWord(tree[6])) }
  if len(tree)==8 && checkRustArrayProfileWord(tree[5])>=0 && checkRustArrayProfileWord(tree[6])>=0 && checkRustArrayProfileWord(tree[7])>=0 { return checkruntime.ArrayFromCoercedMultirangeProfileTree(input,tree[0],tree[1],tree[2],tree[3],tree[4],checkRustArrayProfileWord(tree[5]),checkRustArrayProfileWord(tree[6]),checkRustArrayProfileWord(tree[7])) }
  if len(tree)>=2 { return checkruntime.ArrayFromCoercedTree(input,tree[0],tree[1]) }
  return checkruntime.ArrayFromCoercedValue(input,elementType,elementKind)
}
func checkRustArrayTypedMetadata(input checkruntime.ArrayValue,boundProfile checkruntime.RangeBoundContext,tree ...string) checkruntime.ArrayValue {
  if input.Kind!=checkruntime.ArrayValueValue || len(tree)<5 { return input }
  payload:=input.Value
  elements:=make([]checkruntime.ArrayElement,len(payload.Elements));copy(elements,payload.Elements)
  labels:="";count:=-1
  if len(tree)==9 { labels=tree[7];count,_=strconv.Atoi(tree[8]) }
  if len(tree)==10 { labels=tree[8];count,_=strconv.Atoi(tree[9]) }
  for i,element:=range elements {
    if element.Kind==checkruntime.ArrayElementArray { nested:=checkRustArrayTypedMetadata(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:element.Array},boundProfile,tree...);element.Array=nested.Value }
    if element.Kind==checkruntime.ArrayElementRange { span:=checkRustRangeBoundMetadata(element.Range,boundProfile);span.BoundProfile=boundProfile;span.Support=checkruntime.RangeBuiltinSupport(span.TypeName,span.ElementType,span.ElementKind);span.EnumLabels=labels;span.EnumCount=count;element.Range=span }
    if element.Kind==checkruntime.ArrayElementMultirange {
      multi:=element.Multirange;ranges:=make([]checkruntime.RangeValue,len(multi.Ranges));copy(ranges,multi.Ranges)
      for j,rangeValue:=range ranges { if rangeValue.Kind==checkruntime.RangeValueValue { span:=checkRustRangeBoundMetadata(rangeValue.Value,boundProfile);span.BoundProfile=boundProfile;span.Support=checkruntime.RangeBuiltinSupport(span.TypeName,span.ElementType,span.ElementKind);span.EnumLabels=labels;span.EnumCount=count;rangeValue.Value=span;ranges[j]=rangeValue } }
      multi.Ranges=ranges;multi.Support=checkruntime.RangeBuiltinSupport(multi.RangeType,multi.ElementType,multi.ElementKind);element.Multirange=multi
    }
    elements[i]=element
  }
  payload.Elements=elements
  return checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:payload}
}
func checkRustCompositeArrayNullness(input CheckOptional[checkruntime.ArrayValue],plan checkruntime.CompositeTypePlan,elementType string)checkruntime.BoolValue{return checkruntime.ArrayIsNull(checkRustCompositeArray(input,plan,elementType))}
func checkRustCompositeArray(input CheckOptional[checkruntime.ArrayValue],plan checkruntime.CompositeTypePlan,elementType string)checkruntime.ArrayValue{
  if !input.Set{return checkruntime.ArrayUnknown()};if input.Null{return checkruntime.ArrayNull()}
  value:=input.V;if value.Kind!=checkruntime.ArrayValueValue{return value}
  if plan.Kind!=checkruntime.CompositeTypePlanValue||len(plan.Value.Nodes)==0{return checkruntime.ArrayUnknown()}
  p:=value.Value
  if len(p.Dimensions)>6||len(p.Elements)>2147483647{return checkruntime.ArrayUnknown()}
  for _,dimension:=range p.Dimensions{if dimension.Lower < -2147483648||dimension.Lower > 2147483647||dimension.Length < -2147483648||dimension.Length > 2147483647{return checkruntime.ArrayUnknown()}}
  elements:=make([]checkruntime.ArrayElement,len(p.Elements))
  for i,cell:=range p.Elements{checked,ok:=checkRustCompositeCell(cell,plan,0);if !ok{return checkruntime.ArrayUnknown()};elements[i]=checked}
  p.Elements=elements;value.Value=p
  return checkruntime.ArrayFromCoercedCompositePlan(value,elementType,plan)
}
func checkRustComposite(input CheckOptional[checkruntime.CompositeValue],plan checkruntime.CompositeTypePlan)checkruntime.CompositeValue{
  if !input.Set{return checkruntime.CompositeUnknown()};if input.Null{return checkruntime.CompositeNull()}
  value:=input.V;if value.Kind!=checkruntime.CompositeValueValue{return value}
  cell,ok:=checkRustCompositeCell(checkruntime.ArrayElement{Kind:checkruntime.ArrayElementComposite,Composite:value.Value},plan,0)
  if !ok{return checkruntime.CompositeUnknown()}
  return checkruntime.CompositeFromCoercedPlan(checkruntime.ArrayElementToComposite(cell),plan)
}
func checkRustCompositeCell(input checkruntime.ArrayElement,plan checkruntime.CompositeTypePlan,index int)(checkruntime.ArrayElement,bool){
  if input.Kind==checkruntime.ArrayElementUnknown||input.Kind==checkruntime.ArrayElementNull||input.Kind==checkruntime.ArrayElementError{return input,true}
  if plan.Kind!=checkruntime.CompositeTypePlanValue||index<0||index>=len(plan.Value.Nodes){return input,false}
  node:=plan.Value.Nodes[index]
  if node.Kind==42||node.Kind==43{return checkRustProfiledBound(input,node.BoundProfile,0)}
  if node.Kind!=41&&node.Kind!=44{return input,checkRustArrayElement(input,node.Kind,0,checkruntime.RangeBoundContext{})}
  if node.Kind==44{
    if input.Kind!=checkruntime.ArrayElementComposite{return input,false};p:=input.Composite
    if p.TypeName!=node.TypeName||len(p.Fields)!=len(node.Fields){return input,false}
    fields:=make([]checkruntime.ArrayElement,len(p.Fields));for i,field:=range p.Fields{value,ok:=checkRustCompositeCell(field,plan,node.Fields[i]);if !ok{return input,false};fields[i]=value};p.Fields=fields;input.Composite=p;return input,true
  }
  if input.Kind!=checkruntime.ArrayElementArray||node.Child<0||node.Child>=len(plan.Value.Nodes){return input,false}
  child:=plan.Value.Nodes[node.Child];p:=input.Array
  if p.ElementType!=node.ElementType||p.ElementKind!=child.Kind||len(p.Dimensions)>6||len(p.Elements)>2147483647{return input,false}
  for _,d:=range p.Dimensions{if d.Lower < -2147483648||d.Lower>2147483647||d.Length < -2147483648||d.Length>2147483647{return input,false}}
  if p.NullBitmap.Kind!=checkruntime.BoolValueUnknown&&p.NullBitmap.Kind!=checkruntime.BoolValueNull&&p.NullBitmap.Kind!=checkruntime.BoolValueError&&p.NullBitmap.Kind!=checkruntime.BoolValueValue{return input,false}
  elements:=make([]checkruntime.ArrayElement,len(p.Elements));for i,cell:=range p.Elements{value,ok:=checkRustCompositeCell(cell,plan,node.Child);if !ok{return input,false};elements[i]=value};p.Elements=elements;input.Array=p;return input,true
}

func checkRustProfiledBound(input checkruntime.ArrayElement,profile checkruntime.RangeBoundContext,index int)(checkruntime.ArrayElement,bool) {
  if input.Kind==checkruntime.ArrayElementUnknown || input.Kind==checkruntime.ArrayElementNull || input.Kind==checkruntime.ArrayElementError { return input,true }
  if index<0 || index>=len(profile.Nodes) {return input,false}
  node:=profile.Nodes[index]
  if node.Kind==6 && input.Kind==checkruntime.ArrayElementEnum {input.Enum.LabelOid=0}
  if node.Kind==44 {
    if input.Kind!=checkruntime.ArrayElementComposite || input.Composite.TypeName!=node.TypeName || len(input.Composite.Fields)!=len(node.Fields) {return input,false}
    p:=input.Composite;fields:=make([]checkruntime.ArrayElement,len(p.Fields))
    for i,cell:=range p.Fields {value,ok:=checkRustProfiledBound(cell,profile,node.Fields[i].Child);if !ok {return input,false};fields[i]=value}
    p.Fields=fields;input.Composite=p;return input,true
  }
  if node.Kind<41 || node.Kind>=45 {return input,checkRustArrayElement(input,node.Kind,0,checkruntime.RangeBoundContext{})}
  if node.Child<0 || node.Child>=len(profile.Nodes) {return input,false}
  child:=profile.Nodes[node.Child]
  if node.Kind==41 {
    if input.Kind!=checkruntime.ArrayElementArray {return input,false}
    p:=input.Array
    if p.ElementType!=node.ElementType || p.ElementKind!=child.Kind || len(p.Dimensions)>6 || len(p.Elements)>2147483647 {return input,false}
    for _,d:=range p.Dimensions {if d.Lower < -2147483648 || d.Lower>2147483647 || d.Length < -2147483648 || d.Length>2147483647 {return input,false}}
    elements:=make([]checkruntime.ArrayElement,len(p.Elements))
    for i,cell:=range p.Elements {value,ok:=checkRustProfiledBound(cell,profile,node.Child);if !ok {return input,false};elements[i]=value}
    p.Elements=elements;input.Array=p;return input,true
  }
  if node.Kind==42 {
    if input.Kind!=checkruntime.ArrayElementRange {return input,false}
    p:=input.Range
    if p.TypeName!=node.TypeName || p.ElementType!=node.ElementType || p.ElementKind!=child.Kind || len(p.Bounds)>2 {return input,false}
    bounds:=make([]checkruntime.ArrayElement,len(p.Bounds))
    for i,bound:=range p.Bounds {value,ok:=checkRustProfiledBound(bound,profile,node.Child);if !ok {return input,false};bounds[i]=value}
    p.Bounds=bounds;p.Support=checkruntime.MakeRangeSupport(child.Comparison,node.Canonical);p.BoundProfile=checkruntime.RangeBoundContextBranch(&profile,node.Child);p.EnumLabels=child.EnumLabels;p.EnumCount=child.EnumCount
    input.Range=p;return input,true
  }
  if node.Kind==43 {
    if input.Kind!=checkruntime.ArrayElementMultirange || child.Kind!=42 || child.Child<0 || child.Child>=len(profile.Nodes) {return input,false}
    leaf:=profile.Nodes[child.Child];p:=input.Multirange
    if p.TypeName!=node.TypeName || p.RangeType!=node.ElementType || p.ElementType!=child.ElementType || p.ElementKind!=leaf.Kind || len(p.Ranges)>2147483647 {return input,false}
    ranges:=make([]checkruntime.RangeValue,len(p.Ranges))
    for i,span:=range p.Ranges {
      if span.Kind==checkruntime.RangeValueUnknown || span.Kind==checkruntime.RangeValueNull || span.Kind==checkruntime.RangeValueError {ranges[i]=span;continue}
      if span.Kind!=checkruntime.RangeValueValue {return input,false}
      value,ok:=checkRustProfiledBound(checkruntime.ArrayElement{Kind:checkruntime.ArrayElementRange,Range:span.Value},profile,node.Child);if !ok {return input,false}
      span.Value=value.Range;ranges[i]=span
    }
    p.Ranges=ranges;p.Support=checkruntime.MakeRangeSupport(leaf.Comparison,child.Canonical);input.Multirange=p;return input,true
  }
  return input,false
}
func checkRustRangeBoundMetadata(p checkruntime.RangePayload,profile checkruntime.RangeBoundContext) checkruntime.RangePayload {
  if len(profile.Nodes)==0 {return p}
  bounds:=make([]checkruntime.ArrayElement,len(p.Bounds))
  for i,bound:=range p.Bounds {value,_:=checkRustProfiledBound(bound,profile,0);bounds[i]=value}
  p.Bounds=bounds;return p
}
func checkRustArrayTree(input checkruntime.ArrayValue,depth int,boundProfile checkruntime.RangeBoundContext,tree ...string) bool {
  if input.Kind!=checkruntime.ArrayValueValue { return false }
  if len(input.Value.Dimensions)>6 || len(input.Value.Elements)>2147483647 { return false }
  for _,dimension:=range input.Value.Dimensions { if dimension.Lower < -2147483648 || dimension.Lower > 2147483647 || dimension.Length < -2147483648 || dimension.Length > 2147483647 { return false } }
  for _,cell:=range input.Value.Elements { if !checkRustArrayElement(cell,input.Value.ElementKind,depth,boundProfile,tree...) { return false } }
  return true
}
func checkRustArrayElement(input checkruntime.ArrayElement,family int,depth int,boundProfile checkruntime.RangeBoundContext,tree ...string) bool {
  if input.Kind==checkruntime.ArrayElementAclitem {p:=input.Aclitem;if p.Grantee<0 || p.Grantee>4294967295 || p.Grantor<0 || p.Grantor>4294967295 || p.Privileges<0 || p.Privileges>4294967295 || p.GrantOptions<0 || p.GrantOptions>4294967295 {return false}}

  if input.Kind < checkruntime.ArrayElementUnknown || input.Kind > checkruntime.ArrayElementAclitem { return false }
  if input.Kind==checkruntime.ArrayElementUnknown || input.Kind==checkruntime.ArrayElementNull || input.Kind==checkruntime.ArrayElementError { return true }
  if input.Kind==checkruntime.ArrayElementArray {
    if depth<1 || family!=41 { return false }
    return checkRustArrayTree(checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:input.Array},depth-1,boundProfile,tree...)
  }
  if input.Kind==checkruntime.ArrayElementMultirange {
    if family!=43 || (len(tree)!=6 && len(tree)!=8 && len(tree)!=10) || checkRustArrayProfileWord(tree[5])<0 { return false }
    p:=input.Multirange
    if p.TypeName!=tree[2] || p.RangeType!=tree[3] || p.ElementType!=tree[4] || p.ElementKind!=checkRustArrayProfileWord(tree[5]) || len(p.Ranges)>2147483647 { return false }
    for _,span:=range p.Ranges {
      if span.Kind==checkruntime.RangeValueUnknown || span.Kind==checkruntime.RangeValueNull || span.Kind==checkruntime.RangeValueError { continue }
      if span.Kind!=checkruntime.RangeValueValue || !checkRustArrayElement(checkruntime.ArrayElement{Kind:checkruntime.ArrayElementRange,Range:span.Value},42,0,boundProfile,tree[0],tree[1],tree[3],tree[4],tree[5]) { return false }
    }
    return true
  }
  if input.Kind==checkruntime.ArrayElementRange {
    if family!=42 || (len(tree)!=5 && len(tree)!=7 && len(tree)!=9) || checkRustArrayProfileWord(tree[4])<0 { return false }
    p:=input.Range
    if p.TypeName!=tree[2] || p.ElementType!=tree[3] || p.ElementKind!=checkRustArrayProfileWord(tree[4]) || len(p.Bounds)>2 { return false }
    boundDepth:=0;for _,node:=range boundProfile.Nodes {if node.Kind==41 {boundDepth++}}
    for _,bound:=range p.Bounds { if len(boundProfile.Nodes)>0 {if _,ok:=checkRustProfiledBound(bound,boundProfile,0);!ok {return false}} else if !checkRustArrayElement(bound,p.ElementKind,boundDepth,checkruntime.RangeBoundContext{}) {return false} }
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
  if input.Kind==checkruntime.ArrayElementXml && (!utf8.ValidString(input.Xml) || strings.IndexByte(input.Xml,0)>=0) { return false }
  if input.Kind==checkruntime.ArrayElementXmlRenderedText && (!utf8.ValidString(input.XmlRenderedText) || strings.IndexByte(input.XmlRenderedText,0)>=0) { return false }
  if input.Kind==checkruntime.ArrayElementXmlNonNull && checkruntime.MakeXmlKnowledge(input.XmlNonNull.Document,input.XmlNonNull.Content).Kind!=checkruntime.XmlValueNonNull { return false }
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
func checkRustXml[T any](field CheckOptional[T]) checkruntime.XmlValue {
  if !field.Set { return checkruntime.XmlUnknown() }
  if field.Null { return checkruntime.XmlNull() }
  if value,ok:=any(field.V).(checkruntime.XmlValue);ok {
    if value.Kind==checkruntime.XmlValueValue {
      if !utf8.ValidString(value.Value) || strings.IndexByte(value.Value,0)>=0 { return checkruntime.XmlUnknown() }
      return value
    }
    if value.Kind==checkruntime.XmlValueRenderedText {
      if !utf8.ValidString(value.RenderedText) || strings.IndexByte(value.RenderedText,0)>=0 { return checkruntime.XmlUnknown() }
      return value
    }
    if value.Kind==checkruntime.XmlValueNonNull { return checkruntime.MakeXmlKnowledge(value.NonNull.Document,value.NonNull.Content) }
    if value.Kind==checkruntime.XmlValueUnknown || value.Kind==checkruntime.XmlValueNull || value.Kind==checkruntime.XmlValueError {return value}
  }
  return checkruntime.XmlUnknown()
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
func checkRustMultirange[T any](field CheckOptional[T], typeName string, rangeType string, elementType string, elementKind int, enumLabels string, enumCount int, profiles ...checkruntime.RangeBoundContext) checkruntime.MultirangeValue {
  boundProfile:=checkruntime.RangeBoundContext{};if len(profiles)>0 {boundProfile=profiles[0]}
  if !field.Set { return checkruntime.MultirangeUnknown() }
  if field.Null { return checkruntime.MultirangeNull() }
  value,ok:=any(field.V).(checkruntime.MultirangeValue)
  if !ok { return checkruntime.MultirangeUnknown() }
  if value.Kind==checkruntime.MultirangeValueUnknown || value.Kind==checkruntime.MultirangeValueNull || value.Kind==checkruntime.MultirangeValueError { return value }
  if value.Kind!=checkruntime.MultirangeValueValue { return checkruntime.MultirangeUnknown() }
  p:=value.Value
  if p.TypeName!=typeName || p.RangeType!=rangeType || p.ElementType!=elementType || p.ElementKind!=elementKind { return checkruntime.MultirangeUnknown() }
  ranges:=make([]checkruntime.RangeValue,len(p.Ranges))
  for i,span:=range p.Ranges {
    if span.Kind==checkruntime.RangeValueValue && (span.Value.TypeName!=rangeType || span.Value.ElementType!=elementType || span.Value.ElementKind!=elementKind) { return checkruntime.MultirangeUnknown() }
    checked:=checkRustRange(CheckOptional[checkruntime.RangeValue]{Set:true,V:span},enumLabels,enumCount,boundProfile)
    if checked.Kind==checkruntime.RangeValueUnknown { return checkruntime.MultirangeUnknown() }
    if checked.Kind==checkruntime.RangeValueError { return checkruntime.MultirangeValue{Kind:checkruntime.MultirangeValueError,Error:checked.Error} }
    if checked.Kind!=checkruntime.RangeValueValue || checked.Value.Empty { return checkruntime.MultirangeUnknown() }
    ranges[i]=checked
  }
  p.Ranges=ranges
  p.Support=checkruntime.RangeBuiltinSupport(rangeType,elementType,elementKind)
  return checkruntime.MakeCoercedMultirangeValue(p)
}
func checkRustRange[T any](field CheckOptional[T], enumLabels string, enumCount int, profiles ...checkruntime.RangeBoundContext) checkruntime.RangeValue {
  boundProfile:=checkruntime.RangeBoundContext{};if len(profiles)>0 {boundProfile=profiles[0]}
  if !field.Set { return checkruntime.RangeUnknown() }
  if field.Null { return checkruntime.RangeNull() }
  value,ok:=any(field.V).(checkruntime.RangeValue)
  if !ok { return checkruntime.RangeUnknown() }
  if value.Kind==checkruntime.RangeValueUnknown || value.Kind==checkruntime.RangeValueNull || value.Kind==checkruntime.RangeValueError { return value }
  if value.Kind!=checkruntime.RangeValueValue { return checkruntime.RangeUnknown() }
  p:=value.Value
  if !utf8.ValidString(p.TypeName) || strings.IndexByte(p.TypeName,0)>=0 || !utf8.ValidString(p.ElementType) || strings.IndexByte(p.ElementType,0)>=0 || p.ElementKind < 1 || p.ElementKind > 2147483647 || len(p.Bounds)>2 { return checkruntime.RangeUnknown() }
  boundDepth:=0;for _,node:=range boundProfile.Nodes {if node.Kind==41 {boundDepth++}}
    for _,bound:=range p.Bounds { if len(boundProfile.Nodes)>0 {if _,ok:=checkRustProfiledBound(bound,boundProfile,0);!ok {return checkruntime.RangeUnknown()}} else if !checkRustArrayElement(bound,p.ElementKind,boundDepth,checkruntime.RangeBoundContext{}) {return checkruntime.RangeUnknown()} };p=checkRustRangeBoundMetadata(p,boundProfile)
  p.Support=checkruntime.RangeBuiltinSupport(p.TypeName,p.ElementType,p.ElementKind)
  p.BoundProfile=boundProfile
  p.EnumLabels=enumLabels
  p.EnumCount=enumCount
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
func checkRustAclitem[T any](field CheckOptional[T]) checkruntime.AclitemValue {
  if !field.Set { return checkruntime.AclitemUnknown() }
  if field.Null { return checkruntime.AclitemNull() }
  if value, ok := any(field.V).(checkruntime.AclitemValue); ok {
    if value.Kind == checkruntime.AclitemValueValue { return checkruntime.MakeAclitemValue(value.Value.Grantee,value.Value.Grantor,value.Value.Privileges,value.Value.GrantOptions) }
    if value.Kind == checkruntime.AclitemValueUnknown || value.Kind == checkruntime.AclitemValueNull || value.Kind == checkruntime.AclitemValueError { return value }
  }
  return checkruntime.AclitemUnknown()
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
func checkRustEvaluation(owner,constraint string,value checkruntime.CheckEvaluationResult,fallback string) CheckEvaluation {
 description:=checkruntime.CheckRequirementMessage(value.Reason)
 if description.Kind==checkruntime.TextValueValue {fallback=description.Value}
 return checkEvaluation(owner,constraint,checkRustOutcome(value.Outcome),fallback)
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
