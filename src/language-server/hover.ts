import { isAbsolute, resolve } from 'node:path'
import { MarkupKind, type Hover, type Position } from 'vscode-languageserver'
import type { ProjectBuildState } from '../project-build.js'
import type { QueryAnalysisItem } from '../query-analysis.js'
import { interpretValueLineage, type ValueLineage } from '../query/value-lineage.js'
import { byteRangeToRange, positionToByteOffset } from './positions.js'

export interface ProjectHoverOptions {
  baseDirectory: string
  path: string
  position: Position
}

export function projectHover(state: ProjectBuildState, options: ProjectHoverOptions): Hover | null {
  const file = Object.values(state.queryBatch.files).find(
    (candidate) => absolutePath(options.baseDirectory, candidate.path) === resolve(options.path),
  )
  if (!file) return null
  const content = Buffer.from(file.content)
  const offset = positionToByteOffset(content, options.position)
  const query = file.queries.find(
    (candidate) =>
      offset >= candidate.definition.annotationStart && offset < candidate.definition.sourceEnd,
  )
  if (!query) return null
  const analysis = state.queryAnalysis.analyses[query.id]
  if (!analysis) return null
  return {
    contents: { kind: MarkupKind.Markdown, value: renderHover(analysis) },
    range: byteRangeToRange(content, query.definition.annotationStart, query.definition.sourceEnd),
  }
}

const renderHover = (analysis: QueryAnalysisItem): string => {
  const { query, contract, description } = analysis
  const parameterNames = new Map(query.definition.parameters.map((item) => [item.index, item.name]))
  const lines = [`**${escapeMarkdown(query.name)}** \`${query.definition.command}\``]

  if (contract.alwaysRaises) lines.push('', '**Always raises**')

  if (contract.params.length) {
    lines.push('', '**Parameters**', '', '```text')
    for (const parameter of contract.params) {
      const name = parameterNames.get(parameter.number)
      const label = name ? `@${name}` : `$${parameter.number}`
      const type = description?.parameterTypes?.[parameter.number - 1] ?? 'unknown'
      lines.push(
        displayText(`  ${label}: ${type} — ${parameterNullability(analysis, parameter.number)}`),
      )
    }
    lines.push('```')
  }

  if (contract.outputs.length) {
    lines.push('', '**Outputs**', '', '```text')
    for (const [index, output] of contract.outputs.entries()) {
      const type = description?.columnTypes?.[index] ?? 'unknown'
      const lineage = analysis.rawLineage?.[index]?.value
      lines.push(
        displayText(
          `  ${output.name}: ${type} — ${outputNullability(output)}${lineage ? ` — ${renderLineage(interpretValueLineage(lineage))}` : ''}`,
        ),
      )
    }
    lines.push('```')
  }

  if (contract.paramRejectionSets.length) {
    lines.push('', '**Joint NULL rejection**', '')
    for (const set of contract.paramRejectionSets) {
      lines.push(`- ${set.map((number) => parameterLabel(analysis, number)).join(' + ')}`)
    }
  }

  if (contract.outputPresenceGroups.length) {
    lines.push('', '**Presence groups**', '')
    for (const group of contract.outputPresenceGroups) {
      const members = group.columns.map((index) => {
        const name = contract.outputs[index]?.name ?? `#${index + 1}`
        return group.discriminants.includes(index) ? `${name} (discriminant)` : name
      })
      lines.push(`- ${members.map(escapeMarkdown).join(', ')}`)
    }
  }

  return lines.join('\n')
}

const parameterNullability = (analysis: QueryAnalysisItem, number: number): string => {
  if (analysis.contract.params[number - 1]?.notNull) return 'rejects NULL'
  const sets = analysis.contract.paramRejectionSets.filter((set) => set.includes(number))
  if (!sets.length) return 'accepts NULL'
  return `jointly rejects NULL with ${sets
    .map((set) =>
      set
        .filter((member) => member !== number)
        .map((member) => parameterLabel(analysis, member))
        .join(' + '),
    )
    .join(' and ')}`
}

const parameterLabel = (analysis: QueryAnalysisItem, number: number): string => {
  const parameter = analysis.query.definition.parameters.find((item) => item.index === number)
  return parameter ? `@${parameter.name}` : `$${number}`
}

const outputNullability = (output: { notNull: boolean; alwaysNull?: boolean }): string =>
  output.alwaysNull ? 'always null' : output.notNull ? 'not null' : 'nullable'

const renderLineage = (value: ValueLineage, depth = 0): string => {
  if (depth >= 6) return '…'
  if (value.kind === 'column') {
    return `${value.column.schema}.${value.column.relation}.${value.column.column}`
  }
  if (value.kind === 'literal') return value.value === null ? 'NULL' : JSON.stringify(value.value)
  if (value.kind === 'parameter') return `$${value.number}`
  if (value.kind === 'unknown') return 'unknown source'
  if (value.kind === 'row-absence') {
    return `${value.image} row? ${renderLineage(value.origin, depth + 1)}`
  }
  const inputs = value.inputs.map((input) => renderLineage(input, depth + 1))
  const operation = value.operation
  if (operation.kind === 'json-access') {
    return `${inputs[0] ?? 'unknown'}${operation.path.map(renderJsonStep).join('')} (${operation.result})`
  }
  if (operation.kind === 'cast')
    return `cast(${inputs[0] ?? 'unknown'} as ${typeName(operation.target)})`
  if (operation.kind === 'operator')
    return `${qualifiedName(operation.operator)}(${inputs.join(', ')})`
  if (operation.kind === 'function')
    return `${qualifiedName(operation.function)}(${inputs.join(', ')})`
  if (operation.kind === 'choice') return `${operation.form}(${inputs.join(', ')})`
  if (operation.kind === 'assignment') {
    const target = operation.target
    return `${operation.source}(${inputs.join(', ')}) → ${target.schema}.${target.relation}.${target.column}`
  }
  if (operation.kind === 'opaque') return `${operation.nodeType}(${inputs.join(', ')})`
  return `subscript(${inputs.join(', ')})`
}

const renderJsonStep = (step: string | number): string =>
  typeof step === 'number' ? `[${step}]` : `[${JSON.stringify(step)}]`

const typeName = (type: { schema?: string; name: string }): string =>
  type.schema ? `${type.schema}.${type.name}` : type.name

const qualifiedName = (name: { schema?: string; name: string }): string =>
  name.schema ? `${name.schema}.${name.name}` : name.name

const escapeMarkdown = (value: string): string => value.replace(/[\\`*_{}[\]()#+.!|>-]/gu, '\\$&')

const displayText = (value: string): string =>
  value.replaceAll('```', '`\u200b``').replaceAll('\r', '\\r').replaceAll('\n', '\\n')

const absolutePath = (baseDirectory: string, path: string): string =>
  isAbsolute(path) ? path : resolve(baseDirectory, path)
