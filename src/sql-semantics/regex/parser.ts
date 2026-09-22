import type {
  PostgresRegex,
  PostgresRegexCharacterRange,
  PostgresRegexErrorCode,
  PostgresRegexExpression,
  PostgresRegexNewlineMode,
  PostgresRegexOptions,
  PostgresRegexParseResult,
  PostgresRegexSyntax,
} from './ast.js'

const MAX_REPETITION = 255
const MAX_UNICODE = 0x10ffff
const EXPANDED_SPACE = /[\t\n\v\f\r ]/u
const ASCII_ALPHA = /[A-Za-z]/u
const ASCII_ALNUM = /[A-Za-z0-9]/u
const HEX = /[0-9A-Fa-f]/u
const OCTAL = /[0-7]/u
const DECIMAL = /[0-9]/u

class RegexParseFailure extends Error {
  constructor(
    readonly error: PostgresRegexErrorCode,
    readonly position: number,
  ) {
    super(error)
  }
}

interface ParserFlags {
  syntax: PostgresRegexSyntax
  caseSensitive: boolean
  expanded: boolean
  newline: PostgresRegexNewlineMode
}

interface ParsedAtom {
  expression: PostgresRegexExpression
  quantifiable: boolean
}

interface ParsedClassItem {
  ranges: readonly PostgresRegexCharacterRange[]
  rangeEndpoint: boolean
}

type Assertion = Extract<PostgresRegexExpression, { kind: 'assertion' }>['assertion']

const empty = (): PostgresRegexExpression => ({ kind: 'empty' })
const impossible = (): PostgresRegexExpression => ({ kind: 'impossible' })

const literal = (value: string): PostgresRegexExpression =>
  value.length === 0 ? empty() : { kind: 'literal', value }

const concatenate = (expressions: readonly PostgresRegexExpression[]): PostgresRegexExpression => {
  if (expressions.some((expression) => expression.kind === 'impossible')) return impossible()
  const flattened = expressions.flatMap((expression) =>
    expression.kind === 'empty'
      ? []
      : expression.kind === 'concatenation'
        ? expression.expressions
        : [expression],
  )
  const merged: PostgresRegexExpression[] = []
  for (const expression of flattened) {
    const previous = merged.at(-1)
    if (previous?.kind === 'literal' && expression.kind === 'literal')
      merged[merged.length - 1] = literal(previous.value + expression.value)
    else merged.push(expression)
  }
  return merged.length === 0
    ? empty()
    : merged.length === 1
      ? merged[0]!
      : { kind: 'concatenation', expressions: merged }
}

const alternate = (branches: readonly PostgresRegexExpression[]): PostgresRegexExpression => {
  const flattened = branches.flatMap((branch) =>
    branch.kind === 'alternation' ? branch.branches : [branch],
  )
  return flattened.length === 1 ? flattened[0]! : { kind: 'alternation', branches: flattened }
}

const normalizeRanges = (
  ranges: readonly PostgresRegexCharacterRange[],
): PostgresRegexCharacterRange[] => {
  const sorted = [...ranges].sort((left, right) => left.from - right.from || left.to - right.to)
  const output: PostgresRegexCharacterRange[] = []
  for (const range of sorted) {
    const previous = output.at(-1)
    if (previous && range.from <= previous.to + 1) previous.to = Math.max(previous.to, range.to)
    else output.push({ ...range })
  }
  return output
}

const complementRanges = (
  ranges: readonly PostgresRegexCharacterRange[],
): PostgresRegexCharacterRange[] => {
  const output: PostgresRegexCharacterRange[] = []
  let next = 0
  for (const range of normalizeRanges(ranges)) {
    if (next < range.from) output.push({ from: next, to: range.from - 1 })
    next = Math.max(next, range.to + 1)
  }
  if (next <= MAX_UNICODE) output.push({ from: next, to: MAX_UNICODE })
  return output
}

const POSIX_CLASSES: Readonly<Record<string, readonly PostgresRegexCharacterRange[]>> = {
  alnum: [
    { from: 48, to: 57 },
    { from: 65, to: 90 },
    { from: 97, to: 122 },
  ],
  alpha: [
    { from: 65, to: 90 },
    { from: 97, to: 122 },
  ],
  ascii: [{ from: 0, to: 127 }],
  blank: [
    { from: 9, to: 9 },
    { from: 32, to: 32 },
  ],
  cntrl: [
    { from: 0, to: 31 },
    { from: 127, to: 127 },
  ],
  digit: [{ from: 48, to: 57 }],
  graph: [{ from: 33, to: 126 }],
  lower: [{ from: 97, to: 122 }],
  print: [{ from: 32, to: 126 }],
  punct: [
    { from: 33, to: 47 },
    { from: 58, to: 64 },
    { from: 91, to: 96 },
    { from: 123, to: 126 },
  ],
  space: [
    { from: 9, to: 13 },
    { from: 32, to: 32 },
  ],
  upper: [{ from: 65, to: 90 }],
  xdigit: [
    { from: 48, to: 57 },
    { from: 65, to: 70 },
    { from: 97, to: 102 },
  ],
  word: [
    { from: 48, to: 57 },
    { from: 65, to: 90 },
    { from: 95, to: 95 },
    { from: 97, to: 122 },
  ],
}

const CONTROL_NAMES = [
  'NUL',
  'SOH',
  'STX',
  'ETX',
  'EOT',
  'ENQ',
  'ACK',
  'BEL',
  'BS',
  'HT',
  'LF',
  'VT',
  'FF',
  'CR',
  'SO',
  'SI',
  'DLE',
  'DC1',
  'DC2',
  'DC3',
  'DC4',
  'NAK',
  'SYN',
  'ETB',
  'CAN',
  'EM',
  'SUB',
  'ESC',
  'FS',
  'GS',
  'RS',
  'US',
] as const

const COLLATING_NAMES: Readonly<Record<string, number>> = {
  ...Object.fromEntries(CONTROL_NAMES.map((name, code) => [name, code])),
  alert: 7,
  backspace: 8,
  tab: 9,
  newline: 10,
  'vertical-tab': 11,
  'form-feed': 12,
  'carriage-return': 13,
  IS4: 28,
  IS3: 29,
  IS2: 30,
  IS1: 31,
  space: 32,
  'exclamation-mark': 33,
  'quotation-mark': 34,
  'number-sign': 35,
  'dollar-sign': 36,
  'percent-sign': 37,
  ampersand: 38,
  apostrophe: 39,
  'left-parenthesis': 40,
  'right-parenthesis': 41,
  asterisk: 42,
  'plus-sign': 43,
  comma: 44,
  hyphen: 45,
  'hyphen-minus': 45,
  period: 46,
  'full-stop': 46,
  slash: 47,
  solidus: 47,
  zero: 48,
  one: 49,
  two: 50,
  three: 51,
  four: 52,
  five: 53,
  six: 54,
  seven: 55,
  eight: 56,
  nine: 57,
  colon: 58,
  semicolon: 59,
  'less-than-sign': 60,
  'equals-sign': 61,
  'greater-than-sign': 62,
  'question-mark': 63,
  'commercial-at': 64,
  'left-square-bracket': 91,
  backslash: 92,
  'reverse-solidus': 92,
  'right-square-bracket': 93,
  circumflex: 94,
  'circumflex-accent': 94,
  underscore: 95,
  'low-line': 95,
  'grave-accent': 96,
  'left-brace': 123,
  'left-curly-bracket': 123,
  'vertical-line': 124,
  'right-brace': 125,
  'right-curly-bracket': 125,
  tilde: 126,
  DEL: 127,
}

class PostgresRegexParser {
  private position = 0
  private captures = 0
  private readonly closedCaptures = new Set<number>()
  private lookaroundDepth = 0

  constructor(
    private readonly pattern: string,
    private readonly flags: ParserFlags,
  ) {}

  parse(): PostgresRegex {
    this.parsePrefixes()
    let expression: PostgresRegexExpression
    if (this.flags.syntax === 'literal') {
      expression = literal(this.pattern.slice(this.position))
      this.position = this.pattern.length
    } else if (this.flags.syntax === 'basic') {
      expression = this.parseBasic(false)
    } else {
      expression = this.parseAlternation(undefined)
    }
    this.skipExpanded()
    if (!this.atEnd()) this.fail('unbalanced-parentheses')
    return {
      kind: 'regex',
      syntax: this.flags.syntax,
      caseSensitive: this.flags.caseSensitive,
      newline: this.flags.newline,
      expression,
      captures: this.captures,
    }
  }

  private parsePrefixes(): void {
    if (this.pattern.startsWith('***', this.position)) {
      const director = this.pattern[this.position + 3]
      if (director === '=') {
        this.flags.syntax = 'literal'
        this.flags.expanded = false
        this.flags.newline = 'ordinary'
        this.position += 4
        return
      }
      if (director !== ':') this.fail('invalid-quantifier-operand')
      this.flags.syntax = 'advanced'
      this.position += 4
    }
    if (this.flags.syntax !== 'advanced') return
    if (this.peek() !== '(' || this.peek(1) !== '?' || !ASCII_ALPHA.test(this.peek(2))) return
    this.position += 2
    while (!this.atEnd() && ASCII_ALPHA.test(this.peek())) {
      const option = this.take()
      switch (option) {
        case 'b':
          this.flags.syntax = 'basic'
          break
        case 'c':
          this.flags.caseSensitive = true
          break
        case 'e':
          this.flags.syntax = 'extended'
          break
        case 'i':
          this.flags.caseSensitive = false
          break
        case 'm':
        case 'n':
          this.flags.newline = 'sensitive'
          break
        case 'p':
          this.flags.newline = 'stop'
          break
        case 'q':
          this.flags.syntax = 'literal'
          break
        case 's':
          this.flags.newline = 'ordinary'
          break
        case 't':
          this.flags.expanded = false
          break
        case 'w':
          this.flags.newline = 'anchors'
          break
        case 'x':
          this.flags.expanded = true
          break
        default:
          this.fail('invalid-option')
      }
    }
    if (this.take() !== ')') this.fail('invalid-option')
    if (this.flags.syntax === 'literal') {
      this.flags.expanded = false
      this.flags.newline = 'ordinary'
    }
  }

  private parseAlternation(stopper: ')' | undefined): PostgresRegexExpression {
    const branches: PostgresRegexExpression[] = []
    for (;;) {
      branches.push(this.parseSequence(stopper))
      this.skipExpanded()
      if (this.peek() !== '|') break
      this.position++
    }
    if (stopper && this.peek() !== stopper) this.fail('unbalanced-parentheses')
    return alternate(branches)
  }

  private parseSequence(stopper: ')' | undefined): PostgresRegexExpression {
    const expressions: PostgresRegexExpression[] = []
    for (;;) {
      this.skipExpanded()
      if (this.atEnd() || this.peek() === '|' || (stopper && this.peek() === stopper)) break
      if (this.flags.syntax === 'advanced' && this.pattern.startsWith('(?#', this.position)) {
        const end = this.pattern.indexOf(')', this.position + 3)
        this.position = end < 0 ? this.pattern.length : end + 1
        continue
      }
      const atom = this.parseExtendedAtom(stopper)
      expressions.push(
        atom.quantifiable ? this.parseExtendedQuantifier(atom.expression) : atom.expression,
      )
    }
    return concatenate(expressions)
  }

  private parseExtendedAtom(stopper: ')' | undefined): ParsedAtom {
    const start = this.position
    if (this.pattern.startsWith('[[:<:]]', start)) {
      this.position += 7
      return { expression: this.assertion('beginning-of-word'), quantifiable: false }
    }
    if (this.pattern.startsWith('[[:>:]]', start)) {
      this.position += 7
      return { expression: this.assertion('end-of-word'), quantifiable: false }
    }
    const character = this.takeCodePoint()
    if (character === undefined) this.fail('invalid-pattern')
    switch (character) {
      case '^':
        return { expression: this.lineAssertion(true), quantifiable: false }
      case '$':
        return { expression: this.lineAssertion(false), quantifiable: false }
      case '.':
        return {
          expression: {
            kind: 'any-character',
            includesNewline: this.flags.newline === 'ordinary' || this.flags.newline === 'anchors',
          },
          quantifiable: true,
        }
      case '[':
        this.position = start
        return {
          expression: this.parseCharacterClass(this.flags.syntax === 'advanced'),
          quantifiable: true,
        }
      case '\\':
        return this.parseAdvancedEscape()
      case '(':
        return this.parseGroup()
      case ')':
        if (stopper) this.fail('invalid-pattern')
        if (this.flags.syntax === 'extended')
          return { expression: literal(')'), quantifiable: true }
        this.fail('unbalanced-parentheses')
      case '*':
      case '+':
      case '?':
        this.fail('invalid-quantifier-operand')
      case '{':
        this.skipExpanded()
        if (DECIMAL.test(this.peek())) this.fail('invalid-quantifier-operand')
        return { expression: literal('{'), quantifiable: true }
      default:
        return { expression: literal(character), quantifiable: true }
    }
  }

  private parseGroup(): ParsedAtom {
    let capturing = true
    let lookaround: { direction: 'ahead' | 'behind'; positive: boolean } | undefined
    if (this.flags.syntax === 'advanced' && this.peek() === '?') {
      this.position++
      const extension = this.take()
      if (extension === ':') capturing = false
      else if (extension === '=') lookaround = { direction: 'ahead', positive: true }
      else if (extension === '!') lookaround = { direction: 'ahead', positive: false }
      else if (extension === '<') {
        const kind = this.take()
        if (kind === '=') lookaround = { direction: 'behind', positive: true }
        else if (kind === '!') lookaround = { direction: 'behind', positive: false }
        else this.fail('invalid-quantifier-operand')
      } else this.fail('invalid-quantifier-operand')
    }
    if (lookaround) {
      this.lookaroundDepth++
      const expression = this.parseAlternation(')')
      this.lookaroundDepth--
      this.position++
      return { expression: { kind: 'lookaround', ...lookaround, expression }, quantifiable: false }
    }
    const capture = capturing && this.lookaroundDepth === 0 ? ++this.captures : undefined
    const expression = this.parseAlternation(')')
    this.position++
    if (capture !== undefined) this.closedCaptures.add(capture)
    return {
      expression: { kind: 'group', capturing: capture !== undefined, capture, expression },
      quantifiable: true,
    }
  }

  private parseAdvancedEscape(): ParsedAtom {
    if (this.atEnd()) this.fail('invalid-escape')
    const character = this.take()
    if (this.flags.syntax === 'extended' || !ASCII_ALNUM.test(character))
      return { expression: literal(character), quantifiable: true }
    const className =
      character === 'd' || character === 'D'
        ? 'digit'
        : character === 's' || character === 'S'
          ? 'space'
          : character === 'w' || character === 'W'
            ? 'word'
            : undefined
    if (className) {
      return {
        expression: this.characterClass(POSIX_CLASSES[className]!, /[DSW]/u.test(character), false),
        quantifiable: true,
      }
    }
    const assertions: Readonly<Record<string, Assertion>> = {
      A: 'beginning-of-string',
      m: 'beginning-of-word',
      M: 'end-of-word',
      y: 'word-boundary',
      Y: 'non-word-boundary',
      Z: 'end-of-string',
    }
    if (character in assertions)
      return { expression: this.assertion(assertions[character]!), quantifiable: false }
    if (DECIMAL.test(character)) return this.parseNumericEscape(character)
    const codePoint = this.parseCharacterEscape(character)
    if (codePoint === undefined) this.fail('invalid-escape')
    return { expression: this.codePointExpression(codePoint), quantifiable: true }
  }

  private parseNumericEscape(first: string): ParsedAtom {
    const start = this.position - 1
    if (first !== '0') {
      let end = this.position
      while (end < this.pattern.length && DECIMAL.test(this.pattern[end]!) && end - start < 255)
        end++
      const digits = this.pattern.slice(start, end)
      const capture = Number(digits)
      if (digits.length === 1 || (capture > 0 && capture <= this.captures)) {
        this.position = end
        if (this.lookaroundDepth > 0 || !this.closedCaptures.has(capture))
          this.fail('invalid-backreference', start)
        return { expression: { kind: 'backreference', capture }, quantifiable: true }
      }
    }
    this.position = start
    const digits = this.takeDigits(OCTAL, 1, 3)
    if (digits.length === 0) this.fail('invalid-escape', start)
    let codePoint = Number.parseInt(digits, 8)
    if (codePoint > 255) {
      this.position--
      codePoint >>= 3
    }
    return { expression: this.codePointExpression(codePoint), quantifiable: true }
  }

  private parseCharacterEscape(character: string): number | undefined {
    const simple: Readonly<Record<string, number>> = {
      a: 7,
      b: 8,
      B: 92,
      e: 27,
      f: 12,
      n: 10,
      r: 13,
      t: 9,
      v: 11,
    }
    if (character in simple) return simple[character]
    if (character === 'c') {
      if (this.atEnd()) this.fail('invalid-escape')
      return this.takeCodePoint()!.codePointAt(0)! & 31
    }
    if (character === 'u' || character === 'U') {
      const width = character === 'u' ? 4 : 8
      const digits = this.takeDigits(HEX, width, width)
      if (digits.length !== width) this.fail('invalid-escape')
      const value = Number.parseInt(digits, 16)
      if (value > 0x7ffffffe) this.fail('invalid-escape')
      return value
    }
    if (character === 'x') {
      const digits = this.takeDigits(HEX, 1, 255)
      if (digits.length === 0) this.fail('invalid-escape')
      const value = Number.parseInt(digits, 16)
      if (!Number.isFinite(value) || value > 0x7ffffffe) this.fail('invalid-escape')
      return value
    }
    return undefined
  }

  private parseExtendedQuantifier(expression: PostgresRegexExpression): PostgresRegexExpression {
    this.skipExpanded()
    const start = this.position
    const character = this.peek()
    let minimum: number
    let maximum: number | null
    let preference: 'greedy' | 'nongreedy' | 'inherited' = 'greedy'
    if (character === '*' || character === '+' || character === '?') {
      this.position++
      ;[minimum, maximum] = character === '*' ? [0, null] : character === '+' ? [1, null] : [0, 1]
      if (this.flags.syntax === 'advanced' && this.peek() === '?') {
        this.position++
        preference = 'nongreedy'
      }
    } else if (character === '{') {
      const afterBrace = this.position + 1
      this.position++
      this.skipExpanded()
      if (!DECIMAL.test(this.peek())) {
        this.position = start
        return expression
      }
      minimum = this.takeBoundNumber()
      this.skipExpanded()
      if (this.peek() === ',') {
        this.position++
        this.skipExpanded()
        maximum = DECIMAL.test(this.peek()) ? this.takeBoundNumber() : null
        if (maximum !== null && minimum > maximum) this.fail('invalid-repetition-count', start)
      } else {
        maximum = minimum
        preference = 'inherited'
      }
      this.skipExpanded()
      if (this.take() !== '}') this.fail('invalid-repetition-count', afterBrace)
      if (this.flags.syntax === 'advanced' && this.peek() === '?') {
        this.position++
        if (preference !== 'inherited') preference = 'nongreedy'
      }
    } else return expression
    return { kind: 'repeat', expression, minimum, maximum, preference }
  }

  private parseBasic(stopper: boolean): PostgresRegexExpression {
    const expressions: PostgresRegexExpression[] = []
    let atStart = true
    for (;;) {
      this.skipExpanded()
      if (this.atEnd()) {
        if (stopper) this.fail('unbalanced-parentheses')
        break
      }
      if (stopper && this.pattern.startsWith('\\)', this.position)) break
      const start = this.position
      let atom: ParsedAtom
      if (this.pattern.startsWith('[[:<:]]', start)) {
        this.position += 7
        atom = { expression: this.assertion('beginning-of-word'), quantifiable: false }
      } else if (this.pattern.startsWith('[[:>:]]', start)) {
        this.position += 7
        atom = { expression: this.assertion('end-of-word'), quantifiable: false }
      } else {
        const character = this.takeCodePoint()!
        if (character === '^' && atStart)
          atom = { expression: this.lineAssertion(true), quantifiable: false }
        else if (character === '$' && this.basicAtEnd(stopper))
          atom = { expression: this.lineAssertion(false), quantifiable: false }
        else if (character === '.')
          atom = {
            expression: {
              kind: 'any-character',
              includesNewline:
                this.flags.newline === 'ordinary' || this.flags.newline === 'anchors',
            },
            quantifiable: true,
          }
        else if (character === '[') {
          this.position = start
          atom = { expression: this.parseCharacterClass(false), quantifiable: true }
        } else if (character === '*') {
          if (!atStart) this.fail('invalid-quantifier-operand', start)
          atom = { expression: literal('*'), quantifiable: true }
        } else if (character === '\\') atom = this.parseBasicEscape(stopper)
        else atom = { expression: literal(character), quantifiable: true }
      }
      expressions.push(
        atom.quantifiable ? this.parseBasicQuantifier(atom.expression) : atom.expression,
      )
      if (
        atom.expression.kind !== 'assertion' ||
        (atom.expression.assertion !== 'beginning-of-string' &&
          atom.expression.assertion !== 'beginning-of-line')
      )
        atStart = false
    }
    return concatenate(expressions)
  }

  private parseBasicEscape(stopper: boolean): ParsedAtom {
    if (this.atEnd()) this.fail('invalid-escape')
    const character = this.take()
    if (character === '(') {
      const capture = ++this.captures
      const expression = this.parseBasic(true)
      if (!this.pattern.startsWith('\\)', this.position)) this.fail('unbalanced-parentheses')
      this.position += 2
      this.closedCaptures.add(capture)
      return {
        expression: { kind: 'group', capturing: true, capture, expression },
        quantifiable: true,
      }
    }
    if (character === ')') {
      if (stopper) this.fail('invalid-pattern')
      this.fail('unbalanced-parentheses')
    }
    if (character === '<' || character === '>')
      return {
        expression: this.assertion(character === '<' ? 'beginning-of-word' : 'end-of-word'),
        quantifiable: false,
      }
    if (/[1-9]/u.test(character)) {
      const capture = Number(character)
      if (this.lookaroundDepth > 0 || !this.closedCaptures.has(capture))
        this.fail('invalid-backreference')
      return { expression: { kind: 'backreference', capture }, quantifiable: true }
    }
    if (character === '{') this.fail('invalid-quantifier-operand')
    return { expression: literal(character), quantifiable: true }
  }

  private parseBasicQuantifier(expression: PostgresRegexExpression): PostgresRegexExpression {
    this.skipExpanded()
    if (this.peek() === '*') {
      this.position++
      return { kind: 'repeat', expression, minimum: 0, maximum: null, preference: 'greedy' }
    }
    if (!this.pattern.startsWith('\\{', this.position)) return expression
    const start = this.position
    this.position += 2
    this.skipExpanded()
    if (!DECIMAL.test(this.peek())) this.fail('invalid-repetition-count', start)
    const minimum = this.takeBoundNumber()
    this.skipExpanded()
    let maximum: number | null
    if (this.peek() === ',') {
      this.position++
      this.skipExpanded()
      maximum = DECIMAL.test(this.peek()) ? this.takeBoundNumber() : null
      if (maximum !== null && minimum > maximum) this.fail('invalid-repetition-count', start)
    } else maximum = minimum
    this.skipExpanded()
    if (!this.pattern.startsWith('\\}', this.position)) this.fail('invalid-repetition-count', start)
    this.position += 2
    return {
      kind: 'repeat',
      expression,
      minimum,
      maximum,
      preference: minimum === maximum ? 'inherited' : 'greedy',
    }
  }

  private parseCharacterClass(advancedEscapes: boolean): PostgresRegexExpression {
    const start = this.position
    this.position++
    const negated = this.peek() === '^'
    if (negated) this.position++
    const ranges: PostgresRegexCharacterRange[] = []
    let first = true
    let closed = false
    while (!this.atEnd()) {
      if (this.peek() === ']' && !first) {
        this.position++
        closed = true
        break
      }
      if (this.peek() === '-' && !first && this.peek(1) !== ']')
        this.fail('invalid-character-range')
      const item = this.parseClassItem(advancedEscapes, first)
      first = false
      if (
        item.rangeEndpoint &&
        item.ranges.length === 1 &&
        item.ranges[0]!.from === item.ranges[0]!.to &&
        this.peek() === '-' &&
        this.peek(1) !== ']'
      ) {
        this.position++
        const endpoint = this.parseClassItem(advancedEscapes, false, true)
        if (
          !endpoint.rangeEndpoint ||
          endpoint.ranges.length !== 1 ||
          endpoint.ranges[0]!.from !== endpoint.ranges[0]!.to
        )
          this.fail('invalid-character-range')
        if (item.ranges[0]!.from > endpoint.ranges[0]!.from) this.fail('invalid-character-range')
        ranges.push({ from: item.ranges[0]!.from, to: endpoint.ranges[0]!.from })
      } else ranges.push(...item.ranges)
    }
    if (!closed) this.fail('unbalanced-brackets', start)
    return this.characterClass(
      ranges,
      negated,
      negated && (this.flags.newline === 'sensitive' || this.flags.newline === 'stop'),
    )
  }

  private parseClassItem(
    advancedEscapes: boolean,
    first: boolean,
    rangeEndpoint = false,
  ): ParsedClassItem {
    if (this.atEnd()) this.fail('unbalanced-brackets')
    if (this.peek() === ']' && first) {
      this.position++
      return { ranges: [{ from: 93, to: 93 }], rangeEndpoint: true }
    }
    if (this.peek() === '-' && (first || rangeEndpoint || this.peek(1) === ']')) {
      this.position++
      return { ranges: [{ from: 45, to: 45 }], rangeEndpoint: true }
    }
    if (this.peek() === '[' && /[.=:]/u.test(this.peek(1))) {
      const kind = this.peek(1)
      const closing = `${kind}]`
      const contentStart = this.position + 2
      const contentEnd = this.pattern.indexOf(closing, contentStart)
      if (contentEnd < 0) this.fail('unbalanced-brackets')
      const name = this.pattern.slice(contentStart, contentEnd)
      this.position = contentEnd + 2
      if (kind === ':') {
        const ranges = POSIX_CLASSES[name]
        if (!ranges) this.fail('invalid-character-class', contentStart)
        return { ranges, rangeEndpoint: false }
      }
      if (name.length === 0) this.fail('invalid-collating-element', contentStart)
      const codePoint = this.collatingElement(name)
      if (codePoint === undefined) this.fail('invalid-collating-element', contentStart)
      return {
        ranges: [{ from: codePoint, to: codePoint }],
        rangeEndpoint: kind === '.',
      }
    }
    if (this.peek() === '\\' && advancedEscapes) {
      const escapeStart = this.position
      this.position++
      if (this.atEnd()) this.fail('invalid-escape', escapeStart)
      const character = this.take()
      const className =
        character === 'd' || character === 'D'
          ? 'digit'
          : character === 's' || character === 'S'
            ? 'space'
            : character === 'w' || character === 'W'
              ? 'word'
              : undefined
      if (className) {
        const ranges = POSIX_CLASSES[className]!
        return {
          ranges: /[DSW]/u.test(character) ? complementRanges(ranges) : ranges,
          rangeEndpoint: false,
        }
      }
      if (DECIMAL.test(character)) {
        const digitStart = escapeStart + 1
        if (character !== '0') {
          let end = this.position
          while (
            end < this.pattern.length &&
            DECIMAL.test(this.pattern[end]!) &&
            end - digitStart < 255
          )
            end++
          const digits = this.pattern.slice(digitStart, end)
          const capture = Number(digits)
          if (digits.length === 1 || (capture > 0 && capture <= this.captures))
            this.fail('invalid-escape', escapeStart)
        }
        this.position = digitStart
        const digits = this.takeDigits(OCTAL, 1, 3)
        if (digits.length === 0) this.fail('invalid-escape', escapeStart)
        let value = Number.parseInt(digits, 8)
        if (value > 255) {
          this.position--
          value >>= 3
        }
        return {
          ranges: value <= MAX_UNICODE ? [{ from: value, to: value }] : [],
          rangeEndpoint: true,
        }
      }
      const value = ASCII_ALNUM.test(character)
        ? this.parseCharacterEscape(character)
        : character.codePointAt(0)
      if (value === undefined) this.fail('invalid-escape', escapeStart)
      return {
        ranges: value <= MAX_UNICODE ? [{ from: value, to: value }] : [],
        rangeEndpoint: true,
      }
    }
    const character = this.takeCodePoint()!
    const value = character.codePointAt(0)!
    return { ranges: [{ from: value, to: value }], rangeEndpoint: true }
  }

  private collatingElement(name: string): number | undefined {
    if ([...name].length === 1) return name.codePointAt(0)
    return COLLATING_NAMES[name]
  }

  private characterClass(
    ranges: readonly PostgresRegexCharacterRange[],
    negated: boolean,
    excludesNewline: boolean,
  ): PostgresRegexExpression {
    return {
      kind: 'character-class',
      negated,
      excludesNewline,
      ranges: normalizeRanges(ranges),
    }
  }

  private codePointExpression(codePoint: number): PostgresRegexExpression {
    if (codePoint === 0 || codePoint > MAX_UNICODE || (codePoint >= 0xd800 && codePoint <= 0xdfff))
      return impossible()
    return literal(String.fromCodePoint(codePoint))
  }

  private lineAssertion(beginning: boolean): PostgresRegexExpression {
    const lineSensitive = this.flags.newline === 'sensitive' || this.flags.newline === 'anchors'
    return this.assertion(
      beginning
        ? lineSensitive
          ? 'beginning-of-line'
          : 'beginning-of-string'
        : lineSensitive
          ? 'end-of-line'
          : 'end-of-string',
    )
  }

  private assertion(
    assertion:
      | 'beginning-of-string'
      | 'end-of-string'
      | 'beginning-of-line'
      | 'end-of-line'
      | 'beginning-of-word'
      | 'end-of-word'
      | 'word-boundary'
      | 'non-word-boundary',
  ): PostgresRegexExpression {
    return { kind: 'assertion', assertion }
  }

  private takeBoundNumber(): number {
    const start = this.position
    const digits = this.takeDigits(DECIMAL, 1, 3)
    if (DECIMAL.test(this.peek())) {
      while (DECIMAL.test(this.peek())) this.position++
      this.fail('invalid-repetition-count', start)
    }
    const value = Number(digits)
    if (value > MAX_REPETITION) this.fail('invalid-repetition-count', start)
    return value
  }

  private basicAtEnd(stopper: boolean): boolean {
    const saved = this.position
    this.skipExpanded()
    const result = this.atEnd() || (stopper && this.pattern.startsWith('\\)', this.position))
    this.position = saved
    return result
  }

  private skipExpanded(): void {
    if (!this.flags.expanded || this.flags.syntax === 'literal') return
    for (;;) {
      while (EXPANDED_SPACE.test(this.peek())) this.position++
      if (this.peek() !== '#') return
      while (!this.atEnd() && this.peek() !== '\n') this.position++
    }
  }

  private takeDigits(pattern: RegExp, minimum: number, maximum: number): string {
    const start = this.position
    while (this.position - start < maximum && pattern.test(this.peek())) this.position++
    return this.position - start < minimum ? '' : this.pattern.slice(start, this.position)
  }

  private peek(offset = 0): string {
    return this.pattern[this.position + offset] ?? ''
  }

  private take(): string {
    return this.pattern[this.position++] ?? ''
  }

  private takeCodePoint(): string | undefined {
    if (this.atEnd()) return undefined
    const codePoint = this.pattern.codePointAt(this.position)!
    const character = String.fromCodePoint(codePoint)
    this.position += character.length
    return character
  }

  private atEnd(): boolean {
    return this.position >= this.pattern.length
  }

  private fail(error: PostgresRegexErrorCode, position = this.position): never {
    throw new RegexParseFailure(error, position)
  }
}

export function parsePostgresRegex(
  pattern: string,
  options: PostgresRegexOptions = {},
): PostgresRegexParseResult {
  const flags: ParserFlags = {
    syntax: options.syntax ?? 'advanced',
    caseSensitive: options.caseSensitive ?? true,
    expanded: options.expanded ?? false,
    newline: options.newline ?? 'ordinary',
  }
  try {
    return { kind: 'valid', regex: new PostgresRegexParser(pattern, flags).parse() }
  } catch (error) {
    if (!(error instanceof RegexParseFailure)) throw error
    return { kind: 'invalid', sqlstate: '2201B', error: error.error, position: error.position }
  }
}
