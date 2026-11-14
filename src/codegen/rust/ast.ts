// Generated Rust is built as a syntax tree and printed here, so that no generated declaration is
// assembled from text. The printer writes one statement per line with four-space indentation, the
// layout rustfmt gives code of this shape.

export type RustType =
  | { kind: 'path'; path: string[]; generics?: RustType[] }
  | { kind: 'reference'; type: RustType; mutable?: boolean; lifetime?: string }
  | { kind: 'tuple'; items: RustType[] }
  | { kind: 'slice'; type: RustType }
  | { kind: 'impl'; bounds: RustType[] }
  | { kind: 'dyn'; bounds: RustType[] }
  | { kind: 'function'; parameters: RustType[]; result?: RustType }
  | { kind: 'infer' }
  | { kind: 'lifetime'; name: string }

export type RustPattern =
  | { kind: 'ident'; name: string; mutable?: boolean; reference?: boolean }
  | { kind: 'wild' }
  | { kind: 'path'; path: string[] }
  | { kind: 'tuple-struct'; path: string[]; items: RustPattern[] }
  | { kind: 'struct'; path: string[]; fields: { name: string; pattern?: RustPattern }[]; rest?: boolean }
  | { kind: 'tuple'; items: RustPattern[] }
  | { kind: 'literal'; value: RustExpression }
  | { kind: 'or'; items: RustPattern[] }
  | { kind: 'reference'; pattern: RustPattern }

export type RustExpression =
  | { kind: 'path'; path: string[]; generics?: RustType[] }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'char'; value: string }
  | { kind: 'call'; callee: RustExpression; arguments: RustExpression[] }
  | { kind: 'method'; receiver: RustExpression; name: string; generics?: RustType[]; arguments: RustExpression[] }
  | { kind: 'field'; receiver: RustExpression; name: string }
  | { kind: 'index'; receiver: RustExpression; index: RustExpression }
  | { kind: 'struct'; path: string[]; fields: { name: string; value?: RustExpression }[]; base?: RustExpression }
  | { kind: 'tuple'; items: RustExpression[] }
  | { kind: 'array'; items: RustExpression[] }
  | { kind: 'macro'; name: string; arguments: RustExpression[]; delimiter?: '(' | '[' }
  | { kind: 'unary'; operator: '!' | '-' | '*' | '&' | '&mut '; operand: RustExpression }
  | { kind: 'binary'; operator: string; left: RustExpression; right: RustExpression }
  | { kind: 'cast'; value: RustExpression; type: RustType }
  | { kind: 'try'; value: RustExpression }
  | { kind: 'await'; value: RustExpression }
  | { kind: 'closure'; parameters: { pattern: RustPattern; type?: RustType }[]; body: RustExpression; move?: boolean }
  | { kind: 'block'; statements: RustStatement[]; unsafe?: boolean; async?: boolean; move?: boolean }
  | { kind: 'if'; condition: RustExpression; then: RustStatement[]; else?: RustStatement[] | RustExpression }
  | { kind: 'if-let'; pattern: RustPattern; value: RustExpression; then: RustStatement[]; else?: RustStatement[] }
  | { kind: 'match'; value: RustExpression; arms: { pattern: RustPattern; guard?: RustExpression; body: RustExpression }[] }
  | { kind: 'return'; value?: RustExpression }
  | { kind: 'range'; from?: RustExpression; to?: RustExpression; inclusive?: boolean }
  | { kind: 'paren'; value: RustExpression }
  | { kind: 'qualified'; type: RustType; trait: RustType; name: string }

export type RustStatement =
  | { kind: 'let'; pattern: RustPattern; type?: RustType; value?: RustExpression; else?: RustStatement[] }
  | { kind: 'expression'; value: RustExpression; semicolon?: boolean }
  | { kind: 'item'; item: RustItem }
  | { kind: 'for'; pattern: RustPattern; iterable: RustExpression; body: RustStatement[] }

export type RustAttribute = { path: string; arguments?: string[] }
export type RustVisibility = 'pub' | 'pub(crate)' | 'pub(super)' | undefined
export type RustGeneric = { name: string; bounds?: RustType[]; lifetime?: boolean }
export type RustField = {
  name?: string
  type: RustType
  visibility?: RustVisibility
  attributes?: RustAttribute[]
  doc?: string
}
export type RustVariant = {
  name: string
  fields?: { kind: 'tuple' | 'struct'; items: RustField[] }
  attributes?: RustAttribute[]
  doc?: string
}
export type RustFunction = {
  kind: 'fn'
  name: string
  visibility?: RustVisibility
  async?: boolean
  generics?: RustGeneric[]
  receiver?: '&self' | '&mut self' | 'self' | 'mut self'
  parameters: { pattern: RustPattern; type: RustType }[]
  result?: RustType
  where?: { type: RustType; bounds: RustType[] }[]
  body?: RustStatement[]
  attributes?: RustAttribute[]
  doc?: string
}

export type RustItem =
  | { kind: 'use'; path: string; visibility?: RustVisibility }
  | {
      kind: 'struct'
      name: string
      visibility?: RustVisibility
      generics?: RustGeneric[]
      fields: { kind: 'tuple' | 'struct' | 'unit'; items: RustField[] }
      attributes?: RustAttribute[]
      doc?: string
    }
  | {
      kind: 'enum'
      name: string
      visibility?: RustVisibility
      generics?: RustGeneric[]
      variants: RustVariant[]
      attributes?: RustAttribute[]
      doc?: string
    }
  | {
      kind: 'impl'
      generics?: RustGeneric[]
      trait?: RustType
      type: RustType
      where?: { type: RustType; bounds: RustType[] }[]
      items: (
        | RustFunction
        | { kind: 'type'; name: string; type: RustType }
        | { kind: 'const'; name: string; type: RustType; value: RustExpression }
        | { kind: 'macro'; path: string[] }
      )[]
      attributes?: RustAttribute[]
    }
  | RustFunction
  | { kind: 'type'; name: string; visibility?: RustVisibility; generics?: RustGeneric[]; type: RustType; doc?: string }
  | { kind: 'const'; name: string; visibility?: RustVisibility; type: RustType; value: RustExpression; doc?: string }
  | { kind: 'mod'; name: string; visibility?: RustVisibility; items?: RustItem[]; attributes?: RustAttribute[] }

export const rust = {
  path: (...path: string[]): RustType => ({ kind: 'path', path }),
  generic: (path: string | string[], ...generics: RustType[]): RustType => ({
    kind: 'path',
    path: typeof path === 'string' ? [path] : path,
    generics,
  }),
  option: (type: RustType): RustType => ({ kind: 'path', path: ['Option'], generics: [type] }),
  vec: (type: RustType): RustType => ({ kind: 'path', path: ['Vec'], generics: [type] }),
  ref: (type: RustType, lifetime?: string): RustType => ({
    kind: 'reference',
    type,
    ...(lifetime ? { lifetime } : {}),
  }),
  ident: (name: string): RustExpression => ({ kind: 'path', path: [name] }),
  expressionPath: (...path: string[]): RustExpression => ({ kind: 'path', path }),
  string: (value: string): RustExpression => ({ kind: 'string', value }),
  number: (value: number | bigint | string): RustExpression => ({ kind: 'number', value: String(value) }),
  bool: (value: boolean): RustExpression => ({ kind: 'bool', value }),
  call: (callee: RustExpression, ...arguments_: RustExpression[]): RustExpression => ({
    kind: 'call',
    callee,
    arguments: arguments_,
  }),
  method: (receiver: RustExpression, name: string, ...arguments_: RustExpression[]): RustExpression => ({
    kind: 'method',
    receiver,
    name,
    arguments: arguments_,
  }),
  field: (receiver: RustExpression, name: string): RustExpression => ({ kind: 'field', receiver, name }),
  try: (value: RustExpression): RustExpression => ({ kind: 'try', value }),
  await: (value: RustExpression): RustExpression => ({ kind: 'await', value }),
  ref_: (operand: RustExpression): RustExpression => ({ kind: 'unary', operator: '&', operand }),
  macro: (name: string, ...arguments_: RustExpression[]): RustExpression => ({
    kind: 'macro',
    name,
    arguments: arguments_,
  }),
  let: (name: string, value: RustExpression, type?: RustType, mutable = false): RustStatement => ({
    kind: 'let',
    pattern: { kind: 'ident', name, ...(mutable ? { mutable } : {}) },
    value,
    ...(type ? { type } : {}),
  }),
  expression: (value: RustExpression, semicolon = true): RustStatement => ({
    kind: 'expression',
    value,
    semicolon,
  }),
  return: (value: RustExpression): RustStatement => ({ kind: 'expression', value, semicolon: false }),
  binding: (name: string): RustPattern => ({ kind: 'ident', name }),
  derive: (...names: string[]): RustAttribute => ({ path: 'derive', arguments: names }),
}

const KEYWORDS = new Set([
  'as', 'async', 'await', 'box', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum',
  'extern', 'false', 'fn', 'for', 'gen', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move',
  'mut', 'pub', 'ref', 'return', 'static', 'struct', 'super', 'trait', 'true', 'try', 'type',
  'unsafe', 'use', 'where', 'while', 'yield', 'abstract', 'become', 'do', 'final', 'macro',
  'override', 'priv', 'typeof', 'unsized', 'virtual',
])
const RESERVED_RAW = new Set(['crate', 'self', 'Self', 'super'])

// An identifier, written raw where it is a keyword.
export function rustIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) throw new Error(`Invalid Rust identifier: ${name}`)
  if (RESERVED_RAW.has(name)) throw new Error(`Rust identifier cannot be raw: ${name}`)
  return KEYWORDS.has(name) ? `r#${name}` : name
}
const segment = (name: string): string =>
  ['crate', 'self', 'Self', 'super'].includes(name) || /^'/u.test(name) ? name : rustIdentifier(name)
const pathText = (path: string[]): string => path.map(segment).join('::')

export function printRustType(type: RustType): string {
  switch (type.kind) {
    case 'path':
      return `${pathText(type.path)}${type.generics?.length ? `<${type.generics.map(printRustType).join(', ')}>` : ''}`
    case 'reference':
      return `&${type.lifetime ? `'${type.lifetime} ` : ''}${type.mutable ? 'mut ' : ''}${printRustType(type.type)}`
    case 'tuple':
      return type.items.length === 1
        ? `(${printRustType(type.items[0]!)},)`
        : `(${type.items.map(printRustType).join(', ')})`
    case 'slice':
      return `[${printRustType(type.type)}]`
    case 'impl':
      return `impl ${type.bounds.map(printRustType).join(' + ')}`
    case 'dyn':
      return `dyn ${type.bounds.map(printRustType).join(' + ')}`
    case 'function':
      return `fn(${type.parameters.map(printRustType).join(', ')})${type.result ? ` -> ${printRustType(type.result)}` : ''}`
    case 'infer':
      return '_'
    case 'lifetime':
      return `'${type.name}`
  }
}

function printPattern(pattern: RustPattern): string {
  switch (pattern.kind) {
    case 'ident':
      return `${pattern.reference ? 'ref ' : ''}${pattern.mutable ? 'mut ' : ''}${rustIdentifier(pattern.name)}`
    case 'wild':
      return '_'
    case 'path':
      return pathText(pattern.path)
    case 'tuple-struct':
      return `${pathText(pattern.path)}(${pattern.items.map(printPattern).join(', ')})`
    case 'struct': {
      const fields = pattern.fields.map((field) =>
        field.pattern ? `${rustIdentifier(field.name)}: ${printPattern(field.pattern)}` : rustIdentifier(field.name),
      )
      if (pattern.rest) fields.push('..')
      return `${pathText(pattern.path)} { ${fields.join(', ')} }`
    }
    case 'tuple':
      return `(${pattern.items.map(printPattern).join(', ')}${pattern.items.length === 1 ? ',' : ''})`
    case 'literal':
      return printExpression(pattern.value, 0)
    case 'or':
      return pattern.items.map(printPattern).join(' | ')
    case 'reference':
      return `&${printPattern(pattern.pattern)}`
  }
}

const indentation = (depth: number): string => '    '.repeat(depth)

function stringLiteral(value: string): string {
  let text = '"'
  for (const char of value) {
    const code = char.codePointAt(0)!
    if (char === '"') text += '\\"'
    else if (char === '\\') text += '\\\\'
    else if (char === '\n') text += '\\n'
    else if (char === '\r') text += '\\r'
    else if (char === '\t') text += '\\t'
    else if (code < 0x20 || code === 0x7f) text += `\\u{${code.toString(16)}}`
    else text += char
  }
  return `${text}"`
}

function printBlock(statements: RustStatement[], depth: number): string {
  if (!statements.length) return '{}'
  return `{\n${statements.map((statement) => printStatement(statement, depth + 1)).join('\n')}\n${indentation(depth)}}`
}

function printExpression(expression: RustExpression, depth: number): string {
  switch (expression.kind) {
    case 'path':
      return `${pathText(expression.path)}${expression.generics?.length ? `::<${expression.generics.map(printRustType).join(', ')}>` : ''}`
    case 'string':
      return stringLiteral(expression.value)
    case 'number':
      return expression.value
    case 'bool':
      return String(expression.value)
    case 'char':
      return `'${expression.value === "'" ? "\\'" : expression.value === '\\' ? '\\\\' : expression.value}'`
    case 'call':
      return `${printExpression(expression.callee, depth)}(${expression.arguments.map((item) => printExpression(item, depth)).join(', ')})`
    case 'method':
      return `${printExpression(expression.receiver, depth)}.${rustIdentifier(expression.name)}${expression.generics?.length ? `::<${expression.generics.map(printRustType).join(', ')}>` : ''}(${expression.arguments.map((item) => printExpression(item, depth)).join(', ')})`
    case 'field':
      return `${printExpression(expression.receiver, depth)}.${/^\d+$/u.test(expression.name) ? expression.name : rustIdentifier(expression.name)}`
    case 'index':
      return `${printExpression(expression.receiver, depth)}[${printExpression(expression.index, depth)}]`
    case 'struct': {
      const fields = expression.fields.map((field) =>
        field.value ? `${rustIdentifier(field.name)}: ${printExpression(field.value, depth + 1)}` : rustIdentifier(field.name),
      )
      if (expression.base) fields.push(`..${printExpression(expression.base, depth + 1)}`)
      if (!fields.length) return `${pathText(expression.path)} {}`
      return `${pathText(expression.path)} {\n${fields.map((field) => `${indentation(depth + 1)}${field},`).join('\n')}\n${indentation(depth)}}`
    }
    case 'tuple':
      return `(${expression.items.map((item) => printExpression(item, depth)).join(', ')}${expression.items.length === 1 ? ',' : ''})`
    case 'array':
      return `[${expression.items.map((item) => printExpression(item, depth)).join(', ')}]`
    case 'macro': {
      const [open, close] = expression.delimiter === '[' ? ['[', ']'] : ['(', ')']
      return `${expression.name}!${open}${expression.arguments.map((item) => printExpression(item, depth)).join(', ')}${close}`
    }
    case 'unary':
      return `${expression.operator}${printExpression(expression.operand, depth)}`
    case 'binary':
      return `${printExpression(expression.left, depth)} ${expression.operator} ${printExpression(expression.right, depth)}`
    case 'cast':
      return `${printExpression(expression.value, depth)} as ${printRustType(expression.type)}`
    case 'try':
      return `${printExpression(expression.value, depth)}?`
    case 'await':
      return `${printExpression(expression.value, depth)}.await`
    case 'closure':
      return `${expression.move ? 'move ' : ''}|${expression.parameters
        .map((parameter) => `${printPattern(parameter.pattern)}${parameter.type ? `: ${printRustType(parameter.type)}` : ''}`)
        .join(', ')}| ${printExpression(expression.body, depth)}`
    case 'block':
      return `${expression.unsafe ? 'unsafe ' : ''}${expression.async ? 'async ' : ''}${expression.move ? 'move ' : ''}${printBlock(expression.statements, depth)}`
    case 'if': {
      const otherwise =
        expression.else === undefined
          ? ''
          : Array.isArray(expression.else)
            ? ` else ${printBlock(expression.else, depth)}`
            : ` else ${printExpression(expression.else, depth)}`
      return `if ${printExpression(expression.condition, depth)} ${printBlock(expression.then, depth)}${otherwise}`
    }
    case 'if-let':
      return `if let ${printPattern(expression.pattern)} = ${printExpression(expression.value, depth)} ${printBlock(expression.then, depth)}${expression.else ? ` else ${printBlock(expression.else, depth)}` : ''}`
    case 'match':
      return `match ${printExpression(expression.value, depth)} {\n${expression.arms
        .map(
          (arm) =>
            `${indentation(depth + 1)}${printPattern(arm.pattern)}${arm.guard ? ` if ${printExpression(arm.guard, depth + 1)}` : ''} => ${printExpression(arm.body, depth + 1)},`,
        )
        .join('\n')}\n${indentation(depth)}}`
    case 'return':
      return expression.value ? `return ${printExpression(expression.value, depth)}` : 'return'
    case 'range':
      return `${expression.from ? printExpression(expression.from, depth) : ''}${expression.inclusive ? '..=' : '..'}${expression.to ? printExpression(expression.to, depth) : ''}`
    case 'paren':
      return `(${printExpression(expression.value, depth)})`
    case 'qualified':
      return `<${printRustType(expression.type)} as ${printRustType(expression.trait)}>::${rustIdentifier(expression.name)}`
  }
}

function printStatement(statement: RustStatement, depth: number): string {
  const pad = indentation(depth)
  switch (statement.kind) {
    case 'let':
      return `${pad}let ${printPattern(statement.pattern)}${statement.type ? `: ${printRustType(statement.type)}` : ''}${statement.value ? ` = ${printExpression(statement.value, depth)}` : ''}${statement.else ? ` else ${printBlock(statement.else, depth)}` : ''};`
    case 'expression':
      return `${pad}${printExpression(statement.value, depth)}${statement.semicolon === false ? '' : ';'}`
    case 'item':
      return printItem(statement.item, depth)
    case 'for':
      return `${pad}for ${printPattern(statement.pattern)} in ${printExpression(statement.iterable, depth)} ${printBlock(statement.body, depth)}`
  }
}

function printAttributes(attributes: RustAttribute[] | undefined, depth: number): string {
  return (attributes ?? [])
    .map((attribute) => `${indentation(depth)}#[${attribute.path}${attribute.arguments ? `(${attribute.arguments.join(', ')})` : ''}]\n`)
    .join('')
}
function printDoc(doc: string | undefined, depth: number): string {
  return doc
    ? doc
        .split('\n')
        .map((line) => `${indentation(depth)}///${line ? ` ${line}` : ''}\n`)
        .join('')
    : ''
}
const visibility = (value: RustVisibility): string => (value ? `${value} ` : '')
function printGenerics(generics: RustGeneric[] | undefined): string {
  if (!generics?.length) return ''
  return `<${generics
    .map((generic) =>
      generic.lifetime
        ? `'${generic.name}`
        : `${generic.name}${generic.bounds?.length ? `: ${generic.bounds.map(printRustType).join(' + ')}` : ''}`,
    )
    .join(', ')}>`
}
function printWhere(where: { type: RustType; bounds: RustType[] }[] | undefined, depth: number): string {
  if (!where?.length) return ''
  return `\nwhere\n${where
    .map((clause) => `${indentation(depth + 1)}${printRustType(clause.type)}: ${clause.bounds.map(printRustType).join(' + ')},`)
    .join('\n')}\n${indentation(depth)}`
}
function printField(field: RustField, depth: number, tuple: boolean): string {
  const text = `${visibility(field.visibility)}${field.name && !tuple ? `${rustIdentifier(field.name)}: ` : ''}${printRustType(field.type)}`
  return tuple ? text : `${printDoc(field.doc, depth)}${printAttributes(field.attributes, depth)}${indentation(depth)}${text},`
}

function printFunction(item: RustFunction, depth: number): string {
  const parameters = [
    ...(item.receiver ? [item.receiver] : []),
    ...item.parameters.map((parameter) => `${printPattern(parameter.pattern)}: ${printRustType(parameter.type)}`),
  ]
  const where = printWhere(item.where, depth)
  return `${printDoc(item.doc, depth)}${printAttributes(item.attributes, depth)}${indentation(depth)}${visibility(item.visibility)}${item.async ? 'async ' : ''}fn ${rustIdentifier(item.name)}${printGenerics(item.generics)}(${parameters.join(', ')})${item.result ? ` -> ${printRustType(item.result)}` : ''}${where}${item.body ? `${where ? '' : ' '}${printBlock(item.body, depth)}` : ';'}`
}

export function printItem(item: RustItem, depth = 0): string {
  const pad = indentation(depth)
  switch (item.kind) {
    case 'use':
      return `${pad}${visibility(item.visibility)}use ${item.path};`
    case 'struct': {
      const head = `${printDoc(item.doc, depth)}${printAttributes(item.attributes, depth)}${pad}${visibility(item.visibility)}struct ${rustIdentifier(item.name)}${printGenerics(item.generics)}`
      if (item.fields.kind === 'unit') return `${head};`
      if (item.fields.kind === 'tuple')
        return `${head}(${item.fields.items.map((field) => printField(field, depth, true)).join(', ')});`
      if (!item.fields.items.length) return `${head} {}`
      return `${head} {\n${item.fields.items.map((field) => printField(field, depth + 1, false)).join('\n')}\n${pad}}`
    }
    case 'enum': {
      const variants = item.variants.map((variant) => {
        const head = `${printDoc(variant.doc, depth + 1)}${printAttributes(variant.attributes, depth + 1)}${indentation(depth + 1)}${rustIdentifier(variant.name)}`
        if (!variant.fields) return `${head},`
        if (variant.fields.kind === 'tuple')
          return `${head}(${variant.fields.items.map((field) => printField(field, depth + 1, true)).join(', ')}),`
        return `${head} {\n${variant.fields.items.map((field) => printField(field, depth + 2, false)).join('\n')}\n${indentation(depth + 1)}},`
      })
      return `${printDoc(item.doc, depth)}${printAttributes(item.attributes, depth)}${pad}${visibility(item.visibility)}enum ${rustIdentifier(item.name)}${printGenerics(item.generics)} {\n${variants.join('\n')}\n${pad}}`
    }
    case 'impl': {
      const members = item.items.map((member) =>
        member.kind === 'fn'
          ? printFunction(member, depth + 1)
          : member.kind === 'type'
            ? `${indentation(depth + 1)}type ${rustIdentifier(member.name)} = ${printRustType(member.type)};`
            : member.kind === 'macro'
              ? `${indentation(depth + 1)}${pathText(member.path)}!();`
              : `${indentation(depth + 1)}const ${member.name}: ${printRustType(member.type)} = ${printExpression(member.value, depth + 1)};`,
      )
      const where = printWhere(item.where, depth)
      return `${printAttributes(item.attributes, depth)}${pad}impl${printGenerics(item.generics)} ${item.trait ? `${printRustType(item.trait)} for ` : ''}${printRustType(item.type)}${where}${where ? '' : ' '}{\n${members.join('\n\n')}\n${pad}}`
    }
    case 'fn':
      return printFunction(item, depth)
    case 'type':
      return `${printDoc(item.doc, depth)}${pad}${visibility(item.visibility)}type ${rustIdentifier(item.name)}${printGenerics(item.generics)} = ${printRustType(item.type)};`
    case 'const':
      return `${printDoc(item.doc, depth)}${pad}${visibility(item.visibility)}const ${item.name}: ${printRustType(item.type)} = ${printExpression(item.value, depth)};`
    case 'mod':
      return item.items
        ? `${printAttributes(item.attributes, depth)}${pad}${visibility(item.visibility)}mod ${rustIdentifier(item.name)} {\n${item.items.map((member) => printItem(member, depth + 1)).join('\n\n')}\n${pad}}`
        : `${printAttributes(item.attributes, depth)}${pad}${visibility(item.visibility)}mod ${rustIdentifier(item.name)};`
  }
}

// A source file of items, separated by blank lines, with an optional header comment.
export function printRustFile(
  items: readonly RustItem[],
  header?: string,
  innerAttributes: readonly RustAttribute[] = [],
): string {
  const uses = items.filter((item) => item.kind === 'use')
  const rest = items.filter((item) => item.kind !== 'use')
  const inner = innerAttributes
    .map((attribute) => `#![${attribute.path}${attribute.arguments ? `(${attribute.arguments.join(', ')})` : ''}]\n`)
    .join('')
  return `${header ? `${header.split('\n').map((line) => `//${line ? ` ${line}` : ''}`).join('\n')}\n\n` : ''}${inner ? `${inner}\n` : ''}${[
    uses.map((item) => printItem(item)).join('\n'),
    ...rest.map((item) => printItem(item)),
  ]
    .filter(Boolean)
    .join('\n\n')}\n`
}
