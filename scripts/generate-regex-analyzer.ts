import { readFile, writeFile } from 'node:fs/promises'
import { typescriptRegexAnalyzerSource } from '../src/codegen/typescript/sql/regex-analyzer.js'
import { REGEX_ENGINE_PROFILES } from '../src/sql-semantics/regex/profiles.generated.js'

const output = new URL('../src/codegen/typescript/sql/regex-analyzer.generated.ts', import.meta.url)
const sources = Object.fromEntries(
  Object.values(REGEX_ENGINE_PROFILES).map((profile) => [
    profile.engine,
    typescriptRegexAnalyzerSource(profile),
  ]),
)
const source = `export const REGEX_ANALYZER_SOURCES = ${JSON.stringify(sources)} as const\n`

if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')) !== source)
    throw new Error(`Stale generated regex analyzer: ${output.pathname}`)
} else {
  await writeFile(output, source)
}
