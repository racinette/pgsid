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
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('matches threshold binary search, compatible overloads, shape/NULL errors and lazy preparation in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-bucket-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';CREATE TYPE bucket_stage AS ENUM ('z','a','m');CREATE DOMAIN bucket_count AS integer;CREATE TABLE bucket_values(a text,needle text,quantity integer,divisor integer,bypass boolean,expected integer);CREATE TABLE bucket_oracle(LIKE bucket_values)",
    )
    const calls: Record<string, string> = {
      ints: 'width_bucket((needle::integer[])[1],a::integer[])',
      wide: 'width_bucket((needle::bigint[])[1],a::bigint[])',
      decimals: 'width_bucket((needle::numeric[])[1],a::numeric[])',
      singles: 'width_bucket((needle::real[])[1],a::real[])',
      doubles: 'width_bucket((needle::double precision[])[1],a::double precision[])',
      mixed_integer: 'width_bucket((needle::smallint[])[1],a::bigint[])',
      mixed_numeric: 'width_bucket((needle::integer[])[1],a::numeric[])',
      mixed_float: 'width_bucket((needle::real[])[1],a::double precision[])',
      domains: 'width_bucket(((needle::integer[])[1])::bucket_count,a::integer[])',
      stages: 'width_bucket((needle::bucket_stage[])[1],a::bucket_stage[])',
      words: 'width_bucket((needle::text[])[1] COLLATE "C",a::text[])',
      constructed: 'width_bucket(quantity,ARRAY[0,2,4])',
      eager: 'width_bucket(quantity/divisor,a::integer[])',
      lazy: 'CASE WHEN bypass THEN 7 ELSE width_bucket((needle::integer[])[1],a::integer[]) END',
      prepared_shape: 'CASE WHEN bypass THEN 7 ELSE width_bucket(1,ARRAY[[1,2]]) END',
      prepared_nulls: 'CASE WHEN bypass THEN 7 ELSE width_bucket(1,ARRAY[1,NULL]) END',
      prepared_order: "CASE WHEN bypass THEN 7 ELSE width_bucket('1'::json,ARRAY['1'::json]) END",
      pruned_shape: 'CASE WHEN true THEN 7 ELSE width_bucket(1,ARRAY[[1,2]]) END',
      strict_null: 'width_bucket(NULL::integer,a::integer[])',
      strict_array: 'width_bucket(quantity/divisor,NULL::integer[])',
      wrapped: 'cardinality(ARRAY[width_bucket((needle::integer[])[1],a::integer[])])',
    }
    const forms = Object.fromEntries(
      Object.entries(calls).map(([name, sql]) => [name, `(${sql}) IS NOT DISTINCT FROM expected`]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE bucket_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'bucket_values')!
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
              ? table.constraints.find((c) => c.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
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
    const cases: (string | null)[][] = [
      ['{}', '1'],
      ['{z,a,m}', 'a'],
      ['{m,z,a}', 'a'],
      ['{a,z,雪,😊}', '雪'],
      ['{10,20,30}', '5'],
      ['{10,20,30}', '10'],
      ['{10,20,30}', '19'],
      ['{10,20,30}', '20'],
      ['{10,20,30}', '25'],
      ['{10,20,30}', '30'],
      ['{10,20,30}', '40'],
      ['{1,2,2,2,3}', '2'],
      ['{9007199254740992,9007199254740993,9007199254740994}', '9007199254740993'],
      ['{30,10,20}', '15'],
      ['{3,2,1}', '2'],
      ['[0:2]={10,20,30}', '20'],
      ['[-2147483648:-2147483646]={10,20,30}', '20'],
      ['[2147483644:2147483646]={10,20,30}', '20'],
      ['{{1,2}}', '1'],
      ['{{1,NULL}}', '1'],
      ['{1,NULL,3}', '9'],
      ['{NULL}', '1'],
      ['bad', '1'],
      ['{bad}', '1'],
      ['{1,2}', 'bad'],
      ['{1.00,1.0,2.00}', '1'],
      ['{-Infinity,-1,0,Infinity,NaN}', 'NaN'],
      ['{-Infinity,-1,0,Infinity,NaN}', 'Infinity'],
      ['{NaN,0,-Infinity}', 'NaN'],
      ['{-0,0,0}', '-0'],
      [null, '1'],
      ['{1,2}', null],
      [null, null],
      ['bad', null],
      [null, 'bad'],
    ]
    for (const [a, scalar] of cases)
      for (const bypass of [false, true]) {
        const needle = scalar === null ? null : '{' + JSON.stringify(scalar) + '}'
        await pg.exec('TRUNCATE bucket_oracle')
        await pg.query('INSERT INTO bucket_oracle VALUES($1,$2,1,1,$3,NULL)', [a, needle, bypass])
        for (const [name, sql] of Object.entries(calls)) {
          let output: number | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: number | null }>(`SELECT ${sql} value FROM bucket_oracle`)
            ).rows[0]!.value
            expected = { kind: 'True' }
          } catch (cause) {
            const code = (cause as { code: string }).code
            expect(['22P02', '22003', '22004', '2202E', '42883']).toContain(code)
            expected = error(code)
          }
          references.push({ name, a, needle, bypass, output, expected })
          const row = {
            a: known(a!),
            needle: known(needle!),
            quantity: known(1),
            divisor: known(1),
            bypass: known(bypass),
            expected: known(output),
          }
          add(name, row, expected)
          if (expected.kind === 'True')
            add(
              name,
              { ...row, expected: known(output === null ? -99 : output + 1) },
              { kind: 'False' },
            )
        }
      }
    const base = {
      a: known('{0,2,4}'),
      needle: known('{2}'),
      quantity: known(1),
      divisor: known(1),
      bypass: known(false),
      expected: known(1),
    }
    add('constructed', { ...base, quantity: unknown }, { kind: 'Unknown' })
    add('constructed', { ...base, quantity: error('22012') }, error('22012'))
    add('ints', { ...base, needle: unknown }, { kind: 'Unknown' })
    add('ints', { ...base, a: unknown }, { kind: 'Unknown' })
    add('ints', { ...base, a: error('22003'), needle: error('22012') }, error('22012'))
    add('ints', { ...base, a: error('22003'), needle: unknown }, error('22003'))
    add('eager', { ...base, quantity: known(1), divisor: known(0) }, error('22012'))
    add(
      'lazy',
      { ...base, bypass: known(true), a: error('22003'), expected: known(7) },
      { kind: 'True' },
    )
    add('strict_null', { ...base, a: error('22003'), expected: known(null) }, { kind: 'True' })
    add(
      'strict_array',
      { ...base, quantity: error('22012'), divisor: known(0), expected: known(null) },
      { kind: 'True' },
    )
    await mkdir('artifacts/array-bucket', { recursive: true })
    await writeFile(
      'artifacts/array-bucket/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-bucket/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraybucket',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
