import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { readCatalogRangeTypes } from '../../../src/postgres/range-types.js'
import { captureTsvectorDefaultContexts } from '../../../src/catalog/coercion-context.js'
import { tsvectorDefaultSchema } from '../../sql-semantics/check-tsvector-default-fixtures.js'
import { parseSql } from '../../../src/ast.js'
import { planCheckInputs, planCheckWrite } from '../../../src/codegen/shared/check-inputs.js'

it('captures per-argument tsvector scalar, domain and container default sites without catalog OIDs or search-path dependence', async () => {
  const captures: unknown[] = [],
    oids: number[] = []
  for (const offset of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (offset) await pg.exec("CREATE TYPE occupy_oid AS ENUM('x')")
      await pg.exec(tsvectorDefaultSchema + 'SET search_path TO public,pg_catalog')
      const profiles = await readCatalogRangeTypes(pg, ['public'])
      const catalog = await snapshotCatalog(pg)
      expect(profiles).toEqual(catalog.rangeTypes)
      const interleaved = catalog.functions.find((f) => f.name === 'vector_interleaved')!
      expect(interleaved.args.map((a) => a.tsvectorConstants ?? null)).toEqual([
        null,
        null,
        {
          definition: "'''zzzzzzzzzz'''::tsvector",
          complete: true,
          constants: [{ site: '', storage: { nativeBytes: 22, lexemeCount: 1 } }],
        },
      ])
      for (const profile of profiles)
        for (const callable of profile.callables ?? []) {
          if (!callable.defaultTsvectorConstants) continue
          const fn = catalog.functions.find(
            (f) => f.schema === callable.schema && f.name === callable.name,
          )!
          expect(
            fn.args.map((a, index) =>
              a.tsvectorConstants
                ? { ...a.tsvectorConstants, definition: callable.defaultExprs![index]! }
                : null,
            ),
            callable.name,
          ).toEqual(callable.defaultTsvectorConstants)
        }
      expect((await pg.query("SELECT current_setting('search_path') value")).rows).toEqual([
        { value: 'public, pg_catalog' },
      ])
      const callables = profiles.flatMap((p) => p.callables ?? [])
      const tail = callables.find((c) => c.name === 'vector_tail')!
      expect(tail.defaultTsvectorConstants).toEqual([
        null,
        {
          definition: "'''zzzzzzzzzz'''::tsvector",
          complete: true,
          constants: [{ site: '', storage: { nativeBytes: 22, lexemeCount: 1 } }],
        },
        null,
      ])
      for (const name of [
        'vector_defaults',
        'vector_constructed',
        'vector_null',
        'vector_domain_defaults',
        'vector_array_defaults',
        'vector_array_constructed',
        'vector_record_defaults',
        'vector_record_constructed',
      ]) {
        const callable = callables.find((c) => c.name === name)!
        expect(callable.defaultTsvectorConstants?.length, name).toBe(callable.args.length)
        for (const [i, context] of callable.defaultTsvectorConstants!.entries()) {
          expect(context?.complete, name).toBe(true)
          expect(context?.definition, name).toBe(callable.defaultExprs![i])
        }
      }
      expect(
        callables.find((c) => c.name === 'vector_array_defaults')!.defaultTsvectorConstants![0]
          ?.containers?.[0]?.storage,
      ).toEqual([{ nativeBytes: 13, lexemeCount: 1 }])
      expect(
        callables.find((c) => c.name === 'vector_record_defaults')!.defaultTsvectorConstants![0]
          ?.containers?.[0]?.storage,
      ).toEqual([{ nativeBytes: 13, lexemeCount: 1 }])
      const storage = callables.flatMap((c) => c.defaultTsvectorConstants ?? [])
      const keys = new Set<string>()
      const visit = (value: unknown): void => {
        if (Array.isArray(value)) value.forEach(visit)
        else if (value && typeof value === 'object')
          for (const [key, child] of Object.entries(value)) {
            keys.add(key)
            visit(child)
          }
      }
      visit(storage)
      expect([...keys].sort()).toEqual(
        [
          'complete',
          'constants',
          'containers',
          'definition',
          'lexemeCount',
          'nativeBytes',
          'site',
          'storage',
        ].sort(),
      )
      captures.push(storage)
      oids.push(
        (await pg.query<{ oid: number }>("SELECT 'vector_record'::regtype::oid oid")).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(oids[0]).not.toBe(oids[1])
  expect(captures[0]).toEqual(captures[1])
}, 30_000)

it('refuses malformed or misaligned native default lists instead of binding storage to the wrong argument', () => {
  const constant =
    '{CONST :consttype 57111 :constlen -1 :constbyval false :constisnull false :constvalue 13 [ 52 0 0 0 1 0 0 0 0 0 0 0 97 ]}'
  for (const source of [
    null,
    constant,
    '(' + constant,
    '(' + constant + ' ' + constant + ')',
    '()',
  ])
    expect(
      captureTsvectorDefaultContexts(source, [null, "'a'::tsvector"], new Set([57111]), new Map(), {
        types: new Map(),
        roots: new Set(),
      }),
    ).toEqual([null, null])
  expect(
    captureTsvectorDefaultContexts(
      '(' + constant + ')',
      [null, "'a'::tsvector"],
      new Set([57111]),
      new Map(),
      { types: new Map(), roots: new Set() },
    ),
  ).toEqual([
    null,
    {
      definition: "'a'::tsvector",
      complete: true,
      constants: [{ site: '', storage: { nativeBytes: 13, lexemeCount: 1 } }],
    },
  ])
})

it('keeps assignment defaults on the database boundary and does not apply them to explicit domain casts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE DOMAIN document_default AS tsvector DEFAULT 'domain_default';
      CREATE TABLE default_assignment(document document_default CHECK(length(document)>0),other int4)`)
    const catalog = await snapshotCatalog(pg)
    for (const sql of [
      'INSERT INTO default_assignment(other) VALUES(1)',
      'INSERT INTO default_assignment(document,other) VALUES(DEFAULT,1)',
    ]) {
      const statement = (await parseSql(sql)).stmts![0]!.stmt!
      expect(planCheckWrite(statement, [], catalog, [])?.columns).toEqual([
        { name: 'document', source: { kind: 'default' } },
      ])
      expect(planCheckInputs(statement, [], catalog, [])).toEqual([])
      expect((await pg.query(sql + ' RETURNING document::text value')).rows).toEqual([
        { value: "'domain_default'" },
      ])
    }
    expect((await pg.query('SELECT (NULL::document_default) IS NULL value')).rows).toEqual([
      { value: true },
    ])
    expect(
      (
        await pg.query(`SELECT p.proname FROM pg_proc p WHERE p.pronamespace='pg_catalog'::regnamespace
      AND p.pronargdefaults>0 AND p.proargdefaults::text ~
      ('\\{CONST :consttype ('||'tsvector'::regtype::oid||'|'||'tsvector[]'::regtype::oid||') ')`)
      ).rows,
    ).toEqual([])
  } finally {
    await pg.close()
  }
}, 30_000)
