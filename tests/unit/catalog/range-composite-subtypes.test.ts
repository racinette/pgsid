import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogRangeTypes, readRangeTypes } from '../../../src/postgres/range-types.js'
import { readCatalogCompositeTypes } from '../../../src/postgres/composite-types.js'
import { compositeTypeDependencies } from '../../../src/catalog/composite-dependencies.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { comparableStates } from '../../../src/catalog/diff.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'

const schema = `CREATE SCHEMA "Inner.Types";CREATE SCHEMA "Outer.Types";
CREATE TYPE "Inner.Types".phase AS ENUM('z','a');ALTER TYPE "Inner.Types".phase ADD VALUE 'mid' BEFORE 'a';
CREATE DOMAIN "Inner.Types".positive AS int2 CHECK(VALUE>0);
CREATE TYPE "Inner.Types".child AS(n int4);
CREATE TYPE "Inner.Types".leaf AS(n "Inner.Types".positive,obsolete integer,label varchar(3) COLLATE "C",phase "Inner.Types".phase,span int4range,history "Inner.Types".child[]);
ALTER TYPE "Inner.Types".leaf DROP ATTRIBUTE obsolete;
CREATE DOMAIN "Inner.Types".approved AS "Inner.Types".leaf NOT NULL;
CREATE DOMAIN "Inner.Types".batch AS "Inner.Types".approved[];
CREATE TYPE "Inner.Types".other AS(v int8);
CREATE TYPE "Inner.Types".document AS(doc json);
CREATE TYPE "Outer.Types".record_span AS RANGE(subtype="Inner.Types".leaf,multirange_type_name="Outer.Types".record_set);
CREATE TYPE "Outer.Types".domain_span AS RANGE(subtype="Inner.Types".approved);
CREATE TYPE "Outer.Types".array_span AS RANGE(subtype="Inner.Types".batch[]);
CREATE TYPE "Outer.Types".nested_span AS RANGE(subtype="Outer.Types".record_span);
CREATE TYPE "Outer.Types".other_span AS RANGE(subtype="Inner.Types".other);
CREATE TYPE "Outer.Types".document_span AS RANGE(subtype="Inner.Types".document);
CREATE TYPE "Outer.Types".image_span AS RANGE(subtype="Inner.Types".leaf,subtype_opclass=pg_catalog.record_image_ops);`
const hasOid = (value: unknown): boolean =>
  value !== null &&
  typeof value === 'object' &&
  Object.entries(value).some(([key, v]) => /oid/i.test(key) || hasOid(v))
const leaf = '"Inner.Types".leaf'

it('captures closed composite range subtype fields across domains, arrays and nested ranges without deployment IDs', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(schema)
    await second.exec(
      "CREATE TYPE padding AS ENUM('unused');" + schema + 'SET search_path=pg_catalog;',
    )
    const left = await readCatalogRangeTypes(first, ['Outer.Types']),
      right = await readCatalogRangeTypes(second, ['Outer.Types'])
    expect(left).toHaveLength(7)
    expect(right).toEqual(left)
    expect(hasOid(left)).toBe(false)
    const oid = async (pg: PGlite) =>
      (await pg.query<{ value: number }>(`SELECT '"Inner.Types".leaf'::regtype::oid::int4 value`))
        .rows[0]!.value
    expect(await oid(first)).not.toBe(await oid(second))
    const profile = (name: string) => left.find((p) => p.name === name)!
    for (const name of ['record_span', 'domain_span', 'array_span', 'nested_span', 'image_span']) {
      const graph = profile(name).subtypeCompositeGraph!
      expect(graph.roots).toEqual([leaf])
      expect(graph.definitions.some((n) => n.identity === '"Inner.Types".other')).toBe(false)
      expect(graph.definitions.some((n) => n.identity === '"Inner.Types".document')).toBe(false)
      const nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
      for (const n of nodes.values())
        for (const ref of [
          n.array,
          n.base,
          n.element,
          n.subtype,
          n.member,
          ...n.fields.map((f) => f.type),
        ])
          if (ref) expect(nodes.has(ref), name + '/' + ref).toBe(true)
      expect(nodes.get(leaf)).toMatchObject({
        attributeCount: 6,
        comparison: {
          comparator: 'function:["pg_catalog","btrecordcmp"](pg_catalog.record,pg_catalog.record)',
          comparisonAvailable: true,
        },
      })
      expect(nodes.get(leaf)!.fields.map((f) => [f.position, f.name])).toEqual([
        [1, 'n'],
        [3, 'label'],
        [4, 'phase'],
        [5, 'span'],
        [6, 'history'],
      ])
      expect(nodes.get(leaf)!.attributeCount).toBe(6)
      expect(nodes.get(leaf)!.fields[1]).toMatchObject({
        typeMod: 7,
        collation: 'pg_catalog."C"',
        collationIsC: true,
      })
      expect(nodes.get('"Inner.Types".phase')!.enumLabels).toEqual(['z', 'mid', 'a'])
      expect(nodes.get('"Inner.Types".positive')).toMatchObject({
        kind: 'd',
        base: 'pg_catalog.int2',
      })
      expect(nodes.get('pg_catalog.int4range')).toMatchObject({
        kind: 'r',
        subtype: 'pg_catalog.int4',
      })
      expect(nodes.get('"Inner.Types".child')).toMatchObject({
        kind: 'c',
        fields: [{ name: 'n', type: 'pg_catalog.int4' }],
      })
    }
    expect(profile('domain_span').subtypeDefinitions!.find((n) => n.kind === 'd')).toMatchObject({
      identity: '"Inner.Types".approved',
      base: leaf,
    })
    expect(
      profile('array_span').subtypeDefinitions!.some((n) => n.kind === 'c' && n.identity === leaf),
    ).toBe(true)
    expect(profile('nested_span').subtypeRanges![0]!.subtypeCompositeGraph).toEqual(
      profile('record_span').subtypeCompositeGraph,
    )
    expect(profile('image_span').comparator).toBe(
      'function:["pg_catalog","btrecordimagecmp"](pg_catalog.record,pg_catalog.record)',
    )
    expect(profile('image_span').subtypeClass).toBe('pg_catalog.record_image_ops')
    const document = profile('document_span').subtypeCompositeGraph!
    expect(
      document.definitions.find((n) => n.identity === '"Inner.Types".document')!.comparison,
    ).toMatchObject({ comparisonAvailable: false, equalityAvailable: false })
    const before = structuredClone(right)
    profile('record_span')
      .subtypeCompositeGraph!.definitions.find((n) => n.kind === 'e')!
      .enumLabels!.push('mutation')
    expect(
      profile('domain_span').subtypeCompositeGraph!.definitions.find((n) => n.kind === 'e')!
        .enumLabels,
    ).toEqual(['z', 'mid', 'a'])
    expect(right).toEqual(before)
    expect(await readCatalogRangeTypes(second, ['Outer.Types'])).toEqual(before)
    expect(await readCatalogRangeTypes(second, [])).toEqual([])
    const legacy = await readRangeTypes(second, 'Outer.Types')
    expect(legacy).toHaveLength(7)
    expect(
      legacy.every((p) => !('subtypeCompositeGraph' in p) && !('subtypeDefinitions' in p)),
    ).toBe(true)
  } finally {
    await first.close()
    await second.close()
  }
}, 120_000)

it('keeps exact selected record dependencies independent and exposes field changes in range schema state', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(schema)
    const graph = await readCatalogCompositeTypes(pg, [], [leaf]),
      slice = compositeTypeDependencies(graph, [leaf])!
    expect(slice).toEqual({
      ...graph,
      definitions: [...graph.definitions].sort((a, b) =>
        a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0,
      ),
    })
    expect(compositeTypeDependencies(graph, ['missing.type'])).toBe(null)
    expect(compositeTypeDependencies(graph, ['pg_catalog.int2'])).toBe(null)
    const broken = structuredClone(graph)
    broken.definitions = broken.definitions.filter((n) => n.identity !== 'pg_catalog.int2')
    expect(compositeTypeDependencies(broken, [leaf])).toBe(null)
    slice.definitions.find((n) => n.identity === leaf)!.fields[0]!.name = 'mutated'
    expect(graph.definitions.find((n) => n.identity === leaf)!.fields[0]!.name).toBe('n')
    const before = await snapshotCatalog(pg),
      states = comparableStates(before)
    const range = (await readCatalogRangeTypes(pg, ['Outer.Types'])).find(
      (p) => p.name === 'record_span',
    )!
    await pg.exec('ALTER TYPE "Inner.Types".leaf ALTER ATTRIBUTE label TYPE varchar(4)')
    const after = await snapshotCatalog(pg)
    expect(comparableStates(after).get('Outer.Types.record_span')).not.toEqual(
      states.get('Outer.Types.record_span'),
    )
    expect(comparableStates(after).get('Outer.Types.record_set')).not.toEqual(
      states.get('Outer.Types.record_set'),
    )
    expect(comparableStates(after).get('Outer.Types.other_span')).toEqual(
      states.get('Outer.Types.other_span'),
    )
    const current = (await readCatalogRangeTypes(pg, ['Outer.Types'])).find(
      (p) => p.name === 'record_span',
    )!
    expect(
      current.subtypeCompositeGraph!.definitions.find((n) => n.identity === leaf)!.fields[1]!
        .typeMod,
    ).toBe(8)
    expect(
      range.subtypeCompositeGraph!.definitions.find((n) => n.identity === leaf)!.fields[1]!.typeMod,
    ).toBe(7)
    await pg.exec('SET quote_all_identifiers=on')
    expect(
      (await readCatalogRangeTypes(pg, ['Outer.Types'])).find((p) => p.name === 'record_span')!
        .subtypeCompositeGraph,
    ).toEqual(current.subtypeCompositeGraph)
  } finally {
    await pg.close()
  }
}, 120_000)

it('retains native composite bound, missing-comparator and NULL semantics while SQL admission remains explicitly pending', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int4,label text COLLATE "C");CREATE TYPE span AS RANGE(subtype=leaf);CREATE TYPE document AS(doc json);CREATE TYPE document_span AS RANGE(subtype=document);
CREATE TABLE gate(value span,CONSTRAINT valid CHECK((lower(value)).n>=2));`)
    await expect(
      pg.exec("INSERT INTO gate VALUES(span(ROW(2,'a')::leaf,ROW(3,'b')::leaf))"),
    ).resolves.toBeDefined()
    await expect(
      pg.exec("INSERT INTO gate VALUES(span(ROW(1,'a')::leaf,ROW(3,'b')::leaf))"),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(pg.exec("SELECT span(ROW(3,'a')::leaf,ROW(2,'a')::leaf)")).rejects.toMatchObject({
      code: '22000',
    })
    expect(
      (
        await pg.query<{ value: boolean }>(
          "SELECT isempty(span(ROW(NULL,NULL)::leaf,ROW(NULL,NULL)::leaf,'[]')) value",
        )
      ).rows[0]!.value,
    ).toBe(false)
    expect(
      (
        await pg.query<{ value: boolean }>(
          "SELECT isempty(span(ROW(NULL,NULL)::leaf,ROW(NULL,NULL)::leaf,'[)')) value",
        )
      ).rows[0]!.value,
    ).toBe(true)
    await expect(
      pg.exec("SELECT document_span(ROW(NULL)::document,ROW(NULL)::document,'[]')"),
    ).rejects.toMatchObject({ code: '42883' })
    expect(
      (await pg.query<{ value: boolean }>('SELECT lower_inf(document_span(NULL,NULL)) value'))
        .rows[0]!.value,
    ).toBe(true)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'gate')!,
      constraint = table.constraints.find((c) => c.name === 'valid')!
    for (const origin of ['source', 'stored'] as const)
      expect(
        lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression.kind,
      ).toBe('uncertain')
  } finally {
    await pg.close()
  }
}, 60_000)
