import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  oidAliasTypes,
  storedOidAliasZero,
} from '../../../src/catalog/oid-alias-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

it('captures only invalid-object sentinels across relocated alias identities and native Datum layouts', () => {
  for (const type of oidAliasTypes)
    for (const byteOrder of ['little', 'big'] as const)
      for (const width of [4, 8])
        for (const id of [41001, 51001])
          for (const word of [0, 1, 2147483648, 4294967295]) {
            const bytes = Buffer.alloc(width, 165)
            if (byteOrder === 'little') bytes.writeUInt32LE(word)
            else bytes.writeUInt32BE(word, width - 4)
            const node: Tree = {
              kind: 'CONST',
              fields: {
                consttype: [String(id)],
                constcollid: ['0'],
                constbyval: ['true'],
                constisnull: ['false'],
                constlen: ['4'],
                constvalue: ['4', [...bytes].map((b) => String(b > 127 ? b - 256 : b))],
              },
            }
            expect(storedOidAliasZero(node, type, byteOrder)).toBe(word === 0 ? type : undefined)
            expect(
              storedRowExpression(node, {
                types: new Map([[id, type]]),
                functions: new Map(),
                columns: new Map(),
                byteOrder,
              }),
            ).toEqual(word === 0 ? { PgsidStoredOidAliasZero: type } : undefined)
            node.fields.constbyval = ['false']
            expect(storedOidAliasZero(node, type, byteOrder)).toBeUndefined()
            node.fields.constisnull = ['true']
            expect(storedOidAliasZero(node, type, byteOrder)).toBeNull()
          }
})
it('captures nested zero aliases independently of catalog allocation and later domain validation while excluding object IDs', async () => {
  const contexts: unknown[][] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE TABLE reference(n int);CREATE DOMAIN saved_alias AS regclass CHECK(VALUE::oid=0);
        CREATE TYPE payload AS(value saved_alias,roles regrole[],old int);CREATE TYPE omitted AS(n int,old payload[]);
        CREATE TABLE history(n int,CHECK(ROW(n,'{"(-,\\"{0,NULL}\\",1)",NULL}'::payload[])::omitted IS NOT NULL));
        CREATE TABLE plain(n int,CHECK('0'::regclass::oid=n));
        CREATE TYPE excluded AS(n int,old regclass);
        CREATE TABLE symbolic(n int,CHECK(ROW(n,'reference'::regclass)::excluded IS NOT NULL));
        ALTER TYPE omitted DROP ATTRIBUTE old;ALTER TYPE excluded DROP ATTRIBUTE old;
        ALTER DOMAIN saved_alias ADD CHECK(VALUE::oid<>0) NOT VALID;ALTER TYPE payload DROP ATTRIBUTE old;`)
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
        expect(g.evaluatorSource).toContain('make_oid_value(0i64)')
        expect(g.evaluatorSource).not.toContain('oid_alias_from_text(')
        out.push(k.rowCoercionContext)
      }
      const t = c.tables.find((t) => t.name === 'symbolic')!,
        id = (await pg.query<{ id: number }>("SELECT 'reference'::regclass::oid id")).rows[0]!.id
      expect(t.constraints[0]!.rowCoercionContext?.complete).toBe(false)
      expect(JSON.stringify(t.constraints[0]!.rowCoercionContext)).not.toContain(`"value":"${id}"`)
      await pg.exec('INSERT INTO history VALUES(1);INSERT INTO plain VALUES(0)')
      await expect(pg.exec('INSERT INTO history VALUES(NULL)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(out)
      ids.push(id)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30000)

it('rejects forged stored alias payloads before generating evaluators', () => {
  for (const type of [...oidAliasTypes, 'pg_catalog.oid'] as const)
    for (const value of ['1', '4294967295', null]) {
      const group = prepareCheckRustGroup([
        {
          identity: { schema: 'public', kind: 'table', owner: 'forged', constraint: 'value' },
          expression: {
            kind: 'eval-scalar',
            expression: {
              kind: 'null-test',
              type: 'pg_catalog.bool',
              negated: true,
              operand: { kind: 'certain', expression: { kind: 'oid', type, value, stored: true } },
            },
          },
        },
      ])
      expect(group.checks[0]!.kind).toBe('unsupported')
    }
})
