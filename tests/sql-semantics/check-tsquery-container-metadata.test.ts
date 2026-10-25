import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../src/catalog/diff.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'

const packet = 'artifacts/goal-checks/tsquery-container-storage-active'
const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
const array = (q: string) => '{"' + q.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"}'
const record = (q: string) => '("' + q.replaceAll('\\', '\\\\').replaceAll('"', '""') + '")'

it('captures interleaved array/record defaults and detects query-tree changes hidden by equal printed defaults', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('CREATE TYPE default_query_record AS(value tsquery)')
    const create = (q: string) =>
      `CREATE OR REPLACE FUNCTION captured_container_defaults(first_arg tsquery[] DEFAULT ${quote(array(q))},separator integer DEFAULT 7,record_arg default_query_record DEFAULT ${quote(record(q))},missing_arg tsquery[] DEFAULT NULL) RETURNS TABLE(first_query tsquery,record_query tsquery) LANGUAGE SQL IMMUTABLE AS $$SELECT first_arg[1],(record_arg).value$$`
    await pg.exec(create('a & (b & c)'))
    const before = await snapshotCatalog(pg),
      fn = before.functions.find((f) => f.name === 'captured_container_defaults')!
    const first = fn.args[0]!.tsqueryConstants!,
      third = fn.args[2]!.tsqueryConstants!
    expect(first.complete).toBe(true)
    expect(third.complete).toBe(true)
    expect(first.constants).toEqual([])
    expect(first.containers).toHaveLength(1)
    expect(first.containers![0]!.storage).toEqual([
      await readTsqueryFixture(pg, 'SELECT * FROM captured_container_defaults()', 'first_query'),
    ])
    expect(third.containers![0]!.storage).toEqual([
      await readTsqueryFixture(pg, 'SELECT * FROM captured_container_defaults()', 'record_query'),
    ])
    expect(fn.args[1]!.tsqueryConstants).toBeUndefined()
    expect(fn.args[3]!.tsqueryConstants?.containers).toEqual([{ site: '', storage: null }])
    expect(fn.args.slice(4).every((a) => a.tsqueryConstants === undefined)).toBe(true)
    await pg.exec(create('(a & b) & c'))
    const after = await snapshotCatalog(pg),
      changed = after.functions.find((f) => f.name === fn.name)!
    expect(changed.args.map((a) => a.defaultExpr)).toEqual(fn.args.map((a) => a.defaultExpr))
    expect(changed.args[0]!.tsqueryConstants).not.toEqual(first)
    expect(changed.args[2]!.tsqueryConstants).not.toEqual(third)
    expect(
      diffCatalogs(before, after).modified.some((e) =>
        e.entityId.startsWith('public.captured_container_defaults('),
      ),
    ).toBe(true)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/defaults-metadata.json',
      JSON.stringify({ before: fn.args, after: changed.args }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
  }
})

it('captures portable query-container trees across independently allocated catalog identities', async () => {
  const captured: unknown[] = []
  const ids: number[] = []
  for (const displaced of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (displaced)
        await pg.exec(
          "CREATE TYPE unrelated_type AS ENUM('x');CREATE TYPE unrelated_record AS(value text)",
        )
      await pg.exec(
        `CREATE DOMAIN imported_query AS tsquery;CREATE TYPE archived_query AS(tag integer,query imported_query,options imported_query[]);CREATE TABLE captured_rows(source text,CHECK((${quote('(7,"a & (b & c)","{\\"(a & b) & c\\",NULL}")')}::archived_query).query=source::tsquery))`,
      )
      const snapshot = await snapshotCatalog(pg),
        table = snapshot.tables.find((t) => t.name === 'captured_rows')!,
        context = table.constraints[0]!.tsqueryConstants!
      expect(context.complete).toBe(true)
      expect(context.containers?.[0]!.storage).toHaveLength(2)
      expect(context.containers?.[0]!.storage?.[0]).toEqual(
        await readTsqueryFixture(pg, "SELECT 'a & (b & c)'::tsquery q", 'q'),
      )
      expect(context.containers?.[0]!.storage?.[1]).toEqual(
        await readTsqueryFixture(pg, "SELECT '(a & b) & c'::tsquery q", 'q'),
      )
      captured.push(context)
      ids.push(
        (await pg.query<{ oid: number }>("SELECT 'archived_query'::regtype::oid oid")).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(captured[0]).toEqual(captured[1])
})
