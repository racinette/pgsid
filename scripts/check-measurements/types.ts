import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { verifiedCatalog } from './catalog.js'
import { bindProbe, valueRepresentation } from './probes.js'
import { writeReport } from './worlds.js'

async function probeStoredColumn(pg: PGlite, typeName: string) {
  try {
    await pg.transaction(async (tx) => {
      await tx.exec(`CREATE TEMP TABLE _pgsid_measure_type (value ${typeName})`)
      await tx.rollback()
    })
    return { allowed: true as const }
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== '42P16' ||
      !('message' in error) ||
      typeof error.message !== 'string'
    )
      throw error
    return { allowed: false as const, code: error.code, message: error.message }
  }
}

export async function measureTypes(pg: PGlite) {
  const catalog = await verifiedCatalog(pg)
  const types = await pg.query<{
    identity: string
    display: string
    kind: string
    category: string
    element: string | null
    arrayElement: string | null
    isRowType: boolean
  }>(`SELECT quote_ident(n.nspname) || '.' || quote_ident(t.typname) AS identity,
    format_type(t.oid, NULL) AS display, t.typtype AS kind, t.typcategory AS category,
    CASE WHEN t.typelem <> 0 THEN format_type(t.typelem, NULL) END AS element,
    CASE WHEN e.oid IS NOT NULL THEN quote_ident(en.nspname)||'.'||quote_ident(e.typname) END AS "arrayElement",
    (t.typtype = 'c' OR (t.typtype = 'p' AND t.typname = 'record')) AS "isRowType"
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_type e ON e.oid=t.typelem AND e.typarray=t.oid
    LEFT JOIN pg_namespace en ON en.oid=e.typnamespace
    WHERE n.nspname = 'pg_catalog' ORDER BY 1`)
  const measureType = async (type: (typeof types.rows)[number]) => {
    const column = await probeStoredColumn(pg, type.identity)
    const columns = [
      {
        name: 'value',
        typeName: type.identity,
        isRowType: type.isRowType,
        collationIsC: true,
        collationDeterministic: true,
        collationIsDefault: false,
      },
    ]
    let internalInput: { accepted: boolean; code?: string; message?: string } | undefined
    if (
      (type.category === 'Z' && !valueRepresentation(type.identity).represented) ||
      type.identity === 'pg_catalog.gtsvector'
    ) {
      try {
        await pg.query(`SELECT $1::${type.identity}`, [''])
        internalInput = { accepted: true }
      } catch (error) {
        if (
          !error ||
          typeof error !== 'object' ||
          !('code' in error) ||
          typeof error.code !== 'string' ||
          !('message' in error) ||
          typeof error.message !== 'string'
        )
          throw error
        internalInput = { accepted: false, code: error.code, message: error.message }
      }
    }
    const classify = (
      current: (typeof types.rows)[number],
      seen = new Set<string>(),
    ): {
      kind: string
      role?: string
      element?: string
      elementBoundary?: string
      requirement?: string
    } => {
      if (seen.has(current.identity)) return { kind: 'unresolved-dependency' }
      seen.add(current.identity)
      if (current.kind === 'p') {
        const role =
          current.identity.startsWith('pg_catalog.any') || current.identity === 'pg_catalog."any"'
            ? 'polymorphic'
            : current.identity === 'pg_catalog.record' || current.identity === 'pg_catalog._record'
              ? 'expression-record'
              : current.identity === 'pg_catalog.unknown'
                ? 'parser-literal'
                : 'server-interface'
        return {
          kind: 'pseudo',
          role,
          requirement:
            role === 'polymorphic'
              ? 'Resolve the signature against concrete argument and result types.'
              : role === 'expression-record'
                ? 'Use an expression-owned field descriptor; there is no standalone stored-column record contract.'
                : role === 'parser-literal'
                  ? 'Resolve unknown SQL literals through their expression context; this is distinct from evaluator Unknown.'
                  : 'Parser, handler and server result interfaces are not independent portable row values.',
        }
      }
      if (current.kind === 'c')
        return {
          kind: 'captured-composite',
          requirement: 'Capture the qualified live field graph and required field representations.',
        }
      if (current.arrayElement) {
        const element = types.rows.find((t) => t.identity === current.arrayElement)
        return {
          kind: 'array',
          element: current.arrayElement,
          elementBoundary: element ? classify(element, seen).kind : 'unresolved-dependency',
        }
      }
      if (valueRepresentation(current.identity).represented) return { kind: 'represented-value' }
      if (current.category === 'Z' || current.identity === 'pg_catalog.gtsvector')
        return {
          kind: 'server-storage',
          requirement:
            'Native server storage has no admitted public text input; portable values require a separate explicit storage contract.',
        }
      return { kind: 'unimplemented-value' }
    }
    return {
      ...type,
      storedColumn: column.allowed,
      columnRejection: column.allowed ? null : { code: column.code, message: column.message },
      representation: valueRepresentation(type.identity),
      boundary: classify(type),
      ...(internalInput ? { internalInput } : {}),
      probes: !column.allowed
        ? null
        : Object.fromEntries(
            ['value IS NULL', 'value = value'].map((sql) => [sql, bindProbe(sql, columns)]),
          ),
    }
  }
  const rows: Awaited<ReturnType<typeof measureType>>[] = []
  for (const type of types.rows) rows.push(await measureType(type))
  const count = (predicate: (row: (typeof rows)[number]) => boolean) =>
    rows.filter(predicate).length
  return {
    serverVersion: catalog.serverVersion,
    scope:
      'Builtin pg_catalog census. Predefined value probes do not establish captured composite support; descriptor-dependent rows and arrays are classified separately from missing concrete value families.',
    probeContext: { textCollation: 'C' },
    summary: {
      types: rows.length,
      represented: count((row) => row.representation.represented),
      baseTypes: count((row) => row.kind === 'b'),
      pseudoTypes: count((row) => row.kind === 'p'),
      storedColumnTypes: count((row) => row.storedColumn),
      nullnessBound: count((row) => row.probes?.['value IS NULL']?.fullyBound === true),
      equalityPrepared: count(
        (row) =>
          row.probes?.['value = value']?.fullyBound === true &&
          row.probes['value = value']!.preparation.kind === 'supported',
      ),
      missingConcreteValueFamilies: count(
        (row) => row.storedColumn && row.boundary.kind === 'unimplemented-value',
      ),
      capturedCompositeTypes: count((row) => row.boundary.kind === 'captured-composite'),
      arrayTypes: count((row) => row.boundary.kind === 'array'),
      serverStorageTypes: count((row) => row.boundary.kind === 'server-storage'),
    },
    types: rows,
    rangeTypes: catalog.rangeTypes,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await PGlite.create()
  try {
    const report = await measureTypes(pg)
    await writeReport('check-type-audit', report)
    console.table(report.summary)
  } finally {
    await pg.close()
  }
}
