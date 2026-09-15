import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  PositionEncodingKind,
  TextDocumentSyncKind,
  TextDocuments,
  type Connection,
  type InitializeParams,
  type InitializeResult,
} from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { findConfigPath } from '../config/loader.js'
import type { ProjectBuildState } from '../project-build.js'
import { ProjectRuntime, type ProjectRuntimeOptions } from '../project-runtime.js'
import {
  projectDiagnosticsToLanguageServer,
  projectFailureToLanguageServer,
  type LanguageServerDiagnosticDocument,
  type ProjectDiagnosticConversionOptions,
} from './diagnostics.js'
import { projectHover } from './hover.js'

export interface LanguageServerEnvironment {
  cwd?: string
  createRuntime?: (options: ProjectRuntimeOptions) => ProjectRuntime
}

interface PgsidInitializationOptions {
  configPath?: string
}

export class PgsidLanguageServer {
  readonly #connection: Connection
  readonly #environment: LanguageServerEnvironment
  readonly #documents = new TextDocuments(TextDocument)
  #runtime: ProjectRuntime | undefined
  #hoverState: ProjectBuildState | undefined
  #conversionOptions: ProjectDiagnosticConversionOptions | undefined
  readonly #documentVersions = new Map<string, { content: string; version: number }>()
  #published = new Set<string>()
  #publishing = Promise.resolve()
  #startPromise: Promise<void> | undefined
  readonly #initialized: Promise<void>
  readonly #resolveInitialized: () => void
  #closed = false

  constructor(connection: Connection, environment: LanguageServerEnvironment = {}) {
    this.#connection = connection
    this.#environment = environment
    let resolveInitialized!: () => void
    this.#initialized = new Promise<void>((resolve) => {
      resolveInitialized = resolve
    })
    this.#resolveInitialized = resolveInitialized
    connection.onInitialize((params) => this.#initialize(params))
    connection.onInitialized(() => {
      this.#startPromise = this.#start()
      this.#resolveInitialized()
      void this.#startPromise.catch((error) => this.#logError(error))
    })
    connection.onShutdown(() => this.close())
    connection.onExit(() => void this.close())
    connection.onHover(async ({ textDocument, position }) => {
      const path = filePath(textDocument.uri)
      if (!path || !this.#runtime || !this.#conversionOptions) return null
      await this.#runtime.drain()
      if (!this.#hoverState) return null
      return projectHover(this.#hoverState, {
        baseDirectory: this.#conversionOptions.baseDirectory,
        path,
        position,
      })
    })
    this.#documents.onDidChangeContent(({ document }) => {
      const path = filePath(document.uri)
      if (path && isSqlDocument(path, document.languageId)) {
        this.#recordDocumentVersion(path, document.getText(), document.version)
        this.#runtime?.setFileOverlay(path, document.getText())
      }
    })
    this.#documents.onDidClose(({ document }) => {
      const path = filePath(document.uri)
      if (path && isSqlDocument(path, document.languageId)) {
        this.#documentVersions.delete(resolve(path))
        this.#runtime?.setFileOverlay(path, undefined)
      }
    })
    this.#documents.listen(connection)
  }

  listen(): void {
    this.#connection.listen()
  }

  async close(): Promise<void> {
    if (this.#closed) return
    this.#closed = true
    await this.#startPromise?.catch(() => undefined)
    await this.#runtime?.close()
    await this.#publishing
  }

  async drain(): Promise<void> {
    await this.#initialized
    await this.#startPromise
    await this.#runtime?.drain()
    await this.#publishing
  }

  #initialize(params: InitializeParams): InitializeResult {
    const baseDirectory = workspacePath(params, this.#environment.cwd ?? process.cwd())
    const requested = initializationOptions(params.initializationOptions).configPath
    const configPath = requested
      ? resolve(baseDirectory, requested)
      : existingConfigPath(baseDirectory)
    this.#conversionOptions = { baseDirectory, configPath }
    return {
      capabilities: {
        positionEncoding: PositionEncodingKind.UTF16,
        hoverProvider: true,
        textDocumentSync: TextDocumentSyncKind.Incremental,
      },
      serverInfo: { name: 'pgsid' },
    }
  }

  async #start(): Promise<void> {
    const options = this.#conversionOptions
    if (!options || this.#closed) return
    const createRuntime = this.#environment.createRuntime ?? ((value) => new ProjectRuntime(value))
    this.#runtime = createRuntime({ configPath: options.configPath })
    for (const document of this.#documents.all()) {
      const path = filePath(document.uri)
      if (path && isSqlDocument(path, document.languageId)) {
        this.#recordDocumentVersion(path, document.getText(), document.version)
        this.#runtime.setFileOverlay(path, document.getText())
      }
    }
    await this.#runtime.watch({
      allowInitialError: true,
      onUpdate: (update) => this.#queueState(update.state),
      onError: (error) => this.#queueFailure(error),
    })
  }

  #queueState(state: ProjectBuildState): void {
    const options = this.#conversionOptions
    if (!options) return
    this.#hoverState = state
    const versions = this.#versionsForState(state)
    this.#queue(async () =>
      this.#publish(await projectDiagnosticsToLanguageServer(state, options), versions),
    )
  }

  #queueFailure(error: unknown): void {
    const options = this.#conversionOptions
    if (!options) return
    this.#hoverState = undefined
    const versions = this.#versionsForFailure(error)
    this.#queue(async () =>
      this.#publish(await projectFailureToLanguageServer(error, options), versions),
    )
  }

  #queue(task: () => Promise<void>): void {
    this.#publishing = this.#publishing.then(task, task).catch((error) => {
      this.#logError(error)
    })
  }

  async #publish(
    documents: readonly LanguageServerDiagnosticDocument[],
    versions: ReadonlyMap<string, number>,
  ): Promise<void> {
    const next = new Map(documents.map((document) => [document.uri, document.diagnostics]))
    const uris = [...new Set([...this.#published, ...next.keys()])].sort(compareText)
    for (const uri of uris) {
      const version = versions.get(uri)
      await this.#connection.sendDiagnostics({
        uri,
        diagnostics: [...(next.get(uri) ?? [])],
        ...(version === undefined ? {} : { version }),
      })
    }
    this.#published = new Set(next.keys())
  }

  #recordDocumentVersion(path: string, content: string, version: number): void {
    this.#documentVersions.set(resolve(path), { content, version })
  }

  #versionsForState(state: ProjectBuildState): Map<string, number> {
    const versions = new Map<string, number>()
    for (const file of Object.values(state.queryBatch.files)) {
      const path = absolutePath(this.#conversionOptions?.baseDirectory ?? process.cwd(), file.path)
      const document = this.#documentVersions.get(resolve(path))
      if (document?.content === file.content) versions.set(pathToUri(path), document.version)
    }
    return versions
  }

  #versionsForFailure(error: unknown): Map<string, number> {
    const versions = new Map<string, number>()
    let failureUri: string | undefined
    if (hasFailureContent(error)) {
      const path = absolutePath(this.#conversionOptions?.baseDirectory ?? process.cwd(), error.path)
      failureUri = pathToUri(path)
      const document = this.#documentVersions.get(resolve(path))
      if (document?.content === error.content.toString('utf8')) {
        versions.set(failureUri, document.version)
      }
    }
    for (const document of this.#documents.all()) {
      const path = filePath(document.uri)
      if (
        path &&
        isSqlDocument(path, document.languageId) &&
        document.uri !== failureUri &&
        !versions.has(document.uri)
      ) {
        versions.set(document.uri, document.version)
      }
    }
    return versions
  }

  #logError(error: unknown): void {
    try {
      this.#connection.console.error(errorMessage(error))
    } catch {
      // The client has already closed the transport.
    }
  }
}

const workspacePath = (params: InitializeParams, fallback: string): string => {
  const uri = params.workspaceFolders?.[0]?.uri ?? params.rootUri
  if (uri) {
    try {
      return fileURLToPath(uri)
    } catch {
      return resolve(fallback)
    }
  }
  return resolve(params.rootPath ?? fallback)
}

const filePath = (uri: string): string | undefined => {
  try {
    return fileURLToPath(uri)
  } catch {
    return undefined
  }
}

const pathToUri = (path: string): string => pathToFileURL(path).href

const absolutePath = (baseDirectory: string, path: string): string => resolve(baseDirectory, path)

const hasFailureContent = (error: unknown): error is { path: string; content: Buffer } =>
  error instanceof Error &&
  'path' in error &&
  typeof error.path === 'string' &&
  'content' in error &&
  Buffer.isBuffer(error.content)

const isSqlDocument = (path: string, languageId: string): boolean =>
  path.toLowerCase().endsWith('.sql') ||
  languageId === 'sql' ||
  languageId === 'postgres' ||
  languageId === 'postgresql'

const initializationOptions = (value: unknown): PgsidInitializationOptions => {
  if (!value || typeof value !== 'object') return {}
  const configPath = 'configPath' in value ? value.configPath : undefined
  return typeof configPath === 'string' ? { configPath } : {}
}

const existingConfigPath = (baseDirectory: string): string => {
  try {
    return findConfigPath(baseDirectory)
  } catch {
    return resolve(baseDirectory, 'pgsid.yaml')
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0
