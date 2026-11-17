import type { RowGroup, RowGroupMember, RowGroupTest } from '../shared/row-groups.js'
import { rust, type RustExpression, type RustItem, type RustPattern, type RustType } from './ast.js'
import { rustFieldName, rustTypeName } from './names.js'

// A row's groups as Rust enums with data: the row holds each group in one field, and each member
// is a variant carrying the columns its rows can hold. Grouped columns are read into locals, and
// a match over a group's locals picks the variant the row is, in member order.

export interface RustRowGroupColumns {
  names: readonly string[]
  /** The values module's path, which holds the query error. */
  values: readonly string[]
  /** The column's type when set. */
  set: readonly RustType[]
  notNull: readonly boolean[]
  /**
   * The pattern matching one value of a column's set type, and the guard it needs, where the
   * type can be tested against a literal; null where it cannot.
   */
  value: (
    column: number,
    value: string,
    binding: string,
  ) => { pattern: RustPattern; guard?: RustExpression } | null
  /**
   * Every value a column's set type holds, where a pattern can name each: booleans and enums.
   * Null for a type whose values only a guard tells apart.
   */
  domain: (column: number) => readonly string[] | null
}

export interface RustRowGroupField {
  group: RowGroup
  name: string
  type: RustType
  value: RustExpression
}

export const rustRowGroupLocal = (column: number): string => `column${column}`

type Test = { pattern: RustPattern; guard?: RustExpression; value: string }

/** Whether every member's test is one the columns' types can express. */
export function rustRowGroupTestable(group: RowGroup, columns: RustRowGroupColumns): boolean {
  return group.members.every(
    (member) =>
      (member.test.kind !== 'value' ||
        columns.value(member.test.column, member.test.value, 'probe') !== null) &&
      member.groups.every((inner) => rustRowGroupTestable(inner, columns)),
  )
}

export function renderRustRowGroups(
  groups: readonly RowGroup[],
  queryName: string,
  taken: Set<string>,
  occupiedFields: ReadonlySet<string>,
  columns: RustRowGroupColumns,
): { fields: RustRowGroupField[]; items: RustItem[] } {
  const items: RustItem[] = []
  const fieldNames = new Set(occupiedFields)
  const unique = (names: Set<string>, name: string, suffix: string) => {
    let candidate = names.has(name) ? `${name}${suffix}` : name
    for (let count = 2; names.has(candidate); count++) candidate = `${name}${suffix}${count}`
    names.add(candidate)
    return candidate
  }
  const local = (column: number) => rustRowGroupLocal(column)
  const nullable = (column: number) => !columns.notNull[column]
  const memberName = (member: RowGroupMember): string => {
    const test = member.test
    if (test.kind === 'value' && (test.literal === 'number' || test.literal === 'bigint'))
      return rustTypeName(`${columns.names[test.column]} ${test.value.replace(/^-/u, 'minus ')}`)
    if (test.kind === 'value' && test.literal === 'boolean')
      return rustTypeName(`${columns.names[test.column]} ${test.value}`)
    return rustTypeName(member.name)
  }
  // What a member's test asks of each column, or null where no row of the columns can pass it.
  const constraints = (test: RowGroupTest): Map<number, 'null' | 'set' | Test> | null => {
    const result = new Map<number, 'null' | 'set' | Test>()
    const absent = (column: number) => {
      if (!nullable(column)) return false
      result.set(column, 'null')
      return true
    }
    switch (test.kind) {
      case 'absent':
      case 'null':
        return absent(test.column) ? result : null
      case 'present':
        return result
      case 'value':
        result.set(test.column, {
          ...columns.value(test.column, test.value, local(test.column))!,
          value: test.value,
        })
        return result
      case 'other':
        result.set(test.column, 'set')
        return result
      case 'set':
        for (const column of test.set) result.set(column, 'set')
        return test.unset.every(absent) ? result : null
    }
  }
  // Declares a group's enum, and its members' nested ones, and returns the match reading the
  // group's columns from the values given.
  const render = (
    group: RowGroup,
    typeName: string,
  ): ((input: (column: number) => RustExpression) => RustExpression) => {
    const variants = new Set<string>()
    const arms: { pattern: RustPattern; guard?: RustExpression; body: RustExpression }[] = []
    const enumVariants: RustItem & { kind: 'enum' } = {
      kind: 'enum',
      name: typeName,
      visibility: 'pub',
      attributes: [rust.derive('Debug', 'Clone', 'PartialEq')],
      doc: `The forms the ${group.name} columns of a ${queryName} row take.`,
      variants: [],
    }
    items.push(enumVariants)
    // The rows the arms so far take, by each column's nullness and, where patterns name them, its
    // values; once they take every row, later arms and the fallback could never be reached.
    const cells = group.columns.map((column) => [
      ...(nullable(column) ? [null] : []),
      ...(columns.domain(column) ?? ['*']),
    ])
    const size = cells.reduce((product, cell) => product * cell.length, 1)
    let rows: (string | null)[][] | null = null
    if (size <= 4096) {
      rows = [[]]
      for (const cell of cells) rows = rows.flatMap((row) => cell.map((value) => [...row, value]))
    }
    let exhausted = false
    for (const member of group.members) {
      const variant = unique(variants, memberName(member), '')
      const memberFields = new Set(
        member.fields.map((item) => rustFieldName(columns.names[item.column]!)),
      )
      const nested = member.groups.map((inner) => {
        const field = unique(memberFields, rustFieldName(inner.name), '_group')
        const innerType = unique(taken, `${typeName}${variant}${rustTypeName(inner.name)}`, 'Group')
        return { field, match: render(inner, innerType), type: innerType }
      })
      enumVariants.variants.push({
        name: variant,
        ...(member.fields.length || nested.length
          ? {
              fields: {
                kind: 'struct' as const,
                items: [
                  ...member.fields.map((field) => ({
                    name: rustFieldName(columns.names[field.column]!),
                    type: field.nullable
                      ? rust.option(columns.set[field.column]!)
                      : columns.set[field.column]!,
                  })),
                  ...nested.map((inner) => ({ name: inner.field, type: rust.path(inner.type) })),
                ],
              },
            }
          : {}),
      })
      if (exhausted) continue
      const tests = constraints(member.test)
      if (!tests) continue
      // A field that cannot be NULL is read from its column only where the column is set.
      for (const field of member.fields)
        if (!field.nullable && nullable(field.column) && !tests.has(field.column))
          tests.set(field.column, 'set')
      const bound = new Set([
        ...member.fields.map((field) => field.column),
        ...member.groups.flatMap((inner) => inner.columns),
      ])
      const guards: RustExpression[] = []
      const patterns = group.columns.map((column): RustPattern => {
        const test = tests.get(column)
        const binding: RustPattern = bound.has(column)
          ? rust.binding(local(column))
          : { kind: 'wild' }
        const wrap = (inner: RustPattern): RustPattern =>
          nullable(column) ? { kind: 'tuple-struct', path: ['Some'], items: [inner] } : inner
        if (test === undefined) return binding
        if (test === 'null') return { kind: 'path', path: ['None'] }
        if (test === 'set') return wrap(binding)
        if (test.guard) guards.push(test.guard)
        return wrap(test.pattern)
      })
      // A nested group reads the locals of its columns whole.
      const whole = (column: number): RustExpression => {
        const test = tests.get(column)
        return nullable(column) && (test === 'set' || typeof test === 'object')
          ? rust.call(rust.ident('Some'), rust.ident(local(column)))
          : rust.ident(local(column))
      }
      const body: RustExpression = {
        kind: 'struct',
        path: [typeName, variant],
        fields: [
          ...member.fields.map((field) => ({
            name: rustFieldName(columns.names[field.column]!),
            value: rust.ident(local(field.column)),
          })),
          ...nested.map((inner) => ({ name: inner.field, value: inner.match(whole) })),
        ],
      }
      const pattern: RustPattern = { kind: 'tuple', items: patterns }
      const guard = guards.length
        ? guards.reduce((left, right): RustExpression => ({
            kind: 'binary',
            operator: '&&',
            left,
            right,
          }))
        : undefined
      arms.push({
        pattern,
        ...(guard ? { guard } : {}),
        body: member.fields.length || nested.length ? body : rust.expressionPath(typeName, variant),
      })
      if (rows && !guards.length)
        rows = rows.filter(
          (row) =>
            !group.columns.every((column, index) => {
              const test = tests.get(column)
              const value = row[index]
              if (test === undefined) return true
              if (test === 'null') return value === null
              if (test === 'set') return value !== null
              return value === test.value
            }),
        )
      exhausted = rows
        ? rows.length === 0
        : !guards.length &&
          patterns.every((pattern) => pattern.kind === 'wild' || pattern.kind === 'ident')
    }
    const fallback = {
      pattern: { kind: 'wild' } as RustPattern,
      body: {
        kind: 'return',
        value: rust.call(rust.ident('Err'), {
          kind: 'struct',
          path: [...columns.values, 'QueryError', 'NoMember'],
          fields: [
            { name: 'query', value: rust.string(queryName) },
            { name: 'group', value: rust.string(typeName) },
          ],
        }),
      } as RustExpression,
    }
    return (input) => ({
      kind: 'match',
      value: { kind: 'tuple', items: group.columns.map(input) },
      arms: [...arms, ...(exhausted ? [] : [fallback])],
    })
  }
  const fields = groups.map((group) => {
    const name = unique(fieldNames, rustFieldName(group.name), '_group')
    const type = unique(taken, `${queryName}${rustTypeName(group.name)}`, 'Group')
    return {
      group,
      name,
      type: rust.path(type),
      value: render(group, type)((column) => rust.ident(local(column))),
    }
  })
  return { fields, items }
}
