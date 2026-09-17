import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildProject } from '../../src/project-runtime.js'

const fixture = fileURLToPath(new URL('../fixtures/codegen/inputs/project', import.meta.url))
const load = (url: string): Promise<Record<string, unknown>> => import(url)
type Executor = (
  db: { query: (...args: unknown[]) => Promise<unknown> },
  params: unknown,
) => Promise<unknown>

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map(async (entry) =>
        entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)],
      ),
    )
  ).flat()
}

describe('generated TypeScript JSON write validation', () => {
  let root: string
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'pgsid-json-inputs-'))
    await cp(fixture, root, { recursive: true, filter: (path) => !path.includes('/generated') })
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    for (const path of await files(join(root, 'generated/typescript/runtime'))) {
      if (!path.endsWith('.ts')) continue
      const output = ts.transpileModule(await readFile(path, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      })
      await writeFile(path.replace(/\.ts$/u, '.js'), output.outputText)
    }
  }, 20_000)
  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })
  const execute = async (
    name: string,
    params: unknown,
    query: (...args: unknown[]) => Promise<unknown>,
  ) => {
    const module = await load(
      pathToFileURL(join(root, `generated/typescript/runtime/queries/items/${name}.js`)).href,
    )
    const functionName = `${name[0]!.toLowerCase()}${name.slice(1)}`
    return (module[functionName] as Executor)({ query }, params)
  }
  it.each([
    'InsertPayload',
    'UpdatePayload',
    'ReturningPayload',
    'ReturningMany',
    'InsertFromCte',
    'WriteInCte',
    'CastJSON',
    'MergePayload',
  ])('rejects invalid %s inputs before execution', async (name) => {
    let calls = 0
    await expect(
      execute(name, { payload: { actor: 0 }, id: 1 }, async () => {
        calls++
        return { rows: [], rowCount: 0 }
      }),
    ).rejects.toMatchObject({
      query: name,
      column: 'payload',
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ['actor'], keyword: 'minimum' }),
      ]),
    })
    expect(calls).toBe(0)
  })
  it.each(['InsertMany', 'Upsert', 'TupleUpdate'])('checks all %s write bindings', async (name) => {
    let calls = 0
    const invalid =
      name === 'TupleUpdate'
        ? { first: { actor: 0 }, second: { actor: 1 } }
        : { first: { actor: 1 }, second: { actor: 0 } }
    await expect(
      execute(name, { ...invalid, id: 1 }, async () => {
        calls++
        return { rows: [] }
      }),
    ).rejects.toHaveProperty('issues')
    expect(calls).toBe(0)
  })
  it('serializes valid recursive input, preserves parameter order, and leaves the input untouched', async () => {
    const params = { payload: { actor: 2, next: { actor: 3 } }, id: 7 }
    const before = structuredClone(params)
    const calls: unknown[][] = []
    const result = await execute('UpdatePayload', params, async (...args) => {
      calls.push(args)
      return { rows: [], rowCount: 4 }
    })
    expect(result).toBe(4)
    expect(calls[0]?.[1]).toEqual([JSON.stringify(params.payload), 7])
    expect(params).toEqual(before)
  })
  it('distinguishes SQL null and JSON null and serializes JSON arrays', async () => {
    const values: unknown[] = []
    const query = async (_sql: unknown, args: unknown) => {
      values.push(args)
      return { rows: [] }
    }
    await execute('InsertMaybe', { payload: null }, query)
    await execute('InsertJSONNull', { payload: null }, query)
    await execute('InsertArray', { payload: [1, 2] }, query)
    expect(values).toEqual([[null], ['null'], ['[1,2]']])
    await expect(execute('InsertArray', { payload: [0] }, query)).rejects.toHaveProperty('issues')
    await expect(
      execute('InsertArray', { payload: { toJSON: () => null } }, query),
    ).rejects.toMatchObject({
      column: 'payload',
      issues: expect.arrayContaining([expect.objectContaining({ keyword: 'type' })]),
    })
  })
  it('checks the encoded document and calls a custom serializer once', async () => {
    let calls = 0
    let encodings = 0
    const query = async () => {
      calls++
      return { rows: [] }
    }
    const payload = {
      actor: 2,
      toJSON() {
        encodings++
        return { actor: 0 }
      },
    }
    await expect(execute('InsertPayload', { payload }, query)).rejects.toMatchObject({
      column: 'payload',
      issues: expect.arrayContaining([expect.objectContaining({ keyword: 'minimum' })]),
    })
    expect(calls).toBe(0)
    expect(encodings).toBe(1)
    await expect(execute('InsertPayload', { payload: undefined }, query)).rejects.toMatchObject({
      column: 'payload',
      issues: expect.arrayContaining([expect.objectContaining({ keyword: 'json' })]),
    })
  })
  it('keeps column opt-out and checks every schema bound to a shared parameter', async () => {
    let calls = 0
    const query = async () => {
      calls++
      return { rows: [] }
    }
    await execute('InsertUnchecked', { payload: { actor: 0 } }, query)
    for (const payload of [{ actor: 0, label: 'ok' }, { actor: 11, label: 'ok' }, { actor: 2 }])
      await expect(execute('MultipleSchemas', { payload }, query)).rejects.toHaveProperty('issues')
    expect(calls).toBe(1)
    await execute('MultipleSchemas', { payload: { actor: 2, label: 'ok' } }, query)
    expect(calls).toBe(2)
  })
  it('exposes standalone predicates and detailed validators without a database client', async () => {
    const module = await load(
      pathToFileURL(join(root, 'generated/typescript/runtime/jsonschemas/index.js')).href,
    )
    const isEvent = module['isEvent'] as (value: unknown) => boolean
    const validateEvent = module['validateEvent'] as (value: unknown) => {
      valid: boolean
      issues: unknown[]
    }
    expect(isEvent({ actor: 1, next: { actor: 2 } })).toBe(true)
    expect(validateEvent({ actor: 1, next: { actor: 0 } })).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([expect.objectContaining({ path: ['next', 'actor'] })]),
    })
  })
  it('reuses scalar checks across direct projections, CTEs, and query choices', async () => {
    const module = await load(
      pathToFileURL(join(root, 'generated/typescript/runtime/jsonschemas/index.js')).href,
    )
    const registry = module['jsonSchemaValidators'] as Record<
      string,
      Record<string, { is(value: unknown): boolean }>
    >
    const actor = registry['Event']!['/properties/actor']!
    const guard = vi.spyOn(actor, 'is')
    try {
      for (const name of ['SelectActor', 'SelectActorFromCte', 'SelectActorChoice'])
        await expect(
          execute(name, { id: 1 }, async () => ({ rows: [{ actor: 2 }] })),
        ).resolves.toEqual({ actor: 2 })
      expect(guard).toHaveBeenCalledTimes(3)
      for (const name of ['SelectActor', 'SelectActorFromCte'])
        await expect(
          execute(name, { id: 1 }, async () => ({ rows: [{ actor: 0 }] })),
        ).rejects.toMatchObject({
          query: name,
          column: 'actor',
          issues: [expect.objectContaining({ path: [], keyword: 'minimum' })],
        })
    } finally {
      guard.mockRestore()
    }
    await expect(
      execute('SelectActorChoice', { id: 1 }, async () => ({ rows: [{ actor: false }] })),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining([expect.objectContaining({ keyword: 'anyOf' })]),
    })
    await expect(
      execute('SelectActorChoice', { id: 1 }, async () => ({ rows: [{ actor: 0 }] })),
    ).resolves.toEqual({ actor: 0 })
    const choice = await load(
      pathToFileURL(join(root, 'generated/typescript/runtime/queries/items/SelectActorChoice.js'))
        .href,
    )
    expect((choice['validateSelectActorChoiceActor'] as (value: unknown) => unknown)(0)).toEqual({
      valid: true,
      issues: [],
    })
  })
  it('types write parameters with named schemas, including repeated-parameter intersections', async () => {
    const usage = join(root, 'usage.ts')
    await writeFile(
      usage,
      `
import type {InsertPayloadParams} from './generated/typescript/types/queries/items/InsertPayload.js';
import type {MultipleSchemasParams} from './generated/typescript/types/queries/items/MultipleSchemas.js';
import type {Event} from './generated/typescript/types/jsonschemas/Event.js';
const good: InsertPayloadParams = {payload: {actor: 2, next: {actor: 3}}};
const value: Event = good.payload;
// @ts-expect-error Invalid JSON field types are rejected.
const wrong: InsertPayloadParams = {payload: {actor: 'bad'}};
// @ts-expect-error Shared parameters must satisfy all destination schemas.
const missing: MultipleSchemasParams = {payload: {actor: 2}};
const both: MultipleSchemasParams = {payload: {actor: 2, label: 'ok'}};
void [value, wrong, missing, both];
`,
    )
    const sources = (await files(join(root, 'generated/typescript'))).filter((path) =>
      path.endsWith('.ts'),
    )
    const program = ts.createProgram([...sources, usage], {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    })
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
    ).toEqual([])
  })
  it('reports unsupported write transformations and retains their driver input types', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'pgsid-json-unsupported-'))
    try {
      await cp(fixture, scratch, {
        recursive: true,
        filter: (path) => !path.includes('/generated'),
      })
      await writeFile(
        join(scratch, 'queries/unsupported.sql'),
        `
-- name: Fragment :exec
UPDATE items SET payload = jsonb_set(payload, '{actor}', to_jsonb(@actor::integer));
-- name: TextCast :exec
UPDATE items SET payload = @payload::text::jsonb;
-- name: Subscript :exec
UPDATE items SET payload['actor'] = @payload::jsonb;
-- name: Conditional :exec
UPDATE items SET payload = COALESCE(@payload, payload);
`,
      )
      const update = await buildProject({ baseDirectory: scratch })
      expect(update.state.diagnostics).toHaveLength(8)
      expect(
        update.state.diagnostics.every(
          (item) =>
            item.source === 'codegen' &&
            item.diagnostic.code === 'json-schema-input-unsupported' &&
            item.diagnostic.severity === 'warning',
        ),
      ).toBe(true)
      const types = await readFile(
        join(scratch, 'generated/typescript/types/queries/unsupported/TextCast.d.ts'),
        'utf8',
      )
      expect(types).toContain('"payload": string')
      const runtime = await readFile(
        join(scratch, 'generated/typescript/runtime/queries/unsupported/TextCast.ts'),
        'utf8',
      )
      expect(runtime).not.toContain('validateTextCastParams')
      expect(runtime).not.toContain('JSON.stringify')
    } finally {
      await rm(scratch, { recursive: true, force: true })
    }
  })
})
