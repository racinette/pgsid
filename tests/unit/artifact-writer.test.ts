import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { applyProjectBuildEvents } from '../../src/artifact-writer.js'
import type { ProjectArtifact, ProjectBuildEvent } from '../../src/project-build.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

const artifact = (path: string, content: string): ProjectArtifact => ({
  path,
  sourcePath: 'queries/example.sql',
  kind: 'types',
  content,
  hash: content,
})

describe('applyProjectBuildEvents', () => {
  it('writes atomically, skips equal content, and removes generated artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-artifact-writer-'))
    roots.push(root)
    const path = join(root, 'generated/nested/example.ts')
    const first = artifact(path, 'export type Value = string\n')
    const second = artifact(path, 'export type Value = number\n')

    const added = await applyProjectBuildEvents([{ kind: 'artifact-added', artifact: first }])
    expect(added).toMatchObject({ written: 1, unchanged: 0, removed: 0, missing: 0 })
    await expect(readFile(path, 'utf8')).resolves.toBe(first.content)
    expect(
      (await readdir(join(root, 'generated/nested'))).filter((name) => name.endsWith('.tmp')),
    ).toEqual([])

    const before = await stat(path)
    const unchanged = await applyProjectBuildEvents([
      { kind: 'artifact-changed', previous: first, artifact: first },
    ])
    expect(unchanged).toMatchObject({ written: 0, unchanged: 1 })
    expect((await stat(path)).mtimeMs).toBe(before.mtimeMs)

    const changed = await applyProjectBuildEvents([
      { kind: 'artifact-changed', previous: first, artifact: second },
    ])
    expect(changed).toMatchObject({ written: 1, unchanged: 0 })
    await expect(readFile(path, 'utf8')).resolves.toBe(second.content)

    const removed = await applyProjectBuildEvents([{ kind: 'artifact-removed', artifact: second }])
    expect(removed).toMatchObject({ removed: 1, missing: 0 })
    await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' })

    const missing = await applyProjectBuildEvents([{ kind: 'artifact-removed', artifact: second }])
    expect(missing).toMatchObject({ removed: 0, missing: 1 })
  })

  it('ignores diagnostic events and replaces unrelated disk content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-artifact-writer-'))
    roots.push(root)
    const path = join(root, 'generated.ts')
    const generated = artifact(path, 'generated\n')
    await writeFile(path, 'stale\n')
    const events: ProjectBuildEvent[] = [
      {
        kind: 'project-diagnostics-changed',
        previous: [],
        diagnostics: [],
      },
      { kind: 'artifact-added', artifact: generated },
    ]

    const update = await applyProjectBuildEvents(events)
    expect(update.results.map((result) => result.kind)).toEqual(['written'])
    await expect(readFile(path, 'utf8')).resolves.toBe('generated\n')
  })
})
