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

it('deletes array key lists and resolves ordinary versus variadic overloads without changing scalar NULL semantics', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-path-mutation-bulk-'))
  try {
    await pg.exec(
      'CREATE TABLE bulk_deletion(document jsonb,path text,first text,second text,expected jsonb,bypass boolean);CREATE TABLE bulk_oracle(LIKE bulk_deletion)',
    )
    const outputs: Record<string, string> = {
        operator: 'document-path::text[]',
        bulk_variadic: 'jsonb_delete(document,VARIADIC path::text[])',
        expanded: 'jsonb_delete(document,first,second)',
        scalar: 'jsonb_delete(document,first)',
        single_variadic: 'jsonb_delete(document,VARIADIC ARRAY[first])',
        constructor: 'document-ARRAY[first,second]',
        literal_operator: "document-'{a}'",
        literal_function: "jsonb_delete(document,'{a}')",
        literal_number: "document-'1'",
        literal_null: 'jsonb_delete(document,NULL)',
        guarded: 'CASE WHEN bypass THEN document ELSE document-path::text[] END',
      },
      forms = Object.fromEntries(
        Object.entries(outputs).map(([name, sql]) => [
          name,
          `(${sql}) IS NOT DISTINCT FROM expected`,
        ]),
      )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE bulk_deletion ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'bulk_deletion')!,
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
      '1',
      '{}',
      '[]',
      '{"a":1,"b":2,"nested":{"a":3}}',
      '["a","b","a",1,null,{"a":1}]',
      '[1,null,{}]',
      '{"雪":1,"😊":2}',
      '{"{a}":1,"1":2,"a":3}',
    ])
      for (const path of [
        null,
        '{}',
        '{NULL}',
        '{a}',
        '{a,NULL}',
        '{a,b}',
        '{a,a}',
        '{missing}',
        '{{a},{b}}',
        '[0:1]={a,b}',
        '{雪}',
        '{😊}',
        'bad',
      ])
        for (const [name, sql] of Object.entries(forms)) {
          const first = path === '{NULL}' ? null : 'a',
            second = path === '{a,NULL}' ? null : 'b'
          await pg.exec('TRUNCATE bulk_oracle')
          await pg.query('INSERT INTO bulk_oracle VALUES($1,$2,$3,$4,NULL,false)', [
            document,
            path,
            first,
            second,
          ])
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${outputs[name]})::text value FROM bulk_oracle`,
              )
            ).rows[0]!.value
            await pg.query('UPDATE bulk_oracle SET expected=$1', [output])
            expected = outcome(
              (await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM bulk_oracle`)).rows[0]!
                .value,
            )
          } catch (cause) {
            expect(['22023', '2202E', '22P02']).toContain((cause as { code: string }).code)
            expected = errorOutcome(cause)
          }
          const row = {
            document: known(document),
            path: known(path),
            first: known(first),
            second: known(second),
            expected: known(output),
            bypass: known(false),
          }
          references.push({ name, document, path, first, second, output, expected })
          add(name, row, expected)
          if (expected.kind === 'True')
            add(name, { ...row, expected: known('"wrong"') }, { kind: 'False' })
        }
    const base: Row = {
      document: known('{"a":1}'),
      first: { kind: 'Unknown' },
      second: known('a'),
      expected: known('{}'),
      path: known('{}'),
      bypass: known(false),
    }
    add('constructor', base, { kind: 'True' })
    add('expanded', base, { kind: 'True' })
    add('constructor', { ...base, document: known('{"a":1,"b":2}') }, { kind: 'Unknown' })
    add(
      'constructor',
      {
        ...base,
        document: known('[1,null,{}]'),
        second: { kind: 'Unknown' },
        expected: known('[1,null,{}]'),
      },
      { kind: 'True' },
    )
    add('single_variadic', { ...base, document: known('{}') }, { kind: 'True' })
    add('scalar', { ...base, document: known('{}') }, { kind: 'Unknown' })
    add(
      'guarded',
      { ...base, path: known('bad'), bypass: known(true), expected: known('{"a":1}') },
      { kind: 'True' },
    )
    await mkdir('artifacts/jsonb-path-mutation', { recursive: true })
    await writeFile(
      'artifacts/jsonb-path-mutation/bulk-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-path-mutation/bulk-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbpathmutationbulk',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('mutates raw/stored JSONB paths through deletion, set and insertion with exact traversal, bounds, defaults and owned composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-path-mutation-shapes-'))
  try {
    await pg.exec(
      'CREATE TABLE path_mutations(document jsonb,path text,replacement jsonb,flag boolean,expected jsonb,bypass boolean);CREATE TABLE path_mutation_oracle(LIKE path_mutations)',
    )
    const outputs: Record<string, string> = {
        deleted: 'jsonb_delete_path(document,path::text[])',
        delete_operator: 'document #- path::text[]',
        set_default: 'jsonb_set(document,path::text[],replacement)',
        set_explicit: 'jsonb_set(document,path::text[],replacement,flag)',
        insert_default: 'jsonb_insert(document,path::text[],replacement)',
        insert_explicit: 'jsonb_insert(document,path::text[],replacement,flag)',
        composed: 'jsonb_set(jsonb_delete_path(document,path::text[]),path::text[],replacement)',
        owned:
          'jsonb_build_array(jsonb_set(document,path::text[],replacement),document,replacement)',
        guarded: 'CASE WHEN bypass THEN document ELSE jsonb_delete_path(document,path::text[]) END',
      },
      forms = Object.fromEntries(
        Object.entries(outputs).map(([name, sql]) => [
          name,
          `(${sql}) IS NOT DISTINCT FROM expected`,
        ]),
      )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE path_mutations ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'path_mutations')!,
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
      '1',
      '{}',
      '[]',
      '{"a":1}',
      '{"a":{}}',
      '{"a":[1,2]}',
      '[{"a":1},2,3]',
      '{"雪":{"😊":1},"a":{"b":2}}',
    ])
      for (const path of [
        null,
        '{}',
        '{a}',
        '{a,b}',
        '{a,0}',
        '{a,-1}',
        '{a,3}',
        '{a,-4}',
        '{missing,NULL}',
        '{a,NULL}',
        '{a,b,NULL}',
        '{NULL}',
        '{0}',
        '{-1}',
        '{3}',
        '{-4}',
        '{2147483647}',
        '{-2147483648}',
        '{2147483648}',
        '{" 1"}',
        '{"1 "}',
        '{+1}',
        '{01}',
        '{雪,😊}',
        '[0:1]={a,b}',
        '{{a},{b}}',
        'bad',
      ])
        for (const [name, sql] of Object.entries(forms))
          for (const flag of name.endsWith('explicit') ? [true, false, null] : [true]) {
            const replacement = '{"nested":[9,null]}'
            await pg.exec('TRUNCATE path_mutation_oracle')
            await pg.query('INSERT INTO path_mutation_oracle VALUES($1,$2,$3,$4,NULL,false)', [
              document,
              path,
              replacement,
              flag,
            ])
            let output: string | null = null,
              expected: Outcome
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${outputs[name]})::text value FROM path_mutation_oracle`,
                )
              ).rows[0]!.value
              await pg.query('UPDATE path_mutation_oracle SET expected=$1', [output])
              expected = outcome(
                (
                  await pg.query<{ value: boolean }>(
                    `SELECT ${sql} value FROM path_mutation_oracle`,
                  )
                ).rows[0]!.value,
              )
            } catch (error) {
              expect(['2202E', '22023', '22004', '22P02']).toContain(
                (error as { code: string }).code,
              )
              expected = errorOutcome(error)
            }
            const row = {
              document: known(document),
              path: known(path),
              replacement: known(replacement),
              flag: known(flag),
              expected: known(output),
              bypass: known(false),
            }
            references.push({ name, document, path, replacement, flag, output, expected })
            add(name, row, expected)
            if (expected.kind === 'True')
              add(name, { ...row, expected: known('"wrong"') }, { kind: 'False' })
          }
    add(
      'guarded',
      {
        document: known('{"a":1}'),
        path: known('bad'),
        expected: known('{"a":1}'),
        bypass: known(true),
      },
      { kind: 'True' },
    )
    await mkdir('artifacts/jsonb-path-mutation', { recursive: true })
    await writeFile(
      'artifacts/jsonb-path-mutation/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-path-mutation/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbpathmutationshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves partial path traversal, NULL/error precedence, lax policy phases and immutable preparation across lazy branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-path-mutation-context-'))
  try {
    await pg.exec(
      'CREATE TABLE path_context(document jsonb,replacement jsonb,flag boolean,policy text,first text,second text,third text,expected jsonb,bypass boolean,path text);CREATE TABLE path_context_oracle(LIKE path_context)',
    )
    const outputs: Record<string, string> = {
        deleted: 'jsonb_delete_path(document,ARRAY[first,second,third])',
        replaced: 'jsonb_set(document,ARRAY[first,second,third],replacement,flag)',
        inserted: 'jsonb_insert(document,ARRAY[first,second,third],replacement,flag)',
        lax: 'jsonb_set_lax(document,ARRAY[first,second,third],replacement,flag,policy)',
        guarded:
          'CASE WHEN bypass THEN document ELSE jsonb_set(document,path::text[],replacement,flag) END',
        selected_roots: "jsonb_set(document->'edit',path::text[],replacement->'value')",
        retained_roots:
          "jsonb_build_array(jsonb_set(document->'edit',path::text[],replacement->'value'),document,replacement)",
      },
      preparation: Record<string, string> = {
        prepared_set:
          "CASE WHEN bypass THEN document ELSE jsonb_set('{}'::jsonb,'{NULL}'::text[],'9'::jsonb) END",
        prepared_lax:
          "CASE WHEN bypass THEN document ELSE jsonb_set_lax('1'::jsonb,'{{a},{b}}'::text[],NULL::jsonb,true,'raise_exception') END",
        prepared_return:
          "jsonb_set_lax('1'::jsonb,'{{a},{b}}'::text[],NULL::jsonb,true,'return_target')",
      }
    for (const [name, sql] of Object.entries(outputs))
      await pg.exec(
        `ALTER TABLE path_context ADD CONSTRAINT ${name} CHECK((${sql}) IS NOT DISTINCT FROM expected)`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'path_context')!,
      plans = Object.entries({ ...outputs, ...preparation }).flatMap(([name, sql]) =>
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
              name in preparation
                ? {
                    name,
                    type: 'check',
                    definition: `CHECK((${sql}) IS NOT DISTINCT FROM expected)`,
                  }
                : origin === 'source'
                  ? {
                      ...table.constraints.find((item) => item.name === name)!,
                      definition: `CHECK((${sql}) IS NOT DISTINCT FROM expected)`,
                    }
                  : table.constraints.find((item) => item.name === name)!,
              [],
              [],
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      ),
      group = prepareCheckRustGroup(plans, context)
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      },
      error = (state: string) => ({
        kind: 'Error' as const,
        value: { state: parseInt(state, 36) },
      }),
      base: Row = {
        document: known('{"a":1}'),
        replacement: known('9'),
        flag: known(true),
        policy: known('use_json_null'),
        first: known('missing'),
        second: known('x'),
        third: known('y'),
        expected: known('{"a":1}'),
        bypass: known(false),
        path: known('{a}'),
      }
    for (const name of ['deleted', 'replaced', 'inserted', 'lax']) {
      add(name, { ...base, second: { kind: 'Unknown' }, third: known(null) }, { kind: 'True' })
      add(
        name,
        { ...base, first: known('a'), second: known('x'), third: { kind: 'Unknown' } },
        { kind: 'True' },
      )
      add(name, { ...base, first: known('a'), second: known(null) }, error('22004'))
      add(name, { ...base, first: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(name, { ...base, first: known('a'), second: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(name, { ...base, document: known('1'), first: { kind: 'Unknown' } }, error('22023'))
      add(
        name,
        { ...base, document: known(null), first: { kind: 'Unknown' }, expected: known(null) },
        { kind: 'True' },
      )
      add(name, { ...base, document: error('22003'), first: error('22012') }, error('22003'))
      add(name, { ...base, document: known(null), first: error('22012') }, error('22012'))
    }
    add(
      'deleted',
      { ...base, document: known('{}'), first: { kind: 'Unknown' }, expected: known('{}') },
      { kind: 'True' },
    )
    add(
      'replaced',
      {
        ...base,
        document: known('{}'),
        first: { kind: 'Unknown' },
        flag: known(false),
        expected: known('{}'),
      },
      { kind: 'True' },
    )
    add(
      'replaced',
      { ...base, document: known('{}'), first: { kind: 'Unknown' }, expected: known('{}') },
      { kind: 'Unknown' },
    )
    add(
      'replaced',
      { ...base, replacement: known(null), first: { kind: 'Unknown' }, expected: known(null) },
      { kind: 'True' },
    )
    add('replaced', { ...base, replacement: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add(
      'inserted',
      { ...base, flag: known(null), first: { kind: 'Unknown' }, expected: known(null) },
      { kind: 'True' },
    )
    add(
      'lax',
      {
        ...base,
        replacement: known(null),
        policy: known('return_target'),
        first: { kind: 'Unknown' },
      },
      { kind: 'True' },
    )
    add('lax', { ...base, replacement: { kind: 'Unknown' }, policy: known(null) }, error('22023'))
    add(
      'lax',
      {
        ...base,
        replacement: known(null),
        policy: known('raise_exception'),
        first: { kind: 'Unknown' },
      },
      error('22004'),
    )
    add('lax', { ...base, document: { kind: 'Unknown' }, policy: known(null) }, { kind: 'Unknown' })
    add(
      'lax',
      { ...base, flag: known(null), policy: known(null), expected: known(null) },
      { kind: 'True' },
    )
    add('lax', { ...base, policy: known('invalid') }, { kind: 'True' })
    add('lax', { ...base, policy: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('lax', { ...base, replacement: known(null), policy: known('delete_key') }, { kind: 'True' })
    add('lax', { ...base, document: known(null), policy: error('22004') }, error('22004'))
    add(
      'guarded',
      { ...base, path: known('bad'), replacement: error('22003'), bypass: known(true) },
      { kind: 'True' },
    )
    await pg.query('INSERT INTO path_context_oracle(document,bypass) VALUES($1,true)', ['{"a":1}'])
    for (const [name, sql] of Object.entries(preparation)) {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: string | null }>(
            `SELECT (${sql})::text value FROM path_context_oracle`,
          )
        ).rows[0]!.value
        expect(value).toBe('1')
        expected = { kind: 'True' }
      } catch (cause) {
        expect((cause as { code: string }).code).toBe('22004')
        expected = errorOutcome(cause)
      }
      references.push({ name, sql, expected })
      add(
        name,
        {
          ...base,
          bypass: known(true),
          expected: known(name === 'prepared_return' ? '1' : '{"a":1}'),
        },
        expected,
      )
    }
    const document = '{"edit":{"a":[1,2]},"other":[3]}',
      replacement = '{"value":{"x":[4]},"other":5}'
    await pg.query('UPDATE path_context_oracle SET document=$1,replacement=$2,path=$3', [
      document,
      replacement,
      '{a}',
    ])
    for (const name of ['selected_roots', 'retained_roots']) {
      const value = (
        await pg.query<{ value: string }>(
          `SELECT (${outputs[name]})::text value FROM path_context_oracle`,
        )
      ).rows[0]!.value
      references.push({ name, document, replacement, path: '{a}', output: value })
      add(
        name,
        {
          ...base,
          document: known(document),
          replacement: known(replacement),
          path: known('{a}'),
          expected: known(value),
        },
        { kind: 'True' },
      )
    }
    await mkdir('artifacts/jsonb-path-mutation', { recursive: true })
    await writeFile(
      'artifacts/jsonb-path-mutation/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-path-mutation/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbpathmutationcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('matches jsonb_set_lax defaults, exact NULL policies, strict inputs, ignored non-NULL policies and independent collations', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-path-mutation-lax-'))
  try {
    await pg.exec(
      "CREATE COLLATION mutation_ci(provider=icu,locale='und-u-ks-level2',deterministic=false);CREATE TABLE lax_mutations(document jsonb,path text,replacement jsonb,flag boolean,policy text,expected jsonb,bypass boolean);CREATE TABLE lax_oracle(LIKE lax_mutations)",
    )
    const outputs: Record<string, string> = {
        explicit: 'jsonb_set_lax(document,path::text[],replacement,flag,policy)',
        defaults: 'jsonb_set_lax(document,path::text[],replacement)',
        default_policy: 'jsonb_set_lax(document,path::text[],replacement,flag)',
        other_collation:
          'jsonb_set_lax(document,path::text[],replacement,flag,policy COLLATE mutation_ci)',
        guarded:
          'CASE WHEN bypass THEN document ELSE jsonb_set_lax(document,path::text[],replacement,flag,policy) END',
      },
      forms = Object.fromEntries(
        Object.entries(outputs).map(([name, sql]) => [
          name,
          `(${sql}) IS NOT DISTINCT FROM expected`,
        ]),
      )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE lax_mutations ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'lax_mutations')!,
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
    for (const [name, sql] of Object.entries(forms))
      for (const document of [null, '1', '{}', '[]', '{"a":1}', '{"a":[1,2]}'])
        for (const path of ['{}', '{a}', '{NULL}', '{a,NULL}', '{{a},{0}}', 'bad'])
          for (const replacement of [null, '9'])
            for (const flag of name === 'defaults' || name === 'guarded'
              ? [true]
              : [true, false, null])
              for (const policy of name === 'defaults' || name === 'default_policy'
                ? ['use_json_null']
                : [
                    null,
                    'use_json_null',
                    'delete_key',
                    'return_target',
                    'raise_exception',
                    'bad',
                    'USE_JSON_NULL',
                  ]) {
                const bypass = name === 'guarded'
                await pg.exec('TRUNCATE lax_oracle')
                await pg.query('INSERT INTO lax_oracle VALUES($1,$2,$3,$4,$5,NULL,$6)', [
                  document,
                  path,
                  replacement,
                  flag,
                  policy,
                  bypass,
                ])
                let output: string | null = null,
                  expected: Outcome
                try {
                  output = (
                    await pg.query<{ value: string | null }>(
                      `SELECT (${outputs[name]})::text value FROM lax_oracle`,
                    )
                  ).rows[0]!.value
                  await pg.query('UPDATE lax_oracle SET expected=$1', [output])
                  expected = outcome(
                    (await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM lax_oracle`))
                      .rows[0]!.value,
                  )
                } catch (error) {
                  expect(['2202E', '22023', '22004', '22P02']).toContain(
                    (error as { code: string }).code,
                  )
                  expected = errorOutcome(error)
                }
                const row = {
                  document: known(document),
                  path: known(path),
                  replacement: known(replacement),
                  flag: known(flag),
                  policy: known(policy),
                  bypass: known(bypass),
                  expected: known(output),
                }
                references.push({
                  name,
                  document,
                  path,
                  replacement,
                  flag,
                  policy,
                  bypass,
                  output,
                  expected,
                })
                add(name, row, expected)
                if (expected.kind === 'True')
                  add(name, { ...row, expected: known('"wrong"') }, { kind: 'False' })
              }
    await mkdir('artifacts/jsonb-path-mutation', { recursive: true })
    await writeFile(
      'artifacts/jsonb-path-mutation/lax-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/jsonb-path-mutation/lax-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbpathmutationlax',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
