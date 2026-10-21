import { parseSync } from 'libpg-query'
import type { PGlite } from '@electric-sql/pglite'
import type {
  ConstraintInfo,
  DomainInfo,
  TableInfo,
  MoneyLiteralInfo,
  RangeTypeInfo,
} from './types.js'
import { builtinTypeIO } from '../postgres/builtins/inventory.js'
import { readLiteralFields } from './literal-fields.js'

type MoneyShape =
  { kind: 'money' } | { kind: 'range' | 'multirange' | 'array'; element: MoneyShape }
type TypeName = { names?: { String?: { sval?: string } }[]; arrayBounds?: unknown[] }
type Cast = { typeName?: TypeName; arg?: { A_Const?: { sval?: { sval?: string } } } }
const names = (type: TypeName | undefined): string[] =>
  type?.names?.map((part) => part.String?.sval ?? '') ?? []
const matches = (type: readonly string[], schema: string, name: string) =>
  type.length === 1 ? type[0] === name : type.length === 2 && type[0] === schema && type[1] === name
const parseType = (type: string): TypeName | null => {
  try {
    const parsed = parseSync(`SELECT NULL::${type}`)
    const select = parsed.stmts?.[0]?.stmt as {
      SelectStmt?: {
        targetList?: { ResTarget?: { val?: { TypeCast?: { typeName?: TypeName } } } }[]
      }
    }
    return select?.SelectStmt?.targetList?.[0]?.ResTarget?.val?.TypeCast?.typeName ?? null
  } catch {
    return null
  }
}

function moneyTypes(domains: readonly DomainInfo[], ranges: readonly RangeTypeInfo[]) {
  const cache = new Map<string, MoneyShape | null>()
  const entries = ranges.flatMap((profile) => [
    { parts: [profile.schema, profile.name], kind: 'range' as const, array: false, profile },
    {
      parts: [profile.multirangeSchema, profile.multirangeName],
      kind: 'multirange' as const,
      array: false,
      profile,
    },
    {
      parts: names(parseType(profile.array) ?? undefined),
      kind: 'range' as const,
      array: true,
      profile,
    },
    {
      parts: names(parseType(profile.multirangeArray) ?? undefined),
      kind: 'multirange' as const,
      array: true,
      profile,
    },
  ])
  const resolve = (type: TypeName, seen = new Set<string>()): MoneyShape | null => {
    const parts = names(type),
      key = JSON.stringify(parts)
    let result: MoneyShape | null
    if (cache.has(key)) result = cache.get(key)!
    else {
      if (seen.has(key)) return null
      const next = new Set(seen).add(key)
      result = matches(parts, 'pg_catalog', 'money') ? { kind: 'money' } : null
      if (!result && matches(parts, 'pg_catalog', '_money'))
        result = { kind: 'array', element: { kind: 'money' } }
      const domainMatches = domains.filter((domain) => matches(parts, domain.schema, domain.name))
      const rangeMatches = entries.filter(
        (entry) => entry.parts.length === 2 && matches(parts, entry.parts[0]!, entry.parts[1]!),
      )
      if (!result && domainMatches.length + rangeMatches.length === 1) {
        if (domainMatches.length) {
          const base = parseType(domainMatches[0]!.baseTypeName)
          result = base ? resolve(base, next) : null
        } else {
          const entry = rangeMatches[0]!,
            profile = entry.profile,
            subtype = parseType(profile.subtype)
          if (
            subtype &&
            resolve(subtype, next)?.kind === 'money' &&
            profile.subtypeOutput === builtinTypeIO('pg_catalog.money')?.output &&
            profile.output === builtinTypeIO('pg_catalog.int4range')?.output &&
            (entry.kind === 'range' ||
              profile.multirangeOutput === builtinTypeIO('pg_catalog.int4multirange')?.output)
          ) {
            result = { kind: 'range', element: { kind: 'money' } }
            if (entry.kind === 'multirange') result = { kind: 'multirange', element: result }
            if (entry.array) result = { kind: 'array', element: result }
          }
        }
      }
      cache.set(key, result)
    }
    return result && type.arrayBounds?.length ? { kind: 'array', element: result } : result
  }
  const possible = ['money', '_money']
  for (const domain of domains) {
    const type = parseType(
      [domain.schema, domain.name].map((n) => '"' + n.replaceAll('"', '""') + '"').join('.'),
    )
    if (type && resolve(type)) possible.push(domain.name)
  }
  for (const range of ranges)
    for (const identity of [range.identity, range.multirange, range.array, range.multirangeArray]) {
      const type = parseType(identity)
      if (type && resolve(type)) possible.push(names(type).at(-1)!)
    }
  return { resolve, possible }
}

function renderedMoneyConstants(
  definition: string,
  types: ReturnType<typeof moneyTypes>,
): string[] {
  if (!types.possible.some((name) => definition.includes(name))) return []
  let parsed: ReturnType<typeof parseSync>
  try {
    parsed = parseSync(`ALTER TABLE _pgsid_check_host ADD CONSTRAINT _pgsid_check ${definition}`)
  } catch {
    return []
  }
  const values = new Set<string>()
  const fields = (text: string, shape: MoneyShape): void => {
    if (shape.kind === 'money') {
      values.add(text)
      return
    }
    const result = readLiteralFields(shape.kind, text)
    if (result.kind === 'Value')
      for (const field of result.fields) if (field !== null) fields(field, shape.element)
  }
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const record = node as Record<string, unknown>,
      cast = record.TypeCast as Cast | undefined,
      text = cast?.arg?.A_Const?.sval?.sval
    if (typeof text === 'string' && cast?.typeName) {
      const shape = types.resolve(cast.typeName)
      if (shape) fields(text, shape)
    }
    for (const value of Object.values(record)) visit(value)
  }
  visit(parsed)
  return [...values].sort()
}

export async function captureMoneyLiterals(
  pg: PGlite,
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[],
  ranges: readonly RangeTypeInfo[] = [],
): Promise<void> {
  const checks: Pick<ConstraintInfo, 'definition' | 'moneyLiterals'>[] = [
      ...tables.flatMap((table) => table.constraints.filter((c) => c.type === 'check')),
      ...domains.flatMap((domain) => domain.checks),
    ],
    types = moneyTypes(domains, ranges),
    constants = new Map(
      checks.map((check) => [check, renderedMoneyConstants(check.definition, types)]),
    ),
    units = new Map<string, string>()
  for (const text of [...new Set([...constants.values()].flat())].sort()) {
    const row = (
      await pg.query<{ wire: string }>(
        "SELECT encode(pg_catalog.cash_send($1::pg_catalog.money),'hex') wire",
        [text],
      )
    ).rows[0]!
    units.set(text, BigInt.asIntN(64, BigInt('0x' + row.wire)).toString())
  }
  for (const [check, texts] of constants)
    if (texts.length)
      check.moneyLiterals = texts.map((text): MoneyLiteralInfo => ({
        text,
        units: units.get(text)!,
      }))
}
