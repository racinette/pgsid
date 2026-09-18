import { goFloatOperators, goFloatFunctions } from './floating-point.js'
import { goDecimalOperators, goDecimalFunctions } from './decimal.js'
import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import { goNumericOperators, goNumericFunctions } from './numeric.js'
import type { ExpressionBackend } from '../../../sql-semantics/expressions.js'

export const goSqlBackend: ExpressionBackend<GoExpression> = {
  bindings: [
    { domain: 'numeric', operators: goDecimalOperators, functions: goDecimalFunctions },
    { domain: 'numeric', operators: goFloatOperators, functions: goFloatFunctions },
    { domain: 'numeric', operators: goNumericOperators, functions: goNumericFunctions },
  ],
  decimal: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlDecimal'), elements: [] }
      : go.call(go.ident('decimalInput'), [go.string(value)]),
  float: (type, bits) =>
    bits === null
      ? { kind: 'composite', type: go.ident('SqlFloat'), elements: [] }
      : go.call(go.ident(type === 'pg_catalog.float4' ? 'float4Input' : 'float8Input'), [
          go.string(bits),
        ]),
  integer: (type, value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlInteger'), elements: [] }
      : go.call(
          go.ident(
            type === 'pg_catalog.int2'
              ? 'int2Input'
              : type === 'pg_catalog.int4'
                ? 'int4Input'
                : 'int8Input',
          ),
          [go.string(value)],
        ),
}
