import type { PGlite } from '@electric-sql/pglite'
import { multirangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import type { MultirangeInputPayload } from '../../tools/check-rust/multirange-input.js'
import { readRangeFixture } from './check-range-fixtures.js'

export async function readMultirangeFixture(
  pg: PGlite,
  type: string,
  text: string | null,
): Promise<MultirangeInputPayload | null> {
  const metadata = multirangeTypeProfile(type)
  if (!metadata) throw new Error('Missing captured multirange profile: ' + type)
  if (text === null) return null
  return readMultirangeQueryFixture(pg, type, `SELECT $1::${metadata.multirange} value`, 'value', [
    text,
  ])
}

export async function readMultirangeQueryFixture(
  pg: PGlite,
  type: string,
  select: string,
  name: string,
  parameters: unknown[] = [],
): Promise<MultirangeInputPayload | null> {
  const metadata = multirangeTypeProfile(type)
  if (!metadata) throw new Error('Missing captured multirange profile: ' + type)
  const column = '"' + name.replaceAll('"', '""') + '"'
  const state = (
    await pg.query<{ missing: boolean; count: number }>(
      `SELECT ${column} IS NULL missing,(SELECT count(*)::int4 FROM unnest(${column})) count FROM (${select}) candidate`,
      parameters,
    )
  ).rows[0]!
  if (state.missing) return null
  const ranges: MultirangeInputPayload['ranges'] = []
  for (let i = 0; i < state.count; i++) {
    const span = await readRangeFixture(
      pg,
      `SELECT member.span FROM (${select}) candidate CROSS JOIN LATERAL unnest(${column}) WITH ORDINALITY AS member(span,position) WHERE position=${i + 1}`,
      'span',
      metadata.rangeType,
      parameters,
    )
    if (!span || span.empty) throw new Error('Native multirange yielded an empty or NULL component')
    ranges.push({ kind: 'Value', value: span })
  }
  return {
    typeName: metadata.multirange,
    rangeType: metadata.identity,
    elementType: metadata.subtype,
    elementKind: arrayElementFamily(metadata.elementType)!,
    ranges,
  }
}
