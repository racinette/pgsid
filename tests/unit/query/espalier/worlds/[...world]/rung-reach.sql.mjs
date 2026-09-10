import { tsImport } from 'tsx/esm/api'

const { combineRungSources, measureRungReach, pairMembers } = await tsImport(
  '../../../rung-cooccurrence.ts',
  import.meta.url,
)

export const aggregate = true
export const targets = ['*/*.sql']
export const unobservedImplementationDependencies = ['killable-evaluator.worker.mjs']

export const rule = `Report how many query-analysis decision rungs and rung
pairs each isolated world exercises, how much each adds beyond the shared
corpus, and the averages across worlds. This is an advisory census until its
measurements establish meaningful floors. Presence-group and joint-parameter
mechanisms do not emit column-trace conclusions and are outside this census.`

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

function pairMetadata(pairs) {
  return pairs.map((pair) => pairMembers(pair))
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

export async function lint({ matches, files, read, emit }) {
  const measured = await measureRungReach({
    read,
    sharedPaths: await files('fixtures/*.sql'),
    worlds: worldInputs(matches),
  })
  const worlds = combineRungSources('worlds', measured.worlds)
  const worldCount = measured.worlds.length
  const marginalRungs = difference(worlds.rungs, measured.shared.rungs)
  const marginalPairs = difference(worlds.pairs, measured.shared.pairs)
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
      `Their union adds ${marginalRungs.length} rungs and ${marginalPairs.length} pairs beyond ` +
      `the shared corpus (${measured.shared.rungs.size} rungs, ${measured.shared.pairs.size} pairs).`,
    metadata: {
      sourceRungs: measured.patterns.length,
      shared: {
        statements: measured.shared.statements,
        rungs: measured.shared.rungs.size,
        pairs: measured.shared.pairs.size,
      },
      worlds: {
        count: worldCount,
        statements: worlds.statements,
        rungs: worlds.rungs.size,
        pairs: worlds.pairs.size,
        averageRungs,
        averagePairs,
        marginalRungs,
        marginalPairs: pairMetadata(marginalPairs),
      },
    },
  })

  for (const world of measured.worlds) {
    const otherWorlds = combineRungSources(
      'other worlds',
      measured.worlds.filter((candidate) => candidate !== world),
    )
    const alreadyReached = new Set([...measured.shared.pairs, ...otherWorlds.pairs])
    const newRungs = difference(world.rungs, measured.shared.rungs)
    const newPairs = difference(world.pairs, measured.shared.pairs)
    const exclusivePairs = difference(world.pairs, alreadyReached)
    const preview = newPairs
      .slice(0, 6)
      .map((pair) => pairMembers(pair).join(' + '))
      .join('; ')

    emit({
      code: 'world_rung_reach_detail',
      severity: 'info',
      path: `worlds/${world.label}/schema.sql`,
      message:
        `${world.label}: ${world.statements} statements exercise ${world.rungs.size} rungs and ` +
        `${world.pairs.size} pairs; ${newRungs.length} rungs and ${newPairs.length} pairs are ` +
        `absent from the shared corpus, and ${exclusivePairs.length} pairs are exclusive to this ` +
        `world${preview === '' ? '.' : `. New-pair sample: ${preview}.`}`,
      metadata: {
        statements: world.statements,
        rungs: world.rungs.size,
        pairs: world.pairs.size,
        marginalRungs: newRungs,
        marginalPairs: pairMetadata(newPairs),
        exclusivePairs: pairMetadata(exclusivePairs),
      },
    })
  }
}
