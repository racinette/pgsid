import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'
import { buildProject } from '../../src/project-runtime.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('generated TypeScript project', () => {
  it('compiles schema, query, wrapper, validator, and narrowing artifacts together', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-typescript-project-'))
    roots.push(root)
    await Promise.all([
      mkdir(join(root, 'migrations'), { recursive: true }),
      mkdir(join(root, 'queries'), { recursive: true }),
    ])
    await Promise.all([
      writeFile(
        join(root, 'pgsid.yaml'),
        `
          schema: migrations/*.sql
          types:
            jsonSchemas:
              EventPayload:
                schema:
                  type: object
                  required: [actor]
                  properties:
                    actor: { type: integer }
                  additionalProperties: false
          sql:
            paths: [queries/*.sql]
            typecheck: { plpgsql: false }
            codegen:
              typescript:
                mappings:
                  column:
                    public.events.payload: { jsonSchema: EventPayload }
                jsonSchemas:
                  runtimeValidation: true
                schema: { outDir: generated/schema }
                queries:
                  out:
                    queries:
                      types: generated/types
                      wrappers: generated/wrappers
        `,
      ),
      writeFile(
        join(root, 'migrations/001.sql'),
        `
          CREATE TABLE events (
            id integer PRIMARY KEY,
            payload jsonb NOT NULL
          );
          CREATE TABLE actors (
            id integer PRIMARY KEY,
            name text NOT NULL
          );
          CREATE VIEW event_actors AS
            SELECT e.id, e.payload->'actor' AS actor, a.id AS actor_id, a.name AS actor_name
            FROM events e
            LEFT JOIN actors a ON a.id = e.id;
        `,
      ),
      writeFile(
        join(root, 'queries/events.sql'),
        `
          -- name: GetEvent :one
          SELECT e.id, e.payload, a.id AS actor_id, a.name AS actor_name
          FROM events e
          LEFT JOIN actors a ON a.id = e.id
          WHERE e.id = @id;
        `,
      ),
    ])

    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])

    const usage = join(root, 'generated/usage.ts')
    await writeFile(
      usage,
      `
        import type { InferSelect } from './schema/helpers.js'
        import type { EventActors, Events } from './schema/public/tables.js'
        import { getEvent } from './wrappers/events.js'
        import {
          isGetEventPayload2,
          type GetEventParams,
          type GetEventRow,
        } from './types/events.js'

        declare function expectType<T>(value: T): void
        declare const db: Parameters<typeof getEvent>[0]
        declare const row: GetEventRow

        const params = { id: 1 } satisfies GetEventParams
        void getEvent(db, params)
        expectType<{ actor: number }>(row.payload)
        expectType<boolean>(isGetEventPayload2(row.payload))

        if (row.actor_id !== null) {
          expectType<string>(row.actor_name)
        } else {
          expectType<null>(row.actor_name)
        }

        declare const view: InferSelect<EventActors>
        expectType<number>(view.id)
        expectType<number | null>(view.actor)
        if (view.actor_id !== null) {
          expectType<string>(view.actor_name)
        } else {
          expectType<null>(view.actor_name)
        }

        const event: InferSelect<Events> = { id: 1, payload: { actor: 2 } }
        void event
        // @ts-expect-error JSON Schema types reject the wrong property type.
        const invalidEvent: InferSelect<Events> = { id: 1, payload: { actor: 'two' } }
        void invalidEvent
      `,
    )

    const files = await typescriptFiles(join(root, 'generated'))
    const program = ts.createProgram(files, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
    })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(formatDiagnostics(diagnostics)).toBe('')
  })
})

const typescriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory()
        ? typescriptFiles(path)
        : Promise.resolve(entry.name.endsWith('.ts') ? [path] : [])
    }),
  )
  return nested.flat().sort()
}

const formatDiagnostics = (diagnostics: readonly ts.Diagnostic[]): string =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  })
