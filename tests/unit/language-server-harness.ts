import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import type { Readable, Writable } from 'node:stream'
import { PassThrough } from 'node:stream'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createConnection } from 'vscode-languageserver/node'
import type { LanguageServerEnvironment } from '../../src/language-server/server.js'
import { PgsidLanguageServer } from '../../src/language-server/server.js'

export interface JsonRpcMessage {
  jsonrpc?: '2.0'
  id?: number | string | null
  method?: string
  result?: unknown
  error?: unknown
  params?: unknown
}

export interface DiagnosticParams {
  uri: string
  version?: number
  diagnostics: readonly {
    code?: string | number
    message?: string
    severity?: number
    range?: unknown
  }[]
}

export class TestLanguageClient {
  readonly #input: Writable
  #buffer = Buffer.alloc(0)
  #messages: JsonRpcMessage[] = []
  #waiters: (() => void)[] = []
  #nextId = 1
  #protocolError: Error | undefined

  constructor(input: Writable, output: Readable) {
    this.#input = input
    output.on('data', (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      this.#buffer = Buffer.concat([this.#buffer, data])
      this.#parse()
    })
  }

  notify(method: string, params: unknown): void {
    this.#send({ jsonrpc: '2.0', method, params })
  }

  async request(method: string, params: unknown, timeout = 10_000): Promise<JsonRpcMessage> {
    const id = this.#nextId++
    this.#send({ jsonrpc: '2.0', id, method, params })
    let response: JsonRpcMessage
    try {
      response = await this.waitFor((message) => message.id === id, timeout)
    } catch (error) {
      throw new Error(`Timed out waiting for LSP ${method}`, { cause: error })
    }
    if (response.error !== undefined) {
      throw new Error(`LSP ${method} failed: ${JSON.stringify(response.error)}`)
    }
    return response
  }

  waitForDiagnostics(
    uri: string,
    predicate: (params: DiagnosticParams) => boolean = () => true,
    timeout = 10_000,
  ): Promise<JsonRpcMessage> {
    return this.waitFor((message) => {
      if (message.method !== 'textDocument/publishDiagnostics') return false
      const params = diagnosticParams(message)
      return params.uri === uri && predicate(params)
    }, timeout).catch((error: unknown) => {
      throw new Error(`Timed out waiting for diagnostics for ${uri}`, { cause: error })
    })
  }

  async waitFor(
    predicate: (message: JsonRpcMessage) => boolean,
    timeout = 10_000,
  ): Promise<JsonRpcMessage> {
    const deadline = Date.now() + timeout
    while (true) {
      if (this.#protocolError) throw this.#protocolError
      const index = this.#messages.findIndex(predicate)
      if (index >= 0) return this.#messages.splice(index, 1)[0]!
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new Error('Timed out waiting for JSON-RPC message')
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Timed out waiting for JSON-RPC message')),
          remaining,
        )
        this.#waiters.push(() => {
          clearTimeout(timer)
          resolve()
        })
      })
    }
  }

  end(): void {
    this.#input.end()
  }

  #send(message: JsonRpcMessage): void {
    const body = Buffer.from(JSON.stringify(message))
    this.#input.write(`Content-Length: ${body.length}\r\n\r\n`)
    this.#input.write(body)
  }

  #parse(): void {
    try {
      while (true) {
        const headerEnd = this.#buffer.indexOf('\r\n\r\n')
        if (headerEnd < 0) return
        const header = this.#buffer.subarray(0, headerEnd).toString('ascii')
        const match = /^Content-Length:\s*(\d+)$/iu.exec(header)
        if (!match) throw new Error(`Invalid language-server output header: ${header}`)
        const bodyStart = headerEnd + 4
        const bodyEnd = bodyStart + Number(match[1])
        if (this.#buffer.length < bodyEnd) return
        this.#messages.push(
          JSON.parse(this.#buffer.subarray(bodyStart, bodyEnd).toString('utf8')) as JsonRpcMessage,
        )
        this.#buffer = this.#buffer.subarray(bodyEnd)
        for (const resolve of this.#waiters.splice(0)) resolve()
      }
    } catch (error) {
      this.#protocolError = error instanceof Error ? error : new Error(String(error))
      for (const resolve of this.#waiters.splice(0)) resolve()
    }
  }
}

export interface TestLanguageServer {
  client: TestLanguageClient
  server: PgsidLanguageServer
  initialize: JsonRpcMessage
  close(): Promise<void>
}

export async function startLanguageServer(
  root: string,
  options: {
    environment?: LanguageServerEnvironment
    initializationOptions?: unknown
  } = {},
): Promise<TestLanguageServer> {
  const input = new PassThrough()
  const output = new PassThrough()
  const client = new TestLanguageClient(input, output)
  const server = new PgsidLanguageServer(createConnection(input, output), options.environment)
  server.listen()
  const initialize = await client.request('initialize', {
    processId: null,
    rootUri: pathToFileURL(root).href,
    capabilities: {},
    ...(options.initializationOptions === undefined
      ? {}
      : { initializationOptions: options.initializationOptions }),
  })
  client.notify('initialized', {})
  await new Promise<void>((resolve) => setImmediate(resolve))
  await server.drain()
  let closed = false
  return {
    client,
    server,
    initialize,
    async close() {
      if (closed) return
      closed = true
      await client.request('shutdown', null)
      client.notify('exit', null)
      await server.close()
    },
  }
}

export const attachLanguageServerProcess = (
  process: ChildProcessWithoutNullStreams,
): TestLanguageClient => new TestLanguageClient(process.stdin, process.stdout)

export async function writeProject(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const target = join(root, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, content)
    }),
  )
}

export function extractCursor(
  value: string,
  marker = '/*cursor*/',
): {
  content: string
  position: { line: number; character: number }
} {
  const offset = value.indexOf(marker)
  if (offset < 0 || value.indexOf(marker, offset + marker.length) >= 0) {
    throw new Error(`Expected exactly one ${JSON.stringify(marker)} marker`)
  }
  const prefix = value.slice(0, offset)
  const lineStart = prefix.lastIndexOf('\n') + 1
  return {
    content: value.slice(0, offset) + value.slice(offset + marker.length),
    position: {
      line: prefix.match(/\n/gu)?.length ?? 0,
      character: prefix.slice(lineStart).replace(/\r$/u, '').length,
    },
  }
}

export const diagnosticParams = (message: JsonRpcMessage): DiagnosticParams =>
  message.params as DiagnosticParams

export const hoverResult = (
  message: JsonRpcMessage,
): { contents: { kind: string; value: string }; range: unknown } | null =>
  message.result as { contents: { kind: string; value: string }; range: unknown } | null
