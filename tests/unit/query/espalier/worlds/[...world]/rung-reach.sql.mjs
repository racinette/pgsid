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
world after the first. Presence-group and joint-parameter mechanisms do not
emit column-trace conclusions and are outside this constraint.`

// These are historical floors established by the first admitted world. Raise
// them when the corpus improves; lower one only for a deliberate loss.
const RATCHET = {
  rungsPerWorld: 9,
  pairsPerWorld: 18,
  initialPairUnion: 18,
  pairUnionGrowth: 4,
}

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
  return [...byName]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, paths]) => ({ name, paths: paths.sort() }))
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

export async function lint({ matches, read, emit }) {
  const measured = await measureRungReach({
    read,
    worlds: worldInputs(matches),
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

  for (const world of measured.worlds) {
    const otherWorlds = combineRungSources(
      'other worlds',
      measured.worlds.filter((candidate) => candidate !== world),
    )
    const exclusivePairs = difference(world.pairs, otherWorlds.pairs)
    const preview = exclusivePairs
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

    emit({
      code: 'world_rung_reach_detail',
      severity: 'info',
      path: `worlds/${world.label}/schema.sql`,
      message:
        `${world.label}: ${world.statements} statements exercise ${world.rungs.size} rungs and ` +
        `${world.pairs.size} pairs; ${exclusivePairs.length} pairs are exclusive to this world` +
        `${preview === '' ? '.' : `. Exclusive-pair sample: ${preview}.`}`,
      metadata: {
        statements: world.statements,
        rungs: world.rungs.size,
        pairs: world.pairs.size,
        exclusivePairs: exclusivePairs.map((pair) => pairMembers(pair)),
      },
    })
  }
}
