import { posix } from 'node:path'
import ts from 'typescript'

// The generated CHECK runtime is a translation of the whole evaluator, while a project's checks
// call a small part of it. Pruning keeps the top-level declarations reachable from what the
// consumers of the runtime use, so a project ships, and Node loads, only that part.
//
// Reachability is read from syntax: a declaration reaches every top-level name of its own file
// that it mentions, and every `namespace.name` of a file it imports. A mention is counted
// whatever scope it resolves in, so a local that shadows a top-level name keeps that name too;
// pruning can keep too much but never too little. A namespace used other than through a member
// keeps every export of its file.

export type CheckTypescriptConsumer = {
  // A module that imports the runtime.
  source: string
  // The specifier prefix under which the consumer reaches the runtime files, such as
  // `./checks-rust/`.
  prefix: string
}

type File = { path: string; content: string }
type Key = string
const key = (path: string, name: string): Key => `${path}\0${name}`

// Identifiers in these positions name a member or property, not a top-level declaration.
function namesMember(node: ts.Identifier): boolean {
  const parent = node.parent
  return (
    ((ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isEnumMember(parent)) &&
      parent.name === node) ||
    (ts.isQualifiedName(parent) && parent.right === node)
  )
}

// A namespace's uses: the member names it is accessed through, or `null` when it is used as a
// whole value.
function namespaceUses(root: ts.Node, alias: string): Set<string> | null {
  const members = new Set<string>()
  let whole = false
  const visit = (node: ts.Node): void => {
    if (whole) return
    if (ts.isIdentifier(node) && node.text === alias && !namesMember(node)) {
      const parent = node.parent
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node)
        members.add(parent.name.text)
      else if (ts.isQualifiedName(parent) && parent.left === node) members.add(parent.right.text)
      else if (!ts.isNamespaceImport(parent)) whole = true
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return whole ? null : members
}

type Parsed = {
  source: ts.SourceFile
  // Namespace imports of other runtime files: alias to path.
  namespaces: Map<string, string>
  // Top-level declarations by name; overloads and merged declarations share a name.
  declarations: Map<string, ts.Statement[]>
  // Names re-exported from another runtime file: local name to [path, name].
  reexports: Map<string, [string, string]>
}

function declaredNames(statement: ts.Statement): string[] {
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  )
    return statement.name ? [statement.name.text] : []
  if (ts.isVariableStatement(statement))
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
    )
  return []
}

function resolve(from: string, specifier: string, paths: ReadonlySet<string>): string | null {
  if (!specifier.startsWith('.')) return null
  const path = posix.join(posix.dirname(from), specifier).replace(/\.js$/u, '.ts')
  return paths.has(path) ? path : null
}

function parse(file: File, paths: ReadonlySet<string>): Parsed {
  const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.ES2022, true)
  const parsed: Parsed = {
    source,
    namespaces: new Map(),
    declarations: new Map(),
    reexports: new Map(),
  }
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const target = resolve(file.path, (statement.moduleSpecifier as ts.StringLiteral).text, paths)
      const bindings = statement.importClause?.namedBindings
      if (!target) continue
      if (!bindings || !ts.isNamespaceImport(bindings) || statement.importClause?.name)
        throw new Error(`${file.path} imports the CHECK runtime other than as a namespace`)
      parsed.namespaces.set(bindings.name.text, target)
      continue
    }
    if (ts.isExportDeclaration(statement)) {
      const target =
        statement.moduleSpecifier &&
        resolve(file.path, (statement.moduleSpecifier as ts.StringLiteral).text, paths)
      if (!target || !statement.exportClause || !ts.isNamedExports(statement.exportClause))
        throw new Error(`${file.path} has an export the CHECK runtime pruner cannot follow`)
      for (const element of statement.exportClause.elements)
        parsed.reexports.set(element.name.text, [
          target,
          (element.propertyName ?? element.name).text,
        ])
      continue
    }
    const names = declaredNames(statement)
    // A statement without a name, such as one run for its effect, has no place in the
    // generated runtime; failing keeps pruning from dropping it unnoticed.
    if (names.length !== 1)
      throw new Error(`${file.path} has a top-level statement the CHECK runtime pruner cannot name`)
    const existing = parsed.declarations.get(names[0]!)
    if (existing) existing.push(statement)
    else parsed.declarations.set(names[0]!, [statement])
  }
  return parsed
}

// Every name a declaration mentions, in its own file or through a namespace.
function references(parsed: Parsed, path: string, statement: ts.Statement, out: Key[]): void {
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && !namesMember(node)) {
      const target = parsed.namespaces.get(node.text)
      if (target) {
        const parent = node.parent
        if (ts.isPropertyAccessExpression(parent) && parent.expression === node)
          out.push(key(target, parent.name.text))
        else if (ts.isQualifiedName(parent) && parent.left === node)
          out.push(key(target, parent.right.text))
        else out.push(key(target, '*'))
      } else if (parsed.declarations.has(node.text) || parsed.reexports.has(node.text))
        out.push(key(path, node.text))
    }
    ts.forEachChild(node, visit)
  }
  visit(statement)
}

// A kept statement keeps its own text; only a re-export that loses names is printed anew.
function printed(
  parsed: Parsed,
  path: string,
  kept: ReadonlySet<Key>,
  usedNamespaces: ReadonlySet<string>,
): string {
  const { source } = parsed
  const first = source.statements[0]
  const original = (statement: ts.Statement): string =>
    source.text
      .slice(
        statement === first ? statement.getStart() : statement.getFullStart(),
        statement.getEnd(),
      )
      .replace(/^\n+/u, '')
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const statements: string[] = []
  let declarations = 0
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings
      if (
        !bindings ||
        !ts.isNamespaceImport(bindings) ||
        !parsed.namespaces.has(bindings.name.text) ||
        usedNamespaces.has(bindings.name.text)
      )
        statements.push(original(statement))
      continue
    }
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause as ts.NamedExports
      const elements = clause.elements.filter((element) => kept.has(key(path, element.name.text)))
      if (!elements.length) continue
      declarations++
      statements.push(
        elements.length === clause.elements.length
          ? original(statement)
          : printer.printNode(
              ts.EmitHint.Unspecified,
              ts.factory.updateExportDeclaration(
                statement,
                statement.modifiers,
                statement.isTypeOnly,
                ts.factory.updateNamedExports(clause, elements),
                statement.moduleSpecifier,
                statement.attributes,
              ),
              source,
            ),
      )
      continue
    }
    if (kept.has(key(path, declaredNames(statement)[0]!))) {
      declarations++
      statements.push(original(statement))
    }
  }
  if (!declarations) return ''
  // What precedes the first statement heads the file, such as its license notices.
  const header = first ? source.text.slice(0, first.getStart()).trim() : ''
  return (header ? header + '\n' : '') + statements.join('\n') + '\n'
}

export function pruneCheckTypescript(
  files: readonly File[],
  consumers: readonly CheckTypescriptConsumer[],
): File[] {
  const paths = new Set(files.map((file) => file.path))
  const parsed = new Map(files.map((file) => [file.path, parse(file, paths)]))
  const pending: Key[] = []
  for (const consumer of consumers) {
    const source = ts.createSourceFile('consumer.ts', consumer.source, ts.ScriptTarget.ES2022, true)
    for (const statement of source.statements) {
      if (
        !(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) ||
        !statement.moduleSpecifier
      )
        continue
      const specifier = (statement.moduleSpecifier as ts.StringLiteral).text
      if (!specifier.startsWith(consumer.prefix)) continue
      const path = specifier.slice(consumer.prefix.length).replace(/\.js$/u, '.ts')
      if (!paths.has(path)) throw new Error(`${specifier} names no CHECK runtime file`)
      const bindings = ts.isImportDeclaration(statement)
        ? statement.importClause?.namedBindings
        : statement.exportClause
      if (ts.isImportDeclaration(statement) && statement.importClause?.name)
        throw new Error(`${specifier} is imported by default, which the runtime has no export for`)
      if (!bindings) {
        pending.push(key(path, '*'))
      } else if (ts.isNamespaceImport(bindings)) {
        const members = namespaceUses(source, bindings.name.text)
        if (members === null) pending.push(key(path, '*'))
        else for (const name of members) pending.push(key(path, name))
      } else if (ts.isNamespaceExport(bindings)) {
        pending.push(key(path, '*'))
      } else {
        for (const element of bindings.elements)
          pending.push(key(path, (element.propertyName ?? element.name).text))
      }
    }
  }
  const kept = new Set<Key>()
  const usedNamespaces = new Map<string, Set<string>>(files.map((file) => [file.path, new Set()]))
  while (pending.length) {
    const next = pending.pop()!
    if (kept.has(next)) continue
    kept.add(next)
    const [path, name] = next.split('\0') as [string, string]
    const file = parsed.get(path)!
    if (name === '*') {
      for (const declared of file.declarations.keys()) pending.push(key(path, declared))
      for (const declared of file.reexports.keys()) pending.push(key(path, declared))
      continue
    }
    const reexport = file.reexports.get(name)
    if (reexport) {
      pending.push(key(...reexport))
      continue
    }
    const statements = file.declarations.get(name)
    if (!statements) throw new Error(`The CHECK runtime has no ${name} in ${path}`)
    const found: Key[] = []
    for (const statement of statements) references(file, path, statement, found)
    for (const reference of found) {
      const [target] = reference.split('\0') as [string]
      if (target !== path)
        for (const [alias, aliased] of file.namespaces)
          if (aliased === target) usedNamespaces.get(path)!.add(alias)
      pending.push(reference)
    }
  }
  return files.flatMap((file) => {
    const content = printed(parsed.get(file.path)!, file.path, kept, usedNamespaces.get(file.path)!)
    return content ? [{ path: file.path, content }] : []
  })
}
