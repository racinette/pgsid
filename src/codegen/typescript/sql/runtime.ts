import { floatMathCopyright } from '../../../sql-semantics/float-math-license.js'
import { typescriptTextHelpers } from './text-runtime.js'
import { typescriptScalarHelpers } from './scalar-runtime.js'
import { typescriptFloatMathHelpers } from './float-math-runtime.js'
import ts from 'typescript'
import { numericMathCopyright } from '../../../sql-semantics/numeric-math-license.js'
import { typescriptDecimalMathHelpers } from './decimal-math-runtime.js'
import { typescriptFloatHelpers } from './floating-point-runtime.js'
import { typescriptDecimalHelpers } from './decimal-runtime.js'
import { typescriptUuidHelpers } from './uuid-runtime.js'
import { typescriptEnumHelpers } from './enum-runtime.js'
import { typescriptArrayHelpers } from './array-runtime.js'
import { typescriptJsonHelpers } from './json-runtime.js'
import { typescriptTemporalHelpers } from './temporal-runtime.js'

const helpers: Record<string, { dependencies: readonly string[]; source: string }> = {
  sqlIntegerError: {
    dependencies: [],
    source: `class SqlIntegerError extends Error {
      readonly code = '22003'
      constructor() { super('integer out of range') }
    }`,
  },
  sqlIntegerRange: {
    dependencies: ['sqlIntegerError'],
    source: `function sqlIntegerRange(value: bigint | null, min: bigint, max: bigint): bigint | null {
      if (value === null) return null
      if (value < min || value > max) throw new SqlIntegerError()
      return value
    }`,
  },
  sqlIntegerInput: {
    dependencies: ['sqlIntegerRange'],
    source: `function sqlIntegerInput(value: string | null, min: bigint, max: bigint): bigint | null {
      return sqlIntegerRange(value === null ? null : BigInt(value), min, max)
    }`,
  },
}

helpers.sqlDivisionByZeroError = {
  dependencies: [],
  source: `class SqlDivisionByZeroError extends Error {
    readonly code = '22012'
    constructor() { super('division by zero') }
  }`,
}
for (const [name, operator] of [
  ['Div', '/'],
  ['Mod', '%'],
] as const) {
  helpers[`sqlInteger${name}`] = {
    dependencies: ['sqlIntegerRange', 'sqlDivisionByZeroError'],
    source: `function sqlInteger${name}(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
      if (left === null || right === null) return null
      if (right === 0n) throw new SqlDivisionByZeroError()
      return sqlIntegerRange(left ${operator} right, min, max)
    }`,
  }
}
helpers.sqlIntegerGcdMagnitude = {
  dependencies: [],
  source: `function sqlIntegerGcdMagnitude(left: bigint, right: bigint): bigint {
    let a = left < 0n ? -left : left
    let b = right < 0n ? -right : right
    while (b !== 0n) { const remainder = a % b; a = b; b = remainder }
    return a
  }`,
}
helpers.sqlIntegerGcd = {
  dependencies: ['sqlIntegerGcdMagnitude', 'sqlIntegerRange'],
  source: `function sqlIntegerGcd(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null) return null
    return sqlIntegerRange(sqlIntegerGcdMagnitude(left, right), min, max)
  }`,
}
helpers.sqlIntegerLcm = {
  dependencies: ['sqlIntegerGcdMagnitude', 'sqlIntegerRange'],
  source: `function sqlIntegerLcm(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
    if (left === null || right === null) return null
    if (left === 0n || right === 0n) return 0n
    const product = (left / sqlIntegerGcdMagnitude(left, right)) * right
    return sqlIntegerRange(product < 0n ? -product : product, min, max)
  }`,
}

for (const [name, operator] of [
  ['Add', '+'],
  ['Sub', '-'],
  ['Mul', '*'],
] as const) {
  helpers[`sqlInteger${name}`] = {
    dependencies: ['sqlIntegerRange'],
    source: `function sqlInteger${name}(left: bigint | null, right: bigint | null, min: bigint, max: bigint): bigint | null {
      if (left === null || right === null) return null
      return sqlIntegerRange(left ${operator} right, min, max)
    }`,
  }
}
for (const [name, expression] of [
  ['Neg', '-value'],
  ['Abs', 'value < 0n ? -value : value'],
] as const) {
  helpers[`sqlInteger${name}`] = {
    dependencies: ['sqlIntegerRange'],
    source: `function sqlInteger${name}(value: bigint | null, min: bigint, max: bigint): bigint | null {
      if (value === null) return null
      return sqlIntegerRange(${expression}, min, max)
    }`,
  }
}
for (const [width, min, max] of [
  ['int2', '-32768n', '32767n'],
  ['int4', '-2147483648n', '2147483647n'],
  ['int8', '-9223372036854775808n', '9223372036854775807n'],
] as const) {
  helpers[`${width}Input`] = {
    dependencies: ['sqlIntegerInput'],
    source: `function ${width}Input(value: string | null): bigint | null { return sqlIntegerInput(value, ${min}, ${max}) }`,
  }
  for (const name of ['Add', 'Sub', 'Mul', 'Div', 'Mod'] as const) {
    helpers[`${width}${name}`] = {
      dependencies: [`sqlInteger${name}`],
      source: `function ${width}${name}(left: bigint | null, right: bigint | null): bigint | null { return sqlInteger${name}(left, right, ${min}, ${max}) }`,
    }
  }
  for (const name of ['Neg', 'Abs'] as const) {
    helpers[`${width}${name}`] = {
      dependencies: [`sqlInteger${name}`],
      source: `function ${width}${name}(value: bigint | null): bigint | null { return sqlInteger${name}(value, ${min}, ${max}) }`,
    }
  }
  if (width !== 'int2') {
    for (const name of ['Gcd', 'Lcm'])
      helpers[`${width}${name}`] = {
        dependencies: [`sqlInteger${name}`],
        source: `function ${width}${name}(left: bigint | null, right: bigint | null): bigint | null { return sqlInteger${name}(left, right, ${min}, ${max}) }`,
      }
  }
  helpers[`${width}Cast`] = {
    dependencies: ['sqlIntegerRange'],
    source: `function ${width}Cast(value: bigint | null): bigint | null { return sqlIntegerRange(value, ${min}, ${max}) }`,
  }
}
for (const [name, operator] of [
  ['Eq', '==='],
  ['Ne', '!=='],
  ['Lt', '<'],
  ['Le', '<='],
  ['Gt', '>'],
  ['Ge', '>='],
] as const) {
  helpers[`integer${name}`] = {
    dependencies: [],
    source: `function integer${name}(left: bigint | null, right: bigint | null): boolean | null {
      return left === null || right === null ? null : left ${operator} right
    }`,
  }
}

Object.assign(helpers, typescriptScalarHelpers)
Object.assign(helpers, typescriptTextHelpers)
Object.assign(helpers, typescriptFloatHelpers)
Object.assign(helpers, typescriptFloatMathHelpers)
Object.assign(helpers, typescriptDecimalHelpers)
Object.assign(helpers, typescriptDecimalMathHelpers)
Object.assign(helpers, typescriptUuidHelpers)
Object.assign(helpers, typescriptEnumHelpers)
Object.assign(helpers, typescriptArrayHelpers)
Object.assign(helpers, typescriptJsonHelpers)
Object.assign(helpers, typescriptTemporalHelpers)

for (const [width, bits, shiftMask] of [
  ['int2', 16, 31n],
  ['int4', 32, 31n],
  ['int8', 64, 63n],
] as const) {
  for (const [name, expression] of [
    ['And', 'left & right'],
    ['Or', 'left | right'],
    ['Xor', 'left ^ right'],
    ['Shl', `left << (right & ${shiftMask}n)`],
    ['Shr', `left >> (right & ${shiftMask}n)`],
  ]) {
    helpers[`${width}${name}`] = {
      dependencies: [],
      source: `function ${width}${name}(left: bigint | null, right: bigint | null): bigint | null {
        return left === null || right === null ? null : BigInt.asIntN(${bits}, ${expression})
      }`,
    }
  }
  for (const [name, expression] of [
    ['Not', '~value'],
    ['Identity', 'value'],
  ]) {
    helpers[`${width}${name}`] = {
      dependencies: [],
      source: `function ${width}${name}(value: bigint | null): bigint | null {
        return value === null ? null : BigInt.asIntN(${bits}, ${expression})
      }`,
    }
  }
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
    const parsed = ts.createSourceFile(
      'runtime.ts',
      helper.source,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    )
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
  if (included.has('SqlDecimalMath') && statements.length)
    ts.addSyntheticLeadingComment(
      statements[0]!,
      ts.SyntaxKind.MultiLineCommentTrivia,
      '\n' + numericMathCopyright + '\n',
      true,
    )
  if (included.has('sqlFloatMathBits') && statements.length)
    ts.addSyntheticLeadingComment(
      statements[0]!,
      ts.SyntaxKind.MultiLineCommentTrivia,
      '\n' + floatMathCopyright + '\n',
      true,
    )
  return statements
}
