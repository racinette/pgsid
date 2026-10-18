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
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'

const value = (input: boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('preserves canonical set results, exact selected numeric bounds, non-contiguous errors and lazy branches in Rust and both targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-set-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) =>
      [
        ['range_union', '+'],
        ['range_intersect', '*'],
        ['range_minus', '-'],
        ['range_merge', null],
      ].flatMap(([fn, operator]) =>
        (operator ? ['function', 'operator'] : ['function']).map((style) => {
          const expr = style === 'function' ? `${fn}(payload,other)` : `(payload ${operator} other)`
          const sql = [`(${expr}) IS NOT DISTINCT FROM expected`]
          if (metadata.subtype === 'pg_catalog."numeric"')
            for (const bound of ['lower', 'upper'])
              sql.push(`scale(${bound}(${expr})) IS NOT DISTINCT FROM scale(${bound}(expected))`)
          return {
            metadata,
            expr,
            fn,
            style,
            table: `range_set_${family}_${fn}_${style}`,
            sql: `CASE WHEN bypass THEN true ELSE ${sql.join(' AND ')} END`,
          }
        }),
      ),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.metadata.identity},other ${form.metadata.identity},expected ${form.metadata.identity},bypass boolean,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'check', type: 'check', definition: `CHECK(${form.sql})` }
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
    let inserts = 0,
      pairs = 0
    const errors = new Set<string>()
    for (const form of forms) {
      const { ranges } = rangeCoreSamples(form.metadata.identity)
      const indices: [number, number][] = ranges.flatMap(
        (_, i) =>
          [
            [i, 5],
            [5, i],
          ] as [number, number][],
      )
      for (let i = 5; i <= 8; i++) for (let j = 5; j <= 11; j++) indices.push([i, j])
      for (let i = 13; i < ranges.length; i++)
        for (let j = 13; j < ranges.length; j++) indices.push([i, j])
      const distinct = [
        ...new Map(indices.map(([i, j]) => [i + '/' + j, [i, j] as const])).values(),
      ]
      const payloads = await Promise.all(
        ranges.map((p) =>
          readRangeFixture(
            pg,
            `SELECT $1::${form.metadata.identity} span`,
            'span',
            form.metadata.identity,
            [p],
          ),
        ),
      )
      for (const [i, j] of distinct) {
        const payload = ranges[i]!,
          other = ranges[j]!
        let rendered: string | null = null,
          errorCode: string | null = null
        try {
          rendered = (
            await pg.query<{ rendered: string | null }>(
              `SELECT (${form.expr})::text rendered FROM (SELECT $1::${form.metadata.identity} payload,$2::${form.metadata.identity} other) q`,
              [payload, other],
            )
          ).rows[0]!.rendered
        } catch (error) {
          errorCode = (error as { code: string }).code
          expect(['22000', '22003', '22008']).toContain(errorCode)
          errors.add(errorCode)
        }
        pairs++
        const expectedRange = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [rendered],
        )
        for (const bypass of errorCode || i === 0 ? [false, true] : [false]) {
          let outcome: Outcome = { kind: 'True' }
          try {
            await pg.query(
              `INSERT INTO ${form.table} VALUES($1::${form.metadata.identity},$2::${form.metadata.identity},$3::${form.metadata.identity},$4)`,
              [payload, other, rendered, bypass],
            )
            expect(bypass ? null : errorCode).toBeNull()
          } catch (error) {
            const code = (error as { code: string }).code
            expect(code).toBe(errorCode)
            outcome = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          inserts++
          const row: Row = {
            payload: payloads[i] ? { kind: 'Value', value: payloads[i]! } : value(null),
            other: payloads[j] ? { kind: 'Value', value: payloads[j]! } : value(null),
            expected: expectedRange ? { kind: 'Value', value: expectedRange } : value(null),
            bypass: value(bypass),
          }
          for (const mode of ['source', 'stored'])
            fixtures.push({ name: form.table + '_' + mode, row, expected: outcome })
        }
      }
      const firstError: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
        secondError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      for (const [payload, other, expected] of [
        [{ kind: 'Unknown' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
        [firstError, secondError, firstError],
        [value(null), secondError, secondError],
        [{ kind: 'Unknown' }, value(null), { kind: 'True' }],
      ] as [Input, Input, Outcome][])
        for (const bypass of [false, true])
          for (const mode of ['source', 'stored'])
            fixtures.push({
              name: form.table + '_' + mode,
              row: { payload, other, expected: value(null), bypass: value(bypass) },
              expected: bypass ? { kind: 'True' } : expected,
            })
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangeset',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
      fixtures,
    )
    expect(errors).toContain('22000')
    expect(pairs).toBeGreaterThan(2000)
    await mkdir('artifacts/check-range-core', { recursive: true })
    await writeFile(
      'artifacts/check-range-core/set-report.json',
      JSON.stringify(
        {
          inserts,
          pairs,
          fixtures: fixtures.length,
          plans: plans.length,
          errors: [...errors].sort(),
          numericScales: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300000)
