import type { CatalogSnapshot } from '../../../catalog/types.js'
import { PG18_RANGE_TYPES } from '../../../postgres/builtins/type-ranges.generated.js'

// Generated queries exchange every value with the server as text the driver leaves untouched, so
// each PostgreSQL type has one public TypeScript shape and native conversions to and from it.
export type TypescriptCodec =
  | { kind: 'scalar'; name: TypescriptScalarCodec }
  | { kind: 'array'; element: TypescriptCodec; delimiter: string }
  | { kind: 'range'; element: TypescriptCodec }
  | { kind: 'multirange'; element: TypescriptCodec }
  | { kind: 'composite'; fields: readonly { name: string; codec: TypescriptCodec }[] }

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
  | 'Date'
  | 'Timestamp'
  | 'Timestamptz'
  | 'Time'
  | 'Timetz'
  | 'Interval'
  | 'Point'
  | 'Line'
  | 'Lseg'
  | 'Box'
  | 'Path'
  | 'Polygon'
  | 'Circle'

const point = '{ readonly x: number; readonly y: number }'

export const typescriptScalarTypes: Readonly<Record<TypescriptScalarCodec, string>> = {
  Bool: 'boolean',
  Int: 'number',
  Bigint: 'bigint',
  Float: 'number',
  Float4: 'number',
  Numeric: 'string',
  Text: 'string',
  Bytea: 'Uint8Array',
  Json: 'PgsidJsonValue',
  Date: 'string',
  Timestamp: '{ readonly localMicroseconds: bigint } | { readonly infinity: 1 | -1 }',
  Timestamptz: '{ readonly epochMicroseconds: bigint } | { readonly infinity: 1 | -1 }',
  Time: '{ readonly microseconds: number }',
  Timetz: '{ readonly microseconds: number; readonly offsetSeconds: number }',
  Interval:
    '{ readonly months: number; readonly days: number; readonly microseconds: bigint } | { readonly infinity: 1 | -1 }',
  Point: point,
  Line: '{ readonly a: number; readonly b: number; readonly c: number }',
  Lseg: `{ readonly start: ${point}; readonly end: ${point} }`,
  Box: `{ readonly high: ${point}; readonly low: ${point} }`,
  Path: `{ readonly closed: boolean; readonly points: ${point}[] }`,
  Polygon: `{ readonly points: ${point}[] }`,
  Circle: `{ readonly center: ${point}; readonly radius: number }`,
}

// JSON values recurse, so the generated declarations that use them carry this alias.
export const typescriptJsonValueDeclaration =
  'type PgsidJsonValue = null | boolean | number | string | PgsidJsonValue[] | { [key: string]: PgsidJsonValue }'

export const withTypescriptJsonValue = (source: string): string =>
  /\bPgsidJsonValue\b/u.test(source) ? `${typescriptJsonValueDeclaration};\n${source}` : source

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
  date: 'Date',
  timestamp: 'Timestamp',
  'timestamp without time zone': 'Timestamp',
  timestamptz: 'Timestamptz',
  'timestamp with time zone': 'Timestamptz',
  time: 'Time',
  'time without time zone': 'Time',
  timetz: 'Timetz',
  'time with time zone': 'Timetz',
  interval: 'Interval',
  point: 'Point',
  line: 'Line',
  lseg: 'Lseg',
  box: 'Box',
  path: 'Path',
  polygon: 'Polygon',
  circle: 'Circle',
}

// Long SQL spellings of the temporal types name the same built-in types.
const aliasNames: Readonly<Record<string, string>> = {
  'timestamp without time zone': 'timestamp',
  'timestamp with time zone': 'timestamptz',
  'time without time zone': 'time',
  'time with time zone': 'timetz',
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

// Type modifiers can sit inside a name, as in timestamp(3) with time zone, and an interval can
// carry its fields; neither changes the wire value.
export const typescriptBuiltinName = (type: string): string => {
  const unmodified = type
    .replace(/\([^)]*\)/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
  const unqualified = unmodified.split('.').at(-1)?.replaceAll('"', '') ?? unmodified
  if (/^interval(?: |$)/u.test(unqualified)) return 'interval'
  return aliases[unqualified] ?? unqualified
}

export const isTypescriptInt8Range = (type: string | undefined): boolean =>
  type !== undefined && typescriptBuiltinName(type) === 'int8range'

// Types whose CHECK adapters read the public shape, so CHECK inputs and query prevalidation pass it.
const publicCheckTypes = new Set([
  'int8range',
  'date',
  'timestamp',
  'timestamptz',
  'time',
  'timetz',
  'interval',
  'point',
  'line',
  'lseg',
  'box',
  'path',
  'polygon',
  'circle',
  'numeric',
  'float4',
  'float8',
  // Types whose public value is the server's text (JSON values as their JSON text): their CHECK
  // inputs read that text through the type's own input function.
  'money',
  'tsvector',
  'tsquery',
  'aclitem',
  'pg_lsn',
  'tid',
  'pg_snapshot',
  'txid_snapshot',
  'json',
  'jsonb',
  'jsonpath',
  'xml',
  'int2vector',
  'oidvector',
  'regclass',
  'regcollation',
  'regconfig',
  'regdictionary',
  'regnamespace',
  'regoper',
  'regoperator',
  'regproc',
  'regprocedure',
  'regrole',
  'regtype',
  // Numeric identifiers and the one-byte "char" convert natively.
  'oid',
  'xid',
  'cid',
  'xid8',
  'char',
])

export const typescriptPublicCheckInput = (type: string | undefined): boolean => {
  if (type === undefined) return false
  const name = typescriptBuiltinName(type)
  return publicCheckTypes.has(builtinCodecs[name] ? (aliasNames[name] ?? name) : name)
}

export function typescriptScalarCodec(type: string): TypescriptScalarCodec {
  return builtinCodecs[typescriptBuiltinName(type)] ?? 'Text'
}

export function typescriptDomainBase(type: string, catalog: CatalogSnapshot | undefined): string {
  const seen = new Set<string>()
  for (;;) {
    const unmodified = type.replace(/\([^)]*\)$/u, '')
    const parts = unmodified.split('.').map((part) => part.replaceAll('"', ''))
    const [schema, name] =
      parts.length > 1 ? [parts[0], parts.slice(1).join('.')] : [undefined, parts[0]]
    const domain = catalog?.domains.find(
      (item) => item.name === name && (schema === undefined || item.schema === schema),
    )
    if (!domain || seen.has(`${domain.schema}.${domain.name}`)) return type
    seen.add(`${domain.schema}.${domain.name}`)
    type = domain.baseTypeName
  }
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
  const range = rangeSubtype(schema, plain, catalog)
  if (range) return { kind: range.kind, element: typescriptCodec(range.subtype, catalog, seen) }
  // A composite type and every relation's row type carry their fields in attribute order.
  const composite = [
    ...(catalog?.compositeTypes ?? []).map((item) => ({
      schema: item.schema,
      name: item.name,
      fields: item.attributes.map((field) => ({ name: field.name, type: field.typeName })),
    })),
    ...[
      ...(catalog?.tables ?? []),
      ...(catalog?.views ?? []),
      ...(catalog?.materializedViews ?? []),
    ].map((item) => ({
      schema: item.schema,
      name: item.name,
      fields: item.columns.map((field) => ({ name: field.name, type: field.typeName })),
    })),
  ].find((item) => item.name === plain && (schema === undefined || item.schema === schema))
  if (composite && !seen.has(`${composite.schema}.${composite.name}`)) {
    const inner = new Set([...seen, `${composite.schema}.${composite.name}`])
    return {
      kind: 'composite',
      fields: composite.fields.map((field) => ({
        name: field.name,
        codec: typescriptCodec(field.type, catalog, inner),
      })),
    }
  }
  return { kind: 'scalar', name: typescriptScalarCodec(type) }
}

const builtinRanges = Object.values(PG18_RANGE_TYPES)

const rangeSubtype = (
  schema: string | undefined,
  name: string,
  catalog: CatalogSnapshot | undefined,
): { kind: 'range' | 'multirange'; subtype: string } | null => {
  const qualified = (identity: string) =>
    identity.split('.').map((part) => part.replaceAll('"', ''))
  const matches = (identity: string) => {
    const [owner, item] = qualified(identity)
    return item === name && (schema === undefined ? true : owner === schema)
  }
  for (const range of [...(catalog?.rangeTypes ?? []), ...builtinRanges]) {
    if (matches(range.identity)) return { kind: 'range', subtype: range.subtype }
    if (matches(range.multirange)) return { kind: 'multirange', subtype: range.subtype }
  }
  return null
}

// An empty range is a value without points, unlike SQL NULL, and a null bound is unbounded.
const grouped = (type: string): string => (/[|&]/u.test(type) ? `(${type})` : type)

export function typescriptCodecType(codec: TypescriptCodec): string {
  if (codec.kind === 'scalar') return typescriptScalarTypes[codec.name]
  if (codec.kind === 'composite')
    return `{ ${codec.fields
      .map(
        (field) =>
          `readonly ${JSON.stringify(field.name)}: ${grouped(typescriptCodecType(field.codec))} | null`,
      )
      .join('; ')} }`
  const element = typescriptCodecType(codec.element)
  if (codec.kind === 'array') return `(${element} | null)[]`
  const range = `{ readonly empty: true } | { readonly empty: false; readonly lower: ${grouped(element)} | null; readonly upper: ${grouped(element)} | null; readonly lowerInclusive: boolean; readonly upperInclusive: boolean }`
  return codec.kind === 'range' ? range : `(${range})[]`
}

export const typescriptCodecNames = (codec: TypescriptCodec, direction: 'decode' | 'encode') => {
  const names = new Set<string>()
  const visit = (item: TypescriptCodec) => {
    if (item.kind === 'scalar') names.add(`${direction}${item.name}`)
    else if (item.kind === 'composite') {
      names.add(`${direction}Composite`)
      for (const field of item.fields) visit(field.codec)
    } else {
      names.add(
        `${direction}${item.kind === 'array' ? 'Array' : item.kind === 'range' ? 'Range' : 'Multirange'}`,
      )
      visit(item.element)
    }
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
function readRange(value: string, start: number, element: (item: string | null) => unknown): [unknown, number] {
  if (value.startsWith('empty', start)) return [{ empty: true }, start + 5]
  const lowerInclusive = value[start] === '['
  let index = start + 1
  const bound = (): unknown => {
    if (value[index] === ',' || value[index] === ']' || value[index] === ')') return null
    let text = ''
    let quoted = false
    while (index < value.length) {
      const character = value[index]!
      if (character === '"') {
        if (quoted && value[index + 1] === '"') {
          text += '"'
          index += 2
        } else {
          quoted = !quoted
          index++
        }
      } else if (character === '\\\\') {
        text += value[index + 1]
        index += 2
      } else if (!quoted && (character === ',' || character === ']' || character === ')')) break
      else {
        text += character
        index++
      }
    }
    return element(text)
  }
  const lower = bound()
  index++
  const upper = bound()
  return [{ empty: false, lower, upper, lowerInclusive, upperInclusive: value[index] === ']' }, index + 1]
}
function decodeRange(value: string | null, element: (item: string | null) => unknown): unknown {
  return value === null ? null : readRange(value, 0, element)[0]
}
function writeRange(value: unknown, element: (item: unknown, name: string) => string | null, name: string): string {
  if (!value || typeof value !== 'object' || !('empty' in value) || typeof value.empty !== 'boolean') return encodeInvalid(name, 'range')
  if (value.empty) return 'empty'
  if (!('lower' in value) || !('upper' in value) || !('lowerInclusive' in value) || !('upperInclusive' in value) || typeof value.lowerInclusive !== 'boolean' || typeof value.upperInclusive !== 'boolean') return encodeInvalid(name, 'range')
  const bound = (item: unknown) => {
    if (item === null) return ''
    const text = element(item, name)
    return text === null ? encodeInvalid(name, 'range') : '"' + text.replace(/["\\\\]/gu, '\\\\$&') + '"'
  }
  return (value.lowerInclusive ? '[' : '(') + bound(value.lower) + ',' + bound(value.upper) + (value.upperInclusive ? ']' : ')')
}
function encodeRange(value: unknown, element: (item: unknown, name: string) => string | null, name: string): string | null {
  return value === null || value === undefined ? null : writeRange(value, element, name)
}
function decodeComposite(value: string | null, fields: readonly (readonly [string, (item: string | null) => unknown])[]): unknown {
  if (value === null) return null
  const row: Record<string, unknown> = {}
  let index = 1
  for (const [name, element] of fields) {
    if (value[index] === ',' || value[index] === ')') row[name] = element(null)
    else {
      let text = ''
      let quoted = false
      while (index < value.length) {
        const character = value[index]!
        if (character === '"') {
          if (quoted && value[index + 1] === '"') {
            text += '"'
            index += 2
          } else {
            quoted = !quoted
            index++
          }
        } else if (character === '\\\\') {
          text += value[index + 1]
          index += 2
        } else if (!quoted && (character === ',' || character === ')')) break
        else {
          text += character
          index++
        }
      }
      row[name] = element(text)
    }
    index++
  }
  return row
}
function encodeComposite(value: unknown, fields: readonly (readonly [string, (item: unknown, name: string) => string | null])[], name: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object' || Array.isArray(value)) return encodeInvalid(name, 'composite')
  return '(' + fields.map(([field, element]) => {
    const text = element((value as Record<string, unknown>)[field], name)
    return text === null ? '' : '"' + text.replace(/["\\\\]/gu, '\\\\$&') + '"'
  }).join(',') + ')'
}
function decodeMultirange(value: string | null, element: (item: string | null) => unknown): unknown {
  if (value === null) return null
  const ranges: unknown[] = []
  for (let index = 1; value[index] !== '}'; ) {
    const [range, next] = readRange(value, index, element)
    ranges.push(range)
    index = value[next] === ',' ? next + 1 : next
  }
  return ranges
}
function encodeMultirange(value: unknown, element: (item: unknown, name: string) => string | null, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value)) return encodeInvalid(name, 'multirange')
  return '{' + value.map((range) => writeRange(range, element, name)).join(',') + '}'
}
// Calendar arithmetic is proleptic Gregorian with astronomical years, as the server's is; output is
// read in the ISO date style that client libraries already assume.
function temporalOutput(type: string, value: string): never {
  throw new TypeError('Unexpected ' + type + ' output ' + JSON.stringify(value) + '; generated code reads the ISO DateStyle and the postgres or iso_8601 IntervalStyle')
}
function civilDays(year: number, month: number, day: number): number {
  const shifted = month <= 2 ? year - 1 : year
  const era = Math.floor(shifted / 400)
  const yearOfEra = shifted - era * 400
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear - 719468
}
function civilDate(days: number): [number, number, number] {
  const shifted = days + 719468
  const era = Math.floor(shifted / 146097)
  const dayOfEra = shifted - era * 146097
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365)
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153)
  const month = shiftedMonth + (shiftedMonth < 10 ? 3 : -9)
  return [yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1]
}
function serverDate(year: number, month: number, day: number): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return String(year <= 0 ? 1 - year : year).padStart(4, '0') + '-' + pad(month) + '-' + pad(day)
}
function serverClock(microseconds: bigint): string {
  const pad = (part: bigint) => String(part).padStart(2, '0')
  return pad(microseconds / 3600000000n) + ':' + pad((microseconds / 60000000n) % 60n) + ':' + pad((microseconds / 1000000n) % 60n) + '.' + String(microseconds % 1000000n).padStart(6, '0')
}
function serverTimestamp(value: unknown, field: string, name: string, type: string, zone: string): string | null {
  if (value === null || value === undefined) return null
  if (value && typeof value === 'object' && 'infinity' in value && (value.infinity === 1 || value.infinity === -1)) return value.infinity === 1 ? 'infinity' : '-infinity'
  if (!value || typeof value !== 'object' || !(field in value) || typeof (value as Record<string, unknown>)[field] !== 'bigint') return encodeInvalid(name, type)
  const microseconds = (value as Record<string, bigint>)[field]!
  let days = microseconds / 86400000000n
  if (days * 86400000000n > microseconds) days -= 1n
  const [year, month, day] = civilDate(Number(days))
  return serverDate(year, month, day) + ' ' + serverClock(microseconds - days * 86400000000n) + zone + (year <= 0 ? ' BC' : '')
}
function readTimestamp(value: string, type: string, zoned: boolean): bigint | { infinity: 1 | -1 } {
  if (value === 'infinity') return { infinity: 1 }
  if (value === '-infinity') return { infinity: -1 }
  const match = /^([0-9]{4,})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.([0-9]{1,6}))?(?:([+-])([0-9]{2})(?::([0-9]{2}))?(?::([0-9]{2}))?)?( BC)?$/u.exec(value)
  if (!match || Boolean(match[8]) !== zoned) return temporalOutput(type, value)
  const year = match[12] ? 1 - Number(match[1]) : Number(match[1])
  const seconds = Number(match[4]) * 3600 + Number(match[5]) * 60 + Number(match[6])
  const offset = match[8] ? (match[8] === '-' ? -1 : 1) * (Number(match[9]) * 3600 + Number(match[10] ?? 0) * 60 + Number(match[11] ?? 0)) : 0
  return BigInt(civilDays(year, Number(match[2]), Number(match[3]))) * 86400000000n + BigInt(seconds - offset) * 1000000n + BigInt((match[7] ?? '').padEnd(6, '0'))
}
function decodeDate(value: string | null): string | null {
  if (value === null || value === 'infinity' || value === '-infinity') return value
  const match = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})( BC)?$/u.exec(value)
  if (!match) return temporalOutput('date', value)
  const year = match[4] ? 1 - Number(match[1]) : Number(match[1])
  const text = year >= 0 && year <= 9999 ? String(year).padStart(4, '0') : (year < 0 ? '-' : '+') + String(Math.abs(year)).padStart(6, '0')
  return text + '-' + match[2] + '-' + match[3]
}
function encodeDate(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (value === 'infinity' || value === '-infinity') return value
  const match = typeof value === 'string' ? /^(?:([0-9]{4})|([+-][0-9]{6,}))-([0-9]{2})-([0-9]{2})$/u.exec(value) : null
  if (!match || match[2] === '-000000') return encodeInvalid(name, 'date')
  const year = Number(match[1] ?? match[2])
  return serverDate(year, Number(match[3]), Number(match[4])) + (year <= 0 ? ' BC' : '')
}
function decodeTimestamp(value: string | null): unknown {
  if (value === null) return null
  const read = readTimestamp(value, 'timestamp', false)
  return typeof read === 'bigint' ? { localMicroseconds: read } : read
}
function encodeTimestamp(value: unknown, name: string): string | null {
  return serverTimestamp(value, 'localMicroseconds', name, 'timestamp', '')
}
function decodeTimestamptz(value: string | null): unknown {
  if (value === null) return null
  const read = readTimestamp(value, 'timestamptz', true)
  return typeof read === 'bigint' ? { epochMicroseconds: read } : read
}
function encodeTimestamptz(value: unknown, name: string): string | null {
  return serverTimestamp(value, 'epochMicroseconds', name, 'timestamptz', '+00')
}
function readClock(value: string, type: string): [number, number] {
  const match = /^([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\\.([0-9]{1,6}))?(?:([+-])([0-9]{2})(?::([0-9]{2}))?(?::([0-9]{2}))?)?$/u.exec(value)
  if (!match || Boolean(match[5]) !== (type === 'timetz')) return temporalOutput(type, value)
  const microseconds = (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000000 + Number((match[4] ?? '').padEnd(6, '0'))
  return [microseconds, match[5] ? (match[5] === '-' ? -1 : 1) * (Number(match[6]) * 3600 + Number(match[7] ?? 0) * 60 + Number(match[8] ?? 0)) : 0]
}
function decodeTime(value: string | null): unknown {
  return value === null ? null : { microseconds: readClock(value, 'time')[0] }
}
function encodeTime(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('microseconds' in value) || typeof value.microseconds !== 'number' || !Number.isSafeInteger(value.microseconds) || value.microseconds < 0) return encodeInvalid(name, 'time')
  return serverClock(BigInt(value.microseconds))
}
function decodeTimetz(value: string | null): unknown {
  if (value === null) return null
  const [microseconds, offsetSeconds] = readClock(value, 'timetz')
  return { microseconds, offsetSeconds }
}
function encodeTimetz(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('microseconds' in value) || !('offsetSeconds' in value) || typeof value.microseconds !== 'number' || !Number.isSafeInteger(value.microseconds) || value.microseconds < 0 || typeof value.offsetSeconds !== 'number' || !Number.isSafeInteger(value.offsetSeconds)) return encodeInvalid(name, 'timetz')
  const offset = Math.abs(value.offsetSeconds)
  const pad = (part: number) => String(part).padStart(2, '0')
  return serverClock(BigInt(value.microseconds)) + (value.offsetSeconds < 0 ? '-' : '+') + pad(Math.floor(offset / 3600)) + ':' + pad(Math.floor(offset / 60) % 60) + ':' + pad(offset % 60)
}
function decodeInterval(value: string | null): unknown {
  if (value === null) return null
  if (value === 'infinity') return { infinity: 1 }
  if (value === '-infinity') return { infinity: -1 }
  const fraction = (sign: string | undefined, whole: string | undefined, part: string | undefined) => (sign === '-' ? -1n : 1n) * (BigInt(whole ?? 0) * 1000000n + BigInt((part ?? '').padEnd(6, '0')))
  const postgres = /^(?:([+-]?[0-9]+) years? ?)?(?:([+-]?[0-9]+) mons? ?)?(?:([+-]?[0-9]+) days? ?)?(?:([+-])?([0-9]+):([0-9]{2}):([0-9]{2})(?:\\.([0-9]{1,6}))?)?$/u.exec(value)
  if (postgres && value !== '')
    return {
      months: Number(postgres[1] ?? 0) * 12 + Number(postgres[2] ?? 0),
      days: Number(postgres[3] ?? 0),
      microseconds: (postgres[4] === '-' ? -1n : 1n) * ((BigInt(postgres[5] ?? 0) * 3600n + BigInt(postgres[6] ?? 0) * 60n) * 1000000n) + fraction(postgres[4], postgres[7], postgres[8]),
    }
  const iso = /^P(?:(-?[0-9]+)Y)?(?:(-?[0-9]+)M)?(?:(-?[0-9]+)D)?(?:T(?:(-?[0-9]+)H)?(?:(-?[0-9]+)M)?(?:(-?)([0-9]+)(?:\\.([0-9]{1,6}))?S)?)?$/u.exec(value)
  if (!iso) return temporalOutput('interval', value)
  return {
    months: Number(iso[1] ?? 0) * 12 + Number(iso[2] ?? 0),
    days: Number(iso[3] ?? 0),
    microseconds: (BigInt(iso[4] ?? 0) * 3600n + BigInt(iso[5] ?? 0) * 60n) * 1000000n + fraction(iso[6], iso[7], iso[8]),
  }
}
function encodeInterval(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (value && typeof value === 'object' && 'infinity' in value && (value.infinity === 1 || value.infinity === -1)) return value.infinity === 1 ? 'infinity' : '-infinity'
  if (!value || typeof value !== 'object' || !('months' in value) || !('days' in value) || !('microseconds' in value) || typeof value.months !== 'number' || !Number.isSafeInteger(value.months) || typeof value.days !== 'number' || !Number.isSafeInteger(value.days) || typeof value.microseconds !== 'bigint') return encodeInvalid(name, 'interval')
  // Under the SQL-standard style a leading minus also negates later unsigned fields.
  const signed = (part: number | bigint) => (part < 0 ? '' : '+') + part
  return signed(value.months) + ' mons ' + signed(value.days) + ' days ' + signed(value.microseconds) + ' microseconds'
}
// Geometric output prints each float the way float8 output does, so every coordinate reads back
// exactly; input is written in the same notation.
function geometryOutput(type: string, value: string): never {
  throw new TypeError('Unexpected ' + type + ' output ' + JSON.stringify(value))
}
function geometryPoints(value: string): { x: number; y: number }[] {
  return [...value.matchAll(/\\(([^,()]+),([^,()]+)\\)/gu)].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
}
function geometryNumber(value: unknown): value is number {
  return typeof value === 'number'
}
function geometryText(value: number): string {
  return Object.is(value, -0) ? '-0' : String(value)
}
function geometryPoint(value: unknown, name: string, type: string): string {
  if (!value || typeof value !== 'object' || !('x' in value) || !('y' in value) || !geometryNumber(value.x) || !geometryNumber(value.y)) return encodeInvalid(name, type)
  return '(' + geometryText(value.x) + ',' + geometryText(value.y) + ')'
}
function geometryPointList(value: unknown, name: string, type: string): string {
  if (!Array.isArray(value)) return encodeInvalid(name, type)
  return value.map((point) => geometryPoint(point, name, type)).join(',')
}
function decodePoint(value: string | null): unknown {
  if (value === null) return null
  const points = geometryPoints(value)
  return points.length === 1 ? points[0] : geometryOutput('point', value)
}
function encodePoint(value: unknown, name: string): string | null {
  return value === null || value === undefined ? null : geometryPoint(value, name, 'point')
}
function decodeLine(value: string | null): unknown {
  if (value === null) return null
  const match = /^\\{([^,]+),([^,]+),([^}]+)\\}$/u.exec(value)
  return match ? { a: Number(match[1]), b: Number(match[2]), c: Number(match[3]) } : geometryOutput('line', value)
}
function encodeLine(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('a' in value) || !('b' in value) || !('c' in value) || !geometryNumber(value.a) || !geometryNumber(value.b) || !geometryNumber(value.c)) return encodeInvalid(name, 'line')
  return '{' + geometryText(value.a) + ',' + geometryText(value.b) + ',' + geometryText(value.c) + '}'
}
function decodeLseg(value: string | null): unknown {
  if (value === null) return null
  const points = geometryPoints(value)
  return points.length === 2 ? { start: points[0], end: points[1] } : geometryOutput('lseg', value)
}
function encodeLseg(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('start' in value) || !('end' in value)) return encodeInvalid(name, 'lseg')
  return '[' + geometryPoint(value.start, name, 'lseg') + ',' + geometryPoint(value.end, name, 'lseg') + ']'
}
function decodeBox(value: string | null): unknown {
  if (value === null) return null
  const points = geometryPoints(value)
  return points.length === 2 ? { high: points[0], low: points[1] } : geometryOutput('box', value)
}
function encodeBox(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('high' in value) || !('low' in value)) return encodeInvalid(name, 'box')
  return geometryPoint(value.high, name, 'box') + ',' + geometryPoint(value.low, name, 'box')
}
function decodePath(value: string | null): unknown {
  if (value === null) return null
  if (value[0] !== '[' && value[0] !== '(') return geometryOutput('path', value)
  return { closed: value[0] === '(', points: geometryPoints(value) }
}
function encodePath(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('closed' in value) || !('points' in value) || typeof value.closed !== 'boolean') return encodeInvalid(name, 'path')
  const points = geometryPointList(value.points, name, 'path')
  return value.closed ? '(' + points + ')' : '[' + points + ']'
}
function decodePolygon(value: string | null): unknown {
  return value === null ? null : { points: geometryPoints(value) }
}
function encodePolygon(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('points' in value)) return encodeInvalid(name, 'polygon')
  return '(' + geometryPointList(value.points, name, 'polygon') + ')'
}
function decodeCircle(value: string | null): unknown {
  if (value === null) return null
  const match = /^<\\(([^,]+),([^)]+)\\),([^>]+)>$/u.exec(value)
  return match ? { center: { x: Number(match[1]), y: Number(match[2]) }, radius: Number(match[3]) } : geometryOutput('circle', value)
}
function encodeCircle(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || !('center' in value) || !('radius' in value) || !geometryNumber(value.radius)) return encodeInvalid(name, 'circle')
  return '<' + geometryPoint(value.center, name, 'circle') + ',' + geometryText(value.radius) + '>'
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
