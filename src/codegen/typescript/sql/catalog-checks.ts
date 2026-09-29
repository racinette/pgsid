import ts from 'typescript'
import type { DomainInfo, TableInfo } from '../../../catalog/types.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import { emitEvalBoolExpression } from '../../../sql-semantics/check-expressions.js'
import { portableCheckAtoms } from '../../shared/check-atom-support.js'
import { exportModifier, factory, identifier, printFile } from '../ast.js'
import { typeName } from '../type-mapping.js'
import { typescriptEvalBoolBackend } from './check.js'
import { typescriptSqlBackend } from './registry.js'
import { typescriptSqlRuntime } from './runtime.js'

export function renderTypescriptSchemaChecks(
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[] = [],
  selectedDomains: readonly DomainInfo[] = domains,
  options: { typedInputs?: boolean } = {},
): string {
  const typedInputs = options.typedInputs ?? false
  const groups = catalogCheckGroups(tables, domains, selectedDomains)
  if (!groups.length) return ''
  const row = identifier('row')
  const inputHelpers = new Set<string>()
  const callInput = (helper: string, name: string): ts.Expression => {
    inputHelpers.add(helper)
    return factory.createCallExpression(identifier(helper), undefined, [
      row,
      factory.createStringLiteral(name),
    ])
  }
  const inputHelper = (type: string): string | null => {
    if (type === 'pg_catalog.bool') return 'checkInputBoolean'
    if (/^pg_catalog\.int[248]$/u.test(type)) return 'checkInputInteger'
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
    results: group.checks.map(({ plan }) =>
      emitEvalBoolExpression(
        portableCheckAtoms(plan.expression),
        { ...typescriptSqlBackend, input: (name) => callInput('checkTextValue', name) },
        {
          ...backend,
          scalar: {
            ...backend.scalar,
            input: (type, name) => {
              const helper = inputHelper(type)
              if (!helper) throw new Error(`Unsupported CHECK input type: ${type}`)
              return { expression: callInput(helper, name), helpers: ['EvalValue'] }
            },
          },
        },
      ),
    ),
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
  const inputType = (group: (typeof groups)[number]): ts.TypeNode => {
    if (group.kind === 'domain')
      return factory.createTypeLiteralNode([
        factory.createPropertySignature(
          undefined,
          'value',
          factory.createToken(ts.SyntaxKind.QuestionToken),
          factory.createUnionTypeNode([
            factory.createTypeReferenceNode(typeName(group.source.name)),
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
        factory.createIndexedAccessTypeNode(selected, factory.createTypeReferenceNode('K')),
        factory.createLiteralTypeNode(factory.createNull()),
      ]),
      undefined,
    )
  }
  return printFile([
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
    ...typescriptSqlRuntime(
      emitted.flatMap((group) => group.results.flatMap((result) => result.helpers)),
    ),
    ...checkInputStatements(inputHelpers),
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
                  factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment(
                      'owner',
                      factory.createStringLiteral(checks[index]!.owner),
                    ),
                    factory.createPropertyAssignment(
                      'constraint',
                      factory.createStringLiteral(checks[index]!.plan.name),
                    ),
                    factory.createPropertyAssignment('result', result.value.expression),
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
  ])
}

const checkInputHelpers: Record<string, { dependencies: readonly string[]; source: string }> = {
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
