import { readFile } from 'node:fs/promises'
import { parseDocument, visit } from 'yaml'
import { z } from 'zod'
import { compilePostgresRegex } from '../../../../src/sql-semantics/regex/compiler.js'
import { postgresRegexFeatures } from '../../../../src/sql-semantics/regex/features.js'
import { parsePostgresRegex } from '../../../../src/sql-semantics/regex/parser.js'
import {
  REGEX_SEMANTIC_FEATURES,
  type RegexEngineProfile,
  type RegexSemanticFeature,
} from '../../../../src/sql-semantics/regex/profile.js'

const optionsSchema = z
  .object({
    syntax: z.enum(['advanced', 'extended', 'basic', 'literal']).optional(),
    caseSensitive: z.boolean().optional(),
    expanded: z.boolean().optional(),
    newline: z.enum(['ordinary', 'sensitive', 'stop', 'anchors']).optional(),
  })
  .strict()

const vectorSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/u),
    pattern: z.string(),
    options: optionsSchema,
    subject: z.string(),
    expected: z.union([
      z.object({ match: z.boolean() }).strict(),
      z.object({ sqlstate: z.literal('2201B') }).strict(),
    ]),
    features: z.array(z.enum(REGEX_SEMANTIC_FEATURES)),
  })
  .strict()

const documentSchema = z
  .object({
    schema: z.literal('pgsid.regex-conformance/v1'),
    vectors: z.array(vectorSchema).min(1),
  })
  .strict()

export type RegexConformanceVector = z.infer<typeof vectorSchema>

export interface RegexCapabilityRow {
  engine: string
  baseline: string
  feature: RegexSemanticFeature
  strategy: string
  evidence: readonly string[]
}

export function parseRegexConformanceVectors(raw: string): readonly RegexConformanceVector[] {
  const document = parseDocument(raw, { uniqueKeys: true })
  if (document.errors.length > 0) throw new Error(document.errors[0]!.message)

  let hasAlias = false
  visit(document, {
    Alias: () => {
      hasAlias = true
      return visit.BREAK
    },
  })
  if (hasAlias) throw new Error('Regex conformance aliases are not allowed')

  const { vectors } = documentSchema.parse(document.toJS())
  const ids = new Set<string>()
  for (const vector of vectors) {
    if (ids.has(vector.id)) throw new Error(`Duplicate regex conformance ID: ${vector.id}`)
    ids.add(vector.id)

    const parsed = parsePostgresRegex(vector.pattern, vector.options)
    if ('sqlstate' in vector.expected) {
      if (parsed.kind !== 'invalid' || vector.features.length !== 0)
        throw new Error(`Invalid regex conformance result or features: ${vector.id}`)
      continue
    }
    if (parsed.kind !== 'valid')
      throw new Error(`Expected valid regex conformance pattern: ${vector.id}`)
    const actual = postgresRegexFeatures(parsed.regex)
    if (
      new Set(vector.features).size !== vector.features.length ||
      vector.features.length !== actual.length ||
      actual.some((feature) => !vector.features.includes(feature))
    )
      throw new Error(`Incorrect regex conformance features: ${vector.id}`)
  }
  return vectors
}

export async function loadRegexConformanceVectors(): Promise<readonly RegexConformanceVector[]> {
  const path = new URL('./conformance.yaml', import.meta.url)
  return parseRegexConformanceVectors(await readFile(path, 'utf8'))
}

export function regexCapabilityReport(
  vectors: readonly RegexConformanceVector[],
  profiles: readonly RegexEngineProfile[],
): readonly RegexCapabilityRow[] {
  return [...profiles]
    .sort((left, right) => left.engine.localeCompare(right.engine))
    .flatMap((profile) =>
      REGEX_SEMANTIC_FEATURES.map((feature) => {
        const strategy = profile.features[feature]
        const evidence = vectors
          .filter(
            (vector) =>
              'match' in vector.expected &&
              vector.features.includes(feature) &&
              compilePostgresRegex(vector.pattern, profile, vector.options).kind === 'supported',
          )
          .map((vector) => vector.id)
        if (strategy !== 'unsupported' && evidence.length === 0)
          throw new Error(`No conformance evidence for ${profile.engine}.${feature}`)
        return { engine: profile.engine, baseline: profile.baseline, feature, strategy, evidence }
      }),
    )
}
