import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('matches array hash folds, dimensions, NULL cells, support errors, strict arguments and lazy composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-hash-values-'))
  try {
    await pg.exec(
      'CREATE DOMAIN hash_slots AS integer[];CREATE TABLE array_hash_values(a text,seed bigint,quantity integer,divisor integer,bypass boolean,expected32 integer,expected64 bigint);CREATE TABLE array_hash_oracle(LIKE array_hash_values)',
    )
    const calls: Record<string, string> = {
      plain: 'hash_array(a::integer[])',
      seeded: 'hash_array_extended(a::integer[],seed)',
      domain: 'hash_array(a::hash_slots)',
      promoted: 'hash_array_extended(a::integer[],quantity)',
      lazy: 'CASE WHEN bypass THEN 7 ELSE hash_array(a::integer[]) END',
      constructed: 'hash_array(ARRAY[quantity,NULL,quantity])',
      computed: 'hash_array(ARRAY[quantity/divisor,quantity])',
      reshaped: 'hash_array(ARRAY[a::integer[]])',
      reversed: 'hash_array(array_reverse(a::integer[]))',
      unsupported: 'hash_array(a::json[])',
      unsupported_extended: 'hash_array_extended(a::json[],seed)',
      unsupported_argument: 'hash_array(ARRAY[to_json(quantity/divisor)])',
      prepared_support: "CASE WHEN bypass THEN 7 ELSE hash_array(ARRAY['1'::json]) END",
      prepared_empty: "CASE WHEN bypass THEN 7 ELSE hash_array('{}'::json[]) END",
      pruned_support: "CASE WHEN true THEN 7 ELSE hash_array('{}'::json[]) END",
      null_array: 'hash_array_extended(NULL::json[],seed)',
      null_seed: 'hash_array_extended(a::integer[],NULL::bigint)',
    }
    const forms = Object.fromEntries(
      Object.entries(calls).map(([name, sql]) => [
        name,
        `(${sql}) IS NOT DISTINCT FROM ${['seeded', 'promoted', 'unsupported_extended', 'null_array', 'null_seed'].includes(name) ? 'expected64' : 'expected32'}`,
      ]),
    )
    Object.assign(forms, {
      wrapped: 'cardinality(ARRAY[hash_array(a::integer[])])=1',
      wrapped_nan: "cardinality(ARRAY[hash_array(ARRAY[hashfloat8('NaN'::float8)])])=1",
      wrapped_unsupported: 'cardinality(ARRAY[hash_array(a::json[])])=1',
      supported_nulls: 'hash_array(array_fill(NULL::integer,ARRAY[quantity]))=expected32',
      seeded_typed: 'hash_array_extended(ARRAY[quantity],seed) IS NOT DISTINCT FROM expected64',
    })
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE array_hash_values ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'array_hash_values')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            [],
            catalog.domains,
            origin,
          )!.expression,
        ),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      nativeByteOrder: 'little',
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.evaluatorSource).toContain('while array_hash_continues32(&')
    expect(group.evaluatorSource).toContain('while array_hash_continues64(&')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const base: Row = {
      a: known('{1,2,NULL}'),
      seed: known(0n),
      quantity: known(2),
      divisor: known(1),
      bypass: known(false),
      expected32: known(0),
      expected64: known(0n),
    }
    const oracle = async (name: string, row: Row) => {
      await pg.exec('TRUNCATE array_hash_oracle')
      await pg.query(
        'INSERT INTO array_hash_oracle(a,seed,quantity,divisor,bypass,expected32,expected64)VALUES($1,$2,$3,$4,$5,$6,$7)',
        ['a', 'seed', 'quantity', 'divisor', 'bypass', 'expected32', 'expected64'].map((k) =>
          row[k]!.kind === 'Value' ? String(row[k]!.value) : null,
        ),
      )
      let output: string | number | null = null,
        expected: Outcome
      try {
        if (calls[name]) {
          output = (
            await pg.query<{ value: string | number | null }>(
              `SELECT (${calls[name]})::text value FROM array_hash_oracle`,
            )
          ).rows[0]!.value
          const wide = [
            'seeded',
            'promoted',
            'unsupported_extended',
            'null_array',
            'null_seed',
          ].includes(name)
          row = {
            ...row,
            [wide ? 'expected64' : 'expected32']: known(
              output === null ? null : wide ? BigInt(output) : Number(output),
            ),
          }
        }
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${forms[name]} value FROM array_hash_oracle`,
          )
        ).rows[0]!.value
        if (calls[name]) expected = { kind: 'True' }
        else expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
      } catch (cause) {
        expected = error((cause as { code: string }).code)
      }
      observations.push({ name, row, output, expected })
      add(name, row, expected)
      if (calls[name] && expected.kind === 'True' && output !== null) {
        const wide = [
          'seeded',
          'promoted',
          'unsupported_extended',
          'null_array',
          'null_seed',
        ].includes(name)
        add(
          name,
          {
            ...row,
            [wide ? 'expected64' : 'expected32']: known(
              wide ? (BigInt(output) === 0n ? 1n : 0n) : Number(output) === 0 ? 1 : 0,
            ),
          },
          { kind: 'False' },
        )
      }
    }
    const arrays = [
      '{}',
      '{NULL}',
      '{NULL,NULL}',
      '{0}',
      '{1}',
      '{1,1,1}',
      '{1,2,3}',
      '{3,2,1}',
      '{1,NULL,2}',
      '[0:2]={1,2,3}',
      '[-2:-1][4:5]={{1,2},{3,4}}',
      '{{1,2},{3,4}}',
      '{-2147483648,2147483647}',
      null,
    ]
    for (const a of arrays)
      for (const seed of [
        0n,
        1n,
        -1n,
        -9223372036854775808n,
        9223372036854775807n,
        1311768467750121216n,
        null,
      ])
        for (const name of [
          'plain',
          'seeded',
          'domain',
          'promoted',
          'lazy',
          'reshaped',
          'reversed',
          'wrapped',
        ])
          await oracle(name, { ...base, a: known(a), seed: known(seed) })
    for (const a of ['{}', '{NULL}', '{NULL,NULL}', '{1}', '{{1,2}}', null])
      for (const name of ['unsupported', 'unsupported_extended', 'wrapped_unsupported'])
        await oracle(name, { ...base, a: known(a) })
    for (const name of ['constructed', 'computed', 'unsupported_argument', 'supported_nulls'])
      for (const quantity of [-1, 0, 1, 2, 31, 100])
        for (const divisor of [0, 1])
          await oracle(name, { ...base, quantity: known(quantity), divisor: known(divisor) })
    for (const name of [
      'prepared_support',
      'prepared_empty',
      'pruned_support',
      'null_array',
      'null_seed',
    ])
      for (const bypass of [false, true]) {
        const expected = name.startsWith('prepared')
          ? error('42883')
          : ({ kind: 'True' } as Outcome)
        if (name === 'null_array' || name === 'null_seed')
          await oracle(name, { ...base, a: known('bad'), bypass: known(bypass) })
        else add(name, { ...base, bypass: known(bypass), expected32: known(7) }, expected)
      }
    for (const state of [{ kind: 'Unknown' } as const, { kind: 'Null' } as const, error('22012')]) {
      add('plain', { ...base, a: state }, state.kind === 'Null' ? { kind: 'False' } : state)
      add('seeded', { ...base, a: state }, state.kind === 'Null' ? { kind: 'False' } : state)
      add('seeded', { ...base, seed: state }, state.kind === 'Null' ? { kind: 'False' } : state)
      add(
        'seeded',
        { ...base, a: state, seed: error('22003') },
        state.kind === 'Null' ? error('22003') : state,
      )
      add(
        'lazy',
        { ...base, a: state, bypass: known(true), expected32: known(7) },
        { kind: 'True' },
      )
      add('wrapped', { ...base, a: state }, state.kind === 'Null' ? { kind: 'True' } : state)
    }
    add(
      'seeded_typed',
      { ...base, quantity: { kind: 'Unknown' }, seed: error('22003') },
      error('22003'),
    )
    for (const [a, code] of [
      ['{1}', '22003'],
      ['bad', '22P02'],
    ] as const) {
      await pg.exec('TRUNCATE array_hash_oracle')
      await pg.query('INSERT INTO array_hash_oracle(a,quantity) VALUES($1,$2)', [a, 2147483647])
      await expect(
        pg.query('SELECT hash_array_extended(a::integer[],quantity+1) FROM array_hash_oracle'),
      ).rejects.toMatchObject({ code })
    }
    for (const quantity of [0, null]) {
      await pg.exec('TRUNCATE array_hash_oracle')
      await pg.query('INSERT INTO array_hash_oracle(quantity,seed) VALUES($1,$2)', [
        quantity,
        '9223372036854775807',
      ])
      await expect(
        pg.query('SELECT hash_array_extended(ARRAY[quantity],seed+1) FROM array_hash_oracle'),
      ).rejects.toMatchObject({ code: '22003' })
    }
    add('wrapped_nan', base, { kind: 'True' })
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/value-observations.json',
      JSON.stringify(observations, (_, v) => (typeof v === 'bigint' ? String(v) : v), 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayhashvalues',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/value-measurements.json',
      JSON.stringify(
        { fixtures: fixtures.length, postgresObservations: observations.length },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
