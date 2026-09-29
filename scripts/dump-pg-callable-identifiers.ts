import { mkdir, writeFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import {
  assertUniqueRustCallableNames,
  rustCallableName,
  type PgFunctionIdentity,
} from '../src/postgres/builtins/rust-name.js'

interface FunctionRow extends PgFunctionIdentity {
  oid: string
  kind: 'f' | 'a' | 'w' | 'p'
  result: string
}

interface OperatorRow {
  schema: string
  name: string
  left_type: string | null
  right_type: string | null
  function_oid: string
  result: string
}

const targetName = (name: string): string =>
  name
    .split('_')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('')

const pg = await PGlite.create()
try {
  const [version, functionResult, operatorResult] = await Promise.all([
    pg.query<{ server_version_num: string }>('SHOW server_version_num'),
    pg.query<FunctionRow>(`
      SELECT p.oid::text AS oid, p.prokind AS kind, n.nspname AS schema,
        p.proname AS name,
        ARRAY(
          SELECT format('%I.%I', an.nspname, at.typname)
          FROM unnest(p.proargtypes) WITH ORDINALITY AS arg(type_oid, position)
          JOIN pg_type at ON at.oid = arg.type_oid
          JOIN pg_namespace an ON an.oid = at.typnamespace
          ORDER BY arg.position
        ) AS args,
        format('%I.%I', rn.nspname, rt.typname) AS result
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_type rt ON rt.oid = p.prorettype
      JOIN pg_namespace rn ON rn.oid = rt.typnamespace
      ORDER BY n.nspname, p.proname, p.oid
    `),
    pg.query<OperatorRow>(`
      SELECT n.nspname AS schema, o.oprname AS name,
        CASE WHEN o.oprleft <> 0 THEN format('%I.%I', ln.nspname, lt.typname) END AS left_type,
        CASE WHEN o.oprright <> 0 THEN format('%I.%I', rn.nspname, rt.typname) END AS right_type,
        o.oprcode::oid::text AS function_oid,
        format('%I.%I', onamespace.nspname, result_type.typname) AS result
      FROM pg_operator o
      JOIN pg_namespace n ON n.oid = o.oprnamespace
      LEFT JOIN pg_type lt ON lt.oid = o.oprleft
      LEFT JOIN pg_namespace ln ON ln.oid = lt.typnamespace
      LEFT JOIN pg_type rt ON rt.oid = o.oprright
      LEFT JOIN pg_namespace rn ON rn.oid = rt.typnamespace
      JOIN pg_type result_type ON result_type.oid = o.oprresult
      JOIN pg_namespace onamespace ON onamespace.oid = result_type.typnamespace
      ORDER BY n.nspname, o.oprname, o.oid
    `),
  ])

  const functions = functionResult.rows
  const operators = operatorResult.rows
  const functionsByOid = new Map(functions.map((row) => [row.oid, row]))
  assertUniqueRustCallableNames(functions)

  const lines = [
    [
      'kind',
      'schema',
      'name',
      'arguments',
      'result',
      'function_schema',
      'function_name',
      'function_arguments',
      'rust_name',
      'typescript_name',
      'go_name',
    ].join('\t'),
  ]
  const add = (
    kind: string,
    schema: string,
    name: string,
    args: readonly string[],
    result: string,
    implementation: FunctionRow,
  ): void => {
    const rustName = rustCallableName(implementation)
    lines.push(
      [
        kind,
        schema,
        name,
        args.join(', '),
        result,
        implementation.schema,
        implementation.name,
        implementation.args.join(', '),
        rustName,
        targetName(rustName),
        targetName(rustName).replace(/^./u, (first) => first.toUpperCase()),
      ].join('\t'),
    )
  }
  for (const row of functions)
    add(
      { f: 'function', a: 'aggregate', w: 'window', p: 'procedure' }[row.kind],
      row.schema,
      row.name,
      row.args,
      row.result,
      row,
    )
  for (const row of operators) {
    const implementation = functionsByOid.get(row.function_oid)
    if (!implementation) throw new Error(`Missing implementation for ${row.schema}.${row.name}`)
    const args = [row.left_type, row.right_type].filter((type): type is string => type !== null)
    if (args.join(',') !== implementation.args.join(','))
      throw new Error(`Operator arguments differ from implementation: ${row.schema}.${row.name}`)
    add('operator', row.schema, row.name, args, row.result, implementation)
  }

  const output = new URL('../artifacts/check-rust-spike/catalog-identifiers.tsv', import.meta.url)
  await mkdir(new URL('.', output), { recursive: true })
  await writeFile(output, lines.slice(0, 1).concat(lines.slice(1).sort()).join('\n') + '\n')
  const summary = {
    serverVersion: Number(version.rows[0]?.server_version_num),
    functions: functions.length,
    operators: operators.length,
    operatorImplementations: new Set(operators.map((row) => row.function_oid)).size,
    maxRustNameLength: Math.max(...functions.map((row) => rustCallableName(row).length)),
  }
  await writeFile(
    new URL('../artifacts/check-rust-spike/catalog-identifiers-summary.json', import.meta.url),
    JSON.stringify(summary, null, 2) + '\n',
  )
  console.log(JSON.stringify(summary, null, 2))
} finally {
  await pg.close()
}
