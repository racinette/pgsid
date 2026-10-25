import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { storedJsonbConstant } from '../../../src/catalog/jsonb-constant-storage.js'
import {
  parseTree,
  tree,
  scalar,
  type Tree,
  type Value,
} from '../../../src/catalog/expression-tree.js'

function constant(body: Buffer, order: 'little' | 'big', short = false): Tree {
  const bytes = Buffer.alloc(body.length + (short ? 1 : 4))
  if (short) bytes[0] = order === 'little' ? bytes.length * 2 + 1 : bytes.length | 128
  else if (order === 'little') bytes.writeUInt32LE(bytes.length * 4)
  else bytes.writeUInt32BE(bytes.length)
  body.copy(bytes, short ? 1 : 4)
  return {
    kind: 'CONST',
    fields: {
      constisnull: ['false'],
      constbyval: ['false'],
      constlen: ['-1'],
      constvalue: [String(bytes.length), [...bytes].map(String)],
    },
  }
}

it('rebuilds identical native JSONB storage from recovered logical values, exact numerics and both offset forms', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('CREATE TABLE captures(n int4)')
    const oid = (await pg.query<{ oid: number }>("SELECT 'jsonb'::regtype::oid oid")).rows[0]!.oid
    const capture = async (document: string): Promise<Tree> => {
      await pg.exec(
        `ALTER TABLE captures ADD CONSTRAINT value CHECK(jsonb_typeof($doc$${document}$doc$::jsonb) IS NOT NULL)`,
      )
      const source = (
        await pg.query<{ source: string }>(
          "SELECT conbin::text source FROM pg_constraint WHERE conrelid='captures'::regclass",
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
      await pg.exec('ALTER TABLE captures DROP CONSTRAINT value')
      expect(found).toBeDefined()
      return found!
    }
    const documents = [
      'null',
      'true',
      'false',
      '0',
      '-0.0000',
      '1.2300',
      '1e-20',
      '-1.234567890123456789e100',
      '9999999999999999999999999999999999999999999.12345678901234567890',
      '""',
      String.raw`"é😊\n\t\"\\☺"`,
      '{}',
      '[]',
      '{"b":1.000,"a":-2.300,"b":4.5000}',
      '{"abc":["x",1.200,true,null,{"nested":"é😊"}],"a":{},"aa":[]}',
      '["x",1,"xx",2,"xxx",3,"xxxx",4,[],{},false,true,null]',
      '[' +
        Array.from({ length: 97 }, (_, i) =>
          i % 3 === 0 ? '"x"' : i % 3 === 1 ? i + '.2300' : '{"v":[' + i + ']}',
        ).join(',') +
        ']',
      '{' +
        Array.from({ length: 70 }, (_, i) => JSON.stringify('key' + i) + ':' + i + '.000').join(
          ',',
        ) +
        '}',
    ]
    for (const document of documents) {
      const node = await capture(document),
        recovered = storedJsonbConstant(node, 'little', true)
      expect(typeof recovered, document).toBe('string')
      expect((await capture(recovered!)).fields['constvalue'], document).toEqual(
        node.fields['constvalue'],
      )
      expect(storedJsonbConstant(node, 'big', true)).toBeUndefined()
      if (/[^\x00-\x7f]/u.test(JSON.stringify(JSON.parse(document))))
        expect(storedJsonbConstant(node, 'little', false)).toBeUndefined()
      else expect(storedJsonbConstant(node, 'little', false)).toBe(recovered)
    }
  } finally {
    await pg.close()
  }
}, 30_000)

it('reads source endian, packed headers and arbitrary length-or-offset entries without host numeric parsing', () => {
  for (const order of ['little', 'big'] as const) {
    const body = Buffer.alloc(24),
      write = (n: number, at: number) =>
        order === 'little' ? body.writeUInt32LE(n >>> 0, at) : body.writeUInt32BE(n >>> 0, at)
    write(0x40000002, 0)
    write(1, 4)
    write(0x9000000c, 8)
    body[12] = 120
    write(order === 'little' ? 32 : 8, 16)
    if (order === 'little') {
      body.writeUInt16LE(0x8000, 20)
      body.writeUInt16LE(1, 22)
    } else {
      body.writeUInt16BE(0x8000, 20)
      body.writeUInt16BE(1, 22)
    }
    for (const short of [false, true])
      expect(storedJsonbConstant(constant(body, order, short), order, false)).toBe('["x",1]')
    for (const mutate of [
      (b: Buffer) => {
        b[13] = 1
      },
      (b: Buffer) => {
        b.fill(0, 0, 4)
      },
      (b: Buffer) => {
        b.fill(255, 4, 8)
      },
      (b: Buffer) => {
        b.fill(255, 16, 20)
      },
      (b: Buffer) => {
        b[12] = 0
      },
      (b: Buffer) => {
        b[12] = 255
      },
    ]) {
      const invalid = Buffer.from(body)
      mutate(invalid)
      expect(storedJsonbConstant(constant(invalid, order), order, true)).toBeUndefined()
    }
    expect(storedJsonbConstant(constant(body.subarray(0, -1), order), order, true)).toBeUndefined()
    expect(
      storedJsonbConstant(constant(Buffer.concat([body, Buffer.alloc(1)]), order), order, true),
    ).toBeUndefined()
  }
})

it('traverses nested containers without recursive host stack use', () => {
  const depth = 5000,
    body = Buffer.alloc(depth * 8 + 4)
  for (let i = 0; i < depth; i++) {
    body.writeUInt32LE(0x40000001, i * 8)
    body.writeUInt32LE(0x50000000 + body.length - (i + 1) * 8, i * 8 + 4)
  }
  body.writeUInt32LE(0x40000000, depth * 8)
  expect(storedJsonbConstant(constant(body, 'little'), 'little', true)).toBe(
    '['.repeat(depth + 1) + ']'.repeat(depth + 1),
  )
})

it('rejects invalid root forms, scalar sizes, object keys and nested scalar wrappers', () => {
  for (const order of ['little', 'big'] as const) {
    const frame = (header: number, entries: number[], data = Buffer.alloc(0)) => {
      const body = Buffer.alloc(4 + entries.length * 4 + data.length),
        words = [header, ...entries]
      for (const [i, value] of words.entries()) {
        if (order === 'little') body.writeUInt32LE(value >>> 0, i * 4)
        else body.writeUInt32BE(value >>> 0, i * 4)
      }
      data.copy(body, 4 + entries.length * 4)
      return constant(body, order)
    }
    for (const node of [
      frame(0x50000000, []),
      frame(0x50000002, [0x40000000, 0x40000000]),
      frame(0x60000000, []),
      frame(0x40000001, [0x20000001], Buffer.from('x')),
      frame(0x20000001, [0x40000000, 0x40000000]),
      frame(0x20000002, [1, 1, 0x40000000, 0x40000000], Buffer.from('aa')),
      frame(0x20000002, [1, 1, 0x40000000, 0x40000000], Buffer.from('ba')),
      frame(0x40000002, [0x80000002, 0x80000001], Buffer.from('ab')),
    ])
      expect(storedJsonbConstant(node, order, true)).toBeUndefined()
    const child = Buffer.alloc(8)
    if (order === 'little') {
      child.writeUInt32LE(0x50000001)
      child.writeUInt32LE(0x40000000, 4)
    } else {
      child.writeUInt32BE(0x50000001)
      child.writeUInt32BE(0x40000000, 4)
    }
    expect(storedJsonbConstant(frame(0x40000001, [0x50000008], child), order, true)).toBeUndefined()
  }
})
