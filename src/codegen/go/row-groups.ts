import type { RowGroup, RowGroupMember, RowGroupTest } from '../shared/row-groups.js'
import { go, type GoDeclaration, type GoExpression, type GoField, type GoStatement } from './ast.js'
import { goName } from './names.js'

// A row's groups as Go types: each group is a sealed interface the row holds in one field, and
// each member a struct of the columns its rows carry. Grouped columns are scanned into locals and
// a builder per group picks the member the row is.

export interface GoRowGroupColumns {
  names: readonly string[]
  /** The type each column is scanned as: its row type, nullable where the output may be NULL. */
  scanned: readonly GoExpression[]
  /** The column's type when set. */
  set: readonly GoExpression[]
  notNull: readonly boolean[]
  structs: boolean
}

export interface GoRowGroupField {
  group: RowGroup
  field: GoField
  builder: string
}

export interface GoRowGroups {
  fields: GoRowGroupField[]
  declarations: GoDeclaration[]
  // Whether a builder reports a row that is no member, which formats an error.
  formatsErrors: boolean
}

export const goRowGroupLocal = (column: number): string => `column${column}`

export function renderGoRowGroups(
  groups: readonly RowGroup[],
  queryName: string,
  occupied: ReadonlySet<string>,
  columns: GoRowGroupColumns,
): GoRowGroups {
  const declarations: GoDeclaration[] = []
  let formatsErrors = false
  const taken = new Set(occupied)
  const unique = (name: string, suffix: string) => {
    let candidate = taken.has(name) ? `${name}${suffix}` : name
    for (let count = 2; taken.has(candidate); count++) candidate = `${name}${suffix}${count}`
    taken.add(candidate)
    return candidate
  }
  const local = (column: number) => go.ident(goRowGroupLocal(column))
  const nullable = (column: number) => !columns.notNull[column]
  const isNull = (column: number): GoExpression =>
    columns.structs
      ? go.not(go.selector(local(column), 'Valid'))
      : go.equal(local(column), go.ident('nil'))
  const value = (column: number): GoExpression => {
    if (!nullable(column)) return local(column)
    if (columns.structs) return go.selector(local(column), 'V')
    return columns.scanned[column]!.kind === 'pointer' ? go.dereference(local(column)) : local(column)
  }
  const literal = (test: Extract<RowGroupTest, { kind: 'value' }>): GoExpression =>
    test.literal === 'string'
      ? go.string(test.value)
      : test.literal === 'boolean'
        ? go.ident(test.value)
        : go.number(BigInt(test.value))
  const condition = (test: RowGroupTest): GoExpression | null => {
    switch (test.kind) {
      case 'absent':
      case 'null':
        return nullable(test.column) ? isNull(test.column) : go.ident('false')
      case 'present':
        return null
      case 'value': {
        const equal = go.equal(value(test.column), literal(test))
        return nullable(test.column) ? go.and(go.not(isNull(test.column)), equal) : equal
      }
      case 'other':
        return nullable(test.column) ? go.not(isNull(test.column)) : null
      case 'set': {
        const parts = [
          ...test.set.map((column) => (nullable(column) ? go.not(isNull(column)) : null)),
          ...test.unset.map((column) => (nullable(column) ? isNull(column) : go.ident('false'))),
        ].filter((part): part is GoExpression => part !== null)
        return parts.length ? parts.reduce((left, right) => go.and(left, right)) : null
      }
    }
  }
  const memberName = (member: RowGroupMember): string => {
    const test = member.test
    if (test.kind === 'value' && (test.literal === 'number' || test.literal === 'bigint'))
      return goName(`${columns.names[test.column]} ${test.value.replace(/^-/u, 'minus ')}`)
    if (test.kind === 'value' && test.literal === 'boolean')
      return goName(`${columns.names[test.column]} ${test.value}`)
    return goName(member.name)
  }
  const render = (group: RowGroup, typeName: string): string => {
    const marker = `is${typeName}`
    declarations.push(
      go.type(typeName, go.interface([{ names: [marker], type: go.functionType([], []) }])),
    )
    const members = new Set<string>()
    const body: GoStatement[] = []
    for (const member of group.members) {
      let name = `${typeName}${memberName(member)}`
      for (let count = 2; members.has(name) || taken.has(name); count++)
        name = `${typeName}${memberName(member)}${count}`
      members.add(name)
      taken.add(name)
      const fields: GoField[] = member.fields.map((field) => ({
        names: [goName(columns.names[field.column]!)],
        type: field.nullable ? columns.scanned[field.column]! : columns.set[field.column]!,
      }))
      const nested = member.groups.map((inner) => {
        const field = goName(inner.name)
        const innerType = render(inner, `${name}${field}`)
        fields.push({ names: [field], type: go.ident(innerType) })
        return { field, builder: `build${innerType}`, columns: inner.columns }
      })
      declarations.push(
        go.type(name, go.struct(fields)),
        go.function(marker, [], [], [], [{ type: go.ident(name) }]),
      )
      const statements: GoStatement[] = nested.flatMap((inner) => [
        go.assign(
          [go.ident(`inner${inner.field}`), go.ident('err')],
          [go.call(go.ident(inner.builder), inner.columns.map(local))],
        ),
        go.if(go.notEqual(go.ident('err'), go.ident('nil')), [
          go.return(go.ident('nil'), go.ident('err')),
        ]),
      ])
      statements.push(
        go.return(
          go.composite(go.ident(name), [
            ...member.fields.map((field) =>
              go.keyValue(
                goName(columns.names[field.column]!),
                field.nullable ? local(field.column) : value(field.column),
              ),
            ),
            ...nested.map((inner) =>
              go.keyValue(inner.field, go.ident(`inner${inner.field}`)),
            ),
          ]),
          go.ident('nil'),
        ),
      )
      const test = condition(member.test)
      if (test === null) {
        body.push(...statements)
        break
      }
      body.push(go.if(test, statements))
    }
    if (body.at(-1)?.kind !== 'return') {
      formatsErrors = true
      body.push(
        go.return(
          go.ident('nil'),
          go.call(go.selector(go.ident('fmt'), 'Errorf'), [
            go.string(`%s: the row is no member of %s`),
            go.string(queryName),
            go.string(typeName),
          ]),
        ),
      )
    }
    declarations.push(
      go.function(
        `build${typeName}`,
        group.columns.map((column) => ({
          names: [goRowGroupLocal(column)],
          type: columns.scanned[column]!,
        })),
        [{ type: go.ident(typeName) }, { type: go.ident('error') }],
        body,
      ),
    )
    return typeName
  }
  const fields = groups.map((group) => {
    const field = unique(goName(group.name), 'Group')
    const typeName = render(group, unique(`${queryName}${field}`, 'Group'))
    return {
      group,
      field: { names: [field], type: go.ident(typeName) },
      builder: `build${typeName}`,
    }
  })
  return { fields, declarations, formatsErrors }
}
