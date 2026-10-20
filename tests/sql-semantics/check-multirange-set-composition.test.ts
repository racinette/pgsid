import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { readRangeArrayFixture } from './check-range-array-fixtures.js'
const value = (x: boolean | number | null): Input =>
  x === null ? { kind: 'Null' } : { kind: 'Value', value: x }

it('prepares constant set errors and composes runtime sets, hulls, selection and checked domains lazily', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-set-composition-'))
  try {
    await pg.exec(
      'CREATE DOMAIN set_bounded AS int4multirange CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL)',
    )
    const forms = [
      ['constant_union', 'payload+int4multirange(VARIADIC ARRAY[NULL::int4range])'],
      ['constant_intersection', 'payload*int4multirange(VARIADIC ARRAY[NULL::int4range])'],
      ['constant_difference', 'payload-int4multirange(int4range(1,3/0))'],
      ['runtime_union', 'payload+int4multirange(VARIADIC spans)'],
      ['runtime_hull', 'range_merge(int4multirange(int4range(1,3/divisor)))'],
      ['checked_result', '(payload-other)::set_bounded'],
      ['selection', 'greatest(NULLIF(payload-other,payload*other),COALESCE(other,payload))'],
    ].map(([name, expr]) => ({
      name: name!,
      expr: expr!,
      sql: `CASE WHEN bypass THEN true ELSE isempty(${expr}) IS NOT DISTINCT FROM expected END`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(payload int4multirange,other int4multirange,spans int4range[],divisor integer,expected boolean,bypass boolean,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.name)!
        return ['source', 'stored'].map((mode) => {
          const plan = lowerTableCheck(
            table,
            mode === 'source'
              ? { name: 'prepared', type: 'check', definition: `CHECK(${f.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            mode as 'source' | 'stored',
          )!
          expect(hasUncertain(plan.expression), f.name + '/' + mode).toBe(false)
          return {
            identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: mode },
            expression: portableCheckAtoms(plan.expression),
          }
        })
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const cases: [string | null, string | null, string | null, number][] = [
      [null, null, null, 0],
      ['{}', '{}', '{}', 1],
      ['{(,)}', '{}', '{"[1,3)"}', 1],
      ['{[1,7)}', '{[3,4),[5,6)}', '{NULL}', 0],
    ]
    const inputs = await Promise.all(
      cases.map(async ([a, b, spans, divisor]) => {
        const left = await readMultirangeFixture(pg, 'pg_catalog.int4multirange', a),
          right = await readMultirangeFixture(pg, 'pg_catalog.int4multirange', b),
          parts = await readRangeArrayFixture(pg, 'pg_catalog.int4range', spans)
        return {
          payload: left ? { kind: 'Value' as const, value: left } : value(null),
          other: right ? { kind: 'Value' as const, value: right } : value(null),
          spans: parts ? { kind: 'Value' as const, value: parts } : value(null),
          divisor: value(divisor),
        }
      }),
    )
    let inserts = 0,
      constantErrors = 0,
      domainErrors = 0
    for (const f of forms)
      for (const [i, [a, b, spans, divisor]] of cases.entries()) {
        let domainFailure = false
        if (f.name === 'checked_result')
          try {
            await pg.query(
              `SELECT ${f.expr} FROM(SELECT $1::int4multirange payload,$2::int4multirange other)q`,
              [a, b],
            )
          } catch (e) {
            expect(e).toMatchObject({ code: '23514' })
            domainFailure = true
          }
        for (const wanted of [false, true])
          for (const bypass of [false, true]) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${f.name} VALUES($1,$2,$3,$4,$5,$6) RETURNING (${f.sql}) result`,
                  [a, b, spans, divisor, wanted, bypass],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (e) {
              const code = (e as { code: string }).code
              expect(['22004', '22012', '23514']).toContain(code)
              expected =
                code === '23514' && !(domainFailure && !bypass)
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(code, 36) } }
              if (expected.kind === 'Error' && f.name.startsWith('constant_')) constantErrors++
              if (expected.kind === 'Error' && domainFailure) domainErrors++
            }
            const row: Row = { ...inputs[i]!, expected: value(wanted), bypass: value(bypass) }
            for (const mode of ['source', 'stored'])
              fixtures.push({ name: f.name + '_' + mode, row, expected })
            inserts++
          }
      }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangesetcomposition',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.name + '_' + mode)),
      fixtures,
    )
    expect(inserts).toBe(112)
    expect(constantErrors).toBe(48)
    expect(domainErrors).toBe(2)
    await mkdir('artifacts/check-multirange-set', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-set/composition-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          constantErrors,
          domainErrors,
          lazyRuntime: true,
          selection: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('rejects incompatible multirange set families and distinguishes aggregate transition context', async () => {
  const pg = await PGlite.create()
  try {
    const columns = 'payload int4multirange,other int8multirange,span int4range'
    await pg.exec(`CREATE TABLE set_nominal(${columns})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'set_nominal')!
    const bad = [
      'payload+other IS NULL',
      'payload*other IS NULL',
      'payload-other IS NULL',
      'multirange_union(payload,other) IS NULL',
      'multirange_intersect(payload,other) IS NULL',
      'multirange_minus(payload,other) IS NULL',
      'range_merge(payload)=NULL::int8range',
    ]
    for (const [i, sql] of bad.entries()) {
      await expect(
        pg.exec(`CREATE TABLE invalid_set_${i}(${columns},CHECK(${sql}))`),
      ).rejects.toMatchObject({ code: '42883' })
      const plan = lowerTableCheck(
        table,
        { name: 'bad', type: 'check', definition: `CHECK(${sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      expect(hasUncertain(plan.expression), sql).toBe(true)
    }
    await expect(
      pg.query(
        "SELECT multirange_intersect_agg_transfn('{}'::int4multirange,'{}'::int4multirange)",
      ),
    ).rejects.toMatchObject({ code: 'XX000' })
    expect(
      (
        await pg.query<{ value: string | null }>(
          "SELECT multirange_intersect_agg_transfn(NULL::int4multirange,'{}'::int4multirange)::text value",
        )
      ).rows[0]!.value,
    ).toBeNull()
  } finally {
    await pg.close()
  }
})
