import { REGEX_SEMANTIC_FEATURES, type RegexSemanticFeature } from './profile.js'
import type { PostgresRegex, PostgresRegexExpression } from './ast.js'

export function postgresRegexFeatures(regex: PostgresRegex): readonly RegexSemanticFeature[] {
  const features = new Set<RegexSemanticFeature>([
    regex.caseSensitive ? 'case-sensitive' : 'case-insensitive',
    'unicode-code-points',
    'substring-search',
  ])

  const visit = (expression: PostgresRegexExpression): void => {
    switch (expression.kind) {
      case 'empty':
        features.add('empty-expression')
        return
      case 'impossible':
        features.add('impossible-expression')
        return
      case 'literal':
        features.add('literal')
        return
      case 'concatenation':
        features.add('concatenation')
        expression.expressions.forEach(visit)
        return
      case 'alternation':
        features.add('alternation')
        expression.branches.forEach(visit)
        return
      case 'any-character':
        features.add(
          expression.includesNewline
            ? 'any-character-including-newline'
            : 'any-character-excluding-newline',
        )
        return
      case 'character-class':
        features.add(
          expression.negated
            ? expression.excludesNewline
              ? 'negated-bracket-class-excluding-newline'
              : 'negated-bracket-class-including-newline'
            : 'bracket-class',
        )
        if (expression.ranges.some((range) => range.from !== range.to))
          features.add('character-range')
        return
      case 'group':
        features.add(expression.capturing ? 'capturing-group' : 'noncapturing-group')
        visit(expression.expression)
        return
      case 'repeat': {
        const quantifier =
          expression.minimum === 0 && expression.maximum === null
            ? 'zero-or-more-quantifier'
            : expression.minimum === 1 && expression.maximum === null
              ? 'one-or-more-quantifier'
              : expression.minimum === 0 && expression.maximum === 1
                ? 'zero-or-one-quantifier'
                : expression.maximum === expression.minimum
                  ? 'exact-quantifier'
                  : expression.maximum === null
                    ? 'at-least-quantifier'
                    : 'bounded-quantifier'
        features.add(quantifier)
        if (expression.preference === 'greedy') features.add('greedy-preference')
        if (expression.preference === 'nongreedy') features.add('nongreedy-preference')
        visit(expression.expression)
        return
      }
      case 'assertion':
        features.add(expression.assertion)
        return
      case 'lookaround':
        features.add(`${expression.positive ? 'positive' : 'negative'}-look${expression.direction}`)
        visit(expression.expression)
        return
      case 'backreference':
        features.add('backreference')
    }
  }

  visit(regex.expression)
  return REGEX_SEMANTIC_FEATURES.filter((feature) => features.has(feature))
}
