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
const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('preserves raw scalar source, numeric normalization, UTF8 JSONB rendering, selected roots, partial array flags and preparation in both encoding contexts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TABLE json_conversion_context(payload text,document json,binary_document jsonb,number numeric,pretty boolean,bypass boolean,expected text);CREATE TABLE json_context_oracle(LIKE json_conversion_context)',
    )
    const outputs: Record<string, string> = {
      raw: 'to_json(document)::text',
      text: 'to_json(payload)::text',
      number: 'to_json(number)::text',
      binary: 'to_json(binary_document)::text',
      binary_cast: 'binary_document::text',
      selected: "to_json(binary_document->'edit')::text",
      owned:
        "json_object(ARRAY['converted',to_json(binary_document->'edit')::text,'original',binary_document::text])::text",
      partial: 'array_to_json(ARRAY[payload,NULL],pretty)::text',
      null_array: 'array_to_json(NULL::text[],pretty)::text',
      guarded: 'CASE WHEN bypass THEN expected ELSE to_json(binary_document)::text END',
      prepared: 'CASE WHEN bypass THEN expected ELSE to_json(1/0)::text END',
      pruned: "CASE WHEN true THEN '{}'::text ELSE to_json(1/0)::text END",
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE json_conversion_context ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'json_conversion_context')!,
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
      binary = '{"before":1,"edit":{"é":1,"aa":2,"a":3,"雪":4,"😊":5,"aaa":6,"éa":7}}'
    for (const utf8 of [false, true]) {
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-conversion-context-'))
      try {
        const group = prepareCheckRustGroup(
          plans,
          utf8 ? { defaultCollation: 'C', serverEncoding: 'UTF8' } : { defaultCollation: 'C' },
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
            payload: known('x'),
            document: known(' { "a":1,"a":2 } '),
            binary_document: known(binary),
            number: known('1'),
            pretty: known(false),
            bypass: known(false),
            expected: known('safe'),
          }
        add('partial', { ...base, payload: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(
          'partial',
          { ...base, payload: { kind: 'Unknown' }, pretty: known(null), expected: known(null) },
          { kind: 'True' },
        )
        add(
          'partial',
          {
            ...base,
            payload: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            pretty: known(null),
          },
          error('22003'),
        )
        add(
          'partial',
          {
            ...base,
            payload: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            pretty: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          error('22003'),
        )
        add(
          'partial',
          { ...base, pretty: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
          error('22012'),
        )
        add(
          'null_array',
          {
            ...base,
            pretty: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            expected: known(null),
          },
          { kind: 'True' },
        )
        add(
          'guarded',
          { ...base, binary_document: { kind: 'Unknown' }, bypass: known(true) },
          { kind: 'True' },
        )
        add('prepared', { ...base, bypass: known(true) }, error('22012'))
        add('pruned', { ...base, expected: known('{}') }, { kind: 'True' })
        const rows = [
          {
            payload: 'x',
            document: ' { "a":1,"a":2 } ',
            binary_document: binary,
            number: '1.2300',
            dependent: true,
          },
          {
            payload: '雪😊',
            document: '"\\u0000"',
            binary_document: '{"é":1}',
            number: '-0.000',
            dependent: false,
          },
          {
            payload: 'quote"\\\n',
            document: ' 1e999999 ',
            binary_document: '{"":1,"é":2}',
            number: '+1.20e2',
            dependent: false,
          },
          {
            payload: null,
            document: '"\\ud800"',
            binary_document: '{"é":1,"aa":2}',
            number: '1e-100',
            dependent: true,
          },
          {
            payload: '',
            document: 'null',
            binary_document: 'null',
            number: 'NaN',
            dependent: false,
          },
        ]
        for (const row of rows)
          for (const [name, sql] of Object.entries(forms)) {
            await pg.exec('TRUNCATE json_context_oracle')
            await pg.query('INSERT INTO json_context_oracle VALUES($1,$2,$3,$4,true,false,NULL)', [
              row.payload,
              row.document,
              row.binary_document,
              row.number,
            ])
            let output: string | null = null,
              expected: Outcome
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${outputs[name]})::text value FROM json_context_oracle`,
                )
              ).rows[0]!.value
              await pg.query('UPDATE json_context_oracle SET expected=$1', [output])
              expected = {
                kind: (
                  await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM json_context_oracle`)
                ).rows[0]!.value
                  ? 'True'
                  : 'False',
              }
            } catch (cause) {
              expected = error((cause as { code: string }).code)
            }
            const deferred =
              !utf8 &&
              row.dependent &&
              (['binary', 'binary_cast', 'owned', 'guarded'].includes(name) ||
                (name === 'selected' && row.binary_document === binary))
            if (utf8) references.push({ name, ...row, output, expected })
            add(
              name,
              {
                ...base,
                ...Object.fromEntries(
                  Object.entries(row)
                    .filter(([key]) => key !== 'dependent')
                    .map(([key, value]) => [key, known(value)]),
                ),
                pretty: known(true),
                expected: known(output),
              },
              deferred ? { kind: 'Unknown' } : expected,
            )
          }
        await mkdir('artifacts/json-conversion', { recursive: true })
        await writeFile(
          `artifacts/json-conversion/${utf8 ? 'utf8' : 'unbound'}-fixtures.json`,
          JSON.stringify(fixtures, null, 2) + '\n',
        )
        await runCheckParity(
          directory,
          'jsonconversioncontext' + String(utf8),
          group,
          plans.map((plan) => plan.identity.constraint),
          fixtures,
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
    await writeFile(
      'artifacts/json-conversion/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 240_000)
