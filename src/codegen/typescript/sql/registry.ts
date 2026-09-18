import { typescriptFloatOperators, typescriptFloatFunctions } from './floating-point.js'
import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import { typescriptNumericOperators, typescriptNumericFunctions } from './numeric.js'
import type { ExpressionBackend } from '../../../sql-semantics/expressions.js'

export const typescriptSqlBackend: ExpressionBackend<ts.Expression> = {
  bindings: [
    { domain: 'numeric', operators: typescriptFloatOperators, functions: typescriptFloatFunctions },
    {
      domain: 'numeric',
      operators: typescriptNumericOperators,
      functions: typescriptNumericFunctions,
    },
  ],
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
