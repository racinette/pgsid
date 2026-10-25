import { scalar, type Tree } from './expression-tree.js'

export function storedEnumConstant(
  node: Tree,
  byteOrder: 'little' | 'big',
  labels: ReadonlyMap<number, string>,
): string | undefined {
  const raw = node.fields['constvalue'],
    data = raw?.[1]
  if (
    scalar(node, 'constisnull') !== 'false' ||
    scalar(node, 'constlen') !== '4' ||
    scalar(node, 'constbyval') !== 'true' ||
    raw?.length !== 2 ||
    raw[0] !== '4' ||
    !Array.isArray(data) ||
    ![4, 8].includes(data.length) ||
    data.some((v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || +v < -128 || +v > 255)
  )
    return undefined
  const bytes = Buffer.from(data.map((v) => Number(v) & 255)),
    oid = byteOrder === 'little' ? bytes.readUInt32LE() : bytes.readUInt32BE(bytes.length - 4)
  return labels.get(oid)
}
