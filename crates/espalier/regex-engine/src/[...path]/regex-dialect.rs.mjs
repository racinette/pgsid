import { astNodes, readModule } from '../../../../../tools/check-transpiler/dialects/ast.mjs'

export const description = 'the regex engine dialect'
export const guidance = `
The regex engine keeps to a narrower dialect than the rest of the transpiled
graph, so its translation needs no floating-point, wide-integer, owned-text or
table support. Widening it is a decision about the engine, made in this rule.

- Values are \`usize\`, \`u32\`, \`i32\`, \`bool\`, \`char\` and borrowed \`&str\`;
  vectors hold \`char\`, \`usize\` or \`Copy\` records; records and enums derive
  \`Clone\` and \`Copy\` together or neither.
- No \`i64\`, \`f64\`, \`u16\` or \`String\`, no slices, tables or array
  literals, no float or \`i64\` literals, and no float bit conversions.
- Arithmetic is addition, subtraction and negation; casts go from \`char\` to
  \`u32\` and from \`u32\` to \`usize\`.
- No owned-text or float methods (\`to_owned\`, \`as_str\`, \`clone\`,
  \`push_str\`, \`abs\`, \`ln\`, \`log10\`, \`sqrt\`), no \`String::new\`, and no
  conversion idioms (\`usize::try_from\`, \`parse::<f64>\`, \`char::from_u32\`).
- An \`if let\` binds the payload of its variant, which is a scalar or a \`Copy\`
  type; only scalar and \`Copy\` enum bindings are reassigned.
`

const scalars = new Set(['usize', 'u32', 'i32', 'bool', 'char', '&str'])
const types = new Set(['i64', 'f64', 'u16', 'String'])
const expressions = {
  float: 'float literals are outside the regex engine',
  'float-bits': 'float bit conversions are outside the regex engine',
  'float-from-text': 'float text conversion is outside the regex engine',
  'index-from-signed': 'signed index conversion is outside the regex engine',
  'character-from-codepoint':
    'character construction from a code point is outside the regex engine',
  array: 'array literals are outside the regex engine',
}
const operators = new Set(['multiply', 'divide', 'remainder'])
const castTargets = new Set(['u32', 'usize'])
const methods = new Set(['to_owned', 'as_str', 'clone', 'push_str', 'abs', 'ln', 'log10', 'sqrt'])

const single = (node) => node.kind === 'path' && node.segments.length === 1 && node.segments[0]

function typeReason(node, records) {
  const name = single(node)
  if (types.has(name)) return `\`${name}\` is outside the regex engine's types`
  if (node.kind === 'slice') return 'slices are outside the regex engine'
  if (node.kind === 'path' && node.segments.join('::') === 'Vec') {
    const element = single(node.typeArguments[0])
    if (element !== 'char' && element !== 'usize' && records.get(element) !== 'copy struct')
      return 'vectors hold `char`, `usize` or `Copy` records'
  }
}

function expressionReason(node) {
  if (expressions[node.kind]) return expressions[node.kind]
  if (node.kind === 'integer' && node.integerType === 'i64')
    return '`i64` literals are outside the regex engine'
  if (node.kind === 'binary' && operators.has(node.operator))
    return `\`${node.operator}\` is outside the regex engine's arithmetic`
  if (node.kind === 'cast') {
    const target = single(node.targetType)
    if (!types.has(target) && !castTargets.has(target))
      return 'casts go from `char` to `u32` and from `u32` to `usize`'
  }
  if (node.kind === 'method-call' && methods.has(node.method))
    return `\`${node.method}\` is outside the regex engine`
  if (node.kind === 'call' && node.callee.kind === 'path' && node.callee.segments[0] === 'String')
    return '`String` is outside the regex engine'
  if (node.kind === 'if-let' && node.payloadBinding === null)
    return 'an `if let` binds the payload of its variant'
}

function itemReason(node) {
  if (!node.derives) return
  const clone = node.derives.includes('Clone')
  if (clone !== node.derives.includes('Copy'))
    return `${node.name} derives \`Clone\` and \`Copy\` together or neither`
}

function inferredReason({ construct, type }, records) {
  if (scalars.has(type)) return
  if (construct === 'if-let payload' && !records.get(type)?.startsWith('copy '))
    return `an \`if let\` payload of type \`${type}\` is neither a scalar nor \`Copy\``
  if (construct === 'binding assignment' && records.get(type) !== 'copy enum')
    return `a \`${type}\` binding is reassigned; only scalar and \`Copy\` enum bindings are`
  if (construct === 'element assignment' && records.get(type) !== 'copy struct')
    return `a \`${type}\` element is assigned; vectors hold \`char\`, \`usize\` or \`Copy\` records`
}

export async function lint({ path, read, emit, addons }) {
  const source = `crates/${path}`
  const module = readModule(addons.parse, 'regex_engine', source, await read())
  if (module.error) return emit({ code: 'unreadable_syntax', message: module.error })
  const records = new Map(
    module.items
      .filter((item) => item.kind === 'struct' || item.kind === 'enum')
      .map((item) => [
        item.name,
        `${item.derives.includes('Copy') ? 'copy' : 'owned'} ${item.kind}`,
      ]),
  )
  const outside = (message, node) =>
    emit({ code: 'outside_regex_dialect', message, line: node.line, column: node.column })
  for (const { node, type } of astNodes(module.items)) {
    const reason = type ? typeReason(node, records) : (expressionReason(node) ?? itemReason(node))
    if (reason) outside(reason, node)
  }
  for (const inferred of module.inferredTypes ?? []) {
    const reason = inferred.path === source && inferredReason(inferred, records)
    if (reason) outside(reason, inferred)
  }
}
