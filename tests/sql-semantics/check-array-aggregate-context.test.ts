import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('preserves the strict direct-call aggregate-context error, eager arguments, partial inputs and constant preparation in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-aggregate-context-'))
  try {
    const forms: Record<string, string> = {
      raw: 'int4_avg_combine(raw_left,raw_right) IS NULL',
      direct: 'int4_avg_combine(payload::bigint[],alternate::bigint[]) IS NULL',
      count: 'cardinality(int4_avg_combine(payload::bigint[],alternate::bigint[]))=0',
      computed: 'cardinality(ARRAY[int4_avg_combine(payload::bigint[],alternate::bigint[])])=0',
      lazy: 'CASE WHEN bypass THEN true ELSE int4_avg_combine(payload::bigint[],alternate::bigint[]) IS NULL END',
      eager: 'int4_avg_combine(ARRAY[quantity/divisor]::bigint[],NULL::bigint[]) IS NULL',
      prepared:
        "CASE WHEN bypass THEN true ELSE int4_avg_combine('{}'::bigint[],'{}'::bigint[]) IS NULL END",
      pruned:
        "CASE WHEN true THEN true ELSE int4_avg_combine('{}'::bigint[],'{}'::bigint[]) IS NULL END",
      partial: 'int4_avg_combine(ARRAY[quantity::bigint,NULL],ARRAY[divisor::bigint]) IS NULL',
      nested_null:
        'int4_avg_combine(int4_avg_combine(payload::bigint[],alternate::bigint[]),NULL::bigint[]) IS NULL',
    }
    await pg.exec(
      'CREATE TABLE aggregate_context_values(payload text,alternate text,quantity integer,divisor integer,bypass boolean,raw_left bigint[],raw_right bigint[]);CREATE TABLE aggregate_context_oracle(LIKE aggregate_context_values);',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE aggregate_context_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'aggregate_context_values')!
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
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    for (const p of plans) expect(hasUncertain(p.expression), p.identity.constraint).toBe(false)
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? c.reason : '')).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: { ...row }, expected })
    }
    const base = {
      payload: '{1,2}' as string | null,
      alternate: '{3,4}' as string | null,
      quantity: 1 as number | null,
      divisor: 1 as number | null,
      bypass: false,
    }
    const samples = [
      base,
      ...['{}', '{NULL}', null, '{{1,2}}', '{bad}', '{1,'].map((payload) => ({ ...base, payload })),
      ...['{}', '{NULL}', null, '{{1,2}}', '{bad}', '{1,'].map((alternate) => ({
        ...base,
        alternate,
      })),
      { ...base, payload: null, alternate: '{bad}' },
      { ...base, payload: '{bad}', alternate: null },
      { ...base, payload: null, alternate: null },
      { ...base, quantity: null, divisor: 0 },
      { ...base, divisor: 0 },
      { ...base, quantity: -2147483648, divisor: -1 },
      { ...base, divisor: null },
    ]
    for (const [name, sql] of Object.entries(forms).filter(([name]) => name !== 'raw'))
      for (const sample of samples)
        for (const bypass of [false, true]) {
          const values = [sample.payload, sample.alternate, sample.quantity, sample.divisor, bypass]
          await pg.exec('TRUNCATE aggregate_context_oracle')
          await pg.query('INSERT INTO aggregate_context_oracle VALUES($1,$2,$3,$4,$5)', values)
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT (${sql})value FROM aggregate_context_oracle`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (caught) {
            expected = error((caught as { code: string }).code)
          }
          const row = Object.fromEntries(
            ['payload', 'alternate', 'quantity', 'divisor', 'bypass'].map((k, i) => [
              k,
              known(values[i]!),
            ]),
          )
          add(name, row, expected)
          observations.push({ name, values, expected })
        }
    const row: Row = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, known(v)]))
    for (const missing of ['payload', 'alternate']) {
      add('direct', { ...row, [missing]: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(
        'direct',
        {
          ...row,
          [missing]: { kind: 'Unknown' },
          [missing === 'payload' ? 'alternate' : 'payload']: known(null),
        },
        { kind: 'Unknown' },
      )
      add(
        'lazy',
        {
          ...row,
          [missing]: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          bypass: known(true),
        },
        { kind: 'True' },
      )
    }
    add('partial', { ...row, quantity: { kind: 'Unknown' } }, error('XX000'))
    add(
      'partial',
      { ...row, quantity: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
      error('22003'),
    )
    const states: Input[] = [
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ]
    const rightStates: Input[] = [
      states[0]!,
      states[1]!,
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    ]
    for (const left of states)
      for (const right of rightStates) {
        const expected: Outcome =
          left.kind === 'Error'
            ? left
            : right.kind === 'Error'
              ? right
              : left.kind === 'Null' || right.kind === 'Null'
                ? { kind: 'True' }
                : { kind: 'Unknown' }
        add('raw', { ...row, raw_left: left, raw_right: right }, expected)
      }
    await mkdir('artifacts/goal-checks/array-aggregate-audit', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-aggregate-audit/context-observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayaggregatecontext',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-aggregate-audit/context-measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
