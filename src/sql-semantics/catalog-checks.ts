import { parseSync, type Node } from 'libpg-query'
import type { ConstraintInfo, DomainInfo, EnumInfo, TableInfo } from '../catalog/types.js'
import type { EvalBoolExpression } from './check-expressions.js'
import { bindCatalogCheck, type CheckColumn } from './catalog-check-binder.js'

export interface CatalogCheckPlan {
  name: string
  expression: EvalBoolExpression
  inputs: readonly string[]
}

export interface CatalogCheckGroup {
  name: string
  kind: 'table' | 'domain'
  source: { schema: string; name: string }
  checks: readonly {
    owner: string
    source: { schema: string; name: string }
    plan: CatalogCheckPlan
  }[]
}

type Fields = Record<string, unknown>

const fields = (value: unknown): Fields | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Fields) : null

type CheckTable = {
  columns: readonly CheckColumn[]
}
type CheckConstraint = Pick<ConstraintInfo, 'name' | 'type' | 'definition'>

export function lowerTableCheck(
  table: CheckTable,
  constraint: CheckConstraint,
  enums: readonly EnumInfo[] = [],
  domains: readonly DomainInfo[] = [],
): CatalogCheckPlan | null {
  if (constraint.type !== 'check') throw new Error('Expected a table CHECK constraint')
  let parsed: ReturnType<typeof parseSync>
  try {
    parsed = parseSync(
      `ALTER TABLE _pgsid_check_host ADD CONSTRAINT _pgsid_check ${constraint.definition}`,
    )
  } catch {
    return { name: constraint.name, expression: { kind: 'uncertain' }, inputs: [] }
  }
  const alter = fields(fields(parsed.stmts?.[0]?.stmt)?.['AlterTableStmt'])
  const commands = alter?.['cmds']
  const command = Array.isArray(commands) ? fields(commands[0]) : null
  const body = fields(command?.['AlterTableCmd'])?.['def']
  const check = fields(fields(body)?.['Constraint'])
  if (check?.['contype'] !== 'CONSTR_CHECK') return null
  const bound = bindCatalogCheck(
    table.columns,
    check['raw_expr'] as Node | undefined,
    [],
    enums,
    domains,
  )
  return { name: constraint.name, ...bound }
}

export function lowerDomainCheck(
  domain: DomainInfo,
  check: DomainInfo['checks'][number],
  enums: readonly EnumInfo[] = [],
  domains: readonly DomainInfo[] = [],
): CatalogCheckPlan | null {
  return lowerTableCheck(
    {
      columns: [
        {
          name: 'value',
          typeName: domain.baseTypeName,
          typeOid: domain.baseTypeOid,
          isRowType: domain.isRowType,
          collationIsC: domain.collationIsC,
          collationDeterministic: domain.collationDeterministic,
          collationIsDefault: domain.collationIsDefault,
          collationOid: domain.collationOid,
        },
      ],
    },
    { ...check, type: 'check' },
    enums,
    domains,
  )
}

export function catalogCheckGroups(
  tables: readonly TableInfo[],
  domains: readonly DomainInfo[],
  selectedDomains: readonly DomainInfo[] = domains,
  enums: readonly EnumInfo[] = [],
): CatalogCheckGroup[] {
  const groups: CatalogCheckGroup[] = []
  for (const table of tables) {
    const checks = table.constraints
      .filter((constraint) => constraint.type === 'check' && constraint.enforced)
      .flatMap((constraint) => {
        const plan = lowerTableCheck(table, constraint, enums, domains)
        return plan
          ? [
              {
                owner: `${table.schema}.${table.name}`,
                source: { schema: table.schema, name: table.name },
                plan,
              },
            ]
          : []
      })
    if (checks.length)
      groups.push({
        name: `${table.schema}_${table.name}`,
        kind: 'table',
        source: { schema: table.schema, name: table.name },
        checks,
      })
  }
  const byOid = new Map(domains.map((domain) => [domain.oid, domain]))
  for (const domain of selectedDomains) {
    const chain: DomainInfo[] = []
    const seen = new Set<number>()
    let current: DomainInfo | undefined = domain
    while (current && !seen.has(current.oid)) {
      seen.add(current.oid)
      chain.push(current)
      current = byOid.get(current.baseTypeOid)
    }
    const baseTypeName = chain.at(-1)?.baseTypeName ?? domain.baseTypeName
    const checks = chain.flatMap((layer) =>
      layer.checks.flatMap((check) => {
        const plan = lowerDomainCheck(
          {
            ...layer,
            baseTypeName,
            baseTypeOid: chain.at(-1)?.baseTypeOid ?? layer.baseTypeOid,
            collationIsC: domain.collationIsC,
            collationDeterministic: domain.collationDeterministic,
            collationIsDefault: domain.collationIsDefault,
            collationOid: domain.collationOid,
          },
          check,
          enums,
          domains,
        )
        return plan
          ? [
              {
                owner: `${layer.schema}.${layer.name}`,
                source: { schema: layer.schema, name: layer.name },
                plan,
              },
            ]
          : []
      }),
    )
    if (checks.length)
      groups.push({
        name: `${domain.schema}_${domain.name}`,
        kind: 'domain',
        source: { schema: domain.schema, name: domain.name },
        checks,
      })
  }
  return groups
}
