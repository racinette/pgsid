import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import type { BuiltinCallable } from '../../src/postgres/builtins/taxonomy.js'
import { checkRustCallableNames } from '../../src/codegen/shared/check-rust-source.js'
import { callableBoundary, verifiedCatalog } from './catalog.js'
import { valueRepresentation } from './probes.js'
import { writeReport } from './worlds.js'

const owner = 'tests/sql-semantics/check-non-strict-measurements.test.ts'
type Requirement = {
  kind: 'database' | 'expression' | 'connection' | 'statement' | 'session'
  setting: string
  requirement: string
  owner: string
}

const requirements = new Map<string, { metadata: BuiltinCallable; value: Requirement }>()
function register(
  names: readonly string[],
  args: readonly string[],
  value: Omit<Requirement, 'owner'>,
) {
  for (const name of names) {
    const identity = `function:${JSON.stringify(['pg_catalog', name])}(${args.join(',')})`
    requirements.set(identity, { metadata: builtinMetadata(identity), value: { ...value, owner } })
  }
}
register(['format_type'], ['pg_catalog.oid', 'pg_catalog.int4'], {
  kind: 'database',
  setting: 'type_catalog_and_search_path',
  requirement:
    'Full type rendering resolves deployment type identities, modifiers and namespace visibility. NULL type identifiers and zero invalid-identity sentinels are handled without catalog lookup.',
})
register(['pg_typeof'], ['pg_catalog."any"'], {
  kind: 'expression',
  setting: 'resolved_type_identity',
  requirement:
    'The result denotes the selected expression type in the deployment catalog, including NULL arguments. A portable type descriptor does not provide its numeric regtype identity.',
})
register(['pg_collation_for'], ['pg_catalog."any"'], {
  kind: 'expression',
  setting: 'resolved_collation_identity',
  requirement:
    'The result follows expression collation metadata and catalog name visibility, rather than supplied datum bytes. Noncollatable errors and known non-NULL names for resolved collations are handled; spelling still requires catalog visibility.',
})
register(
  ['satisfies_hash_partition'],
  ['pg_catalog.oid', 'pg_catalog.int4', 'pg_catalog.int4', 'pg_catalog."any"'],
  {
    kind: 'database',
    setting: 'partition_catalog',
    requirement:
      'Resolve the actual relation, hash partition key definitions, selected support callbacks and collations. Do not substitute a client hash of the supplied row.',
  },
)
register(['pg_restore_attribute_stats', 'pg_restore_relation_stats'], ['pg_catalog."any"'], {
  kind: 'database',
  setting: 'statistics_mutation',
  requirement:
    'These calls update deployment statistics under native privilege and catalog checks; they are not pure validation of supplied values.',
})
register(['pg_stat_get_archiver', 'pg_stat_get_wal', 'pg_stat_get_wal_receiver'], [], {
  kind: 'database',
  setting: 'statistics',
  requirement:
    'Read server archiver, WAL or replication receiver state. A captured record descriptor provides the result shape, not the current record contents.',
})
register(['inet_client_addr', 'inet_server_addr', 'inet_client_port', 'inet_server_port'], [], {
  kind: 'connection',
  setting: 'socket_endpoints',
  requirement:
    'Read the active server connection endpoints. Embedded-oracle endpoint values describe its own connection, not every deployment.',
})
register(['current_query'], [], {
  kind: 'statement',
  setting: 'query_text',
  requirement:
    'Return the submitted active statement text, rather than an expression or row value.',
})
for (const args of [[], ['pg_catalog.text']])
  register(['pg_current_logfile'], args, {
    kind: 'database',
    setting: 'logging_collector',
    requirement:
      'Read the active collector file under deployment EXECUTE privileges. Restricted callers can receive 42501 before format validation; authorized callers can receive 22023 for invalid formats. Neither collector contents nor caller privileges are supplied by static code-generation settings.',
  })
register(['set_config'], ['pg_catalog.text', 'pg_catalog.text', 'pg_catalog.bool'], {
  kind: 'session',
  setting: 'configuration_mutation',
  requirement:
    'Change native session or transaction configuration with setting-specific validation and privilege checks. Static code-generation settings do not perform this mutation.',
})

export function nonStrictValueRequirement(item: BuiltinCallable): Requirement | null {
  const entry = requirements.get(callableIdentity(item))
  if (!entry) return null
  const actual = item as unknown as Record<string, unknown>
  if (
    !Object.entries(entry.metadata).every(
      ([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value),
    )
  )
    return null
  return entry.value
}

const concretePolymorphicTypes = new Set([
  'pg_catalog."any"',
  'pg_catalog.anyelement',
  'pg_catalog.anyarray',
  'pg_catalog.anynonarray',
  'pg_catalog.anyenum',
  'pg_catalog.anyrange',
  'pg_catalog.anymultirange',
  'pg_catalog.anycompatible',
  'pg_catalog.anycompatiblearray',
  'pg_catalog.anycompatiblenonarray',
  'pg_catalog.anycompatiblerange',
  'pg_catalog.anycompatiblemultirange',
  'pg_catalog.record',
])
const arithmetic = new Set([
  'function:["pg_catalog","int2_sum"](pg_catalog.int8,pg_catalog.int2)',
  'function:["pg_catalog","int4_sum"](pg_catalog.int8,pg_catalog.int4)',
  'function:["pg_catalog","int8_sum"](pg_catalog."numeric",pg_catalog.int8)',
])

export async function measureNonStrict(pg: PGlite) {
  const catalog = await verifiedCatalog(pg)
  const available = checkRustCallableNames()
  const scalar = catalog.functions
    .map(({ metadata }) => metadata)
    .filter((item) => item.kind === 'function' && !item.strict && !item.returnsSet)
  const represented = new Set(
    scalar
      .flatMap((item) => [...item.args, item.result])
      .filter(
        (type) => concretePolymorphicTypes.has(type) || valueRepresentation(type).represented,
      ),
  )
  const rows = scalar.map((metadata) => {
    const identity = callableIdentity(metadata)
    const boundary = callableBoundary(metadata, represented)
    const sourcePresent = available.has(metadata.rustName)
    const requirement = nonStrictValueRequirement(metadata)
    const classification = boundary.missingTypes.length
      ? 'requires-representation-or-interface'
      : sourcePresent
        ? 'source-present-not-runtime-proof'
        : requirement
          ? 'missing-body-with-state-requirement'
          : arithmetic.has(identity)
            ? 'portable-implementation-gap'
            : 'unclassified-implementation-gap'
    return { identity, metadata, ...boundary, sourcePresent, requirement, classification }
  })
  const candidates = rows.filter((row) => row.missingTypes.length === 0)
  return {
    serverVersion: catalog.serverVersion,
    scope:
      'All non-strict, non-set-returning builtin functions. Represented signatures include concrete-resolution polymorphic and captured record roles; source presence does not prove binding or execution. State requirements describe full evaluation, not completion of recoverable partial branches.',
    summary: {
      scalarNonStrict: rows.length,
      representedSignatures: candidates.length,
      sourcePresent: candidates.filter((row) => row.sourcePresent).length,
      missingWithStateRequirements: candidates.filter(
        (row) => row.classification === 'missing-body-with-state-requirement',
      ).length,
      portableImplementationGaps: candidates.filter(
        (row) => row.classification === 'portable-implementation-gap',
      ).length,
      unclassifiedImplementationGaps: candidates.filter(
        (row) => row.classification === 'unclassified-implementation-gap',
      ).length,
    },
    callables: rows,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await PGlite.create()
  try {
    const report = await measureNonStrict(pg)
    await writeReport('check-non-strict', report)
    console.table(report.summary)
  } finally {
    await pg.close()
  }
}
