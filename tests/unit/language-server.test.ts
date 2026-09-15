import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { PassThrough } from 'node:stream'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { createConnection } from 'vscode-languageserver/node'
import { PgsidLanguageServer } from '../../src/language-server/server.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('PgsidLanguageServer', () => {
  it('publishes project diagnostics over JSON-RPC and clears them after recovery', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-language-server-'))
    roots.push(root)
    await Promise.all([
      mkdir(join(root, 'migrations'), { recursive: true }),
      mkdir(join(root, 'queries'), { recursive: true }),
    ])
    const queryPath = join(root, 'queries/broken.sql')
    await Promise.all([
      writeFile(
        join(root, 'pgsid.yaml'),
        `
          schema: migrations/*.sql
          sql:
            paths: [queries/*.sql]
            typecheck: { plpgsql: false }
        `,
      ),
      writeFile(join(root, 'migrations/001.sql'), 'CREATE TABLE values_ (value integer);'),
      writeFile(queryPath, '-- name: Broken :one\nSELECT +;'),
    ])

    const input = new PassThrough()
    const output = new PassThrough()
    const peer = new JsonRpcPeer(input, output)
    const server = new PgsidLanguageServer(createConnection(input, output))
    server.listen()

    peer.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: null,
        rootUri: pathToFileURL(root).href,
        capabilities: {},
      },
    })
    const initialized = await peer.waitFor((message) => message.id === 1)
    expect(initialized.result).toMatchObject({
      capabilities: { hoverProvider: true, positionEncoding: 'utf-16', textDocumentSync: 2 },
      serverInfo: { name: 'pgsid' },
    })
    peer.send({ jsonrpc: '2.0', method: 'initialized', params: {} })

    const queryUri = pathToFileURL(queryPath).href
    const broken = await peer.waitFor(
      (message) =>
        message.method === 'textDocument/publishDiagnostics' &&
        diagnosticParams(message).uri === queryUri &&
        diagnosticParams(message).diagnostics.length > 0,
      10_000,
    )
    expect(diagnosticParams(broken).diagnostics[0]).toMatchObject({
      range: { start: { line: 1 }, end: { line: 1 } },
      severity: 1,
      source: 'pgsid',
    })

    peer.send({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: queryUri,
          languageId: 'sql',
          version: 1,
          text: '-- name: Fixed :one\nSELECT value FROM values_;',
        },
      },
    })
    const recovered = await peer.waitFor(
      (message) =>
        message.method === 'textDocument/publishDiagnostics' &&
        diagnosticParams(message).uri === queryUri &&
        diagnosticParams(message).diagnostics.length === 0,
      10_000,
    )
    expect(diagnosticParams(recovered).diagnostics).toEqual([])

    peer.send({
      jsonrpc: '2.0',
      id: 2,
      method: 'textDocument/hover',
      params: { textDocument: { uri: queryUri }, position: { line: 1, character: 12 } },
    })
    const hovered = await peer.waitFor((message) => message.id === 2)
    expect(hoverMarkdown(hovered)).toContain('**Fixed** `one`')
    expect(hoverMarkdown(hovered)).toContain('value: integer — nullable — public.values_.value')

    peer.send({
      jsonrpc: '2.0',
      method: 'textDocument/didClose',
      params: { textDocument: { uri: queryUri } },
    })
    await peer.waitFor(
      (message) =>
        message.method === 'textDocument/publishDiagnostics' &&
        diagnosticParams(message).uri === queryUri &&
        diagnosticParams(message).diagnostics.length > 0,
      10_000,
    )

    await writeFile(queryPath, '-- name: Fixed :one\nSELECT value FROM values_;')
    await peer.waitFor(
      (message) =>
        message.method === 'textDocument/publishDiagnostics' &&
        diagnosticParams(message).uri === queryUri &&
        diagnosticParams(message).diagnostics.length === 0,
      10_000,
    )

    peer.send({ jsonrpc: '2.0', id: 3, method: 'shutdown', params: null })
    await peer.waitFor((message) => message.id === 3)
    peer.send({ jsonrpc: '2.0', method: 'exit', params: null })
    await server.close()
  }, 20_000)
})

interface JsonRpcMessage {
  id?: number
  method?: string
  result?: unknown
  params?: unknown
}

class JsonRpcPeer {
  readonly #input: PassThrough
  #buffer = Buffer.alloc(0)
  #messages: JsonRpcMessage[] = []
  #waiters: (() => void)[] = []

  constructor(input: PassThrough, output: PassThrough) {
    this.#input = input
    output.on('data', (chunk: Buffer) => {
      this.#buffer = Buffer.concat([this.#buffer, chunk])
      this.#parse()
    })
  }

  send(message: JsonRpcMessage & { jsonrpc: '2.0' }): void {
    const body = Buffer.from(JSON.stringify(message))
    this.#input.write(`Content-Length: ${body.length}\r\n\r\n`)
    this.#input.write(body)
  }

  async waitFor(
    predicate: (message: JsonRpcMessage) => boolean,
    timeout = 2_000,
  ): Promise<JsonRpcMessage> {
    const deadline = Date.now() + timeout
    while (true) {
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

  #parse(): void {
    while (true) {
      const headerEnd = this.#buffer.indexOf('\r\n\r\n')
      if (headerEnd < 0) return
      const header = this.#buffer.subarray(0, headerEnd).toString('ascii')
      const length = /Content-Length:\s*(\d+)/iu.exec(header)?.[1]
      if (!length) throw new Error('JSON-RPC message has no content length')
      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + Number(length)
      if (this.#buffer.length < bodyEnd) return
      this.#messages.push(
        JSON.parse(this.#buffer.subarray(bodyStart, bodyEnd).toString('utf8')) as JsonRpcMessage,
      )
      this.#buffer = this.#buffer.subarray(bodyEnd)
      for (const resolve of this.#waiters.splice(0)) resolve()
    }
  }
}

const diagnosticParams = (
  message: JsonRpcMessage,
): { uri: string; diagnostics: readonly unknown[] } =>
  message.params as { uri: string; diagnostics: readonly unknown[] }

const hoverMarkdown = (message: JsonRpcMessage): string => {
  const result = message.result as { contents?: { value?: unknown } } | undefined
  return typeof result?.contents?.value === 'string' ? result.contents.value : ''
}
