import ts from 'typescript'
import type {
  CheckCaseLiteralKind,
  CheckColumnCase,
  OutputCheckCases,
} from '../../query/check-cases.js'
import { factory, propertyName, unionType } from './ast.js'

// CHECK-derived narrowing of row types: a column whose CHECKs admit only some
// literals takes their union, and CHECKs that tie columns together add one
// local union per group, intersected with the flat row type the way presence
// groups are, so testing a discriminant narrows its own group only.

/**
 * Whether literals of `kind` may stand for values of `type`: only the plain
 * representation a CHECK's literal compares with, never a mapped type.
 */
const narrowable = (type: ts.TypeNode, kind: CheckCaseLiteralKind): boolean => {
  switch (kind) {
    case 'string':
      return (
        type.kind === ts.SyntaxKind.StringKeyword ||
        // An enum's named label union.
        ts.isTypeReferenceNode(type) ||
        ts.isImportTypeNode(type) ||
        (ts.isUnionTypeNode(type) &&
          type.types.every(
            (member) => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal),
          ))
      )
    case 'number':
      return type.kind === ts.SyntaxKind.NumberKeyword
    case 'bigint':
      return type.kind === ts.SyntaxKind.BigIntKeyword
    case 'boolean':
      return type.kind === ts.SyntaxKind.BooleanKeyword
  }
}

const literalType = (kind: CheckCaseLiteralKind, value: string): ts.TypeNode => {
  const negative = value.startsWith('-')
  const magnitude = negative ? value.slice(1) : value
  const signed = (literal: ts.LiteralExpression): ts.TypeNode =>
    factory.createLiteralTypeNode(
      negative
        ? factory.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, literal)
        : (literal as ts.NumericLiteral),
    )
  switch (kind) {
    case 'string':
      return factory.createLiteralTypeNode(factory.createStringLiteral(value))
    case 'boolean':
      return factory.createLiteralTypeNode(
        value === 'true' ? factory.createTrue() : factory.createFalse(),
      )
    case 'number':
      return signed(factory.createNumericLiteral(magnitude))
    case 'bigint':
      return signed(factory.createBigIntLiteral(`${magnitude}n`))
  }
}

/** A column's type narrowed to the literals its CHECKs admit, or the type itself. */
export function checkLiteralType(
  type: ts.TypeNode,
  literals: OutputCheckCases['literals'][number] | undefined,
): ts.TypeNode {
  if (!literals) return type
  // A branded domain keeps its brand around the narrowed base.
  if (ts.isIntersectionTypeNode(type)) {
    const index = type.types.findIndex((member) => narrowable(member, literals.kind))
    if (index < 0) return type
    return factory.createIntersectionTypeNode(
      type.types.map((member, position) =>
        position === index ? parenthesized(checkLiteralType(member, literals)) : member,
      ),
    )
  }
  if (!narrowable(type, literals.kind)) return type
  return unionType(literals.values.map((value) => literalType(literals.kind, value)))
}

const parenthesized = (type: ts.TypeNode): ts.TypeNode =>
  ts.isUnionTypeNode(type) ? factory.createParenthesizedType(type) : type

const caseType = (
  type: ts.TypeNode,
  kind: CheckCaseLiteralKind | null,
  item: CheckColumnCase,
): ts.TypeNode =>
  unionType([
    ...(item.values === null
      ? [type]
      : item.values.length === 0
        ? []
        : kind && narrowable(type, kind)
          ? item.values.map((value) => literalType(kind, value))
          : [type]),
    ...(item.null ? [factory.createLiteralTypeNode(factory.createNull())] : []),
  ])

/**
 * One union per CHECK case group over the named columns, each member an
 * object of the group's columns; `types` are the columns' non-NULL types.
 */
export function checkCaseRefinements(
  names: readonly string[],
  types: readonly ts.TypeNode[],
  groups: OutputCheckCases['groups'],
  // Whether a member may leave the column out, as an insert may.
  optional: (index: number, item: CheckColumnCase) => boolean = () => false,
): ts.TypeNode[] {
  return groups.map((group) =>
    unionType(
      group.cases.map((member) =>
        factory.createTypeLiteralNode(
          group.columns.map((index, position) =>
            factory.createPropertySignature(
              undefined,
              propertyName(names[index]!),
              optional(index, member[position]!)
                ? factory.createToken(ts.SyntaxKind.QuestionToken)
                : undefined,
              caseType(types[index]!, group.kinds[position]!, member[position]!),
            ),
          ),
        ),
      ),
    ),
  )
}
