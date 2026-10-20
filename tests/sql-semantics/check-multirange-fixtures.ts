import type { PGlite } from '@electric-sql/pglite'
import { builtinMultirangeType } from '../../src/postgres/builtins/inventory.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import type { MultirangeInputPayload } from '../../tools/check-rust/multirange-input.js'
import type { RangeType } from '../../src/sql-semantics/expressions.js'
import { readRangeFixture } from './check-range-fixtures.js'

export async function readMultirangeFixture(
  pg: PGlite,
  type: string,
  text: string | null,
): Promise<MultirangeInputPayload | null> {
  const metadata = builtinMultirangeType(type)
  if (!metadata) throw new Error('Missing captured multirange profile: ' + type)
  if (text === null) return null
  const rows = (
    await pg.query<{ span: string }>(
      `SELECT span::text FROM unnest($1::${type}) WITH ORDINALITY AS parts(span,position) ORDER BY position`,
      [text],
    )
  ).rows
  const ranges: MultirangeInputPayload['ranges'] = []
  for (const row of rows) {
    const span = await readRangeFixture(
      pg,
      `SELECT $1::${metadata.identity} span`,
      'span',
      metadata.identity as RangeType,
      [row.span],
    )
    if (!span || span.empty) throw new Error('Native multirange yielded an empty or NULL component')
    ranges.push({ kind: 'Value', value: span })
  }
  return {
    typeName: metadata.multirange,
    rangeType: metadata.identity,
    elementType: metadata.subtype,
    elementKind: arrayElementFamily(metadata.subtype)!,
    ranges,
  }
}
