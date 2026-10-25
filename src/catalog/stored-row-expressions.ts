import { parseSync } from 'libpg-query'
import { tree, scalar, type Value } from './expression-tree.js'

export interface StoredRowExpressionInput {
  types: ReadonlyMap<number, string>
  functions: ReadonlyMap<number, { signature: string; args: readonly string[]; result: string }>
  columns: ReadonlyMap<number, { name: string; type: number }>
  byteOrder: 'little' | 'big'
}

type Fields = Record<string, unknown>
const fields = (value: unknown): Fields | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : undefined

export function storedRowExpression(value: Value, input: StoredRowExpressionInput): unknown {
  const node = tree(value)
  if (!node) return undefined
  const list = (name: string): Value[] => {
    const values = node.fields[name]?.[0]
    return Array.isArray(values) ? values : []
  }
  const convert = (value: Value | undefined): unknown =>
    value === undefined ? undefined : storedRowExpression(value, input)
  if (node.kind === 'VAR') {
    const column = input.columns.get(Number(scalar(node, 'varattno')))
    if (
      !column ||
      scalar(node, 'varno') !== '1' ||
      scalar(node, 'varlevelsup') !== '0' ||
      Number(scalar(node, 'vartype')) !== column.type
    )
      return undefined
    return { ColumnRef: { fields: [{ String: { sval: column.name } }] } }
  }
  if (node.kind === 'COERCETODOMAINVALUE')
    return { ColumnRef: { fields: [{ String: { sval: 'value' } }] } }
  if (node.kind === 'CONST') {
    const type = input.types.get(Number(scalar(node, 'consttype')))
    if (!type?.startsWith('pg_catalog.')) return undefined
    let literal: string
    if (scalar(node, 'constisnull') === 'true') literal = 'NULL'
    else {
      const raw = node.fields['constvalue'],
        data = raw?.[1],
        length = Number(scalar(node, 'constlen')),
        widths: Record<string, number> = {
          'pg_catalog.bool': 1,
          'pg_catalog.int2': 2,
          'pg_catalog.int4': 4,
          'pg_catalog.int8': 8,
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
    const select = fields(parseSync(`SELECT ${literal}::${type}`).stmts?.[0]?.stmt)?.['SelectStmt'],
      targets = fields(select)?.['targetList']
    return Array.isArray(targets) ? fields(fields(targets[0])?.['ResTarget'])?.['val'] : undefined
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
      scalar(node, 'inputcollid') !== '0' ||
      scalar(node, node.kind === 'FUNCEXPR' ? 'funcretset' : 'opretset') !== 'false' ||
      input.types.get(
        Number(scalar(node, node.kind === 'FUNCEXPR' ? 'funcresulttype' : 'opresulttype')),
      ) !== callable.result
    )
      return undefined
    return { PgsidStoredCall: { signature: callable.signature, args } }
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
      ? { CoalesceExpr: { args } }
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
      ? { CaseExpr: { args, defresult: otherwise } }
      : undefined
  }
  return undefined
}
