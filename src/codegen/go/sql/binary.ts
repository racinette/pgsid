import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_BINARY } from '../../../postgres/builtins/binary.generated.js'

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

export const goBinaryOperators = {
  'operator:["pg_catalog","="](pg_catalog.bytea,pg_catalog.bytea)': call('byteaEq'),
  'operator:["pg_catalog","<>"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaNe'),
  'operator:["pg_catalog","<"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLt'),
  'operator:["pg_catalog","<="](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLe'),
  'operator:["pg_catalog",">"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaGt'),
  'operator:["pg_catalog",">="](pg_catalog.bytea,pg_catalog.bytea)': call('byteaGe'),
  'operator:["pg_catalog","||"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaCat'),
  'operator:["pg_catalog","~~"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLike'),
  'operator:["pg_catalog","!~~"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaNotLike'),
} satisfies OperatorBindings<typeof PG18_BINARY, GoExpression>

export const goBinaryFunctions = {
  'function:["pg_catalog","bytea_larger"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLarger'),
  'function:["pg_catalog","bytea_smaller"](pg_catalog.bytea,pg_catalog.bytea)':
    call('byteaSmaller'),
  'function:["pg_catalog","byteacat"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaCat'),
  'function:["pg_catalog","byteacmp"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaCompare'),
  'function:["pg_catalog","byteaeq"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaEq'),
  'function:["pg_catalog","byteage"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaGe'),
  'function:["pg_catalog","byteagt"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaGt'),
  'function:["pg_catalog","byteale"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLe'),
  'function:["pg_catalog","bytealike"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLike'),
  'function:["pg_catalog","bytealt"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaLt'),
  'function:["pg_catalog","byteane"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaNe'),
  'function:["pg_catalog","byteanlike"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaNotLike'),
  'function:["pg_catalog","btrim"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaTrimBoth'),
  'function:["pg_catalog","bit_count"](pg_catalog.bytea)': call('byteaBitCount'),
  'function:["pg_catalog","bit_length"](pg_catalog.bytea)': call('byteaBitLength'),
  'function:["pg_catalog","length"](pg_catalog.bytea)': call('byteaOctetLength'),
  'function:["pg_catalog","like_escape"](pg_catalog.bytea,pg_catalog.bytea)':
    call('byteaLikeEscape'),
  'function:["pg_catalog","ltrim"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaTrimLeft'),
  'function:["pg_catalog","octet_length"](pg_catalog.bytea)': call('byteaOctetLength'),
  'function:["pg_catalog","overlay"](pg_catalog.bytea,pg_catalog.bytea,pg_catalog.int4)':
    call('byteaOverlay'),
  'function:["pg_catalog","overlay"](pg_catalog.bytea,pg_catalog.bytea,pg_catalog.int4,pg_catalog.int4)':
    call('byteaOverlayLength'),
  'function:["pg_catalog","position"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaPosition'),
  'function:["pg_catalog","reverse"](pg_catalog.bytea)': call('byteaReverse'),
  'function:["pg_catalog","rtrim"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaTrimRight'),
  'function:["pg_catalog","substr"](pg_catalog.bytea,pg_catalog.int4)': call('byteaSubstr'),
  'function:["pg_catalog","substr"](pg_catalog.bytea,pg_catalog.int4,pg_catalog.int4)':
    call('byteaSubstrLength'),
  'function:["pg_catalog","substring"](pg_catalog.bytea,pg_catalog.int4)': call('byteaSubstr'),
  'function:["pg_catalog","substring"](pg_catalog.bytea,pg_catalog.int4,pg_catalog.int4)':
    call('byteaSubstrLength'),
} satisfies FunctionBindings<typeof PG18_BINARY, GoExpression>
