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
import { isJsonbBuilder } from '../../src/codegen/shared/check-rust-evaluator.js'

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
    [
      'jsonb_path_exists',
      'jsonb_path_exists_opr',
      'jsonb_path_match',
      'jsonb_path_match_opr',
      'jsonb_path_query_array',
      'jsonb_path_query_first',
    ].includes(item.name)
  )
    return [
      {
        kind: 'representation',
        requirement:
          'Execution uses original-source graphs or provably unambiguous stored JSONPath text; lossy PostgreSQL rendering cannot recover arbitrary query identity.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Order-sensitive traversal over non-ASCII object keys, non-ASCII string predicates and encoding-sensitive keyvalue object offsets require declared UTF8. ASCII predicates, proven alignment and encoding-independent terminal Boolean facts remain portable.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
      {
        kind: 'implementation',
        requirement:
          'Structural traversal, variables, arithmetic, subscript expressions, filters/current scopes, comparisons, starts-with, exists and three-valued Boolean predicates are implemented. Core type/size/abs/floor/ceiling/double methods and integer/bigint/boolean/number/decimal/string conversions are implemented. Keyvalue objects preserve document/variable/generated identities, logical offsets, signed-word wrapping, unknown-id projections and format-limit errors. Default ISO datetime/date/time/time_tz/timestamp/timestamp_tz methods retain typed intermediates, precision, original-offset rendering, comparisons and hard versus suppressible errors. Custom datetime templates and regex matching are deferred. Platform-dependent float input forms retain Unknown requirements. Stored-text inversion conservatively defers complex arithmetic/predicate accessor grouping; exact source graphs preserve query identity.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
      {
        kind: 'session',
        requirement:
          'Alphabetic datetime timezone suffixes require the session timezone and abbreviation registry. Timestamp-with-zone to time_tz conversion requires session TimeZone. Non-_tz conversions and comparisons that PostgreSQL forbids without timezone usage retain hard errors even when silent.',
        owner: 'tests/sql-semantics/check-jsonpath-execution.test.ts',
      },
    ]
  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 1 &&
    item.result === 'pg_catalog.bytea' &&
    ((item.name === 'json_send' && item.args[0] === 'pg_catalog."json"') ||
      (item.name === 'jsonb_send' && item.args[0] === 'pg_catalog.jsonb') ||
      (item.name === 'jsonpath_send' && item.args[0] === 'pg_catalog.jsonpath'))
  ) {
    const requirements = [
      {
        kind: 'session',
        setting: 'client_encoding',
        requirement:
          'Non-ASCII binary output and encoding conversion errors require client_encoding; ASCII bytes and strict NULL/error propagation remain portable. JSON preserves source text; JSONB and JSONPath send version 1 and their canonical rendering.',
        owner:
          item.name === 'jsonpath_send'
            ? 'tests/sql-semantics/check-jsonpath-sql.test.ts'
            : 'tests/sql-semantics/check-json-binary.test.ts',
      },
    ]
    if (item.name === 'jsonb_send')
      requirements.push({
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'JSONB canonical rendering inherits server_encoding requirements for ordering multiple nonempty object keys containing non-ASCII text.',
        owner: 'tests/sql-semantics/check-json-binary.test.ts',
      })
    return requirements
  }
  const builder = isJsonbBuilder(item) && item.args.length === 1
  if (
    builder ||
    (item.kind === 'function' &&
      item.schema === 'pg_catalog' &&
      item.name === 'to_jsonb' &&
      item.strict &&
      item.volatility === 's' &&
      !item.returnsSet &&
      item.args.length === 1 &&
      item.args[0] === 'pg_catalog.anyelement' &&
      item.result === 'pg_catalog.jsonb')
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement: builder
          ? 'Builder arguments share scalar JSON conversion requirements. Non-ASCII Unicode escapes and fixed JSONB container storage bounds can require server_encoding; builders admit the new container even when its inputs are existing JSONB values.'
          : 'JSON text conversion shares Unicode decoding and JSONB stored-format admission requirements. Non-ASCII Unicode escapes can require server_encoding; existing JSONB values pass through without rendering or new admission.',
        owner: builder
          ? 'tests/sql-semantics/check-jsonb-builders.test.ts'
          : 'tests/sql-semantics/check-jsonb-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'extra_float_digits',
        requirement:
          'Other floating values currently defer because rendering context is not modelled. Integers from -9 through 9, NaN and infinities are definite. Geometric output uses invariant coordinates and preserves signed zero.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'TimeZone',
        requirement:
          'Finite timestamptz conversion requires TimeZone and currently defers; SQL NULL and both infinities remain definite. Date and timestamp JSON output uses ISO formatting independently of DateStyle.',
        owner: 'tests/sql-semantics/check-jsonb-output-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'bytea_output',
        requirement:
          'Bytea conversion requires bytea_output; hex and escape produce different JSON strings even for empty bytea. SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'IntervalStyle',
        requirement:
          'Finite interval conversion requires IntervalStyle; SQL NULL, errors and both infinities remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'session',
        setting: 'lc_monetary',
        requirement:
          'Money conversion requires monetary formatting metadata from lc_monetary. SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
      {
        kind: 'database',
        setting: 'catalog',
        requirement:
          'Nonzero OID-alias rendering and non-NULL enum conversion require catalog or user-defined JSON-cast data. Supplied values do not trigger local lookup; zero alias sentinels, SQL NULL and errors remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-context-conversion.test.ts',
      },
    ]

  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.name === 'jsonb_concat' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args.every((type) => type === 'pg_catalog.jsonb') &&
    item.result === 'pg_catalog.jsonb'
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Concatenation can require server_encoding at the fixed JSONB storage limit when non-ASCII bytes or object key ordering affect result size; ordinary results inside the bound and same-kind empty-container passthroughs remain definite.',
        owner: 'tests/sql-semantics/check-jsonb-storage.test.ts',
      },
    ]

  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args.length === 2 &&
    item.args.every((type) => type === 'pg_catalog.jsonb') &&
    ['jsonb_cmp', 'jsonb_lt', 'jsonb_le', 'jsonb_gt', 'jsonb_ge'].includes(item.name)
  )
    return [
      {
        kind: 'database',
        setting: 'default_collation',
        requirement:
          'Generated JSONB ordering requires an explicit database default collation C declaration.',
        owner: 'tests/sql-semantics/check-jsonb-ordering.test.ts',
      },
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Generated JSONB ordering requires an explicit UTF8 server encoding declaration for string comparison and object key traversal.',
        owner: 'tests/sql-semantics/check-jsonb-ordering.test.ts',
      },
    ]

  if (
    item.kind === 'function' &&
    item.schema === 'pg_catalog' &&
    item.strict &&
    item.volatility === 'i' &&
    !item.returnsSet &&
    item.args[0] === 'pg_catalog.jsonb' &&
    ((item.name === 'jsonb_out' &&
      item.args.length === 1 &&
      item.result === 'pg_catalog.cstring') ||
      (item.name === 'jsonb_pretty' &&
        item.args.length === 1 &&
        item.result === 'pg_catalog.text') ||
      (item.args.length === 2 &&
        item.result === 'pg_catalog.text' &&
        ((item.name === 'jsonb_object_field_text' && item.args[1] === 'pg_catalog.text') ||
          (item.name === 'jsonb_array_element_text' && item.args[1] === 'pg_catalog.int4'))))
  )
    return [
      {
        kind: 'database',
        setting: 'server_encoding',
        requirement:
          'Text rendering of objects with multiple nonempty keys including non-ASCII keys can require server_encoding for key ordering; logical values, type inspection and SQL nullness remain portable.',
        owner:
          item.name === 'jsonb_out'
            ? 'tests/sql-semantics/check-jsonb-payload.test.ts'
            : item.name === 'jsonb_pretty'
              ? 'tests/sql-semantics/check-jsonb-format.test.ts'
              : 'tests/sql-semantics/check-jsonb-extraction.test.ts',
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
    ['textsend', 'namesend', 'json_send', 'jsonb_send', 'jsonpath_send'].includes(item.name)
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
