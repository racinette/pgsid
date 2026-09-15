import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { projectHover } from '../../src/language-server/hover.js'
import { buildProject } from '../../src/project-runtime.js'
import { extractCursor } from './language-server-harness.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('projectHover', () => {
  it('renders the analyzed contract, presence groups, and semantic lineage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-language-server-hover-'))
    roots.push(root)
    await Promise.all([
      mkdir(join(root, 'migrations'), { recursive: true }),
      mkdir(join(root, 'queries'), { recursive: true }),
    ])
    const queryPath = join(root, 'queries/events.sql')
    const query = extractCursor(`-- name: GetEvent :one
SELECT e.id,
       e.payload->/*cursor*/'kind' AS kind,
       a.id AS actor_id,
       a.name AS actor_name,
       NULL::text AS absent
FROM events e
LEFT JOIN actors a ON a.id = e.id
WHERE e.id = @id;

-- name: PutValue :one
UPDATE tags SET value = COALESCE(@first::integer, @second::integer)
WHERE id = @id::integer
RETURNING value;`)
    await Promise.all([
      writeFile(
        join(root, 'pgsid.yaml'),
        `
          schema: migrations/*.sql
          sql:
            paths: [queries/*.sql]
            typecheck: { plpgsql: false }
        `,
      ),
      writeFile(
        join(root, 'migrations/001.sql'),
        `
          CREATE TABLE events (id integer PRIMARY KEY, payload jsonb NOT NULL);
          CREATE TABLE actors (id integer PRIMARY KEY, name text NOT NULL);
          CREATE TABLE tags (id integer PRIMARY KEY, value integer NOT NULL);
        `,
      ),
      writeFile(queryPath, query.content),
    ])
    const update = await buildProject({ baseDirectory: root })

    const hover = projectHover(update.state, {
      baseDirectory: root,
      path: queryPath,
      position: query.position,
    })

    expect(hover).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "**GetEvent** \`one\`

      **Parameters**

      \`\`\`text
        @id: integer — accepts NULL
      \`\`\`

      **Outputs**

      \`\`\`text
        id: integer — not null — public.events.id
        kind: jsonb — nullable — public.events.payload["kind"] (json)
        actor_id: integer — nullable — public.actors.id
        actor_name: text — nullable — public.actors.name
        absent: text — always null — cast(NULL as text)
      \`\`\`

      **Presence groups**

      - actor\\_id \\(discriminant\\), actor\\_name \\(discriminant\\)",
        },
        "range": {
          "end": {
            "character": 17,
            "line": 8,
          },
          "start": {
            "character": 0,
            "line": 0,
          },
        },
      }
    `)

    const writeHover = projectHover(update.state, {
      baseDirectory: root,
      path: queryPath,
      position: { line: 11, character: 20 },
    })
    expect(writeHover).toMatchInlineSnapshot(`
      {
        "contents": {
          "kind": "markdown",
          "value": "**PutValue** \`one\`

      **Parameters**

      \`\`\`text
        @first: integer — jointly rejects NULL with @second
        @second: integer — jointly rejects NULL with @first
        @id: integer — accepts NULL
      \`\`\`

      **Outputs**

      \`\`\`text
        value: integer — not null — update(coalesce(cast($1 as pg_catalog.int4), cast($2 as pg_catalog.int4))) → public.tags.value
      \`\`\`

      **Joint NULL rejection**

      - @first + @second",
        },
        "range": {
          "end": {
            "character": 16,
            "line": 13,
          },
          "start": {
            "character": 0,
            "line": 10,
          },
        },
      }
    `)
    expect(
      projectHover(update.state, {
        baseDirectory: root,
        path: queryPath,
        position: { line: 9, character: 0 },
      }),
    ).toBeNull()
  })
})
