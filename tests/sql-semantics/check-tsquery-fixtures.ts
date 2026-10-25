import type { PGlite } from '@electric-sql/pglite'
import type { TsqueryInputNode, TsqueryInputPayload } from '../../tools/check-rust/tsquery-input.js'

export function decodeTsqueryWire(wire: string, nativeBytes: number): TsqueryInputPayload {
  const bytes = Buffer.from(wire, 'hex'),
    count = bytes.readUInt32BE(0),
    prefix: TsqueryInputNode[] = []
  let offset = 4
  for (let index = 0; index < count; index++) {
    const type = bytes.readUInt8(offset++)
    if (type === 1) {
      const weight = bytes.readUInt8(offset++),
        isPrefix = bytes.readUInt8(offset++) !== 0,
        end = bytes.indexOf(0, offset)
      if (end < offset || weight > 15) throw Error('Invalid native query operand')
      const text = new TextDecoder('utf8', { fatal: true }).decode(bytes.subarray(offset, end))
      offset = end + 1
      prefix.push({ kind: 0, text, weight, prefix: isPrefix, distance: 0, left: 0, right: 0 })
    } else if (type === 2) {
      const kind = bytes.readUInt8(offset++)
      if (kind < 1 || kind > 4) throw Error('Invalid native query operator')
      const distance = kind === 4 ? bytes.readInt16BE(offset) : 0
      if (kind === 4) offset += 2
      prefix.push({ kind, text: '', weight: 0, prefix: false, distance, left: 0, right: 0 })
    } else throw Error('Invalid native query node type')
  }
  if (offset !== bytes.length) throw Error('Trailing native query bytes')
  const nodes: TsqueryInputNode[] = [],
    roots: number[] = []
  for (const node of prefix.reverse()) {
    const right = node.kind > 1 ? roots.pop() : 0,
      left = node.kind > 0 ? roots.pop() : 0
    if (left === undefined || right === undefined) throw Error('Missing native query operand')
    roots.push(nodes.length)
    nodes.push({ ...node, left, right })
  }
  if (roots.length !== (count ? 1 : 0)) throw Error('Unconnected native query nodes')
  return { nodes, root: roots[0] ?? 0, nativeBytes }
}

export async function readTsqueryFixture(
  pg: PGlite,
  select: string,
  name: string,
  parameters: unknown[] = [],
): Promise<TsqueryInputPayload | null> {
  const column = '"' + name.replaceAll('"', '""') + '"',
    row = (
      await pg.query<{ missing: boolean; wire: string; native: number }>(
        `SELECT ${column} IS NULL missing,encode(tsquerysend(${column}),'hex') wire,pg_column_size(${column}) native FROM (${select}) candidate`,
        parameters,
      )
    ).rows[0]!
  return row.missing ? null : decodeTsqueryWire(row.wire, row.native)
}
