import assert from 'node:assert/strict'
import type { PGlite } from '@electric-sql/pglite'
import { callableIdentity, readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import type { BuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { PG18_BUILTINS_VERSION } from '../../src/postgres/builtins/groups.generated.js'
import { PG18_BUILTIN_CASTS } from '../../src/postgres/builtins/casts.generated.js'
import { PG18_TYPE_RESOLUTION } from '../../src/postgres/builtins/type-resolution.generated.js'
import { PG18_BTREE_COMPARISONS } from '../../src/postgres/builtins/btree-comparisons.generated.js'
import { PG18_TYPE_IO } from '../../src/postgres/builtins/type-io.generated.js'
import { builtinCallables, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../../src/postgres/builtins/taxonomy.js'

export function verifyCatalog(catalog: BuiltinCatalog): void {
  assert.equal(catalog.serverVersion, PG18_BUILTINS_VERSION, 'PostgreSQL version mismatch')
  const entries = [...catalog.functions, ...catalog.operators].map(
    ({ metadata }) => [callableIdentity(metadata), metadata] as const,
  )
  assert.equal(
    new Set(entries.map(([identity]) => identity)).size,
    entries.length,
    'Duplicate callable identity',
  )
  assert.deepEqual(
    Object.fromEntries(entries),
    Object.fromEntries(builtinCallables().map((item) => [callableIdentity(item), item])),
    'Live callable metadata differs from the generated inventory',
  )
  const casts = catalog.casts.map(
    (cast) => [JSON.stringify([cast.source, cast.target]), cast] as const,
  )
  assert.equal(
    new Set(casts.map(([identity]) => identity)).size,
    casts.length,
    'Duplicate cast identity',
  )
  assert.deepEqual(
    Object.fromEntries(casts),
    PG18_BUILTIN_CASTS,
    'Live cast links differ from the generated inventory',
  )
  const types = catalog.types.map((type) => [type.identity, type] as const)
  assert.equal(
    new Set(types.map(([identity]) => identity)).size,
    types.length,
    'Duplicate type identity',
  )
  assert.deepEqual(
    Object.fromEntries(types),
    PG18_TYPE_RESOLUTION,
    'Live type resolution metadata differs from the generated inventory',
  )
  const btreeKeys = catalog.btreeComparisons.map((entry) =>
    JSON.stringify([entry.operator, entry.family, entry.strategy]),
  )
  const io = catalog.typeIO.map((entry) => [entry.identity, entry] as const)
  assert.equal(
    new Set(io.map(([identity]) => identity)).size,
    io.length,
    'Duplicate type I/O identity',
  )
  assert.deepEqual(
    Object.fromEntries(io),
    PG18_TYPE_IO,
    'Live type I/O links differ from the generated inventory',
  )
  assert.equal(new Set(btreeKeys).size, btreeKeys.length, 'Duplicate B-tree comparison')
  assert.deepEqual(
    catalog.btreeComparisons,
    PG18_BTREE_COMPARISONS,
    'Live B-tree comparison links differ from the generated inventory',
  )
}

export async function verifiedCatalog(pg: PGlite): Promise<BuiltinCatalog> {
  const catalog = await readBuiltinCatalog(pg)
  verifyCatalog(catalog)
  return catalog
}

export function jsonValueRequirements(item: BuiltinCallable) {
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.name === 'jsonb_out' &&
    item.args.length === 1 &&
    item.args[0] === 'pg_catalog.jsonb' &&
    item.result === 'pg_catalog.cstring'
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Text rendering of objects with multiple nonempty keys including non-ASCII keys can require server_encoding for key ordering; logical values, type inspection and SQL nullness remain portable.',
        owner: 'tests/sql-semantics/check-jsonb-payload.test.ts',
      },
    ]

  if (
    item.kind !== 'function' ||
    item.schema !== 'pg_catalog' ||
    !item.strict ||
    item.volatility !== 'i' ||
    item.returnsSet ||
    item.args.length !== 2 ||
    item.args[0] !== 'pg_catalog."json"'
  )
    return null
  const field =
    ['json_object_field', 'json_object_field_text'].includes(item.name) &&
    item.args[1] === 'pg_catalog.text'
  const element =
    ['json_array_element', 'json_array_element_text'].includes(item.name) &&
    item.args[1] === 'pg_catalog.int4'
  if (!(field || element) || !['pg_catalog."json"', 'pg_catalog.text'].includes(item.result))
    return null
  return [
    {
      kind: 'database',
      setting: 'server_encoding',
      requirement:
        'Whole-document extraction decodes every JSON string. Non-ASCII Unicode escapes require server_encoding; raw Unicode and ASCII escapes remain portable, and earlier definite decoding errors are preserved.',
      owner: 'tests/sql-semantics/check-json-extraction.test.ts',
    },
  ]
}

export function callableBoundary(item: BuiltinCallable, represented: ReadonlySet<string>) {
  const categories: string[] = []
  const types = [...item.args, item.result]
  if (item.kind === 'aggregate' || item.kind === 'window') categories.push(item.kind)
  if (item.returnsSet) categories.push('set-returning')
  if (types.some((type) => ['pg_catalog.internal', 'pg_catalog.cstring'].includes(type)))
    categories.push('internal-interface')
  if (item.volatility === 's') categories.push('session-or-database-state')
  if (item.volatility === 'v') categories.push('volatile')
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    ['textsend', 'namesend'].includes(item.name)
  )
    categories.push('session-setting:client_encoding')
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    ['cursor_to_xml', 'cursor_to_xmlschema'].includes(item.name)
  )
    categories.push('session-state:cursor')
  if (!item.strict) categories.push('non-strict')
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    ['pg_current_snapshot', 'txid_current_snapshot'].includes(item.name)
  )
    categories.push('transaction-state:snapshot')
  if (item.schema === 'pg_catalog' && item.name === 'quote_ident')
    categories.push('session-setting:quote_all_identifiers')
  const geometricOutput =
    item.kind === 'function' &&
    item.args.length === 1 &&
    ['point', 'line', 'lseg', 'box', 'circle', 'path', 'polygon'].some(
      (type) => item.args[0] === 'pg_catalog.' + type,
    ) &&
    builtinTypeIO(item.args[0]!)?.output === callableIdentity(item)
  if (
    (item.schema === 'pg_catalog' && ['float4out', 'float8out'].includes(item.name)) ||
    geometricOutput
  )
    categories.push('session-setting:extra_float_digits')
  if (item.schema === 'pg_catalog' && item.volatility === 's' && types.includes('pg_catalog.money'))
    categories.push('session-setting:lc_monetary')
  if (item.schema === 'pg_catalog' && ['interval_in', 'interval_out'].includes(item.name))
    categories.push('session-setting:IntervalStyle')
  if (
    item.schema === 'pg_catalog' &&
    item.name === 'age' &&
    item.args.length === 2 &&
    item.args.every((type) => type === 'pg_catalog.timestamptz')
  )
    categories.push('session-setting:TimeZone')
  const missingTypes = [...new Set(types.filter((type) => !represented.has(type)))].sort()
  if (missingTypes.length) categories.push('new-representation')
  if (!categories.length) categories.push('pure-callable-candidate')
  return { categories, missingTypes }
}
