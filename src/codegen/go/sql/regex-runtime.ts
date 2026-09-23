import { REGEX_ENGINE_PROFILES } from '../../../sql-semantics/regex/profiles.generated.js'
import { REGEX_SEMANTIC_FEATURES } from '../../../sql-semantics/regex/profile.js'
import { REGEX_LOWERING_STRATEGIES } from '../../../sql-semantics/regex/strategies.js'

export function goRegexProfileSource(): string {
  const profile = REGEX_ENGINE_PROFILES.re2
  const strategies = [...new Set(Object.values(profile.features))].filter(
    (strategy) => strategy !== 'unsupported',
  )
  return `
func regexFeatureOrder() []string { return []string{${REGEX_SEMANTIC_FEATURES.map((feature) => JSON.stringify(feature)).join(', ')}} }

func regexProfileFeature(feature string) string {
  switch feature {
${Object.entries(profile.features)
  .filter(([, strategy]) => strategy !== 'unsupported')
  .map(
    ([feature, strategy]) =>
      `  case ${JSON.stringify(feature)}: return ${JSON.stringify(strategy)}`,
  )
  .join('\n')}
  }
  return "unsupported"
}

func regexProfileRecipe(strategy string) []regexOperation {
  switch strategy {
${strategies
  .map((strategy) => {
    const recipe = REGEX_LOWERING_STRATEGIES[strategy as keyof typeof REGEX_LOWERING_STRATEGIES]
    if (!recipe) throw new Error(`Missing regex recipe ${strategy}`)
    return `  case ${JSON.stringify(strategy)}: return []regexOperation{${recipe.operations
      .map((operation) =>
        operation.kind === 'escape-literal'
          ? `{Kind: ${JSON.stringify(operation.kind)}, Characters: ${JSON.stringify(operation.characters)}}`
          : operation.kind === 'emit-source'
            ? `{Kind: ${JSON.stringify(operation.kind)}, Source: ${JSON.stringify(operation.source)}}`
            : operation.kind === 'add-flag'
              ? `{Kind: ${JSON.stringify(operation.kind)}, Flag: ${JSON.stringify(operation.flag)}}`
              : `{Kind: ${JSON.stringify(operation.kind)}}`,
      )
      .join(', ')}}`
  })
  .join('\n')}
  }
  panic("unknown regex lowering strategy")
}
`
}
