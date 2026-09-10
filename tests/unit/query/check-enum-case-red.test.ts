import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferNullability } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

const DDL = `
  CREATE TYPE member_state AS ENUM ('active', 'suspended', 'expired');
  CREATE TABLE enum_member (
    state member_state NOT NULL,
    suspended_on date,
    CHECK (CASE state
      WHEN 'active' THEN suspended_on IS NULL
      WHEN 'suspended' THEN suspended_on IS NOT NULL
      WHEN 'expired' THEN true
      ELSE NULL
    END)
  );
`

let pg: PGlite
let catalog: NullabilityCatalog

beforeAll(async () => {
  pg = await PGlite.create()
  await pg.exec(DDL)
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
})

afterAll(async () => {
  if (!pg.closed) await pg.close()
})

async function notNullFor(state: string, evaluate = true): Promise<boolean> {
  const parsed = await parseSql(`SELECT suspended_on FROM enum_member WHERE state = '${state}'`)
  const run = async (sql: string) => (await pg.query<Record<string, unknown>>(sql)).rows[0]
  const outputs = await inferNullability(
    parsed.stmts![0]!.stmt!,
    catalog,
    evaluate ? { evaluate: run } : undefined,
  )
  return outputs[0]!.notNull
}

describe('simple CHECK CASE selected by an enum', () => {
  it('rejects a NULL required by the selected enum arm', async () => {
    expect(catalog.resolveLiteralDistinctnessSound('public', 'enum_member', 'state')).toBe(true)
    await expect(
      pg.exec(`INSERT INTO enum_member (state, suspended_on) VALUES ('suspended', NULL)`),
    ).rejects.toThrow(/check constraint/)
    expect(await notNullFor('suspended')).toBe(true)
    expect(await notNullFor('suspended', false)).toBe(true)
  })

  it('does not transfer the requirement to another enum arm', async () => {
    await expect(
      pg.exec(`INSERT INTO enum_member (state, suspended_on) VALUES ('expired', NULL)`),
    ).resolves.toBeDefined()
    expect(await notNullFor('expired')).toBe(false)
  })
})
