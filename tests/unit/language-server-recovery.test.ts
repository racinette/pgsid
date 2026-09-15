import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
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

describe('language-server project recovery', () => {
  it('invalidates hover through migration and config failures, clears them, and recovers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-language-server-recovery-'))
    roots.push(root)
    const configPath = join(root, 'pgsid.yaml')
    const migrationPath = join(root, 'migrations/001.sql')
    const queryPath = join(root, 'queries/value.sql')
    const migrationUri = pathToFileURL(migrationPath).href
    const configUri = pathToFileURL(configPath).href
    const queryUri = pathToFileURL(queryPath).href
    const validConfig = `
schema: migrations/*.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
`
    const validMigration = 'CREATE TABLE values_ (value integer NOT NULL);'
    await writeProject(root, {
      'pgsid.yaml': validConfig,
      'migrations/001.sql': validMigration,
      'queries/value.sql': '-- name: Value :one\nSELECT value FROM values_;',
    })
    const languageServer = await startLanguageServer(root)
    servers.push(languageServer)

    await expectHover(languageServer, queryUri, '**Value** `one`')

    await writeFile(migrationPath, 'CREATE TABLE values_ (')
    await languageServer.client.waitForDiagnostics(
      migrationUri,
      ({ diagnostics }) => diagnostics.length > 0,
    )
    await expectNoHover(languageServer, queryUri)

    await writeFile(migrationPath, validMigration)
    await languageServer.client.waitForDiagnostics(
      migrationUri,
      ({ diagnostics }) => diagnostics.length === 0,
    )
    await expectHover(languageServer, queryUri, 'value: integer — not null')

    await writeFile(configPath, 'schema: [')
    await languageServer.client.waitForDiagnostics(
      configUri,
      ({ diagnostics }) => diagnostics.length > 0,
    )
    await expectNoHover(languageServer, queryUri)

    await new Promise((resolve) => setTimeout(resolve, 150))
    await writeFile(configPath, validConfig)
    await languageServer.client.waitForDiagnostics(
      configUri,
      ({ diagnostics }) => diagnostics.length === 0,
    )
    await expectHover(languageServer, queryUri, '**Value** `one`')
  }, 30_000)
})

const expectHover = async (
  languageServer: TestLanguageServer,
  uri: string,
  expected: string,
): Promise<void> => {
  const response = await languageServer.client.request('textDocument/hover', {
    textDocument: { uri },
    position: { line: 1, character: 10 },
  })
  expect(hoverResult(response)?.contents.value).toContain(expected)
}

const expectNoHover = async (languageServer: TestLanguageServer, uri: string): Promise<void> => {
  const response = await languageServer.client.request('textDocument/hover', {
    textDocument: { uri },
    position: { line: 1, character: 10 },
  })
  expect(response.result).toBeNull()
}
