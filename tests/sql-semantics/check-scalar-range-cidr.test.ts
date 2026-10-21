import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { rangeProfileSupport } from '../../src/sql-semantics/range-profiles.js'
import { customRangeProfiles, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { invalidScalarRangeBounds } from './check-scalar-range-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('retains CIDR subtype-domain validation and output when captured comparison support is unavailable', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-cidr-range-context-'))
  try {
    await pg.exec(`CREATE DOMAIN cidr_bound AS cidr CHECK(VALUE<>CIDR '127.0.0.0/8');
      CREATE TYPE cidr_plain AS RANGE(subtype=cidr,multirange_type_name=cidr_plain_set);
      CREATE TYPE cidr_domain AS RANGE(subtype=cidr_bound,multirange_type_name=cidr_domain_set);`)
    const initial = await snapshotCatalog(pg),
      profiles = customRangeProfiles(initial)
    const forms = profiles.flatMap((p, index) =>
      Object.entries({
        scalar: 'v::text',
        multi: 'm::text',
        array: 'items::text',
        comparison: '(v=v)::text',
        input: `isempty(payload::${p.identity})::text`,
      }).map(([name, output]) => ({
        p,
        name,
        output,
        table: `cidr_boundary_${index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.p.identity},m ${f.p.multirange},items ${f.p.identity}[],payload text,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) =>
        [false, true].flatMap((missing) =>
          (['source', 'stored'] as const).map((origin) => {
            const table = catalog.tables.find((t) => t.name === f.table)!,
              ranges = catalog.rangeTypes.map((p) => (missing ? { ...p, comparator: null } : p))
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
                  ranges,
                )!.expression,
              ),
            }
          }),
        ),
      ),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const p of profiles) {
      expect(rangeProfileSupport(p)).toEqual({ comparison: 113, canonical: 1 })
      expect(rangeProfileSupport({ ...p, comparator: null })).toEqual({
        comparison: 100,
        canonical: 1,
      })
    }
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const f of forms)
      for (const text of [
        null,
        'empty',
        '(,)',
        '[10.0.0.1/32,::1/128]',
        '[2001:db8::/64,2001:db8::1/128]',
      ]) {
        const multi = text === null ? null : text === 'empty' ? '{}' : `{${text}}`,
          array = text === null ? null : rangeArrayText([text, null], -2),
          v = await readRangeFixture(pg, `SELECT $1::${f.p.identity} span`, 'span', f.p.rangeType, [
            text,
          ]),
          m = await readMultirangeFixture(pg, f.p.multirangeType, multi),
          items = await readRangeArrayFixture(pg, f.p.rangeType, array)
        for (const payload of [text, '[10.0.0.1/8,::1/128]', '[2001:db8::1/64,::1/128]']) {
          const expected = (
            await pg
              .query<{ value: string | null }>(
                `SELECT (${f.output}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.multirange} m,$3::${f.p.identity}[] items,$4::text payload)q`,
                [text, multi, array, payload],
              )
              .catch((error: { code: string }) => {
                expect(error.code).toBe('22P02')
                return { rows: [{ value: null }] }
              })
          ).rows[0]!.value
          for (const bypass of [false, true]) {
            const native = await nativeCustomRangeOutcome(
                pg,
                `SELECT (${f.sql}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.multirange} m,$3::${f.p.identity}[] items,$4::text payload,$5::text expected,$6::bool bypass)q`,
                [text, multi, array, payload, expected, bypass],
              ),
              row: Row = {
                v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                m: m === null ? { kind: 'Null' } : { kind: 'Value', value: m },
                items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                payload: cell(payload),
                expected: cell(expected),
                bypass: cell(bypass),
              }
            for (const missing of [false, true])
              for (const origin of ['source', 'stored']) {
                const deferred =
                  !bypass &&
                  missing &&
                  ((f.name === 'comparison' &&
                    text !== null &&
                    text !== 'empty' &&
                    text !== '(,)') ||
                    (f.name === 'input' &&
                      payload !== null &&
                      payload !== 'empty' &&
                      payload !== '(,)' &&
                      native.kind !== 'Error'))
                fixtures.push({
                  name: `${f.table}_${origin}_${missing}`,
                  row,
                  expected: deferred ? { kind: 'Unknown' } : native,
                })
              }
          }
        }
        if (
          v &&
          !v.empty &&
          v.bounds[0]?.kind === 'Network' &&
          ['scalar', 'multi', 'array'].includes(f.name)
        ) {
          for (const bad of invalidScalarRangeBounds(v.bounds[0], true))
            for (const missing of [false, true])
              for (const bypass of [false, true])
                for (const origin of ['source', 'stored']) {
                  const forged = {
                    ...structuredClone(v),
                    support: { comparison: 13, canonical: 1 },
                  }
                  forged.bounds[0] = bad
                  let input: Row = { v: { kind: 'Value', value: forged } }
                  if (f.name === 'multi') {
                    const broken = structuredClone(m!)
                    const member = broken.ranges[0]!
                    if (member.kind !== 'Value') throw new Error('Expected finite CIDR range')
                    member.value = forged
                    input = { m: { kind: 'Value', value: broken } }
                  }
                  if (f.name === 'array') {
                    const broken = structuredClone(items!)
                    const member = broken.elements[0]!
                    if (member.kind !== 'Range') throw new Error('Expected finite CIDR range')
                    member.value = forged
                    input = { items: { kind: 'Value', value: broken } }
                  }
                  fixtures.push({
                    name: `${f.table}_${origin}_${missing}`,
                    row: {
                      ...input,
                      expected: cell(text),
                      bypass: cell(bypass),
                    },
                    expected: { kind: bypass ? 'True' : 'Unknown' },
                  })
                }
        }
      }
    await runCheckParity(
      directory,
      'cidrrangecontext',
      group,
      plans.map((p) => `${p.identity.owner}_${p.identity.constraint}`),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
