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

it('keeps nested SQL text input separate from the outer JSON field value', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-strings-')),
    packet = 'artifacts/goal-checks/json-populate-active'
  try {
    await pg.exec(
      'CREATE TYPE inner_json AS(j jsonb);CREATE TYPE outer_json AS(v inner_json);CREATE TYPE outer_array AS(v jsonb[])',
    )
    const forms = ['outer_json', 'outer_array'].flatMap((type) =>
      ['json_populate_record', 'jsonb_populate_record'].map((fn) => {
        const name = type + '_' + fn,
          expression = `to_jsonb((pg_catalog.${fn}(NULL::${type},data::${fn === 'json_populate_record' ? 'json' : 'jsonb'})).v) IS NOT DISTINCT FROM expected::jsonb`
        return { type, fn, name, expression }
      }),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(data text,expected text,CONSTRAINT populated CHECK(${f.expression}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const f of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === f.name)!,
          lower = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${f.expression})` : undefined,
          )!
        expect(hasUncertain(lower.expression)).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: f.name,
            constraint: f.name + '_' + origin,
          },
          expression: portableCheckAtoms(lower.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.constraint + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const f of forms)
      for (const value of ['{"a":1}', '"hello"']) {
        const base =
            f.type === 'outer_json' ? 'ROW($1::jsonb)::inner_json' : 'ARRAY[$1::jsonb,NULL]',
          values = (
            await pg.query<{ data: string; expected: string }>(
              `SELECT json_build_object('v',(${base})::text)::text data,to_jsonb(${base})::text expected`,
              [value],
            )
          ).rows[0]!
        expect(
          (
            await pg.query<{ result: boolean }>(
              `WITH args AS MATERIALIZED(SELECT $1::text data,$2::text expected)SELECT ${f.expression} result FROM args`,
              [values.data, values.expected],
            )
          ).rows[0]!.result,
        ).toBe(true)
        for (const origin of ['source', 'stored']) {
          const name = f.name + '_' + origin
          fixtures.push({
            name,
            row: {
              data: { kind: 'Value', value: values.data },
              expected: { kind: 'Value', value: values.expected },
            },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name,
            row: {
              data: { kind: 'Value', value: values.data },
              expected: { kind: 'Value', value: 'false' },
            },
            expected: { kind: 'False' },
          })
        }
        observations.push({ form: f.name, value, ...values })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/strings-summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await runCheckParity(
      directory,
      'json_populate_strings',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})
