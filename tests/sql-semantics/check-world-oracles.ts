import type { PGlite } from '@electric-sql/pglite'
import type { Node } from 'libpg-query'
import { parseSql } from '../../src/ast.js'
import { deparseWorldSql } from '../../scripts/check-measurements/worlds.js'

const quote = (name: string): string => '"' + name.replaceAll('"', '""') + '"'

type CheckOracle = {
  name: string
  schema: string
  relation: string
  ownerSchema: string
  ownerRelation: string
  constraint: string
  columns: string[]
}

export class WorldCheckOracles {
  private readonly functions = new Map<string, CheckOracle>()
  private nextFunction = 0

  expression(identity: string, candidate: string): string {
    const oracle = this.functions.get(identity)
    if (!oracle) throw new Error(`Missing parsed world CHECK oracle: ${identity}`)
    const row = oracle.columns.map((column) => `${candidate}.${quote(column)}`).join(',')
    const target = `${quote(oracle.ownerSchema)}.${quote(oracle.ownerRelation)}`
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "''")
    return `${oracle.name}(ROW(${row})::${quote(oracle.schema)}.${quote(oracle.relation)},E'${target}'::pg_catalog.regclass::pg_catalog.oid)`
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
      const refresh: CheckOracle[] = []
      if ('AlterTableStmt' in statement && statement.AlterTableStmt.objtype === 'OBJECT_TYPE') {
        const alter = statement.AlterTableStmt,
          attributes = (alter.cmds ?? []).flatMap((command) =>
            'AlterTableCmd' in command &&
            command.AlterTableCmd.subtype === 'AT_AlterColumnType' &&
            command.AlterTableCmd.name
              ? [command.AlterTableCmd.name]
              : [],
          )
        if (attributes.length) {
          const dependencies = await pg.query<{ name: string }>(
              `SELECT DISTINCT p.proname AS name
               FROM pg_catalog.pg_depend d
               JOIN pg_catalog.pg_proc p ON p.oid=d.objid
               JOIN pg_catalog.pg_attribute a ON a.attrelid=d.refobjid AND a.attnum=d.refobjsubid
               JOIN pg_catalog.pg_type t ON t.typrelid=a.attrelid
               WHERE d.classid='pg_catalog.pg_proc'::regclass
                 AND d.refclassid='pg_catalog.pg_class'::regclass
                 AND p.pronamespace=pg_my_temp_schema()
                 AND t.oid=$1::regtype AND a.attname=ANY($2::text[])`,
              [
                `${quote(alter.relation!.schemaname ?? schema)}.${quote(alter.relation!.relname!)}`,
                attributes,
              ],
            ),
            names = new Set(dependencies.rows.map((row) => `pg_temp.${quote(row.name)}`)),
            dropped = new Set<string>()
          for (const [identity, oracle] of this.functions)
            if (names.has(oracle.name)) {
              refresh.push(oracle)
              this.functions.delete(identity)
              if (!dropped.has(oracle.name)) {
                await pg.exec(
                  `DROP FUNCTION ${oracle.name}(${quote(oracle.schema)}.${quote(oracle.relation)},pg_catalog.oid)`,
                )
                dropped.add(oracle.name)
              }
            }
        }
      }
      await pg.exec(deparseWorldSql(statement))
      const checks: { schema: string; relation: string; name: string; expression: Node }[] = []
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
              expression: structuredClone(node.Constraint.raw_expr),
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
      for (const oracle of refresh) {
        const stored = await pg.query<{ definition: string }>(
            `SELECT pg_catalog.pg_get_constraintdef(oid) AS definition
             FROM pg_catalog.pg_constraint WHERE conrelid=$1::regclass AND conname=$2`,
            [`${quote(oracle.ownerSchema)}.${quote(oracle.ownerRelation)}`, oracle.constraint],
          ),
          definition = stored.rows[0]?.definition
        if (!definition) throw new Error('Missing rewritten world CHECK')
        const parsed = await parseSql(`ALTER TABLE _ ADD CONSTRAINT _ ${definition}`),
          statement = parsed.stmts![0]!.stmt!
        if (!('AlterTableStmt' in statement)) throw new Error('Invalid rewritten world CHECK')
        for (const command of statement.AlterTableStmt.cmds ?? [])
          if ('AlterTableCmd' in command && command.AlterTableCmd.def) {
            const constraint = command.AlterTableCmd.def
            if ('Constraint' in constraint) constraint.Constraint.conname = oracle.constraint
            capture({ schemaname: oracle.ownerSchema, relname: oracle.ownerRelation }, [constraint])
          }
      }
      for (const check of checks) {
        const name = `pg_temp.${quote('pgsid_check_' + this.nextFunction++)}`
        const columns = (
          await pg.query<{ name: string }>(
            `SELECT attname AS name FROM pg_catalog.pg_attribute
             WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum`,
            [`${quote(check.schema)}.${quote(check.relation)}`],
          )
        ).rows.map((column) => column.name)
        const fields = (x: unknown): Record<string, unknown> | null =>
          x !== null && typeof x === 'object' && !Array.isArray(x)
            ? (x as Record<string, unknown>)
            : null
        const rewriteRows = (node: unknown, expand = false): unknown => {
          if (Array.isArray(node)) return node.map((n) => rewriteRows(n, expand))
          const wrapper = fields(node)
          if (!wrapper) return node
          const ref = fields(wrapper['ColumnRef']),
            items = ref?.['fields']
          if (Array.isArray(items)) {
            const star = !!fields(items.at(-1))?.['A_Star'],
              names = items.map((n) => fields(fields(n)?.['String'])?.['sval']),
              qualifier = names.slice(0, -1),
              own = (ns: unknown[]) =>
                (ns.length === 1 && ns[0] === check.relation) ||
                (ns.length === 2 && ns[0] === check.schema && ns[1] === check.relation)
            if (
              !star &&
              names.at(-1) === 'tableoid' &&
              !columns.includes('tableoid') &&
              (names.length === 1 || own(qualifier))
            )
              return { ParamRef: { number: 2 } }
            if (
              (star && own(qualifier) && !expand) ||
              (!star &&
                names.length === 1 &&
                names[0] === check.relation &&
                !['tableoid', 'ctid', 'xmin', 'cmin', 'xmax', 'cmax'].includes(check.relation) &&
                !columns.includes(check.relation))
            )
              return { ParamRef: { number: 1 } }
            if (own(qualifier)) {
              if (!star && !columns.includes(names.at(-1) as string))
                return {
                  A_Indirection: { arg: { ParamRef: { number: 1 } }, indirection: [items.at(-1)] },
                }
              return {
                ColumnRef: { ...ref, fields: [{ String: { sval: check.relation } }, items.at(-1)] },
              }
            }
          }
          const row = fields(wrapper['RowExpr'])
          if (row)
            return {
              RowExpr: Object.fromEntries(
                Object.entries(row).map(([k, v]) => [k, rewriteRows(v, k === 'args')]),
              ),
            }
          return Object.fromEntries(Object.entries(wrapper).map(([k, v]) => [k, rewriteRows(v)]))
        }
        const expression = deparseWorldSql(rewriteRows(check.expression) as Node)
        // SQL-standard bodies retain parsed constants across later domain changes.
        // Materialization prevents argument values from pruning earlier input errors.
        await pg.exec(`CREATE FUNCTION ${name}(__pgsid_row ${quote(check.schema)}.${quote(check.relation)},__pgsid_tableoid pg_catalog.oid)
          RETURNS boolean LANGUAGE SQL BEGIN ATOMIC
            WITH candidate AS MATERIALIZED (SELECT ($1).*)
            SELECT (${expression})::boolean FROM candidate AS ${quote(check.relation)};
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
