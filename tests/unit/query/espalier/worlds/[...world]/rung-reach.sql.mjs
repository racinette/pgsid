import { tsImport } from 'tsx/esm/api'

const { combineRungSources, measureRungReach, pairMembers } = await tsImport(
  '../../../rung-cooccurrence.ts',
  import.meta.url,
)

export const aggregate = true
export const targets = ['*/*.sql']
export const unobservedImplementationDependencies = ['killable-evaluator.worker.mjs']

export const rule = `Require every isolated world to exercise at least nine
query-analysis decision rungs and eighteen rung pairs. Across the worlds, the
distinct pair union must contain at least eighteen pairs plus four for every
world after the first, and each later world must itself add four pairs beyond
the union of its predecessors. World directory ordinals define that admission
order. Presence-group and joint-parameter mechanisms do not emit column-trace
conclusions and are outside this constraint.`

// These are historical floors established by the first admitted world. Raise
// them when the corpus improves; lower one only for a deliberate loss.
const RATCHET = {
  rungsPerWorld: 9,
  pairsPerWorld: 18,
  initialPairUnion: 18,
  pairUnionGrowth: 4,
}

const WORLD_NAME = /^(\d{3})_[a-z][a-z0-9_-]*$/

const difference = (left, right) => [...left].filter((value) => !right.has(value)).sort()

function worldInputs(matches) {
  const byName = new Map()
  for (const { path } of matches) {
    const parts = path.split('/')
    if (parts.length !== 3 || parts[0] !== 'worlds') continue
    const paths = byName.get(parts[1]) ?? []
    paths.push(path)
    byName.set(parts[1], paths)
  }
  const entries = [...byName].map(([name, paths]) => {
    const match = WORLD_NAME.exec(name)
    return { name, ordinal: match === null ? null : Number(match[1]), paths: paths.sort() }
  })
  entries.sort(
    (left, right) =>
      (left.ordinal ?? Number.POSITIVE_INFINITY) - (right.ordinal ?? Number.POSITIVE_INFINITY) ||
      left.name.localeCompare(right.name),
  )
  return entries
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

export async function lint({ matches, read, emit }) {
  const inputs = worldInputs(matches)
  const invalidNames = inputs.filter((world) => world.ordinal === null || world.ordinal === 0)
  for (const world of invalidNames) {
    emit({
      code: 'world_admission_order_invalid',
      path: `worlds/${world.name}/schema.sql`,
      message:
        `${world.name}: world directories must use a non-zero, three-digit admission ` +
        `prefix followed by a lowercase name (for example 003_billing)`,
    })
  }

  const actualOrdinals = inputs
    .map((world) => world.ordinal)
    .filter((ordinal) => ordinal !== null && ordinal !== 0)
  const expectedOrdinals = Array.from({ length: inputs.length }, (_, index) => index + 1)
  if (
    invalidNames.length === 0 &&
    (actualOrdinals.length !== expectedOrdinals.length ||
      actualOrdinals.some((ordinal, index) => ordinal !== expectedOrdinals[index]))
  ) {
    emit({
      code: 'world_admission_order_invalid',
      message:
        `world admission prefixes must be unique and contiguous from 001; found ` +
        `${actualOrdinals.map((ordinal) => String(ordinal).padStart(3, '0')).join(', ')}`,
    })
  }

  const measured = await measureRungReach({
    read,
    worlds: inputs,
  })
  const worlds = combineRungSources('worlds', measured.worlds)
  const worldCount = measured.worlds.length
  const pairUnionFloor =
    worldCount === 0 ? 0 : RATCHET.initialPairUnion + RATCHET.pairUnionGrowth * (worldCount - 1)
  const averageRungs =
    worldCount === 0
      ? 0
      : measured.worlds.reduce((total, world) => total + world.rungs.size, 0) / worldCount
  const averagePairs =
    worldCount === 0
      ? 0
      : measured.worlds.reduce((total, world) => total + world.pairs.size, 0) / worldCount

  emit({
    code: 'world_rung_reach',
    severity: 'info',
    message:
      `${worldCount} ${plural(worldCount, 'world')} ${worldCount === 1 ? 'exercises' : 'exercise'} ` +
      `${worlds.rungs.size} rungs and ` +
      `${worlds.pairs.size} pairs over ${worlds.statements} statements; averages are ` +
      `${averageRungs.toFixed(2)} rungs and ${averagePairs.toFixed(2)} pairs per world. ` +
      `The distinct pair-union floor is ${pairUnionFloor}.`,
    metadata: {
      sourceRungs: measured.patterns.length,
      worlds: {
        count: worldCount,
        statements: worlds.statements,
        rungs: worlds.rungs.size,
        pairs: worlds.pairs.size,
        averageRungs,
        averagePairs,
        pairUnionFloor,
      },
    },
  })

  if (worlds.pairs.size < pairUnionFloor) {
    emit({
      code: 'world_pair_diversity_below_floor',
      message:
        `${worlds.pairs.size} distinct rung pairs across ${worldCount} ` +
        `${plural(worldCount, 'world')}; ${pairUnionFloor} required`,
    })
  }

  const predecessorPairs = new Set()
  for (const [index, world] of measured.worlds.entries()) {
    const marginalPairs = difference(world.pairs, predecessorPairs)
    const preview = marginalPairs
      .slice(0, 6)
      .map((pair) => pairMembers(pair).join(' + '))
      .join('; ')

    if (world.rungs.size < RATCHET.rungsPerWorld) {
      emit({
        code: 'world_rung_reach_below_floor',
        path: `worlds/${world.label}/schema.sql`,
        message: `${world.label}: ${world.rungs.size} rungs; ${RATCHET.rungsPerWorld} required`,
      })
    }
    if (world.pairs.size < RATCHET.pairsPerWorld) {
      emit({
        code: 'world_pair_reach_below_floor',
        path: `worlds/${world.label}/schema.sql`,
        message: `${world.label}: ${world.pairs.size} rung pairs; ${RATCHET.pairsPerWorld} required`,
      })
    }
    if (index > 0 && marginalPairs.length < RATCHET.pairUnionGrowth) {
      emit({
        code: 'world_pair_marginal_below_floor',
        path: `worlds/${world.label}/schema.sql`,
        message:
          `${world.label}: adds ${marginalPairs.length} rung pairs beyond its predecessors; ` +
          `${RATCHET.pairUnionGrowth} required`,
      })
    }

    emit({
      code: 'world_rung_reach_detail',
      severity: 'info',
      path: `worlds/${world.label}/schema.sql`,
      message:
        `${world.label}: ${world.statements} statements exercise ${world.rungs.size} rungs and ` +
        `${world.pairs.size} pairs; ${marginalPairs.length} pairs are new beyond its predecessors` +
        `${preview === '' ? '.' : `. Marginal-pair sample: ${preview}.`}`,
      metadata: {
        statements: world.statements,
        rungs: world.rungs.size,
        pairs: world.pairs.size,
        marginalPairs: marginalPairs.map((pair) => pairMembers(pair)),
      },
    })

    for (const pair of world.pairs) predecessorPairs.add(pair)
  }
}
