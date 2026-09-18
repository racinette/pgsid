import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_NUMERIC } from '../../../postgres/builtins/numeric.generated.js'

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

export const typescriptDecimalOperators = {
  'operator:["pg_catalog","+"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalAdd'),
  'operator:["pg_catalog","-"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalSub'),
  'operator:["pg_catalog","*"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalMul'),
  'operator:["pg_catalog","/"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalDiv'),
  'operator:["pg_catalog","%"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalMod'),
  'operator:["pg_catalog","="](pg_catalog."numeric",pg_catalog."numeric")': call('decimalEq'),
  'operator:["pg_catalog","<>"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalNe'),
  'operator:["pg_catalog","<"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalLt'),
  'operator:["pg_catalog","<="](pg_catalog."numeric",pg_catalog."numeric")': call('decimalLe'),
  'operator:["pg_catalog",">"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalGt'),
  'operator:["pg_catalog",">="](pg_catalog."numeric",pg_catalog."numeric")': call('decimalGe'),
  'operator:["pg_catalog","+"](,pg_catalog."numeric")': call('decimalIdentity'),
  'operator:["pg_catalog","-"](,pg_catalog."numeric")': call('decimalNeg'),
  'operator:["pg_catalog","@"](,pg_catalog."numeric")': call('decimalAbs'),
} satisfies OperatorBindings<typeof PG18_NUMERIC, ts.Expression>

export const typescriptDecimalFunctions = {
  'function:["pg_catalog","abs"](pg_catalog."numeric")': call('decimalAbs'),
  'function:["pg_catalog","ceil"](pg_catalog."numeric")': call('decimalCeil'),
  'function:["pg_catalog","ceiling"](pg_catalog."numeric")': call('decimalCeil'),
  'function:["pg_catalog","floor"](pg_catalog."numeric")': call('decimalFloor'),
  'function:["pg_catalog","sign"](pg_catalog."numeric")': call('decimalSign'),
  'function:["pg_catalog","round"](pg_catalog."numeric")': call('decimalRound'),
  'function:["pg_catalog","trunc"](pg_catalog."numeric")': call('decimalTrunc'),
  'function:["pg_catalog","round"](pg_catalog."numeric",pg_catalog.int4)': call('decimalRound'),
  'function:["pg_catalog","trunc"](pg_catalog."numeric",pg_catalog.int4)': call('decimalTrunc'),
  'function:["pg_catalog","mod"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalMod'),
  'function:["pg_catalog","div"](pg_catalog."numeric",pg_catalog."numeric")':
    call('decimalQuotient'),
  'function:["pg_catalog","gcd"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalGcd'),
  'function:["pg_catalog","lcm"](pg_catalog."numeric",pg_catalog."numeric")': call('decimalLcm'),
  'function:["pg_catalog","int2"](pg_catalog."numeric")': call('int2FromDecimal'),
  'function:["pg_catalog","numeric"](pg_catalog.int2)': call('decimalFromInteger'),
  'function:["pg_catalog","int4"](pg_catalog."numeric")': call('int4FromDecimal'),
  'function:["pg_catalog","numeric"](pg_catalog.int4)': call('decimalFromInteger'),
  'function:["pg_catalog","int8"](pg_catalog."numeric")': call('int8FromDecimal'),
  'function:["pg_catalog","numeric"](pg_catalog.int8)': call('decimalFromInteger'),
  'function:["pg_catalog","float4"](pg_catalog."numeric")': call('float4FromDecimal'),
  'function:["pg_catalog","numeric"](pg_catalog.float4)': call('decimalFromFloat4'),
  'function:["pg_catalog","float8"](pg_catalog."numeric")': call('float8FromDecimal'),
  'function:["pg_catalog","numeric"](pg_catalog.float8)': call('decimalFromFloat8'),
  'function:["pg_catalog","numeric"](pg_catalog."numeric",pg_catalog.int4)': call('decimalTypmod'),
} satisfies FunctionBindings<typeof PG18_NUMERIC, ts.Expression>
