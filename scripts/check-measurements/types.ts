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
    isRowType: boolean
  }>(`SELECT quote_ident(n.nspname) || '.' || quote_ident(t.typname) AS identity,
    format_type(t.oid, NULL) AS display, t.typtype AS kind, t.typcategory AS category,
    CASE WHEN t.typelem <> 0 THEN format_type(t.typelem, NULL) END AS element,
    (t.typtype = 'c' OR (t.typtype = 'p' AND t.typname = 'record')) AS "isRowType"
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
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
    return {
      ...type,
      storedColumn: column.allowed,
      columnRejection: column.allowed ? null : { code: column.code, message: column.message },
      representation: valueRepresentation(type.identity),
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
