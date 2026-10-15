import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  jsonbInputForms,
  invalidJsonbInputForms,
  deferredJsonbEncodingForms,
} from './check-jsonb-input-forms.js'

it('validates public JSONB logical payloads, rejects malformed graphs and preserves SQL-coerced semantics through real INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-payload-'))
  try {
    await pg.exec(`CREATE DOMAIN stored_document AS jsonb;CREATE DOMAIN retained_document AS stored_document;
    CREATE TABLE jsonb_payloads(document retained_document,expected_kind text,expected_source text,bypass boolean,
    CONSTRAINT shape CHECK(jsonb_typeof(document) COLLATE "C"=expected_kind COLLATE "C"),
    CONSTRAINT source CHECK(document::text COLLATE "C"=expected_source COLLATE "C"),
    CONSTRAINT present CHECK(document IS NOT NULL),
    CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE jsonb_typeof(document) COLLATE "C"=expected_kind COLLATE "C" END));
    CREATE TABLE jsonb_text_inputs(source_text text,expected_source text,bypass boolean,
    CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::retained_document::text COLLATE "C"=expected_source COLLATE "C" END));
    CREATE TABLE jsonb_read_inputs(document retained_document,field_name text,element_index integer,expected_json text,expected_text text,expected_element_json text,expected_element_text text,expected_count integer,expected_exists boolean,check_count boolean,bypass boolean,
    CONSTRAINT field_source CHECK(CASE WHEN bypass THEN true ELSE (document->field_name)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C" END),
    CONSTRAINT field_text CHECK(CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
    CONSTRAINT element_source CHECK(CASE WHEN bypass THEN true ELSE (document->element_index)::text COLLATE "C" IS NOT DISTINCT FROM expected_element_json COLLATE "C" END),
    CONSTRAINT element_text CHECK(CASE WHEN bypass THEN true ELSE (document->>element_index) COLLATE "C" IS NOT DISTINCT FROM expected_element_text COLLATE "C" END),
    CONSTRAINT array_length CHECK(CASE WHEN bypass OR NOT check_count THEN true ELSE jsonb_array_length(document) IS NOT DISTINCT FROM expected_count END),
    CONSTRAINT key_exists CHECK(CASE WHEN bypass THEN true ELSE (document ? field_name) IS NOT DISTINCT FROM expected_exists END));
    CREATE TABLE jsonb_relation_inputs(lhs retained_document,rhs jsonb,expected_equal boolean,expected_unequal boolean,expected_contains boolean,expected_contained boolean,bypass boolean,
    CONSTRAINT same_value CHECK(CASE WHEN bypass THEN true ELSE (lhs=rhs) IS NOT DISTINCT FROM expected_equal END),
    CONSTRAINT different_value CHECK(CASE WHEN bypass THEN true ELSE (lhs<>rhs) IS NOT DISTINCT FROM expected_unequal END),
    CONSTRAINT includes_value CHECK(CASE WHEN bypass THEN true ELSE (lhs @> rhs) IS NOT DISTINCT FROM expected_contains END),
    CONSTRAINT included_value CHECK(CASE WHEN bypass THEN true ELSE (lhs <@ rhs) IS NOT DISTINCT FROM expected_contained END));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_payloads')!
    const textTable = catalog.tables.find((t) => t.name === 'jsonb_text_inputs')!
    const readTable = catalog.tables.find((t) => t.name === 'jsonb_read_inputs')!
    const relationTable = catalog.tables.find((t) => t.name === 'jsonb_relation_inputs')!
    const bundle = renderTypescriptSchemaCheckArtifacts(
      [table, textTable, readTable, relationTable],
      catalog.domains,
    )
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(root, 'js'),
      join(root, 'checks.ts'),
    ]).catch((e: { stdout: string; stderr: string; message: string }) => {
      throw new Error(e.stdout + e.stderr || e.message, { cause: e })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(
      pathToFileURL(join(root, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluateRelations = (
      lhs: unknown,
      rhs: unknown,
      expected: Record<string, unknown> = {},
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonbRelationInputsChecks({
            lhs,
            rhs,
            expected_equal: true,
            expected_unequal: false,
            expected_contains: true,
            expected_contained: true,
            ...expected,
            bypass,
          })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const [lhs, rhs] of [
      [null, null],
      [null, '{}'],
      ['1.00', '1e0'],
      ['9007199254740993', '9007199254740992'],
      ['{"aa":1,"é":2}', '{"é":2,"aa":1.00}'],
      ['{"a":1,"a":2}', '{"a":2}'],
      ['[2,1,1]', '[1,2]'],
      ['[[1,2]]', '[[1]]'],
      ['[[1,2]]', '[1]'],
      ['[{"a":0},{"a":1}]', '[{"a":1}]'],
      ['{"a":[1,2]}', '{"a":1}'],
    ] as const) {
      const row = (
        await pg.query<{
          lhs: string | null
          rhs: string | null
          expected_equal: boolean | null
          expected_unequal: boolean | null
          expected_contains: boolean | null
          expected_contained: boolean | null
        }>(
          `SELECT lhs::text lhs,rhs::text rhs,lhs=rhs expected_equal,lhs<>rhs expected_unequal,lhs @> rhs expected_contains,lhs <@ rhs expected_contained FROM (SELECT $1::jsonb lhs,$2::jsonb rhs) q`,
          [lhs, rhs],
        )
      ).rows[0]!
      const { lhs: a, rhs: b, ...expected } = row
      const first = a === null ? null : runtime.makeJsonbValue(a),
        second = b === null ? null : runtime.makeJsonbValue(b)
      const before = JSON.stringify([first, second])
      expect(
        Object.values(evaluateRelations(first, second, expected)).every(
          (r) => r.certain && r.value === true,
        ),
      ).toBe(true)
      expect(JSON.stringify([first, second])).toBe(before)
      await pg.query(
        'INSERT INTO jsonb_relation_inputs VALUES($1::jsonb,$2::jsonb,$3,$4,$5,$6,false)',
        [
          lhs,
          rhs,
          row.expected_equal,
          row.expected_unequal,
          row.expected_contains,
          row.expected_contained,
        ],
      )
    }
    const relationValue = runtime.makeJsonbValue('{"a":1}')
    expect(
      evaluateRelations(relationValue, relationValue, { expected_equal: false }).same_value,
    ).toEqual({ certain: true, value: false })
    for (const lhs of [
      undefined,
      '{}',
      { kind: 'Unknown' },
      { kind: 'Value', value: { root: 0, nodes: [], characters: [] } },
    ]) {
      expect(
        Object.values(evaluateRelations(lhs, relationValue)).every((r) => r.certain === false),
      ).toBe(true)
      expect(
        Object.values(evaluateRelations(lhs, relationValue, {}, true)).every(
          (r) => r.certain && r.value === true,
        ),
      ).toBe(true)
    }
    for (const result of Object.values(
      evaluateRelations(
        { kind: 'Error', value: { state: parseInt('22003', 36) } },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ),
    ))
      expect(result).toEqual({ certain: true, error: '22003' })
    const evaluateReads = (
      document: unknown,
      expected: Record<string, unknown> = {},
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonbReadInputsChecks({
            document,
            field_name: 'a',
            element_index: 0,
            expected_json: null,
            expected_text: null,
            expected_element_json: null,
            expected_element_text: null,
            expected_count: 0,
            expected_exists: false,
            check_count: true,
            ...expected,
            bypass,
          })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const [source, key, index] of [
      ['{"a":1,"a":2}', 'a', 0],
      ['{"雪":"😊"}', '雪', 0],
      ['{"a":[{"name":"first"},{"name":"last"}]}', 'a', 0],
      ['[null,9007199254740993.00,"a"]', 'a', -1],
      ['["a",null]', 'a', -2147483648],
      ['[]', 'a', 0],
      ['"a"', 'a', -1],
      ['null', 'a', 0],
      ['42.00', 'a', 0],
    ] as const) {
      const row = (
        await pg.query<{
          source: string
          expected_json: string | null
          expected_text: string | null
          expected_element_json: string | null
          expected_element_text: string | null
          expected_count: number | null
          expected_exists: boolean
          check_count: boolean
        }>(
          `SELECT document::text source,(document->$2::text)::text expected_json,document->>$2::text expected_text,(document->$3::int)::text expected_element_json,document->>$3::int expected_element_text,CASE WHEN jsonb_typeof(document)='array' THEN jsonb_array_length(document) ELSE NULL END expected_count,document ? $2::text expected_exists,jsonb_typeof(document)='array' check_count FROM (SELECT $1::jsonb document) q`,
          [source, key, index],
        )
      ).rows[0]!
      const { source: normalized, ...expected } = row
      const value = runtime.makeJsonbValue(normalized),
        before = JSON.stringify(value)
      const inputs = { ...expected, field_name: key, element_index: index }
      expect(
        Object.values(evaluateReads(value, inputs)).every((r) => r.certain && r.value === true),
        source,
      ).toBe(true)
      expect(JSON.stringify(value)).toBe(before)
      await pg.query(
        'INSERT INTO jsonb_read_inputs VALUES($1::jsonb,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)',
        [
          source,
          key,
          index,
          row.expected_json,
          row.expected_text,
          row.expected_element_json,
          row.expected_element_text,
          row.expected_count,
          row.expected_exists,
          row.check_count,
        ],
      )
      expect(evaluateReads(value, { ...inputs, expected_text: 'wrong' }).field_text).toEqual({
        certain: true,
        value: false,
      })
      expect(
        evaluateReads(value, { ...inputs, expected_exists: !row.expected_exists }).key_exists,
      ).toEqual({ certain: true, value: false })
    }
    expect(evaluateReads(runtime.makeJsonbValue('{}')).array_length).toEqual({
      certain: true,
      error: '22023',
    })
    const uncertainSubtree = runtime.makeJsonbValue('{"a":{"aa":1,"é":2},"plain":"known"}')
    expect(evaluateReads(uncertainSubtree).field_source).toEqual({ certain: false })
    expect(
      evaluateReads(uncertainSubtree, { field_name: 'plain', expected_text: 'known' }).field_text,
    ).toEqual({ certain: true, value: true })
    const evaluateText = (
      source_text: unknown,
      expected_source: unknown = '{}',
      bypass = false,
    ): Result =>
      generated.evaluatePublicJsonbTextInputsChecks({ source_text, expected_source, bypass })[0]
        .result
    for (const input of jsonbInputForms) {
      const source = (await pg.query<{ source: string }>('SELECT $1::jsonb::text source', [input]))
        .rows[0]!.source
      expect(evaluateText(input, source), input).toEqual({ certain: true, value: true })
      await pg.query('INSERT INTO jsonb_text_inputs VALUES($1,$2,false)', [input, source])
    }
    for (const input of invalidJsonbInputForms) {
      const state = await pg.query('SELECT $1::jsonb', [input]).then(
        () => {
          throw new Error('Invalid JSONB accepted')
        },
        (e: { code: string }) => e.code,
      )
      expect(evaluateText(input), input).toEqual({ certain: true, error: state })
      expect(evaluateText(input, '{}', true), input).toEqual({ certain: true, value: true })
      await expect(
        pg.query('INSERT INTO jsonb_text_inputs VALUES($1,$2,false)', [input, '{}']),
      ).rejects.toMatchObject({ code: state })
      await pg.query('INSERT INTO jsonb_text_inputs VALUES($1,$2,true)', [input, '{}'])
    }
    for (const input of deferredJsonbEncodingForms)
      expect(evaluateText(input), input).toEqual({ certain: false })
    expect(evaluateText('{}', '[]')).toEqual({ certain: true, value: false })
    expect(evaluateText(null)).toEqual({ certain: true, value: null })
    for (const input of ['"a\0b"', '"\ud800"', undefined, 123, {}])
      expect(evaluateText(input)).toEqual({ certain: false })
    const evaluate = (
      document: unknown,
      expected_kind = 'object',
      expected_source = '{"a": 2}',
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonbPayloadsChecks({ document, expected_kind, expected_source, bypass })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const input of [
      'null',
      'true',
      '-0.00',
      '9007199254740993.00',
      '1.230e-5',
      '"雪😊"',
      '"\\u00e9"',
      '[]',
      '[null,1,"x"]',
      '{"a":1,"a":2}',
      '{"雪":"😊"}',
      '{"a":{"雪":1},"a":2}',
    ]) {
      const row = (
        await pg.query<{ source: string; kind: string }>(
          'SELECT value::text source,jsonb_typeof(value) kind FROM (SELECT $1::jsonb value) q',
          [input],
        )
      ).rows[0]!
      const value = runtime.makeJsonbValue(row.source)
      const results = evaluate(value, row.kind, row.source)
      expect(
        Object.values(results).every((c) => c.certain && c.value === true),
        input,
      ).toBe(true)
      await pg.query('INSERT INTO jsonb_payloads VALUES($1::jsonb,$2,$3,false)', [
        input,
        row.kind,
        row.source,
      ])
      expect(evaluate(value, 'wrong', row.source).shape, input).toEqual({
        certain: true,
        value: false,
      })
      await expect(
        pg.query('INSERT INTO jsonb_payloads VALUES($1::jsonb,$2,$3,false)', [
          input,
          'wrong',
          row.source,
        ]),
      ).rejects.toMatchObject({ code: '23514' })
    }
    const ambiguity = runtime.makeJsonbValue('{"aa":1,"é":2}')
    expect(evaluate(ambiguity).shape).toEqual({ certain: true, value: true })
    expect(evaluate(ambiguity).source).toEqual({ certain: false })
    expect(evaluate(ambiguity).present).toEqual({ certain: true, value: true })
    const bad: unknown[] = [
      undefined,
      '{"a":2}',
      2,
      [],
      {},
      { kind: 'Value' },
      { kind: 'Value', value: {} },
      { kind: 'Error' },
      { kind: 'Error', value: { state: NaN } },
    ]
    const mutations: ((value: ReturnType<typeof runtime.makeJsonbValue>) => void)[] = [
      (v) => {
        v.value.root = 0
      },
      (v) => {
        v.value.root = 999
      },
      (v) => {
        v.value.root = -1
      },
      (v) => {
        v.value.root = 1.5
      },
      (v) => {
        v.value.nodes[1].kind = 7
      },
      (v) => {
        v.value.nodes[1].child = 1
      },
      (v) => {
        v.value.nodes[1].child = 999
      },
      (v) => {
        v.value.nodes[2].next = 2
      },
      (v) => {
        v.value.nodes[2].next = 999
      },
      (v) => {
        v.value.nodes[2].child = 1
      },
      (v) => {
        v.value.nodes[2].textEnd = 999
      },
      (v) => {
        v.value.nodes[2].textStart = v.value.nodes[2].textEnd + 1
      },
      (v) => {
        v.value.nodes[2].keyStart = -1
      },
      (v) => {
        v.value.characters[v.value.nodes[2].keyStart] = '\0'
      },
      (v) => {
        v.value.characters[v.value.nodes[2].textStart] = '\0'
      },
      (v) => {
        v.value.characters[0] = '\ud800'
      },
    ]
    for (const mutate of mutations) {
      const value = structuredClone(runtime.makeJsonbValue('{"a":"x"}'))
      mutate(value)
      bad.push(value)
    }
    for (const text of ['NaN', '1e999999', '{"a":1}', 'null', '1,2']) {
      const value = structuredClone(runtime.makeJsonbValue('1'))
      value.value.characters = Array.from(text)
      value.value.nodes[1].textStart = 0
      value.value.nodes[1].textEnd = Array.from(text).length
      bad.push(value)
    }
    for (const value of bad) {
      const results = evaluate(value)
      for (const name of ['shape', 'source', 'present', 'guarded'])
        expect(results[name], name + ':' + JSON.stringify(value)).toEqual({ certain: false })
      expect(evaluate(value, 'object', '{"a": 2}', true).guarded).toEqual({
        certain: true,
        value: true,
      })
      expect(Object.values(evaluateReads(value)).every((r) => r.certain === false)).toBe(true)
      expect(
        Object.values(evaluateReads(value, {}, true)).every((r) => r.certain && r.value === true),
      ).toBe(true)
    }
    expect(evaluate(null).present).toEqual({ certain: true, value: false })
    expect(evaluate(runtime.makeJsonbValue('null'), 'null', 'null').present).toEqual({
      certain: true,
      value: true,
    })
    for (const result of Object.values(
      evaluate({ kind: 'Error', value: { state: parseInt('22003', 36) } }),
    ))
      expect(result).toEqual({ certain: true, error: '22003' })
    const first = runtime.makeJsonbValue('{"a":1,"a":2}'),
      before = JSON.stringify(first)
    expect(evaluate(first).source).toEqual({ certain: true, value: true })
    expect(JSON.stringify(first)).toBe(before)
    const reordered = structuredClone(runtime.makeJsonbValue('{"a":2,"b":3}'))
    const firstNode = reordered.value.nodes[1].child,
      secondNode = reordered.value.nodes[firstNode].next
    reordered.value.nodes[1].child = secondNode
    reordered.value.nodes[secondNode].next = firstNode
    reordered.value.nodes[firstNode].next = 0
    expect(evaluate(reordered, 'object', '{"a": 2, "b": 3}').source).toEqual({
      certain: true,
      value: true,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)
