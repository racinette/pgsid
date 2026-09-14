import { hasSqlDetails, type Node } from 'libpg-query'
import type { ScanToken } from 'libpg-query-scanner'
import { parseSql, statementHash } from './ast.js'

export type QueryCommand = 'one' | 'many' | 'exec' | 'execrows'

export type QueryFileErrorCode =
  | 'duplicate-name'
  | 'empty-query'
  | 'mixed-parameters'
  | 'multiple-statements'
  | 'parse-error'
  | 'unnamed-statement'

export class QueryFileError extends Error {
  constructor(
    readonly code: QueryFileErrorCode,
    message: string,
    readonly start: number,
    readonly end: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'QueryFileError'
  }
}

export interface QueryParameterOccurrence {
  sourceStart: number
  sourceEnd: number
  sqlStart: number
  sqlEnd: number
}

export interface QueryParameter {
  name: string
  index: number
  occurrences: readonly QueryParameterOccurrence[]
}

export interface NamedParameterRewrite {
  sql: string
  parameters: readonly QueryParameter[]
  replacements: readonly QueryParameterOccurrence[]
}

export interface QueryDefinition {
  name: string
  command: QueryCommand
  hash: string
  sql: string
  stmt: Node
  parameters: readonly QueryParameter[]
  replacements: readonly QueryParameterOccurrence[]
  annotationStart: number
  annotationEnd: number
  sourceStart: number
  sourceEnd: number
}

export interface ParsedQueryFile {
  queries: readonly QueryDefinition[]
}

interface Annotation {
  name: string
  command: QueryCommand
  start: number
  end: number
}

interface Replacement {
  name: string
  index: number
  sourceStart: number
  sourceEnd: number
}

const annotationPattern =
  /^--[\t ]*name:[\t ]*([A-Za-z_][A-Za-z0-9_]*)[\t ]+:(one|many|exec|execrows)[\t ]*$/u

export async function rewriteNamedParameters(sql: string): Promise<NamedParameterRewrite> {
  const source = Buffer.from(sql)
  const tokens = await scanTokens(sql)
  const positional = tokens.find((token) => token.tokenName === 'PARAM')
  const replacements: Replacement[] = []
  const indexes = new Map<string, number>()

  for (let index = 0; index + 1 < tokens.length; index++) {
    const at = tokens[index]!
    const identifier = tokens[index + 1]!
    const atStart = namedParameterStart(at)
    if (atStart === null || at.end !== identifier.start || !isIdentifier(identifier)) continue
    const name = identifierName(identifier.text)
    const parameterIndex = indexes.get(name) ?? indexes.size + 1
    indexes.set(name, parameterIndex)
    replacements.push({
      name,
      index: parameterIndex,
      sourceStart: atStart,
      sourceEnd: identifier.end,
    })
  }

  if (positional && replacements.length > 0) {
    throw new QueryFileError(
      'mixed-parameters',
      'Named and positional parameters cannot be mixed in one query',
      positional.start,
      positional.end,
    )
  }

  const chunks: Buffer[] = []
  const occurrences = new Map<string, QueryParameterOccurrence[]>()
  const rewritten: QueryParameterOccurrence[] = []
  let sourceCursor = 0
  let sqlCursor = 0
  for (const replacement of replacements) {
    const before = source.subarray(sourceCursor, replacement.sourceStart)
    const parameter = Buffer.from(`$${replacement.index}`)
    chunks.push(before, parameter)
    sqlCursor += before.length
    const occurrence = {
      sourceStart: replacement.sourceStart,
      sourceEnd: replacement.sourceEnd,
      sqlStart: sqlCursor,
      sqlEnd: sqlCursor + parameter.length,
    }
    rewritten.push(occurrence)
    const namedOccurrences = occurrences.get(replacement.name) ?? []
    namedOccurrences.push(occurrence)
    occurrences.set(replacement.name, namedOccurrences)
    sqlCursor += parameter.length
    sourceCursor = replacement.sourceEnd
  }
  chunks.push(source.subarray(sourceCursor))

  const parameters = [...indexes].map(([name, index]) => ({
    name,
    index,
    occurrences: occurrences.get(name) ?? [],
  }))
  return { sql: Buffer.concat(chunks).toString('utf8'), parameters, replacements: rewritten }
}

const namedParameterStart = (token: ScanToken): number | null =>
  token.text.endsWith('@') ? token.end - 1 : null

export function mapRewrittenOffset(
  rewrite: Pick<NamedParameterRewrite, 'replacements'>,
  offset: number,
): number {
  let adjustment = 0
  for (const replacement of rewrite.replacements) {
    if (offset < replacement.sqlStart) break
    if (offset < replacement.sqlEnd) return replacement.sourceStart
    adjustment +=
      replacement.sourceEnd - replacement.sourceStart - (replacement.sqlEnd - replacement.sqlStart)
  }
  return offset + adjustment
}

export async function parseQueryFile(sourceText: string | Buffer): Promise<ParsedQueryFile> {
  const source = typeof sourceText === 'string' ? Buffer.from(sourceText) : sourceText
  const text = source.toString('utf8')
  const tokens = await scanTokens(text)
  const annotations = findAnnotations(source, tokens)
  const firstAnnotation = annotations[0]
  const unnamed = tokens.find(
    (token) =>
      (!firstAnnotation || token.start < firstAnnotation.start) &&
      token.tokenName !== 'SQL_COMMENT' &&
      token.tokenName !== 'C_COMMENT' &&
      token.text !== ';',
  )
  if (unnamed) {
    throw new QueryFileError(
      'unnamed-statement',
      'Every statement in a generated query file must have a name annotation',
      unnamed.start,
      unnamed.end,
    )
  }

  const names = new Map<string, Annotation>()
  const queries: QueryDefinition[] = []
  for (let index = 0; index < annotations.length; index++) {
    const annotation = annotations[index]!
    const duplicate = names.get(annotation.name)
    if (duplicate) {
      throw new QueryFileError(
        'duplicate-name',
        `Duplicate query name ${JSON.stringify(annotation.name)}`,
        annotation.start,
        annotation.end,
      )
    }
    names.set(annotation.name, annotation)

    const next = annotations[index + 1]
    const range = trimSqlRange(
      source,
      lineEnd(source, annotation.end),
      next?.start ?? source.length,
    )
    if (range.start === range.end) {
      throw new QueryFileError(
        'empty-query',
        `Query ${JSON.stringify(annotation.name)} has no statement`,
        annotation.start,
        annotation.end,
      )
    }
    let rewritten: NamedParameterRewrite
    try {
      rewritten = await rewriteNamedParameters(
        source.subarray(range.start, range.end).toString('utf8'),
      )
    } catch (error) {
      if (!(error instanceof QueryFileError)) throw error
      throw new QueryFileError(
        error.code,
        error.message,
        range.start + error.start,
        range.start + error.end,
        { cause: error },
      )
    }
    let parsed
    try {
      parsed = await parseSql(rewritten.sql)
    } catch (error) {
      const rewrittenOffset = hasSqlDetails(error)
        ? Buffer.byteLength(rewritten.sql.slice(0, Math.max(0, error.sqlDetails!.cursorPosition)))
        : 0
      const originalOffset = mapRewrittenOffset(rewritten, rewrittenOffset)
      throw new QueryFileError(
        'parse-error',
        `Query ${JSON.stringify(annotation.name)} does not parse`,
        range.start + originalOffset,
        range.start + originalOffset + 1,
        { cause: error },
      )
    }
    if ((parsed.stmts?.length ?? 0) !== 1) {
      throw new QueryFileError(
        'multiple-statements',
        `Query ${JSON.stringify(annotation.name)} must contain exactly one statement`,
        range.start,
        range.end,
      )
    }
    const raw = parsed.stmts![0]!
    queries.push({
      name: annotation.name,
      command: annotation.command,
      hash: statementHash(raw.stmt!),
      sql: rewritten.sql,
      stmt: raw.stmt!,
      parameters: rewritten.parameters,
      replacements: rewritten.replacements,
      annotationStart: annotation.start,
      annotationEnd: annotation.end,
      sourceStart: range.start,
      sourceEnd: range.end,
    })
  }
  return { queries }
}

const findAnnotations = (source: Buffer, tokens: readonly ScanToken[]): Annotation[] => {
  const annotations: Annotation[] = []
  for (const token of tokens) {
    if (token.tokenName !== 'SQL_COMMENT' || !isLineOwnComment(source, token.start)) continue
    const match = annotationPattern.exec(token.text)
    if (!match) continue
    annotations.push({
      name: match[1]!,
      command: match[2] as QueryCommand,
      start: token.start,
      end: token.end,
    })
  }
  return annotations
}

const scanTokens = async (sql: string): Promise<ScanToken[]> =>
  (await (await import('libpg-query-scanner')).scan(sql)).tokens

const isLineOwnComment = (source: Buffer, start: number): boolean => {
  let cursor = start - 1
  while (cursor >= 0 && source[cursor] !== 0x0a && source[cursor] !== 0x0d) {
    if (source[cursor] !== 0x20 && source[cursor] !== 0x09) return false
    cursor--
  }
  return true
}

const isIdentifier = (token: ScanToken): boolean =>
  token.tokenName === 'IDENT' || token.keywordKind !== 0

const identifierName = (text: string): string =>
  text.startsWith('"') ? text.slice(1, -1).replaceAll('""', '"') : text.toLowerCase()

const lineEnd = (source: Buffer, start: number): number => {
  let cursor = start
  if (source[cursor] === 0x0d) cursor++
  if (source[cursor] === 0x0a) cursor++
  return cursor
}

const trimSqlRange = (
  source: Buffer,
  start: number,
  end: number,
): { start: number; end: number } => {
  while (start < end && isWhitespace(source[start]!)) start++
  while (end > start && isWhitespace(source[end - 1]!)) end--
  return { start, end }
}

const isWhitespace = (byte: number): boolean =>
  byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x0b || byte === 0x0c
