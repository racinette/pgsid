import { builtinCast } from '../postgres/builtins/inventory.js'
import { parseSync } from 'libpg-query'
import { tree, scalar, type Tree, type Value } from './expression-tree.js'
import { storedTextConstant } from './text-constant-storage.js'
import { storedNumericConstant } from './numeric-constant-storage.js'
import { storedTemporalConstant } from './temporal-constant-storage.js'
import { storedBinaryConstant } from './binary-constant-storage.js'
import { storedJsonpathConstant } from './jsonpath-constant-storage.js'
import { storedJsonbConstant } from './jsonb-constant-storage.js'
import { storedArrayConstant } from './array-value-constant-storage.js'
import { storedEnumConstant } from './enum-constant-storage.js'
import type { ConstantStorageType } from './container-constant-storage.js'
import {
  storedAddressBitConstant,
  type NetworkStorageFamilies,
} from './address-bit-constant-storage.js'

export interface StoredExpressionCollation {
  schema: string
  name: string
  deterministic: boolean
}

export interface StoredRowExpressionInput {
  types: ReadonlyMap<number, string>
  functions: ReadonlyMap<number, { signature: string; args: readonly string[]; result: string }>
  columns: ReadonlyMap<number, { name: string; type: number }>
  byteOrder: 'little' | 'big'
  utf8?: boolean
  collations?: ReadonlyMap<number, StoredExpressionCollation>
  networkFamilies?: NetworkStorageFamilies
  arrayElements?: ReadonlyMap<number, number>
  arrayElement?: number
  storageTypes?: ReadonlyMap<number, ConstantStorageType>
  storageDoubleAlign?: 4 | 8
  enumLabels?: ReadonlyMap<number, ReadonlyMap<number, string>>
}

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : undefined

function expressionType(node: Tree): string | null {
  if (node.kind === 'COLLATEEXPR') {
    const arg = tree(node.fields['arg']?.[0])
    return arg ? expressionType(arg) : null
  }
  const keys: Record<string, string> = {
    VAR: 'vartype',
    CONST: 'consttype',
    PARAM: 'paramtype',
    FUNCEXPR: 'funcresulttype',
    OPEXPR: 'opresulttype',
    NULLIFEXPR: 'opresulttype',
    CASEEXPR: 'casetype',
    COALESCEEXPR: 'coalescetype',
    MINMAXEXPR: 'minmaxtype',
    ARRAYEXPR: 'array_typeid',
    ROWEXPR: 'row_typeid',
    CASETESTEXPR: 'typeId',
    COERCETODOMAINVALUE: 'typeId',
    SQLVALUEFUNCTION: 'type',
    SUBSCRIPTINGREF: 'refrestype',
  }
  return scalar(node, keys[node.kind] ?? 'resulttype')
}

function typedExpression(arg: unknown, type: string): unknown {
  const select = fields(parseSync(`SELECT NULL::${type}`).stmts?.[0]?.stmt)?.['SelectStmt'],
    targets = fields(select)?.['targetList'],
    value = Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget'])?.['val'] : undefined,
    cast = fields(fields(value)?.['TypeCast'])
  if (cast) cast['arg'] = arg
  return value
}

export function storedRowExpression(value: Value, input: StoredRowExpressionInput): unknown {
  const node = tree(value)
  if (!node) return undefined
  const list = (name: string): Value[] => {
    const values = node.fields[name]?.[0]
    return Array.isArray(values) ? values : []
  }
  const convert = (value: Value | undefined): unknown =>
    value === undefined ? undefined : storedRowExpression(value, input)
  const collation = (name: string): StoredExpressionCollation | null | undefined => {
    const oid = scalar(node, name)
    return oid === '0' ? null : oid === null ? undefined : input.collations?.get(Number(oid))
  }
  const collated = (arg: unknown, name: string, explicit = false): unknown => {
    if (arg === undefined) return undefined
    const selected = collation(name)
    return selected === null
      ? arg
      : selected
        ? { PgsidStoredCollation: { arg, collation: selected, explicit } }
        : undefined
  }
  if (node.kind === 'VAR') {
    const column = input.columns.get(Number(scalar(node, 'varattno')))
    if (
      !column ||
      scalar(node, 'varno') !== '1' ||
      scalar(node, 'varlevelsup') !== '0' ||
      Number(scalar(node, 'vartype')) !== column.type
    )
      return undefined
    return collated({ ColumnRef: { fields: [{ String: { sval: column.name } }] } }, 'varcollid')
  }
  if (node.kind === 'COERCETODOMAINVALUE')
    return { ColumnRef: { fields: [{ String: { sval: 'value' } }] } }
  if (node.kind === 'SUBSCRIPTINGREF') {
    const arg = convert(node.fields['refexpr']?.[0]),
      upper = list('refupperindexpr'),
      lower = list('reflowerindexpr')
    if (
      arg === undefined ||
      !upper.length ||
      (lower.length !== 0 && lower.length !== upper.length) ||
      tree(node.fields['refassgnexpr']?.[0])
    )
      return undefined
    const indices = upper.map((bound, index) => {
      const uidx = bound === '<>' ? null : convert(bound),
        low = lower[index],
        lidx = low === undefined || low === '<>' ? null : convert(low)
      return uidx === undefined || lidx === undefined
        ? undefined
        : {
            A_Indices: {
              is_slice: lower.length > 0,
              ...(uidx === null ? {} : { uidx }),
              ...(lidx === null ? {} : { lidx }),
            },
          }
    })
    return indices.every((index) => index !== undefined)
      ? collated({ A_Indirection: { arg, indirection: indices } }, 'refcollid')
      : undefined
  }
  if (node.kind === 'CASETESTEXPR')
    return input.arrayElement !== undefined && Number(scalar(node, 'typeId')) === input.arrayElement
      ? collated(
          { ColumnRef: { fields: [{ String: { sval: '__pgsid_domain_element' } }] } },
          'collation',
        )
      : undefined
  if (node.kind === 'ARRAYEXPR') {
    const array = Number(scalar(node, 'array_typeid')),
      element = Number(scalar(node, 'element_typeid')),
      type = input.types.get(element),
      dimensions = scalar(node, 'multidims'),
      args = list('elements').map(convert)
    return input.arrayElements?.get(array) === element &&
      type &&
      (dimensions === 'true' || dimensions === 'false') &&
      args.every((arg) => arg !== undefined)
      ? collated(
          { PgsidStoredArray: { element: type, multidimensional: dimensions === 'true', args } },
          'array_collid',
        )
      : undefined
  }
  if (node.kind === 'ARRAYCOERCEEXPR') {
    const original = tree(node.fields['arg']?.[0]),
      sourceArray = original && expressionType(original),
      sourceElement = sourceArray ? input.arrayElements?.get(Number(sourceArray)) : undefined,
      targetElement = input.arrayElements?.get(Number(scalar(node, 'resulttype'))),
      source = sourceElement === undefined ? undefined : input.types.get(sourceElement),
      target = targetElement === undefined ? undefined : input.types.get(targetElement),
      arg = convert(node.fields['arg']?.[0]),
      rawConversion = node.fields['elemexpr']?.[0],
      conversion =
        rawConversion === undefined || sourceElement === undefined
          ? undefined
          : storedRowExpression(rawConversion, { ...input, arrayElement: sourceElement })
    return arg !== undefined && source && target && conversion !== undefined
      ? collated({ PgsidStoredArrayCoercion: { arg, source, target, conversion } }, 'resultcollid')
      : undefined
  }
  if (node.kind === 'CONST') {
    const oid = Number(scalar(node, 'consttype')),
      type = input.types.get(oid)
    if (!type) return undefined
    if (input.storageTypes) {
      const expression = storedArrayConstant(
        node,
        input.storageTypes,
        input.byteOrder,
        input.storageDoubleAlign,
        (bytes, type) => {
          const byval =
              type.kind === 'e' ||
              [
                'pg_catalog.bool',
                'pg_catalog.int2',
                'pg_catalog.int4',
                'pg_catalog.int8',
                'pg_catalog.float4',
                'pg_catalog.float8',
                'pg_catalog.date',
                'pg_catalog."time"',
                'pg_catalog."timestamp"',
                'pg_catalog.timestamptz',
              ].includes(type.identity),
            data = byval ? Buffer.alloc(Math.max(4, bytes.length)) : bytes
          if (byval) bytes.copy(data, input.byteOrder === 'big' ? data.length - bytes.length : 0)
          return storedRowExpression(
            {
              kind: 'CONST',
              fields: {
                consttype: [String(type.oid)],
                constlen: [String(type.length)],
                constbyval: [String(byval)],
                constisnull: ['false'],
                constcollid: [scalar(node, 'constcollid') ?? '0'],
                constvalue: [String(byval ? type.length : data.length), [...data].map(String)],
              },
            },
            input,
          )
        },
      )
      if (expression !== undefined) return collated(expression, 'constcollid')
    }
    const labels = input.enumLabels?.get(oid)
    if (labels) {
      if (scalar(node, 'constisnull') === 'true')
        return typedExpression({ A_Const: { isnull: true } }, type)
      const value = storedEnumConstant(node, input.byteOrder, labels)
      return value === undefined
        ? undefined
        : typedExpression({ A_Const: { sval: { sval: value } } }, type)
    }
    if (!type?.startsWith('pg_catalog.')) return undefined
    let literal: string
    if (scalar(node, 'constisnull') === 'true') literal = 'NULL'
    else if (
      [
        'pg_catalog.text',
        'pg_catalog."varchar"',
        'pg_catalog.varchar',
        'pg_catalog.bpchar',
        'pg_catalog."json"',
        'pg_catalog.json',
      ].includes(type)
    ) {
      const text = storedTextConstant(node, input.utf8 === true, input.byteOrder)
      return text === undefined || text === null
        ? undefined
        : collated(typedExpression({ A_Const: { sval: { sval: text } } }, type), 'constcollid')
    } else if (type === 'pg_catalog.jsonb') {
      const text = storedJsonbConstant(node, input.byteOrder, input.utf8 === true)
      return text === undefined
        ? undefined
        : typedExpression({ A_Const: { sval: { sval: text } } }, type)
    } else if (type === 'pg_catalog.jsonpath') {
      const text = storedJsonpathConstant(node, input.byteOrder, input.utf8 === true)
      return typeof text === 'string' ? { PgsidStoredJsonpath: text } : undefined
    } else if (type === 'pg_catalog.bytea' || type === 'pg_catalog.uuid') {
      const storage = storedBinaryConstant(node, type, input.byteOrder)
      return storage ? { PgsidStoredBinary: storage } : undefined
    } else if (
      type === 'pg_catalog.inet' ||
      type === 'pg_catalog.cidr' ||
      type === 'pg_catalog.macaddr' ||
      type === 'pg_catalog.macaddr8' ||
      type === 'pg_catalog."bit"' ||
      type === 'pg_catalog.varbit'
    ) {
      const storage = storedAddressBitConstant(node, type, input.byteOrder, input.networkFamilies)
      return storage ? { PgsidStoredAddressBit: storage } : undefined
    } else if (type === 'pg_catalog."numeric"' || type === 'pg_catalog.numeric') {
      const numeric = storedNumericConstant(node, input.byteOrder)
      if (numeric === undefined || numeric === null) return undefined
      return typedExpression({ A_Const: { sval: { sval: numeric } } }, type)
    } else if (
      /^pg_catalog\."?(?:date|timestamp|timestamptz|time|timetz|interval)"?$/u.test(type)
    ) {
      const storage = storedTemporalConstant(node, type, input.byteOrder)
      return storage ? { PgsidStoredTemporal: storage } : undefined
    } else {
      const raw = node.fields['constvalue'],
        data = raw?.[1],
        length = Number(scalar(node, 'constlen')),
        widths: Record<string, number> = {
          'pg_catalog.bool': 1,
          'pg_catalog.int2': 2,
          'pg_catalog.int4': 4,
          'pg_catalog.int8': 8,
          'pg_catalog.float4': 4,
          'pg_catalog.float8': 8,
        }
      if (
        scalar(node, 'constisnull') !== 'false' ||
        widths[type] !== length ||
        !Array.isArray(data) ||
        Number(raw?.[0]) !== length ||
        (scalar(node, 'constbyval') === 'true'
          ? data.length !== 4 && data.length !== 8
          : scalar(node, 'constbyval') !== 'false' || length !== 8 || data.length !== 8) ||
        data.length < length ||
        data.some((v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || +v < -128 || +v > 255)
      )
        return undefined
      const stored = Buffer.from(data.map((v) => Number(v) & 255)),
        little = input.byteOrder === 'little',
        bytes = little ? stored.subarray(0, length) : stored.subarray(stored.length - length)
      if (type === 'pg_catalog.float4' || type === 'pg_catalog.float8')
        return {
          PgsidStoredFloat: {
            type,
            bits: (little ? Buffer.from(bytes).reverse() : bytes).toString('hex'),
          },
        }
      if (type === 'pg_catalog.bool') {
        if (bytes[0] !== 0 && bytes[0] !== 1) return undefined
        literal = bytes[0] === 1 ? "'true'" : "'false'"
      } else {
        const number =
          length === 8
            ? little
              ? bytes.readBigInt64LE(0)
              : bytes.readBigInt64BE(0)
            : little
              ? bytes.readIntLE(0, length)
              : bytes.readIntBE(0, length)
        literal = "'" + number.toString() + "'"
      }
    }
    const arg =
      literal === 'NULL'
        ? { A_Const: { isnull: true } }
        : { A_Const: { sval: { sval: literal.slice(1, -1) } } }
    const result = typedExpression(arg, type)
    return scalar(node, 'constcollid') === null ? result : collated(result, 'constcollid')
  }
  if (node.kind === 'FUNCEXPR' || node.kind === 'OPEXPR') {
    const callable = input.functions.get(
        Number(scalar(node, node.kind === 'FUNCEXPR' ? 'funcid' : 'opfuncid')),
      ),
      args = list('args').map(convert)
    if (
      !callable ||
      args.some((arg) => arg === undefined) ||
      callable.args.length !== args.length ||
      collation('inputcollid') === undefined ||
      collation(node.kind === 'FUNCEXPR' ? 'funccollid' : 'opcollid') === undefined ||
      scalar(node, node.kind === 'FUNCEXPR' ? 'funcretset' : 'opretset') !== 'false' ||
      input.types.get(
        Number(scalar(node, node.kind === 'FUNCEXPR' ? 'funcresulttype' : 'opresulttype')),
      ) !== callable.result
    )
      return undefined
    const conversion =
      callable.args.length === 1 ? builtinCast(callable.args[0]!, callable.result) : null
    if (conversion?.method === 'f' && conversion.implementation === callable.signature)
      return collated(
        {
          PgsidStoredCast: {
            arg: args[0],
            type: callable.result,
            source: callable.args[0],
            signature: callable.signature,
            kind: 'function',
          },
        },
        node.kind === 'FUNCEXPR' ? 'funccollid' : 'opcollid',
      )
    return {
      PgsidStoredCall: {
        signature: callable.signature,
        args,
        inputCollation: collation('inputcollid'),
        resultCollation: collation(node.kind === 'FUNCEXPR' ? 'funccollid' : 'opcollid'),
      },
    }
  }
  if (node.kind === 'COLLATEEXPR')
    return collated(convert(node.fields['arg']?.[0]), 'collOid', true)
  if (node.kind === 'RELABELTYPE' || node.kind === 'COERCEVIAIO') {
    const arg = convert(node.fields['arg']?.[0]),
      target = input.types.get(Number(scalar(node, 'resulttype')))
    return arg !== undefined && target?.startsWith('pg_catalog.')
      ? collated(
          {
            PgsidStoredCast: {
              arg,
              type: target,
              kind: node.kind === 'RELABELTYPE' ? 'binary' : 'io',
            },
          },
          'resultcollid',
        )
      : undefined
  }
  if (node.kind === 'BOOLEXPR') {
    const boolop = { and: 'AND_EXPR', or: 'OR_EXPR', not: 'NOT_EXPR' }[
        scalar(node, 'boolop') ?? ''
      ],
      args = list('args').map(convert)
    return boolop && args.length && args.every((arg) => arg !== undefined)
      ? { BoolExpr: { boolop, args } }
      : undefined
  }
  if (node.kind === 'COALESCEEXPR') {
    const args = list('args').map(convert)
    return args.length && args.every((arg) => arg !== undefined)
      ? collated({ CoalesceExpr: { args } }, 'coalescecollid')
      : undefined
  }
  if (node.kind === 'NULLTEST' && scalar(node, 'argisrow') === 'false') {
    const arg = convert(node.fields['arg']?.[0]),
      kind = scalar(node, 'nulltesttype')
    return arg !== undefined && (kind === '0' || kind === '1')
      ? { NullTest: { arg, nulltesttype: kind === '0' ? 'IS_NULL' : 'IS_NOT_NULL' } }
      : undefined
  }
  if (node.kind === 'CASEEXPR' && !tree(node.fields['arg']?.[0])) {
    const otherwise = convert(node.fields['defresult']?.[0]),
      args = list('args').map((value) => {
        const when = tree(value),
          expr = convert(when?.fields['expr']?.[0]),
          result = convert(when?.fields['result']?.[0])
        return expr !== undefined && result !== undefined
          ? { CaseWhen: { expr, result } }
          : undefined
      })
    return otherwise !== undefined && args.every((arg) => arg !== undefined)
      ? collated({ CaseExpr: { args, defresult: otherwise } }, 'casecollid')
      : undefined
  }
  return undefined
}
