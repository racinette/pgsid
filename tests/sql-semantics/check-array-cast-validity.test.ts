import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
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

it('preserves array cast validity for unknown narrowing, safe widening, modifiers, ordered errors and lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-cast-validity-'))
  const shape = (array: string, expected = '[1:1]') =>
    `array_dims(${array}) COLLATE "C" = '${expected}' COLLATE "C"`
  const forms: Record<string, string> = {
    narrow: shape('(ARRAY[quantity]::integer[])::smallint[]'),
    wider: shape('(ARRAY[quantity]::integer[])::bigint[]'),
    numeric: shape('(ARRAY[quantity]::integer[])::numeric[]'),
    floating: shape('(ARRAY[quantity]::integer[])::real[]'),
    bits: shape('(ARRAY[quantity]::integer[])::bit(3)[]'),
    bits_default: shape('(ARRAY[quantity]::integer[])::bit[]'),
    varying_bits: shape('((ARRAY[quantity]::integer[])::bit(3)[])::varbit[]'),
    typmod_order: shape('(ARRAY[quantity,other]::integer[])::numeric(2,0)[]', '[1:2]'),
    parsed_numeric: shape('(ARRAY[payload::numeric])::integer[]'),
    numeric_scale: shape('(ARRAY[quantity]::integer[])::numeric(2,0)[]'),
    character_width: shape('(ARRAY[payload]::text[])::varchar(3)[]'),
    character_pad: shape('(ARRAY[payload]::text[])::char(3)[]'),
    parsed_float: shape('(ARRAY[payload::double precision])::integer[]'),
    float_width: shape('(ARRAY[payload::double precision])::real[]'),
    narrow_null: '(((ARRAY[NULL::integer,quantity]::integer[])::smallint[])[1] IS NULL)',
    wider_null: '(((ARRAY[NULL::integer,quantity]::integer[])::bigint[])[1] IS NULL)',
    earlier_unknown: shape('(ARRAY[quantity,other]::integer[])::smallint[]', '[1:2]'),
    nested: shape('ARRAY[(ARRAY[quantity]::integer[])::smallint[]]', '[1:1][1:1]'),
    nested_bits: shape('ARRAY[(ARRAY[quantity]::integer[])::bit(3)[]]', '[1:1][1:1]'),
    guarded: shape(
      'CASE WHEN bypass THEN ARRAY[1]::smallint[] ELSE (ARRAY[quantity]::integer[])::smallint[] END',
    ),
    coalesced: shape('COALESCE((ARRAY[quantity]::integer[])::smallint[],ARRAY[1]::smallint[])'),
    prepared: shape(
      "CASE WHEN bypass THEN ARRAY[1]::smallint[] ELSE ('{32768}'::integer[])::smallint[] END",
    ),
    pruned: shape(
      "CASE WHEN true THEN ARRAY[1]::smallint[] ELSE ('{32768}'::integer[])::smallint[] END",
    ),
  }
  try {
    await pg.exec(
      'CREATE TABLE cast_validity(quantity integer,other integer,payload text,bypass boolean);CREATE TABLE cast_validity_oracle(LIKE cast_validity)',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE cast_validity ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'cast_validity')!
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
    const rows = [
      [1, 2, '1.25', false],
      [32768, 1, '2147483648', false],
      [-32769, 32768, 'NaN', true],
      [null, null, null, false],
      [99, 100, '1e100', false],
      [100, 1, 'Infinity', true],
      [-2147483648, 2147483647, '-Infinity', false],
      [0, 0, 'bad', true],
    ] as const
    for (const values of rows) {
      await pg.exec('TRUNCATE cast_validity_oracle')
      await pg.query('INSERT INTO cast_validity_oracle VALUES($1,$2,$3,$4)', [...values])
      const row = {
        quantity: known(values[0]),
        other: known(values[1]),
        payload: known(values[2]),
        bypass: known(values[3]),
      }
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} value FROM cast_validity_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (cause) {
          const code = (cause as { code: string }).code
          expect(['22003', '22P02', '0A000'], name + ': ' + (cause as Error).message).toContain(
            code,
          )
          expected = error(code)
        }
        references.push({ name, values, expected })
        add(name, row, expected)
      }
    }
    const base: Row = { quantity: unknown, other: known(1), payload: unknown, bypass: known(false) }
    for (const name of [
      'narrow',
      'parsed_numeric',
      'numeric_scale',
      'typmod_order',
      'parsed_float',
      'float_width',
      'narrow_null',
      'earlier_unknown',
      'nested',
      'guarded',
      'coalesced',
    ])
      add(name, base, { kind: 'Unknown' })
    for (const name of [
      'wider',
      'numeric',
      'floating',
      'bits',
      'bits_default',
      'varying_bits',
      'nested_bits',
      'wider_null',
      'pruned',
      'character_width',
      'character_pad',
    ])
      add(name, base, { kind: 'True' })
    add('typmod_order', { ...base, other: known(100) }, { kind: 'Unknown' })
    add('typmod_order', { ...base, quantity: known(100), other: unknown }, error('22003'))
    add('typmod_order', { ...base, other: error('22012') }, error('22012'))
    add('earlier_unknown', { ...base, other: known(32768) }, { kind: 'Unknown' })
    add('earlier_unknown', { ...base, quantity: known(32768), other: unknown }, error('22003'))
    add('earlier_unknown', { ...base, other: error('22012') }, error('22012'))
    add('guarded', { ...base, bypass: known(true), quantity: error('22003') }, { kind: 'True' })
    add('guarded', { ...base, bypass: unknown, quantity: known(32768) }, { kind: 'Unknown' })
    add('prepared', { ...base, bypass: known(true) }, error('22003'))
    await mkdir('artifacts/array-cast-validity', { recursive: true })
    await writeFile(
      'artifacts/array-cast-validity/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-cast-validity/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycastvalidity',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
