import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import type { BuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { callableBoundary, verifyCatalog } from '../../scripts/check-measurements/catalog.js'
import {
  bindProbe,
  inspectExpression,
  valueRepresentation,
} from '../../scripts/check-measurements/probes.js'
import { verifyWorldDigest } from '../../scripts/check-measurements/worlds.js'

describe('CHECK measurement boundaries', () => {
  let pg: PGlite
  let catalog: BuiltinCatalog
  beforeAll(async () => {
    pg = await PGlite.create()
    catalog = await readBuiltinCatalog(pg)
  })
  afterAll(async () => pg.close())

  it('rejects catalog drift, duplicate overload identities, and changed cast links', () => {
    expect(() => verifyCatalog(catalog)).not.toThrow()
    const version = structuredClone(catalog)
    version.serverVersion++
    expect(() => verifyCatalog(version)).toThrow('version mismatch')
    const missing = structuredClone(catalog)
    missing.functions.pop()
    expect(() => verifyCatalog(missing)).toThrow('callable metadata')
    const duplicate = structuredClone(catalog)
    duplicate.functions.push(duplicate.functions[0]!)
    expect(() => verifyCatalog(duplicate)).toThrow('Duplicate callable identity')
    const altered = structuredClone(catalog)
    altered.operators[0]!.metadata.implementation = 'missing'
    expect(() => verifyCatalog(altered)).toThrow('callable metadata')
    const cast = structuredClone(catalog)
    cast.casts[0]!.method = cast.casts[0]!.method === 'b' ? 'f' : 'b'
    expect(() => verifyCatalog(cast)).toThrow('cast links')
  })

  it('keeps session requirements and new representations outside the pure callable queue', async () => {
    const represented = new Set(['pg_catalog.text', 'pg_catalog.int4'])
    const integer = builtinMetadata('function:["pg_catalog","abs"](pg_catalog.int4)')
    expect(callableBoundary(integer, represented)).toEqual({
      categories: ['pure-callable-candidate'],
      missingTypes: [],
    })
    const quoteIdent = builtinMetadata('function:["pg_catalog","quote_ident"](pg_catalog.text)')
    expect(quoteIdent.volatility).toBe('i')
    expect(callableBoundary(quoteIdent, represented).categories).toContain(
      'session-setting:quote_all_identifiers',
    )
    const float = builtinMetadata('function:["pg_catalog","abs"](pg_catalog.float8)')
    expect(callableBoundary(float, represented)).toEqual({
      categories: ['new-representation'],
      missingTypes: ['pg_catalog.float8'],
    })
    const random = catalog.functions.find(({ metadata }) => metadata.name === 'random')!.metadata
    expect(callableBoundary(random, represented).categories).toContain('volatile')
    const stable = catalog.functions.find(({ metadata }) => metadata.volatility === 's')!.metadata
    expect(callableBoundary(stable, represented).categories).toContain('session-or-database-state')
    try {
      await pg.exec('SET quote_all_identifiers = off')
      const unquoted = await pg.query<{ value: string }>(
        "SELECT quote_ident('plain_identifier') AS value",
      )
      await pg.exec('SET quote_all_identifiers = on')
      const quoted = await pg.query<{ value: string }>(
        "SELECT quote_ident('plain_identifier') AS value",
      )
      expect(unquoted.rows[0]!.value).toBe('plain_identifier')
      expect(quoted.rows[0]!.value).toBe('"plain_identifier"')
    } finally {
      await pg.exec('RESET quote_all_identifiers')
    }
  })

  it('does not mistake nullness support or preparation of Unknown for a value representation', () => {
    const nullness = bindProbe('value IS NULL', [{ name: 'value', typeName: 'double precision' }])
    expect(nullness.fullyBound).toBe(true)
    expect(nullness.preparation.kind).toBe('supported')
    expect(valueRepresentation('double precision').represented).toBe(false)
    expect(valueRepresentation('integer').represented).toBe(true)
    const unknown = inspectExpression({ kind: 'uncertain' })
    expect(unknown.preparation.kind).toBe('supported')
    expect(unknown.fullyBound).toBe(false)
  })

  it('rejects missing and stale world outcome fingerprints', () => {
    expect(() => verifyWorldDigest({}, 'current')).toThrow('missing or stale')
    expect(() => verifyWorldDigest({ sourceDigest: 'old' }, 'current')).toThrow('missing or stale')
    expect(() => verifyWorldDigest({ sourceDigest: 'current' }, 'current')).not.toThrow()
  })
})
