import type { Node } from 'libpg-query'
import { litOf, type Lit } from './check-entailment.js'
import type { CheckCaseCatalog, ColumnOrigin, OutputNullability } from './types.js'

// ---------------------------------------------------------------------------
// CHECK case derivation: which combinations of values a table's CHECKs admit.
//
// Each column a CHECK tests takes a small abstract state: NULL, one of the
// literals the CHECKs compare it with, or OTHER (any non-NULL value equal to
// none of them). An enum column takes its labels instead of OTHER and a
// boolean column true and false; a column only tested for NULL takes NULL or
// NONNULL. Every CHECK is evaluated over each combination in three-valued
// logic on SETS of truth values: an atom the derivation cannot read is any of
// TRUE, FALSE and NULL, so the sets only ever widen. A combination survives
// when every CHECK may come out TRUE or NULL for it, since PostgreSQL accepts
// a row whose CHECK is NULL. The surviving combinations are a superset of the
// rows the CHECKs admit, which is what makes types built from them sound:
//
//   - a column whose OTHER state never survives holds only its literals, a
//     literal union, and one whose NULL state never survives is non-null;
//   - combinations that are not the product of those per-column sets are a
//     case union: `kind = 'paid'` rows have `paid_at`, the others do not.
//
// Literal comparisons decide FALSE only where unequal literals are unequal
// values: enum labels, integers, booleans and text under a deterministic
// collation (`resolveLiteralDistinctnessSound`). Anywhere else the atom is
// unread and the column keeps OTHER.
// ---------------------------------------------------------------------------

/** How a column's literals are spelled in the target language. */
export type CheckCaseLiteralKind = 'string' | 'number' | 'bigint' | 'boolean'

/** One column's values in a case: NULL or not, and its literals or any value. */
export interface CheckColumnCase {
  null: boolean
  /** The non-NULL values, as literal texts of the column's kind; null for any value. */
  values: readonly string[] | null
}

export interface CheckCaseGroup {
  columns: readonly string[]
  /** Each case is one member of the union, aligned with `columns`. */
  cases: readonly (readonly CheckColumnCase[])[]
  /**
   * What tells the members apart: a column whose value fixes the other columns' shapes, or which
   * columns are NULL. Without one the members are merged combinations, which may overlap.
   */
  discriminant?: { column: string } | { nullness: true }
  /** With a discriminant, each member's label, aligned with `cases`. */
  labels?: readonly CheckCaseLabel[]
}

/**
 * A member's label: one value of the discriminant, the values the CHECKs never mention (which
 * behave alike; null for any value of an open type), NULL, or the columns that are set.
 */
export type CheckCaseLabel =
  | { kind: 'value'; value: string }
  | { kind: 'other'; values: readonly string[] | null }
  | { kind: 'null' }
  | { kind: 'set'; columns: readonly string[] }

export interface CheckCaseColumn {
  kind: CheckCaseLiteralKind | null
  /** Every value of a closed type (enum labels, booleans); null for an open one. */
  domain: readonly string[] | null
  /** What every admitted row holds in the column. */
  summary: CheckColumnCase
}

export interface TableCheckCases {
  columns: ReadonlyMap<string, CheckCaseColumn>
  /** Unions over two or more columns, one per independent set of CHECKs. */
  groups: readonly CheckCaseGroup[]
}

/**
 * Stored rows satisfy the validated CHECKs of the table and its inheritance
 * tree; written rows the enforced CHECKs of the written relation.
 */
export type CheckCaseReading = 'stored' | 'written'

const TRUE = 1
const FALSE = 2
const NULL = 4
const ANY = TRUE | FALSE | NULL

/** Beyond this many combinations a set of CHECKs is left unread. */
const MAX_COMBINATIONS = 4096

const NULL_STATE = -1
const OTHER_STATE = -2

interface ColumnSpace {
  kind: CheckCaseLiteralKind | null
  /** Whether literal comparisons decide: unequal literals are unequal values. */
  distinct: boolean
  notNull: boolean
  /** Enumerated non-NULL values (enum labels, booleans), or the mentioned literals. */
  literals: string[]
  closed: boolean
  /** The values the CHECKs compare the column with. */
  mentioned: Set<string>
}

const cache = new WeakMap<CheckCaseCatalog, Map<string, TableCheckCases>>()

export function tableCheckCases(
  catalog: CheckCaseCatalog,
  schema: string,
  table: string,
  reading: CheckCaseReading,
): TableCheckCases {
  let tables = cache.get(catalog)
  if (!tables) cache.set(catalog, (tables = new Map()))
  const key = `${reading}\0${schema}\0${table}`
  let result = tables.get(key)
  if (!result) tables.set(key, (result = deriveCases(catalog, schema, table, reading)))
  return result
}

/** What derivation reads of one column. */
interface CaseColumnFacts {
  typeName: string
  labels: readonly string[] | null
  /** Unequal text literals are unequal values. */
  distinctText: boolean
  notNull: boolean
}

function deriveCases(
  catalog: CheckCaseCatalog,
  schema: string,
  table: string,
  reading: CheckCaseReading,
): TableCheckCases {
  return deriveFrom(
    reading === 'stored'
      ? catalog.resolveCheckConstraintsTree(schema, table)
      : catalog.resolveEnforcedCheckConstraints(schema, table),
    (column) => {
      const typeName = catalog.resolveColumnTypeName(schema, table, column)
      if (typeName === null) return null
      // A column of a domain compares its literals at the domain's base type.
      const dot = typeName.lastIndexOf('.')
      const domain =
        catalog.resolveDomainCheckFacts(
          dot < 0 ? schema : typeName.slice(0, dot),
          dot < 0 ? typeName : typeName.slice(dot + 1),
        ) ?? null
      if (domain)
        return {
          typeName: domain.baseTypeName,
          labels: domain.labels,
          distinctText: domain.distinctText,
          notNull:
            reading === 'stored'
              ? catalog.resolveColumnNotNullTree(schema, table, column)
              : catalog.resolveColumnNotNull(schema, table, column),
        }
      return {
        typeName,
        labels: catalog.resolveColumnEnumLabels(schema, table, column),
        distinctText: catalog.resolveLiteralDistinctnessSound(schema, table, column),
        notNull:
          reading === 'stored'
            ? catalog.resolveColumnNotNullTree(schema, table, column)
            : catalog.resolveColumnNotNull(schema, table, column),
      }
    },
  )
}

/**
 * The literals a domain's values hold: its validated CHECKs and its base
 * domains', with VALUE read as a column of the base type.
 */
export function domainCheckLiterals(
  catalog: CheckCaseCatalog,
  schema: string,
  name: string,
): OutputLiterals | null {
  const domain = catalog.resolveDomainCheckFacts(schema, name)
  if (!domain) return null
  const facts: CaseColumnFacts = {
    typeName: domain.baseTypeName,
    labels: domain.labels,
    distinctText: domain.distinctText,
    notNull: domain.notNull,
  }
  const column = deriveFrom(domain.checks, (column) =>
    column === 'value' ? facts : null,
  ).columns.get('value')
  return column?.kind && column.summary.values !== null
    ? { kind: column.kind, values: column.summary.values }
    : null
}

function deriveFrom(
  checks: readonly Node[],
  facts: (column: string) => CaseColumnFacts | null,
): TableCheckCases {
  const spaces = new Map<string, ColumnSpace>()
  const space = (column: string): ColumnSpace | null => {
    const existing = spaces.get(column)
    if (existing) return existing
    const found = facts(column)
    if (found === null) return null
    const { typeName, labels } = found
    const kind = literalKind(typeName, labels)
    const created: ColumnSpace = {
      kind,
      distinct:
        kind === 'number' ||
        kind === 'bigint' ||
        kind === 'boolean' ||
        (kind === 'string' && (labels !== null || found.distinctText)),
      notNull: found.notNull,
      literals: labels ? [...labels] : kind === 'boolean' ? ['true', 'false'] : [],
      closed: labels !== null || kind === 'boolean',
      mentioned: new Set(),
    }
    spaces.set(column, created)
    return created
  }
  const reader: Reader = {
    column: (node) => {
      const name = columnName(node)
      if (name === null) return null
      const found = space(name)
      return found ? { name, space: found } : null
    },
  }
  // The first pass collects the columns each CHECK reads and the literals
  // they are compared with; the second evaluates.
  const reads = checks.map((check: Node) => {
    const columns = new Set<string>()
    collect(check, reader, columns)
    return { check, columns }
  })
  const components = connected(
    reads.filter((read: { columns: Set<string> }) => read.columns.size > 0),
  )
  const columns = new Map<string, CheckCaseColumn>()
  const groups: CheckCaseGroup[] = []
  for (const component of components) {
    const names = [...component.columns].sort()
    const states = names.map((name) => statesOf(spaces.get(name)!))
    const total = states.reduce((product, list) => product * list.length, 1)
    if (total > MAX_COMBINATIONS) continue
    const surviving: number[][] = []
    const assignment = new Map<string, number>()
    const visit = (index: number, current: number[]): void => {
      if (index === names.length) {
        const admitted = component.checks.every(
          (check) => (evaluate(check, reader, assignment) & (TRUE | NULL)) !== 0,
        )
        if (admitted) surviving.push([...current])
        return
      }
      for (const state of states[index]!) {
        assignment.set(names[index]!, state)
        current.push(state)
        visit(index + 1, current)
        current.pop()
      }
    }
    visit(0, [])
    const cases = surviving.map((tuple) =>
      tuple.map((state, index) => stateCase(spaces.get(names[index]!)!, state)),
    )
    const domains = names.map((name) => {
      const own = spaces.get(name)!
      return own.closed ? [...own.literals].sort() : null
    })
    names.forEach((name, index) => {
      const own = spaces.get(name)!
      columns.set(name, {
        kind: own.kind,
        domain: domains[index]!,
        summary: whole(joinCases(cases.map((member) => member[index]!)), domains[index]!),
      })
    })
    const split = discriminate(
      names,
      names.map((name) => spaces.get(name)!),
      surviving,
    )
    if (names.length > 1 && split && split.cases.length > 1)
      groups.push({ columns: names, ...split })
    else {
      const merged = mergeCases(cases, domains)
      // A single member says nothing the per-column summaries do not.
      if (names.length > 1 && merged.length > 1) groups.push({ columns: names, cases: merged })
    }
  }
  return { columns, groups }
}

/**
 * Members told apart by one column's value, or else by which columns are NULL: within each
 * member the other columns must vary independently, so the member says exactly what its rows
 * hold. Values the CHECKs mention get a member each; unmentioned values of a closed type behave
 * alike and share one, and an open type's other values are one more.
 */
function discriminate(
  names: readonly string[],
  spaces: readonly ColumnSpace[],
  surviving: readonly (readonly number[])[],
): Pick<CheckCaseGroup, 'cases' | 'discriminant' | 'labels'> | null {
  const exact = (tuples: readonly (readonly number[])[], skip: (index: number) => boolean) =>
    tuples.length ===
    names.reduce(
      (product, _, index) =>
        skip(index) ? product : product * new Set(tuples.map((tuple) => tuple[index])).size,
      1,
    )
  const memberOf = (tuples: readonly (readonly number[])[]): CheckColumnCase[] =>
    names.map((_, index) =>
      joinCases(tuples.map((tuple) => stateCase(spaces[index]!, tuple[index]!))),
    )
  const rank = (space: ColumnSpace) =>
    space.closed && space.kind === 'string' ? 0 : space.kind === 'boolean' ? 1 : 2
  const candidates = names
    .map((name, index) => ({ name, index, space: spaces[index]! }))
    .filter(({ space }) => space.distinct && space.literals.length > 0)
    .flatMap(({ name, index, space }) => {
      const byState = new Map<number, (readonly number[])[]>()
      for (const tuple of surviving) {
        const list = byState.get(tuple[index]!) ?? []
        list.push(tuple)
        byState.set(tuple[index]!, list)
      }
      if (![...byState.values()].every((tuples) => exact(tuples, (other) => other === index)))
        return []
      const labels: CheckCaseLabel[] = []
      const cases: CheckColumnCase[][] = []
      const unmentioned: (readonly number[])[] = []
      let nulls: (readonly number[])[] | undefined
      for (const [state, tuples] of [...byState].sort(([left], [right]) => order(left, right))) {
        if (state === NULL_STATE) {
          nulls = tuples
          continue
        }
        const label: CheckCaseLabel | null =
          state === OTHER_STATE
            ? { kind: 'other', values: null }
            : space.kind === 'boolean' ||
                !space.closed ||
                space.mentioned.has(space.literals[state]!)
              ? { kind: 'value', value: space.literals[state]! }
              : null
        if (label === null) {
          unmentioned.push(...tuples)
          continue
        }
        labels.push(label)
        cases.push(memberOf(tuples))
      }
      if (unmentioned.length) {
        labels.push({
          kind: 'other',
          values: [...new Set(unmentioned.map((tuple) => space.literals[tuple[index]!]!))].sort(),
        })
        cases.push(memberOf(unmentioned))
      }
      if (nulls) {
        labels.push({ kind: 'null' })
        cases.push(memberOf(nulls))
      }
      return [{ name, rank: rank(space), labels, cases }]
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.labels.length - right.labels.length ||
        compare(left.name, right.name),
    )
  const chosen = candidates[0]
  if (chosen && chosen.labels.length > 1)
    return { cases: chosen.cases, discriminant: { column: chosen.name }, labels: chosen.labels }
  // Which columns are NULL.
  const byPattern = new Map<string, (readonly number[])[]>()
  for (const tuple of surviving) {
    const key = tuple.map((state) => (state === NULL_STATE ? '0' : '1')).join('')
    const list = byPattern.get(key) ?? []
    list.push(tuple)
    byPattern.set(key, list)
  }
  if (byPattern.size < 2 || ![...byPattern.values()].every((tuples) => exact(tuples, () => false)))
    return null
  const patterns = [...byPattern].sort(([left], [right]) => compare(right, left))
  return {
    cases: patterns.map(([, tuples]) => memberOf(tuples)),
    discriminant: { nullness: true },
    labels: patterns.map(([key]) => ({
      kind: 'set' as const,
      columns: names.filter((_, index) => key[index] === '1'),
    })),
  }
}

// Literals in the order the CHECKs mention them, then any other value, then NULL.
const order = (left: number, right: number): number => position(left) - position(right)
const position = (state: number): number =>
  state === OTHER_STATE
    ? Number.MAX_SAFE_INTEGER - 1
    : state === NULL_STATE
      ? Number.MAX_SAFE_INTEGER
      : state

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

function literalKind(
  typeName: string,
  labels: readonly string[] | null,
): CheckCaseLiteralKind | null {
  if (labels) return 'string'
  if (typeName === 'text' || /^character varying(?:\(\d+\))?$/u.test(typeName)) return 'string'
  if (typeName === 'integer' || typeName === 'smallint') return 'number'
  if (typeName === 'bigint') return 'bigint'
  if (typeName === 'boolean') return 'boolean'
  return null
}

function statesOf(space: ColumnSpace): number[] {
  const states = space.literals.map((_, index) => index)
  if (!space.closed) states.push(OTHER_STATE)
  if (!space.notNull) states.push(NULL_STATE)
  return states
}

function stateCase(space: ColumnSpace, state: number): CheckColumnCase {
  if (state === NULL_STATE) return { null: true, values: [] }
  if (state === OTHER_STATE) return { null: false, values: null }
  return { null: false, values: [space.literals[state]!] }
}

function joinCases(cases: readonly CheckColumnCase[]): CheckColumnCase {
  let nullable = false
  let values: Set<string> | null = new Set()
  for (const item of cases) {
    nullable ||= item.null
    if (item.values === null) values = null
    else if (values) for (const value of item.values) values.add(value)
  }
  return { null: nullable, values: values ? [...values].sort() : null }
}

/**
 * A group's members over some of its columns, plus an all-NULL member for a row that may be
 * absent. While the discriminant stays visible each member keeps its own value; otherwise the
 * projected members merge.
 */
export function projectCases(
  group: CheckCaseGroup,
  positions: readonly number[],
  table: TableCheckCases,
  absent = false,
): (readonly CheckColumnCase[])[] {
  const projected = group.cases.map((member) => positions.map((position) => member[position]!))
  if (absent) projected.push(positions.map(() => ({ null: true, values: [] })))
  const visible =
    group.discriminant &&
    ('column' in group.discriminant
      ? positions.includes(group.columns.indexOf(group.discriminant.column))
      : positions.length === group.columns.length)
  if (visible) return dedupe(projected)
  return mergeCases(
    projected,
    positions.map((position) => table.columns.get(group.columns[position]!)?.domain ?? null),
  )
}

/**
 * Merges members that differ in one column into one member holding both
 * values there, until no two members merge.
 */
export function mergeCases(
  cases: readonly (readonly CheckColumnCase[])[],
  domains: readonly (readonly string[] | null)[],
): (readonly CheckColumnCase[])[] {
  let members = dedupe(
    cases.map((member) => member.map((item, index) => whole(item, domains[index]!))),
  )
  for (let changed = true; changed;) {
    changed = false
    outer: for (let left = 0; left < members.length; left++)
      for (let right = left + 1; right < members.length; right++) {
        const a = members[left]!
        const b = members[right]!
        const differing = a.flatMap((item, index) => (sameCase(item, b[index]!) ? [] : [index]))
        if (differing.length > 1) continue
        const joined = a.map((item, index) =>
          index === differing[0] ? whole(joinCases([item, b[index]!]), domains[index]!) : item,
        )
        members = dedupe([
          ...members.slice(0, left),
          joined,
          ...members.slice(left + 1, right),
          ...members.slice(right + 1),
        ])
        changed = true
        break outer
      }
  }
  return members
}

/** Every value of a closed type is any value: the type says it already. */
function whole(item: CheckColumnCase, domain: readonly string[] | null): CheckColumnCase {
  return domain && item.values?.length === domain.length ? { ...item, values: null } : item
}

function dedupe(cases: readonly (readonly CheckColumnCase[])[]): (readonly CheckColumnCase[])[] {
  const seen = new Map<string, readonly CheckColumnCase[]>()
  for (const member of cases) seen.set(JSON.stringify(member), member)
  return [...seen.values()]
}

function sameCase(left: CheckColumnCase, right: CheckColumnCase): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function connected(
  reads: readonly { check: Node; columns: Set<string> }[],
): { columns: Set<string>; checks: Node[] }[] {
  const components: { columns: Set<string>; checks: Node[] }[] = []
  for (const read of reads) {
    const union = { columns: new Set(read.columns), checks: [read.check] }
    for (const component of [...components]) {
      if (![...component.columns].some((column) => union.columns.has(column))) continue
      for (const column of component.columns) union.columns.add(column)
      union.checks.unshift(...component.checks)
      components.splice(components.indexOf(component), 1)
    }
    components.push(union)
  }
  return components
}

// ---------------------------------------------------------------------------
// Reading CHECK expressions.
// ---------------------------------------------------------------------------

interface Reader {
  column(node: Node): { name: string; space: ColumnSpace } | null
}

type Assignment = ReadonlyMap<string, number>

const record = (node: Node): Record<string, unknown> => node as unknown as Record<string, unknown>

/**
 * The column a CHECK reads: a bare reference, or a varchar column cast to
 * text, which is how PostgreSQL stores a comparison of one with a literal.
 */
function columnName(node: Node): string | null {
  let current = record(node)
  if ('TypeCast' in current) {
    const cast = current['TypeCast'] as { arg?: Node; typeName?: { names?: Node[] } }
    if (!cast.arg || castName(cast.typeName?.names) !== 'text') return null
    current = record(cast.arg)
  }
  const fields = (current['ColumnRef'] as { fields?: Node[] } | undefined)?.fields
  if (fields?.length !== 1) return null
  return (fields[0] as { String?: { sval?: string } }).String?.sval ?? null
}

function castName(names: Node[] | undefined): string | null {
  const parts = (names ?? []).map((name) => (name as { String?: { sval?: string } }).String?.sval)
  if (parts.some((part) => part === undefined)) return null
  if (parts[0] === 'pg_catalog') parts.shift()
  return parts.length ? parts[parts.length - 1]! : null
}

/** A literal read as a value of the column, or null when it cannot be read exactly. */
function literalValue(space: ColumnSpace, node: Node): string | null {
  // An integer literal compared at a wider integer type is stored cast twice.
  if (space.kind === 'number' || space.kind === 'bigint')
    for (;;) {
      const cast = record(node)['TypeCast'] as
        { arg?: Node; typeName?: { names?: Node[] } } | undefined
      if (!cast?.arg || !INTEGER_CASTS.has(castName(cast.typeName?.names) ?? '')) break
      if (!record(cast.arg)['TypeCast']) break
      node = cast.arg
    }
  const negated = negatedConstant(node)
  const lit: Lit | null = negated ?? litOf(node)
  if (!lit) return null
  const cast = lit.cast?.name ?? null
  switch (space.kind) {
    case 'string': {
      if (lit.kind !== 'sval') return null
      const value = String(lit.value)
      if (space.closed) return space.literals.includes(value) ? value : null
      return cast === null || cast === 'text' || cast === 'character varying' ? value : null
    }
    case 'number':
    case 'bigint': {
      if (cast !== null && !['integer', 'smallint', 'bigint'].includes(cast)) return null
      const text =
        lit.kind === 'ival' ? String(lit.value) : lit.kind === 'sval' ? String(lit.value) : null
      if (text === null || !/^[+-]?\d+$/u.test(text.trim())) return null
      return BigInt(text.trim()).toString()
    }
    case 'boolean':
      return lit.kind === 'boolval' && cast === null ? String(lit.value) : null
    default:
      return null
  }
}

const INTEGER_CASTS = new Set(['int2', 'int4', 'int8', 'smallint', 'integer', 'bigint'])

/** `- 1`, as a CHECK may store a negative integer. */
function negatedConstant(node: Node): Lit | null {
  const expr = record(node)['A_Expr'] as
    { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node } | undefined
  if (!expr || expr.kind !== 'AEXPR_OP' || expr.lexpr || !expr.rexpr) return null
  if (castName(expr.name) !== '-') return null
  const lit = litOf(expr.rexpr)
  if (!lit || lit.kind !== 'ival' || lit.cast) return null
  return { ...lit, value: -(lit.value as number) }
}

/** The literals of `ARRAY[...]`, an IN list, or a cast of either. */
function literalList(node: Node | undefined): Node[] | null {
  if (!node) return null
  let current = record(node)
  if ('TypeCast' in current) current = record((current['TypeCast'] as { arg: Node }).arg)
  if ('A_ArrayExpr' in current)
    return (current['A_ArrayExpr'] as { elements?: Node[] }).elements ?? []
  if ('List' in current) return (current['List'] as { items?: Node[] }).items ?? []
  if (Array.isArray(node)) return node as Node[]
  return null
}

/** Records the columns a CHECK reads through forms the evaluation decides, and their literals. */
function collect(node: Node, reader: Reader, columns: Set<string>): void {
  const current = record(node)
  const note = (operand: Node | undefined, literals: (Node | undefined)[]): boolean => {
    const column = operand ? reader.column(operand) : null
    if (!column) return false
    columns.add(column.name)
    if (column.space.distinct)
      for (const literal of literals) {
        const value = literal ? literalValue(column.space, literal) : null
        if (value === null) continue
        column.space.mentioned.add(value)
        if (!column.space.closed && !column.space.literals.includes(value))
          column.space.literals.push(value)
      }
    return true
  }
  if ('NullTest' in current) note((current['NullTest'] as { arg?: Node }).arg, [])
  if ('A_Expr' in current) {
    const expr = current['A_Expr'] as ExprNode
    const op = castName(expr.name)
    if (expr.kind === 'AEXPR_OP' && (op === '=' || op === '<>' || op === '!=')) {
      if (!note(expr.lexpr, [expr.rexpr])) note(expr.rexpr, [expr.lexpr])
    } else if (
      expr.kind === 'AEXPR_OP_ANY' ||
      expr.kind === 'AEXPR_OP_ALL' ||
      expr.kind === 'AEXPR_IN'
    ) {
      const list = literalList(expr.rexpr)
      if (list) note(expr.lexpr, list)
    } else if (expr.kind === 'AEXPR_DISTINCT' || expr.kind === 'AEXPR_NOT_DISTINCT') {
      if (!note(expr.lexpr, [expr.rexpr])) note(expr.rexpr, [expr.lexpr])
    }
  }
  if ('CaseExpr' in current) {
    const expr = current['CaseExpr'] as CaseNode
    note(
      expr.arg,
      (expr.args ?? []).map((branch) => (branch as { CaseWhen?: { expr?: Node } }).CaseWhen?.expr),
    )
  }
  if ('FuncCall' in current) {
    const call = current['FuncCall'] as FuncNode
    if (['num_nulls', 'num_nonnulls'].includes(castName(call.funcname) ?? ''))
      for (const arg of call.args ?? []) note(arg, [])
  }
  // A boolean column is itself a truth value.
  if ('ColumnRef' in current && reader.column(node)?.space.kind === 'boolean') note(node, [])
  for (const value of Object.values(current)) {
    if (Array.isArray(value)) for (const item of value) descend(item, reader, columns)
    else descend(value, reader, columns)
  }
}

function descend(value: unknown, reader: Reader, columns: Set<string>): void {
  if (value && typeof value === 'object') collect(value as Node, reader, columns)
}

const not = (set: number): number =>
  (set & TRUE ? FALSE : 0) | (set & FALSE ? TRUE : 0) | (set & NULL ? NULL : 0)

function combine(left: number, right: number, op: (a: number, b: number) => number): number {
  let result = 0
  for (const a of [TRUE, FALSE, NULL]) {
    if (!(left & a)) continue
    for (const b of [TRUE, FALSE, NULL]) if (right & b) result |= op(a, b)
  }
  return result
}

const and = (a: number, b: number): number =>
  a === FALSE || b === FALSE ? FALSE : a === NULL || b === NULL ? NULL : TRUE
const or = (a: number, b: number): number =>
  a === TRUE || b === TRUE ? TRUE : a === NULL || b === NULL ? NULL : FALSE

/** The truth values a boolean expression may take under an assignment of column states. */
function evaluate(node: Node, reader: Reader, assignment: Assignment): number {
  const current = record(node)
  if ('BoolExpr' in current) {
    const expr = current['BoolExpr'] as { boolop?: string; args?: Node[] }
    const args = (expr.args ?? []).map((arg) => evaluate(arg, reader, assignment))
    if (expr.boolop === 'NOT_EXPR') return args.length === 1 ? not(args[0]!) : ANY
    const op = expr.boolop === 'AND_EXPR' ? and : expr.boolop === 'OR_EXPR' ? or : null
    if (!op || args.length === 0) return ANY
    return args.slice(1).reduce((left, right) => combine(left, right, op), args[0]!)
  }
  if ('NullTest' in current) {
    const test = current['NullTest'] as { arg?: Node; nulltesttype?: string }
    const column = test.arg ? reader.column(test.arg) : null
    const state = column ? assignment.get(column.name) : undefined
    if (state === undefined) return TRUE | FALSE
    const isNull = state === NULL_STATE
    return (test.nulltesttype === 'IS_NULL') === isNull ? TRUE : FALSE
  }
  if ('BooleanTest' in current) {
    const test = current['BooleanTest'] as { arg?: Node; booltesttype?: string }
    if (!test.arg) return ANY
    const inner = evaluate(test.arg, reader, assignment)
    const map = (value: number): number => {
      switch (test.booltesttype) {
        case 'IS_TRUE':
          return value === TRUE ? TRUE : FALSE
        case 'IS_NOT_TRUE':
          return value === TRUE ? FALSE : TRUE
        case 'IS_FALSE':
          return value === FALSE ? TRUE : FALSE
        case 'IS_NOT_FALSE':
          return value === FALSE ? FALSE : TRUE
        case 'IS_UNKNOWN':
          return value === NULL ? TRUE : FALSE
        case 'IS_NOT_UNKNOWN':
          return value === NULL ? FALSE : TRUE
        default:
          return TRUE | FALSE
      }
    }
    let result = 0
    for (const value of [TRUE, FALSE, NULL]) if (inner & value) result |= map(value)
    return result
  }
  if ('CaseExpr' in current)
    return evaluateCase(current['CaseExpr'] as CaseNode, reader, assignment)
  if ('A_Const' in current) {
    const constant = current['A_Const'] as { isnull?: boolean; boolval?: { boolval?: boolean } }
    if (constant.isnull) return NULL
    if (constant.boolval) return constant.boolval.boolval ? TRUE : FALSE
    return ANY
  }
  if ('ColumnRef' in current) {
    const column = reader.column(node)
    const state = column ? assignment.get(column.name) : undefined
    if (state === undefined || column!.space.kind !== 'boolean') return ANY
    if (state === NULL_STATE) return NULL
    return column!.space.literals[state] === 'true' ? TRUE : FALSE
  }
  if ('A_Expr' in current)
    return evaluateComparison(current['A_Expr'] as ExprNode, reader, assignment)
  return ANY
}

interface ExprNode {
  kind?: string
  name?: Node[]
  lexpr?: Node
  rexpr?: Node
}

interface CaseNode {
  arg?: Node
  args?: Node[]
  defresult?: Node
}

/** Whether the column's state equals a literal: TRUE, FALSE, NULL, or undecided. */
function equalsLiteral(
  column: { name: string; space: ColumnSpace },
  state: number,
  literal: Node,
): number {
  if (state === NULL_STATE) return NULL
  const value = literalValue(column.space, literal)
  if (value === null || !column.space.distinct) return TRUE | FALSE
  if (state === OTHER_STATE) return FALSE
  return column.space.literals[state] === value ? TRUE : FALSE
}

function evaluateComparison(expr: ExprNode, reader: Reader, assignment: Assignment): number {
  const op = castName(expr.name)
  const left = expr.lexpr ? reader.column(expr.lexpr) : null
  const right = expr.rexpr ? reader.column(expr.rexpr) : null
  const leftState = left ? assignment.get(left.name) : undefined
  const rightState = right ? assignment.get(right.name) : undefined
  switch (expr.kind) {
    case 'AEXPR_OP': {
      if (op === '=' || op === '<>' || op === '!=') {
        const negate = op !== '='
        if (left && leftState !== undefined && expr.rexpr && !right) {
          const equal = equalsLiteral(left, leftState, expr.rexpr)
          return negate ? not(equal) : equal
        }
        if (right && rightState !== undefined && expr.lexpr && !left) {
          const equal = equalsLiteral(right, rightState, expr.lexpr)
          return negate ? not(equal) : equal
        }
        // Booleans compared with each other: `(a IS NULL) = (b IS NULL)`.
        if (
          expr.lexpr &&
          expr.rexpr &&
          booleanForm(expr.lexpr, reader) &&
          booleanForm(expr.rexpr, reader)
        ) {
          const equal = combine(
            evaluate(expr.lexpr, reader, assignment),
            evaluate(expr.rexpr, reader, assignment),
            (a, b) => (a === NULL || b === NULL ? NULL : a === b ? TRUE : FALSE),
          )
          return negate ? not(equal) : equal
        }
      }
      const counted = countComparison(expr, op, reader, assignment)
      if (counted !== null) return counted
      // A comparison is strict: a NULL operand makes it NULL.
      if (leftState === NULL_STATE || rightState === NULL_STATE) return NULL
      return ANY
    }
    case 'AEXPR_OP_ANY':
    case 'AEXPR_OP_ALL':
    case 'AEXPR_IN': {
      const literals = literalList(expr.rexpr)
      if (!left || leftState === undefined || !literals) return ANY
      if (leftState === NULL_STATE) return NULL
      const any = expr.kind === 'AEXPR_OP_ANY' || (expr.kind === 'AEXPR_IN' && op === '=')
      const all = expr.kind === 'AEXPR_OP_ALL' || (expr.kind === 'AEXPR_IN' && op === '<>')
      if (!(any && op === '=') && !(all && (op === '<>' || op === '!='))) return ANY
      let result = any ? FALSE : TRUE
      for (const literal of literals) {
        const equal = equalsLiteral(left, leftState, literal)
        result = any ? combine(result, equal, or) : combine(result, not(equal), and)
      }
      return result
    }
    case 'AEXPR_DISTINCT':
    case 'AEXPR_NOT_DISTINCT': {
      const column = left ?? right
      const state = left ? leftState : rightState
      const literal = left ? expr.rexpr : expr.lexpr
      if (!column || state === undefined || !literal) return ANY
      const distinct =
        state === NULL_STATE
          ? litOf(literal)
            ? TRUE
            : TRUE | FALSE
          : not(equalsLiteral(column, state, literal))
      return expr.kind === 'AEXPR_DISTINCT' ? distinct : not(distinct)
    }
    default:
      return ANY
  }
}

/** `num_nonnulls(a, b) = 1` and the like: never NULL, decided from the counts. */
function countComparison(
  expr: ExprNode,
  op: string | null,
  reader: Reader,
  assignment: Assignment,
): number | null {
  const call = expr.lexpr ? (record(expr.lexpr)['FuncCall'] as FuncNode | undefined) : undefined
  const bound = expr.rexpr ? litOf(expr.rexpr) : null
  const name = castName(call?.funcname)
  if (!call || (name !== 'num_nulls' && name !== 'num_nonnulls')) return null
  if (!bound || bound.kind !== 'ival' || (bound.cast && bound.cast.name !== 'integer')) return null
  let low = 0
  let high = 0
  for (const arg of call.args ?? []) {
    const column = reader.column(arg)
    const state = column ? assignment.get(column.name) : undefined
    const nonNull =
      state !== undefined ? state !== NULL_STATE : litOf(arg) !== null ? true : undefined
    const counts = name === 'num_nonnulls' ? nonNull : nonNull === undefined ? undefined : !nonNull
    if (counts === undefined) high++
    else if (counts) {
      low++
      high++
    }
  }
  const target = bound.value as number
  const holds = (count: number): boolean | null => {
    switch (op) {
      case '=':
        return count === target
      case '<>':
      case '!=':
        return count !== target
      case '<':
        return count < target
      case '<=':
        return count <= target
      case '>':
        return count > target
      case '>=':
        return count >= target
      default:
        return null
    }
  }
  let result = 0
  for (let count = low; count <= high; count++) {
    const value = holds(count)
    if (value === null) return ANY
    result |= value ? TRUE : FALSE
  }
  return result
}

interface FuncNode {
  funcname?: Node[]
  args?: Node[]
}

const COMPARISONS = new Set(['=', '<>', '!=', '<', '<=', '>', '>='])

/** Expressions whose value is a boolean: tests, connectives and comparisons. */
function booleanForm(node: Node, reader: Reader): boolean {
  const current = record(node)
  if ('A_Expr' in current) {
    const expr = current['A_Expr'] as ExprNode
    return expr.kind === 'AEXPR_OP'
      ? COMPARISONS.has(castName(expr.name) ?? '')
      : [
          'AEXPR_OP_ANY',
          'AEXPR_OP_ALL',
          'AEXPR_IN',
          'AEXPR_DISTINCT',
          'AEXPR_NOT_DISTINCT',
        ].includes(expr.kind ?? '')
  }
  if ('ColumnRef' in current) return reader.column(node)?.space.kind === 'boolean'
  return (
    'NullTest' in current ||
    'BooleanTest' in current ||
    'BoolExpr' in current ||
    ('A_Const' in current &&
      (current['A_Const'] as { boolval?: unknown; isnull?: boolean }).boolval !== undefined)
  )
}

function evaluateCase(node: CaseNode, reader: Reader, assignment: Assignment): number {
  const subject = node.arg ? reader.column(node.arg) : null
  const subjectState = subject ? assignment.get(subject.name) : undefined
  if (node.arg && subjectState === undefined) return ANY
  let result = 0
  // Whether control may still reach the next branch.
  let reaching = true
  for (const branch of node.args ?? []) {
    if (!reaching) break
    const when = (branch as { CaseWhen?: { expr?: Node; result?: Node } }).CaseWhen
    if (!when?.expr || !when.result) return ANY
    const condition = subject
      ? equalsLiteral(subject, subjectState!, when.expr)
      : evaluate(when.expr, reader, assignment)
    if (condition & TRUE) result |= evaluate(when.result, reader, assignment)
    reaching = (condition & (FALSE | NULL)) !== 0
  }
  if (reaching) result |= node.defresult ? evaluate(node.defresult, reader, assignment) : NULL
  return result
}

// ---------------------------------------------------------------------------
// Statement outputs.
// ---------------------------------------------------------------------------

export interface OutputLiterals {
  kind: CheckCaseLiteralKind
  values: readonly string[]
}

export interface OutputCaseGroup {
  /** Ascending output-column indices. */
  columns: readonly number[]
  kinds: readonly (CheckCaseLiteralKind | null)[]
  cases: readonly (readonly CheckColumnCase[])[]
}

export interface OutputCheckCases {
  /** Per output column, the only values its CHECKs admit; null where any value may appear. */
  literals: readonly (OutputLiterals | null)[]
  groups: readonly OutputCaseGroup[]
}

/**
 * What the CHECKs of the stored rows a statement reads say about its output.
 * Only bare pass-throughs of one base row count: columns whose origin is the
 * same row instance (`rowPath`) of one table. A row reached through an outer
 * join may be absent, which adds the all-NULL member to its groups. Columns
 * of a set operation have one origin per branch: they take the union of the
 * branches' literals, and no case groups.
 */
export function outputCheckCases(
  outputs: readonly OutputNullability[],
  catalog: CheckCaseCatalog,
): OutputCheckCases | undefined {
  const rows = new Map<string, { origin: ColumnOrigin; indices: number[] }>()
  outputs.forEach((output, index) => {
    const origin = output.origins?.length === 1 ? output.origins[0] : null
    if (!origin) return
    const key = JSON.stringify([origin.rowPath, origin.schema, origin.table])
    const row = rows.get(key) ?? { origin, indices: [] }
    row.indices.push(index)
    rows.set(key, row)
  })
  const literals: (OutputLiterals | null)[] = outputs.map(() => null)
  const groups: OutputCaseGroup[] = []
  for (const { origin, indices } of rows.values()) {
    const cases = tableCheckCases(catalog, origin.schema, origin.table, 'stored')
    for (const index of indices) {
      const column = cases.columns.get(outputs[index]!.origins![0]!.column)
      if (column?.kind && column.summary.values !== null)
        literals[index] = { kind: column.kind, values: column.summary.values }
    }
    for (const group of cases.groups) {
      const selected = indices.flatMap((index) => {
        const position = group.columns.indexOf(outputs[index]!.origins![0]!.column)
        return position < 0 ? [] : [{ index, position }]
      })
      if (selected.length < 2) continue
      const merged = projectCases(
        group,
        selected.map(({ position }) => position),
        cases,
        origin.optional,
      )
      if (merged.length < 2) continue
      groups.push({
        columns: selected.map(({ index }) => index),
        kinds: selected.map(
          ({ position }) => cases.columns.get(group.columns[position]!)?.kind ?? null,
        ),
        cases: merged,
      })
    }
  }
  // A set operation's column holds a row from one of its branches: it takes
  // the union of the branches' literals when each branch passes a column with
  // literals through.
  outputs.forEach((output, index) => {
    if (!output.origins || output.origins.length < 2) return
    const sets = output.origins.map((origin) => {
      if (!origin) return null
      const column = tableCheckCases(catalog, origin.schema, origin.table, 'stored').columns.get(
        origin.column,
      )
      return column?.kind && column.summary.values !== null
        ? { kind: column.kind, values: column.summary.values }
        : null
    })
    if (sets.some((set) => set === null || set.kind !== sets[0]!.kind)) return
    literals[index] = {
      kind: sets[0]!.kind,
      values: [...new Set(sets.flatMap((set) => set!.values))].sort(),
    }
  })
  if (groups.length === 0 && literals.every((item) => item === null)) return undefined
  return { literals, groups }
}

/**
 * A table's own columns as a row type sees them: the literal sets and case
 * groups of its stored rows, or of the rows a write may store.
 */
export function tableColumnCases(
  catalog: CheckCaseCatalog,
  schema: string,
  table: string,
  columns: readonly string[],
  reading: CheckCaseReading,
): OutputCheckCases | undefined {
  const cases = tableCheckCases(catalog, schema, table, reading)
  const literals = columns.map((name): OutputLiterals | null => {
    const column = cases.columns.get(name)
    return column?.kind && column.summary.values !== null
      ? { kind: column.kind, values: column.summary.values }
      : null
  })
  const groups = cases.groups.flatMap((group): OutputCaseGroup[] => {
    const indices = group.columns.map((name) => columns.indexOf(name))
    if (indices.some((index) => index < 0)) return []
    const order = indices.map((_, position) => position).sort((a, b) => indices[a]! - indices[b]!)
    return [
      {
        columns: order.map((position) => indices[position]!),
        kinds: order.map((position) => cases.columns.get(group.columns[position]!)?.kind ?? null),
        cases: group.cases.map((member) => order.map((position) => member[position]!)),
      },
    ]
  })
  if (groups.length === 0 && literals.every((item) => item === null)) return undefined
  return { literals, groups }
}
