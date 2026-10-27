import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { quoteContext as full, quoteProfiles as profiles } from './check-quote-fixtures.js'

const packet = 'artifacts/goal-checks/concat-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('concatenates scalar and recursive values through raw type output', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-concat-'))
  try {
    await pg.exec(
      "SET lc_monetary='C';SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='postgres';SET bytea_output='hex';SET extra_float_digits=1;CREATE TYPE quote_label AS ENUM ('ready','done');CREATE DOMAIN quote_positive AS int CHECK(VALUE>0);CREATE TYPE quote_pair AS (score int,label text);CREATE TYPE quote_data AS (quantity float8,day date,data bytea);",
    )
    const forms = profiles.flatMap((profile, index) =>
      ['concat', 'concat_ws'].map((kind) => ({
        ...profile,
        name: 'concat_' + index + '_' + kind,
        output: `${kind}(${kind === 'concat_ws' ? "'|'::text," : ''}'prefix'::text,CASE WHEN use_value THEN (${profile.value})::${profile.type} ELSE NULL::${profile.type} END,''::text,NULL::int,'suffix'::text)`,
      })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(use_value bool,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression,
        })
      }
    const group = prepareCheckRustGroup(plans, full)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      for (const useValue of [true, false, null]) {
        const expected = (
          await pg.query<{ value: string | null }>(
            `SELECT ${form.output} value FROM (SELECT $1::bool use_value) args`,
            [useValue],
          )
        ).rows[0]!.value
        for (const wanted of new Set([expected, 'wrong', null])) {
          const valid = wanted === expected,
            insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,false)`, [useValue, wanted])
          if (valid) await insert
          else await expect(insert).rejects.toMatchObject({ code: '23514' })
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.name + '_' + origin,
              row: { use_value: known(useValue), expected: known(wanted), bypass: known(false) },
              expected:
                form.catalog && useValue === true
                  ? { kind: 'Unknown' }
                  : { kind: valid ? 'True' : 'False' },
            })
        }
        observations.push({ form: form.name, type: form.type, useValue, expected })
      }
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            use_value: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          forms: forms.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'text_concat', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)
