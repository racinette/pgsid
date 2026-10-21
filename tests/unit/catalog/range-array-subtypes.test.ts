import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import {
  builtinTypeComparison,
  builtinTypeIO,
  builtinMetadata,
} from '../../../src/postgres/builtins/inventory.js'

it('captures array subtype identities and dependencies independently of deployment OIDs and retains reached element comparison errors', async () => {
  const a = await PGlite.create(),
    b = await PGlite.create()
  try {
    const schema = `CREATE SCHEMA "Range.Bags";
      CREATE TYPE "Range.Bags".stage AS ENUM('z','a');
      CREATE DOMAIN "Range.Bags".int_bag AS int4[];
      CREATE DOMAIN "Range.Bags".nested_bag AS "Range.Bags".int_bag;
      CREATE TYPE "Range.Bags".int_span AS RANGE(subtype=int4[]);
      CREATE TYPE "Range.Bags".text_span AS RANGE(subtype=text[],collation="C");
      CREATE TYPE "Range.Bags".enum_span AS RANGE(subtype="Range.Bags".stage[]);
      CREATE TYPE "Range.Bags".domain_span AS RANGE(subtype="Range.Bags".nested_bag);
      CREATE TYPE "Range.Bags".json_span AS RANGE(subtype=json[]);`
    await a.exec(schema)
    await b.exec('CREATE TABLE shifted(v text);DROP TABLE shifted;' + schema)
    const left = await snapshotCatalog(a),
      right = await snapshotCatalog(b)
    expect(left.enums[0]!.valueOids).not.toEqual(right.enums[0]!.valueOids)
    expect(left.rangeTypes).toEqual(right.rangeTypes)
    expect(left.rangeTypes).toHaveLength(5)
    for (const profile of left.rangeTypes) {
      expect(profile.comparator).toBe(builtinTypeComparison('pg_catalog.anyarray')!.comparator)
      expect(profile.subtypeOutput).toBe(builtinTypeIO('pg_catalog._int4')!.output)
      expect(profile.subtypeEnum).toBeUndefined()
      const definitions = new Map(
        profile.callResolution!.types.map((type) => [type.identity, type]),
      )
      let carrier = profile.subtype
      const seen = new Set<string>()
      while (definitions.get(carrier)?.base) {
        expect(seen.has(carrier)).toBe(false)
        seen.add(carrier)
        carrier = definitions.get(carrier)!.base!
      }
      const array = definitions.get(carrier)!
      expect(array.category).toBe('A')
      expect(array.element).not.toBeNull()
      expect(definitions.has(array.element!)).toBe(true)
      const input = builtinMetadata(profile.subtypeInput!)
      expect(input.kind).toBe('function')
      expect(input.name).toBe(profile.name === 'domain_span' ? 'domain_in' : 'array_in')
      expect(input.args).toEqual(['pg_catalog.cstring', 'pg_catalog.oid', 'pg_catalog.int4'])
      if (profile.name === 'enum_span') expect(array.element).toBe('"Range.Bags".stage')
    }
    const reference = async (sql: string) => (await a.query<{ value: string }>(sql)).rows[0]!.value
    expect(
      await reference(
        `SELECT "Range.Bags".int_span('[-2:-1]={1,2}'::int4[],'{3}'::int4[],'[]')::text value`,
      ),
    ).toBe('["[-2:-1]={1,2}",{3}]')
    expect(
      await reference(
        `SELECT "Range.Bags".enum_span('{z}'::"Range.Bags".stage[],'{a}'::"Range.Bags".stage[],'[]')::text value`,
      ),
    ).toBe('[{z},{a}]')
    for (const flags of ['[]', '()'])
      await expect(
        a.query(`SELECT "Range.Bags".json_span('{}'::json[],'{}'::json[],$1)`, [flags]),
      ).rejects.toMatchObject({ code: '42883' })
    expect(await reference(`SELECT "Range.Bags".json_span(NULL,NULL,'[]')::text value`)).toBe('(,)')
    expect(
      await reference(`SELECT "Range.Bags".json_span('{}'::json[],NULL,'[]')::text value`),
    ).toBe('[{},)')
    expect(
      await reference(`SELECT "Range.Bags".json_span(NULL,'{}'::json[],'[]')::text value`),
    ).toBe('(,{}]')
  } finally {
    await a.close()
    await b.close()
  }
})
