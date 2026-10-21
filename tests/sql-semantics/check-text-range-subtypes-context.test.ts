import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { rangeProfileSupport } from '../../src/sql-semantics/range-profiles.js'
import { customRangeProfiles, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'

const literal = (text: string) => "'" + text.replaceAll("'", "''") + "'"
const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('preserves padded text bounds, name input requirements, stored literals and client-encoding deferrals across targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-textlike-range-context-'))
  try {
    await pg.exec(`CREATE DOMAIN padded_bound AS bpchar(3) CHECK(VALUE<>'bad');
   CREATE DOMAIN named_bound AS name CHECK(VALUE<>'bad');
   CREATE TYPE words_varchar AS RANGE(subtype=varchar,collation="C");
   CREATE TYPE words_bpchar AS RANGE(subtype=bpchar,collation="C");
   CREATE TYPE words_padded AS RANGE(subtype=padded_bound,collation="C");
   CREATE TYPE words_name AS RANGE(subtype=name);
   CREATE TYPE words_named AS RANGE(subtype=named_bound);`)
    const initial = await snapshotCatalog(pg),
      profiles = customRangeProfiles(initial),
      fixed = scalarRangeText('a', 'a ')
    const forms = profiles.flatMap((p, index) =>
      Object.entries({
        output: 'v::text',
        input: `(payload::${p.identity})::text`,
        equality: '(v=w)::text',
        wire: "encode(range_send(v),'hex')",
        hash: 'hash_range(v)::text',
        literal: `(${literal(fixed)}::${p.identity})::text`,
        array_literal: `(ARRAY[${literal(fixed)}::${p.identity},NULL])[1]::text`,
      }).map(([name, output]) => ({
        p,
        name,
        output,
        table: `textlike_boundary_${index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.p.identity},w ${f.p.identity},payload text,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) =>
        [false, true].flatMap((missing) =>
          (['source', 'stored'] as const).map((origin) => {
            const table = catalog.tables.find((t) => t.name === f.table)!
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: f.table,
                constraint: `${origin}_${missing}`,
              },
              expression: portableCheckAtoms(
                lowerTableCheck(
                  table,
                  origin === 'source'
                    ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
                    : table.constraints[0]!,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  missing
                    ? catalog.rangeTypes.map((p) => ({ ...p, comparator: null }))
                    : catalog.rangeTypes,
                )!.expression,
              ),
            }
          }),
        ),
      ),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
        arrayNulls: true,
      })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.owner + JSON.stringify(check)).toBe('supported')
    for (const p of profiles) {
      const comparison =
        p.elementType === 'pg_catalog.bpchar' ? 108 : p.elementType === 'pg_catalog.name' ? 208 : 8
      expect(rangeProfileSupport(p, { defaultCollation: 'C', serverEncoding: 'UTF8' })).toEqual({
        comparison,
        canonical: 1,
      })
      expect(
        rangeProfileSupport(
          { ...p, comparator: null },
          { defaultCollation: 'C', serverEncoding: 'UTF8' },
        ),
      ).toEqual({ comparison: p.elementType === 'pg_catalog.name' ? 200 : 0, canonical: 1 })
      expect(rangeProfileSupport(p).comparison).toBe(p.elementType === 'pg_catalog.name' ? 200 : 0)
    }
    const pairs: [string | null, string | null][] = [
      [null, null],
      ['empty', 'empty'],
      ['(,)', '(,)'],
      [fixed, scalarRangeText('a ', 'b')],
      [scalarRangeText('a', 'a ', '[)'), scalarRangeText('a', 'b')],
      [scalarRangeText('a ', 'a '), scalarRangeText('a', 'a')],
      [scalarRangeText('é', '雪'), scalarRangeText('é', '雪')],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const f of forms)
      for (const [vtext, wtext] of pairs) {
        const v = await readRangeFixture(
            pg,
            `SELECT $1::${f.p.identity} span`,
            'span',
            f.p.rangeType,
            [vtext],
          ),
          w = await readRangeFixture(pg, `SELECT $1::${f.p.identity} span`, 'span', f.p.rangeType, [
            wtext,
          ])
        for (const payload of [vtext, 'bad']) {
          let expected: string | null = null
          try {
            expected = (
              await pg.query<{ value: string | null }>(
                `SELECT (${f.output}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.identity} w,$3::text payload)q`,
                [vtext, wtext, payload],
              )
            ).rows[0]!.value
          } catch (error) {
            expect(error).toHaveProperty('code')
          }
          for (const wrong of [false, true])
            for (const bypass of [false, true]) {
              const label = wrong ? '!different!' : expected,
                native = await nativeCustomRangeOutcome(
                  pg,
                  `SELECT (${f.sql}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.identity} w,$3::text payload,$4::text expected,$5::bool bypass)q`,
                  [vtext, wtext, payload, label, bypass],
                )
              for (const missing of [false, true])
                for (const origin of ['source', 'stored']) {
                  const nameLiteral =
                    f.p.elementType === 'pg_catalog.name' &&
                    origin === 'source' &&
                    ['literal', 'array_literal'].includes(f.name)
                  const nameInput =
                    f.p.elementType === 'pg_catalog.name' &&
                    f.name === 'input' &&
                    payload !== null &&
                    !['empty', '(,)', 'bad'].includes(payload)
                  const wire =
                    f.name === 'wire' &&
                    v !== null &&
                    !v.empty &&
                    v.bounds.some(
                      (bound) => bound.kind === 'Text' && /[^\x00-\x7f]/u.test(bound.value),
                    )
                  const missingLiteral =
                    missing && origin === 'source' && ['literal', 'array_literal'].includes(f.name)
                  const missingInput =
                    missing &&
                    f.name === 'input' &&
                    payload !== null &&
                    !['empty', '(,)', 'bad'].includes(payload)
                  const missingComparison =
                    missing &&
                    f.name === 'equality' &&
                    v !== null &&
                    w !== null &&
                    !v.empty &&
                    !w.empty &&
                    v.bounds.some((b) => b.kind !== 'Null')
                  fixtures.push({
                    name: `${f.table}_${origin}_${missing}`,
                    row: {
                      v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                      w: w === null ? { kind: 'Null' } : { kind: 'Value', value: w },
                      payload: cell(payload),
                      expected: cell(label),
                      bypass: cell(bypass),
                    },
                    expected:
                      nameLiteral ||
                      missingLiteral ||
                      (!bypass && (nameInput || wire || missingInput || missingComparison))
                        ? { kind: 'Unknown' }
                        : native,
                  })
                }
            }
        }
      }
    await runCheckParity(
      directory,
      'textlikerangecontext',
      group,
      plans.map((p) => `${p.identity.owner}_${p.identity.constraint}`),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
