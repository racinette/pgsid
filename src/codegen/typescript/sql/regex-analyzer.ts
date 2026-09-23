import { readFileSync } from 'node:fs'
import ts from 'typescript'
import {
  REGEX_ENGINE_PROFILE_SCHEMA,
  REGEX_SEMANTIC_FEATURES,
  type RegexEngineProfile,
} from '../../../sql-semantics/regex/profile.js'
import { REGEX_LOWERING_STRATEGIES } from '../../../sql-semantics/regex/strategies.js'

const sourceFile = (name: string): ts.SourceFile =>
  ts.createSourceFile(
    name,
    readFileSync(new URL(`../../../sql-semantics/regex/${name}`, import.meta.url), 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )

const declarations = (name: string, selected?: ReadonlySet<string>): string => {
  const file = sourceFile(name)
  return file.statements
    .filter(
      (statement) =>
        !ts.isImportDeclaration(statement) &&
        (!selected ||
          ((ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
            selected.has(statement.name.text))),
    )
    .map((statement) => statement.getText(file).replace(/^export\s+/u, ''))
    .join('\n\n')
}

const profileDeclarations = new Set([
  'RegexSemanticFeature',
  'RegexLoweringStrategy',
  'RegexFeatureDisposition',
  'RegexFeatureMap',
  'RegexEngineProfile',
])
const strategyDeclarations = new Set(['RegexLoweringOperation', 'RegexLoweringRecipe'])

export function typescriptRegexAnalyzerSource(profile: RegexEngineProfile): string {
  const strategies = Object.fromEntries(
    Object.entries(REGEX_LOWERING_STRATEGIES).filter(([name]) =>
      name.startsWith(`${profile.engine}.`),
    ),
  )
  return [
    declarations('ast.ts'),
    `const REGEX_ENGINE_PROFILE_SCHEMA = ${JSON.stringify(REGEX_ENGINE_PROFILE_SCHEMA)} as const`,
    `const REGEX_SEMANTIC_FEATURES = ${JSON.stringify(REGEX_SEMANTIC_FEATURES)} as const`,
    declarations('profile.ts', profileDeclarations),
    declarations('strategies.ts', strategyDeclarations),
    `const REGEX_LOWERING_STRATEGIES = ${JSON.stringify(strategies)} as const satisfies Readonly<Record<RegexLoweringStrategy, RegexLoweringRecipe>>`,
    `const REGEX_ENGINE_PROFILE = ${JSON.stringify(profile)} as const satisfies RegexEngineProfile`,
    declarations('parser.ts'),
    declarations('flags.ts'),
    declarations('features.ts'),
    declarations('compiler.ts'),
    `function evalBoolRegexAnalyze(pattern: string, options: PostgresRegexOptions = {}): CompiledRegex {
  return compilePostgresRegex(pattern, REGEX_ENGINE_PROFILE, options)
}`,
  ].join('\n\n')
}
