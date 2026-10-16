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
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('constructs raw JSON and normalized JSONB objects from paired and separate text arrays with exact shape, NULL, escaping, duplicates and ownership', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-object-arrays-shapes-'))
  try {
    await pg.exec(
      'CREATE DOMAIN object_pairs AS text[];CREATE DOMAIN nested_object_pairs AS object_pairs;CREATE TABLE object_arrays(payload text,keys text,contents text,expected text,expected_binary jsonb,bypass boolean);CREATE TABLE object_oracle(LIKE object_arrays)',
    )
    const outputs: Record<string, string> = {
      raw_pairs: 'json_object(payload::nested_object_pairs)::text',
      raw_separate: 'json_object(keys::text[],contents::text[])::text',
      binary_pairs: 'jsonb_object(payload::nested_object_pairs)',
      binary_separate: 'jsonb_object(keys::text[],contents::text[])',
      raw_field: "json_object(payload::text[])->>'a'",
      binary_field: "jsonb_object(payload::text[])->>'a'",
      owned:
        'jsonb_build_array(jsonb_object(payload::text[]),jsonb_object(keys::text[],contents::text[]))',
      guarded_raw: 'CASE WHEN bypass THEN expected ELSE json_object(payload::text[])::text END',
      guarded_binary:
        'CASE WHEN bypass THEN expected_binary ELSE jsonb_object(keys::text[],contents::text[]) END',
    }
    const binary = (name: string) =>
      (name.startsWith('binary_') && !name.endsWith('field')) ||
      name === 'owned' ||
      name === 'guarded_binary'
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        binary(name)
          ? `(${sql}) IS NOT DISTINCT FROM expected_binary`
          : `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE object_arrays ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'object_arrays')!,
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
    const paired = [
      null,
      '{}',
      '{a}',
      '{a,1,b}',
      '{NULL,1}',
      '{a,NULL}',
      '{a,"null"}',
      '{a,1,a,2}',
      '{b,1,a,2}',
      '{"",value}',
      '{"quote\\\"key","back\\\\slash"}',
      '{"line\\nkey","line\\nvalue"}',
      '{"line\nkey","line\nvalue"}',
      '{"tab\tkey","controls\r\b\f\u0001\u001f"}',
      '{雪,😊,a,1}',
      '{{a,1},{b,2}}',
      '{{a},{b}}',
      '{{a,1,b},{c,2,d}}',
      '{{{a,1}}}',
      '[0:3]={a,1,b,2}',
      '[-2:-1][0:1]={{a,1},{b,NULL}}',
      'bad',
    ]
    const keyArrays = [
      null,
      '{}',
      '{a}',
      '{a,b}',
      '{b,a}',
      '{a,a}',
      '{NULL}',
      '{a,NULL}',
      '[0:1]={a,b}',
      '{{a,b}}',
      '{雪,😊}',
      '{"",a}',
      'bad',
    ]
    const valueArrays = [
      null,
      '{}',
      '{1}',
      '{1,2}',
      '{NULL,"null"}',
      '{1,NULL}',
      '[-3:-2]={1,2}',
      '{{1,2}}',
      '{雪,😊}',
      'bad',
    ]
    const cases = [
      ...paired.map((payload) => ({ payload, keys: '{}', contents: '{}' })),
      ...keyArrays.flatMap((keys) =>
        valueArrays.map((contents) => ({ payload: '{}', keys, contents })),
      ),
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = [],
      add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    for (const inputs of cases)
      for (const [name, sql] of Object.entries(forms)) {
        await pg.exec('TRUNCATE object_oracle')
        await pg.query('INSERT INTO object_oracle VALUES($1,$2,$3,NULL,NULL,false)', [
          inputs.payload,
          inputs.keys,
          inputs.contents,
        ])
        let output: string | null = null,
          expected: Outcome
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${outputs[name]})::text value FROM object_oracle`,
            )
          ).rows[0]!.value
          await pg.query(
            binary(name)
              ? 'UPDATE object_oracle SET expected_binary=$1'
              : 'UPDATE object_oracle SET expected=$1',
            [output],
          )
          expected = outcome(
            (await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM object_oracle`)).rows[0]!
              .value,
          )
        } catch (cause) {
          expect(['2202E', '22004', '22P02']).toContain((cause as { code: string }).code)
          expected = errorOutcome(cause)
        }
        const row = {
          ...Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, known(value)])),
          expected: known(binary(name) ? null : output),
          expected_binary: known(binary(name) ? output : null),
          bypass: known(false),
        }
        references.push({ name, ...inputs, output, expected })
        add(name, row, expected)
        if (expected.kind === 'True')
          add(
            name,
            {
              ...row,
              [binary(name) ? 'expected_binary' : 'expected']: known(
                binary(name) ? '"wrong"' : 'wrong',
              ),
            },
            { kind: 'False' },
          )
      }
    add(
      'guarded_raw',
      { payload: known('bad'), expected: known('safe'), bypass: known(true) },
      { kind: 'True' },
    )
    add(
      'guarded_binary',
      {
        keys: known('bad'),
        contents: known('bad'),
        expected_binary: known('{}'),
        bypass: known(true),
      },
      { kind: 'True' },
    )
    await mkdir('artifacts/json-object-arrays', { recursive: true })
    await writeFile(
      'artifacts/json-object-arrays/shapes-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-object-arrays/shapes-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonobjectarraysshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves partial key/value states, rank-before-key errors, strict inputs, lazy branches and immutable preparation for array object construction', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-object-arrays-partial-'))
  try {
    await pg.exec(
      'CREATE TABLE partial_objects(first text,second text,third text,fourth text,expected text,expected_binary jsonb,bypass boolean,divisor integer,payload text);CREATE TABLE partial_oracle(LIKE partial_objects)',
    )
    const outputs: Record<string, string> = {
      raw_pair: 'json_object(ARRAY[first,second])::text',
      raw_two: 'json_object(ARRAY[first],ARRAY[second])::text',
      binary_pair: 'jsonb_object(ARRAY[first,second])',
      binary_two: 'jsonb_object(ARRAY[first],ARRAY[second])',
      raw_many: 'json_object(ARRAY[first,second,third,fourth])::text',
      binary_many: 'jsonb_object(ARRAY[first,second,third,fourth])',
      raw_rank: 'json_object(ARRAY[[first,second,third]])::text',
      binary_rank: 'jsonb_object(ARRAY[[first,second,third]])',
      raw_null: 'json_object(ARRAY[first],NULL::text[])::text',
      binary_null: 'jsonb_object(ARRAY[first],NULL::text[])',
      guarded: 'CASE WHEN bypass THEN expected ELSE json_object(payload::text[])::text END',
      eager: 'json_object(ARRAY[first,(1/divisor)::text],payload::text[])::text',
      pruned_null: 'json_object(ARRAY[first,(1/divisor)::text],NULL::text[])::text',
    }
    const preparations: Record<string, string> = {
      prepared_rank: "CASE WHEN bypass THEN expected ELSE json_object('{a}'::text[])::text END",
      prepared_null_key:
        "CASE WHEN bypass THEN expected_binary ELSE jsonb_object('{NULL,1}'::text[]) END",
      pruned: "CASE WHEN true THEN '{}'::text ELSE json_object('{a}'::text[])::text END",
    }
    const binary = (name: string) => name.startsWith('binary_') || name === 'prepared_null_key'
    const forms = Object.fromEntries(
      Object.entries({ ...outputs, ...preparations }).map(([name, sql]) => [
        name,
        binary(name)
          ? `(${sql}) IS NOT DISTINCT FROM expected_binary`
          : `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE partial_objects ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'partial_objects')!,
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
      group = prepareCheckRustGroup(plans, { arrayNulls: true, defaultCollation: 'C' })
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
      },
      error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
    const base: Row = {
      first: known('a'),
      second: known('1'),
      third: known('b'),
      fourth: known('2'),
      expected: known('{"a" : "1"}'),
      expected_binary: known('{"a":"1"}'),
      bypass: known(false),
      divisor: { kind: 'Value', value: 1 },
      payload: known('{}'),
    }
    for (const name of ['raw_pair', 'raw_two', 'binary_pair', 'binary_two']) {
      add(name, base, { kind: 'True' })
      add(
        name,
        {
          ...base,
          first: known('雪'),
          second: known('😊'),
          expected: known('{"雪" : "😊"}'),
          expected_binary: known('{"雪":"😊"}'),
        },
        { kind: 'True' },
      )
      add(name, { ...base, first: known(null) }, error('22004'))
      add(name, { ...base, first: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(name, { ...base, second: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(
        name,
        {
          ...base,
          second: known(null),
          expected: known('{"a" : null}'),
          expected_binary: known('{"a":null}'),
        },
        { kind: 'True' },
      )
    }
    for (const name of ['raw_many', 'binary_many']) {
      add(
        name,
        { ...base, first: { kind: 'Unknown' }, second: { kind: 'Unknown' }, third: known(null) },
        error('22004'),
      )
      add(name, { ...base, second: { kind: 'Unknown' }, third: known(null) }, error('22004'))
      add(
        name,
        {
          ...base,
          third: known('a'),
          fourth: known('last'),
          expected: known('{"a" : "1", "a" : "last"}'),
          expected_binary: known('{"a":"last"}'),
        },
        { kind: 'True' },
      )
    }
    for (const name of ['raw_rank', 'binary_rank'])
      add(name, { ...base, first: { kind: 'Unknown' }, second: known(null) }, error('2202E'))
    for (const name of ['raw_null', 'binary_null'])
      add(
        name,
        {
          ...base,
          first: { kind: 'Unknown' },
          expected: known(null),
          expected_binary: known(null),
        },
        { kind: 'True' },
      )
    add('guarded', { ...base, bypass: known(true), payload: known('bad') }, { kind: 'True' })
    add('guarded', { ...base, bypass: known(false), payload: known('bad') }, error('22P02'))
    add('eager', { ...base, divisor: { kind: 'Value', value: 0 } }, error('22012'))
    add(
      'eager',
      { ...base, divisor: { kind: 'Value', value: 0 }, payload: known(null) },
      error('22012'),
    )
    add(
      'pruned_null',
      { ...base, divisor: { kind: 'Value', value: 0 }, expected: known(null) },
      { kind: 'True' },
    )
    add('pruned_null', { ...base, divisor: { kind: 'Value', value: 0 } }, { kind: 'False' })
    add('prepared_rank', { ...base, bypass: known(true) }, error('2202E'))
    add('prepared_null_key', { ...base, bypass: known(true) }, error('22004'))
    add('pruned', { ...base, expected: known('{}') }, { kind: 'True' })
    for (const name of ['prepared_rank', 'prepared_null_key', 'pruned', 'eager', 'pruned_null']) {
      await pg.exec('TRUNCATE partial_oracle')
      await pg.query('INSERT INTO partial_oracle VALUES($1,$2,$3,$4,$5,$6,true,0,$7)', [
        'a',
        '1',
        'b',
        '2',
        '{}',
        '{}',
        'bad',
      ])
      let expected: Outcome
      try {
        expected = outcome(
          (await pg.query<{ value: boolean }>(`SELECT ${forms[name]} value FROM partial_oracle`))
            .rows[0]!.value,
        )
      } catch (cause) {
        expected = errorOutcome(cause)
      }
      references.push({ name, expected })
      add(
        name,
        {
          ...base,
          bypass: known(true),
          divisor: { kind: 'Value', value: 0 },
          expected: known('{}'),
          expected_binary: known('{}'),
          payload: known('bad'),
        },
        expected,
      )
    }
    await mkdir('artifacts/json-object-arrays', { recursive: true })
    await writeFile(
      'artifacts/json-object-arrays/partial-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-object-arrays/partial-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonobjectarrayspartial',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
