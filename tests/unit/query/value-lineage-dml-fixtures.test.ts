import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { basename, join } from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import { parseSql } from '../../../src/ast.js'

const fixtureRoot = join(__dirname, 'value-lineage')
const fixtureDir = join(fixtureRoot, 'dml')

interface FixtureContract {
  root: 'SelectStmt' | 'InsertStmt' | 'UpdateStmt' | 'DeleteStmt' | 'MergeStmt'
  output: string[]
  contains: string[]
  containsFields?: string[]
}

const contracts: Record<string, FixtureContract> = {
  'delete-using-returning': {
    root: 'DeleteStmt',
    output: ['removed_id', 'replacement_id', 'reason'],
    contains: ['DeleteStmt', 'ReturningOption'],
    containsFields: ['usingClause', 'returningClause', 'options'],
  },
  'dml-cte-chain': {
    root: 'SelectStmt',
    output: ['event_id', 'previous_actor_id', 'current_actor_id'],
    contains: ['SelectStmt', 'UpdateStmt', 'InsertStmt', 'CommonTableExpr', 'ReturningOption'],
    containsFields: ['withClause', 'ctequery', 'returningClause', 'options'],
  },
  'insert-select-returning': {
    root: 'InsertStmt',
    output: ['previous_id', 'inserted_id', 'fallback_id', 'inserted_key'],
    contains: ['InsertStmt', 'SelectStmt', 'CommonTableExpr', 'ReturningOption'],
    containsFields: ['withClause', 'selectStmt', 'returningClause', 'options'],
  },
  'insert-row-image-stars': {
    root: 'InsertStmt',
    output: [
      'id',
      'payload',
      'fallback_payload',
      'archived_payload',
      'archived',
      'key',
      'id',
      'payload',
      'fallback_payload',
      'archived_payload',
      'archived',
      'key',
    ],
    contains: ['InsertStmt', 'ReturningOption', 'A_Star'],
    containsFields: ['valuesLists', 'returningClause', 'options'],
  },
  'insert-values-returning': {
    root: 'InsertStmt',
    output: ['id', 'kind', 'actor_id', 'fallback_id'],
    contains: ['InsertStmt', 'SelectStmt', 'List'],
    containsFields: ['valuesLists', 'returningClause'],
  },
  'merge-returning': {
    root: 'MergeStmt',
    output: ['action', 'previous_actor_id', 'current_actor_id', 'source_patch_id'],
    contains: ['MergeStmt', 'MergeWhenClause', 'ReturningOption'],
    containsFields: ['sourceRelation', 'mergeWhenClauses', 'returningClause', 'options'],
  },
  'merge-returning-star': {
    root: 'MergeStmt',
    output: [
      'patch_id',
      'event_id',
      'payload',
      'key',
      'should_delete',
      'id',
      'payload',
      'fallback_payload',
      'archived_payload',
      'archived',
      'key',
    ],
    contains: ['MergeStmt', 'MergeWhenClause', 'A_Star'],
    containsFields: ['sourceRelation', 'mergeWhenClauses', 'returningClause'],
  },
  'update-from-returning': {
    root: 'UpdateStmt',
    output: ['previous_actor_id', 'current_actor_id', 'fallback_id', 'patch_id'],
    contains: ['UpdateStmt', 'ReturningOption'],
    containsFields: ['fromClause', 'targetList', 'returningClause', 'options'],
  },
  'update-multiassign-returning': {
    root: 'UpdateStmt',
    output: [
      'previous_payload_id',
      'previous_fallback_id',
      'current_payload_id',
      'current_fallback_id',
    ],
    contains: ['UpdateStmt', 'MultiAssignRef', 'ReturningOption'],
    containsFields: ['targetList', 'returningClause', 'options'],
  },
  'upsert-returning': {
    root: 'InsertStmt',
    output: ['previous_id', 'current_actor_id', 'fallback_actor_id'],
    contains: ['InsertStmt', 'ReturningOption'],
    containsFields: ['onConflictClause', 'infer', 'targetList', 'returningClause', 'options'],
  },
}

const taggedTypes = (value: unknown, output: Set<string>): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => taggedTypes(item, output))
    return
  }
  if (value === null || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length === 1 && /^[A-Z]/.test(keys[0] ?? '')) output.add(keys[0]!)
  Object.values(record).forEach((item) => taggedTypes(item, output))
}

const fieldNames = (value: unknown, output: Set<string>): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => fieldNames(item, output))
    return
  }
  if (value === null || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  Object.keys(record).forEach((key) => output.add(key))
  Object.values(record).forEach((item) => fieldNames(item, output))
}

describe('value-lineage DML fixture contracts', () => {
  let pg: PGlite

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(readFileSync(join(fixtureRoot, 'schema.sql'), 'utf8'))
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  const fixtureNames = readdirSync(fixtureDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => basename(name, '.sql'))
    .sort()

  it('keeps the fixture directory and contracts in lockstep', () => {
    expect(fixtureNames).toEqual(Object.keys(contracts).sort())
  })

  for (const name of fixtureNames) {
    it(`pins the PostgreSQL shape of ${name}`, async () => {
      const sql = readFileSync(join(fixtureDir, `${name}.sql`), 'utf8')
      const described = await pg.describeQuery(sql)
      const statement = (await parseSql(sql)).stmts?.[0]?.stmt
      const contract = contracts[name]!
      const tags = new Set<string>()
      const fields = new Set<string>()
      taggedTypes(statement, tags)
      fieldNames(statement, fields)

      expect(Object.keys(statement ?? {})).toEqual([contract.root])
      expect(described.resultFields.map((field) => field.name)).toEqual(contract.output)
      expect([...contract.contains].filter((tag) => !tags.has(tag))).toEqual([])
      expect((contract.containsFields ?? []).filter((field) => !fields.has(field))).toEqual([])
    })
  }
})
