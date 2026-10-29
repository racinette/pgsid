import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('retains safe unknown hash validity, nominal enum deferrals, argument errors and strict NULL folding', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-hash-state-'))
  try {
    await pg.exec("CREATE TYPE hash_stage AS ENUM ('first','last')")
    const expressions = {
      plain: 'hash_array(ARRAY[quantity,NULL,quantity])=expected32',
      seeded: 'hash_array_extended(ARRAY[quantity],seed)=expected64',
      wrapped: 'cardinality(ARRAY[hash_array(ARRAY[quantity])])=1',
      wrapped_seeded: 'cardinality(ARRAY[hash_array_extended(ARRAY[quantity],seed)])=1',
      unsafe: 'cardinality(ARRAY[hash_array(ARRAY[quantity/divisor])])=1',
      stage: 'hash_array(ARRAY[stage])=expected32',
      stage_wrapped: 'cardinality(ARRAY[hash_array(ARRAY[stage])])=1',
      all_null_stage: 'hash_array(ARRAY[NULL::hash_stage,NULL])=961',
      empty_stage: 'hash_array(ARRAY[]::hash_stage[])=1',
      skipped: 'CASE WHEN bypass THEN true ELSE hash_array(ARRAY[quantity/divisor])=expected32 END',
      strict_seed: 'hash_array_extended(ARRAY[quantity/divisor],NULL::bigint) IS NULL',
      strict_array: 'hash_array_extended(NULL::json[],seed) IS NULL',
    }
    await pg.exec(
      `CREATE TABLE hash_states(quantity integer,divisor integer,stage hash_stage,seed bigint,bypass boolean,expected32 integer,expected64 bigint,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'hash_states')!
    const enums = catalog.enums.map((definition) => ({ ...definition, valueOids: undefined }))
    const plans = Object.entries(expressions).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: lowerTableCheck(
          table,
          origin === 'source'
            ? { name, type: 'check', definition: `CHECK(${sql})` }
            : table.constraints.find((c) => c.name === name)!,
          enums,
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
    const group = prepareCheckRustGroup(plans)
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    expect(group.evaluatorSource).not.toContain('make_catalog_enum_value(')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      base: Row = {
        quantity: known(1),
        divisor: known(1),
        stage: known(0),
        seed: known(0n),
        bypass: known(false),
        expected32: known(0),
        expected64: known(0n),
      }
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const state of [{ kind: 'Unknown' } as const, { kind: 'Null' } as const, error('22012')]) {
      add(
        'wrapped',
        { ...base, quantity: state },
        state.kind === 'Error' ? state : { kind: 'True' },
      )
      add(
        'wrapped_seeded',
        { ...base, quantity: state },
        state.kind === 'Error' ? state : { kind: 'True' },
      )
      add(
        'wrapped_seeded',
        { ...base, seed: state },
        state.kind === 'Error' ? state : { kind: 'True' },
      )
      add(
        'stage_wrapped',
        { ...base, stage: state },
        state.kind === 'Error' ? state : { kind: 'True' },
      )
      add('stage', { ...base, stage: state }, state.kind === 'Null' ? { kind: 'False' } : state)
      add('unsafe', { ...base, quantity: state }, state.kind === 'Null' ? { kind: 'True' } : state)
      add('strict_seed', { ...base, quantity: state, divisor: known(0) }, { kind: 'True' })
      add('strict_array', { ...base, seed: state }, { kind: 'True' })
      add(
        'skipped',
        { ...base, quantity: state, divisor: known(0), bypass: known(true) },
        { kind: 'True' },
      )
    }
    for (const ordinal of [0, 1]) {
      add('stage', { ...base, stage: known(ordinal) }, { kind: 'Unknown' })
      add('stage_wrapped', { ...base, stage: known(ordinal) }, { kind: 'True' })
    }
    for (const name of ['all_null_stage', 'empty_stage']) add(name, base, { kind: 'True' })
    add('unsafe', { ...base, divisor: known(0) }, error('22012'))
    add(
      'wrapped_seeded',
      { ...base, quantity: { kind: 'Unknown' }, seed: error('22003') },
      error('22003'),
    )
    add(
      'unsafe',
      { ...base, quantity: { kind: 'Unknown' }, divisor: known(0) },
      { kind: 'Unknown' },
    )
    await runCheckParity(
      directory,
      'arrayhashstate',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await mkdir('artifacts/goal-checks/array-hash-dispatch', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/state-measurements.json',
      JSON.stringify({ fixtures: fixtures.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
