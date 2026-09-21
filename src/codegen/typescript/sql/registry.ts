import { typescriptSqlSyntax } from './syntax.js'
import { typescriptBooleanOperators, typescriptBooleanFunctions } from './boolean.js'
import { typescriptTextOperators, typescriptTextFunctions } from './text.js'
import { typescriptBinaryOperators, typescriptBinaryFunctions } from './binary.js'
import { typescriptFloatOperators, typescriptFloatFunctions } from './floating-point.js'
import { typescriptDecimalOperators, typescriptDecimalFunctions } from './decimal.js'
import ts from 'typescript'
import { factory, identifier } from '../ast.js'
import { typescriptNumericOperators, typescriptNumericFunctions } from './numeric.js'
import { arrayType, enumType, type ExpressionBackend } from '../../../sql-semantics/expressions.js'
import { typescriptUuidFunctions, typescriptUuidOperators } from './uuid.js'
import { typescriptJsonFunctions, typescriptJsonOperators } from './json.js'
import { typescriptTemporalFunctions, typescriptTemporalOperators } from './temporal.js'

export const typescriptSqlBackend: ExpressionBackend<ts.Expression> = {
  bindings: [
    {
      domain: 'boolean',
      operators: typescriptBooleanOperators,
      functions: typescriptBooleanFunctions,
    },
    { domain: 'text', operators: typescriptTextOperators, functions: typescriptTextFunctions },
    {
      domain: 'binary',
      operators: typescriptBinaryOperators,
      functions: typescriptBinaryFunctions,
    },
    {
      domain: 'numeric',
      operators: typescriptDecimalOperators,
      functions: typescriptDecimalFunctions,
    },
    { domain: 'numeric', operators: typescriptFloatOperators, functions: typescriptFloatFunctions },
    {
      domain: 'numeric',
      operators: typescriptNumericOperators,
      functions: typescriptNumericFunctions,
    },
    { domain: 'uuid', operators: typescriptUuidOperators, functions: typescriptUuidFunctions },
    { domain: 'json', operators: typescriptJsonOperators, functions: typescriptJsonFunctions },
    {
      domain: 'temporal',
      operators: typescriptTemporalOperators,
      functions: typescriptTemporalFunctions,
    },
  ],
  array: (elementType, dimensions, lowerBounds, elements) => ({
    expression: factory.createCallExpression(identifier('arrayInput'), undefined, [
      factory.createStringLiteral(elementType),
      factory.createArrayLiteralExpression(
        dimensions.map((dimension) => factory.createNumericLiteral(dimension)),
      ),
      factory.createArrayLiteralExpression(
        lowerBounds.map((bound) => factory.createNumericLiteral(bound)),
      ),
      elements === null
        ? factory.createNull()
        : factory.createArrayLiteralExpression(
            elements.map((element) =>
              factory.createCallExpression(identifier('arrayElementInput'), undefined, [
                factory.createStringLiteral(elementType),
                element.expression,
              ]),
            ),
          ),
    ]),
    helpers: elements === null ? [] : ['arrayElementInput'],
  }),
  arrayOperation: (operation, elementType, operands) => {
    const helper = {
      cardinality: 'arrayCardinality',
      ndims: 'arrayNdims',
      dims: 'arrayDims',
      length: 'arrayLength',
      lower: 'arrayLower',
      upper: 'arrayUpper',
      contains: 'arrayContains',
      contained: 'arrayContained',
      overlap: 'arrayOverlap',
      concat: 'arrayConcat',
      append: 'arrayAppend',
      prepend: 'arrayPrepend',
      position: 'arrayPosition',
      positions: 'arrayPositions',
      remove: 'arrayRemove',
      replace: 'arrayReplace',
      fill: 'arrayFill',
      trim: 'arrayTrim',
      reverse: 'arrayReverse',
      sort: 'arraySort',
      '=': 'arrayEq',
      '<>': 'arrayNe',
      '<': 'arrayLt',
      '<=': 'arrayLe',
      '>': 'arrayGt',
      '>=': 'arrayGe',
    }[operation]
    const arrayIndexes =
      operation === 'concat'
        ? [0, 1]
        : operation === 'prepend'
          ? [1]
          : operation === 'fill'
            ? []
            : [0]
    const scalarIndexesByOperation: Record<string, number[]> = {
      append: [1],
      prepend: [0],
      position: [1],
      positions: [1],
      remove: [1],
      replace: [1, 2],
      fill: [0],
    }
    const scalarIndexes = scalarIndexesByOperation[operation] ?? []
    const helpers = new Set([helper])
    const args = operands.map((operand, index) => {
      if (arrayIndexes.includes(index) && operand.type.startsWith('array:')) {
        if (operand.type !== arrayType(elementType)) {
          helpers.add('arrayCoerce')
          return factory.createCallExpression(identifier('arrayCoerce'), undefined, [
            factory.createStringLiteral(elementType),
            operand.expression,
          ])
        }
        return operand.expression
      }
      if (scalarIndexes.includes(index)) {
        helpers.add('arrayElementInput')
        let expression = factory.createCallExpression(identifier('arrayElementInput'), undefined, [
          factory.createStringLiteral(operand.type),
          operand.expression,
        ])
        if (operand.type !== elementType) {
          helpers.add('arrayCoerceElement')
          expression = factory.createCallExpression(identifier('arrayCoerceElement'), undefined, [
            factory.createStringLiteral(elementType),
            expression,
          ])
        }
        return expression
      }
      return operand.expression
    })
    return {
      expression: factory.createCallExpression(identifier(helper), undefined, args),
      helpers: [...helpers],
    }
  },
  arraySubscript: (_elementType, array, subscripts) => ({
    expression: factory.createCallExpression(identifier('arraySubscript'), undefined, [
      array.expression,
      ...subscripts.map((subscript) => subscript.expression),
    ]),
    helpers: ['arraySubscript'],
  }),
  arraySlice: (array, bounds) => ({
    expression: factory.createCallExpression(identifier('arraySlice'), undefined, [
      array.expression,
      factory.createArrayLiteralExpression(
        bounds.map((bound) =>
          factory.createArrayLiteralExpression([
            bound.lower?.expression ?? factory.createNull(),
            bound.upper?.expression ?? factory.createNull(),
          ]),
        ),
      ),
    ]),
    helpers: ['arraySlice'],
  }),
  arrayAssign: (elementType, array, subscripts, value) => {
    const helpers = ['arrayAssign', 'arrayElementInput']
    let element = factory.createCallExpression(identifier('arrayElementInput'), undefined, [
      factory.createStringLiteral(value.type),
      value.expression,
    ])
    if (value.type !== elementType) {
      helpers.push('arrayCoerceElement')
      element = factory.createCallExpression(identifier('arrayCoerceElement'), undefined, [
        factory.createStringLiteral(elementType),
        element,
      ])
    }
    return {
      expression: factory.createCallExpression(identifier('arrayAssign'), undefined, [
        array.expression,
        factory.createArrayLiteralExpression(subscripts.map((subscript) => subscript.expression)),
        element,
      ]),
      helpers,
    }
  },
  coerceEnum: (type, definition, operand) => {
    const helper = type === 'pg_catalog.text' ? 'enumText' : 'enumInput'
    return {
      expression:
        helper === 'enumText'
          ? factory.createCallExpression(identifier(helper), undefined, [operand.expression])
          : factory.createCallExpression(identifier(helper), undefined, [
              operand.expression,
              factory.createStringLiteral(type),
              factory.createArrayLiteralExpression(
                definition.values.map((value) => factory.createStringLiteral(value)),
              ),
            ]),
      helpers: [helper],
    }
  },
  compareEnum: (operation, operands) => {
    const helper = {
      '=': 'enumEq',
      '<>': 'enumNe',
      '<': 'enumLt',
      '<=': 'enumLe',
      '>': 'enumGt',
      '>=': 'enumGe',
    }[operation]
    return {
      expression: factory.createCallExpression(
        identifier(helper),
        undefined,
        operands.map((operand) => operand.expression),
      ),
      helpers: [helper],
    }
  },
  coerceUuid: (type, operand) => {
    const helper = type === 'pg_catalog.uuid' ? 'uuidFromText' : 'uuidText'
    return {
      expression: factory.createCallExpression(identifier(helper), undefined, [operand.expression]),
      helpers: [helper],
    }
  },
  coerceJson: (type, operand) => {
    const helper =
      type === 'pg_catalog.text'
        ? operand.type === 'pg_catalog.jsonb'
          ? 'jsonbText'
          : 'jsonText'
        : type === 'pg_catalog.jsonb'
          ? operand.type === 'pg_catalog.text'
            ? 'jsonbFromText'
            : 'jsonToJsonb'
          : operand.type === 'pg_catalog.text'
            ? 'jsonFromText'
            : 'jsonbToJson'
    return {
      expression: factory.createCallExpression(identifier(helper), undefined, [operand.expression]),
      helpers: [helper],
    }
  },
  coerceText: (type, length, explicit, operand) => {
    const helpers: string[] = []
    let expression = operand.expression
    if (operand.type === 'pg_catalog.bpchar' && type !== 'pg_catalog.bpchar') {
      helpers.push('bpcharText')
      expression = factory.createCallExpression(identifier('bpcharText'), undefined, [expression])
    }
    if (length !== null) {
      const helper = type === 'pg_catalog.bpchar' ? 'bpcharCoerce' : 'varcharCoerce'
      helpers.push(helper)
      expression = factory.createCallExpression(identifier(helper), undefined, [
        expression,
        factory.createBigIntLiteral(String(length + 4) + 'n'),
        explicit ? factory.createTrue() : factory.createFalse(),
      ])
    }
    return { expression, helpers }
  },
  syntax: typescriptSqlSyntax,
  boolean: (value) =>
    factory.createCallExpression(identifier('booleanInput'), undefined, [
      value === null ? factory.createNull() : value ? factory.createTrue() : factory.createFalse(),
    ]),
  text: (value) =>
    factory.createCallExpression(identifier('textInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  name: (value) =>
    factory.createCallExpression(identifier('nameInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  bytea: (value) =>
    factory.createCallExpression(identifier('byteaInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  bit: (value) =>
    factory.createCallExpression(identifier('bitInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  uuid: (value) =>
    factory.createCallExpression(identifier('uuidInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  json: (value) =>
    factory.createCallExpression(identifier('jsonInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  jsonb: (value) =>
    factory.createCallExpression(identifier('jsonbInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  temporal: (type, value) =>
    factory.createCallExpression(
      identifier(
        type === 'pg_catalog.date'
          ? 'dateInput'
          : type === 'pg_catalog."time"'
            ? 'timeInput'
            : type === 'pg_catalog."timestamp"'
              ? 'timestampInput'
              : type === 'pg_catalog.timestamptz'
                ? 'timestamptzInput'
                : type === 'pg_catalog.timetz'
                  ? 'timetzInput'
                  : 'intervalInput',
      ),
      undefined,
      [value === null ? factory.createNull() : factory.createStringLiteral(value)],
    ),
  enum: (definition, value) =>
    factory.createCallExpression(identifier('enumInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
      factory.createStringLiteral(enumType(definition)),
      factory.createArrayLiteralExpression(
        definition.values.map((label) => factory.createStringLiteral(label)),
      ),
    ]),
  decimal: (value) =>
    factory.createCallExpression(identifier('decimalInput'), undefined, [
      value === null ? factory.createNull() : factory.createStringLiteral(value),
    ]),
  float: (type, bits) =>
    factory.createCallExpression(
      identifier(type === 'pg_catalog.float4' ? 'float4Input' : 'float8Input'),
      undefined,
      [bits === null ? factory.createNull() : factory.createStringLiteral(bits)],
    ),
  integer: (type, value) =>
    factory.createCallExpression(
      identifier(
        type === 'pg_catalog.int2'
          ? 'int2Input'
          : type === 'pg_catalog.int4'
            ? 'int4Input'
            : 'int8Input',
      ),
      undefined,
      [value === null ? factory.createNull() : factory.createStringLiteral(value)],
    ),
}
