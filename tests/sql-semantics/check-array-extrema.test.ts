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
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('selects raw/stored array extrema with retained payloads, strict states, dimensional ordering and lazy preparation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-extrema-values-'))
  const outputs: Record<string, string> = {}
  for (const fn of ['array_larger', 'array_smaller']) {
    outputs[fn] = `${fn}(a::integer[],b::integer[])::text`
    outputs[fn + '_numeric'] = `${fn}(a::numeric[],b::numeric[])::text`
    outputs[fn + '_domain'] = `${fn}(a::extreme_slots,b::integer[])::text`
    outputs[fn + '_guarded'] =
      `(CASE WHEN bypass THEN ARRAY[42] ELSE ${fn}(a::integer[],b::integer[]) END)::text`
    outputs[fn + '_coalesced'] = `COALESCE(${fn}(a::integer[],b::integer[]),ARRAY[42])::text`
    outputs[fn + '_nested'] = `cardinality(ARRAY[${fn}(a::integer[],b::integer[])])::text`
    outputs[fn + '_prepared'] =
      `(CASE WHEN bypass THEN ARRAY[42] ELSE ${fn}(('{32768}'::integer[])::smallint[],ARRAY[1]::smallint[])::integer[] END)::text`
    outputs[fn + '_pruned'] =
      `(CASE WHEN true THEN ARRAY[42] ELSE ${fn}(ARRAY[1/0],a::integer[]) END)::text`
    outputs[fn + '_literal_null'] = `${fn}(NULL::integer[],ARRAY[quantity])::text`
    outputs[fn + '_prepared_support'] =
      `CASE WHEN bypass THEN 'safe'::text ELSE ${fn}(ARRAY['1'::json],ARRAY['2'::json])::text END`
    outputs[fn + '_pruned_support'] =
      `CASE WHEN true THEN 'safe'::text ELSE ${fn}(ARRAY['1'::json],ARRAY['2'::json])::text END`
  }
  try {
    await pg.exec(
      'CREATE DOMAIN extreme_slots AS integer[];CREATE TABLE extrema_values(a text,b text,bypass boolean,quantity integer,other integer,expected text);CREATE TABLE extrema_oracle(LIKE extrema_values)',
    )
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE extrema_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'extrema_values')!
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
      plans.filter((plan) => hasUncertain(plan.expression)).map((plan) => plan.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, context)
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
    const pairs = [
      ['{}', '{}'],
      ['{1}', '{2}'],
      ['{2,0}', '{1,9}'],
      ['{NULL}', '{1}'],
      ['{1,NULL}', '{1,2}'],
      ['{1,2}', '[0:1]={1,2}'],
      ['{1,2}', '{{1,2}}'],
      ['[0:0][-1:0]={{1,2}}', '{{1,2}}'],
      ['[-2147483648:-2147483647]={1,2}', '[2147483645:2147483646]={1,2}'],
      ['{1.00}', '{1.0}'],
      ['{1.2300,NULL}', '{1.23,NULL}'],
      [null, '{1}'],
      ['{1}', null],
      [null, null],
      ['bad', '{1}'],
      ['{1}', 'bad'],
      [null, 'bad'],
      ['bad', null],
    ] as const
    for (const [a, b] of pairs)
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE extrema_oracle')
        await pg.query('INSERT INTO extrema_oracle VALUES($1,$2,$3,1,2,NULL)', [a, b, bypass])
        for (const [name, sql] of Object.entries(outputs)) {
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(`SELECT ${sql} value FROM extrema_oracle`)
            ).rows[0]!.value
            expected = { kind: 'True' }
          } catch (cause) {
            const code = (cause as { code: string }).code
            expect(['22P02', '22003', '22012', '2202E', '42883']).toContain(code)
            expected = error(code)
          }
          references.push({ name, a, b, bypass, output, expected })
          const row = {
            a: known(a),
            b: known(b),
            bypass: known(bypass),
            quantity: known(1),
            other: known(2),
            expected: known(output),
          }
          add(name, row, expected)
          if (expected.kind === 'True')
            add(name, { ...row, expected: known('wrong') }, { kind: 'False' })
        }
      }
    await mkdir('artifacts/array-extrema', { recursive: true })
    await writeFile(
      'artifacts/array-extrema/value-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-extrema/value-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayextremavalues',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
