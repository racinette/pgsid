import type { RegexLoweringStrategy } from './profile.js'

export type RegexLoweringOperation =
  | { kind: 'emit-empty' }
  | { kind: 'escape-literal'; characters: string }
  | { kind: 'join-concatenation' }
  | { kind: 'emit-source'; source: string }
  | { kind: 'add-flag'; flag: string }
  | { kind: 'no-op' }

export interface RegexLoweringRecipe {
  operations: readonly RegexLoweringOperation[]
}

export const REGEX_LOWERING_STRATEGIES = {
  'ecmascript.emit-empty': { operations: [{ kind: 'emit-empty' }] },
  'ecmascript.escape-literal': {
    operations: [{ kind: 'escape-literal', characters: String.raw`\^$.*+?()[]{}|/` }],
  },
  'ecmascript.concatenate': { operations: [{ kind: 'join-concatenation' }] },
  'ecmascript.emit-beginning-of-string': {
    operations: [{ kind: 'emit-source', source: '^' }],
  },
  'ecmascript.emit-end-of-string': {
    operations: [{ kind: 'emit-source', source: String.raw`(?![\s\S])` }],
  },
  'ecmascript.unicode': { operations: [{ kind: 'add-flag', flag: 'u' }] },
  'ecmascript.no-op': { operations: [{ kind: 'no-op' }] },
  're2.emit-empty': { operations: [{ kind: 'emit-empty' }] },
  're2.escape-literal': {
    operations: [{ kind: 'escape-literal', characters: String.raw`\^$.*+?()[]{}|` }],
  },
  're2.concatenate': { operations: [{ kind: 'join-concatenation' }] },
  're2.emit-beginning-of-string': {
    operations: [{ kind: 'emit-source', source: String.raw`\A` }],
  },
  're2.emit-end-of-string': {
    operations: [{ kind: 'emit-source', source: String.raw`\z` }],
  },
  're2.no-op': { operations: [{ kind: 'no-op' }] },
} as const satisfies Readonly<Record<RegexLoweringStrategy, RegexLoweringRecipe>>

export type RegisteredRegexLoweringStrategy = keyof typeof REGEX_LOWERING_STRATEGIES

export const REGEX_LOWERING_STRATEGY_NAMES = new Set<RegexLoweringStrategy>(
  Object.keys(REGEX_LOWERING_STRATEGIES) as RegisteredRegexLoweringStrategy[],
)
