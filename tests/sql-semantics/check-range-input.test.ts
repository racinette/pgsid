import { rangeInputForms } from './check-range-input-forms.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
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
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const value = (text: string | boolean | null): Input =>
  text === null ? { kind: 'Null' } : { kind: 'Value', value: text }

it('parses complete range grammar before ordered scalar input, canonicalizes bounds and enforces nested range domains in Rust and both targets', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-input-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const endpoints: Record<string, [string, string]> = {
      int4range: ['1', '3'],
      int8range: ['9007199254740993', '9007199254740999'],
      numrange: ['1.2300', '3.4500'],
      daterange: ['2000-01-01', '2000-01-03'],
      tsrange: ['2000-01-01 00:00:00.000001', '2000-01-03'],
      tstzrange: ['2000-01-01 00:00:00.000001+02', '2000-01-03 00:00:00+02'],
    }
    const extra: Record<string, string[]> = {
      int4range: [
        '[0x10,0x20]',
        '[1_000,2_000)',
        '[2147483647,)',
        '(2147483647,)',
        '(,2147483647]',
        '[2147483648,bad)',
        '[bad,2147483648)',
        '[2147483648,3)garbage',
        '[2147483648,3',
        '[-2147483648,2147483647)',
      ],
      int8range: [
        '[-9223372036854775808,9223372036854775807)',
        '[9223372036854775807,)',
        '(9223372036854775807,)',
        '(,9223372036854775807]',
        '[9223372036854775808,bad)',
        '[bad,9223372036854775808)',
      ],
      numrange: [
        '[-0.00,1.2300]',
        '[NaN,NaN]',
        '[Infinity,NaN]',
        '[NaN,Infinity]',
        '[-Infinity,Infinity]',
        '[1e2,2e2]',
        '[1.00,1.000]',
        '[1e100000,bad)',
        '[bad,1e100000)',
      ],
      daterange: [
        '[-infinity,infinity]',
        '[infinity,infinity]',
        '(infinity,infinity)',
        '[epoch,2000-01-01)',
        '[5874897-12-31,)',
        '(5874897-12-31,)',
        '(,5874897-12-31]',
        '[2000-99-01,2000-01-03)',
        '[2000-99-01,"")',
        '["",2000-99-01)',
      ],
      tsrange: [
        '[-infinity,infinity]',
        '[infinity,infinity]',
        '[2000-01-01 00:00:00.9999995,2000-01-03)',
        '[2000-99-01,2000-01-03)',
        '["",2000-99-01)',
      ],
      tstzrange: [
        '[-infinity,infinity]',
        '[infinity,infinity]',
        '[2000-01-01 00:00:00.9999995+00,2000-01-03 00:00:00+00)',
        '[2000-99-01 00:00:00+00,2000-01-03 00:00:00+00)',
        '["",2000-99-01 00:00:00+00)',
      ],
    }
    for (const inventory of rangeInputForms) {
      for (const text of inventory.handled)
        await expect(pg.query(`SELECT $1::${inventory.type}`, [text])).resolves.toMatchObject({
          rows: expect.any(Array),
        })
      for (const text of inventory.rejected)
        await expect(pg.query(`SELECT $1::${inventory.type}`, [text])).rejects.toMatchObject({
          code: '22P02',
        })
    }
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) => {
      const short = metadata.identity.slice('pg_catalog.'.length)
      return [
        { name: 'cast', expr: `payload::${metadata.identity}`, checked: false },
        { name: 'function', expr: `${metadata.identity}(payload)`, checked: false },
        { name: 'domain', expr: `payload::range_nested_${family}`, checked: false },
        { name: 'checked', expr: `payload::range_checked_${family}`, checked: true },
        { name: 'varchar', expr: `(payload::varchar)::${metadata.identity}`, checked: false },
        { name: 'bpchar', expr: `(payload::bpchar)::${metadata.identity}`, checked: false },
        { name: 'name', expr: `payload::${metadata.identity}`, checked: false },
        {
          name: 'coalesce',
          expr: `COALESCE(payload::${metadata.identity},'empty'::${metadata.identity})`,
          checked: false,
        },
      ].map((form, index) => {
        const shape = [
          'isempty',
          'lower_inc',
          'upper_inc',
          'lower_inf',
          'upper_inf',
          'lower',
          'upper',
        ].map((n) => `${n}(${form.expr}) IS NOT DISTINCT FROM ${n}(expected)`)
        if (short === 'numrange')
          for (const bound of ['lower', 'upper'])
            shape.push(
              `scale(${bound}(${form.expr})) IS NOT DISTINCT FROM scale(${bound}(expected))`,
            )
        return {
          ...form,
          metadata,
          inputType: form.name === 'name' ? 'pg_catalog.name' : 'pg_catalog.text',
          short,
          table: `range_input_${family}_${index}`,
          sql: `CASE WHEN bypass THEN true ELSE (((${form.expr}) IS NULL)=(expected IS NULL)) AND (${shape.join(' AND ')}) END`,
        }
      })
    })
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN range_plain_${family} AS ${metadata.identity};CREATE DOMAIN range_nested_${family} AS range_plain_${family};CREATE DOMAIN range_checked_${family} AS range_nested_${family} NOT NULL CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL)`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.inputType},expected ${form.metadata.identity},bypass boolean,CONSTRAINT valid_range CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'valid_range', type: 'check', definition: `CHECK(${form.sql})` }
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
    const errors = new Set<string>()
    for (const form of forms) {
      const [lo, hi] = endpoints[form.short]!
      const inputs: (string | null)[] = [
        null,
        'empty',
        'EMPTY',
        '\tEmPtY\n',
        '(,)',
        '[,]',
        '(,]',
        `[${lo},${hi})`,
        `(${lo},${hi}]`,
        `[${lo},${lo}]`,
        `(${lo},${lo})`,
        `[${hi},${lo})`,
        `["${lo}","${hi}"]`,
        `[${lo[0]}"${lo.slice(1)}",${hi})`,
        `[\\${lo},${hi})`,
        `[${lo},${hi}  )`,
        `["",${hi})`,
        `[ ,${hi})`,
        `[${lo}, ]`,
        '',
        'empty junk',
        '[',
        `[${lo},${hi}`,
        `[${lo},${hi},${lo})`,
        `[${lo})`,
        `["${lo},${hi})`,
        `[${lo},"${hi}]`,
        `[${lo},${hi})junk`,
        `[${lo},${hi}\\`,
        ...extra[form.short]!,
      ]
      for (const rawPayload of inputs) {
        const payload = (
          await pg.query<{ payload: string | null }>(`SELECT $1::${form.inputType}::text payload`, [
            rawPayload,
          ])
        ).rows[0]!.payload
        let actual: string | null = null,
          nativeError: string | null = null
        try {
          actual = (
            await pg.query<{ actual: string | null }>(
              `WITH q AS MATERIALIZED(SELECT $1::${form.inputType} payload) SELECT ${form.expr} actual FROM q`,
              [payload],
            )
          ).rows[0]!.actual
        } catch (error) {
          nativeError = (error as { code: string }).code
          errors.add(nativeError)
        }
        const expectedRange = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [actual],
        )
        for (const bypass of [false, true]) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ result: boolean | null }>(
                `INSERT INTO ${form.table} VALUES($1,$2::${form.metadata.identity},$3) RETURNING (${form.sql}) result`,
                [payload, actual, bypass],
              )
            ).rows[0]!.result
            expect(bypass ? null : nativeError).toBeNull()
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (error) {
            const code = (error as { code: string }).code
            expect(code).toBe(nativeError)
            expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          inserts++
          const row: Row = {
            payload: value(payload),
            expected: expectedRange ? { kind: 'Value', value: expectedRange } : { kind: 'Null' },
            bypass: value(bypass),
          }
          for (const mode of ['source', 'stored'])
            fixtures.push({ name: form.table + '_' + mode, row, expected })
        }
      }
      for (const payload of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[]) {
        for (const bypass of [false, true])
          for (const mode of ['source', 'stored'])
            fixtures.push({
              name: form.table + '_' + mode,
              row: { payload, expected: { kind: 'Null' }, bypass: value(bypass) },
              expected: bypass ? { kind: 'True' } : (payload as Outcome),
            })
      }
    }
    const group = prepareCheckRustGroup(plans, { serverEncoding: 'UTF8', defaultCollation: 'C' })
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await mkdir('artifacts/check-range-input', { recursive: true })
    await writeFile(
      'artifacts/check-range-input/fixture-index.json',
      JSON.stringify(
        fixtures.map((f, index) => ({
          index,
          name: f.name,
          payload: f.row.payload,
          expected: f.expected,
        })),
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'rangeinput',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
      fixtures,
    )
    expect(forms).toHaveLength(48)
    expect(inserts).toBeGreaterThan(2800)
    expect([...errors]).toEqual(
      expect.arrayContaining(['22P02', '22003', '22000', '22008', '22007', '23502', '23514']),
    )
    await mkdir('artifacts/check-range-input', { recursive: true })
    await writeFile(
      'artifacts/check-range-input/report.json',
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
}, 300000)
