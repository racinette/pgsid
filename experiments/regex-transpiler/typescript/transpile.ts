import { readFileSync, writeFileSync } from 'node:fs'

type TypeNode =
  | { kind: 'path'; segments: string[]; typeArguments?: TypeNode[] }
  | { kind: 'reference'; inner: TypeNode }

type Expr =
  | { kind: 'path'; segments: string[] }
  | { kind: 'integer'; digits: string }
  | { kind: 'parenthesized'; inner: Expr }
  | { kind: 'binary'; operator: string; left: Expr; right: Expr }
  | { kind: 'field'; base: Expr; member: string }
  | { kind: 'index'; base: Expr; index: Expr }
  | { kind: 'method-call'; receiver: Expr; method: string; arguments: Expr[] }
  | { kind: 'struct-literal'; path: string[]; fields: { name: string; value: Expr }[] }
  | { kind: 'call'; callee: Expr; arguments: Expr[] }
  | { kind: 'if' | 'while'; condition: Expr; body: Stmt[] }
  | { kind: 'return'; value: Expr }
  | { kind: 'break' }

type Stmt =
  | {
      kind: 'local'
      binding: { name: string; mutable: boolean }
      type?: TypeNode
      initializer: Expr
    }
  | { kind: 'expression'; semicolon: boolean; value: Expr }

type Item =
  | { kind: 'constant'; visibility: string; name: string; type: TypeNode; value: Expr }
  | {
      kind: 'struct'
      visibility: string
      name: string
      derives: string[]
      fields: { visibility: string; name: string; type: TypeNode }[]
    }
  | {
      kind: 'enum'
      visibility: string
      name: string
      derives: string[]
      variants: { name: string; payload?: TypeNode }[]
    }
  | {
      kind: 'function'
      visibility: string
      name: string
      parameters: { name: string; mutable: boolean; type: TypeNode }[]
      returnType: TypeNode
      body: Stmt[]
    }

type Document = { schemaVersion: number; items: Item[] }

class Writer {
  readonly lines: string[] = []
  indent = 0

  line(value = ''): void {
    this.lines.push(`${'  '.repeat(this.indent)}${value}`)
  }

  text(): string {
    return `${this.lines.join('\n')}\n`
  }
}

class Transpiler {
  private readonly writer = new Writer()
  private readonly structs = new Map<string, Extract<Item, { kind: 'struct' }>>()
  private readonly enums = new Map<string, Extract<Item, { kind: 'enum' }>>()
  private readonly constants = new Map<string, string>()
  private readonly copy = new Set<string>()
  private readonly equality = new Set<string>()

  constructor(private readonly document: Document) {
    if (document.schemaVersion !== 1)
      throw new Error(`unsupported AST version ${document.schemaVersion}`)
    for (const item of document.items) {
      if (item.kind === 'constant') this.constants.set(item.name, this.path(item.type))
      if (item.kind === 'struct' || item.kind === 'enum') {
        if (item.kind === 'struct') this.structs.set(item.name, item)
        else this.enums.set(item.name, item)
        if (item.derives.includes('Copy')) this.copy.add(item.name)
        if (item.derives.includes('PartialEq')) this.equality.add(item.name)
      }
    }
  }

  private path(type: TypeNode): string {
    if (type.kind === 'reference') return `&${this.path(type.inner)}`
    const name = type.segments.join('::')
    if (type.typeArguments)
      return `${name}<${type.typeArguments.map((item) => this.path(item)).join(',')}>`
    return name
  }

  private type(type: TypeNode): string {
    return this.typeName(this.path(type))
  }

  private typeName(name: string): string {
    if (['usize', 'u32', 'i32'].includes(name)) return 'number'
    if (name === 'bool') return 'boolean'
    if (['char', 'str', '&str'].includes(name)) return 'string'
    if (name === 'Vec<char>') return 'string[]'
    if (this.structs.has(name) || this.enums.has(name)) return name
    throw new Error(`type outside TypeScript lowering: ${name}`)
  }

  private clone(value: string, type: TypeNode | string): string {
    const name = typeof type === 'string' ? type : this.path(type)
    return this.copy.has(name) ? `clone${name}(${value})` : value
  }

  private equal(left: string, right: string, type: TypeNode | string): string {
    const name = typeof type === 'string' ? type : this.path(type)
    return this.equality.has(name) ? `equal${name}(${left}, ${right})` : `${left} === ${right}`
  }

  private infer(value: Expr, locals: Map<string, string>): string | undefined {
    switch (value.kind) {
      case 'path':
        if (value.segments.length === 2 && this.enums.has(value.segments[0]!)) {
          return value.segments[0]
        }
        return (
          locals.get(value.segments.join('::')) ?? this.constants.get(value.segments.join('::'))
        )
      case 'integer':
        return 'usize'
      case 'parenthesized':
        return this.infer(value.inner, locals)
      case 'binary':
        if (value.operator === 'add' || value.operator === 'subtract') {
          return this.infer(value.left, locals)
        }
        return value.operator === 'add-assign' ? undefined : 'bool'
      case 'field': {
        const base = this.infer(value.base, locals)
        const field = base
          ? this.structs.get(base)?.fields.find((candidate) => candidate.name === value.member)
          : undefined
        return field ? this.path(field.type) : undefined
      }
      case 'index':
        return this.infer(value.base, locals) === 'Vec<char>' ? 'char' : undefined
      case 'struct-literal':
        return value.path.join('::')
      case 'method-call':
        return value.method === 'collect'
          ? 'Vec<char>'
          : value.method === 'len'
            ? 'usize'
            : undefined
      case 'call':
        return value.callee.kind === 'path' && value.callee.segments.length === 2
          ? value.callee.segments[0]
          : undefined
      default:
        return undefined
    }
  }

  private expression(value: Expr, locals: Map<string, string>): string {
    switch (value.kind) {
      case 'path': {
        if (value.segments.length === 1) return value.segments[0]!
        const [enumName, variant] = value.segments
        const item = this.enums.get(enumName!)
        if (!item?.variants.some((candidate) => candidate.name === variant && !candidate.payload)) {
          throw new Error(`unknown unit variant ${value.segments.join('::')}`)
        }
        return `{ kind: '${variant}' }`
      }
      case 'integer':
        return value.digits
      case 'parenthesized':
        return `(${this.expression(value.inner, locals)})`
      case 'binary': {
        const left = this.expression(value.left, locals)
        const right = this.expression(value.right, locals)
        if (value.operator === 'equal' || value.operator === 'not-equal') {
          const equality = this.equal(left, right, this.infer(value.left, locals) ?? '')
          return value.operator === 'equal' ? equality : `!(${equality})`
        }
        const symbols: Record<string, string> = {
          add: '+',
          subtract: '-',
          'less-than': '<',
          'less-or-equal': '<=',
          'greater-than': '>',
          'greater-or-equal': '>=',
          and: '&&',
          or: '||',
          'add-assign': '+=',
        }
        const operator = symbols[value.operator]
        if (!operator) throw new Error(`unknown operator ${value.operator}`)
        return `${left} ${operator} ${right}`
      }
      case 'field':
        return `${this.expression(value.base, locals)}.${value.member}`
      case 'index':
        return `${this.expression(value.base, locals)}[${this.expression(value.index, locals)}]`
      case 'method-call': {
        if (value.method === 'len' && value.arguments.length === 0) {
          return `${this.expression(value.receiver, locals)}.length`
        }
        if (
          value.method === 'collect' &&
          value.arguments.length === 0 &&
          value.receiver.kind === 'method-call' &&
          value.receiver.method === 'chars' &&
          value.receiver.arguments.length === 0
        ) {
          return `Array.from(${this.expression(value.receiver.receiver, locals)})`
        }
        throw new Error(`unsupported method ${value.method}`)
      }
      case 'struct-literal':
        return `{ ${value.fields.map((field) => `${field.name}: ${this.expression(field.value, locals)}`).join(', ')} }`
      case 'call': {
        if (
          value.callee.kind !== 'path' ||
          value.callee.segments.length !== 2 ||
          value.arguments.length !== 1
        )
          throw new Error('unsupported call')
        const [enumName, variant] = value.callee.segments
        const payload = this.enums
          .get(enumName!)
          ?.variants.find((candidate) => candidate.name === variant)?.payload
        if (!payload) throw new Error(`unknown payload variant ${enumName}::${variant}`)
        return `{ kind: '${variant}', value: ${this.clone(this.expression(value.arguments[0]!, locals), payload)} }`
      }
      default:
        throw new Error(`expression ${value.kind} needs statement lowering`)
    }
  }

  private statements(statements: Stmt[], locals: Map<string, string>): void {
    for (const [index, statement] of statements.entries()) {
      if (statement.kind === 'local') {
        const name = statement.binding.name
        const type = statement.type
          ? this.path(statement.type)
          : this.infer(statement.initializer, locals)
        if (!type) throw new Error(`cannot infer ${name}`)
        const value = this.clone(this.expression(statement.initializer, locals), type)
        this.writer.line(
          `${statement.binding.mutable ? 'let' : 'const'} ${name}: ${this.typeName(type)} = ${value};`,
        )
        locals.set(name, type)
        continue
      }
      const value = statement.value
      if (value.kind === 'return') {
        this.writer.line(`return ${this.expression(value.value, locals)};`)
      } else if (value.kind === 'break') {
        this.writer.line('break;')
      } else if (value.kind === 'if' || value.kind === 'while') {
        const condition = this.expression(value.condition, locals)
        this.writer.line(`${value.kind} (${condition}) {`)
        this.writer.indent++
        this.statements(value.body, new Map(locals))
        this.writer.indent--
        this.writer.line('}')
      } else {
        const result = this.expression(value, locals)
        this.writer.line(
          index === statements.length - 1 && !statement.semicolon
            ? `return ${result};`
            : `${result};`,
        )
      }
    }
  }

  private emitStruct(item: Extract<Item, { kind: 'struct' }>): void {
    this.writer.line(`${item.visibility === 'public' ? 'export ' : ''}interface ${item.name} {`)
    this.writer.indent++
    for (const field of item.fields) this.writer.line(`${field.name}: ${this.type(field.type)};`)
    this.writer.indent--
    this.writer.line('}')
    if (this.copy.has(item.name)) {
      this.writer.line(`function clone${item.name}(value: ${item.name}): ${item.name} {`)
      this.writer.indent++
      this.writer.line(
        `return { ${item.fields.map((field) => `${field.name}: ${this.clone(`value.${field.name}`, field.type)}`).join(', ')} };`,
      )
      this.writer.indent--
      this.writer.line('}')
    }
    if (this.equality.has(item.name)) {
      this.writer.line(
        `function equal${item.name}(left: ${item.name}, right: ${item.name}): boolean {`,
      )
      this.writer.indent++
      this.writer.line(
        `return ${item.fields.map((field) => this.equal(`left.${field.name}`, `right.${field.name}`, field.type)).join(' && ')};`,
      )
      this.writer.indent--
      this.writer.line('}')
    }
  }

  private emitEnum(item: Extract<Item, { kind: 'enum' }>): void {
    this.writer.line(`${item.visibility === 'public' ? 'export ' : ''}type ${item.name} =`)
    this.writer.indent++
    item.variants.forEach((variant, index) =>
      this.writer.line(
        `| { kind: '${variant.name}'${variant.payload ? `; value: ${this.type(variant.payload)}` : ''} }${index === item.variants.length - 1 ? ';' : ''}`,
      ),
    )
    this.writer.indent--
    if (this.copy.has(item.name)) {
      this.writer.line(`function clone${item.name}(value: ${item.name}): ${item.name} {`)
      this.writer.indent++
      this.writer.line('switch (value.kind) {')
      this.writer.indent++
      for (const variant of item.variants) {
        this.writer.line(
          `case '${variant.name}': return ${variant.payload ? `{ kind: '${variant.name}', value: ${this.clone('value.value', variant.payload)} }` : 'value'};`,
        )
      }
      this.writer.indent--
      this.writer.line('}')
      this.writer.indent--
      this.writer.line('}')
    }
    if (this.equality.has(item.name)) {
      this.writer.line(
        `function equal${item.name}(left: ${item.name}, right: ${item.name}): boolean {`,
      )
      this.writer.indent++
      this.writer.line('if (left.kind !== right.kind) return false;')
      for (const variant of item.variants) {
        if (variant.payload)
          this.writer.line(
            `if (left.kind === '${variant.name}' && right.kind === '${variant.name}') return ${this.equal('left.value', 'right.value', variant.payload)};`,
          )
      }
      this.writer.line('return true;')
      this.writer.indent--
      this.writer.line('}')
    }
  }

  transpile(): string {
    for (const item of this.document.items) {
      switch (item.kind) {
        case 'constant':
          this.writer.line(
            `${item.visibility === 'public' ? 'export ' : ''}const ${item.name} = ${this.expression(item.value, new Map())};`,
          )
          break
        case 'struct':
          this.emitStruct(item)
          break
        case 'enum':
          this.emitEnum(item)
          break
        case 'function': {
          this.writer.line(
            `${item.visibility === 'public' ? 'export ' : ''}function ${item.name}(${item.parameters.map((parameter) => `${parameter.name}: ${this.type(parameter.type)}`).join(', ')}): ${this.type(item.returnType)} {`,
          )
          this.writer.indent++
          const locals = new Map(
            item.parameters.map((parameter) => [parameter.name, this.path(parameter.type)]),
          )
          this.statements(item.body, locals)
          this.writer.indent--
          this.writer.line('}')
          break
        }
        default:
          throw new Error('unknown item kind')
      }
      this.writer.line()
    }
    return this.writer.text()
  }
}

export function transpile(document: Document): string {
  return new Transpiler(document).transpile()
}

if (process.argv[1]?.endsWith('/transpile.ts')) {
  const [source, output] = process.argv.slice(2)
  if (!source || !output) throw new Error('usage: transpile.ts AST_JSON OUTPUT_TS')
  writeFileSync(output, transpile(JSON.parse(readFileSync(source, 'utf8')) as Document))
}
