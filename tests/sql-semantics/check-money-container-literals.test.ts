import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { rangeArrayText } from './check-range-array-fixtures.js'

const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('recovers exact stored money inside ranges, multiranges and recursive domain arrays without replaying subtype checks or callbacks', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-money-container-literals-'))
  try {
    await pg.exec(`
SET lc_monetary='C';
CREATE DOMAIN checked_cash AS money CHECK(VALUE IS NULL OR VALUE >= '-92233720368547758.08'::money);
CREATE TYPE cash_span AS RANGE(subtype=money,multirange_type_name=cash_set);
CREATE TYPE checked_cash_span;
CREATE FUNCTION cash_canonical(checked_cash_span) RETURNS checked_cash_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
CREATE TYPE checked_cash_span AS RANGE(subtype=checked_cash,canonical=cash_canonical,multirange_type_name=checked_cash_set);
CREATE OR REPLACE FUNCTION cash_canonical(checked_cash_span) RETURNS checked_cash_span LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RETURN $1; END$$;
CREATE DOMAIN cash_history AS cash_span[];
CREATE DOMAIN checked_history AS checked_cash_span[];
CREATE DOMAIN cash_set_history AS cash_set[];
CREATE DOMAIN money_history AS checked_cash[];
`)
    const span = '[-92233720368547758.08,92233720368547758.07]',
      finite = '[1234.56,2000.01]',
      arr = rangeArrayText([finite, null, 'empty'], -2),
      nested = rangeArrayText([arr, null], 3),
      multi = `{${finite},[3000.02,4000.03]}`
    const forms = [
      ['plain', 'cash_send', `${quote('1234.56')}::money`],
      ['money_array', 'cash_send', `(${quote('{1234.56,NULL,2000.01}')}::checked_cash[])[1]`],
      [
        'money_nested',
        'cash_send',
        `((${quote(rangeArrayText(['{1234.56,NULL,2000.01}', null]))}::money_history[])[1])[1]`,
      ],
      ['range', 'cash_send', `lower(${quote(finite)}::cash_span)`],
      ['lower_edge', 'cash_send', `lower(${quote(span)}::cash_span)`],
      ['upper_edge', 'cash_send', `upper(${quote(span)}::cash_span)`],
      ['multi', 'cash_send', `upper(${quote(multi)}::cash_set)`],
      ['range_array', 'cash_send', `lower((${quote(arr)}::cash_span[])[-2])`],
      ['range_nested', 'cash_send', `lower(((${quote(nested)}::cash_history[])[3])[-2])`],
      [
        'multi_nested',
        'cash_send',
        `upper(((${quote(rangeArrayText([rangeArrayText([multi, null])]))}::cash_set_history[])[1])[1])`,
      ],
      ['checked_range', 'cash_send', `lower(${quote(finite)}::checked_cash_span)`],
      ['checked_multi', 'cash_send', `upper(${quote(multi)}::checked_cash_set)`],
      ['checked_array', 'cash_send', `lower((${quote(arr)}::checked_history)[-2])`],
      ['checked_nested', 'cash_send', `lower(((${quote(nested)}::checked_history[])[3])[-2])`],
      ['unbounded', 'cash_send', `lower('(,)'::cash_span)`],
      ['empty', 'cash_send', `lower('empty'::cash_span)`],
      ['multi_empty', 'cash_send', `lower('{}'::cash_set)`],
      ['array_null', 'cash_send', `lower((${quote(arr)}::cash_span[])[-1])`],
    ] as const
    const expected = new Map<string, string | null>(),
      expressions = new Map<string, string>()
    for (const [name, send, value] of forms) {
      expected.set(
        name,
        (await pg.query<{ wire: string | null }>(`SELECT encode(${send}(${value}),'hex') wire`))
          .rows[0]!.wire,
      )
      const sql = `CASE WHEN bypass THEN true ELSE ${send}(${value}) IS NOT DISTINCT FROM expected END`
      expressions.set(name, sql)
      await pg.exec(
        `CREATE TABLE money_container_${name}(bypass bool,source text,expected bytea,CONSTRAINT matches CHECK(${sql}))`,
      )
    }
    const renderedFinite = (
      await pg.query<{ value: string }>(`SELECT ${quote(finite)}::cash_span::text value`)
    ).rows[0]!.value
    const runtime = `CASE WHEN bypass THEN true ELSE cash_send(lower(source::cash_span)) IS NOT DISTINCT FROM expected AND cash_send(lower('[1234.56,2000.01]'::cash_span)) IS NOT DISTINCT FROM expected END`
    await pg.exec(
      `CREATE TABLE money_container_runtime(bypass bool,source text,expected bytea,CONSTRAINT matches CHECK(${runtime}))`,
    )
    expressions.set('runtime', runtime)
    expected.set('runtime', expected.get('range')!)
    await pg.exec(`
ALTER DOMAIN checked_cash ADD CONSTRAINT changed CHECK(false) NOT VALID;
CREATE OR REPLACE FUNCTION cash_canonical(checked_cash_span) RETURNS checked_cash_span LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'canonicalizer replayed' USING ERRCODE='22000'; END$$;
SET array_nulls=off;
SET lc_monetary='POSIX';
`)
    await expect(pg.query('SELECT $1::checked_cash_span', [finite])).rejects.toMatchObject({
      code: '23514',
    })
    await expect(
      pg.query("SELECT cash_canonical('empty'::checked_cash_span)"),
    ).rejects.toMatchObject({ code: '22000' })
    const before = (await pg.query('SHOW lc_monetary')).rows[0],
      catalog = await snapshotCatalog(pg)
    expect((await pg.query('SHOW lc_monetary')).rows[0]).toEqual(before)
    const tables = [...expressions.keys()].map((name) =>
      catalog.tables.find((t) => t.name === 'money_container_' + name)!,
    )
    for (const table of tables) {
      const name = table.name.slice('money_container_'.length),
        literals = table.constraints[0]!.moneyLiterals ?? []
      if (!['unbounded', 'empty', 'multi_empty'].includes(name))
        expect(literals.length, name).toBeGreaterThan(0)
      if (name === 'lower_edge')
        expect(literals.map((l) => l.units)).toContain('-9223372036854775808')
      if (name === 'upper_edge')
        expect(literals.map((l) => l.units)).toContain('9223372036854775807')
    }
    const plans = tables.map((table) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: 'matches',
        },
        expression: lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          'stored',
          catalog.rangeTypes,
        )!.expression,
      })),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, JSON.stringify(plans[index])).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const name of expressions.keys()) {
      const table = 'money_container_' + name
      for (const bypass of [false, true])
        for (const wrong of [false, true]) {
          const wire = wrong ? '0102030405060708' : expected.get(name)!,
            source = name === 'runtime' ? renderedFinite : finite
          let native: Outcome
          try {
            const row = (
              await pg.query<{ value: boolean | null }>(
                `INSERT INTO ${table}(bypass,source,expected) VALUES($1,$2,decode($3,'hex')) RETURNING true value`,
                [bypass, source, wire],
              )
            ).rows[0]!
            native = { kind: row.value === null ? 'Null' : row.value ? 'True' : 'False' }
          } catch (error) {
            const e = error as { code: string; constraint?: string }
            native =
              e.code === '23514' && e.constraint === 'matches'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(e.code, 36) } }
          }
          const result: Outcome = name === 'runtime' && !bypass ? { kind: 'Unknown' } : native
          references.push({ name, bypass, wrong, native, result })
          fixtures.push({
            name: table,
            row: { bypass: cell(bypass), source: cell(source), expected: cell(wire) },
            expected: result,
          })
        }
    }
    await mkdir('artifacts/money-container-literals', { recursive: true })
    await writeFile(
      'artifacts/money-container-literals/report.json',
      JSON.stringify(
        {
          plans: plans.length,
          definitions: tables.map((t) => ({ name: t.name, constraint: t.constraints[0] })),
          expressions: plans,
          inserts: references.length,
          fixtures: fixtures.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'moneycontainerliterals',
      group,
      tables.map((t) => t.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
