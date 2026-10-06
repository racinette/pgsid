import { posix } from 'node:path'
import ts from 'typescript'

type Item = { kind: string; name: string; visibility: string; module?: string; sourceFile?: string }
type Group = 'regex' | 'operations' | 'runtime' | 'language' | 'checks'

const filePaths: Record<Group, string> = {
  checks: 'checks.ts',
  operations: 'pg_catalog/operations.ts',
  runtime: 'checkruntime/runtime.ts',
  language: 'langruntime/runtime.ts',
  regex: 'regexengine/regex.ts',
}

export function checkTypescriptArtifacts(
  files: Record<Group, string>,
): { path: string; content: string }[] {
  return (Object.keys(filePaths) as Group[]).flatMap((group) =>
    files[group] ? [{ path: filePaths[group], content: files[group] }] : [],
  )
}

function moduleSpecifier(from: Group, to: Group): string {
  const relative = posix
    .relative(posix.dirname(filePaths[from]), filePaths[to])
    .replace(/\.ts$/u, '.js')
  return relative.startsWith('.') ? relative : `./${relative}`
}

const upper = (name: string): string =>
  name
    .split('_')
    .filter(Boolean)
    .map((part) => {
      const word = part.toUpperCase() === part ? part.toLowerCase() : part
      return word[0]!.toUpperCase() + word.slice(1)
    })
    .join('')

const lower = (name: string): string => {
  const value = upper(name)
  return value[0]!.toLowerCase() + value.slice(1)
}

function declaredName(statement: ts.Statement): string | null {
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isClassDeclaration(statement)
  )
    return statement.name?.text ?? null
  if (ts.isVariableStatement(statement)) {
    const name = statement.declarationList.declarations[0]?.name
    return name && ts.isIdentifier(name) ? name.text : null
  }
  return null
}

function namesUsed(
  statements: readonly ts.Statement[],
  candidates: ReadonlySet<string>,
  checker: ts.TypeChecker,
  symbols: ReadonlyMap<ts.Symbol, string>,
): string[] {
  const found = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node)
      const name = symbol ? symbols.get(symbol) : undefined
      if (name && candidates.has(name)) found.add(name)
    }
    ts.forEachChild(node, visit)
  }
  for (const statement of statements) visit(statement)
  return [...found].sort()
}

export function splitCheckTypescript(
  generated: string,
  items: readonly Item[],
): { regex: string; operations: string; runtime: string; language: string; checks: string } {
  const moduleGroups: Record<string, Group> = {
    regex_engine: 'regex',
    pg_catalog: 'operations',
    checkruntime: 'runtime',
    checks: 'checks',
  }
  const source = ts.createSourceFile('check.ts', generated, ts.ScriptTarget.ES2022, true)
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, types: [] }
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => (name === source.fileName ? source : undefined)
  const checker = ts.createProgram([source.fileName], options, host).getTypeChecker()
  const symbols = new Map<ts.Symbol, string>()
  const owners = new Map<string, Group>()
  const publicTypes: string[] = []
  const publicValues: string[] = []
  for (const item of items) {
    const owner = moduleGroups[item.module ?? '']
    if (!owner) throw new Error(`CHECK item has no supported module: ${item.name}`)
    if (item.kind === 'struct' || item.kind === 'enum') {
      const name = upper(item.name)
      owners.set(name, owner)
      owners.set(`copy${name}`, owner)
      owners.set(`equal${name}`, owner)
      if (owner === 'runtime' && item.visibility === 'public') publicTypes.push(name)
    } else {
      const name = lower(item.name)
      owners.set(name, owner)
      if (
        owner === 'runtime' &&
        item.visibility === 'public' &&
        item.sourceFile?.endsWith('/values.rs')
      )
        publicValues.push(name)
    }
  }
  const groups: Record<Group, ts.Statement[]> = {
    regex: [],
    operations: [],
    runtime: [],
    language: [],
    checks: [],
  }
  const names: Record<Group, Set<string>> = {
    regex: new Set(),
    operations: new Set(),
    runtime: new Set(),
    language: new Set(),
    checks: new Set(),
  }
  for (const statement of source.statements) {
    const name = declaredName(statement)
    const group = name ? (owners.get(name) ?? 'language') : 'language'
    groups[group].push(statement)
    if (name) names[group].add(name)
    const binding = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations[0]?.name
      : 'name' in statement
        ? (statement.name as ts.Node | undefined)
        : undefined
    const symbol = binding ? checker.getSymbolAtLocation(binding) : undefined
    if (name && symbol) symbols.set(symbol, name)
  }
  const namespaces: Record<Group, string> = {
    regex: 'regexengine',
    operations: 'pg_catalog',
    runtime: 'checkruntime',
    language: 'langruntime',
    checks: 'checks',
  }
  const shortName = (name: string): string =>
    name.startsWith('sqlPgCatalog')
      ? name.slice('sqlPgCatalog'.length).replace(/^./u, (letter) => letter.toLowerCase())
      : name
  const exports: Record<Group, Set<string>> = {
    regex: new Set(),
    operations: new Set(),
    runtime: new Set([...publicTypes, ...publicValues]),
    language: new Set(),
    checks: new Set(),
  }
  const used = new Map<Group, Map<Group, string[]>>()
  for (const group of Object.keys(groups) as Group[]) {
    const dependencies = new Map<Group, string[]>()
    for (const owner of Object.keys(groups) as Group[]) {
      if (owner === group) continue
      const references = namesUsed(groups[group], names[owner], checker, symbols)
      if (references.length) dependencies.set(owner, references)
      for (const name of references) exports[owner].add(name)
    }
    used.set(group, dependencies)
  }
  const result = {} as Record<Group, string>
  for (const group of Object.keys(groups) as Group[]) {
    if (!groups[group].length) {
      result[group] = ''
      continue
    }
    const transformed = ts.transform(groups[group], [
      (context) => (statement) => {
        const visit: ts.Visitor = (node) => {
          if (ts.isIdentifier(node)) {
            const symbol = checker.getSymbolAtLocation(node)
            const name = symbol ? symbols.get(symbol) : undefined
            const owner = name ? (owners.get(name) ?? 'language') : undefined
            if (name && owner) {
              const target = owner === 'operations' ? shortName(name) : name
              if (owner !== group) {
                if (ts.isTypeReferenceNode(node.parent))
                  return ts.factory.createQualifiedName(
                    ts.factory.createIdentifier(namespaces[owner]),
                    target,
                  )
                return ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier(namespaces[owner]),
                  target,
                )
              }
              if (target !== name) return ts.factory.createIdentifier(target)
            }
          }
          return ts.visitEachChild(node, visit, context)
        }
        return ts.visitNode(statement, visit) as ts.Statement
      },
    ])
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
    const body =
      groups[group]
        .map((statement, index) => {
          const text = printer.printNode(
            ts.EmitHint.Unspecified,
            transformed.transformed[index]!,
            source,
          )
          const name = declaredName(statement)
          return name && exports[group].has(name) && !/^export\s/u.test(text)
            ? `export ${text}`
            : text
        })
        .join('\n') + '\n'
    transformed.dispose()
    const imports: string[] = []
    for (const [owner] of used.get(group)!) {
      imports.push(
        `import * as ${namespaces[owner]} from ${JSON.stringify(moduleSpecifier(group, owner))};`,
      )
    }
    if (group === 'checks') {
      if (publicTypes.length)
        imports.push(
          `export type { ${publicTypes.join(', ')} } from ${JSON.stringify(moduleSpecifier('checks', 'runtime'))};`,
        )
      if (publicValues.length)
        imports.push(
          `export { ${publicValues.join(', ')} } from ${JSON.stringify(moduleSpecifier('checks', 'runtime'))};`,
        )
    }
    result[group] = imports.join('\n') + '\n' + body
  }
  return result
}
