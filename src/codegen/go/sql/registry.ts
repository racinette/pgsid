import { goSqlSyntax } from './syntax.js'
import { goBooleanOperators, goBooleanFunctions } from './boolean.js'
import { goTextOperators, goTextFunctions } from './text.js'
import { goBinaryOperators, goBinaryFunctions } from './binary.js'
import { goFloatOperators, goFloatFunctions } from './floating-point.js'
import { goDecimalOperators, goDecimalFunctions } from './decimal.js'
import { go } from '../ast.js'
import type { GoExpression } from '../ast.js'
import { goNumericOperators, goNumericFunctions } from './numeric.js'
import { arrayType, enumType, type ExpressionBackend } from '../../../sql-semantics/expressions.js'
import { goUuidFunctions, goUuidOperators } from './uuid.js'
import { goJsonFunctions, goJsonOperators } from './json.js'
import { goTemporalFunctions, goTemporalOperators } from './temporal.js'

export const goSqlBackend: ExpressionBackend<GoExpression> = {
  bindings: [
    { domain: 'boolean', operators: goBooleanOperators, functions: goBooleanFunctions },
    { domain: 'text', operators: goTextOperators, functions: goTextFunctions },
    { domain: 'binary', operators: goBinaryOperators, functions: goBinaryFunctions },
    { domain: 'numeric', operators: goDecimalOperators, functions: goDecimalFunctions },
    { domain: 'numeric', operators: goFloatOperators, functions: goFloatFunctions },
    { domain: 'numeric', operators: goNumericOperators, functions: goNumericFunctions },
    { domain: 'uuid', operators: goUuidOperators, functions: goUuidFunctions },
    { domain: 'json', operators: goJsonOperators, functions: goJsonFunctions },
    { domain: 'temporal', operators: goTemporalOperators, functions: goTemporalFunctions },
  ],
  array: (elementType, dimensions, lowerBounds, elements) => ({
    expression:
      elements === null
        ? go.composite(go.ident('SqlArray'))
        : go.call(go.ident('arrayInput'), [
            go.string(elementType),
            go.composite(
              go.slice(go.ident('int64')),
              dimensions.map((dimension) => go.number(dimension)),
            ),
            go.composite(
              go.slice(go.ident('int64')),
              lowerBounds.map((bound) => go.number(bound)),
            ),
            go.composite(
              go.slice(go.ident('SqlArrayElement')),
              elements.map((element) =>
                go.call(go.ident('arrayElementInput'), [
                  go.string(elementType),
                  element.expression,
                ]),
              ),
            ),
          ]),
    helpers: elements === null ? [] : ['arrayElementInput'],
  }),
  arrayOperation: (operation, elementType, operands) => {
    let helper = {
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
    if (operation === 'position' && operands.length === 3) helper = 'arrayPositionStart'
    if (operation === 'fill' && operands.length === 3) helper = 'arrayFillBounds'
    if (operation === 'sort' && operands.length === 2) helper = 'arraySortOrder'
    if (operation === 'sort' && operands.length === 3) helper = 'arraySortNulls'
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
          return go.call(go.ident('arrayCoerce'), [go.string(elementType), operand.expression])
        }
        return operand.expression
      }
      if (scalarIndexes.includes(index)) {
        helpers.add('arrayElementInput')
        let expression = go.call(go.ident('arrayElementInput'), [
          go.string(operand.type),
          operand.expression,
        ])
        if (operand.type !== elementType) {
          helpers.add('arrayCoerceElement')
          expression = go.call(go.ident('arrayCoerceElement'), [go.string(elementType), expression])
        }
        return expression
      }
      return operand.expression
    })
    return {
      expression: go.call(go.ident(helper), args),
      helpers: [...helpers],
    }
  },
  arraySubscript: (elementType, array, subscripts) => {
    const helper = /^pg_catalog\.int[248]$/.test(elementType)
      ? 'arraySubscriptInteger'
      : /^pg_catalog\.float[48]$/.test(elementType)
        ? 'arraySubscriptFloat'
        : elementType === 'pg_catalog."numeric"'
          ? 'arraySubscriptDecimal'
          : elementType === 'pg_catalog.bool'
            ? 'arraySubscriptBoolean'
            : ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(elementType)
              ? 'arraySubscriptText'
              : elementType === 'pg_catalog.uuid'
                ? 'arraySubscriptUuid'
                : 'arraySubscriptEnum'
    return {
      expression: go.call(go.ident(helper), [
        array.expression,
        ...subscripts.map((subscript) => subscript.expression),
      ]),
      helpers: [helper],
    }
  },
  arraySlice: (array, bounds) => ({
    expression: go.call(go.ident('arraySlice'), [
      array.expression,
      go.composite(
        go.slice(go.ident('SqlInteger')),
        bounds.map((bound) => bound.lower?.expression ?? go.composite(go.ident('SqlInteger'))),
      ),
      go.composite(
        go.slice(go.ident('SqlInteger')),
        bounds.map((bound) => bound.upper?.expression ?? go.composite(go.ident('SqlInteger'))),
      ),
      go.composite(
        go.slice(go.ident('bool')),
        bounds.map((bound) => go.ident(bound.lower === null ? 'false' : 'true')),
      ),
      go.composite(
        go.slice(go.ident('bool')),
        bounds.map((bound) => go.ident(bound.upper === null ? 'false' : 'true')),
      ),
    ]),
    helpers: ['arraySlice'],
  }),
  arrayAssign: (elementType, array, subscripts, value) => {
    const helpers = ['arrayAssign', 'arrayElementInput']
    let element = go.call(go.ident('arrayElementInput'), [go.string(value.type), value.expression])
    if (value.type !== elementType) {
      helpers.push('arrayCoerceElement')
      element = go.call(go.ident('arrayCoerceElement'), [go.string(elementType), element])
    }
    return {
      expression: go.call(go.ident('arrayAssign'), [
        array.expression,
        go.composite(
          go.slice(go.ident('SqlInteger')),
          subscripts.map((subscript) => subscript.expression),
        ),
        element,
      ]),
      helpers,
    }
  },
  coerceEnum: (type, definition, operand) => {
    const helper = type === 'pg_catalog.text' ? 'enumText' : 'enumFromText'
    return {
      expression: go.call(
        go.ident(helper),
        helper === 'enumText'
          ? [operand.expression]
          : [
              operand.expression,
              go.string(type),
              go.composite(
                go.slice(go.ident('string')),
                definition.values.map((value) => go.string(value)),
              ),
            ],
      ),
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
      expression: go.call(
        go.ident(helper),
        operands.map((operand) => operand.expression),
      ),
      helpers: [helper],
    }
  },
  coerceUuid: (type, operand) => {
    const helper = type === 'pg_catalog.uuid' ? 'uuidFromText' : 'uuidText'
    return {
      expression: go.call(go.ident(helper), [operand.expression]),
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
      expression: go.call(go.ident(helper), [operand.expression]),
      helpers: [helper],
    }
  },
  coerceText: (type, length, explicit, operand) => {
    const helpers: string[] = []
    let expression = operand.expression
    if (operand.type === 'pg_catalog.bpchar' && type !== 'pg_catalog.bpchar') {
      helpers.push('bpcharText')
      expression = go.call(go.ident('bpcharText'), [expression])
    }
    if (length !== null) {
      const helper = type === 'pg_catalog.bpchar' ? 'bpcharCoerce' : 'varcharCoerce'
      helpers.push(helper, 'int4Input', 'booleanInput')
      expression = go.call(go.ident(helper), [
        expression,
        go.call(go.ident('int4Input'), [go.string(String(length + 4))]),
        go.call(go.ident('booleanInput'), [go.ident(explicit ? 'true' : 'false')]),
      ])
    }
    return { expression, helpers }
  },
  syntax: goSqlSyntax,
  boolean: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlBoolean'), elements: [] }
      : go.call(go.ident('booleanInput'), [go.ident(value ? 'true' : 'false')]),
  text: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlText'), elements: [] }
      : go.call(go.ident('textInput'), [go.string(value)]),
  name: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlText'), elements: [] }
      : go.call(go.ident('nameInput'), [go.string(value)]),
  bytea: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlText'), elements: [] }
      : go.call(go.ident('byteaInput'), [go.string(value)]),
  bit: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlText'), elements: [] }
      : go.call(go.ident('bitInput'), [go.string(value)]),
  uuid: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlUuid'), elements: [] }
      : go.call(go.ident('uuidInput'), [go.string(value)]),
  json: (value) =>
    value === null
      ? go.composite(go.ident('SqlJson'))
      : go.call(go.ident('jsonInput'), [go.string(value)]),
  jsonb: (value) =>
    value === null
      ? go.composite(go.ident('SqlJsonb'))
      : go.call(go.ident('jsonbInput'), [go.string(value)]),
  temporal: (type, value) => {
    const helper =
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
                : 'intervalInput'
    const result =
      type === 'pg_catalog.date'
        ? 'SqlDate'
        : type === 'pg_catalog."time"'
          ? 'SqlTime'
          : type === 'pg_catalog."timestamp"'
            ? 'SqlTimestamp'
            : type === 'pg_catalog.timestamptz'
              ? 'SqlTimestamptz'
              : type === 'pg_catalog.timetz'
                ? 'SqlTimeTz'
                : 'SqlInterval'
    return value === null
      ? go.composite(go.ident(result))
      : go.call(go.ident(helper), [go.string(value)])
  },
  enum: (definition, value) =>
    value === null
      ? go.composite(go.ident('SqlEnum'))
      : go.call(go.ident('enumInput'), [
          go.string(value),
          go.string(enumType(definition)),
          go.composite(
            go.slice(go.ident('string')),
            definition.values.map((label) => go.string(label)),
          ),
        ]),
  decimal: (value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlDecimal'), elements: [] }
      : go.call(go.ident('decimalInput'), [go.string(value)]),
  float: (type, bits) =>
    bits === null
      ? { kind: 'composite', type: go.ident('SqlFloat'), elements: [] }
      : go.call(go.ident(type === 'pg_catalog.float4' ? 'float4Input' : 'float8Input'), [
          go.string(bits),
        ]),
  integer: (type, value) =>
    value === null
      ? { kind: 'composite', type: go.ident('SqlInteger'), elements: [] }
      : go.call(
          go.ident(
            type === 'pg_catalog.int2'
              ? 'int2Input'
              : type === 'pg_catalog.int4'
                ? 'int4Input'
                : 'int8Input',
          ),
          [go.string(value)],
        ),
}
