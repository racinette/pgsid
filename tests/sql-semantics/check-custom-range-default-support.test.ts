import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { catalogRangeType } from '../../src/sql-semantics/catalog-check-binder.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'

it('uses captured custom default operator classes for arrays and defers only reached user callbacks', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-default-support-'))
  try {
    await pg.exec('CREATE TYPE alternate AS RANGE(subtype=int4)')
    const functions = [
      ['lt', 'range_lt', '#<#'],
      ['le', 'range_le', '#<=#'],
      ['eq', 'range_eq', '#=#'],
      ['ge', 'range_ge', '#>=#'],
      ['gt', 'range_gt', '#>#'],
    ] as const
    for (const [name, implementation, operator] of functions)
      await pg.exec(
        `CREATE FUNCTION my_${name}(alternate,alternate) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT ${implementation}($1,$2)';CREATE OPERATOR ${operator}(LEFTARG=alternate,RIGHTARG=alternate,FUNCTION=my_${name});`,
      )
    await pg.exec(`CREATE FUNCTION my_cmp(alternate,alternate) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT range_cmp($1,$2)';
   CREATE FUNCTION my_hash(alternate) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT hash_range($1)';
   CREATE FUNCTION my_hash64(alternate,int8) RETURNS int8 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT hash_range_extended($1,$2)';
   CREATE OPERATOR CLASS alt_order DEFAULT FOR TYPE alternate USING btree AS OPERATOR 1 #<#,OPERATOR 2 #<=#,OPERATOR 3 #=#,OPERATOR 4 #>=#,OPERATOR 5 #>#,FUNCTION 1 my_cmp(alternate,alternate);
   CREATE OPERATOR CLASS alt_hash DEFAULT FOR TYPE alternate USING hash AS OPERATOR 1 #=#,FUNCTION 1 my_hash(alternate),FUNCTION 2 my_hash64(alternate,int8);
   CREATE DOMAIN alt_cell AS alternate;`)
    const forms = Object.entries({
      eq: 'a=a',
      order: 'a<=a',
      sort: 'array_sort(a)=a',
      hash: 'hash_array(a) IS NOT DISTINCT FROM expected32',
      extended: 'hash_array_extended(a,seed) IS NOT DISTINCT FROM expected64',
      domain: 'hash_array(a::alt_cell[]) IS NOT DISTINCT FROM expected32',
      direct: 'hash_range(a[1]) IS NOT DISTINCT FROM expected_direct',
    }).map(([name, body]) => ({
      name,
      table: 'custom_default_' + name,
      sql: `CASE WHEN bypass THEN true ELSE ${body} END`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(a alternate[],seed int8,expected32 int4,expected64 int8,expected_direct int4,bypass bool,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      profile = catalog.rangeTypes[0]!,
      type = catalogRangeType(profile.identity, undefined, catalog.domains, catalog.rangeTypes)!
    expect(profile).toMatchObject({
      rangeEquality: 'operator:["public","#=#"](public.alternate,public.alternate)',
      rangeComparator: 'function:["public","my_cmp"](public.alternate,public.alternate)',
      rangeHash: 'function:["public","my_hash"](public.alternate)',
      rangeHashExtended: 'function:["public","my_hash64"](public.alternate,pg_catalog.int8)',
    })
    const plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: f.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { name: 'valid', type: 'check', definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression,
          ),
        }))
      }),
      names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      group = prepareCheckRustGroup(plans)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const text of [
      null,
      '{}',
      rangeArrayText([null]),
      rangeArrayText(['[1,3)']),
      rangeArrayText(['[1,3)', '[3,5)']),
    ]) {
      const a = await readRangeArrayFixture(pg, type, text)
      for (const seed of [null, 0n, -1n]) {
        const hashes = (
          await pg.query<{ h: number | null; wide: string | null; direct: number | null }>(
            `SELECT hash_array(a) AS h,hash_array_extended(a,$2::int8)::text AS wide,hash_range(a[1]) AS direct FROM(SELECT $1::alternate[] a)inputs`,
            [text, seed?.toString() ?? null],
          )
        ).rows[0]!
        for (const bypass of [false, true])
          for (const [i, f] of forms.entries()) {
            const native = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${f.sql})AS value FROM(SELECT $1::alternate[] a,$2::int8 seed,$3::int4 expected32,$4::int8 expected64,$5::int4 expected_direct,$6::bool bypass)inputs`,
                [text, seed?.toString() ?? null, hashes.h, hashes.wide, hashes.direct, bypass],
              )
            ).rows[0]!.value
            await pg.query(`INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6)`, [
              text,
              seed?.toString() ?? null,
              hashes.h,
              hashes.wide,
              hashes.direct,
              bypass,
            ])
            const contains = a?.elements.some((c) => c.kind === 'Range'),
              needsCallback =
                f.name === 'direct'
                  ? false
                  : ['eq', 'order'].includes(f.name)
                    ? contains
                    : f.name === 'sort'
                      ? contains
                      : contains && !(f.name === 'extended' && seed === null)
            const expected: Outcome =
                !bypass && needsCallback
                  ? { kind: 'Unknown' }
                  : { kind: native === null ? 'Null' : native ? 'True' : 'False' },
              row: Row = {
                a: a ? { kind: 'Value', value: a } : { kind: 'Null' },
                seed: seed === null ? { kind: 'Null' } : { kind: 'Value', value: seed },
                expected32:
                  hashes.h === null ? { kind: 'Null' } : { kind: 'Value', value: hashes.h },
                expected64:
                  hashes.wide === null
                    ? { kind: 'Null' }
                    : { kind: 'Value', value: BigInt(hashes.wide) },
                expected_direct:
                  hashes.direct === null
                    ? { kind: 'Null' }
                    : { kind: 'Value', value: hashes.direct },
                bypass: { kind: 'Value', value: bypass },
              }
            for (const origin of [0, 1])
              fixtures.push({ name: names[i * 2 + origin]!, row, expected })
          }
      }
    }
    await runCheckParity(directory, 'customdefaultsupport', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('classifies incompatible default equality and hash classes as a runtime type-cache requirement', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('CREATE TYPE incompatible AS RANGE(subtype=int4)')
    const functions = [
      ['lt', 'range_lt', '#<#'],
      ['le', 'range_le', '#<=#'],
      ['eq', 'range_eq', '#=#'],
      ['ge', 'range_ge', '#>=#'],
      ['gt', 'range_gt', '#>#'],
    ] as const
    for (const [name, implementation, operator] of functions)
      await pg.exec(
        `CREATE FUNCTION my_${name}(incompatible,incompatible) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT ${implementation}($1,$2)';CREATE OPERATOR ${operator}(LEFTARG=incompatible,RIGHTARG=incompatible,FUNCTION=my_${name});`,
      )
    await pg.exec(
      `CREATE FUNCTION my_cmp(incompatible,incompatible) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT range_cmp($1,$2)';CREATE OPERATOR CLASS incompatible_order DEFAULT FOR TYPE incompatible USING btree AS OPERATOR 1 #<#,OPERATOR 2 #<=#,OPERATOR 3 #=#,OPERATOR 4 #>=#,OPERATOR 5 #>#,FUNCTION 1 my_cmp(incompatible,incompatible);`,
    )
    expect((await pg.query(`SELECT hash_array('{}'::incompatible[]) AS first`)).rows[0]).toEqual({
      first: 1,
    })
    expect(
      (
        await pg.query(
          `SELECT ARRAY['[1,3)'::incompatible]=ARRAY['[1,3)'::incompatible] AS compared`,
        )
      ).rows[0],
    ).toEqual({ compared: true })
    await expect(pg.query(`SELECT hash_array('{}'::incompatible[])`)).rejects.toMatchObject({
      code: '42883',
    })
    await pg.exec(
      `CREATE TABLE incompatible_source(a incompatible[],v incompatible,CHECK(hash_array(a)=0),CHECK(hash_range(v)=0),CHECK(range_send(v)IS NULL))`,
    )
    const catalog = await snapshotCatalog(pg),
      profile = catalog.rangeTypes[0]!,
      table = catalog.tables[0]!
    expect(profile).toMatchObject({
      rangeHashEqualityCompatible: false,
      subtypeHashEqualityCompatible: true,
      rangeHash: 'function:["pg_catalog","hash_range"](pg_catalog.anyrange)',
    })
    for (const check of table.constraints) {
      const prepared = prepareCheckRustGroup([
        {
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: check.name },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              check,
              catalog.enums,
              catalog.domains,
              'stored',
              catalog.rangeTypes,
            )!.expression,
          ),
        },
      ]).checks[0]!
      if (check.definition.includes('hash_array')) {
        expect(prepared.kind).toBe('unsupported')
        if (prepared.kind === 'unsupported') expect(prepared.reason).toContain('runtime type-cache')
      } else expect(prepared.kind).toBe('supported')
    }
  } finally {
    await pg.close()
  }
}, 30_000)
