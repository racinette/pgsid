import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { buildProject } from '../../src/project-runtime.js'

const schema = `CREATE TABLE items (id int PRIMARY KEY, price numeric CHECK (price > 0), name text CHECK (length(name) < 5));
CREATE TABLE tags (id int PRIMARY KEY, label text CHECK (label ~ '^[a-z]+$'));
`

let root: string
let db: PGlite

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'pgsid-shared-check-runtime-'))
  await mkdir(join(root, 'queries'))
  await writeFile(join(root, 'schema.sql'), schema)
  await writeFile(
    join(root, 'queries/items.sql'),
    `-- name: AddItem :exec
INSERT INTO items (id, price, name) VALUES (@id, @price, @name);
-- name: RenameItem :exec
UPDATE items SET name = @name WHERE id = @id;
`,
  )
  await writeFile(
    join(root, 'queries/tags.sql'),
    `-- name: AddTag :exec
INSERT INTO tags (id, label) VALUES (@id, @label);
`,
  )
  await writeFile(
    join(root, 'pgsid.yaml'),
    'schema: schema.sql\nsql:\n  paths: [queries/*.sql]\n  codegen:\n    typescript:\n      queries:\n        out:\n          queries:\n            types: generated/types\n            runtime: generated/runtime\n',
  )
  db = await PGlite.create()
  await db.exec(schema)
}, 120_000)

afterAll(async () => {
  await db?.close()
  await rm(root, { recursive: true, force: true })
})

const files = async (directory: string): Promise<string[]> =>
  (await readdir(directory, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort()

it(
  'translates one CHECK evaluator per runtime directory, shared by its queries',
  async () => {
    const built = await buildProject({ baseDirectory: root })
    expect(built.state.diagnostics).toEqual([])
    const items = await files(join(root, 'generated/runtime/items'))
    // No query carries an evaluator of its own.
    expect(items.filter((path) => path.includes('check-rust'))).toEqual(
      expect.arrayContaining(['pgsid/check-rust/checks.ts', 'pgsid/check-rust/checkruntime/runtime.ts']),
    )
    expect(items.some((path) => /^[A-Za-z]+\.check-rust/u.test(path))).toBe(false)
    // A table's check both queries write is declared once.
    const checks = await readFile(join(root, 'generated/runtime/items/pgsid/check-rust/checks.ts'), 'utf8')
    const declared = [...checks.matchAll(/export function (\w+)/gu)].map((match) => match[1])
    expect(new Set(declared).size).toBe(declared.length)
    expect(declared.filter((name) => /ItemsItemsNameCheck/u.test(name!)).length).toBe(1)
    expect((await files(join(root, 'generated/runtime/tags'))).filter((path) => path.includes('check-rust'))).toContain(
      'pgsid/check-rust/checks.ts',
    )

    const { fromPglite } = (await import(join(root, 'generated/runtime/items/pgsid/queryable.ts'))) as {
      fromPglite(db: PGlite): unknown
    }
    const queryable = fromPglite(db)
    const add = (await import(join(root, 'generated/runtime/items/AddItem.ts'))) as {
      addItem(db: unknown, params: Record<string, unknown>): Promise<unknown>
    }
    const rename = (await import(join(root, 'generated/runtime/items/RenameItem.ts'))) as {
      renameItem(db: unknown, params: Record<string, unknown>): Promise<unknown>
    }
    const refused = (work: Promise<unknown>) =>
      work.then(
        () => null,
        (error: { code?: string; constraint?: string; message?: string }) => (error.code ? `${error.code} ${error.constraint}` : String(error.message)),
      )
    expect(await refused(rename.renameItem(queryable, { id: 1, name: 'too long' }))).toBe('23514 items_name_check')
    const { numeric } = (await import(join(root, 'generated/runtime/items/pgsid/numeric.ts'))) as {
      numeric(text: string): unknown
    }
    expect(await refused(add.addItem(queryable, { id: 1, price: numeric('2'), name: 'abcdef' }))).toBe('23514 items_name_check')
    expect(await refused(add.addItem(queryable, { id: 1, price: numeric('-2'), name: 'abc' }))).toBe('23514 items_price_check')
  },
  300_000,
)
