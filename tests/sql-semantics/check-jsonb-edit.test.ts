import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('matches JSONB concatenation and top-level text/index deletion, ownership, extracted roots and lazy composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-edit-'))
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      'CREATE DOMAIN edited_document AS jsonb;CREATE DOMAIN retained_edited_document AS edited_document',
    )
    await pg.exec(
      "CREATE COLLATION edit_ci(provider=icu,locale='und-u-ks-level2',deterministic=false)",
    )
    const expressions: Record<string, string> = {
      concat: '(lhs||rhs) IS NOT DISTINCT FROM expected',
      concat_call: 'jsonb_concat(lhs,rhs) IS NOT DISTINCT FROM expected',
      text_delete: '(lhs-key_name) IS NOT DISTINCT FROM expected',
      text_call: 'jsonb_delete(lhs,key_name) IS NOT DISTINCT FROM expected',
      text_ci: '(lhs-(key_name COLLATE edit_ci)) IS NOT DISTINCT FROM expected',
      index_delete: '(lhs-element_index) IS NOT DISTINCT FROM expected',
      index_call: 'jsonb_delete(lhs,element_index) IS NOT DISTINCT FROM expected',
      concat_guard: 'CASE WHEN bypass THEN true ELSE (lhs||rhs) IS NOT DISTINCT FROM expected END',
      delete_guard:
        'CASE WHEN bypass THEN true ELSE (lhs-key_name) IS NOT DISTINCT FROM expected END',
      index_guard:
        'CASE WHEN bypass THEN true ELSE (lhs-element_index) IS NOT DISTINCT FROM expected END',
      concat_selected:
        '((CASE WHEN bypass THEN fallback ELSE lhs END)||rhs) IS NOT DISTINCT FROM expected',
      concat_coalesced: 'COALESCE(lhs||rhs,fallback) IS NOT DISTINCT FROM expected',
      deletion_chain: '((lhs-key_name)||rhs) IS NOT DISTINCT FROM expected',
      extracted_concat: "((lhs->'selected')||(rhs->'selected')) IS NOT DISTINCT FROM expected",
      extracted_delete: "((lhs->'selected')-key_name) IS NOT DISTINCT FROM expected",
      extracted_index: "((lhs->'selected')-element_index) IS NOT DISTINCT FROM expected",
      array_concat: 'jsonb_array_length(lhs||rhs) IS NOT DISTINCT FROM expected_count',
      post_cast: "((lhs||rhs)->'value')::integer IS NOT DISTINCT FROM expected_integer",
      text_output: '(lhs||rhs)::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      literal: `('{"a":1}'::retained_edited_document||'{"a":2,"b":3}'::jsonb)-'b' = '{"a":2}'::jsonb`,
    }
    await pg.exec(
      `CREATE TABLE jsonb_edits(lhs retained_edited_document,rhs jsonb,fallback jsonb,key_name text,element_index integer,expected jsonb,expected_count integer,expected_integer integer,expected_text text,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    await pg.exec(
      `CREATE TABLE eager_delete(bypass boolean,CONSTRAINT scalar_error CHECK(CASE WHEN bypass THEN true ELSE ('null'::jsonb-'x') IS NULL END))`,
    )
    await expect(pg.query('INSERT INTO eager_delete VALUES(true)')).rejects.toMatchObject({
      code: '22023',
    })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_edits')!,
      eager = catalog.tables.find((t) => t.name === 'eager_delete')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { table, constraint: { ...c, name: name + '_raw', definition: `CHECK(${sql})` } },
        { table, constraint: { ...c, name: name + '_stored' } },
      ]
    })
    constraints.push(
      {
        table: eager,
        constraint: {
          ...eager.constraints[0]!,
          name: 'eager_raw',
          definition: `CHECK(CASE WHEN bypass THEN true ELSE ('null'::jsonb-'x') IS NULL END)`,
        },
      },
      { table: eager, constraint: { ...eager.constraints[0]!, name: 'eager_stored' } },
    )
    const plans = constraints.map(({ table, constraint }) => ({
      expression: portableCheckAtoms(
        lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
      ),
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: constraint.name,
      },
    }))
    for (const [index, plan] of plans.entries())
      expect(hasUncertain(plan.expression), constraints[index]!.constraint.name).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.constraint.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    const base: Row = {
      lhs: known('{"a":1}'),
      rhs: known('{"a":2}'),
      fallback: known('{}'),
      key_name: known('a'),
      element_index: known(0),
      expected: known('{"a":2}'),
      expected_count: known(0),
      expected_integer: known(2),
      expected_text: known('{"a": 2}'),
      bypass: known(false),
    }
    const atoms = [
      null,
      'null',
      'false',
      'true',
      '0',
      '1.00',
      '"a"',
      '"雪"',
      '[]',
      '{}',
      '[1]',
      '[1,2]',
      '["a",1,"a",["a"],{"a":1}]',
      '{"a":1}',
      '{"a":null,"b":2}',
      '{"a":{"old":1}}',
      '{"a":{"new":2}}',
      '{"aa":1,"é":2}',
      '{"雪":[1,2]}',
    ]
    const pairs: (readonly [string | null, string | null])[] = atoms.flatMap((a) =>
      atoms.map((b) => [a, b] as const),
    )
    pairs.push(
      ['{"a":1,"a":2}', '{"a":3}'],
      ['{"a":{"x":1},"b":1}', '{"a":{"y":2},"b":null}'],
      ['[{"a":1}]', '[[2,3]]'],
      ['{"aa":1,"é":2}', '{"aa":2,"雪":3}'],
    )
    for (let i = 0; i < 32; i++)
      pairs.push([`{"k${i % 7}":[${i},null],"雪":${i}}`, `{"k${i % 7}":${i + 1},"aa":${i}}`])
    for (const [lhs, rhs] of pairs) {
      const row = (
        await pg.query<{ lhs: string | null; rhs: string | null; result: string | null }>(
          `SELECT lhs::text lhs,rhs::text rhs,(lhs||rhs)::text result FROM(SELECT $1::jsonb lhs,$2::jsonb rhs)q`,
          [lhs, rhs],
        )
      ).rows[0]!
      const inputs = {
        ...base,
        lhs: known(row.lhs),
        rhs: known(row.rhs),
        expected: known(row.result),
      }
      for (const name of ['concat', 'concat_call', 'concat_guard', 'literal'])
        add(name, inputs, { kind: 'True' })
      if (row.result === null)
        add('concat_coalesced', { ...inputs, expected: known('{}') }, { kind: 'True' })
      else add('concat_coalesced', inputs, { kind: 'True' })
      oracle.push({ operation: 'concat', inputLeft: lhs, inputRight: rhs, ...row })
    }
    const keys = [null, '', 'a', 'A', '1', 'null', 'true', 'é', '雪', 'missing'],
      indices = [null, -2147483648, -5, -3, -2, -1, 0, 1, 2, 3, 5, 2147483647]
    for (const document of [
      ...atoms,
      '{"":1,"A":2,"a":3,"é":4,"雪":5}',
      '["1",1,"true",true,"null",null,"é","é","雪"]',
    ]) {
      for (const key of keys) {
        try {
          const row = (
            await pg.query<{ input: string | null; result: string | null }>(
              `SELECT $1::jsonb::text input,($1::jsonb-$2::text)::text result`,
              [document, key],
            )
          ).rows[0]!
          for (const name of ['text_delete', 'text_call', 'text_ci', 'delete_guard'])
            add(
              name,
              { ...base, lhs: known(row.input), key_name: known(key), expected: known(row.result) },
              { kind: 'True' },
            )
          oracle.push({ operation: 'text_delete', document, key, ...row })
        } catch (e) {
          const state = (e as { code: string }).code
          expect(state).toBe('22023')
          for (const name of ['text_delete', 'text_call', 'text_ci', 'delete_guard'])
            add(name, { ...base, lhs: known(document), key_name: known(key) }, error(state))
          oracle.push({ operation: 'text_delete', document, key, state })
        }
      }
      for (const index of indices) {
        try {
          const row = (
            await pg.query<{ input: string | null; result: string | null }>(
              `SELECT $1::jsonb::text input,($1::jsonb-$2::int)::text result`,
              [document, index],
            )
          ).rows[0]!
          for (const name of ['index_delete', 'index_call', 'index_guard'])
            add(
              name,
              {
                ...base,
                lhs: known(row.input),
                element_index: known(index),
                expected: known(row.result),
              },
              { kind: 'True' },
            )
          oracle.push({ operation: 'index_delete', document, index, ...row })
        } catch (e) {
          const state = (e as { code: string }).code
          expect(state).toBe('22023')
          for (const name of ['index_delete', 'index_call', 'index_guard'])
            add(name, { ...base, lhs: known(document), element_index: known(index) }, error(state))
          oracle.push({ operation: 'index_delete', document, index, state })
        }
      }
    }
    for (const [name, row] of [
      [
        'deletion_chain',
        {
          ...base,
          lhs: known('{"a":0,"b":1}'),
          rhs: known('{"a":2}'),
          expected: known('{"a":2,"b":1}'),
        },
      ],
      [
        'extracted_concat',
        {
          ...base,
          lhs: known('{"selected":{"a":1},"outside":1}'),
          rhs: known('{"selected":{"a":2,"b":3},"outside":2}'),
          expected: known('{"a":2,"b":3}'),
        },
      ],
      [
        'extracted_delete',
        {
          ...base,
          lhs: known('{"selected":{"a":1,"b":2},"outside":1}'),
          expected: known('{"b":2}'),
        },
      ],
      [
        'extracted_index',
        {
          ...base,
          lhs: known('{"selected":[1,2,3],"outside":1}'),
          element_index: known(-1),
          expected: known('[1,2]'),
        },
      ],
      [
        'array_concat',
        { ...base, lhs: known('[1,2]'), rhs: known('[3]'), expected_count: known(3) },
      ],
      ['post_cast', { ...base, lhs: known('{"value":1}'), rhs: known('{"value":1.5}') }],
      ['text_output', base],
    ] as const)
      add(name, row, { kind: 'True' })
    for (const [left, right, expected] of [
      ['1', '2', '[1,2]'],
      ['[1,2]', '{"a":3}', '[1,2,{"a":3}]'],
      ['{"a":1}', '[2,3]', '[{"a":1},2,3]'],
      ['[]', '3', '[3]'],
      ['[[1,2]]', '[3]', '[[1,2],3]'],
    ])
      add(
        'extracted_concat',
        {
          ...base,
          lhs: known('{"selected":' + left + ',"outside":99}'),
          rhs: known('{"selected":' + right + ',"outside":100}'),
          expected: known(expected!),
        },
        { kind: 'True' },
      )
    for (const operand of [{ kind: 'Unknown' } as const, error('22003')]) {
      const expected: Outcome = operand.kind === 'Error' ? operand : { kind: 'Unknown' }
      for (const name of [
        'concat',
        'concat_call',
        'concat_guard',
        'text_delete',
        'text_call',
        'delete_guard',
        'index_delete',
        'index_call',
        'index_guard',
      ])
        add(name, { ...base, lhs: operand }, expected)
      for (const name of ['concat', 'concat_call']) add(name, { ...base, rhs: operand }, expected)
      for (const name of ['text_delete', 'text_call'])
        add(name, { ...base, key_name: operand }, expected)
      for (const name of ['index_delete', 'index_call'])
        add(name, { ...base, element_index: operand }, expected)
      for (const name of ['concat_guard', 'delete_guard', 'index_guard'])
        add(name, { ...base, lhs: operand, bypass: known(true) }, { kind: 'True' })
      add('concat_selected', { ...base, lhs: operand, bypass: known(true) }, { kind: 'True' })
    }
    for (const [name, key] of [
      ['concat', 'rhs'],
      ['text_delete', 'key_name'],
      ['index_delete', 'element_index'],
    ] as const) {
      add(name, { ...base, lhs: error('22003'), [key]: error('22012') }, error('22003'))
      add(name, { ...base, lhs: known(null), [key]: error('22012') }, error('22012'))
      add(name, { ...base, lhs: { kind: 'Unknown' }, [key]: known(null) }, { kind: 'Unknown' })
      add(name, { ...base, lhs: known('[1,]') }, { kind: 'Unknown' })
    }
    add('concat', { ...base, expected: known('{}') }, { kind: 'False' })
    add('text_delete', { ...base, expected: known('{"a":1}') }, { kind: 'False' })
    add(
      'index_delete',
      { ...base, lhs: known('[1,2]'), expected: known('[1,2]') },
      { kind: 'False' },
    )
    add('eager', { ...base, bypass: known(true) }, error('22023'))
    for (const depth of [128, 16384]) {
      const nested = '['.repeat(depth) + '1' + ']'.repeat(depth)
      add(
        'concat',
        {
          ...base,
          lhs: known(nested),
          rhs: known('[2]'),
          expected: known('[' + '['.repeat(depth - 1) + '1' + ']'.repeat(depth - 1) + ',2]'),
        },
        { kind: 'True' },
      )
      add(
        'text_delete',
        { ...base, lhs: known('{"a":' + nested + ',"b":2}'), expected: known('{"b":2}') },
        { kind: 'True' },
      )
    }
    await mkdir('artifacts/jsonb-edit', { recursive: true })
    await writeFile(
      'artifacts/jsonb-edit/oracle.json',
      JSON.stringify(
        { cases: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_edits',
      group,
      constraints.map((c) => c.constraint.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
