import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { comparableStates, diffCatalogs } from '../../../src/catalog/diff.js'
import { readCatalogRangeTypes, readRangeTypes } from '../../../src/postgres/range-types.js'

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const labels = ['z', 'a', '', 'comma,[]', 'quote"slash\\', 'é']
const ddl = `CREATE SCHEMA "Enum.Meta";CREATE SCHEMA "Enum.Other";
CREATE TYPE "Enum.Meta"."Stage.Mode" AS ENUM(${labels.map(literal).join(',')});
CREATE TYPE "Enum.Other"."Stage.Mode" AS ENUM('a','z');
CREATE DOMAIN "Enum.Meta"."Wrapped Mode" AS "Enum.Meta"."Stage.Mode" NOT NULL CHECK(VALUE<>'');
CREATE DOMAIN "Enum.Meta"."Nested Mode" AS "Enum.Meta"."Wrapped Mode" CHECK(VALUE::"Enum.Meta"."Stage.Mode"<>'comma,[]'::"Enum.Meta"."Stage.Mode");
CREATE TYPE "Enum.Meta".enum_window AS RANGE(subtype="Enum.Meta"."Stage.Mode");
CREATE TYPE "Enum.Meta".domain_window AS RANGE(subtype="Enum.Meta"."Nested Mode");
CREATE TYPE "Enum.Meta".second_window AS RANGE(subtype="Enum.Other"."Stage.Mode");
CREATE TYPE "Enum.Meta".empty_enum AS ENUM();
CREATE TYPE "Enum.Meta".empty_window AS RANGE(subtype="Enum.Meta".empty_enum);
CREATE TYPE "Enum.Meta".array_window AS RANGE(subtype="Enum.Meta"."Stage.Mode"[]);`

it('captures enum range labels through domain chains in catalog order independently of numeric identities and search paths', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    const initialize = async (pg: PGlite) => {
      await pg.exec(ddl)
      await pg.exec(`ALTER TYPE "Enum.Meta"."Stage.Mode" ADD VALUE 'mid' BEFORE 'a'`)
      await pg.exec(
        `CREATE TABLE "Enum.Meta".limits(v "Enum.Meta".enum_window,CONSTRAINT contains_mid CHECK(v @> 'mid'::"Enum.Meta"."Stage.Mode"))`,
      )
    }
    await initialize(first)
    await second.exec('CREATE TABLE allocation_shift(value integer);DROP TABLE allocation_shift')
    await initialize(second)
    const native = async (pg: PGlite) => ({
      labels: (
        await pg.query<{ label: string; oid: number }>(
          `SELECT enumlabel label,oid FROM pg_enum WHERE enumtypid='"Enum.Meta"."Stage.Mode"'::regtype ORDER BY enumsortorder`,
        )
      ).rows,
      hash: (
        await pg.query<{ value: number }>(
          `SELECT hash_range('["z","a"]'::"Enum.Meta".enum_window) value`,
        )
      ).rows[0]!.value,
    })
    const a = await native(first),
      b = await native(second)
    expect(a.labels.map((entry) => entry.oid)).not.toEqual(b.labels.map((entry) => entry.oid))
    expect(a.hash).not.toBe(b.hash)
    expect(a.labels.find((entry) => entry.label === 'mid')!.oid).toBeGreaterThan(
      a.labels.find((entry) => entry.label === 'a')!.oid,
    )
    const expected = {
      schema: 'Enum.Meta',
      name: 'Stage.Mode',
      values: ['z', 'mid', ...labels.slice(1)],
    }
    await first.exec(`SET search_path='Enum.Other','Enum.Meta',public`)
    const before = (await first.query('SHOW search_path')).rows
    const left = await snapshotCatalog(first),
      right = await snapshotCatalog(second)
    expect((await first.query('SHOW search_path')).rows).toEqual(before)
    expect(left.rangeTypes).toEqual(right.rangeTypes)
    const plain = left.rangeTypes.find((profile) => profile.name === 'enum_window')!,
      domain = left.rangeTypes.find((profile) => profile.name === 'domain_window')!
    expect(plain.subtypeEnum).toEqual(expected)
    expect(domain.subtypeEnum).toEqual(expected)
    expect(domain.subtype).toBe('"Enum.Meta"."Nested Mode"')
    expect(domain.subtypeInput).toBe(
      'function:["pg_catalog","domain_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    )
    expect(plain.comparator).toBe(
      'function:["pg_catalog","enum_cmp"](pg_catalog.anyenum,pg_catalog.anyenum)',
    )
    expect(
      left.rangeTypes.find((profile) => profile.name === 'second_window')!.subtypeEnum,
    ).toEqual({ schema: 'Enum.Other', name: 'Stage.Mode', values: ['a', 'z'] })
    expect(left.rangeTypes.find((profile) => profile.name === 'empty_window')!.subtypeEnum).toEqual(
      { schema: 'Enum.Meta', name: 'empty_enum', values: [] },
    )
    expect(left.rangeTypes.find((profile) => profile.name === 'array_window')).not.toHaveProperty(
      'subtypeEnum',
    )
    expect(
      (comparableStates(left).get('Enum.Meta.enum_window') as { subtypeEnum: unknown }).subtypeEnum,
    ).toEqual(expected)
    expect(diffCatalogs(left, right)).toEqual({ added: [], removed: [], modified: [] })
    const reread = await readCatalogRangeTypes(first, ['Enum.Meta'])
    expect(reread).toEqual(left.rangeTypes)
    const legacy = await readRangeTypes(first, 'Enum.Meta')
    expect(
      legacy.every((profile) =>
        Object.values(profile).every((value) => value === null || typeof value === 'string'),
      ),
    ).toBe(true)
    let accepted = 0,
      rejected = 0
    for (const [value, valid] of [
      ['["z","a"]', true],
      ['["a","é"]', false],
      ['empty', false],
      [null, true],
    ] as const) {
      if (valid) {
        await first.query('INSERT INTO "Enum.Meta".limits(v) VALUES($1)', [value])
        accepted++
      } else {
        await expect(
          first.query('INSERT INTO "Enum.Meta".limits(v) VALUES($1)', [value]),
        ).rejects.toMatchObject({ code: '23514' })
        rejected++
      }
    }
    await expect(
      first.query('SELECT $1::"Enum.Meta".domain_window', ['["","a"]']),
    ).rejects.toMatchObject({ code: '23514' })
    const copied = JSON.parse(JSON.stringify(left.rangeTypes))
    expect(copied).toEqual(left.rangeTypes)
    await first.exec(`ALTER TYPE "Enum.Meta"."Stage.Mode" ADD VALUE 'late' BEFORE 'a'`)
    const changed = await snapshotCatalog(first)
    expect(
      changed.rangeTypes.find((profile) => profile.name === 'domain_window')!.subtypeEnum!.values,
    ).toEqual(['z', 'mid', 'late', ...labels.slice(1)])
    expect(domain.subtypeEnum).toEqual(expected)
    expect(comparableStates(changed).get('Enum.Meta.enum_window')).not.toEqual(
      comparableStates(left).get('Enum.Meta.enum_window'),
    )
    await mkdir('artifacts/enum-range-catalog', { recursive: true })
    await writeFile(
      'artifacts/enum-range-catalog/report.json',
      JSON.stringify(
        {
          profiles: left.rangeTypes.length,
          accepted,
          rejected,
          domainInputRejections: 1,
          independentCatalogs: true,
          labels: expected,
          oracle: { first: a, second: b },
          emittedEnumMetadata: left.rangeTypes.flatMap((profile) =>
            profile.subtypeEnum ? [profile.subtypeEnum] : [],
          ),
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await first.close()
    await second.close()
  }
}, 120_000)
