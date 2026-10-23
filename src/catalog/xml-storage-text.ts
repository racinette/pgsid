import type { XmlStorageFacet } from './xml-container-constants.js'

export function restoreXmlStorageText(text: string, facet: XmlStorageFacet): string | undefined {
  if (facet.kind === 'xml') return facet.text
  let position = 0
  const token = (delimiter: string, close: string): string | null | undefined => {
    if (text[position] === '"') {
      position++
      let value = '',
        closed = false
      while (position < text.length) {
        const char = text[position++]!
        if (char === '\\') {
          if (position === text.length) return undefined
          value += text[position++]!
        } else if (char === '"') {
          if (facet.kind === 'record' && text[position] === '"') {
            value += '"'
            position++
          } else {
            closed = true
            break
          }
        } else value += char
      }
      return closed && (text[position] === delimiter || text[position] === close)
        ? value
        : undefined
    }
    let value = ''
    while (position < text.length && text[position] !== delimiter && text[position] !== close) {
      const char = text[position++]!
      if (char === '\\') {
        if (position === text.length) return undefined
        value += text[position++]!
      } else if (char === '"' || (char === '{' && facet.kind === 'array')) return undefined
      else value += char
    }
    return facet.kind === 'record' ? (value === '' ? null : value) : value === 'NULL' ? null : value
  }
  const quote = (value: string) => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
  if (facet.kind === 'record') {
    if (text[position++] !== '(') return undefined
    const values: (string | null)[] = []
    for (const field of facet.fields) {
      const value = token(',', ')')
      if (value === undefined || (value === null && field !== null)) return undefined
      const restored = field && value !== null ? restoreXmlStorageText(value, field) : value
      if (restored === undefined) return undefined
      values.push(restored)
      if (values.length < facet.fields.length && text[position++] !== ',') return undefined
    }
    if (text[position++] !== ')' || position !== text.length) return undefined
    return '(' + values.map((v) => (v === null ? '' : quote(v))).join(',') + ')'
  }
  if (text.startsWith('[')) {
    const equal = text.indexOf('=')
    if (equal < 0 || !/^(?:\[-?\d+:-?\d+\])+$/u.test(text.slice(0, equal))) return undefined
    position = equal + 1
  }
  let index = 0
  const dimension = (depth: number): string | undefined => {
    if (text[position++] !== '{') return undefined
    const parts: string[] = [],
      length = facet.dimensions[depth]?.length ?? 0
    for (let i = 0; i < length; i++) {
      if (depth + 1 < facet.dimensions.length) {
        const inner = dimension(depth + 1)
        if (inner === undefined) return undefined
        parts.push(inner)
      } else {
        const value = token(facet.delimiter, '}'),
          field = facet.elements[index++]
        if (value === undefined || field === undefined || (value === null && field !== null))
          return undefined
        const restored = field && value !== null ? restoreXmlStorageText(value, field) : value
        if (restored === undefined) return undefined
        parts.push(restored === null ? 'NULL' : quote(restored))
      }
      if (i + 1 < length && text[position++] !== facet.delimiter) return undefined
    }
    if (text[position++] !== '}') return undefined
    return '{' + parts.join(facet.delimiter) + '}'
  }
  const body = dimension(0)
  if (body === undefined || position !== text.length || index !== facet.elements.length)
    return undefined
  const prefix = facet.dimensions.some((d) => d.lower !== 1)
    ? facet.dimensions.map((d) => `[${d.lower}:${d.lower + d.length - 1}]`).join('') + '='
    : ''
  return prefix + body
}
