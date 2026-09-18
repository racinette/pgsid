import { goSqlSyntax } from './syntax.js'
import { goBooleanOperators, goBooleanFunctions } from './boolean.js'
import { goTextOperators, goTextFunctions } from './text.js'
import { goFloatOperators, goFloatFunctions } from './floating-point.js'
import { goDecimalOperators, goDecimalFunctions } from './decimal.js'
import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import { goNumericOperators, goNumericFunctions } from './numeric.js'
import type { ExpressionBackend } from '../../../sql-semantics/expressions.js'

export const goSqlBackend: ExpressionBackend<GoExpression> = {
  bindings: [
    { domain: 'boolean', operators: goBooleanOperators, functions: goBooleanFunctions },
    { domain: 'text', operators: goTextOperators, functions: goTextFunctions },
    { domain: 'numeric', operators: goDecimalOperators, functions: goDecimalFunctions },
    { domain: 'numeric', operators: goFloatOperators, functions: goFloatFunctions },
    { domain: 'numeric', operators: goNumericOperators, functions: goNumericFunctions },
  ],
  coerceText: (type, length, explicit, operand) => {
    const helpers: string[] = []
    let expression = operand.expression
    if (operand.type === 'pg_catalog.bpchar' && type !== 'pg_catalog.bpchar') {
      helpers.push('bpcharText')
      expression = go.call(go.ident('bpcharText'), [expression])
    }
    if (length !== null) {
      const helper = type === 'pg_catalog.bpchar' ? 'bpcharCoerce' : 'varcharCoerce'
      helpers.push(helper, 'int4Input', 'booleanInput')
      expression = go.call(go.ident(helper), [
        expression,
        go.call(go.ident('int4Input'), [go.string(String(length + 4))]),
        go.call(go.ident('booleanInput'), [go.ident(explicit ? 'true' : 'false')]),
      ])
    }
    return { expression, helpers }
  },
  syntax: goSqlSyntax,
  boolean: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlBoolean'), elements: [] }
      : go.call(go.ident('booleanInput'), [go.ident(value ? 'true' : 'false')]),
  text: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlText'), elements: [] }
      : go.call(go.ident('textInput'), [go.string(value)]),
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
