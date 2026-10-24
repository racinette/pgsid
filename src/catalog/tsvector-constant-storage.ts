export interface TsvectorConstantStorage {
  nativeBytes: number
  lexemeCount: number
}

export function tsvectorConstantStorage(bytes: Buffer): TsvectorConstantStorage | undefined {
  const candidates: TsvectorConstantStorage[] = []
  for (const little of [true, false]) {
    let header = 0
    if (bytes.length >= 4) {
      const word = little ? bytes.readUInt32LE(0) : bytes.readUInt32BE(0)
      if (little ? (word & 3) === 0 && word / 4 === bytes.length : word === bytes.length) header = 4
    }
    if (!header && bytes.length <= 127 && bytes.length > 0) {
      const first = bytes[0]!
      if (
        little
          ? (first & 1) !== 0 && first >>> 1 === bytes.length
          : (first & 128) !== 0 && (first & 127) === bytes.length
      )
        header = 1
    }
    if (!header || bytes.length < header + 4) continue
    const count = little ? bytes.readInt32LE(header) : bytes.readInt32BE(header)
    const nativeBytes = bytes.length - header + 4
    if (count < 0 || count > 1048575 || nativeBytes < 8 + count * 4 || nativeBytes > 1073741823)
      continue
    candidates.push({ nativeBytes, lexemeCount: count })
  }
  return candidates.length &&
    candidates.every(
      (c) =>
        c.nativeBytes === candidates[0]!.nativeBytes &&
        c.lexemeCount === candidates[0]!.lexemeCount,
    )
    ? candidates[0]
    : undefined
}
