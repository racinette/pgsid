import type { DomainInfo, EnumInfo } from '../../../catalog/types.js'
import {
  compositeFieldType,
  compositePhysicalType,
  compositeProfile,
} from '../../../sql-semantics/composite-profiles.js'
import {
  arrayLikeElementType,
  domainElementDefinition,
  isArrayLikeType,
  isCatalogVectorType,
} from '../../../sql-semantics/expressions.js'
import {
  multirangeTypeProfile,
  rangeContainerKind,
  rangeProfileSupport,
  rangeTypeProfile,
} from '../../../sql-semantics/range-profiles.js'
import {
  arrayElementFamily,
  arrayElementIdentity,
  rangeBoundProfiles,
} from '../../shared/check-array-types.js'
import { compositeNodes } from '../../shared/check-composite-types.js'
import {
  checkRustTextInput,
  checkRustValueType,
  type CheckExecutionContext,
} from '../../shared/check-rust-evaluator.js'
import { checkTypeModifierCoercion } from '../../shared/check-type-modifiers.js'
import { goName } from '../names.js'
import { go, type GoDeclaration, type GoExpression, type GoStatement } from '../ast.js'
import { goCallable } from './check-public-inputs.js'


const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
const operations = (name: string) => go.selector(go.ident('pg_catalog'), name)
const literal = (value: boolean | number): GoExpression =>
  typeof value === 'boolean' ? go.ident(String(value)) : go.number(value)
const element = runtime('ArrayElement')
const cell = go.ident('cell')
const value = go.ident('value')
const anyParameter = [{ names: ['value'], type: go.any() }]

// The fixed converters each family's public value goes through, by runtime value type.
const typedConverters: Readonly<Record<string, { name: string; type?: string }>> = {
  DateValue: { name: 'checkPublicDate', type: 'Date' },
  TimestampValue: { name: 'checkPublicTimestamp', type: 'Timestamp' },
  TimestamptzValue: { name: 'checkPublicTimestamptz', type: 'Timestamptz' },
  IntervalValue: { name: 'checkPublicInterval', type: 'Interval' },
  TimeValue: { name: 'checkPublicTime', type: 'Time' },
  TimetzValue: { name: 'checkPublicTimetz', type: 'Timetz' },
  PointValue: { name: 'checkPublicPoint', type: 'Point' },
  LineValue: { name: 'checkPublicLine', type: 'Line' },
  LsegValue: { name: 'checkPublicLseg', type: 'Lseg' },
  BoxValue: { name: 'checkPublicBox', type: 'Box' },
  PathValue: { name: 'checkPublicPath', type: 'Path' },
  PolygonValue: { name: 'checkPublicPolygon', type: 'Polygon' },
  CircleValue: { name: 'checkPublicCircle', type: 'Circle' },
  NumericValue: { name: 'checkPublicNumeric', type: 'Numeric' },
}
// Families whose input adapter reads any public value of the family's Go types.
const adaptedFamilies: Readonly<Record<string, string>> = {
  Int2Value: 'checkRustInt2',
  Int4Value: 'checkRustInt4',
  Int8Value: 'checkRustInt8',
  BoolValue: 'checkRustBool',
  Float4Value: 'checkRustFloat4',
  Float8Value: 'checkRustFloat8',
  BitValue: 'checkRustBit',
  UuidValue: 'checkRustUuid',
  ByteaValue: 'checkRustBytea',
  MacaddrValue: 'checkRustMacaddr',
  Macaddr8Value: 'checkRustMacaddr8',
  NetworkValue: 'checkRustNetwork',
}

export interface GoCheckPublicContainerOptions {
  context: CheckExecutionContext | undefined
  domains: readonly DomainInfo[]
  enums: readonly EnumInfo[]
  // Whether the evaluator carries the regular expression engine jsonpath input needs.
  regex: boolean
  boundContext: (type: string) => GoExpression
  compositeContext: (type: string) => GoExpression
  // A domain's generated checks, in their group's order, with the constraint each declares.
  domainGroup: (domain: DomainInfo) => { name: string; owners: readonly string[] } | undefined
}

/**
 * Converters from public Go values to the evaluator's values for the types containers hold,
 * generated once per type: a scalar through its family's converter, a range through the
 * evaluator's range constructor, so PostgreSQL's input rules apply as they do to a parameter. A
 * type the conversion cannot decide gets a converter that leaves the value undecided.
 */
export function createGoCheckPublicContainers(options: GoCheckPublicContainerOptions) {
  const declarations: GoDeclaration[] = []
  const names = new Map<string, string>()
  const helpers = new Set<string>()
  const adapters = new Set<string>()
  const packages = new Set<'operations'>()
  // The runtime callables the converters call.
  const callables = new Set<string>()
  const reachedDomains = new Set<DomainInfo>()
  // Domain checks are called with a domain's public input, whose field type is known only once
  // every group's inputs are; their callers are generated last.
  const domainCalls: { name: string; domain: DomainInfo; entry: string; input: string }[] = []
  let jsonpathReached = false
  // Whether a converter names a type of the value package.
  let values = false
  const undecided = (name: string): boolean => name.startsWith('checkPublicUndecided')
  const undecidedFor = (returnType: string): string => {
    const name = `checkPublicUndecided${returnType}`
    if (!names.has(name)) {
      names.set(name, name)
      declarations.push(
        go.function(
          name,
          anyParameter,
          [{ type: runtime(returnType) }],
          [
            go.return(
              returnType === 'ArrayElement'
                ? go.composite(element, [go.keyValue('Kind', runtime('ArrayElementUnknown'))])
                : go.call(runtime(`${returnType.slice(0, -'Value'.length)}Unknown`)),
            ),
          ],
        ),
      )
    }
    return name
  }
  // Each converter takes a public value as `any`, for the type its container declares.
  const define = (
    key: string,
    prefix: string,
    returnType: string,
    build: () => GoStatement[] | string,
  ): string => {
    const existing = names.get(key)
    if (existing) return existing
    const name = `${prefix}${names.size}`
    names.set(key, name)
    const body = build()
    if (typeof body === 'string') {
      names.set(key, body)
      return body
    }
    declarations.push(go.function(name, anyParameter, [{ type: runtime(returnType) }], body))
    return name
  }
  const support = (profile: NonNullable<ReturnType<typeof rangeTypeProfile>>) => {
    const values = rangeProfileSupport(profile, options.context)
    return go.call(runtime('MakeRangeSupport'), [
      go.number(values.comparison),
      go.number(values.canonical),
    ])
  }
  // A field's type modifier applies as the server applies it reading the field: through the
  // type's length coercion.
  const typeModified = (type: string, typeMod: number, read: GoExpression): GoExpression | null => {
    if (typeMod < 0) return read
    const coercion = checkTypeModifierCoercion(type)
    if (!coercion) return null
    callables.add(coercion.callable)
    packages.add('operations')
    return go.call(operations(goCallable(coercion.callable)), [
      read,
      go.call(runtime('MakeInt4Value'), [go.number(typeMod)]),
      ...(coercion.explicit ? [go.call(runtime('MakeBoolValue'), [go.ident('false')])] : []),
    ])
  }
  const textInput = (type: string, text: GoExpression): GoExpression | null => {
    const input = checkRustTextInput(type, options.context)
    if (!input) return null
    callables.add(input.callable)
    helpers.add('checkPublicText')
    if (input.module === 'operations') packages.add('operations')
    return go.call(
      input.module === 'runtime' ? runtime(goCallable(input.callable)) : operations(goCallable(input.callable)),
      [go.call(go.ident('checkPublicText'), [text]), ...input.args.map(literal)],
    )
  }
  // A non-NULL scalar part, read as the server reads that value sent on its own.
  const scalar = (type: string, typeMod: number): GoExpression | null => {
    let valueType: string
    try {
      valueType = checkRustValueType(type)
    } catch {
      return null
    }
    const wrap = (read: GoExpression | null) => {
      const modified = read && typeModified(type, typeMod, read)
      return modified && go.call(runtime(`ArrayElementFrom${valueType.slice(0, -'Value'.length)}`), [modified])
    }
    const text = () => {
      helpers.add('checkPublicCell')
      return go.call(go.ident('checkPublicString'), [cell])
    }
    const unsigned = (width: 'uint32' | 'uint64') => {
      helpers.add('checkPublicCell')
      return go.call(go.ident(width), [go.call(go.ident('checkPublicUnsigned'), [cell])])
    }
    // jsonpath's input compiles like_regex patterns, so it needs the regex engine in the evaluator.
    if (type === 'pg_catalog.jsonpath') {
      if (!options.regex) {
        jsonpathReached = true
        return null
      }
      packages.add('operations')
      helpers.add('checkPublicText')
      return wrap(
        go.call(operations('JsonpathFromText'), [
          go.call(go.ident('checkPublicText'), [text()]),
          literal(options.context?.defaultCollation === 'C'),
          literal(options.context?.serverEncoding === 'UTF8'),
        ]),
      )
    }
    const typed = typedConverters[valueType]
    if (typed) {
      values = true
      helpers.add(typed.name)
      helpers.add('checkPublicCell')
      return wrap(
        go.call(go.ident(typed.name), [
          go.call(
            go.index(go.ident('checkPublicAs'), go.selector(go.ident('pgsid'), typed.type!)),
            [cell],
          ),
        ]),
      )
    }
    // A value sent as text goes through its type's input, as array input reads each element.
    const input = textInput(type, text())
    if (input) return wrap(input)
    const known = go.call(go.index(go.ident('KnownCheckValue'), go.any()), [cell])
    const adapter = adaptedFamilies[valueType]
    if (adapter) {
      adapters.add(adapter)
      return wrap(go.call(go.ident(adapter), [known]))
    }
    switch (valueType) {
      case 'XidValue':
        helpers.add('checkPublicXid')
        return wrap(go.call(go.ident('checkPublicXid'), [unsigned('uint32')]))
      case 'CidValue':
        helpers.add('checkPublicCid')
        return wrap(go.call(go.ident('checkPublicCid'), [unsigned('uint32')]))
      case 'Xid8Value':
        helpers.add('checkPublicXid8')
        return wrap(go.call(go.ident('checkPublicXid8'), [unsigned('uint64')]))
      case 'InternalCharValue':
        helpers.add('checkPublicInternalChar')
        return wrap(
          go.call(go.ident('checkPublicInternalChar'), [
            text(),
            literal(options.context?.serverEncoding === 'UTF8'),
          ]),
        )
      case 'OidValue':
        if (type !== 'pg_catalog.oid') return null
        helpers.add('checkPublicOid')
        return wrap(go.call(go.ident('checkPublicOid'), [unsigned('uint32')]))
      case 'TextValue': {
        const textAdapter =
          type === 'pg_catalog.name'
            ? 'checkRustName'
            : type === 'pg_catalog.refcursor'
              ? 'checkRustRefcursor'
              : 'checkRustText'
        adapters.add(textAdapter)
        return wrap(go.call(go.ident(textAdapter), [known]))
      }
      case 'EnumValue': {
        const [schema, enumName] = JSON.parse(type.slice('enum:'.length)) as [string, string]
        const labels = options.enums.find(
          (item) => item.schema === schema && item.name === enumName,
        )?.values
        if (!labels) return null
        adapters.add('checkRustEnum')
        return wrap(
          go.call(go.ident('checkRustEnum'), [
            known,
            go.composite(
              go.slice(go.ident('string')),
              labels.map((label) => go.string(label)),
            ),
          ]),
        )
      }
    }
    return null
  }
  const quoteIdent = (name: string): string =>
    /^[a-z_][a-z0-9_$]*$/u.test(name) ? name : `"${name.replaceAll('"', '""')}"`
  const domainNamed = (type: string): DomainInfo | undefined => {
    const definition = domainElementDefinition(type)
    return definition
      ? options.domains.find(
          (item) => item.schema === definition.schema && item.name === definition.name,
        )
      : options.domains.find((item) =>
          [
            `${item.schema}.${item.name}`,
            `${quoteIdent(item.schema)}.${quoteIdent(item.name)}`,
          ].includes(type),
        )
  }
  // The server reads an element, field or bound of a domain type through the domain's input: the
  // base type's input, then the domain's NOT NULL and CHECK constraints, base domains first.
  const domainConverter = (domain: DomainInfo, base: string): string =>
    define(`domain\0${domain.oid}\0${base}`, 'checkPublicDomain', 'ArrayElement', () => {
      const chain: DomainInfo[] = []
      for (
        let layer: DomainInfo | undefined = domain;
        layer && !chain.includes(layer);
        layer = options.domains.find((item) => item.oid === layer!.baseTypeOid)
      )
        chain.push(layer)
      const group = options.domainGroup(domain)
      const declared = chain.reduce((count, layer) => count + layer.checks.length, 0)
      // A domain reached only inside a value gets its checks generated too, on a second pass.
      if (!group && declared) reachedDomains.add(domain)
      const layers = (group?.owners ?? []).map((owner) =>
        chain.findIndex((layer) => `${layer.schema}.${layer.name}` === owner),
      )
      // A modifier the chain applies, or a constraint without a generated check, is not decided here.
      if (
        undecided(base) ||
        chain.some((layer) => (layer.baseTypeMod ?? -1) >= 0) ||
        layers.includes(-1) ||
        layers.length !== declared
      )
        return undecidedFor('ArrayElement')
      const order = layers
        .map((layer, index) => ({ layer, index }))
        .sort((left, right) => right.layer - left.layer || left.index - right.index)
        .map(({ index }) => go.number(index))
      helpers.add('checkPublicDomainCell')
      let evaluate: GoExpression = go.ident('nil')
      if (group && declared) {
        const name = `checkPublicDomainChecks${domainCalls.length}`
        domainCalls.push({
          name,
          domain,
          entry: `Evaluate${goName(group.name)}DomainChecks`,
          input: `${goName(group.name)}CheckInput`,
        })
        evaluate = go.ident(name)
      }
      return [
        go.return(
          go.call(go.ident('checkPublicDomainCell'), [
            value,
            literal(chain.some((layer) => layer.notNull)),
            go.ident(base),
            evaluate,
            go.composite(go.slice(go.ident('int')), order),
          ]),
        ),
      ]
    })
  const elementConverter = (type: string, typeMod = -1): string => {
    const definition = domainElementDefinition(type)
    if (!definition) return plainElementConverter(type, typeMod)
    if (typeMod >= 0) return undecidedFor('ArrayElement')
    const domain = domainNamed(type)
    return domain
      ? domainConverter(domain, elementConverter(definition.base))
      : undecidedFor('ArrayElement')
  }
  // Containers hand every cell to its converter, NULL included, as array and record input do.
  const plainElementConverter = (type: string, typeMod: number): string =>
    define(`element\0${typeMod}\0${type}`, 'checkPublicElement', 'ArrayElement', () => {
      const cellBody = (read: GoExpression | null): GoStatement[] | string => {
        if (!read) return undecidedFor('ArrayElement')
        helpers.add('checkPublicCell')
        return [
          go.assign([cell, go.ident('null')], [go.call(go.ident('checkPublicCell'), [value])]),
          go.if(go.ident('null'), [go.return(go.call(go.ident('checkPublicNullElement')))]),
          go.return(read),
        ]
      }
      // A part the conversion cannot decide may be one the server rejects, so the whole value is
      // undecided rather than read around it.
      const container = (member: string, convert: string): GoStatement[] | string => {
        if (undecided(convert) || (typeMod >= 0 && member !== 'ArrayElementFromArray'))
          return undecidedFor('ArrayElement')
        return cellBody(go.call(runtime(member), [go.call(go.ident(convert), [cell])]))
      }
      if (compositeProfile(type)) return container('ArrayElementFromComposite', compositeConverter(type))
      if (multirangeTypeProfile(type) && !isArrayLikeType(type))
        return container('ArrayElementFromMultirange', multirangeConverter(type))
      if (rangeTypeProfile(type) && !isArrayLikeType(type))
        return container('ArrayElementFromRange', rangeConverter(type))
      if (arrayLikeElementType(type) && !isCatalogVectorType(type))
        return container('ArrayElementFromArray', arrayConverter(type, [1], typeMod))
      return cellBody(scalar(type, typeMod))
    })
  // An array's type modifier is its elements': array input reads each element through the
  // coercion an assignment uses, which refuses a value too long where an explicit cast cuts it.
  const arrayConverter = (type: string, counts: readonly number[] = [1], typeMod = -1): string =>
    define(`array\0${counts.join(',')}\0${typeMod}\0${type}`, 'checkPublicArray', 'ArrayValue', () => {
      const item = arrayLikeElementType(type)!
      const convert = elementConverter(item, typeMod)
      if (undecided(convert)) return undecidedFor('ArrayValue')
      helpers.add('checkPublicArray')
      const array = go.call(go.ident('checkPublicArray'), [
        value,
        go.composite(go.slice(go.ident('int')), counts.map((count) => go.number(count))),
        go.string(arrayElementIdentity(item)),
        go.number(arrayElementFamily(item)!),
        go.ident(convert),
      ])
      // Composite elements are checked against their type plan, as stored composites are.
      return [
        go.return(
          compositeProfile(item)
            ? go.call(runtime('ArrayFromCoercedCompositePlan'), [
                array,
                go.string(arrayElementIdentity(item)),
                options.compositeContext(item),
              ])
            : array,
        ),
      ]
    })
  const compositeConverter = (type: string): string =>
    define(`composite\0${type}`, 'checkPublicComposite', 'CompositeValue', () => {
      const profile = compositeProfile(type)
      const definition = profile && compositePhysicalType(profile, profile.identity)
      const root = compositeNodes(type, options.context)?.[0]
      if (!profile || !definition || !root) return undecidedFor('CompositeValue')
      const fields = [...definition.fields].sort((left, right) => left.position - right.position)
      const converters = fields.map((field) => {
        const fieldType = compositeFieldType(profile, field.type, true)
        return fieldType ? elementConverter(fieldType, field.typeMod) : undecidedFor('ArrayElement')
      })
      if (converters.some(undecided)) return undecidedFor('CompositeValue')
      helpers.add('checkPublicComposite')
      return [
        go.return(
          go.call(runtime('CompositeFromCoercedPlan'), [
            go.call(go.ident('checkPublicComposite'), [
              value,
              go.string(root.typeName),
              go.composite(
                go.slice(go.ident('string')),
                fields.map((field) => go.string(goName(field.name))),
              ),
              go.composite(
                go.slice(go.functionType(anyParameter, [{ type: element }])),
                converters.map((name) => go.ident(name)),
              ),
            ]),
            options.compositeContext(type),
          ]),
        ),
      ]
    })
  const multirangeConverter = (type: string): string =>
    define(`multirange\0${type}`, 'checkPublicMultirange', 'MultirangeValue', () => {
      const profile = multirangeTypeProfile(type)!
      const span = rangeConverter(profile.rangeType)
      if (undecided(span)) return undecidedFor('MultirangeValue')
      helpers.add('checkPublicMultirange')
      packages.add('operations')
      return [
        go.return(
          go.call(go.ident('checkPublicMultirange'), [
            value,
            go.string(profile.identity),
            go.ident(span),
            {
              kind: 'function-literal',
              parameters: [{ names: ['members'], type: runtime('ArrayValue') }],
              results: [{ type: runtime('MultirangeValue') }],
              body: [
                go.return(
                  go.call(operations('MultirangeConstructArrayWithSupport'), [
                    go.ident('members'),
                    go.string(profile.multirange),
                    go.string(profile.identity),
                    go.string(profile.subtype),
                    go.number(arrayElementFamily(profile.elementType)!),
                    support(profile),
                  ]),
                ),
              ],
            },
          ]),
        ),
      ]
    })
  const rangeConverter = (type: string): string =>
    define(`range\0${type}`, 'checkPublicRange', 'RangeValue', () => {
      const profile = rangeTypeProfile(type)!
      // Bounds that are records, arrays or ranges are compared through the subtype's profile.
      const nodes =
        rangeContainerKind(profile.elementType) === null
          ? []
          : rangeBoundProfiles(profile, options.context)
      if (!nodes || undecided(elementConverter(profile.elementType)))
        return undecidedFor('RangeValue')
      const labels = profile.subtypeEnum?.values
      const subtypeDomain = domainNamed(profile.subtype)
      const bound = subtypeDomain
        ? domainConverter(subtypeDomain, elementConverter(profile.elementType))
        : elementConverter(profile.elementType)
      if (undecided(bound)) return undecidedFor('RangeValue')
      helpers.add('checkPublicRange')
      packages.add('operations')
      const identity = [
        go.string(profile.identity),
        go.string(profile.subtype),
        go.number(arrayElementFamily(profile.elementType)!),
      ]
      const labelArguments = [go.string(labels?.join('\0') ?? ''), go.number(labels?.length ?? -1)]
      const none = go.composite(element, [go.keyValue('Kind', runtime('ArrayElementNull'))])
      const empty = nodes.length
        ? go.call(runtime('RangeFromTypedBounds'), [
            ...identity,
            go.ident('true'),
            go.ident('false'),
            go.ident('false'),
            none,
            none,
            support(profile),
            go.string(''),
            go.number(-1),
            options.boundContext(type),
          ])
        : labels
          ? go.call(runtime('RangeFromDefinedBounds'), [
              ...identity,
              go.ident('true'),
              go.ident('false'),
              go.ident('false'),
              none,
              none,
              support(profile),
              ...labelArguments,
            ])
          : go.call(runtime('RangeFromProfiledBounds'), [
              ...identity,
              go.ident('true'),
              go.ident('false'),
              go.ident('false'),
              none,
              none,
              support(profile),
            ])
      const bounds = [go.ident('lower'), go.ident('upper'), go.ident('flags'), support(profile)]
      const construct = nodes.length
        ? go.call(operations('RangeConstructTyped'), [
            ...identity,
            ...bounds,
            go.string(''),
            go.number(-1),
            options.boundContext(type),
          ])
        : labels
          ? go.call(operations('RangeConstructDefined'), [...identity, ...bounds, ...labelArguments])
          : go.call(operations('RangeConstructWithSupport'), [...identity, ...bounds])
      return [
        go.return(
          go.call(go.ident('checkPublicRange'), [
            value,
            go.ident(bound),
            {
              kind: 'function-literal',
              parameters: [],
              results: [{ type: runtime('RangeValue') }],
              body: [go.return(empty)],
            },
            {
              kind: 'function-literal',
              parameters: [
                { names: ['lower', 'upper'], type: element },
                { names: ['flags'], type: runtime('TextValue') },
              ],
              results: [{ type: runtime('RangeValue') }],
              body: [go.return(construct)],
            },
          ]),
        ),
      ]
    })
  return {
    elementConverter,
    rangeConverter,
    multirangeConverter,
    arrayConverter,
    compositeConverter,
    undecided,
    helpers,
    adapters,
    packages,
    callables,
    reachedDomains,
    get jsonpathReached() {
      return jsonpathReached
    },
    get values() {
      return values
    },
    /**
     * The generated converters, with the callers of domain checks, given each domain group's
     * public input field type, or null where the group takes no public value.
     */
    declarations(domainField: (domain: DomainInfo) => GoExpression | null): GoDeclaration[] {
      const calls = domainCalls.map(({ name, domain, entry, input }) => {
        const field = domainField(domain)
        const results = [
          { type: go.slice(go.ident('CheckEvaluation')) },
          { type: go.ident('bool') },
        ]
        if (!field)
          return go.function(name, anyParameter, results, [
            go.return(go.ident('nil'), go.ident('false')),
          ])
        helpers.add('checkPublicOptional')
        helpers.add('checkPublicCell')
        return go.function(name, anyParameter, results, [
          go.assign([cell, go.ident('null')], [go.call(go.ident('checkPublicCell'), [value])]),
          go.assign(
            [go.ident('results'), go.ident('err')],
            [
              go.call(go.ident(entry), [
                go.composite(go.ident(input), [
                  go.keyValue(
                    'Value',
                    go.call(go.index(go.ident('checkPublicOptional'), field), [
                      cell,
                      go.ident('null'),
                    ]),
                  ),
                ]),
              ]),
            ],
          ),
          go.if(go.notEqual(go.ident('err'), go.ident('nil')), [
            go.return(
              go.call(go.index(go.ident('checkRustInvalid'), go.slice(go.ident('CheckEvaluation')))),
              go.ident('false'),
            ),
          ]),
          go.return(go.ident('results'), go.ident('true')),
        ])
      })
      return [...declarations, ...calls]
    },
  }
}

export type GoCheckPublicContainers = ReturnType<typeof createGoCheckPublicContainers>
