import type { PGlite } from '@electric-sql/pglite'
import type { FloatType } from '../../../src/sql-semantics/expressions.js'

export type SqlObservation =
  | { kind: 'null' }
  | { kind: 'value'; value: string }
  | { kind: 'float'; type: FloatType; value: string }
  | { kind: 'error'; code: string }

export function observeFloat(value: number, type: FloatType): SqlObservation {
  let encoded: string
  if (Number.isNaN(value)) encoded = 'NaN'
  else if (!Number.isFinite(value)) encoded = value < 0 ? '-Infinity' : 'Infinity'
  else {
    const view = new DataView(new ArrayBuffer(type === 'pg_catalog.float4' ? 4 : 8))
    if (type === 'pg_catalog.float4') view.setFloat32(0, value)
    else view.setFloat64(0, value)
    encoded = Array.from(new Uint8Array(view.buffer), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
  }
  return { kind: 'float', type, value: encoded }
}

export async function observeSql(
  pg: PGlite,
  expression: string,
  type?: string,
): Promise<SqlObservation> {
  try {
    if (type === 'pg_catalog.float4' || type === 'pg_catalog.float8') {
      const send = type === 'pg_catalog.float4' ? 'float4send' : 'float8send'
      const result = await pg.query<{ value: string | null; type: string }>(`
        SELECT pg_typeof(v)::text AS type,
          CASE WHEN v IS NULL THEN NULL
            WHEN v = 'NaN'::${type} THEN 'NaN'
            WHEN v = 'Infinity'::${type} THEN 'Infinity'
            WHEN v = '-Infinity'::${type} THEN '-Infinity'
            ELSE encode(pg_catalog.${send}(v), 'hex') END AS value
        FROM (SELECT (${expression}) AS v) observation`)
      if (result.rows.length !== 1) throw new Error('Expected one scalar observation')
      const row = result.rows[0]!
      if (row.type !== (type === 'pg_catalog.float4' ? 'real' : 'double precision'))
        throw new Error(`Unexpected SQL result type: ${row.type}`)
      return row.value === null ? { kind: 'null' } : { kind: 'float', type, value: row.value }
    }
    const result = await pg.query<{ value: string | null }>(
      type === 'pg_catalog.bpchar'
        ? `SELECT pg_catalog.convert_from(pg_catalog.bpcharsend((${expression})), 'UTF8') AS value`
        : `SELECT (${expression})::text AS value`,
    )
    if (result.rows.length !== 1) throw new Error('Expected one scalar observation')
    const value = result.rows[0]!.value
    return value === null ? { kind: 'null' } : { kind: 'value', value }
  } catch (error) {
    if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
      return { kind: 'error', code: error.code }
    }
    throw error
  }
}
