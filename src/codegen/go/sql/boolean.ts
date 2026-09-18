import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_BOOLEAN } from '../../../postgres/builtins/boolean.generated.js'

function call<M extends CallableMetadata>(helper: string): CallableEmitter<M, GoExpression> {
  return {
    helpers: [helper],
    emit: (metadata, operands) => ({
      type: metadata.result,
      expression: go.call(
        go.ident(helper),
        operands.map((operand) => operand.expression),
      ),
    }),
  }
}

export const goBooleanOperators = {
  'operator:["pg_catalog","="](pg_catalog.bool,pg_catalog.bool)': call('booleanEq'),
  'operator:["pg_catalog","<>"](pg_catalog.bool,pg_catalog.bool)': call('booleanNe'),
  'operator:["pg_catalog","<"](pg_catalog.bool,pg_catalog.bool)': call('booleanLt'),
  'operator:["pg_catalog","<="](pg_catalog.bool,pg_catalog.bool)': call('booleanLe'),
  'operator:["pg_catalog",">"](pg_catalog.bool,pg_catalog.bool)': call('booleanGt'),
  'operator:["pg_catalog",">="](pg_catalog.bool,pg_catalog.bool)': call('booleanGe'),
} satisfies OperatorBindings<typeof PG18_BOOLEAN, GoExpression>

export const goBooleanFunctions = {} satisfies FunctionBindings<typeof PG18_BOOLEAN, GoExpression>
