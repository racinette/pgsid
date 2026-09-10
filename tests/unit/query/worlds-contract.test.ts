import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { inferQueryContract } from '../../../src/query/nullability-walk.js'
import type { OutputPresenceGroup } from '../../../src/query/types.js'
import { catalogCache, withSearchPath, type CatalogFor } from './fixture-catalog.js'
import { delegateTypesVia } from './delegate-types.js'
import {
  bindParams,
  CONSTRAINT_REJECTION,
  NULL_REJECTION,
  parseFixtureDirectives,
} from './fixture-args.js'
import { createKillableEvaluator, type KillableEvaluator } from './killable-evaluator.js'

// The generated corpus can check the soundness of groups the engine emits,
// but it cannot know that a group disappeared. World fixtures are independent
// specifications: every contract channel is stated in SQL, then compared to
// the engine exactly. The positive group fixtures also exercise both arms in
// PostgreSQL so a mutually consistent annotation and inference bug cannot pass.

const WORLDS_DIR = join(__dirname, 'worlds')

function worldDirs(): string[] {
  return readdirSync(WORLDS_DIR)
    .filter((name) => statSync(join(WORLDS_DIR, name)).isDirectory())
    .sort()
}

function fixtureFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql') && file !== 'schema.sql' && file !== 'data.sql')
    .sort()
}

function outputClaims(sql: string): { notNull: boolean; alwaysNull: boolean }[] {
  const claims: { notNull: boolean; alwaysNull: boolean }[] = []
  for (const line of sql.split('\n')) {
    const marker = /--\s*@(notNull|nullable|alwaysNull)\b/.exec(line)?.[1]
    if (!marker) continue
    claims.push({ notNull: marker === 'notNull', alwaysNull: marker === 'alwaysNull' })
  }
  return claims
}

function groupLabel(group: OutputPresenceGroup): string {
  return group.columns
    .map((column) => (group.discriminants.includes(column) ? `${column}*` : `${column}`))
    .join(',')
}

async function execute(
  pg: PGlite,
  sql: string,
  args: readonly unknown[] | null,
): Promise<unknown[][]> {
  await pg.exec('BEGIN;')
  try {
    const result = await pg.query(bindParams(sql, args), [], { rowMode: 'array' })
    return result.rows as unknown[][]
  } finally {
    await pg.exec('ROLLBACK;')
  }
}

for (const world of worldDirs()) {
  describe(`world contract: ${world}`, () => {
    const dir = join(WORLDS_DIR, world)
    const schema = readFileSync(join(dir, 'schema.sql'), 'utf8')
    const data = readFileSync(join(dir, 'data.sql'), 'utf8')
    let pg: PGlite
    let catalogFor: CatalogFor
    let evaluator: KillableEvaluator

    beforeAll(async () => {
      pg = await PGlite.create({ extensions: { plpgsql_check } })
      await pg.exec('CREATE EXTENSION plpgsql_check;')
      await pg.exec(schema)
      catalogFor = catalogCache(await snapshotCatalog(pg))
      await pg.exec(data)
      evaluator = await createKillableEvaluator({ schema })
    }, 120_000)

    afterAll(async () => {
      await evaluator?.close()
      if (pg && !pg.closed) await pg.close()
    })

    for (const file of fixtureFiles(dir)) {
      it(basename(file, '.sql'), async () => {
        const sql = readFileSync(join(dir, file), 'utf8')
        const directives = parseFixtureDirectives(sql)
        const parsed = await parseSql(sql)
        expect(parsed.stmts, 'fixture must contain exactly one statement').toHaveLength(1)
        const stmt = parsed.stmts?.[0]?.stmt
        expect(stmt, 'the fixture statement must parse').toBeDefined()

        const catalog = await catalogFor(directives.searchPath)
        await evaluator.setSearchPath(directives.searchPath)
        const contract = await withSearchPath(pg, directives.searchPath, () =>
          inferQueryContract(stmt!, catalog, {
            evaluate: evaluator.evaluate,
            resolveColumnTypes: delegateTypesVia(evaluator.evaluate),
          }),
        )

        expect(
          contract.outputs.map((output) => ({
            notNull: output.notNull,
            alwaysNull: output.alwaysNull ?? false,
          })),
          'output annotations must exactly describe the inferred flat contract',
        ).toEqual(outputClaims(sql))
        expect(contract.params, '@param declarations must exactly describe every argument').toEqual(
          directives.paramClaims,
        )
        expect(
          contract.outputPresenceGroups,
          '@null-group declarations must exactly describe the complete output group contract',
        ).toEqual(directives.nullGroupClaims)
        expect(
          contract.paramRejectionSets.map((set) => [...set]),
          '@param-reject declarations must exactly describe the complete argument group contract',
        ).toEqual(directives.rejectClaims)

        await withSearchPath(pg, directives.searchPath, async () => {
          for (const group of directives.nullGroupClaims) {
            let sawPresent = false
            let sawAbsent = false
            for (const binding of directives.bindings) {
              const rows = await execute(pg, sql, binding.args)
              for (const row of rows) {
                const nullDiscriminants = group.discriminants.filter((index) => row[index] === null)
                expect(
                  nullDiscriminants.length === 0 ||
                    nullDiscriminants.length === group.discriminants.length,
                  `presence-group discriminants disagree for {${groupLabel(group)}}`,
                ).toBe(true)
                if (nullDiscriminants.length === 0) {
                  sawPresent = true
                } else {
                  sawAbsent = true
                  expect(
                    group.columns.filter((index) => row[index] !== null),
                    `presence group {${groupLabel(group)}} has a non-NULL member on its absent arm`,
                  ).toEqual([])
                }
              }
            }
            expect(
              sawPresent,
              `presence group {${groupLabel(group)}} needs a present-arm row`,
            ).toBe(true)
            expect(sawAbsent, `presence group {${groupLabel(group)}} needs an absent-arm row`).toBe(
              true,
            )
          }

          for (const set of directives.rejectClaims) {
            const binding = directives.bindings.find(
              (candidate) =>
                candidate.args !== null &&
                set.every((number) => candidate.args![number - 1] !== null),
            )
            expect(
              binding,
              `@param-reject {${set.join(',')}} needs a non-NULL control binding`,
            ).toBeDefined()
            const controlRows = await execute(pg, sql, binding!.args)
            expect(
              controlRows.length,
              `@param-reject {${set.join(',')}} control must reach a row that can reject`,
            ).toBeGreaterThan(0)

            for (const number of set) {
              const oneNull = [...binding!.args!]
              oneNull[number - 1] = null
              await expect(execute(pg, sql, oneNull)).resolves.toBeDefined()
            }

            const allNull = [...binding!.args!]
            for (const number of set) allNull[number - 1] = null
            await expect(execute(pg, sql, allNull)).rejects.toThrow(
              new RegExp(`${NULL_REJECTION.source}|${CONSTRAINT_REJECTION.source}`),
            )
          }
        })
      })
    }
  })
}
