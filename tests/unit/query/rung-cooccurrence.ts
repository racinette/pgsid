import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { inferNullabilityTraced } from '../../../src/query/nullability-walk.js'
import type { TraceNode } from '../../../src/query/types.js'
import { catalogCache } from './fixture-catalog.js'
import { parseFixtureDirectives } from './fixture-args.js'
import { GRAMMAR_SAMPLER } from './grammar-sampler.js'
import { createKillableEvaluator } from './killable-evaluator.js'
import { extractConcludeRungs, matchRung, type RungPattern } from './rung-extractor.js'

const WALK_SOURCE = new URL('../../../src/query/nullability-walk.ts', import.meta.url)
const PAIR_SEPARATOR = '\u0000'

export interface RungSource {
  label: string
  statements: number
  rungs: Set<string>
  pairs: Set<string>
}

export interface WorldCorpus {
  name: string
  paths: string[]
}

export interface RungReach {
  patterns: RungPattern[]
  shared: RungSource
  worlds: RungSource[]
}

type ReadCorpusFile = (path: string) => Promise<string>

interface Unit {
  sql: string
  searchPath: string[] | null
}

export function emptyRungSource(label: string): RungSource {
  return { label, statements: 0, rungs: new Set(), pairs: new Set() }
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}${PAIR_SEPARATOR}${b}` : `${b}${PAIR_SEPARATOR}${a}`
}

export function pairMembers(pair: string): [string, string] {
  const [left, right] = pair.split(PAIR_SEPARATOR)
  if (left === undefined || right === undefined) throw new Error(`invalid rung pair: ${pair}`)
  return [left, right]
}

export function combineRungSources(label: string, sources: RungSource[]): RungSource {
  const combined = emptyRungSource(label)
  for (const source of sources) {
    combined.statements += source.statements
    for (const rung of source.rungs) combined.rungs.add(rung)
    for (const pair of source.pairs) combined.pairs.add(pair)
  }
  return combined
}

function addStatement(source: RungSource, fired: Set<string>): void {
  source.statements++
  for (const rung of fired) source.rungs.add(rung)
  const keys = [...fired].sort()
  for (let left = 0; left < keys.length; left++) {
    for (let right = left + 1; right < keys.length; right++) {
      source.pairs.add(pairKey(keys[left]!, keys[right]!))
    }
  }
}

function firedIn(patterns: RungPattern[], node: TraceNode, out: Set<string>): void {
  const rung = matchRung(patterns, node.reason)
  if (rung) out.add(rung.key)
  for (const child of node.children) firedIn(patterns, child, out)
}

async function runCorpus(
  label: string,
  schemaSql: string,
  units: Unit[],
  patterns: RungPattern[],
): Promise<RungSource> {
  const source = emptyRungSource(label)
  const pg = await PGlite.create({ extensions: { plpgsql_check } })
  let snapshot
  try {
    await pg.exec('CREATE EXTENSION plpgsql_check;')
    await pg.exec(schemaSql)
    snapshot = await snapshotCatalog(pg)
  } finally {
    if (!pg.closed) await pg.close()
  }

  const catalogFor = catalogCache(snapshot)
  const evaluator = await createKillableEvaluator({ schema: schemaSql })
  try {
    for (const { sql, searchPath } of units) {
      let statement
      try {
        statement = (await parseSql(sql)).stmts?.[0]?.stmt
      } catch {
        continue
      }
      if (!statement) continue

      const catalog = await catalogFor(searchPath)
      await evaluator.setSearchPath(searchPath)
      const fired = new Set<string>()
      try {
        const columns = await inferNullabilityTraced(statement, catalog, undefined, {
          evaluate: evaluator.evaluate,
        })
        for (const column of columns) {
          if (column.trace) firedIn(patterns, column.trace, fired)
        }
      } catch {
        // A refused statement has no partial trace to count.
      }
      addStatement(source, fired)
    }
  } finally {
    await evaluator.close()
  }
  return source
}

function schemaPath(paths: string[]): string | undefined {
  return paths.find((path) => path.endsWith('/schema.sql'))
}

function fixturePaths(paths: string[]): string[] {
  return paths.filter((path) => !path.endsWith('/schema.sql') && !path.endsWith('/data.sql'))
}

export async function measureRungReach({
  read,
  sharedPaths = [],
  worlds = [],
}: {
  read: ReadCorpusFile
  sharedPaths?: string[]
  worlds?: WorldCorpus[]
}): Promise<RungReach> {
  const patterns = extractConcludeRungs(readFileSync(WALK_SOURCE, 'utf8')).patterns
  let shared = emptyRungSource('shared')

  const sharedSchema = schemaPath(sharedPaths)
  if (sharedSchema !== undefined) {
    const units: Unit[] = [
      ...GRAMMAR_SAMPLER.map((sql) => ({ sql, searchPath: null })),
      ...(await Promise.all(
        fixturePaths(sharedPaths).map(async (path) => {
          const sql = await read(path)
          return { sql, searchPath: parseFixtureDirectives(sql).searchPath }
        }),
      )),
    ]
    shared = await runCorpus('shared', await read(sharedSchema), units, patterns)
  }

  const measuredWorlds: RungSource[] = []
  for (const world of [...worlds].sort((left, right) => left.name.localeCompare(right.name))) {
    const schema = schemaPath(world.paths)
    if (schema === undefined) continue
    const units = await Promise.all(
      fixturePaths(world.paths).map(async (path) => ({ sql: await read(path), searchPath: null })),
    )
    measuredWorlds.push(await runCorpus(world.name, await read(schema), units, patterns))
  }

  return { patterns, shared, worlds: measuredWorlds }
}
