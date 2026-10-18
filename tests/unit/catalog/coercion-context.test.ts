import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import { captureDomainCoercionContext } from '../../../src/catalog/coercion-context.js'

it('captures portable table and domain coercion contexts independently of deployment type IDs', async () => {
  const contexts: unknown[] = [],
    identifiers: number[][] = []
  for (const padding of ['', "CREATE TYPE deployment_padding AS ENUM('unused')"]) {
    const pg = await PGlite.create()
    try {
      await pg.exec(`${padding};CREATE DOMAIN short_code AS varchar(3);
    CREATE TABLE context_examples(codes short_code[],words varchar[],flag boolean,
      CONSTRAINT implicit_code CHECK(cardinality(array_append(codes,'abcd'))=2),
      CONSTRAINT explicit_code CHECK(cardinality(array_append(codes,('abcd'::varchar)::short_code))=2),
      CONSTRAINT implicit_array CHECK(cardinality(COALESCE(codes,words))=2),
      CONSTRAINT explicit_array CHECK(cardinality(words::short_code[])=2),
      CONSTRAINT constant_array CHECK(cardinality('{abc}'::short_code[])=1));
    CREATE DOMAIN nested_guard AS integer CHECK(cardinality(array_append(ARRAY['abc']::short_code[],'abcd'))=2);`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'context_examples')!
      const captured = table.constraints.map((c) => ({ name: c.name, context: c.coercionContext }))
      expect(captured.every((c) => c.context?.complete)).toBe(true)
      const scalarImplicit = table.constraints.find((c) => c.name === 'implicit_code')!,
        scalarExplicit = table.constraints.find((c) => c.name === 'explicit_code')!
      expect(scalarImplicit.definition).toBe(scalarExplicit.definition)
      expect(scalarImplicit.coercionContext!.casts).toEqual([
        { schema: 'public', name: 'short_code', array: false, input: true, constant: false },
      ])
      expect(scalarExplicit.coercionContext!.casts[0]!.input).toBe(false)
      expect(
        table.constraints.find((c) => c.name === 'implicit_array')!.coercionContext!.casts,
      ).toEqual([
        { schema: 'public', name: 'short_code', array: true, input: true, constant: false },
      ])
      expect(
        table.constraints.find((c) => c.name === 'explicit_array')!.coercionContext!.casts[0]!
          .input,
      ).toBe(false)
      expect(
        table.constraints.find((c) => c.name === 'constant_array')!.coercionContext!.casts[0]!
          .constant,
      ).toBe(true)
      const nested = catalog.domains.find((d) => d.name === 'nested_guard')!.checks[0]!
        .coercionContext
      expect(nested?.complete).toBe(true)
      expect(nested?.casts.at(-1)?.input).toBe(true)
      contexts.push({ captured, nested })
      identifiers.push(catalog.domains.map((d) => d.oid))
    } finally {
      await pg.close()
    }
  }
  expect(identifiers[0]).not.toEqual(identifiers[1])
  expect(contexts[0]).toEqual(contexts[1])
})

it('reports a CHECK behavior change when printed definitions remain identical', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      "CREATE DOMAIN short_code AS varchar(3);CREATE TABLE changing(codes short_code[],CONSTRAINT width CHECK(cardinality(array_append(codes,'abcd'))=2))",
    )
    const before = await snapshotCatalog(pg)
    await pg.exec(
      "ALTER TABLE changing DROP CONSTRAINT width;ALTER TABLE changing ADD CONSTRAINT width CHECK(cardinality(array_append(codes,('abcd'::varchar)::short_code))=2)",
    )
    const after = await snapshotCatalog(pg)
    expect(before.tables[0]!.constraints[0]!.definition).toBe(
      after.tables[0]!.constraints[0]!.definition,
    )
    expect(diffCatalogs(before, after).modified.map((change) => change.entityId)).toContain(
      'public.changing',
    )
  } finally {
    await pg.close()
  }
})

it('rejects incomplete structural metadata and does not scan quoted catalog data as nodes', () => {
  const identities = new Map([
    [40001, { schema: 'x', name: 'd', array: false }],
    [40002, { schema: 'x', name: 'd', array: true }],
  ])
  for (const source of [
    '{COERCETODOMAIN :resulttype 40001 :coercionformat 2',
    '{COERCETODOMAIN :resulttype 40001 :resulttype 40001 :coercionformat 2}',
    '{COERCETODOMAIN :resulttype 90001 :coercionformat 2}',
    '{COERCETODOMAIN :resulttype 40001 :coercionformat 9}',
  ])
    expect(captureDomainCoercionContext(source, 'CHECK (true)', identities)?.complete, source).toBe(
      false,
    )
  expect(
    captureDomainCoercionContext(
      '{CONST :consttype 25 :value "{COERCETODOMAIN :resulttype 40001}"}',
      'CHECK (true)',
      identities,
    ),
  ).toBeUndefined()
  expect(
    captureDomainCoercionContext(
      '{ARRAYCOERCEEXPR :arg {CONST :consttype 25 :constvalue 1 [ 0 ]} :elemexpr {COERCETODOMAIN :arg {CASETESTEXPR :typeId 25} :resulttype 40001 :coercionformat 2} :resulttype 40002 :coerceformat 1}',
      'CHECK (true)',
      identities,
    ),
  ).toEqual({
    definition: 'CHECK (true)',
    complete: true,
    casts: [{ schema: 'x', name: 'd', array: true, input: false, constant: false }],
  })
})

it('accepts ordinary catalog field names that also exist on object prototypes', () => {
  expect(
    captureDomainCoercionContext(
      '{ROOT :constructor none :args ({COERCETODOMAIN :resulttype 60001 :coercionformat 2})}',
      'CHECK (true)',
      new Map([[60001, { schema: 'public', name: 'd', array: false }]]),
    ),
  ).toEqual({
    definition: 'CHECK (true)',
    complete: true,
    casts: [{ schema: 'public', name: 'd', array: false, input: true, constant: false }],
  })
})

it('captures text input and whole-domain array relabels in the order printed by PostgreSQL', async () => {
  const captured: unknown[] = []
  const identifiers: number[][] = []
  for (const padding of ['', "CREATE TYPE context_padding AS ENUM('unused');"]) {
    const pg = await PGlite.create()
    try {
      await pg.exec(`${padding}CREATE DOMAIN positive_item AS integer CHECK(VALUE>0);
        CREATE DOMAIN item_pair AS positive_item[] CHECK(cardinality(VALUE)=2);
        CREATE TABLE coercion_paths(payload text,
          CONSTRAINT mixed CHECK(cardinality(COALESCE(payload::positive_item[],ARRAY[1]::positive_item[]))>0),
          CONSTRAINT whole CHECK(cardinality(payload::item_pair)=2),
          CONSTRAINT explicit_base CHECK(cardinality(payload::positive_item[]::item_pair)=2))`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((item) => item.name === 'coercion_paths')!
      const mixed = table.constraints.find((item) => item.name === 'mixed')!.coercionContext!
      const whole = table.constraints.find((item) => item.name === 'whole')!.coercionContext!
      expect(mixed.complete).toBe(true)
      expect(mixed.casts).toEqual([
        { schema: 'public', name: 'positive_item', array: true, input: false, constant: false },
        { schema: 'public', name: 'positive_item', array: false, input: false, constant: false },
      ])
      expect(whole.complete).toBe(true)
      expect(whole.casts).toEqual([
        { schema: 'public', name: 'positive_item', array: true, input: true, constant: false },
        { schema: 'public', name: 'item_pair', array: false, input: false, constant: false },
      ])
      const explicit = table.constraints.find(
        (item) => item.name === 'explicit_base',
      )!.coercionContext!
      expect(explicit.complete).toBe(true)
      expect(explicit.casts).toEqual([
        { schema: 'public', name: 'positive_item', array: true, input: true, constant: false },
        { schema: 'public', name: 'item_pair', array: false, input: false, constant: false },
        { schema: 'public', name: 'positive_item', array: true, input: false, constant: false },
      ])
      captured.push({ mixed, whole, explicit })
      identifiers.push(catalog.domains.map((domain) => domain.oid))
    } finally {
      await pg.close()
    }
  }
  expect(identifiers[0]).not.toEqual(identifiers[1])
  expect(captured[0]).toEqual(captured[1])
})
