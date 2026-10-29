import { checkGoCacheDirectory, trimCheckGoCache } from './go-cache.js'

// Vitest runs global setup once before any worker starts, so no parity or world build is using
// the cache while it is cleaned.
export default async function setup(): Promise<void> {
  const result = await trimCheckGoCache()
  if (result.action === 'cleaned')
    console.log(
      `Cleaned the CHECK Go build cache at ${checkGoCacheDirectory} (${Math.round(result.bytes / 2 ** 20)} MB)`,
    )
  else if (result.action === 'skipped')
    console.warn(`Left the CHECK Go build cache untouched: ${result.reason}`)
}
