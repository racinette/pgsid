import { decodeTsqueryWire } from './check-tsquery-fixtures.js'
import { compositeProfile } from '../../src/sql-semantics/composite-profiles.js'
import { readCompositeFixture } from './check-composite-fixtures.js'
import type { PGlite } from '@electric-sql/pglite'
import {
  rangeTypeProfile,
  multirangeTypeProfile,
  rangeContainerKind,
} from '../../src/sql-semantics/range-profiles.js'
import { readMultirangeFixture, readMultirangeQueryFixture } from './check-multirange-fixtures.js'
import {
  arrayElementBaseType,
  domainElementDefinition,
  type RangeType,
  isCatalogVectorType,
} from '../../src/sql-semantics/expressions.js'
import { decodeCatalogVector } from './check-catalog-vector-fixtures.js'
import {
  arrayElementFamily,
  arrayElementIdentity,
  rangeBoundProfiles,
} from '../../src/codegen/shared/check-array-types.js'
import type {
  RangeInputCell,
  RangeInputPayload,
  RangeJsonbPayload,
} from '../../tools/check-rust/range-input.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

const jsonbBounds = new WeakMap<PGlite, Map<string, Promise<RangeJsonbPayload>>>()

export async function readRangeBoundCell(
  pg: PGlite,
  subtype: string,
  value: string | null,
  sqlType?: string,
): Promise<RangeInputCell> {
  if (isCatalogVectorType(subtype) && value !== null) {
    const vector = decodeCatalogVector(value, subtype === 'pg_catalog.oidvector')
    if (vector.kind !== 'Value') throw Error('Non-NULL vector bound became NULL')
    return { kind: 'Array', value: vector.value }
  }
  if (compositeProfile(subtype) && value !== null) {
    const payload = await readCompositeFixture(
      pg,
      `SELECT $1::${compositeProfile(subtype)!.identity} value`,
      'value',
      subtype,
      [value],
    )
    if (!payload) throw new Error('Non-NULL composite range bound became NULL')
    return { kind: 'Composite', value: payload }
  }
  const range = rangeTypeProfile(subtype),
    multi = multirangeTypeProfile(subtype)
  if (range && value !== null)
    return {
      kind: 'Range',
      value: (await readRangeFixture(
        pg,
        `SELECT $1::${range.identity} span`,
        'span',
        range.rangeType,
        [value],
      ))!,
    }
  if (multi && value !== null)
    return {
      kind: 'Multirange',
      value: (await readMultirangeFixture(pg, multi.multirangeType, value))!,
    }
  if (subtype.startsWith('array:') && value !== null)
    return {
      kind: 'Array',
      value: (await readArrayBoundFixture(pg, subtype, sqlType ?? arraySqlType(subtype), value))!,
    }
  if (subtype === 'pg_catalog."json"' && value !== null) {
    const type = (await pg.query<{ type: string }>('SELECT json_typeof($1::json) type', [value]))
      .rows[0]!.type
    let depth = 0,
      maximum = 0,
      quoted = false,
      escaped = false
    for (const ch of value) {
      if (quoted) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') quoted = false
      } else if (ch === '"') quoted = true
      else if (ch === '[' || ch === '{') {
        depth++
        maximum = Math.max(maximum, depth)
      } else if (ch === ']' || ch === '}') depth--
    }
    return {
      kind: 'Json',
      value: {
        source: value,
        kind:
          type === 'boolean'
            ? value.trim() === 'true'
              ? 2
              : 1
            : ({ null: 0, number: 3, string: 4, array: 5, object: 6 } as Record<string, number>)[
                type
              ]!,
        depth: maximum,
      },
    }
  }
  if (subtype.startsWith('enum:') && value !== null) {
    const names = JSON.parse(subtype.slice(5)) as string[]
    const identity = names.map((name) => '"' + name.replaceAll('"', '""') + '"').join('.')
    const ordinal = (
      await pg.query<{ ordinal: number }>(
        `SELECT array_position(enum_range(NULL::${identity}),$1::${identity})-1 AS ordinal`,
        [value],
      )
    ).rows[0]!.ordinal
    return { kind: 'Enum', value: { ordinal, labelOid: 0n } }
  }
  if (subtype !== 'pg_catalog.jsonb' || value === null) return rangeBoundCell(subtype, value)
  let cache = jsonbBounds.get(pg)
  if (!cache) jsonbBounds.set(pg, (cache = new Map()))
  let pending = cache.get(value)
  if (!pending) {
    pending = (async () => {
      const { rows } = await pg.query<{
        path: number[]
        key: string | null
        kind: string
        content: string
      }>(
        `WITH RECURSIVE tree(path,key,value) AS (
          SELECT ARRAY[]::integer[],NULL::text,$1::jsonb
          UNION ALL
          SELECT parent.path || children.ordinal::integer,children.key,children.value
          FROM tree parent CROSS JOIN LATERAL (
            SELECT ordinal,key,value FROM jsonb_each(CASE WHEN jsonb_typeof(parent.value)='object' THEN parent.value ELSE '{}'::jsonb END) WITH ORDINALITY AS objects(key,value,ordinal)
            UNION ALL
            SELECT ordinal,NULL::text,value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(parent.value)='array' THEN parent.value ELSE '[]'::jsonb END) WITH ORDINALITY AS arrays(value,ordinal)
          ) children
        ) SELECT path,key,jsonb_typeof(value) kind,CASE WHEN jsonb_typeof(value)='string' THEN value#>>'{}' ELSE value::text END content FROM tree ORDER BY path`,
        [value],
      )
      const payload: RangeJsonbPayload = {
        characters: [],
        nodes: [{ kind: -1, child: 0, next: 0, keyStart: 0, keyEnd: 0, textStart: 0, textEnd: 0 }],
        root: 1,
      }
      const ids = new Map<string, number>(),
        tails = new Map<string, number>()
      for (const row of rows) {
        const index = payload.nodes.length,
          keyStart = payload.characters.length
        payload.characters.push(...(row.key ?? ''))
        const keyEnd = payload.characters.length,
          textStart = keyEnd
        if (row.kind === 'number' || row.kind === 'string') payload.characters.push(...row.content)
        payload.nodes.push({
          kind:
            row.kind === 'boolean'
              ? row.content === 'true'
                ? 2
                : 1
              : { null: 0, number: 3, string: 4, array: 5, object: 6 }[row.kind]!,
          child: 0,
          next: 0,
          keyStart,
          keyEnd,
          textStart,
          textEnd: payload.characters.length,
        })
        ids.set(row.path.join('.'), index)
        if (row.path.length) {
          const parent = row.path.slice(0, -1).join('.'),
            previous = tails.get(parent)
          if (previous) payload.nodes[previous]!.next = index
          else payload.nodes[ids.get(parent)!]!.child = index
          tails.set(parent, index)
        }
      }
      return payload
    })()
    cache.set(value, pending)
  }
  return { kind: 'Jsonb', value: structuredClone(await pending) }
}

const arraySqlType = (type: string): string => {
  const element = type.slice(6),
    domain = domainElementDefinition(element)
  const quoted = (parts: string[]) =>
    parts.map((name) => '"' + name.replaceAll('"', '""') + '"').join('.')
  return (
    (domain
      ? quoted([domain.schema, domain.name])
      : element.startsWith('enum:')
        ? quoted(JSON.parse(element.slice(5)) as string[])
        : element) + '[]'
  )
}
const arrayBounds = new WeakMap<PGlite, Map<string, Promise<OwnedArrayInputPayload | null>>>()
export async function readArrayBoundFixture(
  pg: PGlite,
  type: string,
  sqlType: string,
  text: string | null,
): Promise<OwnedArrayInputPayload | null> {
  if (text === null) return null
  let cache = arrayBounds.get(pg)
  if (!cache) arrayBounds.set(pg, (cache = new Map()))
  const key = JSON.stringify([type, sqlType, text])
  let pending = cache.get(key)
  if (!pending) {
    pending = readArrayBoundQueryFixture(
      pg,
      type,
      sqlType,
      `SELECT $1::${sqlType} value`,
      'value',
      [text],
    )
    cache.set(key, pending)
  }
  return structuredClone(await pending)
}

export async function readArrayBoundQueryFixture(
  pg: PGlite,
  type: string,
  sqlType: string,
  select: string,
  name: string,
  parameters: unknown[] = [],
): Promise<OwnedArrayInputPayload | null> {
  const column = '"' + name.replaceAll('"', '""') + '"',
    from = `FROM (${select}) candidate`
  if (
    (await pg.query<{ missing: boolean }>(`SELECT ${column} IS NULL missing ${from}`, parameters))
      .rows[0]!.missing
  )
    return null
  const element = type.slice(6),
    base = arrayElementBaseType(element)
  const shape = (
    await pg.query<{ lower: number; length: number }>(
      `SELECT array_lower(${column},d) lower,array_length(${column},d) length ${from} CROSS JOIN LATERAL generate_series(1,array_ndims(${column})) d`,
      parameters,
    )
  ).rows
  const nativeElement = (
    await pg.query<{ identity: string }>(
      `WITH RECURSIVE bases(oid) AS (SELECT $1::regtype::oid UNION SELECT t.typbasetype FROM bases b JOIN pg_type t ON t.oid=b.oid WHERE t.typtype='d') SELECT format('%I.%I',n.nspname,e.typname) identity FROM bases b JOIN pg_type t ON t.oid=b.oid JOIN pg_type e ON e.oid=t.typelem JOIN pg_namespace n ON n.oid=e.typnamespace`,
      [sqlType],
    )
  ).rows[0]!.identity
  const rows = (
    await pg.query<{ value: string | null }>(
      `SELECT ${base.startsWith('array:') ? 'cells.value::text' : rangeBoundProjection('cells.value', base)} value ${from} CROSS JOIN LATERAL unnest(${column}) WITH ORDINALITY AS cells(value,ordinal) ORDER BY ordinal`,
      parameters,
    )
  ).rows
  const elements: OwnedArrayInputPayload['elements'] = []
  for (const [index, row] of rows.entries()) {
    const cell = `SELECT cells.value AS value ${from} CROSS JOIN LATERAL unnest(${column}) WITH ORDINALITY AS cells(value,ordinal) WHERE ordinal=${index + 1}`
    const span = rangeTypeProfile(base),
      multi = multirangeTypeProfile(base)
    if (row.value === null) elements.push({ kind: 'Null' })
    else if (base.startsWith('array:'))
      elements.push({
        kind: 'Array',
        value: (await readArrayBoundQueryFixture(
          pg,
          base,
          nativeElement,
          cell,
          'value',
          parameters,
        ))!,
      })
    else if (compositeProfile(base))
      elements.push({
        kind: 'Composite',
        value: (await readCompositeFixture(pg, cell, 'value', base, parameters))!,
      })
    else if (span)
      elements.push({
        kind: 'Range',
        value: (await readRangeFixture(pg, cell, 'value', span.rangeType, parameters))!,
      })
    else if (multi)
      elements.push({
        kind: 'Multirange',
        value: (await readMultirangeQueryFixture(
          pg,
          multi.multirangeType,
          cell,
          'value',
          parameters,
        ))!,
      })
    else elements.push(await readRangeBoundCell(pg, base, row.value, nativeElement))
  }
  return {
    elementType: arrayElementIdentity(element),
    elementKind: arrayElementFamily(element)!,
    dimensions: shape,
    elements,
    nullBitmap: { kind: 'Value', value: rows.some((r) => r.value === null) },
  }
}

export function rangeCoreSamples(type: RangeType): {
  ranges: (string | null)[]
  elements: (string | null)[]
} {
  const subtype = rangeTypeProfile(type)!.elementType
  const temporal =
    subtype === 'pg_catalog.date' ||
    subtype === 'pg_catalog."timestamp"' ||
    subtype === 'pg_catalog.timestamptz'
  const offset = subtype === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : ''
  const [a, b, c] = temporal
    ? ['2000-01-01' + offset, '2000-01-03' + offset, '2000-01-05' + offset]
    : ['1', '3', '5']
  const ranges: (string | null)[] = [
    null,
    'empty',
    '(,)',
    `(,${b})`,
    `[${a},)`,
    `[${a},${b})`,
    `(${a},${b})`,
    `[${a},${b}]`,
    `(${a},${b}]`,
    `[${b},${c})`,
    `(${b},${c}]`,
    `[${b},${b}]`,
    `[${a},${a})`,
  ]
  const elements: (string | null)[] = [null, a!, b!, c!]
  if (temporal) {
    ranges.push(
      '[-infinity,infinity]',
      '[infinity,infinity]',
      '[-infinity,-infinity]',
      '(,infinity)',
    )
    elements.push('-infinity', 'infinity')
  } else if (subtype === 'pg_catalog."numeric"') {
    ranges.push(
      '[1.0000,3.0000)',
      '[-0.00,1.2300]',
      '[NaN,NaN]',
      '[-Infinity,Infinity]',
      '[Infinity,NaN]',
    )
    elements.push('-0.00', '1.2300', 'NaN', '-Infinity', 'Infinity')
  } else if (subtype === 'pg_catalog.int8') {
    ranges.push('[-9223372036854775808,9223372036854775807)', '[9007199254740993,9007199254740999)')
    elements.push('-9223372036854775808', '9223372036854775807', '9007199254740993')
  } else {
    ranges.push('[-2147483648,2147483647)', '[2147483647,)')
    elements.push('-2147483648', '2147483647')
  }
  return { ranges, elements }
}

export function rangeBoundProjection(bound: string, subtype: string): string {
  if (subtype === 'pg_catalog.tsquery')
    return `CASE WHEN ${bound} IS NULL THEN NULL ELSE pg_catalog.json_build_object('wire',pg_catalog.encode(pg_catalog.tsquerysend(${bound}),'hex'),'nativeBytes',pg_catalog.pg_column_size(${bound} || ''::tsquery))::text END`
  if (subtype === 'pg_catalog.tsvector')
    return `CASE WHEN ${bound} IS NULL THEN NULL ELSE pg_catalog.json_build_object('wire',pg_catalog.encode(pg_catalog.tsvectorsend(${bound}),'hex'),'nativeBytes',pg_catalog.pg_column_size(pg_catalog.setweight(${bound},'D',ARRAY[]::text[])))::text END`
  if (isCatalogVectorType(subtype))
    return `encode(${subtype === 'pg_catalog.oidvector' ? 'oid' : 'int2'}vectorsend(${bound}),'hex')`
  if (subtype === 'pg_catalog.date')
    return `CASE WHEN ${bound}='-infinity'::date THEN '-2147483648' WHEN ${bound}='infinity'::date THEN '2147483647' ELSE (${bound}-DATE '2000-01-01')::text END`
  if (subtype === 'pg_catalog."timestamp"' || subtype === 'pg_catalog.timestamptz') {
    const send = subtype === 'pg_catalog.timestamptz' ? 'timestamptz_send' : 'timestamp_send'
    return `(('x'||encode(${send}(${bound}),'hex'))::bit(64)::bigint)::text`
  }
  const sends: Record<string, readonly [string, number]> = {
    'pg_catalog.float4': ['float4send', 32],
    'pg_catalog.float8': ['float8send', 64],
    'pg_catalog."time"': ['time_send', 64],
    'pg_catalog.money': ['cash_send', 64],
    'pg_catalog.pg_lsn': ['pg_lsn_send', 64],
    'pg_catalog.tid': ['tidsend', 48],
  }
  const send = sends[subtype]
  if (send)
    return `(('x'||encode(${send[0]}(${bound}),'hex'))::bit(${send[1]})::${send[1] === 32 ? 'int4' : 'bigint'})::text`
  const records: Record<string, string> = {
    'pg_catalog.timetz': 'timetz_send',
    'pg_catalog."interval"': 'interval_send',
    'pg_catalog."char"': 'charsend',
    'pg_catalog.inet': 'inet_send',
    'pg_catalog.cidr': 'cidr_send',
    'pg_catalog.bpchar': 'bpcharsend',
    'pg_catalog.macaddr': 'macaddr_send',
    'pg_catalog.macaddr8': 'macaddr8_send',
    'pg_catalog.uuid': 'uuid_send',
  }
  if (records[subtype]) return `encode(${records[subtype]}(${bound}),'hex')`
  if (subtype === 'pg_catalog.bytea') return `encode(${bound},'hex')`
  if (subtype.startsWith('pg_catalog.reg')) return `(${bound}::oid)::text`
  return `${bound}::text`
}

export function rangeBoundCell(subtype: string, value: string | null): RangeInputCell {
  if (value === null) return { kind: 'Null' }
  if (subtype === 'pg_catalog.tsquery') {
    const captured = JSON.parse(value) as { wire: string; nativeBytes: number }
    return { kind: 'Tsquery', value: decodeTsqueryWire(captured.wire, captured.nativeBytes) }
  }
  if (subtype === 'pg_catalog.tsvector') {
    const stored = JSON.parse(value) as { wire: string; nativeBytes: number },
      bytes = Buffer.from(stored.wire, 'hex'),
      lexemes: Extract<RangeInputCell, { kind: 'Tsvector' }>['value']['lexemes'] = []
    let position = 4
    const count = bytes.readUInt32BE(0)
    for (let index = 0; index < count; index++) {
      const end = bytes.indexOf(0, position)
      if (end < position) throw new Error('Invalid native tsvector wire lexeme')
      const text = bytes.subarray(position, end).toString('utf8'),
        positions: { position: number; weight: number }[] = []
      position = end + 1
      const size = bytes.readUInt16BE(position)
      position += 2
      for (let at = 0; at < size; at++) {
        const word = bytes.readUInt16BE(position)
        position += 2
        positions.push({ position: word & 16383, weight: word >>> 14 })
      }
      lexemes.push({ text, positions })
    }
    if (position !== bytes.length) throw new Error('Trailing native tsvector wire data')
    return { kind: 'Tsvector', value: { lexemes, nativeBytes: stored.nativeBytes } }
  }
  if (subtype === 'pg_catalog.xml') return { kind: 'Xml', value }
  if (
    ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.name', 'pg_catalog.refcursor'].includes(
      subtype,
    )
  )
    return { kind: 'Text', value }
  if (subtype === 'pg_catalog.bpchar')
    return { kind: 'Text', value: Buffer.from(value, 'hex').toString('utf8') }
  if (subtype === 'pg_catalog.int2') return { kind: 'Int2', value: Number(value) }
  if (subtype === 'pg_catalog.bool') return { kind: 'Bool', value: value === 'true' }
  if (subtype === 'pg_catalog."bit"' || subtype === 'pg_catalog.varbit')
    return { kind: 'Bit', value }
  if (subtype === 'pg_catalog.bytea') return { kind: 'Bytea', value }
  if (subtype === 'pg_catalog.float4') return { kind: 'Float4', value: Number(value) }
  if (subtype === 'pg_catalog.float8') return { kind: 'Float8', value: BigInt(value) }
  if (subtype === 'pg_catalog."time"') return { kind: 'Time', value: BigInt(value) }
  if (subtype === 'pg_catalog.money') return { kind: 'Money', value: BigInt(value) }
  if (subtype === 'pg_catalog.oid' || subtype.startsWith('pg_catalog.reg'))
    return { kind: 'Oid', value: BigInt(value) }
  if (subtype === 'pg_catalog.xid8')
    return { kind: 'Xid8', value: BigInt.asIntN(64, BigInt(value)) }
  if (subtype === 'pg_catalog.pg_lsn') return { kind: 'PgLsn', value: BigInt(value) }
  if (subtype === 'pg_catalog.tid') return { kind: 'Tid', value: BigInt(value) }
  if (subtype === 'pg_catalog."char"') return { kind: 'InternalChar', value: parseInt(value, 16) }
  if (subtype === 'pg_catalog.timetz') {
    const bytes = Buffer.from(value, 'hex')
    return { kind: 'Timetz', value: { time: bytes.readBigInt64BE(0), zone: bytes.readInt32BE(8) } }
  }
  if (subtype === 'pg_catalog."interval"') {
    const bytes = Buffer.from(value, 'hex')
    return {
      kind: 'Interval',
      value: {
        time: bytes.readBigInt64BE(0),
        days: bytes.readInt32BE(8),
        months: bytes.readInt32BE(12),
      },
    }
  }
  if (
    [
      'pg_catalog.inet',
      'pg_catalog.cidr',
      'pg_catalog.macaddr',
      'pg_catalog.macaddr8',
      'pg_catalog.uuid',
    ].includes(subtype)
  ) {
    const source = Buffer.from(value, 'hex'),
      bytes = Buffer.alloc(16)
    source.copy(bytes, 0, subtype === 'pg_catalog.inet' || subtype === 'pg_catalog.cidr' ? 4 : 0)
    const words = {
      word0: bytes.readUInt16BE(0),
      word1: bytes.readUInt16BE(2),
      word2: bytes.readUInt16BE(4),
      word3: bytes.readUInt16BE(6),
      word4: bytes.readUInt16BE(8),
      word5: bytes.readUInt16BE(10),
      word6: bytes.readUInt16BE(12),
      word7: bytes.readUInt16BE(14),
    }
    if (subtype === 'pg_catalog.inet' || subtype === 'pg_catalog.cidr')
      return {
        kind: 'Network',
        value: { ...words, family: source[0] === 2 ? 4 : 6, prefix: source[1]! },
      }
    if (subtype === 'pg_catalog.uuid') return { kind: 'Uuid', value: words }
    return {
      kind: subtype === 'pg_catalog.macaddr' ? 'Macaddr' : 'Macaddr8',
      value: { word0: words.word0, word1: words.word1, word2: words.word2, word3: words.word3 },
    }
  }
  if (subtype === 'pg_catalog.int4') return { kind: 'Int4', value: Number(value) }
  if (subtype === 'pg_catalog.date') return { kind: 'Date', value: Number(value) }
  if (subtype === 'pg_catalog.int8') return { kind: 'Int8', value: BigInt(value) }
  if (subtype === 'pg_catalog."timestamp"') return { kind: 'Timestamp', value: BigInt(value) }
  if (subtype === 'pg_catalog.timestamptz') return { kind: 'Timestamptz', value: BigInt(value) }
  if (subtype === 'pg_catalog."numeric"') return { kind: 'Numeric', value }
  throw new Error('Unsupported range fixture subtype: ' + subtype)
}

export async function readRangeFixture(
  pg: PGlite,
  select: string,
  name: string,
  type: RangeType,
  parameters: unknown[] = [],
): Promise<RangeInputPayload | null> {
  const metadata = rangeTypeProfile(type)!
  const column = '"' + name.replaceAll('"', '""') + '"'
  const row = (
    await pg.query<{
      is_null: boolean
      empty: boolean
      lower_inc: boolean
      upper_inc: boolean
      lo: string | null
      hi: string | null
    }>(
      `SELECT ${column} IS NULL AS is_null,isempty(${column}) AS empty,lower_inc(${column}) AS lower_inc,upper_inc(${column}) AS upper_inc,
    ${rangeBoundProjection(`lower(${column})`, metadata.elementType)} AS lo,
    ${rangeBoundProjection(`upper(${column})`, metadata.elementType)} AS hi FROM (${select}) candidate`,
      parameters,
    )
  ).rows[0]!
  if (row.is_null) return null
  const bounds: RangeInputCell[] = []
  if (!row.empty)
    for (const [upper, text] of [
      [false, row.lo],
      [true, row.hi],
    ] as const) {
      const nativeSelect = `SELECT ${upper ? 'upper' : 'lower'}(${column}) value FROM (${select}) candidate`,
        nestedRange = rangeTypeProfile(metadata.elementType),
        nestedMulti = multirangeTypeProfile(metadata.elementType)
      if (text === null) bounds.push({ kind: 'Null' })
      else if (nestedRange)
        bounds.push({
          kind: 'Range',
          value: (await readRangeFixture(
            pg,
            nativeSelect,
            'value',
            nestedRange.rangeType,
            parameters,
          ))!,
        })
      else if (nestedMulti)
        bounds.push({
          kind: 'Multirange',
          value: (await readMultirangeQueryFixture(
            pg,
            nestedMulti.multirangeType,
            nativeSelect,
            'value',
            parameters,
          ))!,
        })
      else if (metadata.elementType.startsWith('array:'))
        bounds.push({
          kind: 'Array',
          value: (await readArrayBoundQueryFixture(
            pg,
            metadata.elementType,
            metadata.subtype,
            nativeSelect,
            'value',
            parameters,
          ))!,
        })
      else if (compositeProfile(metadata.elementType)) {
        const payload = await readCompositeFixture(
          pg,
          `SELECT ${upper ? 'upper' : 'lower'}(${column}) value FROM (${select}) candidate`,
          'value',
          metadata.elementType,
          parameters,
        )
        bounds.push(payload === null ? { kind: 'Null' } : { kind: 'Composite', value: payload })
      } else bounds.push(await readRangeBoundCell(pg, metadata.elementType, text, metadata.subtype))
    }
  return {
    typeName: metadata.identity,
    elementType: metadata.subtype,
    elementKind: arrayElementFamily(metadata.elementType)!,
    ...(rangeContainerKind(metadata.elementType)
      ? {
          boundProfile: {
            nodes: rangeBoundProfiles(metadata, { defaultCollation: 'C', serverEncoding: 'UTF8' })!,
          },
        }
      : {}),
    ...(metadata.subtypeEnum
      ? {
          enumLabels: metadata.subtypeEnum.values.join('\0'),
          enumCount: metadata.subtypeEnum.values.length,
        }
      : {}),
    empty: row.empty,
    lowerInclusive: row.lower_inc,
    upperInclusive: row.upper_inc,
    bounds,
  }
}
