import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const outputs: Record<string, string> = {
  small_case: 'CASE WHEN flag THEN small ELSE fraction END',
  whole_case: 'CASE WHEN flag THEN whole ELSE fraction END',
  wide_case: 'CASE WHEN flag THEN wide ELSE fraction END',
  reversed_case: 'CASE WHEN flag THEN fraction ELSE small END',
  domain_case: 'CASE WHEN flag THEN domain_small ELSE fraction END',
  literal_case: 'CASE WHEN flag THEN small ELSE 1.5 END',
  function_case: 'CASE WHEN flag THEN small ELSE abs(-1.5) END',
  null_case: 'CASE WHEN flag THEN small ELSE NULL::numeric END',
  simple_case: 'CASE flag WHEN true THEN small WHEN false THEN fraction ELSE NULL END',
  coalesced_small: 'COALESCE(small,fraction)',
  coalesced_whole: 'COALESCE(whole,fraction)',
  coalesced_wide: 'COALESCE(wide,fraction)',
  coalesced_reverse: 'COALESCE(fraction,small)',
  coalesced_null: 'COALESCE(NULL::numeric,small)',
  nested: 'CASE WHEN flag THEN COALESCE(small,fraction) ELSE COALESCE(fraction,small) END',
  modifier: 'CASE WHEN flag THEN small ELSE fraction::numeric(6,2) END',
  small_overflow: 'CASE WHEN flag THEN small+1::smallint ELSE fraction END',
  whole_overflow: 'CASE WHEN flag THEN whole+1 ELSE fraction END',
  wide_overflow: 'CASE WHEN flag THEN wide+1::bigint ELSE fraction END',
  coalesced_overflow: 'COALESCE(small+1::smallint,fraction)',
  integer_control: 'CASE WHEN flag THEN small ELSE 1 END',
  string_control: "CASE WHEN flag THEN small ELSE '7' END",
  array_cell: '(ARRAY[CASE WHEN flag THEN small ELSE fraction END])[1]',
  greatest_control: 'GREATEST(small,fraction)',
}

it('resolves mixed integer/numeric choices through catalog casts while retaining result types, scales, branch-local overflow and lazy states in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-choices-'))
  try {
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `encode(numeric_send((${sql})),'hex') IS NOT DISTINCT FROM expected_wire`,
      ]),
    )
    await pg.exec(`CREATE DOMAIN tiny_quantity AS smallint;
      CREATE TABLE numeric_values(small smallint,whole integer,wide bigint,fraction numeric,flag boolean,domain_small tiny_quantity,expected_wire text COLLATE "C");
      CREATE TABLE numeric_checks(LIKE numeric_values,${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'numeric_checks')!
    const typeWitnesses = []
    for (const [name, sql] of Object.entries(outputs)) {
      const type = (
        await pg.query<{ type: string }>(
          `SELECT pg_typeof(${sql})::text type FROM (SELECT NULL::smallint small,NULL::integer whole,NULL::bigint wide,NULL::numeric fraction,false flag,NULL::tiny_quantity domain_small) candidate`,
        )
      ).rows[0]!.type
      const plan = lowerTableCheck(
        table,
        { name: 'type_probe', type: 'check', definition: `CHECK((${sql}) IS NULL)` },
        [],
        catalog.domains,
        'source',
      )!
      expect(plan.expression.kind, name).toBe('eval-scalar')
      if (plan.expression.kind !== 'eval-scalar' || plan.expression.expression.kind !== 'null-test')
        throw new Error('Expected scalar type probe: ' + name)
      const value = plan.expression.expression.operand
      const actual =
        'type' in value
          ? value.type
          : value.kind === 'call'
            ? value.call.type
            : value.kind === 'certain'
              ? value.expression.type
              : null
      expect(actual, name).toBe(catalogScalarType(type))
      typeWitnesses.push({ name, sql, postgresType: type, boundType: actual })
    }
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: lowerTableCheck(
          table,
          origin === 'stored'
            ? table.constraints.find((check) => check.name === name)!
            : { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          catalog.domains,
          origin,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      arrayNulls: true,
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const cases: [number | null, number | null, bigint | null, string | null, boolean | null][] = [
      [7, 9, 9007199254740993n, '1.2300', true],
      [7, 9, 9007199254740993n, '1.2300', false],
      [null, null, null, '1.2300', false],
      [null, null, null, null, true],
      [7, 9, 9007199254740993n, null, false],
      [32767, 2147483647, 9223372036854775807n, '1.235', true],
      [32767, 2147483647, 9223372036854775807n, '1.235', false],
      [-32768, -2147483648, -9223372036854775808n, '-0.000', true],
      [0, 0, 0n, '-0.000', false],
      [7, 9, 9007199254740993n, '9007199254740993.00', false],
      [7, 9, 1n, 'NaN', false],
      [7, 9, 1n, 'Infinity', false],
      [7, 9, 1n, '-Infinity', null],
    ]
    for (const values of cases) {
      await pg.exec('TRUNCATE numeric_values')
      await pg.query('INSERT INTO numeric_values VALUES($1,$2,$3,$4,$5,$6,NULL)', [
        ...values,
        values[0],
      ])
      const row: Row = Object.fromEntries(
        ['small', 'whole', 'wide', 'fraction', 'flag'].map((name, index) => [
          name,
          known(values[index]!),
        ]),
      )
      row.domain_small = known(values[0])
      for (const [name, sql] of Object.entries(outputs)) {
        let wire: string | null = null,
          expected: Outcome
        try {
          wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(numeric_send((${sql})),'hex') wire FROM numeric_values`,
            )
          ).rows[0]!.wire
          expected = { kind: 'True' }
        } catch (cause) {
          const state = (cause as { code: string }).code
          expect(['22003', '22012']).toContain(state)
          expected = failure(state)
        }
        references.push({ name, values, wire, expected })
        add(name, { ...row, expected_wire: known(wire) }, expected)
        if (expected.kind === 'True')
          add(name, { ...row, expected_wire: known('wrong') }, { kind: 'False' })
      }
    }
    const wire = async (value: string) =>
      (
        await pg.query<{ wire: string }>("SELECT encode(numeric_send($1::numeric),'hex') wire", [
          value,
        ])
      ).rows[0]!.wire
    const base: Row = {
      small: known(7),
      whole: known(9),
      wide: known(9007199254740993n),
      fraction: known('1.2300'),
      flag: known(true),
      domain_small: known(7),
      expected_wire: known(await wire('7')),
    }
    add('small_case', { ...base, fraction: failure('22003') }, { kind: 'True' })
    add(
      'small_case',
      {
        ...base,
        small: failure('22003'),
        flag: known(false),
        expected_wire: known(await wire('1.2300')),
      },
      { kind: 'True' },
    )
    add('coalesced_small', { ...base, fraction: failure('22003') }, { kind: 'True' })
    add(
      'coalesced_small',
      { ...base, small: known(null), fraction: failure('22003') },
      failure('22003'),
    )
    add('small_case', { ...base, small: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('small_case', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add(
      'string_control',
      { ...base, small: failure('22003'), flag: known(false) },
      { kind: 'True' },
    )
    await mkdir('artifacts/goal-checks/numeric-choices', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/numeric-choices/fixtures.json',
      JSON.stringify(
        { outputs, typeWitnesses, references, fixtures },
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'numericchoices',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
