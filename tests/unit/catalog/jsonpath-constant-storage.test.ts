import { jsonpathStoragePaths } from '../../sql-semantics/check-jsonpath-storage-fixtures.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  parseTree,
  tree,
  scalar,
  type Tree,
  type Value,
} from '../../../src/catalog/expression-tree.js'
import { storedJsonpathConstant } from '../../../src/catalog/jsonpath-constant-storage.js'

it('recovers fully grouped JSONPath inputs that rebuild the identical native graph for every stored node family', async () => {
  const pg = await PGlite.create()
  try {
    const oid = (await pg.query<{ oid: number }>("SELECT 'jsonpath'::regtype::oid oid")).rows[0]!
        .oid,
      paths = jsonpathStoragePaths,
      constant = async (path: string, name: string): Promise<Tree> => {
        await pg.exec(
          `CREATE TABLE ${name}(document jsonb,CHECK(jsonb_path_exists(document,'${path.replaceAll("'", "''")}'::jsonpath)))`,
        )
        const source = (
          await pg.query<{ source: string }>(
            `SELECT conbin::text source FROM pg_constraint WHERE conrelid='${name}'::regclass`,
          )
        ).rows[0]!.source
        let found: Tree | undefined
        const visit = (value: Value): void => {
          if (Array.isArray(value)) {
            value.forEach(visit)
            return
          }
          const node = tree(value)
          if (!node) return
          if (node.kind === 'CONST' && Number(scalar(node, 'consttype')) === oid) found = node
          for (const values of Object.values(node.fields)) values.forEach(visit)
        }
        visit(parseTree(source))
        expect(found, path).toBeDefined()
        return found!
      }
    for (const [index, path] of paths.entries()) {
      const original = await constant(path, 'original_' + index),
        recovered = storedJsonpathConstant(original, 'little', true)
      expect(typeof recovered, path).toBe('string')
      const rebuilt = await constant(recovered!, 'rebuilt_' + index)
      expect(rebuilt.fields['constvalue'], `${path} -> ${recovered}`).toEqual(
        original.fields['constvalue'],
      )
      if (/[^\x00-\x7f]/u.test(path))
        expect(storedJsonpathConstant(original, 'little', false)).toBeUndefined()
    }
  } finally {
    await pg.close()
  }
}, 90_000)

it('reads native word order explicitly and rejects malformed graph links, headers and strings', () => {
  const node = (little: boolean, mutate?: (body: Buffer) => void): Tree => {
    const bytes = Buffer.alloc(30),
      word = (at: number, value: number) =>
        little ? bytes.writeUInt32LE(value, at) : bytes.writeUInt32BE(value, at)
    word(0, little ? bytes.length * 4 : bytes.length)
    word(4, 0x80000001)
    bytes[8] = 27
    word(12, 8)
    bytes[16] = 25
    word(20, 0)
    word(24, 1)
    bytes[28] = 120
    const extended = bytes
    mutate?.(extended)
    return {
      kind: 'CONST',
      fields: {
        constisnull: ['false'],
        constbyval: ['false'],
        constlen: ['-1'],
        constvalue: [String(extended.length), [...extended].map(String)],
      },
    }
  }
  for (const little of [false, true])
    expect(storedJsonpathConstant(node(little), little ? 'little' : 'big', true)).toBe('lax $."x"')
  for (const mutate of [
    (bytes: Buffer) => bytes.writeUInt32LE(2, 4),
    (bytes: Buffer) => bytes.writeUInt32LE(9999, 12),
    (bytes: Buffer) => bytes.writeUInt32LE(4294967288, 20),
    (bytes: Buffer) => bytes.writeUInt32LE(9999, 24),
    (bytes: Buffer) => {
      bytes[29] = 1
    },
    (bytes: Buffer) => {
      bytes[16] = 255
    },
  ])
    expect(storedJsonpathConstant(node(true, mutate), 'little', true)).toBeUndefined()
})
