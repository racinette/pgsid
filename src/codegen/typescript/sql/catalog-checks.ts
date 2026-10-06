import ts from 'typescript'
import type { DomainInfo, EnumInfo, TableInfo } from '../../../catalog/types.js'
import { enumType } from '../../../sql-semantics/expressions.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import {
  catalogTemporalType,
  catalogNumericType,
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
  options: { typedInputs?: boolean; enums?: readonly EnumInfo[] } = {},
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
    rustModuleSpecifier?: string
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
  const groups = catalogCheckGroups(tables, domains, selectedDomains, options.enums)
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
    if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type))
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
              'NetworkValue',
              'NumericValue',
              'DateValue',
              'TimestampValue',
              'TimestamptzValue',
              'EnumValue',
              'TextValue',
              'BoolValue',
            ].includes(item.rustType)
          )
            throw new Error(`Unsupported TypeScript Rust CHECK input: ${item.rustType}`)
          const helper =
            item.rustType === 'NetworkValue'
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
                                : item.rustType === 'TextValue'
                                  ? 'checkRustText'
                                  : 'checkRustBool'
          rustInputAdapters.add(helper)
          if (
            item.rustType !== 'NetworkValue' &&
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
          return factory.createCallExpression(identifier(helper), undefined, [
            row,
            factory.createStringLiteral(item.name),
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
        portableCheckAtoms(plan.expression),
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
              ts.isFunctionDeclaration(statement) &&
              statement.name &&
              (statement.name.text === 'checkRustOutcome' ||
                rustInputAdapters.has(statement.name.text) ||
                (['checkRustDate', 'checkRustTimestamptz', 'checkRustNumeric'].includes(
                  statement.name.text,
                ) &&
                  rustInputAdapters.has('checkRustNullness'))),
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

const typescriptRustAdapterSource = `function checkRustTimestamp(row: object, name: string): _checkRust.TimestampValue {
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
function checkRustNetwork(row: object, name: string): _checkRust.NetworkValue {
  const value = Reflect.get(row, name)
  if (!Object.hasOwn(row, name) || value === undefined) return _checkRust.networkUnknown()
  if (value === null) return _checkRust.networkNull()
  if (typeof value === 'string') return _checkRust.makeNetworkValue(value)
  return _checkRust.networkUnknown()
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
function checkRustText(row: object, name: string): _checkRust.TextValue {
  const input = checkInputText(row, name)
  if (!input.certain) return _checkRust.textUnknown()
  if (input.value === null) return _checkRust.textNull()
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
  return order < 0 ? _checkRust.enumUnknown() : _checkRust.makeEnumValue(order)
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
