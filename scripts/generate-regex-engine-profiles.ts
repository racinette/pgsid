import { readFile, readdir, writeFile } from 'node:fs/promises'
import { format } from 'prettier'
import { parseRegexEngineProfile } from '../src/sql-semantics/regex/profile.js'

const check = process.argv.includes('--check')
const directory = new URL('../src/sql-semantics/regex/profiles/', import.meta.url)
const output = new URL('../src/sql-semantics/regex/profiles.generated.ts', import.meta.url)
const names = (await readdir(directory)).filter((name) => name.endsWith('.yaml')).sort()
const profiles = []
for (const name of names) {
  const path = new URL(name, directory)
  profiles.push(parseRegexEngineProfile(await readFile(path, 'utf8'), { path: path.pathname }))
}

const engines = profiles.map((profile) => profile.engine)
if (new Set(engines).size !== engines.length) throw new Error('Duplicate regex engine profile')

const source = await format(
  `import type { RegexEngineProfile } from './profile.js'
export const REGEX_ENGINE_PROFILES = ${JSON.stringify(Object.fromEntries(profiles.map((profile) => [profile.engine, profile])))} as const satisfies Readonly<Record<string, RegexEngineProfile>>
`,
  {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
  },
)

if (check) {
  if ((await readFile(output, 'utf8')) !== source)
    throw new Error(`Stale regex engine profiles: ${output.pathname}`)
} else {
  await writeFile(output, source)
}
