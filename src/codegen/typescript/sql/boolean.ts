import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_BOOLEAN } from '../../../postgres/builtins/boolean.generated.js'

function call<M extends CallableMetadata>(helper: string): CallableEmitter<M, ts.Expression> {
  return {
    helpers: [helper],
    emit: (metadata, operands) => ({
      type: metadata.result,
      expression: factory.createCallExpression(
        identifier(helper),
        undefined,
        operands.map((operand) => operand.expression),
      ),
    }),
  }
}

export const typescriptBooleanOperators = {
  'operator:["pg_catalog","="](pg_catalog.bool,pg_catalog.bool)': call('booleanEq'),
  'operator:["pg_catalog","<>"](pg_catalog.bool,pg_catalog.bool)': call('booleanNe'),
  'operator:["pg_catalog","<"](pg_catalog.bool,pg_catalog.bool)': call('booleanLt'),
  'operator:["pg_catalog","<="](pg_catalog.bool,pg_catalog.bool)': call('booleanLe'),
  'operator:["pg_catalog",">"](pg_catalog.bool,pg_catalog.bool)': call('booleanGt'),
  'operator:["pg_catalog",">="](pg_catalog.bool,pg_catalog.bool)': call('booleanGe'),
} satisfies OperatorBindings<typeof PG18_BOOLEAN, ts.Expression>

export const typescriptBooleanFunctions = {} satisfies FunctionBindings<
  typeof PG18_BOOLEAN,
  ts.Expression
>
