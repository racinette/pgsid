import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'
import { writeCheckRustSources } from './sources.js'

// Parity suites share a handful of runtime variants (the maintained modules minus optional
// regex, timezone, Unicode and JSONPath families), so the runtime is compiled once per variant
// and each suite compiles only its generated checks against it.
export const checkRustRuntimeDirectory = '/tmp/pgsid-check-rust-runtime'

const ownershipMarker = '.pgsid-check-rust-runtime'
const crateName = 'pgsid_parity_runtime'
const keptVariants = 16
const run = promisify(execFile)

export async function ownDirectory(directory: string): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(directory)
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') throw error
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, ownershipMarker), 'pgsid CHECK parity Rust runtime cache\n')
    return
  }
  if (!entries.includes(ownershipMarker))
    throw new Error(`${directory} exists without the pgsid runtime cache marker`)
}

// Trimming keeps the most recently used variants, so every use marks its variant.
export async function useVariant(target: string): Promise<void> {
  const now = new Date()
  await utimes(target, now, now)
}

// Only directories named by a variant hash inside the marked directory are removed.
export async function trimVariants(directory: string): Promise<void> {
  const variants: { path: string; time: number }[] = []
  for (const entry of await readdir(directory, { withFileTypes: true }))
    if (entry.isDirectory() && /^[0-9a-f]{32}$/u.test(entry.name)) {
      const path = join(directory, entry.name)
      variants.push({ path, time: (await stat(path)).mtimeMs })
    }
  variants.sort((a, b) => b.time - a.time)
  for (const variant of variants.slice(keptVariants))
    await rm(variant.path, { recursive: true, force: true })
}

// Returns the compiled runtime library for the source's runtime modules. Items visible to the
// whole crate become public, because the checks now live in another crate.
export async function checkRustRuntimeLibrary(source: CheckRustSource): Promise<string> {
  const modules = source.modules.filter((module) => module.name !== 'checks')
  const version = (await run('rustc', ['--version'])).stdout
  const key = createHash('sha256')
    .update(version)
    .update(JSON.stringify(modules))
    .digest('hex')
    .slice(0, 32)
  await ownDirectory(checkRustRuntimeDirectory)
  const target = join(checkRustRuntimeDirectory, key)
  const library = join(target, `lib${crateName}.rlib`)
  try {
    await stat(library)
    await useVariant(target)
    return library
  } catch {
    // Not built yet.
  }
  const work = await mkdtemp(join(checkRustRuntimeDirectory, 'build-'))
  try {
    writeCheckRustSources(join(work, 'lib.rs'), { schemaVersion: 1, modules })
    const root = await readFile(join(work, 'lib.rs'), 'utf8')
    await writeFile(join(work, 'lib.rs'), root.replace(/^mod /gmu, 'pub mod '))
    for (const name of await readdir(join(work, 'lib-modules'))) {
      const path = join(work, 'lib-modules', name)
      await writeFile(path, (await readFile(path, 'utf8')).replaceAll('pub(crate)', 'pub'))
    }
    await run('rustc', [
      '--edition',
      '2021',
      '-Awarnings',
      '--crate-type',
      'rlib',
      '--crate-name',
      crateName,
      join(work, 'lib.rs'),
      '-o',
      join(work, `lib${crateName}.rlib`),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    try {
      await rename(work, target)
    } catch {
      // Another run built the same variant first.
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  await trimVariants(checkRustRuntimeDirectory)
  return library
}

// The crate root a suite's tests include: the runtime modules come from the shared library under
// their usual names, and only the generated checks module is compiled here.
export function linkedCheckRustRoot(source: CheckRustSource): string {
  const reexports = source.modules
    .filter((module) => module.name !== 'checks' && module.name !== 'regex_engine')
    .map((module) => `pub mod ${module.name} { pub use ${crateName}::${module.name}::*; }`)
  return [
    `extern crate ${crateName};`,
    ...reexports,
    '#[path = "checks-modules/checks.rs"]',
    'mod checks;',
    ...source.modules
      .filter((module) => module.name !== 'regex_engine')
      .map((module) => `pub use ${module.name}::*;`),
  ].join('\n')
}
