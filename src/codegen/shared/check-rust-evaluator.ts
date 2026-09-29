import { builtinMetadata } from '../../postgres/builtins/inventory.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'

type Input = { name: string; type: string; rustName: string; rustType: string }

export class UnsupportedCheckRustExpression extends Error {}

const rustType = (type: string): string => {
  if (type === 'pg_catalog.int4') return 'Int4Value'
  if (type === 'pg_catalog.text') return 'TextValue'
  if (type === 'pg_catalog.bool') return 'BoolValue'
  throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK input type: ${type}`)
}

const rustString = (input: string): string => {
  let encoded = '"'
  for (const character of input) {
    const code = character.codePointAt(0)!
    if (character === '\\' || character === '"') encoded += `\\${character}`
    else if (code === 0x0a) encoded += '\\n'
    else if (code === 0x0d) encoded += '\\r'
    else if (code === 0x09) encoded += '\\t'
    else if (code < 0x20 || code === 0x7f || code > 0x7e) encoded += `\\u{${code.toString(16)}}`
    else encoded += character
  }
  return `${encoded}"`
}

export function emitCheckRustEvaluator(
  expression: EvalBoolExpression,
  index?: number,
): {
  source: string
  entryName: string
  inputs: readonly Input[]
  callables: readonly string[]
  requiresRegex: boolean
} {
  if (index !== undefined && (!Number.isSafeInteger(index) || index < 0))
    throw new Error('Rust CHECK evaluator index must be a nonnegative integer')
  const inputs = new Map<string, Input>()
  const callables = new Set<string>()
  const definitions: string[] = []
  let next = 0
  let requiresRegex = false
  const entryName = index === undefined ? 'evaluate_check' : `evaluate_check_${index}`
  const partName = (number: number): string =>
    index === undefined ? `check_part_${number}` : `check_${index}_part_${number}`
  const input = (name: string, type: string): Input => {
    const existing = inputs.get(name)
    if (existing) {
      if (existing.type !== type) throw new Error(`Conflicting CHECK input type: ${name}`)
      return existing
    }
    const result = { name, type, rustName: `input_${inputs.size}`, rustType: rustType(type) }
    inputs.set(name, result)
    return result
  }
  const ordered = (names: ReadonlySet<string>): Input[] =>
    [...inputs.values()].filter((item) => names.has(item.name))
  const parameters = (names: ReadonlySet<string>): string =>
    ordered(names)
      .map((item) => `${item.rustName}: ${item.rustType}`)
      .join(', ')
  const arguments_ = (names: ReadonlySet<string>): string =>
    ordered(names)
      .map((item) => item.rustName)
      .join(', ')

  const emitScalar = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    const bind = (call: string): string => {
      const name = `value_${next++}`
      bindings.push(`    let ${name} = ${call};`)
      return name
    }
    if (node.kind === 'input') {
      const item = input(node.name, node.type)
      used.add(item.name)
      return { name: item.rustName, type: node.type }
    }
    if (node.kind === 'uncertain') {
      const kind = rustType(node.type)
      const helper =
        kind === 'Int4Value'
          ? 'int4_unknown'
          : kind === 'TextValue'
            ? 'text_unknown'
            : 'bool_unknown'
      return { name: bind(`${helper}()`), type: node.type }
    }
    if (node.kind === 'certain') {
      const value = node.expression
      if (value.kind === 'boolean') {
        const helper =
          value.value === null
            ? 'bool_null()'
            : `make_bool_value(${value.value ? 'true' : 'false'})`
        return { name: bind(helper), type: value.type }
      }
      if (value.kind === 'text')
        return {
          name: bind(
            value.value === null ? 'text_null()' : `make_text_value(${rustString(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'integer' && value.type === 'pg_catalog.int4') {
        if (value.value === null) return { name: bind('int4_null()'), type: value.type }
        if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value.value))
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK int4 literal: ${value.value}`,
          )
        const integer = BigInt(value.value)
        if (integer < -2147483648n || integer > 2147483647n)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK int4 literal: ${value.value}`,
          )
        const literal = integer === -2147483648n ? '-2147483647 - 1' : integer.toString()
        return { name: bind(`make_int4_value(${literal})`), type: value.type }
      }
      throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK constant: ${value.kind}`)
    }
    if (node.kind === 'null-test') {
      const operand = emitScalar(node.operand, bindings, used)
      const kind = rustType(operand.type)
      const helper =
        kind === 'Int4Value'
          ? 'int4_is_null'
          : kind === 'TextValue'
            ? 'text_is_null'
            : 'bool_is_null'
      const result = bind(`${helper}(${operand.name})`)
      return {
        name: node.negated ? bind(`bool_not_value(${result})`) : result,
        type: 'pg_catalog.bool',
      }
    }
    if (node.kind === 'call') {
      const call = node.call
      if ((call.kind !== 'operator' && call.kind !== 'function') || call.signature === null)
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK callable kind')
      const metadata = builtinMetadata(call.signature)
      const implementation =
        metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
      if (
        metadata.kind !== call.kind ||
        implementation.kind !== 'function' ||
        implementation.result !== call.type ||
        !implementation.strict ||
        implementation.volatility !== 'i' ||
        implementation.returnsSet ||
        implementation.args.length !== node.operands.length
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable: ${call.signature}`,
        )
      if (implementation.args.includes('pg_catalog.text') && call.collation !== 'C')
        throw new UnsupportedCheckRustExpression(
          `Rust CHECK text callable requires C collation: ${call.signature}`,
        )
      rustType(call.type)
      const operands = node.operands.map((operand) => emitScalar(operand, bindings, used))
      if (implementation.args.some((type, index) => operands[index]?.type !== type))
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable arguments: ${call.signature}`,
        )
      for (const type of implementation.args) rustType(type)
      callables.add(implementation.rustName)
      return {
        name: bind(
          `${implementation.rustName}(${operands.map((operand) => operand.name).join(', ')})`,
        ),
        type: call.type,
      }
    }
    throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK scalar: ${node.kind}`)
  }

  const emit = (node: EvalBoolExpression): { name: string; inputs: Set<string> } => {
    const name = partName(next++)
    let body: string
    let used: Set<string>
    if (node.kind === 'eval-boolean-logic') {
      if (node.operation === 'not') {
        if (node.operands.length !== 1)
          throw new UnsupportedCheckRustExpression('Expected unary NOT')
        const operand = emit(node.operands[0]!)
        used = new Set(operand.inputs)
        body = `
    let value = ${operand.name}(${arguments_(operand.inputs)});
    not_finish(value)
`
      } else {
        if (node.operands.length !== 2)
          throw new UnsupportedCheckRustExpression('Expected binary Boolean operation')
        const left = emit(node.operands[0]!)
        const right = emit(node.operands[1]!)
        used = new Set([...left.inputs, ...right.inputs])
        const stop = node.operation === 'and' ? 'and_stops' : 'or_stops'
        const finish = node.operation === 'and' ? 'and_finish' : 'or_finish'
        body = `
    let left = ${left.name}(${arguments_(left.inputs)});
    if ${stop}(left) {
        return left;
    }
    let right = ${right.name}(${arguments_(right.inputs)});
    ${finish}(left, right)
`
      }
    } else if (node.kind === 'eval-case') {
      if (node.branches.length === 0)
        throw new UnsupportedCheckRustExpression('Expected a CASE branch')
      used = new Set<string>()
      const statements: string[] = []
      for (const branch of node.branches) {
        const condition = emit(branch.when)
        const selected = emit(branch.then)
        for (const item of [...condition.inputs, ...selected.inputs]) used.add(item)
        const name = `value_${next++}`
        statements.push(`    let ${name} = ${condition.name}(${arguments_(condition.inputs)});`)
        statements.push(`    if case_guard_stops(${name}) {\n        return ${name};\n    }`)
        statements.push(
          `    if case_guard_takes(${name}) {\n        return ${selected.name}(${arguments_(selected.inputs)});\n    }`,
        )
      }
      const otherwise = emit(node.otherwise)
      for (const item of otherwise.inputs) used.add(item)
      statements.push(`    ${otherwise.name}(${arguments_(otherwise.inputs)})`)
      body = `\n${statements.join('\n')}\n`
    } else if (node.kind === 'eval-scalar') {
      used = new Set<string>()
      const bindings: string[] = []
      const result = emitScalar(node.expression, bindings, used)
      if (result.type !== 'pg_catalog.bool')
        throw new UnsupportedCheckRustExpression('A Rust CHECK scalar must return bool')
      body = `\n${bindings.join('\n')}${bindings.length ? '\n' : ''}    check_from_bool(${result.name})\n`
    } else if (node.kind === 'certain') {
      used = new Set<string>()
      const bindings: string[] = []
      const result = emitScalar({ kind: 'certain', expression: node.expression }, bindings, used)
      if (result.type !== 'pg_catalog.bool')
        throw new UnsupportedCheckRustExpression('A Rust CHECK constant must be bool')
      body = `\n${bindings.join('\n')}\n    check_from_bool(${result.name})\n`
    } else if (node.kind === 'uncertain') {
      used = new Set<string>()
      body = '\n    check_unknown()\n'
    } else if (node.kind === 'eval-regex') {
      if (
        node.subject.kind !== 'input' ||
        node.subject.type !== 'pg_catalog.text' ||
        node.negated ||
        node.collation !== 'C' ||
        (node.options?.syntax ?? 'advanced') !== 'advanced' ||
        (node.options?.caseSensitive ?? true) !== true ||
        (node.options?.expanded ?? false) !== false ||
        (node.options?.newline ?? 'ordinary') !== 'ordinary' ||
        node.flags !== undefined ||
        node.invalidFlags === true
      )
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK regex expression')
      const subject = input(node.subject.name, node.subject.type)
      const pattern = node.pattern
      if (
        typeof pattern !== 'string' &&
        (pattern.kind !== 'input' || pattern.type !== 'pg_catalog.text')
      )
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK regex pattern')
      const patternInput = typeof pattern === 'string' ? null : input(pattern.name, pattern.type)
      used = new Set(patternInput ? [subject.name, patternInput.name] : [subject.name])
      const patternName = patternInput?.rustName ?? 'pattern'
      const literal =
        typeof pattern === 'string'
          ? `    let pattern = make_text_value(${rustString(pattern)});\n`
          : ''
      body = `\n${literal}    let result = eval_regex(${subject.rustName}, ${patternName});\n    check_from_bool(result)\n`
      requiresRegex = true
    } else {
      throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK expression: ${node.kind}`)
    }
    definitions.push(`fn ${name}(${parameters(used)}) -> CheckOutcome {${body}}`)
    return { name, inputs: used }
  }

  const entry = emit(expression)
  return {
    source: `${definitions.join('\n\n')}\n\npub fn ${entryName}(${parameters(entry.inputs)}) -> CheckOutcome {\n    ${entry.name}(${arguments_(entry.inputs)})\n}\n`,
    entryName,
    inputs: ordered(entry.inputs),
    callables: [...callables],
    requiresRegex,
  }
}
