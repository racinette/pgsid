export type PostgresRegexSyntax = 'advanced' | 'extended' | 'basic' | 'literal'
export type PostgresRegexNewlineMode = 'ordinary' | 'sensitive' | 'stop' | 'anchors'

export interface PostgresRegexOptions {
  syntax?: PostgresRegexSyntax
  caseSensitive?: boolean
  expanded?: boolean
  newline?: PostgresRegexNewlineMode
}
