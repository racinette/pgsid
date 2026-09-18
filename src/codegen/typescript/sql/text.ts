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
} satisfies OperatorBindings<typeof PG18_TEXT, ts.Expression>

export const typescriptTextFunctions = {
  'function:["pg_catalog","length"](pg_catalog.text)': call('textLength'),
  'function:["pg_catalog","char_length"](pg_catalog.text)': call('textLength'),
  'function:["pg_catalog","character_length"](pg_catalog.text)': call('textLength'),
  'function:["pg_catalog","octet_length"](pg_catalog.text)': call('textOctetLength'),
  'function:["pg_catalog","textcat"](pg_catalog.text,pg_catalog.text)': call('textConcat'),
} satisfies FunctionBindings<typeof PG18_TEXT, ts.Expression>
