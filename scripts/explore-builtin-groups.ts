import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { PG18_BUILTINS_VERSION } from '../src/postgres/builtins/groups.generated.js'
import { builtinCallables } from '../src/postgres/builtins/inventory.js'
import {
  checkGroupDeclarations,
  classifyBuiltin,
  compareText,
  displayCallable,
  DOMAIN_FAMILIES,
  GROUPING_RULES,
  groupBuiltins,
  TYPE_FAMILIES,
} from './builtin-grouping.js'
import type { BuiltinGroup } from './builtin-grouping.js'

export const inventoryCallables = builtinCallables

export function builtinGroupingReport(groups: readonly BuiltinGroup[], members = false) {
  const kinds = ['operator', 'function', 'aggregate', 'window'] as const
  return {
    postgresVersion: PG18_BUILTINS_VERSION,
    groupingVersion: 2,
    rules: GROUPING_RULES,
    typeFamilies: TYPE_FAMILIES,
    domainFamilies: DOMAIN_FAMILIES,
    totalOverloads: groups.reduce((sum, group) => sum + group.members.length, 0),
    totalGroups: groups.length,
    summary: kinds.map((kind) => {
      const counts = groups
        .map((group) => group.members.filter((member) => member.callable.kind === kind).length)
        .filter(Boolean)
      return {
        kind,
        overloads: counts.reduce((sum, count) => sum + count, 0),
        groups: counts.length,
        singletonGroups: counts.filter((count) => count === 1).length,
        largestGroup: Math.max(0, ...counts),
      }
    }),
    groups: groups.map((group) => ({
      id: group.id,
      domain: group.domain,
      label: group.label,
      overloads: group.members.length,
      operators: group.members.filter((member) => member.callable.kind === 'operator').length,
      functions: group.members.filter((member) => member.callable.kind === 'function').length,
      aggregates: group.members.filter((member) => member.callable.kind === 'aggregate').length,
      windows: group.members.filter((member) => member.callable.kind === 'window').length,
      distinctNames: new Set(group.members.map((member) => member.callable.name)).size,
      examples: group.members.slice(0, 3).map((member) => displayCallable(member.callable)),
      ...(members
        ? {
            members: group.members.map((member) => ({
              signature: member.signature,
              display: displayCallable(member.callable),
              classification: classifyBuiltin(member.callable),
            })),
          }
        : {}),
    })),
  }
}

type GroupingReport = ReturnType<typeof builtinGroupingReport>

export function formatGroupingReport(report: GroupingReport, format: string): string {
  if (format === 'json') return JSON.stringify(report, null, 2) + '\n'
  const groups = [...report.groups].sort(
    (a, b) => b.overloads - a.overloads || compareText(a.id, b.id),
  )
  const columns = ['Domain', 'Operators', 'Functions', 'Aggregates', 'Windows', 'Total']
  const cells = groups.map((group) => [
    group.domain,
    group.operators,
    group.functions,
    group.aggregates,
    group.windows,
    group.overloads,
  ])
  if (format === 'csv') {
    const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    return [columns, ...cells].map((row) => row.map(cell).join(',')).join('\n') + '\n'
  }
  const lines = [
    `PostgreSQL ${Math.floor(report.postgresVersion / 10000)}.${report.postgresVersion % 10000}; ${report.totalOverloads} overloads; ${report.totalGroups} groups`,
    '',
  ]
  if (format === 'markdown') {
    lines.push(
      'Regenerate: `pnpm builtin-groups:explore --format markdown --check-declarations --output <path>`',
      '',
      'Grouping predicates:',
      '',
    )
    lines.push(...report.rules.map((rule) => `- ${rule}`), '')
    lines.push(`| ${columns.join(' | ')} |`, '| --- | ---: | ---: | ---: | ---: | ---: |')
    lines.push(...cells.map((row) => `| ${row.join(' | ')} |`))
  } else if (format === 'table') {
    lines.push(columns.join('\t'), ...cells.map((row) => row.join('\t')))
  } else {
    throw new Error(`Unknown format: ${format}`)
  }
  return lines.join('\n') + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { values } = parseArgs({
    options: {
      format: { type: 'string', default: 'table' },
      output: { type: 'string' },
      members: { type: 'boolean', default: false },
      'check-declarations': { type: 'boolean', default: false },
    },
  })
  const groups = groupBuiltins(inventoryCallables())
  if (values['check-declarations']) await checkGroupDeclarations(groups)
  const output = formatGroupingReport(builtinGroupingReport(groups, values.members), values.format!)
  if (values.output) await writeFile(resolve(values.output), output)
  else
    await new Promise<void>((resolve, reject) => {
      process.stdout.write(output, (error) => (error ? reject(error) : resolve()))
    })
}
