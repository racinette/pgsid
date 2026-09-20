import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_UUID } from '../../../postgres/builtins/uuid.generated.js'

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

export const typescriptUuidOperators = {
  'operator:["pg_catalog","="](pg_catalog.uuid,pg_catalog.uuid)': call('uuidEq'),
  'operator:["pg_catalog","<>"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidNe'),
  'operator:["pg_catalog","<"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidLt'),
  'operator:["pg_catalog","<="](pg_catalog.uuid,pg_catalog.uuid)': call('uuidLe'),
  'operator:["pg_catalog",">"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidGt'),
  'operator:["pg_catalog",">="](pg_catalog.uuid,pg_catalog.uuid)': call('uuidGe'),
} satisfies OperatorBindings<typeof PG18_UUID, ts.Expression>

export const typescriptUuidFunctions = {
  'function:["pg_catalog","uuid_eq"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidEq'),
  'function:["pg_catalog","uuid_ne"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidNe'),
  'function:["pg_catalog","uuid_lt"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidLt'),
  'function:["pg_catalog","uuid_le"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidLe'),
  'function:["pg_catalog","uuid_gt"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidGt'),
  'function:["pg_catalog","uuid_ge"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidGe'),
  'function:["pg_catalog","uuid_cmp"](pg_catalog.uuid,pg_catalog.uuid)': call('uuidCompare'),
  'function:["pg_catalog","uuid_extract_version"](pg_catalog.uuid)': call('uuidExtractVersion'),
} satisfies FunctionBindings<typeof PG18_UUID, ts.Expression>
