import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { yieldPgliteToEventLoop } from '../../tools/pglite-yield.js'

it('lets timers run while a suite awaits a long run of PGlite queries', async () => {
  // The setup file has patched PGlite already; patching again changes nothing.
  const exchange = PGlite.prototype.execProtocolRaw
  yieldPgliteToEventLoop()
  expect(PGlite.prototype.execProtocolRaw).toBe(exchange)
  const pg = await PGlite.create()
  try {
    let fired = false
    setTimeout(() => (fired = true), 0)
    const started = performance.now()
    let queries = 0
    while (!fired && performance.now() - started < 10_000) {
      expect((await pg.query<{ x: number }>('SELECT $1::int + 1 AS x', [queries])).rows).toEqual([
        { x: queries + 1 },
      ])
      queries++
    }
    expect(fired).toBe(true)
    await pg.transaction(async (tx) =>
      expect((await tx.query('SELECT 1 AS one')).rows).toEqual([{ one: 1 }]),
    )
  } finally {
    await pg.close()
  }
})
