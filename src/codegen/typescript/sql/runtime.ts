import ts from 'typescript'

// The result types generated CHECK adapters share, each with what it names.
const helpers: Record<string, { dependencies: readonly string[]; source: string }> = {
  EvalValue: {
    dependencies: [],
    source: `type EvalValue<T> =
  | { readonly certain: false; readonly unimplemented?: true }
  | { readonly certain: true; readonly value: T | null }`,
  },
  EvalBool: {
    dependencies: ['EvalValue'],
    source: `type EvalBool = EvalValue<boolean>`,
  },
  evalBoolCertain: {
    dependencies: ['EvalBool'],
    source: `function evalBoolCertain(value: boolean | null): EvalBool { return { certain: true, value } }`,
  },
  evalBoolUncertain: {
    dependencies: ['EvalBool'],
    source: `function evalBoolUncertain(): EvalBool { return { certain: false } }`,
  },
  evalBoolUnimplemented: {
    dependencies: ['EvalBool'],
    source: `function evalBoolUnimplemented(): EvalBool { return { certain: false, unimplemented: true } }`,
  },
}

export function typescriptSqlRuntime(required: readonly string[]): ts.Statement[] {
  const included = new Set<string>()
  const statements: ts.Statement[] = []
  const include = (name: string) => {
    if (included.has(name)) return
    const helper = helpers[name]
    if (!Object.hasOwn(helpers, name) || !helper)
      throw new Error(`Missing TypeScript SQL helper: ${name}`)
    included.add(name)
    for (const dependency of helper.dependencies) include(dependency)
    const parsed = ts.createSourceFile('runtime.ts', helper.source, ts.ScriptTarget.ES2022, true)
    const synthesize = (node: ts.Node): void => {
      ts.forEachChild(node, synthesize)
      ts.setTextRange(node, { pos: -1, end: -1 })
    }
    for (const statement of parsed.statements) {
      synthesize(statement)
      statements.push(statement)
    }
  }
  for (const name of required) include(name)
  return statements
}
