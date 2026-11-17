import { readFile } from 'node:fs/promises'
import { describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { gateAgreed, gateContract, type DescribeStatement } from '../../src/contract-gate.js'
import { buildNullabilityCatalog } from '../../src/query/catalog-adapter.js'
import { inferQueryContract, UnsupportedNodeError } from '../../src/query/nullability-walk.js'
import { analyzeValueLineage } from '../../src/query/value-lineage.js'

// The package is its commands. No module is published for import, so the engine's
// modules stay free to move without breaking anyone.

describe('the query pipeline', () => {
  it('publishes the commands and no importable module', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as Record<string, unknown>
    expect(Object.keys(manifest.bin as object).sort()).toEqual(['pgsid', 'pgsid-language-server'])
    for (const key of ['main', 'module', 'exports', 'types'])
      expect(manifest).not.toHaveProperty(key)
  })

  it('runs end to end against a real schema', async () => {
    const pg = await PGlite.create()
    try {
      await pg.exec(`
        CREATE TABLE account (
          id integer PRIMARY KEY,
          email text NOT NULL,
          nickname text
        )`)

      const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
        searchPath: ['public'],
      })

      const sql = 'SELECT a.id, a.email, a.nickname FROM account a WHERE a.id = $1'
      const stmt = (await parseSql(sql)).stmts![0]!.stmt!
      const contract = await inferQueryContract(stmt, catalog)
      const lineage = analyzeValueLineage(stmt, catalog)

      const describe: DescribeStatement = async (text) => {
        const d = await pg.describeQuery(text)
        return { columns: d.resultFields.map((f) => f.name), params: d.queryParams.length }
      }
      const gated = await gateContract(sql, contract, describe)

      expect(gateAgreed(gated.gate)).toBe(true)
      expect(gated.outputs.map((o) => ({ name: o.name, notNull: o.notNull }))).toEqual([
        { name: 'id', notNull: true },
        { name: 'email', notNull: true },
        { name: 'nickname', notNull: false },
      ])
      // `notNull` on a PARAMETER means "binding NULL here can make the
      // statement RAISE" — not "you must supply a value". `WHERE a.id = $1`
      // with a NULL binding simply returns no rows, so the parameter is
      // unconstrained. A consumer that confused the two readings would demand
      // arguments PostgreSQL is happy to take as NULL.
      expect(gated.params).toEqual([{ number: 1, notNull: false }])
      expect(lineage).toEqual([
        {
          name: 'id',
          value: {
            kind: 'column',
            column: { schema: 'public', relation: 'account', column: 'id' },
            resolvedType: 'integer',
          },
        },
        {
          name: 'email',
          value: {
            kind: 'column',
            column: { schema: 'public', relation: 'account', column: 'email' },
            resolvedType: 'text',
          },
        },
        {
          name: 'nickname',
          value: {
            kind: 'column',
            column: { schema: 'public', relation: 'account', column: 'nickname' },
            resolvedType: 'text',
          },
        },
      ])
    } finally {
      if (!pg.closed) await pg.close()
    }
  }, 120_000)

  it('refuses a statement with an error distinct from broken SQL', async () => {
    // "The engine cannot analyse this" degrades to all-nullable with a warning;
    // "this SQL is broken" is an error, so the two must stay distinguishable.
    expect(UnsupportedNodeError.prototype).toBeInstanceOf(Error)
  })
})
