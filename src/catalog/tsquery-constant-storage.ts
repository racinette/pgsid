export interface TsqueryConstantNode {
  kind: number
  text: string
  weight: number
  prefix: boolean
  distance: number
  left: number
  right: number
}

export interface TsqueryConstantStorage {
  nodes: TsqueryConstantNode[]
  root: number
  nativeBytes: number
}

export function validTsqueryConstantStorage(value: TsqueryConstantStorage): boolean {
  if (
    !value ||
    !Array.isArray(value.nodes) ||
    !Number.isInteger(value.nativeBytes) ||
    value.nativeBytes < 8 + value.nodes.length * 12 ||
    value.nativeBytes > 1073741823 ||
    value.root !== (value.nodes.length ? value.nodes.length - 1 : 0)
  )
    return false
  const stack: number[] = []
  for (const [index, node] of value.nodes.entries()) {
    if (
      !node ||
      ![node.kind, node.weight, node.distance, node.left, node.right].every(Number.isInteger) ||
      node.kind < 0 ||
      node.kind > 4 ||
      typeof node.prefix !== 'boolean' ||
      typeof node.text !== 'string'
    )
      return false
    if (node.kind === 0) {
      if (
        node.weight < 0 ||
        node.weight > 15 ||
        node.distance !== 0 ||
        node.left !== 0 ||
        node.right !== 0 ||
        node.text.includes('\0') ||
        Buffer.byteLength(node.text) > 2047 ||
        Buffer.from(node.text).toString('utf8') !== node.text
      )
        return false
    } else {
      if (
        node.text !== '' ||
        node.weight !== 0 ||
        node.prefix ||
        (node.kind === 4 ? node.distance < -32768 || node.distance > 32767 : node.distance !== 0)
      )
        return false
      if (node.kind === 1) {
        if (node.left !== stack.pop() || node.right !== 0) return false
      } else {
        const right = stack.pop(),
          left = stack.pop()
        if (node.left !== left || node.right !== right) return false
      }
    }
    stack.push(index)
  }
  return stack.length === (value.nodes.length ? 1 : 0)
}

export function tsqueryConstantStorage(
  bytes: Buffer,
  utf8: boolean,
): TsqueryConstantStorage | undefined {
  const candidates: TsqueryConstantStorage[] = []
  if (bytes.length < 8 || bytes.length > 1073741823) return undefined
  for (const little of [true, false]) {
    const word = (offset: number) =>
      little ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset)
    const header = word(0)
    if (little ? (header & 3) !== 0 || header / 4 !== bytes.length : header !== bytes.length)
      continue
    const count = word(4),
      pool = 8 + count * 12
    if (pool > bytes.length) continue
    const nodes: TsqueryConstantNode[] = [],
      roots: { native: number; portable: number }[] = []
    let valid = true
    for (let index = count - 1; index >= 0; index--) {
      const at = 8 + index * 12,
        tag = bytes[at]!
      if (tag === 1) {
        const bits = word(at + 8),
          length = little ? bits & 4095 : bits >>> 20,
          distance = little ? bits >>> 12 : bits & 1048575,
          start = pool + distance,
          end = start + length
        if (
          length > 2047 ||
          end >= bytes.length ||
          bytes[end] !== 0 ||
          bytes[at + 1]! > 15 ||
          bytes[at + 2]! > 1
        ) {
          valid = false
          break
        }
        const raw = bytes.subarray(start, end)
        if (raw.includes(0) || (!utf8 && raw.some((byte) => byte > 127))) {
          valid = false
          break
        }
        const text = raw.toString('utf8')
        if (!Buffer.from(text, 'utf8').equals(raw)) {
          valid = false
          break
        }
        roots.push({ native: index, portable: nodes.length })
        nodes.push({
          kind: 0,
          text,
          weight: bytes[at + 1]!,
          prefix: bytes[at + 2] !== 0,
          distance: 0,
          left: 0,
          right: 0,
        })
      } else if (tag === 2) {
        const kind = bytes[at + 1]!,
          right = kind > 1 ? roots.pop() : undefined,
          left = roots.pop()
        if (
          kind < 1 ||
          kind > 4 ||
          !left ||
          (kind === 1
            ? word(at + 4) !== 1 || left.native !== index + 1
            : !right || right.native !== index + 1 || left.native !== index + word(at + 4))
        ) {
          valid = false
          break
        }
        roots.push({ native: index, portable: nodes.length })
        nodes.push({
          kind,
          text: '',
          weight: 0,
          prefix: false,
          distance:
            kind === 4 ? (little ? bytes.readInt16LE(at + 2) : bytes.readInt16BE(at + 2)) : 0,
          left: left.portable,
          right: right?.portable ?? 0,
        })
      } else {
        valid = false
        break
      }
    }
    const value = { nodes, root: nodes.length ? nodes.length - 1 : 0, nativeBytes: bytes.length }
    if (valid && roots.length === (count ? 1 : 0) && validTsqueryConstantStorage(value))
      candidates.push(value)
  }
  return candidates.length &&
    candidates.every((value) => JSON.stringify(value) === JSON.stringify(candidates[0]))
    ? candidates[0]
    : undefined
}

export function tsqueryConstantTypes(
  types: ReadonlyMap<number, { identity: string; kind: string; base: number }>,
): Set<number> {
  const scalar = (oid: number, seen = new Set<number>()): boolean => {
    if (seen.has(oid)) return false
    seen.add(oid)
    const type = types.get(oid)
    return (
      type?.identity === 'pg_catalog.tsquery' || (type?.kind === 'd' && scalar(type.base, seen))
    )
  }
  return new Set([...types.keys()].filter((oid) => scalar(oid)))
}
