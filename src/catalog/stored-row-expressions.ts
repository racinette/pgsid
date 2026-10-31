import { storedAclitemKnowledge } from './aclitem-constant-storage.js'
import { isOidAliasType, storedOidAliasZero } from './oid-alias-constant-storage.js'
import { builtinCast } from '../postgres/builtins/inventory.js'
import { parseSync } from 'libpg-query'
import { tree, scalar, oidList, type Tree, type Value } from './expression-tree.js'
import { storedOrderingKey, type StoredRowOrdering } from './stored-row-orderings.js'
import { storedTextConstant } from './text-constant-storage.js'
import { storedReferenceBytes } from './constant-storage-bytes.js'
import { storedNumericConstant } from './numeric-constant-storage.js'
import { storedTemporalConstant } from './temporal-constant-storage.js'
import { storedBinaryConstant } from './binary-constant-storage.js'
import { storedTextLikeConstant } from './text-like-constant-storage.js'
import { isGeometryConstantType, storedGeometryConstant } from './geometry-constant-storage.js'
import { isSystemConstantType, storedSystemConstant } from './system-constant-storage.js'
import { isSnapshotConstantType, storedSnapshotConstant } from './snapshot-constant-storage.js'
import { storedJsonpathValue } from './jsonpath-constant-storage.js'
import { storedJsonbConstant } from './jsonb-constant-storage.js'
import { storedContainerConstant } from './container-value-constant-storage.js'
import { storedTsvectorValue } from './tsvector-constant-storage.js'
import { storedTsqueryValue } from './tsquery-constant-storage.js'
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

export interface StoredRowFunction {
  signature: string
  args: readonly string[]
  result: string
  defaults?: readonly Value[]
  variadic?: string | null
}

export interface StoredRowOperator {
  signature: string
  implementation: string
}

export interface StoredRowExpressionInput {
  types: ReadonlyMap<number, string>
  functions: ReadonlyMap<number, StoredRowFunction>
  operators?: ReadonlyMap<number, StoredRowOperator>
  orderings?: ReadonlyMap<string, StoredRowOrdering>
  unavailableVariadics?: ReadonlySet<number>
  activeDefaults?: ReadonlySet<number>
  arguments?: ReadonlyMap<Value, unknown>
  columns: ReadonlyMap<number, { name: string; type: number }>
  byteOrder: 'little' | 'big'
  utf8?: boolean
  collations?: ReadonlyMap<number, StoredExpressionCollation>
  networkFamilies?: NetworkStorageFamilies
  arrayElements?: ReadonlyMap<number, number>
  arrayElement?: number
  caseOperand?: number
  storageTypes?: ReadonlyMap<number, ConstantStorageType>
  storageDoubleAlign?: 4 | 8
  enumLabels?: ReadonlyMap<number, ReadonlyMap<number, string>>
}

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : undefined

function expressionType(node: Tree, input: StoredRowExpressionInput): string | null {
  if (node.kind === 'XMLEXPR')
    return scalar(node, 'op') === '7'
      ? ([...input.types].find(([, name]) => name === 'pg_catalog.bool')?.[0].toString() ?? null)
      : scalar(node, 'type')
  if (
    ['BOOLEXPR', 'BOOLEANTEST', 'NULLTEST', 'SCALARARRAYOPEXPR', 'ROWCOMPAREEXPR'].includes(
      node.kind,
    )
  )
    return [...input.types].find(([, name]) => name === 'pg_catalog.bool')?.[0].toString() ?? null
  if (node.kind === 'COLLATEEXPR') {
    const arg = tree(node.fields['arg']?.[0])
    return arg ? expressionType(arg, input) : null
  }
  const keys: Record<string, string> = {
    VAR: 'vartype',
    CONST: 'consttype',
    PARAM: 'paramtype',
    FUNCEXPR: 'funcresulttype',
    OPEXPR: 'opresulttype',
    DISTINCTEXPR: 'opresulttype',
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
  if (input.arguments?.has(value)) return input.arguments.get(value)
  const node = tree(value)
  if (!node) return undefined
  const list = (name: string): Value[] => {
    const values = node.fields[name]?.[0]
    return Array.isArray(values) ? values : []
  }
  const convert = (value: Value | undefined): unknown =>
    value === undefined ? undefined : storedRowExpression(value, input)
  const arrayElement = (oid: number): number | undefined => {
    const element = input.arrayElements?.get(oid)
    if (element !== undefined) return element
    const name = input.types.get(oid),
      member =
        name === 'pg_catalog.int2vector'
          ? 'pg_catalog.int2'
          : name === 'pg_catalog.oidvector'
            ? 'pg_catalog.oid'
            : undefined
    return member ? [...input.types].find(([, name]) => name === member)?.[0] : undefined
  }
  const typeName = (oid: number): string | undefined => {
    const element = input.arrayElements?.get(oid),
      name = input.types.get(element ?? oid)
    return name && (element === undefined ? name : name + '[]')
  }
  const baseType = (oid: number): number | undefined => {
    const seen = new Set<number>()
    let type = input.storageTypes?.get(oid)
    while (type?.kind === 'd' && !seen.has(type.oid)) {
      seen.add(type.oid)
      type = input.storageTypes?.get(type.base)
    }
    return type && !seen.has(type.oid) ? type.oid : undefined
  }
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
  if (node.kind === 'ROWEXPR') {
    const raw = list('args'),
      args = raw.map(convert),
      oid = Number(scalar(node, 'row_typeid')),
      name = input.types.get(oid),
      definition = input.storageTypes?.get(oid)
    if (args.some((arg) => arg === undefined)) return undefined
    if (name === 'pg_catalog.record')
      return JSON.stringify(list('colnames')) ===
        JSON.stringify(args.map((_, i) => '"f' + (i + 1) + '"'))
        ? { RowExpr: { args, row_format: 'COERCE_EXPLICIT_CALL' } }
        : undefined
    if (
      !name ||
      definition?.kind !== 'c' ||
      definition.identity !== name ||
      raw.length > definition.attributes.length
    )
      return undefined
    const live = definition.attributes.flatMap((field, position) =>
      field.dropped ? [] : [position],
    )
    if (
      live.some((position) => {
        if (position >= raw.length) return false
        const arg = tree(raw[position])
        return !arg || Number(expressionType(arg, input)) !== definition.attributes[position]!.type
      })
    )
      return undefined
    return { PgsidStoredRow: { type: name, args, live } }
  }
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
  if (node.kind === 'CASETESTEXPR') {
    if (input.caseOperand !== undefined)
      return Number(scalar(node, 'typeId')) === input.caseOperand
        ? collated({ PgsidStoredCaseTest: {} }, 'collation')
        : undefined
    return input.arrayElement !== undefined && Number(scalar(node, 'typeId')) === input.arrayElement
      ? collated(
          { ColumnRef: { fields: [{ String: { sval: '__pgsid_domain_element' } }] } },
          'collation',
        )
      : undefined
  }
  if (node.kind === 'XMLEXPR') {
    const op = scalar(node, 'op'),
      operation = [
        'IS_XMLCONCAT',
        'IS_XMLELEMENT',
        'IS_XMLFOREST',
        'IS_XMLPARSE',
        'IS_XMLPI',
        'IS_XMLROOT',
        'IS_XMLSERIALIZE',
        'IS_DOCUMENT',
      ][Number(op)],
      option = scalar(node, 'xmloption'),
      xmloption =
        option === '0' ? 'XMLOPTION_DOCUMENT' : option === '1' ? 'XMLOPTION_CONTENT' : null,
      indent = scalar(node, 'indent'),
      rawArgs = list('args'),
      args = rawArgs.map(convert),
      named = list('named_args').map(convert),
      names = list('arg_names').map((value) => {
        if (typeof value !== 'string') return undefined
        try {
          const decoded: unknown = JSON.parse(value)
          return typeof decoded === 'string' ? decoded : undefined
        } catch {
          return undefined
        }
      }),
      rawName = scalar(node, 'name'),
      name = rawName === '<>' ? null : rawName,
      type = input.types.get(Number(scalar(node, 'type')))
    if (
      !op ||
      !/^[0-7]$/u.test(op) ||
      !operation ||
      !xmloption ||
      (indent !== 'true' && indent !== 'false') ||
      args.some((arg) => arg === undefined) ||
      named.some((arg) => arg === undefined) ||
      names.some((name) => name === undefined) ||
      names.length !== named.length ||
      (Number(op) !== 6 && type !== 'pg_catalog.xml') ||
      (![1, 2].includes(Number(op)) && named.length > 0) ||
      ([1, 4].includes(Number(op)) ? !name : name !== null)
    )
      return undefined
    if (op === '6') {
      if (
        args.length !== 1 ||
        !type ||
        !['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type)
      )
        return undefined
      const cast = fields(fields(typedExpression(null, type))?.['TypeCast'])
      return {
        XmlSerialize: {
          expr: args[0],
          typeName: cast?.['typeName'],
          xmloption,
          indent: indent === 'true',
        },
      }
    }
    if (
      (op === '0' && !args.length) ||
      (op === '2' && args.length > 0) ||
      (op === '3' && args.length !== 2) ||
      (op === '4' && args.length > 1) ||
      (op === '5' && args.length !== 3) ||
      (op === '7' && args.length !== 1)
    )
      return undefined
    if (op === '5') {
      const control = tree(rawArgs[2]),
        cast = fields(fields(args[2])?.['TypeCast']),
        constant = fields(fields(cast?.['arg'])?.['A_Const']),
        mode = fields(constant?.['sval'])?.['sval']
      if (
        control?.kind !== 'CONST' ||
        input.types.get(Number(scalar(control, 'consttype'))) !== 'pg_catalog.int4' ||
        typeof mode !== 'string' ||
        !/^[0-3]$/u.test(mode)
      )
        return undefined
      args[2] = { A_Const: { ival: { ival: Number(mode) } } }
    }
    return {
      XmlExpr: {
        op: operation,
        xmloption,
        args,
        ...(name === null ? {} : { name, __pgsid_mapped_name: name }),
        ...(named.length
          ? {
              named_args: named.map((val, index) => ({ ResTarget: { name: names[index], val } })),
              __pgsid_mapped_arguments: names,
            }
          : {}),
      },
    }
  }
  if (node.kind === 'ARRAYEXPR') {
    const array = Number(scalar(node, 'array_typeid')),
      element = Number(scalar(node, 'element_typeid')),
      type = input.types.get(element),
      dimensions = scalar(node, 'multidims'),
      args = list('elements').map(convert)
    return arrayElement(array) === element &&
      type &&
      (dimensions === 'true' || dimensions === 'false') &&
      args.every((arg) => arg !== undefined)
      ? collated(
          {
            PgsidStoredArray: {
              ...(['pg_catalog.int2vector', 'pg_catalog.oidvector'].includes(
                input.types.get(array) ?? '',
              )
                ? { vector: input.types.get(array) }
                : {}),
              element: type,
              multidimensional: dimensions === 'true',
              args,
            },
          },
          'array_collid',
        )
      : undefined
  }
  if (node.kind === 'ARRAYCOERCEEXPR') {
    const original = tree(node.fields['arg']?.[0]),
      sourceArray = original && expressionType(original, input),
      sourceElement = sourceArray ? arrayElement(Number(sourceArray)) : undefined,
      targetElement = input.arrayElements?.get(Number(scalar(node, 'resulttype'))),
      source = sourceElement === undefined ? undefined : input.types.get(sourceElement),
      target = targetElement === undefined ? undefined : input.types.get(targetElement),
      arg = convert(node.fields['arg']?.[0]),
      rawConversion = node.fields['elemexpr']?.[0],
      conversion =
        rawConversion === undefined || sourceElement === undefined
          ? undefined
          : storedRowExpression(rawConversion, {
              ...input,
              arrayElement: sourceElement,
              caseOperand: undefined,
            })
    return arg !== undefined && source && target && conversion !== undefined
      ? collated({ PgsidStoredArrayCoercion: { arg, source, target, conversion } }, 'resultcollid')
      : undefined
  }
  if (node.kind === 'CONST') {
    const oid = Number(scalar(node, 'consttype')),
      type = input.types.get(oid)
    if (!type) return undefined
    if (type === 'pg_catalog.unknown') {
      if (scalar(node, 'constisnull') === 'true') return { A_Const: { isnull: true } }
      const bytes = storedReferenceBytes(node, -2)
      if (!bytes?.length || bytes[bytes.length - 1] !== 0) return undefined
      const body = bytes.subarray(0, bytes.length - 1),
        text = body.toString('utf8')
      return body.includes(0) ||
        (!input.utf8 && body.some((byte) => byte > 127)) ||
        !Buffer.from(text, 'utf8').equals(body)
        ? undefined
        : { A_Const: { sval: { sval: text } } }
    }
    if (input.storageTypes) {
      const expression = storedContainerConstant(
        node,
        input.storageTypes,
        input.byteOrder,
        input.storageDoubleAlign,
        (bytes, type) => {
          const byval =
              type.kind === 'e' ||
              isOidAliasType(type.identity) ||
              [
                'pg_catalog.bool',
                'pg_catalog."char"',
                'pg_catalog.oid',
                'pg_catalog.xid',
                'pg_catalog.cid',
                'pg_catalog.xid8',
                'pg_catalog.pg_lsn',
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
    } else if (
      type === 'pg_catalog."char"' ||
      type === 'pg_catalog.name' ||
      type === 'pg_catalog.refcursor'
    ) {
      const storage = storedTextLikeConstant(node, type, input.byteOrder, input.utf8 === true)
      return storage ? collated({ PgsidStoredTextLike: storage }, 'constcollid') : undefined
    } else if (type === 'pg_catalog.aclitem') {
      const storage = storedAclitemKnowledge(node, input.byteOrder)
      return storage ? { PgsidStoredAclitem: storage } : undefined
    } else if (isOidAliasType(type)) {
      const zero = storedOidAliasZero(node, type, input.byteOrder)
      return zero ? { PgsidStoredOidAliasZero: zero } : undefined
    } else if (isSystemConstantType(type)) {
      const storage = storedSystemConstant(node, type, input.byteOrder)
      return storage ? { PgsidStoredSystem: storage } : undefined
    } else if (isSnapshotConstantType(type)) {
      const storage = storedSnapshotConstant(node, type, input.byteOrder)
      return storage ? { PgsidStoredSnapshot: storage } : undefined
    } else if (isGeometryConstantType(type)) {
      const storage = storedGeometryConstant(node, type, input.byteOrder)
      return storage ? { PgsidStoredGeometry: storage } : undefined
    } else if (type === 'pg_catalog.xml') {
      const text = storedTextConstant(node, input.utf8 === true, input.byteOrder)
      return typeof text === 'string' ? { PgsidStoredXml: text } : undefined
    } else if (type === 'pg_catalog.tsvector') {
      const storage = storedTsvectorValue(node, input.byteOrder, input.utf8 === true)
      return storage ? { PgsidStoredTsvector: storage } : undefined
    } else if (type === 'pg_catalog.tsquery') {
      const storage = storedTsqueryValue(node, input.byteOrder, input.utf8 === true)
      return storage ? { PgsidStoredTsquery: storage } : undefined
    } else if (type === 'pg_catalog.jsonb') {
      const text = storedJsonbConstant(node, input.byteOrder, input.utf8 === true)
      return text === undefined
        ? undefined
        : typedExpression({ A_Const: { sval: { sval: text } } }, type)
    } else if (type === 'pg_catalog.jsonpath') {
      const value = storedJsonpathValue(node, input.byteOrder, input.utf8 === true)
      return value ? { PgsidStoredJsonpath: value } : undefined
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
          'pg_catalog.money': 8,
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
        if (type === 'pg_catalog.money') return { PgsidStoredMoney: number.toString() }
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
  if (node.kind === 'FIELDSELECT') {
    const original = tree(node.fields['arg']?.[0]),
      originalType = original ? expressionType(original, input) : null,
      position = Number(scalar(node, 'fieldnum')),
      seen = new Set<number>()
    if (
      original?.kind === 'ROWEXPR' &&
      originalType &&
      input.types.get(Number(originalType)) === 'pg_catalog.record'
    ) {
      const args = original.fields['args']?.[0],
        field =
          Array.isArray(args) && Number.isInteger(position) && position > 0
            ? tree(args[position - 1])
            : null,
        arg = convert(original)
      return arg !== undefined &&
        field &&
        expressionType(field, input) === scalar(node, 'resulttype')
        ? collated(
            { A_Indirection: { arg, indirection: [{ String: { sval: 'f' + position } }] } },
            'resultcollid',
          )
        : undefined
    }
    let type = originalType ? input.storageTypes?.get(Number(originalType)) : undefined
    while (type?.kind === 'd' && !seen.has(type.oid)) {
      seen.add(type.oid)
      type = input.storageTypes?.get(type.base)
    }
    const field =
        type?.kind === 'c' && Number.isInteger(position) && position > 0
          ? type.attributes[position - 1]
          : undefined,
      arg = convert(original ?? undefined)
    return arg !== undefined &&
      field &&
      !field.dropped &&
      typeof field.name === 'string' &&
      field.type === Number(scalar(node, 'resulttype'))
      ? collated(
          { A_Indirection: { arg, indirection: [{ String: { sval: field.name } }] } },
          'resultcollid',
        )
      : undefined
  }
  if (node.kind === 'ROWCOMPAREEXPR') {
    const operators = oidList(node, 'opnos'),
      families = oidList(node, 'opfamilies'),
      collations = oidList(node, 'inputcollids'),
      left = list('largs').map(convert),
      right = list('rargs').map(convert),
      strategy = Number(scalar(node, 'cmptype'))
    if (
      !operators ||
      operators.length < 2 ||
      operators.length !== families?.length ||
      operators.length !== collations?.length ||
      operators.length !== left.length ||
      left.length !== right.length ||
      [...left, ...right].some((arg) => arg === undefined) ||
      ![1, 2, 4, 5].includes(strategy)
    )
      return undefined
    const pairs = operators.map((operator, i) => {
      const ordering = input.orderings?.get(storedOrderingKey(operator, families[i]!, strategy)),
        collation = collations[i] === 0 ? null : input.collations?.get(collations[i]!)
      return ordering && ordering.strategy === strategy && collation !== undefined
        ? {
            operator: ordering.operator,
            family: ordering.family,
            expression: {
              PgsidStoredCall: {
                signature: ordering.comparator,
                args: [left[i], right[i]],
                inputCollation: collation,
                resultCollation: null,
              },
            },
          }
        : undefined
    })
    return pairs.every((pair) => pair !== undefined)
      ? { PgsidStoredRowCompare: { strategy, pairs } }
      : undefined
  }
  if (node.kind === 'SCALARARRAYOPEXPR') {
    const raw = list('args'),
      args = raw.map(convert),
      callable = input.functions.get(Number(scalar(node, 'opfuncid'))),
      operator = input.operators?.get(Number(scalar(node, 'opno'))),
      array = tree(raw[1]),
      element = array ? arrayElement(Number(expressionType(array, input))) : undefined,
      any = scalar(node, 'useOr'),
      selectedCollation = collation('inputcollid')
    return args.length === 2 &&
      args.every((arg) => arg !== undefined) &&
      element !== undefined &&
      input.types.has(element) &&
      callable?.result === 'pg_catalog.bool' &&
      callable.args.length === 2 &&
      operator?.implementation === callable.signature &&
      selectedCollation !== undefined &&
      (any === 'true' || any === 'false') &&
      scalar(node, 'hashfuncid') === '0' &&
      scalar(node, 'negfuncid') === '0'
      ? {
          PgsidStoredScalarArray: {
            signature: operator.signature,
            implementation: callable.signature,
            args,
            any: any === 'true',
            inputCollation: selectedCollation,
          },
        }
      : undefined
  }
  if (['FUNCEXPR', 'OPEXPR', 'DISTINCTEXPR', 'NULLIFEXPR'].includes(node.kind)) {
    const special = node.kind === 'DISTINCTEXPR' || node.kind === 'NULLIFEXPR',
      resultOid = Number(expressionType(node, input)),
      result = input.types.get(resultOid),
      resultElement = input.arrayElements?.get(resultOid),
      elementName = resultElement === undefined ? undefined : input.types.get(resultElement),
      outputType =
        resultElement === undefined ? result : elementName ? elementName + '[]' : undefined,
      id = Number(scalar(node, node.kind === 'FUNCEXPR' ? 'funcid' : 'opfuncid')),
      callable = input.functions.get(id)
    if (!callable) return undefined
    const conversion =
      callable.args.length === 1 && result ? builtinCast(callable.args[0]!, result) : null
    const castResult =
      node.kind === 'FUNCEXPR' &&
      ['1', '2'].includes(scalar(node, 'funcformat') ?? '') &&
      conversion?.method === 'f' &&
      conversion.implementation === callable.signature &&
      result !== undefined &&
      builtinCast(callable.result, result)?.method === 'b'
    const provided = list('args'),
      variadic = callable.variadic ?? null,
      explicit = node.kind === 'FUNCEXPR' && scalar(node, 'funcvariadic') === 'true',
      expanded = variadic === 'pg_catalog."any"' && !explicit,
      values: (Value | undefined)[] = Array(
        expanded ? Math.max(provided.length, callable.args.length) : callable.args.length,
      ).fill(undefined)
    let named = false
    for (const [index, value] of provided.entries()) {
      const arg = tree(value),
        number = arg?.kind === 'NAMEDARGEXPR' ? scalar(arg, 'argnumber') : String(index),
        position = number === null ? -1 : Number(number)
      if (arg?.kind === 'NAMEDARGEXPR') named = true
      else if (named) return undefined
      if (
        !Number.isInteger(position) ||
        position < 0 ||
        position >= values.length ||
        values[position] !== undefined
      )
        return undefined
      values[position] = arg?.kind === 'NAMEDARGEXPR' ? arg.fields['arg']?.[0] : value
      if (values[position] === undefined) return undefined
    }
    const missing = values.some((value) => value === undefined),
      defaults = callable.defaults,
      defaultStart = values.length - (defaults?.length ?? 0),
      active = new Set(input.activeDefaults ?? [])
    if (missing && (!defaults || active.has(id))) return undefined
    if (missing) active.add(id)
    const args = values.map((value, index) =>
      value !== undefined
        ? convert(value)
        : index < defaultStart
          ? undefined
          : storedRowExpression(defaults![index - defaultStart]!, {
              ...input,
              columns: new Map(),
              arrayElement: undefined,
              caseOperand: undefined,
              activeDefaults: active,
            }),
    )
    // An explicit variadic array of anonymous records has no capturable element layout; leaving
    // the call uncaptured keeps the binder's own handling of such arrays.
    const anonymousRecords =
      explicit &&
      provided.some((value) => {
        const arg = tree(value),
          oid = arg ? expressionType(arg, input) : null
        return oid !== null && typeName(Number(oid)) === 'pg_catalog.record[]'
      })
    if (
      anonymousRecords ||
      args.some((arg) => arg === undefined) ||
      (expanded ? args.length < callable.args.length : callable.args.length !== args.length) ||
      collation('inputcollid') === undefined ||
      collation(node.kind === 'FUNCEXPR' ? 'funccollid' : 'opcollid') === undefined ||
      scalar(node, node.kind === 'FUNCEXPR' ? 'funcretset' : 'opretset') !== 'false' ||
      !result ||
      !outputType ||
      (special
        ? callable.result !== 'pg_catalog.bool' || args.length !== 2
        : result !== callable.result &&
          !castResult &&
          ![
            'pg_catalog.anyenum',
            'pg_catalog.anyarray',
            'pg_catalog.anyelement',
            'pg_catalog.anyrange',
            'pg_catalog.anymultirange',
            'pg_catalog.anycompatible',
            'pg_catalog.anycompatiblearray',
          ].includes(callable.result))
    )
      return undefined
    if (conversion?.method === 'f' && conversion.implementation === callable.signature) {
      // PostgreSQL selects the cast from the argument's own type, whose function may declare a
      // binary-compatible input instead (cidr to bpchar runs text(inet)).
      const argument = tree(provided[0]),
        argumentBase = argument ? baseType(Number(expressionType(argument, input))) : undefined,
        argumentType = argumentBase === undefined ? undefined : typeName(argumentBase),
        source =
          argumentType && builtinCast(argumentType, result!)?.implementation === callable.signature
            ? argumentType
            : callable.args[0]
      return collated(
        {
          PgsidStoredCast: {
            arg: args[0],
            type: result,
            source,
            signature: callable.signature,
            kind: 'function',
          },
        },
        node.kind === 'FUNCEXPR' ? 'funccollid' : 'opcollid',
      )
    }
    const call = {
      PgsidStoredCall: {
        signature: callable.signature,
        args,
        ...(variadic ? { variadic: explicit } : {}),
        inputCollation: collation('inputcollid'),
        resultCollation: special
          ? null
          : collation(node.kind === 'FUNCEXPR' ? 'funccollid' : 'opcollid'),
        ...(!special && result !== callable.result ? { result: outputType } : {}),
      },
    }
    return special
      ? collated(
          {
            PgsidStoredComparison: {
              kind: node.kind === 'DISTINCTEXPR' ? 'distinct' : 'nullif',
              expression: call,
              result: outputType,
            },
          },
          'opcollid',
        )
      : call
  }
  if (node.kind === 'COLLATEEXPR')
    return collated(convert(node.fields['arg']?.[0]), 'collOid', true)
  if (['COERCETODOMAIN', 'CONVERTROWTYPEEXPR', 'RELABELTYPE'].includes(node.kind)) {
    const original = tree(node.fields['arg']?.[0]),
      sourceOid = original ? Number(expressionType(original, input)) : 0,
      targetOid = Number(scalar(node, 'resulttype')),
      source = typeName(sourceOid),
      target = typeName(targetOid),
      targetStorage = input.storageTypes?.get(targetOid),
      sourceStorage = input.storageTypes?.get(sourceOid),
      sourceBase = baseType(sourceOid),
      targetBase = baseType(targetOid),
      arg = convert(node.fields['arg']?.[0])
    if (node.kind !== 'RELABELTYPE' || sourceStorage?.kind === 'd' || targetStorage?.kind === 'd') {
      const row = node.kind === 'CONVERTROWTYPEEXPR'
      if (
        arg === undefined ||
        !source ||
        !target ||
        sourceBase === undefined ||
        targetBase === undefined ||
        (row
          ? input.storageTypes?.get(sourceBase)?.kind !== 'c' || targetStorage?.kind !== 'c'
          : sourceBase !== targetBase ||
            (node.kind === 'COERCETODOMAIN' && targetStorage?.kind !== 'd'))
      )
        return undefined
      const expression = {
        PgsidStoredCoercion: {
          kind: row ? 'row' : node.kind === 'COERCETODOMAIN' ? 'domain' : 'relabel',
          source,
          type: target,
          arg,
        },
      }
      return row ? expression : collated(expression, 'resultcollid')
    }
  }
  if (node.kind === 'RELABELTYPE' || node.kind === 'COERCEVIAIO') {
    const arg = convert(node.fields['arg']?.[0]),
      target = input.types.get(Number(scalar(node, 'resulttype')))
    // An I/O cast replays by type name, so it may also target a user range, multirange or
    // composite, as a text round trip does. Domains and arrays keep their own capture paths;
    // a binary relabel needs a built-in cast.
    const userContainer = ['r', 'm', 'c'].includes(
      input.storageTypes?.get(Number(scalar(node, 'resulttype')))?.kind ?? '',
    )
    return arg !== undefined &&
      target !== undefined &&
      (target.startsWith('pg_catalog.') || (node.kind === 'COERCEVIAIO' && userContainer))
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
  if (node.kind === 'MINMAXEXPR') {
    const args = list('args').map(convert),
      operation = scalar(node, 'op'),
      inputCollation = collation('inputcollid')
    return args.length &&
      args.every((arg) => arg !== undefined) &&
      inputCollation !== undefined &&
      (operation === '0' || operation === '1')
      ? collated(
          {
            MinMaxExpr: {
              args,
              op: operation === '0' ? 'IS_GREATEST' : 'IS_LEAST',
              __pgsid_inputCollation: inputCollation,
            },
          },
          'minmaxcollid',
        )
      : undefined
  }
  if (node.kind === 'BOOLEANTEST') {
    const arg = convert(node.fields['arg']?.[0]),
      forms: Record<string, string> = {
        '0': 'IS_TRUE',
        '1': 'IS_NOT_TRUE',
        '2': 'IS_FALSE',
        '3': 'IS_NOT_FALSE',
        '4': 'IS_UNKNOWN',
        '5': 'IS_NOT_UNKNOWN',
      },
      form = forms[scalar(node, 'booltesttype') ?? '']
    return arg !== undefined && form ? { BooleanTest: { arg, booltesttype: form } } : undefined
  }
  if (node.kind === 'NULLTEST') {
    const arg = convert(node.fields['arg']?.[0]),
      kind = scalar(node, 'nulltesttype'),
      row = scalar(node, 'argisrow')
    return arg !== undefined &&
      (kind === '0' || kind === '1') &&
      (row === 'true' || row === 'false')
      ? {
          NullTest: {
            arg,
            nulltesttype: kind === '0' ? 'IS_NULL' : 'IS_NOT_NULL',
            __pgsid_datum: row === 'false',
          },
        }
      : undefined
  }
  if (node.kind === 'CASEEXPR') {
    const operand = tree(node.fields['arg']?.[0]),
      arg = operand ? convert(operand) : undefined,
      operandType = operand ? expressionType(operand, input) : null,
      otherwise = convert(node.fields['defresult']?.[0]),
      args = list('args').map((value) => {
        const when = tree(value),
          condition = when?.fields['expr']?.[0],
          expr =
            operand && operandType && condition !== undefined
              ? storedRowExpression(condition, { ...input, caseOperand: Number(operandType) })
              : convert(condition),
          result = convert(when?.fields['result']?.[0])
        return expr !== undefined && result !== undefined
          ? { CaseWhen: { expr, result } }
          : undefined
      })
    return (!operand || (arg !== undefined && operandType !== null)) &&
      otherwise !== undefined &&
      args.every((arg) => arg !== undefined)
      ? collated(
          {
            CaseExpr: {
              ...(operand ? { arg, __pgsid_stored: true } : {}),
              args,
              defresult: otherwise,
            },
          },
          'casecollid',
        )
      : undefined
  }
  return undefined
}
