import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import type { RangeType } from '../../src/sql-semantics/expressions.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import {
  readRangeFixture,
  rangeCoreSamples,
  rangeBoundProjection,
  rangeBoundCell,
} from './check-range-fixtures.js'
import { readRangeArrayFixture, rangeArrayText } from './check-range-array-fixtures.js'

it('binds multirange constructors, range casts, variadic range arrays and lazy composition against raw/stored CHECK INSERTs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-constructors-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, family) =>
      [
        { name: 'zero', expr: `isempty(${m.multirange}())`, result: 'pg_catalog.bool' },
        { name: 'single', expr: `lower(${m.multirange}(span))`, result: m.subtype },
        { name: 'cast', expr: `upper(span::${m.multirange})`, result: m.subtype },
        { name: 'variadic', expr: `lower(${m.multirange}(span,other))`, result: m.subtype },
        { name: 'array', expr: `upper(${m.multirange}(VARIADIC spans))`, result: m.subtype },
        {
          name: 'built_array',
          expr: `lower(${m.multirange}(VARIADIC ARRAY[span,other]))`,
          result: m.subtype,
        },
        {
          name: 'case',
          expr: `upper(CASE WHEN choose THEN ${m.multirange}(VARIADIC spans) ELSE ${m.multirange}(span) END)`,
          result: m.subtype,
        },
        {
          name: 'coalesce',
          expr: `lower(COALESCE(${m.multirange}(span),${m.multirange}(VARIADIC spans),NULL::${m.multirange}))`,
          result: m.subtype,
        },
      ].map((form, i) => ({
        ...form,
        m,
        table: `multirange_construct_${family}_${i}`,
        domain: `constructor_range_${family}`,
        sql: `(${form.expr}) IS NOT DISTINCT FROM expected`,
      })),
    )
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN constructor_range_base_${i} AS ${m.identity};CREATE DOMAIN constructor_range_${i} AS constructor_range_base_${i}`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(span ${f.domain},other ${f.domain},spans ${f.m.identity}[],choose boolean,expected ${f.result},CONSTRAINT canonical CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return ['source', 'stored'].map((mode) => {
          const plan = lowerTableCheck(
            table,
            mode === 'source'
              ? { name: 'canonical', type: 'check', definition: `CHECK(${f.sql})` }
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
    let inserts = 0,
      errors = 0
    for (const f of forms) {
      const range = f.m.identity as RangeType,
        samples = rangeCoreSamples(range).ranges,
        one = samples[5]!,
        two = samples[10]!
      const cases = [
        { span: null, other: one, spans: null },
        { span: 'empty', other: 'empty', spans: '{}' },
        { span: one, other: two, spans: rangeArrayText([two, one]) },
        { span: one, other: one, spans: rangeArrayText([one, one, 'empty']) },
        { span: '(,)', other: one, spans: rangeArrayText(['(,)', one]) },
        { span: one, other: null, spans: rangeArrayText([one, null]) },
        {
          span: one,
          other: two,
          spans: '{' + rangeArrayText([one]) + ',' + rangeArrayText([two]) + '}',
        },
        {
          span: samples.at(-1)!,
          other: samples.at(-2)!,
          spans: rangeArrayText([samples.at(-1)!, samples.at(-2)!], -2),
        },
      ]
      for (const input of cases)
        for (const choose of [false, true])
          for (const mismatch of [false, true]) {
            const candidate = `SELECT $1::${range} span,$2::${range} other,$3::${range}[] spans,$4::boolean choose`
            let wanted: string | null = null,
              payload: string | null = null
            try {
              const projection =
                f.result === 'pg_catalog.bool'
                  ? 'expected::text'
                  : rangeBoundProjection('expected', f.result)
              const opposite =
                f.result === 'pg_catalog.bool'
                  ? 'CASE WHEN actual IS NULL THEN true ELSE NOT actual END'
                  : `CASE WHEN actual IS NULL THEN lower(other) ELSE NULL END`
              const target = (
                await pg.query<{ source: string | null; payload: string | null }>(
                  `WITH q AS MATERIALIZED(${candidate}),a AS MATERIALIZED(SELECT *,${f.expr} actual FROM q),e AS MATERIALIZED(SELECT CASE WHEN $5::boolean THEN ${opposite} ELSE actual END expected FROM a) SELECT expected::text source,${projection} payload FROM e`,
                  [input.span, input.other, input.spans, choose, mismatch],
                )
              ).rows[0]!
              wanted = target.source
              payload = target.payload
            } catch (e) {
              expect(['22004', '21000']).toContain((e as { code: string }).code)
            }
            let expected: Outcome
            try {
              const actual = (
                await pg.query<{ result: boolean }>(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5) RETURNING (${f.sql}) result`,
                  [input.span, input.other, input.spans, choose, wanted],
                )
              ).rows[0]!.result
              expected = { kind: actual ? 'True' : 'False' }
            } catch (e) {
              const code = (e as { code: string }).code
              expected =
                code === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(code, 36) } }
              if (code !== '23514') errors++
            }
            inserts++
            const a = await readRangeFixture(pg, `SELECT $1::${range} span`, 'span', range, [
                input.span,
              ]),
              b = await readRangeFixture(pg, `SELECT $1::${range} span`, 'span', range, [
                input.other,
              ]),
              array = await readRangeArrayFixture(pg, range, input.spans)
            const cell =
              f.result === 'pg_catalog.bool'
                ? payload === null
                  ? { kind: 'Null' as const }
                  : { kind: 'Value' as const, value: payload === 'true' }
                : rangeBoundCell(f.result, payload)
            if ('value' in cell && typeof cell.value === 'object' && cell.kind !== 'Error')
              throw new Error('Expected a primitive multirange constructor result')
            const target: Input =
              cell.kind === 'Null'
                ? { kind: 'Null' }
                : 'value' in cell && cell.kind !== 'Error'
                  ? { kind: 'Value', value: cell.value }
                  : { kind: 'Unknown' }
            const row: Row = {
              span: a ? { kind: 'Value', value: a } : { kind: 'Null' },
              other: b ? { kind: 'Value', value: b } : { kind: 'Null' },
              spans: array ? { kind: 'Value', value: array } : { kind: 'Null' },
              choose: { kind: 'Value', value: choose },
              expected: target,
            }
            for (const mode of ['source', 'stored'])
              fixtures.push({ name: f.table + '_' + mode, row, expected })
          }
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    await runCheckParity(
      directory,
      'multirangeconstructorbinding',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.table + '_' + mode)),
      fixtures,
    )
    expect(inserts).toBe(1536)
    expect(fixtures).toHaveLength(3072)
    expect(errors).toBeGreaterThan(0)
    await mkdir('artifacts/check-multirange-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-constructors/binding-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          nativeErrors: errors,
          forms: forms.length,
          plans: plans.length,
          rawStored: true,
          rangeCasts: true,
          lazyCaseAndCoalesce: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('preserves constructor constant preparation and lazy runtime branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-constructor-preparation-'))
  try {
    const forms = [
      { name: 'constant_null_member', call: 'int4multirange(VARIADIC ARRAY[NULL::int4range])' },
      { name: 'runtime_members', call: 'int4multirange(VARIADIC parts)' },
      { name: 'strict_null_array', call: 'int4multirange(VARIADIC NULL::int4range[])' },
    ].map((f) => ({ ...f, sql: `CASE WHEN bypass THEN true ELSE isempty(${f.call}) END` }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(parts int4range[],bypass boolean,CONSTRAINT prepared CHECK(${f.sql}))`,
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
    let inserts = 0
    for (const f of forms)
      for (const text of [null, '{}', '{NULL}', '{"[1,3)"}'])
        for (const bypass of [false, true]) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ result: boolean | null }>(
                `INSERT INTO ${f.name} VALUES($1,$2) RETURNING (${f.sql}) result`,
                [text, bypass],
              )
            ).rows[0]!.result
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (e) {
            const code = (e as { code: string }).code
            expected =
              code === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          const parts = await readRangeArrayFixture(pg, 'pg_catalog.int4range', text)
          const row: Row = {
            parts: parts ? { kind: 'Value', value: parts } : { kind: 'Null' },
            bypass: { kind: 'Value', value: bypass },
          }
          for (const mode of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + mode, row, expected })
          inserts++
        }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    await runCheckParity(
      directory,
      'multirangeconstructorpreparation',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.name + '_' + mode)),
      fixtures,
    )
    expect(inserts).toBe(24)
    expect(fixtures).toHaveLength(48)
    const constant = fixtures.filter((f) => f.name.startsWith('constant_null_member'))
    expect(constant).toHaveLength(16)
    for (const f of constant)
      expect(f.expected).toEqual({ kind: 'Error', value: { state: parseInt('22004', 36) } })
    for (const f of fixtures.filter(
      (f) =>
        f.name.startsWith('runtime_members') &&
        f.row.bypass?.kind === 'Value' &&
        f.row.bypass.value === true,
    ))
      expect(f.expected).toEqual({ kind: 'True' })
    await mkdir('artifacts/check-multirange-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-constructors/preparation-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          constantErrors: fixtures.filter(
            (f) => f.name.startsWith('constant_') && f.expected.kind === 'Error',
          ).length,
          lazyRuntimeBranches: true,
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
