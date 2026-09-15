import ts from 'typescript'
import type { TypeImport } from '../../config/schema.js'

export const factory = ts.factory

const sourceFile = ts.createSourceFile(
  'generated.ts',
  '',
  ts.ScriptTarget.Latest,
  false,
  ts.ScriptKind.TS,
)
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

export const printNode = (node: ts.Node): string =>
  printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)

export const printFile = (statements: readonly ts.Statement[]): string => {
  if (statements.length === 0) return ''
  const file = factory.updateSourceFile(sourceFile, factory.createNodeArray(statements))
  return `${printer.printFile(file).trimEnd()}\n`
}

export const parseType = (source: string): ts.TypeNode => {
  const file = ts.createSourceFile(
    'configured-type.ts',
    `type ConfiguredType = ${source}`,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  )
  const declaration = file.statements[0]
  const diagnostics = (file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] })
    .parseDiagnostics
  if (
    !declaration ||
    !ts.isTypeAliasDeclaration(declaration) ||
    file.statements.length !== 1 ||
    diagnostics.length > 0
  ) {
    throw new Error(`Invalid TypeScript type: ${source}`)
  }
  return declaration.type
}

export const exportModifier = factory.createModifier(ts.SyntaxKind.ExportKeyword)
export const readonlyModifier = factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)
export const asyncModifier = factory.createModifier(ts.SyntaxKind.AsyncKeyword)

export const identifier = (name: string): ts.Identifier => {
  if (!/^[$A-Z_a-z][$\w]*$/u.test(name)) {
    throw new Error(`Invalid TypeScript identifier: ${name}`)
  }
  return factory.createIdentifier(name)
}

export const propertyName = (name: string): ts.PropertyName => factory.createStringLiteral(name)

export const unionType = (members: readonly ts.TypeNode[]): ts.TypeNode => {
  const flattened = members.flatMap((member) =>
    ts.isUnionTypeNode(member) ? member.types : [member],
  )
  const useful = uniqueTypes(flattened).filter(
    (member) => member.kind !== ts.SyntaxKind.NeverKeyword,
  )
  if (
    useful.some((member) => member.kind === ts.SyntaxKind.UnknownKeyword) ||
    useful.length === 0
  ) {
    return useful.length
      ? factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      : factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
  }
  return useful.length === 1 ? useful[0]! : factory.createUnionTypeNode(useful)
}

export const intersectionType = (members: readonly ts.TypeNode[]): ts.TypeNode => {
  const flattened = members.flatMap((member) =>
    ts.isIntersectionTypeNode(member) ? member.types : [member],
  )
  if (flattened.some((member) => member.kind === ts.SyntaxKind.NeverKeyword)) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
  }
  const useful = uniqueTypes(flattened).filter(
    (member) => member.kind !== ts.SyntaxKind.UnknownKeyword,
  )
  if (useful.length === 0) return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
  return useful.length === 1 ? useful[0]! : factory.createIntersectionTypeNode(useful)
}

export const nullableType = (type: ts.TypeNode, notNull: boolean): ts.TypeNode =>
  notNull ||
  (type.kind === ts.SyntaxKind.LiteralType &&
    ts.isLiteralTypeNode(type) &&
    type.literal.kind === ts.SyntaxKind.NullKeyword)
    ? type
    : unionType([type, factory.createLiteralTypeNode(factory.createNull())])

export const importDeclarations = (imports: readonly TypeImport[]): ts.ImportDeclaration[] => {
  const unique = new Map<string, TypeImport>()
  for (const value of imports) unique.set(JSON.stringify(value), value)
  return [...unique.values()]
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
    .map((value) => {
      let clause: ts.ImportClause
      if ('default' in value) {
        clause = factory.createImportClause(false, identifier(value.default), undefined)
      } else if ('namespace' in value) {
        clause = factory.createImportClause(
          false,
          undefined,
          factory.createNamespaceImport(identifier(value.namespace)),
        )
      } else {
        clause = factory.createImportClause(
          false,
          undefined,
          factory.createNamedImports([
            factory.createImportSpecifier(
              false,
              value.as ? identifier(value.name) : undefined,
              identifier(value.as ?? value.name),
            ),
          ]),
        )
      }
      return factory.createImportDeclaration(
        undefined,
        clause,
        factory.createStringLiteral(value.from),
        undefined,
      )
    })
}

const uniqueTypes = (members: readonly ts.TypeNode[]): ts.TypeNode[] => {
  const unique = new Map<string, ts.TypeNode>()
  for (const member of members) unique.set(printNode(member), member)
  return [...unique.values()]
}
