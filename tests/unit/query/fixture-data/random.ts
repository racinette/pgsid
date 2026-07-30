// ---------------------------------------------------------------------------
// Deterministic randomness, seeded by identity.
//
// Every value stream in the generator is seeded by the identity of the thing
// it fills — `schema.table.column` for values, `schema.table` for row counts —
// XORed with a single suite-wide `FUZZ_SEED`. The consequence is locality:
// adding a column perturbs only that column's values, and adding a table
// perturbs nothing else. A shared global stream would reshuffle everything
// downstream of any edit, which makes a witness-count regression impossible to
// attribute.
// ---------------------------------------------------------------------------

/**
 * The suite-wide seed. Fixed by default so witness counts are reproducible in
 * CI; override with `FUZZ_SEED=<int>` for an exploratory run.
 *
 * A varying seed in CI would let coverage drift between runs, so the suite
 * could weaken on an unlucky draw without ever failing.
 */
export const FUZZ_SEED = (() => {
  const raw = process.env.FUZZ_SEED;
  if (raw === undefined) return 0x5eed_1234 >>> 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`FUZZ_SEED must be an integer, got ${JSON.stringify(raw)}`);
  }
  return parsed >>> 0;
})();

/** FNV-1a over `key`, mixed with `salt`. */
export function hashSeed(key: string, salt: number = FUZZ_SEED): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h ^ salt) >>> 0;
}

export interface Rand {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** Uniform element of `items`. */
  pick<T>(items: readonly T[]): T;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** Uniform in [min, max), rounded to `decimals` places. */
  decimal(min: number, max: number, decimals: number): number;
}

/** mulberry32 — small, fast, and adequate for fixture data. */
export function makeRand(seed: number): Rand {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: items => {
      if (items.length === 0) throw new Error("pick() on an empty list");
      return items[Math.floor(next() * items.length)]!;
    },
    chance: p => next() < p,
    decimal: (min, max, decimals) => {
      const factor = 10 ** decimals;
      return Math.round((min + next() * (max - min)) * factor) / factor;
    },
  };
}
