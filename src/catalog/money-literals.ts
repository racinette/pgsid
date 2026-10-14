import { parseSync } from 'libpg-query'
import type { PGlite } from '@electric-sql/pglite'
import type { ConstraintInfo, DomainInfo, TableInfo, MoneyLiteralInfo } from './types.js'

const renderedMoneyConstants = (definition: string): string[] => {
  if (!/\bmoney\b/iu.test(definition)) return []
  let parsed: ReturnType<typeof parseSync>
  try {
    parsed = parseSync(`ALTER TABLE _pgsid_check_host ADD CONSTRAINT _pgsid_check ${definition}`)
  } catch {
    return []
  }
  const values = new Set<string>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const record = node as Record<string, unknown>
    const cast = record.TypeCast as
      | {
          typeName?: { names?: { String?: { sval?: string } }[] }
          arg?: { A_Const?: { sval?: { sval?: string } } }
        }
      | undefined
    const type = cast?.typeName?.names?.map((part) => part.String?.sval ?? '').join('.')
    const value = cast?.arg?.A_Const?.sval?.sval
    if ((type === 'money' || type === 'pg_catalog.money') && typeof value === 'string')
      values.add(value)
    for (const value of Object.values(record)) visit(value)
  }
  visit(parsed)
  return [...values].sort()
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
  const all = [...new Set([...constants.values()].flat())].sort()
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
  for (const [check, values] of constants)
    if (values.length)
      check.moneyLiterals = values.map((text): MoneyLiteralInfo => ({
        text,
        units: units.get(text)!,
      }))
}
