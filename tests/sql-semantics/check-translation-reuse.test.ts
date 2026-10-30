import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  type CheckRustSource,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  transpileCheckRustFiles,
  translateCheckRustChecks,
  translateCheckRustRuntime,
} from '../../src/codegen/shared/check-rust-transpile.js'

// A runtime translated once must serve every check on the same runtime modules: translating the
// checks against it reproduces translating each combined source byte for byte.
const runtimeModules: CheckRustSource['modules'] = [
  {
    name: 'checkruntime',
    dependencies: [],
    files: [
      {
        path: 'values.rs',
        source: `
#[derive(Clone,Copy)] pub struct Vertex { pub x:i64, pub y:i64 }
#[derive(Clone)] pub struct PathPayload { pub closed:bool, pub points:Vec<Vertex> }
#[derive(Clone)] pub enum PathValue { Unknown, Null, Value(PathPayload) }
#[derive(Clone,Copy)] pub struct Extra { pub n:i64 }
pub fn make_path(input:PathPayload)->PathValue { PathValue::Value(input) }
pub fn path_npoints(input:PathValue)->usize { if let PathValue::Value(path)=input { return path.points.len(); } 0 }
`,
      },
    ],
  },
  {
    name: 'pg_catalog',
    dependencies: ['checkruntime'],
    files: [
      {
        path: 'operations.rs',
        source: `
pub fn sql__pg_catalog__path_open(input:PathValue)->PathValue {
 if let PathValue::Value(path)=input { return PathValue::Value(PathPayload{closed:false,points:path.points}); } input
}
`,
      },
    ],
  },
]

const graph = (evaluator: string): CheckRustSource => ({
  schemaVersion: 1,
  modules: [
    ...runtimeModules,
    {
      name: 'checks',
      dependencies: ['checkruntime', 'pg_catalog'],
      files: [{ path: 'checks.rs', source: evaluator }],
    },
  ],
})

it('reuses one translated runtime for checks with qualified and shadowed runtime names', () => {
  const runtime = translateCheckRustRuntime(graph(''), 'reuse/pg_catalog')
  for (const evaluator of [
    'pub fn evaluate_check_open(input:PathValue)->bool { let opened=sql__pg_catalog__path_open(input); path_npoints(opened)==2 }',
    // The local shadows a runtime function of the same generated name.
    'pub fn evaluate_check_count(input:PathValue)->bool { let make_path:usize=path_npoints(input); make_path>1 }',
  ]) {
    const source = graph(evaluator)
    expect(translateCheckRustChecks(source, runtime, 'reuse/pg_catalog'), evaluator).toEqual(
      transpileCheckRustFiles(source, 'reuse/pg_catalog'),
    )
  }
})

it('rejects checks that need more than the translated runtime provides', () => {
  const runtime = translateCheckRustRuntime(graph(''), 'reuse/pg_catalog')
  const translate = (evaluator: string) =>
    translateCheckRustChecks(graph(evaluator), runtime, 'reuse/pg_catalog')
  // The checks may not claim a generated runtime name, here the payload copy helper.
  expect(() =>
    translate('pub fn copy_path_payload(input:PathValue)->bool { path_npoints(input)>0 }'),
  ).toThrow(/copyPathPayload is generated for both/u)
  // Declarations of types are validated over the whole graph.
  expect(() =>
    translate(
      '#[derive(Clone, Copy)] pub enum Local { Empty } pub fn evaluate_check_local(input:PathValue)->bool { path_npoints(input)>0 }',
    ),
  ).toThrow(/cannot declare types/u)
  // A value type the runtime operations never expose would change how the runtime is emitted.
  const outside = 'pub fn evaluate_check_extra(input:Extra)->bool { input.n>0i64 }'
  expect(() => translate(outside)).toThrow(/outside the runtime: Extra/u)
  expect(() => transpileCheckRustFiles(graph(outside), 'reuse/pg_catalog')).toThrow(
    /outside the runtime: Extra/u,
  )
})

it('translates catalog CHECKs against one runtime as the combined sources translate', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE reuse (n int4, s text, j jsonb,
      CONSTRAINT positive CHECK (n > 0),
      CONSTRAINT bounded CHECK (length(s) < 10 AND j ? 'k'))`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'reuse')!
    const sources = table.constraints.map((constraint) => {
      const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
      expect(expression.kind, constraint.name).not.toBe('uncertain')
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        },
      ])
      expect(group.source, constraint.name).toBeDefined()
      return group.source!
    })
    const runtimeOf = (source: CheckRustSource) =>
      JSON.stringify(source.modules.filter((module) => module.name !== 'checks'))
    expect(new Set(sources.map(runtimeOf)).size).toBe(1)
    const runtime = translateCheckRustRuntime(sources[0]!, 'reuse/pg_catalog')
    for (const source of sources)
      expect(translateCheckRustChecks(source, runtime, 'reuse/pg_catalog')).toEqual(
        transpileCheckRustFiles(source, 'reuse/pg_catalog'),
      )
  } finally {
    await pg.close()
  }
}, 600_000)
