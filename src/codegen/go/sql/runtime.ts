import { goTextDependencies } from './text-runtime.js'
import { goScalarDependencies } from './scalar-runtime.js'
import { floatMathCopyright } from '../../../sql-semantics/float-math-license.js'
import { goFloatMathDependencies } from './float-math-runtime.js'
import { readFileSync } from 'node:fs'
import { numericMathCopyright } from '../../../sql-semantics/numeric-math-license.js'
import { goDecimalMathDependencies } from './decimal-math-runtime.js'
import { goDecimalDependencies } from './decimal-runtime.js'
import { goUuidDependencies } from './uuid-runtime.js'
import { goEnumDependencies } from './enum-runtime.js'
import { goArrayDependencies } from './array-runtime.js'
import { goJsonDependencies } from './json-runtime.js'
import { goTemporalDependencies } from './temporal-runtime.js'

const dependencies: Record<string, readonly string[]> = {
  float8WidthBucket: ['SqlFloat', 'sqlIntegerRange'],
  SqlInteger: [],
  SqlBoolean: [],
  SqlFloat: [],
  sqlIntegerInput: ['SqlInteger'],
  sqlIntegerRange: ['SqlInteger'],
  sqlIntegerAdd: ['SqlInteger'],
  sqlIntegerSub: ['SqlInteger'],
  sqlIntegerMul: ['SqlInteger'],
  sqlIntegerNeg: ['sqlIntegerRange'],
  sqlIntegerAbs: ['sqlIntegerNeg', 'sqlIntegerRange'],
  sqlIntegerCompare: ['SqlInteger'],
  sqlIntegerDiv: ['sqlIntegerRange'],
  sqlIntegerMod: ['sqlIntegerRange'],
  sqlIntegerMagnitude: [],
  sqlIntegerGcdMagnitude: [],
  sqlIntegerGcd: ['SqlInteger', 'sqlIntegerMagnitude', 'sqlIntegerGcdMagnitude'],
  sqlIntegerLcm: ['SqlInteger', 'sqlIntegerMagnitude', 'sqlIntegerGcdMagnitude'],
  sqlComparisonResult: ['SqlInteger', 'SqlBoolean'],
}
for (const width of ['int2', 'int4', 'int8']) {
  dependencies[`${width}Input`] = ['sqlIntegerInput']
  for (const name of ['Add', 'Sub', 'Mul', 'Div', 'Mod', 'Neg', 'Abs']) {
    dependencies[`${width}${name}`] = [`sqlInteger${name}`]
  }
  if (width !== 'int2') {
    dependencies[`${width}Gcd`] = ['sqlIntegerGcd']
    dependencies[`${width}Lcm`] = ['sqlIntegerLcm']
  }
  dependencies[`${width}Cast`] = ['sqlIntegerRange']
  for (const name of ['And', 'Or', 'Xor', 'Shl', 'Shr', 'Not', 'Identity'])
    dependencies[`${width}${name}`] = ['SqlInteger']
}
for (const name of ['Eq', 'Ne', 'Lt', 'Le', 'Gt', 'Ge']) {
  dependencies[`integer${name}`] = ['sqlIntegerCompare', 'sqlComparisonResult']
}

for (const name of ['Input', 'Add', 'Sub', 'Mul', 'Div', 'Neg', 'Abs', 'Identity']) {
  dependencies[`sqlFloat${name}`] =
    name === 'Input' || name === 'Neg' || name === 'Abs' || name === 'Identity'
      ? ['SqlFloat']
      : ['SqlFloat', 'sqlFloatRound']
  for (const width of ['float4', 'float8']) dependencies[`${width}${name}`] = [`sqlFloat${name}`]
}
dependencies.sqlFloatRound = []
for (const name of ['Ceil', 'Floor', 'Round', 'Trunc', 'Sign', 'Sqrt', 'Cbrt'])
  dependencies[`float8${name}`] = ['SqlFloat']
dependencies.sqlFloatCbrt = []
dependencies.float8Cbrt = ['SqlFloat', 'sqlFloatCbrt']
dependencies.sqlFloatCompare = ['SqlFloat', 'SqlInteger']
dependencies.sqlFloatToInteger = ['SqlFloat', 'SqlInteger']
for (const width of ['float4', 'float8']) {
  dependencies[`${width}FromInteger`] = ['SqlFloat', 'SqlInteger']
  dependencies[`${width}From${width === 'float4' ? 'Float8' : 'Float4'}`] = ['SqlFloat']
}
for (const width of ['int2', 'int4', 'int8'])
  dependencies[`${width}FromFloat`] = ['sqlFloatToInteger']
for (const name of ['Eq', 'Ne', 'Lt', 'Le', 'Gt', 'Ge'])
  dependencies[`float${name}`] = ['sqlFloatCompare', 'sqlComparisonResult']

Object.assign(dependencies, goScalarDependencies)
Object.assign(dependencies, goTextDependencies)
Object.assign(dependencies, goDecimalDependencies)
Object.assign(dependencies, goDecimalMathDependencies)
Object.assign(dependencies, goFloatMathDependencies)
Object.assign(dependencies, goUuidDependencies)
Object.assign(dependencies, goEnumDependencies)
Object.assign(dependencies, goArrayDependencies)
Object.assign(dependencies, goJsonDependencies)
Object.assign(dependencies, goTemporalDependencies)

export function goSqlRuntime(required: readonly string[], packageName = 'pgsidsql'): string {
  const declarations = new Map(
    [
      'integer',
      'floating-point',
      'decimal',
      'decimal-math',
      'float-math',
      'scalar',
      'text',
      'uuid',
      'enum',
      'array',
      'json',
      'temporal',
    ]
      .flatMap((asset) =>
        readFileSync(new URL(`./assets/${asset}.go`, import.meta.url), 'utf8')
          .split(/\n(?=type |func )/)
          .slice(1),
      )
      .map((declaration) => {
        const name = /^(?:type|func) (\w+)/.exec(declaration)![1]!
        return [name, declaration]
      }),
  )
  const included = new Set<string>()
  const output: string[] = []
  const include = (name: string) => {
    if (included.has(name)) return
    const dependency = dependencies[name]
    const declaration = declarations.get(name)
    if (!dependency || !declaration) throw new Error(`Missing Go SQL helper: ${name}`)
    included.add(name)
    for (const helper of dependency) include(helper)
    output.push(declaration)
  }
  for (const name of required) include(name)
  const body = output.join('\n')
  const imports = [
    'bytes',
    'math',
    'math/big',
    'sort',
    'strconv',
    'strings',
    'unicode/utf8',
  ].filter((name) => body.includes(`${name.split('/').at(-1)}.`))
  if (body.includes('decimal.')) imports.push('github.com/shopspring/decimal')
  const copyright =
    (included.has('SqlDecimalMath') ? '/*\n' + numericMathCopyright + '\n*/\n' : '') +
    (included.has('sqlFloatMathBits') ? '/*\n' + floatMathCopyright + '\n*/\n' : '')
  return `${copyright}package ${packageName}\n${imports.length ? `import (${imports.map((name) => `\n"${name}"`).join('')}\n)\n` : ''}${body}`
}
