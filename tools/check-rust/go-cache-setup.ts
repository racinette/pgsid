import { join } from 'node:path'
import { checkGoCacheDirectory, trimCheckGoCache } from './go-cache.js'
import { sharedTempDirectory } from '../test-run-temp.js'

// The codegen and SQL semantics suites keep Go build caches of their own, which grow the same way.
const goCacheDirectories = [
  checkGoCacheDirectory,
  join(sharedTempDirectory, 'pgsid-codegen-go-cache'),
  join(sharedTempDirectory, 'pgsid-sql-semantics-go-cache'),
]

// Vitest runs global setup once before any worker starts, so no parity or world build is using
// a cache while it is cleaned.
export default async function setup(): Promise<void> {
  for (const directory of goCacheDirectories) {
    const result = await trimCheckGoCache(directory)
    if (result.action === 'cleaned')
      console.log(
        `Cleaned the Go build cache at ${directory} (${Math.round(result.bytes / 2 ** 20)} MB)`,
      )
    else if (result.action === 'skipped')
      console.warn(`Left the Go build cache untouched: ${result.reason}`)
  }
}
