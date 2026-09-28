import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parse } from 'libpg-query'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import ts from 'typescript'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import {
  catalogCheckGroups,
  lowerDomainCheck,
  lowerTableCheck,
} from '../../src/sql-semantics/catalog-checks.js'
import { emitEvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { typescriptSqlBackend } from '../../src/codegen/typescript/sql/registry.js'
import { typescriptEvalBoolBackend } from '../../src/codegen/typescript/sql/check.js'
import { typescriptSqlRuntime } from '../../src/codegen/typescript/sql/runtime.js'
import { factory, identifier, printFile } from '../../src/codegen/typescript/ast.js'
import { goSqlBackend } from '../../src/codegen/go/sql/registry.js'
import { goEvalBoolBackend } from '../../src/codegen/go/sql/check.js'
import { goSqlRuntime } from '../../src/codegen/go/sql/runtime.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { renderTypescriptSchemaChecks } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaChecks } from '../../src/codegen/go/sql/catalog-checks.js'
import { renderGoNulls } from '../../src/codegen/go/nulls.js'
import { createGoTypeContext } from '../../src/codegen/go/type-mapping.js'
import { renderTypescriptQueryArtifacts } from '../../src/codegen/typescript/query.js'
import { renderGoQueryArtifacts } from '../../src/codegen/go/query.js'
import { planCheckInputs } from '../../src/codegen/shared/check-inputs.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { QueryAnalysisItem } from '../../src/query-analysis.js'
import type { WriteValueLineage } from '../../src/query/value-lineage.js'

const run = promisify(execFile)

describe('catalog CHECK lowering', () => {
  let pg: PGlite

  beforeAll(async () => {
    pg = await PGlite.create()
    await parse('SELECT 1')
    await pg.exec(`CREATE TABLE public.regulated (
      id bigint PRIMARY KEY,
      last_name text,
      email text COLLATE "C",
      pattern text,
      plain text,
      amount integer,
      enabled boolean,
      CONSTRAINT id_positive CHECK (id > 0),
      CONSTRAINT email_format CHECK (email ~ '^a+$'),
      CONSTRAINT dynamic_format CHECK (email ~ pattern),
      CONSTRAINT with_unknown CHECK ((email ~ '^a+$') AND amount > 0),
      CONSTRAINT email_length CHECK (length(email) > 0),
      CONSTRAINT email_excluded CHECK (email <> 'forbidden'),
      CONSTRAINT enabled_guard CHECK (enabled IS NOT NULL),
      CONSTRAINT ordinary_equality CHECK (plain = 'a'),
      CONSTRAINT ordinary_collation CHECK (plain ~ '^a+$')
    )`)
    await pg.exec(`CREATE DOMAIN public.handle AS text COLLATE "C"
      CONSTRAINT handle_format CHECK (VALUE ~ '^a+$')`)
    await pg.exec(`CREATE DOMAIN public.short_handle AS public.handle
      CONSTRAINT short_handle_format CHECK (VALUE ~ '^a{1,3}$')`)
  })

  afterAll(async () => pg.close())

  it('binds existing numeric atoms alongside regex checks', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find(
      (item) => item.schema === 'public' && item.name === 'regulated',
    )!
    const plans = new Map(
      table.constraints
        .filter((constraint) => constraint.type === 'check')
        .map((constraint) => [constraint.name, lowerTableCheck(table, constraint)]),
    )
    expect(plans.get('email_format')?.inputs).toEqual(['email'])
    expect(plans.get('dynamic_format')?.inputs).toEqual(['email', 'pattern'])
    expect(plans.get('email_length')?.expression).toMatchObject({
      kind: 'eval-scalar',
      expression: {
        kind: 'call',
        call: { kind: 'operator' },
        operands: [{ kind: 'call', call: { kind: 'function' } }, { kind: 'certain' }],
      },
    })
    expect(plans.get('email_excluded')?.expression).toMatchObject({
      kind: 'eval-scalar',
      expression: { kind: 'call', call: { kind: 'operator' } },
    })
    expect(plans.get('enabled_guard')?.expression).toMatchObject({
      kind: 'eval-scalar',
      expression: { kind: 'null-test', operand: { kind: 'input', name: 'enabled' } },
    })
    expect(plans.get('ordinary_collation')?.expression).toEqual({ kind: 'uncertain' })
    expect(plans.get('ordinary_equality')?.expression).toEqual({ kind: 'uncertain' })
    expect(
      lowerTableCheck(table, {
        name: 'foreign_c_collation',
        type: 'check',
        definition: `CHECK ((email COLLATE public."C") ~ '^a+$')`,
      })?.expression,
    ).toEqual({ kind: 'uncertain' })
    expect(plans.get('with_unknown')?.expression).toMatchObject({
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [{ kind: 'eval-regex' }, { kind: 'eval-scalar' }],
    })
    const domain = catalog.domains.find((item) => item.name === 'handle')!
    expect(domain.collationIsC).toBe(true)
    expect(lowerDomainCheck(domain, domain.checks[0]!)?.expression).toMatchObject({
      kind: 'eval-regex',
      subject: { kind: 'input', name: 'value' },
    })
    const nested = catalog.domains.find((item) => item.name === 'short_handle')!
    const group = catalogCheckGroups([], catalog.domains, [nested])[0]!
    expect(group.checks.map((item) => [item.owner, item.plan.name])).toEqual([
      ['public.short_handle', 'short_handle_format'],
      ['public.handle', 'handle_format'],
    ])
  })

  it('keeps a parsed but unavailable atom uncertain at the codegen boundary', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'regulated')!
    const plan = lowerTableCheck(table, {
      name: 'session_check',
      type: 'check',
      definition: 'CHECK (pg_catalog.pg_backend_pid() > 0)',
    })!
    expect(plan.expression).toMatchObject({ kind: 'eval-scalar', expression: { kind: 'call' } })
    expect(portableCheckAtoms(plan.expression)).toMatchObject({
      kind: 'eval-scalar',
      expression: {
        kind: 'call',
        operands: [{ kind: 'uncertain' }, { kind: 'certain' }],
      },
    })
  })

  it('runs a catalog regex predicate in generated TypeScript and Go', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find(
      (item) => item.schema === 'public' && item.name === 'regulated',
    )!
    const plan = lowerTableCheck(
      table,
      table.constraints.find((item) => item.name === 'email_format')!,
    )!
    const tsBackend = {
      ...typescriptSqlBackend,
      input: (name: string) =>
        factory.createElementAccessExpression(identifier('row'), factory.createStringLiteral(name)),
    }
    const typescript = emitEvalBoolExpression(plan.expression, tsBackend, typescriptEvalBoolBackend)
    const tsSource = printFile([
      ...typescriptSqlRuntime(typescript.helpers),
      factory.createFunctionDeclaration(
        undefined,
        undefined,
        'evaluate',
        undefined,
        [
          factory.createParameterDeclaration(
            undefined,
            undefined,
            'row',
            undefined,
            factory.createTypeReferenceNode('Record', [
              factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
              factory.createUnionTypeNode([
                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                factory.createLiteralTypeNode(factory.createNull()),
              ]),
            ]),
          ),
        ],
        undefined,
        factory.createBlock([factory.createReturnStatement(typescript.value.expression)], true),
      ),
    ])
    const js = ts.transpileModule(tsSource, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    const tsResults = Function(
      `${js}; return ['a', 'b', null].map(value => evaluate({email:value}))`,
    )()
    expect(tsResults).toEqual([
      { certain: true, value: true },
      { certain: true, value: false },
      { certain: true, value: null },
    ])

    const goBackend = {
      ...goSqlBackend,
      input: (name: string) => go.index(go.ident('row'), go.string(name)),
    }
    const generated = emitEvalBoolExpression(plan.expression, goBackend, goEvalBoolBackend)
    const goSource = printGoFile({
      package: 'main',
      imports: [{ path: 'encoding/json' }, { path: 'os' }],
      source: `${goSqlRuntime(generated.helpers, 'main')}
func main() {
  rows := []map[string]SqlText{
    {"email": {Value: "a", Valid: true}},
    {"email": {Value: "b", Valid: true}},
    {"email": {}},
  }
  results := []EvalBool{}
  for _, row := range rows { results = append(results, evaluate(row)) }
  if err := json.NewEncoder(os.Stdout).Encode(results); err != nil { panic(err) }
}`,
      declarations: [
        go.function(
          'evaluate',
          [{ names: ['row'], type: go.map(go.ident('string'), go.ident('SqlText')) }],
          [{ type: go.ident('EvalBool') }],
          [go.return(generated.value.expression)],
        ),
      ],
    })
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-catalog-check-'))
    try {
      await writeFile(join(directory, 'go.mod'), 'module catalog-check\n\ngo 1.24\n')
      await writeFile(join(directory, 'main.go'), goSource)
      const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache') },
      })
      const goResults = JSON.parse(stdout) as {
        Certain: boolean
        Value: { Value: boolean; Valid: boolean }
      }[]
      expect(
        goResults.map(({ Certain, Value }) => ({
          certain: Certain,
          value: Value.Valid ? Value.Value : null,
        })),
      ).toEqual(tsResults)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('keeps absent entity fields uncertain in both generated targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find(
      (item) => item.schema === 'public' && item.name === 'regulated',
    )!
    const tsSource = renderTypescriptSchemaChecks([table])
    const js = ts.transpileModule(tsSource, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    const tsResults = Function(
      'exports',
      `${js}; return [
      evaluatePublicRegulatedChecks({}),
      evaluatePublicRegulatedChecks({email: null}),
      evaluatePublicRegulatedChecks({email: 'b'}),
      evaluatePublicRegulatedChecks({email: 'a'}),
      evaluatePublicRegulatedChecks({email: 'a', amount: -1}),
      evaluatePublicRegulatedChecks({email: 'a', amount: 1}),
      evaluatePublicRegulatedChecks({email: ''})
    ]`,
    )({}) as { constraint: string; result: { certain: boolean; value?: boolean | null } }[][]
    expect(
      tsResults.map((row) => row.find((item) => item.constraint === 'email_format')?.result),
    ).toEqual([
      { certain: false },
      { certain: true, value: null },
      { certain: true, value: false },
      { certain: true, value: true },
      { certain: true, value: true },
      { certain: true, value: true },
      { certain: true, value: false },
    ])
    expect(
      tsResults.map((row) => row.find((item) => item.constraint === 'with_unknown')?.result),
    ).toEqual([
      { certain: false },
      { certain: false },
      { certain: true, value: false },
      { certain: false },
      { certain: true, value: false },
      { certain: true, value: true },
      { certain: true, value: false },
    ])
    expect(tsResults.at(-1)?.find((item) => item.constraint === 'email_length')?.result).toEqual({
      certain: true,
      value: false,
    })
    const evaluateExtra = Function(
      'exports',
      `${js}; return evaluatePublicRegulatedChecks`,
    )({}) as (
      row: Record<string, unknown>,
    ) => { constraint: string; result: { certain: boolean; value?: boolean | null } }[]
    expect(evaluateExtra({}).find((item) => item.constraint === 'enabled_guard')?.result).toEqual({
      certain: false,
    })
    expect(
      evaluateExtra({ enabled: null }).find((item) => item.constraint === 'enabled_guard')?.result,
    ).toEqual({ certain: true, value: false })
    expect(
      evaluateExtra({ enabled: true }).find((item) => item.constraint === 'enabled_guard')?.result,
    ).toEqual({ certain: true, value: true })
    expect(
      evaluateExtra({ id: -1n }).find((item) => item.constraint === 'id_positive')?.result,
    ).toEqual({ certain: true, value: false })

    const goChecks = renderGoSchemaChecks(
      [table],
      'main',
      [],
      [],
      catalog,
      parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
    )
    expect(goChecks).toMatch(/Id\s+CheckOptional\[int64\]/u)
    expect(goChecks).toMatch(/LastName\s+CheckOptional\[\*string\]/u)
    const goSource = `${goChecks}
func ptr[T any](value T) *T { return &value }
func main() {
  rows := []PublicRegulatedCheckInput{
    {},
    {Email: KnownCheckValue((*string)(nil))},
    {Email: KnownCheckValue(ptr("b"))},
    {Email: KnownCheckValue(ptr("a"))},
    {Email: KnownCheckValue(ptr("a")), Amount: KnownCheckValue(ptr(int32(-1)))},
    {Email: KnownCheckValue(ptr("a")), Amount: KnownCheckValue(ptr(int32(1)))},
    {Email: KnownCheckValue(ptr(""))},
  }
  results := [][]CheckEvaluation{}
  for _, row := range rows { results = append(results, EvaluatePublicRegulatedChecks(row)) }
  if err := json.NewEncoder(os.Stdout).Encode(results); err != nil { panic(err) }
  failures := []bool{}
  for _, input := range []PublicRegulatedCheckInput{{}, {Email: KnownCheckValue(ptr("b"))}, {Email: KnownCheckValue(ptr("a"))}, {Email: KnownCheckValue((*string)(nil))}, {Id: KnownCheckValue(int64(-1))}} {
    failures = append(failures, ValidateCheckInputs(input, EvaluatePublicRegulatedChecks) != nil)
  }
  if err := json.NewEncoder(os.Stdout).Encode(failures); err != nil { panic(err) }
}`.replace('package main', 'package main\nimport ("encoding/json"; "os")')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-entity-check-'))
    try {
      await writeFile(join(directory, 'go.mod'), 'module entity-check\n\ngo 1.24\n')
      await writeFile(join(directory, 'main.go'), goSource)
      const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache') },
      })
      const [goLine, failuresLine] = stdout.trim().split('\n')
      const goResults = JSON.parse(goLine!) as {
        Constraint: string
        Result: { Certain: boolean; Value: { Value: boolean; Valid: boolean } }
      }[][]
      expect(
        goResults.map((row) => {
          const result = row.find((item) => item.Constraint === 'email_format')!.Result
          return result.Certain
            ? { certain: true, value: result.Value.Valid ? result.Value.Value : null }
            : { certain: false }
        }),
      ).toEqual(
        tsResults.map((row) => row.find((item) => item.constraint === 'email_format')?.result),
      )
      for (const constraint of ['with_unknown', 'email_length']) {
        expect(
          goResults.map((row) => {
            const result = row.find((item) => item.Constraint === constraint)!.Result
            return result.Certain
              ? { certain: true, value: result.Value.Valid ? result.Value.Value : null }
              : { certain: false }
          }),
        ).toEqual(
          tsResults.map((row) => row.find((item) => item.constraint === constraint)?.result),
        )
      }
      expect(JSON.parse(failuresLine!)).toEqual([false, true, false, false, true])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('types partial Go fields with the configured SQL null representation', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'regulated')!
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: structs\n',
    )
    const context = createGoTypeContext('example.com/typed/schema', config, catalog, 'public')
    const checks = renderGoSchemaChecks([table], 'main', [], [], catalog, config, context)
    expect(checks).toMatch(/Id\s+CheckOptional\[int64\]/u)
    expect(checks).toMatch(/LastName\s+CheckOptional\[pgsid\.Null\[string\]\]/u)
    const handle = catalog.domains.find((item) => item.name === 'handle')!
    const standalone = renderGoSchemaChecks(
      [],
      'main',
      catalog.domains,
      [handle],
      catalog,
      parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
    )
    expect(standalone).toMatch(/Value\s+CheckOptional\[\*string\]/u)
    const standaloneStructs = renderGoSchemaChecks(
      [],
      'main',
      catalog.domains,
      [handle],
      catalog,
      config,
      {
        importPath: 'example.com/typed/pgsid/pgx',
        nullsImportPath: 'example.com/typed/pgsid',
      },
    )
    expect(standaloneStructs).toMatch(/Value\s+CheckOptional\[pgsid\.Null\[string\]\]/u)
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-typed-check-'))
    try {
      await mkdir(join(directory, 'pgsid'))
      await mkdir(join(directory, 'standalone'))
      await writeFile(join(directory, 'go.mod'), 'module example.com/typed\n\ngo 1.24\n')
      await writeFile(join(directory, 'pgsid', 'null.go'), renderGoNulls())
      await writeFile(join(directory, 'checks.go'), checks)
      await writeFile(join(directory, 'standalone', 'checks.go'), standaloneStructs)
      await writeFile(join(directory, 'main.go'), 'package main\nfunc main() {}\n')
      await writeFile(
        join(directory, 'checks_test.go'),
        `package main
import (
  "testing"
  pgsid "example.com/typed/pgsid"
)
func TestPartialCheckInputs(t *testing.T) {
  evaluate := EvaluatePublicRegulatedChecks
  if err := ValidateCheckInputs(PublicRegulatedCheckInput{}, evaluate); err != nil { t.Fatal(err) }
  nullEmail := PublicRegulatedCheckInput{Email: KnownCheckValue(pgsid.Null[string]{})}
  if err := ValidateCheckInputs(nullEmail, evaluate); err != nil { t.Fatal(err) }
  badEmail := PublicRegulatedCheckInput{Email: KnownCheckValue(pgsid.Null[string]{V: "b", Valid: true})}
  if err := ValidateCheckInputs(badEmail, evaluate); err == nil { t.Fatal("expected CHECK failure") }
}
`,
      )
      await run(process.env.PGSID_GO_BINARY ?? 'go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache') },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('validates known INSERT inputs before generated query execution', async () => {
    const catalog = await snapshotCatalog(pg)
    const sql = 'INSERT INTO public.regulated (email, amount) VALUES ($1, $2)'
    const statement = (await parse(sql)).stmts?.[0]?.stmt
    expect(statement).toBeDefined()
    const target = { schema: 'public', relation: 'regulated', column: 'email' }
    const writes: WriteValueLineage[] = [
      {
        target,
        source: 'insert',
        partial: false,
        value: { kind: 'parameter', number: 1, resolvedType: 'text' },
      },
      {
        target: { ...target, column: 'amount' },
        source: 'insert',
        partial: false,
        value: { kind: 'parameter', number: 2, resolvedType: 'integer' },
      },
    ]
    const plans = planCheckInputs(statement!, writes, catalog, ['text', 'integer'])
    expect(plans).toMatchObject([
      {
        columns: [
          { name: 'email', parameter: 1 },
          { name: 'amount', parameter: 2 },
        ],
      },
    ])
    const item = {
      query: {
        id: 'checks.sql#InsertRegulated',
        path: 'checks.sql',
        name: 'InsertRegulated',
        routes: [],
        analysisHash: 'insert',
        semanticHash: 'insert',
        definition: {
          name: 'InsertRegulated',
          command: 'exec',
          hash: 'insert',
          sql,
          stmt: statement,
          parameters: [
            { name: 'email', index: 1, occurrences: [] },
            { name: 'amount', index: 2, occurrences: [] },
          ],
          replacements: [],
          annotationStart: 0,
          annotationEnd: 0,
          sourceStart: 0,
          sourceEnd: sql.length,
        },
      },
      description: { columns: [], columnTypes: [], params: 2, parameterTypes: ['text', 'integer'] },
      contract: {
        outputs: [],
        params: [
          { number: 1, notNull: false },
          { number: 2, notNull: false },
        ],
        paramRejectionSets: [],
        outputPresenceGroups: [],
        alwaysRaises: false,
      },
      contractGate: { kind: 'agreed' },
      rawLineage: null,
      writeLineage: writes,
      lineageGate: { kind: 'agreed' },
      dependencies: [],
      diagnostics: [],
      cacheKey: 'insert',
      resultHash: 'insert',
    } as QueryAnalysisItem
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    typescript: {}\n    go: {}\n',
    )
    const typescript = renderTypescriptQueryArtifacts([item], config, {}, { catalog })
    expect(typescript.diagnostics).toEqual([])
    const compiled = ts.transpileModule(typescript.runtime!, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      reportDiagnostics: true,
    })
    expect(compiled.diagnostics).toEqual([])
    const typesDirectory = await mkdtemp(join(tmpdir(), 'pgsid-check-ts-'))
    try {
      const runtimePath = join(typesDirectory, 'query.ts')
      const typesPath = join(typesDirectory, 'types.d.ts')
      await writeFile(runtimePath, typescript.runtime!)
      await writeFile(typesPath, typescript.types!)
      const program = ts.createProgram([runtimePath, typesPath], {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        noEmit: true,
        types: [],
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
    } finally {
      await rm(typesDirectory, { recursive: true, force: true })
    }
    const module = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> }
    Function('module', 'exports', compiled.outputText)(module, module.exports)
    let queries = 0
    const db = {
      query: async () => {
        queries++
        return { rows: [], rowCount: 1 }
      },
    }
    await expect(
      module.exports['insertRegulated']!(db, { email: 'b', amount: 1 }),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'email_format',
    })
    expect(queries).toBe(0)
    await expect(
      module.exports['insertRegulated']!(db, { email: 'a', amount: -1 }),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'with_unknown',
    })
    expect(queries).toBe(0)
    await module.exports['insertRegulated']!(db, { email: 'a', amount: 1 })
    expect(queries).toBe(1)
    await module.exports['insertRegulated']!(db, { email: null, amount: 1 })
    expect(queries).toBe(2)

    const goQuery = renderGoQueryArtifacts([item], config, {}, catalog, 'checks', undefined, {
      executor: true,
      helperImportPath: 'example.com/checks/pgsid/pgx',
    })
    expect(goQuery.diagnostics).toEqual([])
    expect(goQuery.types).toContain('pgsidpgx.ValidateCheckInputs')
    expect(goQuery.types).toContain('pgsidpgx.EvaluatePublicRegulatedChecks')
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-query-check-'))
    try {
      const helperDir = join(directory, 'pgsid', 'pgx')
      await mkdir(helperDir, { recursive: true })
      await writeFile(join(directory, 'go.mod'), 'module example.com/checks\n\ngo 1.24\n')
      await writeFile(
        join(helperDir, 'checks.go'),
        renderGoSchemaChecks([plans[0]!.table], 'pgsidpgx', [], [], catalog, config),
      )
      await writeFile(join(directory, 'query.go'), goQuery.types!)
      await writeFile(
        join(directory, 'query_test.go'),
        `package checks
import (
  "context"
  "testing"
  helper "example.com/checks/pgsid/pgx"
)
type fakeDB struct { calls int }
func (db *fakeDB) Exec(context.Context, string, ...any) (struct{}, error) {
  db.calls++
  return struct{}{}, nil
}
type Queries struct { db *fakeDB }
func TestCheckBeforeExec(t *testing.T) {
  db := &fakeDB{}
  queries := &Queries{db: db}
  bad := "b"
  positive := int32(1)
  err := queries.InsertRegulated(context.Background(), InsertRegulatedParams{Email: &bad, Amount: &positive})
  if err == nil || db.calls != 0 { t.Fatalf("bad: %v, calls: %d", err, db.calls) }
  if check, ok := err.(*helper.CheckViolationError); !ok || check.SQLState() != "23514" {
    t.Fatalf("unexpected error: %T %v", err, err)
  }
  good := "a"
  negative := int32(-1)
  if err := queries.InsertRegulated(context.Background(), InsertRegulatedParams{Email: &good, Amount: &negative}); err == nil {
    t.Fatal("negative amount passed CHECK")
  }
  if db.calls != 0 { t.Fatalf("queries after failure: %d", db.calls) }
  if err := queries.InsertRegulated(context.Background(), InsertRegulatedParams{Email: &good, Amount: &positive}); err != nil {
    t.Fatal(err)
  }
  if err := queries.InsertRegulated(context.Background(), InsertRegulatedParams{}); err != nil {
    t.Fatal(err)
  }
  if db.calls != 2 { t.Fatalf("calls: %d", db.calls) }
}
`,
      )
      await run(process.env.PGSID_GO_BINARY ?? 'go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache') },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
