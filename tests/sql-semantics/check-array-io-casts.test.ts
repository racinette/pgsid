import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const arrayText = (...values: (string | null)[]) =>
  '{' +
  values
    .map((value) =>
      value === null ? 'NULL' : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
    )
    .join(',') +
  '}'

it('coerces array cells through catalog I/O with retained bounds, nominal enums, modifiers, exact source, error order and composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-io-values-'))
  try {
    await pg.exec(
      "CREATE TYPE first_stage AS ENUM ('new','done');CREATE TYPE second_stage AS ENUM ('done','new');CREATE DOMAIN io_amounts AS numeric[];CREATE TABLE array_io(payload text,divisor integer,bypass boolean,expected text);CREATE TABLE array_io_oracle(LIKE array_io)",
    )
    const outputs: Record<string, string> = {
      numeric: '((payload::text[])::numeric[])::text',
      integer: '((payload::text[])::integer[])::text',
      boolean: '((payload::text[])::boolean[])::text',
      sized: '((payload::text[])::numeric(4,1)[])::text',
      negative_scale: '((payload::text[])::numeric(3,-2)[])::text',
      from_numeric: '((payload::numeric[])::text[])::text',
      from_numeric_width: '((payload::numeric[])::varchar(3)[])::text',
      from_boolean_width: '((payload::boolean[])::varchar(3)[])::text',
      from_cidr: '((payload::cidr[])::text[])::text',
      from_cidr_width: '((payload::cidr[])::varchar(3)[])::text',
      json: '((payload::text[])::json[])::text',
      from_json: '((payload::json[])::text[])::text',
      binary: 'array_to_json((payload::text[])::jsonb[])::text',
      binary_from_json: 'array_to_json((payload::json[])::jsonb[])::text',
      from_binary: '((payload::jsonb[])::text[])::text',
      stages: '((payload::text[])::first_stage[])::text',
      stage_text: '((payload::first_stage[])::text[])::text',
      stage_bridge: '(((payload::first_stage[])::text[])::second_stage[])::text',
      domain: '((payload::text[])::io_amounts)::text',
      bounds: 'array_dims((payload::text[])::numeric[])',
      count: 'cardinality((payload::text[])::numeric[])::text',
      composed: 'json_build_array((payload::text[])::numeric[],1/divisor)::text',
      coalesce: "COALESCE((payload::text[])::numeric[],'{}'::numeric[])::text",
      guarded: 'CASE WHEN bypass THEN expected ELSE ((payload::text[])::numeric[])::text END',
      prepared: "CASE WHEN bypass THEN expected ELSE ('{bad}'::text[])::numeric[]::text END",
      pruned: "CASE WHEN true THEN expected ELSE ('{bad}'::text[])::numeric[]::text END",
      stable_enum: "CASE WHEN bypass THEN expected ELSE ('{bad}'::text[])::first_stage[]::text END",
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE array_io ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_io')!
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
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
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
    expect(group.evaluatorSource).toContain('finish_array_coercion(')
    const payloads = [
      null,
      '{}',
      '{NULL}',
      '{"NULL"}',
      '{1,2,NULL}',
      '[0:1]={1,2}',
      '{{1,2},{3,NULL}}',
      '{true,false}',
      '{192.0.2.0/24,NULL}',
      '{new,done}',
      '{bad}',
      '{9999,bad}',
      '{bad,9999}',
      '{1.2300,-0.000}',
      '{0x_FF,1e-3}',
      '{0o7_7,NaN}',
      arrayText(' {"a":1,"a":2} ', null),
      arrayText('"\\u0000"'),
      arrayText('{"é":1,"aa":2,"a":3}'),
      arrayText('雪😊'),
      '{1,}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const payload of payloads)
      for (const divisor of [0, 1])
        for (const bypass of [false, true]) {
          await pg.exec('TRUNCATE array_io_oracle')
          await pg.query('INSERT INTO array_io_oracle VALUES($1,$2,$3,$4)', [
            payload,
            divisor,
            bypass,
            'safe',
          ])
          for (const [name, sql] of Object.entries(outputs)) {
            let output: string | null = null,
              expected: Outcome
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${sql})::text value FROM array_io_oracle`,
                )
              ).rows[0]!.value
              await pg.query('UPDATE array_io_oracle SET expected=$1', [output])
              expected = { kind: 'True' }
            } catch (cause) {
              const code = (cause as { code: string }).code
              expect(['22P02', '22003', '22012', '22P05']).toContain(code)
              expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            const row = {
              payload: known(payload),
              divisor: known(divisor),
              bypass: known(bypass),
              expected: known(output),
            }
            references.push({ name, payload, divisor, bypass, output, expected })
            for (const origin of ['source', 'stored']) {
              fixtures.push({ name: name + '_' + origin, row, expected })
              if (expected.kind === 'True' && !['pruned', 'guarded', 'stable_enum'].includes(name))
                fixtures.push({
                  name: name + '_' + origin,
                  row: { ...row, expected: known('wrong') },
                  expected: { kind: 'False' },
                })
            }
          }
        }
    await mkdir('artifacts/array-io-casts', { recursive: true })
    await writeFile(
      'artifacts/array-io-casts/values-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-io-casts/values-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayiovalues',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
