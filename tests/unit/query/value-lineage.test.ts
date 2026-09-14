import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import {
  analyzeValueLineage,
  traceValueLineage,
  type OutputValueLineage,
  type ResolvedOperatorIdentity,
  type ValueLineage,
} from '../../../src/query/value-lineage.js'

const fixtureDir = fileURLToPath(new URL('value-lineage', import.meta.url))

const column = (name: string, resolvedType: string): ValueLineage => ({
  kind: 'column',
  column: { schema: 'public', relation: 'events', column: name },
  resolvedType,
})

const literal = (
  value: string | number | boolean | null,
  resolvedType: string | null,
): ValueLineage => ({ kind: 'literal', value, resolvedType })

const identity = (
  name: string,
  leftType: string,
  rightType: string,
  resultType: string,
): ResolvedOperatorIdentity => ({
  schema: 'pg_catalog',
  name,
  leftType,
  rightType,
  resultType,
})

const operation = (name: string, inputs: ValueLineage[], resolvedType: string): ValueLineage => ({
  kind: 'transform',
  operation: {
    kind: 'operator',
    operator: { name },
    resolution: identity(name, inputs[0]!.resolvedType!, inputs[1]!.resolvedType!, resolvedType),
  },
  inputs,
  resolvedType,
})

const jsonAccess = (
  path: (string | number)[],
  result: 'json' | 'text',
  syntax: 'operator' | 'function' | 'subscript',
  input: ValueLineage = column('payload', 'jsonb'),
  operator?: ResolvedOperatorIdentity,
): ValueLineage => ({
  kind: 'transform',
  operation: {
    kind: 'json-access',
    path,
    result,
    syntax,
    ...(operator ? { operator } : {}),
  },
  inputs: [input],
  resolvedType: result === 'text' ? 'text' : input.resolvedType,
})

const expected: Record<string, OutputValueLineage[]> = {
  'operator-precedence': [
    {
      name: 'value',
      value: operation(
        '+',
        [
          literal(2, 'integer'),
          operation('*', [literal(2, 'integer'), literal(2, 'integer')], 'integer'),
        ],
        'integer',
      ),
    },
  ],
  'nested-json-access': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'json-path-and-cast': [
    {
      name: 'actor_id',
      value: {
        kind: 'transform',
        operation: { kind: 'cast', target: { schema: 'pg_catalog', name: 'int8' } },
        inputs: [
          jsonAccess(
            ['actor', 'id'],
            'text',
            'operator',
            column('payload', 'jsonb'),
            identity('#>>', 'jsonb', 'text[]', 'text'),
          ),
        ],
        resolvedType: 'bigint',
      },
    },
  ],
  'json-subscripting': [
    {
      name: 'actor_id',
      value: jsonAccess(['actor', 'id'], 'json', 'subscript'),
    },
  ],
  'json-extract-functions': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'profile', 'id'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
    {
      name: 'numeric_actor_id',
      value: {
        kind: 'transform',
        operation: { kind: 'cast', target: { schema: 'pg_catalog', name: 'int8' } },
        inputs: [jsonAccess(['actor', 'id'], 'text', 'function', column('payload', 'jsonb'))],
        resolvedType: 'bigint',
      },
    },
    {
      name: 'field_actor_id',
      value: jsonAccess(['actor', 'id'], 'text', 'function', column('payload', 'jsonb')),
    },
    {
      name: 'first_sku',
      value: jsonAccess(
        ['items', 0, 'sku'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
    {
      name: 'first_item_text',
      value: jsonAccess(['items', 0], 'text', 'function', column('payload', 'jsonb')),
    },
  ],
  'jsonpath-uninterpreted': [
    {
      name: 'actor_id',
      value: {
        kind: 'transform',
        operation: {
          kind: 'function',
          function: { name: 'jsonb_path_query_first' },
          resolution: {
            schema: 'pg_catalog',
            name: 'jsonb_path_query_first',
            argTypes: ['jsonb', 'jsonpath', 'jsonb', 'boolean'],
            resultType: 'jsonb',
            variadic: false,
          },
        },
        inputs: [column('payload', 'jsonb'), literal('$.actor.id', null)],
        resolvedType: 'jsonb',
      },
    },
  ],
  'cte-reexport': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  choices: [
    {
      name: 'available_payload',
      value: {
        kind: 'transform',
        operation: { kind: 'choice', form: 'coalesce' },
        inputs: [column('payload', 'jsonb'), column('fallback_payload', 'jsonb')],
        resolvedType: 'jsonb',
      },
    },
    {
      name: 'selected_payload',
      value: {
        kind: 'transform',
        operation: { kind: 'choice', form: 'case' },
        inputs: [column('archived_payload', 'jsonb'), column('payload', 'jsonb')],
        resolvedType: 'jsonb',
      },
    },
  ],
  'dynamic-json-path': [
    {
      name: 'selected_value',
      value: operation('->', [column('payload', 'jsonb'), column('key', 'text')], 'jsonb'),
    },
  ],
  'deep-cte-chain': [
    {
      name: 'actor_id',
      value: {
        kind: 'transform',
        operation: { kind: 'cast', target: { schema: 'pg_catalog', name: 'int8' } },
        inputs: [
          jsonAccess(
            ['actor', 'id'],
            'text',
            'operator',
            column('payload', 'jsonb'),
            identity('->>', 'jsonb', 'text', 'text'),
          ),
        ],
        resolvedType: 'bigint',
      },
    },
  ],
  'nested-derived-tables': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'nested-with-scope': [
    {
      name: 'actor_name',
      value: jsonAccess(
        ['actor', 'profile', 'name'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'cte-alias-choice': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        {
          kind: 'transform',
          operation: { kind: 'choice', form: 'coalesce' },
          inputs: [column('payload', 'jsonb'), column('fallback_payload', 'jsonb')],
          resolvedType: 'jsonb',
        },
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'cte-shadowing': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['id'],
        'text',
        'operator',
        column('fallback_payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'cte-set-operation': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        {
          kind: 'transform',
          operation: { kind: 'choice', form: 'union' },
          inputs: [column('payload', 'jsonb'), column('fallback_payload', 'jsonb')],
          resolvedType: 'jsonb',
        },
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'lateral-correlated': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'scalar-subquery': [
    {
      name: 'actor_id',
      value: jsonAccess(
        ['actor', 'id'],
        'text',
        'operator',
        column('payload', 'jsonb'),
        identity('->>', 'jsonb', 'text', 'text'),
      ),
    },
  ],
  'function-wrapper': [
    {
      name: 'actor_name',
      value: {
        kind: 'transform',
        operation: {
          kind: 'function',
          function: { name: 'lower' },
          resolution: {
            schema: 'pg_catalog',
            name: 'lower',
            argTypes: ['text'],
            resultType: 'text',
            variadic: false,
          },
        },
        inputs: [
          jsonAccess(
            ['actor', 'name'],
            'text',
            'operator',
            column('payload', 'jsonb'),
            identity('#>>', 'jsonb', 'text[]', 'text'),
          ),
        ],
        resolvedType: 'text',
      },
    },
  ],
  'opaque-wrapper': [
    {
      name: 'payload_missing',
      value: {
        kind: 'transform',
        operation: { kind: 'opaque', nodeType: 'NullTest' },
        inputs: [column('payload', 'jsonb')],
        resolvedType: null,
      },
    },
  ],
}

describe('value lineage', () => {
  let pg: PGlite
  let catalog: Awaited<ReturnType<typeof buildNullabilityCatalog>>
  let shadowingCatalog: Awaited<ReturnType<typeof buildNullabilityCatalog>>

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(readFileSync(join(fixtureDir, 'schema.sql'), 'utf8'))
    const snapshot = await snapshotCatalog(pg)
    catalog = await buildNullabilityCatalog(snapshot, { searchPath: ['public'] })
    shadowingCatalog = await buildNullabilityCatalog(snapshot, {
      searchPath: ['public', 'pg_catalog'],
    })
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  const fixtureNames = readdirSync(fixtureDir)
    .filter((name) => name.endsWith('.sql') && name !== 'schema.sql')
    .map((name) => basename(name, '.sql'))
    .sort()

  it('keeps the corpus and its independently written contracts in lockstep', () => {
    expect(fixtureNames).toEqual(Object.keys(expected).sort())
  })

  for (const name of fixtureNames) {
    it(`preserves ${name}`, async () => {
      const sql = readFileSync(join(fixtureDir, `${name}.sql`), 'utf8')
      const described = await pg.describeQuery(sql)
      const parsed = await parseSql(sql)
      const statement = parsed.stmts?.[0]?.stmt
      expect(statement).toBeDefined()
      expect(described.resultFields.map((field) => field.name)).toEqual(
        expected[name]!.map((output) => output.name),
      )
      expect(analyzeValueLineage(statement!, catalog)).toEqual(expected[name])
    })
  }

  it('does not call a same-spelled user operator JSON access', async () => {
    const sql = readFileSync(join(fixtureDir, 'nested-json-access.sql'), 'utf8')
    const statement = (await parseSql(sql)).stmts![0]!.stmt!
    const output = analyzeValueLineage(statement, shadowingCatalog)[0]!.value

    expect(output).toMatchObject({
      operation: { kind: 'json-access', path: ['id'], result: 'text' },
      inputs: [
        {
          operation: {
            kind: 'operator',
            resolution: { schema: 'public', name: '->', resultType: 'jsonb' },
          },
          inputs: [column('payload', 'jsonb'), literal('actor', null)],
        },
      ],
    })
  })

  it('traces nested JSON operators as the calls that were written', async () => {
    const sql = readFileSync(join(fixtureDir, 'nested-json-access.sql'), 'utf8')
    const statement = (await parseSql(sql)).stmts![0]!.stmt!

    expect(traceValueLineage(statement, catalog)[0]!.value).toMatchObject({
      operation: {
        kind: 'operator',
        operator: { name: '->>' },
        resolution: { schema: 'pg_catalog', name: '->>' },
      },
      inputs: [
        {
          operation: {
            kind: 'operator',
            operator: { name: '->' },
            resolution: { schema: 'pg_catalog', name: '->' },
          },
          inputs: [column('payload', 'jsonb'), literal('actor', null)],
        },
        literal('id', null),
      ],
    })
  })

  it('traces extraction functions before interpreting their paths', async () => {
    const sql = readFileSync(join(fixtureDir, 'json-extract-functions.sql'), 'utf8')
    const statement = (await parseSql(sql)).stmts![0]!.stmt!
    const outputs = traceValueLineage(statement, catalog)

    expect(outputs[0]!.value).toMatchObject({
      operation: { kind: 'operator', operator: { name: '->>' } },
      inputs: [
        {
          operation: {
            kind: 'function',
            function: { name: 'jsonb_extract_path' },
            resolution: { schema: 'pg_catalog', name: 'jsonb_extract_path', variadic: true },
          },
          inputs: [column('payload', 'jsonb'), literal('actor', null), literal('profile', null)],
        },
        literal('id', null),
      ],
    })
  })

  it('traces JSON subscripts and their individual index expressions', async () => {
    const sql = readFileSync(join(fixtureDir, 'json-subscripting.sql'), 'utf8')
    const statement = (await parseSql(sql)).stmts![0]!.stmt!

    expect(traceValueLineage(statement, catalog)[0]!.value).toEqual({
      kind: 'transform',
      operation: { kind: 'subscript' },
      inputs: [column('payload', 'jsonb'), literal('actor', null), literal('id', null)],
      resolvedType: 'jsonb',
    })
  })

  it('does not interpret a shadowing extraction function as pg_catalog JSON access', async () => {
    const sql = readFileSync(join(fixtureDir, 'json-extract-functions.sql'), 'utf8')
    const statement = (await parseSql(sql)).stmts![0]!.stmt!
    const value = analyzeValueLineage(statement, shadowingCatalog)[0]!.value

    expect(value).toMatchObject({
      operation: { kind: 'json-access', path: ['id'], result: 'text' },
      inputs: [
        {
          operation: {
            kind: 'function',
            resolution: { schema: 'public', name: 'jsonb_extract_path' },
          },
        },
      ],
    })
  })
})
