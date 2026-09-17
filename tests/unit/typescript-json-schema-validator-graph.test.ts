import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import {
  renderTypescriptJsonSchemaArtifacts,
  renderTypescriptJsonSchemaRuntimeArtifacts,
} from '../../src/codegen/typescript/jsonschemas.js'

type Result = { valid: boolean; issues: { path: readonly (string | number)[]; keyword: string }[] }
type Validator = { is(value: unknown): boolean; validate(value: unknown): Result }
const fixture = new URL('../fixtures/codegen/validator-graph/', import.meta.url)
const document = JSON.parse(
  await readFile(new URL('schema.json', fixture), 'utf8'),
) as JsonSchemaDocument
const cases = JSON.parse(await readFile(new URL('cases.json', fixture), 'utf8')) as {
  valid: unknown[]
  invalid: { value: unknown; issues: { path: (string | number)[]; keyword: string }[] }[]
}
const config = parseConfigString(
  `schema: schema.sql\ntypes: {jsonSchemas: {Graph: {schema: ${JSON.stringify(document)}}}}\nsql: {codegen: {typescript: {mappings: {column: {public.events.payload: {jsonSchema: Graph}}}}}}`,
)
const schemas = { Graph: document }
const artifacts = renderTypescriptJsonSchemaRuntimeArtifacts(config, schemas, '/types', '/runtime')
const source = artifacts.find((artifact) => artifact.path === '/runtime/Graph.ts')!.content
const helpers = artifacts.find(
  (artifact) => artifact.path === '/runtime/pgsid/json-schema.ts',
)!.content
const evaluate = (
  source: string,
  dependencies: Record<string, unknown>,
  regexp: typeof RegExp = RegExp,
) => {
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} as Record<string, unknown> }
  Function(
    'require',
    'module',
    'exports',
    'RegExp',
    output,
  )(
    (path: string) => {
      if (!(path in dependencies)) throw new Error(`Unexpected dependency ${path}`)
      return dependencies[path]
    },
    module,
    module.exports,
    regexp,
  )
  return module.exports
}
const load = (regexp?: typeof RegExp) =>
  evaluate(source, { './pgsid/json-schema.js': evaluate(helpers, {}) }, regexp)

describe('shared TypeScript JSON Schema validators', () => {
  it('validates fixture payloads and preserves diagnostic paths and keywords', () => {
    const module = load()
    const validators = module['schemaValidators'] as Record<string, Validator>
    const is = module['isGraph'] as Validator['is']
    const validate = module['validateGraph'] as Validator['validate']
    for (const value of cases.valid) {
      expect(is(value)).toBe(true)
      expect(validate(value)).toEqual({ valid: true, issues: [] })
      expect(validators['']!.validate(value)).toEqual({ valid: true, issues: [] })
    }
    for (const { value, issues } of cases.invalid) {
      expect(is(value)).toBe(false)
      expect(validate(value)).toMatchObject({
        valid: false,
        issues: expect.arrayContaining(issues.map((issue) => expect.objectContaining(issue))),
      })
    }
    const scalar = validators['/$defs/Actor/properties/id']!
    expect(scalar.is(1)).toBe(true)
    expect(scalar.validate(0)).toMatchObject({
      valid: false,
      issues: [{ path: [], keyword: 'minimum' }],
    })
    expect(validators['/properties/a~1b~0#?% 空']!.is(2)).toBe(false)
    expect(validators['/properties/allowed']!.is(undefined)).toBe(true)
    expect(validators['/properties/forbidden']!.validate(null)).toMatchObject({
      valid: false,
      issues: [{ path: [], keyword: 'falseSchema' }],
    })
  })

  it('initializes each static pattern once and reuses it across guards and calls', () => {
    let constructions = 0
    const regexp = new Proxy(RegExp, {
      construct(target, args) {
        constructions++
        return Reflect.construct(target, args)
      },
    })
    const module = load(regexp)
    expect(constructions).toBe(1)
    const is = module['isGraph'] as Validator['is']
    const validate = module['validateGraph'] as Validator['validate']
    for (let index = 0; index < 10; index++) {
      const value = { actor: { id: 1, nickname: 'aaa' }, tags: [], token: 'aaa', sameToken: 'aaa' }
      expect(is(value)).toBe(true)
      expect(validate(value).valid).toBe(true)
    }
    expect(constructions).toBe(1)
  })

  it('isolates cycles, reentrant calls, and diagnostic results between invocations', () => {
    const module = load()
    const is = module['isGraph'] as Validator['is']
    const validate = module['validateGraph'] as Validator['validate']
    const actor = { id: 1 }
    const repeated = { actor, backup: actor, tags: [] }
    expect(is(repeated)).toBe(true)
    const cyclic: Record<string, unknown> = { actor, tags: [] }
    cyclic['next'] = cyclic
    expect(is(cyclic)).toBe(false)
    expect(validate(cyclic)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([expect.objectContaining({ keyword: '$ref' })]),
    })
    const invalid = validate({ actor: { id: 0 }, tags: [] })
    const snapshot = structuredClone(invalid)
    let nested: Result | undefined
    const reentrant = {
      get actor() {
        nested = validate({ actor: { id: 0 }, tags: [] })
        return actor
      },
      tags: [],
    }
    expect(validate(reentrant)).toEqual({ valid: true, issues: [] })
    expect(nested?.valid).toBe(false)
    expect(invalid).toEqual(snapshot)
    expect(validate(repeated)).toEqual({ valid: true, issues: [] })
  })

  it('compiles the generated modules with strict and unused-symbol checks', () => {
    const sources = new Map(
      [...artifacts, ...renderTypescriptJsonSchemaArtifacts(config, schemas, '/types')].map(
        (artifact) => [artifact.path, artifact.content],
      ),
    )
    const options = {
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    }
    const host = ts.createCompilerHost(options)
    const readFile = host.readFile.bind(host)
    const fileExists = host.fileExists.bind(host)
    host.readFile = (path) => sources.get(path) ?? readFile(path)
    host.fileExists = (path) => sources.has(path) || fileExists(path)
    host.directoryExists = (path) =>
      path === '/runtime' ||
      path === '/runtime/pgsid' ||
      path === '/types' ||
      ts.sys.directoryExists(path)
    host.getSourceFile = (path, version) => {
      const source = host.readFile(path)
      return source === undefined ? undefined : ts.createSourceFile(path, source, version, true)
    }
    const program = ts.createProgram([...sources.keys()], options, host)
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((issue) => ts.flattenDiagnosticMessageText(issue.messageText, '\n')),
    ).toEqual([])
  })
})
