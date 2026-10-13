import { parse } from 'libpg-query'

export const description = 'independent INSERT cases for generated CHECK evaluator parity'

export const rule = `Write independent, single-row INSERT VALUES statements with explicit
column lists and constant scalar inputs. Use literals and casts of literals;
fixed interval timezone conversions may construct SQL-coerced temporal values
that text input cannot represent. Include accepted and rejected rows using the
world's seeded foreign keys. PostgreSQL supplies the expected outcomes; do not
record them in annotations. Every statement runs against the seed state and is
rolled back. Name cases with SQL name comments for readable failure reports.`

const castType = (node) =>
  node?.TypeCast?.typeName?.names?.map((part) => part.String?.sval ?? '').join('.')

export const constantInput = (node) => {
  if (node?.A_Const) return true
  if (node?.TypeCast) return constantInput(node.TypeCast.arg)
  const call = node?.FuncCall
  const name = call?.funcname?.map((part) => part.String?.sval ?? '').join('.')
  return Boolean(
    ['timezone', 'pg_catalog.timezone'].includes(name) &&
    call.args?.length === 2 &&
    ['interval', 'pg_catalog.interval'].includes(castType(call.args[0])) &&
    ['timetz', 'timestamp', 'timestamptz'].some((type) =>
      [type, 'pg_catalog.' + type].includes(castType(call.args[1])),
    ) &&
    call.args.every(constantInput),
  )
}

export async function lint({ read, emit }) {
  const text = await read()
  try {
    const parsed = await parse(text)
    const names = [...text.matchAll(/^--\s*name:\s*(\S+)\s*$/gm)].map((match) => match[1])
    if (names.length !== (parsed.stmts?.length ?? 0) || new Set(names).size !== names.length)
      emit({
        code: 'check_seed_names',
        message: 'Every CHECK case needs a unique SQL name comment',
        line: 1,
      })
    if (!parsed.stmts?.length)
      emit({
        code: 'check_seed_empty',
        message: 'CHECK cases must contain INSERT statements',
        line: 1,
      })
    for (const raw of parsed.stmts ?? []) {
      const insert = raw.stmt?.InsertStmt
      const rows = insert?.selectStmt?.SelectStmt?.valuesLists
      if (
        !insert?.cols?.length ||
        rows?.length !== 1 ||
        insert.withClause ||
        insert.onConflictClause
      )
        emit({
          code: 'check_seed_insert_shape',
          message: 'CHECK cases require a single-row INSERT VALUES with an explicit column list',
          line: text.slice(0, raw.stmt_location ?? 0).split('\n').length,
        })
      if (rows?.[0]?.List?.items?.some((node) => !constantInput(node)))
        emit({
          code: 'check_seed_literal',
          message:
            'CHECK cases require literal inputs or constant fixed interval timezone conversions',
          line: text.slice(0, raw.stmt_location ?? 0).split('\n').length,
        })
    }
  } catch (error) {
    emit({ code: 'check_seed_parse', message: error.message, line: 1 })
  }
}
