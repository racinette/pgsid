import ts from 'typescript'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import { describe, expect, it } from 'vitest'
import {
  generateTypescriptJsonSchemaLineageValidator,
  generateTypescriptJsonSchemaValidator,
  UnsupportedJsonSchemaError,
} from '../../src/codegen/typescript/json-schema-validator.js'
import type { JsonSchemaLineage } from '../../src/codegen/shared/json-schema-lineage.js'

const evaluateGenerated = <T>(source: string, name: string): T => {
  const executable = `${source.replace('export function', 'function')}\nreturn ${name}`
  const javascript = ts.transpileModule(executable, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  expect(javascript.diagnostics).toEqual([])
  return Function(javascript.outputText)() as T
}
const evaluateValidator = (source: string, name: string) =>
  evaluateGenerated<(value: unknown) => boolean>(source, name)

interface ValidationResult {
  valid: boolean
  issues: {
    path: readonly (string | number)[]
    keyword: string
    expected: unknown
    received: string
    message: string
  }[]
}

const diagnosticValidator = (schema: JsonSchemaDocument, options = {}) => {
  const source = generateTypescriptJsonSchemaValidator('validateValue', 'unknown', schema, {
    ...options,
    diagnostic: true,
  })
  return evaluateGenerated<(value: unknown) => ValidationResult>(source, 'validateValue')
}

describe('generated validation diagnostics', () => {
  it('reports independent nested property, required-property, and additional-property failures', () => {
    const validate = diagnosticValidator({
      type: 'object',
      required: ['actor', 'flags', 'missing'],
      additionalProperties: false,
      properties: {
        missing: true,
        actor: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer', minimum: 1 } },
        },
        flags: { type: 'array', items: { type: 'string' } },
      },
    })
    const result = validate({ actor: { id: 'bad' }, flags: ['ok', 1, false], extra: true })
    expect(result.valid).toBe(false)
    expect(
      result.issues.map(({ path, keyword, received }) => ({ path, keyword, received })),
    ).toEqual([
      { path: ['missing'], keyword: 'required', received: 'undefined' },
      { path: ['actor', 'id'], keyword: 'type', received: 'string' },
      { path: ['flags', 1], keyword: 'type', received: 'number' },
      { path: ['flags', 2], keyword: 'type', received: 'boolean' },
      { path: ['extra'], keyword: 'additionalProperties', received: 'boolean' },
    ])
    expect(result.issues[1]).toMatchObject({
      expected: 'integer',
      message: 'Expected integer, received string',
    })
    expect(validate(null).issues).toHaveLength(1)
    expect(result.issues[0]?.message).toBe('Missing required property')
    expect(result.issues.at(-1)?.message).toBe('Unexpected property')
    expect(validate({ actor: { id: 1 }, flags: [], missing: true })).toEqual({
      valid: true,
      issues: [],
    })
  })

  it.each<[JsonSchemaDocument, unknown, string]>([
    [{ minimum: 2 }, 1, 'minimum'],
    [{ maximum: 2 }, 3, 'maximum'],
    [{ exclusiveMinimum: 2 }, 2, 'exclusiveMinimum'],
    [{ exclusiveMaximum: 2 }, 2, 'exclusiveMaximum'],
    [{ multipleOf: 2 }, 3, 'multipleOf'],
    [{ minLength: 2 }, 'a', 'minLength'],
    [{ maxLength: 2 }, 'abc', 'maxLength'],
    [{ pattern: '^a' }, 'b', 'pattern'],
    [{ const: { id: 1 } }, { id: 2 }, 'const'],
    [{ enum: ['a', 'b'] }, 'c', 'enum'],
    [{ minItems: 2 }, [1], 'minItems'],
    [{ maxItems: 2 }, [1, 2, 3], 'maxItems'],
    [{ uniqueItems: true }, [{ id: 1 }, { id: 1 }], 'uniqueItems'],
    [{ contains: { type: 'integer' } }, ['a'], 'contains'],
    [{ contains: { type: 'integer' }, minContains: 2 }, [1, 'a'], 'minContains'],
    [{ contains: { type: 'integer' }, maxContains: 1 }, [1, 2], 'maxContains'],
    [{ minProperties: 2 }, { a: 1 }, 'minProperties'],
    [{ maxProperties: 1 }, { a: 1, b: 2 }, 'maxProperties'],
    [false, 1, 'falseSchema'],
    [{ not: { type: 'integer' } }, 1, 'not'],
  ])('reports the failed assertion for %j', (schema, value, keyword) => {
    expect(diagnosticValidator(schema)(value)).toMatchObject({
      valid: false,
      issues: [{ path: [], keyword }],
    })
  })

  it('retains tuple-tail offsets and dynamic property paths', () => {
    expect(
      diagnosticValidator({ prefixItems: [{ type: 'string' }], items: { type: 'integer' } })([
        'ok',
        1,
        'bad',
      ]).issues,
    ).toMatchObject([{ path: [2], keyword: 'type' }])
    expect(
      diagnosticValidator({ prefixItems: [{ type: 'integer' }], items: false })([1, 'bad']).issues,
    ).toMatchObject([{ path: [1], keyword: 'items' }])
    expect(
      diagnosticValidator({ patternProperties: { '^x-': { type: 'integer' } } })({ 'x-bad': 'bad' })
        .issues,
    ).toMatchObject([{ path: ['x-bad'], keyword: 'type' }])
    expect(
      diagnosticValidator({ propertyNames: { pattern: '^x-' } })({ bad: 1 }).issues,
    ).toMatchObject([{ path: ['bad'], keyword: 'pattern' }])
    expect(diagnosticValidator({ dependentRequired: { a: ['b'] } })({ a: 1 }).issues).toMatchObject(
      [{ path: ['b'], keyword: 'dependentRequired' }],
    )
    expect(
      diagnosticValidator({ dependentSchemas: { a: { required: ['b'] } } })({ a: 1 }).issues,
    ).toMatchObject([{ path: ['b'], keyword: 'required' }])
  })

  it('discards speculative failures from alternatives, negation, conditionals, and contains', () => {
    const any = diagnosticValidator({ anyOf: [{ type: 'integer' }, { type: 'string' }] })
    expect(any('ok')).toEqual({ valid: true, issues: [] })
    expect(any(false)).toMatchObject({
      valid: false,
      issues: [{ keyword: 'type' }, { keyword: 'type' }, { keyword: 'anyOf' }],
    })
    const one = diagnosticValidator({ oneOf: [{ type: 'number' }, { type: 'integer' }] })
    expect(one(1.5)).toEqual({ valid: true, issues: [] })
    expect(one(1)).toMatchObject({ valid: false, issues: [{ keyword: 'oneOf' }] })
    expect(diagnosticValidator({ not: { type: 'integer' } })('ok')).toEqual({
      valid: true,
      issues: [],
    })
    const conditional = diagnosticValidator({
      if: { type: 'integer' },
      then: { minimum: 2 },
      else: { type: 'string' },
    })
    expect(conditional('ok')).toEqual({ valid: true, issues: [] })
    expect(conditional(false)).toMatchObject({
      valid: false,
      issues: [{ keyword: 'type', expected: 'string' }],
    })
    expect(
      diagnosticValidator({ contains: { type: 'integer' }, minContains: 1 })(['bad', 1]),
    ).toEqual({ valid: true, issues: [] })
  })

  it('propagates recursive reference paths and rejects cyclic data without leaking issues between calls', () => {
    const schema: JsonSchemaDocument = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' }, children: { type: 'array', items: { $ref: '#' } } },
    }
    const validate = diagnosticValidator(schema)
    expect(validate({ id: 1, children: [{ id: 2, children: [{ id: 'bad' }] }] })).toMatchObject({
      valid: false,
      issues: [{ path: ['children', 0, 'children', 0, 'id'], keyword: 'type' }],
    })
    const cyclic: { id: number; children?: unknown[] } = { id: 1 }
    cyclic.children = [cyclic]
    expect(validate(cyclic).issues).toMatchObject([{ keyword: '$ref' }])
    expect(validate({ id: 1, children: [{ id: 2 }] })).toEqual({ valid: true, issues: [] })
    const permissive = diagnosticValidator({ properties: { next: { $ref: '#' } } })
    const nextCycle: { next?: unknown } = {}
    nextCycle.next = nextCycle
    expect(permissive(nextCycle).issues).toMatchObject([{ keyword: '$ref' }])
  })

  it('matches boolean validation for conditional keywords, nullable branches, and mutually recursive references', () => {
    const schemas: JsonSchemaDocument[] = [
      {
        properties: { id: { type: 'integer' } },
        additionalProperties: false,
        items: { type: 'integer' },
      },
      { allOf: [{ type: ['integer', 'null'] }, { not: { const: 0 } }] },
      {
        $ref: '#/$defs/Node',
        $defs: {
          Node: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'integer' }, children: { $ref: '#/$defs/Children' } },
          },
          Children: {
            anyOf: [{ type: 'null' }, { type: 'array', items: { $ref: '#/$defs/Node' } }],
          },
        },
      },
    ]
    const values = [
      null,
      0,
      1,
      'ok',
      false,
      [],
      [1],
      ['bad'],
      {},
      { id: 1 },
      { id: 'bad' },
      { extra: true },
      { id: 1, children: [{ id: 2, children: null }] },
      { id: 1, children: [{ id: 'bad' }] },
    ]
    for (const schema of schemas) {
      const isValue = evaluateValidator(
        generateTypescriptJsonSchemaValidator('isValue', 'unknown', schema, { nullable: true }),
        'isValue',
      )
      const validate = diagnosticValidator(schema, { nullable: true })
      for (const value of values) {
        const result = validate(value)
        expect(result.valid, JSON.stringify({ schema, value })).toBe(isValue(value))
        expect(result.issues.length === 0).toBe(result.valid)
      }
    }
  })

  it('compiles diagnostic helpers, constraints, and recursive references under strict TypeScript', () => {
    const schema: JsonSchemaDocument = {
      type: 'object',
      required: ['items'],
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          uniqueItems: true,
          prefixItems: [
            { type: 'integer', minimum: 0, multipleOf: 2 },
            { type: 'string', minLength: 1, pattern: '^a' },
          ],
          items: { type: 'string', minLength: 1, maxLength: 3, pattern: '^a' },
          contains: { type: 'integer' },
          minContains: 1,
          maxContains: 2,
        },
        next: { $ref: '#' },
      },
      patternProperties: { '^x-': { type: 'boolean' } },
      propertyNames: { type: 'string', minLength: 1 },
      minProperties: 1,
      maxProperties: 4,
      allOf: [{ not: { const: {} } }],
      anyOf: [{ required: ['items'] }, { required: ['next'] }],
      oneOf: [{ required: ['items'] }, { required: ['other'] }],
      if: { required: ['next'] },
      then: { dependentRequired: { next: ['items'] } },
      else: { dependentSchemas: { items: { required: ['items'] } } },
    }
    const source = [false, true]
      .map((diagnostic) =>
        generateTypescriptJsonSchemaValidator(
          diagnostic ? 'validateValue' : 'isValue',
          'unknown',
          schema,
          { diagnostic },
        ),
      )
      .join('\n')
    const filename = '/generated-validation.ts'
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      noUncheckedIndexedAccess: true,
      target: ts.ScriptTarget.ES2022,
      types: [],
    }
    const host = ts.createCompilerHost(options)
    const getSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (name, ...args) =>
      name === filename
        ? ts.createSourceFile(name, source, ts.ScriptTarget.ES2022, true)
        : getSourceFile(name, ...args)
    const program = ts.createProgram([filename], options, host)
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map(
          (diagnostic) =>
            `${source.slice(diagnostic.start ?? 0, (diagnostic.start ?? 0) + (diagnostic.length ?? 0))}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
        ),
    ).toEqual([])
  })
})

describe('generateTypescriptJsonSchemaValidator', () => {
  it('checks object properties, patterns, required keys, and additional keys', () => {
    const source = generateTypescriptJsonSchemaValidator('isEvent', 'Event', {
      type: 'object',
      required: ['id', 'tag'],
      properties: {
        id: { type: 'integer', minimum: 1 },
        tag: { type: 'string', minLength: 2, pattern: '^[a-z]+$' },
      },
      patternProperties: { '^x-': { type: 'boolean' } },
      additionalProperties: false,
    })
    const isEvent = evaluateValidator(source, 'isEvent')

    expect(isEvent({ id: 1, tag: 'ok', 'x-live': true })).toBe(true)
    expect(isEvent({ id: 0, tag: 'ok' })).toBe(false)
    expect(isEvent({ id: 1, tag: 'X' })).toBe(false)
    expect(isEvent({ id: 1, tag: 'ok', 'x-live': 1 })).toBe(false)
    expect(isEvent({ id: 1, tag: 'ok', extra: true })).toBe(false)
    expect(isEvent({ id: 1 })).toBe(false)
  })

  it('checks tuple tails, contains bounds, and structural uniqueness', () => {
    const source = generateTypescriptJsonSchemaValidator('isSequence', 'Sequence', {
      type: 'array',
      prefixItems: [{ type: 'integer' }],
      items: { type: 'object', required: ['kind'], properties: { kind: { const: 'item' } } },
      minItems: 2,
      maxItems: 3,
      contains: { type: 'object', required: ['kind'], properties: { kind: { const: 'item' } } },
      minContains: 1,
      maxContains: 2,
      uniqueItems: true,
    })
    const isSequence = evaluateValidator(source, 'isSequence')

    expect(isSequence([1, { kind: 'item' }, { kind: 'item', id: 2 }])).toBe(true)
    expect(isSequence(['1', { kind: 'item' }])).toBe(false)
    expect(isSequence([1, { kind: 'other' }])).toBe(false)
    expect(isSequence([1, { kind: 'item' }, { kind: 'item' }, { kind: 'item' }])).toBe(false)
    expect(isSequence([1, { kind: 'item' }, { kind: 'item' }])).toBe(false)
  })

  it('checks references, compositions, conditionals, const, enum, and nullability', () => {
    const document = {
      $defs: {
        payload: {
          type: 'object',
          required: ['kind', 'value'],
          properties: {
            kind: { enum: ['count', 'label'] },
            value: {},
          },
          if: { properties: { kind: { const: 'count' } }, required: ['kind'] },
          then: { properties: { value: { type: 'integer' } } },
          else: { properties: { value: { type: 'string' } } },
          not: { properties: { value: { const: '' } }, required: ['value'] },
        },
      },
    }
    const source = generateTypescriptJsonSchemaValidator(
      'isPayload',
      'Payload | null',
      { $ref: '#/$defs/payload' },
      { document, nullable: true },
    )
    const isPayload = evaluateValidator(source, 'isPayload')

    expect(isPayload(null)).toBe(true)
    expect(isPayload({ kind: 'count', value: 2 })).toBe(true)
    expect(isPayload({ kind: 'label', value: 'two' })).toBe(true)
    expect(isPayload({ kind: 'count', value: 'two' })).toBe(false)
    expect(isPayload({ kind: 'label', value: '' })).toBe(false)
    expect(isPayload({ kind: 'other', value: 'two' })).toBe(false)
  })

  it('requires exactly one oneOf branch', () => {
    const source = generateTypescriptJsonSchemaValidator('isOne', 'One', {
      oneOf: [{ type: 'number' }, { type: 'integer' }],
    })
    const isOne = evaluateValidator(source, 'isOne')

    expect(isOne(1.5)).toBe(true)
    expect(isOne(1)).toBe(false)
    expect(isOne('1')).toBe(false)
  })

  it('validates recursive objects and rejects deep invalid values and cyclic data', () => {
    const schema: JsonSchemaDocument = {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      properties: { id: { type: 'integer' }, next: { $ref: '#' } },
    }
    const isNode = evaluateValidator(
      generateTypescriptJsonSchemaValidator('isNode', 'Node', schema),
      'isNode',
    )
    expect(isNode({ id: 1, next: { id: 2, next: { id: 3 } } })).toBe(true)
    expect(isNode({ id: 1, next: { id: 2, next: { id: 'bad' } } })).toBe(false)
    const cyclic: { id: number; next?: unknown } = { id: 1 }
    cyclic.next = cyclic
    expect(isNode(cyclic)).toBe(false)
  })

  it('validates mutually recursive definitions, recursive arrays, and nullable branches', () => {
    const schema: JsonSchemaDocument = {
      $ref: '#/$defs/Node',
      $defs: {
        Node: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' }, children: { $ref: '#/$defs/Children' } },
          additionalProperties: false,
        },
        Children: { anyOf: [{ type: 'null' }, { type: 'array', items: { $ref: '#/$defs/Node' } }] },
      },
    }
    const isNode = evaluateValidator(
      generateTypescriptJsonSchemaValidator('isNode', 'Node', schema),
      'isNode',
    )
    expect(isNode({ id: 1, children: [{ id: 2, children: [{ id: 3, children: null }] }] })).toBe(
      true,
    )
    expect(isNode({ id: 1, children: [{ id: 2, children: [{ id: 'bad' }] }] })).toBe(false)
    expect(isNode({ id: 1, children: [null] })).toBe(false)
  })

  it('preserves conditional keyword behavior when type is absent', () => {
    const isValue = evaluateValidator(
      generateTypescriptJsonSchemaValidator('isValue', 'Value', {
        properties: { id: { type: 'integer' } },
        additionalProperties: false,
        items: { type: 'integer' },
      }),
      'isValue',
    )
    for (const value of [7, 'ok', true, null, {}, { id: 1 }, [1, 2]])
      expect(isValue(value)).toBe(true)
    for (const value of [{ id: 'bad' }, { extra: 1 }, ['bad']]) expect(isValue(value)).toBe(false)
  })

  it('rejects unsupported assertions and references without data descent', () => {
    expect(() =>
      generateTypescriptJsonSchemaValidator('isClosed', 'Closed', {
        unevaluatedProperties: false,
      }),
    ).toThrowError(UnsupportedJsonSchemaError)
    expect(() =>
      generateTypescriptJsonSchemaValidator('isRecursive', 'Recursive', {
        $ref: '#',
      }),
    ).toThrowError('Unsupported JSON Schema assertion: recursive #')
  })
})

describe('generateTypescriptJsonSchemaLineageValidator', () => {
  const alternative = {
    schemaName: 'Event',
    root: { schema: 'public', relation: 'events', column: 'payload' },
    path: ['id'],
    document: { type: 'object' },
    schema: { type: 'integer' },
    representation: 'json' as const,
    runtimeValidation: true,
  }

  it('generates only for complete, fully opted-in lineage', () => {
    const enabled: JsonSchemaLineage = { alternatives: [alternative], complete: true }
    const source = generateTypescriptJsonSchemaLineageValidator('isId', 'number', enabled)
    expect(source).not.toBeNull()
    const isId = evaluateValidator(source!, 'isId')
    expect(isId(1)).toBe(true)
    expect(isId(1.5)).toBe(false)

    expect(
      generateTypescriptJsonSchemaLineageValidator('isId', 'number', {
        alternatives: [alternative],
        complete: false,
      }),
    ).toBeNull()
    expect(
      generateTypescriptJsonSchemaLineageValidator('isId', 'number', {
        alternatives: [{ ...alternative, runtimeValidation: false }],
        complete: true,
      }),
    ).toBeNull()
  })

  it('validates text extraction as PostgreSQL text', () => {
    const source = generateTypescriptJsonSchemaLineageValidator('isTextId', 'string', {
      alternatives: [{ ...alternative, representation: 'text' }],
      complete: true,
    })
    const isTextId = evaluateValidator(source!, 'isTextId')

    expect(isTextId('42')).toBe(true)
    expect(isTextId(42)).toBe(false)
    const diagnostic = generateTypescriptJsonSchemaLineageValidator(
      'validateTextId',
      'string',
      {
        alternatives: [{ ...alternative, representation: 'text' }],
        complete: true,
      },
      { diagnostic: true },
    )!
    const validateTextId = evaluateGenerated<(value: unknown) => ValidationResult>(
      diagnostic,
      'validateTextId',
    )
    expect(validateTextId('42')).toEqual({ valid: true, issues: [] })
    expect(validateTextId(42)).toMatchObject({
      valid: false,
      issues: [{ keyword: 'type', expected: 'string', received: 'number' }],
    })
  })

  it('isolates alternative diagnostics across complete lineage sources and nullable outputs', () => {
    const source = generateTypescriptJsonSchemaLineageValidator(
      'validateValue',
      'number | string | null',
      {
        alternatives: [alternative, { ...alternative, schema: { type: 'string' } }],
        complete: true,
      },
      { diagnostic: true, nullable: true },
    )!
    const validate = evaluateGenerated<(value: unknown) => ValidationResult>(
      source,
      'validateValue',
    )
    expect(validate('ok')).toEqual({ valid: true, issues: [] })
    expect(validate(1)).toEqual({ valid: true, issues: [] })
    expect(validate(null)).toEqual({ valid: true, issues: [] })
    expect(validate(false)).toMatchObject({
      valid: false,
      issues: [{ keyword: 'type' }, { keyword: 'type' }, { keyword: 'anyOf' }],
    })
  })
})
