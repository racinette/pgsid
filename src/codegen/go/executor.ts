import type { CatalogSnapshot } from '../../catalog/types.js'
import type { QueryAnalysisItem } from '../../query-analysis.js'
import { go, printGoFile, type GoDeclaration, type GoField, type GoStatement } from './ast.js'
import { runtimeSource } from './nulls.js'
import { goName } from './names.js'

const id = go.ident
const field = (name: string, type: ReturnType<typeof id>): GoField => ({ names: [name], type })
const result = (type: ReturnType<typeof id>): GoField => ({ type })
const member = (value: string, name: string) => go.selector(id(value), name)

export function renderGoExecutorInterface(catalog?: CatalogSnapshot, structs = false): string {
  const parameters = [
    field('ctx', member('context', 'Context')),
    field('sql', id('string')),
    field('args', go.ellipsis(go.any())),
  ]
  const names = [
    ...new Set(
      (catalog ? [...catalog.domains, ...catalog.enums, ...catalog.compositeTypes] : []).map(
        (item) => `"${item.schema.replaceAll('"', '""')}"."${item.name.replaceAll('"', '""')}"`,
      ),
    ),
  ].sort()
  const registration = names.length
    ? [
        go.variable('names', go.slice(id('string'))),
        go.assign(
          [id('err')],
          [
            go.call(
              go.selector(
                go.call(member('conn', 'QueryRow'), [
                  id('ctx'),
                  go.string(`WITH requested AS (
  SELECT to_regtype(name)::oid AS oid FROM unnest($1::text[]) AS name
)
SELECT ARRAY(
  SELECT n.nspname || '.' || t.typname
  FROM pg_catalog.pg_type AS t
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace
  WHERE t.oid IN (SELECT oid FROM requested)
     OR t.oid IN (
       SELECT base.typarray FROM pg_catalog.pg_type AS base
       JOIN requested ON requested.oid = base.oid
     )
  ORDER BY n.nspname, t.typname
)`),
                  go.composite(go.slice(id('string')), names.map(go.string)),
                ]),
                'Scan',
              ),
              [go.address(id('names'))],
            ),
          ],
        ),
        go.if(go.notEqual(id('err'), id('nil')), [go.return(id('err'))]),
        go.assign(
          [id('types'), id('err')],
          [go.call(member('conn', 'LoadTypes'), [id('ctx'), id('names')])],
        ),
        go.if(go.notEqual(id('err'), id('nil')), [go.return(id('err'))]),
        go.expression(
          go.call(go.selector(go.call(member('conn', 'TypeMap')), 'RegisterTypes'), [id('types')]),
        ),
        go.return(id('nil')),
      ]
    : [go.return(id('nil'))]
  return printGoFile({
    package: 'pgsidpgx',
    ...(structs ? { source: runtimeSource('null-pgx.go') } : {}),
    imports: [
      { path: 'context' },
      { path: 'github.com/jackc/pgx/v5' },
      { path: 'github.com/jackc/pgx/v5/pgconn' },
    ],
    declarations: [
      go.function(
        'RegisterTypes',
        [
          field('ctx', member('context', 'Context')),
          field('conn', go.pointer(member('pgx', 'Conn'))),
        ],
        [result(id('error'))],
        [
          ...(structs
            ? [go.expression(go.call(id('RegisterNulls'), [go.call(member('conn', 'TypeMap'))]))]
            : []),
          ...registration,
        ],
      ),
      go.type(
        'DBTX',
        go.interface([
          field(
            'Exec',
            go.functionType(parameters, [
              result(member('pgconn', 'CommandTag')),
              result(id('error')),
            ]),
          ),
          field(
            'Query',
            go.functionType(parameters, [result(member('pgx', 'Rows')), result(id('error'))]),
          ),
          field('QueryRow', go.functionType(parameters, [result(member('pgx', 'Row'))])),
        ]),
      ),
    ],
  })
}

export function renderGoExecutorBundle(
  packageName: string,
  helperImportPath: string,
  structs = false,
): string {
  return printGoFile({
    package: packageName,
    imports: [{ path: helperImportPath, alias: 'pgsid' }],
    declarations: [
      go.type('Queries', go.struct([field('db', member('pgsid', 'DBTX'))])),
      go.function(
        'New',
        [field('db', member('pgsid', 'DBTX'))],
        [result(go.pointer(id('Queries')))],
        [
          ...(structs ? [go.expression(go.call(member('pgsid', 'Prepare'), [id('db')]))] : []),
          go.return(go.address(go.composite(id('Queries'), [go.keyValue('db', id('db'))]))),
        ],
      ),
    ],
  })
}

export function goExecutorDeclaration(
  analysis: QueryAnalysisItem,
  parameterFields: readonly GoField[],
  outputFields: readonly GoField[],
  structs = false,
): GoDeclaration {
  const name = goName(analysis.query.name)
  const parameters = [field('ctx', member('context', 'Context'))]
  if (parameterFields.length) parameters.push(field('params', id(`${name}Params`)))
  const args = [
    id('ctx'),
    id(`${name}SQL`),
    ...parameterFields.map((item) =>
      item.sqlNullable
        ? go.call(member('pgsidpgx', item.sqlJson ? 'JSONValue' : 'Value'), [
            member('params', item.names![0]!),
          ])
        : member('params', item.names![0]!),
    ),
  ]
  const query = (method: string) => go.call(go.selector(member('q', 'db'), method), args)
  const scanTarget = (item: GoField) => {
    const target = go.address(member('row', item.names![0]!))
    if (item.jsonValidation)
      return go.call(member('pgsidpgx', 'ValidatedJSON'), [
        target,
        id(item.jsonValidation.spec),
        go.string(item.jsonValidation.query),
        go.string(item.jsonValidation.column),
        id(item.sqlNullable ? 'true' : 'false'),
      ])
    return item.sqlNullable ? go.call(member('pgsidpgx', 'Nullable'), [target]) : target
  }
  const scan = (value: ReturnType<typeof id>) =>
    go.call(
      go.selector(value, 'Scan'),
      structs
        ? [go.call(member('pgsidpgx', 'ScanTargets'), outputFields.map(scanTarget))]
        : outputFields.map(scanTarget),
    )
  const body: GoStatement[] = []
  let results: GoField[]
  const command = analysis.query.definition.command
  if (command === 'exec') {
    results = [result(id('error'))]
    body.push(go.assign([id('_'), id('err')], [query('Exec')]), go.return(id('err')))
  } else if (command === 'execrows') {
    results = [result(id('int64')), result(id('error'))]
    body.push(
      go.assign([id('tag'), id('err')], [query('Exec')]),
      go.if(go.notEqual(id('err'), id('nil')), [go.return(go.number(0), id('err'))]),
      go.return(go.call(member('tag', 'RowsAffected')), id('nil')),
    )
  } else if (command === 'one') {
    results = [result(id(`${name}Row`)), result(id('error'))]
    body.push(
      go.variable('row', id(`${name}Row`)),
      go.assign([id('err')], [scan(query('QueryRow'))]),
      go.return(id('row'), id('err')),
    )
  } else {
    const rowsType = go.slice(id(`${name}Row`))
    results = [result(rowsType), result(id('error'))]
    body.push(
      go.assign([id('rows'), id('err')], [query('Query')]),
      go.if(go.notEqual(id('err'), id('nil')), [go.return(id('nil'), id('err'))]),
      go.defer(go.call(member('rows', 'Close'))),
      go.assign([id('items')], [go.call(id('make'), [rowsType, go.number(0)])]),
      go.for(go.call(member('rows', 'Next')), [
        go.variable('row', id(`${name}Row`)),
        go.if(
          go.notEqual(id('err'), id('nil')),
          [go.return(id('nil'), id('err'))],
          go.assign([id('err')], [scan(id('rows'))]),
        ),
        go.assign([id('items')], [go.call(id('append'), [id('items'), id('row')])], '='),
      ]),
      go.if(
        go.notEqual(id('err'), id('nil')),
        [go.return(id('nil'), id('err'))],
        go.assign([id('err')], [go.call(member('rows', 'Err'))]),
      ),
      go.return(id('items'), id('nil')),
    )
  }
  return go.function(name, parameters, results, body, [field('q', go.pointer(id('Queries')))])
}
