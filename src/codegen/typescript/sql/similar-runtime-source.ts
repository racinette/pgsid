import { readFileSync } from 'node:fs'
import ts from 'typescript'

const sourceFile = (name: string): ts.SourceFile =>
  ts.createSourceFile(
    name,
    readFileSync(new URL(`../../../sql-semantics/regex/${name}`, import.meta.url), 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )

const declarations = (name: string): string => {
  const file = sourceFile(name)
  return file.statements
    .filter((statement) => !ts.isImportDeclaration(statement))
    .map((statement) => statement.getText(file).replace(/^export\s+/u, ''))
    .join('\n\n')
}

export function typescriptSimilarSource(): string {
  return declarations('similar.ts')
}
