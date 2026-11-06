// The public TypeScript shape of an int8range value. An absent bound is unbounded.
export const typescriptInt8RangeType =
  "'empty' | { readonly lower: bigint | null; readonly upper: bigint | null; readonly lowerInclusive: boolean; readonly upperInclusive: boolean }"

export const isTypescriptInt8Range = (type: string | undefined): boolean =>
  type !== undefined && /^(?:pg_catalog\.)?"?int8range"?$/u.test(type)

// Parameters travel as range text, which the server parses and canonicalizes itself; rows come
// back in the server's canonical output form.
export const typescriptInt8RangeCodecSource = `function encodeInt8Range(value: unknown, name: string): string | null | undefined {
  if (value === null || value === undefined) return value
  if (value === 'empty') return 'empty'
  if (!value || typeof value !== 'object' || !('lower' in value) || !('upper' in value) || !('lowerInclusive' in value) || !('upperInclusive' in value) || (value.lower !== null && typeof value.lower !== 'bigint') || (value.upper !== null && typeof value.upper !== 'bigint') || typeof value.lowerInclusive !== 'boolean' || typeof value.upperInclusive !== 'boolean')
    throw new TypeError('Parameter ' + name + ' holds a malformed int8range value')
  return (value.lowerInclusive ? '[' : '(') + (value.lower ?? '') + ',' + (value.upper ?? '') + (value.upperInclusive ? ']' : ')')
}
function decodeInt8Range(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value === 'empty') return 'empty'
  const match = /^([[(])(-?[0-9]*),(-?[0-9]*)([\\])])$/u.exec(value)
  if (!match) throw new TypeError('Unexpected int8range output ' + JSON.stringify(value))
  return { lower: match[2] ? BigInt(match[2]) : null, upper: match[3] ? BigInt(match[3]) : null, lowerInclusive: match[1] === '[', upperInclusive: match[4] === ']' }
}`
