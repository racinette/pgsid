import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { attachLanguageServerProcess, writeProject } from './language-server-harness.js'

const roots: string[] = []
const children: ChildProcessWithoutNullStreams[] = []
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('pgsid-language-server executable', () => {
  it('speaks framed JSON-RPC on stdio without contaminating stdout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-language-server-bin-'))
    roots.push(root)
    await writeProject(root, {
      'pgsid.yaml': `
schema: migrations/*.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
`,
      'migrations/001.sql': '',
      'queries/value.sql': '-- name: Value :one\nSELECT 1 AS value;',
    })
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', join(packageRoot, 'src/language-server-bin.ts')],
      { cwd: packageRoot },
    )
    children.push(child)
    const client = attachLanguageServerProcess(child)
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })

    let initialized
    try {
      initialized = await client.request('initialize', {
        processId: null,
        rootUri: pathToFileURL(root).href,
        capabilities: {},
      })
    } catch (error) {
      throw new Error(`Language-server process did not initialize. stderr: ${stderr}`, {
        cause: error,
      })
    }
    expect(initialized.result).toMatchObject({
      capabilities: { hoverProvider: true, positionEncoding: 'utf-16', textDocumentSync: 2 },
      serverInfo: { name: 'pgsid' },
    })
    client.notify('initialized', {})
    const shutdown = await client.request('shutdown', null, 20_000)
    expect(shutdown.result).toBeNull()
    const exited = once(child, 'exit')
    client.notify('exit', null)

    const [code, signal] = (await exited) as [number | null, NodeJS.Signals | null]
    expect({ code, signal, stderr }).toEqual({ code: 0, signal: null, stderr: '' })
  }, 30_000)
})
