import { it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { claimTestRunDirectory, sharedTempDirectory } from '../../tools/test-run-temp.js'

it('removes the marked directories of finished runs and keeps live and foreign ones', async () => {
  const parent = await mkdtemp(join(sharedTempDirectory, 'pgsid-test-run-claim-'))
  try {
    const marked = async (name: string) => {
      await mkdir(join(parent, name, 'leftover'), { recursive: true })
      await writeFile(join(parent, name, '.pgsid-test-run'), '')
    }
    await marked('101')
    await marked('202')
    await mkdir(join(parent, '303', 'leftover'), { recursive: true })
    await mkdir(join(parent, 'notes'), { recursive: true })
    const { directory, removed } = claimTestRunDirectory(parent, 404, (pid) => pid === 202)
    expect(removed).toEqual([join(parent, '101')])
    expect(directory).toBe(join(parent, '404'))
    expect(existsSync(join(directory, '.pgsid-test-run'))).toBe(true)
    expect((await readdir(parent)).sort()).toEqual(['202', '303', '404', 'notes'])
    // A run reclaiming its own directory keeps what it already wrote there.
    await writeFile(join(directory, 'kept'), '')
    claimTestRunDirectory(parent, 404, () => false)
    expect((await readdir(directory)).sort()).toEqual(['.pgsid-test-run', 'kept'])
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})
