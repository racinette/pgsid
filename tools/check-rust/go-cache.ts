import { execFile } from 'node:child_process'
import { lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

// Generated CHECK packages differ in almost every run, so Go rarely reuses this cache and only
// expires entries after days of disuse; across many parity and world runs it reached 17 GB and
// filled the disk.
export const checkGoCacheDirectory = '/tmp/pgsid-check-rust-go-cache'

const ownershipMarker = '.pgsid-check-go-cache'
const goCacheReadme = 'This directory holds cached build artifacts from the Go build system.'
const defaultLimitMegabytes = 4096

export type CheckGoCacheTrim =
  | { action: 'created' | 'kept'; bytes: number }
  | { action: 'cleaned'; bytes: number }
  | { action: 'skipped'; reason: string }

// Cleaning is limited to a directory this harness marked as its own. An existing directory
// without the marker is adopted only when it contains nothing but Go build cache files, so a
// path reused by something else is never emptied.
async function ownCache(directory: string): Promise<'created' | 'owned' | string> {
  let entries: string[]
  try {
    entries = await readdir(directory)
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') throw error
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, ownershipMarker), 'pgsid CHECK parity Go build cache\n')
    return 'created'
  }
  if (entries.includes(ownershipMarker)) return 'owned'
  const readme = entries.includes('README') ? await readFile(join(directory, 'README'), 'utf8') : ''
  const foreign = entries.filter(
    (entry) => !/^(?:[0-9a-f]{2}|README|trim\.txt|testexpire\.txt)$/u.test(entry),
  )
  if (!readme.startsWith(goCacheReadme))
    return `${directory} has no Go build cache README and no pgsid ownership marker`
  if (foreign.length)
    return `${directory} holds files a Go build cache does not create: ${foreign.slice(0, 3).join(', ')}`
  await writeFile(join(directory, ownershipMarker), 'pgsid CHECK parity Go build cache\n')
  return 'owned'
}

async function directoryBytes(directory: string): Promise<number> {
  let bytes = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) bytes += await directoryBytes(path)
    else if (entry.isFile()) bytes += (await lstat(path)).size
  }
  return bytes
}

export async function trimCheckGoCache(
  directory = checkGoCacheDirectory,
  limitBytes = Number(process.env['PGSID_CHECK_GO_CACHE_LIMIT_MB'] ?? defaultLimitMegabytes) *
    2 ** 20,
): Promise<CheckGoCacheTrim> {
  const ownership = await ownCache(directory)
  if (ownership === 'created') return { action: 'created', bytes: 0 }
  if (ownership !== 'owned') return { action: 'skipped', reason: ownership }
  const bytes = await directoryBytes(directory)
  if (bytes <= limitBytes) return { action: 'kept', bytes }
  // go clean removes only the cache's own entries and leaves the marker in place.
  await promisify(execFile)('go', ['clean', '-cache'], {
    env: { ...process.env, GOCACHE: directory },
  })
  return { action: 'cleaned', bytes }
}
