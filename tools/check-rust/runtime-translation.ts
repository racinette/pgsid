import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { checkRustAsset } from '../../src/codegen/shared/check-rust-assets.js'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'
import {
  checkTypescriptArtifacts,
  translateCheckRustChecks,
  translateCheckRustRuntime,
  type CheckRustRuntimeTranslation,
} from '../../src/codegen/shared/check-rust-transpile.js'
import {
  checkRustRuntimeDirectory,
  ownDirectory,
  trimVariants,
  useVariant,
} from './rust-runtime.js'

// The runtime is translated once per variant and each parity group translates only its checks.
// The key covers everything the translation reads: the runtime modules, the translator assets
// and the TypeScript translator sources, so a changed translator never reuses a stale runtime.
const translatorSources = [
  'src/codegen/shared/check-rust-transpile.ts',
  'tools/check-transpiler/typescript/transpile.ts',
  'tools/check-transpiler/typescript/split.ts',
  'tools/check-transpiler/typescript/rust-wasm.ts',
  'tools/check-transpiler/typescript/go-wasm.ts',
]
const translatorAssets = [
  'check-rust-parser.wasm',
  'check-go-transpiler.wasm',
  'check-ts-prelude.ts',
]

let translatorKey: string | undefined
const translations = new Map<string, Promise<CheckRustRuntimeTranslation>>()

function variantKey(source: CheckRustSource, schemaImportPath: string): string {
  if (!translatorKey) {
    const hash = createHash('sha256')
    for (const path of translatorSources) hash.update(path).update(readFileSync(path))
    for (const name of translatorAssets) hash.update(name).update(checkRustAsset(name))
    translatorKey = hash.digest('hex')
  }
  return createHash('sha256')
    .update(translatorKey)
    .update(schemaImportPath)
    .update(JSON.stringify(source.modules.filter((module) => module.name !== 'checks')))
    .digest('hex')
    .slice(0, 32)
}

async function runtimeTranslation(
  source: CheckRustSource,
  schemaImportPath: string,
  key: string,
): Promise<CheckRustRuntimeTranslation> {
  await ownDirectory(checkRustRuntimeDirectory)
  const target = join(checkRustRuntimeDirectory, key)
  const path = join(target, 'translation.json')
  try {
    const translation = JSON.parse(await readFile(path, 'utf8')) as CheckRustRuntimeTranslation
    await useVariant(target)
    return translation
  } catch {
    // Not translated yet.
  }
  const translation = translateCheckRustRuntime(source, schemaImportPath)
  await mkdir(target, { recursive: true })
  const partial = `${path}.${process.pid}`
  try {
    await writeFile(partial, JSON.stringify(translation))
    await rename(partial, path)
  } finally {
    await rm(partial, { force: true })
  }
  await trimVariants(checkRustRuntimeDirectory)
  return translation
}

export type CheckRustTranslation = ReturnType<typeof translateCheckRustChecks> & {
  variant: string
}

export async function checkRustTranslation(
  source: CheckRustSource,
  schemaImportPath: string,
): Promise<CheckRustTranslation> {
  const key = variantKey(source, schemaImportPath)
  let runtime = translations.get(key)
  if (!runtime) {
    runtime = runtimeTranslation(source, schemaImportPath, key)
    translations.set(key, runtime)
    runtime.catch(() => translations.delete(key))
  }
  const translation = await runtime
  const variant = join(checkRustRuntimeDirectory, key)
  // Another run may have trimmed the variant since this process translated it.
  await mkdir(variant, { recursive: true })
  await useVariant(variant)
  return { ...translateCheckRustChecks(source, translation, schemaImportPath), variant }
}

export const typescriptCompilerFlags = [
  '--strict',
  '--skipLibCheck',
  '--target',
  'es2022',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
]

const typescriptRuntimes = new Map<string, Promise<string>>()

// The runtime TypeScript is written to the variant once and type-checked there, emitting its
// declarations: a group then type-checks its checks against the declarations alone, and
// imports the runtime from one path, so the modules load once per process.
export async function checkTypescriptRuntime(translation: CheckRustTranslation): Promise<string> {
  let prepared = typescriptRuntimes.get(translation.variant)
  if (prepared) {
    // Another run may have trimmed the variant since this process prepared it.
    const path = await prepared.catch(() => undefined)
    if (!path || !(await stat(join(path, 'declarations')).catch(() => undefined))) {
      typescriptRuntimes.delete(translation.variant)
      prepared = undefined
    }
  }
  if (!prepared) {
    prepared = prepareTypescriptRuntime(translation)
    typescriptRuntimes.set(translation.variant, prepared)
    prepared.catch(() => typescriptRuntimes.delete(translation.variant))
  }
  return prepared
}

async function prepareTypescriptRuntime(translation: CheckRustTranslation): Promise<string> {
  const target = join(translation.variant, 'typescript')
  try {
    await stat(join(target, 'declarations'))
    return target
  } catch {
    // Not prepared yet.
  }
  const work = await mkdtemp(join(translation.variant, 'typescript-'))
  try {
    const paths: string[] = []
    for (const artifact of checkTypescriptArtifacts({ ...translation.typescript, checks: '' })) {
      const path = join(work, 'source', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
      paths.push(path)
    }
    await promisify(execFile)(process.execPath, [
      'node_modules/typescript/bin/tsc',
      ...typescriptCompilerFlags,
      '--declaration',
      '--emitDeclarationOnly',
      '--rootDir',
      join(work, 'source'),
      '--outDir',
      join(work, 'declarations'),
      ...paths,
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    try {
      await rename(work, target)
    } catch {
      // Another run prepared the same runtime first.
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  return target
}
