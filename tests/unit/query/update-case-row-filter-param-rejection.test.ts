import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferQueryContract } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

const SQL = `UPDATE incidents AS i
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM readings r WHERE r.id = i.reading_id AND r.accepted
    ) THEN coalesce($1::text, $2::text)
    ELSE 'open'
  END
  WHERE i.id = $3
    AND EXISTS (
      SELECT 1 FROM readings r WHERE r.id = i.reading_id AND r.accepted
    )
  RETURNING status`

describe('UPDATE row-filtered CASE parameter rejection', () => {
  let pg: PGlite
  let catalog: NullabilityCatalog

  beforeAll(async () => {
    pg = new PGlite()
    await pg.exec(`
      CREATE TABLE readings (id int PRIMARY KEY, accepted boolean NOT NULL);
      CREATE TABLE incidents (
        id int PRIMARY KEY,
        reading_id int REFERENCES readings (id),
        status text NOT NULL
      );
      INSERT INTO readings VALUES (1, true), (2, false);
      INSERT INTO incidents VALUES (1, 1, 'open'), (2, 2, 'open');
    `)
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  async function execute(args: unknown[]): Promise<unknown[]> {
    await pg.exec('BEGIN')
    try {
      return (await pg.query(SQL, args)).rows
    } finally {
      await pg.exec('ROLLBACK')
    }
  }

  it('uses the repeated EXISTS to select the rejecting CASE arm', async () => {
    const parsed = await parseSql(SQL)
    const contract = await inferQueryContract(parsed.stmts![0]!.stmt!, catalog)

    expect(contract.params).toEqual([
      { number: 1, notNull: false },
      { number: 2, notNull: false },
      { number: 3, notNull: false },
    ])
    expect(contract.paramRejectionSets).toEqual([[1, 2]])

    await expect(execute([null, 'open', 1])).resolves.toEqual([{ status: 'open' }])
    await expect(execute(['investigating', null, 1])).resolves.toEqual([
      { status: 'investigating' },
    ])
    await expect(execute([null, null, 1])).rejects.toThrow(/null value|not-null constraint/i)
    await expect(execute([null, null, 2])).resolves.toEqual([])
  })

  it('does not select the arm from a weaker row witness', async () => {
    const weaker = SQL.replace(
      'SELECT 1 FROM readings r WHERE r.id = i.reading_id AND r.accepted\n    )\n  RETURNING status',
      'SELECT 1 FROM readings r WHERE r.id = i.reading_id\n    )\n  RETURNING status',
    )
    const parsed = await parseSql(weaker)
    const contract = await inferQueryContract(parsed.stmts![0]!.stmt!, catalog)

    expect(contract.paramRejectionSets).toEqual([])
  })

  it('does not select a syntactically repeated volatile condition', async () => {
    const volatile = `UPDATE incidents AS i
      SET status = CASE WHEN random() < 2
        THEN coalesce($1::text, $2::text) ELSE 'open' END
      WHERE i.id = $3 AND random() < 2
      RETURNING status`
    const parsed = await parseSql(volatile)
    const contract = await inferQueryContract(parsed.stmts![0]!.stmt!, catalog)

    expect(contract.paramRejectionSets).toEqual([])
  })
})
