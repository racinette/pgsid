import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  diagnosticParams,
  hoverResult,
  startLanguageServer,
  type TestLanguageServer,
  writeProject,
} from './language-server-harness.js'

const roots: string[] = []
const servers: TestLanguageServer[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('PgsidLanguageServer', () => {
  it('publishes project diagnostics over JSON-RPC and clears them after recovery', async () => {
    const root = await project({
      'pgsid.yaml': config('queries/*.sql'),
      'migrations/001.sql': 'CREATE TABLE values_ (value integer);',
      'queries/broken.sql': '-- name: Broken :one\nSELECT +;',
    })
    const queryPath = join(root, 'queries/broken.sql')
    const queryUri = pathToFileURL(queryPath).href
    const languageServer = await start(root)

    expect(languageServer.initialize.result).toMatchObject({
      capabilities: { hoverProvider: true, positionEncoding: 'utf-16', textDocumentSync: 2 },
      serverInfo: { name: 'pgsid' },
    })

    const broken = await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics }) => diagnostics.length > 0,
    )
    expect(diagnosticParams(broken)).toMatchObject({
      uri: queryUri,
      diagnostics: [
        {
          range: { start: { line: 1 }, end: { line: 1 } },
          severity: 1,
          source: 'pgsid',
        },
      ],
    })
    expect(diagnosticParams(broken)).not.toHaveProperty('version')

    languageServer.client.notify('textDocument/didOpen', {
      textDocument: {
        uri: queryUri,
        languageId: 'sql',
        version: 1,
        text: '-- name: Fixed :one\nSELECT value FROM values_;',
      },
    })
    const recovered = await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics, version }) => diagnostics.length === 0 && version === 1,
    )
    expect(diagnosticParams(recovered)).toMatchObject({ diagnostics: [], version: 1 })

    const hovered = await languageServer.client.request('textDocument/hover', {
      textDocument: { uri: queryUri },
      position: { line: 1, character: 12 },
    })
    expect(hoverResult(hovered)?.contents.value).toContain('**Fixed** `one`')
    expect(hoverResult(hovered)?.contents.value).toContain(
      'value: integer — nullable — public.values_.value',
    )

    languageServer.client.notify('textDocument/didClose', {
      textDocument: { uri: queryUri },
    })
    const restored = await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics }) => diagnostics.length > 0,
    )
    expect(diagnosticParams(restored)).not.toHaveProperty('version')

    await writeFile(queryPath, '-- name: Fixed :one\nSELECT value FROM values_;')
    await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics }) => diagnostics.length === 0,
    )
  }, 20_000)

  it('applies incremental UTF-16 edits and versions diagnostics from the analyzed buffer', async () => {
    const root = await project({
      'pgsid.yaml': config('queries/*.sql'),
      'migrations/001.sql': '',
      'queries/value.sql': "-- name: Value :one\r\nSELECT 'é🙂' AS value;\r\n",
    })
    const queryPath = join(root, 'queries/value.sql')
    const queryUri = pathToFileURL(queryPath).href
    const languageServer = await start(root)
    await languageServer.server.drain()

    languageServer.client.notify('textDocument/didOpen', {
      textDocument: {
        uri: queryUri,
        languageId: 'sql',
        version: 1,
        text: "-- name: Value :one\r\nSELECT 'é🙂' AS value;\r\n",
      },
    })
    await languageServer.server.drain()
    languageServer.client.notify('textDocument/didChange', {
      textDocument: { uri: queryUri, version: 2 },
      contentChanges: [
        {
          range: {
            start: { line: 1, character: 7 },
            end: { line: 1, character: 12 },
          },
          text: '+',
        },
      ],
    })

    const broken = await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics, version }) => diagnostics.length > 0 && version === 2,
    )
    expect(diagnosticParams(broken)).toMatchObject({
      version: 2,
      diagnostics: [{ code: 'parse-error', range: { start: { line: 1 } } }],
    })

    languageServer.client.notify('textDocument/didChange', {
      textDocument: { uri: queryUri, version: 3 },
      contentChanges: [
        {
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 18 },
          },
          text: 'SELECT 42 AS value;',
        },
      ],
    })
    const fixed = await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics, version }) => diagnostics.length === 0 && version === 3,
    )
    expect(diagnosticParams(fixed)).toMatchObject({ diagnostics: [], version: 3 })

    const hovered = await languageServer.client.request('textDocument/hover', {
      textDocument: { uri: queryUri },
      position: { line: 1, character: 10 },
    })
    expect(hoverResult(hovered)?.contents.value).toContain('value: integer — not null — 42')
  }, 20_000)

  it('serves the newest rapid edit and never labels an older result with its version', async () => {
    const root = await project({
      'pgsid.yaml': config('queries/*.sql'),
      'migrations/001.sql': '',
      'queries/value.sql': '-- name: Initial :one\nSELECT 0 AS value;',
    })
    const queryPath = join(root, 'queries/value.sql')
    const queryUri = pathToFileURL(queryPath).href
    const languageServer = await start(root)
    await languageServer.server.drain()

    languageServer.client.notify('textDocument/didOpen', {
      textDocument: {
        uri: queryUri,
        languageId: 'sql',
        version: 1,
        text: '-- name: Initial :one\nSELECT 0 AS value;',
      },
    })
    await protocolTurn()
    const initialHover = await languageServer.client.request('textDocument/hover', {
      textDocument: { uri: queryUri },
      position: { line: 1, character: 10 },
    })
    expect(hoverResult(initialHover)?.contents.value).toContain('**Initial** `one`')
    languageServer.client.notify('textDocument/didChange', {
      textDocument: { uri: queryUri, version: 2 },
      contentChanges: [{ text: '-- name: Superseded :one\nSELECT +;' }],
    })
    languageServer.client.notify('textDocument/didChange', {
      textDocument: { uri: queryUri, version: 3 },
      contentChanges: [{ text: '-- name: Final :one\nSELECT 3 AS value;' }],
    })
    await protocolTurn()

    const hovered = await languageServer.client.request('textDocument/hover', {
      textDocument: { uri: queryUri },
      position: { line: 1, character: 10 },
    })
    expect(hoverResult(hovered)?.contents.value).toContain('**Final** `one`')
    expect(hoverResult(hovered)?.contents.value).toContain('value: integer — not null — 3')

    languageServer.client.notify('textDocument/didChange', {
      textDocument: { uri: queryUri, version: 4 },
      contentChanges: [{ text: '-- name: OldFailure :one\nSELECT * +;' }],
    })
    languageServer.client.notify('textDocument/didChange', {
      textDocument: { uri: queryUri, version: 5 },
      contentChanges: [{ text: '-- name: FinalFailure :one\nSELECT +;' }],
    })
    const failure = await languageServer.client.waitForDiagnostics(
      queryUri,
      ({ diagnostics, version }) => diagnostics.length > 0 && version === 5,
    )
    expect(diagnosticParams(failure)).toMatchObject({
      version: 5,
      diagnostics: [{ range: { start: { line: 1, character: 8 } } }],
    })

    const unavailable = await languageServer.client.request('textDocument/hover', {
      textDocument: { uri: queryUri },
      position: { line: 1, character: 4 },
    })
    expect(unavailable.result).toBeNull()
  }, 20_000)

  it('clears stale documents when overlays close, files disappear, and paths exclude them', async () => {
    const root = await project({
      'pgsid.yaml': config('queries/*.sql'),
      'migrations/001.sql': '',
      'queries/a.sql': '-- name: A :one\nSELECT +;',
      'queries/b.sql': '-- name: B :one\nSELECT +;',
    })
    const aPath = join(root, 'queries/a.sql')
    const bPath = join(root, 'queries/b.sql')
    const aUri = pathToFileURL(aPath).href
    const bUri = pathToFileURL(bPath).href
    const languageServer = await start(root)

    await Promise.all([
      languageServer.client.waitForDiagnostics(aUri, ({ diagnostics }) => diagnostics.length > 0),
      languageServer.client.waitForDiagnostics(bUri, ({ diagnostics }) => diagnostics.length > 0),
    ])

    languageServer.client.notify('textDocument/didOpen', {
      textDocument: {
        uri: aUri,
        languageId: 'sql',
        version: 1,
        text: '-- name: A :one\nSELECT 1 AS value;',
      },
    })
    await languageServer.client.waitForDiagnostics(
      aUri,
      ({ diagnostics, version }) => diagnostics.length === 0 && version === 1,
    )

    languageServer.client.notify('textDocument/didClose', { textDocument: { uri: aUri } })
    await languageServer.client.waitForDiagnostics(
      aUri,
      ({ diagnostics }) => diagnostics.length > 0,
    )

    await unlink(bPath)
    await languageServer.client.waitForDiagnostics(
      bUri,
      ({ diagnostics }) => diagnostics.length === 0,
    )

    await writeFile(join(root, 'pgsid.yaml'), config('queries/elsewhere/*.sql'))
    await languageServer.client.waitForDiagnostics(
      aUri,
      ({ diagnostics }) => diagnostics.length === 0,
    )
  }, 20_000)
})

const project = async (files: Readonly<Record<string, string>>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-language-server-'))
  roots.push(root)
  await writeProject(root, files)
  return root
}

const start = async (root: string): Promise<TestLanguageServer> => {
  const server = await startLanguageServer(root)
  servers.push(server)
  return server
}

const config = (paths: string): string => `
schema: migrations/*.sql
sql:
  paths: [${paths}]
  typecheck: { plpgsql: false }
`

const protocolTurn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))
