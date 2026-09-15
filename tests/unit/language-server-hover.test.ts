import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { projectHover } from '../../src/language-server/hover.js'
import { buildProject } from '../../src/project-runtime.js'

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
      writeFile(
        queryPath,
        `-- name: GetEvent :one
SELECT e.id,
       e.payload->'kind' AS kind,
       a.id AS actor_id,
       a.name AS actor_name,
       NULL::text AS absent
FROM events e
LEFT JOIN actors a ON a.id = e.id
WHERE e.id = @id;

-- name: PutValue :one
UPDATE tags SET value = COALESCE(@first::integer, @second::integer)
WHERE id = @id::integer
RETURNING value;`,
      ),
    ])
    const update = await buildProject({ baseDirectory: root })

    const hover = projectHover(update.state, {
      baseDirectory: root,
      path: queryPath,
      position: { line: 2, character: 12 },
    })

    expect(hover?.range).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 8, character: 17 },
    })
    expect(markdown(hover)).toContain('**GetEvent** `one`')
    expect(markdown(hover)).toContain('@id: integer — accepts NULL')
    expect(markdown(hover)).toContain('id: integer — not null — public.events.id')
    expect(markdown(hover)).toContain(
      'kind: jsonb — nullable — public.events.payload["kind"] (json)',
    )
    expect(markdown(hover)).toContain('absent: text — always null — cast(NULL as text)')
    expect(markdown(hover)).toContain('actor\\_id \\(discriminant\\)')
    expect(markdown(hover)).toContain('actor\\_name \\(discriminant\\)')

    const writeHover = projectHover(update.state, {
      baseDirectory: root,
      path: queryPath,
      position: { line: 11, character: 20 },
    })
    expect(markdown(writeHover)).toContain('@first: integer — jointly rejects NULL with @second')
    expect(markdown(writeHover)).toContain('@second: integer — jointly rejects NULL with @first')
    expect(markdown(writeHover)).toContain('- @first + @second')
    expect(
      projectHover(update.state, {
        baseDirectory: root,
        path: queryPath,
        position: { line: 9, character: 0 },
      }),
    ).toBeNull()
  })
})

const markdown = (hover: ReturnType<typeof projectHover>): string => {
  const contents = hover?.contents
  return contents && !Array.isArray(contents) && typeof contents === 'object' && 'value' in contents
    ? contents.value
    : ''
}
