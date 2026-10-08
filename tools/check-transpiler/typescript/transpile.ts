import { readFileSync, writeFileSync } from 'node:fs'
import ts from 'typescript'

type TypeNode =
  | { kind: 'path'; segments: string[]; typeArguments?: TypeNode[] }
  | { kind: 'reference'; inner: TypeNode }
  | { kind: 'slice'; inner: TypeNode }

type Expr =
  | { kind: 'array'; elements: Expr[] }
  | { kind: 'path'; segments: string[] }
  | { kind: 'float'; digits: string }
  | { kind: 'integer'; digits: string; integerType?: 'i64' }
  | { kind: 'character'; scalar: string }
  | { kind: 'character-from-codepoint'; value: Expr; fallback: Expr }
  | { kind: 'boolean'; state: boolean }
  | { kind: 'string'; text: string }
  | { kind: 'parenthesized'; inner: Expr }
  | { kind: 'borrow'; value: Expr }
  | { kind: 'unary'; operator: 'negate'; value: Expr }
  | { kind: 'cast'; value: Expr; targetType: TypeNode }
  | { kind: 'binary'; operator: string; left: Expr; right: Expr }
  | { kind: 'assign'; left: Expr; right: Expr }
  | { kind: 'field'; base: Expr; member: string }
  | { kind: 'index'; base: Expr; index: Expr }
  | { kind: 'method-call'; receiver: Expr; method: string; arguments: Expr[] }
  | { kind: 'struct-literal'; path: string[]; fields: { name: string; value: Expr }[] }
  | { kind: 'call'; callee: Expr; arguments: Expr[] }
  | { kind: 'if'; condition: Expr; body: Stmt[]; elseBody?: Stmt[] }
  | {
      kind: 'if-let'
      enumName: string
      variant: string
      payloadBinding: string | null
      source: Expr
      body: Stmt[]
    }
  | { kind: 'while'; condition: Expr; body: Stmt[] }
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

type Document = {
  schemaVersion: number
  items: (Item & { module?: string; sourceFile?: string })[]
  modules?: { name: string; dependencies: string[] }[]
}
type TranspileOptions = { immutableValueTypes?: readonly string[] }

function pascalCase(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => {
      const word = part.toUpperCase() === part ? part.toLowerCase() : part
      return word[0]!.toUpperCase() + word.slice(1)
    })
    .join('')
}

function camelCase(name: string): string {
  const result = pascalCase(name)
  return result[0]!.toLowerCase() + result.slice(1)
}

const f64Methods: Record<string, string> = { abs: 'f64Abs', ln: 'f64Ln', log10: 'f64Log10' }
const f = ts.factory
const identifier = (name: string): ts.Identifier => f.createIdentifier(name)
const call = (name: string, ...args: ts.Expression[]): ts.Expression =>
  f.createCallExpression(identifier(name), undefined, args)
const member = (base: ts.Expression, name: string): ts.Expression =>
  f.createPropertyAccessExpression(base, name)
const object = (fields: [string, ts.Expression][]): ts.Expression =>
  f.createObjectLiteralExpression(
    fields.map(([name, value]) => f.createPropertyAssignment(name, value)),
  )
const parameter = (name: string, type: ts.TypeNode): ts.ParameterDeclaration =>
  f.createParameterDeclaration(undefined, undefined, name, undefined, type)
const exported = (visibility: string): ts.Modifier[] | undefined =>
  visibility === 'public' ? [f.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined
const comparison = (
  left: ts.Expression,
  operator: ts.BinaryOperator,
  right: ts.Expression,
): ts.Expression => f.createBinaryExpression(left, operator, right)
const andAll = (values: ts.Expression[]): ts.Expression =>
  values.length === 0
    ? f.createTrue()
    : values
        .slice(1)
        .reduce(
          (left, right) => comparison(left, ts.SyntaxKind.AmpersandAmpersandToken, right),
          values[0]!,
        )

class Transpiler {
  private readonly structs = new Map<string, Extract<Item, { kind: 'struct' }>>()
  private readonly enums = new Map<string, Extract<Item, { kind: 'enum' }>>()
  private readonly functions = new Map<string, Extract<Item, { kind: 'function' }>>()
  private readonly constants = new Map<string, string>()
  private readonly names = new Map<string, string>()
  private readonly copy = new Set<string>()
  private readonly immutableValues: Set<string>
  private readonly equality = new Set<string>()
  private readonly opaque = new Set<string>()
  private returningOpaque = false

  constructor(
    private readonly document: Document,
    options: TranspileOptions = {},
  ) {
    this.immutableValues = new Set(options.immutableValueTypes)
    if (document.schemaVersion !== 1)
      throw new Error(`unsupported AST version ${document.schemaVersion}`)
    for (const item of document.items) {
      this.names.set(
        item.name,
        item.kind === 'struct' || item.kind === 'enum'
          ? pascalCase(item.name)
          : camelCase(item.name),
      )
      if (item.kind === 'constant') this.constants.set(item.name, this.path(item.type))
      if (item.kind === 'function') this.functions.set(item.name, item)
      if (item.kind === 'struct' || item.kind === 'enum') {
        if (item.kind === 'struct') {
          this.structs.set(item.name, item)
          if (
            item.visibility === 'public' &&
            item.fields.length > 0 &&
            item.fields.every((field) => field.visibility === 'private')
          )
            this.opaque.add(item.name)
        } else this.enums.set(item.name, item)
        if (item.derives.includes('Copy')) this.copy.add(item.name)
        if (item.derives.includes('PartialEq')) this.equality.add(item.name)
      }
    }
    for (const name of this.immutableValues) {
      const item = this.structs.get(name) ?? this.enums.get(name)
      if (!item || !item.derives.includes('Clone') || this.opaque.has(name))
        throw new Error(`immutable value type must be a nonopaque Clone type: ${name}`)
      const types =
        item.kind === 'struct'
          ? item.fields.map((field) => field.type)
          : item.variants.flatMap((variant) => (variant.payload ? [variant.payload] : []))
      if (types.some((type) => !this.immutableField(type)))
        throw new Error(`immutable value type has an unsupported field: ${name}`)
    }
  }

  private immutableField(type: TypeNode): boolean {
    const name = this.path(type)
    return (
      ['usize', 'u32', 'i32', 'i64', 'f64', 'bool', 'char', '&str', 'String'].includes(name) ||
      this.immutableValues.has(name)
    )
  }

  private path(type: TypeNode): string {
    if (type.kind === 'slice') return `[${this.path(type.inner)}]`
    if (type.kind === 'reference') return `&${this.path(type.inner)}`
    const name = type.segments.join('::')
    return type.typeArguments
      ? `${name}<${type.typeArguments.map((item) => this.path(item)).join(',')}>`
      : name
  }

  private type(type: TypeNode): ts.TypeNode {
    return this.typeName(this.path(type))
  }

  private vectorElement(name: string): string | undefined {
    return name.startsWith('Vec<') && name.endsWith('>') ? name.slice(4, -1) : undefined
  }

  private typeName(name: string): ts.TypeNode {
    if (name === '&[u16]')
      return f.createTypeReferenceNode('Readonly', [f.createTypeReferenceNode('Uint16Array')])
    if (name.startsWith('&[') && name.endsWith(']'))
      return f.createTypeReferenceNode('ReadonlyArray', [this.typeName(name.slice(2, -1))])
    if (['usize', 'u16', 'u32', 'i32', 'f64'].includes(name))
      return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
    if (name === 'i64') return f.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword)
    if (name === 'bool') return f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
    if (['char', 'str', '&str', 'String'].includes(name))
      return f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    if (name.startsWith('&') && this.structs.has(name.slice(1))) return this.typeName(name.slice(1))
    if (name === 'Vec<char>')
      return f.createArrayTypeNode(f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))
    if (name === 'Vec<usize>')
      return f.createArrayTypeNode(f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword))
    const element = this.vectorElement(name)
    if (element && this.structs.has(element)) return f.createArrayTypeNode(this.typeName(element))
    if (this.structs.has(name) || this.enums.has(name))
      return f.createTypeReferenceNode(this.names.get(name)!)
    throw new Error(`type outside TypeScript lowering: ${name}`)
  }

  private clone(value: ts.Expression, type: TypeNode | string): ts.Expression {
    const name = typeof type === 'string' ? type : this.path(type)
    return this.copy.has(name) && !this.immutableValues.has(name)
      ? call(`copy${this.names.get(name)!}`, value)
      : value
  }

  private detach(value: ts.Expression, type: TypeNode | string): ts.Expression {
    const name = typeof type === 'string' ? type : this.path(type)
    if (name === 'usize' || name === 'u32') return call('checkedIndex', value)
    if (name === 'i32') return call('checkedI32', value)
    if (name === 'i64') return call('checkedI64', value)
    if (name === 'f64') return call('checkedF64', value)
    if (name === 'bool') return call('checkedBool', value)
    if (name === 'char') return call('checkedChar', value)
    if (name === '&str' || name === 'String') return call('checkedString', value)
    if (this.immutableValues.has(name)) return value
    if (name.startsWith('&') && this.structs.has(name.slice(1))) {
      const inner = name.slice(1)
      return this.opaque.has(inner)
        ? call('checkedOpaque', value)
        : call(`copy${this.names.get(inner)!}`, value)
    }
    if (name === 'Vec<char>') return call('checkedChars', value)
    if (name === 'Vec<usize>') return call('checkedIndices', value)
    const element = this.vectorElement(name)
    if (element && this.structs.has(element))
      return call('checkedStructs', value, identifier('copy' + this.names.get(element)!))
    return this.structs.has(name) || this.enums.has(name)
      ? call(`copy${this.names.get(name)!}`, value)
      : value
  }

  private equal(left: ts.Expression, right: ts.Expression, type: TypeNode | string): ts.Expression {
    const name = typeof type === 'string' ? type : this.path(type)
    return this.equality.has(name)
      ? call(`equal${this.names.get(name)!}`, left, right)
      : comparison(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right)
  }

  private infer(value: Expr, locals: Map<string, string>): string | undefined {
    switch (value.kind) {
      case 'path':
        if (value.segments.length === 2 && this.enums.has(value.segments[0]!))
          return value.segments[0]
        return (
          locals.get(value.segments.join('::')) ?? this.constants.get(value.segments.join('::'))
        )
      case 'float':
        return 'f64'
      case 'integer':
        return value.integerType ?? 'usize'
      case 'character':
      case 'character-from-codepoint':
        return 'char'
      case 'boolean':
        return 'bool'
      case 'string':
        return '&str'
      case 'parenthesized':
        return this.infer(value.inner, locals)
      case 'borrow': {
        const inner = this.infer(value.value, locals)
        return inner ? `&${inner}` : undefined
      }
      case 'unary':
        return this.infer(value.value, locals) === 'f64' ? 'f64' : 'i32'
      case 'cast':
        return this.path(value.targetType)
      case 'binary':
        if (['add', 'subtract', 'multiply', 'divide', 'remainder'].includes(value.operator))
          return this.infer(value.left, locals) === 'i32' ||
            this.infer(value.right, locals) === 'i32'
            ? 'i32'
            : this.infer(value.left, locals)
        return value.operator === 'add-assign' ? undefined : 'bool'
      case 'field': {
        const base = this.infer(value.base, locals)
        const field = base
          ? this.structs
              .get(base.startsWith('&') ? base.slice(1) : base)
              ?.fields.find((candidate) => candidate.name === value.member)
          : undefined
        return field ? this.path(field.type) : undefined
      }
      case 'index': {
        const base = this.infer(value.base, locals)
        return base?.startsWith('&[')
          ? base.slice(2, -1)
          : base
            ? this.vectorElement(base)
            : undefined
      }
      case 'struct-literal':
        return value.path.join('::')
      case 'method-call':
        if (['abs', 'ln', 'log10'].includes(value.method)) return 'f64'
        if (value.method === 'clone') return this.infer(value.receiver, locals)
        if (value.method === 'to_owned') return 'String'
        if (value.method === 'as_str') return '&str'
        return value.method === 'collect'
          ? 'Vec<char>'
          : value.method === 'len'
            ? 'usize'
            : value.method === 'to_ascii_lowercase'
              ? 'char'
              : undefined
      case 'call':
        if (value.callee.kind === 'path' && value.callee.segments.length === 1)
          return this.functions.get(value.callee.segments[0]!)
            ? this.path(this.functions.get(value.callee.segments[0]!)!.returnType)
            : undefined
        if (value.callee.kind === 'path' && value.callee.segments.join('::') === 'Vec::new')
          return 'Vec<usize>'
        return value.callee.kind === 'path' && value.callee.segments.length === 2
          ? value.callee.segments[0]
          : undefined
      default:
        return undefined
    }
  }

  private expression(value: Expr, locals: Map<string, string>): ts.Expression {
    switch (value.kind) {
      case 'array':
        return f.createArrayLiteralExpression(
          value.elements.map((entry) =>
            entry.kind === 'unary' && entry.value.kind === 'integer'
              ? f.createPrefixUnaryExpression(
                  ts.SyntaxKind.MinusToken,
                  this.expression(entry.value, locals),
                )
              : this.expression(entry, locals),
          ),
        )
      case 'path': {
        if (value.segments.length === 1) {
          const name = value.segments[0]!
          return identifier(
            locals.has(name) ? camelCase(name) : (this.names.get(name) ?? camelCase(name)),
          )
        }
        const [enumName, variant] = value.segments
        if (
          !this.enums
            .get(enumName!)
            ?.variants.some((candidate) => candidate.name === variant && !candidate.payload)
        )
          throw new Error(`unknown unit variant ${value.segments.join('::')}`)
        return object([['kind', f.createStringLiteral(variant!)]])
      }
      case 'float': {
        const literal = f.createNumericLiteral(value.digits.replace(/^-/, ''))
        return value.digits.startsWith('-')
          ? f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, literal)
          : literal
      }
      case 'integer':
        if (value.integerType === 'i64') {
          const literal = f.createBigIntLiteral(`${value.digits.replace(/^-/, '')}n`)
          return value.digits.startsWith('-')
            ? f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, literal)
            : literal
        }
        return f.createNumericLiteral(value.digits)
      case 'character-from-codepoint':
        return call(
          'characterFromI32',
          this.expression(value.value, locals),
          this.expression(value.fallback, locals),
        )
      case 'character':
        return f.createStringLiteral(value.scalar)
      case 'boolean':
        return value.state ? f.createTrue() : f.createFalse()
      case 'string':
        return f.createStringLiteral(value.text)
      case 'parenthesized':
        return f.createParenthesizedExpression(this.expression(value.inner, locals))
      case 'borrow':
        return this.expression(value.value, locals)
      case 'unary':
        if (value.operator !== 'negate') throw new Error('unsupported unary operator')
        return call(
          this.infer(value.value, locals) === 'f64' ? 'f64Negate' : 'checkedSignedNegate',
          this.expression(value.value, locals),
        )
      case 'cast':
        if (this.path(value.targetType) === 'f64')
          return call('Number', call('checkedI32', this.expression(value.value, locals)))
        if (this.path(value.targetType) === 'i32' && this.infer(value.value, locals) === 'f64')
          return call('f64ToI32', this.expression(value.value, locals))
        if (
          this.path(value.targetType) === 'u32' ||
          (this.path(value.targetType) === 'i32' && this.infer(value.value, locals) === 'char')
        )
          return f.createNonNullExpression(
            f.createCallExpression(
              member(call('checkedChar', this.expression(value.value, locals)), 'codePointAt'),
              undefined,
              [f.createNumericLiteral(0)],
            ),
          )
        if (this.path(value.targetType) === 'i32')
          return call(
            'Number',
            f.createCallExpression(member(identifier('BigInt'), 'asIntN'), undefined, [
              f.createNumericLiteral(32),
              call('checkedI64', this.expression(value.value, locals)),
            ]),
          )
        if (this.path(value.targetType) === 'i64')
          return call('BigInt', call('checkedI32', this.expression(value.value, locals)))
        if (this.path(value.targetType) === 'usize')
          return call('checkedIndex', this.expression(value.value, locals))
        throw new Error('unsupported cast target')
      case 'binary': {
        const left = this.expression(value.left, locals)
        const right = this.expression(value.right, locals)
        if (this.infer(value.left, locals) === 'f64') {
          const helpers: Record<string, string> = {
            add: 'f64Add',
            subtract: 'f64Subtract',
            multiply: 'f64Multiply',
            divide: 'f64Divide',
          }
          const helper = helpers[value.operator]
          if (helper) return call(helper, left, right)
        }
        const signed =
          this.infer(value.left, locals) === 'i32' || this.infer(value.right, locals) === 'i32'
        if (this.infer(value.left, locals) === 'i64') {
          if (value.operator === 'multiply') return call('checkedI64Multiply', left, right)
          if (value.operator === 'add') return call('checkedI64Add', left, right)
          if (value.operator === 'subtract') return call('checkedI64Subtract', left, right)
          if (value.operator === 'divide') return call('checkedI64Divide', left, right)
          if (value.operator === 'remainder') return call('checkedI64Remainder', left, right)
        }
        if (value.operator === 'multiply') return call('checkedSignedMultiply', left, right)
        if (value.operator === 'divide') return call('checkedSignedDivide', left, right)
        if (value.operator === 'remainder') return call('checkedSignedRemainder', left, right)
        if (value.operator === 'add')
          return call(signed ? 'checkedSignedAdd' : 'checkedAdd', left, right)
        if (value.operator === 'subtract')
          return call(signed ? 'checkedSignedSubtract' : 'checkedSubtract', left, right)
        if (value.operator === 'add-assign')
          return comparison(left, ts.SyntaxKind.EqualsToken, call('checkedAdd', left, right))
        if (value.operator === 'equal' || value.operator === 'not-equal') {
          const equality = this.equal(left, right, this.infer(value.left, locals) ?? '')
          return value.operator === 'equal'
            ? equality
            : f.createPrefixUnaryExpression(
                ts.SyntaxKind.ExclamationToken,
                f.createParenthesizedExpression(equality),
              )
        }
        const symbols: Record<string, ts.BinaryOperator> = {
          'less-than': ts.SyntaxKind.LessThanToken,
          'less-or-equal': ts.SyntaxKind.LessThanEqualsToken,
          'greater-than': ts.SyntaxKind.GreaterThanToken,
          'greater-or-equal': ts.SyntaxKind.GreaterThanEqualsToken,
          and: ts.SyntaxKind.AmpersandAmpersandToken,
          or: ts.SyntaxKind.BarBarToken,
        }
        const operator = symbols[value.operator]
        if (operator === undefined) throw new Error(`unknown operator ${value.operator}`)
        return comparison(left, operator, right)
      }
      case 'field':
        return member(this.expression(value.base, locals), camelCase(value.member))
      case 'index': {
        const baseType = this.infer(value.base, locals) ?? ''
        if (baseType.startsWith('&['))
          return call(
            'indexStatic',
            this.expression(value.base, locals),
            call('checkedIndex', this.expression(value.index, locals)),
          )
        const element = this.vectorElement(baseType)
        const values = this.expression(value.base, locals)
        const index = call('checkedIndex', this.expression(value.index, locals))
        if (element && this.structs.has(element))
          return call('indexStruct', values, index, identifier('copy' + this.names.get(element)!))
        return call(element === 'usize' ? 'indexNumber' : 'indexChar', values, index)
      }
      case 'method-call':
        if (['abs', 'ln', 'log10'].includes(value.method) && value.arguments.length === 0)
          return call(f64Methods[value.method]!, this.expression(value.receiver, locals))
        if (value.method === 'clone')
          return this.detach(
            this.expression(value.receiver, locals),
            this.infer(value.receiver, locals)!,
          )
        if (value.method === 'to_owned' || value.method === 'as_str')
          return this.expression(value.receiver, locals)
        if (value.method === 'len' && value.arguments.length === 0)
          return member(this.expression(value.receiver, locals), 'length')
        if (value.method === 'to_ascii_lowercase' && value.arguments.length === 0)
          return call('asciiLowercase', this.expression(value.receiver, locals))
        if (
          value.method === 'collect' &&
          value.arguments.length === 0 &&
          value.receiver.kind === 'method-call' &&
          value.receiver.method === 'chars' &&
          value.receiver.arguments.length === 0
        )
          return f.createCallExpression(member(identifier('Array'), 'from'), undefined, [
            this.expression(value.receiver.receiver, locals),
          ])
        throw new Error(`unsupported method ${value.method}`)
      case 'struct-literal': {
        const item = this.structs.get(value.path.join('::'))
        if (!item) throw new Error(`unknown struct ${value.path.join('::')}`)
        return object(
          value.fields.map((field) => {
            const declaration = item.fields.find((candidate) => candidate.name === field.name)
            if (!declaration) throw new Error(`unknown field ${item.name}.${field.name}`)
            return [
              camelCase(field.name),
              this.clone(this.expression(field.value, locals), declaration.type),
            ]
          }),
        )
      }
      case 'call': {
        if (
          value.callee.kind === 'path' &&
          value.callee.segments.join('::') === 'String::new' &&
          value.arguments.length === 0
        )
          return f.createStringLiteral('')
        if (
          value.callee.kind === 'path' &&
          value.callee.segments.join('::') === 'Vec::new' &&
          value.arguments.length === 0
        )
          return f.createArrayLiteralExpression()
        if (value.callee.kind === 'path' && value.callee.segments.length === 1) {
          const name = value.callee.segments[0]!
          const functionItem = this.functions.get(name)
          if (!functionItem || functionItem.parameters.length !== value.arguments.length)
            throw new Error(`unknown function or wrong argument count ${name}`)
          return call(
            this.names.get(name)!,
            ...value.arguments.map((argument) => this.expression(argument, locals)),
          )
        }
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
        const argument = this.expression(value.arguments[0]!, locals)
        const payloadValue =
          payload.kind === 'path' && this.opaque.has(payload.segments.join('::'))
            ? call('sealOpaque', argument)
            : this.clone(argument, payload)
        return object([
          ['kind', f.createStringLiteral(variant!)],
          ['value', payloadValue],
        ])
      }
      default:
        throw new Error(`expression ${value.kind} needs statement lowering`)
    }
  }

  private statements(statements: Stmt[], locals: Map<string, string>): ts.Statement[] {
    const result: ts.Statement[] = []
    for (const [index, statement] of statements.entries()) {
      if (statement.kind === 'local') {
        const rustName = statement.binding.name
        const type = statement.type
          ? this.path(statement.type)
          : this.infer(statement.initializer, locals)
        if (!type) throw new Error(`cannot infer ${rustName}`)
        const value = this.clone(this.expression(statement.initializer, locals), type)
        result.push(
          f.createVariableStatement(
            undefined,
            f.createVariableDeclarationList(
              [
                f.createVariableDeclaration(
                  camelCase(rustName),
                  undefined,
                  this.typeName(type),
                  value,
                ),
              ],
              statement.binding.mutable ? ts.NodeFlags.Let : ts.NodeFlags.Const,
            ),
          ),
        )
        locals.set(rustName, type)
        continue
      }
      const value = statement.value
      if (value.kind === 'return')
        result.push(
          f.createReturnStatement(
            this.returningOpaque
              ? call('sealOpaque', this.expression(value.value, locals))
              : this.expression(value.value, locals),
          ),
        )
      else if (value.kind === 'break') result.push(f.createBreakStatement())
      else if (value.kind === 'assign') {
        const left =
          value.left.kind === 'index'
            ? f.createElementAccessExpression(
                this.expression(value.left.base, locals),
                call(
                  'checkedIndexIn',
                  this.expression(value.left.base, locals),
                  this.expression(value.left.index, locals),
                ),
              )
            : this.expression(value.left, locals)
        const type = this.infer(value.left, locals)
        if (!type) throw new Error('cannot infer assignment destination')
        result.push(
          f.createExpressionStatement(
            comparison(
              left,
              ts.SyntaxKind.EqualsToken,
              this.detach(this.expression(value.right, locals), type),
            ),
          ),
        )
      } else if (
        value.kind === 'method-call' &&
        ['push', 'push_str'].includes(value.method) &&
        this.infer(value.receiver, locals) === 'String'
      ) {
        const receiver = this.expression(value.receiver, locals)
        const argument = this.expression(value.arguments[0]!, locals)
        result.push(
          f.createExpressionStatement(
            comparison(
              receiver,
              ts.SyntaxKind.EqualsToken,
              comparison(
                receiver,
                ts.SyntaxKind.PlusToken,
                value.method === 'push' ? call('checkedChar', argument) : argument,
              ),
            ),
          ),
        )
      } else if (value.kind === 'method-call' && value.method === 'push') {
        const element = this.vectorElement(this.infer(value.receiver, locals) ?? '')
        result.push(
          f.createExpressionStatement(
            element && this.structs.has(element)
              ? call(
                  'pushStruct',
                  this.expression(value.receiver, locals),
                  this.expression(value.arguments[0]!, locals),
                  identifier('copy' + this.names.get(element)!),
                )
              : call(
                  element === 'char' ? 'pushChar' : 'pushIndex',
                  this.expression(value.receiver, locals),
                  this.expression(value.arguments[0]!, locals),
                ),
          ),
        )
      } else if (value.kind === 'if-let') {
        if (value.source.kind !== 'path' || value.source.segments.length !== 1)
          throw new Error('if-let source must be an identifier')
        const payload = this.enums
          .get(value.enumName)
          ?.variants.find((variant) => variant.name === value.variant)?.payload
        if (!payload || this.infer(value.source, locals) !== value.enumName)
          throw new Error('if-let pattern is not a matching payload enum variant')
        const source = this.expression(value.source, locals)
        const branchLocals = new Map(locals)
        const bindings: ts.Statement[] = []
        if (value.payloadBinding !== null) {
          if (typeof value.payloadBinding !== 'string' || !value.payloadBinding.length)
            throw new Error('if-let payload binding must be a name or null')
          const bound = camelCase(value.payloadBinding)
          branchLocals.set(value.payloadBinding, this.path(payload))
          bindings.push(
            f.createVariableStatement(
              undefined,
              f.createVariableDeclarationList(
                [
                  f.createVariableDeclaration(
                    bound,
                    undefined,
                    this.type(payload),
                    this.detach(member(source, 'value'), payload),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            ),
          )
        }
        result.push(
          f.createIfStatement(
            comparison(
              member(source, 'kind'),
              ts.SyntaxKind.EqualsEqualsEqualsToken,
              f.createStringLiteral(value.variant),
            ),
            f.createBlock([...bindings, ...this.statements(value.body, branchLocals)], true),
          ),
        )
      } else if (value.kind === 'if') {
        const alternate = value.elseBody
          ? this.statements(value.elseBody, new Map(locals))
          : undefined
        result.push(
          f.createIfStatement(
            this.expression(value.condition, locals),
            f.createBlock(this.statements(value.body, new Map(locals)), true),
            alternate?.length === 1 && ts.isIfStatement(alternate[0]!)
              ? alternate[0]
              : alternate
                ? f.createBlock(alternate, true)
                : undefined,
          ),
        )
      } else if (value.kind === 'while')
        result.push(
          f.createWhileStatement(
            this.expression(value.condition, locals),
            f.createBlock(this.statements(value.body, new Map(locals)), true),
          ),
        )
      else {
        const expression = this.expression(value, locals)
        result.push(
          index === statements.length - 1 && !statement.semicolon
            ? f.createReturnStatement(
                this.returningOpaque ? call('sealOpaque', expression) : expression,
              )
            : f.createExpressionStatement(expression),
        )
      }
    }
    return result
  }

  private function(
    name: string,
    params: ts.ParameterDeclaration[],
    result: ts.TypeNode,
    body: ts.Statement[],
    visibility = 'private',
  ): ts.FunctionDeclaration {
    return f.createFunctionDeclaration(
      exported(visibility),
      undefined,
      name,
      undefined,
      params,
      result,
      f.createBlock(body, true),
    )
  }

  private emitStruct(item: Extract<Item, { kind: 'struct' }>): ts.Statement[] {
    const name = this.names.get(item.name)!
    const fields = item.fields.map((field) =>
      f.createPropertySignature(
        this.opaque.has(item.name) || this.immutableValues.has(item.name)
          ? [f.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
          : undefined,
        camelCase(field.name),
        undefined,
        this.type(field.type),
      ),
    )
    const declarations: ts.Statement[] = [
      f.createInterfaceDeclaration(exported(item.visibility), name, undefined, undefined, fields),
    ]
    const nameType = f.createTypeReferenceNode(name)
    if (!this.immutableValues.has(item.name))
      declarations.push(
        this.function(`copy${name}`, [parameter('value', nameType)], nameType, [
          f.createReturnStatement(
            this.opaque.has(item.name)
              ? call('checkedOpaque', identifier('value'))
              : object(
                  item.fields.map((field) => [
                    camelCase(field.name),
                    this.detach(member(identifier('value'), camelCase(field.name)), field.type),
                  ]),
                ),
          ),
        ]),
      )
    if (this.equality.has(item.name))
      declarations.push(
        this.function(
          `equal${name}`,
          [parameter('left', nameType), parameter('right', nameType)],
          f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
          [
            f.createReturnStatement(
              andAll(
                item.fields.map((field) =>
                  this.equal(
                    member(identifier('left'), camelCase(field.name)),
                    member(identifier('right'), camelCase(field.name)),
                    field.type,
                  ),
                ),
              ),
            ),
          ],
        ),
      )
    return declarations
  }

  private emitEnum(item: Extract<Item, { kind: 'enum' }>): ts.Statement[] {
    const name = this.names.get(item.name)!
    const nameType = f.createTypeReferenceNode(name)
    const union = f.createUnionTypeNode(
      item.variants.map((variant) =>
        f.createTypeLiteralNode([
          f.createPropertySignature(
            this.immutableValues.has(item.name)
              ? [f.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
              : undefined,
            'kind',
            undefined,
            f.createLiteralTypeNode(f.createStringLiteral(variant.name)),
          ),
          ...(variant.payload
            ? [
                f.createPropertySignature(
                  this.immutableValues.has(item.name)
                    ? [f.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
                    : undefined,
                  'value',
                  undefined,
                  this.type(variant.payload),
                ),
              ]
            : []),
        ]),
      ),
    )
    const declarations: ts.Statement[] = [
      f.createTypeAliasDeclaration(exported(item.visibility), name, undefined, union),
    ]
    const clauses = item.variants.map((variant) =>
      f.createCaseClause(f.createStringLiteral(variant.name), [
        f.createReturnStatement(
          object([
            ['kind', f.createStringLiteral(variant.name)],
            ...(variant.payload
              ? [
                  ['value', this.detach(member(identifier('value'), 'value'), variant.payload)] as [
                    string,
                    ts.Expression,
                  ],
                ]
              : []),
          ]),
        ),
      ]),
    )
    if (!this.immutableValues.has(item.name))
      declarations.push(
        this.function(`copy${name}`, [parameter('value', nameType)], nameType, [
          f.createSwitchStatement(member(identifier('value'), 'kind'), f.createCaseBlock(clauses)),
        ]),
      )
    if (this.equality.has(item.name)) {
      const body: ts.Statement[] = [
        f.createIfStatement(
          comparison(
            member(identifier('left'), 'kind'),
            ts.SyntaxKind.ExclamationEqualsEqualsToken,
            member(identifier('right'), 'kind'),
          ),
          f.createReturnStatement(f.createFalse()),
        ),
      ]
      for (const variant of item.variants)
        if (variant.payload)
          body.push(
            f.createIfStatement(
              comparison(
                comparison(
                  member(identifier('left'), 'kind'),
                  ts.SyntaxKind.EqualsEqualsEqualsToken,
                  f.createStringLiteral(variant.name),
                ),
                ts.SyntaxKind.AmpersandAmpersandToken,
                comparison(
                  member(identifier('right'), 'kind'),
                  ts.SyntaxKind.EqualsEqualsEqualsToken,
                  f.createStringLiteral(variant.name),
                ),
              ),
              f.createReturnStatement(
                this.equal(
                  member(identifier('left'), 'value'),
                  member(identifier('right'), 'value'),
                  variant.payload,
                ),
              ),
            ),
          )
      body.push(f.createReturnStatement(f.createTrue()))
      declarations.push(
        this.function(
          `equal${name}`,
          [parameter('left', nameType), parameter('right', nameType)],
          f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
          body,
        ),
      )
    }
    return declarations
  }

  transpile(runtimePrelude?: string): string {
    const source = ts.createSourceFile(
      'runtime-prelude.ts',
      runtimePrelude ?? readFileSync(new URL('./runtime-prelude.ts', import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const declarations: ts.Statement[] = [...source.statements]
    for (const item of this.document.items) {
      switch (item.kind) {
        case 'constant': {
          const value = this.expression(item.value, new Map())
          declarations.push(
            f.createVariableStatement(
              exported(item.visibility),
              f.createVariableDeclarationList(
                [
                  f.createVariableDeclaration(
                    this.names.get(item.name)!,
                    undefined,
                    this.path(item.type).startsWith('&[') ? this.type(item.type) : undefined,
                    this.path(item.type) === '&[u16]'
                      ? f.createNewExpression(identifier('Uint16Array'), undefined, [value])
                      : value,
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            ),
          )
          break
        }
        case 'struct':
          declarations.push(...this.emitStruct(item))
          break
        case 'enum':
          declarations.push(...this.emitEnum(item))
          break
        case 'function': {
          const locals = new Map(
            item.parameters.map((parameter) => [parameter.name, this.path(parameter.type)]),
          )
          const body: ts.Statement[] = []
          for (const parameter of item.parameters) {
            const name = camelCase(parameter.name)
            if (
              item.visibility !== 'public' &&
              parameter.type.kind === 'reference' &&
              this.opaque.has(this.path(parameter.type.inner))
            )
              continue
            const detached = this.detach(identifier(name), parameter.type)
            if (detached.kind !== ts.SyntaxKind.Identifier)
              body.push(
                f.createExpressionStatement(
                  comparison(identifier(name), ts.SyntaxKind.EqualsToken, detached),
                ),
              )
          }
          this.returningOpaque =
            item.visibility === 'public' && this.opaque.has(this.path(item.returnType))
          body.push(...this.statements(item.body, locals))
          this.returningOpaque = false
          declarations.push(
            this.function(
              this.names.get(item.name)!,
              item.parameters.map((item) => parameter(camelCase(item.name), this.type(item.type))),
              this.type(item.returnType),
              body,
              item.visibility,
            ),
          )
          break
        }
      }
    }
    const output = f.updateSourceFile(source, declarations)
    return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(output)
  }
}

export function transpile(
  document: Document,
  options: TranspileOptions = {},
  runtimePrelude?: string,
): string {
  return new Transpiler(document, options).transpile(runtimePrelude)
}

if (process.argv[1]?.endsWith('/transpile.ts')) {
  const [source, output] = process.argv.slice(2)
  if (!source || !output) throw new Error('usage: transpile.ts AST_JSON OUTPUT_TS')
  writeFileSync(output, transpile(JSON.parse(readFileSync(source, 'utf8')) as Document))
}
