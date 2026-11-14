import type { CatalogSnapshot, DomainInfo } from '../../catalog/types.js'
import { compositeFieldType, compositePhysicalType, compositeProfile } from '../../sql-semantics/composite-profiles.js'
import { arrayLikeElementType, domainElementDefinition, isArrayLikeType, isCatalogVectorType } from '../../sql-semantics/expressions.js'
import { multirangeTypeProfile, rangeContainerKind, rangeProfileSupport, rangeTypeProfile } from '../../sql-semantics/range-profiles.js'
import { arrayElementFamily, arrayElementIdentity, rangeBoundProfiles, type RangeBoundProfilePlan } from '../shared/check-array-types.js'
import { compositeNodes } from '../shared/check-composite-types.js'
import { checkRustValueType, type CheckExecutionContext } from '../shared/check-rust-evaluator.js'
import { checkTypeModifierCoercion } from '../shared/check-type-modifiers.js'
import { rust, type RustExpression, type RustItem, type RustStatement, type RustType } from './ast.js'
import { rustFieldName } from './names.js'
import { resolveRustType, rustDeclaredType, rustValues, type RustTypeContext } from './type-mapping.js'

// Converters from public Rust values to the evaluator's values for the types containers hold,
// generated once per type into the evaluator's checks module: an element, field or bound through
// its family's conversion, an array, range, multirange or composite through the evaluator's own
// constructors, so PostgreSQL's input rules apply as they do to a parameter. A type the
// conversion cannot read has no converter, and a value holding one is not read.

export interface RustCheckContainerOptions {
  catalog: CatalogSnapshot
  context: CheckExecutionContext
  // A domain that is an enum of literals, which gives its value rather than holding it.
  literalDomain: (domain: DomainInfo) => boolean
  // The order of a domain's generated checks, by the domain each is declared on.
  domainChecks: (domain: DomainInfo) => readonly string[] | undefined
  /**
   * A scalar's evaluator value from the public value `base`, as the server reads it, or null
   * where the family is not read. `values` is the values module's path.
   */
  scalar: (type: string, rustType: string, base: RustExpression, values: readonly string[]) => RustExpression | null
}

// The checks module sits in the evaluator, beneath the values module, beneath the generated root.
const context: RustTypeContext = { depth: 3 }
const values = ['super', 'super']
const call = (name: string, ...args: RustExpression[]) => rust.call(rust.ident(name), ...args)
const text = (value: string) => rust.method(rust.string(value), 'to_owned')
const prefix = (rustType: string) =>
  rustType
    .slice(0, -'Value'.length)
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .toLowerCase()

export function createRustCheckContainers(options: RustCheckContainerOptions) {
  const { catalog } = options
  const items: RustItem[] = []
  const names = new Map<string, string | null>()
  const typeContext: RustTypeContext = { ...context, searchPath: ['public'] }
  // A converter generated once per key; null where the type is not read.
  const define = (key: string, build: (name: string) => RustItem | null): string | null => {
    if (names.has(key)) return names.get(key)!
    const name = `part_${names.size}`
    names.set(key, name)
    const item = build(name)
    if (!item) {
      names.set(key, null)
      return null
    }
    items.push(item)
    return name
  }
  const domainOf = (definition: { schema: string; name: string }) =>
    catalog.domains.find((item) => item.schema === definition.schema && item.name === definition.name)
  const qualified = (identity: string): [string, string] => {
    const parts = identity.match(/(?:"(?:[^"]|"")*"|[^."])+/gu)!.map((part) => (part.startsWith('"') ? part.slice(1, -1).replaceAll('""', '"') : part))
    return [parts[0]!, parts.slice(1).join('.')]
  }
  /** The public Rust type a value of the spelled type has, set. */
  const publicType = (type: string): RustType | null => {
    if (type.startsWith('array:')) {
      const element = publicType(arrayLikeElementType(type)!)
      return element && rust.vec(rust.option(element))
    }
    const domain = domainElementDefinition(type)
    if (domain) return rustDeclaredType(domain.schema, domain.name, typeContext)
    if (type.startsWith('enum:')) {
      const [schema, name] = JSON.parse(type.slice('enum:'.length)) as [string, string]
      return rustDeclaredType(schema, name, typeContext)
    }
    const composite = compositeProfile(type)
    if (composite) return rustDeclaredType(...qualified(composite.identity), typeContext)
    try {
      return resolveRustType(type, catalog, typeContext)
    } catch {
      return null
    }
  }
  // An array's public type for its declared dimension counts.
  const arrayType = (type: string, counts: readonly number[]): RustType | null => {
    const elementType = publicType(arrayLikeElementType(type)!)
    if (!elementType) return null
    const option = rust.option(elementType)
    const sorted = [...new Set(counts)].sort((left, right) => left - right)
    return sorted.length > 1
      ? rustValues(context, `Array${sorted.join('Or')}`, option)
      : sorted[0] === 1
        ? rust.vec(option)
        : rustValues(context, `D${sorted[0]}`, option)
  }
  const typeModified = (type: string, typeMod: number, value: RustExpression): RustExpression | null => {
    if (typeMod < 0) return value
    const coercion = checkTypeModifierCoercion(type)
    return coercion
      ? call(coercion.callable, value, call('make_int4_value', rust.number(typeMod)), ...(coercion.explicit ? [call('make_bool_value', rust.bool(false))] : []))
      : null
  }
  /**
   * The evaluator's value of a set value of the spelled type, which `base` refers to, or null
   * where it is not read. A container goes through its converter.
   */
  const value = (type: string, typeMod: number, base: RustExpression, counts: readonly number[] = [1]): RustExpression | null => {
    const reference = rust.ref_(base)
    const container = (name: string | null) => (name ? typeModified(type, typeMod, call(name, reference)) : null)
    if (compositeProfile(type)) return typeMod >= 0 ? null : container(composite(type))
    if (multirangeTypeProfile(type) && !isArrayLikeType(type)) return typeMod >= 0 ? null : container(multirange(type))
    if (rangeTypeProfile(type) && !isArrayLikeType(type)) return typeMod >= 0 ? null : container(range(type))
    // The server reads an array parameter of a modified type as an assignment, each element through
    // the modifier's implicit coercion, which refuses what an explicit cast would cut.
    if (arrayLikeElementType(type) && !isCatalogVectorType(type)) {
      const name = array(type, counts, typeMod)
      return name ? call(name, reference) : null
    }
    let rustType: string
    try {
      rustType = checkRustValueType(type)
    } catch {
      return null
    }
    const scalar = options.scalar(type, rustType, base, values)
    return scalar && typeModified(type, typeMod, scalar)
  }
  /** The family of the evaluator's value a spelled type has, as an element names it. */
  const family = (type: string): string | null => {
    if (compositeProfile(type)) return 'composite'
    if (multirangeTypeProfile(type) && !isArrayLikeType(type)) return 'multirange'
    if (rangeTypeProfile(type) && !isArrayLikeType(type)) return 'range'
    if (arrayLikeElementType(type) && !isCatalogVectorType(type)) return 'array'
    try {
      return prefix(checkRustValueType(type))
    } catch {
      return null
    }
  }
  /**
   * A converter of a part that may be NULL: `fn(Option<&T>) -> ArrayElement`. A part of a domain
   * type is read through the domain's input: the base type's, then the domain's NOT NULL and
   * CHECK constraints, base domains first.
   */
  const element = (type: string, typeMod = -1): string | null =>
    define(`element\0${typeMod}\0${type}`, (name) => {
      const parameter = publicType(type)
      if (!parameter) return null
      const definition = domainElementDefinition(type)
      let body: RustExpression
      if (definition) {
        const domain = domainOf(definition)
        if (!domain || typeMod >= 0) return null
        const chain: DomainInfo[] = []
        for (let layer: DomainInfo | undefined = domain; layer && !chain.includes(layer); layer = catalog.domains.find((item) => item.oid === layer!.baseTypeOid))
          chain.push(layer)
        if (chain.some((layer) => (layer.baseTypeMod ?? -1) >= 0)) return null
        const owners = options.domainChecks(domain) ?? []
        const layers = owners.map((owner) => chain.findIndex((layer) => `${layer.schema}.${layer.name}` === owner))
        if (layers.includes(-1) || layers.length !== chain.reduce((count, layer) => count + layer.checks.length, 0)) return null
        const order = layers
          .map((layer, index) => ({ layer, index }))
          .sort((left, right) => right.layer - left.layer || left.index - right.index)
          .map(({ index }) => rust.number(index))
        // The domain's own value reaches its base type through its newtype, or the literal it is.
        const inner = options.literalDomain(domain) ? rust.method(rust.ident('value'), 'value') : rust.field(rust.ident('value'), '0')
        const baseType = definition.base
        const baseFamily = family(baseType)
        const converted = baseFamily && value(baseType, -1, inner)
        if (!converted) return null
        const base = call('cell', rust.ident('value'), {
          kind: 'closure',
          parameters: [{ pattern: rust.binding('value') }],
          body: call(`array_element_from_${baseFamily}`, converted),
        })
        body = call(
          'domain_cell',
          base,
          rust.method(rust.ident('value'), 'is_none'),
          rust.bool(chain.some((layer) => layer.notNull)),
          owners.length
            ? rust.call(rust.expressionPath(...(parameter as { path: string[] }).path, 'check_value'), rust.call(rust.expressionPath(...values, 'CheckValue', 'from'), rust.ident('value')))
            : rust.call(rust.expressionPath('Vec', 'new')),
          rust.ref_({ kind: 'array', items: order }),
        )
      } else {
        const valueFamily = family(type)
        const converted = valueFamily && value(type, typeMod, rust.ident('value'))
        if (!converted) return null
        body = call('cell', rust.ident('value'), {
          kind: 'closure',
          parameters: [{ pattern: rust.binding('value') }],
          body: call(`array_element_from_${valueFamily}`, converted),
        })
      }
      return {
        kind: 'fn',
        name,
        parameters: [{ pattern: rust.binding('value'), type: rust.option(rust.ref(parameter)) }],
        result: rust.path('ArrayElement'),
        body: [rust.return(body)],
      }
    })
  /**
   * A converter of an array with the dimension counts its column declares: nested vectors of one
   * count, or the enum of several.
   */
  const array = (type: string, counts: readonly number[], typeMod = -1): string | null =>
    define(`array\0${typeMod}\0${counts.join(',')}\0${type}`, (name) => {
      const item = arrayLikeElementType(type)!
      const elementType = publicType(item)
      const convert = element(item, typeMod)
      if (!elementType || !convert) return null
      const read = (nested: RustExpression): RustExpression => {
        const array = call('array', nested, rust.string(arrayElementIdentity(item)), rust.number(arrayElementFamily(item)!), rust.ident(convert))
        if (!compositeProfile(item)) return array
        const plan = compositePlan(item)
        return plan ? call('array_from_coerced_composite_plan', array, rust.string(arrayElementIdentity(item)), plan) : array
      }
      if (compositeProfile(item) && !compositePlan(item)) return null
      const sorted = [...counts].sort((left, right) => left - right)
      const parameter = arrayType(type, counts)!
      const body: RustExpression =
        sorted.length > 1
          ? {
              kind: 'match',
              value: rust.ident('value'),
              arms: sorted.map((count) => ({
                pattern: { kind: 'tuple-struct', path: [...(rustValues(context, `Array${sorted.join('Or')}`) as { path: string[] }).path, `D${count}`], items: [rust.binding('value')] },
                body: read(rust.ident('value')),
              })),
            }
          : read(sorted[0] === 1 ? rust.ident('value') : rust.ref_(rust.field(rust.ident('value'), '0')))
      return {
        kind: 'fn',
        name,
        parameters: [{ pattern: rust.binding('value'), type: rust.ref(parameter) }],
        result: rust.path('ArrayValue'),
        body: [rust.return(body)],
      }
    })
  const support = (profile: NonNullable<ReturnType<typeof rangeTypeProfile>>) => {
    const values_ = rangeProfileSupport(profile, options.context)
    return call('make_range_support', rust.number(values_.comparison), rust.number(values_.canonical))
  }
  const boundProfile = (node: RangeBoundProfilePlan): RustExpression => ({
    kind: 'struct',
    path: ['RangeBoundProfile'],
    fields: [
      { name: 'type_name', value: text(node.typeName) },
      { name: 'kind', value: rust.number(node.kind) },
      { name: 'comparison', value: rust.number(node.comparison) },
      { name: 'canonical', value: rust.number(node.canonical) },
      { name: 'missing_comparison', value: rust.bool(node.missingComparison) },
      { name: 'element_type', value: text(node.elementType) },
      { name: 'child', value: rust.number(node.child) },
      { name: 'enum_labels', value: text(node.enumLabels) },
      { name: 'enum_count', value: rust.number(node.enumCount) },
      {
        name: 'fields',
        value: rust.macro(
          'vec',
          ...(node.fields ?? []).map(
            (field): RustExpression => ({
              kind: 'struct',
              path: ['RangeBoundField'],
              fields: [
                { name: 'type_name', value: text(field.typeName) },
                { name: 'child', value: rust.number(field.child) },
                { name: 'comparison_available', value: rust.bool(field.comparisonAvailable) },
              ],
            }),
          ),
        ),
      },
    ],
  })
  const boundContext = (nodes: readonly RangeBoundProfilePlan[]): RustExpression => ({
    kind: 'struct',
    path: ['RangeBoundContext'],
    fields: [{ name: 'nodes', value: rust.macro('vec', ...nodes.map(boundProfile)) }],
  })
  const compositePlan = (type: string): RustExpression | null => {
    const nodes = compositeNodes(type, options.context)
    if (!nodes) return null
    return rust.call(rust.expressionPath('CompositeTypePlan', 'Value'), {
      kind: 'struct',
      path: ['CompositeTypeContext'],
      fields: [
        {
          name: 'nodes',
          value: rust.macro(
            'vec',
            ...nodes.map(
              (node): RustExpression => ({
                kind: 'struct',
                path: ['CompositeTypeNode'],
                fields: [
                  { name: 'type_name', value: text(node.typeName) },
                  { name: 'kind', value: rust.number(node.kind) },
                  { name: 'element_type', value: text(node.elementType) },
                  { name: 'child', value: rust.number(node.child) },
                  { name: 'fields', value: rust.macro('vec', ...node.fields.map((field) => rust.number(field))) },
                  { name: 'bound_profile', value: boundContext(node.boundProfile) },
                ],
              }),
            ),
          ),
        },
      ],
    })
  }
  const range = (type: string): string | null =>
    define(`range\0${type}`, (name) => {
      const profile = rangeTypeProfile(type)!
      // Bounds that are records, arrays or ranges are compared through the subtype's profile.
      const nodes = rangeContainerKind(profile.elementType) === null ? [] : rangeBoundProfiles(profile, options.context)
      const subtypeDomain = domainElementDefinition(profile.subtype) ? profile.subtype : null
      const bound = element(subtypeDomain ?? profile.elementType)
      const subtype = publicType(subtypeDomain ?? profile.elementType)
      if (!nodes || !bound || !subtype) return null
      const labels = profile.subtypeEnum?.values
      const identity = [rust.string(profile.identity), rust.string(profile.subtype), rust.number(arrayElementFamily(profile.elementType)!)]
      const labelArguments = [rust.string(labels?.join('\0') ?? ''), rust.number(labels?.length ?? -1)]
      const none = rust.expressionPath('ArrayElement', 'Null')
      const emptyArguments = [...identity, rust.bool(true), rust.bool(false), rust.bool(false), none, none, support(profile)]
      const empty = nodes.length
        ? call('range_from_typed_bounds', ...emptyArguments, rust.string(''), rust.number(-1), boundContext(nodes))
        : labels
          ? call('range_from_defined_bounds', ...emptyArguments, ...labelArguments)
          : call('range_from_profiled_bounds', ...emptyArguments)
      const bounds = [rust.ident('lower'), rust.ident('upper'), rust.ident('flags'), support(profile)]
      const construct = nodes.length
        ? call('range_construct_typed', ...identity, ...bounds, rust.string(''), rust.number(-1), boundContext(nodes))
        : labels
          ? call('range_construct_defined', ...identity, ...bounds, ...labelArguments)
          : call('range_construct_with_support', ...identity, ...bounds)
      return {
        kind: 'fn',
        name,
        parameters: [{ pattern: rust.binding('value'), type: rust.ref(rustValues(context, 'Range', subtype)) }],
        result: rust.path('RangeValue'),
        body: [
          rust.return(
            call(
              'range',
              rust.ident('value'),
              rust.ident(bound),
              { kind: 'closure', parameters: [], body: empty },
              {
                kind: 'closure',
                parameters: [{ pattern: rust.binding('lower') }, { pattern: rust.binding('upper') }, { pattern: rust.binding('flags') }],
                body: construct,
              },
            ),
          ),
        ],
      }
    })
  const multirange = (type: string): string | null =>
    define(`multirange\0${type}`, (name) => {
      const profile = multirangeTypeProfile(type)!
      const span = range(profile.rangeType)
      const rangeProfile = rangeTypeProfile(profile.rangeType)
      const subtype = rangeProfile && publicType(domainElementDefinition(rangeProfile.subtype) ? rangeProfile.subtype : rangeProfile.elementType)
      if (!span || !subtype) return null
      return {
        kind: 'fn',
        name,
        parameters: [{ pattern: rust.binding('value'), type: rust.ref(rustValues(context, 'Multirange', subtype)) }],
        result: rust.path('MultirangeValue'),
        body: [
          rust.return(
            call('multirange', rust.ident('value'), rust.string(profile.identity), rust.ident(span), {
              kind: 'closure',
              parameters: [{ pattern: rust.binding('members') }],
              body: call(
                'multirange_construct_array_with_support',
                rust.ident('members'),
                rust.string(profile.multirange),
                rust.string(profile.identity),
                rust.string(profile.subtype),
                rust.number(arrayElementFamily(profile.elementType)!),
                support(profile),
              ),
            }),
          ),
        ],
      }
    })
  const composite = (type: string): string | null =>
    define(`composite\0${type}`, (name) => {
      const profile = compositeProfile(type)
      const definition = profile && compositePhysicalType(profile, profile.identity)
      const root = compositeNodes(type, options.context)?.[0]
      const plan = compositePlan(type)
      const parameter = publicType(type)
      if (!profile || !definition || !root || !plan || !parameter) return null
      const fields = [...definition.fields].sort((left, right) => left.position - right.position)
      const converters = fields.map((field) => {
        const fieldType = compositeFieldType(profile, field.type, true)
        return fieldType ? element(fieldType, field.typeMod) : null
      })
      if (converters.some((item) => !item)) return null
      const statements: RustStatement[] = [
        rust.let('parts', call('parts'), undefined, true),
        rust.let('composite', call('make_composite_fields', rust.string(root.typeName)), undefined, true),
        ...fields.map(
          (field, index): RustStatement =>
            rust.expression({
              kind: 'binary',
              operator: '=',
              left: rust.ident('composite'),
              right: call(
                'append_composite_field',
                rust.ident('composite'),
                call('part', { kind: 'unary', operator: '&mut ', operand: rust.ident('parts') }, call(converters[index]!, rust.method(rust.field(rust.ident('value'), rustFieldName(field.name)), 'as_ref'))),
              ),
            }),
        ),
        rust.return(
          call('composite_from_coerced_plan', {
            kind: 'match',
            value: call('parts_fault', rust.ref_(rust.ident('parts'))),
            arms: [
              {
                pattern: { kind: 'tuple-struct', path: ['Some'], items: [{ kind: 'tuple-struct', path: ['Some'], items: [rust.binding('error')] }] },
                body: rust.call(rust.expressionPath('CompositeValue', 'Error'), rust.ident('error')),
              },
              { pattern: { kind: 'tuple-struct', path: ['Some'], items: [{ kind: 'path', path: ['None'] }] }, body: rust.expressionPath('CompositeValue', 'Unknown') },
              { pattern: { kind: 'path', path: ['None'] }, body: rust.ident('composite') },
            ],
          }, plan),
        ),
      ]
      return {
        kind: 'fn',
        name,
        parameters: [{ pattern: rust.binding('value'), type: rust.ref(parameter) }],
        result: rust.path('CompositeValue'),
        body: statements,
      }
    })
  /**
   * A converter of a set input of the spelled type, a container, through the input's type
   * modifier: `fn(&T) -> V`. `parameter` is the input's public type.
   */
  const input = (type: string, typeMod: number, counts: readonly number[], rustType: string): string | null =>
    define(`input\0${typeMod}\0${counts.join(',')}\0${type}`, (name) => {
      const converted = value(type, typeMod, rust.ident('value'), counts)
      const parameter = arrayLikeElementType(type) ? arrayType(type, counts) : publicType(type)
      return converted && parameter
        ? {
            kind: 'fn',
            name,
            visibility: 'pub',
            parameters: [{ pattern: rust.binding('value'), type: rust.ref(parameter) }],
            result: rust.path(rustType),
            body: [rust.return(converted)],
          }
        : null
    })
  return { input, items }
}

export type RustCheckContainers = ReturnType<typeof createRustCheckContainers>
