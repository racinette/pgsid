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
    CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::retained_document::text COLLATE "C"=expected_source COLLATE "C" END));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_payloads')!
    const textTable = catalog.tables.find((t) => t.name === 'jsonb_text_inputs')!
    const bundle = renderTypescriptSchemaCheckArtifacts([table, textTable], catalog.domains)
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
