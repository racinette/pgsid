import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import {
  typescriptCodec,
  typescriptCodecSource,
  typescriptCodecType,
  withTypescriptJsonValue,
} from '../../src/codegen/typescript/sql/codecs.js'

let pg: PGlite
let catalog: CatalogSnapshot

beforeAll(async () => {
  pg = await PGlite.create()
  await pg.exec(`CREATE DOMAIN ints AS integer[];
CREATE TYPE int_span AS RANGE (subtype = integer[]);
CREATE TYPE ints_span AS RANGE (subtype = ints);
CREATE TYPE vector_span AS RANGE (subtype = int2vector);`)
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

// int2vector records its element for the evaluator, but its text is "1 2", not array text.
it('reads the bounds of a range over int2vector with its own codec', () => {
  const codec = typescriptCodec('public.vector_span', catalog)
  expect(codec.kind).toBe('range')
  expect(codec.kind === 'range' && codec.element).toEqual(
    typescriptCodec('pg_catalog.int2vector', catalog),
  )
})

it('rejects text that is not array output rather than reading past its end', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-codec-'))
  try {
    const path = join(directory, 'codecs.mjs')
    await writeFile(
      path,
      ts.transpileModule(
        withTypescriptJsonValue(typescriptCodecSource) + '\nexport { decodeArray }\n',
        { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } },
      ).outputText,
    )
    const { decodeArray } = (await import(path)) as {
      decodeArray: (
        value: string | null,
        element: (item: string | null) => unknown,
        delimiter: string,
        dimensions: readonly number[],
        setting: string,
      ) => unknown
    }
    const read = (text: string) => decodeArray(text, (item) => item, ',', [1], 'test')
    expect(read('{1,NULL,"a,b"}')).toEqual(['1', null, 'a,b'])
    expect(read('{}')).toEqual([])
    for (const text of ['1 3', '', '{1,2', '{"a', '{"a"x}', '[1:2]=1,2'])
      expect(() => read(text), text).toThrow(TypeError)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
