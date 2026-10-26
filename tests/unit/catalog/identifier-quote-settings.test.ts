import { expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'

it('captures identical logical identities with minimal quoting and restores the caller setting after success and failure', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TYPE "Odd Type" AS ENUM('A');CREATE TABLE "Odd Table"(entry "Odd Type",source text,CHECK(quote_ident(source) IS NOT NULL))`,
    )
    const ordinary = await snapshotCatalog(pg)
    await pg.exec('SET quote_all_identifiers=on')
    const forced = await snapshotCatalog(pg)
    expect(forced).toEqual(ordinary)
    expect(
      (await pg.query<{ quote_all_identifiers: string }>('SHOW quote_all_identifiers')).rows[0]!
        .quote_all_identifiers,
    ).toBe('on')
    const original = pg.query.bind(pg),
      spy = vi
        .spyOn(pg, 'query')
        .mockImplementationOnce(original)
        .mockImplementationOnce(original)
        .mockRejectedValueOnce(new Error('catalog read failed'))
    await expect(snapshotCatalog(pg)).rejects.toThrow('catalog read failed')
    spy.mockRestore()
    expect(
      (await pg.query<{ quote_all_identifiers: string }>('SHOW quote_all_identifiers')).rows[0]!
        .quote_all_identifiers,
    ).toBe('on')
  } finally {
    await pg.close()
  }
}, 30000)
