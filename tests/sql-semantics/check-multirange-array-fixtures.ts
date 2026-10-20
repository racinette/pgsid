import type { PGlite } from '@electric-sql/pglite'
import type { MultirangeType } from '../../src/sql-semantics/expressions.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

export function multirangeArrayText(values: readonly (string | null)[], lower = 1): string {
  const body =
    '{' +
    values
      .map((value) =>
        value === null ? 'NULL' : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
      )
      .join(',') +
    '}'
  return values.length && lower !== 1 ? `[${lower}:${lower + values.length - 1}]=` + body : body
}

export async function readMultirangeArrayFixture(
  pg: PGlite,
  type: MultirangeType,
  text: string | null,
): Promise<OwnedArrayInputPayload | null> {
  if (text === null) return null
  const shape = (
    await pg.query<{ lower: number; length: number }>(
      `SELECT array_lower($1::${type}[],d) AS lower,array_length($1::${type}[],d) AS length FROM generate_series(1,array_ndims($1::${type}[])) d`,
      [text],
    )
  ).rows
  const cells = (
    await pg.query<{ value: string | null }>(
      `SELECT value::text FROM unnest($1::${type}[]) WITH ORDINALITY AS input(value,position) ORDER BY position`,
      [text],
    )
  ).rows
  const elements: OwnedArrayInputPayload['elements'] = []
  for (const cell of cells) {
    const span = await readMultirangeFixture(pg, type, cell.value)
    elements.push(span === null ? { kind: 'Null' } : { kind: 'Multirange', value: span })
  }
  return {
    elementType: type,
    elementKind: 43,
    dimensions: shape,
    elements,
    nullBitmap: { kind: 'Value', value: cells.some((c) => c.value === null) },
  }
}

export function multirangeArrayNeedsOutputContext(input: OwnedArrayInputPayload | null): boolean {
  return (
    input?.elements.some(
      (cell) =>
        cell.kind === 'Multirange' &&
        cell.value.ranges.some(
          (span) =>
            span.kind === 'Value' &&
            span.value.bounds.some(
              (bound) =>
                ('value' in bound &&
                  bound.kind === 'Date' &&
                  bound.value !== -2147483648 &&
                  bound.value !== 2147483647) ||
                ('value' in bound &&
                  (bound.kind === 'Timestamp' || bound.kind === 'Timestamptz') &&
                  bound.value !== -9223372036854775808n &&
                  bound.value !== 9223372036854775807n),
            ),
        ),
    ) ?? false
  )
}
