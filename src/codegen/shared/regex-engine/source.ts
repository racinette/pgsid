import { readFileSync } from 'node:fs'

export function generatedRegexEngineSource(language: 'go' | 'typescript'): string {
  const name = language === 'go' ? 'engine.go' : 'engine.ts'
  return readFileSync(new URL(name, import.meta.url), 'utf8')
}
