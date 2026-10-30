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

// What splitting a check against an already split runtime needs from it: the top-level names
// of each runtime group with their exports, the item behind each generated name, and the
// runtime values the checks entry re-exports.
export type CheckTypescriptFacts = {
  names: Record<Exclude<Group, 'checks'>, string[]>
  exports: Record<Exclude<Group, 'checks'>, string[]>
  declarers: Record<string, string>
  publicTypes: string[]
  publicValues: string[]
}

const runtimeGroups = ['regex', 'operations', 'runtime', 'language'] as const
const allGroups = [...runtimeGroups, 'checks'] as const

const moduleGroups: Record<string, Group> = {
  regex_engine: 'regex',
  pg_catalog: 'operations',
  checkruntime: 'runtime',
  checks: 'checks',
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

const groupSets = (): Record<Group, Set<string>> => ({
  regex: new Set(),
  operations: new Set(),
  runtime: new Set(),
  language: new Set(),
  checks: new Set(),
})

type Ownership = {
  owners: Map<string, Group>
  declarers: Map<string, string>
  declared: Record<Group, Set<string>>
  publicTypes: string[]
  publicValues: string[]
}

// Every generated name has exactly one owner; a second claim is an error rather than a silent
// replacement. Exports follow declared visibility, never use.
function own(items: readonly Item[], ownership: Ownership): void {
  const claim = (name: string, owner: Group, item: Item, exported: boolean) => {
    const previous = ownership.declarers.get(name)
    if (previous)
      throw new Error(
        `TypeScript name ${name} is generated for both ${previous} and ${item.module}::${item.name}`,
      )
    ownership.declarers.set(name, `${item.module}::${item.name}`)
    ownership.owners.set(name, owner)
    if (exported) ownership.declared[owner].add(name)
  }
  for (const item of items) {
    const owner = moduleGroups[item.module ?? '']
    if (!owner) throw new Error(`CHECK item has no supported module: ${item.name}`)
    const exported = item.visibility === 'public' || item.visibility === 'crate'
    if (item.kind === 'struct' || item.kind === 'enum') {
      const name = upper(item.name)
      claim(name, owner, item, exported)
      claim(`copy${name}`, owner, item, exported)
      claim(`equal${name}`, owner, item, exported)
      if (owner === 'runtime' && item.visibility === 'public') ownership.publicTypes.push(name)
    } else {
      const name = lower(item.name)
      claim(name, owner, item, exported)
      if (
        owner === 'runtime' &&
        item.visibility === 'public' &&
        [
          '/values.rs',
          '/array.rs',
          '/array_elements.rs',
          '/range.rs',
          '/multirange.rs',
          '/composite.rs',
        ].some((file) => item.sourceFile?.endsWith(file))
      )
        ownership.publicValues.push(name)
    }
  }
}

type Resolved = {
  source: ts.SourceFile
  checker: ts.TypeChecker
  symbols: Map<ts.Symbol, string>
  owners: Map<string, Group>
  names: Record<Group, Set<string>>
  exports: Record<Group, Set<string>>
  publicTypes: readonly string[]
  publicValues: readonly string[]
}

function render(resolved: Resolved, group: Group, statements: readonly ts.Statement[]): string {
  if (!statements.length) return ''
  const { source, checker, symbols, owners, names, exports } = resolved
  const dependencies: Group[] = []
  for (const owner of allGroups) {
    if (owner === group) continue
    const references = namesUsed(statements, names[owner], checker, symbols)
    if (references.length) dependencies.push(owner)
    for (const name of references)
      if (!exports[owner].has(name))
        throw new Error(`${name} is referenced from ${group} but not declared public in ${owner}`)
  }
  const transformed = ts.transform(
    [...statements],
    [
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
    ],
  )
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const body =
    statements
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
  for (const owner of dependencies) {
    imports.push(
      `import * as ${namespaces[owner]} from ${JSON.stringify(moduleSpecifier(group, owner))};`,
    )
  }
  if (group === 'checks') {
    if (resolved.publicTypes.length)
      imports.push(
        `export type { ${resolved.publicTypes.join(', ')} } from ${JSON.stringify(moduleSpecifier('checks', 'runtime'))};`,
      )
    if (resolved.publicValues.length)
      imports.push(
        `export { ${resolved.publicValues.join(', ')} } from ${JSON.stringify(moduleSpecifier('checks', 'runtime'))};`,
      )
  }
  return imports.join('\n') + '\n' + body
}

function program(files: readonly ts.SourceFile[]): ts.TypeChecker {
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, types: [] }
  const host = ts.createCompilerHost(options)
  host.getSourceFile = (name) => files.find((file) => file.fileName === name)
  return ts
    .createProgram(
      files.map((file) => file.fileName),
      options,
      host,
    )
    .getTypeChecker()
}

function bindingSymbol(statement: ts.Statement, checker: ts.TypeChecker): ts.Symbol | undefined {
  const binding = ts.isVariableStatement(statement)
    ? statement.declarationList.declarations[0]?.name
    : 'name' in statement
      ? (statement.name as ts.Node | undefined)
      : undefined
  return binding ? checker.getSymbolAtLocation(binding) : undefined
}

export function splitCheckTypescript(
  generated: string,
  items: readonly Item[],
): { regex: string; operations: string; runtime: string; language: string; checks: string } {
  return splitCheckTypescriptRuntime(generated, items).files
}

// Splits a whole generated program and records the facts a later checks-only split needs.
export function splitCheckTypescriptRuntime(
  generated: string,
  items: readonly Item[],
): {
  files: { regex: string; operations: string; runtime: string; language: string; checks: string }
  facts: CheckTypescriptFacts
} {
  const source = ts.createSourceFile('check.ts', generated, ts.ScriptTarget.ES2022, true)
  const checker = program([source])
  const symbols = new Map<ts.Symbol, string>()
  const ownership: Ownership = {
    owners: new Map(),
    declarers: new Map(),
    declared: groupSets(),
    publicTypes: [],
    publicValues: [],
  }
  own(items, ownership)
  const { owners, declared } = ownership
  const groups: Record<Group, ts.Statement[]> = {
    regex: [],
    operations: [],
    runtime: [],
    language: [],
    checks: [],
  }
  const names = groupSets()
  for (const statement of source.statements) {
    const name = declaredName(statement)
    const group = name ? (owners.get(name) ?? 'language') : 'language'
    groups[group].push(statement)
    if (name) names[group].add(name)
    // The language prelude is a fixed library whose declarations are all public.
    if (name && group === 'language') declared.language.add(name)
    const symbol = bindingSymbol(statement, checker)
    if (name && symbol) symbols.set(symbol, name)
  }
  const shortened = new Map<string, string>()
  for (const name of names.operations) {
    const short = shortName(name)
    const previous = shortened.get(short)
    if (previous && previous !== name)
      throw new Error(
        `TypeScript operation name ${short} is generated for both ${previous} and ${name}`,
      )
    shortened.set(short, name)
  }
  const resolved: Resolved = {
    source,
    checker,
    symbols,
    owners,
    names,
    exports: declared,
    publicTypes: ownership.publicTypes,
    publicValues: ownership.publicValues,
  }
  const files = {} as Record<Group, string>
  for (const group of allGroups) files[group] = render(resolved, group, groups[group])
  const runtimeNames = (sets: Record<Group, Set<string>>) =>
    Object.fromEntries(runtimeGroups.map((group) => [group, [...sets[group]].sort()])) as Record<
      Exclude<Group, 'checks'>,
      string[]
    >
  return {
    files,
    facts: {
      names: runtimeNames(names),
      exports: runtimeNames(declared),
      declarers: Object.fromEntries(
        [...ownership.declarers].filter(([name]) => owners.get(name) !== 'checks').sort(),
      ),
      publicTypes: ownership.publicTypes,
      publicValues: ownership.publicValues,
    },
  }
}

// Splits generated checks alone against the facts of a runtime split. The runtime's top-level
// names are declared as ambient stubs, so each identifier in the checks resolves by scope to
// the same declaration as in the whole program, and the checks module renders identically.
export function splitCheckTypescriptChecks(
  generated: string,
  items: readonly Item[],
  facts: CheckTypescriptFacts,
): string {
  const stubs = runtimeGroups
    .flatMap((group) => facts.names[group])
    .map((name) => `declare const ${name}: any;\ntype ${name} = any;`)
    .join('\n')
  const stubFile = ts.createSourceFile('runtime.d.ts', stubs, ts.ScriptTarget.ES2022, true)
  const source = ts.createSourceFile('check.ts', generated, ts.ScriptTarget.ES2022, true)
  const checker = program([stubFile, source])
  const owners = new Map<string, Group>()
  const names = groupSets()
  const exports = groupSets()
  for (const group of runtimeGroups) {
    for (const name of facts.names[group]) {
      owners.set(name, group)
      names[group].add(name)
    }
    for (const name of facts.exports[group]) exports[group].add(name)
  }
  const ownership: Ownership = {
    owners: new Map(),
    declarers: new Map(Object.entries(facts.declarers)),
    declared: exports,
    publicTypes: [],
    publicValues: [],
  }
  // A check may not reuse a prelude name either, since the prelude owns no items.
  for (const name of facts.names.language)
    if (!ownership.declarers.has(name)) ownership.declarers.set(name, 'langruntime::prelude')
  if (items.some((item) => item.module !== 'checks'))
    throw new Error('A checks-only TypeScript split takes only checks items')
  own(items, ownership)
  for (const [name, owner] of ownership.owners) owners.set(name, owner)
  const symbols = new Map<ts.Symbol, string>()
  for (const statement of stubFile.statements) {
    const name = declaredName(statement)
    const symbol = bindingSymbol(statement, checker)
    if (name && symbol) symbols.set(symbol, name)
  }
  const statements: ts.Statement[] = []
  for (const statement of source.statements) {
    const name = declaredName(statement)
    if (!name || ownership.owners.get(name) !== 'checks')
      throw new Error(
        `Generated checks contain a statement no check item owns: ${name ?? 'unnamed'}`,
      )
    statements.push(statement)
    names.checks.add(name)
    const symbol = bindingSymbol(statement, checker)
    if (symbol) symbols.set(symbol, name)
  }
  return render(
    {
      source,
      checker,
      symbols,
      owners,
      names,
      exports,
      publicTypes: facts.publicTypes,
      publicValues: facts.publicValues,
    },
    'checks',
    statements,
  )
}
