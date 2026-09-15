import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  DiagnosticSeverity,
  type Diagnostic,
  type DiagnosticRelatedInformation,
  type Range,
} from 'vscode-languageserver'
import type { SqlDiagnostic } from '../errors.js'
import type { ProjectBuildState, ProjectDiagnostic } from '../project-build.js'

export interface LanguageServerDiagnosticDocument {
  uri: string
  diagnostics: readonly Diagnostic[]
}

export interface ProjectDiagnosticConversionOptions {
  baseDirectory: string
  configPath: string
  read?: (path: string) => Promise<Buffer>
}

interface LocatedDiagnostic {
  path: string
  content?: Buffer
  start: number
  end: number
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  related?: readonly { start: number; end: number; message: string }[]
}

export async function projectDiagnosticsToLanguageServer(
  state: ProjectBuildState,
  options: ProjectDiagnosticConversionOptions,
): Promise<readonly LanguageServerDiagnosticDocument[]> {
  const located = state.diagnostics.map((item) => locateProjectDiagnostic(item, state, options))
  return convertLocated(located, options)
}

export async function projectFailureToLanguageServer(
  error: unknown,
  options: ProjectDiagnosticConversionOptions,
): Promise<readonly LanguageServerDiagnosticDocument[]> {
  if (isProjectSchemaFailure(error)) {
    return convertLocated(
      error.diagnostics.map((diagnostic) =>
        locateSqlDiagnostic(error.path, diagnostic, options.baseDirectory, error.content),
      ),
      options,
    )
  }
  return convertLocated(
    [
      {
        path: options.configPath,
        start: 0,
        end: 1,
        code: errorCode(error),
        severity: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
    ],
    options,
  )
}

const locateProjectDiagnostic = (
  item: ProjectDiagnostic,
  state: ProjectBuildState,
  options: ProjectDiagnosticConversionOptions,
): LocatedDiagnostic => {
  if (item.source === 'schema') {
    return locateSqlDiagnostic(
      item.path ?? options.configPath,
      item.diagnostic,
      options.baseDirectory,
      item.content,
    )
  }
  if (item.source === 'query') {
    const content = state.queryBatch.files[item.path]?.content
    return {
      path: absolutePath(options.baseDirectory, item.path),
      ...(content === undefined ? {} : { content: Buffer.from(content) }),
      start: item.diagnostic.start,
      end: item.diagnostic.end,
      code: item.diagnostic.code,
      severity: 'error',
      message: item.diagnostic.message,
    }
  }
  const query = state.queryAnalysis.analyses[item.queryId]?.query
  const content = query ? state.queryBatch.files[query.path]?.content : undefined
  return {
    path: query ? absolutePath(options.baseDirectory, query.path) : options.configPath,
    ...(content === undefined ? {} : { content: Buffer.from(content) }),
    start: query?.definition.sourceStart ?? 0,
    end: query?.definition.sourceEnd ?? 1,
    code: item.diagnostic.code,
    severity: item.diagnostic.severity,
    message: item.diagnostic.message,
  }
}

const locateSqlDiagnostic = (
  path: string,
  diagnostic: SqlDiagnostic,
  baseDirectory: string,
  content?: Buffer,
): LocatedDiagnostic => ({
  path: absolutePath(baseDirectory, path),
  ...(content ? { content } : {}),
  start: diagnostic.range?.start ?? 0,
  end: diagnostic.range?.end ?? Number.POSITIVE_INFINITY,
  code: diagnostic.code ?? 'schema',
  severity: diagnostic.severity,
  message: diagnostic.message,
  related: diagnostic.relatedLocations?.map((location) => ({
    start: location.range.start,
    end: location.range.end,
    message: location.message,
  })),
})

const convertLocated = async (
  located: readonly LocatedDiagnostic[],
  options: ProjectDiagnosticConversionOptions,
): Promise<readonly LanguageServerDiagnosticDocument[]> => {
  const read = options.read ?? readFile
  const grouped = new Map<string, LocatedDiagnostic[]>()
  for (const item of located) {
    grouped.set(item.path, [...(grouped.get(item.path) ?? []), item])
  }
  return Promise.all(
    [...grouped.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(async ([path, items]) => {
        const content =
          items.find((item) => item.content)?.content ?? (await readOrEmpty(read, path))
        const uri = pathToFileURL(path).href
        return {
          uri,
          diagnostics: items.map((item) => ({
            range: byteRange(content, item.start, item.end),
            severity: diagnosticSeverity(item.severity),
            code: item.code,
            source: 'pgsid',
            message: item.message,
            ...(item.related?.length
              ? { relatedInformation: relatedInformation(uri, content, item.related) }
              : {}),
          })),
        }
      }),
  )
}

const relatedInformation = (
  uri: string,
  content: Buffer,
  related: readonly { start: number; end: number; message: string }[],
): DiagnosticRelatedInformation[] =>
  related.map((item) => ({
    location: { uri, range: byteRange(content, item.start, item.end) },
    message: item.message,
  }))

const byteRange = (content: Buffer, start: number, end: number): Range => ({
  start: bytePosition(content, start),
  end: bytePosition(content, end),
})

const bytePosition = (content: Buffer, offset: number): { line: number; character: number } => {
  const clamped = Math.max(
    0,
    Math.min(Number.isFinite(offset) ? offset : content.length, content.length),
  )
  const prefix = content.subarray(0, clamped).toString('utf8')
  const lastNewline = prefix.lastIndexOf('\n')
  return {
    line: prefix.match(/\n/gu)?.length ?? 0,
    character: prefix.slice(lastNewline + 1).length,
  }
}

const diagnosticSeverity = (severity: LocatedDiagnostic['severity']): DiagnosticSeverity =>
  severity === 'error'
    ? DiagnosticSeverity.Error
    : severity === 'warning'
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Information

const absolutePath = (baseDirectory: string, path: string): string =>
  isAbsolute(path) ? path : resolve(baseDirectory, path)

const readOrEmpty = async (
  read: (path: string) => Promise<Buffer>,
  path: string,
): Promise<Buffer> => {
  try {
    return await read(path)
  } catch {
    return Buffer.alloc(0)
  }
}

const isProjectSchemaFailure = (
  error: unknown,
): error is { path: string; content?: Buffer; diagnostics: readonly SqlDiagnostic[] } =>
  error instanceof Error &&
  'path' in error &&
  typeof error.path === 'string' &&
  'diagnostics' in error &&
  Array.isArray(error.diagnostics)

const errorCode = (error: unknown): string =>
  error instanceof Error && error.name ? error.name : 'project-error'

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
