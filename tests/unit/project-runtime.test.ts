import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildProject,
  ProjectRuntime,
  ProjectSchemaError,
  watchProject,
} from '../../src/project-runtime.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

const project = async (options: { jsonSchema?: boolean; schemaCodegen?: boolean } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-runtime-'))
  roots.push(root)
  await Promise.all([
    mkdir(join(root, 'migrations'), { recursive: true }),
    mkdir(join(root, 'queries'), { recursive: true }),
    mkdir(join(root, 'schemas'), { recursive: true }),
  ])
  await writeFile(
    join(root, 'pgsid.yaml'),
    `
      schema: migrations/*.sql
      ${
        options.jsonSchema
          ? `types:
        jsonSchemas:
          Payload: { file: schemas/payload.json }`
          : ''
      }
      sql:
        paths: [queries/*.sql]
        typecheck: { plpgsql: false }
        codegen:
          typescript:
            ${
              options.jsonSchema
                ? `mappings:
              column:
                public.events.payload: { jsonSchema: Payload }`
                : ''
            }
            ${options.schemaCodegen ? 'schema: { outDir: generated/schema }' : ''}
            queries:
              out:
                queries:
                  types: generated/types
                  wrappers: generated/wrappers
    `,
  )
  return root
}

describe('ProjectRuntime', () => {
  it('writes and caches configured schema artifacts', async () => {
    const root = await project({ schemaCodegen: true })
    await Promise.all([
      writeFile(
        join(root, 'migrations/001.sql'),
        `CREATE TYPE event_state AS ENUM ('ready', 'done');
         CREATE DOMAIN event_id AS bigint;
         CREATE TABLE events (
           id event_id PRIMARY KEY,
           state event_state NOT NULL DEFAULT 'ready',
           note text
         );`,
      ),
      writeFile(join(root, 'queries/empty.sql'), '-- name: Ping :one\nSELECT 1 AS value;'),
    ])
    const runtime = new ProjectRuntime({ baseDirectory: root })
    try {
      const first = await runtime.build()
      const second = await runtime.build()

      expect(first.state.diagnostics).toEqual([])
      await expect(
        readFile(join(root, 'generated/schema/helpers.d.ts'), 'utf8'),
      ).resolves.toContain('export type InferSelect')
      await expect(
        readFile(join(root, 'generated/schema/public/tables.d.ts'), 'utf8'),
      ).resolves.toContain('export type Events = TableTypes<')
      await expect(
        readFile(join(root, 'generated/schema/public/enums.d.ts'), 'utf8'),
      ).resolves.toContain('export type EventState = "ready" | "done";')
      expect(second.events).toEqual([])
      expect(second.stats.renderCacheHits).toBe(2)

      const configPath = join(root, 'pgsid.yaml')
      await writeFile(
        configPath,
        (await readFile(configPath, 'utf8')).replace(
          '            schema: { outDir: generated/schema }\n',
          '',
        ),
      )
      const disabled = await runtime.build()
      expect(disabled.events.some((event) => event.kind === 'artifact-removed')).toBe(true)
      await expect(access(join(root, 'generated/schema/helpers.d.ts'))).rejects.toThrow()
    } finally {
      await runtime.close()
    }
  })

  it('builds a configured project and reuses every query cache', async () => {
    const root = await project({ jsonSchema: true })
    await Promise.all([
      writeFile(
        join(root, 'migrations/001.sql'),
        'CREATE TABLE events (id bigint PRIMARY KEY, payload jsonb NOT NULL);',
      ),
      writeFile(
        join(root, 'queries/events.sql'),
        '-- name: GetEvent :one\nSELECT id, payload FROM events WHERE id = @id;',
      ),
      writeFile(
        join(root, 'schemas/payload.json'),
        JSON.stringify({ type: 'object', properties: { actor: { type: 'integer' } } }),
      ),
    ])
    const runtime = new ProjectRuntime({ baseDirectory: root })
    try {
      const first = await runtime.build()
      const second = await runtime.build()
      const typesPath = join(root, 'generated/types/events.ts')

      expect(first.state.diagnostics).toEqual([])
      expect(await readFile(typesPath, 'utf8')).toContain('"actor"?: number;')
      expect(second.events).toEqual([])
      expect(second.stats).toMatchObject({
        parseCacheHits: 1,
        analysisCacheHits: 1,
        renderCacheHits: 1,
      })

      await writeFile(
        join(root, 'schemas/payload.json'),
        JSON.stringify({ type: 'object', properties: { actor: { type: 'string' } } }),
      )
      const schemaChanged = await runtime.build()
      expect(schemaChanged.stats).toMatchObject({ analysisCacheHits: 1, renderCacheMisses: 1 })
      expect(await readFile(typesPath, 'utf8')).toContain('"actor"?: string;')

      await writeFile(join(root, 'migrations/001.sql'), 'CREATE TABLE events (')
      await expect(runtime.build()).rejects.toBeInstanceOf(ProjectSchemaError)
      expect(await readFile(typesPath, 'utf8')).toContain('"actor"?: string')
    } finally {
      await runtime.close()
    }
  })

  it('applies materialized-view nullability defaults and exact overrides', async () => {
    const root = await project()
    const configPath = join(root, 'pgsid.yaml')
    await Promise.all([
      writeFile(
        configPath,
        (await readFile(configPath, 'utf8')).replace(
          '        typecheck: { plpgsql: false }\n',
          `        typecheck: { plpgsql: false }
        analysis:
          nullability:
            materializedViews:
              default: conservative
              overrides:
                public.stale_two: definition
`,
        ),
      ),
      writeFile(
        join(root, 'migrations/001.sql'),
        `CREATE TABLE source_rows (payload jsonb);
         INSERT INTO source_rows VALUES (NULL);
         CREATE MATERIALIZED VIEW stale_one AS SELECT payload FROM source_rows;
         CREATE MATERIALIZED VIEW stale_two AS SELECT payload FROM source_rows;
         DELETE FROM source_rows;
         ALTER TABLE source_rows ALTER COLUMN payload SET NOT NULL;`,
      ),
      writeFile(
        join(root, 'queries/materialized.sql'),
        `-- name: ReadSnapshots :many
         SELECT a.payload AS stale_payload, b.payload AS current_payload
         FROM stale_one a, stale_two b;`,
      ),
    ])
    const runtime = new ProjectRuntime({ baseDirectory: root })
    try {
      const first = await runtime.build()
      const queryId = 'queries/materialized.sql#ReadSnapshots'
      expect(
        first.state.queryAnalysis.analyses[queryId]?.contract.outputs.map(
          (output) => output.notNull,
        ),
      ).toEqual([false, true])

      await writeFile(
        configPath,
        (await readFile(configPath, 'utf8')).replace(
          '              default: conservative',
          '              default: definition',
        ),
      )
      const changed = await runtime.build()
      expect(changed.stats.analysisCacheMisses).toBe(1)
      expect(
        changed.state.queryAnalysis.analyses[queryId]?.contract.outputs.map(
          (output) => output.notNull,
        ),
      ).toEqual([true, true])
    } finally {
      await runtime.close()
    }
  })

  it('rejects a materialized-view override that names another relation kind', async () => {
    const root = await project()
    const configPath = join(root, 'pgsid.yaml')
    await Promise.all([
      writeFile(
        configPath,
        (await readFile(configPath, 'utf8')).replace(
          '        typecheck: { plpgsql: false }\n',
          `        typecheck: { plpgsql: false }
        analysis:
          nullability:
            materializedViews:
              overrides:
                public.events: conservative
`,
        ),
      ),
      writeFile(join(root, 'migrations/001.sql'), 'CREATE TABLE events (id bigint PRIMARY KEY);'),
      writeFile(
        join(root, 'queries/events.sql'),
        '-- name: ReadEvents :many\nSELECT id FROM events;',
      ),
    ])

    await expect(buildProject({ baseDirectory: root })).rejects.toThrow(
      'Materialized-view nullability override "public.events" names a table',
    )
  })

  it('reports deferred schema diagnostics with their migration path', async () => {
    const root = await project()
    await writeFile(
      join(root, 'migrations/001.sql'),
      `CREATE FUNCTION broken() RETURNS integer
       LANGUAGE sql AS 'SELECT missing FROM absent';`,
    )

    const update = await buildProject({ baseDirectory: root })

    expect(update.state.diagnostics).toHaveLength(1)
    expect(update.state.diagnostics[0]).toMatchObject({
      source: 'schema',
      path: 'migrations/001.sql',
      diagnostic: { severity: 'error' },
    })
  })

  it('resolves project paths from an explicit config and enables PL/pgSQL checks by default', async () => {
    const root = await project()
    const configPath = join(root, 'pgsid.yaml')
    await Promise.all([
      writeFile(
        configPath,
        (await readFile(configPath, 'utf8')).replace('        typecheck: { plpgsql: false }\n', ''),
      ),
      writeFile(
        join(root, 'migrations/001.sql'),
        `CREATE TABLE events (id integer PRIMARY KEY);
         CREATE FUNCTION event_id(value integer) RETURNS integer
         LANGUAGE plpgsql AS $$ BEGIN RETURN value; END $$;`,
      ),
      writeFile(
        join(root, 'queries/events.sql'),
        '-- name: ListEvents :many\nSELECT event_id(id) AS id FROM events;',
      ),
    ])

    const update = await buildProject({ configPath })

    expect(update.state.diagnostics).toEqual([])
    await expect(readFile(join(root, 'generated/types/events.ts'), 'utf8')).resolves.toContain(
      '"id": number',
    )
  })

  it('skips PL/pgSQL validation when it is disabled', async () => {
    const root = await project()
    await Promise.all([
      writeFile(
        join(root, 'migrations/001.sql'),
        `CREATE FUNCTION broken() RETURNS integer
         LANGUAGE plpgsql AS $$ BEGIN RETURN missing FROM absent; END $$;`,
      ),
      writeFile(join(root, 'queries/empty.sql'), '-- name: Empty :one\nSELECT 1 AS value;'),
    ])

    const update = await buildProject({ baseDirectory: root })

    expect(update.state.diagnostics).toEqual([])
  })

  it('watches migrations, preserves the live generation on failure, and recovers', async () => {
    const root = await project()
    const migrationPath = join(root, 'migrations/001.sql')
    const typesPath = join(root, 'generated/types/events.ts')
    await Promise.all([
      writeFile(migrationPath, 'CREATE TABLE events (id integer PRIMARY KEY);'),
      writeFile(
        join(root, 'queries/events.sql'),
        '-- name: ListEvents :many\nSELECT id FROM events;',
      ),
    ])
    const errors: unknown[] = []
    const runtime = await watchProject({
      baseDirectory: root,
      debounceMs: 10,
      onError: (error) => errors.push(error),
    })
    try {
      await expect(readFile(typesPath, 'utf8')).resolves.toContain('"id": number')

      await writeFile(migrationPath, 'CREATE TABLE events (')
      await vi.waitFor(
        () => {
          expect(errors.at(-1)).toBeInstanceOf(ProjectSchemaError)
        },
        { timeout: 5_000, interval: 20 },
      )
      await expect(readFile(typesPath, 'utf8')).resolves.toContain('"id": number')

      await writeFile(migrationPath, 'CREATE TABLE events (id boolean PRIMARY KEY);')
      await vi.waitFor(
        async () => {
          await expect(readFile(typesPath, 'utf8')).resolves.toContain('"id": boolean')
        },
        { timeout: 5_000, interval: 20 },
      )
      expect(runtime.state.diagnostics).toEqual([])
      await expect(access(typesPath)).resolves.toBeUndefined()
    } finally {
      await runtime.close()
    }
  })
})
