// The SQL value and result types generated CHECK adapters share, each with what it names.
const declarations: Record<string, { dependencies: readonly string[]; source: string }> = {
  SqlText: {
    dependencies: [],
    source: 'type SqlText struct {\n\tValue string\n\tValid bool\n\tError string\n}\n',
  },
  SqlInteger: {
    dependencies: [],
    source: 'type SqlInteger struct {\n\tValue int64\n\tValid bool\n\tError string\n}\n',
  },
  SqlBoolean: {
    dependencies: [],
    source: 'type SqlBoolean struct {\n\tValue bool\n\tValid bool\n\tError string\n}\n',
  },
  SqlFloat: {
    dependencies: [],
    source: 'type SqlFloat struct {\n\tValue float64\n\tValid bool\n\tError string\n}\n',
  },
  EvalValue: {
    dependencies: [],
    source:
      'type EvalValue[T any] struct {\n\tCertain bool\n\tValue   T\n\t// Unimplemented marks an uncertain value the local evaluator does not compute although no\n\t// database state is needed; other uncertain values need the database.\n\tUnimplemented bool\n}\n',
  },
  EvalBool: {
    dependencies: ['EvalValue', 'SqlBoolean'],
    source: 'type EvalBool = EvalValue[SqlBoolean]\n',
  },
  evalBoolCertain: {
    dependencies: ['EvalBool'],
    source:
      'func evalBoolCertain(value SqlBoolean) EvalBool { return EvalBool{Certain: true, Value: value} }\n',
  },
  evalBoolUncertain: {
    dependencies: ['EvalBool'],
    source: 'func evalBoolUncertain() EvalBool { return EvalBool{} }\n',
  },
  evalBoolUnimplemented: {
    dependencies: ['EvalBool'],
    source: 'func evalBoolUnimplemented() EvalBool { return EvalBool{Unimplemented: true} }\n',
  },
}

export function goSqlRuntime(required: readonly string[], packageName = 'pgsidsql'): string {
  const included = new Set<string>()
  const output: string[] = []
  const include = (name: string) => {
    if (included.has(name)) return
    const declaration = declarations[name]
    if (!Object.hasOwn(declarations, name) || !declaration)
      throw new Error(`Missing Go SQL helper: ${name}`)
    included.add(name)
    for (const dependency of declaration.dependencies) include(dependency)
    output.push(declaration.source)
  }
  for (const name of required) include(name)
  return `package ${packageName}\n${output.join('\n')}`
}
