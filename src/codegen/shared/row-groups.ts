import type {
  CheckCaseLabel,
  CheckCaseLiteralKind,
  CheckColumnCase,
  OutputCheckCases,
} from '../../query/check-cases.js'
import type { OutputPresenceGroup } from '../../query/types.js'

// The groups a row's columns fall into, for targets that give each group a type of its own
// instead of intersecting unions with the flat row: an outer-joined relation, which is absent or
// present, and a set of columns whose CHECKs tie them together, told apart by a discriminant.
// A presence group holding one case group is that case group with an absent member; holding
// several, or nested presence groups, its present member holds them. Case groups whose members
// are merged combinations, and presence groups with no column that is set whenever the row is,
// are no group: their columns stay in the flat row.

/** How a row is recognized as a member. Columns are output indices. */
export type RowGroupTest =
  | { kind: 'absent'; column: number }
  | { kind: 'present' }
  | { kind: 'value'; column: number; value: string; literal: CheckCaseLiteralKind }
  | { kind: 'null'; column: number }
  | { kind: 'other'; column: number }
  | { kind: 'set'; set: readonly number[]; unset: readonly number[] }

export interface RowGroupField {
  column: number
  nullable: boolean
}

export interface RowGroupMember {
  /** The member's name before a target spells it: Absent, Present, a value, Other, Null. */
  name: string
  test: RowGroupTest
  fields: readonly RowGroupField[]
  groups: readonly RowGroup[]
}

export interface RowGroup {
  /** The group's name before a target spells it: its relation, or its discriminant column. */
  name: string
  /** Every output column the group holds, nested groups' included, ascending. */
  columns: readonly number[]
  members: readonly RowGroupMember[]
}

export interface RowGroupInput {
  names: readonly string[]
  notNull: readonly boolean[]
  presence: readonly OutputPresenceGroup[]
  cases: OutputCheckCases | undefined
  /** The relation each output passes through, as the statement names it, where one does. */
  relations: readonly (string | null)[]
}

interface CaseGroupInput {
  columns: readonly number[]
  kinds: readonly (CheckCaseLiteralKind | null)[]
  discriminant: { column: number } | { nullness: true }
  members: readonly { label: CheckCaseLabel; cases: readonly CheckColumnCase[] }[]
}

interface PresenceNode {
  group: OutputPresenceGroup
  children: PresenceNode[]
  cases: CaseGroupInput[]
}

export function rowGroups(input: RowGroupInput): RowGroup[] {
  const cases: CaseGroupInput[] = (input.cases?.groups ?? []).flatMap((group) =>
    group.discriminant && group.members && group.members.length > 1
      ? [
          {
            columns: group.columns,
            kinds: group.kinds,
            discriminant: group.discriminant,
            members: group.members,
          },
        ]
      : [],
  )
  // A presence group whose columns another holds is nested in it; the smallest holder wins.
  const presence = input.presence
    .filter((group) => group.discriminants.length > 0)
    .map((group): PresenceNode => ({ group, children: [], cases: [] }))
    .sort((left, right) => left.group.columns.length - right.group.columns.length)
  const holder = (columns: readonly number[], except?: PresenceNode) =>
    presence.find(
      (node) =>
        node !== except &&
        columns.every((column) => node.group.columns.includes(column)) &&
        (!except || node.group.columns.length > except.group.columns.length),
    )
  const roots: PresenceNode[] = []
  for (const node of presence) {
    const parent = holder(node.group.columns, node)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const topCases: CaseGroupInput[] = []
  for (const group of cases) {
    const node = holder(group.columns)
    if (node) node.cases.push(group)
    else topCases.push(group)
  }
  const relationOf = (column: number) => input.relations[column] ?? input.names[column]!
  const caseNames = (groups: readonly CaseGroupInput[], nested: boolean) =>
    groups.map((group) => {
      const column = discriminantColumn(group)
      const shared = groups.some(
        (other) =>
          other !== group && relationOf(other.columns[0]!) === relationOf(group.columns[0]!),
      )
      return nested || shared ? input.names[column]! : relationOf(column)
    })
  const caseGroup = (group: CaseGroupInput, name: string, held: readonly number[]): RowGroup => ({
    name,
    columns: group.columns,
    members: caseMembers(group, input, held),
  })
  const presenceGroup = (node: PresenceNode): RowGroup => {
    const { group } = node
    const absent: RowGroupMember = {
      name: 'Absent',
      test: { kind: 'absent', column: group.discriminants[0]! },
      fields: [],
      groups: [],
    }
    const name = relationOf(group.columns[0]!)
    const own = group.columns.filter(
      (column) =>
        !node.children.some((child) => child.group.columns.includes(column)) &&
        !node.cases.some((item) => item.columns.includes(column)),
    )
    const field = (column: number): RowGroupField => ({
      column,
      nullable: !group.discriminants.includes(column) && !input.notNull[column],
    })
    if (node.children.length === 0 && node.cases.length === 1) {
      const members = caseMembers(node.cases[0]!, input, group.discriminants)
      return {
        name,
        columns: group.columns,
        members: [
          absent,
          ...members.map((member) => ({
            ...member,
            fields: [...own.map(field), ...member.fields].sort(
              (left, right) => left.column - right.column,
            ),
          })),
        ],
      }
    }
    const names = caseNames(node.cases, true)
    return {
      name,
      columns: group.columns,
      members: [
        absent,
        {
          name: 'Present',
          test: { kind: 'present' },
          fields: own.map(field),
          groups: [
            ...node.children.map(presenceGroup),
            ...node.cases.map((item, index) => caseGroup(item, names[index]!, group.discriminants)),
          ].sort((left, right) => left.columns[0]! - right.columns[0]!),
        },
      ],
    }
  }
  const names = caseNames(topCases, false)
  return [
    ...roots.map(presenceGroup),
    ...topCases.map((group, index) => caseGroup(group, names[index]!, [])),
  ].sort((left, right) => left.columns[0]! - right.columns[0]!)
}

const discriminantColumn = (group: CaseGroupInput): number =>
  'column' in group.discriminant ? group.discriminant.column : group.columns[0]!

/**
 * One member per label. A value member leaves its discriminant out, since the member says it;
 * a column NULL in every row of a member is left out too. `held` are columns a holding presence
 * group guarantees set.
 */
function caseMembers(
  group: CaseGroupInput,
  input: RowGroupInput,
  held: readonly number[],
): RowGroupMember[] {
  const discriminant = 'column' in group.discriminant ? group.discriminant.column : null
  const position = discriminant === null ? -1 : group.columns.indexOf(discriminant)
  const others = group.members.filter((member) => member.label.kind === 'other').length
  return group.members.map((member) => {
    const label = member.label
    const fields = group.columns.flatMap((column, index): RowGroupField[] => {
      const item = member.cases[index]!
      if (index === position && label.kind !== 'other') return []
      if (!item.null && item.values?.length === 0) return []
      if (item.null && item.values?.length === 0) return []
      return [{ column, nullable: item.null && !held.includes(column) && !input.notNull[column] }]
    })
    switch (label.kind) {
      case 'value':
        return {
          name: label.value,
          test: {
            kind: 'value',
            column: discriminant!,
            value: label.value,
            literal: group.kinds[position]!,
          },
          fields,
          groups: [],
        }
      case 'other':
        return {
          name:
            label.values?.length === 1
              ? label.values[0]!
              : others > 1
                ? `${input.names[discriminant!]} Other`
                : 'Other',
          test: { kind: 'other', column: discriminant! },
          fields,
          groups: [],
        }
      case 'null':
        return { name: 'Null', test: { kind: 'null', column: discriminant! }, fields, groups: [] }
      case 'set': {
        // The label names table columns; the member's cases say the same of the output's.
        const set = group.columns.filter((_, index) => !member.cases[index]!.null)
        return {
          name: set.length ? set.map((column) => input.names[column]!).join(' ') : 'None',
          test: { kind: 'set', set, unset: group.columns.filter((c) => !set.includes(c)) },
          fields,
          groups: [],
        }
      }
    }
  })
}

interface TargetNode {
  ResTarget?: { val?: { ColumnRef?: { fields?: { String?: { sval?: string }; A_Star?: unknown }[] } } }
}

/**
 * The relation each output passes through, as the statement's own list names it: the qualifier
 * of a qualified column, else the table its value comes from. A list that expands a star names
 * no output by position, so only the tables are used.
 */
export function outputRelations(
  statement: unknown,
  tables: readonly (string | null)[],
): (string | null)[] {
  const body = statement as Record<string, { targetList?: TargetNode[]; returningList?: TargetNode[]; op?: string }>
  const node =
    body['SelectStmt'] ?? body['InsertStmt'] ?? body['UpdateStmt'] ?? body['DeleteStmt'] ?? body['MergeStmt']
  const list = node?.targetList ?? node?.returningList
  const fields = list?.map((target) => target.ResTarget?.val?.ColumnRef?.fields)
  const starred = fields?.some((items) => items?.some((item) => 'A_Star' in item))
  return tables.map((table, index) => {
    const qualified = !starred && list?.length === tables.length ? fields?.[index] : undefined
    const qualifier = qualified && qualified.length >= 2 ? qualified.at(-2)?.String?.sval : undefined
    return qualifier ?? table
  })
}
