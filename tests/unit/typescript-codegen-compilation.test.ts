import { mkdtemp, mkdir, readdir, rm, writeFile, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { buildProject, ProjectRuntime } from '../../src/project-runtime.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('generated TypeScript project', () => {
  it('compiles schema declarations, query runtime, validators, and narrowing together', async () => {
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
                  runtime: {outDir: generated/validation, validate: true}
                schema: { outDir: generated/schema }
                queries:
                  out:
                    queries:
                      types: generated/types
                      runtime: generated/runtime
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
        import { getEvent, isGetEventPayload } from './runtime/events/GetEvent.js'
        import {
          type GetEventParams,
          type GetEventRow,
        } from './types/events/GetEvent.js'

        declare function expectType<T>(value: T): void
        declare const db: Parameters<typeof getEvent>[0]
        declare const row: GetEventRow

        const params = { id: 1 } satisfies GetEventParams
        void getEvent(db, params)
        expectType<{ actor: number }>(row.payload)
        expectType<boolean>(isGetEventPayload(row.payload))

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
  it('compiles catalog types and recursive JSON schemas with query-only output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-typescript-query-only-'))
    roots.push(root)
    await mkdir(join(root, 'queries'))
    await Promise.all([
      writeFile(
        join(root, 'pgsid.yaml'),
        `
        schema: schema.sql
        types:
          jsonSchemas:
            Document:
              schema:
                type: object
                required: [id]
                properties:
                  id: {type: integer}
                  next: {$ref: '#'}
                additionalProperties: false
        sql:
          paths: [queries/*.sql]
          typecheck: {plpgsql: false}
          codegen:
            typescript:
              mappings:
                pgType:
                  pg_catalog.int8: bigint
                column:
                  public.events.payload: {jsonSchema: Document}
              jsonSchemas: {types: generated/jsonschemas}
              queries:
                out:
                  queries: generated
      `,
      ),
      writeFile(
        join(root, 'schema.sql'),
        `
        CREATE TYPE state AS ENUM ('ready', 'done');
        CREATE DOMAIN event_id AS bigint NOT NULL;
        CREATE DOMAIN child_id AS event_id;
        CREATE TABLE events(id event_id PRIMARY KEY, child child_id, state state NOT NULL, payload jsonb NOT NULL);
      `,
      ),
      writeFile(
        join(root, 'queries/events.sql'),
        `
        -- name: GetEvent :one
        WITH selected AS (SELECT id, child, state, payload FROM events)
        SELECT id, child, state, payload, ARRAY[1, NULL]::int4[] AS numbers FROM selected;
      `,
      ),
    ])
    const update = await buildProject({ baseDirectory: root })
    expect(update.state.diagnostics).toEqual([])
    await writeFile(
      join(root, 'generated/usage.ts'),
      `
      import type {GetEventRow} from './events/GetEvent.js';
      import type {Document} from './jsonschemas/Document.js';
      declare const row: GetEventRow;
      const id: bigint & {readonly __brand: 'public.event_id'} = row.id;
      const child: (bigint & {readonly __brand: 'public.child_id'}) | null = row.child;
      const state: 'ready' | 'done' = row.state;
      const numbers: GetEventRow['numbers'] = [1, null];
      const payload: Document = row.payload;
      const valid: Document = {id: 1, next: {id: 2, next: {id: 3}}};
      // @ts-expect-error Native domains remain branded in query-only output.
      const invalidId: GetEventRow['id'] = 1n;
      // @ts-expect-error Enum values remain constrained in query-only output.
      const invalidState: GetEventRow['state'] = 'missing';
      // @ts-expect-error Nested domain types remain distinct.
      const parent: GetEventRow['id'] = row.child;
      // @ts-expect-error Deep recursive schema values remain constrained.
      const invalidPayload: Document = {id: 1, next: {id: 2, next: {id: 'bad'}}};
    `,
    )
    const program = ts.createProgram(await typescriptFiles(join(root, 'generated')), {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: [],
    })
    expect(formatDiagnostics(ts.getPreEmitDiagnostics(program))).toBe('')
  })
  it('executes separately generated validators and honors checking defaults, overrides, and output removal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-typescript-runtime-layout-'))
    roots.push(root)
    await mkdir(join(root, 'queries'))
    await Promise.all([
      writeFile(join(root, 'package.json'), '{"type":"module"}'),
      writeFile(
        join(root, 'schema.sql'),
        'CREATE TABLE events(id integer PRIMARY KEY, payload jsonb NOT NULL, audit jsonb NOT NULL);',
      ),
      writeFile(
        join(root, 'queries/events.sql'),
        '-- name: GetEvent :one\nSELECT id, payload, audit FROM events;\n-- name: ListEvents :many\nSELECT id, payload, audit FROM events;',
      ),
      writeFile(
        join(root, 'queries/reports.sql'),
        '-- name: GetReport :one\nSELECT id, payload, audit FROM events;',
      ),
    ])
    const configPath = join(root, 'pgsid.yaml')
    const configure = async (automatic: boolean, override: boolean) =>
      writeFile(
        configPath,
        `
      schema: schema.sql
      types:
        jsonSchemas:
          Document:
            schema:
              type: object
              required: [actor]
              properties:
                actor:
                  type: object
                  required: [id]
                  properties:
                    id: {type: integer}
                  additionalProperties: false
                next: {$ref: '#'}
              additionalProperties: false
      sql:
        paths: [queries/*.sql]
        typecheck: {plpgsql: false}
        codegen:
          typescript:
            jsonSchemas:
              types: packages/types/jsonschemas
              runtime: ${automatic ? 'packages/validation' : '{outDir: packages/validation, validate: false}'}
            mappings:
              column:
                public.events.payload: {jsonSchema: Document, runtime: {validate: ${override}}}
                public.events.audit: {jsonSchema: Document}
            queries:
              out:
                queries: {types: packages/types/queries, runtime: backend/queries}
    `,
      )
    await configure(false, false)
    const runtime = new ProjectRuntime({ baseDirectory: root })
    try {
      for (const [automatic, override] of [
        [false, false],
        [true, false],
        [false, true],
      ]) {
        await configure(automatic!, override!)
        const update = await runtime.build()
        expect(update.state.diagnostics).toEqual([])
        const declarations = await typescriptFiles(join(root, 'packages/types'))
        expect(declarations.every((path) => path.endsWith('.d.ts'))).toBe(true)
        const program = ts.createProgram(declarations, {
          strict: true,
          noEmit: true,
          types: [],
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
        })
        expect(formatDiagnostics(ts.getPreEmitDiagnostics(program))).toBe('')
        for (const path of [
          ...(await typescriptFiles(join(root, 'backend'))),
          ...(await typescriptFiles(join(root, 'packages/validation'))),
        ]) {
          const result = ts.transpileModule(await readFile(path, 'utf8'), {
            compilerOptions: {
              module: ts.ModuleKind.ESNext,
              target: ts.ScriptTarget.ES2022,
              verbatimModuleSyntax: true,
            },
          })
          await writeFile(path.replace(/\.ts$/u, '.js'), result.outputText)
        }
        const queryFile = await readFile(join(root, 'backend/queries/events/GetEvent.ts'), 'utf8')
        expect(queryFile).toContain('export const getEventSql')
        expect(queryFile).toContain('import type')
        if (automatic || override) {
          expect(queryFile).toContain('_jsonSchemas.isDocument(value)')
          expect(queryFile).toContain('_jsonSchemas.validateDocument(value)')
        }
        const runtimeFiles = [
          ...declarations,
          ...(await typescriptFiles(join(root, 'backend'))),
          ...(await typescriptFiles(join(root, 'packages/validation'))),
        ]
        const runtimeProgram = ts.createProgram(runtimeFiles, {
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          types: [],
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ES2022,
        })
        expect(formatDiagnostics(ts.getPreEmitDiagnostics(runtimeProgram))).toBe('')
        const script = `
          import assert from 'node:assert/strict';
          import * as query from './backend/queries/events/GetEvent.js';
          import {listEvents} from './backend/queries/events/ListEvents.js';
          import * as reports from './backend/queries/reports/GetReport.js';
          import {QueryValidationError} from './backend/queries/events/pgsid/queryable.js';
          import {QueryValidationError as ReportValidationError} from './backend/queries/reports/pgsid/queryable.js';
          import {isDocument, isDocumentActor, validateDocument, validateDocumentActor} from './packages/validation/Document.js';
          const {getEvent} = query;
          assert.equal(ReportValidationError, QueryValidationError);
          if (${automatic || override}) {
            assert.equal(query.QueryValidationError, QueryValidationError);
            assert.equal(reports.QueryValidationError, QueryValidationError);
          }
          const valid = {actor: {id: 1}, next: {actor: {id: 2}, next: {actor: {id: 3}}}};
          const invalid = {actor: {id: 1}, next: {actor: {id: 2}, next: {actor: {id: 'bad'}}}};
          assert.equal(isDocument(valid), true);
          assert.equal(isDocument(invalid), false);
          assert.equal(isDocumentActor({id: 1}), true);
          assert.equal(isDocumentActor({id: 'bad'}), false);
          assert.deepEqual(validateDocument(valid), {valid: true, issues: []});
          assert.deepEqual(validateDocument(invalid).issues.map(({path, keyword, expected, received}) => ({path, keyword, expected, received})), [{path: ['next', 'next', 'actor', 'id'], keyword: 'type', expected: 'integer', received: 'string'}]);
          assert.equal(validateDocumentActor({id: 'bad'}).valid, false);
          const check = async (payload, audit, rejectedColumn) => {
            const db = {query: async () => ({rows: [{id: 1, payload, audit}], rowCount: 1})};
            if (rejectedColumn) {
              for (const [execute, name] of [[getEvent, 'GetEvent'], [listEvents, 'ListEvents'], [reports.getReport, 'GetReport']]) await assert.rejects(execute(db), error => {
                assert.ok(error instanceof QueryValidationError);
                assert.ok(error instanceof TypeError);
                assert.equal(error.name, 'QueryValidationError');
                assert.equal(error.query, name);
                assert.equal(error.column, rejectedColumn);
                assert.deepEqual(error.issues[0].path, ['next', 'next', 'actor', 'id']);
                assert.equal(error.issues[0].keyword, 'type');
                assert.equal(error.issues[0].expected, 'integer');
                assert.equal(error.issues[0].received, 'string');
                assert.match(error.message, /next.next.actor.id/);
                return true;
              });
            } else {
              assert.equal((await getEvent(db)).id, 1);
              assert.equal((await listEvents(db))[0].id, 1);
            }
          };
          await check(valid, valid, false);
          await check(invalid, valid, ${override ? "'payload'" : 'false'});
          await check(valid, invalid, ${automatic ? "'audit'" : 'false'});
        `
        await writeFile(join(root, 'check.mjs'), script)
        const result = await promisify(execFile)(process.execPath, ['check.mjs'], { cwd: root })
        expect(result.stderr).toBe('')
      }
      const original = await readFile(configPath, 'utf8')
      await writeFile(
        configPath,
        original
          .replace('runtime: {outDir: packages/validation, validate: false}', '')
          .replace('runtime: {validate: true}', 'runtime: {validate: false}')
          .replace(', runtime: backend/queries', ''),
      )
      const removed = await runtime.build()
      expect(removed.state.diagnostics).toEqual([])
      expect(
        removed.events.some(
          (event) => event.kind === 'artifact-removed' && event.artifact.kind === 'runtime',
        ),
      ).toBe(true)
      await expect(access(join(root, 'backend/queries/events/GetEvent.ts'))).rejects.toThrow()
      await expect(access(join(root, 'packages/validation/Document.ts'))).rejects.toThrow()
      await expect(
        access(join(root, 'packages/types/queries/events/GetEvent.d.ts')),
      ).resolves.toBeUndefined()
    } finally {
      await runtime.close()
    }
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
