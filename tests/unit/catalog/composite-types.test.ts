import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogCompositeTypes } from '../../../src/postgres/composite-types.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { builtinTypeIO } from '../../../src/postgres/builtins/inventory.js'

const schema = `CREATE SCHEMA "Inner.Types";CREATE SCHEMA "Outer.Types";
CREATE TYPE "Inner.Types".phase AS ENUM('z','a');ALTER TYPE "Inner.Types".phase ADD VALUE 'mid' BEFORE 'a';
CREATE DOMAIN "Inner.Types".label AS "Inner.Types".phase NOT NULL;
CREATE TYPE "Inner.Types".phase_span AS RANGE(subtype="Inner.Types".phase,multirange_type_name="Inner.Types".phase_set);
CREATE TYPE "Inner.Types".leaf AS (label "Inner.Types".label,discard integer,amount numeric(5,2),title varchar(6) COLLATE "C");
ALTER TYPE "Inner.Types".leaf DROP ATTRIBUTE discard;
CREATE DOMAIN "Inner.Types".history AS "Inner.Types".leaf[];
CREATE TABLE "Outer.Types".samples(item "Inner.Types".leaf,items "Inner.Types".history[],span "Inner.Types".phase_span,spans "Inner.Types".phase_set,document xml);
CREATE VIEW "Outer.Types".selected AS SELECT item,span FROM "Outer.Types".samples;
CREATE MATERIALIZED VIEW "Outer.Types".materialized AS SELECT item FROM "Outer.Types".samples;
CREATE TYPE "Outer.Types".empty AS ();
CREATE TYPE "Outer.Types"."Quoted""type" AS ("f,.😊" text COLLATE "C");
CREATE TEMP TABLE invisible(value integer);`
const oidKey = (value: unknown): boolean =>
  value !== null &&
  typeof value === 'object' &&
  Object.entries(value).some(([key, child]) => /oid/i.test(key) || oidKey(child))

it('captures table, view and standalone composite roots with closed field dependencies and no deployment OIDs', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(schema)
    const graph = await readCatalogCompositeTypes(pg, ['Outer.Types'])
    expect(graph.roots).toHaveLength(5)
    expect(graph.roots.every((id) => id.startsWith('"Outer.Types".'))).toBe(true)
    expect(oidKey(graph)).toBe(false)
    const nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
    for (const node of nodes.values())
      for (const ref of [
        node.array,
        node.base,
        node.element,
        node.subtype,
        node.member,
        ...node.fields.map((f) => f.type),
      ])
        if (ref) expect(nodes.has(ref), node.identity + ' -> ' + ref).toBe(true)
    expect(nodes.get('"Outer.Types".samples')).toMatchObject({
      kind: 'c',
      relationKind: 'r',
      fields: [
        { position: 1, name: 'item', type: '"Inner.Types".leaf' },
        { position: 2, name: 'items' },
        { position: 3, name: 'span' },
        { position: 4, name: 'spans' },
        { position: 5, name: 'document', type: 'pg_catalog.xml' },
      ],
    })
    expect(nodes.get('"Outer.Types".selected')!.relationKind).toBe('v')
    expect(nodes.get('"Outer.Types".materialized')!.relationKind).toBe('m')
    expect(nodes.get('"Outer.Types".empty')!.fields).toEqual([])
    const leaf = nodes.get('"Inner.Types".leaf')!
    expect(leaf.attributeCount).toBe(4)
    expect(nodes.get('"Outer.Types".empty')!.attributeCount).toBe(0)
    expect(leaf.fields.map((f) => [f.position, f.name])).toEqual([
      [1, 'label'],
      [3, 'amount'],
      [4, 'title'],
    ])
    expect(leaf.fields[1]!.typeMod).toBe((5 << 16) + 2 + 4)
    expect(leaf.fields[2]).toMatchObject({
      typeMod: 10,
      collation: 'pg_catalog."C"',
      collationIsC: true,
      collationIsDefault: false,
      collationDeterministic: true,
    })
    expect(nodes.get('"Inner.Types".phase')!.enumLabels).toEqual(['z', 'mid', 'a'])
    expect(nodes.get('"Inner.Types".label')).toMatchObject({
      kind: 'd',
      base: '"Inner.Types".phase',
      notNull: true,
    })
    expect(nodes.get('"Inner.Types".phase_span')).toMatchObject({
      kind: 'r',
      subtype: '"Inner.Types".phase',
    })
    expect(nodes.get('"Inner.Types".phase_set')).toMatchObject({
      kind: 'm',
      member: '"Inner.Types".phase_span',
    })
    expect(leaf.input).toBe(
      'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    )
    expect(leaf.output).toBe('function:["pg_catalog","record_out"](pg_catalog.record)')
    expect(nodes.get('pg_catalog.int4')).toBeUndefined()
    expect(nodes.get('"Outer.Types"."Quoted""type"')!.fields[0]!.name).toBe('f,.😊')
    expect(leaf.send).toBe('function:["pg_catalog","record_send"](pg_catalog.record)')
    expect(nodes.get('pg_catalog.text')!.input).toBe(builtinTypeIO('pg_catalog.text')!.input)
    expect(await readCatalogCompositeTypes(pg, [])).toEqual({ roots: [], definitions: [] })
  } finally {
    await pg.close()
  }
}, 60_000)

it('retains independent graphs across deployments and search paths while leaving table row types outside DDL composites', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(schema)
    await second.exec(
      "CREATE TYPE shifted AS ENUM('extra');" + schema + 'SET search_path=pg_catalog;',
    )
    const left = await readCatalogCompositeTypes(first, ['Outer.Types']),
      right = await readCatalogCompositeTypes(second, ['Outer.Types'])
    const ids = async (pg: PGlite) =>
      (
        await pg.query<{ id: number }>(
          `SELECT t.oid::int id FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='Inner.Types' AND t.typname='leaf'`,
        )
      ).rows[0]!.id
    expect(await ids(first)).not.toBe(await ids(second))
    expect(left).toEqual(right)
    left.definitions.find((n) => n.kind === 'e')!.enumLabels!.push('caller mutation')
    expect(right.definitions.find((n) => n.kind === 'e')!.enumLabels).toEqual(['z', 'mid', 'a'])
    const snapshot = await snapshotCatalog(second)
    expect(snapshot.compositeTypes.some((n) => n.name === 'samples')).toBe(false)
    expect(snapshot.compositeTypeGraph!.roots).toContain('"Outer.Types".samples')
    expect(snapshot.compositeTypeGraph!.roots.some((n) => n.includes('pg_temp'))).toBe(false)
    expect(
      (await second.query<{ value: string }>("SELECT current_setting('search_path') value"))
        .rows[0]!.value,
    ).toBe('pg_catalog')
  } finally {
    await first.close()
    await second.close()
  }
}, 60_000)

it('keeps qualified dependencies independent of identifier rendering settings', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('CREATE TYPE sample AS (v integer, label text COLLATE "C")')
    const plain = await readCatalogCompositeTypes(pg)
    await pg.exec('SET quote_all_identifiers=on')
    const quoted = await readCatalogCompositeTypes(pg)
    expect(quoted).toEqual(plain)
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('quote_all_identifiers') value"))
        .rows[0]!.value,
    ).toBe('on')
  } finally {
    await pg.close()
  }
}, 60_000)

it('admits explicitly selected catalog row types while excluding them from default roots', async () => {
  const pg = await PGlite.create()
  try {
    expect(await readCatalogCompositeTypes(pg)).toEqual({ roots: [], definitions: [] })
    const graph = await readCatalogCompositeTypes(pg, ['pg_catalog'])
    expect(graph.roots).toContain('pg_catalog.pg_type')
    expect(
      graph.definitions
        .find((n) => n.identity === 'pg_catalog.pg_type')!
        .fields.some((f) => f.name === 'typname'),
    ).toBe(true)
    expect(oidKey(graph)).toBe(false)
  } finally {
    await pg.close()
  }
}, 60_000)

it('captures declared composite-domain chains and foreign record dependencies without typed columns', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA foreign_types;CREATE TYPE foreign_types.leaf AS(n int4,label text);
CREATE DOMAIN public.approved AS foreign_types.leaf CHECK((VALUE).n>0);
CREATE DOMAIN public.required AS public.approved NOT NULL;
CREATE DOMAIN public.unrelated AS int4;`)
    const graph = await readCatalogCompositeTypes(pg, ['public']),
      nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
    expect(graph.roots).toEqual([])
    expect(nodes.get('public.required')).toMatchObject({
      kind: 'd',
      base: 'public.approved',
      array: 'public._required',
      notNull: true,
    })
    expect(nodes.get('public.approved')).toMatchObject({ kind: 'd', base: 'foreign_types.leaf' })
    expect(nodes.get('foreign_types.leaf')).toMatchObject({ kind: 'c' })
    expect(nodes.get('public._required')).toMatchObject({ element: 'public.required' })
    expect(nodes.has('public.unrelated')).toBe(false)
    expect(oidKey(graph)).toBe(false)
    expect(await readCatalogCompositeTypes(pg, [])).toEqual({ roots: [], definitions: [] })
  } finally {
    await pg.close()
  }
})

it('captures declared domains over nested foreign record arrays without requiring a table root', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA foreign_types;CREATE TYPE foreign_types.leaf AS(n int4,label text);
CREATE DOMAIN public.approved AS foreign_types.leaf CHECK((VALUE).n>0);
CREATE DOMAIN public.batch AS public.approved[];
CREATE DOMAIN public.required_batch AS public.batch NOT NULL;
CREATE DOMAIN public.batch_set AS public.required_batch[];
CREATE DOMAIN public.unrelated AS int4[];`)
    const graph = await readCatalogCompositeTypes(pg, ['public']),
      nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
    expect(graph.roots).toEqual([])
    for (const [name, base] of [
      ['approved', 'foreign_types.leaf'],
      ['batch', 'public._approved'],
      ['required_batch', 'public.batch'],
      ['batch_set', 'public._required_batch'],
    ]) {
      expect(nodes.get('public.' + name)).toMatchObject({
        kind: 'd',
        base,
        array: 'public._' + name,
      })
      expect(nodes.get('public._' + name)).toMatchObject({ element: 'public.' + name })
    }
    expect(nodes.get('foreign_types.leaf')).toMatchObject({ kind: 'c' })
    expect(nodes.has('public.unrelated')).toBe(false)
    expect(oidKey(graph)).toBe(false)
    for (const node of nodes.values())
      for (const ref of [node.array, node.base, node.element, ...node.fields.map((f) => f.type)])
        if (ref) expect(nodes.has(ref), node.identity + ' -> ' + ref).toBe(true)
    expect(await readCatalogCompositeTypes(pg, [])).toEqual({ roots: [], definitions: [] })
  } finally {
    await pg.close()
  }
})
