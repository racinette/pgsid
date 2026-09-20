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
} satisfies FunctionBindings<typeof PG18_JSON, ts.Expression>
