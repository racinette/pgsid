import { REGEX_ENGINE_PROFILES } from './profiles.generated.js'

export const REGEX_TARGET_ENGINE_BINDINGS = {
  typescript: 'ecmascript',
  go: 're2',
} as const satisfies Readonly<Record<string, keyof typeof REGEX_ENGINE_PROFILES>>

export type RegexTarget = keyof typeof REGEX_TARGET_ENGINE_BINDINGS

export const regexEngineProfileForTarget = (target: RegexTarget) =>
  REGEX_ENGINE_PROFILES[REGEX_TARGET_ENGINE_BINDINGS[target]]
