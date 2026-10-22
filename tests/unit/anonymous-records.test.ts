import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  anonymousRecordType,
  anonymousRecordProfile,
  commonAnonymousRecordType,
  canRelabelAnonymousRecords,
} from '../../src/sql-semantics/anonymous-records.js'
import {
  arrayElementFamily,
  arrayElementIdentity,
} from '../../src/codegen/shared/check-array-types.js'
import { catalogScalarType } from '../../src/sql-semantics/expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'

it('distinguishes unresolved NULL records, empty rows and unknown fields while preserving independent descriptors', () => {
  const empty = anonymousRecordType([]),
    text = anonymousRecordType([{ type: 'pg_catalog.text' }]),
    unknown = anonymousRecordType([{ type: 'pg_catalog.text', unknown: true }])
  expect(anonymousRecordProfile('anonymous-record:[]')).toEqual([])
  expect(anonymousRecordProfile(empty)).toHaveLength(1)
  expect(anonymousRecordProfile(empty)![0]!.fields).toHaveLength(0)
  expect(text).not.toBe(unknown)
  const collated = anonymousRecordType([{ type: 'pg_catalog.text', collation: 'C' }])
  expect(collated).not.toBe(text)
  expect(anonymousRecordProfile(collated)![0]!.fields[0]!.collation).toBe('C')
  const fields = [{ type: 'pg_catalog.int4' as const }],
    type = anonymousRecordType(fields)
  fields.push({ type: 'pg_catalog.int4' })
  expect(anonymousRecordProfile(type)![0]!.fields).toHaveLength(1)
  const first = anonymousRecordProfile(type)!,
    second = anonymousRecordProfile(type)!
  expect(first).toEqual(second)
  expect(first[0]!.fields).not.toBe(second[0]!.fields)
  expect(catalogScalarType(type)).toBe(type)
  expect(arrayElementFamily(type)).toBe(44)
  expect(arrayElementIdentity(type)).toBe('pg_catalog.record')
})

it('unions layouts independently of arm order without narrowing or coercing their fields', () => {
  const number = anonymousRecordType([{ type: 'pg_catalog.int4' }]),
    text = anonymousRecordType([{ type: 'pg_catalog.text' }]),
    empty = anonymousRecordType([])
  const union = commonAnonymousRecordType([number, text, number, 'anonymous-record:[]'])!
  expect(union).toBe(commonAnonymousRecordType([text, number]))
  expect(anonymousRecordProfile(union)).toHaveLength(2)
  expect(canRelabelAnonymousRecords(number, union)).toBe(true)
  expect(canRelabelAnonymousRecords(union, number)).toBe(false)
  expect(canRelabelAnonymousRecords(empty, union)).toBe(false)
  expect(canRelabelAnonymousRecords('anonymous-record:[]', union)).toBe(true)
  expect(canRelabelAnonymousRecords('array:' + number, 'array:' + union)).toBe(true)
  expect(canRelabelAnonymousRecords('array:' + number, union)).toBe(false)
  expect(commonAnonymousRecordType(['array:' + number, 'array:' + text])).toBe('array:' + union)
  expect(commonAnonymousRecordType([number, 'pg_catalog.int4'])).toBeNull()
  expect(commonAnonymousRecordType([])).toBeNull()
})

it('rejects malformed layouts and enum descriptors containing deployment OIDs', () => {
  for (const value of [
    '',
    'anonymous-record:null',
    'anonymous-record:{}',
    'anonymous-record:[null]',
    'anonymous-record:[[{}]]',
    'anonymous-record:[[{"type":""}]]',
    'anonymous-record:[[{"type":"pg_catalog.text","unknown":false}]]',
    'anonymous-record:[[{"type":"pg_catalog.text","collation":"en_US"}]]',
    'anonymous-record:[[{"type":"pg_catalog.text","collation":null}]]',
    'anonymous-record:[[{"type":"enum:x","enum":{"schema":"public","name":"phase","values":["x"],"oid":1}}]]',
  ])
    expect(anonymousRecordProfile(value), value).toBeNull()
})

it('keeps nested descriptors structured instead of repeatedly escaping child type strings', () => {
  let type = anonymousRecordType([{ type: 'pg_catalog.int4' }])
  for (let depth = 0; depth < 16; depth++) type = anonymousRecordType([{ type }])
  expect(type.length).toBeLessThan(2048)
  const outer = anonymousRecordProfile(type)![0]!
  expect(outer.fields).toHaveLength(1)
  expect(anonymousRecordProfile(outer.fields[0]!.type)).not.toBeNull()
  const array = anonymousRecordType([{ type: `array:${type}` }])
  expect(anonymousRecordProfile(array)![0]!.fields[0]!.type).toBe(`array:${type}`)
})

it('derives identical enum layouts across catalog OIDs and identifier settings', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  const ddl =
    "CREATE TYPE phase AS ENUM('z','a');CREATE TABLE gate(phase phase,CONSTRAINT valid CHECK(to_jsonb(ROW(phase)) IS NOT NULL));"
  try {
    await first.exec(ddl)
    await second.exec(
      "CREATE TYPE shifted AS ENUM('extra');" +
        ddl +
        'SET search_path=pg_catalog;SET quote_all_identifiers=on;',
    )
    const snapshots = await Promise.all([snapshotCatalog(first), snapshotCatalog(second)])
    expect(snapshots[0]!.enums.find((e) => e.name === 'phase')!.oid).not.toBe(
      snapshots[1]!.enums.find((e) => e.name === 'phase')!.oid,
    )
    const types = snapshots.map((c) => {
      const table = c.tables.find((t) => t.name === 'gate')!,
        constraint = table.constraints.find((c) => c.name === 'valid')!,
        expression = lowerTableCheck(
          table,
          constraint,
          c.enums,
          c.domains,
          'stored',
          c.rangeTypes,
          c.compositeTypeGraph,
        )!.expression
      const found = new Set<string>()
      const visit = (value: unknown): void => {
        if (typeof value === 'string' && value.startsWith('anonymous-record:')) found.add(value)
        else if (value && typeof value === 'object')
          for (const child of Object.values(value)) visit(child)
      }
      visit(expression)
      return [...found].sort()
    })
    expect(types[0]).toHaveLength(1)
    expect(types[0]).toEqual(types[1])
    expect(types[0]![0]).not.toContain('valueOids')
    expect(types[0]![0]).not.toContain('"oid":')
    expect(anonymousRecordProfile(types[0]![0]!)![0]!.fields[0]!.enum!.values).toEqual(['z', 'a'])
  } finally {
    await first.close()
    await second.close()
  }
}, 60_000)
