import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  storedAclitemKnowledge,
  validAclitemConstantKnowledge,
} from '../../../src/catalog/aclitem-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

it('retains privilege words and sentinel facts while erasing every nonzero role identity', () => {
  for (const byteOrder of ['little', 'big'] as const)
    for (const id of [41001, 51001])
      for (const grantee of [0, 1, 2147483648, 4294967295])
        for (const grantor of [0, 1, 2147483648, 4294967295]) {
          const bytes = Buffer.alloc(16),
            write = (n: number, at: number) =>
              byteOrder === 'little' ? bytes.writeUInt32LE(n, at) : bytes.writeUInt32BE(n, at)
          write(grantee, 0)
          write(grantor, 4)
          const mode = 4294967295n * 4294967296n + 2147483648n
          if (byteOrder === 'little') bytes.writeBigUInt64LE(mode, 8)
          else bytes.writeBigUInt64BE(mode, 8)
          const node: Tree = {
              kind: 'CONST',
              fields: {
                consttype: [String(id)],
                constlen: ['16'],
                constbyval: ['false'],
                constisnull: ['false'],
                constcollid: ['0'],
                constvalue: ['16', [...bytes].map((v) => String(v > 127 ? v - 256 : v))],
              },
            },
            expected = {
              privileges: '2147483648',
              grantOptions: '4294967295',
              publicGrantee: grantee === 0,
              invalidGrantor: grantor === 0,
            }
          expect(storedAclitemKnowledge(node, byteOrder)).toEqual(expected)
          expect(validAclitemConstantKnowledge(expected)).toBe(true)
          expect(
            storedRowExpression(node, {
              types: new Map([[id, 'pg_catalog.aclitem']]),
              functions: new Map(),
              columns: new Map(),
              byteOrder,
            }),
          ).toEqual({ PgsidStoredAclitem: expected })
          node.fields.constbyval = ['true']
          expect(storedAclitemKnowledge(node, byteOrder)).toBeUndefined()
          node.fields.constisnull = ['true']
          expect(storedAclitemKnowledge(node, byteOrder)).toBeNull()
        }
  for (const value of [
    null,
    {},
    [],
    { privileges: '01', grantOptions: '0', publicGrantee: true, invalidGrantor: false },
    { privileges: '4294967296', grantOptions: '0', publicGrantee: true, invalidGrantor: false },
    { privileges: '0', grantOptions: '0', publicGrantee: 1, invalidGrantor: false },
  ])
    expect(validAclitemConstantKnowledge(value)).toBe(false)
})
it('captures recursive stored ACL knowledge independently of role allocation and later domain checks', async () => {
  const contexts: unknown[][] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE ROLE padding;CREATE TYPE padding AS ENUM('x')")
      await pg.exec(`CREATE ROLE acl_actor;CREATE ROLE acl_issuer;CREATE DOMAIN saved_acl AS aclitem CHECK(VALUE IS NOT NULL);
      CREATE TYPE saved AS(entry saved_acl,history aclitem[],old int);CREATE TYPE omitted AS(n int,old saved[]);`)
      const text = (
        await pg.query<{ value: string }>(
          `SELECT quote_literal(ARRAY[ROW('acl_actor=r*/acl_issuer'::saved_acl,ARRAY['=r/acl_issuer'::aclitem,NULL],1)::saved,NULL]::text) value`,
        )
      ).rows[0]!.value
      await pg.exec(`CREATE TABLE history(n int,CHECK(ROW(n,${text}::saved[])::omitted IS NOT NULL));
        CREATE TABLE plain(n int,CHECK(('acl_actor=r*/acl_issuer'::aclitem IS NOT NULL)=(n>0)));
        ALTER TYPE omitted DROP ATTRIBUTE old;ALTER TYPE saved DROP ATTRIBUTE old;
        ALTER DOMAIN saved_acl ADD CHECK(VALUE IS NULL) NOT VALID;`)
      const c = await snapshotCatalog(pg),
        out: unknown[] = []
      for (const name of ['history', 'plain']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        const plan = lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!,
          group = prepareCheckRustGroup([
            {
              identity: { schema: 'public', kind: 'table', owner: name, constraint: 'stored' },
              expression: plan.expression,
            },
          ])
        expect(group.checks[0]!.kind, name).toBe('supported')
        expect(group.evaluatorSource).toContain('make_aclitem_catalog_value(')
        expect(group.evaluatorSource).not.toContain('aclitem_from_text_context(')
        out.push(k.rowCoercionContext)
      }
      await pg.exec('INSERT INTO history VALUES(1);INSERT INTO plain VALUES(1)')
      await expect(pg.exec('INSERT INTO history VALUES(NULL)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(out)
      ids.push(
        (await pg.query<{ id: number }>("SELECT oid id FROM pg_roles WHERE rolname='acl_actor'"))
          .rows[0]!.id,
      )
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30000)
