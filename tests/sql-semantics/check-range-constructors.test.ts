import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { rangeBoundCell, rangeBoundProjection, readRangeFixture } from './check-range-fixtures.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('constructs and canonicalizes builtin ranges with non-strict bounds, ordered errors and raw/stored INSERT parity', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-constructors-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const samples: Record<string, (string | null)[][]> = {
      int4range: [
        [null, null],
        [null, '3'],
        ['1', null],
        ['1', '3'],
        ['3', '1'],
        ['1', '1'],
        ['2147483647', null],
        [null, '2147483647'],
        ['2147483647', '2147483647'],
        ['-2147483648', '2147483647'],
      ],
      int8range: [
        [null, null],
        [null, '3'],
        ['1', null],
        ['9007199254740993', '9007199254740999'],
        ['3', '1'],
        ['1', '1'],
        ['9223372036854775807', null],
        [null, '9223372036854775807'],
        ['9223372036854775807', '9223372036854775807'],
        ['-9223372036854775808', '9223372036854775807'],
      ],
      numrange: [
        [null, null],
        [null, '3'],
        ['1', null],
        ['-0.00', '1.2300'],
        ['3', '1'],
        ['1.00', '1.000'],
        ['NaN', 'NaN'],
        ['Infinity', 'NaN'],
        ['NaN', 'Infinity'],
        ['-Infinity', 'Infinity'],
      ],
      daterange: [
        [null, null],
        [null, '2000-01-03'],
        ['2000-01-01', null],
        ['2000-01-01', '2000-01-03'],
        ['2000-01-03', '2000-01-01'],
        ['2000-01-01', '2000-01-01'],
        ['5874897-12-31', null],
        [null, '5874897-12-31'],
        ['-infinity', 'infinity'],
        ['infinity', 'infinity'],
        ['-infinity', '-infinity'],
      ],
      tsrange: [
        [null, null],
        [null, '2000-01-03'],
        ['2000-01-01', null],
        ['2000-01-01 00:00:00.000001', '2000-01-01 00:00:00.000002'],
        ['2000-01-03', '2000-01-01'],
        ['2000-01-01', '2000-01-01'],
        ['-infinity', 'infinity'],
        ['infinity', 'infinity'],
      ],
      tstzrange: [
        [null, null],
        [null, '2000-01-03 00:00:00+00'],
        ['2000-01-01 00:00:00+00', null],
        ['2000-01-01 00:00:00.000001+02', '2000-01-01 00:00:00.000002+02'],
        ['2000-01-03 00:00:00+00', '2000-01-01 00:00:00+00'],
        ['2000-01-01 00:00:00+00', '2000-01-01 00:00:00+00'],
        ['-infinity', 'infinity'],
        ['infinity', 'infinity'],
      ],
    }
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) => {
      const type = metadata.identity
      const short = type.slice('pg_catalog.'.length)
      const call = `${type}(low_bound,high_bound,bound_flags)`
      return [
        { name: 'default', expr: `${type}(low_bound,high_bound)`, flags: false },
        { name: 'flags', expr: call, flags: true },
        { name: 'case', expr: `CASE WHEN choose THEN ${call} ELSE NULL::${type} END`, flags: true },
        { name: 'coalesce', expr: `COALESCE(NULL::${type},${call},NULL::${type})`, flags: true },
        ...(metadata.canonical
          ? [{ name: 'canonical', expr: `pg_catalog.${short}_canonical(${call})`, flags: true }]
          : []),
      ].map((form, index) => {
        const shape = [
          'isempty',
          'lower_inc',
          'upper_inc',
          'lower_inf',
          'upper_inf',
          'lower',
          'upper',
        ].map((name) => `${name}(${form.expr}) IS NOT DISTINCT FROM ${name}(expected)`)
        if (short === 'numrange')
          for (const bound of ['lower', 'upper'])
            shape.push(
              `scale(${bound}(${form.expr})) IS NOT DISTINCT FROM scale(${bound}(expected))`,
            )
        return {
          ...form,
          type,
          short,
          metadata,
          family,
          table: `range_construct_${family}_${index}`,
          sql: `(((${form.expr}) IS NULL) = (expected IS NULL)) AND (${shape.join(' AND ')})`,
        }
      })
    })
    for (const [index, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN range_scalar_${index} AS ${metadata.subtype};CREATE DOMAIN range_nested_${index} AS range_scalar_${index}`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(low_bound range_nested_${form.family},high_bound range_nested_${form.family},bound_flags text,choose boolean,expected ${form.type},CONSTRAINT valid_range CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((mode) => {
        const plan = lowerTableCheck(
          table,
          mode === 'source'
            ? { name: 'valid_range', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          mode as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + mode).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: mode,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    const errors = new Set<string>()
    const validRows = new Map<string, Row>()
    for (const form of forms) {
      for (const [pair, bounds] of samples[form.short]!.entries()) {
        const low = bounds[0]!,
          high = bounds[1]!
        const flags = form.flags
          ? ['[]', '[)', '(]', '()', null, '', '(', '[] ', '][']
          : ['ignored']
        const payloads = (
          await pg.query<{ lo: string | null; hi: string | null }>(
            `WITH q AS MATERIALIZED(SELECT $1::${form.metadata.subtype} lo,$2::${form.metadata.subtype} hi) SELECT ${rangeBoundProjection('lo', form.metadata.subtype)} lo,${rangeBoundProjection('hi', form.metadata.subtype)} hi FROM q`,
            [low, high],
          )
        ).rows[0]!
        const scalar = (value: string | null): Input => {
          const cell = rangeBoundCell(form.metadata.subtype, value)
          return 'value' in cell ? input(cell.value as string | number | bigint) : { kind: 'Null' }
        }
        for (const flag of flags) {
          const choose = form.name !== 'case' || pair % 2 === 0
          let actual: string | null = null,
            nativeError: string | null = null
          const select = `WITH q AS MATERIALIZED(SELECT $1::${form.metadata.subtype} low_bound,$2::${form.metadata.subtype} high_bound,$3::text bound_flags,$4::boolean choose) SELECT ${form.expr} actual FROM q`
          try {
            actual = (await pg.query<{ actual: string | null }>(select, [low, high, flag, choose]))
              .rows[0]!.actual
          } catch (error) {
            nativeError = (error as { code: string }).code
            errors.add(nativeError)
          }
          for (const wrong of nativeError ? [false] : [false, true]) {
            const expectedRange = wrong ? (actual === null ? 'empty' : null) : actual
            const coerced = await readRangeFixture(
              pg,
              `SELECT $1::${form.type} span`,
              'span',
              form.type,
              [expectedRange],
            )
            const row: Row = {
              low_bound: scalar(payloads.lo),
              high_bound: scalar(payloads.hi),
              bound_flags: input(flag),
              choose: input(choose),
              expected: coerced ? { kind: 'Value', value: coerced } : { kind: 'Null' },
            }
            let outcome: Outcome
            try {
              const inserted = await pg.query<{ result: boolean | null }>(
                `INSERT INTO ${form.table} VALUES($1::${form.metadata.subtype},$2::${form.metadata.subtype},$3,$4,$5::${form.type}) RETURNING (${form.sql}) result`,
                [low, high, flag, choose, expectedRange],
              )
              expect(nativeError).toBeNull()
              outcome = {
                kind:
                  inserted.rows[0]!.result === null
                    ? 'Null'
                    : inserted.rows[0]!.result
                      ? 'True'
                      : 'False',
              }
            } catch (error) {
              const code = (error as { code: string }).code
              expect(code).toBe(nativeError ?? '23514')
              outcome =
                code === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            inserts++
            for (const mode of ['source', 'stored'])
              fixtures.push({ name: form.table + '_' + mode, row, expected: outcome })
            if (!wrong && !nativeError && pair === 3 && (flag === '[)' || !form.flags))
              validRows.set(form.table, row)
          }
        }
      }
      const valid = validRows.get(form.table)
      if (valid && form.name === 'case') {
        const skipped: Row = {
          ...valid,
          choose: input(false),
          low_bound: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          high_bound: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          bound_flags: { kind: 'Unknown' },
          expected: { kind: 'Null' },
        }
        for (const mode of ['source', 'stored']) {
          fixtures.push({ name: form.table + '_' + mode, row: skipped, expected: { kind: 'True' } })
          fixtures.push({
            name: form.table + '_' + mode,
            row: { ...skipped, choose: { kind: 'Unknown' } },
            expected: { kind: 'Unknown' },
          })
        }
      }
      if (valid && form.name !== 'case') {
        const first: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
        const second: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        const variants: { row: Row; expected: Outcome }[] = [
          { row: { ...valid, low_bound: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } },
          { row: { ...valid, low_bound: first, high_bound: second }, expected: first },
        ]
        if (form.flags)
          variants.push(
            {
              row: { ...valid, low_bound: { kind: 'Unknown' }, bound_flags: input('invalid') },
              expected: { kind: 'Error', value: { state: parseInt('42601', 36) } },
            },
            {
              row: { ...valid, low_bound: { kind: 'Unknown' }, bound_flags: input(null) },
              expected: { kind: 'Error', value: { state: parseInt('22000', 36) } },
            },
            { row: { ...valid, low_bound: first, bound_flags: second }, expected: first },
            { row: { ...valid, high_bound: first, bound_flags: second }, expected: first },
            { row: { ...valid, bound_flags: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } },
          )
        for (const variant of variants)
          for (const mode of ['source', 'stored'])
            fixtures.push({ name: form.table + '_' + mode, ...variant })
      }
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangeconstructors',
      group,
      forms.flatMap((form) => ['source', 'stored'].map((mode) => form.table + '_' + mode)),
      fixtures,
    )
    expect([...errors].sort()).toEqual(['22000', '22003', '22008', '42601'])
    expect(forms).toHaveLength(27)
    expect(inserts).toBeGreaterThan(2000)
    expect(fixtures.length).toBeGreaterThan(inserts * 2)
    await mkdir('artifacts/check-range-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-range-constructors/report.json',
      JSON.stringify(
        { inserts, fixtures: fixtures.length, forms: forms.length, errors: [...errors].sort() },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('prepares constant range constructors before lazy branches while retaining non-strict NULL bounds', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-constant-'))
  try {
    const expressions = Object.values(PG18_RANGE_TYPES).flatMap((metadata) => [
      `lower_inf(${metadata.identity}(NULL::${metadata.subtype},NULL::${metadata.subtype}))`,
      `upper_inf(${metadata.identity}(NULL::${metadata.subtype},NULL::${metadata.subtype},'[]'))`,
      `isempty(${metadata.identity}(NULL::${metadata.subtype},NULL::${metadata.subtype},NULL::text))`,
      `isempty(${metadata.identity}(NULL::${metadata.subtype},NULL::${metadata.subtype},'invalid'))`,
    ])
    expressions.push(
      'isempty(int4range(2,1))',
      "isempty(int4range(2147483647,NULL,'()'))",
      "isempty(int8range(NULL,9223372036854775807::bigint,'[]'))",
      "isempty(daterange(NULL,'5874897-12-31'::date,'[]'))",
      "lower(tsrange('infinity'::timestamp,'infinity'::timestamp,'[]'))='infinity'::timestamp",
    )
    const forms = expressions.map((expr, index) => ({
      table: 'range_constant_' + index,
      sql: `CASE WHEN bypass THEN true ELSE ${expr} END`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(bypass boolean,CONSTRAINT valid_range CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((mode) => {
        const plan = lowerTableCheck(
          table,
          mode === 'source'
            ? { name: 'valid_range', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          mode as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + mode).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: mode,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const errors = new Set<string>()
    for (const form of forms)
      for (const bypass of [false, true]) {
        let expected: Outcome
        try {
          await pg.query(`INSERT INTO ${form.table} VALUES($1)`, [bypass])
          expected = { kind: 'True' }
        } catch (error) {
          const code = (error as { code: string }).code
          errors.add(code)
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        for (const mode of ['source', 'stored'])
          fixtures.push({ name: form.table + '_' + mode, row: { bypass: input(bypass) }, expected })
      }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangeconstant',
      group,
      forms.flatMap((form) => ['source', 'stored'].map((mode) => form.table + '_' + mode)),
      fixtures,
    )
    expect(forms).toHaveLength(29)
    expect(fixtures).toHaveLength(116)
    expect([...errors].sort()).toEqual(['22000', '22003', '22008', '42601'])
    await mkdir('artifacts/check-range-constructors', { recursive: true })
    await writeFile(
      'artifacts/check-range-constructors/constant-report.json',
      JSON.stringify(
        { inserts: 58, fixtures: fixtures.length, forms: forms.length, errors: [...errors].sort() },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
