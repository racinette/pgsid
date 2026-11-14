import { PGlite } from '@electric-sql/pglite'

// PGlite runs PostgreSQL in the calling thread and settles each query through promises alone, so
// a suite awaiting thousands of queries never lets the worker reach its event loop. Vitest's
// worker gives up on a report to the main process after 60 seconds without an answer, and under
// load such a loop outlasts that: the run then fails with every test passed. Each protocol
// exchange therefore first lets the event loop run once its share of time has passed.
const yieldInterval = 50

const patched = Symbol.for('pgsid.pgliteYield')

type Patchable = { execProtocolRaw: (...args: never[]) => Promise<unknown>; [patched]?: true }

export function yieldPgliteToEventLoop(prototype: Patchable = PGlite.prototype as never): void {
  if (prototype[patched]) return
  const exchange = prototype.execProtocolRaw
  let yielded = performance.now()
  prototype.execProtocolRaw = async function (this: unknown, ...args: never[]) {
    if (performance.now() - yielded > yieldInterval) {
      await new Promise((resolve) => setImmediate(resolve))
      yielded = performance.now()
    }
    return exchange.apply(this, args)
  }
  prototype[patched] = true
}

yieldPgliteToEventLoop()
