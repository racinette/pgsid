import { catalogIdentifierSql as identifier } from '../catalog-identities.js'
import type { PGlite } from '@electric-sql/pglite'

export interface BuiltinTypeComparison {
  identity: string
  collation: string | null
  btreeClass: string | null
  hashClass: string | null
  equality: string | null
  comparator: string | null
  hash: string | null
  hashExtended: string | null
}

export interface CapturedTypeComparison extends BuiltinTypeComparison {
  equalityImplementation: string | null
  equalityAvailable?: boolean
  comparisonAvailable?: boolean
}

type Support = {
  opclass: string
  equality_schema: string | null
  equality_name: string | null
  equality_left: string | null
  equality_right: string | null
  equality_function_schema: string | null
  equality_function_name: string | null
  equality_function_args: string[] | null
  comparator_schema: string | null
  comparator_name: string | null
  comparator_args: string[] | null
  extended_schema: string | null
  extended_name: string | null
  extended_args: string[] | null
}
const typeIdentity = `SELECT ${identifier('n.nspname')}||'.'||${identifier('t.typname')} FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=`

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
  const comparisons = await readTypeComparisons(pg, [
    ...types,
    { identity: 'pg_catalog.anyenum', collation: null },
    { identity: 'pg_catalog.anyarray', collation: null },
  ])
  return comparisons.map(({ equalityImplementation: _implementation, ...comparison }) => comparison)
}

export async function readTypeComparisons(
  pg: PGlite,
  types: readonly { identity: string; collation: string | null }[],
  captureAvailability = false,
): Promise<CapturedTypeComparison[]> {
  const rows: CapturedTypeComparison[] = []
  for (const { identity, collation } of types) {
    const supports: Record<string, Support | null> = { btree: null, hash: null }
    let equalityAvailable: boolean | undefined, comparisonAvailable: boolean | undefined
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
          if (identity === 'pg_catalog.anyarray') type = 'pg_catalog.int4[]'
          await tx.exec(`CREATE TEMP TABLE _pgsid_type_comparison_probe(value ${type})`)
          if (captureAvailability && method === 'btree') {
            for (const operation of ['record_eq', 'btrecordcmp']) {
              await tx.exec('SAVEPOINT _pgsid_comparison_availability')
              let available = true
              try {
                await tx.exec(
                  `SELECT pg_catalog.${operation}(
                    ROW((SELECT value FROM _pgsid_type_comparison_probe LIMIT 1)),
                    ROW((SELECT value FROM _pgsid_type_comparison_probe LIMIT 1)))`,
                )
              } catch (error) {
                if (
                  !error ||
                  typeof error !== 'object' ||
                  !('code' in error) ||
                  error.code !== '42883'
                )
                  throw error
                await tx.exec('ROLLBACK TO SAVEPOINT _pgsid_comparison_availability')
                available = false
              }
              await tx.exec('RELEASE SAVEPOINT _pgsid_comparison_availability')
              if (operation === 'record_eq') equalityAvailable = available
              else comparisonAvailable = available
            }
          }
          await tx.exec(
            `CREATE INDEX _pgsid_type_comparison_index ON _pgsid_type_comparison_probe USING ${method}(value)`,
          )
          const result =
            await tx.query<Support>(`SELECT ${identifier('n.nspname')}||'.'||${identifier('c.opcname')} AS opclass,
            en.nspname AS equality_schema,e.oprname AS equality_name,
            (${typeIdentity} e.oprleft) AS equality_left,(${typeIdentity} e.oprright) AS equality_right,
            efn.nspname AS equality_function_schema,ef.proname AS equality_function_name,
            (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.o) FROM unnest(ef.proargtypes) WITH ORDINALITY u(t,o)) AS equality_function_args,
            pn.nspname AS comparator_schema,p.proname AS comparator_name,
            (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.o) FROM unnest(p.proargtypes) WITH ORDINALITY u(t,o)) AS comparator_args,
            xn.nspname AS extended_schema,x.proname AS extended_name,
            (SELECT array_agg((${typeIdentity} u.t) ORDER BY u.o) FROM unnest(x.proargtypes) WITH ORDINALITY u(t,o)) AS extended_args
            FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid
            JOIN pg_opclass c ON c.oid=i.indclass[0] JOIN pg_namespace n ON n.oid=c.opcnamespace
            JOIN pg_am a ON a.oid=c.opcmethod
            LEFT JOIN pg_amop o ON o.amopfamily=c.opcfamily AND o.amoplefttype=c.opcintype AND o.amoprighttype=c.opcintype AND o.amoppurpose='s' AND o.amopstrategy=CASE WHEN a.amname='btree' THEN 3 ELSE 1 END
            LEFT JOIN pg_operator e ON e.oid=o.amopopr LEFT JOIN pg_namespace en ON en.oid=e.oprnamespace
            LEFT JOIN pg_proc ef ON ef.oid=e.oprcode LEFT JOIN pg_namespace efn ON efn.oid=ef.pronamespace
            LEFT JOIN pg_amproc ap ON ap.amprocfamily=c.opcfamily AND ap.amproclefttype=c.opcintype AND ap.amprocrighttype=c.opcintype AND ap.amprocnum=1
            LEFT JOIN pg_proc p ON p.oid=ap.amproc LEFT JOIN pg_namespace pn ON pn.oid=p.pronamespace
            LEFT JOIN pg_amproc xp ON a.amname='hash' AND xp.amprocfamily=c.opcfamily AND xp.amproclefttype=c.opcintype AND xp.amprocrighttype=c.opcintype AND xp.amprocnum=2
            LEFT JOIN pg_proc x ON x.oid=xp.amproc LEFT JOIN pg_namespace xn ON xn.oid=x.pronamespace
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
      equalityImplementation: equality?.equality_function_name
        ? `function:${JSON.stringify([equality.equality_function_schema, equality.equality_function_name])}(${(equality.equality_function_args ?? []).join(',')})`
        : null,
      ...(captureAvailability ? { equalityAvailable, comparisonAvailable } : {}),
      comparator: btree?.comparator_name
        ? `function:${JSON.stringify([btree.comparator_schema, btree.comparator_name])}(${(btree.comparator_args ?? []).join(',')})`
        : null,
      hash: hash?.comparator_name
        ? `function:${JSON.stringify([hash.comparator_schema, hash.comparator_name])}(${(hash.comparator_args ?? []).join(',')})`
        : null,
      hashExtended: hash?.extended_name
        ? `function:${JSON.stringify([hash.extended_schema, hash.extended_name])}(${(hash.extended_args ?? []).join(',')})`
        : null,
    })
  }
  return rows.sort((a, b) => (a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0))
}
