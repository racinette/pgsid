export const typescriptRegexEngineHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  regexEngineOptions: {
    dependencies: ['regexEngine'],
    source: `type PostgresRegexOptions = {
  syntax?: 'advanced' | 'basic' | 'extended' | 'literal'
  caseSensitive?: boolean
  expanded?: boolean
  newline?: 'ordinary' | 'sensitive' | 'stop' | 'anchors'
}
function regexEngineOptions(options: PostgresRegexOptions): RegexOptions {
  const syntax = { advanced: 'Advanced', basic: 'Basic', extended: 'Extended', literal: 'Literal' } as const
  const newline = { ordinary: 'Ordinary', sensitive: 'Sensitive', stop: 'Stop', anchors: 'Anchors' } as const
  return {
    syntax: { kind: syntax[options.syntax ?? 'advanced'] },
    caseSensitive: options.caseSensitive !== false,
    expanded: options.expanded === true,
    newline: { kind: newline[options.newline ?? 'ordinary'] },
  }
}`,
  },
  regexEngineFlags: {
    dependencies: ['regexEngineOptions'],
    source: `function regexEngineFlags(flags: string): PostgresRegexOptions | null {
  const options: PostgresRegexOptions = { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' }
  for (const flag of flags) {
    switch (flag) {
      case 'b': options.syntax = 'basic'; break
      case 'c': options.caseSensitive = true; break
      case 'e': options.syntax = 'extended'; break
      case 'i': options.caseSensitive = false; break
      case 'm': case 'n': options.newline = 'sensitive'; break
      case 'p': options.newline = 'stop'; break
      case 'q': options.syntax = 'literal'; break
      case 's': options.newline = 'ordinary'; break
      case 't': options.expanded = false; break
      case 'w': options.newline = 'anchors'; break
      case 'x': options.expanded = true; break
      default: return null
    }
  }
  return options
}`,
  },
  evalBoolRegexEngine: {
    dependencies: [
      'EvalBool',
      'evalBoolCertain',
      'evalBoolUncertain',
      'SqlInvalidRegexError',
      'regexEngineOptions',
    ],
    source: `function evalBoolRegexEngine(value: string | null, pattern: string | null, options: PostgresRegexOptions, negated: boolean): EvalBool {
  if (value === null || pattern === null) return evalBoolCertain(null)
  const result = find(pattern, value, 0, regexEngineOptions(options))
  if (result.kind === 'InvalidPattern') throw new SqlInvalidRegexError()
  if (result.kind === 'Uncertain') return evalBoolUncertain()
  return evalBoolCertain((result.kind === 'Found') !== negated)
}`,
  },
  evalBoolRegexpLikeEngine: {
    dependencies: ['evalBoolRegexEngine', 'regexEngineFlags', 'SqlInvalidRegexOptionError'],
    source: `function evalBoolRegexpLikeEngine(value: string | null, pattern: string | null, flags: string | null): EvalBool {
  if (value === null || pattern === null || flags === null) return evalBoolCertain(null)
  const options = regexEngineFlags(flags)
  if (options === null) throw new SqlInvalidRegexOptionError()
  return evalBoolRegexEngine(value, pattern, options, false)
}`,
  },
  evalRegexCountEngine: {
    dependencies: [
      'EvalValue',
      'evalValueCertain',
      'evalValueUncertain',
      'SqlInvalidRegexStartError',
      'SqlInvalidRegexError',
      'SqlInvalidRegexOptionError',
      'regexEngineFlags',
      'regexEngineOptions',
    ],
    source: `function evalRegexCountEngine(value: string | null, pattern: string | null, start: bigint | null, flags: string | null): EvalValue<bigint> {
  if (value === null || pattern === null || start === null || flags === null) return evalValueCertain<bigint>(null)
  if (start <= 0n) throw new SqlInvalidRegexStartError()
  const options = regexEngineFlags(flags)
  if (options === null) throw new SqlInvalidRegexOptionError()
  const result = count(pattern, value, Number(start - 1n), regexEngineOptions(options))
  if (result.kind === 'InvalidPattern') throw new SqlInvalidRegexError()
  if (result.kind === 'Uncertain') return evalValueUncertain<bigint>()
  return evalValueCertain(BigInt(result.value))
}`,
  },
}
