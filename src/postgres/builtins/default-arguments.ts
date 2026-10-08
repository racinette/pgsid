import { parseSync, type Node } from 'libpg-query'
import type { FunctionMetadata } from './catalog.js'

const parsedDefaults = new Map<string, readonly Node[] | null>()

export function builtinDefaultArguments(metadata: FunctionMetadata): readonly Node[] | null {
  if (metadata.numArgDefaults === 0) return []
  const source = metadata.defaultArguments
  if (!source) return null
  if (!parsedDefaults.has(source)) {
    try {
      const parsed = parseSync(`SELECT ${source}`)
      const select = parsed.stmts?.length === 1 ? parsed.stmts[0]?.stmt?.SelectStmt : undefined
      const targets: Node[] = select?.targetList ?? []
      const values: (Node | undefined)[] = targets.map((target) =>
        'ResTarget' in target ? target.ResTarget.val : undefined,
      )
      parsedDefaults.set(
        source,
        values.every((value): value is Node => value !== undefined) ? values : null,
      )
    } catch {
      parsedDefaults.set(source, null)
    }
  }
  const values = parsedDefaults.get(source) ?? null
  return values?.length === metadata.numArgDefaults ? values : null
}
