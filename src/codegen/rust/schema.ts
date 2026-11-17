import { join } from 'node:path'
import type { CatalogSnapshot, DomainInfo, TableInfo } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import type { OutputCheckCases, OutputLiterals } from '../../query/check-cases.js'
import type { SchemaDomainLiterals, SchemaRelationAnalyses } from '../../schema-analysis.js'
import {
  printRustFile,
  rust,
  type RustExpression,
  type RustItem,
  type RustPattern,
  type RustType,
} from './ast.js'
import {
  assertUniqueRustNames,
  rustEnumVariants,
  rustFieldName,
  rustTypeName,
  uniqueNames,
} from './names.js'
import {
  nullableRustType,
  resolveRustColumnType,
  resolveRustType,
  rustDeclaredType,
  rustDomainBase,
  rustSchemaModule,
  rustValues,
  type RustTypeContext,
} from './type-mapping.js'
import { rustValueArtifacts } from './values.js'
import { planRustChecks, rustCheckItems, type RustCheckPlan } from './checks.js'

type Artifact = { path: string; content: string }

const postgres = (name: string): string => `postgres(name = ${JSON.stringify(name)})`
const boxError: RustType = rust.generic('Box', {
  kind: 'dyn',
  bounds: [rust.path('std', 'error', 'Error'), rust.path('Sync'), rust.path('Send')],
})
const typeParameter: { pattern: { kind: 'ident'; name: string }; type: RustType } = {
  pattern: { kind: 'ident', name: 'ty' },
  type: rust.ref(rust.path('postgres_types', 'Type')),
}

function enumItems(schema: string, name: string, labels: readonly string[]): RustItem[] {
  const variants = rustEnumVariants(labels)
  return [
    {
      kind: 'enum',
      name: rustTypeName(name),
      visibility: 'pub',
      attributes: [
        rust.derive(
          'Debug',
          'Clone',
          'Copy',
          'PartialEq',
          'Eq',
          'Hash',
          'postgres_types::ToSql',
          'postgres_types::FromSql',
        ),
        { path: postgres(name) },
      ],
      doc: `The enum ${schema}.${name}.`,
      variants: labels.map((label, index) => ({
        name: variants[index]!,
        attributes: [{ path: postgres(label) }],
      })),
    },
  ]
}

function compositeItems(
  schema: string,
  name: string,
  attributes: readonly { name: string; typeName: string; typeOid: number }[],
  catalog: CatalogSnapshot,
  context: RustTypeContext,
): RustItem[] {
  assertUniqueRustNames(
    attributes.map((attribute) => ({
      source: attribute.name,
      generated: rustFieldName(attribute.name),
    })),
    `attribute in composite ${schema}.${name}`,
  )
  return [
    {
      kind: 'struct',
      name: rustTypeName(name),
      visibility: 'pub',
      attributes: [
        rust.derive(
          'Debug',
          'Clone',
          'PartialEq',
          'postgres_types::ToSql',
          'postgres_types::FromSql',
        ),
        { path: postgres(name) },
      ],
      doc: `The composite type ${schema}.${name}.`,
      fields: {
        kind: 'struct',
        items: attributes.map((attribute) => ({
          name: rustFieldName(attribute.name),
          visibility: 'pub',
          attributes: [{ path: postgres(attribute.name) }],
          type: rust.option(
            resolveRustType(attribute.typeName, catalog, context, attribute.typeOid),
          ),
        })),
      },
    },
  ]
}

// A domain is a newtype over its base type, read and written as either the domain or its base
// type: the server describes a parameter as the domain and a result column as its base type.
function domainItems(
  domain: DomainInfo,
  catalog: CatalogSnapshot,
  context: RustTypeContext,
): RustItem[] {
  const name = rustTypeName(domain.name)
  const base = rustDomainBase(domain, catalog, context)
  const self = rust.path(name)
  const baseOf: RustExpression = rust.call(
    { kind: 'path', path: (rustValues(context, 'domain_base') as { path: string[] }).path },
    rust.ident('ty'),
  )
  const fromSql: RustType = {
    kind: 'path',
    path: ['postgres_types', 'FromSql'],
    generics: [{ kind: 'lifetime', name: 'a' }],
  }
  const toSql = rust.path('postgres_types', 'ToSql')
  // The domain itself, or what its base type accepts.
  const accepts = (trait: RustType): RustExpression => ({
    kind: 'binary',
    operator: '||',
    left: {
      kind: 'paren',
      value: {
        kind: 'binary',
        operator: '&&',
        left: {
          kind: 'binary',
          operator: '==',
          left: rust.method(rust.ident('ty'), 'name'),
          right: rust.string(domain.name),
        },
        right: {
          kind: 'binary',
          operator: '==',
          left: rust.method(rust.ident('ty'), 'schema'),
          right: rust.string(domain.schema),
        },
      },
    },
    right: rust.call({ kind: 'qualified', type: base, trait, name: 'accepts' }, baseOf),
  })
  const acceptsFunction = (trait: RustType) => ({
    kind: 'fn' as const,
    name: 'accepts',
    parameters: [typeParameter],
    result: rust.path('bool'),
    body: [rust.return(accepts(trait))],
  })
  return [
    {
      kind: 'struct',
      name,
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq')],
      doc: `The domain ${domain.schema}.${domain.name}.`,
      fields: { kind: 'tuple', items: [{ type: base, visibility: 'pub' }] },
    },
    {
      kind: 'impl',
      generics: [{ name: 'a', lifetime: true }],
      trait: fromSql,
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'from_sql',
          parameters: [
            typeParameter,
            {
              pattern: rust.binding('raw'),
              type: rust.ref({ kind: 'slice', type: rust.path('u8') }, 'a'),
            },
          ],
          result: rust.generic('Result', self, boxError),
          body: [
            rust.return(
              rust.call(
                rust.ident('Ok'),
                rust.call(
                  rust.ident(name),
                  rust.try(
                    rust.call(
                      { kind: 'qualified', type: base, trait: fromSql, name: 'from_sql' },
                      baseOf,
                      rust.ident('raw'),
                    ),
                  ),
                ),
              ),
            ),
          ],
        },
        acceptsFunction(fromSql),
      ],
    },
    {
      kind: 'impl',
      trait: toSql,
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'to_sql',
          receiver: '&self',
          parameters: [
            typeParameter,
            {
              pattern: rust.binding('out'),
              type: { kind: 'reference', mutable: true, type: rust.path('bytes', 'BytesMut') },
            },
          ],
          result: rust.generic('Result', rust.path('postgres_types', 'IsNull'), boxError),
          body: [
            rust.return(
              rust.call(
                { kind: 'qualified', type: base, trait: toSql, name: 'to_sql' },
                rust.ref_(rust.field(rust.ident('self'), '0')),
                baseOf,
                rust.ident('out'),
              ),
            ),
          ],
        },
        acceptsFunction(toSql),
        { kind: 'macro', path: ['postgres_types', 'to_sql_checked'] },
      ],
    },
  ]
}

// A Rust type a literal set narrows: text to an enum of its strings, an integer to an enum of its
// integers. Other types keep their values.
export const literalBase = (type: RustType, literals: OutputLiterals): string | null => {
  if (type.kind !== 'path' || type.path.length !== 1 || type.generics) return null
  const name = type.path[0]!
  if (literals.kind === 'string' && name === 'String') return name
  if (
    (literals.kind === 'number' || literals.kind === 'bigint') &&
    ['i16', 'i32', 'i64'].includes(name)
  )
    return literals.values.every((value) => /^-?\d+$/u.test(value)) ? name : null
  return null
}

export const literalVariant = (value: string, kind: OutputLiterals['kind']): string => {
  if (kind !== 'string') return `N${value.replace('-', 'Minus')}`
  const name = rustTypeName(value)
  return /^[A-Za-z]/u.test(value) && name !== 'Unnamed'
    ? name
    : `Value${name === 'Unnamed' ? '' : name}`
}

/**
 * An enum of the values a column's or domain's CHECKs admit, read and written as its base type:
 * a value outside the set is an error, since the stored rows cannot hold it.
 */
export function literalItems(
  name: string,
  base: string,
  literals: OutputLiterals,
  owner: string,
  domain?: DomainInfo,
): RustItem[] {
  const variants = uniqueNames(literals.values.map((value) => literalVariant(value, literals.kind)))
  const text = base === 'String'
  const valueType: RustType = text ? rust.ref(rust.path('str'), 'static') : rust.path(base)
  const literal = (value: string): RustExpression =>
    text ? rust.string(value) : rust.number(value)
  const self = rust.path(name)
  const baseType: RustExpression = domain
    ? rust.call(rust.expressionPath('super', 'pgsid', 'domain_base'), rust.ident('ty'))
    : rust.ident('ty')
  const fromSql: RustType = {
    kind: 'path',
    path: ['postgres_types', 'FromSql'],
    generics: [{ kind: 'lifetime', name: 'a' }],
  }
  const toSql = rust.path('postgres_types', 'ToSql')
  const named: RustExpression[] = domain
    ? [
        {
          kind: 'paren',
          value: {
            kind: 'binary',
            operator: '&&',
            left: {
              kind: 'binary',
              operator: '==',
              left: rust.method(rust.ident('ty'), 'name'),
              right: rust.string(domain.name),
            },
            right: {
              kind: 'binary',
              operator: '==',
              left: rust.method(rust.ident('ty'), 'schema'),
              right: rust.string(domain.schema),
            },
          },
        },
      ]
    : []
  const accepts = (trait: RustType) => ({
    kind: 'fn' as const,
    name: 'accepts',
    parameters: [typeParameter],
    result: rust.path('bool'),
    body: [
      rust.return(
        [
          ...named,
          rust.call({ kind: 'qualified', type: rust.path(base), trait, name: 'accepts' }, baseType),
        ].reduce((left, right): RustExpression => ({
          kind: 'binary',
          operator: '||',
          left,
          right,
        })),
      ),
    ],
  })
  const read: RustExpression = rust.try(
    rust.call(
      { kind: 'qualified', type: rust.path(base), trait: fromSql, name: 'from_sql' },
      baseType,
      rust.ident('raw'),
    ),
  )
  return [
    {
      kind: 'enum',
      name,
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'Copy', 'PartialEq', 'Eq', 'Hash')],
      doc: `The values the CHECKs of ${owner} admit.`,
      variants: variants.map((variant) => ({ name: variant })),
    },
    {
      kind: 'impl',
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'value',
          visibility: 'pub',
          doc: 'The value as the server stores it.',
          receiver: '&self',
          parameters: [],
          result: valueType,
          body: [
            rust.return({
              kind: 'match',
              value: rust.ident('self'),
              arms: variants.map((variant, index) => ({
                pattern: { kind: 'path', path: ['Self', variant] },
                body: literal(literals.values[index]!),
              })),
            }),
          ],
        },
      ],
    },
    {
      kind: 'impl',
      generics: [{ name: 'a', lifetime: true }],
      trait: fromSql,
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'from_sql',
          parameters: [
            typeParameter,
            {
              pattern: rust.binding('raw'),
              type: rust.ref({ kind: 'slice', type: rust.path('u8') }, 'a'),
            },
          ],
          result: rust.generic('Result', self, boxError),
          body: [
            rust.return({
              kind: 'match',
              value: text ? rust.method(read, 'as_str') : read,
              arms: [
                ...variants.map((variant, index) => ({
                  pattern: {
                    kind: 'literal',
                    value: literal(literals.values[index]!),
                  } as RustPattern,
                  body: rust.call(rust.ident('Ok'), rust.expressionPath('Self', variant)),
                })),
                {
                  pattern: rust.binding('other'),
                  body: rust.call(
                    rust.ident('Err'),
                    rust.method(
                      rust.macro(
                        'format',
                        rust.string(`{:?} is not a value the CHECKs of ${owner} admit`),
                        rust.ident('other'),
                      ),
                      'into',
                    ),
                  ),
                },
              ],
            }),
          ],
        },
        accepts(fromSql),
      ],
    },
    {
      kind: 'impl',
      trait: toSql,
      type: self,
      items: [
        {
          kind: 'fn',
          name: 'to_sql',
          receiver: '&self',
          parameters: [
            typeParameter,
            {
              pattern: rust.binding('out'),
              type: { kind: 'reference', mutable: true, type: rust.path('bytes', 'BytesMut') },
            },
          ],
          result: rust.generic('Result', rust.path('postgres_types', 'IsNull'), boxError),
          body: [
            rust.return(
              rust.call(
                { kind: 'qualified', type: valueType, trait: toSql, name: 'to_sql' },
                rust.ref_(rust.method(rust.ident('self'), 'value')),
                baseType,
                rust.ident('out'),
              ),
            ),
          ],
        },
        accepts(toSql),
        { kind: 'macro', path: ['postgres_types', 'to_sql_checked'] },
      ],
    },
  ]
}

function tableItems(
  table: TableInfo,
  catalog: CatalogSnapshot,
  context: RustTypeContext,
  dimensions: (column: string) => number | readonly number[] | undefined,
  cases: OutputCheckCases | undefined,
  checks?: {
    plan: RustCheckPlan
    group: RustCheckPlan['groups'][number] | undefined
    literalDomain: (domain: DomainInfo) => boolean
    domainChecked: (domain: DomainInfo) => boolean
    dimensions: (column: string) => number | readonly number[] | undefined
  },
): RustItem[] {
  const name = rustTypeName(table.name)
  const enums: RustItem[] = []
  const literal = new Set<string>()
  const columns = table.columns.map((column, index) => {
    let type = resolveRustColumnType(
      column,
      dimensions(`${table.schema}.${table.name}.${column.name}`),
      catalog,
      context,
    )
    // A column whose stored rows' CHECKs admit only some literals holds one of them.
    const literals = cases?.literals[index]
    const base = literals && literalBase(type, literals)
    if (literals && base) {
      const enumName = `${name}${rustTypeName(column.name)}`
      enums.push(
        ...literalItems(enumName, base, literals, `${table.schema}.${table.name}.${column.name}`),
      )
      type = rust.path(enumName)
      literal.add(column.name)
    }
    return {
      column,
      field: rustFieldName(column.name),
      set: type,
      type: nullableRustType(type, column.notNull),
    }
  })
  assertUniqueRustNames(
    columns.map(({ column, field }) => ({ source: column.name, generated: field })),
    `column in table ${table.schema}.${table.name}`,
  )
  const checkItems = checks
    ? rustCheckItems(
        checks.group,
        {
          values: rustValuesPath(context),
          catalog,
          containers: checks.plan.containers,
          enumType: (schema, enumName) => rustDeclaredType(schema, enumName, context),
          input: (input) => {
            const item = columns.find(({ column }) => column.name === input)
            if (!item) return null
            const base = literal.has(item.column.name)
              ? {
                  access: (value: RustExpression) => rust.method(value, 'value'),
                  baseOid: item.column.typeOid,
                  typeMod: item.column.typeMod ?? -1,
                }
              : rustBaseAccess(
                  item.column.typeOid,
                  item.column.typeMod ?? -1,
                  catalog,
                  checks.literalDomain,
                )
            const declared = checks.dimensions(`${table.schema}.${table.name}.${item.column.name}`)
            return {
              type: item.set,
              ...base,
              ...(declared === undefined
                ? {}
                : { counts: typeof declared === 'number' ? [declared] : declared }),
            }
          },
        },
        checks.plan.context,
        {
          kind: 'table',
          table,
          row: name,
          fields: new Map(
            columns.map(({ column, field }) => [column.name, { field, nullable: !column.notNull }]),
          ),
          domains: columns.flatMap(({ column, set }) => {
            const domain = catalog.domains.find((item) => item.oid === column.typeOid)
            return domain && checks.domainChecked(domain) && !literal.has(column.name)
              ? [{ column: column.name, type: set }]
              : []
          }),
        },
      )
    : []
  return [
    ...enums,
    {
      kind: 'struct',
      name,
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq')],
      doc: `A row of ${table.schema}.${table.name}.`,
      fields: {
        kind: 'struct',
        items: columns.map(({ field, type }) => ({ name: field, type, visibility: 'pub' })),
      },
    },
    {
      kind: 'impl',
      type: rust.path(name),
      items: [
        {
          kind: 'fn',
          name: 'from_row',
          visibility: 'pub',
          doc: 'Reads a row holding these columns, by name.',
          parameters: [
            { pattern: rust.binding('row'), type: rust.ref(rust.path('tokio_postgres', 'Row')) },
          ],
          result: rust.generic('Result', rust.path('Self'), rust.path('tokio_postgres', 'Error')),
          body: [
            rust.return(
              rust.call(rust.ident('Ok'), {
                kind: 'struct',
                path: ['Self'],
                fields: columns.map(({ column, field }) => ({
                  name: field,
                  value: rust.try(
                    rust.method(rust.ident('row'), 'try_get', rust.string(column.name)),
                  ),
                })),
              }),
            ),
          ],
        },
      ],
    },
    ...checkItems,
  ]
}

// The values module's path from the code.
const rustValuesPath = (context: RustTypeContext): string[] =>
  (rustValues(context, 'x') as { path: string[] }).path.slice(0, -1)

/**
 * How a value of a type reaches the built-in type beneath its domains: a domain's newtype holds
 * its base, and a domain that is an enum of literals gives its value. The innermost type modifier
 * a domain declares applies.
 */
function rustBaseAccess(
  oid: number,
  typeMod: number,
  catalog: CatalogSnapshot,
  literalDomain: (domain: DomainInfo) => boolean,
): { access: (value: RustExpression) => RustExpression; baseOid: number; typeMod: number } {
  let access = (value: RustExpression) => value
  let unwrapped = false
  const seen = new Set<number>()
  for (
    let domain = catalog.domains.find((item) => item.oid === oid);
    domain && !seen.has(domain.oid);
    domain = catalog.domains.find((item) => item.oid === oid)
  ) {
    seen.add(domain.oid)
    if ((domain.baseTypeMod ?? -1) >= 0) typeMod = domain.baseTypeMod!
    const outer = access
    if (!unwrapped) {
      if (literalDomain(domain)) {
        access = (value) => rust.method(outer(value), 'value')
        unwrapped = true
      } else access = (value) => rust.field(outer(value), '0')
    }
    oid = domain.baseTypeOid
  }
  return { access, baseOid: oid, typeMod }
}

/**
 * The generated module tree for a catalog: a module per schema holding its enums, composite
 * types, domains and table rows, and the values module they use, under `directory`.
 */
export function renderRustSchemaArtifacts(
  catalog: CatalogSnapshot,
  directory: string,
  config?: Config,
  relations: SchemaRelationAnalyses = {},
  domainLiterals: SchemaDomainLiterals = {},
  needs?: Parameters<typeof rustValueArtifacts>[2],
): Artifact[] {
  const mappings = config?.sql.codegen?.rust?.mappings.column ?? {}
  const checkPlan = planRustChecks(catalog, config, (domain) => literalDomain(domain))
  const checkGroup = (kind: 'table' | 'domain', schema: string, name: string) =>
    checkPlan.groups.find(
      ({ group }) =>
        group.kind === kind && group.source.schema === schema && group.source.name === name,
    )
  const modules = config?.sql.codegen?.rust?.schema?.names ?? {}
  // A domain whose CHECKs admit only some literals is an enum of them.
  const literalDomain = (domain: DomainInfo): boolean => {
    const literals = domainLiterals[`${domain.schema}.${domain.name}`]
    return Boolean(literals && literalBase(rustDomainBase(domain, catalog, { depth: 1 }), literals))
  }
  const dimensions = (column: string) => mappings[column]?.dimensions
  const schemas = [
    ...new Set(
      [
        ...catalog.enums,
        ...catalog.compositeTypes,
        ...catalog.domains,
        ...catalog.tables.filter((table) => table.relkind !== 'S'),
      ].map((item) => item.schema),
    ),
  ].sort()
  assertUniqueRustNames(
    schemas.map((schema) => ({ source: schema, generated: rustSchemaModule(schema, { modules }) })),
    'schema',
  )
  const artifacts = schemas.map((schema) => {
    const context: RustTypeContext = {
      depth: 1,
      schema,
      modules,
      searchPath: config?.sql.searchPath ?? ['public'],
    }
    const items: RustItem[] = [
      ...catalog.enums
        .filter((item) => item.schema === schema)
        .flatMap((item) => enumItems(schema, item.name, item.values)),
      ...catalog.compositeTypes
        .filter((item) => item.schema === schema)
        .flatMap((item) => compositeItems(schema, item.name, item.attributes, catalog, context)),
      ...catalog.domains
        .filter((item) => item.schema === schema)
        .flatMap((item) => {
          // A domain whose CHECKs admit only some literals is an enum of them.
          const literals = domainLiterals[`${item.schema}.${item.name}`]
          const base = literals && literalBase(rustDomainBase(item, catalog, context), literals)
          const group = checkGroup('domain', item.schema, item.name)
          const access = rustBaseAccess(item.oid, -1, catalog, literalDomain)
          return [
            ...(literals && base
              ? literalItems(
                  rustTypeName(item.name),
                  base,
                  literals,
                  `${item.schema}.${item.name}`,
                  item,
                )
              : domainItems(item, catalog, context)),
            ...(group
              ? rustCheckItems(
                  group,
                  {
                    values: rustValuesPath(context),
                    catalog,
                    containers: checkPlan.containers,
                    enumType: (schema, enumName) => rustDeclaredType(schema, enumName, context),
                    input: () => ({ type: rust.path(rustTypeName(item.name)), ...access }),
                  },
                  checkPlan.context,
                  { kind: 'domain', domain: item, type: rustTypeName(item.name) },
                )
              : []),
          ]
        }),
      ...catalog.tables
        .filter((item) => item.schema === schema && item.relkind !== 'S')
        .flatMap((item) =>
          tableItems(
            item,
            catalog,
            context,
            dimensions,
            relations[`${item.schema}.${item.name}`]?.outputCases,
            {
              plan: checkPlan,
              group: checkGroup('table', item.schema, item.name),
              literalDomain,
              domainChecked: (domain) =>
                checkGroup('domain', domain.schema, domain.name) !== undefined,
              dimensions,
            },
          ),
        ),
    ]
    return {
      path: join(directory, `${rustSchemaModule(schema, { modules })}.rs`),
      content: printRustFile(items),
    }
  })
  return [
    {
      path: join(directory, 'mod.rs'),
      // A crate uses some of the generated types, so the rest are not reported as unused.
      content: printRustFile(
        [
          { kind: 'mod', name: 'pgsid', visibility: 'pub' },
          ...schemas.map((schema): RustItem => ({
            kind: 'mod',
            name: rustSchemaModule(schema, { modules }),
            visibility: 'pub',
          })),
        ],
        undefined,
        [{ path: 'allow', arguments: ['dead_code', 'unused_imports'] }],
      ),
    },
    ...artifacts,
    ...rustValueArtifacts(
      join(directory, 'pgsid'),
      artifacts.map((artifact) => artifact.content),
      (() => {
        const checks = checkPlan.module()
        return { ...needs, ...(checks ? { checks } : {}) }
      })(),
    ),
  ]
}
