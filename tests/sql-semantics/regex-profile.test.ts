import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  parseRegexEngineProfile,
  REGEX_ENGINE_PROFILE_SCHEMA,
  REGEX_SEMANTIC_FEATURES,
  RegexEngineProfileError,
  type RegexLoweringStrategy,
} from '../../src/sql-semantics/regex/profile.js'
import { REGEX_ENGINE_PROFILES } from '../../src/sql-semantics/regex/profiles.generated.js'
import {
  regexEngineProfileForTarget,
  REGEX_TARGET_ENGINE_BINDINGS,
} from '../../src/sql-semantics/regex/target-bindings.js'

const profiles = new URL('../../src/sql-semantics/regex/profiles/', import.meta.url)

const completeProfile = (overrides = ''): string => `
schema: ${REGEX_ENGINE_PROFILE_SCHEMA}
engine: example
baseline: v1
features:
${REGEX_SEMANTIC_FEATURES.map((feature) => `  ${feature}: unsupported`).join('\n')}
${overrides}`

describe('regex engine profiles', () => {
  it.each([
    ['ecmascript', 'es2022'],
    ['re2', 're2-syntax'],
  ])('loads the shipped %s profile', async (engine, baseline) => {
    const raw = await readFile(new URL(`${engine}.yaml`, profiles), 'utf8')
    const profile = parseRegexEngineProfile(raw, { path: `${engine}.yaml` })
    expect(profile).toEqual({
      schema: REGEX_ENGINE_PROFILE_SCHEMA,
      engine,
      baseline,
      features: Object.fromEntries(
        REGEX_SEMANTIC_FEATURES.map((feature) => [feature, 'unsupported']),
      ),
    })
    expect(REGEX_ENGINE_PROFILES[engine as keyof typeof REGEX_ENGINE_PROFILES]).toEqual(profile)
  })

  it('keeps target bindings separate from engine profiles', () => {
    expect(REGEX_TARGET_ENGINE_BINDINGS).toEqual({ typescript: 'ecmascript', go: 're2' })
    expect(regexEngineProfileForTarget('typescript').engine).toBe('ecmascript')
    expect(regexEngineProfileForTarget('go').engine).toBe('re2')
  })

  it('accepts only registered strategies owned by the profile engine', () => {
    const strategy = 'example.escape-literal' as RegexLoweringStrategy
    const raw = completeProfile().replace('literal: unsupported', `literal: ${strategy}`)
    expect(parseRegexEngineProfile(raw, { strategies: new Set([strategy]) }).features.literal).toBe(
      strategy,
    )
    expect(() => parseRegexEngineProfile(raw)).toThrow(/unknown strategy/u)
    expect(() =>
      parseRegexEngineProfile(raw.replace(strategy, 'different.escape-literal'), {
        strategies: new Set(['different.escape-literal']),
      }),
    ).toThrow(/does not belong to engine/u)
  })

  it.each([
    ['a missing feature', completeProfile().replace('  literal: unsupported\n', ''), /literal/u],
    ['an unknown feature', completeProfile('  invented: unsupported\n'), /invented/u],
    ['an unknown top-level key', completeProfile('invented: true\n'), /invented/u],
    [
      'a duplicate feature',
      completeProfile().replace(
        '  literal: unsupported',
        '  literal: unsupported\n  literal: unsupported',
      ),
      /Map keys must be unique/u,
    ],
    [
      'a duplicate top-level key',
      completeProfile('engine: replacement\n'),
      /Map keys must be unique/u,
    ],
    [
      'an alias',
      completeProfile()
        .replace('baseline: v1', 'baseline: &baseline v1')
        .replace('empty-expression: unsupported', 'empty-expression: *baseline'),
      /aliases are not allowed/u,
    ],
  ])('rejects %s', (_name, raw, message) => {
    expect(() => parseRegexEngineProfile(raw, { path: 'profile.yaml' })).toThrow(message)
  })

  it('reports profile errors as a dedicated diagnostic', () => {
    expect(() => parseRegexEngineProfile('schema: wrong', { path: 'broken.yaml' })).toThrow(
      RegexEngineProfileError,
    )
    expect(() => parseRegexEngineProfile('schema: wrong', { path: 'broken.yaml' })).toThrow(
      /broken\.yaml/u,
    )
  })
})
