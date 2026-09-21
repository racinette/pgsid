import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_TEXT } from '../../../postgres/builtins/text.generated.js'

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

export const typescriptTextOperators = {
  'operator:["pg_catalog","="](pg_catalog.text,pg_catalog.text)': call('textEq'),
  'operator:["pg_catalog","<>"](pg_catalog.text,pg_catalog.text)': call('textNe'),
  'operator:["pg_catalog","<"](pg_catalog.text,pg_catalog.text)': call('textLt'),
  'operator:["pg_catalog","<="](pg_catalog.text,pg_catalog.text)': call('textLe'),
  'operator:["pg_catalog",">"](pg_catalog.text,pg_catalog.text)': call('textGt'),
  'operator:["pg_catalog",">="](pg_catalog.text,pg_catalog.text)': call('textGe'),
  'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)': call('textConcat'),
  'operator:["pg_catalog","~~"](pg_catalog.text,pg_catalog.text)': call('textLike'),
  'operator:["pg_catalog","!~~"](pg_catalog.text,pg_catalog.text)': call('textNotLike'),
  'operator:["pg_catalog","~~"](pg_catalog.bpchar,pg_catalog.text)': call('textLike'),
  'operator:["pg_catalog","!~~"](pg_catalog.bpchar,pg_catalog.text)': call('textNotLike'),
  'operator:["pg_catalog","~~*"](pg_catalog.text,pg_catalog.text)': call('textILike'),
  'operator:["pg_catalog","!~~*"](pg_catalog.text,pg_catalog.text)': call('textNotILike'),
  'operator:["pg_catalog","~~*"](pg_catalog.bpchar,pg_catalog.text)': call('textILike'),
  'operator:["pg_catalog","!~~*"](pg_catalog.bpchar,pg_catalog.text)': call('textNotILike'),
  'operator:["pg_catalog","~~"](pg_catalog.name,pg_catalog.text)': call('textLike'),
  'operator:["pg_catalog","!~~"](pg_catalog.name,pg_catalog.text)': call('textNotLike'),
  'operator:["pg_catalog","~~*"](pg_catalog.name,pg_catalog.text)': call('textILike'),
  'operator:["pg_catalog","!~~*"](pg_catalog.name,pg_catalog.text)': call('textNotILike'),
  'operator:["pg_catalog","="](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharEq'),
  'operator:["pg_catalog","<>"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharNe'),
  'operator:["pg_catalog","<"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharLt'),
  'operator:["pg_catalog","<="](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharLe'),
  'operator:["pg_catalog",">"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharGt'),
  'operator:["pg_catalog",">="](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharGe'),
} satisfies OperatorBindings<typeof PG18_TEXT, ts.Expression>

export const typescriptTextFunctions = {
  'function:["pg_catalog","length"](pg_catalog.text)': call('textLength'),
  'function:["pg_catalog","char_length"](pg_catalog.text)': call('textLength'),
  'function:["pg_catalog","character_length"](pg_catalog.text)': call('textLength'),
  'function:["pg_catalog","octet_length"](pg_catalog.text)': call('textOctetLength'),
  'function:["pg_catalog","textcat"](pg_catalog.text,pg_catalog.text)': call('textConcat'),
  'function:["pg_catalog","length"](pg_catalog.bpchar)': call('bpcharLength'),
  'function:["pg_catalog","char_length"](pg_catalog.bpchar)': call('bpcharLength'),
  'function:["pg_catalog","character_length"](pg_catalog.bpchar)': call('bpcharLength'),
  'function:["pg_catalog","octet_length"](pg_catalog.bpchar)': call('textOctetLength'),
  'function:["pg_catalog","text"](pg_catalog.bpchar)': call('bpcharText'),
  'function:["pg_catalog","text"](pg_catalog.bool)': call('booleanText'),
  'function:["pg_catalog","bpchar"](pg_catalog.bpchar,pg_catalog.int4,pg_catalog.bool)':
    call('bpcharCoerce'),
  'function:["pg_catalog","varchar"](pg_catalog."varchar",pg_catalog.int4,pg_catalog.bool)':
    call('varcharCoerce'),
  'function:["pg_catalog","ascii"](pg_catalog.text)': call('textAscii'),
  'function:["pg_catalog","bit_length"](pg_catalog.text)': call('textBitLength'),
  'function:["pg_catalog","reverse"](pg_catalog.text)': call('textReverse'),
  'function:["pg_catalog","left"](pg_catalog.text,pg_catalog.int4)': call('textLeft'),
  'function:["pg_catalog","right"](pg_catalog.text,pg_catalog.int4)': call('textRight'),
  'function:["pg_catalog","repeat"](pg_catalog.text,pg_catalog.int4)': call('textRepeat'),
  'function:["pg_catalog","strpos"](pg_catalog.text,pg_catalog.text)': call('textPosition'),
  'function:["pg_catalog","starts_with"](pg_catalog.text,pg_catalog.text)': call('textStartsWith'),
  'function:["pg_catalog","like"](pg_catalog.text,pg_catalog.text)': call('textLike'),
  'function:["pg_catalog","notlike"](pg_catalog.text,pg_catalog.text)': call('textNotLike'),
  'function:["pg_catalog","textlike"](pg_catalog.text,pg_catalog.text)': call('textLike'),
  'function:["pg_catalog","textnlike"](pg_catalog.text,pg_catalog.text)': call('textNotLike'),
  'function:["pg_catalog","bpcharlike"](pg_catalog.bpchar,pg_catalog.text)': call('textLike'),
  'function:["pg_catalog","bpcharnlike"](pg_catalog.bpchar,pg_catalog.text)': call('textNotLike'),
  'function:["pg_catalog","like_escape"](pg_catalog.text,pg_catalog.text)': call('textLikeEscape'),
  'function:["pg_catalog","lower"](pg_catalog.text)': call('textAsciiLower'),
  'function:["pg_catalog","upper"](pg_catalog.text)': call('textAsciiUpper'),
  'function:["pg_catalog","initcap"](pg_catalog.text)': call('textAsciiInitcap'),
  'function:["pg_catalog","casefold"](pg_catalog.text)': call('textAsciiLower'),
  'function:["pg_catalog","texticlike"](pg_catalog.text,pg_catalog.text)': call('textILike'),
  'function:["pg_catalog","texticnlike"](pg_catalog.text,pg_catalog.text)': call('textNotILike'),
  'function:["pg_catalog","bpchariclike"](pg_catalog.bpchar,pg_catalog.text)': call('textILike'),
  'function:["pg_catalog","bpcharicnlike"](pg_catalog.bpchar,pg_catalog.text)':
    call('textNotILike'),
  'function:["pg_catalog","namelike"](pg_catalog.name,pg_catalog.text)': call('textLike'),
  'function:["pg_catalog","namenlike"](pg_catalog.name,pg_catalog.text)': call('textNotLike'),
  'function:["pg_catalog","nameiclike"](pg_catalog.name,pg_catalog.text)': call('textILike'),
  'function:["pg_catalog","nameicnlike"](pg_catalog.name,pg_catalog.text)': call('textNotILike'),
  'function:["pg_catalog","substr"](pg_catalog.text,pg_catalog.int4)': call('textSubstring'),
  'function:["pg_catalog","substr"](pg_catalog.text,pg_catalog.int4,pg_catalog.int4)':
    call('textSubstringLength'),
  'function:["pg_catalog","substring"](pg_catalog.text,pg_catalog.int4)': call('textSubstring'),
  'function:["pg_catalog","substring"](pg_catalog.text,pg_catalog.int4,pg_catalog.int4)':
    call('textSubstringLength'),
  'function:["pg_catalog","btrim"](pg_catalog.text)': call('textTrimBothSpace'),
  'function:["pg_catalog","btrim"](pg_catalog.text,pg_catalog.text)': call('textTrimBoth'),
  'function:["pg_catalog","ltrim"](pg_catalog.text)': call('textTrimLeftSpace'),
  'function:["pg_catalog","ltrim"](pg_catalog.text,pg_catalog.text)': call('textTrimLeft'),
  'function:["pg_catalog","rtrim"](pg_catalog.text)': call('textTrimRightSpace'),
  'function:["pg_catalog","rtrim"](pg_catalog.text,pg_catalog.text)': call('textTrimRight'),
  'function:["pg_catalog","lpad"](pg_catalog.text,pg_catalog.int4)': call('textPadLeftSpace'),
  'function:["pg_catalog","lpad"](pg_catalog.text,pg_catalog.int4,pg_catalog.text)':
    call('textPadLeft'),
  'function:["pg_catalog","rpad"](pg_catalog.text,pg_catalog.int4)': call('textPadRightSpace'),
  'function:["pg_catalog","rpad"](pg_catalog.text,pg_catalog.int4,pg_catalog.text)':
    call('textPadRight'),
  'function:["pg_catalog","replace"](pg_catalog.text,pg_catalog.text,pg_catalog.text)':
    call('textReplace'),
  'function:["pg_catalog","translate"](pg_catalog.text,pg_catalog.text,pg_catalog.text)':
    call('textTranslate'),
  'function:["pg_catalog","split_part"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)':
    call('textSplitPart'),
  'function:["pg_catalog","overlay"](pg_catalog.text,pg_catalog.text,pg_catalog.int4)':
    call('textOverlay'),
  'function:["pg_catalog","overlay"](pg_catalog.text,pg_catalog.text,pg_catalog.int4,pg_catalog.int4)':
    call('textOverlayLength'),
  'function:["pg_catalog","bpchareq"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharEq'),
  'function:["pg_catalog","texteq"](pg_catalog.text,pg_catalog.text)': call('textEq'),
  'function:["pg_catalog","bpcharne"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharNe'),
  'function:["pg_catalog","textne"](pg_catalog.text,pg_catalog.text)': call('textNe'),
  'function:["pg_catalog","bpcharlt"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharLt'),
  'function:["pg_catalog","text_lt"](pg_catalog.text,pg_catalog.text)': call('textLt'),
  'function:["pg_catalog","bpcharle"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharLe'),
  'function:["pg_catalog","text_le"](pg_catalog.text,pg_catalog.text)': call('textLe'),
  'function:["pg_catalog","bpchargt"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharGt'),
  'function:["pg_catalog","text_gt"](pg_catalog.text,pg_catalog.text)': call('textGt'),
  'function:["pg_catalog","bpcharge"](pg_catalog.bpchar,pg_catalog.bpchar)': call('bpcharGe'),
  'function:["pg_catalog","text_ge"](pg_catalog.text,pg_catalog.text)': call('textGe'),
} satisfies FunctionBindings<typeof PG18_TEXT, ts.Expression>
