import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  storedSnapshotConstant,
  validSnapshotConstantStorage,
  type SnapshotConstantType,
} from '../../../src/catalog/snapshot-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { parseTree, tree, type Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

const node = (bytes: Buffer, id = 51001): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(id)],
    constcollid: ['0'],
    constisnull: ['false'],
    constbyval: ['false'],
    constlen: ['-1'],
    constvalue: [String(bytes.length), [...bytes].map((n) => String(n > 127 ? n - 256 : n))],
  },
})
const storage = (words: readonly bigint[], order: 'little' | 'big', short: boolean) => {
  const body = Buffer.alloc(20 + (words.length - 2) * 8),
    write = (n: number, at: number) =>
      order === 'little' ? body.writeUInt32LE(n, at) : body.writeUInt32BE(n, at)
  write(words.length - 2, 0)
  words.forEach((w, i) =>
    order === 'little' ? body.writeBigUInt64LE(w, 4 + i * 8) : body.writeBigUInt64BE(w, 4 + i * 8),
  )
  const header = Buffer.alloc(short ? 1 : 4),
    length = body.length + header.length
  if (short) header[0] = order === 'little' ? length * 2 + 1 : length | 128
  else if (order === 'little') header.writeUInt32LE(length * 4)
  else header.writeUInt32BE(length)
  return Buffer.concat([header, body])
}
it('recovers snapshot boundaries and in-progress words across native headers, byte orders and local IDs', () => {
  for (const type of ['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot'] as const)
    for (const order of ['little', 'big'] as const)
      for (const short of [false, true])
        for (const words of [
          [1n, 1n],
          [1n, 9n, 1n, 3n, 9n],
          [
            9223372036854775807n,
            18446744073709551615n,
            9223372036854775808n,
            18446744073709551615n,
          ],
        ]) {
          const expected = {
            type,
            xmin: String(words[0]),
            xmax: String(words[1]),
            xip: words.slice(2).map(String),
          }
          for (const id of [51001, 61001]) {
            const c = node(storage(words, order, short), id)
            expect(storedSnapshotConstant(c, type, order)).toEqual(expected)
            expect(
              storedRowExpression(c, {
                types: new Map([[id, type]]),
                functions: new Map(),
                columns: new Map(),
                byteOrder: order,
              }),
            ).toEqual({ PgsidStoredSnapshot: expected })
            expect(validSnapshotConstantStorage(expected)).toBe(true)
          }
        }
})
it('rejects malformed snapshot framing, noncanonical words, count mismatches and unordered transaction sets', () => {
  const type: SnapshotConstantType = 'pg_catalog.pg_snapshot',
    base = { type, xmin: '1', xmax: '9', xip: ['3', '9'] }
  for (const value of [
    { ...base, xmin: '0' },
    { ...base, xmin: '10' },
    { ...base, xmin: '4294967296', xmax: '4294967297', xip: [] },
    { ...base, xmax: '9223372036854775808' },
    { ...base, xip: ['3', '3'] },
    { ...base, xip: ['5', '3'] },
    { ...base, xip: ['10'] },
    { ...base, xmax: '01' },
    { ...base, xmax: '18446744073709551616' },
    { ...base, type: 'pg_catalog.oid' },
    { ...base, xip: ['+3'] },
    { ...base, xip: ['-3'] },
  ])
    expect(validSnapshotConstantStorage(value)).toBe(false)
  for (const order of ['little', 'big'] as const) {
    const bytes = storage([1n, 9n, 3n], order, false),
      badCount = Buffer.from(bytes),
      badHeader = Buffer.from(bytes)
    if (order === 'little') badCount.writeUInt32LE(2, 4)
    else badCount.writeUInt32BE(2, 4)
    badHeader[0] = badHeader[0]! ^ 3
    for (const bad of [bytes.subarray(0, -1), badCount, badHeader])
      expect(storedSnapshotConstant(node(bad), type, order)).toBeUndefined()
  }
  const c = node(Buffer.alloc(0))
  c.fields.constisnull = ['true']
  expect(storedSnapshotConstant(c, type, 'little')).toBeNull()
})
it('matches released native snapshot storage and captures nested values without replaying domain input', async () => {
  const contexts: unknown[][] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE DOMAIN saved_snapshot AS pg_snapshot CHECK(pg_snapshot_xmin(VALUE)='1'::xid8);
    CREATE TYPE saved AS(value saved_snapshot,legacy txid_snapshot,old int);
    CREATE TYPE result AS(n int,old saved[]);
    CREATE TABLE history(n int,CHECK(ROW(n,'{"(\\"1:9:3,5\\",\\"9223372036854775809:18446744073709551615:9223372036854775809\\",1)",NULL}'::saved[])::result IS NOT NULL));
    CREATE TABLE plain(n int,CHECK(ROW(n,'1:9:3,3,5'::pg_snapshot)::record IS NOT NULL));
    ALTER TYPE result DROP ATTRIBUTE old;ALTER DOMAIN saved_snapshot ADD CHECK(pg_snapshot_xmin(VALUE)='2'::xid8) NOT VALID;
    ALTER TYPE saved DROP ATTRIBUTE old;ALTER TYPE saved RENAME ATTRIBUTE value TO current_value;`)
      const raw = (
          await pg.query<{ source: string }>(
            "SELECT conbin::text source FROM pg_constraint WHERE conrelid='plain'::regclass",
          )
        ).rows[0]!.source,
        cnode = tree(parseTree(raw.match(/\{CONST[^{}]*\}/u)![0]))!
      expect(storedSnapshotConstant(cnode, 'pg_catalog.pg_snapshot', 'little')).toEqual({
        type: 'pg_catalog.pg_snapshot',
        xmin: '1',
        xmax: '9',
        xip: ['3', '5'],
      })
      const c = await snapshotCatalog(pg),
        out: unknown[] = []
      for (const name of ['history', 'plain']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        const p = lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!,
          g = prepareCheckRustGroup([
            {
              identity: { schema: 'public', kind: 'table', owner: name, constraint: 'stored' },
              expression: p.expression,
            },
          ])
        expect(g.checks[0]!.kind, name).toBe('supported')
        expect(g.evaluatorSource).not.toContain('snapshot_from_text(')
        out.push(k.rowCoercionContext)
      }
      await pg.exec('INSERT INTO history VALUES(1)')
      await expect(pg.exec('INSERT INTO history VALUES(NULL)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(out)
      ids.push((await pg.query<{ id: number }>("SELECT 'saved'::regtype::oid id")).rows[0]!.id)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)
