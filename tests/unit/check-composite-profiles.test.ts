import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  catalogCompositeType,
  compositeProfile,
} from '../../src/sql-semantics/composite-profiles.js'
import { compositeNodes } from '../../src/codegen/shared/check-composite-types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { parseSync } from 'libpg-query'
// @ts-expect-error -- Espalier input policy is a runtime JavaScript rule.
import { constantInput } from './query/espalier/worlds/[world]/check-seed.sql.mjs'

it('binds captured composite fields and typed plans through nested records, arrays, enums and ranges', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE stage_span AS RANGE(subtype=stage);
CREATE DOMAIN positive AS int4 CHECK(VALUE>0);CREATE TYPE leaf AS (n positive,label text COLLATE "C",phase stage,span int4range,phases stage_span,bag numeric[]);
CREATE DOMAIN leafs AS leaf[];CREATE TYPE envelope AS (child leaf,children leafs[],payload jsonb);
CREATE TABLE samples(v envelope,w envelope,bypass bool,
CHECK((v).child.n>0),CHECK((v).child.label='x'),CHECK((v).child.phase='z'),CHECK(lower((v).child.span)=1),
CHECK(array_length((v).child.bag,1)>0),CHECK(((v).children[1])[1].n>0),CHECK(v IS NULL OR v IS NOT NULL),
CHECK((COALESCE(v,w)).child.n>0),CHECK((CASE WHEN bypass THEN v ELSE w END).child.n>0));`)
    const catalog = await snapshotCatalog(pg),
      type = catalogCompositeType('public.envelope', catalog.compositeTypeGraph, catalog.rangeTypes)
    expect(type).not.toBeNull()
    expect(type).not.toContain('typeOid')
    expect(type).not.toContain('valueOids')
    expect(compositeProfile(type!)!.identity).toBe('public.envelope')
    const nodes = compositeNodes(type!, { defaultCollation: 'C', serverEncoding: 'UTF8' })!
    expect(nodes).not.toBeNull()
    expect(nodes[0]!.kind).toBe(44)
    expect(nodes.some((n) => n.kind === 41)).toBe(true)
    expect(nodes.find((n) => n.kind === 6)!.boundProfile[0]!.enumLabels).toBe('z\0a')
    expect(
      nodes.find((n) => n.typeName === 'pg_catalog.int4range')!.boundProfile[0]!.canonical,
    ).toBe(2)
    const table = catalog.tables.find((t) => t.name === 'samples')!
    const plans = table.constraints
      .filter((c) => c.type === 'check')
      .map((c) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name,
        },
        expression: lowerTableCheck(
          table,
          c,
          catalog.enums,
          catalog.domains,
          'stored',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
      }))
    const prepared = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, c] of prepared.checks.entries())
      expect(c.kind, JSON.stringify(plans[i]) + ': ' + JSON.stringify(c)).toBe('supported')
    expect(prepared.evaluatorSource).toContain('composite_from_coerced_plan')
    expect(prepared.evaluatorSource).toContain('composite_row_is_not_null')
    expect(prepared.evaluatorSource).toContain('composite_is_null')
  } finally {
    await pg.close()
  }
}, 60_000)

it('captures identical composite plans after catalog allocation changes and defers incomplete field graphs', async () => {
  const pg = await PGlite.create()
  try {
    const schema = `CREATE SCHEMA captured;CREATE TYPE captured.stage AS ENUM('z','a');CREATE TYPE captured.leaf AS(n int4,stage captured.stage);CREATE TYPE captured.packet AS(child captured.leaf);`
    await pg.exec(schema)
    const first = await snapshotCatalog(pg)
    const before = (
      await pg.query<{ oid: number }>("SELECT 'captured.packet'::regtype::oid::int4 oid")
    ).rows[0]!.oid
    await pg.exec(
      'DROP SCHEMA captured CASCADE;CREATE TYPE allocated_elsewhere AS(unused text);' + schema,
    )
    const second = await snapshotCatalog(pg)
    const after = (
      await pg.query<{ oid: number }>("SELECT 'captured.packet'::regtype::oid::int4 oid")
    ).rows[0]!.oid
    expect(after).not.toBe(before)
    const type = catalogCompositeType(
      'captured.packet',
      first.compositeTypeGraph,
      first.rangeTypes,
    )!
    expect(
      catalogCompositeType('captured.packet', second.compositeTypeGraph, second.rangeTypes),
    ).toBe(type)
    expect(compositeNodes(type)).toEqual(
      compositeNodes(catalogCompositeType('captured.packet', second.compositeTypeGraph)!),
    )
    const missing = structuredClone(first.compositeTypeGraph!)
    missing.definitions = missing.definitions.filter((node) => node.identity !== 'captured.stage')
    expect(catalogCompositeType('captured.packet', missing)).toBeNull()
    expect(compositeProfile('composite:{}')).toBeNull()
    expect(compositeProfile('composite:invalid')).toBeNull()
    const cycle = structuredClone(compositeProfile(type)!)
    cycle.graph.definitions.find((node) => node.identity === 'captured.leaf')!.fields[0]!.type =
      'captured.packet'
    expect(compositeNodes('composite:' + JSON.stringify(cycle))).toBeNull()
  } finally {
    await pg.close()
  }
}, 60_000)

it('admits constant record and array seeds while rejecting runtime fields and calls', () => {
  for (const [sql, expected] of [
    ['ROW(1,NULL,ARRAY[2,3])', true],
    ['ROW(ROW(NULL,1),ARRAY[ROW(2,3),ROW(4,NULL)])', true],
    ['ROW()', true],
    ['ROW(score,NULL)', false],
    ['ROW(1,random())', false],
    ['ARRAY[ROW(1,score)]', false],
    ['ROW(1+2,NULL)', false],
  ] as const) {
    const parsed = parseSync('SELECT ' + sql)
    const node = parsed.stmts![0]!.stmt!.SelectStmt!.targetList![0]!.ResTarget!.val!
    expect(constantInput(node), sql).toBe(expected)
  }
})
