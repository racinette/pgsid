import type { CompositeTypeGraph } from '../../../catalog/types.js'
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
import type { CheckExecutionContext } from '../../shared/check-rust-evaluator.js'
import ts from 'typescript'
import type { DomainInfo, EnumInfo, TableInfo, RangeTypeInfo } from '../../../catalog/types.js'
import { enumType, isRangeType, isMultirangeType } from '../../../sql-semantics/expressions.js'
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
  catalogOidType,
  catalogPolygonType,
  catalogPathType,
  catalogCircleType,
  catalogBoxType,
} from '../../../sql-semantics/catalog-check-binder.js'
import { emitEvalBoolExpression } from '../../../sql-semantics/check-expressions.js'
import { portableCheckAtoms } from '../../shared/check-atom-support.js'
import { checkUnknownMessage } from '../../shared/check-diagnostics.js'
import { prepareCheckRustGroup } from '../../shared/check-rust-source.js'
import { transpileCheckRustFiles } from '../../shared/check-rust-transpile.js'
import { exportModifier, factory, identifier, printFile } from '../ast.js'
import { typeName } from '../type-mapping.js'
import { typescriptEvalBoolBackend } from './check.js'
import { typescriptSqlBackend } from './registry.js'
import { typescriptSqlRuntime } from './runtime.js'

export function renderTypescriptSchemaChecks(
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[] = [],
  selectedDomains: readonly DomainInfo[] = domains,
  options: {
    typedInputs?: boolean
    compositeTypeGraph?: CompositeTypeGraph
    rangeTypes?: readonly RangeTypeInfo[]
    enums?: readonly EnumInfo[]
    executionContext?: CheckExecutionContext
  } = {},
): string {
  return renderTypescriptSchemaCheckArtifacts(tables, domains, selectedDomains, options, false)
    .checks
}

export function renderTypescriptSchemaCheckArtifacts(
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[] = [],
  selectedDomains: readonly DomainInfo[] = domains,
  options: {
    typedInputs?: boolean
    executionContext?: CheckExecutionContext
    rustModuleSpecifier?: string
    compositeTypeGraph?: CompositeTypeGraph
    rangeTypes?: readonly RangeTypeInfo[]
    enums?: readonly EnumInfo[]
  } = {},
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
  const typedInputs = options.typedInputs ?? false
  const portableValueType = (name: string, oid: number | undefined): string | null => {
    if (catalogCompositeType(name, options.compositeTypeGraph, options.rangeTypes))
      return 'CompositeValue'
    if (
      catalogArrayType(
        name,
        oid,
        domains,
        options.enums,
        options.rangeTypes,
        undefined,
        options.compositeTypeGraph,
      )
    )
      return 'ArrayValue'
    if (catalogRangeType(name, oid, domains, options.rangeTypes)) return 'RangeValue'
    if (catalogMultirangeType(name, oid, domains, options.rangeTypes)) return 'MultirangeValue'
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
    options.enums,
    options.rangeTypes,
    options.compositeTypeGraph,
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
        options.executionContext,
      )
    : null
  let rustIndex = 0
  const row = identifier('row')
  const inputHelpers = new Set<string>()
  const rustInputAdapters = new Set<string>()
  const callInput = (helper: string, name: string): ts.Expression => {
    inputHelpers.add(helper)
    return factory.createCallExpression(identifier(helper), undefined, [
      row,
      factory.createStringLiteral(name),
    ])
  }
  const inputHelper = (type: string): string | null => {
    if (type === 'pg_catalog.bool') return 'checkInputBoolean'
    if (type === 'pg_catalog.int8') return 'checkInputInt8'
    if (/^pg_catalog\.int[24]$/u.test(type)) return 'checkInputInteger'
    if (/^pg_catalog\.float[48]$/u.test(type)) return 'checkInputFloat'
    if (
      [
        'pg_catalog.refcursor',
        'pg_catalog.name',
        'pg_catalog.text',
        'pg_catalog."varchar"',
        'pg_catalog.bpchar',
      ].includes(type)
    )
      return 'checkInputText'
    return null
  }
  const backend = {
    ...typescriptEvalBoolBackend,
    guardInputs: (names: readonly string[], expression: ts.Expression): ts.Expression =>
      factory.createConditionalExpression(
        names
          .map((name) => callInput('checkTextKnown', name))
          .reduce((left, right) =>
            factory.createBinaryExpression(left, ts.SyntaxKind.AmpersandAmpersandToken, right),
          ),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        expression,
        factory.createToken(ts.SyntaxKind.ColonToken),
        factory.createCallExpression(identifier('evalBoolUncertain'), undefined, []),
      ),
  }
  const literal = (value: unknown): ts.Expression => {
    if (typeof value === 'string') return factory.createStringLiteral(value)
    if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse()
    if (typeof value === 'number')
      return value < 0
        ? factory.createPrefixUnaryExpression(
            ts.SyntaxKind.MinusToken,
            factory.createNumericLiteral(-value),
          )
        : factory.createNumericLiteral(value)
    if (Array.isArray(value)) return factory.createArrayLiteralExpression(value.map(literal))
    if (value && typeof value === 'object')
      return factory.createObjectLiteralExpression(
        Object.entries(value).map(([key, item]) =>
          factory.createPropertyAssignment(key, literal(item)),
        ),
      )
    throw new Error('Invalid compiled composite context')
  }
  const compositeContext = (type: string): ts.Expression => {
    const nodes = compositeNodes(type, options.executionContext)
    if (!nodes) throw new Error('Missing composite field context')
    return literal({
      kind: 'Value',
      value: {
        nodes: nodes.map((node) => ({ ...node, boundProfile: { nodes: node.boundProfile } })),
      },
    })
  }
  const emitted = groups.map((group) => ({
    ...group,
    results: group.checks.map(({ plan }) => {
      const prepared = rustGroup?.checks[rustIndex++]
      const unknownMessage = checkUnknownMessage(
        plan.expression,
        prepared?.kind === 'unsupported' ? prepared.reason : undefined,
      )
      if (prepared?.kind === 'supported') {
        const args = prepared.inputs.map((item) => {
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
              'CompositeValue',
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
            throw new Error(`Unsupported TypeScript Rust CHECK input: ${item.rustType}`)
          const compositeArray =
            item.type.startsWith('array:') && compositeContainerProfile(item.type.slice(6))
          const helper = compositeArray
            ? item.nullness
              ? 'checkRustCompositeArrayNullness'
              : 'checkRustCompositeArray'
            : item.rustType === 'CompositeValue'
              ? 'checkRustComposite'
              : item.type.startsWith('array:')
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
                                                                                                          'TextValue'
                                                                                                        ? 'checkRustText'
                                                                                                        : 'checkRustBool'
          rustInputAdapters.add(helper)
          if (item.rustType === 'CompositeValue' || compositeArray)
            rustInputAdapters.add('checkRustCompositeCell')
          if (compositeArray) rustInputAdapters.add('checkRustCompositeArray')
          if (helper === 'checkRustPolygon') {
            rustInputAdapters.add('checkRustPath')
            rustInputAdapters.add('checkRustBox')
          }
          if (
            item.type.startsWith('array:') ||
            item.rustType === 'RangeValue' ||
            item.rustType === 'MultirangeValue' ||
            item.rustType === 'CompositeValue'
          ) {
            if (item.rustType === 'MultirangeValue') rustInputAdapters.add('checkRustRange')
            rustInputAdapters.add('checkRustArray')
            rustInputAdapters.add('checkRustArrayValue')
            rustInputAdapters.add('checkRustCompositeCell')
            rustInputAdapters.add('checkRustArrayElement')
            rustInputAdapters.add('checkRustProfiledBound')
            rustInputAdapters.add('checkRustArrayField')
            rustInputAdapters.add('checkRustArrayProfiles')
            rustInputAdapters.add('checkRustArrayRecords')
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
            item.rustType !== 'CompositeValue' &&
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
            item.rustType !== 'NetworkValue' &&
            item.rustType !== 'UuidValue' &&
            item.rustType !== 'MacaddrValue' &&
            item.rustType !== 'Macaddr8Value' &&
            item.rustType !== 'ByteaValue' &&
            item.rustType !== 'BitValue' &&
            item.rustType !== 'NumericValue' &&
            item.rustType !== 'DateValue' &&
            item.rustType !== 'TimestampValue' &&
            item.rustType !== 'TimestamptzValue'
          )
            inputHelpers.add(
              item.nullness
                ? 'checkInputNullness'
                : item.rustType === 'Int8Value'
                  ? 'checkInputInt8'
                  : item.rustType === 'Int2Value' || item.rustType === 'Int4Value'
                    ? 'checkInputInteger'
                    : item.rustType === 'TextValue'
                      ? 'checkInputText'
                      : item.enum
                        ? 'checkInputText'
                        : 'checkInputBoolean',
            )
          const multirange = multirangeTypeProfile(item.type)
          const range = rangeTypeProfile(item.type)
          const compiledProfile =
            range ??
            multirange ??
            (item.type.startsWith('array:')
              ? (arrayRangeProfile(item.type) ?? arrayMultirangeProfile(item.type))
              : null)
          const nodes = compiledProfile
            ? rangeBoundProfiles(compiledProfile, options.executionContext)
            : []
          if (!nodes) throw new Error('Missing compiled array-bound range context')
          const boundContext = factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
              'nodes',
              factory.createArrayLiteralExpression(
                nodes.map((node) =>
                  factory.createObjectLiteralExpression(
                    Object.entries(node).map(([key, value]) =>
                      factory.createPropertyAssignment(
                        key,
                        typeof value === 'string'
                          ? factory.createStringLiteral(value)
                          : typeof value === 'boolean'
                            ? value
                              ? factory.createTrue()
                              : factory.createFalse()
                            : value < 0
                              ? factory.createPrefixUnaryExpression(
                                  ts.SyntaxKind.MinusToken,
                                  factory.createNumericLiteral(-value),
                                )
                              : factory.createNumericLiteral(value),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ])
          const enumDefinition = (range ?? multirange)?.subtypeEnum
          return factory.createCallExpression(identifier(helper), undefined, [
            row,
            factory.createStringLiteral(item.name),
            ...(item.rustType === 'CompositeValue' || compositeArray
              ? [compositeContext(compositeArray ? item.type.slice(6) : item.type)]
              : []),
            ...(compositeArray
              ? [factory.createStringLiteral(arrayElementIdentity(item.type.slice(6)))]
              : []),
            ...(multirange
              ? [
                  factory.createStringLiteral(multirange.multirange),
                  factory.createStringLiteral(multirange.identity),
                  factory.createStringLiteral(multirange.subtype),
                  factory.createNumericLiteral(arrayElementFamily(multirange.elementType)!),
                ]
              : []),
            ...(range || multirange
              ? [
                  factory.createStringLiteral(enumDefinition?.values.join('\0') ?? ''),
                  enumDefinition
                    ? factory.createNumericLiteral(enumDefinition.values.length)
                    : factory.createPrefixUnaryExpression(
                        ts.SyntaxKind.MinusToken,
                        factory.createNumericLiteral(1),
                      ),
                ]
              : []),
            ...(range || multirange ? (nodes.length ? [boundContext] : []) : []),
            ...(item.type.startsWith('array:') && !compositeArray
              ? [
                  factory.createStringLiteral(
                    arrayElementIdentity(item.type.slice('array:'.length)),
                  ),
                  factory.createNumericLiteral(
                    arrayElementFamily(item.type.slice('array:'.length))!,
                  ),
                  boundContext,
                  ...arrayInputPlan(item.type).map((value) => factory.createStringLiteral(value)),
                ]
              : []),
            ...(item.enum
              ? [
                  factory.createArrayLiteralExpression(
                    item.enum.values.map((label) => factory.createStringLiteral(label)),
                  ),
                ]
              : []),
          ])
        })
        return {
          value: {
            expression: factory.createCallExpression(identifier('checkRustOutcome'), undefined, [
              factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  identifier('_checkRust'),
                  prepared.entryName.replace(/_([a-z0-9])/gu, (_, part: string) =>
                    part.toUpperCase(),
                  ),
                ),
                undefined,
                args,
              ),
            ]),
          },
          helpers: ['evalBoolCertain', 'evalBoolUncertain'],
          unknownMessage,
        }
      }
      const result = emitEvalBoolExpression(
        portableCheckAtoms(plan.expression, false),
        { ...typescriptSqlBackend, input: (name) => callInput('checkTextValue', name) },
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
                : { expression, helpers: ['EvalValue'] }
            },
            input: (type, name, definition) => {
              if (definition) {
                inputHelpers.add('checkInputEnum')
                return {
                  expression: factory.createCallExpression(
                    identifier('checkInputEnum'),
                    undefined,
                    [
                      row,
                      factory.createStringLiteral(name),
                      factory.createStringLiteral(enumType(definition)),
                      factory.createArrayLiteralExpression(
                        definition.values.map((label) => factory.createStringLiteral(label)),
                      ),
                    ],
                  ),
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
              return { expression: callInput(helper, name), helpers: ['EvalValue'] }
            },
          },
        },
      )
      return { ...result, unknownMessage }
    }),
  }))
  const namedImport = (names: readonly string[], module: string): ts.ImportDeclaration =>
    factory.createImportDeclaration(
      undefined,
      factory.createImportClause(
        true,
        undefined,
        factory.createNamedImports(
          [...new Set(names)]
            .sort()
            .map((name) =>
              factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)),
            ),
        ),
      ),
      factory.createStringLiteral(module),
      undefined,
    )
  const portableInputType = (type: string): ts.TypeNode =>
    type === 'NumericValue'
      ? factory.createUnionTypeNode([
          factory.createTypeReferenceNode('_checkRust.NumericValue'),
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ])
      : type === 'ArrayValue'
        ? factory.createUnionTypeNode([
            factory.createTypeReferenceNode('Exclude', [
              factory.createTypeReferenceNode('_checkRust.ArrayValue'),
              factory.createTypeLiteralNode([
                factory.createPropertySignature(
                  undefined,
                  'kind',
                  undefined,
                  factory.createLiteralTypeNode(factory.createStringLiteral('Value')),
                ),
              ]),
            ]),
            factory.createTypeLiteralNode([
              factory.createPropertySignature(
                undefined,
                'kind',
                undefined,
                factory.createLiteralTypeNode(factory.createStringLiteral('Value')),
              ),
              factory.createPropertySignature(
                undefined,
                'value',
                undefined,
                factory.createIntersectionTypeNode([
                  factory.createTypeReferenceNode('Omit', [
                    factory.createTypeReferenceNode('_checkRust.ArrayPayload'),
                    factory.createLiteralTypeNode(factory.createStringLiteral('nullBitmap')),
                  ]),
                  factory.createTypeReferenceNode('Partial', [
                    factory.createTypeReferenceNode('Pick', [
                      factory.createTypeReferenceNode('_checkRust.ArrayPayload'),
                      factory.createLiteralTypeNode(factory.createStringLiteral('nullBitmap')),
                    ]),
                  ]),
                ]),
              ),
            ]),
          ])
        : factory.createTypeReferenceNode(`_checkRust.${type}`)
  const inputType = (group: (typeof groups)[number]): ts.TypeNode => {
    const table =
      group.kind === 'table'
        ? tables.find(
            (table) => table.schema === group.source.schema && table.name === group.source.name,
          )
        : undefined
    const domain =
      group.kind === 'domain'
        ? domains.find(
            (domain) => domain.schema === group.source.schema && domain.name === group.source.name,
          )
        : undefined
    const portableInputs = new Map<string, string>(
      rustGroup?.source
        ? table
          ? table.columns.flatMap((column) => {
              const type = portableValueType(column.typeName, column.typeOid)
              return type ? [[column.name, type] as const] : []
            })
          : domain && portableValueType(domain.baseTypeName, domain.baseTypeOid)
            ? [['value', portableValueType(domain.baseTypeName, domain.baseTypeOid)!]]
            : []
        : [],
    )
    if (group.kind === 'domain')
      return factory.createTypeLiteralNode([
        factory.createPropertySignature(
          undefined,
          'value',
          factory.createToken(ts.SyntaxKind.QuestionToken),
          factory.createUnionTypeNode([
            portableInputs.has('value')
              ? portableInputType(portableInputs.get('value')!)
              : factory.createTypeReferenceNode(typeName(group.source.name)),
            factory.createLiteralTypeNode(factory.createNull()),
          ]),
        ),
      ])
    const selected = factory.createTypeReferenceNode('InferSelect', [
      factory.createTypeReferenceNode(typeName(group.source.name)),
    ])
    return factory.createMappedTypeNode(
      undefined,
      factory.createTypeParameterDeclaration(
        undefined,
        'K',
        factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, selected),
        undefined,
      ),
      undefined,
      factory.createToken(ts.SyntaxKind.QuestionToken),
      factory.createUnionTypeNode([
        [...new Set(portableInputs.values())].reduceRight(
          (otherwise, type) =>
            factory.createConditionalTypeNode(
              factory.createTypeReferenceNode('K'),
              factory.createUnionTypeNode(
                [...portableInputs]
                  .filter(([, value]) => value === type)
                  .map(([name]) =>
                    factory.createLiteralTypeNode(factory.createStringLiteral(name)),
                  ),
              ),
              portableInputType(type),
              otherwise,
            ),
          factory.createIndexedAccessTypeNode(
            selected,
            factory.createTypeReferenceNode('K'),
          ) as ts.TypeNode,
        ),
        factory.createLiteralTypeNode(factory.createNull()),
      ]),
      undefined,
    )
  }
  const rustFiles = rustGroup?.source ? transpileCheckRustFiles(rustGroup.source).typescript : null
  return {
    checks: printFile([
      ...(rustGroup?.source
        ? [
            factory.createImportDeclaration(
              undefined,
              factory.createImportClause(
                false,
                undefined,
                factory.createNamespaceImport(identifier('_checkRust')),
              ),
              factory.createStringLiteral(options.rustModuleSpecifier ?? './checks-rust/checks.js'),
            ),
          ]
        : []),
      ...(typedInputs && groups.some((group) => group.kind === 'table')
        ? [
            namedImport(['InferSelect'], '../helpers.js'),
            namedImport(
              groups
                .filter((group) => group.kind === 'table')
                .map((group) => typeName(group.source.name)),
              './tables.js',
            ),
          ]
        : []),
      ...(typedInputs && groups.some((group) => group.kind === 'domain')
        ? [
            namedImport(
              groups
                .filter((group) => group.kind === 'domain')
                .map((group) => typeName(group.source.name)),
              './domains.js',
            ),
          ]
        : []),
      ...typescriptSqlRuntime([
        'EvalBool',
        ...emitted.flatMap((group) => group.results.flatMap((result) => result.helpers)),
      ]),
      ...checkInputStatements(inputHelpers),
      ...synthesizedStatements(typescriptCheckEvaluationSource),
      ...(rustGroup?.source
        ? synthesizedStatements(typescriptRustAdapterSource).filter(
            (statement) =>
              (ts.isVariableStatement(statement) &&
                statement.declarationList.declarations.every(
                  (declaration) =>
                    ts.isIdentifier(declaration.name) &&
                    rustInputAdapters.has(declaration.name.text),
                )) ||
              (ts.isFunctionDeclaration(statement) &&
                statement.name &&
                (statement.name.text === 'checkRustOutcome' ||
                  rustInputAdapters.has(statement.name.text) ||
                  (['checkRustDate', 'checkRustTimestamptz', 'checkRustNumeric'].includes(
                    statement.name.text,
                  ) &&
                    rustInputAdapters.has('checkRustNullness')))),
          )
        : []),
      ...(typedInputs
        ? groups.map((group) =>
            factory.createTypeAliasDeclaration(
              [exportModifier],
              `${typeName(group.name)}CheckInput`,
              undefined,
              inputType(group),
            ),
          )
        : []),
      ...emitted.map(({ name, kind, checks, results }) =>
        factory.createFunctionDeclaration(
          [exportModifier],
          undefined,
          `evaluate${typeName(name)}${kind === 'domain' ? 'DomainChecks' : 'Checks'}`,
          undefined,
          [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              row,
              undefined,
              typedInputs
                ? factory.createTypeReferenceNode(`${typeName(name)}CheckInput`)
                : factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword),
            ),
          ],
          undefined,
          factory.createBlock(
            [
              factory.createReturnStatement(
                factory.createArrayLiteralExpression(
                  results.map((result, index) =>
                    factory.createCallExpression(identifier('checkEvaluation'), undefined, [
                      factory.createStringLiteral(checks[index]!.owner),
                      factory.createStringLiteral(checks[index]!.plan.name),
                      factory.createArrowFunction(
                        undefined,
                        undefined,
                        [],
                        undefined,
                        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        result.value.expression,
                      ),
                      factory.createStringLiteral(result.unknownMessage),
                    ]),
                  ),
                  true,
                ),
              ),
            ],
            true,
          ),
        ),
      ),
    ]),
    rust: rustFiles?.checks ?? null,
    rustFiles,
  }
}

const typescriptRustAdapterSource = `const checkRustArrayRecords: Readonly<Record<string,Readonly<Record<string,string>>>> = {"SqlError":{"state":"u32"},"ArrayDimension":{"lower":"i32","length":"i32"},"BoxPayload":{"highX":"i64","highY":"i64","lowX":"i64","lowY":"i64","wireKnown":"bool"},"CirclePayload":{"x":"i64","y":"i64","radius":"i64","wireKnown":"bool"},"EnumPayload":{"ordinal":"i32","labelOid":"i64"},"IntervalPayload":{"months":"i32","days":"i32","time":"i64"},"JsonPayload":{"source":"String","kind":"i32","depth":"usize"},"JsonbNode":{"kind":"i32","child":"usize","next":"usize","keyStart":"usize","keyEnd":"usize","textStart":"usize","textEnd":"usize"},"JsonbPayload":{"characters":"Vec<char>","nodes":"Vec<JsonbNode>","root":"usize"},"JsonpathNode":{"kind":"i32","next":"usize","left":"usize","right":"usize","textStart":"usize","textEnd":"usize","first":"i32","last":"i32","flags":"i32"},"JsonpathPayload":{"characters":"Vec<char>","nodes":"Vec<JsonpathNode>","root":"usize","lax":"bool"},"LinePayload":{"a":"i64","b":"i64","c":"i64","wireKnown":"bool"},"LsegPayload":{"x1":"i64","y1":"i64","x2":"i64","y2":"i64","wireKnown":"bool"},"MacAddress":{"word0":"i32","word1":"i32","word2":"i32","word3":"i32"},"NetworkAddress":{"family":"usize","prefix":"i32","word0":"i32","word1":"i32","word2":"i32","word3":"i32","word4":"i32","word5":"i32","word6":"i32","word7":"i32"},"PathPayload":{"closed":"bool","points":"Vec<PointPayload>"},"PointPayload":{"x":"i64","y":"i64","wireKnown":"bool"},"PolygonPayload":{"points":"Vec<PointPayload>","bounds":"BoxValue"},"SnapshotPayload":{"xmin":"i64","xmax":"i64","xip":"Vec<SnapshotXid>"},"SnapshotXid":{"bits":"i64"},"TimetzPayload":{"time":"i64","zone":"i32"},"Uuid":{"word0":"i32","word1":"i32","word2":"i32","word3":"i32","word4":"i32","word5":"i32","word6":"i32","word7":"i32"}}
const checkRustArrayProfiles: Readonly<Record<string,readonly [number,string]>> = {"Int2":[1,"i32"],"Int4":[2,"i32"],"Int8":[3,"i64"],"Timestamp":[4,"i64"],"Timestamptz":[5,"i64"],"Enum":[6,"EnumPayload"],"Date":[7,"i32"],"Text":[8,"String"],"Bool":[9,"bool"],"Numeric":[10,"String"],"Json":[11,"JsonPayload"],"Jsonb":[12,"JsonbPayload"],"Network":[13,"NetworkAddress"],"Bit":[14,"String"],"Bytea":[15,"String"],"Macaddr":[16,"MacAddress"],"Macaddr8":[17,"MacAddress"],"Uuid":[18,"Uuid"],"Float4":[19,"i32"],"Float8":[20,"i64"],"Time":[21,"i64"],"Timetz":[22,"TimetzPayload"],"Interval":[23,"IntervalPayload"],"Point":[24,"PointPayload"],"Line":[25,"LinePayload"],"Lseg":[26,"LsegPayload"],"Box":[27,"BoxPayload"],"Path":[28,"PathPayload"],"Polygon":[29,"PolygonPayload"],"Circle":[30,"CirclePayload"],"Money":[31,"i64"],"InternalChar":[32,"i32"],"Oid":[33,"i64"],"Xid":[34,"i64"],"Cid":[35,"i64"],"Snapshot":[36,"SnapshotPayload"],"Xid8":[37,"i64"],"PgLsn":[38,"i64"],"Tid":[39,"i64"],"Jsonpath":[40,"JsonpathPayload"],"JsonpathStoredText":[40,"String"]}
function checkRustArrayNullness(row: object,name: string,elementType: string,elementKind: number,boundProfile: _checkRust.RangeBoundContext,...tree: string[]): _checkRust.BoolValue { return _checkRust.arrayIsNull(checkRustArray(row,name,elementType,elementKind,boundProfile,...tree)) }
function checkRustArray(row: object, name: string, elementType: string, elementKind: number,boundProfile: _checkRust.RangeBoundContext,...tree: string[]): _checkRust.ArrayValue {
  const input = Reflect.get(row,name)
  if (!Object.hasOwn(row,name) || input === undefined) return _checkRust.arrayUnknown()
  return checkRustArrayValue(input,elementType,elementKind,tree.length>=2 ? tree[1]!.length-1 : 0,tree,false,boundProfile)
}
function checkRustCompositeArrayNullness(row: object,name: string,plan: _checkRust.CompositeTypePlan,elementType:string): _checkRust.BoolValue {return _checkRust.arrayIsNull(checkRustCompositeArray(row,name,plan,elementType))}
function checkRustCompositeArray(row: object,name: string,plan: _checkRust.CompositeTypePlan,elementType:string): _checkRust.ArrayValue {
  if(!Object.hasOwn(row,name))return _checkRust.arrayUnknown()
  return checkRustArrayValue(Reflect.get(row,name),elementType,plan.value.nodes[0]?.kind ?? 0,0,[],false,{nodes:[]},plan)
}
function checkRustArrayValue(input: unknown, elementType: string, elementKind: number, depth: number, tree: string[]=[], nested=false,boundProfile: _checkRust.RangeBoundContext={nodes:[]},compositePlan?: _checkRust.CompositeTypePlan): _checkRust.ArrayValue {
  if (input === null) return _checkRust.arrayNull()
  if (!input || typeof input !== 'object' || !('kind' in input)) return _checkRust.arrayUnknown()
  if (input.kind === 'Unknown' || input.kind === 'Null') return {kind:input.kind}
  if (input.kind === 'Error') {
    if (!('value' in input) || !checkRustArrayField(input.value,'SqlError')) return _checkRust.arrayUnknown()
    return {kind:'Error',value:input.value as _checkRust.SqlError}
  }
  if (input.kind !== 'Value' || !('value' in input) || !input.value || typeof input.value !== 'object') return _checkRust.arrayUnknown()
  const value=input.value
  if (!('elementType' in value) || value.elementType !== elementType || !('elementKind' in value) || value.elementKind !== elementKind || !('dimensions' in value) || !Array.isArray(value.dimensions) || value.dimensions.length>6 || !('elements' in value) || !Array.isArray(value.elements) || value.elements.length>2147483647) return _checkRust.arrayUnknown()
  const dimensions: _checkRust.ArrayDimension[]=[]
  for(const dimension of value.dimensions) {
    if (!checkRustArrayField(dimension,'ArrayDimension')) return _checkRust.arrayUnknown()
    dimensions.push(dimension as _checkRust.ArrayDimension)
  }
  const elements: _checkRust.ArrayElement[]=[]
  for(const cell of value.elements) {
    const element=compositePlan ? checkRustCompositeCell(cell,compositePlan,0) : checkRustArrayElement(cell,elementKind,depth,tree,boundProfile)
    if (element===null) return _checkRust.arrayUnknown()
    elements.push(element)
  }
  let nullBitmap: _checkRust.BoolValue={kind:'Unknown'}
  if ('nullBitmap' in value && value.nullBitmap !== undefined) {
    const flag=value.nullBitmap
    if (!flag || typeof flag !== 'object' || !('kind' in flag)) return _checkRust.arrayUnknown()
    if (flag.kind==='Value' && 'value' in flag && typeof flag.value==='boolean') nullBitmap={kind:'Value',value:flag.value}
    else if (flag.kind==='Null' || flag.kind==='Error') nullBitmap={kind:'Null'}
    else if (flag.kind!=='Unknown') return _checkRust.arrayUnknown()
  }
  const result: _checkRust.ArrayValue={kind:'Value',value:{elementType,elementKind,dimensions,elements,nullBitmap}}
  if(compositePlan)return _checkRust.arrayFromCoercedCompositePlan(result,elementType,compositePlan)
  if(nested) return result
  if(boundProfile.nodes.length) {
    if(tree.length===7) return _checkRust.arrayFromCoercedRangeTypedProfileTree(result,tree[0]!,tree[1]!,tree[2]!,tree[3]!,tree[4]!.codePointAt(0)!,tree[5]!.codePointAt(0)!,tree[6]!.codePointAt(0)!,boundProfile)
    if(tree.length===8) return _checkRust.arrayFromCoercedMultirangeTypedProfileTree(result,tree[0]!,tree[1]!,tree[2]!,tree[3]!,tree[4]!,tree[5]!.codePointAt(0)!,tree[6]!.codePointAt(0)!,tree[7]!.codePointAt(0)!,boundProfile)
    return _checkRust.arrayUnknown()
  }
  if(tree.length===9) return _checkRust.arrayFromCoercedRangeDefinedProfileTree(result,tree[0]!,tree[1]!,tree[2]!,tree[3]!,tree[4]!.codePointAt(0)!,tree[5]!.codePointAt(0)!,tree[6]!.codePointAt(0)!,tree[7]!,Number(tree[8]))
  if(tree.length===10) return _checkRust.arrayFromCoercedMultirangeDefinedProfileTree(result,tree[0]!,tree[1]!,tree[2]!,tree[3]!,tree[4]!,tree[5]!.codePointAt(0)!,tree[6]!.codePointAt(0)!,tree[7]!.codePointAt(0)!,tree[8]!,Number(tree[9]))
  if(tree.length===7 && tree[4]!.length===1 && tree[5]!.length===1 && tree[6]!.length===1) return _checkRust.arrayFromCoercedRangeProfileTree(result,tree[0]!,tree[1]!,tree[2]!,tree[3]!,tree[4]!.codePointAt(0)!,tree[5]!.codePointAt(0)!,tree[6]!.codePointAt(0)!)
  if(tree.length===8 && tree[5]!.length===1 && tree[6]!.length===1 && tree[7]!.length===1) return _checkRust.arrayFromCoercedMultirangeProfileTree(result,tree[0]!,tree[1]!,tree[2]!,tree[3]!,tree[4]!,tree[5]!.codePointAt(0)!,tree[6]!.codePointAt(0)!,tree[7]!.codePointAt(0)!)
  return tree.length>=2 ? _checkRust.arrayFromCoercedTree(result,tree[0]!,tree[1]!) : _checkRust.arrayFromCoercedValue(result,elementType,elementKind)
}
function checkRustComposite(row:object,name:string,plan:_checkRust.CompositeTypePlan):_checkRust.CompositeValue {
  if(!Object.hasOwn(row,name))return _checkRust.compositeUnknown()
  const input=Reflect.get(row,name)
  if(input===null)return _checkRust.compositeNull()
  if(!input||typeof input!=='object'||!('kind' in input))return _checkRust.compositeUnknown()
  if(input.kind==='Null')return _checkRust.compositeNull()
  if(input.kind==='Unknown')return _checkRust.compositeUnknown()
  if(input.kind==='Error')return 'value' in input&&checkRustArrayField(input.value,'SqlError')?{kind:'Error',value:input.value as _checkRust.SqlError}:_checkRust.compositeUnknown()
  if(input.kind!=='Value'||!('value' in input))return _checkRust.compositeUnknown()
  const value=checkRustCompositeCell({kind:'Composite',value:input.value},plan,0)
  return value?.kind==='Composite'?_checkRust.compositeFromCoercedPlan({kind:'Value',value:value.value},plan):_checkRust.compositeUnknown()
}
function checkRustCompositeCell(input:unknown,plan:_checkRust.CompositeTypePlan,index:number):_checkRust.ArrayElement|null {
  if(!input||typeof input!=='object'||!('kind' in input))return null
  if(input.kind==='Unknown'||input.kind==='Null'||input.kind==='Error')return checkRustArrayElement(input,0,0)
  const node=plan.value.nodes[index]
  if(!node)return null
  if(node.kind===42||node.kind===43)return checkRustProfiledBound(input,node.boundProfile,0)
  if(node.kind!==41&&node.kind!==44)return checkRustArrayElement(input,node.kind,0)
  if(!('value' in input)||!input.value||typeof input.value!=='object')return null
  const p=input.value
  if(node.kind===44){
    if(input.kind!=='Composite'||!('typeName' in p)||p.typeName!==node.typeName||!('fields' in p)||!Array.isArray(p.fields)||p.fields.length!==node.fields.length)return null
    const fields:_checkRust.ArrayElement[]=[]
    for(let i=0;i<p.fields.length;i++){const child=checkRustCompositeCell(p.fields[i],plan,node.fields[i]!);if(child===null)return null;fields.push(child)}
    return {kind:'Composite',value:{typeName:node.typeName,fields}}
  }
  const child=plan.value.nodes[node.child]
  if(!child||input.kind!=='Array'||!('elementType' in p)||p.elementType!==node.elementType||!('elementKind' in p)||p.elementKind!==child.kind||!('dimensions' in p)||!Array.isArray(p.dimensions)||p.dimensions.length>6||!('elements' in p)||!Array.isArray(p.elements)||p.elements.length>2147483647)return null
  const dimensions:_checkRust.ArrayDimension[]=[],elements:_checkRust.ArrayElement[]=[]
  for(const dimension of p.dimensions){if(!checkRustArrayField(dimension,'ArrayDimension'))return null;dimensions.push(dimension as _checkRust.ArrayDimension)}
  for(const element of p.elements){const value=checkRustCompositeCell(element,plan,node.child);if(value===null)return null;elements.push(value)}
  let nullBitmap:_checkRust.BoolValue={kind:'Unknown'}
  if('nullBitmap' in p&&p.nullBitmap!==undefined){
    const flag=p.nullBitmap
    if(!flag||typeof flag!=='object'||!('kind' in flag))return null
    if(flag.kind==='Value'&&'value' in flag&&typeof flag.value==='boolean')nullBitmap={kind:'Value',value:flag.value}
    else if(flag.kind==='Null'||flag.kind==='Error')nullBitmap={kind:'Null'}
    else if(flag.kind!=='Unknown')return null
  }
  return {kind:'Array',value:{elementType:node.elementType,elementKind:child.kind,dimensions,elements,nullBitmap}}
}

function checkRustProfiledBound(input:unknown,profile:_checkRust.RangeBoundContext,index:number):_checkRust.ArrayElement|null {
  if(!input || typeof input!=='object' || !('kind' in input))return null
  if(input.kind==='Unknown' || input.kind==='Null' || input.kind==='Error')return checkRustArrayElement(input,0,0)
  const node=profile.nodes[index]
  if(!node)return null
  if(node.kind<41)return checkRustArrayElement(input,node.kind,0)
  const child=profile.nodes[node.child]
  if(!child || !('value' in input) || !input.value || typeof input.value!=='object')return null
  const p=input.value
  if(node.kind===41) {
    if(input.kind!=='Array' || !('elementType' in p) || p.elementType!==node.elementType || !('elementKind' in p) || p.elementKind!==child.kind || !('dimensions' in p) || !Array.isArray(p.dimensions) || p.dimensions.length>6 || !('elements' in p) || !Array.isArray(p.elements) || p.elements.length>2147483647)return null
    const dimensions:_checkRust.ArrayDimension[]=[],elements:_checkRust.ArrayElement[]=[]
    for(const d of p.dimensions){if(!checkRustArrayField(d,'ArrayDimension'))return null;dimensions.push(d as _checkRust.ArrayDimension)}
    for(const cell of p.elements){const value=checkRustProfiledBound(cell,profile,node.child);if(value===null)return null;elements.push(value)}
    let nullBitmap:_checkRust.BoolValue={kind:'Unknown'}
    if('nullBitmap' in p && p.nullBitmap!==undefined){
      const flag=p.nullBitmap
      if(!flag || typeof flag!=='object' || !('kind' in flag))return null
      if(flag.kind==='Value' && 'value' in flag && typeof flag.value==='boolean')nullBitmap={kind:'Value',value:flag.value}
      else if(flag.kind==='Null' || flag.kind==='Error')nullBitmap={kind:'Null'}
      else if(flag.kind!=='Unknown')return null
    }
    return{kind:'Array',value:{elementType:node.elementType,elementKind:child.kind,dimensions,elements,nullBitmap}}
  }
  if(node.kind===42) {
    if(input.kind!=='Range' || !('typeName' in p) || p.typeName!==node.typeName || !('elementType' in p) || p.elementType!==node.elementType || !('elementKind' in p) || p.elementKind!==child.kind || !('empty' in p) || typeof p.empty!=='boolean' || !('lowerInclusive' in p) || typeof p.lowerInclusive!=='boolean' || !('upperInclusive' in p) || typeof p.upperInclusive!=='boolean' || !('bounds' in p) || !Array.isArray(p.bounds) || p.bounds.length>2)return null
    const bounds:_checkRust.ArrayElement[]=[]
    for(const bound of p.bounds){const value=checkRustProfiledBound(bound,profile,node.child);if(value===null)return null;bounds.push(value)}
    return{kind:'Range',value:{typeName:node.typeName,elementType:node.elementType,elementKind:child.kind,empty:p.empty,lowerInclusive:p.lowerInclusive,upperInclusive:p.upperInclusive,bounds,support:_checkRust.makeRangeSupport(child.comparison,node.canonical),boundProfile:_checkRust.rangeBoundContextBranch(profile,node.child),enumLabels:child.enumLabels,enumCount:child.enumCount}}
  }
  if(node.kind===43) {
    const leaf=profile.nodes[child.child]
    if(input.kind!=='Multirange' || child.kind!==42 || !leaf || !('typeName' in p) || p.typeName!==node.typeName || !('rangeType' in p) || p.rangeType!==node.elementType || !('elementType' in p) || p.elementType!==child.elementType || !('elementKind' in p) || p.elementKind!==leaf.kind || !('ranges' in p) || !Array.isArray(p.ranges) || p.ranges.length>2147483647)return null
    const ranges:_checkRust.RangeValue[]=[]
    for(const span of p.ranges){
      if(!span || typeof span!=='object' || !('kind' in span))return null
      if(span.kind==='Unknown' || span.kind==='Null'){ranges.push({kind:span.kind});continue}
      if(span.kind==='Error'){if(!('value' in span) || !checkRustArrayField(span.value,'SqlError'))return null;ranges.push({kind:'Error',value:span.value as _checkRust.SqlError});continue}
      if(span.kind!=='Value' || !('value' in span))return null
      const value=checkRustProfiledBound({kind:'Range',value:span.value},profile,node.child)
      if(value===null || value.kind!=='Range')return null
      ranges.push({kind:'Value',value:value.value})
    }
    return{kind:'Multirange',value:{typeName:node.typeName,rangeType:node.elementType,elementType:child.elementType,elementKind:leaf.kind,support:_checkRust.makeRangeSupport(leaf.comparison,child.canonical),ranges}}
  }
  return null
}
function checkRustArrayElement(input: unknown, family: number, depth: number, tree: string[]=[],boundProfile: _checkRust.RangeBoundContext={nodes:[]}): _checkRust.ArrayElement | null {
  if (!input || typeof input !== 'object' || !('kind' in input)) return null
  if (input.kind==='Unknown' || input.kind==='Null') return {kind:input.kind}
  if (input.kind==='Error') return 'value' in input && checkRustArrayField(input.value,'SqlError') ? {kind:'Error',value:input.value as _checkRust.SqlError} : null
  if(input.kind==='Array' && family===41) {
    if(depth<1 || !('value' in input) || !input.value || typeof input.value!=='object') return null
    const value=input.value
    if(!('elementType' in value) || typeof value.elementType!=='string' || !('elementKind' in value) || !checkRustArrayField(value.elementKind,'i32')) return null
    const result=checkRustArrayValue({kind:'Value',value},value.elementType,value.elementKind as number,depth-1,tree,true,boundProfile)
    return result.kind==='Value' ? {kind:'Array',value:result.value} : null
  }
  if(input.kind==='Multirange') {
    if(family!==43 || (tree.length!==6 && tree.length!==8 && tree.length!==10) || tree[5]!.length!==1 || !('value' in input) || !input.value || typeof input.value!=='object') return null
    const p=input.value,kind=tree[5]!.codePointAt(0)!
    if(!('typeName' in p) || p.typeName!==tree[2] || !('rangeType' in p) || p.rangeType!==tree[3] || !('elementType' in p) || p.elementType!==tree[4] || !('elementKind' in p) || p.elementKind!==kind || !('ranges' in p) || !Array.isArray(p.ranges) || p.ranges.length>2147483647) return null
    const ranges:_checkRust.RangeValue[]=[]
    for(const span of p.ranges) {
      if(!span || typeof span!=='object' || !('kind' in span)) return null
      if(span.kind==='Unknown' || span.kind==='Null') {ranges.push({kind:span.kind});continue}
      if(span.kind==='Error') {
        if(!('value' in span) || !checkRustArrayField(span.value,'SqlError')) return null
        ranges.push({kind:'Error',value:span.value as _checkRust.SqlError});continue
      }
      if(span.kind!=='Value' || !('value' in span)) return null
      const value=checkRustArrayElement({kind:'Range',value:span.value},42,0,[tree[0]!,tree[1]!,tree[3]!,tree[4]!,tree[5]!,...(tree.length===10 ? [tree[6]!,tree[7]!,tree[8]!,tree[9]!] : [])],boundProfile)
      if(value===null || value.kind!=='Range') return null
      ranges.push({kind:'Value',value:value.value})
    }
    return {kind:'Multirange',value:{typeName:tree[2]!,rangeType:tree[3]!,elementType:tree[4]!,elementKind:kind,support:_checkRust.rangeBuiltinSupport(tree[3]!,tree[4]!,kind),ranges}}
  }
  if(input.kind==='Range') {
    if(family!==42 || (tree.length!==5 && tree.length!==7 && tree.length!==9) || tree[4]!.length!==1 || !('value' in input) || !input.value || typeof input.value!=='object') return null
    const p=input.value
    const kind=tree[4]!.codePointAt(0)!
    if(!('typeName' in p) || p.typeName!==tree[2] || !('elementType' in p) || p.elementType!==tree[3] || !('elementKind' in p) || p.elementKind!==kind || !('empty' in p) || typeof p.empty!=='boolean' || !('lowerInclusive' in p) || typeof p.lowerInclusive!=='boolean' || !('upperInclusive' in p) || typeof p.upperInclusive!=='boolean' || !('bounds' in p) || !Array.isArray(p.bounds) || p.bounds.length>2) return null
    const bounds:_checkRust.ArrayElement[]=[]
    for(const bound of p.bounds) {
      const cell=boundProfile.nodes.length?checkRustProfiledBound(bound,boundProfile,0):checkRustArrayElement(bound,kind,0)
      if(cell===null) return null
      bounds.push(cell)
    }
    return {kind:'Range',value:{typeName:tree[2]!,elementType:tree[3]!,elementKind:kind,enumLabels:tree.length===9 ? tree[7]! : '',enumCount:tree.length===9 ? Number(tree[8]) : -1,boundProfile,support:_checkRust.rangeBuiltinSupport(tree[2]!,tree[3]!,kind),empty:p.empty,lowerInclusive:p.lowerInclusive,upperInclusive:p.upperInclusive,bounds}}
  }
  if (input.kind==='Float4UnspecifiedNan' && family===19) return {kind:'Float4UnspecifiedNan'}
  if (input.kind==='Float8UnspecifiedNan' && family===20) return {kind:'Float8UnspecifiedNan'}
  if (input.kind==='BoxNonNull' && family===27) return {kind:'BoxNonNull'}
  if (input.kind==='ByteaUnspecified' && family===15 && 'value' in input && checkRustArrayField(input.value,'i32') && (input.value as number)>=0) return {kind:'ByteaUnspecified',value:input.value as number}
  if(input.kind==='JsonpathStoredText' && 'value' in input && input.value==='') return null
  const variants = checkRustArrayProfiles
  const variant=typeof input.kind==='string' ? variants[input.kind] : undefined
  if (!variant || variant[0]!==family || !('value' in input) || !checkRustArrayField(input.value,variant[1])) return null
  return input as _checkRust.ArrayElement
}
function checkRustArrayField(value: unknown, shape: string): boolean {
  if (shape==='i32') return typeof value==='number' && Number.isInteger(value) && value>=-2147483648 && value<=2147483647
  if (shape==='u32') return typeof value==='number' && Number.isInteger(value) && value>=0 && value<=4294967295
  if (shape==='usize') return typeof value==='number' && Number.isInteger(value) && value>=0 && value<=2147483647
  if (shape==='i64') return typeof value==='bigint' && value>=-9223372036854775808n && value<=9223372036854775807n
  if (shape==='bool') return typeof value==='boolean'
  if (shape==='String') return typeof value==='string' && !value.includes(String.fromCharCode(0)) && Array.from(value).every(character=>{const code=character.codePointAt(0)!;return code<55296 || code>57343})
  if (shape==='char') return typeof value==='string' && Array.from(value).length===1 && checkRustArrayField(value,'String')
  if (shape.startsWith('Vec<')) return Array.isArray(value) && value.length<=2147483647 && Array.from(value).every(element=>checkRustArrayField(element,shape.slice(4,-1)))
  if (!value || typeof value!=='object') return false
  if (shape==='BoxValue') {
    if (!('kind' in value)) return false
    if (value.kind==='Unknown' || value.kind==='NonNull') return true
    return value.kind==='Value' && 'value' in value && checkRustArrayField(value.value,'BoxPayload')
  }
  const records = checkRustArrayRecords
  const fields=records[shape]
  return fields!==undefined && Object.entries(fields).every(([name,type])=>Object.hasOwn(value,name) && checkRustArrayField(Reflect.get(value,name),type))
}
function checkRustXid(row: object, name: string): _checkRust.XidValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.xidUnknown()
  if (value === null) return _checkRust.xidNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.xidUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.XidValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= 0n && value.value <= 4294967295n)
    return _checkRust.makeXidValue(value.value)
  return _checkRust.xidUnknown()
}
function checkRustCid(row: object, name: string): _checkRust.CidValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.cidUnknown()
  if (value === null) return _checkRust.cidNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.cidUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.CidValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= 0n && value.value <= 4294967295n)
    return _checkRust.makeCidValue(value.value)
  return _checkRust.cidUnknown()
}
function checkRustPgLsn(row: object, name: string): _checkRust.PgLsnValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.pgLsnUnknown()
  if (value === null) return _checkRust.pgLsnNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.pgLsnUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.PgLsnValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= -9223372036854775808n && value.value <= 9223372036854775807n)
    return _checkRust.makePgLsnBits(value.value)
  return _checkRust.pgLsnUnknown()
}
function checkRustInternalChar(row: object, name: string): _checkRust.InternalCharValue {
  const value = (row as Record<string, unknown>)[name]
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.internalCharUnknown()
  if (value === null) return _checkRust.internalCharNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.internalCharUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.InternalCharValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'number' && Number.isInteger(value.value) && value.value >= 0 && value.value <= 255)
    return _checkRust.makeInternalCharValue(value.value)
  return _checkRust.internalCharUnknown()
}
function checkRustTid(row: object, name: string): _checkRust.TidValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.tidUnknown()
  if (value === null) return _checkRust.tidNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.tidUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.TidValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= 0n && value.value <= 281474976710655n)
    return _checkRust.makeTidValue(value.value)
  return _checkRust.tidUnknown()
}
function checkRustJsonpath(row: object, name: string): _checkRust.JsonpathValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.jsonpathUnknown()
  if (value === null) return _checkRust.jsonpathNull()
  if (!value || typeof value !== 'object' || !('kind' in value)) return _checkRust.jsonpathUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null') return {kind:value.kind}
  if (value.kind === 'Error') {
    if (!('value' in value) || !value.value || typeof value.value !== 'object' || !('state' in value.value) || typeof value.value.state !== 'number' || !Number.isInteger(value.value.state) || value.value.state < 0 || value.value.state > 4294967295) return _checkRust.jsonpathUnknown()
    return {kind:'Error',value:{state:value.value.state}}
  }
  if (value.kind === 'StoredText') {
    if (!('value' in value) || typeof value.value !== 'string' || value.value.length === 0 || value.value.includes(String.fromCharCode(0)) || /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/u.test(value.value)) return _checkRust.jsonpathUnknown()
    return { kind: 'StoredText', value: value.value }
  }
  if (value.kind !== 'Value' || !('value' in value) || !value.value || typeof value.value !== 'object') return _checkRust.jsonpathUnknown()
  const payload = value.value
  if (!('characters' in payload) || !Array.isArray(payload.characters) || !('nodes' in payload) || !Array.isArray(payload.nodes) || !('root' in payload) || typeof payload.root !== 'number' || !Number.isInteger(payload.root) || payload.root < 0 || payload.root > 2147483647 || payload.characters.length > 2147483647 || payload.nodes.length > 2147483647 || !('lax' in payload) || typeof payload.lax !== 'boolean') return _checkRust.jsonpathUnknown()
  const characters: string[] = []
  for (const character of payload.characters) {
    if (typeof character !== 'string' || Array.from(character).length !== 1) return _checkRust.jsonpathUnknown()
    const code = character.codePointAt(0)!
    if (code >= 55296 && code <= 57343) return _checkRust.jsonpathUnknown()
    characters.push(character)
  }
  const nodes: _checkRust.JsonpathNode[] = []
  for (const node of payload.nodes) {
    if (!node || typeof node !== 'object' || typeof node.kind !== 'number' || !Number.isInteger(node.kind) || node.kind < -2147483648 || node.kind > 2147483647) return _checkRust.jsonpathUnknown()
    for (const field of ['next','left','right','textStart','textEnd']) {
      const index = Reflect.get(node,field)
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 2147483647) return _checkRust.jsonpathUnknown()
    }
    for (const field of ['first','last','flags']) { const number = Reflect.get(node,field); if (typeof number !== 'number' || !Number.isInteger(number) || number < -2147483648 || number > 2147483647) return _checkRust.jsonpathUnknown() }
    nodes.push({kind:node.kind,next:node.next,left:node.left,right:node.right,textStart:node.textStart,textEnd:node.textEnd,first:node.first,last:node.last,flags:node.flags})
  }
  return _checkRust.jsonpathFromCoercedValue({kind:'Value',value:{characters,nodes,root:payload.root,lax:payload.lax}})
}
function checkRustJsonb(row: object, name: string): _checkRust.JsonbValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.jsonbUnknown()
  if (value === null) return _checkRust.jsonbNull()
  if (!value || typeof value !== 'object' || !('kind' in value)) return _checkRust.jsonbUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null') return {kind:value.kind}
  if (value.kind === 'Error') {
    if (!('value' in value) || !value.value || typeof value.value !== 'object' || !('state' in value.value) || typeof value.value.state !== 'number' || !Number.isInteger(value.value.state) || value.value.state < 0 || value.value.state > 4294967295) return _checkRust.jsonbUnknown()
    return {kind:'Error',value:{state:value.value.state}}
  }
  if (value.kind !== 'Value' || !('value' in value) || !value.value || typeof value.value !== 'object') return _checkRust.jsonbUnknown()
  const payload = value.value
  if (!('characters' in payload) || !Array.isArray(payload.characters) || !('nodes' in payload) || !Array.isArray(payload.nodes) || !('root' in payload) || typeof payload.root !== 'number' || !Number.isInteger(payload.root) || payload.root < 0 || payload.root > 2147483647 || payload.characters.length > 2147483647 || payload.nodes.length > 2147483647) return _checkRust.jsonbUnknown()
  const characters: string[] = []
  for (const character of payload.characters) {
    if (typeof character !== 'string' || Array.from(character).length !== 1) return _checkRust.jsonbUnknown()
    const code = character.codePointAt(0)!
    if (code >= 55296 && code <= 57343) return _checkRust.jsonbUnknown()
    characters.push(character)
  }
  const nodes: _checkRust.JsonbNode[] = []
  for (const node of payload.nodes) {
    if (!node || typeof node !== 'object' || typeof node.kind !== 'number' || !Number.isInteger(node.kind) || node.kind < -2147483648 || node.kind > 2147483647) return _checkRust.jsonbUnknown()
    for (const field of ['child','next','keyStart','keyEnd','textStart','textEnd']) {
      const index = Reflect.get(node,field)
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 2147483647) return _checkRust.jsonbUnknown()
    }
    nodes.push({kind:node.kind,child:node.child,next:node.next,keyStart:node.keyStart,keyEnd:node.keyEnd,textStart:node.textStart,textEnd:node.textEnd})
  }
  return _checkRust.jsonbFromCoercedValue({kind:'Value',value:{characters,nodes,root:payload.root}})
}
function checkRustJson(row: object, name: string): _checkRust.JsonValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.jsonUnknown()
  if (value === null) return _checkRust.jsonNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.jsonUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.JsonValue
  if (value.kind !== 'Value' || !('value' in value) || !value.value || typeof value.value !== 'object' || !('source' in value.value) || typeof value.value.source !== 'string') return _checkRust.jsonUnknown()
  const source = value.value.source
  if (source.includes(String.fromCharCode(0)) || /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/u.test(source)) return _checkRust.jsonUnknown()
  return _checkRust.makeJsonValue(source)
}
function checkRustMultirange(row: object, name: string, typeName: string, rangeType: string, elementType: string, elementKind: number, enumLabels: string, enumCount: number,boundProfile: _checkRust.RangeBoundContext={nodes:[]}): _checkRust.MultirangeValue {
  const input=Reflect.get(row,name)
  if (!Object.hasOwn(row,name) || input===undefined) return _checkRust.multirangeUnknown()
  if (input===null) return _checkRust.multirangeNull()
  if (!input || typeof input!=='object' || !('kind' in input)) return _checkRust.multirangeUnknown()
  if (input.kind==='Unknown' || input.kind==='Null') return {kind:input.kind}
  if (input.kind==='Error') return 'value' in input && checkRustArrayField(input.value,'SqlError') ? {kind:'Error',value:input.value as _checkRust.SqlError} : _checkRust.multirangeUnknown()
  if (input.kind!=='Value' || !('value' in input) || !input.value || typeof input.value!=='object') return _checkRust.multirangeUnknown()
  const p=input.value
  if (!('typeName' in p) || p.typeName!==typeName || !('rangeType' in p) || p.rangeType!==rangeType || !('elementType' in p) || p.elementType!==elementType || !('elementKind' in p) || p.elementKind!==elementKind || !('ranges' in p) || !Array.isArray(p.ranges)) return _checkRust.multirangeUnknown()
  const ranges: _checkRust.RangeValue[]=[]
  for (const span of p.ranges) {
    if (span && typeof span==='object' && 'kind' in span && span.kind==='Value') {
      if (!('value' in span) || !span.value || typeof span.value!=='object' || !('typeName' in span.value) || span.value.typeName!==rangeType || !('elementType' in span.value) || span.value.elementType!==elementType || !('elementKind' in span.value) || span.value.elementKind!==elementKind) return _checkRust.multirangeUnknown()
    }
    const value=checkRustRange({span},'span',enumLabels,enumCount,boundProfile)
    ranges.push(value)
    if(value.kind==='Unknown' || value.kind==='Error') break
  }
  return _checkRust.makeCoercedMultirangeValue({typeName,rangeType,elementType,elementKind,support:_checkRust.rangeBuiltinSupport(rangeType,elementType,elementKind),ranges})
}
function checkRustRange(row: object, name: string, enumLabels: string, enumCount: number,boundProfile: _checkRust.RangeBoundContext={nodes:[]}): _checkRust.RangeValue {
  const input=Reflect.get(row,name)
  if (!Object.hasOwn(row,name) || input===undefined) return _checkRust.rangeUnknown()
  if (input===null) return _checkRust.rangeNull()
  if (!input || typeof input!=='object' || !('kind' in input)) return _checkRust.rangeUnknown()
  if (input.kind==='Unknown' || input.kind==='Null') return {kind:input.kind}
  if (input.kind==='Error') return 'value' in input && checkRustArrayField(input.value,'SqlError') ? {kind:'Error',value:input.value as _checkRust.SqlError} : _checkRust.rangeUnknown()
  if (input.kind!=='Value' || !('value' in input) || !input.value || typeof input.value!=='object') return _checkRust.rangeUnknown()
  const p=input.value
  if (!('typeName' in p) || !checkRustArrayField(p.typeName,'String') || !('elementType' in p) || !checkRustArrayField(p.elementType,'String') || !('elementKind' in p) || !checkRustArrayField(p.elementKind,'i32') || !('empty' in p) || typeof p.empty!=='boolean' || !('lowerInclusive' in p) || typeof p.lowerInclusive!=='boolean' || !('upperInclusive' in p) || typeof p.upperInclusive!=='boolean' || !('bounds' in p) || !Array.isArray(p.bounds) || p.bounds.length>2) return _checkRust.rangeUnknown()
  const bounds: _checkRust.ArrayElement[]=[]
  for (const bound of p.bounds) {
    const cell=boundProfile.nodes.length?checkRustProfiledBound(bound,boundProfile,0):checkRustArrayElement(bound,p.elementKind as number,0)
    if (cell===null) return _checkRust.rangeUnknown()
    bounds.push(cell)
  }
  return _checkRust.makeCoercedRangeValue({typeName:p.typeName as string,elementType:p.elementType as string,elementKind:p.elementKind as number,enumLabels,enumCount,boundProfile,support:_checkRust.rangeBuiltinSupport(p.typeName as string,p.elementType as string,p.elementKind as number),empty:p.empty,lowerInclusive:p.lowerInclusive,upperInclusive:p.upperInclusive,bounds})
}
function checkRustSnapshot(row: object, name: string): _checkRust.SnapshotValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.snapshotUnknown()
  if (value === null) return _checkRust.snapshotNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.snapshotUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.SnapshotValue
  if (value.kind !== 'Value' || !('value' in value) || !value.value || typeof value.value !== 'object' || !('xmin' in value.value) || typeof value.value.xmin !== 'bigint' || value.value.xmin < -9223372036854775808n || value.value.xmin > 9223372036854775807n || !('xmax' in value.value) || typeof value.value.xmax !== 'bigint' || value.value.xmax < -9223372036854775808n || value.value.xmax > 9223372036854775807n || !('xip' in value.value) || !Array.isArray(value.value.xip) || value.value.xip.length > 134217724) return _checkRust.snapshotUnknown()
  const xip: _checkRust.SnapshotXid[] = []
  for (const word of value.value.xip) {
    if (!word || typeof word !== 'object' || typeof word.bits !== 'bigint' || word.bits < -9223372036854775808n || word.bits > 9223372036854775807n) return _checkRust.snapshotUnknown()
    xip.push({bits: word.bits})
  }
  return _checkRust.makeSnapshotValue({xmin: value.value.xmin, xmax: value.value.xmax, xip})
}
function checkRustXid8(row: object, name: string): _checkRust.Xid8Value {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.xid8Unknown()
  if (value === null) return _checkRust.xid8Null()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.xid8Unknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.Xid8Value
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= -9223372036854775808n && value.value <= 9223372036854775807n)
    return _checkRust.makeXid8Bits(value.value)
  return _checkRust.xid8Unknown()
}
function checkRustOid(row: object, name: string): _checkRust.OidValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.oidUnknown()
  if (value === null) return _checkRust.oidNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.oidUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.OidValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= 0n && value.value <= 4294967295n)
    return _checkRust.makeOidValue(value.value)
  return _checkRust.oidUnknown()
}
function checkRustMoney(row: object, name: string): _checkRust.MoneyValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.moneyUnknown()
  if (value === null) return _checkRust.moneyNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.moneyUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.MoneyValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= -9223372036854775808n && value.value <= 9223372036854775807n)
    return _checkRust.makeMoneyValue(value.value)
  return _checkRust.moneyUnknown()
}
function checkRustPolygon(row: object, name: string): _checkRust.PolygonValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.polygonUnknown()
  if (value === null) return _checkRust.polygonNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.polygonUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.PolygonValue
  if (value.kind !== 'Value' || !('value' in value) || !value.value || typeof value.value !== 'object' || !('points' in value.value)) return _checkRust.polygonUnknown()
  const path = checkRustPath({p: {kind: 'Value', value: {closed: true, points: value.value.points}}}, 'p')
  if (path.kind !== 'Value') return _checkRust.polygonUnknown()
  let bounds = _checkRust.boxUnknown()
  if ('bounds' in value.value && value.value.bounds !== undefined) {
    const raw = value.value.bounds
    if (!raw || typeof raw !== 'object') return _checkRust.polygonUnknown()
    const boxed = 'kind' in raw ? raw : {kind: 'Value', value: raw}
    bounds = checkRustBox({b: boxed}, 'b')
    if (bounds.kind === 'Unknown' && (!('kind' in boxed) || boxed.kind !== 'Unknown')) return _checkRust.polygonUnknown()
    if (bounds.kind === 'Null' || bounds.kind === 'Error') return _checkRust.polygonUnknown()
  }
  return _checkRust.makePolygonValue({points: path.value.points, bounds})
}
function checkRustPath(row: object, name: string): _checkRust.PathValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.pathUnknown()
  if (value === null) return _checkRust.pathNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.pathUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.PathValue
  if (value.kind !== 'Value' || !('value' in value) || !value.value || typeof value.value !== 'object' || !('closed' in value.value) || typeof value.value.closed !== 'boolean' || !('points' in value.value) || !Array.isArray(value.value.points) || value.value.points.length === 0 || value.value.points.length > 2147483647) return _checkRust.pathUnknown()
  const points: _checkRust.PointPayload[] = []
  for (const point of value.value.points) {
    if (!point || typeof point !== 'object' || typeof point.x !== 'bigint' || point.x < -9223372036854775808n || point.x > 9223372036854775807n || typeof point.y !== 'bigint' || point.y < -9223372036854775808n || point.y > 9223372036854775807n || ('wireKnown' in point && typeof point.wireKnown !== 'boolean')) return _checkRust.pathUnknown()
    points.push({x: point.x, y: point.y, wireKnown: point.wireKnown ?? true})
  }
  return _checkRust.makePathValue({closed: value.value.closed, points})
}
function checkRustCircle(row: object, name: string): _checkRust.CircleValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.circleUnknown()
  if (value === null) return _checkRust.circleNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.circleUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.CircleValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'x' in value.value && typeof value.value.x === 'bigint' && value.value.x >= -9223372036854775808n && value.value.x <= 9223372036854775807n && 'y' in value.value && typeof value.value.y === 'bigint' && value.value.y >= -9223372036854775808n && value.value.y <= 9223372036854775807n && 'radius' in value.value && typeof value.value.radius === 'bigint' && value.value.radius >= -9223372036854775808n && value.value.radius <= 9223372036854775807n) {
    if ('wireKnown' in value.value) {
      if (typeof value.value.wireKnown !== 'boolean') return _checkRust.circleUnknown()
      if (!value.value.wireKnown) return value as _checkRust.CircleValue
    }
    return _checkRust.makeCircleBits(value.value.x,value.value.y,value.value.radius)
  }
  return _checkRust.circleUnknown()
}
function checkRustBox(row: object, name: string): _checkRust.BoxValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.boxUnknown()
  if (value === null) return _checkRust.boxNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.boxUnknown()
  if (value.kind === 'NonNull' || value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.BoxValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'highX' in value.value && typeof value.value.highX === 'bigint' && value.value.highX >= -9223372036854775808n && value.value.highX <= 9223372036854775807n && 'highY' in value.value && typeof value.value.highY === 'bigint' && value.value.highY >= -9223372036854775808n && value.value.highY <= 9223372036854775807n && 'lowX' in value.value && typeof value.value.lowX === 'bigint' && value.value.lowX >= -9223372036854775808n && value.value.lowX <= 9223372036854775807n && 'lowY' in value.value && typeof value.value.lowY === 'bigint' && value.value.lowY >= -9223372036854775808n && value.value.lowY <= 9223372036854775807n) {
    if ('wireKnown' in value.value) {
      if (typeof value.value.wireKnown !== 'boolean') return _checkRust.boxUnknown()
      if (!value.value.wireKnown) return value as _checkRust.BoxValue
    }
    return _checkRust.makeBoxBits(value.value.highX,value.value.highY,value.value.lowX,value.value.lowY)
  }
  return _checkRust.boxUnknown()
}
function checkRustLseg(row: object, name: string): _checkRust.LsegValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.lsegUnknown()
  if (value === null) return _checkRust.lsegNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.lsegUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.LsegValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'x1' in value.value && typeof value.value.x1 === 'bigint' && value.value.x1 >= -9223372036854775808n && value.value.x1 <= 9223372036854775807n && 'y1' in value.value && typeof value.value.y1 === 'bigint' && value.value.y1 >= -9223372036854775808n && value.value.y1 <= 9223372036854775807n && 'x2' in value.value && typeof value.value.x2 === 'bigint' && value.value.x2 >= -9223372036854775808n && value.value.x2 <= 9223372036854775807n && 'y2' in value.value && typeof value.value.y2 === 'bigint' && value.value.y2 >= -9223372036854775808n && value.value.y2 <= 9223372036854775807n) {
    if ('wireKnown' in value.value) {
      if (typeof value.value.wireKnown !== 'boolean') return _checkRust.lsegUnknown()
      if (!value.value.wireKnown) return value as _checkRust.LsegValue
    }
    return _checkRust.makeLsegBits(value.value.x1, value.value.y1, value.value.x2, value.value.y2)
  }
  return _checkRust.lsegUnknown()
}
function checkRustLine(row: object, name: string): _checkRust.LineValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.lineUnknown()
  if (value === null) return _checkRust.lineNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.lineUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.LineValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'a' in value.value && 'b' in value.value && 'c' in value.value && typeof value.value.a === 'bigint' && typeof value.value.b === 'bigint' && typeof value.value.c === 'bigint' && value.value.a >= -9223372036854775808n && value.value.a <= 9223372036854775807n && value.value.b >= -9223372036854775808n && value.value.b <= 9223372036854775807n && value.value.c >= -9223372036854775808n && value.value.c <= 9223372036854775807n) {
    const valid = _checkRust.makeLineBits(value.value.a, value.value.b, value.value.c)
    if (valid.kind !== 'Value') return valid
    if ('wireKnown' in value.value) {
      if (typeof value.value.wireKnown !== 'boolean') return _checkRust.lineUnknown()
      if (!value.value.wireKnown) return value as _checkRust.LineValue
    }
    return valid
  }
  return _checkRust.lineUnknown()
}
function checkRustPoint(row: object, name: string): _checkRust.PointValue {
  const value = (row as Record<string, unknown>)[name]
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.pointUnknown()
  if (value === null) return _checkRust.pointNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.pointUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.PointValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'x' in value.value && 'y' in value.value && typeof value.value.x === 'bigint' && typeof value.value.y === 'bigint' && value.value.x >= -9223372036854775808n && value.value.x <= 9223372036854775807n && value.value.y >= -9223372036854775808n && value.value.y <= 9223372036854775807n) {
    if ('wireKnown' in value.value) {
      if (typeof value.value.wireKnown !== 'boolean') return _checkRust.pointUnknown()
      if (!value.value.wireKnown) return value as _checkRust.PointValue
    }
    return _checkRust.makePointBits(value.value.x, value.value.y)
  }
  return _checkRust.pointUnknown()
}
function checkRustTime(row: object, name: string): _checkRust.TimeValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.timeUnknown()
  if (value === null) return _checkRust.timeNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.timeUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.TimeValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint') return _checkRust.makeTimeValue(value.value)
  return _checkRust.timeUnknown()
}
function checkRustTimetz(row: object, name: string): _checkRust.TimetzValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.timetzUnknown()
  if (value === null) return _checkRust.timetzNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.timetzUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.TimetzValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'time' in value.value && 'zone' in value.value && typeof value.value.time === 'bigint' && typeof value.value.zone === 'number' && Number.isInteger(value.value.zone) && value.value.zone >= -2147483648 && value.value.zone <= 2147483647) return _checkRust.makeTimetzValue(value.value.time, value.value.zone)
  return _checkRust.timetzUnknown()
}
function checkRustInterval(row: object, name: string): _checkRust.IntervalValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.intervalUnknown()
  if (value === null) return _checkRust.intervalNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.intervalUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.IntervalValue
  if (value.kind === 'Value' && 'value' in value && value.value && typeof value.value === 'object' && 'time' in value.value && 'months' in value.value && 'days' in value.value && typeof value.value.time === 'bigint' && value.value.time >= -9223372036854775808n && value.value.time <= 9223372036854775807n && typeof value.value.months === 'number' && Number.isInteger(value.value.months) && value.value.months >= -2147483648 && value.value.months <= 2147483647 && typeof value.value.days === 'number' && Number.isInteger(value.value.days) && value.value.days >= -2147483648 && value.value.days <= 2147483647) return _checkRust.makeIntervalValue(value.value.months, value.value.days, value.value.time)
  return _checkRust.intervalUnknown()
}
function checkRustTimestamp(row: object, name: string): _checkRust.TimestampValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.timestampUnknown()
  if (value === null) return _checkRust.timestampNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.timestampUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.TimestampValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= -9223372036854775808n && value.value <= 9223372036854775807n) return _checkRust.makeTimestampValue(value.value)
  return _checkRust.timestampUnknown()
}
function checkRustTimestamptz(row: object, name: string): _checkRust.TimestamptzValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.timestamptzUnknown()
  if (value === null) return _checkRust.timestamptzNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.timestamptzUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.TimestamptzValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= -9223372036854775808n && value.value <= 9223372036854775807n) return _checkRust.makeTimestamptzValue(value.value)
  return _checkRust.timestamptzUnknown()
}
function checkRustFloat4(row: object, name: string): _checkRust.Float4Value {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.float4Unknown()
  if (value === null) return _checkRust.float4Null()
  if (typeof value === 'number') return Number.isNaN(value) ? { kind: 'UnspecifiedNan' } : _checkRust.makeFloat4Value(value)
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.float4Unknown()
  if (value.kind === 'UnspecifiedNan' || value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.Float4Value
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'number' && Number.isInteger(value.value) && value.value >= -2147483648 && value.value <= 2147483647) return _checkRust.makeFloat4Bits(value.value)
  return _checkRust.float4Unknown()
}
function checkRustFloat8(row: object, name: string): _checkRust.Float8Value {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.float8Unknown()
  if (value === null) return _checkRust.float8Null()
  if (typeof value === 'number') return Number.isNaN(value) ? { kind: 'UnspecifiedNan' } : _checkRust.makeFloat8Value(value)
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.float8Unknown()
  if (value.kind === 'UnspecifiedNan' || value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.Float8Value
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'bigint' && value.value >= -9223372036854775808n && value.value <= 9223372036854775807n) return _checkRust.makeFloat8Bits(value.value)
  return _checkRust.float8Unknown()
}
function checkRustBit(row: object, name: string): _checkRust.BitValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.bitUnknown()
  if (value === null) return _checkRust.bitNull()
  if (typeof value === 'string') return _checkRust.makeBitValue(value)
  return _checkRust.bitUnknown()
}
function checkRustBytea(row: object, name: string): _checkRust.ByteaValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.byteaUnknown()
  if (value === null) return _checkRust.byteaNull()
  if (!(value instanceof Uint8Array)) return _checkRust.byteaUnknown()
  let hex = ''
  for (const byte of value) hex += byte.toString(16).padStart(2, '0')
  return _checkRust.makeByteaValue(hex)
}
function checkRustNetwork(row: object, name: string): _checkRust.NetworkValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.networkUnknown()
  if (value === null) return _checkRust.networkNull()
  if (typeof value === 'string') return _checkRust.makeNetworkValue(value)
  return _checkRust.networkUnknown()
}
function checkRustUuid(row: object, name: string): _checkRust.UuidValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.uuidUnknown()
  if (value === null) return _checkRust.uuidNull()
  if (typeof value === 'string') return _checkRust.makeUuidValue(value)
  return _checkRust.uuidUnknown()
}
function checkRustMacaddr(row: object, name: string): _checkRust.MacaddrValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.macaddrUnknown()
  if (value === null) return _checkRust.macaddrNull()
  if (typeof value === 'string') return _checkRust.makeMacaddrValue(value)
  return _checkRust.macaddrUnknown()
}
function checkRustMacaddr8(row: object, name: string): _checkRust.Macaddr8Value {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.macaddr8Unknown()
  if (value === null) return _checkRust.macaddr8Null()
  if (typeof value === 'string') return _checkRust.makeMacaddr8Value(value)
  return _checkRust.macaddr8Unknown()
}
function checkRustNumeric(row: object, name: string): _checkRust.NumericValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.numericUnknown()
  if (value === null) return _checkRust.numericNull()
  if (typeof value === 'string') return _checkRust.makeNumericValue(value)
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.numericUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.NumericValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'string') return _checkRust.makeNumericValue(value.value)
  return _checkRust.numericUnknown()
}
function checkRustDate(row: object, name: string): _checkRust.DateValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.dateUnknown()
  if (value === null) return _checkRust.dateNull()
  if (typeof value !== 'object' || !('kind' in value)) return _checkRust.dateUnknown()
  if (value.kind === 'Unknown' || value.kind === 'Null' || value.kind === 'Error') return value as _checkRust.DateValue
  if (value.kind === 'Value' && 'value' in value && typeof value.value === 'number') return _checkRust.makeDateValue(value.value)
  return _checkRust.dateUnknown()
}
function checkRustInt2(row: object, name: string): _checkRust.Int2Value {
  const input = checkInputInteger(row, name)
  if (!input.certain) return _checkRust.int2Unknown()
  if (input.value === null) return _checkRust.int2Null()
  if (input.value < -32768n || input.value > 32767n) return _checkRust.int2Unknown()
  return _checkRust.makeInt2Value(Number(input.value))
}
function checkRustInt4(row: object, name: string): _checkRust.Int4Value {
  const input = checkInputInteger(row, name)
  if (!input.certain) return _checkRust.int4Unknown()
  if (input.value === null) return _checkRust.int4Null()
  if (input.value < -2147483648n || input.value > 2147483647n) return _checkRust.int4Unknown()
  return _checkRust.makeInt4Value(Number(input.value))
}
function checkRustInt8(row: object, name: string): _checkRust.Int8Value {
  const input = checkInputInt8(row, name)
  if (!input.certain) return _checkRust.int8Unknown()
  if (input.value === null) return _checkRust.int8Null()
  if (input.value < -9223372036854775808n || input.value > 9223372036854775807n) return _checkRust.int8Unknown()
  return _checkRust.makeInt8Value(input.value)
}
function checkRustName(row: object, name: string): _checkRust.TextValue {
  if (!Object.hasOwn(row, name)) return _checkRust.textUnknown()
  const raw = Reflect.get(row, name)
  if (raw === null) return _checkRust.textNull()
  if (typeof raw !== 'string' || /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/u.test(raw)) return _checkRust.textUnknown()
  return _checkRust.makeNameTextValue(raw)
}
function checkRustRefcursor(row: object, name: string): _checkRust.TextValue {
  if (!Object.hasOwn(row, name)) return _checkRust.textUnknown()
  const raw = Reflect.get(row, name)
  if (raw === null) return _checkRust.textNull()
  if (typeof raw !== 'string' || /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/u.test(raw)) return _checkRust.textUnknown()
  return _checkRust.makeRefcursorTextValue(raw)
}
function checkRustText(row: object, name: string): _checkRust.TextValue {
  const input = checkInputText(row, name)
  if (!input.certain) return _checkRust.textUnknown()
  if (input.value === null) return _checkRust.textNull()
  if (input.value.includes(String.fromCharCode(0)) || /[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]/u.test(input.value)) return _checkRust.textUnknown()
  return _checkRust.makeTextValue(input.value)
}
function checkRustBool(row: object, name: string): _checkRust.BoolValue {
  const input = checkInputBoolean(row, name)
  if (!input.certain) return _checkRust.boolUnknown()
  if (input.value === null) return _checkRust.boolNull()
  return _checkRust.makeBoolValue(input.value)
}
function checkRustNullness(row: object, name: string): _checkRust.BoolValue {
  const value = Reflect.get(row, name)
  if (Object.hasOwn(row, name) && value !== null && typeof value === 'object' && 'kind' in value) {
    if ('value' in value && typeof value.value === 'string') return _checkRust.numericIsNull(checkRustNumeric(row, name))
    if ('value' in value && typeof value.value === 'bigint') return _checkRust.timestamptzIsNull(checkRustTimestamptz(row, name))
    return _checkRust.dateIsNull(checkRustDate(row, name))
  }
  const input = checkInputNullness(row, name)
  return input.certain ? _checkRust.makeBoolValue(input.value!) : _checkRust.boolUnknown()
}
function checkRustEnum(row: object, name: string, labels: readonly string[]): _checkRust.EnumValue {
  const input = checkInputText(row, name)
  if (!input.certain) return _checkRust.enumUnknown()
  if (input.value === null) return _checkRust.enumNull()
  const order = labels.indexOf(input.value)
  if (order < 0) return _checkRust.enumUnknown()
  return _checkRust.makeEnumValue(order)
}
function checkRustOutcome(value: _checkRust.CheckOutcome): CheckResult {
  switch (value.kind) {
    case 'True': return evalBoolCertain(true)
    case 'False': return evalBoolCertain(false)
    case 'Null': return evalBoolCertain(null)
    case 'Unknown': return evalBoolUncertain()
    case 'Error': return {
      certain: true,
      error: value.value.state.toString(36).toUpperCase().padStart(5, '0'),
      message: _checkRust.sqlErrorMessage(value.value).message,
    }
  }
  throw new Error('invalid Rust CHECK outcome')
}`

const typescriptCheckEvaluationSource = `type CheckResult = EvalBool | {
  readonly certain: true
  readonly error: string
  readonly message?: string
  readonly value?: never
}
type CheckEvaluation = {
  readonly owner: string
  readonly constraint: string
  readonly result: CheckResult
  readonly message?: string
}
function checkEvaluation(owner: string, constraint: string, evaluate: () => CheckResult, unknownMessage: string): CheckEvaluation {
  let result: CheckResult
  try { result = evaluate() }
  catch (error) {
    if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string' || !/^[A-Z0-9]{5}$/.test(error.code)) throw error
    result = { certain: true, error: error.code, message: error.message }
  }
  if (!result.certain) return { owner, constraint, result, message: unknownMessage }
  if ('error' in result) return {
    owner, constraint,
    result: { certain: true, error: result.error },
    message: result.message ?? 'SQL evaluation failed',
  }
  return { owner, constraint, result }
}`

const synthesizedStatements = (source: string): ts.Statement[] => {
  const parsed = ts.createSourceFile('check-rust-adapter.ts', source, ts.ScriptTarget.ES2022, true)
  const synthesize = (node: ts.Node): void => {
    ts.forEachChild(node, synthesize)
    ts.setTextRange(node, { pos: -1, end: -1 })
  }
  for (const statement of parsed.statements) synthesize(statement)
  return [...parsed.statements]
}

const checkInputHelpers: Record<string, { dependencies: readonly string[]; source: string }> = {
  checkInputEnum: {
    dependencies: ['checkRawInput'],
    source: `function checkInputEnum(row: object, name: string, type: string, labels: readonly string[]): EvalValue<SqlEnum> {
  const value = checkRawInput(row, name)
  if (value === null) return { certain: true, value: null }
  if (typeof value !== 'string' || !labels.includes(value)) return { certain: false }
  return { certain: true, value: enumInput(value, type, labels) }
}`,
  },
  checkInputNullness: {
    dependencies: ['checkRawInput'],
    source: `function checkInputNullness(row: object, name: string): EvalValue<boolean> {
  const value = checkRawInput(row, name)
  return value === undefined ? { certain: false } : { certain: true, value: value === null }
}`,
  },
  checkRawInput: {
    dependencies: [],
    source: `function checkRawInput(row: object, name: string): unknown {
  return Object.hasOwn(row, name) ? Reflect.get(row, name) : undefined
}`,
  },
  checkTextKnown: {
    dependencies: ['checkRawInput'],
    source: `function checkTextKnown(row: object, name: string): boolean {
  const value = checkRawInput(row, name)
  return value === null || typeof value === 'string'
}`,
  },
  checkTextValue: {
    dependencies: ['checkRawInput'],
    source: `function checkTextValue(row: object, name: string): string | null {
  const value = checkRawInput(row, name)
  return typeof value === 'string' ? value : null
}`,
  },
  checkInputText: {
    dependencies: ['checkTextKnown', 'checkTextValue'],
    source: `function checkInputText(row: object, name: string): EvalValue<string> {
  return checkTextKnown(row, name) ? { certain: true, value: checkTextValue(row, name) } : { certain: false }
}`,
  },
  checkInputBoolean: {
    dependencies: ['checkRawInput'],
    source: `function checkInputBoolean(row: object, name: string): EvalValue<boolean> {
  const value = checkRawInput(row, name)
  return value === null || typeof value === 'boolean' ? { certain: true, value } : { certain: false }
}`,
  },
  checkInputInteger: {
    dependencies: ['checkRawInput'],
    source: `function checkInputInteger(row: object, name: string): EvalValue<bigint> {
  const value = checkRawInput(row, name)
  if (value === null) return { certain: true, value: null }
  if (typeof value === 'bigint') return { certain: true, value }
  if (typeof value === 'number' && Number.isSafeInteger(value)) return { certain: true, value: BigInt(value) }
  return { certain: false }
}`,
  },
  checkInputInt8: {
    dependencies: ['checkRawInput', 'checkInputInteger'],
    source: `function checkInputInt8(row: object, name: string): EvalValue<bigint> {
  const value = checkRawInput(row, name)
  if (typeof value !== 'string') return checkInputInteger(row, name)
  if (!/^-?(?:0|[1-9][0-9]{0,18})$/.test(value)) return { certain: false }
  const integer = BigInt(value)
  if (integer < -9223372036854775808n || integer > 9223372036854775807n) return { certain: false }
  return { certain: true, value: integer }
}`,
  },
  checkInputFloat: {
    dependencies: ['checkRawInput'],
    source: `function checkInputFloat(row: object, name: string): EvalValue<number> {
  const value = checkRawInput(row, name)
  return value === null || typeof value === 'number' ? { certain: true, value } : { certain: false }
}`,
  },
}

function checkInputStatements(required: ReadonlySet<string>): ts.Statement[] {
  const included = new Set<string>()
  const statements: ts.Statement[] = []
  const synthesize = (node: ts.Node): void => {
    ts.forEachChild(node, synthesize)
    ts.setTextRange(node, { pos: -1, end: -1 })
  }
  const include = (name: string): void => {
    if (included.has(name)) return
    const helper = checkInputHelpers[name]
    if (!helper) throw new Error(`Missing TypeScript CHECK input helper: ${name}`)
    included.add(name)
    for (const dependency of helper.dependencies) include(dependency)
    const parsed = ts.createSourceFile(
      'check-inputs.ts',
      helper.source,
      ts.ScriptTarget.ES2022,
      true,
    )
    for (const statement of parsed.statements) {
      synthesize(statement)
      statements.push(statement)
    }
  }
  for (const name of required) include(name)
  return statements
}
