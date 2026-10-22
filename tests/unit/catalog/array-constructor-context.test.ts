import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import { captureArrayConstructorContext } from '../../../src/catalog/coercion-context.js'
import { lowerTableCheck, lowerDomainCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { resolveArrayPolymorphicType } from '../../../src/sql-semantics/expressions.js'

it('preserves nominal vector identity for anyarray and selects ordinary compatible arrays', () => {
  expect(
    resolveArrayPolymorphicType(['pg_catalog.anyarray'], 'pg_catalog.anyarray', [
      'pg_catalog.int2vector',
    ]),
  ).toBe('pg_catalog.int2vector')
  expect(
    resolveArrayPolymorphicType(['pg_catalog.anyarray'], 'pg_catalog.anyelement', [
      'pg_catalog.oidvector',
    ]),
  ).toBe('pg_catalog.oid')
  expect(
    resolveArrayPolymorphicType(['pg_catalog.anyarray', 'pg_catalog.anyarray'], 'pg_catalog.bool', [
      'pg_catalog.int2vector',
      'array:pg_catalog.int2',
    ]),
  ).toBeNull()
  expect(
    resolveArrayPolymorphicType(
      ['pg_catalog.anycompatiblearray', 'pg_catalog.anycompatiblearray'],
      'pg_catalog.anycompatiblearray',
      ['pg_catalog.int2vector', 'array:pg_catalog.int4'],
    ),
  ).toBe('array:pg_catalog.int4')
  expect(
    resolveArrayPolymorphicType(
      ['pg_catalog.anyarray', 'pg_catalog.anyelement'],
      'pg_catalog.anyelement',
      ['array:pg_catalog.oidvector', 'pg_catalog.oidvector'],
    ),
  ).toBe('pg_catalog.oidvector')
})

it('uses captured vector type-name cast choices across later function shadowing', async () => {
  const pg = await PGlite.create()
  try {
    const sql = "int2vector(input_text)::text='1 2'"
    await pg.exec(`CREATE TABLE vector_cast(input_text text, CONSTRAINT valid CHECK(${sql}));
      CREATE FUNCTION public.int2vector(text) RETURNS int2vector LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT '9'::int2vector $$;
      CREATE TABLE vector_function(input_text text, CONSTRAINT valid CHECK(${sql}));`)
    const catalog = await snapshotCatalog(pg)
    for (const name of ['vector_cast', 'vector_function']) {
      const table = catalog.tables.find((t) => t.name === name)!,
        constraint = table.constraints[0]!
      for (const origin of ['source', 'stored'] as const) {
        const expression = lowerTableCheck(
          table,
          constraint,
          [],
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${sql})` : undefined,
        )!.expression
        expect(uncertain(expression), name + '/' + origin).toBe(name === 'vector_function')
      }
      expect(
        uncertain(
          lowerTableCheck(
            table,
            { ...constraint, definition: `CHECK(${sql})` },
            [],
            catalog.domains,
            'source',
          )!.expression,
        ),
      ).toBe(true)
    }
    await pg.exec("INSERT INTO vector_cast VALUES('1 2')")
    await expect(pg.exec("INSERT INTO vector_function VALUES('1 2')")).rejects.toMatchObject({
      code: '23514',
    })
    await expect(pg.exec('SELECT pg_catalog.int2vector(ARRAY[1,2])')).rejects.toMatchObject({
      code: '42883',
    })
  } finally {
    await pg.close()
  }
})

const uncertain = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') return false
  if ('kind' in node && node.kind === 'uncertain') return true
  return Object.values(node).some(uncertain)
}

it('captures vector constructor identities across stored syntax, domains and semantic sites without deployment identifiers', async () => {
  const results: unknown[] = []
  for (const padding of ['', "CREATE TYPE padding AS ENUM('unused');"]) {
    const pg = await PGlite.create()
    try {
      await pg.exec(`${padding}
        CREATE DOMAIN selected_vector AS int2vector CHECK(VALUE=ARRAY[1,2]::int2vector);
        CREATE TABLE selected_vectors(v int2vector,o oidvector,flag boolean,
          CONSTRAINT direct CHECK(v=ARRAY[1,2]::int2vector),
          CONSTRAINT mixed CHECK(v=ARRAY[1,2]::int2vector AND cardinality(ARRAY[1::smallint,2::smallint])=2),
          CONSTRAINT nested CHECK(cardinality(CASE WHEN flag THEN ARRAY[ARRAY[1,2],ARRAY[3,4]]::int2vector ELSE ARRAY[]::int2vector END)=4),
          CONSTRAINT oid_choice CHECK(NULLIF(o,ARRAY[1,2]::oidvector) IS NULL));`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'selected_vectors')!,
        captured = table.constraints.map((c) => ({
          name: c.name,
          context: c.arrayConstructorContext,
        }))
      for (const c of table.constraints) {
        expect(c.arrayConstructorContext?.complete, c.name).toBe(true)
        expect(uncertain(lowerTableCheck(table, c, [], catalog.domains)!.expression), c.name).toBe(
          false,
        )
      }
      expect(
        table.constraints.find((c) => c.name === 'mixed')!.arrayConstructorContext!.constructors,
      ).toHaveLength(1)
      const direct = table.constraints.find((c) => c.name === 'direct')!
      expect(direct.definition).not.toContain('int2vector')
      expect(
        uncertain(
          lowerTableCheck(
            table,
            { ...direct, arrayConstructorContext: undefined },
            [],
            catalog.domains,
          )!.expression,
        ),
      ).toBe(true)
      expect(
        uncertain(
          lowerTableCheck(
            table,
            {
              ...direct,
              arrayConstructorContext: { ...direct.arrayConstructorContext!, complete: false },
            },
            [],
            catalog.domains,
          )!.expression,
        ),
      ).toBe(true)
      expect(
        uncertain(
          lowerTableCheck(
            table,
            {
              ...direct,
              arrayConstructorContext: {
                ...direct.arrayConstructorContext!,
                definition: 'CHECK(false)',
              },
            },
            [],
            catalog.domains,
          )!.expression,
        ),
      ).toBe(true)
      const domain = catalog.domains.find((d) => d.name === 'selected_vector')!
      expect(domain.checks[0]!.arrayConstructorContext?.complete).toBe(true)
      expect(
        uncertain(lowerDomainCheck(domain, domain.checks[0]!, [], catalog.domains)!.expression),
      ).toBe(false)
      results.push({ captured, domain: domain.checks })
      await expect(
        pg.exec('SELECT NULL::int2vector=ARRAY[1::smallint,2::smallint]'),
      ).rejects.toMatchObject({ code: '42883' })
      await expect(
        pg.exec('SELECT ARRAY[1::smallint,2::smallint]::smallint[]::int2vector'),
      ).rejects.toMatchObject({ code: '42846' })
    } finally {
      await pg.close()
    }
  }
  expect(results[0]).toEqual(results[1])
}, 30_000)

it('reports constructor selection changes even when PostgreSQL prints the same CHECK text', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      "CREATE TABLE changing_vectors(id integer, CONSTRAINT text_value CHECK((ARRAY[1,2]::int2vector)::text='1 2'))",
    )
    const before = await snapshotCatalog(pg)
    await pg.exec(
      "ALTER TABLE changing_vectors DROP CONSTRAINT text_value; ALTER TABLE changing_vectors ADD CONSTRAINT text_value CHECK((ARRAY[1::smallint,2::smallint])::text='1 2')",
    )
    const after = await snapshotCatalog(pg)
    expect(before.tables[0]!.constraints[0]!.definition).toBe(
      after.tables[0]!.constraints[0]!.definition,
    )
    expect(diffCatalogs(before, after).modified.map((change) => change.entityId)).toContain(
      'public.changing_vectors',
    )
  } finally {
    await pg.close()
  }
})

it('uses supplied catalog identities and rejects incomplete or quoted fake constructor nodes', () => {
  const captures = []
  for (const [array, element] of [
    [70001, 70002],
    [81001, 81002],
  ]) {
    const identities = new Map([
      [array!, 'pg_catalog.int2vector'],
      [element!, 'pg_catalog.int2'],
    ])
    const source = `{ARRAYEXPR :array_typeid ${array} :element_typeid ${element} :multidims false :elements ()}`
    captures.push(captureArrayConstructorContext(source, 'CHECK(true)', identities))
    expect(
      captureArrayConstructorContext(source.slice(0, -1), 'CHECK(true)', identities)?.complete,
    ).toBe(false)
    expect(
      captureArrayConstructorContext(
        `{CONST :consttype ${element} :value "${source}"}`,
        'CHECK(true)',
        identities,
      ),
    ).toBeUndefined()
  }
  expect(captures[0]).toEqual(captures[1])
  expect(captures[0]).toMatchObject({
    complete: true,
    constructors: [
      {
        site: '',
        type: 'pg_catalog.int2vector',
        elementType: 'pg_catalog.int2',
        members: 0,
        multidimensional: false,
      },
    ],
  })
})
