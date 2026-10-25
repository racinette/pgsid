import type { PGlite } from '@electric-sql/pglite'
import { parseTree, tree, scalar, oidList, type Value } from './expression-tree.js'

export interface StoredRowOrdering {
  operator: string
  family: string
  strategy: 1 | 2 | 4 | 5
  comparator: string
}

export const storedOrderingKey = (operator: number, family: number, strategy: number): string =>
  JSON.stringify([operator, family, strategy])

export async function readStoredRowOrderings(
  pg: PGlite,
  sources: readonly string[],
  types: ReadonlyMap<number, string>,
): Promise<Map<string, Omit<StoredRowOrdering, 'comparator'> & { functionId: number }>> {
  const requests = new Map<string, { operator: number; family: number; strategy: number }>(),
    visit = (value: Value): void => {
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      const node = tree(value)
      if (!node) return
      if (node.kind === 'ROWCOMPAREEXPR') {
        const operators = oidList(node, 'opnos'),
          families = oidList(node, 'opfamilies'),
          strategy = Number(scalar(node, 'cmptype'))
        if (
          operators?.length &&
          operators.length === families?.length &&
          [1, 2, 4, 5].includes(strategy)
        )
          operators.forEach((operator, i) =>
            requests.set(storedOrderingKey(operator, families[i]!, strategy), {
              operator,
              family: families[i]!,
              strategy,
            }),
          )
      }
      Object.values(node.fields).forEach((values) => values.forEach(visit))
    }
  for (const source of sources)
    if (source.includes('{ROWCOMPAREEXPR')) {
      try {
        visit(parseTree(source))
      } catch {
        continue
      }
    }
  const result = new Map<string, Omit<StoredRowOrdering, 'comparator'> & { functionId: number }>()
  if (!requests.size) return result
  const pending = [...requests.values()],
    rows = (
      await pg.query<{
        operator_id: number
        family_id: number
        strategy: 1 | 2 | 4 | 5
        schema: string
        name: string
        left_type: number
        right_type: number
        result: number
        family: string
        function_id: number
      }>(
        `SELECT r.operator_id,r.family_id,r.strategy::int,o_ns.nspname AS schema,o.oprname AS name,
       o.oprleft AS left_type,o.oprright AS right_type,o.oprresult AS result,
       quote_ident(f_ns.nspname)||'.'||quote_ident(f.opfname) AS family,p.amproc::oid AS function_id
     FROM unnest($1::oid[],$2::oid[],$3::smallint[]) r(operator_id,family_id,strategy)
     JOIN pg_operator o ON o.oid=r.operator_id JOIN pg_namespace o_ns ON o_ns.oid=o.oprnamespace
     JOIN pg_opfamily f ON f.oid=r.family_id JOIN pg_namespace f_ns ON f_ns.oid=f.opfnamespace
     JOIN pg_am a ON a.oid=f.opfmethod AND a.amname='btree'
     JOIN pg_amop m ON m.amopfamily=f.oid AND m.amopopr=o.oid AND m.amopstrategy=r.strategy
       AND m.amoplefttype=o.oprleft AND m.amoprighttype=o.oprright AND m.amoppurpose='s' AND m.amopmethod=a.oid
     JOIN pg_amproc p ON p.amprocfamily=f.oid AND p.amproclefttype=o.oprleft
       AND p.amprocrighttype=o.oprright AND p.amprocnum=1`,
        [
          pending.map((r) => r.operator),
          pending.map((r) => r.family),
          pending.map((r) => r.strategy),
        ],
      )
    ).rows
  for (const row of rows) {
    const left = types.get(row.left_type),
      right = types.get(row.right_type)
    if (!left || !right || types.get(row.result) !== 'pg_catalog.bool') continue
    result.set(storedOrderingKey(row.operator_id, row.family_id, row.strategy), {
      operator: `operator:${JSON.stringify([row.schema, row.name])}(${left},${right})`,
      family: row.family,
      strategy: row.strategy,
      functionId: row.function_id,
    })
  }
  return result
}
