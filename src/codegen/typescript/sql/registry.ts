import { typescriptSqlSyntax } from './syntax.js'
import { typescriptBooleanOperators, typescriptBooleanFunctions } from './boolean.js'
import { typescriptTextOperators, typescriptTextFunctions } from './text.js'
import { typescriptFloatOperators, typescriptFloatFunctions } from './floating-point.js'
import { typescriptDecimalOperators, typescriptDecimalFunctions } from './decimal.js'
import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import { typescriptNumericOperators, typescriptNumericFunctions } from './numeric.js'
import type { ExpressionBackend } from '../../../sql-semantics/expressions.js'
import { typescriptUuidFunctions, typescriptUuidOperators } from './uuid.js'

export const typescriptSqlBackend: ExpressionBackend<ts.Expression> = {
  bindings: [
    {
      domain: 'boolean',
      operators: typescriptBooleanOperators,
      functions: typescriptBooleanFunctions,
    },
    { domain: 'text', operators: typescriptTextOperators, functions: typescriptTextFunctions },
    {
      domain: 'numeric',
      operators: typescriptDecimalOperators,
      functions: typescriptDecimalFunctions,
    },
    { domain: 'numeric', operators: typescriptFloatOperators, functions: typescriptFloatFunctions },
    {
      domain: 'numeric',
      operators: typescriptNumericOperators,
      functions: typescriptNumericFunctions,
    },
    { domain: 'uuid', operators: typescriptUuidOperators, functions: typescriptUuidFunctions },
  ],
  coerceUuid: (type, operand) => {
    const helper = type === 'pg_catalog.uuid' ? 'uuidFromText' : 'uuidText'
    return {
      expression: factory.createCallExpression(identifier(helper), undefined, [operand.expression]),
      helpers: [helper],
    }
  },
  coerceText: (type, length, explicit, operand) => {
    const helpers: string[] = []
    let expression = operand.expression
    if (operand.type === 'pg_catalog.bpchar' && type !== 'pg_catalog.bpchar') {
      helpers.push('bpcharText')
      expression = factory.createCallExpression(identifier('bpcharText'), undefined, [expression])
    }
    if (length !== null) {
      const helper = type === 'pg_catalog.bpchar' ? 'bpcharCoerce' : 'varcharCoerce'
      helpers.push(helper)
      expression = factory.createCallExpression(identifier(helper), undefined, [
        expression,
        factory.createBigIntLiteral(String(length + 4) + 'n'),
        explicit ? factory.createTrue() : factory.createFalse(),
      ])
    }
    return { expression, helpers }
  },
  syntax: typescriptSqlSyntax,
  boolean: (value) =>
    factory.createCallExpression(identifier('booleanInput'), undefined, [
      value === null ? factory.createNull() : value ? factory.createTrue() : factory.createFalse(),
    ]),
  text: (value) =>
    factory.createCallExpression(identifier('textInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  uuid: (value) =>
    factory.createCallExpression(identifier('uuidInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  decimal: (value) =>
    factory.createCallExpression(identifier('decimalInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  float: (type, bits) =>
    factory.createCallExpression(
      identifier(type === 'pg_catalog.float4' ? 'float4Input' : 'float8Input'),
      undefined,
      [bits === null ? factory.createNull() : factory.createStringLiteral(bits)],
    ),
  integer: (type, value) =>
    factory.createCallExpression(
      identifier(
        type === 'pg_catalog.int2'
          ? 'int2Input'
          : type === 'pg_catalog.int4'
            ? 'int4Input'
            : 'int8Input',
      ),
      undefined,
      [value === null ? factory.createNull() : factory.createStringLiteral(value)],
    ),
}
