import { checkRustEntryName, type CheckConstraintIdentity } from './check-rust-names.js'
import { builtinCast, builtinMetadata } from '../../postgres/builtins/inventory.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'
import { supportsTextCallableCollation } from '../../sql-semantics/collation.js'
import { rustStringLiteral } from './rust-literals.js'
import {
  enumType,
  isBinaryTextRelabel,
  enumEqualityOperation,
  type EnumDefinition,
} from '../../sql-semantics/expressions.js'

type Input = {
  name: string
  type: string
  rustName: string
  rustType: string
  nullness?: true
  enum?: EnumDefinition
}

export class UnsupportedCheckRustExpression extends Error {}

const rustType = (type: string): string => {
  if (type === 'pg_catalog.bytea') return 'ByteaValue'
  if (type === 'pg_catalog.int2') return 'Int2Value'
  if (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') return 'NetworkValue'
  if (type === 'pg_catalog.int4') return 'Int4Value'
  if (type === 'pg_catalog.int8') return 'Int8Value'
  if (type === 'pg_catalog."numeric"') return 'NumericValue'
  if (type === 'pg_catalog.date') return 'DateValue'
  if (type === 'pg_catalog."timestamp"') return 'TimestampValue'
  if (type === 'pg_catalog.timestamptz') return 'TimestamptzValue'
  if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type))
    return 'TextValue'
  if (type === 'pg_catalog.bool') return 'BoolValue'
  if (type.startsWith('enum:')) return 'EnumValue'
  throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK input type: ${type}`)
}

export function emitCheckRustEvaluator(
  expression: EvalBoolExpression,
  identity?: CheckConstraintIdentity,
): {
  source: string
  entryName: string
  inputs: readonly Input[]
  callables: readonly string[]
  requiresRegex: boolean
} {
  const inputs = new Map<string, Input>()
  const callables = new Set<string>()
  let next = 0
  let requiresRegex = false
  const entryName = identity ? checkRustEntryName(identity) : 'evaluate_check'
  const fresh = (prefix: string): string => `${prefix}_${next++}`
  const indent = (lines: readonly string[]): string[] => lines.map((line) => `    ${line}`)
  const input = (
    name: string,
    type: string,
    nullness = false,
    definition?: EnumDefinition,
  ): Input => {
    if (type.startsWith('enum:') && !nullness && (!definition || enumType(definition) !== type))
      throw new UnsupportedCheckRustExpression(`Missing Rust CHECK enum definition: ${name}`)
    const key = JSON.stringify([name, nullness])
    const existing = inputs.get(key)
    if (existing) {
      if (existing.type !== type) throw new Error(`Conflicting CHECK input type: ${name}`)
      return existing
    }
    const baseName = /^[a-z][a-z0-9_]*$/u.test(name) ? `input_${name}` : `input_${inputs.size}`
    const preferred = nullness ? `${baseName}_nullness` : baseName
    let rustName = preferred
    let suffix = 0
    while (
      [...inputs.values()].some(
        (item) => item.rustName.replaceAll('_', '') === rustName.replaceAll('_', ''),
      )
    )
      rustName = `${preferred}_${++suffix}`
    const result: Input = {
      name,
      type,
      rustName,
      rustType: nullness ? 'BoolValue' : rustType(type),
      ...(nullness ? { nullness: true } : {}),
      ...(definition ? { enum: definition } : {}),
    }
    inputs.set(key, result)
    return result
  }
  const ordered = (names: ReadonlySet<string>): Input[] =>
    [...inputs.values()].filter((item) => names.has(item.name))
  const parameters = (names: ReadonlySet<string>): string =>
    ordered(names)
      .map((item) => `${item.rustName}: ${item.rustType}`)
      .join(', ')
  const ownedOperand = (operand: { name: string; type: string }): string =>
    ['TextValue', 'ByteaValue'].includes(rustType(operand.type))
      ? `${operand.name}.clone()`
      : operand.name

  const emitScalar = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    const bind = (call: string): string => {
      const name = fresh('value')
      bindings.push(`let ${name} = ${call};`)
      return name
    }
    const emitCall = (
      call: Extract<EvalExpression, { kind: 'call' }>['call'],
      operands: readonly { name: string; type: string }[],
      destination = bindings,
    ): { name: string; type: string } => {
      if (call.kind === 'cast' && call.signature === null) {
        if (
          operands.length !== 1 ||
          (operands[0]!.type !== call.type &&
            !isBinaryTextRelabel(operands[0]!.type, call.type) &&
            !(
              operands[0]!.type === 'pg_catalog.cidr' &&
              call.type === 'pg_catalog.inet' &&
              builtinCast(operands[0]!.type, call.type)?.method === 'b'
            ))
        )
          throw new UnsupportedCheckRustExpression('Invalid Rust CHECK relabel cast')
        return { ...operands[0]!, type: call.type }
      }
      if (call.signature === null)
        throw new UnsupportedCheckRustExpression('Unsupported Rust CHECK callable kind')
      if (call.kind === 'cast') {
        const conversion = operands.length === 1 ? builtinCast(operands[0]!.type, call.type) : null
        if (conversion?.method !== 'f' || conversion.implementation !== call.signature)
          throw new UnsupportedCheckRustExpression('Invalid Rust CHECK cast function')
      }
      const metadata = builtinMetadata(call.signature)
      const implementation =
        metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
      if (
        metadata.kind !== (call.kind === 'cast' ? 'function' : call.kind) ||
        implementation.kind !== 'function' ||
        implementation.result !== call.type ||
        !implementation.strict ||
        implementation.volatility !== 'i' ||
        implementation.returnsSet ||
        implementation.args.length !== operands.length
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable: ${call.signature}`,
        )
      if (
        implementation.args.some((type) =>
          ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type),
        ) &&
        !supportsTextCallableCollation(
          call.signature,
          call.kind === 'cast' ? undefined : call.collation,
        )
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK text collation: ${call.signature}`,
        )
      rustType(call.type)
      const enumCall = enumEqualityOperation(call.signature) !== null
      if (
        enumCall &&
        (operands[0]?.type !== operands[1]?.type || !operands[0]?.type.startsWith('enum:'))
      )
        throw new UnsupportedCheckRustExpression(
          `Rust CHECK enum identity mismatch: ${call.signature}`,
        )
      if (
        implementation.args.some((type, index) =>
          type === 'pg_catalog.anyenum' && enumCall
            ? !operands[index]?.type.startsWith('enum:')
            : operands[index]?.type !== type,
        )
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable arguments: ${call.signature}`,
        )
      for (const operand of operands) rustType(operand.type)
      callables.add(implementation.rustName)
      const name = fresh('value')
      destination.push(
        `let ${name} = ${implementation.rustName}(${operands.map((operand) => ownedOperand(operand)).join(', ')});`,
      )
      return { name, type: call.type }
    }
    if (node.kind === 'check') {
      if (node.expression.kind === 'eval-scalar')
        return emitScalar(node.expression.expression, bindings, used)
      if (node.expression.kind === 'certain')
        return emitScalar(
          { kind: 'certain', expression: node.expression.expression },
          bindings,
          used,
        )
      if (node.expression.kind === 'uncertain')
        return { name: bind('bool_unknown()'), type: 'pg_catalog.bool' }
      const outcome = emit(node.expression)
      bindings.push(...outcome.lines)
      for (const input of outcome.inputs) used.add(input)
      return { name: bind(`bool_from_check(${outcome.name})`), type: 'pg_catalog.bool' }
    }
    if (node.kind === 'input') {
      const item = input(node.name, node.type, false, node.enum)
      used.add(item.name)
      return { name: item.rustName, type: node.type }
    }
    if (node.kind === 'uncertain') {
      const kind = rustType(node.type)
      const helper = kind.slice(0, -'Value'.length).toLowerCase() + '_unknown'
      return { name: bind(`${helper}()`), type: node.type }
    }
    if (
      node.kind === 'text-to-date' ||
      node.kind === 'text-to-timestamp' ||
      node.kind === 'text-to-timestamptz' ||
      node.kind === 'text-to-network'
    ) {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.text')
        throw new UnsupportedCheckRustExpression('A SQL text cast requires text')
      const helper =
        node.kind === 'text-to-date'
          ? 'date_from_text'
          : node.kind === 'text-to-timestamp'
            ? 'timestamp_from_text'
            : node.kind === 'text-to-timestamptz'
              ? 'timestamptz_from_text'
              : node.type === 'pg_catalog.cidr'
                ? 'cidr_from_text'
                : 'network_from_text'
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'certain') {
      const value = node.expression
      if (
        value.kind === 'temporal' &&
        (value.type === 'pg_catalog.date' ||
          value.type === 'pg_catalog."timestamp"' ||
          value.type === 'pg_catalog.timestamptz')
      ) {
        const prefix =
          value.type === 'pg_catalog.date'
            ? 'date'
            : value.type === 'pg_catalog."timestamp"'
              ? 'timestamp'
              : 'timestamptz'
        if (value.value === null) return { name: bind(`${prefix}_null()`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`${prefix}_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'enum') {
        if (value.type !== enumType(value.enum))
          throw new UnsupportedCheckRustExpression('Rust CHECK enum literal identity mismatch')
        if (value.value === null) return { name: bind('enum_null()'), type: value.type }
        const order = value.enum.values.indexOf(value.value)
        if (order < 0 || order > 2147483647)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK enum label: ${value.value}`,
          )
        return { name: bind(`make_enum_value(${order})`), type: value.type }
      }
      if (value.kind === 'boolean') {
        const helper =
          value.value === null
            ? 'bool_null()'
            : `make_bool_value(${value.value ? 'true' : 'false'})`
        return { name: bind(helper), type: value.type }
      }
      if (value.kind === 'network')
        return {
          name: bind(
            value.value === null
              ? 'network_null()'
              : `${value.type === 'pg_catalog.cidr' ? 'make_cidr_value' : 'make_network_value'}(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'decimal')
        return {
          name: bind(
            value.value === null
              ? 'numeric_null()'
              : `make_numeric_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'bytea')
        return {
          name: bind(
            value.value === null
              ? 'bytea_null()'
              : `make_bytea_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'text')
        return {
          name: bind(
            value.value === null
              ? 'text_null()'
              : `make_text_value(${rustStringLiteral(value.value)})`,
          ),
          type: value.type,
        }
      if (value.kind === 'integer' && value.type === 'pg_catalog.int8') {
        if (value.value === null) return { name: bind('int8_null()'), type: value.type }
        if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value.value))
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK int8 literal: ${value.value}`,
          )
        const integer = BigInt(value.value)
        if (integer < -9223372036854775808n || integer > 9223372036854775807n)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK int8 literal: ${value.value}`,
          )
        return { name: bind(`make_int8_value(${integer}i64)`), type: value.type }
      }
      if (
        value.kind === 'integer' &&
        (value.type === 'pg_catalog.int2' || value.type === 'pg_catalog.int4')
      ) {
        const prefix = value.type === 'pg_catalog.int2' ? 'int2' : 'int4'
        const limit = value.type === 'pg_catalog.int2' ? 32767n : 2147483647n
        if (value.value === null) return { name: bind(`${prefix}_null()`), type: value.type }
        if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value.value))
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK ${prefix} literal: ${value.value}`,
          )
        const integer = BigInt(value.value)
        if (integer < -limit - 1n || integer > limit)
          throw new UnsupportedCheckRustExpression(
            `Unsupported Rust CHECK ${prefix} literal: ${value.value}`,
          )
        const literal = integer === -2147483648n ? '-2147483647 - 1' : integer.toString()
        return { name: bind(`make_${prefix}_value(${literal})`), type: value.type }
      }
      throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK constant: ${value.kind}`)
    }
    if (node.kind === 'input-null-test') {
      const item = input(node.name, node.type, true)
      used.add(item.name)
      return {
        name: node.negated ? bind(`bool_not_value(${item.rustName})`) : item.rustName,
        type: node.type,
      }
    }
    if (node.kind === 'null-test') {
      if (
        node.operand.kind === 'input' &&
        !node.operand.type.startsWith('enum:') &&
        ![
          'pg_catalog.inet',
          'pg_catalog.cidr',
          'pg_catalog.int2',
          'pg_catalog.int4',
          'pg_catalog.int8',
          'pg_catalog."numeric"',
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.bool',
        ].includes(node.operand.type)
      ) {
        const item = input(node.operand.name, node.operand.type, true)
        used.add(item.name)
        return {
          name: node.negated ? bind(`bool_not_value(${item.rustName})`) : item.rustName,
          type: node.type,
        }
      }
      const operand = emitScalar(node.operand, bindings, used)
      const kind = rustType(operand.type)
      const helper = kind.slice(0, -'Value'.length).toLowerCase() + '_is_null'
      const result = bind(`${helper}(${ownedOperand(operand)})`)
      return {
        name: node.negated ? bind(`bool_not_value(${result})`) : result,
        type: 'pg_catalog.bool',
      }
    }
    if (node.kind === 'call')
      return emitCall(
        node.call,
        node.operands.map((operand) => emitScalar(operand, bindings, used)),
      )
    if (node.kind === 'boolean-logic') {
      const outcome = emit({
        kind: 'eval-boolean-logic',
        operation: node.operation,
        operands: node.operands.map((expression) => ({ kind: 'eval-scalar', expression })),
      })
      bindings.push(...outcome.lines)
      for (const input of outcome.inputs) used.add(input)
      return { name: bind(`bool_from_check(${outcome.name})`), type: node.type }
    }
    if (node.kind === 'membership') {
      if (!node.groups.length || node.groups.some((group) => !group.length))
        throw new UnsupportedCheckRustExpression('Expected a membership list')
      const subject = emitScalar(node.subject, bindings, used)
      const finish = node.operation === 'or' ? 'or_finish' : 'and_finish'
      const stop = node.operation === 'or' ? 'or_stops' : 'and_stops'
      const emitGroup = (group: readonly EvalExpression[], lines: string[]): string => {
        const members = group.map((member) => emitScalar(member, lines, used))
        let result: string | null = null
        for (const member of members) {
          const comparison = emitCall(node.comparison, [subject, member], lines)
          const outcome = fresh('membership_comparison')
          lines.push(`let ${outcome} = check_from_bool(${comparison.name});`)
          if (result === null) result = outcome
          else {
            const combined = fresh('membership_group')
            lines.push(`let ${combined} = ${finish}(${result}, ${outcome});`)
            result = combined
          }
        }
        return result!
      }
      const first = emitGroup(node.groups[0]!, bindings)
      if (node.groups.length === 1)
        return { name: bind(`bool_from_check(${first})`), type: node.type }
      const name = fresh('membership_result')
      bindings.push(`let mut ${name}: CheckOutcome = ${first};`)
      for (const group of node.groups.slice(1)) {
        const lines: string[] = []
        const selected = emitGroup(group, lines)
        bindings.push(
          `if ${stop}(${name}) == false {`,
          ...indent(lines),
          `    ${name} = ${finish}(${name}, ${selected});`,
          '}',
        )
      }
      return { name: bind(`bool_from_check(${name})`), type: node.type }
    }
    if (node.kind === 'coalesce') {
      if (!node.operands.length)
        throw new UnsupportedCheckRustExpression('Expected a COALESCE argument')
      const kind = rustType(node.type)
      const prefix = kind.slice(0, -'Value'.length).toLowerCase()
      const first = emitScalar(node.operands[0]!, bindings, used)
      if (first.type !== node.type)
        throw new UnsupportedCheckRustExpression('COALESCE argument type mismatch')
      if (node.operands.length === 1) return first
      const name = fresh('coalesce_result')
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(first)};`)
      for (const operand of node.operands.slice(1)) {
        const nullness = bind(
          `${prefix}_is_null(${['TextValue', 'ByteaValue'].includes(kind) ? `${name}.clone()` : name})`,
        )
        const guard = bind(`check_from_bool(${nullness})`)
        const lines: string[] = []
        const selected = emitScalar(operand, lines, used)
        if (selected.type !== node.type)
          throw new UnsupportedCheckRustExpression('COALESCE argument type mismatch')
        bindings.push(
          `if case_guard_takes(${guard}) {`,
          ...indent(lines),
          `    ${name} = ${ownedOperand(selected)};`,
          '}',
        )
      }
      return { name, type: node.type }
    }
    if (node.kind === 'case') {
      if (!node.branches.length) throw new UnsupportedCheckRustExpression('Expected a CASE branch')
      const kind = rustType(node.type)
      const prefix = kind.slice(0, -'Value'.length).toLowerCase()
      const scrutinee = node.scrutinee
        ? emitScalar(node.scrutinee.expression, bindings, used)
        : null
      const name = fresh('case_result')
      bindings.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      const branchLines = (position: number): string[] => {
        const lines: string[] = []
        if (position === node.branches.length) {
          const otherwise = emitScalar(node.otherwise, lines, used)
          if (otherwise.type !== node.type)
            throw new UnsupportedCheckRustExpression('CASE result type mismatch')
          return [...lines, `${name} = ${ownedOperand(otherwise)};`]
        }
        const branch = node.branches[position]!
        let condition = emitScalar(branch.when, lines, used)
        if (scrutinee && node.scrutinee) {
          if (!branch.equality)
            throw new UnsupportedCheckRustExpression('Simple CASE needs equality for each WHEN')
          condition = emitCall(branch.equality, [scrutinee, condition], lines)
        }
        if (condition.type !== 'pg_catalog.bool')
          throw new UnsupportedCheckRustExpression('CASE guard must return bool')
        const guard = fresh('case_guard')
        lines.push(`let ${guard} = check_from_bool(${condition.name});`)
        const selectedLines: string[] = []
        const selected = emitScalar(branch.then, selectedLines, used)
        if (selected.type !== node.type)
          throw new UnsupportedCheckRustExpression('CASE result type mismatch')
        return [
          ...lines,
          `if case_guard_stops(${guard}) {`,
          `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
          `} else if case_guard_takes(${guard}) {`,
          ...indent(selectedLines),
          `    ${name} = ${ownedOperand(selected)};`,
          '} else {',
          ...indent(branchLines(position + 1)),
          '};',
        ]
      }
      bindings.push(...branchLines(0))
      return { name, type: node.type }
    }
    throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK scalar: ${node.kind}`)
  }

  type Emitted = { lines: string[]; name: string; inputs: Set<string> }
  const emit = (node: EvalBoolExpression): Emitted => {
    if (node.kind === 'eval-boolean-logic') {
      if (node.operation === 'not') {
        if (node.operands.length !== 1)
          throw new UnsupportedCheckRustExpression('Expected unary NOT')
        const operand = emit(node.operands[0]!)
        const name = fresh('not_result')
        return {
          lines: [...operand.lines, `let ${name} = not_finish(${operand.name});`],
          name,
          inputs: operand.inputs,
        }
      }
      if (node.operands.length !== 2)
        throw new UnsupportedCheckRustExpression('Expected binary Boolean operation')
      const left = emit(node.operands[0]!)
      const name = fresh(node.operation === 'and' ? 'and_result' : 'or_result')
      const right = emit(node.operands[1]!)
      const stop = node.operation === 'and' ? 'and_stops' : 'or_stops'
      const finish = node.operation === 'and' ? 'and_finish' : 'or_finish'
      return {
        lines: [
          ...left.lines,
          `let mut ${name}: CheckOutcome = ${left.name};`,
          `if ${stop}(${left.name}) == false {`,
          ...indent(right.lines),
          `    ${name} = ${finish}(${left.name}, ${right.name});`,
          '}',
        ],
        name,
        inputs: new Set([...left.inputs, ...right.inputs]),
      }
    }
    if (node.kind === 'eval-case') {
      if (node.branches.length === 0)
        throw new UnsupportedCheckRustExpression('Expected a CASE branch')
      const name = fresh('case_result')
      const used = new Set<string>()
      const branchLines = (position: number): string[] => {
        if (position === node.branches.length) {
          const otherwise = emit(node.otherwise)
          for (const input of otherwise.inputs) used.add(input)
          return [...otherwise.lines, `${name} = ${otherwise.name};`]
        }
        const branch = node.branches[position]!
        const condition = emit(branch.when)
        const selected = emit(branch.then)
        for (const input of condition.inputs) used.add(input)
        for (const input of selected.inputs) used.add(input)
        return [
          ...condition.lines,
          `if case_guard_stops(${condition.name}) {`,
          `    ${name} = ${condition.name};`,
          `} else if case_guard_takes(${condition.name}) {`,
          ...indent(selected.lines),
          `    ${name} = ${selected.name};`,
          '} else {',
          ...indent(branchLines(position + 1)),
          '};',
        ]
      }
      return {
        lines: [`let mut ${name}: CheckOutcome = check_unknown();`, ...branchLines(0)],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'eval-scalar') {
      const used = new Set<string>()
      const bindings: string[] = []
      const result = emitScalar(node.expression, bindings, used)
      if (result.type !== 'pg_catalog.bool')
        throw new UnsupportedCheckRustExpression('A Rust CHECK scalar must return bool')
      const name = fresh('scalar_result')
      return {
        lines: [...bindings, `let ${name} = check_from_bool(${result.name});`],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'certain') {
      const used = new Set<string>()
      const bindings: string[] = []
      const result = emitScalar({ kind: 'certain', expression: node.expression }, bindings, used)
      if (result.type !== 'pg_catalog.bool')
        throw new UnsupportedCheckRustExpression('A Rust CHECK constant must be bool')
      const name = fresh('constant_result')
      return {
        lines: [...bindings, `let ${name} = check_from_bool(${result.name});`],
        name,
        inputs: used,
      }
    }
    if (node.kind === 'uncertain') {
      const name = fresh('unknown_result')
      return { lines: [`let ${name} = check_unknown();`], name, inputs: new Set() }
    }
    if (node.kind === 'eval-regex') {
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
      const used = new Set(patternInput ? [subject.name, patternInput.name] : [subject.name])
      const patternName = patternInput?.rustName ?? fresh('pattern')
      const result = fresh('regex_result')
      const name = fresh('regex_outcome')
      requiresRegex = true
      return {
        lines: [
          ...(typeof pattern === 'string'
            ? [`let ${patternName} = make_text_value(${rustStringLiteral(pattern)});`]
            : []),
          `let ${result} = eval_regex(${subject.rustName}.clone(), ${patternName}.clone());`,
          `let ${name} = check_from_bool(${result});`,
        ],
        name,
        inputs: used,
      }
    }
    throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK expression: ${node.kind}`)
  }

  const entry = emit(expression)
  return {
    source: `pub fn ${entryName}(${parameters(entry.inputs)}) -> CheckOutcome {\n${indent(entry.lines).join('\n')}\n    ${entry.name}\n}\n`,
    entryName,
    inputs: ordered(entry.inputs),
    callables: [...callables],
    requiresRegex,
  }
}
