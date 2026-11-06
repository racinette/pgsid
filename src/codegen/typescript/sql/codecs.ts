import type { CatalogSnapshot } from '../../../catalog/types.js'

// Generated queries exchange every value with the server as text the driver leaves untouched, so
// each PostgreSQL type has one public TypeScript shape and native conversions to and from it.
export type TypescriptCodec =
  | { kind: 'scalar'; name: TypescriptScalarCodec }
  | { kind: 'array'; element: TypescriptCodec; delimiter: string }

export type TypescriptScalarCodec =
  | 'Bool'
  | 'Int'
  | 'Bigint'
  | 'Float'
  | 'Float4'
  | 'Numeric'
  | 'Text'
  | 'Bytea'
  | 'Json'
  | 'Int8Range'

// An empty range is a value without points, unlike SQL NULL, and a null bound is unbounded.
export const typescriptInt8RangeType =
  '{ readonly empty: true } | { readonly empty: false; readonly lower: bigint | null; readonly upper: bigint | null; readonly lowerInclusive: boolean; readonly upperInclusive: boolean }'

export const typescriptScalarTypes: Readonly<Record<TypescriptScalarCodec, string>> = {
  Bool: 'boolean',
  Int: 'number',
  Bigint: 'bigint',
  Float: 'number',
  Float4: 'number',
  Numeric: 'string',
  Text: 'string',
  Bytea: 'Uint8Array',
  Json: 'unknown',
  Int8Range: typescriptInt8RangeType,
}

const builtinCodecs: Readonly<Record<string, TypescriptScalarCodec>> = {
  bool: 'Bool',
  int2: 'Int',
  int4: 'Int',
  oid: 'Int',
  xid: 'Int',
  cid: 'Int',
  int8: 'Bigint',
  xid8: 'Bigint',
  float4: 'Float4',
  float8: 'Float',
  numeric: 'Numeric',
  bytea: 'Bytea',
  json: 'Json',
  jsonb: 'Json',
  int8range: 'Int8Range',
}

const aliases: Readonly<Record<string, string>> = {
  bigint: 'int8',
  boolean: 'bool',
  'double precision': 'float8',
  integer: 'int4',
  real: 'float4',
  smallint: 'int2',
  decimal: 'numeric',
}

export const typescriptBuiltinName = (type: string): string => {
  const unmodified = type.replace(/\([^)]*\)$/u, '')
  const unqualified = unmodified.split('.').at(-1)?.replaceAll('"', '') ?? unmodified
  return aliases[unqualified] ?? unqualified
}

export const isTypescriptInt8Range = (type: string | undefined): boolean =>
  type !== undefined && typescriptBuiltinName(type) === 'int8range'

export function typescriptScalarCodec(type: string): TypescriptScalarCodec {
  return builtinCodecs[typescriptBuiltinName(type)] ?? 'Text'
}

// The wire value follows the type the server reports, which for a domain is its base type and for
// an enum is its label.
export function typescriptCodec(
  type: string,
  catalog: CatalogSnapshot | undefined,
  seen: ReadonlySet<string> = new Set(),
): TypescriptCodec {
  if (type.endsWith('[]')) {
    const element = type.slice(0, -2)
    return {
      kind: 'array',
      element: typescriptCodec(element, catalog, seen),
      delimiter: typescriptBuiltinName(element) === 'box' ? ';' : ',',
    }
  }
  const unmodified = type.replace(/\([^)]*\)$/u, '')
  const [schema, name] = unmodified.includes('.')
    ? [unmodified.split('.')[0]!.replaceAll('"', ''), unmodified.split('.').slice(1).join('.')]
    : [undefined, unmodified]
  const plain = name.replaceAll('"', '')
  const domain = catalog?.domains.find(
    (item) => item.name === plain && (schema === undefined || item.schema === schema),
  )
  if (domain && !seen.has(`${domain.schema}.${domain.name}`))
    return typescriptCodec(
      domain.baseTypeName,
      catalog,
      new Set([...seen, `${domain.schema}.${domain.name}`]),
    )
  return { kind: 'scalar', name: typescriptScalarCodec(type) }
}

export const typescriptCodecNames = (codec: TypescriptCodec, direction: 'decode' | 'encode') => {
  const names = new Set<string>()
  const visit = (item: TypescriptCodec) => {
    if (item.kind === 'array') {
      names.add(`${direction}Array`)
      visit(item.element)
    } else names.add(`${direction}${item.name}`)
  }
  visit(codec)
  return names
}

// Values the generated code sends are chosen so the server reads them the same way under every
// session setting: hex bytea, shortest exact floats, quoted array elements.
export const typescriptCodecSource = `function encodeInvalid(name: string, type: string): never {
  throw new TypeError('Parameter ' + name + ' holds a malformed ' + type + ' value')
}
function decodeBool(value: string | null): boolean | null {
  return value === null ? null : value === 't'
}
function encodeBool(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'boolean') return encodeInvalid(name, 'boolean')
  return value ? 't' : 'f'
}
function decodeInt(value: string | null): number | null {
  return value === null ? null : Number(value)
}
function encodeInt(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return encodeInvalid(name, 'integer')
  return String(value)
}
function decodeBigint(value: string | null): bigint | null {
  return value === null ? null : BigInt(value)
}
function encodeBigint(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'bigint') return encodeInvalid(name, 'bigint')
  return String(value)
}
function decodeFloat(value: string | null): number | null {
  return value === null ? null : Number(value)
}
function encodeFloat(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number') return encodeInvalid(name, 'floating-point')
  return Object.is(value, -0) ? '-0' : String(value)
}
function decodeFloat4(value: string | null): number | null {
  // The shortest real text names one float4; rounding it through a double cannot change it.
  return value === null ? null : Math.fround(Number(value))
}
function encodeFloat4(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number') return encodeInvalid(name, 'floating-point')
  return Object.is(value, -0) ? '-0' : String(value)
}
function decodeNumeric(value: string | null): string | null {
  return value
}
function encodeNumeric(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !/^(?:[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?|NaN|[+-]?Infinity)$/u.test(value))
    return encodeInvalid(name, 'numeric')
  return value
}
function decodeText(value: string | null): string | null {
  return value
}
function encodeText(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return encodeInvalid(name, 'text')
  return value
}
function decodeBytea(value: string | null): Uint8Array | null {
  if (value === null) return null
  if (value.startsWith('\\\\x')) {
    const bytes = new Uint8Array((value.length - 2) / 2)
    for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(value.slice(2 + index * 2, 4 + index * 2), 16)
    return bytes
  }
  const bytes: number[] = []
  for (let index = 0; index < value.length; ) {
    if (value[index] !== '\\\\') bytes.push(value.charCodeAt(index++))
    else if (value[index + 1] === '\\\\') {
      bytes.push(92)
      index += 2
    } else {
      bytes.push(parseInt(value.slice(index + 1, index + 4), 8))
      index += 4
    }
  }
  return Uint8Array.from(bytes)
}
function encodeBytea(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!(value instanceof Uint8Array)) return encodeInvalid(name, 'bytea')
  let text = '\\\\x'
  for (const byte of value) text += byte.toString(16).padStart(2, '0')
  return text
}
function decodeJson(value: string | null): unknown {
  return value === null ? null : JSON.parse(value)
}
function encodeJson(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  const text = JSON.stringify(value)
  if (text === undefined) return encodeInvalid(name, 'JSON')
  return text
}
function decodeInt8Range(value: string | null): unknown {
  if (value === null) return null
  if (value === 'empty') return { empty: true }
  const match = /^([[(])(-?[0-9]*),(-?[0-9]*)([\\])])$/u.exec(value)
  if (!match) throw new TypeError('Unexpected int8range output ' + JSON.stringify(value))
  return { empty: false, lower: match[2] ? BigInt(match[2]) : null, upper: match[3] ? BigInt(match[3]) : null, lowerInclusive: match[1] === '[', upperInclusive: match[4] === ']' }
}
function encodeInt8Range(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('empty' in value) || typeof value.empty !== 'boolean') return encodeInvalid(name, 'int8range')
  if (value.empty) return 'empty'
  if (!('lower' in value) || !('upper' in value) || !('lowerInclusive' in value) || !('upperInclusive' in value) || (value.lower !== null && typeof value.lower !== 'bigint') || (value.upper !== null && typeof value.upper !== 'bigint') || typeof value.lowerInclusive !== 'boolean' || typeof value.upperInclusive !== 'boolean')
    return encodeInvalid(name, 'int8range')
  return (value.lowerInclusive ? '[' : '(') + (value.lower ?? '') + ',' + (value.upper ?? '') + (value.upperInclusive ? ']' : ')')
}
function decodeArray(value: string | null, element: (item: string | null) => unknown, delimiter: string): unknown {
  if (value === null) return null
  let index = value.startsWith('[') ? value.indexOf('=') + 1 : 0
  const list = (): unknown[] => {
    index++
    const items: unknown[] = []
    if (value[index] === '}') {
      index++
      return items
    }
    for (;;) {
      if (value[index] === '{') items.push(list())
      else if (value[index] === '"') {
        let text = ''
        for (index++; value[index] !== '"'; index++) text += value[index] === '\\\\' ? value[++index] : value[index]
        index++
        items.push(element(text))
      } else {
        const start = index
        while (value[index] !== delimiter && value[index] !== '}') index++
        const text = value.slice(start, index)
        items.push(element(text === 'NULL' ? null : text))
      }
      if (value[index++] === '}') return items
    }
  }
  return list()
}
function encodeArray(value: unknown, element: (item: unknown, name: string) => string | null, delimiter: string, name: string): string | null {
  if (value === null || value === undefined) return null
  const list = (items: unknown): string => {
    if (!Array.isArray(items)) return encodeInvalid(name, 'array')
    return '{' + items.map((item) => {
      if (Array.isArray(item)) return list(item)
      const text = element(item, name)
      return text === null ? 'NULL' : '"' + text.replace(/[\\\\"]/gu, '\\\\$&') + '"'
    }).join(delimiter) + '}'
  }
  return list(value)
}`

// Each driver is asked for the server's text unchanged; built-in type identifiers are fixed by
// PostgreSQL, and every user-defined type is already left as text.
export const typescriptQueryableSource = `export interface Queryable {
  queryText(sql: string, values: readonly (string | null)[]): Promise<{ rows: readonly (readonly (string | null)[])[]; rowCount?: number | null }>
}
const textParser = (value: string): string => value
export function fromPg(client: { query(config: { text: string; values: (string | null)[]; rowMode: 'array'; types: { getTypeParser: (...args: never[]) => (value: string) => string } }): Promise<{ rows: unknown[]; rowCount: number | null }> }): Queryable {
  const types = { getTypeParser: () => textParser }
  return {
    async queryText(text, values) {
      const result = await client.query({ text, values: [...values], rowMode: 'array', types })
      return { rows: result.rows as (string | null)[][], rowCount: result.rowCount }
    },
  }
}
const pgliteText: Record<number, (value: string) => string> = {}
for (let oid = 1; oid < 16384; oid++) pgliteText[oid] = textParser
export function fromPglite(db: { query(sql: string, params: unknown[], options: { rowMode: 'array'; parsers: Record<number, (value: string) => string>; serializers: Record<number, (value: unknown) => string> }): Promise<{ rows: unknown[]; affectedRows?: number }> }): Queryable {
  return {
    async queryText(sql, values) {
      const result = await db.query(sql, [...values], { rowMode: 'array', parsers: pgliteText, serializers: pgliteText as Record<number, (value: unknown) => string> })
      return { rows: result.rows as (string | null)[][], rowCount: result.affectedRows ?? null }
    },
  }
}`
