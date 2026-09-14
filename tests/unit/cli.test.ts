import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCli, type CliEnvironment } from '../../src/cli.js'
import {
  EMPTY_PROJECT_BUILD_STATE,
  type ProjectBuildUpdate,
  type ProjectDiagnostic,
} from '../../src/project-build.js'
import type { ProjectRuntime } from '../../src/project-runtime.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

const update = (...diagnostics: ProjectDiagnostic[]): ProjectBuildUpdate => ({
  state: { ...EMPTY_PROJECT_BUILD_STATE, diagnostics },
  events: [],
  stats: {
    parseCacheHits: 0,
    parseCacheMisses: 0,
    analysisCacheHits: 0,
    analysisCacheMisses: 0,
    renderCacheHits: 0,
    renderCacheMisses: 0,
  },
})

const output = (cwd = '/workspace') => {
  let stdout = ''
  let stderr = ''
  const environment: CliEnvironment = {
    cwd,
    writeOutput: (content) => {
      stdout += content
    },
    writeError: (content) => {
      stderr += content
    },
  }
  return {
    environment,
    stdout: () => stdout,
    stderr: () => stderr,
  }
}

describe('runCli', () => {
  it('prints help without starting a build', async () => {
    const io = output()
    const build = vi.fn()

    const exitCode = await runCli(['--help'], { ...io.environment, build })

    expect(exitCode).toBe(0)
    expect(io.stdout()).toContain('Usage: pgsid [check|watch]')
    expect(build).not.toHaveBeenCalled()
  })

  it('checks a selected config and exits nonzero for errors', async () => {
    const io = output()
    const build = vi.fn(async () =>
      update({
        source: 'query',
        path: 'queries/account.sql',
        diagnostic: {
          code: 'parse-error',
          message: 'syntax error',
          start: 18,
          end: 24,
        },
      }),
    )

    const exitCode = await runCli(['check', '--config', 'config/pgsid.yaml'], {
      ...io.environment,
      build,
    })

    expect(exitCode).toBe(1)
    expect(build).toHaveBeenCalledWith({ configPath: '/workspace/config/pgsid.yaml' })
    expect(io.stdout()).toContain('queries/account.sql:18-24: error parse-error: syntax error')
  })

  it('promotes analysis warnings only in strict mode', async () => {
    const diagnostic: ProjectDiagnostic = {
      source: 'analysis',
      queryId: 'queries/account.sql\u0000GetAccount',
      diagnostic: {
        code: 'nullability-unsupported',
        severity: 'warning',
        message: 'unsupported expression',
      },
    }
    const normal = output()
    const strict = output()

    expect(await runCli([], { ...normal.environment, build: async () => update(diagnostic) })).toBe(
      0,
    )
    expect(
      await runCli(['--strict'], {
        ...strict.environment,
        build: async () => update(diagnostic),
      }),
    ).toBe(1)
    expect(normal.stdout()).toContain('warning nullability-unsupported')
    expect(strict.stdout()).toContain('error nullability-unsupported')
    expect(strict.stdout()).not.toContain('\u0000')
  })

  it('runs the one-shot project build from the command boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-cli-'))
    roots.push(root)
    await Promise.all([
      mkdir(join(root, 'migrations')),
      mkdir(join(root, 'queries')),
      writeFile(
        join(root, 'pgsid.yaml'),
        `schema: migrations/*.sql
sql:
  paths: [queries/*.sql]
  typecheck: { plpgsql: false }
  codegen:
    typescript:
      queries:
        out:
          queries: generated
`,
      ),
    ])
    await Promise.all([
      writeFile(join(root, 'migrations/001.sql'), 'CREATE TABLE account (id bigint);'),
      writeFile(
        join(root, 'queries/account.sql'),
        '-- name: ListAccounts :many\nSELECT id FROM account;',
      ),
    ])
    const io = output(root)

    const exitCode = await runCli([], io.environment)

    expect(exitCode).toBe(0)
    expect(io.stdout()).toBe('pgsid: check passed\n')
    await expect(readFile(join(root, 'generated/account.ts'), 'utf8')).resolves.toContain(
      'export type ListAccountsRow = { "id": string | null }',
    )
  })

  it('runs watch updates until shutdown and closes the runtime', async () => {
    const io = output()
    const close = vi.fn(async () => undefined)
    const runtime = { close } as unknown as ProjectRuntime
    const watch: NonNullable<CliEnvironment['watch']> = vi.fn(async (options) => {
      options.onUpdate?.(update())
      return runtime
    })

    const exitCode = await runCli(['watch'], {
      ...io.environment,
      watch,
      waitForShutdown: async () => undefined,
    })

    expect(exitCode).toBe(0)
    expect(watch).toHaveBeenCalledWith(expect.objectContaining({ baseDirectory: '/workspace' }))
    expect(io.stdout()).toBe('pgsid: check passed\n')
    expect(close).toHaveBeenCalledOnce()
  })

  it('reports a watch startup failure once', async () => {
    const io = output()
    const failure = new Error('migration failed')
    const watch: NonNullable<CliEnvironment['watch']> = async (options) => {
      options.onError?.(failure)
      throw failure
    }

    const exitCode = await runCli(['watch'], { ...io.environment, watch })

    expect(exitCode).toBe(1)
    expect(io.stderr()).toBe('pgsid: migration failed\n')
  })

  it('rejects unknown arguments before starting the runtime', async () => {
    const io = output()

    const exitCode = await runCli(['--wat'], io.environment)

    expect(exitCode).toBe(2)
    expect(io.stderr()).toContain('Unknown argument "--wat"')
    expect(io.stderr()).toContain('Usage: pgsid [check|watch]')
  })
})
