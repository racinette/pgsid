import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A test run that is killed before its own cleanup leaves its temporary files behind: test
// directories, Vitest's transformed modules and Go build work directories. Repeated across many
// killed runs they filled the disk. Each run therefore works in a directory named by its process,
// and a later run removes it once that process is gone.
const runMarker = '.pgsid-test-run'

// Caches that should outlive a run keep the temporary directory the run started with.
export const sharedTempDirectory = process.env['PGSID_SHARED_TMPDIR'] ?? tmpdir()

const processAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as { code?: string }).code === 'EPERM'
  }
}

// Only directories this harness marked are removed, so a reused parent path keeps foreign files.
export function claimTestRunDirectory(
  parent = join(sharedTempDirectory, 'pgsid-test-runs'),
  pid = process.pid,
  alive = processAlive,
): { directory: string; removed: string[] } {
  mkdirSync(parent, { recursive: true })
  const removed: string[] = []
  for (const name of readdirSync(parent)) {
    if (!/^\d+$/u.test(name) || Number(name) === pid || alive(Number(name))) continue
    const stale = join(parent, name)
    if (!existsSync(join(stale, runMarker))) continue
    rmSync(stale, { recursive: true, force: true })
    removed.push(stale)
  }
  const directory = join(parent, String(pid))
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, runMarker), '')
  return { directory, removed }
}

// Child processes inherit the redirected temporary directory, so Go and Rust builds started by a
// test also work inside the run's directory.
export function useTestRunDirectory(): string {
  const { directory } = claimTestRunDirectory()
  process.env['PGSID_SHARED_TMPDIR'] = sharedTempDirectory
  process.env['TMPDIR'] = directory
  process.env['GOTMPDIR'] = directory
  process.once('exit', () => rmSync(directory, { recursive: true, force: true }))
  return directory
}
