import { parseDocument, visit } from 'yaml'
import { z } from 'zod'

export const REGEX_ENGINE_PROFILE_SCHEMA = 'pgsid.regex-engine-profile/v1' as const

export const REGEX_SEMANTIC_FEATURES = [
  'empty-expression',
  'impossible-expression',
  'literal',
  'concatenation',
  'alternation',
  'capturing-group',
  'noncapturing-group',
  'any-character-including-newline',
  'any-character-excluding-newline',
  'bracket-class',
  'negated-bracket-class-including-newline',
  'negated-bracket-class-excluding-newline',
  'character-range',
  'zero-or-more-quantifier',
  'one-or-more-quantifier',
  'zero-or-one-quantifier',
  'exact-quantifier',
  'at-least-quantifier',
  'bounded-quantifier',
  'greedy-preference',
  'nongreedy-preference',
  'beginning-of-string',
  'end-of-string',
  'beginning-of-line',
  'end-of-line',
  'beginning-of-word',
  'end-of-word',
  'word-boundary',
  'non-word-boundary',
  'positive-lookahead',
  'negative-lookahead',
  'positive-lookbehind',
  'negative-lookbehind',
  'backreference',
  'case-sensitive',
  'case-insensitive',
  'unicode-code-points',
  'substring-search',
] as const

export type RegexSemanticFeature = (typeof REGEX_SEMANTIC_FEATURES)[number]
export type RegexLoweringStrategy = `${string}.${string}`
export type RegexFeatureDisposition = 'unsupported' | RegexLoweringStrategy
export type RegexFeatureMap = Readonly<Record<RegexSemanticFeature, RegexFeatureDisposition>>

export interface RegexEngineProfile {
  schema: typeof REGEX_ENGINE_PROFILE_SCHEMA
  engine: string
  baseline: string
  features: RegexFeatureMap
}

export interface ParseRegexEngineProfileOptions {
  path?: string
  strategies?: ReadonlySet<RegexLoweringStrategy>
}

export class RegexEngineProfileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegexEngineProfileError'
  }
}

const featureShape = Object.fromEntries(
  REGEX_SEMANTIC_FEATURES.map((feature) => [feature, z.string().min(1)]),
) as Record<RegexSemanticFeature, z.ZodString>

const profileSchema = z
  .object({
    schema: z.literal(REGEX_ENGINE_PROFILE_SCHEMA),
    engine: z.string().regex(/^[a-z][a-z0-9-]*$/u),
    baseline: z.string().min(1),
    features: z.object(featureShape).strict(),
  })
  .strict()

const issueText = (path: string, message: string): string =>
  `Invalid regex engine profile in ${path}: ${message}`

export function parseRegexEngineProfile(
  raw: string,
  options: ParseRegexEngineProfileOptions = {},
): RegexEngineProfile {
  const path = options.path ?? '<string>'
  const document = parseDocument(raw, { uniqueKeys: true })
  if (document.errors.length > 0)
    throw new RegexEngineProfileError(issueText(path, document.errors[0]!.message))

  let hasAlias = false
  visit(document, {
    Alias: () => {
      hasAlias = true
      return visit.BREAK
    },
  })
  if (hasAlias) throw new RegexEngineProfileError(issueText(path, 'YAML aliases are not allowed'))

  const result = profileSchema.safeParse(document.toJS())
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `at ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ')
    throw new RegexEngineProfileError(issueText(path, issues))
  }

  const knownStrategies = options.strategies ?? new Set<RegexLoweringStrategy>()
  for (const feature of REGEX_SEMANTIC_FEATURES) {
    const strategy = result.data.features[feature]
    if (strategy === 'unsupported') continue
    if (!strategy.startsWith(`${result.data.engine}.`))
      throw new RegexEngineProfileError(
        issueText(
          path,
          `at features.${feature}: strategy ${JSON.stringify(strategy)} does not belong to engine ${JSON.stringify(result.data.engine)}`,
        ),
      )
    if (!knownStrategies.has(strategy as RegexLoweringStrategy))
      throw new RegexEngineProfileError(
        issueText(path, `at features.${feature}: unknown strategy ${JSON.stringify(strategy)}`),
      )
  }

  return result.data as RegexEngineProfile
}
