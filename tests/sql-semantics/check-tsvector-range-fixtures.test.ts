import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import {
  rangeBoundCell,
  rangeBoundProjection,
  readArrayBoundFixture,
  readRangeFixture,
} from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('reads native tsvector values and storage sizes through range and recursive container fixtures', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE document_span AS RANGE(subtype=tsvector,multirange_type_name=document_ranges);
      CREATE DOMAIN imported_document AS tsvector;
      CREATE TYPE imported_span AS RANGE(subtype=imported_document,multirange_type_name=imported_ranges);`)
    const profiles = customRangeProfiles(await snapshotCatalog(pg)),
      documents = profiles.find((p) => p.name === 'document_span')!
    const samples = [
      { text: '', lexemes: [], nativeBytes: 8 },
      { text: 'a', lexemes: [{ text: 'a', positions: [] }], nativeBytes: 13 },
      {
        text: "'z':1A",
        lexemes: [{ text: 'z', positions: [{ position: 1, weight: 3 }] }],
        nativeBytes: 18,
      },
      {
        text: "'a':1A,2B,3C,4 'é':9A '日本':16383B",
        lexemes: [
          {
            text: 'a',
            positions: [
              { position: 1, weight: 3 },
              { position: 2, weight: 2 },
              { position: 3, weight: 1 },
              { position: 4, weight: 0 },
            ],
          },
          { text: 'é', positions: [{ position: 9, weight: 3 }] },
          { text: '日本', positions: [{ position: 16383, weight: 2 }] },
        ],
        nativeBytes: 48,
      },
    ]
    for (const sample of samples) {
      const expected = {
        kind: 'Tsvector',
        value: { lexemes: sample.lexemes, nativeBytes: sample.nativeBytes },
      }
      const projected = (
        await pg.query<{ value: string }>(
          `SELECT ${rangeBoundProjection('$1::tsvector', 'pg_catalog.tsvector')} value`,
          [sample.text],
        )
      ).rows[0]!.value
      expect(rangeBoundCell('pg_catalog.tsvector', projected)).toEqual(expected)
      for (const profile of profiles) {
        const span = await readRangeFixture(
          pg,
          `SELECT ${profile.identity}($1::${profile.subtype},NULL,'[)') value`,
          'value',
          profile.rangeType,
          [sample.text],
        )
        expect(span).toMatchObject({
          empty: false,
          lowerInclusive: true,
          upperInclusive: false,
          elementKind: 47,
          bounds: [expected, { kind: 'Null' }],
        })
      }
      const arrayText = (
        await pg.query<{ value: string }>('SELECT ARRAY[$1::tsvector,NULL]::text value', [
          sample.text,
        ])
      ).rows[0]!.value
      expect(
        await readArrayBoundFixture(pg, 'array:pg_catalog.tsvector', 'tsvector[]', arrayText),
      ).toMatchObject({
        elementKind: 47,
        dimensions: [{ lower: 1, length: 2 }],
        elements: [expected, { kind: 'Null' }],
      })
    }
    const members = await readMultirangeFixture(pg, documents.multirangeType, '{[a,b),[c,d)}')
    expect(members?.ranges).toHaveLength(2)
    expect(members?.ranges.map((cell) => cell.kind === 'Value' && cell.value.bounds)).toEqual(
      ['a', 'c'].map((text, index) =>
        [text, ['b', 'd'][index]!].map((text) => ({
          kind: 'Tsvector',
          value: { lexemes: [{ text, positions: [] }], nativeBytes: 13 },
        })),
      ),
    )
    expect(rangeBoundCell('pg_catalog.tsvector', null)).toEqual({ kind: 'Null' })
    expect(
      await readRangeFixture(pg, 'SELECT $1::document_span value', 'value', documents.rangeType, [
        'empty',
      ]),
    ).toMatchObject({ empty: true, bounds: [] })
    expect(
      await readRangeFixture(pg, 'SELECT NULL::document_span value', 'value', documents.rangeType),
    ).toBeNull()
  } finally {
    await pg.close()
  }
})
