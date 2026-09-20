import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import type { CallableMetadata } from '../../../postgres/builtins/catalog.js'
import type {
  CallableEmitter,
  FunctionBindings,
  OperatorBindings,
} from '../../../sql-semantics/signatures.js'
import { PG18_JSON } from '../../../postgres/builtins/json.generated.js'

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

function typedCall<M extends CallableMetadata>(helper: string): CallableEmitter<M, ts.Expression> {
  return {
    helpers: [helper],
    emit: (metadata, operands) => ({
      type: metadata.result,
      expression: factory.createCallExpression(
        identifier(helper),
        undefined,
        operands.flatMap((operand) => [
          factory.createStringLiteral(operand.type),
          operand.expression,
        ]),
      ),
    }),
  }
}

export const typescriptJsonOperators = {
  'operator:["pg_catalog","->"](pg_catalog."json",pg_catalog.int4)': call('jsonArrayElement'),
  'operator:["pg_catalog","->"](pg_catalog."json",pg_catalog.text)': call('jsonObjectField'),
  'operator:["pg_catalog","->>"](pg_catalog."json",pg_catalog.int4)': call('jsonArrayElementText'),
  'operator:["pg_catalog","->>"](pg_catalog."json",pg_catalog.text)': call('jsonObjectFieldText'),
  'operator:["pg_catalog","#>"](pg_catalog."json",pg_catalog._text)': call('jsonExtractPath'),
  'operator:["pg_catalog","#>>"](pg_catalog."json",pg_catalog._text)': call('jsonExtractPathText'),
  'operator:["pg_catalog","->"](pg_catalog.jsonb,pg_catalog.int4)': call('jsonbArrayElement'),
  'operator:["pg_catalog","->"](pg_catalog.jsonb,pg_catalog.text)': call('jsonbObjectField'),
  'operator:["pg_catalog","->>"](pg_catalog.jsonb,pg_catalog.int4)': call('jsonbArrayElementText'),
  'operator:["pg_catalog","->>"](pg_catalog.jsonb,pg_catalog.text)': call('jsonbObjectFieldText'),
  'operator:["pg_catalog","#>"](pg_catalog.jsonb,pg_catalog._text)': call('jsonbExtractPath'),
  'operator:["pg_catalog","#>>"](pg_catalog.jsonb,pg_catalog._text)': call('jsonbExtractPathText'),
  'operator:["pg_catalog","="](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbEq'),
  'operator:["pg_catalog","<>"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbNe'),
  'operator:["pg_catalog","<"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbLt'),
  'operator:["pg_catalog","<="](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbLe'),
  'operator:["pg_catalog",">"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbGt'),
  'operator:["pg_catalog",">="](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbGe'),
  'operator:["pg_catalog","@>"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbContains'),
  'operator:["pg_catalog","<@"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbContained'),
  'operator:["pg_catalog","?"](pg_catalog.jsonb,pg_catalog.text)': call('jsonbExists'),
  'operator:["pg_catalog","?&"](pg_catalog.jsonb,pg_catalog._text)': call('jsonbExistsAll'),
  'operator:["pg_catalog","?|"](pg_catalog.jsonb,pg_catalog._text)': call('jsonbExistsAny'),
  'operator:["pg_catalog","||"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbConcat'),
  'operator:["pg_catalog","-"](pg_catalog.jsonb,pg_catalog.text)': call('jsonbDeleteKey'),
  'operator:["pg_catalog","-"](pg_catalog.jsonb,pg_catalog.int4)': call('jsonbDeleteIndex'),
  'operator:["pg_catalog","-"](pg_catalog.jsonb,pg_catalog._text)': call('jsonbDeleteKeys'),
  'operator:["pg_catalog","#-"](pg_catalog.jsonb,pg_catalog._text)': call('jsonbDeletePath'),
} satisfies OperatorBindings<typeof PG18_JSON, ts.Expression>

export const typescriptJsonFunctions = {
  'function:["pg_catalog","json_typeof"](pg_catalog."json")': call('jsonTypeof'),
  'function:["pg_catalog","json_array_length"](pg_catalog."json")': call('jsonArrayLength'),
  'function:["pg_catalog","json_object_field"](pg_catalog."json",pg_catalog.text)':
    call('jsonObjectField'),
  'function:["pg_catalog","json_object_field_text"](pg_catalog."json",pg_catalog.text)':
    call('jsonObjectFieldText'),
  'function:["pg_catalog","json_array_element"](pg_catalog."json",pg_catalog.int4)':
    call('jsonArrayElement'),
  'function:["pg_catalog","json_array_element_text"](pg_catalog."json",pg_catalog.int4)':
    call('jsonArrayElementText'),
  'function:["pg_catalog","json_extract_path"](pg_catalog."json",pg_catalog._text)':
    call('jsonExtractPath'),
  'function:["pg_catalog","json_extract_path_text"](pg_catalog."json",pg_catalog._text)':
    call('jsonExtractPathText'),
  'function:["pg_catalog","jsonb_typeof"](pg_catalog.jsonb)': call('jsonbTypeof'),
  'function:["pg_catalog","jsonb_array_length"](pg_catalog.jsonb)': call('jsonbArrayLength'),
  'function:["pg_catalog","jsonb_object_field"](pg_catalog.jsonb,pg_catalog.text)':
    call('jsonbObjectField'),
  'function:["pg_catalog","jsonb_object_field_text"](pg_catalog.jsonb,pg_catalog.text)':
    call('jsonbObjectFieldText'),
  'function:["pg_catalog","jsonb_array_element"](pg_catalog.jsonb,pg_catalog.int4)':
    call('jsonbArrayElement'),
  'function:["pg_catalog","jsonb_array_element_text"](pg_catalog.jsonb,pg_catalog.int4)':
    call('jsonbArrayElementText'),
  'function:["pg_catalog","jsonb_extract_path"](pg_catalog.jsonb,pg_catalog._text)':
    call('jsonbExtractPath'),
  'function:["pg_catalog","jsonb_extract_path_text"](pg_catalog.jsonb,pg_catalog._text)':
    call('jsonbExtractPathText'),
  'function:["pg_catalog","jsonb_cmp"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbCompare'),
  'function:["pg_catalog","jsonb_eq"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbEq'),
  'function:["pg_catalog","jsonb_ne"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbNe'),
  'function:["pg_catalog","jsonb_lt"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbLt'),
  'function:["pg_catalog","jsonb_le"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbLe'),
  'function:["pg_catalog","jsonb_gt"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbGt'),
  'function:["pg_catalog","jsonb_ge"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbGe'),
  'function:["pg_catalog","jsonb_contains"](pg_catalog.jsonb,pg_catalog.jsonb)':
    call('jsonbContains'),
  'function:["pg_catalog","jsonb_contained"](pg_catalog.jsonb,pg_catalog.jsonb)':
    call('jsonbContained'),
  'function:["pg_catalog","jsonb_exists"](pg_catalog.jsonb,pg_catalog.text)': call('jsonbExists'),
  'function:["pg_catalog","jsonb_exists_all"](pg_catalog.jsonb,pg_catalog._text)':
    call('jsonbExistsAll'),
  'function:["pg_catalog","jsonb_exists_any"](pg_catalog.jsonb,pg_catalog._text)':
    call('jsonbExistsAny'),
  'function:["pg_catalog","jsonb_concat"](pg_catalog.jsonb,pg_catalog.jsonb)': call('jsonbConcat'),
  'function:["pg_catalog","jsonb_delete"](pg_catalog.jsonb,pg_catalog.text)':
    call('jsonbDeleteKey'),
  'function:["pg_catalog","jsonb_delete"](pg_catalog.jsonb,pg_catalog.int4)':
    call('jsonbDeleteIndex'),
  'function:["pg_catalog","jsonb_delete"](pg_catalog.jsonb,pg_catalog._text)':
    call('jsonbDeleteKeys'),
  'function:["pg_catalog","jsonb_delete_path"](pg_catalog.jsonb,pg_catalog._text)':
    call('jsonbDeletePath'),
  'function:["pg_catalog","jsonb_set"](pg_catalog.jsonb,pg_catalog._text,pg_catalog.jsonb,pg_catalog.bool)':
    call('jsonbSet'),
  'function:["pg_catalog","jsonb_insert"](pg_catalog.jsonb,pg_catalog._text,pg_catalog.jsonb,pg_catalog.bool)':
    call('jsonbInsert'),
  'function:["pg_catalog","jsonb_set_lax"](pg_catalog.jsonb,pg_catalog._text,pg_catalog.jsonb,pg_catalog.bool,pg_catalog.text)':
    call('jsonbSetLax'),
  'function:["pg_catalog","json_strip_nulls"](pg_catalog."json",pg_catalog.bool)':
    call('jsonStripNulls'),
  'function:["pg_catalog","jsonb_strip_nulls"](pg_catalog.jsonb,pg_catalog.bool)':
    call('jsonbStripNulls'),
  'function:["pg_catalog","jsonb_pretty"](pg_catalog.jsonb)': call('jsonbPretty'),
  'function:["pg_catalog","bool"](pg_catalog.jsonb)': call('jsonbToBool'),
  'function:["pg_catalog","numeric"](pg_catalog.jsonb)': call('jsonbToNumeric'),
  'function:["pg_catalog","int2"](pg_catalog.jsonb)': call('jsonbToInt2'),
  'function:["pg_catalog","int4"](pg_catalog.jsonb)': call('jsonbToInt4'),
  'function:["pg_catalog","int8"](pg_catalog.jsonb)': call('jsonbToInt8'),
  'function:["pg_catalog","float4"](pg_catalog.jsonb)': call('jsonbToFloat4'),
  'function:["pg_catalog","float8"](pg_catalog.jsonb)': call('jsonbToFloat8'),
  'function:["pg_catalog","json_object"](pg_catalog._text)': call('jsonObject'),
  'function:["pg_catalog","json_object"](pg_catalog._text,pg_catalog._text)':
    call('jsonObjectPair'),
  'function:["pg_catalog","jsonb_object"](pg_catalog._text)': call('jsonbObject'),
  'function:["pg_catalog","jsonb_object"](pg_catalog._text,pg_catalog._text)':
    call('jsonbObjectPair'),
  'function:["pg_catalog","array_to_json"](pg_catalog.anyarray)': call('arrayToJson'),
  'function:["pg_catalog","array_to_json"](pg_catalog.anyarray,pg_catalog.bool)':
    call('arrayToJsonPretty'),
  'function:["pg_catalog","to_json"](pg_catalog.anyelement)': typedCall('toJson'),
  'function:["pg_catalog","to_jsonb"](pg_catalog.anyelement)': typedCall('toJsonb'),
  'function:["pg_catalog","json_build_array"]()': typedCall('jsonBuildArray'),
  'function:["pg_catalog","json_build_array"](pg_catalog."any")': typedCall('jsonBuildArray'),
  'function:["pg_catalog","json_build_object"]()': typedCall('jsonBuildObject'),
  'function:["pg_catalog","json_build_object"](pg_catalog."any")': typedCall('jsonBuildObject'),
  'function:["pg_catalog","jsonb_build_array"]()': typedCall('jsonbBuildArray'),
  'function:["pg_catalog","jsonb_build_array"](pg_catalog."any")': typedCall('jsonbBuildArray'),
  'function:["pg_catalog","jsonb_build_object"]()': typedCall('jsonbBuildObject'),
  'function:["pg_catalog","jsonb_build_object"](pg_catalog."any")': typedCall('jsonbBuildObject'),
} satisfies FunctionBindings<typeof PG18_JSON, ts.Expression>
