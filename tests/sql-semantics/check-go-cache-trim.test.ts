import { it, expect } from 'vitest'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { trimCheckGoCache } from '../../tools/check-rust/go-cache.js'

const readme =
  'This directory holds cached build artifacts from the Go build system.\nRun "go clean -cache" if the directory is getting too large.\n'

it('cleans only a Go build cache it owns once it exceeds the limit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-go-cache-trim-'))
  try {
    const created = join(root, 'created')
    expect(await trimCheckGoCache(created, 0)).toEqual({ action: 'created', bytes: 0 })
    expect(await readdir(created)).toEqual(['.pgsid-check-go-cache'])

    const adopted = join(root, 'adopted')
    await mkdir(join(adopted, '0a'), { recursive: true })
    await writeFile(join(adopted, 'README'), readme)
    await writeFile(join(adopted, 'trim.txt'), '0\n')
    await writeFile(join(adopted, '0a', '0a1b-d'), 'x'.repeat(4096))
    expect(await trimCheckGoCache(adopted, 1 << 20)).toMatchObject({ action: 'kept' })
    expect(await readdir(adopted)).toContain('.pgsid-check-go-cache')
    expect(await trimCheckGoCache(adopted, 1024)).toMatchObject({ action: 'cleaned' })
    const remaining = await readdir(adopted)
    expect(remaining).toContain('.pgsid-check-go-cache')
    expect(remaining).not.toContain('0a')

    for (const [name, files] of [
      ['foreign', { README: readme, 'notes.txt': 'keep me' }],
      ['unmarked', { 'notes.txt': 'keep me' }],
    ] as const) {
      const directory = join(root, name)
      await mkdir(join(directory, '0a'), { recursive: true })
      await writeFile(join(directory, '0a', 'entry'), 'x'.repeat(4096))
      for (const [file, content] of Object.entries(files))
        await writeFile(join(directory, file), content)
      expect(await trimCheckGoCache(directory, 0)).toMatchObject({ action: 'skipped' })
      expect((await readdir(directory)).sort()).toEqual(['0a', ...Object.keys(files)].sort())
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
