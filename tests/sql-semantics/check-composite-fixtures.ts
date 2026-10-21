import { readMultirangeQueryFixture } from './check-multirange-fixtures.js'
import { rangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import type { PGlite } from '@electric-sql/pglite'
import {
  compositeProfile,
  compositePhysicalType,
  compositeFieldType,
} from '../../src/sql-semantics/composite-profiles.js'
import {
  arrayElementFamily,
  arrayElementIdentity,
} from '../../src/codegen/shared/check-array-types.js'
import type {
  CompositeInputCell,
  CompositeInputPayload,
} from '../../tools/check-rust/composite-input.js'
import {
  readRangeBoundCell,
  readRangeFixture,
  rangeBoundProjection,
} from './check-range-fixtures.js'
import { arrayElementBaseType } from '../../src/sql-semantics/expressions.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'

const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'

async function readCompositeCellFixture(
  pg: PGlite,
  select: string,
  name: string,
  type: string,
  array = false,
  parameters: unknown[] = [],
): Promise<CompositeInputCell> {
  const profile = compositeProfile(type)
  if (!profile) throw new Error('Missing captured composite profile')
  const read = async (
    identity: string,
    select: string,
    expression: string,
    parameters: unknown[] = [],
  ): Promise<CompositeInputCell> => {
    const definition = compositePhysicalType(profile, identity)
    const logical = compositeFieldType(profile, identity)
    if (!definition || !logical) throw new Error('Unsupported composite fixture field: ' + identity)
    const from = `FROM (${select}) candidate`
    const missing = (
      await pg.query<{ missing: boolean }>(
        `SELECT (${expression}) IS NOT DISTINCT FROM NULL missing ${from}`,
        parameters,
      )
    ).rows[0]!.missing
    if (missing) return { kind: 'Null' }
    if (definition.kind === 'c') {
      const fields: CompositeInputCell[] = []
      for (const field of definition.fields)
        fields.push(
          await read(field.type, select, `(${expression}).${quote(field.name)}`, parameters),
        )
      return { kind: 'Composite', value: { typeName: definition.identity, fields } }
    }
    if (definition.element) {
      const element = compositeFieldType(profile, definition.element, true)
      if (!element) throw new Error('Missing composite fixture array element')
      const dimensions = (
        await pg.query<{ lower: number; length: number }>(
          `SELECT array_lower(value,d) lower,array_length(value,d) length FROM (SELECT ${expression} value ${from}) shaped CROSS JOIN LATERAL generate_series(1,array_ndims(value)) d`,
          parameters,
        )
      ).rows
      const count = (
        await pg.query<{ count: number }>(
          `SELECT cardinality(${expression}) count ${from}`,
          parameters,
        )
      ).rows[0]!.count
      const elements: CompositeInputCell[] = []
      for (let i = 0; i < count; i++)
        elements.push(
          await read(
            definition.element,
            `SELECT cell value FROM (SELECT unnest(${expression}) cell ${from}) cells OFFSET ${i} LIMIT 1`,
            'value',
            parameters,
          ),
        )
      return {
        kind: 'Array',
        value: {
          elementType: arrayElementIdentity(element),
          elementKind: arrayElementFamily(element)!,
          dimensions,
          elements,
          nullBitmap: { kind: 'Value', value: elements.some((cell) => cell.kind === 'Null') },
        },
      }
    }
    if (definition.kind === 'r') {
      const range = rangeTypeProfile(logical)!
      const payload = await readRangeFixture(
        pg,
        `SELECT ${expression} value ${from}`,
        'value',
        range.rangeType,
        parameters,
      )
      if (!payload) throw new Error('Non-NULL range field became NULL')
      return { kind: 'Range', value: payload }
    }
    if (definition.kind === 'm') {
      const payload = await readMultirangeQueryFixture(
        pg,
        logical,
        `SELECT ${expression} value ${from}`,
        'value',
        parameters,
      )
      if (!payload) throw new Error('Non-NULL multirange field became NULL')
      return { kind: 'Multirange', value: payload }
    }
    const value = (
      await pg.query<{ value: string | null }>(
        `SELECT ${rangeBoundProjection(expression, logical)} value ${from}`,
        parameters,
      )
    ).rows[0]!.value
    return readRangeBoundCell(pg, logical, value, identity)
  }
  const identity = array
    ? profile.graph.definitions.find((n) => n.identity === profile.identity)?.array
    : profile.identity
  if (!identity) throw new Error('Missing captured composite array identity')
  return read(identity, select, quote(name), parameters)
}

export async function readCompositeFixture(
  pg: PGlite,
  select: string,
  name: string,
  type: string,
  parameters: unknown[] = [],
): Promise<CompositeInputPayload | null> {
  const result = await readCompositeCellFixture(pg, select, name, type, false, parameters)
  if (result.kind === 'Null') return null
  if (result.kind !== 'Composite') throw new Error('Expected composite fixture root')
  return result.value
}

export async function readCompositeArrayFixture(
  pg: PGlite,
  select: string,
  name: string,
  elementType: string,
): Promise<OwnedArrayInputPayload | null> {
  const base = arrayElementBaseType(elementType)
  if (base.startsWith('array:')) {
    const from = `FROM (${select}) candidate`
    const missing = (
      await pg.query<{ missing: boolean }>(
        `SELECT ${quote(name)} IS NOT DISTINCT FROM NULL missing ${from}`,
      )
    ).rows[0]!.missing
    if (missing) return null
    const dimensions = (
      await pg.query<{ lower: number; length: number }>(
        `SELECT array_lower(value,d) lower,array_length(value,d) length FROM (SELECT ${quote(name)} value ${from}) shaped CROSS JOIN LATERAL generate_series(1,array_ndims(value)) d`,
      )
    ).rows
    const count = (
      await pg.query<{ count: number }>(`SELECT cardinality(${quote(name)}) count ${from}`)
    ).rows[0]!.count
    const elements: CompositeInputCell[] = []
    for (let i = 1; i <= count; i++) {
      const child = await readCompositeArrayFixture(
        pg,
        `SELECT cell value ${from} CROSS JOIN LATERAL unnest(${quote(name)}) WITH ORDINALITY cells(cell,ordinal) WHERE ordinal=${i}`,
        'value',
        base.slice(6),
      )
      elements.push(child === null ? { kind: 'Null' } : { kind: 'Array', value: child })
    }
    return {
      elementType: arrayElementIdentity(elementType),
      elementKind: 41,
      dimensions,
      elements,
      nullBitmap: { kind: 'Value', value: elements.some((c) => c.kind === 'Null') },
    }
  }
  const result = await readCompositeCellFixture(
    pg,
    select,
    name,
    arrayElementBaseType(elementType),
    true,
  )
  if (result.kind === 'Null') return null
  if (result.kind !== 'Array') throw new Error('Expected composite array fixture root')
  return { ...result.value, elementType: arrayElementIdentity(elementType) }
}
