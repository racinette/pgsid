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
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const errorOutcome = (cause: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((cause as { code: string }).code, 36) },
})
const context = { defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('strips raw JSON null fields and optional array cells while preserving duplicate order, numeric spellings, decoded strings and owned source composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-null-strip-shapes-'))
  try {
    await pg.exec(
      'CREATE DOMAIN strip_document AS json;CREATE DOMAIN nested_strip_document AS strip_document;CREATE TABLE strip_inputs(document nested_strip_document,flag boolean,expected text,expected_binary jsonb,bypass boolean);CREATE TABLE strip_oracle(LIKE strip_inputs)',
    )
    const outputs: Record<string, string> = {
      defaulted: 'json_strip_nulls(document)::text',
      explicit: 'json_strip_nulls(document,flag)::text',
      composed: 'json_strip_nulls(json_strip_nulls(document,flag),true)::text',
      field: "json_strip_nulls(document,flag)->>'a'",
      quoted: "json_object(ARRAY['result',json_strip_nulls(document,flag)::text])::text",
      retained:
        "json_object(ARRAY['before',document::text,'after',json_strip_nulls(document,flag)::text])::text",
      owned: 'jsonb_build_array(json_strip_nulls(document,flag),document)',
      guarded: 'CASE WHEN bypass THEN expected ELSE json_strip_nulls(document,flag)::text END',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        name === 'owned'
          ? `(${sql}) IS NOT DISTINCT FROM expected_binary`
          : `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE strip_inputs ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'strip_inputs')!,
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
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      ),
      group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    const documents = [
      null,
      ' null ',
      ' true ',
      'false',
      ' 1.00e+02 ',
      ' -0.00e-2 ',
      '1e999999',
      '  "hello"  ',
      '"\\u0061\\/\\n\\t\\r\\b\\f\\u0001\\u001f"',
      '"雪😊"',
      '"\\u00e9"',
      '"\\ud83d\\ude0a"',
      '"\\u0000"',
      '"\\ud800"',
      '"\\udc00"',
      '{}',
      '[]',
      '[null]',
      '[null,null]',
      '[null,1,null,2,null]',
      '{"a":null}',
      '{"a":null,"a":1}',
      '{"a":1,"a":null}',
      '{"a":null,"a":1,"a":null,"a":2}',
      '{"b":null,"a":1,"c":null}',
      '{"a":{},"b":[],"c":null}',
      '{"a":{"b":null},"b":[null,{"x":null},2]}',
      '[{"a":null},null,[null,{"b":null}],1]',
      ' { "a" : 1.00e+2, "b" : null, "c" : "\\u0061" } ',
      '{"\\u0061":null,"b":"\\u0042"}',
      '{"\\u00e9":null,"a":1}',
      '{"雪":null,"a":"😊"}',
      '{"\\u0000":null}',
      '{"ignored":null,"bad":"\\udc00"}',
      '{"bad":"\\ud800x"}',
      '{"a":null,"b":"\\u00e9","c":"\\u0000"}',
      '{"a":null,"b":"\\u0000","c":"\\u00e9"}',
      '['.repeat(80) + 'null' + ']'.repeat(80),
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    for (const document of documents)
      for (const flag of [false, true, null])
        for (const [name, sql] of Object.entries(forms)) {
          await pg.exec('TRUNCATE strip_oracle')
          await pg.query('INSERT INTO strip_oracle VALUES($1,$2,NULL,NULL,false)', [document, flag])
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${outputs[name]})::text value FROM strip_oracle`,
              )
            ).rows[0]!.value
            await pg.query(
              name === 'owned'
                ? 'UPDATE strip_oracle SET expected_binary=$1'
                : 'UPDATE strip_oracle SET expected=$1',
              [output],
            )
            expected = outcome(
              (await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM strip_oracle`)).rows[0]!
                .value,
            )
          } catch (cause) {
            expect(['22P02', '22P05', '22003']).toContain((cause as { code: string }).code)
            expected = errorOutcome(cause)
          }
          const row = {
            document: known(document),
            flag: known(flag),
            expected: known(name === 'owned' ? null : output),
            expected_binary: known(name === 'owned' ? output : null),
            bypass: known(false),
          }
          references.push({ name, document, flag, output, expected })
          add(name, row, expected)
          if (expected.kind === 'True')
            add(
              name,
              {
                ...row,
                [name === 'owned' ? 'expected_binary' : 'expected']: known(
                  name === 'owned' ? '"wrong"' : 'wrong',
                ),
              },
              { kind: 'False' },
            )
        }
    await mkdir('artifacts/json-null-strip', { recursive: true })
    await writeFile(
      'artifacts/json-null-strip/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-null-strip/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonnullstripshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('retains encoding requirements, decoding errors in removed fields, strict partial states, source errors and immutable preparation across lazy branches', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TABLE strip_context(document json,flag boolean,expected text,bypass boolean,payload text);CREATE TABLE strip_context_oracle(LIKE strip_context)',
    )
    const outputs: Record<string, string> = {
      explicit: 'json_strip_nulls(document,flag)::text',
      guarded: 'CASE WHEN bypass THEN expected ELSE json_strip_nulls(document,flag)::text END',
      imported: 'json_strip_nulls(payload::json,flag)::text',
      prepared:
        'CASE WHEN bypass THEN expected ELSE json_strip_nulls(\'{"\\u0000":null}\'::json)::text END',
      pruned: "CASE WHEN true THEN '{}'::text ELSE json_strip_nulls('\"\\ud800\"'::json)::text END",
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE strip_context ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'strip_context')!,
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
    const references: unknown[] = []
    for (const utf8 of [false, true]) {
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-null-strip-context-'))
      try {
        const group = prepareCheckRustGroup(plans, utf8 ? context : { defaultCollation: 'C' })
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
          error = (state: string): Outcome => ({
            kind: 'Error',
            value: { state: parseInt(state, 36) },
          }),
          base: Row = {
            document: known('{"a":null,"b":1}'),
            flag: known(true),
            expected: known('{"b":1}'),
            bypass: known(false),
            payload: known('{}'),
          }
        add('explicit', base, { kind: 'True' })
        add('explicit', { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add('explicit', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(
          'explicit',
          { ...base, document: { kind: 'Unknown' }, flag: known(null), expected: known(null) },
          { kind: 'True' },
        )
        add(
          'explicit',
          { ...base, document: known(null), flag: { kind: 'Unknown' }, expected: known(null) },
          { kind: 'True' },
        )
        add(
          'explicit',
          {
            ...base,
            document: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            flag: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          error('22003'),
        )
        add(
          'explicit',
          {
            ...base,
            document: known(null),
            flag: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          error('22012'),
        )
        add(
          'guarded',
          { ...base, document: known('"\\u0000"'), bypass: known(true) },
          { kind: 'True' },
        )
        add('imported', { ...base, payload: known('bad') }, error('22P02'))
        add('imported', { ...base, payload: known('bad'), flag: known(null) }, error('22P02'))
        add('prepared', { ...base, bypass: known(true) }, error('22P05'))
        add('pruned', { ...base, expected: known('{}') }, { kind: 'True' })
        const rows = [
          { document: '"\\u00e9"', output: '"é"', dependent: true },
          { document: '"\\ud83d\\ude0a"', output: '"😊"', dependent: true },
          { document: '{"\\u00e9":null,"a":1}', output: '{"a":1}', dependent: true },
          { document: '{"雪":null,"a":"😊"}', output: '{"a":"😊"}', dependent: false },
          { document: '{"\\u0061":null,"b":"\\u0042"}', output: '{"b":"B"}', dependent: false },
          { document: '"\\ud800x"', output: null, dependent: false },
          { document: '{"\\u0000":null}', output: null, dependent: false },
        ]
        for (const row of rows) {
          await pg.exec('TRUNCATE strip_context_oracle')
          await pg.query('INSERT INTO strip_context_oracle VALUES($1,true,$2,false,NULL)', [
            row.document,
            row.output,
          ])
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean }>(
                  `SELECT ${forms.explicit} value FROM strip_context_oracle`,
                )
              ).rows[0]!.value,
            )
          } catch (cause) {
            expected = errorOutcome(cause)
          }
          if (utf8) references.push({ document: row.document, output: row.output, expected })
          add(
            'explicit',
            { ...base, document: known(row.document), expected: known(row.output) },
            row.dependent && !utf8 ? { kind: 'Unknown' } : expected,
          )
          add(
            'guarded',
            {
              ...base,
              document: known(row.document),
              expected: known('safe'),
              bypass: known(true),
            },
            { kind: 'True' },
          )
        }
        for (const name of ['prepared', 'pruned', 'imported']) {
          await pg.exec('TRUNCATE strip_context_oracle')
          await pg.query('INSERT INTO strip_context_oracle VALUES($1,true,$2,true,$3)', [
            '{}',
            '{}',
            'bad',
          ])
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean }>(
                  `SELECT ${forms[name]} value FROM strip_context_oracle`,
                )
              ).rows[0]!.value,
            )
          } catch (cause) {
            expected = errorOutcome(cause)
          }
          if (utf8) references.push({ name, expected })
          add(
            name,
            {
              ...base,
              document: known('{}'),
              expected: known('{}'),
              bypass: known(true),
              payload: known('bad'),
            },
            expected,
          )
        }
        await mkdir('artifacts/json-null-strip', { recursive: true })
        await writeFile(
          `artifacts/json-null-strip/${utf8 ? 'utf8' : 'unbound'}-fixtures.json`,
          JSON.stringify(fixtures, null, 2) + '\n',
        )
        await runCheckParity(
          directory,
          'jsonnullstripcontext' + String(utf8),
          group,
          plans.map((plan) => plan.identity.constraint),
          fixtures,
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
    await writeFile(
      'artifacts/json-null-strip/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
}, 240_000)
