import { parseSync } from 'libpg-query'
import type { PGlite } from '@electric-sql/pglite'
import type { ConstraintInfo, DomainInfo, TableInfo, MoneyLiteralInfo } from './types.js'

const renderedMoneyConstants = (definition: string): { scalars: string[]; arrays: string[] } => {
  if (!/\bmoney\b/iu.test(definition)) return { scalars: [], arrays: [] }
  let parsed: ReturnType<typeof parseSync>
  try {
    parsed = parseSync(`ALTER TABLE _pgsid_check_host ADD CONSTRAINT _pgsid_check ${definition}`)
  } catch {
    return { scalars: [], arrays: [] }
  }
  const values = new Set<string>()
  const arrays = new Set<string>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const record = node as Record<string, unknown>
    const cast = record.TypeCast as
      | {
          typeName?: { names?: { String?: { sval?: string } }[]; arrayBounds?: unknown[] }
          arg?: { A_Const?: { sval?: { sval?: string } } }
        }
      | undefined
    const type = cast?.typeName?.names?.map((part) => part.String?.sval ?? '').join('.')
    const value = cast?.arg?.A_Const?.sval?.sval
    if ((type === 'money' || type === 'pg_catalog.money') && typeof value === 'string')
      (cast?.typeName?.arrayBounds?.length ? arrays : values).add(value)
    for (const value of Object.values(record)) visit(value)
  }
  visit(parsed)
  return { scalars: [...values].sort(), arrays: [...arrays].sort() }
}

export async function captureMoneyLiterals(
  pg: PGlite,
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[],
): Promise<void> {
  const checks: Pick<ConstraintInfo, 'definition' | 'moneyLiterals'>[] = [
    ...tables.flatMap((table) => table.constraints.filter((c) => c.type === 'check')),
    ...domains.flatMap((domain) => domain.checks),
  ]
  const constants = new Map(
    checks.map((check) => [check, renderedMoneyConstants(check.definition)]),
  )
  const all = [...new Set([...constants.values()].flatMap((value) => value.scalars))].sort()
  const units = new Map<string, string>()
  for (const text of all) {
    const row = (
      await pg.query<{ wire: string }>(
        "SELECT encode(pg_catalog.cash_send($1::pg_catalog.money),'hex') wire",
        [text],
      )
    ).rows[0]!
    units.set(text, BigInt.asIntN(64, BigInt('0x' + row.wire)).toString())
  }
  const arrays = new Map<string, string[]>()
  for (const text of [
    ...new Set([...constants.values()].flatMap((value) => value.arrays)),
  ].sort()) {
    const rows = (
      await pg.query<{ text: string; wire: string }>(
        "SELECT item::text AS text, encode(pg_catalog.cash_send(item),'hex') AS wire FROM unnest($1::text::pg_catalog.money[]) AS decoded(item) WHERE item IS NOT NULL",
        [text],
      )
    ).rows
    arrays.set(text, [...new Set(rows.map((row) => row.text))].sort())
    for (const row of rows)
      units.set(row.text, BigInt.asIntN(64, BigInt('0x' + row.wire)).toString())
  }
  for (const [check, value] of constants) {
    const texts = [
      ...new Set([...value.scalars, ...value.arrays.flatMap((text) => arrays.get(text) ?? [])]),
    ].sort()
    if (texts.length)
      check.moneyLiterals = texts.map((text): MoneyLiteralInfo => ({
        text,
        units: units.get(text)!,
      }))
  }
}
