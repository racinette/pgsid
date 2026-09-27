import type { PostgresRegexOptions } from './options.js'

export type RegexpLikeFlags =
  { kind: 'valid'; options: PostgresRegexOptions } | { kind: 'invalid'; sqlstate: '22023' }

export function parseRegexpLikeFlags(flags: string): RegexpLikeFlags {
  let syntax: NonNullable<PostgresRegexOptions['syntax']> = 'advanced'
  let caseSensitive = true
  let expanded = false
  let newline: NonNullable<PostgresRegexOptions['newline']> = 'ordinary'
  let global = false

  for (const flag of flags) {
    switch (flag) {
      case 'g':
        global = true
        break
      case 'b':
        syntax = 'basic'
        break
      case 'c':
        caseSensitive = true
        break
      case 'e':
        syntax = 'extended'
        break
      case 'i':
        caseSensitive = false
        break
      case 'm':
      case 'n':
        newline = 'sensitive'
        break
      case 'p':
        newline = 'stop'
        break
      case 'q':
        syntax = 'literal'
        break
      case 's':
        newline = 'ordinary'
        break
      case 't':
        expanded = false
        break
      case 'w':
        newline = 'anchors'
        break
      case 'x':
        expanded = true
        break
      default:
        return { kind: 'invalid', sqlstate: '22023' }
    }
  }

  return global
    ? { kind: 'invalid', sqlstate: '22023' }
    : { kind: 'valid', options: { syntax, caseSensitive, expanded, newline } }
}
