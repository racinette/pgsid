import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Outcome & Input => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('preserves computed ARRAY element validity, lazy branches, safe unknown values and ordered errors in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-constructor-validity-'))
  const dims = (sql: string, expected = '[1:1]') =>
    `array_dims(${sql}) COLLATE "C" = '${expected}' COLLATE "C"`
  const forms: Record<string, string> = {
    parse: dims('ARRAY[payload::numeric]'),
    arithmetic: dims('ARRAY[quantity+other]'),
    widening: dims('ARRAY[quantity::bigint]'),
    comparison: dims('ARRAY[quantity=other]'),
    null_test: dims('ARRAY[quantity IS NULL]'),
    opaque_null_test: dims('ARRAY[opaque IS NULL]'),
    opaque_choice: dims('ARRAY[CASE WHEN flag THEN opaque IS NULL ELSE quantity IS NULL END]'),
    parsed_null_test: dims('ARRAY[(payload::numeric) IS NULL]'),
    choice: dims('ARRAY[CASE WHEN flag THEN quantity::numeric ELSE payload::numeric END]'),
    safe_choice: dims('ARRAY[CASE WHEN flag THEN quantity ELSE other END]'),
    pruned_choice: dims(
      'ARRAY[CASE WHEN flag THEN CASE WHEN true THEN quantity ELSE other END ELSE quantity END]',
    ),
    pruned_coalesce: dims('ARRAY[CASE WHEN flag THEN COALESCE(1,other) ELSE quantity END]'),
    coalesce: dims('ARRAY[COALESCE(quantity::numeric,payload::numeric)]'),
    safe_coalesce: dims('ARRAY[COALESCE(quantity,other)]'),
    conjunction: dims('ARRAY[quantity>0 AND payload::numeric>0]'),
    disjunction: dims('ARRAY[quantity>0 OR payload::numeric>0]'),
    nested: dims('ARRAY[ARRAY[payload::numeric],ARRAY[quantity::numeric]]', '[1:2][1:1]'),
    safe_nested: dims('ARRAY[ARRAY[quantity],ARRAY[other]]', '[1:2][1:1]'),
    fetch: '(ARRAY[NULL::numeric,payload::numeric])[1] IS NULL',
    safe_fetch: '(ARRAY[NULL::integer,quantity])[1] IS NULL',
    array_comparison: dims('ARRAY[ARRAY[quantity]=ARRAY[other]]'),
    ordered: dims('ARRAY[payload::numeric,(1/quantity)::numeric]', '[1:2]'),
    reverse_order: dims('ARRAY[(1/quantity)::numeric,payload::numeric]', '[1:2]'),
    prepared: dims("ARRAY[CASE WHEN flag THEN quantity::numeric ELSE ('bad'::text)::numeric END]"),
    pruned: dims("ARRAY[CASE WHEN true THEN quantity::numeric ELSE ('bad'::text)::numeric END]"),
    membership: dims('ARRAY[quantity::numeric IN (other::numeric,payload::numeric)]'),
    safe_membership: dims('ARRAY[quantity IN (other,quantity)]'),
    row_order: dims('ARRAY[(quantity::numeric,other::numeric)<(other::numeric,payload::numeric)]'),
    safe_row_order: dims('ARRAY[(quantity,other)<(other,quantity)]'),
  }
  try {
    await pg.exec(
      'CREATE TABLE constructor_validity(payload text,quantity integer,other integer,flag boolean,opaque int4range);CREATE TABLE constructor_validity_oracle(LIKE constructor_validity)',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE constructor_validity ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'constructor_validity')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints.find((item) => item.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    expect(
      plans.filter((plan) => hasUncertain(plan.expression)).map((plan) => plan.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const concrete = [
      ['1', 1, 2, true],
      ['bad', 0, 2, false],
      ['bad', 1, 1, true],
      ['bad', -1, 2, false],
      [null, null, null, null],
      ['1', null, 2, false],
      ['1', 2147483647, 1, true],
      ['1', -2147483648, -1, false],
      ['2', 2, 2, null],
      ['bad', null, 2, true],
      ['1', 0, 0, false],
      ['2147483648', 1, 2, true],
    ] as const
    for (const values of concrete) {
      await pg.exec('TRUNCATE constructor_validity_oracle')
      await pg.query('INSERT INTO constructor_validity_oracle VALUES($1,$2,$3,$4,int4range(1,2))', [
        ...values,
      ])
      const row = {
        payload: known(values[0]),
        quantity: known(values[1]),
        other: known(values[2]),
        flag: known(values[3]),
        opaque: known('[1,2)'),
      }
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} value FROM constructor_validity_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (cause) {
          const code = (cause as { code: string }).code
          expect(['22P02', '22003', '22012']).toContain(code)
          expected = error(code)
        }
        references.push({ name, values, expected })
        add(name, row, expected)
      }
    }
    const base: Row = {
      opaque: unknown,
      payload: known('bad'),
      quantity: unknown,
      other: unknown,
      flag: unknown,
    }
    for (const name of [
      'parse',
      'arithmetic',
      'parsed_null_test',
      'choice',
      'coalesce',
      'conjunction',
      'disjunction',
      'nested',
      'fetch',
      'ordered',
      'reverse_order',
      'row_order',
    ])
      add(name, { ...base, payload: unknown }, { kind: 'Unknown' })
    for (const name of [
      'widening',
      'comparison',
      'null_test',
      'opaque_null_test',
      'opaque_choice',
      'safe_choice',
      'pruned_choice',
      'pruned_coalesce',
      'safe_coalesce',
      'safe_nested',
      'safe_fetch',
      'array_comparison',
      'pruned',
      'safe_membership',
      'safe_row_order',
    ])
      add(name, base, { kind: 'True' })
    add('opaque_choice', { ...base, opaque: error('22012') }, { kind: 'Unknown' })
    add('opaque_choice', { ...base, flag: known(false), opaque: error('22012') }, { kind: 'True' })
    add('opaque_null_test', { ...base, opaque: error('22012') }, error('22012'))
    add('choice', { ...base, flag: known(true) }, { kind: 'True' })
    add('choice', { ...base, flag: known(false) }, error('22P02'))
    add('choice', base, { kind: 'Unknown' })
    add('pruned_choice', { ...base, other: error('22012') }, { kind: 'True' })
    add('pruned_coalesce', { ...base, other: error('22012') }, { kind: 'True' })
    add('safe_choice', { ...base, other: error('22012') }, { kind: 'Unknown' })
    add('safe_choice', { ...base, flag: known(true), other: error('22012') }, { kind: 'True' })
    add('safe_coalesce', { ...base, other: error('22012') }, { kind: 'Unknown' })
    add('safe_coalesce', { ...base, quantity: known(1), other: error('22012') }, { kind: 'True' })
    add('coalesce', { ...base, quantity: known(1) }, { kind: 'True' })
    add('coalesce', { ...base, quantity: known(null), payload: unknown }, { kind: 'Unknown' })
    add('conjunction', base, { kind: 'Unknown' })
    add('disjunction', base, { kind: 'Unknown' })
    for (const name of ['conjunction', 'disjunction'])
      add(name, { ...base, payload: known('1') }, { kind: 'True' })
    add('conjunction', { ...base, quantity: known(0) }, { kind: 'True' })
    add('disjunction', { ...base, quantity: known(1) }, { kind: 'True' })
    add('ordered', { ...base, payload: unknown, quantity: known(0) }, { kind: 'Unknown' })
    add('ordered', { ...base, payload: known('bad') }, error('22P02'))
    add('reverse_order', { ...base, payload: unknown, quantity: known(0) }, error('22012'))
    add('ordered', { ...base, payload: error('22012') }, error('22012'))
    add('ordered', { ...base, payload: unknown, quantity: error('22012') }, { kind: 'Unknown' })
    add('prepared', { ...base, flag: known(true) }, error('22P02'))
    add('membership', base, { kind: 'Unknown' })
    add('membership', { ...base, quantity: known(1), other: known(1) }, { kind: 'True' })
    add('membership', { ...base, quantity: known(1), other: known(2) }, error('22P02'))
    await mkdir('artifacts/array-constructor-validity', { recursive: true })
    await writeFile(
      'artifacts/array-constructor-validity/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-constructor-validity/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile('artifacts/array-constructor-validity/diagnostic.json', JSON.stringify(group))
    await runCheckParity(
      directory,
      'constructorvalidity',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
