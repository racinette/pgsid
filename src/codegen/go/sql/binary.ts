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
  'operator:["pg_catalog","="](pg_catalog."bit",pg_catalog."bit")': call('bitEq'),
  'operator:["pg_catalog","<>"](pg_catalog."bit",pg_catalog."bit")': call('bitNe'),
  'operator:["pg_catalog","<"](pg_catalog."bit",pg_catalog."bit")': call('bitLt'),
  'operator:["pg_catalog","<="](pg_catalog."bit",pg_catalog."bit")': call('bitLe'),
  'operator:["pg_catalog",">"](pg_catalog."bit",pg_catalog."bit")': call('bitGt'),
  'operator:["pg_catalog",">="](pg_catalog."bit",pg_catalog."bit")': call('bitGe'),
  'operator:["pg_catalog","="](pg_catalog.varbit,pg_catalog.varbit)': call('bitEq'),
  'operator:["pg_catalog","<>"](pg_catalog.varbit,pg_catalog.varbit)': call('bitNe'),
  'operator:["pg_catalog","<"](pg_catalog.varbit,pg_catalog.varbit)': call('bitLt'),
  'operator:["pg_catalog","<="](pg_catalog.varbit,pg_catalog.varbit)': call('bitLe'),
  'operator:["pg_catalog",">"](pg_catalog.varbit,pg_catalog.varbit)': call('bitGt'),
  'operator:["pg_catalog",">="](pg_catalog.varbit,pg_catalog.varbit)': call('bitGe'),
  'operator:["pg_catalog","&"](pg_catalog."bit",pg_catalog."bit")': call('bitAnd'),
  'operator:["pg_catalog","|"](pg_catalog."bit",pg_catalog."bit")': call('bitOr'),
  'operator:["pg_catalog","#"](pg_catalog."bit",pg_catalog."bit")': call('bitXor'),
  'operator:["pg_catalog","~"](,pg_catalog."bit")': call('bitNot'),
  'operator:["pg_catalog","<<"](pg_catalog."bit",pg_catalog.int4)': call('bitShiftLeft'),
  'operator:["pg_catalog",">>"](pg_catalog."bit",pg_catalog.int4)': call('bitShiftRight'),
  'operator:["pg_catalog","||"](pg_catalog.varbit,pg_catalog.varbit)': call('bitCat'),
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
  'function:["pg_catalog","get_bit"](pg_catalog.bytea,pg_catalog.int8)': call('byteaGetBit'),
  'function:["pg_catalog","get_byte"](pg_catalog.bytea,pg_catalog.int4)': call('byteaGetByte'),
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
  'function:["pg_catalog","set_bit"](pg_catalog.bytea,pg_catalog.int8,pg_catalog.int4)':
    call('byteaSetBit'),
  'function:["pg_catalog","set_byte"](pg_catalog.bytea,pg_catalog.int4,pg_catalog.int4)':
    call('byteaSetByte'),
  'function:["pg_catalog","rtrim"](pg_catalog.bytea,pg_catalog.bytea)': call('byteaTrimRight'),
  'function:["pg_catalog","substr"](pg_catalog.bytea,pg_catalog.int4)': call('byteaSubstr'),
  'function:["pg_catalog","substr"](pg_catalog.bytea,pg_catalog.int4,pg_catalog.int4)':
    call('byteaSubstrLength'),
  'function:["pg_catalog","substring"](pg_catalog.bytea,pg_catalog.int4)': call('byteaSubstr'),
  'function:["pg_catalog","substring"](pg_catalog.bytea,pg_catalog.int4,pg_catalog.int4)':
    call('byteaSubstrLength'),
  'function:["pg_catalog","bytea"](pg_catalog.int2)': call('byteaFromInt2'),
  'function:["pg_catalog","bytea"](pg_catalog.int4)': call('byteaFromInt4'),
  'function:["pg_catalog","bytea"](pg_catalog.int8)': call('byteaFromInt8'),
  'function:["pg_catalog","int2"](pg_catalog.bytea)': call('byteaToInt2'),
  'function:["pg_catalog","int4"](pg_catalog.bytea)': call('byteaToInt4'),
  'function:["pg_catalog","int8"](pg_catalog.bytea)': call('byteaToInt8'),
  'function:["pg_catalog","encode"](pg_catalog.bytea,pg_catalog.text)': call('byteaEncode'),
  'function:["pg_catalog","decode"](pg_catalog.text,pg_catalog.text)': call('byteaDecodeFormat'),
  'function:["pg_catalog","bit"](pg_catalog."bit",pg_catalog.int4,pg_catalog.bool)':
    call('bitTypmod'),
  'function:["pg_catalog","bit"](pg_catalog.int4,pg_catalog.int4)': call('bitFromInt4'),
  'function:["pg_catalog","bit"](pg_catalog.int8,pg_catalog.int4)': call('bitFromInt8'),
  'function:["pg_catalog","bit_count"](pg_catalog."bit")': call('bitCount'),
  'function:["pg_catalog","bit_length"](pg_catalog."bit")': call('bitLength'),
  'function:["pg_catalog","bitand"](pg_catalog."bit",pg_catalog."bit")': call('bitAnd'),
  'function:["pg_catalog","bitcat"](pg_catalog.varbit,pg_catalog.varbit)': call('bitCat'),
  'function:["pg_catalog","bitcmp"](pg_catalog."bit",pg_catalog."bit")': call('bitCompare'),
  'function:["pg_catalog","biteq"](pg_catalog."bit",pg_catalog."bit")': call('bitEq'),
  'function:["pg_catalog","bitge"](pg_catalog."bit",pg_catalog."bit")': call('bitGe'),
  'function:["pg_catalog","bitgt"](pg_catalog."bit",pg_catalog."bit")': call('bitGt'),
  'function:["pg_catalog","bitle"](pg_catalog."bit",pg_catalog."bit")': call('bitLe'),
  'function:["pg_catalog","bitlt"](pg_catalog."bit",pg_catalog."bit")': call('bitLt'),
  'function:["pg_catalog","bitne"](pg_catalog."bit",pg_catalog."bit")': call('bitNe'),
  'function:["pg_catalog","bitnot"](pg_catalog."bit")': call('bitNot'),
  'function:["pg_catalog","bitor"](pg_catalog."bit",pg_catalog."bit")': call('bitOr'),
  'function:["pg_catalog","bitshiftleft"](pg_catalog."bit",pg_catalog.int4)': call('bitShiftLeft'),
  'function:["pg_catalog","bitshiftright"](pg_catalog."bit",pg_catalog.int4)':
    call('bitShiftRight'),
  'function:["pg_catalog","bitxor"](pg_catalog."bit",pg_catalog."bit")': call('bitXor'),
  'function:["pg_catalog","get_bit"](pg_catalog."bit",pg_catalog.int4)': call('bitGet'),
  'function:["pg_catalog","int4"](pg_catalog."bit")': call('bitToInt4'),
  'function:["pg_catalog","int8"](pg_catalog."bit")': call('bitToInt8'),
  'function:["pg_catalog","length"](pg_catalog."bit")': call('bitLength'),
  'function:["pg_catalog","octet_length"](pg_catalog."bit")': call('bitOctetLength'),
  'function:["pg_catalog","overlay"](pg_catalog."bit",pg_catalog."bit",pg_catalog.int4)':
    call('bitOverlay'),
  'function:["pg_catalog","overlay"](pg_catalog."bit",pg_catalog."bit",pg_catalog.int4,pg_catalog.int4)':
    call('bitOverlayLength'),
  'function:["pg_catalog","position"](pg_catalog."bit",pg_catalog."bit")': call('bitPosition'),
  'function:["pg_catalog","set_bit"](pg_catalog."bit",pg_catalog.int4,pg_catalog.int4)':
    call('bitSet'),
  'function:["pg_catalog","substring"](pg_catalog."bit",pg_catalog.int4)': call('bitSubstr'),
  'function:["pg_catalog","substring"](pg_catalog."bit",pg_catalog.int4,pg_catalog.int4)':
    call('bitSubstrLength'),
  'function:["pg_catalog","varbit"](pg_catalog.varbit,pg_catalog.int4,pg_catalog.bool)':
    call('varbitTypmod'),
  'function:["pg_catalog","varbitcmp"](pg_catalog.varbit,pg_catalog.varbit)': call('bitCompare'),
  'function:["pg_catalog","varbiteq"](pg_catalog.varbit,pg_catalog.varbit)': call('bitEq'),
  'function:["pg_catalog","varbitge"](pg_catalog.varbit,pg_catalog.varbit)': call('bitGe'),
  'function:["pg_catalog","varbitgt"](pg_catalog.varbit,pg_catalog.varbit)': call('bitGt'),
  'function:["pg_catalog","varbitle"](pg_catalog.varbit,pg_catalog.varbit)': call('bitLe'),
  'function:["pg_catalog","varbitlt"](pg_catalog.varbit,pg_catalog.varbit)': call('bitLt'),
  'function:["pg_catalog","varbitne"](pg_catalog.varbit,pg_catalog.varbit)': call('bitNe'),
} satisfies FunctionBindings<typeof PG18_BINARY, GoExpression>
