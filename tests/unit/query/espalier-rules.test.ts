import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { check, runAggregate, runRule } from 'espalier'
// Espalier rules are runtime JavaScript modules, not TypeScript sources.
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as fixtureRule from './espalier/worlds/[world]/[fixture].sql.mjs'
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as healthRule from './espalier/worlds/[...world]/world-health.sql.mjs'
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as sharedFixtureRule from './espalier/fixtures/[fixture].sql.mjs'

const PATH = 'worlds/example/contract.sql'
const GROUPED = `-- @args [1, 2]
-- @param 1 nullable
-- @param 2 nullable
-- @param-reject 1,2
-- @null-group 0*,1
SELECT
  $1 AS left_value,  -- @nullable
  $2 AS right_value -- @nullable
`

async function codes(source: string) {
  const issues = await runRule(fixtureRule, {
    path: PATH,
    tree: { [PATH]: source },
  })
  return issues.map((issue) => issue.code)
}

async function sharedCodes(source: string) {
  const path = 'fixtures/example.sql'
  const issues = await runRule(sharedFixtureRule, {
    path,
    tree: { [path]: source },
  })
  return issues.map((issue) => issue.code)
}

describe('Espalier query-fixture rule', () => {
  it('accepts the complete governed query test tree', async () => {
    const issues = await check({
      cwd: process.cwd(),
      config: 'tests/unit/query/espalier.config.yaml',
      cache: false,
    })

    expect(issues.filter((issue) => issue.severity !== 'info')).toEqual([])
    expect(issues.map((issue) => issue.code)).toEqual([
      'world_rung_reach',
      'world_rung_reach_detail',
    ])
  })

  it('accepts a fully declared grouped contract', async () => {
    await expect(codes(GROUPED)).resolves.toEqual([])
  })

  it('accepts explicit empty contract channels', async () => {
    const source = `-- @params none
-- @null-groups none
-- @param-rejections none
SELECT 1 -- @notNull
`
    await expect(codes(source)).resolves.toEqual([])
  })

  it.each([
    [
      'output nullability',
      (source: string) => source.replace(/\s*-- @nullable/g, ''),
      'missing_output_contract',
    ],
    [
      'parameter nullability',
      (source: string) => source.replace('-- @param 2 nullable\n', ''),
      'missing_parameter_contract',
    ],
    [
      'control bindings',
      (source: string) => source.replace('-- @args [1, 2]\n', ''),
      'missing_control_binding',
    ],
    [
      'output groups',
      (source: string) => source.replace('-- @null-group 0*,1\n', ''),
      'missing_output_group_contract',
    ],
    [
      'parameter groups',
      (source: string) => source.replace('-- @param-reject 1,2\n', ''),
      'missing_parameter_group_contract',
    ],
  ])('rejects a missing %s declaration', async (_name, mutate, expected) => {
    expect(await codes(mutate(GROUPED))).toContain(expected)
  })

  it('rejects a group member presented as flat not-null', async () => {
    expect(
      await codes(GROUPED.replace('left_value,  -- @nullable', 'left_value,  -- @notNull')),
    ).toContain('invalid_output_group_member')
  })

  it('rejects an unconditionally required parameter in a joint set', async () => {
    expect(await codes(GROUPED.replace('-- @param 1 nullable', '-- @param 1 notNull'))).toContain(
      'invalid_parameter_group_member',
    )
  })
})

describe('Espalier shared-fixture group rule', () => {
  it('accepts independently declared positive groups', async () => {
    await expect(sharedCodes(GROUPED)).resolves.toEqual([])
  })

  it('accepts explicit empty group channels', async () => {
    const source = `-- @null-groups none
-- @param-rejections none
SELECT 1 -- @notNull
`
    await expect(sharedCodes(source)).resolves.toEqual([])
  })

  it.each([
    ['output', '-- @param-rejections none\n', 'missing_output_group_contract'],
    ['parameter', '-- @null-groups none\n', 'missing_parameter_group_contract'],
  ])('rejects a missing %s group channel', async (_name, retained, expected) => {
    expect(await sharedCodes(`${retained}SELECT 1 -- @notNull\n`)).toContain(expected)
  })

  it('rejects positive and empty declarations for the same channel', async () => {
    const found = await sharedCodes(
      `-- @null-group 0*,1
-- @null-groups none
-- @param-reject 1,2
-- @param-rejections none
-- @param 1 nullable
-- @param 2 nullable
SELECT $1, -- @nullable
       $2  -- @nullable
`,
    )
    expect(found).toContain('contradictory_output_group_contract')
    expect(found).toContain('contradictory_parameter_group_contract')
  })

  it('rejects malformed and duplicate positive declarations', async () => {
    const found = await sharedCodes(
      `-- @null-group 0,1
-- @null-group 1*,0
-- @null-group 0*,1
-- @param-reject 1,1
-- @param-reject 2,1
-- @param-reject 1,2
-- @param 1 nullable
-- @param 2 nullable
SELECT $1, -- @nullable
       $2  -- @nullable
`,
    )
    expect(found).toContain('invalid_output_group_contract')
    expect(found).toContain('duplicate_output_group_contract')
    expect(found).toContain('invalid_parameter_group_contract')
    expect(found).toContain('duplicate_parameter_group_contract')
  })

  it('rejects group members whose flat contracts are inconsistent', async () => {
    const found = await sharedCodes(
      GROUPED.replace('left_value,  -- @nullable', 'left_value,  -- @notNull').replace(
        '-- @param 1 nullable',
        '-- @param 1 notNull',
      ),
    )
    expect(found).toContain('invalid_output_group_member')
    expect(found).toContain('invalid_parameter_group_member')
  })
})

describe('Espalier world-health aggregate', () => {
  it('cannot silently pass an empty corpus', async () => {
    expect(healthRule.aggregate).toBe(true)
    expect(healthRule.targets).toEqual(['*/*.sql'])

    const issues = await runAggregate(healthRule, { matches: [] })
    expect(issues.map((issue) => issue.code)).toContain('world_corpus_empty')
  })

  it('rejects a world whose schema loses its required shape', async () => {
    const directory = join(__dirname, 'worlds', 'shipping')
    const paths = readdirSync(directory)
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .map((name) => `worlds/shipping/${name}`)
    const tree = Object.fromEntries(
      paths.map((path) => [path, readFileSync(join(__dirname, path), 'utf8')]),
    )
    tree['worlds/shipping/schema.sql'] = 'SELECT 1;\n'

    const issues = await runAggregate(healthRule, {
      matches: paths.map((path) => ({ path, captures: { world: ['shipping'] } })),
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree,
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_health_violation',
        path: 'worlds/shipping/schema.sql',
      }),
    )
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_composition_regression',
        message: 'additivity: 2 → 0',
      }),
    )
  })
})
