export type PostgresRegexSyntax = 'advanced' | 'extended' | 'basic' | 'literal'
export type PostgresRegexNewlineMode = 'ordinary' | 'sensitive' | 'stop' | 'anchors'

export interface PostgresRegexOptions {
  syntax?: PostgresRegexSyntax
  caseSensitive?: boolean
  expanded?: boolean
  newline?: PostgresRegexNewlineMode
}

export interface PostgresRegex {
  kind: 'regex'
  syntax: PostgresRegexSyntax
  caseSensitive: boolean
  newline: PostgresRegexNewlineMode
  expression: PostgresRegexExpression
  captures: number
}

export type PostgresRegexExpression =
  | { kind: 'empty' }
  | { kind: 'impossible' }
  | { kind: 'literal'; value: string }
  | { kind: 'concatenation'; expressions: readonly PostgresRegexExpression[] }
  | { kind: 'alternation'; branches: readonly PostgresRegexExpression[] }
  | { kind: 'any-character'; includesNewline: boolean }
  | {
      kind: 'character-class'
      negated: boolean
      excludesNewline: boolean
      ranges: readonly PostgresRegexCharacterRange[]
    }
  | {
      kind: 'group'
      capturing: boolean
      capture?: number
      expression: PostgresRegexExpression
    }
  | {
      kind: 'repeat'
      expression: PostgresRegexExpression
      minimum: number
      maximum: number | null
      preference: 'greedy' | 'nongreedy' | 'inherited'
    }
  | {
      kind: 'assertion'
      assertion:
        | 'beginning-of-string'
        | 'end-of-string'
        | 'beginning-of-line'
        | 'end-of-line'
        | 'beginning-of-word'
        | 'end-of-word'
        | 'word-boundary'
        | 'non-word-boundary'
    }
  | {
      kind: 'lookaround'
      direction: 'ahead' | 'behind'
      positive: boolean
      expression: PostgresRegexExpression
    }
  | { kind: 'backreference'; capture: number }

export interface PostgresRegexCharacterRange {
  from: number
  to: number
}

export type PostgresRegexErrorCode =
  | 'invalid-pattern'
  | 'invalid-collating-element'
  | 'invalid-character-class'
  | 'invalid-escape'
  | 'invalid-backreference'
  | 'unbalanced-brackets'
  | 'unbalanced-parentheses'
  | 'unbalanced-braces'
  | 'invalid-repetition-count'
  | 'invalid-character-range'
  | 'invalid-quantifier-operand'
  | 'invalid-option'

export type PostgresRegexParseResult =
  | { kind: 'valid'; regex: PostgresRegex }
  | {
      kind: 'invalid'
      sqlstate: '2201B'
      error: PostgresRegexErrorCode
      position: number
    }
