import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'

it('resolves unknown string literals to the concrete range for comparisons, NULLIF, extrema and simple CASE', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-comparison-literals-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) =>
      [
        "payload='empty'",
        `payload='${rangeCoreSamples(metadata.identity).ranges[5]}'`,
        "NULLIF(payload,'empty') IS NULL",
        "greatest(payload,'empty') IS NOT DISTINCT FROM payload",
        "least(payload,NULL,'(,)')=payload",
        "CASE payload WHEN 'empty' THEN false ELSE true END",
      ].map((expr, i) => ({ metadata, expr, table: `range_comparison_literal_${family}_${i}` })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.metadata.identity},CHECK(${form.expr}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'check', type: 'check', definition: `CHECK(${form.expr})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms)
      for (const payload of rangeCoreSamples(form.metadata.identity).ranges) {
        const range = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [payload],
        )
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ result: boolean | null }>(
              `INSERT INTO ${form.table} VALUES($1::${form.metadata.identity}) RETURNING (${form.expr}) result`,
              [payload],
            )
          ).rows[0]!.result
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (error) {
          expect((error as { code: string }).code).toBe('23514')
          expected = { kind: 'False' }
        }
        inserts++
        for (const mode of ['source', 'stored'])
          fixtures.push({
            name: form.table + '_' + mode,
            row: { payload: range ? { kind: 'Value', value: range } : { kind: 'Null' } },
            expected,
          })
      }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangecomparisonliteral',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
      fixtures,
    )
    await mkdir('artifacts/check-range-core', { recursive: true })
    await writeFile(
      'artifacts/check-range-core/literal-report.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, plans: plans.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
