import { parseSync, type Node } from 'libpg-query'
import type { ConstraintInfo, DomainInfo, EnumInfo, TableInfo } from '../catalog/types.js'
import type { EvalBoolExpression } from './check-expressions.js'
import type { SqlExpression, TextType } from './expressions.js'
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

const stringNodes = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null
  const names = value.map((entry) => fields(fields(entry)?.['String'])?.['sval'])
  return names.every((name): name is string => typeof name === 'string') ? names : null
}

const textType = (name: string): TextType | null => {
  if (name === 'text') return 'pg_catalog.text'
  if (name === 'character varying' || name.startsWith('character varying('))
    return 'pg_catalog."varchar"'
  if (name === 'character' || name.startsWith('character(')) return 'pg_catalog.bpchar'
  return null
}

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
  const input = (node: unknown): SqlExpression | null => {
    const wrapper = fields(node)
    if (!wrapper) return null
    if (wrapper['TypeCast']) {
      const cast = fields(wrapper['TypeCast'])
      const type = fields(cast?.['typeName'])
      const names = stringNodes(type?.['names'])
      if (names?.at(-1) !== 'text') return null
      return input(cast?.['arg'])
    }
    const constant = fields(wrapper['A_Const'])
    if (constant) {
      if (constant['isnull'] === true) return { kind: 'text', type: 'pg_catalog.text', value: null }
      const stringNode = fields(constant['sval'])
      const value = stringNode ? (stringNode['sval'] ?? '') : undefined
      return typeof value === 'string' ? { kind: 'text', type: 'pg_catalog.text', value } : null
    }
    const reference = fields(wrapper['ColumnRef'])
    const names = stringNodes(reference?.['fields'])
    if (names?.length !== 1) return null
    const column = table.columns.find((candidate) => candidate.name === names[0])
    const type = column && textType(column.typeName)
    if (!type) return null
    return { kind: 'input', type, name: column.name }
  }

  const cCollated = (node: unknown): boolean => {
    const wrapper = fields(node)
    const clause = fields(wrapper?.['CollateClause'])
    if (clause) {
      const names = stringNodes(clause['collname'])
      return (names?.length === 1 || names?.[0] === 'pg_catalog') && names.at(-1) === 'C'
    }
    const names = stringNodes(fields(wrapper?.['ColumnRef'])?.['fields'])
    return names?.length === 1
      ? table.columns.find((column) => column.name === names[0])?.collationIsC === true
      : false
  }

  const regex = (
    subjectNode: unknown,
    patternNode: unknown,
    negated: boolean,
    caseSensitive: boolean,
    flagsNode?: unknown,
  ): EvalBoolExpression => {
    const subjectSource = fields(fields(subjectNode)?.['CollateClause'])?.['arg'] ?? subjectNode
    const subject = input(subjectSource)
    const pattern = input(patternNode)
    const flags = flagsNode === undefined ? undefined : input(flagsNode)
    if (
      !subject ||
      !pattern ||
      (flagsNode !== undefined && !flags) ||
      !cCollated(subjectNode) ||
      !['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(subject.type) ||
      (pattern.kind === 'input' && pattern.type !== 'pg_catalog.text') ||
      (flags?.kind === 'input' && flags.type !== 'pg_catalog.text')
    )
      return { kind: 'uncertain' }
    return {
      kind: 'eval-regex',
      subject,
      pattern: pattern.kind === 'text' && pattern.value !== null ? pattern.value : pattern,
      ...(flags ? { flags } : {}),
      options: { caseSensitive },
      negated,
      collation: 'C',
    }
  }

  const regexForm = (
    node: unknown,
  ): { expression: EvalBoolExpression; inputs: string[] } | null => {
    const wrapper = fields(node)
    const operator = fields(wrapper?.['A_Expr'])
    let expression: EvalBoolExpression | null = null
    if (operator?.['kind'] === 'AEXPR_OP') {
      const names = stringNodes(operator['name'])
      const name = names?.length === 1 || names?.[0] === 'pg_catalog' ? names.at(-1) : null
      if (name === '~' || name === '!~' || name === '~*' || name === '!~*')
        expression = regex(
          operator['lexpr'],
          operator['rexpr'],
          name.startsWith('!'),
          !name.endsWith('*'),
        )
    }
    const call = fields(wrapper?.['FuncCall'])
    const names = stringNodes(call?.['funcname'])
    if (
      call &&
      (names?.length === 1 || names?.[0] === 'pg_catalog') &&
      names.at(-1) === 'regexp_like'
    ) {
      const args = call['args']
      if (Array.isArray(args) && (args.length === 2 || args.length === 3))
        expression = regex(args[0], args[1], false, true, args[2])
    }
    if (!expression) return null
    const inputs: string[] = []
    if (expression.kind === 'eval-regex')
      for (const value of [expression.subject, expression.pattern, expression.flags])
        if (value && typeof value !== 'string' && value.kind === 'input') inputs.push(value.name)
    return { expression, inputs }
  }
  const bound = bindCatalogCheck(
    table.columns,
    check['raw_expr'] as Node | undefined,
    [regexForm],
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
