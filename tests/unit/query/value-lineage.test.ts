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

const literal = (resolvedType: string | null): ValueLineage => ({ kind: 'literal', resolvedType })

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
  syntax: 'operator' | 'subscript',
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
        [literal('integer'), operation('*', [literal('integer'), literal('integer')], 'integer')],
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
  'function-wrapper': [
    {
      name: 'actor_name',
      value: {
        kind: 'transform',
        operation: { kind: 'function', function: { name: 'lower' } },
        inputs: [
          jsonAccess(
            ['actor', 'name'],
            'text',
            'operator',
            column('payload', 'jsonb'),
            identity('#>>', 'jsonb', 'text[]', 'text'),
          ),
        ],
        resolvedType: null,
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
      const parsed = await parseSql(sql)
      const statement = parsed.stmts?.[0]?.stmt
      expect(statement).toBeDefined()
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
          inputs: [column('payload', 'jsonb'), literal(null)],
        },
      ],
    })
  })
})
