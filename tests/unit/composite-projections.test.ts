import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'

const uncertain = (value: unknown): boolean =>
  !!value &&
  typeof value === 'object' &&
  (('kind' in value && value.kind === 'uncertain') ||
    Object.entries(value).some(
      ([key, child]) =>
        key !== 'type' && (Array.isArray(child) ? child.some(uncertain) : uncertain(child)),
    ))

it('resolves quoted row owners and schema-qualified columns without guessing an absent owner', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE SCHEMA "Odd.Schema";CREATE TABLE "Odd.Schema"."Rows.Name"(n int4,label text COLLATE "C");',
    )
    const sqls = [
      'to_jsonb(ROW("Rows.Name".*)) IS NOT NULL',
      'to_jsonb(ROW("Odd.Schema"."Rows.Name".*)) IS NOT NULL',
      '"Odd.Schema"."Rows.Name".n>=0',
    ]
    for (const [i, sql] of sqls.entries())
      await pg.exec(
        `ALTER TABLE "Odd.Schema"."Rows.Name" ADD CONSTRAINT check_${i} CHECK(${sql}) NOT VALID`,
      )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'Rows.Name')!
    const plans = sqls.map((sql, i) => ({
      identity: {
        schema: t.schema,
        kind: 'table' as const,
        owner: t.name,
        constraint: 'check_' + i,
      },
      expression: lowerTableCheck(
        t,
        {
          ...t.constraints.find((c) => c.name === 'check_' + i)!,
          definition: 'CHECK(' + sql + ')',
        },
        c.enums,
        c.domains,
        'source',
        c.rangeTypes,
        c.compositeTypeGraph,
      )!.expression,
    }))
    for (const plan of plans) expect(uncertain(plan.expression)).toBe(false)
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const absent = lowerTableCheck(
      { columns: t.columns },
      { name: 'owner', type: 'check', definition: 'CHECK(' + sqls[0] + ')' },
      c.enums,
      c.domains,
      'source',
      c.rangeTypes,
      c.compositeTypeGraph,
    )!
    expect(uncertain(absent.expression)).toBe(true)
  } finally {
    await pg.close()
  }
}, 60_000)

it('retains PostgreSQL admission boundaries for anonymous descriptors, unknown-field casts and misplaced stars', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TYPE pair AS(n int4,label text);CREATE TABLE q(p pair,n int4,label text,pick bool);',
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'q')!,
      cases = [
        ['(CASE WHEN pick THEN ROW(n,label) ELSE ROW(n,label) END).f1 IS NULL', '42703'],
        ["(COALESCE(ROW(n,label),ROW(0,''))).f1 IS NULL", '42703'],
        [
          'to_jsonb(ROW((CASE WHEN pick THEN ROW(n,label) ELSE ROW(n,label) END).*)) IS NULL',
          '42809',
        ],
        ['to_jsonb((p).*) IS NULL', '0A000'],
        ["(ROW('2')).f1::int4 IS NULL", 'XX000'],
        ["COALESCE((ROW(NULL)).f1,'x') IS NULL", 'XX000'],
        ["(CASE WHEN pick THEN (ROW(NULL)).f1 ELSE 'x' END) IS NULL", 'XX000'],
        ['ARRAY[(ROW(NULL)).f1] IS NULL', 'XX000'],
        ['(ARRAY[(ROW(NULL)).f1]::int4[]) IS NULL', 'XX000'],
        ['to_jsonb(ROW(other.*)) IS NULL', '42P01'],
        ['((ROW(ROW(n,label))).f1).f2 IS NULL', '42703'],
      ]
    for (const [sql, code] of cases) {
      await expect(pg.exec('ALTER TABLE q ADD CHECK(' + sql + ') NOT VALID')).rejects.toMatchObject(
        { code },
      )
      const plan = lowerTableCheck(
        t,
        { name: 'invalid', type: 'check', definition: 'CHECK(' + sql + ')' },
        c.enums,
        c.domains,
        'source',
        c.rangeTypes,
        c.compositeTypeGraph,
      )!
      expect(uncertain(plan.expression), sql).toBe(true)
    }
  } finally {
    await pg.close()
  }
}, 60_000)
