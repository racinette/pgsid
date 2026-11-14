import ts from 'typescript'
import type { OutputLiterals } from '../../query/check-cases.js'
import { exportModifier, factory, identifier } from './ast.js'
import { encodeExpression } from './query.js'
import { typescriptCodecNames, type TypescriptCodec } from './sql/codecs.js'
import { literalSchema, method, z } from './zod.js'

// zod v4 schemas of a query's parameters and rows. A field takes exactly the values the query's
// codec handles: a value of a CHECK literal set, a boolean, safe integer, bigint or text natively
// where the field's type is that plain type, and every other shape through the codec's own
// encoder, typed as the field of the generated parameters or row.

export interface QueryZodField {
  // The parameter's or column's key: a name, or a position in a parameter list.
  key: string | number
  codec: TypescriptCodec
  base: ts.TypeNode
  notNull: boolean
  alwaysNull?: boolean
  literals?: OutputLiterals | null | undefined
}

const native: Readonly<Record<string, { codec: string; kind: ts.SyntaxKind; schema: string }>> = {
  Bool: { codec: 'Bool', kind: ts.SyntaxKind.BooleanKeyword, schema: 'boolean' },
  Int: { codec: 'Int', kind: ts.SyntaxKind.NumberKeyword, schema: 'int' },
  Bigint: { codec: 'Bigint', kind: ts.SyntaxKind.BigIntKeyword, schema: 'bigint' },
  Text: { codec: 'Text', kind: ts.SyntaxKind.StringKeyword, schema: 'string' },
}

/** The schema of one parameter list or row, and the encoders its fields call. */
export function queryZodSchema(
  name: string,
  typeName: string,
  fields: readonly QueryZodField[],
  tuple: boolean,
): { statement: ts.Statement; encoders: string[]; accepts: boolean } {
  const encoders: string[] = []
  let accepts = false
  const field = (item: QueryZodField): ts.Expression => {
    if (item.alwaysNull) return z('null')
    let schema: ts.Expression
    const plain = item.codec.kind === 'scalar' ? native[item.codec.name as string] : undefined
    if (item.literals) schema = literalSchema(item.literals)
    else if (plain && item.base.kind === plain.kind) schema = z(plain.schema)
    else {
      accepts = true
      encoders.push(...typescriptCodecNames(item.codec, 'encode'))
      const value = identifier('value')
      schema = factory.createCallExpression(
        factory.createPropertyAccessExpression(identifier('z'), 'custom'),
        [
          factory.createTypeReferenceNode('NonNullable', [
            factory.createIndexedAccessTypeNode(
              factory.createTypeReferenceNode(typeName),
              factory.createLiteralTypeNode(
                typeof item.key === 'number' ? factory.createNumericLiteral(item.key) : factory.createStringLiteral(item.key),
              ),
            ),
          ]),
        ],
        [
          factory.createArrowFunction(
            undefined,
            undefined,
            [factory.createParameterDeclaration(undefined, undefined, value)],
            undefined,
            undefined,
            factory.createLogicalAnd(
              factory.createLogicalAnd(
                factory.createStrictInequality(value, factory.createNull()),
                factory.createStrictInequality(value, identifier('undefined')),
              ),
              factory.createCallExpression(identifier('pgsidAccepts'), undefined, [
                factory.createArrowFunction(
                  undefined,
                  undefined,
                  [],
                  undefined,
                  undefined,
                  encodeExpression(item.codec, value, factory.createStringLiteral(String(item.key))),
                ),
              ]),
            ),
          ),
          factory.createObjectLiteralExpression([
            factory.createPropertyAssignment('error', factory.createStringLiteral(`Expected a value for ${item.key}`)),
          ]),
        ],
      )
    }
    return item.notNull ? schema : method(schema, 'nullable')
  }
  // A parameter list is a readonly tuple, as the generated parameter type is.
  const schema = tuple
    ? method(z('tuple', [factory.createArrayLiteralExpression(fields.map(field))]), 'readonly')
    : z('object', [
        factory.createObjectLiteralExpression(
          fields.map((item) => factory.createPropertyAssignment(factory.createStringLiteral(String(item.key)), field(item))),
          true,
        ),
      ])
  return {
    statement: factory.createVariableStatement(
      [exportModifier],
      factory.createVariableDeclarationList([factory.createVariableDeclaration(name, undefined, undefined, schema)], ts.NodeFlags.Const),
    ),
    encoders,
    accepts,
  }
}
