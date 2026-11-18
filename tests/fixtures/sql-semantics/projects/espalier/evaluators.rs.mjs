export const description = 'the CHECK evaluators generated for the isolated operation cases'
export const guidance = `
Each section, headed by a comment naming its case, is one generated evaluator
module; a case the evaluator leaves undecided holds its reason instead. Generated evaluators keep to a dialect narrower than the transpiled
runtime they call, so each one reads as a straight sequence of runtime calls:

- Every function is a public entry: a CHECK entry, \`evaluate_check\`,
  \`evaluate_check_diagnostic\` or \`evaluate_check_<name>_h<hash>\`, returning
  \`CheckOutcome\` or \`CheckEvaluationResult\`, or a value entry,
  \`evaluate_value_<name>_h<hash>\`, returning one of the runtime's SQL value
  types. Parameters are immutable and take one of the runtime's SQL value types.
- A body is a sequence of \`let\` bindings, assignments to mutable locals,
  \`if\` and \`while\` statements, ending in a bound value or a call. An
  untyped binding is immutable; a typed one is mutable and holds a SQL value,
  \`CheckOutcome\`, \`i32\` or one of the runtime's accumulator states.
- A value is a bound name, a clone of one, or a direct call of a runtime
  function. Call arguments are bound names, their clones or shared borrows,
  and literals: strings, booleans, \`i64\` literals and \`i32\` literals,
  including \`-2147483647 - 1\`. A condition is a call, or a call compared with
  \`false\`.

Generated functions only select runtime operations and keep evaluation order
visible in statements; PostgreSQL behavior stays in the maintained runtime.
The rule judges syntax and bindings alone: types, signatures and parity come
from compiling the evaluator with its runtime and running both targets.

Keep the dialect as small as the generator needs. Widen it only for a CHECK
expression the current forms cannot emit: add the smallest rule here with an
accepted and a nearby rejected case in its test corpus, then compile the
assembled Rust, translate it, and compare values, NULL, unknown, errors and
lazy branches in each target with PostgreSQL.
`

const valueTypes = new Set([
  'Int2Value',
  'Int4Value',
  'Int8Value',
  'TimeValue',
  'TimetzValue',
  'IntervalValue',
  'DateValue',
  'TimestampValue',
  'TimestamptzValue',
  'EnumValue',
  'NetworkValue',
  'Float4Value',
  'Float8Value',
  'PointValue',
  'LineValue',
  'LsegValue',
  'MoneyValue',
  'TsvectorValue',
  'TsqueryValue',
  'AclitemValue',
  'XidValue',
  'CidValue',
  'PgLsnValue',
  'TidValue',
  'InternalCharValue',
  'Xid8Value',
  'OidValue',
  'PolygonValue',
  'PathValue',
  'SnapshotValue',
  'JsonValue',
  'JsonbValue',
  'JsonpathValue',
  'XmlValue',
  'ArrayValue',
  'CompositeValue',
  'RangeValue',
  'MultirangeValue',
  'CircleValue',
  'BoxValue',
  'UuidValue',
  'MacaddrValue',
  'Macaddr8Value',
  'NumericValue',
  'TextValue',
  'ByteaValue',
  'BitValue',
  'BoolValue',
])
const localTypes = new Set([
  ...valueTypes,
  'CheckOutcome',
  'i32',
  'ArrayArguments',
  'ArraySortPayload',
  'JsonbArrayInputPayload',
  'JsonRecordInputPayload',
  'ArrayOutputPayload',
  'MultirangeTextPayload',
  'XmlConcatState',
  'TextConcatState',
  'TextFormatState',
])
const results = new Set(['CheckOutcome', 'CheckEvaluationResult'])
const entry = /^evaluate_check(?:|_diagnostic|_[a-z0-9_]+_h[a-z0-9]{4})$/
const valueEntry = /^evaluate_value_[a-z0-9_]+_h[a-z0-9]{4}$/
const int4Max = 2147483647

const named = (type) =>
  type?.kind === 'path' && type.segments.length === 1 && !type.typeArguments && type.segments[0]
const identifier = (node) =>
  node.kind === 'path' && node.segments.length === 1 ? node.segments[0] : undefined
const int4Literal = (node) =>
  node.kind === 'integer' &&
  !node.integerType &&
  /^[0-9]+$/.test(node.digits) &&
  Number(node.digits) <= int4Max
const negative = (node) =>
  node.kind === 'unary' && node.operator === 'negate' && int4Literal(node.value)
const int4Minimum = (node) =>
  node.kind === 'binary' &&
  node.operator === 'subtract' &&
  negative(node.left) &&
  node.left.value.digits === String(int4Max) &&
  int4Literal(node.right) &&
  node.right.digits === '1'

// Findings carry the position of the construct they reject; one evaluator can break several rules.
class Evaluator {
  constructor(report) {
    this.report = report
  }

  clone(node, bindings) {
    if (
      node.kind !== 'method-call' ||
      node.method !== 'clone' ||
      node.arguments.length !== 0 ||
      !bindings.has(identifier(node.receiver))
    )
      this.report(node, 'expected a bound immutable value clone')
  }

  call(node, bindings) {
    if (node.kind !== 'call' || identifier(node.callee) === undefined)
      return this.report(node, 'expected a direct function call')
    for (const argument of node.arguments) {
      if (argument.kind === 'integer' && argument.integerType === 'i64') continue
      if (bindings.has(identifier(argument))) continue
      if (argument.kind === 'method-call') {
        this.clone(argument, bindings)
        continue
      }
      if (argument.kind === 'borrow' && bindings.has(identifier(argument.value))) continue
      if (int4Literal(argument) || negative(argument) || int4Minimum(argument)) continue
      if (argument.kind === 'string' || argument.kind === 'boolean') continue
      this.report(argument, 'call argument is outside the evaluator dialect')
    }
  }

  value(node, bindings) {
    const name = identifier(node)
    if (name !== undefined) {
      if (!bindings.has(name)) this.report(node, `unbound identifier ${name}`)
    } else if (node.kind === 'method-call') this.clone(node, bindings)
    else this.call(node, bindings)
  }

  condition(node, bindings) {
    if (node.kind !== 'binary') return this.call(node, bindings)
    if (node.operator !== 'equal' || node.right.kind !== 'boolean' || node.right.state !== false)
      return this.report(node, 'a condition is a call, or a call compared with false')
    this.call(node.left, bindings)
  }

  block(statements, bindings, body) {
    if (body && statements.length === 0) this.report(body, 'function needs a tail value')
    statements.forEach((statement, index) => {
      const tail = body && index === statements.length - 1
      if (tail) {
        if (statement.kind === 'expression' && !statement.semicolon)
          return this.value(statement.value, bindings)
        return this.report(statement, 'a function ends in a bound value or a call')
      }
      if (statement.kind === 'local') return this.local(statement, bindings)
      const expression = statement.value
      if (expression.kind === 'assign' && statement.semicolon) {
        const target = identifier(expression.left)
        if (bindings.get(target) !== true)
          this.report(expression, 'assignment target must be a mutable local')
        return this.value(expression.right, bindings)
      }
      if (expression.kind === 'if') return this.branch(expression, bindings)
      if (expression.kind === 'while') {
        this.condition(expression.condition, bindings)
        return this.block(expression.body, new Map(bindings))
      }
      this.report(statement, 'statement is outside the evaluator dialect')
    })
  }

  local(statement, bindings) {
    const { name, mutable } = statement.binding
    if (statement.type) {
      if (!localTypes.has(named(statement.type)))
        this.report(statement.type, 'type is outside the evaluator dialect')
      if (!mutable) this.report(statement, 'typed result must be mutable')
    } else if (mutable) this.report(statement, 'an untyped binding is immutable')
    this.value(statement.initializer, bindings)
    if (bindings.has(name)) this.report(statement, `duplicate local binding ${name}`)
    bindings.set(name, mutable)
  }

  branch(node, bindings) {
    this.condition(node.condition, bindings)
    this.block(node.body, new Map(bindings))
    if (node.elseBody) this.block(node.elseBody, new Map(bindings))
  }

  function(item, names) {
    if (item.kind !== 'function')
      return this.report(item, 'only functions are in the evaluator dialect')
    if (names.has(item.name)) this.report(item, `duplicate function ${item.name}`)
    names.add(item.name)
    const value = valueEntry.test(item.name)
    if ((!value && !entry.test(item.name)) || item.visibility !== 'public')
      this.report(item, 'only CHECK evaluator and value entries are declared, and they are public')
    if (value ? !valueTypes.has(named(item.returnType)) : !results.has(named(item.returnType)))
      this.report(
        item,
        value
          ? 'a value entry returns a SQL value type'
          : 'an entry returns CheckOutcome or CheckEvaluationResult',
      )
    const bindings = new Map()
    for (const parameter of item.parameters) {
      if (!valueTypes.has(named(parameter.type)))
        this.report(parameter.type, 'parameter is outside the evaluator dialect')
      if (parameter.mutable) this.report(parameter.type, 'parameter must be immutable')
      if (bindings.has(parameter.name)) this.report(item, `duplicate parameter ${parameter.name}`)
      bindings.set(parameter.name, false)
    }
    this.block(item.body, bindings, item)
  }
}

// The golden holds one section per case: a comment naming the case after a blank line, then its
// evaluator module, or for a case left undecided a comment with the reason and no code. A file
// written for one evaluator has no such comment.
function sections(source) {
  const lines = source.split('\n')
  const starts = lines.flatMap((line, index) =>
    line.startsWith('// ') && (index === 0 || lines[index - 1] === '') ? [index] : [],
  )
  if (starts[0] !== 0) starts.unshift(0)
  return starts
    .map((start, index) => ({ offset: start, lines: lines.slice(start, starts[index + 1]) }))
    .filter((section) => section.lines.some((line) => line !== '' && !line.startsWith('//')))
    .map(({ offset, lines }) => ({ offset, source: lines.join('\n') }))
}

export async function lint({ path, read, emit, addons }) {
  for (const section of sections(await read())) {
    const located = (line, column, message) =>
      emit({
        code: 'outside_evaluator_dialect',
        message,
        line: section.offset + line,
        ...(column && { column }),
      })
    const parsed = addons.parse({
      schemaVersion: 1,
      validate: 'syntax',
      locations: true,
      modules: [{ name: 'checks', dependencies: [], files: [{ path, source: section.source }] }],
    })
    if (parsed.error) {
      const [, line, column, message] = /^[^:]+:(?:(\d+):(\d+):)? ([^]*)$/.exec(parsed.error) ?? []
      located(Number(line ?? 1), column && Number(column), message ?? parsed.error)
      continue
    }
    const evaluator = new Evaluator((node, message) => located(node.line, node.column, message))
    const names = new Set()
    for (const item of parsed.document.items) evaluator.function(item, names)
    if (names.size === 0) located(1, undefined, 'missing public CHECK evaluator')
  }
}
