import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { ProjectArtifact, ProjectBuildEvent } from './project-build.js'

export type ArtifactWriteResult =
  | { kind: 'written'; artifact: ProjectArtifact }
  | { kind: 'unchanged'; artifact: ProjectArtifact }
  | { kind: 'removed'; artifact: ProjectArtifact }
  | { kind: 'missing'; artifact: ProjectArtifact }

export interface ArtifactWriteUpdate {
  results: readonly ArtifactWriteResult[]
  written: number
  unchanged: number
  removed: number
  missing: number
}

export async function applyProjectBuildEvents(
  events: readonly ProjectBuildEvent[],
): Promise<ArtifactWriteUpdate> {
  const results: ArtifactWriteResult[] = []
  for (const event of events) {
    if (event.kind === 'project-diagnostics-changed') continue
    if (event.kind === 'artifact-removed') {
      results.push(await removeArtifact(event.artifact))
      continue
    }
    results.push(await writeArtifact(event.artifact))
  }
  return {
    results,
    written: count(results, 'written'),
    unchanged: count(results, 'unchanged'),
    removed: count(results, 'removed'),
    missing: count(results, 'missing'),
  }
}

const writeArtifact = async (artifact: ProjectArtifact): Promise<ArtifactWriteResult> => {
  if ((await existingContent(artifact.path)) === artifact.content) {
    return { kind: 'unchanged', artifact }
  }
  const directory = dirname(artifact.path)
  await mkdir(directory, { recursive: true })
  const temporaryPath = join(
    directory,
    `.${basename(artifact.path)}.${process.pid}.${randomUUID()}.tmp`,
  )
  try {
    const file = await open(temporaryPath, 'wx')
    try {
      await file.writeFile(artifact.content, 'utf8')
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporaryPath, artifact.path)
  } catch (error) {
    await unlinkIfPresent(temporaryPath)
    throw error
  }
  return { kind: 'written', artifact }
}

const removeArtifact = async (artifact: ProjectArtifact): Promise<ArtifactWriteResult> => {
  try {
    await unlink(artifact.path)
    return { kind: 'removed', artifact }
  } catch (error) {
    if (isMissing(error)) return { kind: 'missing', artifact }
    throw error
  }
}

const existingContent = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
}

const unlinkIfPresent = async (path: string): Promise<void> => {
  try {
    await unlink(path)
  } catch (error) {
    if (!isMissing(error)) throw error
  }
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const count = (
  results: readonly ArtifactWriteResult[],
  kind: ArtifactWriteResult['kind'],
): number => results.filter((result) => result.kind === kind).length
