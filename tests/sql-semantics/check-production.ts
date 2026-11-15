import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import type { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import type { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'

const run = promisify(execFile)

// Compiles generated TypeScript CHECKs beside their translated evaluator, where a project build
// writes them, and imports the compiled module.
export async function importTypescriptChecks(
  directory: string,
  artifacts: ReturnType<typeof renderTypescriptSchemaCheckArtifacts>,
): Promise<Record<string, unknown>> {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(directory, 'checks.ts'), artifacts.checks)
  if (artifacts.rustFiles)
    for (const artifact of checkTypescriptArtifacts(artifacts.rustFiles)) {
      const path = join(directory, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
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
    join(directory, 'checks.ts'),
  ]).catch((error: { stdout: string; stderr: string }) => {
    throw new Error(error.stdout + error.stderr, { cause: error })
  })
  return import(pathToFileURL(join(directory, 'js/checks.js')).href)
}

// Writes generated Go CHECKs and their translated evaluator into `directory`, which holds the
// package whose import path the CHECKs were rendered with.
export async function writeGoChecks(
  directory: string,
  artifacts: ReturnType<typeof renderGoSchemaCheckArtifacts>,
): Promise<void> {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'checks.go'), artifacts.checks)
  for (const [name, source] of Object.entries(artifacts.rustFiles ?? {})) {
    if (!source) continue
    const path = join(
      directory,
      'checkrust',
      name === 'checks'
        ? 'checks.go'
        : name === 'runtime'
          ? 'checkruntime/runtime.go'
          : name === 'language'
            ? 'langruntime/runtime.go'
            : name === 'regex'
              ? 'regexengine/regex.go'
              : 'pg_catalog/operations.go',
    )
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, source)
  }
}
