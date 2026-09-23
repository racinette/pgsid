import type {
  PostgresRegexExpression,
  PostgresRegexOptions,
  PostgresRegexParseResult,
} from './ast.js'
import { postgresRegexFeatures } from './features.js'
import { parsePostgresRegex } from './parser.js'
import type { RegexEngineProfile, RegexLoweringStrategy, RegexSemanticFeature } from './profile.js'
import { REGEX_LOWERING_STRATEGIES, type RegexLoweringRecipe } from './strategies.js'

export type CompiledRegex =
  | Extract<PostgresRegexParseResult, { kind: 'invalid' }>
  | { kind: 'unsupported'; features: readonly RegexSemanticFeature[] }
  | { kind: 'supported'; source: string; flags: readonly string[] }

export class RegexLoweringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegexLoweringError'
  }
}

interface ExpressionInput {
  literal?: string
  children?: readonly string[]
  child?: string
}

const recipeFor = (
  profile: RegexEngineProfile,
  feature: RegexSemanticFeature,
): RegexLoweringRecipe => {
  const strategy = profile.features[feature]
  if (strategy === 'unsupported')
    throw new RegexLoweringError(`Feature ${JSON.stringify(feature)} is unsupported`)
  const recipe = REGEX_LOWERING_STRATEGIES[strategy as keyof typeof REGEX_LOWERING_STRATEGIES] as
    RegexLoweringRecipe | undefined
  if (!recipe)
    throw new RegexLoweringError(`Unknown regex lowering strategy ${JSON.stringify(strategy)}`)
  return recipe
}

const escapeLiteral = (value: string, characters: string): string => {
  const escaped = new Set(characters)
  return [...value]
    .map((character) => (escaped.has(character) ? `\\${character}` : character))
    .join('')
}

const lowerExpressionRecipe = (
  strategy: RegexLoweringStrategy,
  recipe: RegexLoweringRecipe,
  input: ExpressionInput,
): string => {
  let source: string | undefined
  for (const operation of recipe.operations) {
    switch (operation.kind) {
      case 'emit-empty':
        source = ''
        break
      case 'escape-literal':
        if (input.literal === undefined)
          throw new RegexLoweringError(`Strategy ${JSON.stringify(strategy)} requires a literal`)
        source = escapeLiteral(input.literal, operation.characters)
        break
      case 'join-concatenation':
        if (!input.children)
          throw new RegexLoweringError(
            `Strategy ${JSON.stringify(strategy)} requires child expressions`,
          )
        source = input.children.join('')
        break
      case 'wrap-group':
        if (input.child === undefined)
          throw new RegexLoweringError(`Strategy ${JSON.stringify(strategy)} requires a child`)
        source = `${operation.prefix}${input.child}${operation.suffix}`
        break
      case 'emit-source':
        source = operation.source
        break
      case 'add-flag':
      case 'no-op':
        throw new RegexLoweringError(
          `Strategy ${JSON.stringify(strategy)} cannot lower a regex expression`,
        )
    }
  }
  if (source === undefined)
    throw new RegexLoweringError(`Strategy ${JSON.stringify(strategy)} emitted no regex source`)
  return source
}

const lowerExpression = (
  expression: PostgresRegexExpression,
  profile: RegexEngineProfile,
): string => {
  let feature: RegexSemanticFeature
  let input: ExpressionInput = {}
  switch (expression.kind) {
    case 'empty':
      feature = 'empty-expression'
      break
    case 'literal':
      feature = 'literal'
      input = { literal: expression.value }
      break
    case 'concatenation':
      feature = 'concatenation'
      input = { children: expression.expressions.map((child) => lowerExpression(child, profile)) }
      break
    case 'group':
      if (expression.capturing) throw new RegexLoweringError('No capturing-group lowering exists')
      feature = 'noncapturing-group'
      input = { child: lowerExpression(expression.expression, profile) }
      break
    case 'assertion':
      if (
        expression.assertion !== 'beginning-of-string' &&
        expression.assertion !== 'end-of-string'
      )
        throw new RegexLoweringError(
          `No expression lowering exists for feature ${JSON.stringify(expression.assertion)}`,
        )
      feature = expression.assertion
      break
    default:
      throw new RegexLoweringError(
        `No expression lowering exists for node ${JSON.stringify(expression.kind)}`,
      )
  }
  const strategy = profile.features[feature]
  if (strategy === 'unsupported')
    throw new RegexLoweringError(`Feature ${JSON.stringify(feature)} is unsupported`)
  return lowerExpressionRecipe(strategy, recipeFor(profile, feature), input)
}

const applyGlobalRecipe = (
  strategy: RegexLoweringStrategy,
  recipe: RegexLoweringRecipe,
  flags: Set<string>,
): void => {
  for (const operation of recipe.operations) {
    switch (operation.kind) {
      case 'add-flag':
        flags.add(operation.flag)
        break
      case 'no-op':
        break
      default:
        throw new RegexLoweringError(
          `Strategy ${JSON.stringify(strategy)} cannot lower a regex-wide feature`,
        )
    }
  }
}

export function compilePostgresRegex(
  pattern: string,
  profile: RegexEngineProfile,
  options: PostgresRegexOptions = {},
): CompiledRegex {
  const parsed = parsePostgresRegex(pattern, options)
  if (parsed.kind === 'invalid') return parsed

  const features = postgresRegexFeatures(parsed.regex)
  const unsupported = features.filter((feature) => profile.features[feature] === 'unsupported')
  if (unsupported.length > 0) return { kind: 'unsupported', features: unsupported }

  const flags = new Set<string>()
  for (const feature of features) {
    if (feature !== 'case-sensitive' && feature !== 'case-insensitive') {
      if (feature !== 'unicode-code-points' && feature !== 'substring-search') continue
    }
    const strategy = profile.features[feature]
    if (strategy === 'unsupported')
      throw new RegexLoweringError(`Feature ${JSON.stringify(feature)} is unsupported`)
    applyGlobalRecipe(strategy, recipeFor(profile, feature), flags)
  }

  return {
    kind: 'supported',
    source: lowerExpression(parsed.regex.expression, profile),
    flags: [...flags],
  }
}
