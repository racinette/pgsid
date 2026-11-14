import { join } from 'node:path'
import type { CatalogSnapshot, DomainInfo, TableInfo } from '../../catalog/types.js'
import { printRustFile, rust, type RustExpression, type RustItem, type RustType } from './ast.js'
import { assertUniqueRustNames, rustFieldName, rustTypeName } from './names.js'
import {
  nullableRustType,
  resolveRustType,
  rustDomainBase,
  rustValues,
  type RustTypeContext,
} from './type-mapping.js'
import { rustValueArtifacts } from './values.js'

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

// A name unique among others generated in one scope, numbered after the first.
const uniqueNames = (names: readonly string[]): string[] => {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    return count ? `${name}${count + 1}` : name
  })
}

function enumItems(schema: string, name: string, labels: readonly string[]): RustItem[] {
  const variants = uniqueNames(labels.map(rustTypeName))
  return [
    {
      kind: 'enum',
      name: rustTypeName(name),
      visibility: 'pub',
      attributes: [
        rust.derive('Debug', 'Clone', 'Copy', 'PartialEq', 'Eq', 'Hash', 'postgres_types::ToSql', 'postgres_types::FromSql'),
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
    attributes.map((attribute) => ({ source: attribute.name, generated: rustFieldName(attribute.name) })),
    `attribute in composite ${schema}.${name}`,
  )
  return [
    {
      kind: 'struct',
      name: rustTypeName(name),
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq', 'postgres_types::ToSql', 'postgres_types::FromSql'), { path: postgres(name) }],
      doc: `The composite type ${schema}.${name}.`,
      fields: {
        kind: 'struct',
        items: attributes.map((attribute) => ({
          name: rustFieldName(attribute.name),
          visibility: 'pub',
          attributes: [{ path: postgres(attribute.name) }],
          type: rust.option(resolveRustType(attribute.typeName, catalog, context, attribute.typeOid)),
        })),
      },
    },
  ]
}

// A domain is a newtype over its base type, read and written as either the domain or its base
// type: the server describes a parameter as the domain and a result column as its base type.
function domainItems(domain: DomainInfo, catalog: CatalogSnapshot, context: RustTypeContext): RustItem[] {
  const name = rustTypeName(domain.name)
  const base = rustDomainBase(domain, catalog, context)
  const self = rust.path(name)
  const baseOf: RustExpression = rust.call(
    { kind: 'path', path: (rustValues(context, 'domain_base') as { path: string[] }).path },
    rust.ident('ty'),
  )
  const fromSql: RustType = { kind: 'path', path: ['postgres_types', 'FromSql'], generics: [{ kind: 'lifetime', name: 'a' }] }
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
        left: { kind: 'binary', operator: '==', left: rust.method(rust.ident('ty'), 'name'), right: rust.string(domain.name) },
        right: { kind: 'binary', operator: '==', left: rust.method(rust.ident('ty'), 'schema'), right: rust.string(domain.schema) },
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
            { pattern: rust.binding('raw'), type: rust.ref({ kind: 'slice', type: rust.path('u8') }, 'a') },
          ],
          result: rust.generic('Result', self, boxError),
          body: [
            rust.return(
              rust.call(
                rust.ident('Ok'),
                rust.call(
                  rust.ident(name),
                  rust.try(rust.call({ kind: 'qualified', type: base, trait: fromSql, name: 'from_sql' }, baseOf, rust.ident('raw'))),
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
              rust.call({ kind: 'qualified', type: base, trait: toSql, name: 'to_sql' }, rust.ref_(rust.field(rust.ident('self'), '0')), baseOf, rust.ident('out')),
            ),
          ],
        },
        acceptsFunction(toSql),
        { kind: 'macro', path: ['postgres_types', 'to_sql_checked'] },
      ],
    },
  ]
}

function tableItems(table: TableInfo, catalog: CatalogSnapshot, context: RustTypeContext): RustItem[] {
  const name = rustTypeName(table.name)
  const columns = table.columns.map((column) => ({
    column,
    field: rustFieldName(column.name),
    type: nullableRustType(resolveRustType(column.typeName, catalog, context, column.typeOid), column.notNull),
  }))
  assertUniqueRustNames(
    columns.map(({ column, field }) => ({ source: column.name, generated: field })),
    `column in table ${table.schema}.${table.name}`,
  )
  return [
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
          parameters: [{ pattern: rust.binding('row'), type: rust.ref(rust.path('tokio_postgres', 'Row')) }],
          result: rust.generic('Result', rust.path('Self'), rust.path('tokio_postgres', 'Error')),
          body: [
            rust.return(
              rust.call(rust.ident('Ok'), {
                kind: 'struct',
                path: ['Self'],
                fields: columns.map(({ column, field }) => ({
                  name: field,
                  value: rust.try(rust.method(rust.ident('row'), 'try_get', rust.string(column.name))),
                })),
              }),
            ),
          ],
        },
      ],
    },
  ]
}

/**
 * The generated module tree for a catalog: a module per schema holding its enums, composite
 * types, domains and table rows, and the values module they use, under `directory`.
 */
export function renderRustSchemaArtifacts(catalog: CatalogSnapshot, directory: string): Artifact[] {
  const schemas = [
    ...new Set(
      [...catalog.enums, ...catalog.compositeTypes, ...catalog.domains, ...catalog.tables.filter((table) => table.relkind !== 'S')].map(
        (item) => item.schema,
      ),
    ),
  ].sort()
  assertUniqueRustNames(
    schemas.map((schema) => ({ source: schema, generated: rustFieldName(schema) })),
    'schema',
  )
  const artifacts = schemas.map((schema) => {
    const context: RustTypeContext = { depth: 1, schema }
    const items: RustItem[] = [
      ...catalog.enums.filter((item) => item.schema === schema).flatMap((item) => enumItems(schema, item.name, item.values)),
      ...catalog.compositeTypes
        .filter((item) => item.schema === schema)
        .flatMap((item) => compositeItems(schema, item.name, item.attributes, catalog, context)),
      ...catalog.domains.filter((item) => item.schema === schema).flatMap((item) => domainItems(item, catalog, context)),
      ...catalog.tables
        .filter((item) => item.schema === schema && item.relkind !== 'S')
        .flatMap((item) => tableItems(item, catalog, context)),
    ]
    return { path: join(directory, `${rustFieldName(schema)}.rs`), content: printRustFile(items) }
  })
  return [
    {
      path: join(directory, 'mod.rs'),
      // A crate uses some of the generated types, so the rest are not reported as unused.
      content: printRustFile(
        [
          { kind: 'mod', name: 'pgsid', visibility: 'pub' },
          ...schemas.map((schema): RustItem => ({ kind: 'mod', name: rustFieldName(schema), visibility: 'pub' })),
        ],
        undefined,
        [{ path: 'allow', arguments: ['dead_code', 'unused_imports'] }],
      ),
    },
    ...artifacts,
    ...rustValueArtifacts(
      join(directory, 'pgsid'),
      artifacts.map((artifact) => artifact.content),
    ),
  ]
}
