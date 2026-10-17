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
const errorOutcome = (error: unknown): Outcome => ({
  kind: 'Error',
  value: { state: parseInt((error as { code: string }).code, 36) },
})
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('extracts raw/stored JSON and JSONB text-array paths through operators, explicit VARIADIC and expanded text arguments', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-array-paths-extract-'))
  try {
    await pg.exec(
      'CREATE TABLE array_paths(document json,binary_document jsonb,path text,first text,second text,expected text,bypass boolean);CREATE TABLE array_path_oracle(LIKE array_paths)',
    )
    const forms = {
      json_operator: '(document #> path::text[])::text',
      json_text_operator: 'document #>> path::text[]',
      json_variadic: 'json_extract_path(document,VARIADIC path::text[])::text',
      json_variadic_text: 'json_extract_path_text(document,VARIADIC path::text[])',
      json_expanded: 'json_extract_path(document,first,second)::text',
      json_expanded_text: 'json_extract_path_text(document,first,second)',
      jsonb_operator: '(binary_document #> path::text[])::text',
      jsonb_text_operator: 'binary_document #>> path::text[]',
      jsonb_variadic: 'jsonb_extract_path(binary_document,VARIADIC path::text[])::text',
      jsonb_variadic_text: 'jsonb_extract_path_text(binary_document,VARIADIC path::text[])',
      jsonb_expanded: 'jsonb_extract_path(binary_document,first,second)::text',
      jsonb_expanded_text: 'jsonb_extract_path_text(binary_document,first,second)',
      json_guarded:
        "CASE WHEN bypass THEN 'safe' ELSE json_extract_path_text(document,VARIADIC path::text[]) END",
    }
    const sqlForms = Object.fromEntries(
      Object.entries(forms).map(([name, value]) => [
        name,
        `(${value}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(sqlForms))
      await pg.exec(`ALTER TABLE array_paths ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_paths')!
    const plans = Object.entries(sqlForms).flatMap(([name, sql]) =>
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
    )
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    const documents = [
      null,
      'null',
      'true',
      '  1.00e+2  ',
      '  "line\\ntext"  ',
      ' [10,20,null] ',
      '{}',
      '{"a":{"x":1},"a":{}}',
      '{"a":{"x":1},"a":null}',
      '{"a":{"x":1},"a":{"x":2}}',
      '{"a":[{"id":7},{"id":8}],"01":"numeric key","":"empty","雪":"😊"}',
      '{"\\u0061":{"x":"decoded"}}',
    ]
    const paths = [
      null,
      '{}',
      '{a}',
      '{a,x}',
      '{a,0,id}',
      '{a,-1,id}',
      '[0:1]={a,x}',
      '{{a},{x}}',
      '{0}',
      '{-1}',
      '{" 1"}',
      '{"1 "}',
      '{+1}',
      '{01}',
      '{""}',
      '{雪}',
      '{NULL}',
      '{a,NULL}',
      '{missing,NULL}',
      '{2147483648}',
      '{-2147483648}',
      'bad',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const document of documents) {
      const binary =
        document === null
          ? null
          : (await pg.query<{ value: string }>('SELECT $1::jsonb::text value', [document])).rows[0]!
              .value
      for (const path of paths) {
        let first: string | null = null,
          second: string | null = null
        try {
          const row = (
            await pg.query<{ first: string | null; second: string | null }>(
              `SELECT ($1::text[])[array_lower($1::text[],1)] first,($1::text[])[array_lower($1::text[],1)+1] AS "second"`,
              [path],
            )
          ).rows[0]!
          first = row.first
          second = row.second
        } catch (error) {
          expect((error as { code: string }).code).toBe('22P02')
        }
        for (const [name, sql] of Object.entries(sqlForms)) {
          let output: string | null = null
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${forms[name as keyof typeof forms]}) value FROM (SELECT $1::json document,$2::jsonb binary_document,$3::text path,$4::text first,$5::text AS "second",false bypass) q`,
                [document, binary, path, first, second],
              )
            ).rows[0]!.value
          } catch (error) {
            expect(['22P02', '22P05']).toContain((error as { code: string }).code)
          }
          await pg.exec('TRUNCATE array_path_oracle')
          await pg.query('INSERT INTO array_path_oracle VALUES($1,$2,$3,$4,$5,$6,false)', [
            document,
            binary,
            path,
            first,
            second,
            output,
          ])
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} value FROM array_path_oracle`,
                )
              ).rows[0]!.value,
            )
          } catch (error) {
            expected = errorOutcome(error)
          }
          references.push({ name, document, binary, path, first, second, output, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: {
                document: known(document),
                binary_document: known(binary),
                path: known(path),
                first: known(first),
                second: known(second),
                expected: known(output),
                bypass: known(false),
              },
              expected,
            })
        }
      }
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'json_guarded_' + origin,
        row: {
          document: { kind: 'Unknown' },
          path: known('bad'),
          bypass: known(true),
          expected: known('safe'),
        },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'json_expanded_text_' + origin,
        row: {
          document: known('{"a":{"x":1}}'),
          first: known('a'),
          second: known('x'),
          expected: known('wrong'),
        },
        expected: { kind: 'False' },
      })
    }
    await mkdir('artifacts/json-array-paths', { recursive: true })
    await writeFile(
      'artifacts/json-array-paths/extract-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-array-paths/extract-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonarraypathsextract',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves path decoding errors, UTF8 requirements, eager arguments and typed VARIADIC partial states', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-array-paths-context-'))
  try {
    await pg.exec(
      'CREATE TABLE path_context(document json,binary_document jsonb,path text,first text,second text,expected text,bypass boolean,divisor integer);CREATE TABLE context_oracle(LIKE path_context)',
    )
    const forms = {
      raw: '(document #>> path::text[]) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      expanded:
        'json_extract_path_text(document,first,second) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      binary_expanded:
        'jsonb_extract_path_text(binary_document,first,second) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      guarded:
        'CASE WHEN bypass THEN true ELSE (document #>> path::text[]) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END',
      eager: 'json_extract_path_text(document,first,(1/divisor)::text) IS NULL',
      decorated_array: 'jsonb_exists_any(binary_document,VARIADIC path::text[])',
      decorated_scalar: 'abs(VARIADIC divisor) = divisor',
      literal_keys:
        'json_extract_path_text(document,\'a\',\'x\') COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      owned_roots: `jsonb_build_array(jsonb_extract_path(binary_document,VARIADIC path::text[]),binary_document,jsonb_extract_path(binary_document,VARIADIC path::text[])) = '[1,{"a":{"x":1}},1]'::jsonb`,
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE path_context ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'path_context')!,
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
    const preparation = {
      prepared_decode: String.raw`CASE WHEN bypass THEN true ELSE json_extract_path_text('{"bad":"\u0000"}'::json,VARIADIC '{bad}'::text[]) IS NULL END`,
      prepared_path: "CASE WHEN bypass THEN true ELSE (document #>> 'bad'::text[]) IS NULL END",
    }
    for (const [name, sql] of Object.entries(preparation))
      for (const origin of ['source', 'stored'])
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              { name, type: 'check', definition: `CHECK(${sql})` },
              [],
              [],
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })
    const base: Row = {
        document: known('{"a":{"x":1}}'),
        binary_document: known('{"a":{"x":1}}'),
        path: known('{a,x}'),
        first: known('a'),
        second: known('x'),
        expected: known('1'),
        bypass: known(false),
        divisor: { kind: 'Value', value: 1 },
      },
      error = (state: string) => ({
        kind: 'Error' as const,
        value: { state: parseInt(state, 36) },
      }),
      references: unknown[] = []
    for (const utf8 of [false, true]) {
      const group = prepareCheckRustGroup(
          plans,
          utf8 ? context : { arrayNulls: true, defaultCollation: 'C' },
        ),
        fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        add = (name: string, row: Row, expected: Outcome) => {
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
      for (const check of group.checks) expect(check.kind).toBe('supported')
      for (const source of [
        '{"a":"\\u00e9"}',
        '{"a":1,"other":"\\u0000"}',
        '{"a":1,"other":"\\ud800"}',
      ]) {
        for (const path of ['{a}', '{missing}', '{NULL}', '{a,NULL}', '{}']) {
          await pg.exec('TRUNCATE context_oracle')
          await pg.query('INSERT INTO context_oracle(document,path,bypass) VALUES($1,$2,false)', [
            source,
            path,
          ])
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                'SELECT document #>> path::text[] value FROM context_oracle',
              )
            ).rows[0]!.value
            await pg.query('UPDATE context_oracle SET expected=$1', [output])
            expected = outcome(
              (await pg.query<{ value: boolean }>(`SELECT ${forms.raw} value FROM context_oracle`))
                .rows[0]!.value,
            )
          } catch (cause) {
            expect(['22P02', '22P05']).toContain((cause as { code: string }).code)
            expected = errorOutcome(cause)
          }
          references.push({ utf8, source, path, output, expected })
          const local =
            !utf8 && source.includes('00e9') && !path.includes('NULL')
              ? { kind: 'Unknown' as const }
              : expected
          add(
            'raw',
            { ...base, document: known(source), path: known(path), expected: known(output) },
            local,
          )
          add(
            'guarded',
            {
              ...base,
              document: known(source),
              path: known(path),
              expected: known(output),
              bypass: known(true),
            },
            { kind: 'True' },
          )
        }
      }
      for (const name of ['expanded', 'binary_expanded']) {
        add(
          name,
          { ...base, first: { kind: 'Unknown' }, second: known(null), expected: known(null) },
          { kind: 'True' },
        )
        add(
          name,
          { ...base, first: known('missing'), second: { kind: 'Unknown' }, expected: known(null) },
          { kind: 'True' },
        )
        add(name, { ...base, first: known('a'), second: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add(name, { ...base, first: known('a'), second: error('22003') }, error('22003'))
        add(
          name,
          { ...base, document: known(null), binary_document: known(null), second: error('22012') },
          error('22012'),
        )
      }
      add(
        'expanded',
        { ...base, document: known('{"bad":"\\u0000"}'), first: { kind: 'Unknown' } },
        { kind: 'Unknown' },
      )
      add(
        'expanded',
        {
          ...base,
          document: known('{"bad":"\\u0000"}'),
          first: { kind: 'Unknown' },
          second: known(null),
          expected: known(null),
        },
        { kind: 'True' },
      )
      add(
        'raw',
        { ...base, document: { kind: 'Unknown' }, path: known('{NULL}'), expected: known(null) },
        { kind: 'True' },
      )
      add('raw', { ...base, document: known(null), path: known('bad') }, error('22P02'))
      add('raw', { ...base, document: error('22003'), path: known('bad') }, error('22003'))
      add('raw', { ...base, document: known('[1,]') }, { kind: 'Unknown' })
      add(
        'guarded',
        { ...base, document: error('22003'), path: known('bad'), bypass: known(true) },
        { kind: 'True' },
      )
      add(
        'eager',
        {
          ...base,
          document: known(null),
          first: known(null),
          divisor: { kind: 'Value', value: 0 },
        },
        error('22012'),
      )
      add('decorated_array', base, { kind: 'True' })
      add('decorated_array', { ...base, path: known('{missing}') }, { kind: 'False' })
      add('decorated_scalar', base, { kind: 'True' })
      add('literal_keys', base, { kind: 'True' })
      add('owned_roots', base, { kind: 'True' })
      for (const [name, sql] of Object.entries(preparation)) {
        const state = name === 'prepared_path' ? '22P02' : '22P05'
        await pg.exec('UPDATE context_oracle SET bypass=true')
        await expect(pg.query(`SELECT ${sql} FROM context_oracle`)).rejects.toMatchObject({
          code: state,
        })
        add(name, { ...base, bypass: known(true) }, error(state))
        references.push({ utf8, name, sql, state })
      }
      await mkdir('artifacts/json-array-paths', { recursive: true })
      await writeFile(
        `artifacts/json-array-paths/context-${utf8}-fixtures.json`,
        JSON.stringify(fixtures, null, 2) + '\n',
      )
      const target = join(directory, String(utf8))
      await mkdir(target)
      await runCheckParity(
        target,
        'jsonarraypathscontext' + String(utf8),
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures,
      )
    }
    for (const sql of [
      'json_extract_path(document) IS NULL',
      'json_extract_path(document,VARIADIC first) IS NULL',
    ]) {
      await expect(pg.query(`SELECT ${sql} FROM context_oracle`)).rejects.toMatchObject({
        code: '42883',
      })
      const lowered = lowerTableCheck(
        table,
        { name: 'invalid_variadic', type: 'check', definition: `CHECK(${sql})` },
        [],
        [],
        'source',
      )!
      expect(JSON.stringify(lowered.expression)).toContain('uncertain')
      references.push({ sql, state: '42883' })
    }
    await writeFile(
      'artifacts/json-array-paths/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('matches JSONB any/all text-array existence, flattened bounds, NULL cells and decisive partial-input recovery in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-array-paths-exists-'))
  try {
    await pg.exec(
      'CREATE DOMAIN existence_document AS jsonb;CREATE TABLE array_exists(document existence_document,path text,first text,second text,expected boolean,bypass boolean);CREATE TABLE existence_oracle(LIKE array_exists)',
    )
    const outputs: Record<string, string> = {
      any_operator: 'document ?| path::text[]',
      all_operator: 'document ?& path::text[]',
      any_call: 'jsonb_exists_any(document,path::text[])',
      all_call: 'jsonb_exists_all(document,path::text[])',
      any_constructor: 'document ?| ARRAY[first,second]',
      all_constructor: 'document ?& ARRAY[first,second]',
      guarded: 'CASE WHEN bypass THEN true ELSE document ?| path::text[] END',
    }
    const forms = {
      ...Object.fromEntries(
        Object.entries(outputs).map(([name, sql]) => [
          name,
          `(${sql}) IS NOT DISTINCT FROM expected`,
        ]),
      ),
      any_plain: outputs.any_operator!,
      all_plain: outputs.all_operator!,
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE array_exists ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_exists')!,
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    for (const document of [
      null,
      'null',
      'true',
      '1',
      '"a"',
      '[]',
      '{}',
      '["a",null,"b",1,{"nested":1}]',
      '{"a":null,"b":false,"雪":"😊","":0}',
    ]) {
      for (const path of [
        null,
        '{}',
        '{a}',
        '{missing}',
        '{a,missing}',
        '{NULL}',
        '{a,NULL}',
        '{missing,NULL}',
        '{NULL,NULL}',
        '{a,a,b}',
        '{""}',
        '{雪}',
        '[0:1]={a,b}',
        '{{a},{b}}',
        'bad',
      ]) {
        await pg.exec('TRUNCATE existence_oracle')
        await pg.query("INSERT INTO existence_oracle VALUES($1,$2,'a','b',NULL,false)", [
          document,
          path,
        ])
        for (const [name, sql] of Object.entries(forms)) {
          let output: boolean | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${outputs[name] ?? sql} value FROM existence_oracle`,
              )
            ).rows[0]!.value
            await pg.query('UPDATE existence_oracle SET expected=$1', [output])
            expected = outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} value FROM existence_oracle`,
                )
              ).rows[0]!.value,
            )
          } catch (error) {
            expect((error as { code: string }).code).toBe('22P02')
            expected = errorOutcome(error)
          }
          const row = {
            document: known(document),
            path: known(path),
            first: known('a'),
            second: known('b'),
            expected: known(output),
            bypass: known(false),
          }
          references.push({ name, document, path, output, expected })
          add(name, row, expected)
          if (outputs[name] && output !== null && expected.kind === 'True')
            add(name, { ...row, expected: known(!output) }, { kind: 'False' })
        }
      }
    }
    const base: Row = {
      document: known('{"a":1}'),
      first: known('a'),
      second: { kind: 'Unknown' },
      expected: known(true),
      path: known('{}'),
      bypass: known(false),
    }
    add('any_constructor', base, { kind: 'True' })
    add('all_constructor', base, { kind: 'Unknown' })
    add(
      'all_constructor',
      { ...base, first: known('missing'), expected: known(false) },
      { kind: 'True' },
    )
    add(
      'any_constructor',
      { ...base, first: known('missing'), expected: known(false) },
      { kind: 'Unknown' },
    )
    add(
      'any_constructor',
      { ...base, first: known(null), second: known(null), expected: known(false) },
      { kind: 'True' },
    )
    add('all_constructor', { ...base, first: known(null), second: known(null) }, { kind: 'True' })
    add(
      'any_plain',
      { ...base, document: { kind: 'Unknown' }, path: known(null) },
      { kind: 'Null' },
    )
    add(
      'all_plain',
      { ...base, document: known(null), path: { kind: 'Unknown' } },
      { kind: 'Unknown' },
    )
    for (const path of ['{}', 'bad']) {
      await pg.exec('TRUNCATE existence_oracle')
      await pg.query('INSERT INTO existence_oracle(document,path) VALUES(NULL,$1)', [path])
      let expected: Outcome
      try {
        expected = outcome(
          (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${forms.all_plain} value FROM existence_oracle`,
            )
          ).rows[0]!.value,
        )
      } catch (error) {
        expected = errorOutcome(error)
      }
      expect(expected).toEqual(path === '{}' ? { kind: 'Null' } : errorOutcome({ code: '22P02' }))
      add('all_plain', { ...base, document: known(null), path: known(path) }, expected)
      references.push({ name: 'all_plain', document: null, path, expected })
    }
    add('any_plain', { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add(
      'guarded',
      { ...base, document: { kind: 'Unknown' }, path: known('bad'), bypass: known(true) },
      { kind: 'True' },
    )
    const error = { kind: 'Error' as const, value: { state: parseInt('22012', 36) } }
    add('any_constructor', { ...base, document: known(null), second: error }, error)
    add('any_plain', { ...base, document: error, path: known(null) }, error)
    await mkdir('artifacts/json-array-paths', { recursive: true })
    await writeFile(
      'artifacts/json-array-paths/exists-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-array-paths/exists-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonarraypathsexists',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
