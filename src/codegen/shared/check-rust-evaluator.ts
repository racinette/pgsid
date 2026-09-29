import { builtinMetadata } from '../../postgres/builtins/inventory.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'

type Input = { name: string; type: string; rustName: string; rustType: string }

const rustType = (type: string): string => {
  if (type === 'pg_catalog.int4') return 'Int4Value'
  if (type === 'pg_catalog.text') return 'TextValue'
  throw new Error(`Unsupported Rust CHECK input type: ${type}`)
}

export function emitCheckRustEvaluator(expression: EvalBoolExpression): {
  source: string
  inputs: readonly Input[]
  callables: readonly string[]
} {
  const inputs = new Map<string, Input>()
  const callables = new Set<string>()
  const definitions: string[] = []
  let next = 0
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

  const emit = (node: EvalBoolExpression): { name: string; inputs: Set<string> } => {
    const name = `check_part_${next++}`
    let body: string
    let used: Set<string>
    if (node.kind === 'eval-boolean-logic' && node.operation === 'and') {
      if (node.operands.length !== 2) throw new Error('Expected binary AND')
      const left = emit(node.operands[0]!)
      const right = emit(node.operands[1]!)
      used = new Set([...left.inputs, ...right.inputs])
      body = `
    let left = ${left.name}(${arguments_(left.inputs)});
    if and_stops(left) {
        return left;
    }
    let right = ${right.name}(${arguments_(right.inputs)});
    and_finish(left, right)
`
    } else if (node.kind === 'eval-scalar') {
      const scalar = node.expression
      if (
        scalar.kind !== 'call' ||
        (scalar.call.kind !== 'operator' && scalar.call.kind !== 'function') ||
        scalar.call.type !== 'pg_catalog.bool' ||
        scalar.call.signature === null
      )
        throw new Error('Unsupported scalar CHECK expression')
      const metadata = builtinMetadata(scalar.call.signature)
      const implementation =
        metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
      if (
        implementation.kind !== 'function' ||
        implementation.result !== 'pg_catalog.bool' ||
        !implementation.strict ||
        implementation.args.length !== scalar.operands.length ||
        implementation.args.some((type, index) => {
          const operand = scalar.operands[index]
          return (
            (operand?.kind === 'input'
              ? operand.type
              : operand?.kind === 'certain'
                ? operand.expression.type
                : null) !== type
          )
        })
      )
        throw new Error(`Unsupported Rust CHECK callable: ${scalar.call.signature}`)
      callables.add(implementation.rustName)
      used = new Set<string>()
      const bindings: string[] = []
      const args = scalar.operands.map((operand, index) => {
        if (operand.kind === 'input') {
          const item = input(operand.name, operand.type)
          used.add(item.name)
          return item.rustName
        }
        if (
          operand.kind === 'certain' &&
          operand.expression.kind === 'integer' &&
          operand.expression.type === 'pg_catalog.int4' &&
          operand.expression.value !== null &&
          /^(?:0|[1-9][0-9]*)$/u.test(operand.expression.value) &&
          BigInt(operand.expression.value) <= 2147483647n
        ) {
          const binding = `argument_${index}`
          bindings.push(`    let ${binding} = make_int4_value(${operand.expression.value});`)
          return binding
        }
        throw new Error('Unsupported Rust CHECK callable argument')
      })
      body = `\n${bindings.join('\n')}${bindings.length ? '\n' : ''}    let result = ${implementation.rustName}(${args.join(', ')});\n    check_from_bool(result)\n`
    } else if (node.kind === 'eval-regex') {
      if (
        node.subject.kind !== 'input' ||
        node.subject.type !== 'pg_catalog.text' ||
        typeof node.pattern === 'string' ||
        node.pattern.kind !== 'input' ||
        node.pattern.type !== 'pg_catalog.text' ||
        node.negated ||
        node.collation !== 'C' ||
        node.options?.syntax !== 'advanced' ||
        node.options.caseSensitive !== true ||
        node.options.expanded !== false ||
        node.options.newline !== 'ordinary'
      )
        throw new Error('Unsupported Rust CHECK regex expression')
      const subject = input(node.subject.name, node.subject.type)
      const pattern = input(node.pattern.name, node.pattern.type)
      used = new Set([subject.name, pattern.name])
      body = `\n    let result = eval_regex(${subject.rustName}, ${pattern.rustName});\n    check_from_bool(result)\n`
    } else {
      throw new Error(`Unsupported Rust CHECK expression: ${node.kind}`)
    }
    definitions.push(`fn ${name}(${parameters(used)}) -> CheckOutcome {${body}}`)
    return { name, inputs: used }
  }

  const entry = emit(expression)
  return {
    source: `${definitions.join('\n\n')}\n\npub fn evaluate_check(${parameters(entry.inputs)}) -> CheckOutcome {\n    ${entry.name}(${arguments_(entry.inputs)})\n}\n`,
    inputs: ordered(entry.inputs),
    callables: [...callables],
  }
}
