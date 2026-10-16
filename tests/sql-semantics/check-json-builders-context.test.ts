import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('preserves raw builder NULL/key/arity states, partial inputs, encoding requirements, lazy branches and immutable source-error preparation', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TABLE raw_builder_context(document json,binary_document jsonb,first text,second text,payload text,divisor integer,bypass boolean,expected text);CREATE TABLE raw_context_oracle(LIKE raw_builder_context)',
    )
    const outputs: Record<string, string> = {
      raw_array: 'json_build_array(document)::text',
      raw_object: 'json_build_object(first,document,second,NULL)::text',
      binary_array: 'json_build_array(binary_document)::text',
      binary_object: "json_build_object('value',binary_document)::text",
      nested: 'json_build_array(ARRAY[first,second])::text',
      flattened: 'json_build_array(VARIADIC ARRAY[first,second])::text',
      object: 'json_build_object(VARIADIC ARRAY[first,second])::text',
      array_key: 'json_build_object(ARRAY[first,second],1)::text',
      json_key: 'json_build_object(document,1)::text',
      binary_key: 'json_build_object(binary_document,1)::text',
      odd: 'json_build_object(NULL,document,first)::text',
      eager: 'json_build_object(NULL,document,1/divisor)::text',
      array_eager: 'json_build_array(payload::json[],1/divisor)::text',
      null_array: 'json_build_array(VARIADIC NULL::text[])::text',
      ordinary_null: 'json_build_array(NULL::text[])::text',
      guarded: 'CASE WHEN bypass THEN expected ELSE json_build_object(document,1)::text END',
      prepared: 'CASE WHEN bypass THEN expected ELSE json_build_object(NULL,1/0)::text END',
      stable_error: 'CASE WHEN bypass THEN expected ELSE json_build_object(NULL,1)::text END',
      pruned: "CASE WHEN true THEN '{}'::text ELSE json_build_array(1/0)::text END",
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE raw_builder_context ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'raw_builder_context')!,
      plans = Object.entries(forms).flatMap(([name, sql]) =>
        ['source', 'stored'].map((origin) => ({
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
              [],
              [],
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      )
    const references: unknown[] = [],
      binary = '{"é":1,"aa":2,"a":3}'
    for (const utf8 of [false, true]) {
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-builders-context-'))
      try {
        const group = prepareCheckRustGroup(
          plans,
          utf8
            ? { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' }
            : { arrayNulls: true, defaultCollation: 'C' },
        )
        for (const [index, check] of group.checks.entries())
          expect(
            check.kind,
            plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
          ).toBe('supported')
        const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
          add = (name: string, row: Row, expected: Outcome) => {
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
          },
          base: Row = {
            document: known('"\\u0000"'),
            binary_document: known(binary),
            first: known('a'),
            second: known('b'),
            payload: known('{}'),
            divisor: known(1),
            bypass: known(false),
            expected: known('safe'),
          }
        for (const name of ['nested', 'flattened', 'raw_array'])
          add(
            name,
            { ...base, first: { kind: 'Unknown' }, document: { kind: 'Unknown' } },
            { kind: 'Unknown' },
          )
        add('object', { ...base, first: known(null), second: { kind: 'Unknown' } }, error('22004'))
        add('object', { ...base, first: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(
          'object',
          { ...base, second: known(null), expected: known('{"a" : null}') },
          { kind: 'True' },
        )
        add('array_key', { ...base, first: { kind: 'Unknown' } }, error('22023'))
        add('json_key', { ...base, document: known(null) }, error('22004'))
        add('json_key', { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add('binary_key', base, error('22023'))
        add('odd', { ...base, document: { kind: 'Unknown' } }, error('22023'))
        add(
          'odd',
          { ...base, document: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
          error('22003'),
        )
        add('eager', { ...base, document: { kind: 'Unknown' }, divisor: known(0) }, error('22012'))
        add('array_eager', { ...base, payload: known('bad'), divisor: known(0) }, error('22P02'))
        add(
          'array_eager',
          { ...base, payload: known('{"\\\"\\\\u0000\\\""}'), divisor: known(0) },
          error('22012'),
        )
        add('null_array', { ...base, expected: known(null) }, { kind: 'True' })
        add('ordinary_null', { ...base, expected: known('[null]') }, { kind: 'True' })
        add('guarded', { ...base, bypass: known(true) }, { kind: 'True' })
        add('prepared', { ...base, bypass: known(true) }, error('22012'))
        add('stable_error', { ...base, bypass: known(true) }, { kind: 'True' })
        add('pruned', { ...base, expected: known('{}') }, { kind: 'True' })
        const rows = [
          {
            document: ' { "a":1,"a":2 } ',
            binary_document: binary,
            first: 'a',
            second: 'a',
            dependent: true,
          },
          {
            document: '"\\u0000"',
            binary_document: '{"é":1}',
            first: null,
            second: 'b',
            dependent: false,
          },
          {
            document: '1e999999',
            binary_document: 'null',
            first: '雪',
            second: '😊',
            dependent: false,
          },
        ]
        for (const row of rows)
          for (const [name, sql] of Object.entries(forms)) {
            await pg.exec('TRUNCATE raw_context_oracle')
            await pg.query('INSERT INTO raw_context_oracle VALUES($1,$2,$3,$4,$5,0,true,NULL)', [
              row.document,
              row.binary_document,
              row.first,
              row.second,
              'bad',
            ])
            let output: string | null = null,
              expected: Outcome
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${outputs[name]})::text value FROM raw_context_oracle`,
                )
              ).rows[0]!.value
              await pg.query('UPDATE raw_context_oracle SET expected=$1', [output])
              expected = {
                kind: (
                  await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM raw_context_oracle`)
                ).rows[0]!.value
                  ? 'True'
                  : 'False',
              }
            } catch (cause) {
              expected = error((cause as { code: string }).code)
            }
            if (utf8) references.push({ name, ...row, output, expected })
            const deferred =
              !utf8 && row.dependent && ['binary_array', 'binary_object'].includes(name)
            add(
              name,
              {
                ...base,
                ...Object.fromEntries(
                  Object.entries(row)
                    .filter(([key]) => key !== 'dependent')
                    .map(([key, value]) => [key, known(value)]),
                ),
                payload: known('bad'),
                divisor: known(0),
                bypass: known(true),
                expected: known(output),
              },
              deferred ? { kind: 'Unknown' } : expected,
            )
          }
        await mkdir('artifacts/json-builders', { recursive: true })
        await writeFile(
          `artifacts/json-builders/${utf8 ? 'utf8' : 'unbound'}-fixtures.json`,
          JSON.stringify(fixtures, null, 2) + '\n',
        )
        await runCheckParity(
          directory,
          'jsonbuilderscontext' + String(utf8),
          group,
          plans.map((plan) => plan.identity.constraint),
          fixtures,
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
    await writeFile(
      'artifacts/json-builders/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 240_000)
