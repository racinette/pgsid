import type { CatalogSnapshot, ColumnInfo } from '../../catalog/types.js'
import type { Config } from '../../config/schema.js'
import type { QueryAnalysisItem } from '../../query-analysis.js'
import { interpretValueLineage, type ValueLineage } from '../../query/value-lineage.js'
import { planArrayDimensionInputs, resolveArrayDimensions } from '../shared/array-dimensions.js'
import { outputRelations, rowGroups } from '../shared/row-groups.js'
import { printRustFile, printRustType, rust, type RustExpression, type RustField, type RustItem, type RustPattern, type RustType } from './ast.js'
import { assertUniqueRustNames, GeneratedRustNameCollisionError, rustEnumVariants, rustFieldName, rustTypeName, uniqueNames } from './names.js'
import { renderRustRowGroups, rustRowGroupLocal, rustRowGroupTestable } from './row-groups.js'
import { literalBase, literalItems, literalVariant } from './schema.js'
import {
  nullableRustType,
  resolveRustColumnType,
  rustDeclaredType,
  rustValues,
  type RustTypeContext,
} from './type-mapping.js'

export interface RustQueryDiagnostic {
  code: 'duplicate-output-name' | 'generated-name-collision' | 'invalid-type-mapping' | 'output-type-shape' | 'parameter-type-shape'
  severity: 'error'
  queryId: string
  message: string
}

/**
 * The module of one query file: for each query its SQL, a struct of its parameters, a struct of
 * its row with an enum for each row group, and an async function running it through any
 * tokio-postgres client. `root` is the generated schema tree's path in the crate.
 */
export function renderRustQueryModule(
  analyses: readonly QueryAnalysisItem[],
  catalog: CatalogSnapshot,
  config: Config,
  root: readonly string[],
): { content: string | null; diagnostics: RustQueryDiagnostic[] } {
  const diagnostics: RustQueryDiagnostic[] = []
  const ordered = [...analyses].sort(
    (left, right) => left.query.definition.sourceStart - right.query.definition.sourceStart,
  )
  try {
    assertUniqueRustNames(
      ordered.map((item) => ({ source: item.query.name, generated: rustFieldName(item.query.name) })),
      'query',
    )
  } catch (error) {
    return {
      content: null,
      diagnostics: [
        {
          code: 'generated-name-collision',
          severity: 'error',
          queryId: ordered[0]?.query.id ?? '<queries>',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
  const context: RustTypeContext = {
    depth: 0,
    root,
    modules: config.sql.codegen?.rust?.schema?.names ?? {},
    searchPath: config.sql.searchPath,
  }
  const taken = new Set<string>()
  const items: RustItem[] = []
  for (const analysis of ordered) {
    try {
      items.push(...queryItems(analysis, catalog, config, context, taken, diagnostics))
    } catch (error) {
      diagnostics.push({
        code: error instanceof GeneratedRustNameCollisionError ? 'generated-name-collision' : 'invalid-type-mapping',
        severity: 'error',
        queryId: analysis.query.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  if (diagnostics.length) return { content: null, diagnostics }
  try {
    return { content: printRustFile(items), diagnostics }
  } catch (error) {
    return {
      content: null,
      diagnostics: [
        {
          code: 'invalid-type-mapping',
          severity: 'error',
          queryId: ordered[0]?.query.id ?? '<queries>',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
}

const values = (context: RustTypeContext, name: string): string[] =>
  (rustValues(context, name) as { path: string[] }).path

function queryItems(
  analysis: QueryAnalysisItem,
  catalog: CatalogSnapshot,
  config: Config,
  context: RustTypeContext,
  taken: Set<string>,
  diagnostics: RustQueryDiagnostic[],
): RustItem[] {
  const mappings = config.sql.codegen?.rust?.mappings.column ?? {}
  const name = rustTypeName(analysis.query.name)
  const items: RustItem[] = []
  const claim = (type: string) => {
    if (taken.has(type)) throw new GeneratedRustNameCollisionError(`Query ${analysis.query.name} generates ${type} twice`)
    taken.add(type)
    return type
  }
  const sqlName = `${rustFieldName(analysis.query.name).toUpperCase()}_SQL`
  items.push({
    kind: 'const',
    name: claim(sqlName),
    visibility: 'pub',
    type: rust.ref(rust.path('str'), 'static'),
    value: rust.string(analysis.query.definition.sql),
    doc: `The SQL of ${analysis.query.name}.`,
  })

  const parameterTypes = positional(analysis, analysis.description?.parameterTypes, analysis.contract.params.length, 'parameter-type-shape', diagnostics)
  const named = new Map(analysis.query.definition.parameters.map((parameter) => [parameter.index, parameter.name]))
  const arrayInputs = planArrayDimensionInputs(analysis.writeLineage ?? [], mappings, catalog)
  const parameters = analysis.contract.params.map((parameter, index) => {
    const type = parameterTypes[index] ?? 'unknown'
    const destinations = arrayInputs.get(index + 1) ?? []
    let dimensions: number | number[] | undefined
    if (destinations.length) {
      const counts = destinations.map((destination) => {
        const declared = resolveArrayDimensions(destination, mappings)!.dimensions
        return typeof declared === 'number' ? [declared] : declared
      })
      const common = [...counts[0]!].filter((count) => counts.every((allowed) => allowed.includes(count))).sort((a, b) => a - b)
      if (!common.length) throw new Error(`Conflicting array dimension mappings for parameter $${index + 1}`)
      dimensions = common.length > 1 ? common : common[0]!
    }
    return {
      field: rustFieldName(named.get(index + 1) ?? `param_${index + 1}`),
      source: named.get(index + 1) ?? `param_${index + 1}`,
      type: nullableRustType(resolveRustColumnType({ typeName: type, typeOid: 0 }, dimensions, catalog, context), parameter.notNull),
    }
  })
  assertUniqueRustNames(parameters.map((item) => ({ source: item.source, generated: item.field })), `parameter in query ${analysis.query.name}`)
  const paramsName = `${name}Params`
  if (parameters.length)
    items.push({
      kind: 'struct',
      name: claim(paramsName),
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq')],
      doc: `The parameters of ${analysis.query.name}.`,
      fields: { kind: 'struct', items: parameters.map((item) => ({ name: item.field, type: item.type, visibility: 'pub' })) },
    })

  const queryError = rust.path(...values(context, 'QueryError'))
  const command = analysis.query.definition.command
  const call = (method: string): RustExpression =>
    rust.try(
      rust.await(
        rust.method(
          rust.ident('client'),
          method,
          rust.ident(sqlName),
          rust.ref_({
            kind: 'array',
            items: parameters.map((item) => rust.ref_(rust.field(rust.ident('params'), item.field))),
          }),
        ),
      ),
    )
  const functionItem = (result: RustType, body: RustExpression[], doc: string): RustItem => ({
    kind: 'fn',
    name: rustFieldName(analysis.query.name),
    visibility: 'pub',
    async: true,
    doc,
    parameters: [
      { pattern: rust.binding('client'), type: rust.ref({ kind: 'impl', bounds: [rust.path('tokio_postgres', 'GenericClient')] }) },
      ...(parameters.length ? [{ pattern: rust.binding('params'), type: rust.ref(rust.path(paramsName)) }] : []),
    ],
    result: rust.generic('Result', result, queryError),
    body: body.map((expression, index) => (index === body.length - 1 ? rust.return(expression) : rust.expression(expression))),
  })
  if (command === 'exec') {
    items.push(functionItem({ kind: 'tuple', items: [] }, [call('execute'), rust.call(rust.ident('Ok'), { kind: 'tuple', items: [] })], `Runs ${analysis.query.name}.`))
    return items
  }
  if (command === 'execrows') {
    items.push(functionItem(rust.path('u64'), [rust.call(rust.ident('Ok'), call('execute'))], `Runs ${analysis.query.name} and returns the number of rows it affected.`))
    return items
  }

  const outputNames = analysis.description?.columns ?? analysis.contract.outputs.map((output) => output.name)
  const duplicate = outputNames.find((item, index) => outputNames.indexOf(item) !== index)
  if (duplicate !== undefined) {
    diagnostics.push({
      code: 'duplicate-output-name',
      severity: 'error',
      queryId: analysis.query.id,
      message: `Duplicate output name ${JSON.stringify(duplicate)}; add an SQL alias`,
    })
    return items
  }
  const outputTypes = positional(analysis, analysis.description?.columnTypes, outputNames.length, 'output-type-shape', diagnostics)
  const lineage = analysis.rawLineage?.map((output) => interpretValueLineage(output.value))
  const outputs = analysis.contract.outputs
  const notNull = outputNames.map((_, index) => outputs[index]?.notNull ?? false)
  // A column whose CHECKs admit only some literals holds one of them, as an enum of its own.
  const literalEnums = new Map<number, { name: string; variants: Map<string, string> }>()
  const setTypes = outputNames.map((column, index): RustType => {
    const dimensions = resolveArrayDimensions(lineage?.[index], mappings)?.dimensions
    // A column read as it is has the column's own type, such as its domain, which the server
    // describes as the base type.
    const type = resolveRustColumnType(
      storedColumn(lineage?.[index], catalog) ?? { typeName: outputTypes[index] ?? 'unknown', typeOid: 0 },
      dimensions,
      catalog,
      context,
    )
    const literals = analysis.contract.outputCases?.literals[index]
    const base = literals && literalBase(type, literals)
    if (!literals || !base) return type
    const enumName = claim(`${name}${rustTypeName(column)}`)
    const variants = uniqueNames(literals.values.map((value) => literalVariant(value, literals.kind)))
    literalEnums.set(index, { name: enumName, variants: new Map(literals.values.map((value, item) => [value, variants[item]!])) })
    items.push(...literalItems(enumName, base, literals, `column ${column} of ${analysis.query.name}`))
    return rust.path(enumName)
  })
  const fieldNames = outputNames.map((column) => rustFieldName(column))
  assertUniqueRustNames(outputNames.map((column, index) => ({ source: column, generated: fieldNames[index]! })), `output in query ${analysis.query.name}`)

  const enumOf = (type: RustType) =>
    catalog.enums.find((item) => printRustType(rustDeclaredType(item.schema, item.name, context)) === printRustType(type))
  // How a discriminant's value is matched: an enum by its variant, an integer or boolean by its
  // literal, text and floats by comparison. Other types are not tested, and their groups stay flat.
  const valueTest = (column: number, value: string, binding: string): { pattern: RustPattern; guard?: RustExpression } | null => {
    const literalEnum = literalEnums.get(column)
    if (literalEnum) {
      const variant = literalEnum.variants.get(value)
      return variant ? { pattern: { kind: 'path', path: [literalEnum.name, variant] } } : null
    }
    const type = setTypes[column]!
    if (type.kind !== 'path' || type.generics) return null
    const enumeration = enumOf(type)
    if (enumeration) {
      const index = enumeration.values.indexOf(value)
      return index < 0 ? null : { pattern: { kind: 'path', path: [...type.path, rustEnumVariants(enumeration.values)[index]!] } }
    }
    if (type.path.length !== 1) return null
    const guard = (right: RustExpression) => ({
      pattern: rust.binding(binding),
      guard: { kind: 'binary', operator: '==', left: rust.ident(binding), right } as RustExpression,
    })
    switch (type.path[0]) {
      case 'i16':
      case 'i32':
      case 'i64':
        return /^-?\d+$/u.test(value) ? { pattern: { kind: 'literal', value: rust.number(value) } } : null
      case 'bool':
        return value === 'true' || value === 'false' ? { pattern: { kind: 'literal', value: rust.bool(value === 'true') } } : null
      case 'String':
        return guard(rust.string(value))
      case 'f32':
      case 'f64':
        return /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/u.test(value) ? guard(rust.number(/[.eE]/u.test(value) ? value : `${value}.0`)) : null
      default:
        return null
    }
  }
  const domain = (column: number): readonly string[] | null => {
    const literalEnum = literalEnums.get(column)
    if (literalEnum) return [...literalEnum.variants.keys()]
    const type = setTypes[column]!
    if (type.kind !== 'path' || type.generics) return null
    if (type.path.length === 1 && type.path[0] === 'bool') return ['true', 'false']
    return enumOf(type)?.values ?? null
  }
  const groupColumns = {
    names: outputNames,
    values: values(context, 'QueryError').slice(0, -1),
    set: setTypes,
    notNull,
    value: valueTest,
    domain,
  }
  const model = rowGroups({
    names: outputNames,
    notNull,
    presence: analysis.contract.outputPresenceGroups,
    cases: analysis.contract.outputCases,
    relations: outputRelations(
      analysis.query.definition.stmt,
      outputNames.map((_, index) => outputs[index]?.origins?.[0]?.table ?? null),
    ),
  }).filter((group) => rustRowGroupTestable(group, groupColumns))
  // A group's columns leave the flat row, so only the columns left reserve their names.
  const grouped = new Set(model.flatMap((group) => group.columns))
  const rowName = claim(`${name}Row`)
  const groups = renderRustRowGroups(
    model,
    name,
    taken,
    new Set(fieldNames.filter((_, index) => !grouped.has(index))),
    groupColumns,
  )
  const columnType = (index: number) => nullableRustType(setTypes[index]!, notNull[index]!)
  // A group's field takes the place of its first column.
  const rowFields: (RustField & { value: RustExpression })[] = outputNames.flatMap((_, index) => [
    ...groups.fields
      .filter((field) => field.group.columns[0] === index)
      .map((field) => ({ name: field.name, type: field.type, visibility: 'pub' as const, value: field.value })),
    ...(grouped.has(index)
      ? []
      : [
          {
            name: fieldNames[index]!,
            type: columnType(index),
            visibility: 'pub' as const,
            value: rust.try(rust.method(rust.ident('row'), 'try_get', rust.number(index))),
          },
        ]),
  ])
  items.push(
    {
      kind: 'struct',
      name: rowName,
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq')],
      doc: `A row of ${analysis.query.name}.`,
      fields: { kind: 'struct', items: rowFields.map(({ value: _, ...field }) => field) },
    },
    ...groups.items,
    {
      kind: 'impl',
      type: rust.path(rowName),
      items: [
        {
          kind: 'fn',
          name: 'from_row',
          visibility: 'pub',
          doc: 'Reads a row of the query, by position.',
          parameters: [{ pattern: rust.binding('row'), type: rust.ref(rust.path('tokio_postgres', 'Row')) }],
          result: rust.generic('Result', rust.path('Self'), queryError),
          body: [
            ...[...grouped]
              .sort((left, right) => left - right)
              .map((index) => ({
                kind: 'let' as const,
                pattern: rust.binding(rustRowGroupLocal(index)),
                type: columnType(index),
                value: rust.try(rust.method(rust.ident('row'), 'try_get', rust.number(index))),
              })),
            rust.return(
              rust.call(rust.ident('Ok'), {
                kind: 'struct',
                path: ['Self'],
                fields: rowFields.map((field) => ({ name: field.name!, value: field.value })),
              }),
            ),
          ],
        },
      ],
    },
  )
  const row = rust.path(rowName)
  const fromRow = rust.expressionPath(rowName, 'from_row')
  if (command === 'one') {
    items.push(
      functionItem(
        rust.option(row),
        [
          rust.method(
            rust.method(rust.method(call('query'), 'first'), 'map', fromRow),
            'transpose',
          ),
        ],
        `Runs ${analysis.query.name} and reads its first row, if it returns one.`,
      ),
    )
  } else {
    items.push(
      functionItem(
        rust.vec(row),
        [rust.method(rust.method(rust.method(call('query'), 'iter'), 'map', fromRow), 'collect')],
        `Runs ${analysis.query.name} and reads its rows.`,
      ),
    )
  }
  return items
}

const storedColumn = (value: ValueLineage | undefined, catalog: CatalogSnapshot): ColumnInfo | undefined => {
  if (value?.kind === 'row-absence') return storedColumn(value.origin, catalog)
  if (value?.kind !== 'column') return undefined
  const column = value.column
  return [...catalog.tables, ...catalog.views, ...catalog.materializedViews]
    .find((relation) => relation.schema === column.schema && relation.name === column.relation)
    ?.columns.find((item) => item.name === column.column)
}

const positional = (
  analysis: QueryAnalysisItem,
  types: readonly string[] | undefined,
  length: number,
  code: 'output-type-shape' | 'parameter-type-shape',
  diagnostics: RustQueryDiagnostic[],
): readonly string[] => {
  if (!types) return Array.from({ length }, () => 'unknown')
  if (types.length === length) return types
  diagnostics.push({
    code,
    severity: 'error',
    queryId: analysis.query.id,
    message: `Expected ${length} described types but received ${types.length}`,
  })
  return Array.from({ length }, () => 'unknown')
}

// Every set of dimension counts a query may name: the sets the mappings declare and the counts
// shared between them, which a parameter written to several columns takes.
export const rustDimensionUnions = (config: Config): string[] => {
  const declared = Object.values(config.sql.codegen?.rust?.mappings.column ?? {}).flatMap((mapping) =>
    typeof mapping.dimensions === 'number' ? [] : [[...new Set(mapping.dimensions)].sort((a, b) => a - b)],
  )
  const sets = new Map(declared.map((set) => [set.join(','), set]))
  for (let changed = true; changed; ) {
    changed = false
    for (const left of [...sets.values()])
      for (const right of [...sets.values()]) {
        const common = left.filter((count) => right.includes(count))
        if (common.length > 1 && !sets.has(common.join(','))) {
          sets.set(common.join(','), common)
          changed = true
        }
      }
  }
  return [...sets.values()].filter((set) => set.length > 1).map((set) => `Array${set.join('Or')}`)
}
