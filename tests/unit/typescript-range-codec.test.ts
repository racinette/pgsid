import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import { typescriptCodec, typescriptCodecType } from '../../src/codegen/typescript/sql/codecs.js'

let pg: PGlite
let catalog: CatalogSnapshot

beforeAll(async () => {
  pg = await PGlite.create()
  await pg.exec(`CREATE DOMAIN ints AS integer[];
CREATE TYPE int_span AS RANGE (subtype = integer[]);
CREATE TYPE ints_span AS RANGE (subtype = ints);`)
  catalog = await snapshotCatalog(pg)
})
afterAll(async () => {
  await pg.close()
})

// The catalog names an array subtype by its internal name (pg_catalog._int4); its bounds are lists.
it('reads the bounds of a range over an array as lists', () => {
  for (const type of ['public.int_span', 'public.int_span_multirange', 'public.ints_span']) {
    const codec = typescriptCodec(type, catalog)
    expect(codec.kind, type).not.toBe('scalar')
    expect(codec.kind !== 'scalar' && codec.kind !== 'composite' && codec.element.kind, type).toBe(
      'array',
    )
  }
  expect(typescriptCodecType(typescriptCodec('public.int_span', catalog))).toContain(
    'lower: { readonly value: (number | null)[]; readonly inclusive: boolean } | null',
  )
})
