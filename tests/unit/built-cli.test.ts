import { execFile } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const run = promisify(execFile)
const repository = fileURLToPath(new URL('../../', import.meta.url))
const fixtureRoot = join(repository, 'tests/fixtures/codegen')

// The bundle resolves assets beside itself rather than beside its sources, so a file the
// bundle lacks fails only here, never in a suite that imports the sources.
it('generates the codegen project golden from the built command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-built-cli-'))
  try {
    await symlink(join(repository, 'node_modules'), join(root, 'node_modules'))
    await run('node', ['node_modules/tsup/dist/cli-default.js', '--out-dir', join(root, 'dist')], {
      cwd: repository,
    })
    await cp(join(fixtureRoot, 'project'), join(root, 'project'), { recursive: true })
    const { stdout } = await run('node', [join(root, 'dist/bin.js'), 'check'], {
      cwd: join(root, 'project'),
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    expect(stdout).toContain('check passed')
    expect(await fileTree(join(root, 'project/generated'))).toEqual(
      await fileTree(join(fixtureRoot, 'expected')),
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

const fileTree = async (root: string): Promise<Record<string, string>> => {
  const files = await walk(root)
  return Object.fromEntries(
    await Promise.all(
      files.map(async (path) => [
        relative(root, path).split(sep).join('/'),
        await readFile(path, 'utf8'),
      ]),
    ),
  )
}

const walk = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(root, entry.name)
      return entry.isDirectory() ? walk(path) : Promise.resolve([path])
    }),
  )
  return nested.flat().sort()
}
