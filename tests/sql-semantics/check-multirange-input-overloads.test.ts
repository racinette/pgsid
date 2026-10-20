import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('resolves untyped multirange literals consistently in operators, functions and selection', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-input-overloads-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).map((m, i) => ({
      m,
      table: 'multi_input_overload_' + i,
      sql: `payload @> '{}' AND '{}' <@ payload AND payload+'{}'=payload AND multirange_union(payload,'{}')=payload AND greatest(payload,'{}')=payload AND ${m.multirange}('{}')='{}' AND NULLIF(payload,'{}') IS NOT NULL`,
    }))
    for (const f of forms)
      await pg.exec(`CREATE TABLE ${f.table}(payload ${f.m.multirange},CHECK(${f.sql}))`)
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return ['source', 'stored'].map((mode) => {
          const plan = lowerTableCheck(
            table,
            mode === 'source'
              ? { name: 'overload', type: 'check', definition: `CHECK(${f.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            mode as 'source' | 'stored',
          )!
          expect(hasUncertain(plan.expression), f.table + '/' + mode).toBe(false)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: f.table,
              constraint: mode,
            },
            expression: portableCheckAtoms(plan.expression),
          }
        })
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const f of forms)
      for (const text of [null, '{}', '{(,)}']) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ result: boolean | null }>(
              `INSERT INTO ${f.table} VALUES($1) RETURNING (${f.sql}) result`,
              [text],
            )
          ).rows[0]!.result
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (e) {
          expect(e).toMatchObject({ code: '23514' })
          expected = { kind: 'False' }
        }
        const payload = await readMultirangeFixture(pg, f.m.multirange, text),
          row: Row = { payload: payload ? { kind: 'Value', value: payload } : { kind: 'Null' } }
        for (const mode of ['source', 'stored'])
          fixtures.push({ name: f.table + '_' + mode, row, expected })
        inserts++
      }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangeinputoverloads',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.table + '_' + mode)),
      fixtures,
    )
    expect(inserts).toBe(18)
    expect(fixtures).toHaveLength(36)
    await mkdir('artifacts/check-multirange-input', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-input/overload-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          untypedOperatorPreference: true,
          functionInference: true,
          typeNameInput: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
