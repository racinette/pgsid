import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { check, runAggregate, runRule } from 'espalier'
// Espalier rules are runtime JavaScript modules, not TypeScript sources.
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as fixtureRule from './espalier/worlds/[world]/[fixture].sql.mjs'
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as healthRule from './espalier/worlds/[...world]/world-health.sql.mjs'
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as rungReachRule from './espalier/worlds/[...world]/rung-reach.sql.mjs'
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

function worldCorpus(sourceWorld = '001_shipping', targetWorld = sourceWorld) {
  const directory = join(__dirname, 'worlds', sourceWorld)
  const sourcePaths = readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  const paths = sourcePaths.map((name) => `worlds/${targetWorld}/${name}`)
  const tree = Object.fromEntries(
    sourcePaths.map((name) => [
      `worlds/${targetWorld}/${name}`,
      readFileSync(join(directory, name), 'utf8'),
    ]),
  )
  const matches = paths.map((path) => ({ path, captures: { world: [targetWorld] } }))
  return { matches, paths, tree }
}

describe('Espalier query-fixture rule', () => {
  const checkOptions = {
    cwd: process.cwd(),
    config: 'tests/unit/query/espalier.config.yaml',
    cache: false,
  } as const

  it('accepts the complete governed non-world query test tree', async () => {
    const paths = readdirSync(__dirname)
      .filter((name) => name !== 'worlds')
      .map((name) => `tests/unit/query/${name}`)
    const issues = await check({
      ...checkOptions,
      paths,
    })

    expect(issues.filter((issue) => issue.severity !== 'info')).toEqual([])
  })

  it('accepts every governed world declaration', async () => {
    const rules = [
      'worlds/[world]/[fixture].sql.mjs',
      'worlds/[world]/data.sql.mjs',
      'worlds/[world]/schema.sql.mjs',
    ]
    const checks = await Promise.all(
      rules.map((rule) => check({ ...checkOptions, paths: ['tests/unit/query/worlds'], rule })),
    )
    expect(checks.flat().filter((issue) => issue.severity !== 'info')).toEqual([])
  })

  it('accepts the complete world health aggregate', async () => {
    const issues = await check({
      ...checkOptions,
      paths: ['tests/unit/query/worlds'],
      rule: 'worlds/[...world]/world-health.sql.mjs',
    })
    expect(issues.filter((issue) => issue.severity !== 'info')).toEqual([])
    const foundCodes = issues.map((issue) => issue.code)
    const worldCount = readdirSync(join(__dirname, 'worlds')).filter((name) =>
      statSync(join(__dirname, 'worlds', name)).isDirectory(),
    ).length
    expect(foundCodes.filter((code) => code === 'world_health')).toHaveLength(1)
    expect(foundCodes.filter((code) => code === 'world_health_ratios')).toHaveLength(1)
    expect(foundCodes.filter((code) => code === 'world_health_composition')).toHaveLength(1)
    expect(foundCodes.filter((code) => code === 'world_health_detail')).toHaveLength(worldCount)
  })

  it('accepts the complete world rung-reach aggregate', async () => {
    const issues = await check({
      ...checkOptions,
      paths: ['tests/unit/query/worlds'],
      rule: 'worlds/[...world]/rung-reach.sql.mjs',
    })
    expect(issues.filter((issue) => issue.severity !== 'info')).toEqual([])
    const foundCodes = issues.map((issue) => issue.code)
    const worldCount = readdirSync(join(__dirname, 'worlds')).filter((name) =>
      statSync(join(__dirname, 'worlds', name)).isDirectory(),
    ).length
    expect(foundCodes.filter((code) => code === 'world_rung_reach')).toHaveLength(1)
    expect(foundCodes.filter((code) => code === 'world_rung_reach_detail')).toHaveLength(worldCount)
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

  it('rejects more than one SQL statement in a fixture', async () => {
    expect(await codes(`${GROUPED};\nSELECT 1 -- @notNull\n`)).toContain('fixture_statement_count')
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
    const { matches, tree } = worldCorpus()
    tree['worlds/001_shipping/schema.sql'] = 'SELECT 1;\n'

    const issues = await runAggregate(healthRule, {
      matches,
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree,
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_health_violation',
        path: 'worlds/001_shipping/schema.sql',
      }),
    )
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_composition_regression',
        message: 'additivity: 88 → 0',
      }),
    )
  })

  it('requires composition growth as worlds are added', async () => {
    const shipping = worldCorpus()
    const flat = worldCorpus('001_shipping', '002_flat')
    flat.tree['worlds/002_flat/schema.sql'] = `CREATE TABLE parent (id int PRIMARY KEY);
CREATE TABLE child (id int PRIMARY KEY, parent_id int NOT NULL REFERENCES parent (id));
CREATE TABLE sibling (id int PRIMARY KEY, parent_id int NOT NULL REFERENCES parent (id));
`

    const issues = await runAggregate(healthRule, {
      matches: [...shipping.matches, ...flat.matches],
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree: { ...shipping.tree, ...flat.tree },
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_composition_growth_below_floor',
        message: 'composition growth surplus is 0 across 2 worlds; 1 required',
      }),
    )
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_composition_marginal_below_floor',
        path: 'worlds/002_flat/schema.sql',
      }),
    )
  })
})

describe('Espalier world rung-reach aggregate', () => {
  it('rejects a world that does not reach its individual floors', async () => {
    const { matches, paths, tree } = worldCorpus()
    for (const path of paths) {
      if (!path.endsWith('/schema.sql') && !path.endsWith('/data.sql')) tree[path] = 'SELECT 1;\n'
    }

    const issues = await runAggregate(rungReachRule, {
      matches,
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree,
    })

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'world_rung_reach_below_floor',
        'world_pair_reach_below_floor',
        'world_pair_diversity_below_floor',
      ]),
    )
  })

  it('rejects a new world that merely repeats existing pair reach', async () => {
    const shipping = worldCorpus()
    const library = worldCorpus('002_library')
    const duplicate = worldCorpus('001_shipping', '003_shipping-copy')

    const issues = await runAggregate(rungReachRule, {
      matches: [...shipping.matches, ...library.matches, ...duplicate.matches],
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree: { ...shipping.tree, ...library.tree, ...duplicate.tree },
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_pair_marginal_below_floor',
        path: 'worlds/003_shipping-copy/schema.sql',
        message: '003_shipping-copy: adds 0 rung pairs beyond its predecessors; 4 required',
      }),
    )
    expect(issues.map((issue) => issue.code)).not.toContain('world_pair_diversity_below_floor')
    expect(issues.map((issue) => issue.code)).not.toContain('world_rung_reach_below_floor')
    expect(issues.map((issue) => issue.code)).not.toContain('world_pair_reach_below_floor')
  })

  it('requires a zero-padded admission prefix', async () => {
    const corpus = worldCorpus('001_shipping', 'shipping')

    const issues = await runAggregate(rungReachRule, {
      matches: corpus.matches,
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree: corpus.tree,
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_admission_order_invalid',
        path: 'worlds/shipping/schema.sql',
      }),
    )
  })

  it('requires contiguous admission ordinals starting at 001', async () => {
    const corpus = worldCorpus('001_shipping', '002_shipping')

    const issues = await runAggregate(rungReachRule, {
      matches: corpus.matches,
      pattern: 'worlds/**/*.sql',
      at: 'worlds/',
      tree: corpus.tree,
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'world_admission_order_invalid',
        message: 'world admission prefixes must be unique and contiguous from 001; found 002',
      }),
    )
  })
})
