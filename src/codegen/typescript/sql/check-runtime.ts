import { REGEX_ANALYZER_SOURCES } from './regex-analyzer.generated.js'

export const typescriptCheckHelpers: Record<
  string,
  { dependencies: readonly string[]; source: string }
> = {
  EvalBool: {
    dependencies: [],
    source: `type EvalBool =
  | { readonly certain: false }
  | { readonly certain: true; readonly value: boolean | null }`,
  },
  evalBoolCertain: {
    dependencies: ['EvalBool'],
    source: `function evalBoolCertain(value: boolean | null): EvalBool { return { certain: true, value } }`,
  },
  evalBoolUncertain: {
    dependencies: ['EvalBool'],
    source: `function evalBoolUncertain(): EvalBool { return { certain: false } }`,
  },
  evalBoolNot: {
    dependencies: ['EvalBool', 'evalBoolCertain'],
    source: `function evalBoolNot(value: EvalBool): EvalBool {
  if (!value.certain || value.value === null) return value
  return evalBoolCertain(!value.value)
}`,
  },
  evalBoolAnd: {
    dependencies: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
    source: `function evalBoolAnd(left: () => EvalBool, right: () => EvalBool): EvalBool {
  const a = left()
  if (a.certain && a.value === false) return a
  const b = right()
  if (b.certain && b.value === false) return b
  if (!a.certain || !b.certain) return evalBoolUncertain()
  return evalBoolCertain(a.value === null || b.value === null ? null : true)
}`,
  },
  evalBoolOr: {
    dependencies: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
    source: `function evalBoolOr(left: () => EvalBool, right: () => EvalBool): EvalBool {
  const a = left()
  if (a.certain && a.value === true) return a
  const b = right()
  if (b.certain && b.value === true) return b
  if (!a.certain || !b.certain) return evalBoolUncertain()
  return evalBoolCertain(a.value === null || b.value === null ? null : false)
}`,
  },
  evalBoolCase: {
    dependencies: ['EvalBool', 'evalBoolUncertain'],
    source: `function evalBoolCase(
  otherwise: () => EvalBool,
  ...branches: readonly (readonly [() => EvalBool, () => EvalBool])[]
): EvalBool {
  for (const [when, then] of branches) {
    const condition = when()
    if (!condition.certain) return evalBoolUncertain()
    if (condition.value === true) return then()
  }
  return otherwise()
}`,
  },
  evalBoolTest: {
    dependencies: ['EvalBool', 'evalBoolCertain'],
    source: `function evalBoolTest(
  value: EvalBool,
  test: 'true' | 'false' | 'unknown',
  negated: boolean,
): EvalBool {
  if (!value.certain) return value
  const result = test === 'true' ? value.value === true : test === 'false' ? value.value === false : value.value === null
  return evalBoolCertain(negated ? !result : result)
}`,
  },
  evalBoolCompare: {
    dependencies: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
    source: `function evalBoolCompare(
  left: EvalBool,
  right: EvalBool,
  operation: '=' | '<>' | '<' | '<=' | '>' | '>=',
): EvalBool {
  if (!left.certain || !right.certain) return evalBoolUncertain()
  if (left.value === null || right.value === null) return evalBoolCertain(null)
  const a = Number(left.value), b = Number(right.value)
  const result = operation === '=' ? a === b : operation === '<>' ? a !== b : operation === '<' ? a < b : operation === '<=' ? a <= b : operation === '>' ? a > b : a >= b
  return evalBoolCertain(result)
}`,
  },
  evalBoolRegex: {
    dependencies: ['EvalBool', 'evalBoolCertain'],
    source: `function evalBoolRegex(
  value: string | null,
  source: string,
  flags: string,
  negated: boolean,
): EvalBool {
  if (value === null) return evalBoolCertain(null)
  const matched = new RegExp(source, flags).test(value)
  return evalBoolCertain(negated ? !matched : matched)
}`,
  },
  evalBoolRegexUnsupported: {
    dependencies: ['EvalBool', 'evalBoolCertain', 'evalBoolUncertain'],
    source: `function evalBoolRegexUnsupported(value: string | null): EvalBool {
  return value === null ? evalBoolCertain(null) : evalBoolUncertain()
}`,
  },
  SqlInvalidRegexError: {
    dependencies: [],
    source: `class SqlInvalidRegexError extends Error {
  readonly code = '2201B'
  constructor() { super('invalid regular expression') }
}`,
  },
  evalBoolRegexInvalid: {
    dependencies: ['EvalBool', 'evalBoolCertain', 'SqlInvalidRegexError'],
    source: `function evalBoolRegexInvalid(value: string | null): EvalBool {
  if (value === null) return evalBoolCertain(null)
  throw new SqlInvalidRegexError()
}`,
  },
  evalBoolRegexAnalyze: {
    dependencies: [],
    source: REGEX_ANALYZER_SOURCES.ecmascript,
  },
  evalBoolRegexDynamic: {
    dependencies: [
      'EvalBool',
      'evalBoolCertain',
      'evalBoolRegex',
      'evalBoolRegexUnsupported',
      'evalBoolRegexInvalid',
      'evalBoolRegexAnalyze',
    ],
    source: `function evalBoolRegexDynamic(
  value: string | null,
  pattern: string | null,
  options: PostgresRegexOptions,
  negated: boolean,
): EvalBool {
  if (value === null || pattern === null) return evalBoolCertain(null)
  const result = evalBoolRegexAnalyze(pattern, options)
  if (result.kind === 'invalid') return evalBoolRegexInvalid(value)
  if (result.kind === 'unsupported') return evalBoolRegexUnsupported(value)
  return evalBoolRegex(value, result.source, result.flags.join(''), negated)
}`,
  },
  SqlInvalidRegexOptionError: {
    dependencies: [],
    source: `class SqlInvalidRegexOptionError extends Error {
  readonly code = '22023'
  constructor() { super('invalid regular expression option') }
}`,
  },
  evalBoolRegexInvalidFlags: {
    dependencies: ['EvalBool', 'evalBoolCertain', 'SqlInvalidRegexOptionError'],
    source: `function evalBoolRegexInvalidFlags(value: string | null, pattern: string | null): EvalBool {
  if (value === null || pattern === null) return evalBoolCertain(null)
  throw new SqlInvalidRegexOptionError()
}`,
  },
  evalBoolRegexpLike: {
    dependencies: [
      'EvalBool',
      'evalBoolCertain',
      'SqlInvalidRegexOptionError',
      'evalBoolRegexDynamic',
    ],
    source: `function evalBoolRegexpLike(
  value: string | null,
  pattern: string | null,
  flags: string | null,
): EvalBool {
  if (value === null || pattern === null || flags === null) return evalBoolCertain(null)
  const parsed = parseRegexpLikeFlags(flags)
  if (parsed.kind === 'invalid') throw new SqlInvalidRegexOptionError()
  return evalBoolRegexDynamic(value, pattern, parsed.options, false)
}`,
  },
}
