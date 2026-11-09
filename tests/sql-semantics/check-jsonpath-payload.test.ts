import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import { internalCheckRows } from '../support/check-entries.js'
import { serverCheckResults } from '../support/check-server-results.js'

it('checks public JSONPath graph boundaries and preserves valid coerced values in Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const root = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-payload-'))
  const run = promisify(execFile)
  try {
    await pg.exec(`CREATE DOMAIN retained_path AS jsonpath;
      CREATE TABLE path_payloads(path retained_path,expected text,bypass boolean,
      CONSTRAINT source CHECK(path::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"),
      CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE path::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END),
      CONSTRAINT present CHECK(path IS NOT NULL))`)
    const catalog = await snapshotCatalog(pg)
    // Reading non-ASCII text and regular expressions depends on the server encoding.
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      {
        executionContext: { defaultCollation: 'C', serverEncoding: 'UTF8' },
      },
    )
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(root, 'schema'),
      'pathpayload/schema',
    )
    expect(go.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    for (const artifact of go.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
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
    ]).catch((failure: { stdout: string; stderr: string }) => {
      throw new Error(failure.stdout + failure.stderr, { cause: failure })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    const operations = await import(
      pathToFileURL(join(root, 'js/checks-rust/pg_catalog/operations.js')).href
    )
    const build = (source: string) =>
      operations.jsonpathFromCoercedSourceUtf8(runtime.makeTextValue(source))
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    // A public jsonpath value is the server's text, read through its input function.
    const evaluate = (path: unknown, expected: string | null = '$."a"', bypass = false) =>
      generated.evaluatePublicPathPayloadsChecks({ path, expected, bypass }) as {
        constraint: string
        result: Result
      }[]
    const results = (path: unknown, expected: string | null = '$."a"', bypass = false) =>
      Object.fromEntries(evaluate(path, expected, bypass).map((c) => [c.constraint, c.result]))
    const server = (path: string | null, expected: string | null = '$."a"', bypass = false) =>
      serverCheckResults(pg, 'path_payloads', { path, expected, bypass: String(bypass) })
    // The evaluator entries read the path as text, so a failed read is the one state they take
    // that no public value expresses.
    const stored = (path: unknown, expected: string | null = '$."a"', bypass = false) =>
      internal('public.path_payloads', {
        path,
        expected: expected === null ? runtime.textNull() : runtime.makeTextValue(expected),
        bypass: runtime.makeBoolValue(bypass),
      }) as Record<string, { kind: string }>
    for (const source of [
      '$.a',
      '$[1 to last, -2]',
      '- -1.2300',
      '"雪😊"',
      '(exists($)).type()',
      '$ like_regex "a"',
    ]) {
      const expected = (
        await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [source])
      ).rows[0]!.output
      for (const check of evaluate(source, expected))
        expect(check.result).toEqual({ certain: true, value: true })
      for (const text of [expected, 'wrong'])
        expect(results(source, text), source).toEqual(await server(source, text))
      const path = build(source)
      expect(path.kind).toBe('Value')
      expect(() => evaluate(path, expected)).toThrow(TypeError)
      // A stored path reaches a query as the text it prints, read back through the input
      // function, which need not accept it.
      const storedText = operations.jsonpathFromStoredText(runtime.makeTextValue(expected))
      expect(storedText.kind).toBe('StoredText')
      expect(() => evaluate(storedText, expected)).toThrow(TypeError)
      expect(results(expected, expected)).toEqual(await server(expected, expected))
      await pg.query('INSERT INTO path_payloads VALUES($1::jsonpath,$2,false)', [source, expected])
      await expect(
        pg.query('INSERT INTO path_payloads VALUES($1::jsonpath,$2,false)', [source, 'wrong']),
      ).rejects.toMatchObject({ code: '23514' })
    }
    for (const source of ['((-$.x).abs()) == 1', '((1+2)[0]) == 3']) {
      const expected = (
        await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [source])
      ).rows[0]!.output
      expect(() =>
        evaluate(operations.jsonpathFromStoredText(runtime.makeTextValue(expected)), expected),
      ).toThrow(TypeError)
      for (const check of evaluate(source, expected))
        expect(check.result).toEqual({ certain: true, value: true })
      for (const path of [source, expected])
        expect(results(path, expected), path).toEqual(await server(path, expected))
    }
    const invalid: unknown[] = [
      undefined,
      '$.a',
      { kind: 'Value' },
      { kind: 'Value', value: {} },
      { kind: 'StoredText', value: '' },
      { kind: 'StoredText', value: 1 },
      { kind: 'StoredText', value: '\0' },
      { kind: 'StoredText', value: '\ud800' },
      { kind: 'Error', value: { state: -1 } },
    ]
    const mutate = (
      change: (payload: {
        root: number
        characters: string[]
        nodes: {
          kind: number
          next: number
          left: number
          right: number
          textStart: number
          textEnd: number
          flags: number
        }[]
        lax: unknown
      }) => void,
      source = '$.a',
    ) => {
      const value = structuredClone(build(source))
      change(value.value)
      invalid.push(value)
    }
    mutate((p) => {
      p.root = -1
    })
    mutate((p) => {
      p.root = p.nodes.length
    })
    mutate((p) => {
      p.nodes = []
    })
    mutate((p) => {
      p.nodes[p.root]!.next = p.root
    })
    mutate((p) => {
      p.nodes[p.root]!.left = p.nodes.length
    })
    mutate((p) => {
      p.nodes[p.root]!.textEnd = p.characters.length + 1
    })
    mutate((p) => {
      p.nodes[p.root]!.kind = 10000
    })
    mutate((p) => {
      p.nodes[p.root]!.flags = 1.5
    })
    mutate((p) => {
      p.nodes[p.root]!.kind = 2
    })
    mutate((p) => {
      p.characters[0] = '\0'
    })
    mutate((p) => {
      p.characters[0] = '\ud800'
    })
    mutate((p) => {
      p.characters[0] = 'ab'
    })
    mutate((p) => {
      p.lax = 'yes'
    })
    mutate((p) => {
      p.nodes[p.root]!.flags = 32
    }, '$ like_regex "a"')
    mutate((p) => {
      p.nodes[p.root]!.flags = 8
    }, '$ like_regex "a"')
    mutate((p) => {
      const number = { ...p.nodes[p.root]! }
      p.nodes.push(number)
      p.nodes[p.root] = { ...number, kind: 20, left: p.nodes.length - 1 }
    }, '1')
    for (const text of ['NaN', '1e2', '01', '-0', '1.', ' 1', '+1'])
      mutate((p) => {
        p.characters = Array.from(text)
        p.nodes[p.root]!.textStart = 0
        p.nodes[p.root]!.textEnd = p.characters.length
      }, '1')
    // Only text is a public jsonpath value: a graph, well formed or not, is malformed, as is
    // text no query can send.
    for (const path of invalid) {
      if (path === undefined) {
        for (const check of evaluate(path)) expect(check.result).toEqual({ certain: false })
      } else if (typeof path === 'string') {
        expect(results(path), path).toEqual(await server(path))
      } else expect(() => evaluate(path), JSON.stringify(path)).toThrow(TypeError)
    }
    for (const path of [
      build('$.a'),
      operations.jsonpathFromStoredText(runtime.makeTextValue('$."a"')),
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
      '\0',
      '\ud800',
      1,
    ])
      expect(() => evaluate(path), JSON.stringify(path)).toThrow(TypeError)
    // Malformed text fails each check reading it with the server's own input error.
    for (const [path, error] of [
      ['', '22P02'],
      ['$.', '42601'],
      ['$ ? (', '42601'],
      ['exists ($).type()', '42601'],
    ]) {
      for (const check of evaluate(path!))
        expect(check.result, path).toEqual({ certain: true, error })
      expect(results(path), path).toEqual(await server(path!))
    }
    for (const outcome of Object.values(
      stored({ kind: 'Error', value: runtime.makeSqlError(parseInt('22012', 36)) }),
    ))
      expect(outcome).toMatchObject({ kind: 'Error', value: { state: parseInt('22012', 36) } })
    expect(stored(runtime.textNull(), null).present).toEqual({ kind: 'False' })
    expect(evaluate(null, null).find((check) => check.constraint === 'present')!.result).toEqual({
      certain: true,
      value: false,
    })
    expect(results(null, null)).toEqual(await server(null, null))
    await writeFile(
      join(root, 'go.mod'),
      (await readFile('tests/fixtures/codegen/project/go.mod', 'utf8')).replace(
        /^module .+$/mu,
        'module pathpayload',
      ),
    )
    await writeFile(
      join(root, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(root, 'schema/public/path_payload_test.go'),
      `package public
import (
 "testing"
 runtime "pathpayload/schema/public/checkrust/checkruntime"
 operations "pathpayload/schema/public/checkrust/pg_catalog"
)
func TestJsonpathPayload(t *testing.T) {
 expected := ${JSON.stringify('$."a"')}; bypass := false
 makeValue := func(source string) runtime.JsonpathValue { return operations.JsonpathFromCoercedSourceUtf8(runtime.MakeTextValue(source)) }
 value := makeValue("$.a")
 input := PublicPathPayloadsCheckInput{Path: KnownCheckValue(value),Expected: KnownCheckValue(&expected),Bypass: KnownCheckValue(&bypass)}
 if err := ValidateCheckInputs(input,EvaluatePublicPathPayloadsChecks); err != nil { t.Fatal(err) }
 stored:=operations.JsonpathFromStoredText(runtime.MakeTextValue(expected));input.Path=KnownCheckValue(stored)
 if err:=ValidateCheckInputs(input,EvaluatePublicPathPayloadsChecks);err!=nil{t.Fatal("stored text lost",err)}

 for _,mutate := range []func(*runtime.JsonpathPayload){
  func(p *runtime.JsonpathPayload){p.Root=-1},func(p *runtime.JsonpathPayload){p.Root=len(p.Nodes)},func(p *runtime.JsonpathPayload){p.Nodes=nil},
  func(p *runtime.JsonpathPayload){p.Nodes[p.Root].Next=p.Root},func(p *runtime.JsonpathPayload){p.Nodes[p.Root].Left=len(p.Nodes)},
  func(p *runtime.JsonpathPayload){p.Nodes[p.Root].TextEnd=len(p.Characters)+1},func(p *runtime.JsonpathPayload){p.Nodes[p.Root].Kind=10000},
  func(p *runtime.JsonpathPayload){p.Nodes[p.Root].Kind=2},func(p *runtime.JsonpathPayload){p.Characters[0]=0},func(p *runtime.JsonpathPayload){p.Characters[0]=0xd800},
 } {
  bad:=makeValue("$.a");mutate(&bad.Value);input.Path=KnownCheckValue(bad)
  for _,check:=range func() []CheckEvaluation {r, e := EvaluatePublicPathPayloadsChecks(input); if e != nil {return nil}; return r}(){if check.Result.Certain{t.Fatal("malformed graph became definite",check)}}
 }
 bad:=makeValue("1");root:=bad.Value.Root;number:=bad.Value.Nodes[root];bad.Value.Nodes=append(bad.Value.Nodes,number);bad.Value.Nodes[root].Kind=runtime.JsonpathNodePlus;bad.Value.Nodes[root].Left=len(bad.Value.Nodes)-1;input.Path=KnownCheckValue(bad)
 for _,check:=range func() []CheckEvaluation {r, e := EvaluatePublicPathPayloadsChecks(input); if e != nil {return nil}; return r}(){if check.Result.Certain{t.Fatal("unfolded numeric node became definite",check)}}
 input.Path=KnownCheckValue(runtime.JsonpathValue{Kind:runtime.JsonpathValueError,Error:runtime.MakeSqlError(${parseInt('22012', 36)})})
 for _,check:=range func() []CheckEvaluation {r, e := EvaluatePublicPathPayloadsChecks(input); if e != nil {panic(e)}; return r}(){if !check.Result.Certain||check.Result.Value.Error!="22012"{t.Fatal("incoming error lost",check)}}
 input.Path=NullCheckValue[runtime.JsonpathValue]();if err:=ValidateCheckInputs(input,EvaluatePublicPathPayloadsChecks);err==nil{t.Fatal("null passed required value")}
}
`,
    )
    await run('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
      (failure: { stdout: string; stderr: string }) => {
        throw new Error(failure.stdout + failure.stderr, { cause: failure })
      },
    )
    await mkdir('artifacts/jsonpath-payload', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-payload/report.json',
      JSON.stringify(
        {
          invalidTypescriptPayloads: invalid.length,
          validTypescriptInputs: 6,
          realInsertPairs: 6,
          storedTextInputs: 8,
          goMalformedPayloads: 11,
          scope:
            'Public Go/TypeScript row graph boundary; SQL coercion remains a database responsibility for raw query parameters',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 180_000)
