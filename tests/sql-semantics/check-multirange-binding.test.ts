import {
  catalogScalarType,
  catalogArrayType,
} from '../../src/sql-semantics/catalog-check-binder.js'
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
import { rangeBoundCell, rangeBoundProjection } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { domainElementType } from '../../src/sql-semantics/expressions.js'

const state = (value: string | boolean | number | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('binds concrete multirange subtypes, nested domains, structural calls, CASE/COALESCE, NULLs, ordered errors and raw/stored INSERT outcomes', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-binding-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD'; SET TimeZone='UTC'")
    const samples: Record<string, { values: (string | null)[]; fallback: string }> = {
      int4range: {
        values: [null, 'empty', '(,)', '[1,9)', '[2147483647,)', '[1,3),[7,9)'],
        fallback: '[2,8)',
      },
      int8range: {
        values: [
          null,
          'empty',
          '(,)',
          '[9007199254740993,9007199254740999)',
          '[-9223372036854775808,0)',
        ],
        fallback: '[2,8)',
      },
      numrange: {
        values: [null, 'empty', '(,)', '[-0.00,1.2300]', '[NaN,NaN]', '[-Infinity,Infinity]'],
        fallback: '[2,8)',
      },
      daterange: {
        values: [null, 'empty', '(,)', '[2000-01-01,2000-01-03]', '[-infinity,infinity]'],
        fallback: '[2000-01-02,2000-01-08)',
      },
      tsrange: {
        values: [
          null,
          'empty',
          '(,)',
          '[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002]',
          '[-infinity,infinity]',
        ],
        fallback: '[2000-01-02,2000-01-08)',
      },
      tstzrange: {
        values: [
          null,
          'empty',
          '(,)',
          '[2000-01-01 00:00:00.000001+02,2000-01-01 00:00:00.000002+02]',
          '[-infinity,infinity]',
        ],
        fallback: '[2000-01-02 00:00:00+00,2000-01-08 00:00:00+00)',
      },
    }
    const forms = Object.entries(PG18_RANGE_TYPES).flatMap(([type, metadata], family) => {
      const short = type.slice('pg_catalog.'.length)
      return [
        ...['isempty', 'lower_inc', 'upper_inc', 'lower_inf', 'upper_inf'].map((name) => ({
          name,
          expr: `${name}(span)`,
          result: 'pg_catalog.bool',
          nullsafe: false,
        })),
        { name: 'lower', expr: 'lower(span)', result: metadata.subtype, nullsafe: true },
        { name: 'upper', expr: 'upper(span)', result: metadata.subtype, nullsafe: true },
        {
          name: 'case',
          expr: `lower(CASE WHEN choose THEN alternate ELSE span END)`,
          result: metadata.subtype,
          nullsafe: true,
        },
        {
          name: 'coalesce',
          expr: `upper(COALESCE(span,alternate,NULL::${metadata.multirange}))`,
          result: metadata.subtype,
          nullsafe: true,
        },
        { name: 'is_null', expr: 'span IS NULL', result: 'pg_catalog.bool', nullsafe: true },
        {
          name: 'is_not_null',
          expr: 'span IS NOT NULL',
          result: 'pg_catalog.bool',
          nullsafe: true,
        },
      ].map((form, index) => ({
        ...form,
        type: metadata.multirange,
        metadata,
        short,
        table: `range_${family}_${index}`,
        domain: `range_domain_${family}`,
        sql: `(${form.expr}) ${form.nullsafe ? 'IS NOT DISTINCT FROM' : '='} expected`,
      }))
    })
    for (const [index, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN range_base_${index} AS ${metadata.multirange};CREATE DOMAIN range_domain_${index} AS range_base_${index}`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(span ${form.domain},alternate ${form.domain},choose boolean,expected ${form.result},CONSTRAINT valid_range CHECK(${form.sql}))`,
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
    for (const metadata of Object.values(PG18_RANGE_TYPES)) {
      expect(catalogScalarType(metadata.multirange)).toBe(metadata.multirange)
      expect(catalogScalarType(metadata.multirange + '[]')).toBe(`array:${metadata.multirange}`)
      expect(catalogScalarType(metadata.multirangeArray)).toBe(`array:${metadata.multirange}`)
    }
    expect(catalogArrayType('public.range_domain_0[]', undefined, catalog.domains)).toBe(
      `array:${domainElementType({ schema: 'public', name: 'range_domain_0' }, forms[0]!.type)}`,
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms) {
      const original = samples[form.short]!
      const sample = {
        values: original.values.map((v) => (v === null ? null : v === 'empty' ? '{}' : `{${v}}`)),
        fallback: `{${original.fallback}}`,
      }
      const alternate = await readMultirangeFixture(pg, form.type, sample.fallback)
      for (const [index, source] of sample.values.entries()) {
        const choose = index % 2 === 0
        const span = await readMultirangeFixture(pg, form.type, source)
        for (const wrong of [false, true]) {
          const opposite =
            form.result === 'pg_catalog.bool'
              ? `CASE WHEN actual IS NULL THEN false ELSE NOT actual END`
              : `CASE WHEN actual IS NULL THEN lower(alternate) ELSE NULL END`
          const select = `WITH q AS MATERIALIZED(SELECT $1::${form.type} span,$2::${form.type} alternate,$3::boolean choose),a AS MATERIALIZED(SELECT *,${form.expr} actual FROM q),e AS MATERIALIZED(SELECT CASE WHEN $4::boolean THEN ${opposite} ELSE actual END expected FROM a) SELECT expected::text source,${form.result === 'pg_catalog.bool' ? 'expected::text' : rangeBoundProjection('expected', form.result)} payload FROM e`
          const target = (
            await pg.query<{ source: string | null; payload: string | null }>(select, [
              source,
              sample.fallback,
              choose,
              wrong,
            ])
          ).rows[0]!
          let outcome: Outcome
          try {
            const inserted = await pg.query<{ result: boolean | null }>(
              `INSERT INTO ${form.table} VALUES($1::${form.type},$2::${form.type},$3,$4::${form.result}) RETURNING (${form.sql}) result`,
              [source, sample.fallback, choose, target.source],
            )
            outcome =
              inserted.rows[0]!.result === null
                ? { kind: 'Null' }
                : { kind: inserted.rows[0]!.result ? 'True' : 'False' }
          } catch (error) {
            expect((error as { code: string }).code).toBe('23514')
            outcome = { kind: 'False' }
          }
          inserts++
          const targetCell =
            form.result === 'pg_catalog.bool'
              ? target.payload === null
                ? { kind: 'Null' as const }
                : { kind: 'Value' as const, value: target.payload === 'true' }
              : rangeBoundCell(form.result, target.payload)
          const expectedInput: Input =
            targetCell.kind === 'Null'
              ? { kind: 'Null' }
              : 'value' in targetCell
                ? state(targetCell.value as string | boolean | number | bigint)
                : { kind: 'Unknown' }
          const row: Row = {
            span: span ? { kind: 'Value', value: span } : { kind: 'Null' },
            alternate: alternate ? { kind: 'Value', value: alternate } : { kind: 'Null' },
            choose: state(choose),
            expected: expectedInput,
          }
          for (const mode of ['source', 'stored'])
            fixtures.push({ name: form.table + '_' + mode, row, expected: outcome })
        }
      }
      const base: Row = {
        span: { kind: 'Unknown' },
        alternate: { kind: 'Unknown' },
        choose: { kind: 'Unknown' },
        expected: { kind: 'Unknown' },
      }
      for (const mode of ['source', 'stored']) {
        fixtures.push({ name: form.table + '_' + mode, row: base, expected: { kind: 'Unknown' } })
        fixtures.push({
          name: form.table + '_' + mode,
          row: {
            ...base,
            span: { kind: 'Error', value: { state: 3452582 } },
            choose: state(false),
          },
          expected: { kind: 'Error', value: { state: 3452582 } },
        })
        if (form.name === 'case' || form.name === 'coalesce') {
          expect(alternate?.ranges).toHaveLength(1)
          const member = alternate!.ranges[0]!
          if (member.kind !== 'Value') throw new Error('Expected a retained fallback member')
          const bound = member.value.bounds[form.name === 'case' ? 0 : 1]!
          if (!('value' in bound) || bound.kind === 'Error' || typeof bound.value === 'object')
            throw new Error('Expected a finite fallback bound')
          const known: Input = { kind: 'Value', value: alternate! }
          const first: Input = { kind: 'Error', value: { state: 3452582 } }
          const second: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
          const expected = state(bound.value)
          const extra: { row: Row; expected: Outcome }[] =
            form.name === 'case'
              ? [
                  {
                    row: { span: first, alternate: known, choose: state(true), expected },
                    expected: { kind: 'True' },
                  },
                  {
                    row: { span: known, alternate: second, choose: state(false), expected },
                    expected: { kind: 'True' },
                  },
                  {
                    row: { span: first, alternate: second, choose: state(true), expected },
                    expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
                  },
                  {
                    row: { span: first, alternate: second, choose: state(false), expected },
                    expected: { kind: 'Error', value: { state: 3452582 } },
                  },
                ]
              : [
                  {
                    row: { span: known, alternate: second, choose: state(false), expected },
                    expected: { kind: 'True' },
                  },
                  {
                    row: {
                      span: { kind: 'Null' },
                      alternate: known,
                      choose: state(false),
                      expected,
                    },
                    expected: { kind: 'True' },
                  },
                  {
                    row: {
                      span: { kind: 'Unknown' },
                      alternate: second,
                      choose: state(false),
                      expected,
                    },
                    expected: { kind: 'Unknown' },
                  },
                  {
                    row: {
                      span: { kind: 'Null' },
                      alternate: second,
                      choose: state(false),
                      expected,
                    },
                    expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
                  },
                ]
          for (const fixture of extra) fixtures.push({ name: form.table + '_' + mode, ...fixture })
        }
      }
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    await runCheckParity(
      directory,
      'multirangebinding',
      group,
      forms.flatMap((form) => ['source', 'stored'].map((mode) => form.table + '_' + mode)),
      fixtures,
    )
    expect(inserts).toBe(704)
    expect(fixtures).toHaveLength(1768)
    await mkdir('artifacts/check-multirange-binding', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-binding/report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          forms: forms.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          rawStored: true,
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
