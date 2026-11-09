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
import { internalCheckRows, storedOrRejected } from '../support/check-entries.js'
import { serverCheckResults } from '../support/check-server-results.js'

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
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(bundle.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    // A public json value is a JSON value, sent as its JSON text; JSON text a JavaScript value does
    // not round-trip (duplicate keys, escapes, spacing, number spellings) is a stored value the
    // evaluator entry takes directly.
    const outcome = (result: Result): unknown =>
      !result.certain
        ? { kind: 'Unknown' }
        : 'error' in result
          ? { kind: 'Error', value: runtime.makeSqlError(parseInt(result.error!, 36)) }
          : { kind: result.value === null ? 'Null' : result.value ? 'True' : 'False' }
    const outcomes = (results: Record<string, Result>) =>
      Object.fromEntries(Object.entries(results).map(([name, result]) => [name, outcome(result)]))
    const evaluateExtraction = (
      document: unknown,
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
            document,
            field_name,
            element_index,
            expected_source,
            expected_text,
            expected_length,
            bypass,
          })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    const storedText = (value: string | null) =>
      value === null ? runtime.textNull() : runtime.makeTextValue(value)
    const storedInt4 = (value: number | null) =>
      value === null ? runtime.int4Null() : runtime.makeInt4Value(value)
    const storedExtraction = (
      source: string,
      field_name: string | null,
      element_index: number | null,
      expected_source: string | null,
      expected_text: string | null,
      expected_length: number | null,
      bypass = false,
    ) =>
      internal('public.json_extraction_inputs', {
        document: runtime.makeJsonValue(source),
        field_name: storedText(field_name),
        element_index: storedInt4(element_index),
        expected_source: storedText(expected_source),
        expected_text: storedText(expected_text),
        expected_length: storedInt4(expected_length),
        bypass: runtime.makeBoolValue(bypass),
      })
    // The same row sent to the server, the document as its JSON text.
    const serverExtraction = (
      source: string,
      ...[field_name, element_index, expected_source, expected_text, expected_length, bypass]: [
        string | null,
        number | null,
        string | null,
        string | null,
        number | null,
        boolean?,
      ]
    ) =>
      serverCheckResults(pg, 'json_extraction_inputs', {
        document: source,
        field_name,
        element_index: element_index === null ? null : String(element_index),
        expected_source,
        expected_text,
        expected_length: expected_length === null ? null : String(expected_length),
        bypass: String(bypass ?? false),
      })
    // Duplicate keys survive only in stored JSON text: the last one is the one extracted.
    expect(storedExtraction('{"a":1,"a":2}', 'a', null, '2', '2', null)).toEqual(
      outcomes({
        field_source: { certain: true, value: true },
        field_text: { certain: true, value: true },
        element_source: { certain: true, value: false },
        array_length: { certain: true, error: '22023' },
      }),
    )
    expect(storedExtraction('{"a":1,"a":2}', 'a', null, '2', '2', null)).toEqual(
      outcomes(await serverExtraction('{"a":1,"a":2}', 'a', null, '2', '2', null)),
    )
    expect(evaluateExtraction({ a: 2 }, 'a', null, '2', '2', null)).toEqual({
      field_source: { certain: true, value: true },
      field_text: { certain: true, value: true },
      element_source: { certain: true, value: false },
      array_length: { certain: true, error: '22023' },
    })
    expect(evaluateExtraction(['x', null], null, -1, 'null', null, 2)).toEqual({
      field_source: { certain: true, value: false },
      field_text: { certain: true, value: true },
      element_source: { certain: true, value: true },
      array_length: { certain: true, value: true },
    })
    for (const [document, ...row] of [
      [{ a: 2 }, 'a', null, '2', '2', null],
      [['x', null], null, -1, 'null', null, 2],
      [{ a: 'a' }, 'a', null, '"a"', 'a', null],
      [{ a: 1, z: '\0' }, 'a', null, '1', '1', null],
      [{ a: 1, z: '\ud800' }, 'a', null, '1', '1', null],
      [{ a: 1, z: '\0' }, 'a', null, '1', '1', null, true],
    ] as [
      unknown,
      string | null,
      number | null,
      string | null,
      string | null,
      number | null,
      boolean?,
    ][])
      expect(evaluateExtraction(document, ...row), JSON.stringify(document)).toEqual(
        await serverExtraction(JSON.stringify(document), ...row),
      )
    // An escape stays in stored JSON text until a field is read as text.
    expect(
      storedExtraction('{"a":"\\u0061"}', 'a', null, '"\\u0061"', 'a', null).field_text,
    ).toEqual({ kind: 'True' })
    expect(evaluateExtraction({ a: 'a' }, 'a', null, '"a"', 'a', null).field_text).toEqual({
      certain: true,
      value: true,
    })
    // Reading a non-ASCII escape depends on the server encoding.
    expect(
      storedExtraction('{"a":1,"z":"\\u00e9"}', 'a', null, '1', '1', null).field_source,
    ).toEqual({ kind: 'Unknown' })
    // A JSON string holding NUL or a lone surrogate is sent escaped, so it reaches the server's
    // own JSON input and fails there.
    expect(evaluateExtraction({ a: 1, z: '\0' }, 'a', null, '1', '1', null).field_source).toEqual({
      certain: true,
      error: '22P05',
    })
    expect(
      evaluateExtraction({ a: 1, z: '\ud800' }, 'a', null, '1', '1', null).field_source,
    ).toEqual({ certain: true, error: '22P02' })
    expect(
      evaluateExtraction({ a: 1, z: '\0' }, 'a', null, '1', '1', null, true).field_source,
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
    expect(evaluateText(undefined)).toEqual({ certain: false })
    for (const source of ['"a\0b"', '"\ud800"', 123, {}])
      expect(() => evaluateText(source)).toThrow(TypeError)
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
    const stored = (
      document: unknown,
      expected_kind: string | null = 'object',
      expected_source: string | null = '{}',
    ) =>
      internal('public.json_payloads', {
        document,
        expected_kind: storedText(expected_kind),
        expected_source: storedText(expected_source),
      })
    const allTrue = {
      shape: { certain: true, value: true },
      source: { certain: true, value: true },
      present: { certain: true, value: true },
    }
    const oracleOf = async (source: string) =>
      (
        await pg.query<{ kind: string; source: string }>(
          'SELECT json_typeof($1::json) AS kind,($1::json)::text AS source',
          [source],
        )
      ).rows[0]!
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
      const oracle = await oracleOf(source)
      const value = runtime.makeJsonValue(source)
      expect(stored(value, oracle.kind, oracle.source), source).toEqual(outcomes(allTrue))
      await pg.query('INSERT INTO json_payloads VALUES($1,$2,$3)', [
        source,
        oracle.kind,
        oracle.source,
      ])
      expect(stored(value, 'wrong', oracle.source).shape).toEqual({ kind: 'False' })
      await expect(
        pg.query('INSERT INTO json_payloads VALUES($1,$2,$3)', [source, 'wrong', oracle.source]),
      ).rejects.toMatchObject({ code: '23514' })
    }
    // Public JSON values, sent as their JSON text: any JavaScript object is a JSON object, even
    // one shaped like an internal value.
    for (const document of [
      false,
      0,
      -0,
      9007199254740993,
      1e308,
      '\0',
      '\ud800',
      '雪😊',
      '{}',
      123,
      {},
      [],
      { a: 1 },
      [1, null],
      { list: [1, 2] },
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Value' },
      { kind: 'Value', value: null },
      { kind: 'Value', value: { source: 123 } },
      { kind: 'Value', value: { source: '{}', kind: 3, depth: 10000 } },
      ...['NaN', '[1,]', '"a\0b"', '"\ud800"', '"\udc00"'].map((source) => ({
        kind: 'Value',
        value: { source },
      })),
    ]) {
      const text = JSON.stringify(document)
      const oracle = await oracleOf(text)
      expect(evaluate(document, oracle.kind, oracle.source), text).toEqual(
        await serverCheckResults(pg, 'json_payloads', {
          document: text,
          expected_kind: oracle.kind,
          expected_source: oracle.source,
        }),
      )
      expect(evaluate(document, 'wrong', oracle.source), text).toEqual(
        await serverCheckResults(pg, 'json_payloads', {
          document: text,
          expected_kind: 'wrong',
          expected_source: oracle.source,
        }),
      )
    }
    expect(evaluate({ a: 1 }, 'object', '{"a":1}')).toEqual(allTrue)
    expect(evaluate({}).source).toEqual({ certain: true, value: true })
    expect(evaluate('{}').shape).toEqual({ certain: true, value: false })
    // No JSON text: a value JSON cannot represent is malformed.
    for (const document of [1n, Symbol('json'), () => 1])
      expect(() => evaluate(document)).toThrow(TypeError)
    // Stored text the JSON input rejects is no value, or one the evaluator leaves undecided.
    for (const source of ['NaN', '[1,]', '"a\0b"', '"\ud800"', '"\udc00"']) {
      const value = storedOrRejected(() => runtime.makeJsonValue(source))
      if (value !== undefined)
        for (const result of Object.values(stored(value)))
          expect(['Unknown', 'Unimplemented'], source).toContain((result as { kind: string }).kind)
    }
    expect(Object.values(stored(runtime.jsonUnknown()))).toEqual(
      Array.from({ length: 3 }, () => ({ kind: 'Unknown' })),
    )
    expect(evaluate(undefined)).toEqual({
      shape: { certain: false },
      source: { certain: false },
      present: { certain: false },
    })
    expect(evaluate(null)).toEqual({
      shape: { certain: true, value: null },
      source: { certain: true, value: null },
      present: { certain: true, value: false },
    })
    expect(evaluate(null)).toEqual(
      await serverCheckResults(pg, 'json_payloads', {
        document: null,
        expected_kind: 'object',
        expected_source: '{}',
      }),
    )
    expect(stored(runtime.jsonNull())).toEqual({
      shape: { kind: 'Null' },
      source: { kind: 'Null' },
      present: { kind: 'False' },
    })
    const sqlError = { kind: 'Error', value: runtime.makeSqlError(parseInt('22003', 36)) }
    expect(Object.values(stored(sqlError))).toEqual(Array.from({ length: 3 }, () => sqlError))
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
