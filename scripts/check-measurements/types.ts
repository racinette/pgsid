import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { verifiedCatalog } from './catalog.js'
import { bindProbe, valueRepresentation } from './probes.js'
import { writeReport } from './worlds.js'

export async function measureTypes(pg: PGlite) {
  const catalog = await verifiedCatalog(pg)
  const types = await pg.query<{
    identity: string
    display: string
    kind: string
    category: string
    element: string | null
  }>(`SELECT quote_ident(n.nspname) || '.' || quote_ident(t.typname) AS identity,
    format_type(t.oid, NULL) AS display, t.typtype AS kind, t.typcategory AS category,
    CASE WHEN t.typelem <> 0 THEN format_type(t.typelem, NULL) END AS element
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'pg_catalog' ORDER BY 1`)
  const rows = types.rows.map((type) => {
    const columns = [
      {
        name: 'value',
        typeName: type.identity,
        collationIsC: true,
        collationDeterministic: true,
        collationIsDefault: false,
      },
    ]
    return {
      ...type,
      representation: valueRepresentation(type.identity),
      probes: Object.fromEntries(
        ['value IS NULL', 'value = value'].map((sql) => [sql, bindProbe(sql, columns)]),
      ),
    }
  })
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
      nullnessBound: count((row) => row.probes['value IS NULL']!.fullyBound),
      equalityPrepared: count(
        (row) =>
          row.probes['value = value']!.fullyBound &&
          row.probes['value = value']!.preparation.kind === 'supported',
      ),
    },
    types: rows,
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
