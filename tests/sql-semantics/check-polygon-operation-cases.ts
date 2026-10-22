import type { Input } from '../../tools/check-rust/parity.js'

export const polygonOperationCases = [
  'NULL::polygon',
  "'((0,0))'::polygon",
  "'((5,5))'::polygon",
  "'((0,0),(4,0))'::polygon",
  "'((0,0),(4,0),(4,4),(0,4))'::polygon",
  "'((-1,-1),(7,-1),(7,7),(-1,7))'::polygon",
  "'((1,1),(2,1),(1,2))'::polygon",
  "'((0,0),(6,0),(6,6),(4,6),(4,2),(2,2),(2,6),(0,6))'::polygon",
  "'((1,4),(5,4))'::polygon",
  "'((0,0),(4,0),(4,4),(2,2),(0,4))'::polygon",
  "'((0,0),(4,4),(0,4),(4,0))'::polygon",
  "'((0,4),(4,4),(4,0),(0,0))'::polygon",
  "'((0,0),(0,0),(4,0),(4,4),(0,4))'::polygon",
  "'((4.000000000000001,0))'::polygon",
  "'((-0.0000005,2))'::polygon",
  "polygon('(0,0),(-0,-0)'::box)",
  "'((NaN,1),(0,0),(4,4))'::polygon",
  "'((Infinity,0),(0,Infinity))'::polygon",
  "'((1e308,1e308),(-1e308,-1e308))'::polygon",
  "'((1e308,1e308))'::polygon",
  "'((1e-320,0),(0,1e-320))'::polygon",
] as const

export const knownPolygonOperationInput = (wire: string | null, bounds: string | null): Input => {
  if (wire === null) return { kind: 'Null' }
  const bytes = Buffer.from(wire, 'hex'),
    b = Buffer.from(bounds!, 'hex'),
    points: { x: bigint; y: bigint }[] = []
  for (let at = 4; at < bytes.length; at += 16)
    points.push({ x: bytes.readBigInt64BE(at), y: bytes.readBigInt64BE(at + 8) })
  return {
    kind: 'Value',
    value: {
      points,
      bounds: {
        highX: b.readBigInt64BE(),
        highY: b.readBigInt64BE(8),
        lowX: b.readBigInt64BE(16),
        lowY: b.readBigInt64BE(24),
      },
    },
  }
}
