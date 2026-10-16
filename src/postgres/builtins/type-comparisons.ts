import type { PGlite } from '@electric-sql/pglite'

export interface BuiltinTypeComparison {
  identity: string
  collation: string | null
  btreeClass: string | null
  hashClass: string | null
  equality: string | null
  comparator: string | null
}

type Support = {
  opclass: string
  equality_schema: string | null
  equality_name: string | null
  equality_left: string | null
  equality_right: string | null
  comparator_schema: string | null
  comparator_name: string | null
  comparator_args: string[] | null
}
const typeIdentity = `SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=`

export async function readBuiltinTypeComparisons(pg: PGlite): Promise<BuiltinTypeComparison[]> {
  const types = (
    await pg.query<{
      identity: string
      collation: string | null
    }>(`SELECT quote_ident(n.nspname)||'.'||quote_ident(t.typname) AS identity,
    (SELECT quote_ident(cn.nspname)||'.'||quote_ident(c.collname) FROM pg_collation c JOIN pg_namespace cn ON cn.oid=c.collnamespace WHERE c.oid=t.typcollation) AS collation
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='pg_catalog' AND t.typtype<>'p' AND t.typcategory<>'A' ORDER BY 1`)
  ).rows
  const rows: BuiltinTypeComparison[] = []
  for (const { identity, collation } of [
    ...types,
    { identity: 'pg_catalog.anyenum', collation: null },
  ]) {
    const supports: Record<string, Support | null> = { btree: null, hash: null }
    for (const method of ['btree', 'hash']) {
      try {
        await pg.transaction(async (tx) => {
          let type = identity
          if (identity === 'pg_catalog.anyenum') {
            await tx.exec('CREATE TEMP TABLE _pgsid_type_comparison_init(value integer)')
            await tx.exec(
              "CREATE TYPE pg_temp._pgsid_type_comparison_enum AS ENUM ('first','second')",
            )
            type = 'pg_temp._pgsid_type_comparison_enum'
          }
          await tx.exec(`CREATE TEMP TABLE _pgsid_type_comparison_probe(value ${type})`)
          await tx.exec(
            `CREATE INDEX _pgsid_type_comparison_index ON _pgsid_type_comparison_probe USING ${method}(value)`,
          )
          const result =
            await tx.query<Support>(`SELECT quote_ident(n.nspname)||'.'||quote_ident(c.opcname) AS opclass,
            en.nspname AS equality_schema,e.oprname AS equality_name,
            (${typeIdentity} e.oprleft) AS equality_left,(${typeIdentity} e.oprright) AS equality_right,
            pn.nspname AS comparator_schema,p.proname AS comparator_name,
            (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.o) FROM unnest(p.proargtypes) WITH ORDINALITY u(t,o)) AS comparator_args
            FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid
            JOIN pg_opclass c ON c.oid=i.indclass[0] JOIN pg_namespace n ON n.oid=c.opcnamespace
            JOIN pg_am a ON a.oid=c.opcmethod
            LEFT JOIN pg_amop o ON o.amopfamily=c.opcfamily AND o.amoplefttype=c.opcintype AND o.amoprighttype=c.opcintype AND o.amoppurpose='s' AND o.amopstrategy=CASE WHEN a.amname='btree' THEN 3 ELSE 1 END
            LEFT JOIN pg_operator e ON e.oid=o.amopopr LEFT JOIN pg_namespace en ON en.oid=e.oprnamespace
            LEFT JOIN pg_amproc ap ON a.amname='btree' AND ap.amprocfamily=c.opcfamily AND ap.amproclefttype=c.opcintype AND ap.amprocrighttype=c.opcintype AND ap.amprocnum=1
            LEFT JOIN pg_proc p ON p.oid=ap.amproc LEFT JOIN pg_namespace pn ON pn.oid=p.pronamespace
            WHERE i.indrelid='pg_temp._pgsid_type_comparison_probe'::regclass`)
          if (result.rows.length !== 1)
            throw new Error(
              `Default comparison index did not select one operator class: ${identity}/${method}`,
            )
          supports[method] = result.rows[0]!
          await tx.rollback()
        })
      } catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '42704')
          throw error
      }
    }
    const btree = supports['btree'],
      hash = supports['hash']
    const equality = btree?.equality_name ? btree : hash
    rows.push({
      identity,
      collation,
      btreeClass: btree?.opclass ?? null,
      hashClass: hash?.opclass ?? null,
      equality: equality?.equality_name
        ? `operator:${JSON.stringify([equality.equality_schema, equality.equality_name])}(${equality.equality_left},${equality.equality_right})`
        : null,
      comparator: btree?.comparator_name
        ? `function:${JSON.stringify([btree.comparator_schema, btree.comparator_name])}(${(btree.comparator_args ?? []).join(',')})`
        : null,
    })
  }
  return rows.sort((a, b) => (a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0))
}
