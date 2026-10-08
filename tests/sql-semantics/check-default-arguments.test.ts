import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { readBuiltinCatalog, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { builtinDefaultArguments } from '../../src/postgres/builtins/default-arguments.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'

const normalization = builtinCallables().find(
  (item): item is FunctionMetadata => item.kind === 'function' && item.name === 'normalize',
)!

describe('CHECK catalog default arguments', () => {
  it('captures and parses every default expression from the live catalog without changing callable identities', async () => {
    const pg = await PGlite.create()
    try {
      const catalog = await readBuiltinCatalog(pg)
      const defaults = catalog.functions.filter(({ metadata }) => metadata.numArgDefaults > 0)
      expect(defaults.length).toBeGreaterThan(0)
      for (const { metadata } of defaults) {
        expect(metadata.defaultArguments).toBeTypeOf('string')
        expect(builtinDefaultArguments(metadata), metadata.name).toHaveLength(
          metadata.numArgDefaults,
        )
        const pinned = builtinCallables().find(
          (item) => item.kind !== 'operator' && item.rustName === metadata.rustName,
        )
        expect(pinned).toEqual(metadata)
      }
      for (const { metadata } of catalog.functions.filter(
        ({ metadata }) => metadata.numArgDefaults === 0,
      )) {
        expect(metadata.defaultArguments).toBeUndefined()
        expect(builtinDefaultArguments(metadata)).toEqual([])
      }
    } finally {
      await pg.close()
    }
  })

  it('binds omitted normalization arguments and SQL predicates exactly like their explicit and stored forms', async () => {
    const pg = await PGlite.create()
    try {
      const expressions = [
        [
          'normalize(label) COLLATE "C" = recorded',
          'pg_catalog.normalize(label,\'NFC\') COLLATE "C" = recorded',
        ],
        [
          'pg_catalog.normalize(label) COLLATE "C" = recorded',
          'pg_catalog.normalize(label,\'NFC\') COLLATE "C" = recorded',
        ],
        ['label IS NORMALIZED', "pg_catalog.is_normalized(label,'NFC')"],
        ['label IS NOT NORMALIZED', "NOT pg_catalog.is_normalized(label,'NFC')"],
        ['pg_catalog.is_normalized(label)', "pg_catalog.is_normalized(label,'NFC')"],
        ['label IS NFKD NORMALIZED', "pg_catalog.is_normalized(label,'NFKD')"],
        [
          'normalize(label,NFD) COLLATE "C" = recorded',
          'pg_catalog.normalize(label,\'NFD\') COLLATE "C" = recorded',
        ],
        ['pg_catalog.is_normalized(NULL::text)', "pg_catalog.is_normalized(NULL::text,'NFC')"],
        [
          'pg_catalog.normalize(NULL::text) IS NULL',
          "pg_catalog.normalize(NULL::text,'NFC') IS NULL",
        ],
      ]
      await pg.exec(`CREATE TABLE normalization_defaults (label text, recorded text COLLATE "C", "NFC" text,
        ${expressions.map(([sql], index) => `CONSTRAINT check_${index} CHECK (${sql})`).join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'normalization_defaults')!
      for (const [[sql, explicit], index] of expressions.map(
        (pair, index) => [pair, index] as const,
      )) {
        const raw = lowerTableCheck(table, {
          name: 'raw',
          type: 'check',
          definition: `CHECK (${sql})`,
        })!
        const full = lowerTableCheck(table, {
          name: 'full',
          type: 'check',
          definition: `CHECK (${explicit})`,
        })!
        const stored = lowerTableCheck(
          table,
          table.constraints.find((check) => check.name === `check_${index}`)!,
        )!
        expect(raw.expression, sql).not.toEqual({ kind: 'uncertain' })
        expect(raw.expression, sql).toEqual(full.expression)
        expect(raw.expression, sql).toEqual(stored.expression)
        expect(raw.inputs).not.toContain('NFC')
        expect(raw.inputs).toEqual(full.inputs)
        expect(raw.inputs).toEqual(stored.inputs)
      }
      for (const sql of [
        'pg_catalog.normalize() IS NULL',
        'pg_catalog.is_normalized()',
        "pg_catalog.is_normalized(label,'NFC','extra')",
      ]) {
        const plan = lowerTableCheck(table, {
          name: 'wrong_arity',
          type: 'check',
          definition: `CHECK (${sql})`,
        })!
        expect(plan.expression).toEqual({ kind: 'uncertain' })
      }
    } finally {
      await pg.close()
    }
  })

  it('defers unavailable or malformed defaults instead of guessing their values', () => {
    expect(builtinDefaultArguments({ ...normalization, defaultArguments: undefined })).toBeNull()
    expect(builtinDefaultArguments({ ...normalization, defaultArguments: 'bad(' })).toBeNull()
    expect(
      builtinDefaultArguments({ ...normalization, defaultArguments: "'NFC'::text; SELECT 1" }),
    ).toBeNull()
    expect(
      builtinDefaultArguments({ ...normalization, defaultArguments: "'NFC'::text, true" }),
    ).toBeNull()
    expect(builtinDefaultArguments({ ...normalization, numArgDefaults: 2 })).toBeNull()
    expect(builtinDefaultArguments(normalization)).toHaveLength(1)
  })
})
