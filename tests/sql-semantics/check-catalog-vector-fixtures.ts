import { expect } from 'vitest'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
export interface CatalogVectorPayload extends Omit<
  OwnedArrayInputPayload,
  'elements' | 'nullBitmap'
> {
  elements: ({ kind: 'Null' } | { kind: 'Int2'; value: number } | { kind: 'Oid'; value: bigint })[]
  nullBitmap: { kind: 'Value'; value: boolean }
}
export type CatalogVectorInput = { kind: 'Null' } | { kind: 'Value'; value: CatalogVectorPayload }

export const decodeCatalogVector = (hex: string | null, oid: boolean): CatalogVectorInput => {
  if (hex === null) return { kind: 'Null' }
  const data = Buffer.from(hex, 'hex'),
    rank = data.readInt32BE(),
    elements: CatalogVectorPayload['elements'] = []
  const dimensions = Array.from({ length: rank }, (_, i) => ({
    length: data.readInt32BE(12 + 8 * i),
    lower: data.readInt32BE(16 + 8 * i),
  }))
  let offset = 12 + 8 * rank
  while (offset < data.length) {
    const length = data.readInt32BE(offset)
    offset += 4
    if (length === -1) elements.push({ kind: 'Null' })
    else {
      expect(length).toBe(oid ? 4 : 2)
      elements.push(
        oid
          ? { kind: 'Oid', value: BigInt(data.readUInt32BE(offset)) }
          : { kind: 'Int2', value: data.readInt16BE(offset) },
      )
      offset += length
    }
  }
  return {
    kind: 'Value',
    value: {
      elementType: oid ? 'pg_catalog.oid' : 'pg_catalog.int2',
      elementKind: oid ? 33 : 1,
      dimensions,
      elements,
      nullBitmap: { kind: 'Value', value: data.readInt32BE(4) !== 0 },
    },
  }
}
