import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('preserves quoted owner identities and column precedence without generation OIDs or missing-owner guesses', async () => {
  const sources: string[] = [],
    oids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(
        'CREATE SCHEMA "Odd.Schema";SET search_path="Odd.Schema",public;CREATE TABLE "Rows.Name"("Rows.Name" int4,n int4,label text COLLATE "C",to_jsonb text COLLATE "C");',
      )
      const sqls = [
        'to_jsonb("Rows.Name") IS NOT NULL',
        '(to_jsonb("Odd.Schema"."Rows.Name".*)->>\'n\')::int4>=0',
        '("Rows.Name".*).n>=0',
        'n("Rows.Name".*)>=0',
        '"Rows.Name".row_to_json IS NOT NULL',
        '"Rows.Name".to_jsonb IS NULL',
      ]
      for (const [i, sql] of sqls.entries())
        await pg.exec(`ALTER TABLE "Rows.Name" ADD CONSTRAINT check_${i} CHECK(${sql}) NOT VALID`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'Rows.Name')!,
        plans = sqls.map((sql, i) => ({
          identity: {
            schema: t.schema,
            kind: 'table' as const,
            owner: t.name,
            constraint: 'check_' + i,
          },
          expression: lowerTableCheck(
            t,
            t.constraints.find((c) => c.name === 'check_' + i)!,
            c.enums,
            c.domains,
            'source',
            c.rangeTypes,
            c.compositeTypeGraph,
            'CHECK(' + sql + ')',
          )!.expression,
        }))
      for (const p of plans) expect(uncertain(p.expression)).toBe(false)
      const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
      for (const check of group.checks) expect(check.kind).toBe('supported')
      expect(typeof group.evaluatorSource).toBe('string')
      sources.push(group.evaluatorSource!)
      oids.push(
        (await pg.query<{ oid: number }>(`SELECT '"Odd.Schema"."Rows.Name"'::regtype::oid AS oid`))
          .rows[0]!.oid,
      )
      const constraint = t.constraints.find((c) => c.name === 'check_1')!
      expect(
        uncertain(
          lowerTableCheck(
            { columns: t.columns },
            constraint,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
        ),
      ).toBe(true)
      expect(
        uncertain(
          lowerTableCheck(t, constraint, c.enums, c.domains, 'stored', c.rangeTypes)!.expression,
        ),
      ).toBe(true)
      await expect(
        pg.exec(
          'ALTER TABLE "Rows.Name" ADD CHECK(to_jsonb("Odd.Schema"."Rows.Name") IS NOT NULL) NOT VALID',
        ),
      ).rejects.toMatchObject({ code: '42P01' })
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(sources[0]).toBe(sources[1])
}, 60_000)

it('projects owner fields without requiring a representation of unrelated columns and defers invalid owner forms', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TABLE opaque(n int4,payload xml);ALTER TABLE opaque ADD CONSTRAINT dot CHECK((opaque).n>=0) NOT VALID;ALTER TABLE opaque ADD CONSTRAINT functional CHECK(n(opaque)>=0) NOT VALID',
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'opaque')!
    for (const [name, sql] of [
      ['dot', '(opaque).n>=0'],
      ['functional', 'n(opaque)>=0'],
    ]) {
      const plan = lowerTableCheck(
        t,
        t.constraints.find((c) => c.name === name)!,
        c.enums,
        c.domains,
        'source',
        c.rangeTypes,
        c.compositeTypeGraph,
        'CHECK(' + sql + ')',
      )!
      expect(uncertain(plan.expression), name).toBe(false)
      expect(plan.inputs).toEqual(['n'])
    }
    for (const sql of [
      'to_jsonb(opaque) IS NULL',
      'to_jsonb(opaque.opaque) IS NULL',
      'to_jsonb(other.*) IS NULL',
    ]) {
      if (sql !== 'to_jsonb(opaque) IS NULL')
        await expect(
          pg.exec('ALTER TABLE opaque ADD CHECK(' + sql + ') NOT VALID'),
        ).rejects.toHaveProperty('code')
      const plan = lowerTableCheck(
        t,
        { name: 'boundary', type: 'check', definition: 'CHECK(' + sql + ')' },
        c.enums,
        c.domains,
        'source',
        c.rangeTypes,
        c.compositeTypeGraph,
      )!
      expect(uncertain(plan.expression), sql).toBe(true)
    }
    await expect(
      pg.exec('CREATE TABLE inherited(extra int4) INHERITS(opaque)'),
    ).resolves.toBeDefined()
    await pg.exec('CREATE TABLE whole(n int4,CONSTRAINT valid CHECK(to_jsonb(whole) IS NOT NULL))')
    await expect(
      pg.exec('CREATE TABLE inherited_whole(extra int4) INHERITS(whole)'),
    ).rejects.toMatchObject({ code: '0A000' })
    await pg.exec(
      "CREATE TABLE tableoid(n int4,CONSTRAINT system_value CHECK((to_jsonb(tableoid)->>'n')::int4>=0),CONSTRAINT whole_value CHECK((to_jsonb(tableoid.*)->>'n')::int4>=0))",
    )
    const systemCatalog = await snapshotCatalog(pg),
      systemTable = systemCatalog.tables.find((t) => t.name === 'tableoid')!
    for (const name of ['system_value', 'whole_value']) {
      const plan = lowerTableCheck(
        systemTable,
        systemTable.constraints.find((c) => c.name === name)!,
        systemCatalog.enums,
        systemCatalog.domains,
        'stored',
        systemCatalog.rangeTypes,
        systemCatalog.compositeTypeGraph,
      )!
      expect(uncertain(plan.expression), name).toBe(name === 'system_value')
    }
  } finally {
    await pg.close()
  }
}, 60_000)
