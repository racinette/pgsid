import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const expressions = {
  same: 'pg_catalog.factorial(value_num) = recorded',
  wire: 'pg_catalog.numeric_send(pg_catalog.factorial(value_num)) = recorded_wire',
  scale: 'pg_catalog.scale(pg_catalog.factorial(value_num)) = 0',
  skipped: 'CASE WHEN skip THEN true ELSE pg_catalog.factorial(value_num) = recorded END',
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const defaults = (): Row => ({
  value_num: input(5n),
  recorded: input('120'),
  recorded_wire: input('00010000000000000078'),
  skip: input(false),
})
describe('numeric factorial', () => {
  it('preserves exact coefficients, zero scale, numeric bounds, NULL, error priority and lazy branches in all targets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-factorial-'))
    const pg = await PGlite.create()
    try {
      expect(
        builtinCallables().find(
          (fn) => fn.kind === 'function' && fn.rustName === 'sql__pg_catalog__factorial__tah6',
        ),
      ).toMatchObject({
        name: 'factorial',
        args: ['pg_catalog.int8'],
        result: 'pg_catalog."numeric"',
        strict: true,
        volatility: 'i',
      })
      await pg.exec(
        `CREATE TABLE factorial_checks (value_num bigint,recorded numeric,recorded_wire bytea,skip boolean,${Object.entries(
          expressions,
        )
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`,
      )
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'factorial_checks')!
      const names = Object.keys(expressions)
      const fixtureNames = names.flatMap((name) =>
        ['raw', 'stored'].map((form) => name + '_' + form),
      )
      const prepared = names.flatMap((name) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'raw'
              ? {
                  name,
                  type: 'check',
                  definition: `CHECK (${expressions[name as keyof typeof expressions]})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      )
      const group = prepareCheckRustGroup(prepared)
      for (const check of group.checks) expect(check.kind).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (row: Row, expected: Outcome, selected: string[] = names) => {
        for (const name of selected)
          for (const form of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      for (const value of [
        -9223372036854775808n,
        -1n,
        0n,
        1n,
        2n,
        5n,
        10n,
        20n,
        100n,
        1000n,
        32178n,
        9223372036854775807n,
        null,
      ]) {
        const row: Row = { ...defaults(), value_num: input(value) }
        let result: { value: string | null; wire: string | null; scale: number | null }
        try {
          result = (
            await pg.query<{ value: string | null; wire: string | null; scale: number | null }>(
              "SELECT factorial($1::bigint)::text value,encode(numeric_send(factorial($1::bigint)),'hex') wire,scale(factorial($1::bigint)) scale",
              [value === null ? null : String(value)],
            )
          ).rows[0]!
        } catch (failure) {
          expect((failure as { code: string }).code).toBe('22003')
          record(row, error('22003'))
          continue
        }
        expect(result.scale).toBe(value === null ? null : 0)
        row.recorded = input(result.value)
        row.recorded_wire = input(result.wire)
        record(row, { kind: result.value === null ? 'Null' : 'True' })
        if (result.value !== null) {
          record({ ...row, recorded: input('0'), recorded_wire: input('00') }, { kind: 'False' }, [
            'same',
            'wire',
            'skipped',
          ])
        }
      }
      // One full maximum result checks every decimal digit without repeating the expensive calculation.
      const maximum = (
        await pg.query<{ value: string }>('SELECT factorial(32177::bigint)::text value')
      ).rows[0]!.value
      expect(maximum.length).toBeGreaterThan(131000)
      expect(maximum.length).toBeLessThanOrEqual(131072)
      fixtures.push({
        name: 'same_raw',
        row: { ...defaults(), value_num: input(32177n), recorded: input(maximum) },
        expected: { kind: 'True' },
      })
      for (const state of [{ kind: 'Unknown' }, error('22012')] as Input[])
        record({ ...defaults(), value_num: state }, state as Outcome)
      record(
        { ...defaults(), value_num: { kind: 'Unknown' }, recorded: error('22003') },
        error('22003'),
        ['same', 'skipped'],
      )
      record(
        { ...defaults(), value_num: error('22012'), recorded: error('22003') },
        error('22012'),
        ['same', 'skipped'],
      )
      record(
        { ...defaults(), skip: input(true), value_num: error('22003'), recorded: error('22012') },
        { kind: 'True' },
        ['skipped'],
      )
      await runCheckParity(
        directory,
        'pgsid-numeric-factorial',
        group,
        fixtureNames,
        fixtures,
      ).catch(async (failure: { stdout?: string; stderr?: string }) => {
        await writeFile(
          '/tmp/pgsid-numeric-factorial-subprocess.log',
          (failure.stdout ?? '') + (failure.stderr ?? ''),
        )
        throw failure
      })
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 900000)
})
