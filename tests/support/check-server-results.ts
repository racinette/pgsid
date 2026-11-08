import type { PGlite } from '@electric-sql/pglite'
import { isDeepStrictEqual } from 'node:util'

export type ServerCheckResult =
  { certain: true; value: boolean | null } | { certain: true; error: string }

// PostgreSQL's own result for each CHECK of a table on one row, given as each column's text (null
// or absent for SQL NULL), read as INSERT reads it: through the column's type, domain and typmod.
// Each constraint is evaluated alone over just the columns it reads, so a value the server cannot
// read fails only the checks that read it, as it fails them in the generated validators.
export async function serverCheckResults(
  pg: PGlite,
  table: string,
  row: Readonly<Record<string, string | null | undefined>>,
): Promise<Record<string, ServerCheckResult>> {
  const constraints = (
    await pg.query<{ name: string; expression: string; columns: string[]; types: string[] }>(
      `SELECT c.conname AS name, pg_get_expr(c.conbin, c.conrelid) AS expression,
          array(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(n, i)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS columns,
          array(SELECT format_type(a.atttypid, a.atttypmod) FROM unnest(c.conkey) WITH ORDINALITY k(n, i)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS types
        FROM pg_constraint c WHERE c.conrelid = $1::regclass AND c.contype = 'c' ORDER BY c.conname`,
      [table],
    )
  ).rows
  const results: Record<string, ServerCheckResult> = {}
  for (const { name, expression, columns, types } of constraints) {
    const inputs = columns.map(
      (column, index) => `$${index + 1}::${types[index]} AS "${column.replaceAll('"', '""')}"`,
    )
    try {
      const { rows } = await pg.query<{ result: boolean | null }>(
        `SELECT (${expression}) AS result FROM (SELECT ${inputs.join(', ') || '1'}) AS input`,
        columns.map((column) => row[column] ?? null),
      )
      results[name] = { certain: true, value: rows[0]!.result }
    } catch (error) {
      const code = (error as { code?: unknown }).code
      if (typeof code !== 'string') throw error
      results[name] = { certain: true, error: code }
    }
  }
  return results
}

// The checks whose local result differs from the server's, named with the case that showed it, so
// one assertion over every case reports each difference.
export function differingChecks(
  shown: string,
  local: Readonly<Record<string, unknown>>,
  server: Readonly<Record<string, ServerCheckResult>>,
): { shown: string; constraint: string; local: unknown; server: unknown }[] {
  return [...new Set([...Object.keys(local), ...Object.keys(server)])]
    .filter((constraint) => !isDeepStrictEqual(local[constraint], server[constraint]))
    .map((constraint) => ({
      shown,
      constraint,
      local: local[constraint],
      server: server[constraint],
    }))
}
