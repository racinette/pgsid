export type SimilarEscapeResult =
  { kind: 'converted'; pattern: string } | { kind: 'invalid'; sqlstate: '22025' | '2200C' }

export function similarToEscape(pattern: string, escape = '\\'): SimilarEscapeResult {
  if ([...escape].length > 1) return { kind: 'invalid', sqlstate: '22025' }
  const escapeCharacter = escape === '' ? null : escape
  let result = '^(?:'
  let afterEscape = false
  let quotes = 0
  let bracketDepth = 0
  let classPosition = 0

  for (const character of pattern) {
    if (afterEscape) {
      if (character === '"' && bracketDepth === 0) {
        if (quotes === 0) result += '){1,1}?('
        else if (quotes === 1) result += '){1,1}(?:'
        else return { kind: 'invalid', sqlstate: '2200C' }
        quotes++
      } else {
        result += `\\${character}`
        classPosition = 3
      }
      afterEscape = false
      continue
    }
    if (character === escapeCharacter) {
      afterEscape = true
      continue
    }
    if (bracketDepth > 0) {
      if (character === '\\') result += '\\'
      result += character
      if (character === ']' && classPosition > 2) bracketDepth--
      else if (character === '[') {
        bracketDepth++
        classPosition = 3
      } else if (character === '^') classPosition++
      else classPosition = 3
      continue
    }
    if (character === '[') {
      result += character
      bracketDepth = 1
      classPosition = 1
    } else if (character === '%') result += '.*'
    else if (character === '_') result += '.'
    else if (character === '(') result += '(?:'
    else if (character === '\\' || character === '.' || character === '^' || character === '$')
      result += `\\${character}`
    else result += character
  }

  return { kind: 'converted', pattern: `${result})$` }
}
