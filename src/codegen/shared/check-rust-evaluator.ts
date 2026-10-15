import { checkRustEntryName, type CheckConstraintIdentity } from './check-rust-names.js'
import { builtinCast, builtinMetadata, builtinTypeIO } from '../../postgres/builtins/inventory.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'
import { supportsTextCallableCollation } from '../../sql-semantics/collation.js'
import { rustStringLiteral } from './rust-literals.js'
import {
  constantCheckExpression,
  constantScalarExpression,
  strictNullPreparation,
  nullifNullPreparation,
  type ConstantPreparation,
} from './check-rust-constants.js'
import {
  enumType,
  isOidType,
  isOidAliasType,
  isSnapshotType,
  isBinaryTextRelabel,
  isBinaryBitRelabel,
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

const rustValuePrefix = (kind: string): string =>
  kind
    .slice(0, -'Value'.length)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()

const jsonbConversionHelpers = new Map<string, string>(
  (
    [
      [['pg_catalog.bool'], 'bool'],
      [
        ['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog."numeric"'],
        'numeric',
      ],
      [
        [
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
          'pg_catalog.refcursor',
        ],
        'text',
      ],
      [['pg_catalog."json"'], 'json'],
      [['pg_catalog.jsonb'], 'jsonb'],
      [['pg_catalog.float4'], 'float4'],
      [['pg_catalog.float8'], 'float8'],
      [['pg_catalog.uuid'], 'uuid'],
      [['pg_catalog.oid'], 'oid'],
      [['pg_catalog.inet'], 'inet'],
      [['pg_catalog.cidr'], 'cidr'],
      [['pg_catalog.macaddr'], 'macaddr'],
      [['pg_catalog.macaddr8'], 'macaddr8'],
      [['pg_catalog."bit"', 'pg_catalog.varbit'], 'bit'],
      [['pg_catalog."time"'], 'time'],
      [['pg_catalog.timetz'], 'timetz'],
      [['pg_catalog.date'], 'date'],
      [['pg_catalog."timestamp"'], 'timestamp'],
      [['pg_catalog.timestamptz'], 'timestamptz'],
      [['pg_catalog.xid'], 'xid'],
      [['pg_catalog.cid'], 'cid'],
      [['pg_catalog.xid8'], 'xid8'],
      [['pg_catalog.pg_lsn'], 'pg_lsn'],
      [['pg_catalog.tid'], 'tid'],
      [['pg_catalog.pg_snapshot', 'pg_catalog.txid_snapshot'], 'snapshot'],
      [['pg_catalog."char"'], 'internal_char'],
      [
        [
          'pg_catalog.regclass',
          'pg_catalog.regcollation',
          'pg_catalog.regconfig',
          'pg_catalog.regdictionary',
          'pg_catalog.regnamespace',
          'pg_catalog.regproc',
          'pg_catalog.regprocedure',
          'pg_catalog.regrole',
          'pg_catalog.regtype',
        ],
        'oid_alias',
      ],
      [['pg_catalog.regoper', 'pg_catalog.regoperator'], 'operator_alias'],
      [['pg_catalog.bytea'], 'bytea'],
      [['pg_catalog.money'], 'money'],
      [['pg_catalog."interval"'], 'interval'],
      [['pg_catalog.point'], 'point'],
      [['pg_catalog.line'], 'line'],
      [['pg_catalog.lseg'], 'lseg'],
      [['pg_catalog.box'], 'box'],
      [['pg_catalog.circle'], 'circle'],
      [['pg_catalog.path'], 'path'],
      [['pg_catalog.polygon'], 'polygon'],
    ] as const
  ).flatMap(([types, suffix]) =>
    types.map((type) => [type, 'jsonb_input_from_' + suffix] as const),
  ),
)

export const jsonbConversionHelper = (type: string): string | undefined =>
  type.startsWith('enum:') ? 'jsonb_input_from_enum' : jsonbConversionHelpers.get(type)

export const isJsonbBuilder = (
  item: ReturnType<typeof builtinMetadata>,
): item is ReturnType<typeof builtinMetadata> & {
  kind: 'function'
  name: 'jsonb_build_array' | 'jsonb_build_object'
} =>
  item.kind === 'function' &&
  item.schema === 'pg_catalog' &&
  ['jsonb_build_array', 'jsonb_build_object'].includes(item.name) &&
  item.result === 'pg_catalog.jsonb' &&
  !item.strict &&
  !item.returnsSet &&
  item.volatility === 's' &&
  ((item.args.length === 0 && item.variadic === null) ||
    (item.args.length === 1 &&
      item.args[0] === 'pg_catalog."any"' &&
      item.variadic === 'pg_catalog."any"'))

export class UnsupportedCheckRustExpression extends Error {}

const rustType = (type: string): string => {
  if (type === 'pg_catalog."json"') return 'JsonValue'
  if (type === 'pg_catalog.jsonb') return 'JsonbValue'
  if (type === 'pg_catalog."bit"' || type === 'pg_catalog.varbit') return 'BitValue'
  if (type === 'pg_catalog.uuid') return 'UuidValue'
  if (type === 'pg_catalog.bytea') return 'ByteaValue'
  if (type === 'pg_catalog.macaddr') return 'MacaddrValue'
  if (type === 'pg_catalog.macaddr8') return 'Macaddr8Value'
  if (type === 'pg_catalog.int2') return 'Int2Value'
  if (type === 'pg_catalog.inet' || type === 'pg_catalog.cidr') return 'NetworkValue'
  if (type === 'pg_catalog.int4') return 'Int4Value'
  if (type === 'pg_catalog.int8') return 'Int8Value'
  if (type === 'pg_catalog.float4') return 'Float4Value'
  if (type === 'pg_catalog.float8') return 'Float8Value'
  if (type === 'pg_catalog.point') return 'PointValue'
  if (type === 'pg_catalog.line') return 'LineValue'
  if (type === 'pg_catalog.lseg') return 'LsegValue'
  if (type === 'pg_catalog.money') return 'MoneyValue'
  if (type === 'pg_catalog.xid') return 'XidValue'
  if (type === 'pg_catalog.cid') return 'CidValue'
  if (type === 'pg_catalog.pg_lsn') return 'PgLsnValue'
  if (type === 'pg_catalog."char"') return 'InternalCharValue'
  if (type === 'pg_catalog.tid') return 'TidValue'
  if (type === 'pg_catalog.xid8') return 'Xid8Value'
  if (isSnapshotType(type)) return 'SnapshotValue'
  if (isOidType(type)) return 'OidValue'
  if (type === 'pg_catalog.polygon') return 'PolygonValue'
  if (type === 'pg_catalog.path') return 'PathValue'
  if (type === 'pg_catalog.circle') return 'CircleValue'
  if (type === 'pg_catalog.box') return 'BoxValue'
  if (type === 'pg_catalog."numeric"') return 'NumericValue'
  if (type === 'pg_catalog."time"') return 'TimeValue'
  if (type === 'pg_catalog.timetz') return 'TimetzValue'
  if (type === 'pg_catalog."interval"') return 'IntervalValue'
  if (type === 'pg_catalog.date') return 'DateValue'
  if (type === 'pg_catalog."timestamp"') return 'TimestampValue'
  if (type === 'pg_catalog.timestamptz') return 'TimestamptzValue'
  if (
    [
      'pg_catalog.refcursor',
      'pg_catalog.name',
      'pg_catalog.text',
      'pg_catalog."varchar"',
      'pg_catalog.bpchar',
    ].includes(type)
  )
    return 'TextValue'
  if (type === 'pg_catalog.bool') return 'BoolValue'
  if (type.startsWith('enum:')) return 'EnumValue'
  throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK input type: ${type}`)
}

export type CheckExecutionContext = {
  defaultCollation?: 'C'
  serverEncoding?: 'UTF8'
}

export function emitCheckRustEvaluator(
  expression: EvalBoolExpression,
  identity?: CheckConstraintIdentity,
  executionContext: CheckExecutionContext = {},
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
  const constantDeclarations: string[] = []
  const constantLines: string[] = []
  const literalLines: string[] = []
  let valueLiteralDepth = 0
  let preparationLines = constantLines
  const preparationState = 'constant_preparation'
  let preparationDepth = 0
  let constantOperandDepth = 0
  const capturePreparation = <T>(emit: () => T): { value: T; lines: string[] } => {
    const outer = preparationLines
    const lines: string[] = []
    preparationLines = lines
    try {
      return { value: emit(), lines }
    } finally {
      preparationLines = outer
    }
  }
  const preparedGuard = (lines: readonly string[], name: string): string => {
    const guard = fresh('prepared_guard')
    constantDeclarations.push(`let mut ${guard}: CheckOutcome = check_unknown();`)
    preparationLines.push(
      ...lines,
      `${guard} = ${name};`,
      `${preparationState} = constant_finish(${preparationState}, ${guard});`,
    )
    return guard
  }
  const prepareBranches = (
    constant: boolean,
    lines: readonly string[],
    guardName: string,
    selected: readonly string[],
    otherwise: readonly string[],
  ): string | null => {
    if (!selected.length && !otherwise.length) return null
    if (!constant) {
      preparationLines.push(...selected, ...otherwise)
      return null
    }
    const guard = preparedGuard(lines, guardName)
    preparationLines.push(
      `if case_guard_stops(${guard}) == false {`,
      `    if case_guard_takes(${guard}) {`,
      ...indent(indent(selected)),
      '    } else {',
      ...indent(indent(otherwise)),
      '    };',
      '};',
    )
    return guard
  }
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
    [
      'JsonValue',
      'JsonbValue',
      'SnapshotValue',
      'PolygonValue',
      'PathValue',
      'TextValue',
      'ByteaValue',
      'BitValue',
      'NumericValue',
    ].includes(rustType(operand.type))
      ? `${operand.name}.clone()`
      : operand.name
  const scalarType = (operand: EvalExpression): string =>
    operand.kind === 'certain'
      ? operand.expression.type
      : operand.kind === 'call'
        ? operand.call.type
        : operand.kind === 'regex-count'
          ? 'pg_catalog.int4'
          : operand.type

  const emitScalar = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    if (
      valueLiteralDepth === 0 &&
      (node.kind === 'interval-literal' ||
        (node.kind === 'certain' &&
          (node.expression.kind === 'point' ||
            node.expression.kind === 'json' ||
            node.expression.kind === 'jsonb' ||
            (node.expression.kind === 'temporal' &&
              (node.expression.type === 'pg_catalog."interval"' ||
                node.expression.type === 'pg_catalog."time"' ||
                node.expression.type === 'pg_catalog.timetz'))) &&
          node.expression.value !== null))
    ) {
      valueLiteralDepth++
      preparationDepth++
      let value: { name: string; type: string }
      try {
        value = emitScalar(node, literalLines, used)
      } finally {
        preparationDepth--
        valueLiteralDepth--
      }
      const prefix = rustValuePrefix(rustType(value.type))
      const name = fresh(`${prefix}_literal`)
      constantDeclarations.push(`let mut ${name}: ${rustType(value.type)} = ${prefix}_unknown();`)
      literalLines.push(`${name} = ${value.name};`)
      return { name, type: value.type }
    }
    if (
      constantOperandDepth > 0 &&
      preparationDepth === 0 &&
      node.kind !== 'certain' &&
      constantScalarExpression(node)
    ) {
      preparationDepth++
      let value: { name: string; type: string }
      try {
        value = emitScalar(node, preparationLines, used)
      } finally {
        preparationDepth--
      }
      const kind = rustType(value.type)
      const prefix = rustValuePrefix(kind)
      const name = fresh('prepared_operand')
      constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      preparationLines.push(`${name} = ${ownedOperand(value)};`)
      return { name, type: value.type }
    }
    const value = emitScalarInner(node, bindings, used)
    if (preparationDepth > 0) {
      const prefix = rustValuePrefix(rustType(value.type))
      const nullness = fresh('prepared_value_nullness')
      const state = fresh('prepared_value_state')
      bindings.push(
        `let ${nullness} = ${prefix}_is_null(${ownedOperand(value)});`,
        `let ${state} = check_from_bool(${nullness});`,
        `${preparationState} = constant_finish(${preparationState}, ${state});`,
      )
    }
    return value
  }
  const emitPreparedOperand = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    constantOperandDepth++
    try {
      return emitScalar(node, bindings, used)
    } finally {
      constantOperandDepth--
    }
  }
  const emitScalarInner = (
    node: EvalExpression,
    bindings: string[],
    used: Set<string>,
  ): { name: string; type: string } => {
    const bind = (call: string): string => {
      const name = fresh('value')
      bindings.push(`let ${name} = ${call};`)
      return name
    }
    const emitConstantNull = (
      type: string,
      preparation: readonly ConstantPreparation[],
    ): { name: string; type: string } => {
      const kind = rustType(type)
      const prefix = rustValuePrefix(kind)
      const guard = fresh('constant_guard')
      const initial = fresh('constant_start')
      preparationLines.push(`let ${initial} = make_bool_value(true);`)
      preparationLines.push(`let mut ${guard}: CheckOutcome = check_from_bool(${initial});`)
      const prepareExpression = (step: ConstantPreparation): void => {
        let value: { name: string; type: string }
        preparationDepth++
        try {
          value = emitScalar(step.expression, preparationLines, used)
        } finally {
          preparationDepth--
        }
        const operandPrefix = rustValuePrefix(rustType(value.type))
        const state = fresh('constant_state')
        if (step.kind === 'value' || step.test === 'null') {
          const nullness = fresh('constant_nullness')
          preparationLines.push(
            `let ${nullness} = ${operandPrefix}_is_null(${ownedOperand(value)});`,
            `let ${state} = check_from_bool(${nullness});`,
          )
        } else {
          if (value.type !== 'pg_catalog.bool')
            throw new UnsupportedCheckRustExpression('Constant preparation guard must return bool')
          preparationLines.push(`let ${state} = check_from_bool(${value.name});`)
        }
        preparationLines.push(`${guard} = constant_finish(${guard}, ${state});`)
        if (step.kind === 'guard') {
          const selected = capturePreparation(() => step.selected.forEach(prepareExpression))
          const otherwise = capturePreparation(() => step.otherwise.forEach(prepareExpression))
          const condition =
            step.test === 'and'
              ? `and_stops(${state}) == false`
              : step.test === 'or'
                ? `or_stops(${state}) == false`
                : `case_guard_takes(${state})`
          preparationLines.push(
            `if case_guard_stops(${state}) == false {`,
            `    if ${condition} {`,
            ...indent(indent(selected.lines)),
            '    } else {',
            ...indent(indent(otherwise.lines)),
            '    };',
            '};',
          )
        }
      }
      preparation.forEach(prepareExpression)
      const name = fresh('constant_null')
      constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
      preparationLines.push(
        `${name} = ${prefix}_null();`,
        `if case_guard_stops(${guard}) {`,
        `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
        '};',
        `${preparationState} = constant_finish(${preparationState}, ${guard});`,
      )
      return { name, type }
    }
    const emitCall = (
      call: Extract<EvalExpression, { kind: 'call' }>['call'],
      operands: readonly { name: string; type: string }[],
      destination = bindings,
      folded?: { name: string; type: string },
    ): { name: string; type: string } => {
      if (call.kind === 'cast' && call.signature === null) {
        if (operands.length === 1 && builtinCast(operands[0]!.type, call.type)?.method === 'b') {
          const input = operands[0]!
          const helper =
            input.type === 'pg_catalog.int4' && isOidType(call.type)
              ? 'oid_from_int4'
              : isOidType(input.type) && call.type === 'pg_catalog.int4'
                ? 'oid_to_int4'
                : null
          if (helper) {
            if (folded) return folded
            const name = fresh('value')
            destination.push(`let ${name} = ${helper}(${input.name});`)
            return { name, type: call.type }
          }
        }
        if (
          operands.length !== 1 ||
          (operands[0]!.type !== call.type &&
            !isBinaryTextRelabel(operands[0]!.type, call.type) &&
            !isBinaryBitRelabel(operands[0]!.type, call.type) &&
            !(
              isOidType(operands[0]!.type) &&
              isOidType(call.type) &&
              builtinCast(operands[0]!.type, call.type)?.method === 'b'
            ) &&
            !(
              operands[0]!.type === 'pg_catalog.cidr' &&
              call.type === 'pg_catalog.inet' &&
              builtinCast(operands[0]!.type, call.type)?.method === 'b'
            ))
        )
          throw new UnsupportedCheckRustExpression('Invalid Rust CHECK relabel cast')
        return folded ?? { ...operands[0]!, type: call.type }
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
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        ['jsonb_cmp', 'jsonb_lt', 'jsonb_le', 'jsonb_gt', 'jsonb_ge'].includes(
          implementation.name,
        ) &&
        implementation.args.length === 2 &&
        implementation.args.every((type) => type === 'pg_catalog.jsonb') &&
        (executionContext.defaultCollation !== 'C' || executionContext.serverEncoding !== 'UTF8')
      )
        throw new UnsupportedCheckRustExpression(
          'JSONB ordering requires declared database default collation C and server encoding UTF8',
        )
      const jsonbConversion =
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'to_jsonb' &&
        implementation.args.length === 1 &&
        implementation.args[0] === 'pg_catalog.anyelement' &&
        implementation.result === 'pg_catalog.jsonb' &&
        implementation.strict &&
        implementation.volatility === 's'
      const jsonbBuilder =
        isJsonbBuilder(implementation) &&
        (implementation.args.length === 0 ? operands.length === 0 : operands.length > 0)
      const enumOperands = implementation.args.flatMap((type, index) =>
        type === 'pg_catalog.anyenum' ? [operands[index]?.type] : [],
      )
      const enumCall = enumOperands.length > 0
      const enumIdentity = enumOperands[0]
      const resultType =
        implementation.result === 'pg_catalog.anyenum' ? enumIdentity : implementation.result
      if (
        metadata.kind !== (call.kind === 'cast' ? 'function' : call.kind) ||
        implementation.kind !== 'function' ||
        resultType !== call.type ||
        (!implementation.strict &&
          !jsonbBuilder &&
          !(implementation.schema === 'pg_catalog' && implementation.name === 'overlaps')) ||
        (implementation.volatility !== 'i' &&
          !jsonbConversion &&
          !jsonbBuilder &&
          !(
            (['namesend', 'textsend'].includes(implementation.name) &&
              implementation.schema === 'pg_catalog' &&
              implementation.args.length === 1 &&
              implementation.args[0] ===
                (implementation.name === 'namesend' ? 'pg_catalog.name' : 'pg_catalog.text') &&
              implementation.result === 'pg_catalog.bytea') ||
            (isOidAliasType(implementation.result) &&
              (implementation.name === 'to_' + implementation.result.slice('pg_catalog.'.length) ||
                builtinCast('pg_catalog.text', implementation.result)?.implementation ===
                  call.signature))
          )) ||
        implementation.returnsSet ||
        (!jsonbBuilder && implementation.args.length !== operands.length)
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable: ${call.signature}`,
        )
      if (
        implementation.args.some((type) =>
          [
            'pg_catalog.name',
            'pg_catalog.text',
            'pg_catalog."varchar"',
            'pg_catalog.bpchar',
          ].includes(type),
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
      if (
        enumCall &&
        (!enumIdentity?.startsWith('enum:') || enumOperands.some((type) => type !== enumIdentity))
      )
        throw new UnsupportedCheckRustExpression(
          `Rust CHECK enum identity mismatch: ${call.signature}`,
        )
      if (
        !jsonbBuilder &&
        implementation.args.some((type, index) =>
          type === 'pg_catalog.anyenum' && enumCall
            ? !operands[index]?.type.startsWith('enum:')
            : type === 'pg_catalog.anyelement' && jsonbConversion
              ? false
              : operands[index]?.type !== type &&
                !(
                  call.kind === 'cast' &&
                  call.type === 'pg_catalog."char"' &&
                  type === 'pg_catalog.text' &&
                  operands[index]?.type === 'pg_catalog.bpchar'
                ),
        )
      )
        throw new UnsupportedCheckRustExpression(
          `Unsupported Rust CHECK callable arguments: ${call.signature}`,
        )
      for (const operand of operands) rustType(operand.type)
      if (folded) return folded
      let arguments_ = operands.map((operand) => ownedOperand(operand))
      if (jsonbConversion || (jsonbBuilder && operands.length > 0)) {
        const carriers: string[] = []
        for (const [index, original] of operands.entries()) {
          let operand = original
          if (['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'].includes(operand.type)) {
            const conversion = builtinCast(operand.type, 'pg_catalog."numeric"')
            if (conversion?.method !== 'f' || !conversion.implementation)
              throw new UnsupportedCheckRustExpression(
                'JSONB integer conversion requires its catalog numeric cast',
              )
            operand = emitCall(
              { kind: 'cast', signature: conversion.implementation, type: 'pg_catalog."numeric"' },
              [operand],
              destination,
            )
          }
          if (
            !operand.type.startsWith('enum:') &&
            ![
              'pg_catalog.bool',
              'pg_catalog."numeric"',
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
              'pg_catalog.refcursor',
              'pg_catalog."json"',
              'pg_catalog.jsonb',
              'pg_catalog.float4',
              'pg_catalog.float8',
            ].includes(operand.type)
          ) {
            const output = builtinTypeIO(operand.type)?.output
            const metadata = output ? builtinMetadata(output) : null
            if (
              !metadata ||
              metadata.kind !== 'function' ||
              !metadata.strict ||
              (metadata.volatility !== 'i' && metadata.volatility !== 's') ||
              metadata.returnsSet ||
              metadata.args.length !== 1 ||
              metadata.args[0] !== operand.type ||
              metadata.result !== 'pg_catalog.cstring'
            )
              throw new UnsupportedCheckRustExpression(
                'JSONB string conversion requires its catalog output identity',
              )
          }
          const key =
            jsonbBuilder && implementation.name === 'jsonb_build_object' && index % 2 === 0
          const helper =
            key && ['pg_catalog.float4', 'pg_catalog.float8'].includes(operand.type)
              ? 'jsonb_key_input_from_' + operand.type.slice('pg_catalog.'.length)
              : jsonbConversionHelper(operand.type)
          if (!helper)
            throw new UnsupportedCheckRustExpression(
              `JSONB conversion requires a supported concrete input category: ${operand.type}`,
            )
          const carrier = fresh('jsonb_input')
          destination.push(`let ${carrier} = ${helper}(${ownedOperand(operand)});`)
          carriers.push(carrier)
        }
        if (jsonbBuilder) {
          let batch = fresh('jsonb_arguments')
          destination.push(`let ${batch} = make_jsonb_arguments();`)
          for (const carrier of carriers) {
            const next = fresh('jsonb_arguments')
            destination.push(`let ${next} = append_jsonb_argument(${batch}, ${carrier});`)
            batch = next
          }
          arguments_ = [batch]
        } else arguments_ = carriers
      }
      callables.add(implementation.rustName)
      const name = fresh('value')
      destination.push(`let ${name} = ${implementation.rustName}(${arguments_.join(', ')});`)
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
      const helper = rustValuePrefix(kind) + '_unknown'
      return { name: bind(`${helper}()`), type: node.type }
    }
    if (node.kind === 'bit-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog."bit"' && operand.type !== 'pg_catalog.varbit')
        throw new UnsupportedCheckRustExpression('A bit output cast requires a bit value')
      return { name: bind(`bit_to_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'refcursor-text-coercion') {
      const operand = emitScalar(node.operand, bindings, used)
      const cursorIO = builtinTypeIO('pg_catalog.refcursor'),
        textIO = builtinTypeIO('pg_catalog.text')
      if (
        !cursorIO ||
        !textIO ||
        cursorIO.input !== textIO.input ||
        cursorIO.output !== textIO.output ||
        !(
          (node.type === 'pg_catalog.text' && operand.type === 'pg_catalog.refcursor') ||
          (node.type === 'pg_catalog.refcursor' &&
            [
              'pg_catalog.text',
              'pg_catalog."varchar"',
              'pg_catalog.bpchar',
              'pg_catalog.name',
            ].includes(operand.type))
        )
      )
        throw new UnsupportedCheckRustExpression(
          'Refcursor conversion requires its shared text I/O identity',
        )
      return { ...operand, type: node.type }
    }
    if (node.kind === 'io-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      const output = node.enum?.outputFunction ?? builtinTypeIO(operand.type)?.output
      if (!output || output !== node.output)
        throw new UnsupportedCheckRustExpression('Text output needs its catalog I/O identity')
      const metadata = builtinMetadata(output)
      if (
        metadata.kind !== 'function' ||
        metadata.result !== 'pg_catalog.cstring' ||
        !metadata.strict ||
        metadata.args.length !== 1 ||
        metadata.args[0] !== (node.enum ? 'pg_catalog.anyenum' : operand.type)
      )
        throw new UnsupportedCheckRustExpression('Unsupported text output function')
      if (node.enum) {
        if (
          operand.type !== enumType(node.enum) ||
          node.enum.values.length > 2147483647 ||
          node.enum.values.some((label) => label.includes('\0'))
        )
          throw new UnsupportedCheckRustExpression(
            'Enum text output needs its concrete label definition',
          )
        return {
          name: bind(
            `enum_to_text(${operand.name}, ${rustStringLiteral(node.enum.values.join('\0'))}, ${node.enum.values.length})`,
          ),
          type: node.type,
        }
      }
      if (
        (!isOidAliasType(operand.type) &&
          ![
            'pg_catalog.int2',
            'pg_catalog.int4',
            'pg_catalog.int8',
            'pg_catalog.oid',
            'pg_catalog.xid',
            'pg_catalog.cid',
            'pg_catalog.pg_lsn',
            'pg_catalog.tid',
            'pg_catalog."char"',
            'pg_catalog.xid8',
            'pg_catalog.pg_snapshot',
            'pg_catalog.txid_snapshot',
            'pg_catalog."json"',
            'pg_catalog.jsonb',
          ].includes(operand.type)) ||
        (metadata.volatility !== 'i' && !isOidAliasType(operand.type))
      )
        throw new UnsupportedCheckRustExpression('Unsupported scalar text output')
      if (isOidAliasType(operand.type))
        return {
          name: bind(
            `oid_alias_to_text(${operand.name}, ${!['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(operand.type)})`,
          ),
          type: node.type,
        }
      if (isSnapshotType(operand.type))
        return { name: bind(`snapshot_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog.jsonb')
        return { name: bind(`jsonb_to_text(${ownedOperand(operand)})`), type: node.type }
      if (operand.type === 'pg_catalog."json"')
        return { name: bind(`json_to_text(${ownedOperand(operand)})`), type: node.type }
      const helper = operand.type.slice('pg_catalog.'.length) + '_to_text'
      return { name: bind(`${helper}(${operand.name})`), type: node.type }
    }
    if (node.kind === 'text-to-money') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Money input requires text and its catalog I/O identity',
        )
      return { name: bind(`money_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-xid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Xid input requires text and its catalog I/O identity',
        )
      return { name: bind(`xid_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-cid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Cid input requires text and its catalog I/O identity',
        )
      return { name: bind(`cid_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-pg_lsn') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'PgLsn input requires text and its catalog I/O identity',
        )
      return { name: bind(`pg_lsn_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-tid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Tid input requires text and its catalog I/O identity',
        )
      return { name: bind(`tid_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-snapshot') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type) ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring' ||
        builtinMetadata(io).result !== node.type
      )
        throw new UnsupportedCheckRustExpression('Snapshot input requires its catalog I/O identity')
      return { name: bind(`snapshot_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-json') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        ![
          'pg_catalog.text',
          'pg_catalog."varchar"',
          'pg_catalog.bpchar',
          'pg_catalog.name',
        ].includes(operand.type) ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring' ||
        builtinMetadata(io).result !== node.type
      )
        throw new UnsupportedCheckRustExpression('JSON input requires its catalog I/O identity')
      const helper = node.type === 'pg_catalog.jsonb' ? 'jsonb_from_text' : 'json_from_text'
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-xid8') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Xid8 input requires text and its catalog I/O identity',
        )
      return { name: bind(`xid8_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-oid') {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Oid input requires text and its catalog I/O identity',
        )
      const dash = !['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(node.type)
      const grammar =
        node.type === 'pg_catalog.regtype'
          ? 2
          : ['pg_catalog.regprocedure', 'pg_catalog.regoperator'].includes(node.type)
            ? 1
            : 0
      return {
        name: bind(
          isOidAliasType(node.type)
            ? `oid_alias_from_text(${ownedOperand(operand)}, ${dash}, ${grammar})`
            : `oid_from_text(${ownedOperand(operand)})`,
        ),
        type: node.type,
      }
    }
    if (
      node.kind === 'text-to-point' ||
      node.kind === 'text-to-line' ||
      node.kind === 'text-to-lseg' ||
      node.kind === 'text-to-polygon' ||
      node.kind === 'text-to-path' ||
      node.kind === 'text-to-circle' ||
      node.kind === 'text-to-box'
    ) {
      const operand = emitScalar(node.operand, bindings, used)
      const io = builtinTypeIO(node.type)?.input
      if (
        operand.type !== 'pg_catalog.text' ||
        !io ||
        builtinMetadata(io).args[0] !== 'pg_catalog.cstring'
      )
        throw new UnsupportedCheckRustExpression(
          'Geometric input requires text and its catalog I/O identity',
        )
      const helper =
        node.kind === 'text-to-polygon'
          ? 'polygon_from_text'
          : node.kind === 'text-to-path'
            ? 'path_from_text'
            : node.kind === 'text-to-circle'
              ? 'circle_from_text'
              : node.kind === 'text-to-box'
                ? 'box_from_text'
                : node.kind === 'text-to-lseg'
                  ? 'lseg_from_text'
                  : node.kind === 'text-to-line'
                    ? 'line_from_text'
                    : 'point_from_text'
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-float') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.text')
        throw new UnsupportedCheckRustExpression('A floating-point input cast requires text')
      const io = builtinTypeIO(node.type)?.input
      if (!io || builtinMetadata(io).args[0] !== 'pg_catalog.cstring')
        throw new UnsupportedCheckRustExpression(
          'A floating-point input cast needs its catalog I/O identity',
        )
      const prefix = node.type === 'pg_catalog.float4' ? 'float4' : 'float8'
      return { name: bind(`${prefix}_from_text(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'text-to-bit') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.text')
        throw new UnsupportedCheckRustExpression('A bit input cast requires text')
      return {
        name: bind(`bit_from_text(${ownedOperand(operand)})`),
        type: node.type,
      }
    }
    if (node.kind === 'interval-literal') {
      const type = node.type
      const conversion = builtinCast(type, type)
      if (conversion?.method !== 'f' || !conversion.implementation)
        throw new UnsupportedCheckRustExpression('Interval precision needs its catalog identity')
      const metadata = builtinMetadata(conversion.implementation)
      if (
        metadata.kind !== 'function' ||
        metadata.result !== type ||
        metadata.args[0] !== type ||
        metadata.args[1] !== 'pg_catalog.int4' ||
        metadata.args.length !== 2
      )
        throw new UnsupportedCheckRustExpression('Invalid interval precision identity')
      callables.add(metadata.rustName)
      const text = bind(`make_text_value(${rustStringLiteral(node.value)})`)
      const fields = bind(`make_int4_value(${Math.floor(node.modifier / 65536)})`)
      const parsed = bind(`interval_from_text_fields(${text}, ${fields})`)
      const modifier = bind(`make_int4_value(${node.modifier})`)
      return { name: bind(`${metadata.rustName}(${parsed}, ${modifier})`), type }
    }
    if (node.kind === 'clock-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog."time"' && operand.type !== 'pg_catalog.timetz')
        throw new UnsupportedCheckRustExpression('Clock output requires time or timetz')
      const helper =
        operand.type === 'pg_catalog."time"' ? 'clock_time_to_text' : 'clock_timetz_to_text'
      return { name: bind(`${helper}(${operand.name})`), type: node.type }
    }
    if (node.kind === 'uuid-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.uuid')
        throw new UnsupportedCheckRustExpression('A UUID output cast requires a UUID value')
      return { name: bind(`uuid_to_text(${operand.name})`), type: node.type }
    }
    if (node.kind === 'mac-to-text') {
      const operand = emitScalar(node.operand, bindings, used)
      if (operand.type !== 'pg_catalog.macaddr' && operand.type !== 'pg_catalog.macaddr8')
        throw new UnsupportedCheckRustExpression('A MAC output cast requires a MAC value')
      const helper = operand.type === 'pg_catalog.macaddr' ? 'macaddr_to_text' : 'macaddr8_to_text'
      return { name: bind(`${helper}(${operand.name})`), type: node.type }
    }
    if (
      node.kind === 'text-to-interval' ||
      node.kind === 'text-to-clock' ||
      node.kind === 'text-to-date' ||
      node.kind === 'text-to-timestamp' ||
      node.kind === 'text-to-timestamptz' ||
      node.kind === 'text-to-network' ||
      node.kind === 'text-to-mac' ||
      node.kind === 'text-to-uuid' ||
      node.kind === 'text-to-bytea'
    ) {
      const operand = emitScalar(node.operand, bindings, used)
      if (
        operand.type !== 'pg_catalog.text' &&
        !(node.kind === 'text-to-bytea' && operand.type === 'pg_catalog.bpchar')
      )
        throw new UnsupportedCheckRustExpression('A SQL text cast requires text')
      const helper =
        node.kind === 'text-to-interval'
          ? 'interval_from_text'
          : node.kind === 'text-to-clock'
            ? node.type === 'pg_catalog."time"'
              ? 'time_from_text'
              : 'timetz_from_text'
            : node.kind === 'text-to-bytea'
              ? 'bytea_from_text'
              : node.kind === 'text-to-uuid'
                ? 'uuid_from_text'
                : node.kind === 'text-to-date'
                  ? 'date_from_text'
                  : node.kind === 'text-to-timestamp'
                    ? 'timestamp_from_text'
                    : node.kind === 'text-to-timestamptz'
                      ? 'timestamptz_from_text'
                      : node.kind === 'text-to-mac'
                        ? node.type === 'pg_catalog.macaddr'
                          ? 'macaddr_from_text'
                          : 'macaddr8_from_text'
                        : node.type === 'pg_catalog.cidr'
                          ? 'cidr_from_text'
                          : 'network_from_text'
      return { name: bind(`${helper}(${ownedOperand(operand)})`), type: node.type }
    }
    if (node.kind === 'certain') {
      const value = node.expression
      if (
        value.kind === 'temporal' &&
        (value.type === 'pg_catalog."time"' ||
          value.type === 'pg_catalog.timetz' ||
          value.type === 'pg_catalog."interval"' ||
          value.type === 'pg_catalog.date' ||
          value.type === 'pg_catalog."timestamp"' ||
          value.type === 'pg_catalog.timestamptz')
      ) {
        const prefix =
          value.type === 'pg_catalog."time"'
            ? 'time'
            : value.type === 'pg_catalog.timetz'
              ? 'timetz'
              : value.type === 'pg_catalog."interval"'
                ? 'interval'
                : value.type === 'pg_catalog.date'
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
      if (value.kind === 'line') {
        if (value.value === null) return { name: bind('line_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`line_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'lseg') {
        if (value.value === null) return { name: bind('lseg_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`lseg_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'money') {
        if (value.value === null) return { name: bind('money_null()'), type: value.type }
        if (value.units !== undefined)
          return { name: bind(`make_money_value(${value.units}i64)`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`money_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'xid') {
        if (value.value === null) return { name: bind('xid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`xid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'cid') {
        if (value.value === null) return { name: bind('cid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`cid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'pg_lsn') {
        if (value.value === null) return { name: bind('pg_lsn_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`pg_lsn_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'name') {
        if (value.value === null) return { name: bind('text_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`name_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'internal-char') {
        if (value.value === null) return { name: bind('internal_char_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`internal_char_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'tid') {
        if (value.value === null) return { name: bind('tid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`tid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'xid8') {
        if (value.value === null) return { name: bind('xid8_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`xid8_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'snapshot') {
        if (value.value === null) return { name: bind('snapshot_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`snapshot_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'jsonb') {
        if (value.value === null) return { name: bind('jsonb_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`jsonb_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'json') {
        if (value.value === null) return { name: bind('json_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`json_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'oid') {
        if (value.value === null) return { name: bind('oid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        const dash = !['pg_catalog.regoper', 'pg_catalog.regoperator'].includes(value.type)
        const grammar =
          value.type === 'pg_catalog.regtype'
            ? 2
            : ['pg_catalog.regprocedure', 'pg_catalog.regoperator'].includes(value.type)
              ? 1
              : 0
        return {
          name: bind(
            isOidAliasType(value.type)
              ? `oid_alias_from_text(${text}, ${dash}, ${grammar})`
              : `oid_from_text(${text})`,
          ),
          type: value.type,
        }
      }
      if (value.kind === 'polygon') {
        if (value.value === null) return { name: bind('polygon_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`polygon_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'path') {
        if (value.value === null) return { name: bind('path_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`path_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'circle') {
        if (value.value === null) return { name: bind('circle_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`circle_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'box') {
        if (value.value === null) return { name: bind('box_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`box_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'point') {
        if (value.value === null) return { name: bind('point_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`point_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'uuid') {
        if (value.value === null) return { name: bind('uuid_null()'), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`uuid_from_text(${text})`), type: value.type }
      }
      if (value.kind === 'mac') {
        const prefix = value.type === 'pg_catalog.macaddr' ? 'macaddr' : 'macaddr8'
        if (value.value === null) return { name: bind(`${prefix}_null()`), type: value.type }
        const text = bind(`make_text_value(${rustStringLiteral(value.value)})`)
        return { name: bind(`${prefix}_from_text(${text})`), type: value.type }
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
      if (value.kind === 'float') {
        const single = value.type === 'pg_catalog.float4'
        const prefix = single ? 'float4' : 'float8'
        if (value.bits === null) return { name: bind(`${prefix}_null()`), type: value.type }
        if (!(single ? /^[0-9a-f]{8}$/u : /^[0-9a-f]{16}$/u).test(value.bits))
          throw new UnsupportedCheckRustExpression('Invalid floating-point literal bits')
        const bits = BigInt.asIntN(single ? 32 : 64, BigInt('0x' + value.bits))
        const literal = single
          ? bits === -2147483648n
            ? '-2147483647 - 1'
            : String(bits)
          : `${bits}i64`
        return { name: bind(`make_${prefix}_literal_bits(${literal})`), type: value.type }
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
      if (value.kind === 'bit')
        return {
          name: bind(
            value.value === null
              ? 'bit_null()'
              : `bit_from_literal(${rustStringLiteral(value.value)})`,
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
      if (value.kind === 'refcursor')
        return {
          name: bind(
            value.value === null
              ? 'text_null()'
              : `make_refcursor_text_value(${rustStringLiteral(value.value)})`,
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
        !isOidType(node.operand.type) &&
        ![
          'pg_catalog.inet',
          'pg_catalog.cidr',
          'pg_catalog.int2',
          'pg_catalog.int4',
          'pg_catalog.int8',
          'pg_catalog.float4',
          'pg_catalog.float8',
          'pg_catalog.point',
          'pg_catalog.line',
          'pg_catalog.lseg',
          'pg_catalog.money',
          'pg_catalog.xid',
          'pg_catalog.cid',
          'pg_catalog.pg_lsn',
          'pg_catalog.tid',
          'pg_catalog."char"',
          'pg_catalog.xid8',
          'pg_catalog.pg_snapshot',
          'pg_catalog.txid_snapshot',
          'pg_catalog."json"',
          'pg_catalog.jsonb',
          'pg_catalog.oid',
          'pg_catalog.polygon',
          'pg_catalog.path',
          'pg_catalog.circle',
          'pg_catalog.box',
          'pg_catalog."numeric"',
          'pg_catalog."time"',
          'pg_catalog.timetz',
          'pg_catalog."interval"',
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
          'pg_catalog.refcursor',
          'pg_catalog.name',
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
      const operand = emitPreparedOperand(node.operand, bindings, used)
      const kind = rustType(operand.type)
      const helper = rustValuePrefix(kind) + '_is_null'
      const result = bind(`${helper}(${ownedOperand(operand)})`)
      return {
        name: node.negated ? bind(`bool_not_value(${result})`) : result,
        type: 'pg_catalog.bool',
      }
    }
    if (node.kind === 'call') {
      const preparation = strictNullPreparation(node)
      if (preparation) {
        const folded = emitConstantNull(node.call.type, preparation)
        return emitCall(
          node.call,
          node.operands.map((operand) => ({
            name: 'constant_operand',
            type: scalarType(operand),
          })),
          bindings,
          folded,
        )
      }
      if (
        preparationDepth === 0 &&
        node.operands.some(
          (operand) => operand.kind !== 'certain' && constantScalarExpression(operand),
        )
      ) {
        const callable = node.call.signature === null ? null : builtinMetadata(node.call.signature)
        const implementation =
          callable?.kind === 'operator' ? builtinMetadata(callable.implementation) : callable
        const strict =
          node.call.signature === null ||
          (implementation?.kind === 'function' && implementation.strict)
        const guard = fresh('constant_operand_null')
        constantDeclarations.push(`let mut ${guard}: CheckOutcome = check_unknown();`)
        const initial = fresh('constant_operand_start')
        preparationLines.push(
          `let ${initial} = make_bool_value(false);`,
          `${guard} = check_from_bool(${initial});`,
        )
        const lines: string[] = []
        const operands = node.operands.map((operand) => {
          if (!constantScalarExpression(operand)) return emitScalar(operand, lines, used)
          preparationDepth++
          let value: { name: string; type: string }
          try {
            value = emitScalar(operand, preparationLines, used)
          } finally {
            preparationDepth--
          }
          const kind = rustType(value.type)
          const prefix = rustValuePrefix(kind)
          const name = fresh('constant_argument')
          constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
          preparationLines.push(`${name} = ${ownedOperand(value)};`)
          if (strict) {
            const nullness = fresh('constant_argument_nullness')
            const state = fresh('constant_argument_state')
            preparationLines.push(
              `let ${nullness} = ${prefix}_is_null(${ownedOperand({ name, type: value.type })});`,
              `let ${state} = check_from_bool(${nullness});`,
              `${guard} = or_finish(${guard}, ${state});`,
            )
          }
          return { name, type: value.type }
        })
        const value = emitCall(node.call, operands, lines)
        const kind = rustType(value.type)
        const prefix = rustValuePrefix(kind)
        const name = fresh('prepared_call')
        bindings.push(
          `let mut ${name}: ${kind} = ${prefix}_null();`,
          `if case_guard_takes(${guard}) == false {`,
          ...indent(lines),
          `    ${name} = ${ownedOperand(value)};`,
          '};',
        )
        return { name, type: value.type }
      }
      return emitCall(
        node.call,
        node.operands.map((operand) => emitScalar(operand, bindings, used)),
      )
    }
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
    if (node.kind === 'distinct') {
      const operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      const nulls = operands.map((operand) => {
        const helper = rustValuePrefix(rustType(operand.type)) + '_is_null'
        return bind(`${helper}(${ownedOperand(operand)})`)
      })
      const name = fresh('distinct_result')
      bindings.push(`let mut ${name}: CheckOutcome = distinct_nulls_finish(${nulls.join(', ')});`)
      const lines: string[] = []
      const comparison = emitCall(node.comparison, operands, lines)
      const outcome = fresh('distinct_comparison')
      bindings.push(
        `if distinct_needs_comparison(${nulls.join(', ')}) {`,
        ...indent(lines),
        `    let ${outcome} = check_from_bool(${comparison.name});`,
        `    ${name} = not_finish(${outcome});`,
        '}',
      )
      const result = node.negated ? bind(`not_finish(${name})`) : name
      return { name: bind(`bool_from_check(${result})`), type: node.type }
    }
    if (node.kind === 'nullif') {
      if (scalarType(node.operands[0]) !== node.type)
        throw new UnsupportedCheckRustExpression(
          'NULLIF result type must match its coerced first operand',
        )
      const preparation = nullifNullPreparation(node)
      if (preparation) {
        emitCall(
          node.comparison,
          node.operands.map((operand) => ({ name: 'constant_operand', type: scalarType(operand) })),
          [],
          { name: 'constant_comparison', type: 'pg_catalog.bool' },
        )
        return emitConstantNull(node.type, preparation)
      }
      const first = emitPreparedOperand(node.operands[0], bindings, used)
      const lines: string[] = []
      const second = emitPreparedOperand(node.operands[1], lines, used)
      const comparison = emitCall(node.comparison, [first, second], lines)
      const guard = fresh('nullif_comparison')
      lines.push(`let ${guard} = check_from_bool(${comparison.name});`)
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const name = fresh('nullif_result')
      lines.push(
        `if case_guard_stops(${guard}) {`,
        `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
        `} else if case_guard_takes(${guard}) {`,
        `    ${name} = ${prefix}_null();`,
        '};',
      )
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(first)};`)
      if (preparationDepth === 0 && constantScalarExpression(node.operands[0])) {
        const nullness = bind(`${prefix}_is_null(${ownedOperand(first)})`)
        const guard = bind(`check_from_bool(${nullness})`)
        bindings.push(`if case_guard_takes(${guard}) == false {`, ...indent(lines), '};')
      } else bindings.push(...lines)
      return { name, type: node.type }
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
    if (node.kind === 'row-compare') {
      if (node.pairs.length < 2)
        throw new UnsupportedCheckRustExpression('Row ordering needs multiple fields')
      const pairs = node.pairs.map((pair) => ({
        ...pair,
        operands: pair.operands.map((operand) => {
          const lines: string[] = []
          const prepared = capturePreparation(() => emitPreparedOperand(operand, lines, used))
          preparationLines.push(...prepared.lines)
          if (constantScalarExpression(operand)) {
            bindings.push(...lines)
            lines.length = 0
          }
          return { value: prepared.value, lines }
        }),
      }))
      const name = fresh('row_ordering')
      bindings.push(`let mut ${name}: Int4Value = make_int4_value(0);`)
      for (const pair of pairs) {
        const lines = pair.operands.flatMap((operand) => operand.lines)
        const comparison = emitCall(
          pair.comparison,
          pair.operands.map((operand) => operand.value),
          lines,
        )
        if (comparison.type !== 'pg_catalog.int4')
          throw new UnsupportedCheckRustExpression('Row comparator must return int4')
        bindings.push(
          `if row_compare_continues(${name}) {`,
          ...indent(lines),
          `    ${name} = ${comparison.name};`,
          '};',
        )
      }
      return { name: bind(`row_compare_finish(${name}, ${node.strategy})`), type: node.type }
    }
    if (node.kind === 'minmax') {
      if (
        !node.operands.length ||
        node.operands.some((operand) => scalarType(operand) !== node.type)
      )
        throw new UnsupportedCheckRustExpression('Invalid GREATEST/LEAST arguments')
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const operands = node.operands.map((operand) => emitPreparedOperand(operand, bindings, used))
      if (operands.length === 1) return operands[0]!
      const name = fresh('minmax_result')
      const selected = { name, type: node.type }
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(operands[0]!)};`)
      for (const operand of operands.slice(1)) {
        const leftNull = bind(`${prefix}_is_null(${ownedOperand(selected)})`)
        const rightNull = bind(`${prefix}_is_null(${ownedOperand(operand)})`)
        const guard = fresh('minmax_choice')
        bindings.push(
          `let mut ${guard}: CheckOutcome = minmax_nulls_choose_right(${leftNull}, ${rightNull});`,
        )
        const lines: string[] = []
        const metadata =
          node.comparison.signature === null ? null : builtinMetadata(node.comparison.signature)
        if (!metadata || metadata.args.length !== 2)
          throw new UnsupportedCheckRustExpression('GREATEST/LEAST needs catalog ordering')
        const compared = [selected, operand].map((value, index) => {
          const type =
            metadata.args[index] === 'pg_catalog.anyenum' ? node.type : metadata.args[index]!
          return type === value.type
            ? value
            : emitCall(
                { kind: 'cast', signature: null, type: type as typeof node.type },
                [value],
                lines,
              )
        })
        const comparison = emitCall(node.comparison, compared, lines)
        bindings.push(
          `if distinct_needs_comparison(${leftNull}, ${rightNull}) {`,
          ...indent(lines),
          `    ${guard} = check_from_bool(${comparison.name});`,
          '};',
          `if case_guard_stops(${guard}) {`,
          `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${guard});`,
          `} else if case_guard_takes(${guard}) {`,
          `    ${name} = ${ownedOperand(operand)};`,
          '};',
        )
      }
      return selected
    }
    if (node.kind === 'coalesce') {
      if (!node.operands.length)
        throw new UnsupportedCheckRustExpression('Expected a COALESCE argument')
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const operands = node.operands.map((operand) => {
        const lines: string[] = []
        const prepared = capturePreparation(() => emitScalar(operand, lines, used))
        if (prepared.value.type !== node.type)
          throw new UnsupportedCheckRustExpression('COALESCE argument type mismatch')
        return { value: prepared.value, lines, preparation: prepared.lines }
      })
      const prepareOperand = (position: number): string[] => {
        if (position === operands.length) return []
        const operand = operands[position]!
        const rest = prepareOperand(position + 1)
        if (!rest.length || !constantScalarExpression(node.operands[position]!))
          return [...operand.preparation, ...rest]
        const name = fresh('prepared_coalesce')
        constantDeclarations.push(`let mut ${name}: ${kind} = ${prefix}_unknown();`)
        const nullness = fresh('prepared_nullness')
        const guard = fresh('prepared_null_guard')
        const lines = [
          ...operand.preparation,
          ...operand.lines,
          `${name} = ${ownedOperand(operand.value)};`,
          `let ${nullness} = ${prefix}_is_null(${ownedOperand({ name, type: node.type })});`,
          `let ${guard} = check_from_bool(${nullness});`,
          `${preparationState} = constant_finish(${preparationState}, ${guard});`,
          `if case_guard_takes(${guard}) {`,
          ...indent(rest),
          '};',
        ]
        operand.value = { name, type: node.type }
        operand.lines = []
        return lines
      }
      preparationLines.push(...prepareOperand(0))
      const first = operands[0]!.value
      bindings.push(...operands[0]!.lines)
      if (node.operands.length === 1) return first
      const name = fresh('coalesce_result')
      bindings.push(`let mut ${name}: ${kind} = ${ownedOperand(first)};`)
      for (const operand of operands.slice(1)) {
        const nullness = bind(
          `${prefix}_is_null(${['JsonValue', 'JsonbValue', 'SnapshotValue', 'PolygonValue', 'PathValue', 'TextValue', 'ByteaValue', 'BitValue', 'NumericValue'].includes(kind) ? `${name}.clone()` : name})`,
        )
        const guard = bind(`check_from_bool(${nullness})`)
        bindings.push(
          `if case_guard_takes(${guard}) {`,
          ...indent(operand.lines),
          `    ${name} = ${ownedOperand(operand.value)};`,
          '}',
        )
      }
      return { name, type: node.type }
    }
    if (node.kind === 'case') {
      if (!node.branches.length) throw new UnsupportedCheckRustExpression('Expected a CASE branch')
      const kind = rustType(node.type)
      const prefix = rustValuePrefix(kind)
      const scrutineeLines: string[] = []
      const scrutinee = node.scrutinee
        ? emitScalar(node.scrutinee.expression, scrutineeLines, used)
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
        const selectedPreparation = capturePreparation(() =>
          emitScalar(branch.then, selectedLines, used),
        )
        const selected = selectedPreparation.value
        if (selected.type !== node.type)
          throw new UnsupportedCheckRustExpression('CASE result type mismatch')
        const otherwise = capturePreparation(() => branchLines(position + 1))
        const prepared = prepareBranches(
          constantScalarExpression(branch.when) &&
            (!node.scrutinee || constantScalarExpression(node.scrutinee.expression)),
          lines,
          guard,
          selectedPreparation.lines,
          otherwise.lines,
        )
        const conditionGuard = prepared ?? guard
        return [
          ...(prepared ? [] : lines),
          `if case_guard_stops(${conditionGuard}) {`,
          `    ${name} = ${prefix === 'bool' ? 'bool_from_check' : `${prefix}_from_case_guard`}(${conditionGuard});`,
          `} else if case_guard_takes(${conditionGuard}) {`,
          ...indent(selectedLines),
          `    ${name} = ${ownedOperand(selected)};`,
          '} else {',
          ...indent(otherwise.value),
          '};',
        ]
      }
      const branches = capturePreparation(() => branchLines(0))
      if (
        branches.lines.length &&
        node.scrutinee &&
        constantScalarExpression(node.scrutinee.expression)
      )
        preparationLines.push(...scrutineeLines)
      else bindings.push(...scrutineeLines)
      preparationLines.push(...branches.lines)
      bindings.push(...branches.value)
      return { name, type: node.type }
    }
    throw new UnsupportedCheckRustExpression(`Unsupported Rust CHECK scalar: ${node.kind}`)
  }

  type Emitted = { lines: string[]; name: string; inputs: Set<string> }
  const emit = (node: EvalBoolExpression): Emitted => {
    if (node.kind === 'eval-test') {
      const operand = emit(node.operand)
      const tested = fresh('test_result')
      const name = node.negated ? fresh('negated_test_result') : tested
      return {
        lines: [
          ...operand.lines,
          `let ${tested} = is_${node.test}_finish(${operand.name});`,
          ...(node.negated ? [`let ${name} = not_finish(${tested});`] : []),
        ],
        name,
        inputs: operand.inputs,
      }
    }
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
      const rightPreparation = capturePreparation(() => emit(node.operands[1]!))
      const right = rightPreparation.value
      const stop = node.operation === 'and' ? 'and_stops' : 'or_stops'
      const finish = node.operation === 'and' ? 'and_finish' : 'or_finish'
      let leftName = left.name
      let leftLines = left.lines
      if (rightPreparation.lines.length && constantCheckExpression(node.operands[0]!)) {
        leftName = preparedGuard(left.lines, left.name)
        leftLines = []
        preparationLines.push(
          `if case_guard_stops(${leftName}) == false {`,
          `    if ${stop}(${leftName}) == false {`,
          ...indent(indent(rightPreparation.lines)),
          '    };',
          '};',
        )
      } else preparationLines.push(...rightPreparation.lines)
      return {
        lines: [
          ...leftLines,
          `let mut ${name}: CheckOutcome = ${leftName};`,
          `if ${stop}(${leftName}) == false {`,
          ...indent(right.lines),
          `    ${name} = ${finish}(${leftName}, ${right.name});`,
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
        const selectedPreparation = capturePreparation(() => emit(branch.then))
        const selected = selectedPreparation.value
        const otherwise = capturePreparation(() => branchLines(position + 1))
        for (const input of condition.inputs) used.add(input)
        for (const input of selected.inputs) used.add(input)
        const prepared = prepareBranches(
          constantCheckExpression(branch.when),
          condition.lines,
          condition.name,
          selectedPreparation.lines,
          otherwise.lines,
        )
        const guard = prepared ?? condition.name
        return [
          ...(prepared ? [] : condition.lines),
          `if case_guard_stops(${guard}) {`,
          `    ${name} = ${guard};`,
          `} else if case_guard_takes(${guard}) {`,
          ...indent(selected.lines),
          `    ${name} = ${selected.name};`,
          '} else {',
          ...indent(otherwise.value),
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
  let lines = entry.lines
  let resultName = entry.name
  if (constantLines.length || literalLines.length) {
    const start = fresh('preparation_start')
    resultName = fresh('prepared_result')
    lines = [
      ...constantDeclarations,
      `let ${start} = make_bool_value(true);`,
      `let mut ${preparationState}: CheckOutcome = check_from_bool(${start});`,
      ...literalLines,
      ...constantLines,
      `let mut ${resultName}: CheckOutcome = ${preparationState};`,
      `if case_guard_stops(${preparationState}) == false {`,
      ...indent(entry.lines),
      `    ${resultName} = ${entry.name};`,
      '}',
    ]
  }
  return {
    source: `pub fn ${entryName}(${parameters(entry.inputs)}) -> CheckOutcome {\n${indent(lines).join('\n')}\n    ${resultName}\n}\n`,
    entryName,
    inputs: ordered(entry.inputs),
    callables: [...callables],
    requiresRegex,
  }
}
