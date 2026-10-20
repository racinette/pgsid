import type { PGlite } from '@electric-sql/pglite'
import type { Node } from 'libpg-query'
import { parseSql } from '../../src/ast.js'
import { deparseWorldSql } from '../../scripts/check-measurements/worlds.js'

const quote = (name: string): string => '"' + name.replaceAll('"', '""') + '"'

export class WorldCheckOracles {
  private readonly functions = new Map<
    string,
    {
      name: string
      schema: string
      relation: string
      ownerSchema: string
      ownerRelation: string
      constraint: string
      columns: string[]
    }
  >()
  private nextFunction = 0

  expression(identity: string, candidate: string): string {
    const oracle = this.functions.get(identity)
    if (!oracle) throw new Error(`Missing parsed world CHECK oracle: ${identity}`)
    const row = oracle.columns.map((column) => `${candidate}.${quote(column)}`).join(',')
    return `${oracle.name}(ROW(${row})::${quote(oracle.schema)}.${quote(oracle.relation)})`
  }

  async load(pg: PGlite, source: string, schema: string): Promise<void> {
    const parsed = await parseSql(source)
    const rewrite = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      const record = value as Record<string, unknown>
      if (record['schemaname'] === 'public') record['schemaname'] = schema
      const setting = record['VariableSetStmt'] as { name?: string; args?: Node[] } | undefined
      if (setting?.name === 'search_path')
        for (const arg of setting.args ?? [])
          if ('A_Const' in arg && arg.A_Const.sval?.sval === 'public')
            arg.A_Const.sval.sval = schema
      for (const child of Object.values(record)) rewrite(child)
    }
    rewrite(parsed)
    for (const raw of parsed.stmts ?? []) {
      const statement = raw.stmt!
      await pg.exec(deparseWorldSql(statement))
      const checks: { schema: string; relation: string; name: string; expression: string }[] = []
      const capture = (
        relation: { relname?: string; schemaname?: string },
        nodes: readonly Node[],
      ): void => {
        for (const node of nodes) {
          if ('ColumnDef' in node) capture(relation, node.ColumnDef.constraints ?? [])
          if (
            'Constraint' in node &&
            node.Constraint.contype === 'CONSTR_CHECK' &&
            node.Constraint.conname &&
            node.Constraint.raw_expr &&
            relation.relname
          )
            checks.push({
              schema: relation.schemaname ?? schema,
              relation: relation.relname,
              name: node.Constraint.conname,
              expression: deparseWorldSql(node.Constraint.raw_expr),
            })
        }
      }
      if ('CreateStmt' in statement) {
        capture(statement.CreateStmt.relation!, statement.CreateStmt.tableElts ?? [])
        const relation = statement.CreateStmt.relation!,
          owner = relation.schemaname ?? schema
        const parents = await pg.query<{ schema: string; relation: string }>(
          `SELECT n.nspname AS schema,p.relname AS relation
           FROM pg_catalog.pg_inherits i
           JOIN pg_catalog.pg_class p ON p.oid=i.inhparent
           JOIN pg_catalog.pg_namespace n ON n.oid=p.relnamespace
           WHERE i.inhrelid=$1::regclass ORDER BY i.inhseqno`,
          [`${quote(owner)}.${quote(relation.relname!)}`],
        )
        for (const parent of parents.rows)
          for (const oracle of [...this.functions.values()])
            if (oracle.ownerSchema === parent.schema && oracle.ownerRelation === parent.relation)
              this.functions.set(`${owner}.${relation.relname}.${oracle.constraint}`, {
                ...oracle,
                ownerSchema: owner,
                ownerRelation: relation.relname!,
              })
      }
      if ('AlterTableStmt' in statement)
        for (const command of statement.AlterTableStmt.cmds ?? [])
          if ('AlterTableCmd' in command && command.AlterTableCmd.def)
            capture(statement.AlterTableStmt.relation!, [command.AlterTableCmd.def])
      for (const check of checks) {
        const name = `pg_temp.${quote('pgsid_check_' + this.nextFunction++)}`
        const columns = (
          await pg.query<{ name: string }>(
            `SELECT attname AS name FROM pg_catalog.pg_attribute
             WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum`,
            [`${quote(check.schema)}.${quote(check.relation)}`],
          )
        ).rows.map((column) => column.name)
        // SQL-standard bodies retain parsed constants across later domain changes.
        // Materialization prevents argument values from pruning earlier input errors.
        await pg.exec(`CREATE FUNCTION ${name}(__pgsid_row ${quote(check.schema)}.${quote(check.relation)})
          RETURNS boolean LANGUAGE SQL BEGIN ATOMIC
            WITH candidate AS MATERIALIZED (SELECT (__pgsid_row).*)
            SELECT (${check.expression})::boolean FROM candidate;
          END`)
        this.functions.set(`${check.schema}.${check.relation}.${check.name}`, {
          name,
          schema: check.schema,
          relation: check.relation,
          ownerSchema: check.schema,
          ownerRelation: check.relation,
          constraint: check.name,
          columns,
        })
      }
    }
  }
}
