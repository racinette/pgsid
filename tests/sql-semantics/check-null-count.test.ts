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
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

const packet = 'artifacts/goal-checks/null-count-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const literals = [
  '1::smallint',
  '1::bigint',
  '1.25::numeric',
  '1.25::float4',
  '1.25::float8',
  'true',
  "'text'::text",
  "'x '::char(3)",
  "'x'::varchar(3)",
  "'x'::name",
  '\'x\'::"char"',
  "'cursor'::refcursor",
  "'2000-01-01'::date",
  "'2000-01-01'::timestamp",
  "'2000-01-01Z'::timestamptz",
  "'12:34'::time",
  "'12:34+00'::timetz",
  "'1 day'::interval",
  "'1'::money",
  "'\\x0102'::bytea",
  "'00000000-0000-0000-0000-000000000001'::uuid",
  "'127.0.0.1'::inet",
  "'127.0.0.0/8'::cidr",
  "'00:11:22:33:44:55'::macaddr",
  "'00:11:22:33:44:55:66:77'::macaddr8",
  "B'10'::bit(2)",
  "B'10'::varbit",
  "'(1,2)'::point",
  "'{1,2,3}'::line",
  "'[(1,2),(3,4)]'::lseg",
  "'((1,2),(3,4))'::box",
  "'[(1,2),(3,4)]'::path",
  "'((1,2),(3,4),(5,6))'::polygon",
  "'<(1,2),3>'::circle",
  "'null'::json",
  "'null'::jsonb",
  "'(-$.a).abs()'::jsonpath",
  "'<item/>'::xml",
  "'lexeme'::tsvector",
  "'lexeme'::tsquery",
  "'=r/postgres'::aclitem",
  "'4294967295'::oid",
  "'4294967295'::xid",
  "'4294967295'::cid",
  "'18446744073709551615'::xid8",
  "'FFFFFFFF/FFFFFFFF'::pg_lsn",
  "'(1,2)'::tid",
  "'1:3:2'::pg_snapshot",
  "'1:3:2'::txid_snapshot",
  "'1 2'::int2vector",
  "'1 2'::oidvector",
  "'[1,3)'::int4range",
  "'{[1,3)}'::int4multirange",
  "'ready'::count_label",
  '1::count_positive',
  'ROW(NULL,NULL)::count_pair',
  'NULL::count_pair',
  'ARRAY[NULL,1]',
  'ARRAY[NULL::count_pair,ROW(NULL,NULL)::count_pair]',
]

it('counts datum nullness across concrete families, heterogeneous calls and generic VARIADIC arrays', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-null-count-'))
  try {
    await pg.exec(
      "CREATE TYPE count_label AS ENUM ('ready','done');CREATE DOMAIN count_positive AS int CHECK(VALUE>0);CREATE TYPE count_pair AS (score int,label text);",
    )
    const expressions = [
      ...literals.map((value) => ({ args: `number,${value},NULL`, input: '1', usesNumber: true })),
      {
        args: 'number,input,number>0,ROW(NULL,NULL),NULL::int[],ARRAY[NULL]',
        input: '',
        usesNumber: true,
      },
      { args: 'NULL', input: null, usesNumber: false },
      { args: 'input::int,number', input: '1', usesNumber: true },
      ...[
        'int[]',
        'count_positive[]',
        'count_label[]',
        'count_pair[]',
        'jsonb[]',
        'jsonpath[]',
        'int4range[]',
        'int4multirange[]',
        'tsquery[]',
        'tsvector[]',
        'xml[]',
        'aclitem[]',
      ].map((type) => ({
        args: `VARIADIC input::${type}`,
        input: null,
        usesNumber: false,
        inputs: [
          null,
          '{}',
          type === 'count_pair[]'
            ? '{"(,)",NULL}'
            : type === 'int[]' || type === 'count_positive[]'
              ? '{1,NULL,2}'
              : '{NULL,NULL}',
        ],
      })),
      {
        args: 'VARIADIC input::int[]',
        input: '{}',
        usesNumber: false,
        inputs: ['[0:1][-2:-1]={{1,NULL},{NULL,2}}', '{{NULL,NULL},{NULL,NULL}}'],
      },
      { args: 'VARIADIC ARRAY[number,NULL,number+1]', input: '1', usesNumber: true },
      { args: "VARIADIC '1 2'::int2vector", input: '1', usesNumber: false },
      { args: "VARIADIC '1 2'::oidvector", input: '1', usesNumber: false },
      ...['int2vector', 'oidvector'].flatMap((type) =>
        ['ARRAY[1,2]', 'ARRAY[]', 'ARRAY[NULL,2]', 'ARRAY[[1,2],[3,4]]'].map((value) => ({
          args: `VARIADIC ${value}::${type}`,
          input: '1',
          usesNumber: false,
        })),
      ),
    ]
    const forms = ['num_nulls', 'num_nonnulls'].flatMap((fn) =>
      expressions.map((form, index) => ({
        ...form,
        name: `${fn}_${index}`,
        output: `${fn}(${form.args})`,
      })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(number int,input text,expected int,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.output} IS NOT DISTINCT FROM expected END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE ${form.output} IS NOT DISTINCT FROM expected END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression,
        })
      }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      const inputs: (string | null)[] = 'inputs' in form ? form.inputs! : [form.input]
      for (const input of inputs)
        for (const number of [null, 1]) {
          const value = (
            await pg.query<{ value: number | null }>(
              `SELECT ${form.output} value FROM (SELECT $1::int number,$2::text input) args`,
              [number, input],
            )
          ).rows[0]!.value
          for (const wanted of [value, 99]) {
            const valid = value === wanted,
              insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,$3,false)`, [
                number,
                input,
                wanted,
              ])
            if (valid) await insert
            else await expect(insert).rejects.toMatchObject({ code: '23514' })
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.name + '_' + origin,
                row: {
                  number: known(number),
                  input: known(input),
                  expected: known(wanted),
                  bypass: known(false),
                },
                expected: { kind: valid ? 'True' : 'False' },
              })
          }
          observations.push({ form: form.name, number, input, value })
        }
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            number: { kind: 'Unknown' },
            input: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
        if (form.usesNumber)
          fixtures.push({
            name: form.name + '_' + origin,
            row: {
              number: { kind: 'Unknown' },
              input: known(form.input),
              expected: known(0),
              bypass: known(false),
            },
            expected: { kind: 'Unknown' },
          })
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluator.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          forms: forms.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'null_count', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('preserves partial nullness, eager operand errors, NULL arrays and lazy branches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-null-count-states-'))
  try {
    await pg.exec('CREATE TYPE count_pair AS (score int,label text);')
    const forms = ['num_nulls', 'num_nonnulls'].flatMap((fn) => [
      { name: fn + '_scalar', output: `${fn}(a,b/denominator)`, kind: 'scalar' },
      { name: fn + '_text', output: `${fn}(a,input::int)`, kind: 'text' },
      { name: fn + '_array', output: `${fn}(VARIADIC items)`, kind: 'array' },
      {
        name: fn + '_constructor',
        output: `${fn}(VARIADIC ARRAY[a,b/denominator])`,
        kind: 'scalar',
      },
      { name: fn + '_row', output: `${fn}(pair)`, kind: 'row' },
    ])
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(a int,b int,denominator int,input text,items int[],pair count_pair,expected int,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.output} IS NOT DISTINCT FROM expected END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE ${form.output} IS NOT DISTINCT FROM expected END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const error = (code: string): Extract<Outcome, { kind: 'Error' }> => ({
      kind: 'Error',
      value: { state: parseInt(code, 36) },
    })
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const form of forms) {
      for (const [a, b, denominator, input, items, pair] of [
        [1, 2, 1, '3', '{1,NULL,2}', '(,)'],
        [null, null, 0, null, null, null],
        [null, 2, 0, 'bad', '{}', '(1,x)'],
        [1, 2, 0, 'bad', '{{1,NULL},{NULL,2}}', '(,)'],
      ] as const) {
        let value: number | null = null,
          code: string | undefined
        try {
          value = (
            await pg.query<{ value: number | null }>(
              `SELECT ${form.output} value FROM (SELECT $1::int a,$2::int b,$3::int denominator,$4::text input,$5::int[] items,$6::count_pair pair) args`,
              [a, b, denominator, input, items, pair],
            )
          ).rows[0]!.value
        } catch (e) {
          code = (e as { code: string }).code
        }
        const row: Row = {
          a: known(a),
          b: known(b),
          denominator: known(denominator),
          input: known(input),
          items:
            items === null
              ? { kind: 'Null' }
              : {
                  kind: 'Value',
                  value: {
                    elementType: 'pg_catalog.int4',
                    elementKind: 2,
                    dimensions:
                      items === '{}'
                        ? []
                        : items.startsWith('{{')
                          ? [
                              { lower: 1, length: 2 },
                              { lower: 1, length: 2 },
                            ]
                          : [{ lower: 1, length: 3 }],
                    elements:
                      items === '{}'
                        ? []
                        : items.startsWith('{{')
                          ? [
                              { kind: 'Int4', value: 1 },
                              { kind: 'Null' },
                              { kind: 'Null' },
                              { kind: 'Int4', value: 2 },
                            ]
                          : [
                              { kind: 'Int4', value: 1 },
                              { kind: 'Null' },
                              { kind: 'Int4', value: 2 },
                            ],
                    nullBitmap: { kind: 'Value', value: items !== '{}' },
                  },
                },
          pair:
            pair === null
              ? { kind: 'Null' }
              : {
                  kind: 'Value',
                  value: {
                    typeName: 'public.count_pair',
                    fields:
                      pair === '(,)'
                        ? [{ kind: 'Null' }, { kind: 'Null' }]
                        : [
                            { kind: 'Int4', value: 1 },
                            { kind: 'Text', value: 'x' },
                          ],
                  },
                },
          expected: known(value),
          bypass: known(false),
        }
        add(form.name, row, code ? error(code) : { kind: 'True' })
        add(
          form.name,
          { ...row, bypass: known(true), expected: { kind: 'Unknown' } },
          { kind: 'True' },
        )
        observations.push({
          form: form.name,
          a,
          b,
          denominator,
          input,
          items,
          pair,
          value,
          error: code ?? null,
        })
      }
      const base: Row = {
        a: { kind: 'Unknown' },
        b: known(1),
        denominator: known(1),
        input: known('1'),
        items: { kind: 'Unknown' },
        pair: { kind: 'Unknown' },
        expected: known(0),
        bypass: known(false),
      }
      add(form.name, base, { kind: 'Unknown' })
      if (form.kind === 'scalar') {
        add(form.name, { ...base, b: known(1), denominator: known(0) }, error('22012'))
        add(form.name, { ...base, a: error('22003'), b: error('22012') }, error('22003'))
        add(form.name, { ...base, b: error('22012') }, error('22012'))
      }
      if (form.kind === 'text') add(form.name, { ...base, input: known('bad') }, error('22P02'))
      if (form.kind === 'array') {
        const payload: OwnedArrayInputPayload = {
          elementType: 'pg_catalog.int4',
          elementKind: 2,
          dimensions: [{ lower: -1, length: 2 }],
          elements: [{ kind: 'Unknown' }, { kind: 'Unknown' }],
          nullBitmap: { kind: 'Value', value: false },
        }
        const expected = form.name.startsWith('num_nulls_') ? 0 : 2
        add(
          form.name,
          { ...base, items: { kind: 'Value', value: payload }, expected: known(expected) },
          { kind: 'True' },
        )
        add(
          form.name,
          {
            ...base,
            items: { kind: 'Value', value: { ...payload, nullBitmap: { kind: 'Unknown' } } },
            expected: known(expected),
          },
          { kind: 'Unknown' },
        )
        add(
          form.name,
          { ...base, items: { kind: 'Null' }, expected: { kind: 'Null' } },
          { kind: 'True' },
        )
        add(form.name, { ...base, items: error('22003') }, error('22003'))
      }
      if (form.kind === 'row') {
        add(
          form.name,
          {
            ...base,
            pair: {
              kind: 'Value',
              value: {
                typeName: 'public.count_pair',
                fields: [{ kind: 'Unknown' }, { kind: 'Unknown' }],
              },
            },
            expected: known(form.name.startsWith('num_nulls_') ? 0 : 1),
          },
          { kind: 'True' },
        )
        add(
          form.name,
          {
            ...base,
            pair: { kind: 'Null' },
            expected: known(form.name.startsWith('num_nulls_') ? 1 : 0),
          },
          { kind: 'True' },
        )
      }
    }
    await runCheckParity(root, 'null_count_states', group, names, fixtures)
    await writeFile(
      packet + '/states-summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)
