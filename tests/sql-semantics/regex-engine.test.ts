import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { transpileCheckRustFiles } from '../../src/codegen/shared/check-rust-transpile.js'
import { checkTypescriptArtifacts } from '../../tools/check-transpiler/typescript/split.js'
import { checkEngine } from './regex-engine/engine-check.js'
import { checkFixtures } from './regex-engine/fixture-check.js'
import { checkSmoke } from './regex-engine/smoke-check.js'

const run = promisify(execFile)
const repository = fileURLToPath(new URL('../../', import.meta.url))
const support = fileURLToPath(new URL('./regex-engine/', import.meta.url))
const conformance = join(repository, 'crates/regex-engine/conformance')
const fixtures = [
  'postgres-fixtures.json',
  'stress-fixtures.json',
  'targeted-postgres-fixtures.json',
  'stress-position-fixtures.json',
  'stress-boundary-fixtures.json',
  'stress-classification-fixtures.json',
]

// The translation production gives the regex engine module, from a Rust source written in the
// engine's dialect.
async function translate(path: string) {
  const source = await readFile(join(repository, path), 'utf8')
  return transpileCheckRustFiles(
    {
      schemaVersion: 1,
      modules: [{ name: 'regex_engine', dependencies: [], files: [{ path, source }] }],
    },
    'regexprobe/pg_catalog',
  )
}

async function typescriptModule(
  directory: string,
  files: Awaited<ReturnType<typeof translate>>['typescript'],
): Promise<unknown> {
  await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
  for (const artifact of checkTypescriptArtifacts(files)) {
    await mkdir(dirname(join(directory, artifact.path)), { recursive: true })
    await writeFile(join(directory, artifact.path), artifact.content)
  }
  const entry = join(directory, 'regexengine/regex.ts')
  await run('node_modules/.bin/tsc', [
    '--strict',
    '--skipLibCheck',
    '--target',
    'es2022',
    '--module',
    'nodenext',
    '--moduleResolution',
    'nodenext',
    '--outDir',
    join(directory, 'js'),
    entry,
  ]).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
  })
  return import(pathToFileURL(join(directory, 'js/regexengine/regex.js')).href)
}

async function goTest(
  directory: string,
  files: Awaited<ReturnType<typeof translate>>['go'],
  tests: string[],
  data: string[] = [],
): Promise<void> {
  await writeFile(join(directory, 'go.mod'), 'module regexprobe\n\ngo 1.25\n')
  await mkdir(join(directory, 'regexengine'), { recursive: true })
  await mkdir(join(directory, 'langruntime'), { recursive: true })
  await writeFile(join(directory, 'regexengine/regex.go'), files.regex)
  await writeFile(join(directory, 'langruntime/runtime.go'), files.language)
  for (const test of tests)
    await copyFile(join(support, test), join(directory, 'regexengine', test))
  for (const path of data)
    await copyFile(path, join(directory, 'regexengine', path.split('/').pop()!))
  await run('go', ['test', './regexengine'], { cwd: directory }).catch(
    (error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    },
  )
}

async function scratch<T>(body: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-engine-'))
  try {
    return await body(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

describe('translated regex engine', () => {
  it('agrees with every stored PostgreSQL observation in TypeScript', async () => {
    const files = await translate('crates/regex-engine/src/lib.rs')
    await scratch(async (directory) => {
      const generated = await typescriptModule(directory, files.typescript)
      checkEngine(generated)
      const coverage = checkFixtures(
        generated,
        fixtures.map((name) => join(conformance, name)),
      )
      for (const operation of ['find', 'count', 'captures', 'find_all', 'captures_all'])
        expect(coverage[operation], operation).toBeGreaterThan(0)
    })
  }, 300_000)

  it('agrees with every stored PostgreSQL observation in Go', async () => {
    const files = await translate('crates/regex-engine/src/lib.rs')
    await scratch((directory) =>
      goTest(
        directory,
        files.go,
        ['engine_test.go', 'public_engine_test.go', 'fixture_test.go'],
        fixtures.map((name) => join(conformance, name)),
      ),
    )
  }, 300_000)

  it('keeps the dialect smoke source behavior in both targets', async () => {
    const files = await translate('tools/check-transpiler/transpiler_smoke.rs')
    await scratch(async (directory) => {
      checkSmoke(await typescriptModule(directory, files.typescript))
    })
    await scratch((directory) =>
      goTest(directory, files.go, ['smoke_test.go', 'public_smoke_test.go']),
    )
  }, 300_000)
})
