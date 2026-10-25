import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

it('captures exact signed money units in either native storage order and Datum convention', () => {
  for (const units of [-9223372036854775808n, -1n, 0n, 1n, 9223372036854775807n]) {
    const values: unknown[] = []
    for (const little of [true, false])
      for (const byval of [true, false])
        for (const oid of [41001, 51001]) {
          const bytes = Buffer.alloc(8)
          if (little) bytes.writeBigInt64LE(units)
          else bytes.writeBigInt64BE(units)
          const node: Tree = {
              kind: 'CONST',
              fields: {
                consttype: [String(oid)],
                constlen: ['8'],
                constbyval: [String(byval)],
                constisnull: ['false'],
                constcollid: ['0'],
                constvalue: ['8', [...bytes].map(String)],
              },
            },
            input = {
              types: new Map([[oid, 'pg_catalog.money']]),
              functions: new Map(),
              columns: new Map(),
              byteOrder: little ? ('little' as const) : ('big' as const),
            }
          values.push(storedRowExpression(node, input))
          expect(
            storedRowExpression(
              {
                ...node,
                fields: {
                  ...node.fields,
                  constvalue: ['8', [...bytes.subarray(0, 7)].map(String)],
                },
              },
              input,
            ),
          ).toBeUndefined()
        }
    expect(
      values.every(
        (v) => JSON.stringify(v) === JSON.stringify({ PgsidStoredMoney: units.toString() }),
      ),
    ).toBe(true)
  }
})

it('retains XML storage including empty sources, BOMs and constructor text without current input parsing', () => {
  for (const text of [
    '',
    '<r/>',
    '<?xml version="1.0" encoding=""?><r/>',
    '\ufeff<é>😊</é>',
    '\u0001',
    'a'.repeat(200),
  ]) {
    const values: unknown[] = []
    for (const little of [true, false])
      for (const short of [false, true]) {
        const body = Buffer.from(text)
        if (short && body.length + 1 > 127) continue
        const header = Buffer.alloc(short ? 1 : 4),
          length = header.length + body.length
        if (short) header[0] = little ? length * 2 + 1 : length + 128
        else if (little) header.writeUInt32LE(length * 4)
        else header.writeUInt32BE(length)
        const node: Tree = {
            kind: 'CONST',
            fields: {
              consttype: ['41001'],
              constlen: ['-1'],
              constbyval: ['false'],
              constisnull: ['false'],
              constcollid: ['0'],
              constvalue: [String(length), [...header, ...body].map(String)],
            },
          },
          input = {
            types: new Map([[41001, 'pg_catalog.xml']]),
            functions: new Map(),
            columns: new Map(),
            utf8: true,
            byteOrder: little ? ('little' as const) : ('big' as const),
          }
        values.push(storedRowExpression(node, input))
        if (body.some((v) => v > 127))
          expect(storedRowExpression(node, { ...input, utf8: false })).toBeUndefined()
      }
    expect(
      values.every((v) => JSON.stringify(v) === JSON.stringify({ PgsidStoredXml: text })),
    ).toBe(true)
  }
})

it('retains recursive XML/money constants across deployment IDs and later domain/session changes', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`SET xmloption=content;CREATE DOMAIN amount AS money CHECK(VALUE>='0'::money);
        CREATE TYPE payload AS(document xml,amounts amount[]);CREATE TYPE reading AS(n int4,old payload);`)
      const value = (
          await pg.query<{ value: string }>(
            `SELECT (ROW('text<a/>'::xml,ARRAY['1.25'::amount,NULL])::payload)::text value`,
          )
        ).rows[0]!.value,
        quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
      await pg.exec(`CREATE TABLE history(n int4,CHECK(ROW(n,${quote(value)}::payload)::reading IS NOT NULL));
        ALTER TYPE reading DROP ATTRIBUTE old;SET xmloption=document;
        ALTER DOMAIN amount ADD CHECK(VALUE>='10'::money);`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!,
        k = t.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(true)
      expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredMoney')
      expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredXml')
      expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
      for (const origin of ['source', 'stored'] as const) {
        const expression = lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
          group = prepareCheckRustGroup([
            {
              expression,
              identity: { schema: 'public', kind: 'table', owner: 'history', constraint: origin },
            },
          ])
        expect(expression.kind).not.toBe('uncertain')
        expect(group.checks[0]!.kind).toBe('supported')
        expect(JSON.stringify(expression)).not.toContain('"kind":"domain-cast"')
      }
      await pg.exec('INSERT INTO history VALUES(1)')
      await expect(pg.exec(`SELECT ${quote(value)}::payload`)).rejects.toMatchObject({
        code: '2200M',
      })
      await expect(pg.exec("SELECT '1.25'::amount")).rejects.toMatchObject({ code: '23514' })
      contexts.push(k.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'payload'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)
