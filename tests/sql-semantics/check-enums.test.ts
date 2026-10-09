import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { parseConfigString } from '../../src/config/loader.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import {
  renderTypescriptSchemaCheckArtifacts,
  renderTypescriptSchemaChecks,
} from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { enumEqualityOperation } from '../../src/sql-semantics/expressions.js'
import { go, printGoFile, type GoExpression, type GoStatement } from '../../src/codegen/go/ast.js'
import { goName } from '../../src/codegen/go/names.js'

const run = promisify(execFile)
type State =
  | { kind: 'Value'; value: number | boolean }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; state: number }
type OperationCase = { name: string; left: State; right: State; expected: State }
const labels = ['queued', 'ready', 'done', 'café', "quote's"]
const ordinary: { name: string; row: Record<string, unknown> }[] = [
  { name: 'absent', row: {} },
  {
    name: 'NULL',
    row: {
      state: null,
      peer: null,
      other_state: null,
      domain_state: null,
      nested_state: null,
      flag: null,
      day: null,
      amount: null,
    },
  },
  ...labels.map((state) => ({
    name: state,
    row: {
      state,
      peer: 'ready',
      other_state: 'ready',
      domain_state: 'queued',
      nested_state: 'ready',
      flag: true,
      day: '2026-01-02',
      amount: 1,
    },
  })),
  { name: 'ready_without_day', row: { state: 'ready', peer: 'done', amount: 1, day: null } },
  { name: 'skip_missing_branch', row: { state: 'queued' } },
  { name: 'scalar_else', row: { flag: false, state: 'done' } },
  { name: 'skip_overflow', row: { state: 'queued', amount: 2147483647 } },
]

function operationTests(importPath: string, cases: readonly OperationCase[]): string {
  const body: GoStatement[] = []
  const input = (state: State): GoExpression =>
    state.kind === 'Value'
      ? go.call(go.selector(go.ident('runtime'), 'MakeEnumValue'), [
          go.number(state.value as number),
        ])
      : go.composite(go.selector(go.ident('runtime'), 'EnumValue'), [
          go.keyValue('Kind', go.selector(go.ident('runtime'), 'EnumValue' + state.kind)),
          ...(state.kind === 'Error'
            ? [
                go.keyValue(
                  'Error',
                  go.composite(go.selector(go.ident('runtime'), 'SqlError'), [
                    go.keyValue('State', go.number(state.state)),
                  ]),
                ),
              ]
            : []),
        ])
  for (const [index, item] of cases.entries()) {
    const actual = go.ident('actual' + index)
    body.push(
      go.assign(
        [actual],
        [
          go.call(
            go.selector(go.ident('operations'), goName(item.name.replace('sql__pg_catalog__', ''))),
            [input(item.left), input(item.right)],
          ),
        ],
      ),
    )
    const assert = (value: GoExpression, expected: GoExpression) =>
      go.if(go.notEqual(value, expected), [
        go.expression(
          go.call(go.selector(go.ident('t'), 'Fatalf'), [go.string(item.name + ': %v'), actual]),
        ),
      ])
    body.push(
      assert(
        go.selector(actual, 'Kind'),
        go.selector(go.ident('runtime'), 'BoolValue' + item.expected.kind),
      ),
    )
    if (item.expected.kind === 'Value')
      body.push(assert(go.selector(actual, 'Value'), go.ident(String(item.expected.value))))
    if (item.expected.kind === 'Error')
      body.push(
        assert(go.selector(go.selector(actual, 'Error'), 'State'), go.number(item.expected.state)),
      )
  }
  return printGoFile({
    package: 'enums_a',
    imports: [
      { path: 'testing' },
      { path: importPath + '/checkruntime', alias: 'runtime' },
      { path: importPath + '/pg_catalog', alias: 'operations' },
    ],
    declarations: [
      go.function(
        'TestEnumOperations',
        [{ names: ['t'], type: go.pointer(go.selector(go.ident('testing'), 'T')) }],
        [],
        body,
      ),
    ],
  })
}

describe('catalog enum CHECKs', () => {
  let pg: PGlite
  let directory: string
  let cases: GoCheckCase[]
  let evaluate: (row: object) => GoCheckCase['results']
  let fallback: typeof evaluate

  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-enums-'))
    await pg.exec(`
      CREATE SCHEMA enums_a; CREATE SCHEMA enums_b;
      CREATE TYPE enums_a.state AS ENUM ('queued', 'ready', 'done', 'café', 'quote''s');
      CREATE TYPE enums_b.state AS ENUM ('ready', 'queued');
      CREATE DOMAIN enums_a.status AS enums_a.state CHECK (VALUE <> 'done');
      CREATE DOMAIN enums_a.nested_status AS enums_a.status;
      CREATE TABLE enums_a.samples (
        state enums_a.state, peer enums_a.state, other_state enums_b.state,
        domain_state enums_a.status, nested_state enums_a.nested_status,
        flag boolean, day date, amount integer,
        CONSTRAINT equality CHECK (state = peer),
        CONSTRAINT inequality CHECK (state <> 'queued'),
        CONSTRAINT direct_equality CHECK (pg_catalog.enum_eq(state, peer)),
        CONSTRAINT direct_inequality CHECK (pg_catalog.enum_ne(state, peer)),
        CONSTRAINT other_identity CHECK (other_state = 'ready'::enums_b.state),
        CONSTRAINT domain_equality CHECK (domain_state::enums_a.state = 'queued'::enums_a.state),
        CONSTRAINT nested_domain_equality CHECK (nested_state::enums_a.state = 'ready'::enums_a.state),
        CONSTRAINT decision CHECK (CASE state WHEN 'queued' THEN true WHEN 'ready' THEN day IS NOT NULL END),
        CONSTRAINT null_when CHECK (CASE state WHEN NULL THEN false WHEN 'queued' THEN true ELSE false END),
        CONSTRAINT lazy_overflow CHECK (CASE state WHEN 'ready' THEN amount + 1 > 0 ELSE true END),
        CONSTRAINT scalar_enum CHECK ((CASE WHEN flag THEN state ELSE 'queued'::enums_a.state END) = 'ready'),
        CONSTRAINT scalar_null CHECK ((CASE WHEN flag THEN state END) IS NULL)
      );
    `)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'samples')!
    expect(catalog.enums.map((item) => item.oid)).toEqual(
      expect.arrayContaining([table.columns[0]!.typeOid, table.columns[2]!.typeOid]),
    )
    const plans = table.constraints
      .filter((constraint) => constraint.type === 'check')
      .map((constraint) => ({
        constraint,
        plan: lowerTableCheck(table, constraint, catalog.enums, catalog.domains)!,
      }))
    for (const { constraint, plan } of plans)
      expect(prepareCheckRust(plan.expression).kind, constraint.name).toBe('supported')
    const collision = lowerTableCheck(
      table,
      { name: 'cross_enum', type: 'check', definition: 'CHECK (state = other_state)' },
      catalog.enums,
      catalog.domains,
    )!
    expect(collision.expression).toEqual({ kind: 'uncertain' })
    await expect(
      pg.query('SELECT NULL::enums_a.state = NULL::enums_b.state'),
    ).rejects.toMatchObject({ code: '42883' })
    for (const sql of ['state < peer', "state = 'invalid'", "state = 'queued'::enums_b.state"])
      expect(
        lowerTableCheck(
          table,
          { name: 'unsupported', type: 'check', definition: `CHECK (${sql})` },
          catalog.enums,
          catalog.domains,
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
    const domain = catalog.domains.find((domain) => domain.name === 'status')!
    expect(
      prepareCheckRust(
        lowerDomainCheck(domain, domain.checks[0]!, catalog.enums, catalog.domains)!.expression,
      ).kind,
    ).toBe('supported')

    cases = []
    for (const { name, row } of ordinary) {
      const results: GoCheckCase['results'] = []
      for (const { constraint, plan } of plans) {
        const missing = plan.inputs.some((column) => row[column] === undefined)
        const skipped =
          ['decision', 'lazy_overflow'].includes(constraint.name) &&
          labels.includes(String(row['state'])) &&
          row['state'] !== 'ready'
        const scalarElse =
          ['scalar_enum', 'scalar_null'].includes(constraint.name) && row['flag'] === false
        if (missing && !skipped && !scalarElse) {
          results.push({ constraint: constraint.name, result: { certain: false } })
          continue
        }
        const projection = table.columns.map(
          (column, index) => `$${index + 1}::${column.typeName} AS ${column.name}`,
        )
        const oracle = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${constraint.definition.slice(6)} AS value FROM (SELECT ${projection.join(',')}) candidate`,
            table.columns.map((column) => row[column.name] ?? null),
          )
        ).rows[0]!
        results.push({
          constraint: constraint.name,
          result: { certain: true, value: oracle.value },
        })
      }
      cases.push({ name, table, row, results })
    }
    const options = { enums: catalog.enums }
    const ts = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [], options)
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(directory, 'checks.ts'), ts.checks)
    await writeFile(
      join(directory, 'fallback.ts'),
      renderTypescriptSchemaChecks([table], catalog.domains, [], options),
    )
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(directory, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(directory, 'js'),
      join(directory, 'checks.ts'),
      join(directory, 'fallback.ts'),
    ])
    evaluate = (await import(pathToFileURL(join(directory, 'js/checks.js')).href))
      .evaluateEnumsASamplesChecks
    fallback = (await import(pathToFileURL(join(directory, 'js/fallback.js')).href))
      .evaluateEnumsASamplesChecks
    const operations = await import(
      pathToFileURL(join(directory, 'js/checks-rust/pg_catalog/operations.js')).href
    )
    const runtime = await import(
      pathToFileURL(join(directory, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const fixtures: OperationCase[] = []
    for (const fn of builtinCallables().filter(
      (item) => item.kind === 'function' && enumEqualityOperation(callableIdentity(item)) !== null,
    )) {
      if (fn.kind !== 'function') continue
      for (const left of [null, 0, 1, 3])
        for (const right of [null, 0, 1, 3]) {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT pg_catalog.${fn.name}($1::enums_a.state, $2::enums_a.state) AS value`,
              [left === null ? null : labels[left], right === null ? null : labels[right]],
            )
          ).rows[0]!.value
          fixtures.push({
            name: fn.rustName,
            left: left === null ? { kind: 'Null' } : { kind: 'Value', value: left },
            right: right === null ? { kind: 'Null' } : { kind: 'Value', value: right },
            expected: value === null ? { kind: 'Null' } : { kind: 'Value', value },
          })
        }
      const error: State = { kind: 'Error', state: Number.parseInt('22003', 36) }
      fixtures.push(
        ...[
          {
            left: { kind: 'Unknown' } as State,
            right: { kind: 'Null' } as State,
            expected: { kind: 'Unknown' } as State,
          },
          {
            left: { kind: 'Null' } as State,
            right: { kind: 'Unknown' } as State,
            expected: { kind: 'Unknown' } as State,
          },
          { left: error, right: { kind: 'Unknown' } as State, expected: error },
          { left: { kind: 'Unknown' } as State, right: error, expected: error },
          {
            left: error,
            right: { kind: 'Error', state: Number.parseInt('22P02', 36) } as State,
            expected: error,
          },
        ].map((item) => ({ name: fn.rustName, ...item })),
      )
    }
    const targetState = (state: State) =>
      state.kind === 'Error' ? { kind: 'Error', value: { state: state.state } } : state
    for (const item of fixtures) {
      const name = item.name
        .replace('sql__pg_catalog__', '')
        .replace(/_+([a-z0-9])/gu, (_, part: string) => part.toUpperCase())
      const enumInput = (state: State) =>
        state.kind === 'Value' ? runtime.makeEnumValue(state.value) : targetState(state)
      expect(operations[name](enumInput(item.left), enumInput(item.right))).toEqual(
        targetState(item.expected),
      )
    }
    for (const nulls of ['pointers', 'structs']) {
      const root = join(directory, nulls)
      await mkdir(root)
      const config = parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: ${nulls}\n      schema: { outDir: schema }\n`,
      )
      const generated = renderGoSchemaArtifacts(
        catalog,
        config,
        {},
        join(root, 'schema'),
        'enumchecks/schema',
      )
      expect(generated.diagnostics).toEqual([])
      for (const artifact of generated.artifacts) {
        await mkdir(dirname(artifact.path), { recursive: true })
        await writeFile(artifact.path, artifact.content)
      }
      await writeFile(
        join(root, 'go.mod'),
        'module enumchecks\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
      )
      await writeFile(
        join(root, 'go.sum'),
        await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
      )
      await writeFile(
        join(root, 'schema/enums_a/checks_test.go'),
        renderGoCheckTests('enums_a', cases, {
          dateRuntime: 'enumchecks/schema/enums_a/checkrust/checkruntime',
        }),
      )
      await writeFile(
        join(root, 'schema/enums_a/operations_test.go'),
        operationTests('enumchecks/schema/enums_a/checkrust', fixtures),
      )
      await run('go', ['test', '-mod=mod', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      }).catch((error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      })
    }
    const prepared = prepareCheckRust(
      plans.find(({ constraint }) => constraint.name === 'decision')!.plan.expression,
    )
    if (prepared.kind !== 'supported') throw new Error(prepared.reason)
    const native = join(directory, 'native')
    await mkdir(native)
    await writeFile(join(native, 'evaluator.rs'), prepared.evaluator.source)
    await run(
      'cargo',
      [
        'run',
        '--quiet',
        '--locked',
        '--manifest-path',
        'tools/check-rust-dialect/Cargo.toml',
        '--',
        join(native, 'evaluator.rs'),
      ],
      { env: { ...process.env, CARGO_TARGET_DIR: '/tmp/pgsid-check-rust-dialect-target' } },
    )
    writeCheckRustSources(join(native, 'engine.rs'), prepared.source)
    await run('rustc', [
      '--edition=2021',
      '--crate-name',
      'enum_checks',
      '--crate-type',
      'lib',
      join(native, 'engine.rs'),
      '-o',
      join(native, 'libenum_checks.rlib'),
    ])
    await writeFile(
      join(native, 'test.rs'),
      `extern crate enum_checks;
use enum_checks::*;
#[test]
fn enum_checks() {
    assert!(evaluate_check(EnumValue::Unknown, BoolValue::Unknown) == CheckOutcome::Unknown);
    assert!(evaluate_check(EnumValue::Null, BoolValue::Unknown) == CheckOutcome::Null);
    assert!(evaluate_check(make_enum_value(0), BoolValue::Unknown) == CheckOutcome::True);
    assert!(evaluate_check(make_enum_value(1), make_bool_value(false)) == CheckOutcome::True);
    assert!(evaluate_check(make_enum_value(1), make_bool_value(true)) == CheckOutcome::False);
    assert!(evaluate_check(make_enum_value(2), BoolValue::Unknown) == CheckOutcome::Null);
    let values = [EnumValue::Null, make_enum_value(0), make_enum_value(1), make_enum_value(3)];
    for (left_index, left) in values.into_iter().enumerate() {
        for (right_index, right) in values.into_iter().enumerate() {
            let equality = if left_index == 0 || right_index == 0 { BoolValue::Null } else { BoolValue::Value(left_index == right_index) };
            let inequality = if left_index == 0 || right_index == 0 { BoolValue::Null } else { BoolValue::Value(left_index != right_index) };
            assert!(sql__pg_catalog__enum_eq__w63e(left, right) == equality);
            assert!(sql__pg_catalog__enum_ne__tph2(left, right) == inequality);
        }
    }
    let error = SqlError { state: ${Number.parseInt('22003', 36)} };
    let other_error = SqlError { state: ${Number.parseInt('22P02', 36)} };
    for operation in [sql__pg_catalog__enum_eq__w63e, sql__pg_catalog__enum_ne__tph2] {
        assert!(operation(EnumValue::Unknown, EnumValue::Null) == BoolValue::Unknown);
        assert!(operation(EnumValue::Null, EnumValue::Unknown) == BoolValue::Unknown);
        assert!(operation(EnumValue::Unknown, EnumValue::Error(error)) == BoolValue::Error(error));
        assert!(operation(EnumValue::Error(error), EnumValue::Unknown) == BoolValue::Error(error));
        assert!(operation(EnumValue::Error(error), EnumValue::Error(other_error)) == BoolValue::Error(error));
    }
}
`,
    )
    await run('rustc', [
      '--edition=2021',
      '--test',
      join(native, 'test.rs'),
      '--extern',
      'enum_checks=' + join(native, 'libenum_checks.rlib'),
      '-o',
      join(native, 'test'),
    ])
    await run(join(native, 'test'))
  }, 120_000)

  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  for (const item of ordinary)
    it(item.name, () => {
      const test = cases.find((test) => test.name === item.name)!
      for (const target of [evaluate, fallback])
        expect(target(test.row).map(({ constraint, result }) => ({ constraint, result }))).toEqual(
          test.results,
        )
    })
  it('rejects unknown labels conservatively and preserves selected errors', () => {
    for (const target of [evaluate, fallback]) {
      expect(
        target({ state: 'invalid', peer: 'queued' }).find((item) => item.constraint === 'equality')!
          .result,
      ).toEqual({ certain: false })
      expect(target({ state: 'ready', amount: 2147483647 })).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            result: { certain: true, error: '22003' },
            message: expect.any(String),
          }),
        ]),
      )
    }
  })
})
