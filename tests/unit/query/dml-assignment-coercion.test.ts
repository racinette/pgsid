import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferQueryContract } from '../../../src/query/nullability-walk.js'
import { createKillableEvaluator } from './killable-evaluator.js'

const schema = `
  CREATE TABLE text_state (state varchar(1) NOT NULL, amount text,
    CHECK (CASE WHEN state = 'a' THEN amount IS NULL ELSE amount IS NOT NULL END));
  CREATE TABLE integer_state (state integer NOT NULL);
  CREATE TABLE rounded_state (state numeric(3,0) NOT NULL, amount text,
    CHECK (CASE WHEN state = 1 THEN amount IS NULL ELSE amount IS NOT NULL END));
  CREATE TABLE unicode_state (state varchar(1) NOT NULL, amount text,
    CHECK (CASE WHEN state = '😀' THEN amount IS NULL ELSE amount IS NOT NULL END));
  CREATE TABLE exact_state (state numeric NOT NULL, amount text,
    CHECK (CASE WHEN state = 9007199254740993.0 THEN amount IS NULL ELSE amount IS NOT NULL END));
`
let pg: PGlite
let evaluator: Awaited<ReturnType<typeof createKillableEvaluator>>
let catalog: Awaited<ReturnType<typeof buildNullabilityCatalog>>
const cases = [
  {
    name: 'numeric modifiers are not varchar length bounds',
    evaluate: true,
    sql: "UPDATE rounded_state SET state = '1.4' RETURNING CASE WHEN state = 1 THEN NULL ELSE 'bad' END AS result",
  },
  {
    name: 'UPDATE CHECK evidence through varchar typmod',
    evaluate: false,
    sql: "UPDATE text_state SET state = 'a ' RETURNING amount AS result",
  },
  {
    name: 'MERGE CHECK evidence through varchar typmod',
    evaluate: false,
    sql: "MERGE INTO text_state AS t USING (VALUES (1)) AS s(id) ON true WHEN MATCHED THEN UPDATE SET state = 'a ' RETURNING t.amount AS result",
  },
  {
    name: 'INSERT CASE guard through assignment coercion',
    evaluate: true,
    sql: "INSERT INTO integer_state VALUES (1.4) RETURNING CASE WHEN state = 1 THEN NULL ELSE 'nonnull' END AS result",
  },
  {
    name: 'UPDATE CASE guard through assignment coercion',
    evaluate: true,
    sql: "UPDATE integer_state SET state = 1.4 RETURNING CASE WHEN state = 1 THEN NULL ELSE 'nonnull' END AS result",
  },
  {
    name: 'MERGE CASE guard through assignment coercion',
    evaluate: true,
    sql: "MERGE INTO integer_state AS t USING (VALUES (1)) AS s(id) ON true WHEN MATCHED THEN UPDATE SET state = 1.4 RETURNING CASE WHEN t.state = 1 THEN NULL ELSE 'nonnull' END AS result",
  },
]

beforeAll(async () => {
  pg = await PGlite.create()
  await pg.exec(schema)
  await pg.exec("INSERT INTO text_state VALUES ('a', NULL); INSERT INTO integer_state VALUES (1)")
  await pg.exec(
    "INSERT INTO rounded_state VALUES (1,NULL); INSERT INTO unicode_state VALUES ('😀',NULL); INSERT INTO exact_state VALUES (9007199254740993,NULL)",
  )
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
  evaluator = await createKillableEvaluator({ schema })
})
afterAll(async () => {
  expect(evaluator.killedSql).toEqual([])
  await evaluator.close()
  await pg.close()
})

async function execute(sql: string) {
  await pg.exec('BEGIN')
  try {
    return (await pg.query<Record<string, unknown>>(sql)).rows
  } finally {
    await pg.exec('ROLLBACK')
  }
}
async function infer(sql: string, evaluate: boolean) {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!
  return inferQueryContract(stmt, catalog, evaluate ? { evaluate: evaluator.evaluate } : {})
}

for (const c of cases) {
  describe(c.name, () => {
    it('PostgreSQL returns a live NULL witness', async () => {
      expect(await execute(c.sql)).toEqual([{ result: null }])
    })
    it('must not claim that the witnessed NULL is non-null', async () => {
      const rows = await execute(c.sql)
      const output = (await infer(c.sql, c.evaluate)).outputs[0]!
      if (output.notNull) {
        for (const row of rows)
          expect(row.result, 'PostgreSQL returned NULL for a notNull claim').not.toBeNull()
      }
      expect(output.notNull).toBe(false)
    })
    it('proves the coerced result always NULL with PostgreSQL evaluation', async () => {
      expect((await infer(c.sql, true)).outputs[0]).toMatchObject({
        notNull: false,
        alwaysNull: true,
      })
    })
  })
}

it('an explicit integer cast preserves the written value in guard substitution', async () => {
  const sql =
    "UPDATE integer_state SET state = 1.4::integer RETURNING CASE WHEN state = 1 THEN NULL ELSE 'nonnull' END AS result"
  expect(await execute(sql)).toEqual([{ result: null }])
  expect((await infer(sql, true)).outputs[0]).toMatchObject({ notNull: false, alwaysNull: true })
})

it('a representable text literal keeps the positive CHECK proof', async () => {
  const sql = "UPDATE text_state SET state = 'a' RETURNING amount AS result"
  expect(await execute(sql)).toEqual([{ result: null }])
  expect((await infer(sql, false)).outputs[0]).toMatchObject({ notNull: false, alwaysNull: true })
})

it('counts a multibyte varchar literal as one PostgreSQL character', async () => {
  const sql = "UPDATE unicode_state SET state = '😀' RETURNING amount AS result"
  expect(await execute(sql)).toEqual([{ result: null }])
  expect((await infer(sql, false)).outputs[0]).toMatchObject({ notNull: false, alwaysNull: true })
})

it('applies numeric precision before CHECK entailment', async () => {
  const sql = 'UPDATE rounded_state SET state = 1.4 RETURNING amount AS result'
  expect(await execute(sql)).toEqual([{ result: null }])
  expect((await infer(sql, true)).outputs[0]).toMatchObject({ notNull: false, alwaysNull: true })
})

it('transports an exact numeric beyond JavaScript integer precision', async () => {
  const sql = 'UPDATE exact_state SET state = 9007199254740993 RETURNING amount AS result'
  const rows = await execute(sql)
  expect(rows).toEqual([{ result: null }])
  const output = (await infer(sql, true)).outputs[0]!
  if (output.notNull) {
    for (const row of rows)
      expect(row.result, 'PostgreSQL returned NULL for a notNull claim').not.toBeNull()
  }
  expect(output).toMatchObject({ notNull: false, alwaysNull: true })
})

it('keeps explicit source casts inside the assignment coercion', async () => {
  const sql =
    "UPDATE integer_state SET state = 1.4::numeric::numeric RETURNING CASE WHEN state = 1 THEN NULL ELSE 'bad' END AS result"
  expect(await execute(sql)).toEqual([{ result: null }])
  expect((await infer(sql, true)).outputs[0]).toMatchObject({ notNull: false, alwaysNull: true })
})

it('retains conservative typed evidence when evaluation fails', async () => {
  const sql = "UPDATE text_state SET state = 'a ' RETURNING amount AS result"
  expect(await execute(sql)).toEqual([{ result: null }])
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!
  const result = await inferQueryContract(stmt, catalog, {
    evaluate: async () => {
      throw new Error('probe unavailable')
    },
  })
  expect(result.outputs[0]).toMatchObject({ notNull: false })
  expect(result.outputs[0]?.alwaysNull ?? false).toBe(false)
})

it.each([null, 'not a valid type spelling'])(
  'withholds written facts without a readable target type (%s)',
  async (type) => {
    const sql =
      "UPDATE integer_state SET state = 1.4 RETURNING CASE WHEN state = 1 THEN NULL ELSE 'nonnull' END AS result"
    expect(await execute(sql)).toEqual([{ result: null }])
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!
    const result = await inferQueryContract(
      stmt,
      { ...catalog, resolveColumnTypeName: () => type },
      { evaluate: evaluator.evaluate },
    )
    if (result.outputs[0]?.notNull)
      expect(
        (await execute(sql))[0]!.result,
        'PostgreSQL returned NULL for a notNull claim',
      ).not.toBeNull()
    expect(result.outputs[0]?.notNull).toBe(false)
  },
)
