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
import { jsonInputForms, invalidJsonInputForms } from './check-json-input-forms.js'

it('validates lossless SQL-coerced JSON wrappers through the public TypeScript API and compares real INSERT outcomes', async () => {
  const pg = await PGlite.create()
  const root = await mkdtemp(join(tmpdir(), 'pgsid-json-payload-'))
  try {
    await pg.exec(`CREATE DOMAIN document_value AS json;CREATE DOMAIN nested_document AS document_value;
      CREATE TABLE json_payloads(document nested_document,expected_kind text COLLATE "C",expected_source text COLLATE "C",
      CONSTRAINT shape CHECK(json_typeof(document) COLLATE "C"=expected_kind),
      CONSTRAINT source CHECK(document::text COLLATE "C"=expected_source),
      CONSTRAINT present CHECK(document IS NOT NULL));
      CREATE TABLE json_text_inputs(source_text text,expected_source text,bypass boolean,
      CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::nested_document::text COLLATE "C"=expected_source COLLATE "C" END));
      CREATE TABLE json_extraction_inputs(document nested_document,field_name text,element_index integer,expected_source text,expected_text text,expected_length integer,bypass boolean,
      CONSTRAINT field_source CHECK(CASE WHEN bypass THEN true ELSE (document->field_name)::text COLLATE "C" IS NOT DISTINCT FROM expected_source COLLATE "C" END),
      CONSTRAINT field_text CHECK(CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
      CONSTRAINT element_source CHECK((document->element_index)::text COLLATE "C" IS NOT DISTINCT FROM expected_source COLLATE "C"),
      CONSTRAINT array_length CHECK(json_array_length(document) IS NOT DISTINCT FROM expected_length))`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'json_payloads')!
    const textTable = catalog.tables.find((t) => t.name === 'json_text_inputs')!
    const extractionTable = catalog.tables.find((t) => t.name === 'json_extraction_inputs')!
    const bundle = renderTypescriptSchemaCheckArtifacts(
      [table, textTable, extractionTable],
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
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr, { cause: e })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(
      pathToFileURL(join(root, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluateExtraction = (
      source: string,
      field_name: string | null,
      element_index: number | null,
      expected_source: string | null,
      expected_text: string | null,
      expected_length: number | null,
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonExtractionInputsChecks({
            document: runtime.makeJsonValue(source),
            field_name,
            element_index,
            expected_source,
            expected_text,
            expected_length,
            bypass,
          })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    expect(evaluateExtraction('{"a":1,"a":2}', 'a', null, '2', '2', null)).toEqual({
      field_source: { certain: true, value: true },
      field_text: { certain: true, value: true },
      element_source: { certain: true, value: false },
      array_length: { certain: true, error: '22023' },
    })
    expect(evaluateExtraction('["x",null]', null, -1, 'null', null, 2)).toEqual({
      field_source: { certain: true, value: false },
      field_text: { certain: true, value: true },
      element_source: { certain: true, value: true },
      array_length: { certain: true, value: true },
    })
    expect(
      evaluateExtraction('{"a":"\\u0061"}', 'a', null, '"\\u0061"', 'a', null).field_text,
    ).toEqual({ certain: true, value: true })
    expect(
      evaluateExtraction('{"a":1,"z":"\\u00e9"}', 'a', null, '1', '1', null).field_source,
    ).toEqual({ certain: false })
    expect(
      evaluateExtraction('{"a":1,"z":"\\u0000"}', 'a', null, '1', '1', null).field_source,
    ).toEqual({ certain: true, error: '22P05' })
    expect(
      evaluateExtraction('{"a":1,"z":"\\ud800"}', 'a', null, '1', '1', null).field_source,
    ).toEqual({ certain: true, error: '22P02' })
    expect(
      evaluateExtraction('{"a":1,"z":"\\u0000"}', 'a', null, '1', '1', null, true).field_source,
    ).toEqual({ certain: true, value: true })
    const evaluateText = (
      source_text: unknown,
      expected_source: unknown = source_text,
      bypass = false,
    ): Result =>
      generated.evaluatePublicJsonTextInputsChecks({ source_text, expected_source, bypass })[0]
        .result
    for (const source of jsonInputForms)
      expect(evaluateText(source)).toEqual({ certain: true, value: true })
    for (const source of invalidJsonInputForms) {
      expect(evaluateText(source)).toEqual({ certain: true, error: '22P02' })
      expect(evaluateText(source, source, true)).toEqual({ certain: true, value: true })
    }
    expect(evaluateText('{}', '[]')).toEqual({ certain: true, value: false })
    expect(evaluateText(null)).toEqual({ certain: true, value: null })
    for (const source of ['"a\0b"', '"\ud800"', undefined, 123, {}])
      expect(evaluateText(source)).toEqual({ certain: false })
    const evaluate = (
      document: unknown,
      expected_kind: unknown = 'object',
      expected_source: unknown = '{}',
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonPayloadsChecks({ document, expected_kind, expected_source })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const source of [
      'null',
      'false',
      '-0.00',
      '9007199254740993.00',
      '1e2147483647',
      '"\\u0000"',
      '"\\ud800"',
      '"雪😊"',
      '[]',
      '[1, null]',
      '{"a":1,"a":2}',
      ' \n {"list": [1, 2]} \t ',
    ]) {
      const oracle = (
        await pg.query<{ kind: string; source: string }>(
          'SELECT json_typeof($1::json) AS kind,($1::json)::text AS source',
          [source],
        )
      ).rows[0]!
      const value = runtime.makeJsonValue(source)
      const expected = {
        shape: { certain: true, value: true },
        source: { certain: true, value: true },
        present: { certain: true, value: true },
      }
      expect(evaluate(value, oracle.kind, oracle.source), source).toEqual(expected)
      await pg.query('INSERT INTO json_payloads VALUES($1,$2,$3)', [
        source,
        oracle.kind,
        oracle.source,
      ])
      expect(evaluate(value, 'wrong', oracle.source).shape).toEqual({ certain: true, value: false })
      await expect(
        pg.query('INSERT INTO json_payloads VALUES($1,$2,$3)', [source, 'wrong', oracle.source]),
      ).rejects.toMatchObject({ code: '23514' })
    }
    expect(evaluate({ kind: 'Value', value: { source: '{}', kind: 3, depth: 10000 } })).toEqual({
      shape: { certain: true, value: true },
      source: { certain: true, value: true },
      present: { certain: true, value: true },
    })
    for (const document of [
      undefined,
      '{}',
      123,
      {},
      [],
      { a: 1 },
      { kind: 'Unknown' },
      { kind: 'Value' },
      { kind: 'Value', value: null },
      { kind: 'Value', value: { source: 123 } },
      ...['NaN', '[1,]', '"a\0b"', '"\ud800"', '"\udc00"'].map((source) => ({
        kind: 'Value',
        value: { source },
      })),
    ])
      expect(Object.values(evaluate(document))).toEqual(
        Array.from({ length: 3 }, () => ({ certain: false })),
      )
    for (const document of [null, { kind: 'Null' }])
      expect(evaluate(document)).toEqual({
        shape: { certain: true, value: null },
        source: { certain: true, value: null },
        present: { certain: true, value: false },
      })
    const sqlError = { kind: 'Error', value: runtime.makeSqlError(parseInt('22003', 36)) }
    expect(Object.values(evaluate(sqlError))).toEqual(
      Array.from({ length: 3 }, () => ({ certain: true, error: '22003' })),
    )
    await expect(
      pg.query('INSERT INTO json_payloads VALUES(NULL,NULL,NULL)'),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(
      pg.query('INSERT INTO json_payloads VALUES($1,NULL,NULL)', ['[1,]']),
    ).rejects.toMatchObject({ code: '22P02' })
    await expect(
      pg.query('INSERT INTO json_payloads VALUES($1,NULL,NULL)', ['"a\0b"']),
    ).rejects.toMatchObject({ code: '22021' })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 180000)
