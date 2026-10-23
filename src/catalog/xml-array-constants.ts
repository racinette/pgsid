export function xmlArrayConstantText(
  bytes: Buffer,
  element: number,
  utf8: boolean,
): string | undefined {
  const candidates: string[] = []
  for (const little of [true, false]) {
    const read = (offset: number) =>
      little ? bytes.readInt32LE(offset) : bytes.readInt32BE(offset)
    if (bytes.length < 16) continue
    const header = little ? bytes.readUInt32LE(0) : bytes.readUInt32BE(0)
    if (little ? (header & 3) !== 0 || header / 4 !== bytes.length : header !== bytes.length)
      continue
    const dimensions = read(4),
      offset = read(8),
      actual = little ? bytes.readUInt32LE(12) : bytes.readUInt32BE(12)
    if (
      dimensions < 0 ||
      dimensions > 6 ||
      actual !== element ||
      16 + 8 * dimensions > bytes.length
    )
      continue
    const shape: { lower: number; length: number }[] = []
    let count = dimensions ? 1 : 0,
      valid = true
    for (let i = 0; i < dimensions; i++) {
      const length = read(16 + i * 8),
        lower = read(20 + i * 8)
      if (length <= 0 || lower + length > 2147483648 || count * length > 2147483647) {
        valid = false
        break
      }
      count *= length
      shape.push({ lower, length })
    }
    const fixed = 16 + 8 * dimensions,
      bitmap = Math.ceil(count / 8)
    if (
      !valid ||
      offset < 0 ||
      (offset !== 0 && (offset < fixed + bitmap || offset > bytes.length))
    )
      continue
    let position = offset || fixed
    const values: (string | null)[] = []
    for (let i = 0; i < count; i++) {
      if (offset && (bytes[fixed + (i >>> 3)]! & (1 << (i & 7))) === 0) {
        values.push(null)
        continue
      }
      position = Math.ceil(position / 4) * 4
      if (position >= bytes.length) {
        valid = false
        break
      }
      const first = bytes[position]!,
        short = little ? (first & 1) !== 0 : (first & 128) !== 0
      let length = 0,
        head = 0
      if (short) {
        length = little ? first >>> 1 : first & 127
        head = 1
      } else if (position + 4 <= bytes.length) {
        const word = little ? bytes.readUInt32LE(position) : bytes.readUInt32BE(position)
        if (little ? (word & 3) === 0 : word < 1073741824) {
          length = little ? word / 4 : word
          head = 4
        }
      }
      if (!head || length < head || position + length > bytes.length) {
        valid = false
        break
      }
      const body = bytes.subarray(position + head, position + length),
        text = body.toString('utf8')
      if (
        (!utf8 && body.some((b) => b > 127)) ||
        text.includes('\0') ||
        !Buffer.from(text, 'utf8').equals(body)
      ) {
        valid = false
        break
      }
      values.push(text)
      position += length
    }
    if (
      !valid ||
      position > bytes.length ||
      bytes.length - position > 3 ||
      bytes.subarray(position).some((b) => b !== 0)
    )
      continue
    let index = 0
    const format = (depth: number): string => {
      const parts: string[] = []
      for (let i = 0; i < shape[depth]!.length; i++) {
        if (depth + 1 < shape.length) parts.push(format(depth + 1))
        else {
          const value = values[index++]!
          parts.push(
            value === null
              ? 'NULL'
              : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
          )
        }
      }
      return '{' + parts.join(',') + '}'
    }
    const prefix = shape.some((d) => d.lower !== 1)
      ? shape.map((d) => `[${d.lower}:${d.lower + d.length - 1}]`).join('') + '='
      : ''
    candidates.push(dimensions ? prefix + format(0) : '{}')
  }
  return candidates.length && candidates.every((c) => c === candidates[0])
    ? candidates[0]
    : undefined
}
