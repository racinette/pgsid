import type { PGlite } from '@electric-sql/pglite'
import { callableIdentity, type BuiltinCatalog } from '../postgres/builtins/catalog.js'
import { parseTree, type Value } from './expression-tree.js'
import type { StoredRowFunction, StoredRowOperator } from './stored-row-expressions.js'

export async function readStoredRowFunctions(
  pg: PGlite,
  sources: readonly string[],
  types: ReadonlyMap<number, string>,
  catalog: Pick<BuiltinCatalog, 'functions' | 'operators'>,
): Promise<{
  functions: ReadonlyMap<number, StoredRowFunction>
  operators: ReadonlyMap<number, StoredRowOperator>
  sources: string[]
}> {
  const pending = new Set<number>(),
    seen = new Set<number>(),
    functions = new Map<number, StoredRowFunction>(),
    defaults: string[] = [],
    collect = (source: string) => {
      for (const match of source.matchAll(/:(?:funcid|opfuncid)\s+(\d+)/gu)) {
        const id = Number(match[1])
        if (!seen.has(id)) pending.add(id)
      }
    }
  sources.forEach(collect)
  while (pending.size) {
    const ids = [...pending]
    pending.clear()
    ids.forEach((id) => seen.add(id))
    const rows = (
      await pg.query<{
        oid: number
        name: string
        args: number[]
        result: number
        default_count: number
        defaults: string | null
      }>(
        `SELECT p.oid,p.proname AS name,p.proargtypes::oid[] AS args,p.prorettype AS result,
         p.pronargdefaults AS default_count,p.proargdefaults::text AS defaults
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='pg_catalog' AND p.oid=ANY($1::oid[]) AND p.prokind='f' AND NOT p.proretset`,
        [ids],
      )
    ).rows
    for (const row of rows) {
      const args = row.args.map((oid) => types.get(oid)),
        result = types.get(row.result),
        match = catalog.functions.find(
          ({ metadata: m }) =>
            m.kind === 'function' &&
            m.schema === 'pg_catalog' &&
            m.name === row.name &&
            m.result === result &&
            JSON.stringify(m.args) === JSON.stringify(args) &&
            m.variadic === null,
        )
      if (!match) continue
      let expressions: readonly Value[] | undefined = row.default_count === 0 ? [] : undefined
      if (row.defaults) {
        defaults.push(row.defaults)
        collect(row.defaults)
        try {
          const parsed = parseTree(row.defaults)
          if (
            Array.isArray(parsed) &&
            parsed.length === row.default_count &&
            parsed.length <= args.length
          )
            expressions = parsed
        } catch {
          expressions = undefined
        }
      }
      functions.set(row.oid, {
        signature: callableIdentity(match.metadata),
        args: match.metadata.args,
        result: match.metadata.result,
        defaults: expressions,
      })
    }
  }
  const ids = [
      ...new Set(
        [...sources, ...defaults].flatMap((source) =>
          [...source.matchAll(/:opno\s+(\d+)/gu)].map((match) => Number(match[1])),
        ),
      ),
    ],
    operators = new Map<number, StoredRowOperator>()
  if (ids.length) {
    const rows = (
      await pg.query<{
        oid: number
        name: string
        left_type: number
        right_type: number
        result: number
        implementation: number
      }>(
        `SELECT o.oid,o.oprname AS name,o.oprleft AS left_type,o.oprright AS right_type,
        o.oprresult AS result,o.oprcode::oid AS implementation
      FROM pg_operator o JOIN pg_namespace n ON n.oid=o.oprnamespace
      WHERE n.nspname='pg_catalog' AND o.oid=ANY($1::oid[])`,
        [ids],
      )
    ).rows
    for (const row of rows) {
      const implementation = functions.get(row.implementation),
        match =
          implementation &&
          catalog.operators.find(
            ({ metadata: m }) =>
              m.schema === 'pg_catalog' &&
              m.name === row.name &&
              m.left === types.get(row.left_type) &&
              m.right === types.get(row.right_type) &&
              m.result === types.get(row.result) &&
              m.implementation === implementation.signature,
          )
      if (match)
        operators.set(row.oid, {
          signature: callableIdentity(match.metadata),
          implementation: implementation!.signature,
        })
    }
  }
  return { functions, operators, sources: defaults }
}
