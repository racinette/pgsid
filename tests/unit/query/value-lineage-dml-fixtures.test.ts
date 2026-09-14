import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { basename, join } from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import {
  analyzeValueLineage,
  traceValueLineage,
  type OutputValueLineage,
  type ValueLineage,
} from '../../../src/query/value-lineage.js'

const fixtureRoot = join(__dirname, 'value-lineage')
const fixtureDir = join(fixtureRoot, 'dml')

interface FixtureContract {
  root: 'SelectStmt' | 'InsertStmt' | 'UpdateStmt' | 'DeleteStmt' | 'MergeStmt'
  output: string[]
  contains: string[]
  containsFields?: string[]
  params?: string[]
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
  'insert-defaults-generated-returning': {
    root: 'InsertStmt',
    output: ['id', 'kind', 'derived_id', 'label'],
    contains: ['InsertStmt', 'SetToDefault'],
    containsFields: ['valuesLists', 'returningClause'],
  },
  'insert-parameters-returning': {
    root: 'InsertStmt',
    output: ['id', 'actor_id', 'key'],
    contains: ['InsertStmt', 'ParamRef', 'ReturningOption'],
    containsFields: ['valuesLists', 'returningClause', 'options'],
    params: ['bigint', 'jsonb', 'text'],
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
  'update-parameters-returning': {
    root: 'UpdateStmt',
    output: ['previous_actor_id', 'current_actor_id', 'fallback_actor_id', 'key'],
    contains: ['UpdateStmt', 'ParamRef', 'ReturningOption'],
    containsFields: ['targetList', 'whereClause', 'returningClause', 'options'],
    params: ['jsonb', 'jsonb', 'text', 'bigint'],
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
  let catalog: Awaited<ReturnType<typeof buildNullabilityCatalog>>

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(readFileSync(join(fixtureRoot, 'schema.sql'), 'utf8'))
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ['public'] })
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  const fixtureNames = readdirSync(fixtureDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => basename(name, '.sql'))
    .sort()

  const lineage = async (
    name: string,
  ): Promise<{ raw: OutputValueLineage[]; semantic: OutputValueLineage[] }> => {
    const sql = readFileSync(join(fixtureDir, `${name}.sql`), 'utf8')
    const described = await pg.describeQuery(sql)
    const statement = (await parseSql(sql)).stmts?.[0]?.stmt
    const parameterTypes = await Promise.all(
      described.queryParams.map(async (parameter) => {
        const result = await pg.query<{ name: string }>(
          'SELECT format_type($1::oid, NULL) AS name',
          [parameter.dataTypeID],
        )
        return result.rows[0]!.name
      }),
    )
    const options = { parameterTypes }
    return {
      raw: traceValueLineage(statement!, catalog, options),
      semantic: analyzeValueLineage(statement!, catalog, options),
    }
  }

  const output = (values: OutputValueLineage[], name: string): ValueLineage =>
    values.find((candidate) => candidate.name === name)!.value

  const input = (value: ValueLineage, index = 0): ValueLineage => {
    expect(value.kind).toBe('transform')
    return value.kind === 'transform' ? value.inputs[index]! : value
  }

  const descendants = (value: ValueLineage): ValueLineage[] => [
    value,
    ...(value.kind === 'transform'
      ? value.inputs.flatMap(descendants)
      : value.kind === 'row-absence'
        ? descendants(value.origin)
        : []),
  ]

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
      const parameterTypes = await Promise.all(
        described.queryParams.map(async (parameter) => {
          const result = await pg.query<{ name: string }>(
            'SELECT format_type($1::oid, NULL) AS name',
            [parameter.dataTypeID],
          )
          return result.rows[0]!.name
        }),
      )
      expect(parameterTypes).toEqual(contract.params ?? [])
      expect([...contract.contains].filter((tag) => !tags.has(tag))).toEqual([])
      expect((contract.containsFields ?? []).filter((field) => !fields.has(field))).toEqual([])

      const options = { parameterTypes }
      const raw = traceValueLineage(statement!, catalog, options)
      const semantic = analyzeValueLineage(statement!, catalog, options)
      expect(raw.map((output) => output.name)).toEqual(contract.output)
      expect(semantic.map((output) => output.name)).toEqual(contract.output)
    })
  }

  it('keeps raw calls while the semantic pass interprets JSON access across assignments', async () => {
    const { raw, semantic } = await lineage('update-from-returning')
    expect(output(raw, 'current_actor_id')).toMatchObject({
      operation: { kind: 'operator', operator: { name: '#>>' } },
      inputs: [
        {
          operation: {
            kind: 'assignment',
            target: { relation: 'events', column: 'payload' },
            source: 'update',
          },
          inputs: [
            {
              operation: { kind: 'function', function: { name: 'jsonb_set' } },
              inputs: [
                { kind: 'column', column: { relation: 'events', column: 'payload' } },
                { kind: 'literal', value: '{actor,id}' },
                {
                  operation: { kind: 'operator', operator: { name: '->' } },
                  inputs: [
                    { kind: 'column', column: { relation: 'event_patches', column: 'payload' } },
                    { kind: 'literal', value: 'replacement' },
                  ],
                },
              ],
            },
          ],
        },
        { kind: 'literal', value: '{actor,id}' },
      ],
    })
    expect(output(semantic, 'current_actor_id')).toMatchObject({
      operation: { kind: 'json-access', path: ['actor', 'id'], result: 'text' },
      inputs: [{ operation: { kind: 'assignment', source: 'update' } }],
    })
  })

  it('evaluates every multi-assignment right-hand side against OLD', async () => {
    const { semantic } = await lineage('update-multiassign-returning')
    const payloadAssignment = input(output(semantic, 'current_payload_id'))
    const fallbackAssignment = input(output(semantic, 'current_fallback_id'))
    expect(payloadAssignment).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'payload' }, source: 'update' },
      inputs: [{ kind: 'column', column: { column: 'fallback_payload' } }],
    })
    expect(fallbackAssignment).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'fallback_payload' }, source: 'update' },
      inputs: [{ kind: 'column', column: { column: 'payload' } }],
    })
  })

  it('does not reverse DELETE OLD and absent NEW images', async () => {
    const { semantic } = await lineage('delete-using-returning')
    expect(input(output(semantic, 'removed_id'))).toMatchObject({
      kind: 'column',
      column: { relation: 'events', column: 'payload' },
    })
    expect(input(output(semantic, 'replacement_id'))).toMatchObject({
      kind: 'row-absence',
      image: 'new',
      origin: { kind: 'column', column: { relation: 'events', column: 'payload' } },
    })
    expect(input(output(semantic, 'reason'))).toMatchObject({
      kind: 'column',
      column: { relation: 'event_patches', column: 'payload' },
    })
  })

  it('retains numbered, canonically typed parameters below INSERT assignments', async () => {
    const { raw } = await lineage('insert-parameters-returning')
    expect(output(raw, 'id')).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'id' }, source: 'insert' },
      inputs: [{ kind: 'parameter', number: 1, resolvedType: 'bigint' }],
    })
    expect(input(output(raw, 'actor_id'))).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'payload' }, source: 'insert' },
      inputs: [
        {
          operation: { kind: 'cast', target: { name: 'jsonb' } },
          inputs: [{ kind: 'parameter', number: 2, resolvedType: 'jsonb' }],
        },
      ],
    })
    expect(output(raw, 'key')).toMatchObject({
      inputs: [{ kind: 'parameter', number: 3, resolvedType: 'text' }],
    })
  })

  it('maps INSERT SELECT outputs positionally through the CTE', async () => {
    const { semantic } = await lineage('insert-select-returning')
    expect(input(output(semantic, 'previous_id'))).toMatchObject({
      kind: 'row-absence',
      image: 'old',
      origin: { kind: 'column', column: { relation: 'events', column: 'payload' } },
    })
    expect(input(output(semantic, 'inserted_id'))).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'payload' }, source: 'insert' },
      inputs: [
        {
          operation: { kind: 'json-access', path: ['event'], result: 'json' },
          inputs: [{ kind: 'column', column: { relation: 'event_patches', column: 'payload' } }],
        },
      ],
    })
    expect(output(semantic, 'inserted_key')).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'key' }, source: 'insert' },
      inputs: [
        {
          operation: { kind: 'choice', form: 'coalesce' },
          inputs: [
            { kind: 'column', column: { relation: 'event_patches', column: 'key' } },
            { kind: 'literal', value: 'generated' },
          ],
        },
      ],
    })
  })

  it('expands INSERT OLD and NEW stars without losing absent columns', async () => {
    const { raw } = await lineage('insert-row-image-stars')
    expect(raw.slice(0, 6).map((entry) => entry.value)).toEqual(
      ['id', 'payload', 'fallback_payload', 'archived_payload', 'archived', 'key'].map(
        (column) => ({
          kind: 'row-absence',
          image: 'old',
          origin: {
            kind: 'column',
            column: { schema: 'public', relation: 'events', column },
            resolvedType:
              column === 'id'
                ? 'bigint'
                : column === 'archived'
                  ? 'boolean'
                  : column === 'key'
                    ? 'text'
                    : 'jsonb',
          },
          resolvedType:
            column === 'id'
              ? 'bigint'
              : column === 'archived'
                ? 'boolean'
                : column === 'key'
                  ? 'text'
                  : 'jsonb',
        }),
      ),
    )
    expect(
      raw
        .slice(6)
        .map((entry) =>
          entry.value.kind === 'transform' && entry.value.operation.kind === 'assignment'
            ? [entry.value.operation.target.column, entry.value.operation.source]
            : null,
        ),
    ).toEqual([
      ['id', 'insert'],
      ['payload', 'insert'],
      ['fallback_payload', 'default'],
      ['archived_payload', 'default'],
      ['archived', 'insert'],
      ['key', 'insert'],
    ])
  })

  it('keeps UPDATE parameters beneath their assigned NEW columns only', async () => {
    const { raw } = await lineage('update-parameters-returning')
    const parameters = raw
      .flatMap((entry) => descendants(entry.value))
      .filter(
        (value): value is Extract<ValueLineage, { kind: 'parameter' }> =>
          value.kind === 'parameter',
      )
      .map(({ number, resolvedType }) => [number, resolvedType])
    expect(parameters).toEqual([
      [1, 'jsonb'],
      [2, 'jsonb'],
      [3, 'text'],
    ])
    expect(output(raw, 'previous_actor_id')).not.toEqual(
      expect.objectContaining({ operation: expect.objectContaining({ kind: 'assignment' }) }),
    )
  })

  it('distinguishes database defaults and generated assignments', async () => {
    const { semantic } = await lineage('insert-defaults-generated-returning')
    expect(output(semantic, 'id')).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'id' }, source: 'default' },
      inputs: [{ kind: 'unknown' }],
    })
    expect(input(output(semantic, 'kind'))).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'payload' }, source: 'default' },
      inputs: [{ operation: { kind: 'cast', target: { name: 'jsonb' } } }],
    })
    expect(input(output(semantic, 'derived_id'))).toMatchObject({
      operation: {
        kind: 'assignment',
        target: { column: 'derived_payload' },
        source: 'generated',
      },
      inputs: [
        {
          operation: { kind: 'json-access', path: ['derived'], result: 'json' },
          inputs: [{ operation: { kind: 'assignment', target: { column: 'payload' } } }],
        },
      ],
    })
    expect(output(semantic, 'label')).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'label' }, source: 'default' },
    })
  })

  it('keeps every VALUES row under one target assignment', async () => {
    const { raw } = await lineage('insert-values-returning')
    expect(output(raw, 'id')).toEqual({
      kind: 'transform',
      operation: {
        kind: 'assignment',
        target: { schema: 'public', relation: 'events', column: 'id' },
        source: 'insert',
      },
      inputs: [
        {
          kind: 'transform',
          operation: { kind: 'choice', form: 'values' },
          inputs: [
            { kind: 'literal', value: 2001, resolvedType: 'integer' },
            { kind: 'literal', value: 2002, resolvedType: 'integer' },
          ],
          resolvedType: 'integer',
        },
      ],
      resolvedType: 'bigint',
    })
    expect(input(output(raw, 'fallback_id'))).toMatchObject({
      operation: { kind: 'assignment', target: { column: 'fallback_payload' }, source: 'default' },
      inputs: [{ kind: 'unknown' }],
    })
  })

  it('keeps both UPSERT paths and binds excluded to the proposed row', async () => {
    const { semantic } = await lineage('upsert-returning')
    expect(input(output(semantic, 'previous_id'))).toMatchObject({
      operation: { kind: 'choice', form: 'write-path' },
      inputs: [{ kind: 'row-absence', image: 'old' }, { kind: 'column' }],
    })
    const payloadChoice = input(output(semantic, 'current_actor_id'))
    expect(payloadChoice).toMatchObject({
      operation: { kind: 'choice', form: 'write-path' },
      inputs: [
        { operation: { kind: 'assignment', source: 'insert' } },
        {
          operation: { kind: 'assignment', source: 'update' },
          inputs: [
            {
              operation: { kind: 'operator', operator: { name: '||' } },
              inputs: [
                { operation: { kind: 'assignment', source: 'insert' } },
                { operation: { kind: 'function', function: { name: 'jsonb_build_object' } } },
              ],
            },
          ],
        },
      ],
    })
    expect(input(output(semantic, 'fallback_actor_id'))).toMatchObject({
      operation: { kind: 'choice', form: 'write-path' },
      inputs: [
        { operation: { kind: 'assignment', source: 'default' } },
        {
          operation: { kind: 'assignment', source: 'update' },
          inputs: [{ kind: 'column', column: { relation: 'events', column: 'payload' } }],
        },
      ],
    })
  })

  it('retains all producing MERGE arms and absent target/source alternatives', async () => {
    const { semantic } = await lineage('merge-returning')
    expect(input(output(semantic, 'previous_actor_id'))).toMatchObject({
      operation: { kind: 'choice', form: 'write-path' },
      inputs: [
        { kind: 'column' },
        { kind: 'column' },
        { kind: 'row-absence', image: 'old' },
        { kind: 'column' },
      ],
    })
    expect(input(output(semantic, 'current_actor_id'))).toMatchObject({
      operation: { kind: 'choice', form: 'write-path' },
      inputs: [
        { kind: 'row-absence', image: 'new' },
        { operation: { kind: 'assignment', source: 'merge' } },
        { operation: { kind: 'assignment', source: 'merge' } },
        { kind: 'column' },
      ],
    })
    expect(input(output(semantic, 'source_patch_id'))).toMatchObject({
      operation: { kind: 'choice', form: 'write-path' },
      inputs: [
        { kind: 'column' },
        { kind: 'column' },
        { kind: 'column' },
        { kind: 'row-absence', image: 'source' },
      ],
    })
  })

  it('preserves PostgreSQL MERGE star order as source then target', async () => {
    const { raw } = await lineage('merge-returning-star')
    expect(
      raw.map((entry) =>
        entry.value.kind === 'column'
          ? entry.value.column.relation
          : entry.value.kind === 'transform' && entry.value.operation.kind === 'assignment'
            ? entry.value.operation.target.relation
            : entry.value.kind,
      ),
    ).toEqual([
      'event_patches',
      'event_patches',
      'event_patches',
      'event_patches',
      'event_patches',
      'events',
      'events',
      'events',
      'events',
      'events',
      'events',
    ])
  })

  it('composes DML CTE lineage through both write boundaries', async () => {
    const { semantic } = await lineage('dml-cte-chain')
    expect(output(semantic, 'current_actor_id')).toMatchObject({
      operation: { kind: 'json-access', path: ['actor', 'id'], result: 'text' },
      inputs: [
        {
          operation: {
            kind: 'assignment',
            target: { relation: 'event_archive', column: 'after_payload' },
            source: 'insert',
          },
          inputs: [
            {
              operation: {
                kind: 'assignment',
                target: { relation: 'events', column: 'payload' },
                source: 'update',
              },
              inputs: [
                {
                  operation: { kind: 'json-access', path: ['event'], result: 'json' },
                  inputs: [
                    { kind: 'column', column: { relation: 'event_patches', column: 'payload' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  })
})
