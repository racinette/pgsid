import { createHash } from 'node:crypto'
import type { QueryCodegenRoute } from './codegen/target.js'
import {
  parseQueryFile,
  QueryFileError,
  type ParsedQueryFile,
  type QueryDefinition,
  type QueryFileErrorCode,
} from './query-file.js'

export interface QuerySourceInput {
  path: string
  content: string | Buffer
  routes?: readonly QueryCodegenRoute[]
}

export interface QueryBatchDiagnostic {
  code: QueryFileErrorCode | 'parse-error'
  message: string
  start: number
  end: number
}

export interface QueryBatchItem {
  id: string
  path: string
  name: string
  definition: QueryDefinition
  routes: readonly QueryCodegenRoute[]
  analysisHash: string
  semanticHash: string
}

export interface QueryBatchFileState {
  path: string
  content: string
  contentHash: string
  routes: readonly QueryCodegenRoute[]
  queries: readonly QueryBatchItem[]
  diagnostics: readonly QueryBatchDiagnostic[]
}

export interface QueryParseSuccess {
  status: 'success'
  parsed: ParsedQueryFile
}

export interface QueryParseFailure {
  status: 'failure'
  diagnostics: readonly QueryBatchDiagnostic[]
}

export type QueryParseCacheEntry = QueryParseSuccess | QueryParseFailure

export interface QueryBatchState {
  files: Readonly<Record<string, QueryBatchFileState>>
  parseCache: Readonly<Record<string, QueryParseCacheEntry>>
}

export type QueryBatchEvent =
  | { kind: 'query-added'; query: QueryBatchItem }
  | { kind: 'query-changed'; previous: QueryBatchItem; query: QueryBatchItem }
  | { kind: 'query-removed'; query: QueryBatchItem }
  | {
      kind: 'diagnostics-changed'
      path: string
      previous: readonly QueryBatchDiagnostic[]
      diagnostics: readonly QueryBatchDiagnostic[]
    }

export interface QueryBatchStats {
  cacheHits: number
  cacheMisses: number
}

export interface QueryBatchUpdate {
  state: QueryBatchState
  events: readonly QueryBatchEvent[]
  stats: QueryBatchStats
}

export class QueryBatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryBatchError'
  }
}

export const EMPTY_QUERY_BATCH_STATE: QueryBatchState = { files: {}, parseCache: {} }

export async function reconcileQueryBatch(
  inputs: readonly QuerySourceInput[],
  previous: QueryBatchState = EMPTY_QUERY_BATCH_STATE,
): Promise<QueryBatchUpdate> {
  const ordered = [...inputs].sort((left, right) => compareText(left.path, right.path))
  assertUniquePaths(ordered)
  const parseCache: Record<string, QueryParseCacheEntry> = {}
  const files: Record<string, QueryBatchFileState> = {}
  const stats: QueryBatchStats = { cacheHits: 0, cacheMisses: 0 }

  for (const input of ordered) {
    const content =
      typeof input.content === 'string' ? input.content : input.content.toString('utf8')
    const contentHash = hash(content)
    let parsed = parseCache[contentHash] ?? previous.parseCache[contentHash]
    if (parsed) {
      stats.cacheHits++
    } else {
      parsed = await parseSource(content)
      stats.cacheMisses++
    }
    parseCache[contentHash] = parsed
    files[input.path] = fileState(input.path, content, input.routes ?? [], contentHash, parsed)
  }

  const state = { files, parseCache }
  return { state, events: diffQueryBatch(previous, state), stats }
}

const parseSource = async (content: string): Promise<QueryParseCacheEntry> => {
  try {
    return { status: 'success', parsed: await parseQueryFile(content) }
  } catch (error) {
    return {
      status: 'failure',
      diagnostics: [
        error instanceof QueryFileError
          ? { code: error.code, message: error.message, start: error.start, end: error.end }
          : {
              code: 'parse-error',
              message: error instanceof Error ? error.message : String(error),
              start: 0,
              end: 1,
            },
      ],
    }
  }
}

const fileState = (
  path: string,
  content: string,
  routes: readonly QueryCodegenRoute[],
  contentHash: string,
  parsed: QueryParseCacheEntry,
): QueryBatchFileState => {
  if (parsed.status === 'failure') {
    return { path, content, routes, contentHash, queries: [], diagnostics: parsed.diagnostics }
  }
  return {
    path,
    content,
    routes,
    contentHash,
    queries: parsed.parsed.queries.map((definition) => queryItem(path, routes, definition)),
    diagnostics: [],
  }
}

const queryItem = (
  path: string,
  routes: readonly QueryCodegenRoute[],
  definition: QueryDefinition,
): QueryBatchItem => {
  const id = `${path}#${definition.name}`
  const analysisHash = hash(
    JSON.stringify([
      definition.hash,
      definition.command,
      definition.parameters.map(({ name, index }) => [name, index]),
    ]),
  )
  const semanticHash = hash(JSON.stringify([analysisHash, routes]))
  return { id, path, name: definition.name, definition, routes, analysisHash, semanticHash }
}

const diffQueryBatch = (previous: QueryBatchState, current: QueryBatchState): QueryBatchEvent[] => {
  const events: QueryBatchEvent[] = []
  const before = queryIndex(previous)
  const after = queryIndex(current)
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const previousQuery = before[id]
    const query = after[id]
    if (!previousQuery && query) events.push({ kind: 'query-added', query })
    else if (previousQuery && !query) events.push({ kind: 'query-removed', query: previousQuery })
    else if (previousQuery && query && previousQuery.semanticHash !== query.semanticHash) {
      events.push({ kind: 'query-changed', previous: previousQuery, query })
    }
  }

  for (const path of new Set([...Object.keys(previous.files), ...Object.keys(current.files)])) {
    const beforeDiagnostics = previous.files[path]?.diagnostics ?? []
    const diagnostics = current.files[path]?.diagnostics ?? []
    if (JSON.stringify(beforeDiagnostics) !== JSON.stringify(diagnostics)) {
      events.push({ kind: 'diagnostics-changed', path, previous: beforeDiagnostics, diagnostics })
    }
  }
  return events.sort((left, right) => compareText(eventKey(left), eventKey(right)))
}

const queryIndex = (state: QueryBatchState): Record<string, QueryBatchItem> => {
  const queries: Record<string, QueryBatchItem> = {}
  for (const file of Object.values(state.files)) {
    for (const query of file.queries) queries[query.id] = query
  }
  return queries
}

const eventKey = (event: QueryBatchEvent): string =>
  event.kind === 'diagnostics-changed'
    ? `${event.path}\u0000diagnostics`
    : `${event.query.id}\u0000${event.kind}`

const assertUniquePaths = (inputs: readonly QuerySourceInput[]): void => {
  for (let index = 1; index < inputs.length; index++) {
    if (inputs[index - 1]!.path === inputs[index]!.path) {
      throw new QueryBatchError(`Duplicate query input ${JSON.stringify(inputs[index]!.path)}`)
    }
  }
}

const hash = (content: string): string => createHash('sha256').update(content).digest('hex')

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
