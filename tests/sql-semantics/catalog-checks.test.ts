import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parse } from 'libpg-query'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
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
import {
  renderTypescriptSchemaCheckArtifacts,
  renderTypescriptSchemaChecks,
} from '../../src/codegen/typescript/sql/catalog-checks.js'
import {
  renderGoSchemaCheckArtifacts,
  renderGoSchemaChecks,
} from '../../src/codegen/go/sql/catalog-checks.js'
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
      CONSTRAINT amount_plus CHECK (amount + 1 > 0),
      CONSTRAINT amount_minus CHECK (amount - 1 >= 0),
      CONSTRAINT email_length CHECK (length(email) > 0),
      CONSTRAINT email_excluded CHECK (email <> 'forbidden'),
      CONSTRAINT enabled_equal CHECK (enabled = true),
      CONSTRAINT enabled_unequal CHECK (enabled <> false),
      CONSTRAINT enabled_less CHECK (enabled < true),
      CONSTRAINT enabled_guard CHECK (enabled IS NOT NULL),
      CONSTRAINT ordinary_equality CHECK (plain = 'a'),
      CONSTRAINT ordinary_collation CHECK (plain ~ '^a+$')
    )`)
    await pg.exec(`CREATE DOMAIN public.handle AS text COLLATE "C"
      CONSTRAINT handle_format CHECK (VALUE ~ '^a+$')`)
    await pg.exec(`CREATE TABLE public.case_rust (
      amount integer,
      flag boolean,
      note text COLLATE "C",
      CONSTRAINT negative_floor CHECK (amount > -1),
      CONSTRAINT minimum_floor CHECK (amount >= -2147483648),
      CONSTRAINT conditional_check CHECK (
        CASE WHEN flag THEN amount + 1 > 0 ELSE note IS NULL END
      ),
      CONSTRAINT simple_int4 CHECK (CASE amount WHEN 0 THEN flag IS NULL WHEN 1 THEN note IS NULL ELSE amount > 0 END),
      CONSTRAINT simple_bool CHECK (CASE flag WHEN true THEN amount > 0 WHEN false THEN note IS NULL END),
      CONSTRAINT simple_text CHECK (CASE note WHEN 'a' THEN true ELSE note IS NULL END),
      CONSTRAINT scalar_int4 CHECK ((CASE WHEN flag THEN amount + 1 ELSE 0 END) > 0),
      CONSTRAINT scalar_text CHECK ((CASE WHEN flag THEN note ELSE 'a' END) = 'a'),
      CONSTRAINT scalar_bool CHECK ((CASE WHEN amount > 0 THEN flag ELSE true END) = true),
      CONSTRAINT scalar_no_else CHECK ((CASE WHEN flag THEN amount END) IS NULL)
    )`)
    await pg.exec(`CREATE DOMAIN public.short_handle AS public.handle
      CONSTRAINT short_handle_format CHECK (VALUE ~ '^a{1,3}$')`)
  })

  afterAll(async () => pg.close())

  it('runs supported Rust checks and unsupported fallback checks through generated validators', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find(
      (item) => item.schema === 'public' && item.name === 'regulated',
    )!
    const caseTable = catalog.tables.find(
      (item) => item.schema === 'public' && item.name === 'case_rust',
    )!
    const typescript = renderTypescriptSchemaCheckArtifacts([table, caseTable])
    const go = renderGoSchemaCheckArtifacts(
      [table, caseTable],
      'mixed',
      [],
      [],
      catalog,
      parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
      undefined,
      'check-rust-production',
    )
    expect(typescript.rust).not.toBeNull()
    expect(go.rust).not.toBeNull()
    expect(typescript.checks).toContain('_checkRust.evaluateCheck')
    expect(typescript.checks).toContain('evalBool')
    expect(go.checks).toContain('checkRustOutcome(checkrust.EvaluateCheck')
    expect(typescript.checks).toMatch(/constraint: "email_length", result: checkRustOutcome/u)
    expect(go.checks).toMatch(/Constraint: "email_length",\s*Result: checkRustOutcome/u)
    expect(typescript.checks).toMatch(/constraint: "amount_plus", result: checkRustOutcome/u)
    expect(go.checks).toMatch(/Constraint: "amount_minus",\s*Result: checkRustOutcome/u)
    expect(typescript.checks).toMatch(/constraint: "enabled_equal", result: checkRustOutcome/u)
    expect(go.checks).toMatch(/Constraint: "enabled_unequal",\s*Result: checkRustOutcome/u)
    expect(typescript.checks).toMatch(/constraint: "enabled_less", result: checkRustOutcome/u)
    expect(typescript.checks).toMatch(/constraint: "negative_floor", result: checkRustOutcome/u)
    expect(typescript.checks).toMatch(/constraint: "minimum_floor", result: checkRustOutcome/u)
    expect(typescript.checks).toMatch(/constraint: "conditional_check", result: checkRustOutcome/u)
    for (const name of [
      'simple_int4',
      'simple_bool',
      'simple_text',
      'scalar_int4',
      'scalar_text',
      'scalar_bool',
      'scalar_no_else',
    ]) {
      expect(typescript.checks).toMatch(
        new RegExp(`constraint: "${name}", result: checkRustOutcome`),
      )
      expect(go.checks).toMatch(new RegExp(`Constraint: "${name}",\\s*Result: checkRustOutcome`))
    }
    expect(typescript.checks).toMatch(/constraint: "id_positive", result: \(\(\) =>/u)

    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-rust-production-'))
    try {
      await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
      await writeFile(join(directory, 'checks.ts'), typescript.checks)
      for (const artifact of checkTypescriptArtifacts(typescript.rustFiles!)) {
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
        join(directory, 'checks-rust/checks.ts'),
      ])
      const generated = await import(pathToFileURL(join(directory, 'js', 'checks.js')).href)
      const result = generated.evaluatePublicRegulatedChecks({ email: 'b', amount: 1 }) as {
        constraint: string
        result: { certain: boolean; value?: boolean | null }
      }[]
      expect(result.map((item) => item.constraint)).toEqual(
        catalogCheckGroups([table], [], [])[0]!.checks.map((item) => item.plan.name),
      )
      expect(result.find((item) => item.constraint === 'email_format')?.result).toEqual({
        certain: true,
        value: false,
      })
      expect(result.find((item) => item.constraint === 'email_length')?.result).toEqual({
        certain: true,
        value: true,
      })
      for (const name of ['amount_plus', 'amount_minus']) {
        expect(result.find((item) => item.constraint === name)?.result).toEqual({
          certain: true,
          value: true,
        })
      }
      expect(() => generated.evaluatePublicRegulatedChecks({ amount: 2147483647 })).toThrowError(
        expect.objectContaining({ code: '22003' }),
      )
      expect(() => generated.evaluatePublicRegulatedChecks({ amount: -2147483648 })).toThrowError(
        expect.objectContaining({ code: '22003' }),
      )
      const enabledTrue = generated.evaluatePublicRegulatedChecks({
        enabled: true,
      }) as typeof result
      const enabledFalse = generated.evaluatePublicRegulatedChecks({
        enabled: false,
      }) as typeof result
      for (const name of ['enabled_equal', 'enabled_unequal']) {
        expect(enabledTrue.find((item) => item.constraint === name)?.result).toEqual({
          certain: true,
          value: true,
        })
        expect(enabledFalse.find((item) => item.constraint === name)?.result).toEqual({
          certain: true,
          value: false,
        })
      }
      expect(enabledTrue.find((item) => item.constraint === 'enabled_less')?.result).toEqual({
        certain: true,
        value: false,
      })
      expect(enabledFalse.find((item) => item.constraint === 'enabled_less')?.result).toEqual({
        certain: true,
        value: true,
      })
      expect(enabledTrue.find((item) => item.constraint === 'id_positive')?.result).toEqual({
        certain: false,
      })
      expect(
        (generated.evaluatePublicRegulatedChecks({ enabled: null }) as typeof result).find(
          (item) => item.constraint === 'enabled_equal',
        )?.result,
      ).toEqual({ certain: true, value: null })
      for (const [email, expected] of [
        ['', false],
        ['😀', true],
      ] as const) {
        const row = generated.evaluatePublicRegulatedChecks({ email }) as typeof result
        expect(row.find((item) => item.constraint === 'email_length')?.result).toEqual({
          certain: true,
          value: expected,
        })
      }
      expect(result.find((item) => item.constraint === 'id_positive')?.result).toEqual({
        certain: false,
      })
      const nullEmail = generated.evaluatePublicRegulatedChecks({ email: null }) as typeof result
      expect(nullEmail.find((item) => item.constraint === 'email_format')?.result).toEqual({
        certain: true,
        value: null,
      })
      const outsideInt4 = generated.evaluatePublicRegulatedChecks({
        email: 'a',
        amount: 2147483648n,
      }) as typeof result
      expect(outsideInt4.find((item) => item.constraint === 'with_unknown')?.result).toEqual({
        certain: false,
      })
      expect(() =>
        generated.evaluatePublicRegulatedChecks({ email: 'a', pattern: '(' }),
      ).toThrowError(expect.objectContaining({ code: '2201B' }))
      const conditional = generated.evaluatePublicCaseRustChecks({
        amount: -2,
        flag: false,
        note: null,
      }) as typeof result
      expect(conditional.find((item) => item.constraint === 'negative_floor')?.result).toEqual({
        certain: true,
        value: false,
      })
      expect(conditional.find((item) => item.constraint === 'minimum_floor')?.result).toEqual({
        certain: true,
        value: true,
      })
      expect(conditional.find((item) => item.constraint === 'conditional_check')?.result).toEqual({
        certain: true,
        value: true,
      })
      const lazyCase = generated.evaluatePublicCaseRustChecks({
        amount: 2147483647,
        flag: false,
        note: null,
      }) as typeof result
      expect(lazyCase.find((item) => item.constraint === 'conditional_check')?.result).toEqual({
        certain: true,
        value: true,
      })
      expect(() =>
        generated.evaluatePublicCaseRustChecks({ amount: 2147483647, flag: true, note: null }),
      ).toThrowError(expect.objectContaining({ code: '22003' }))

      for (const [name, expected] of Object.entries({
        simple_int4: false,
        simple_bool: true,
        simple_text: true,
        scalar_int4: false,
        scalar_text: true,
        scalar_bool: true,
        scalar_no_else: true,
      })) {
        expect(conditional.find((item) => item.constraint === name)?.result).toEqual({
          certain: true,
          value: expected,
        })
      }
      const partialCase = generated.evaluatePublicCaseRustChecks({
        amount: 1,
        flag: true,
      }) as typeof result
      expect(partialCase.find((item) => item.constraint === 'simple_int4')?.result).toEqual({
        certain: false,
      })
      expect(partialCase.find((item) => item.constraint === 'scalar_text')?.result).toEqual({
        certain: false,
      })
      const nullGuard = generated.evaluatePublicCaseRustChecks({
        amount: 0,
        flag: null,
        note: null,
      }) as typeof result
      expect(nullGuard.find((item) => item.constraint === 'simple_bool')?.result).toEqual({
        certain: true,
        value: null,
      })
      expect(nullGuard.find((item) => item.constraint === 'scalar_no_else')?.result).toEqual({
        certain: true,
        value: true,
      })

      await writeFile(join(directory, 'go.mod'), 'module check-rust-production\n\ngo 1.24\n')
      await writeFile(join(directory, 'checks.go'), go.checks)
      await mkdir(join(directory, 'checkrust', 'pg_catalog'), { recursive: true })
      await mkdir(join(directory, 'checkrust', 'regexengine'), { recursive: true })
      await mkdir(join(directory, 'checkrust', 'checkruntime'), { recursive: true })
      await mkdir(join(directory, 'checkrust', 'langruntime'), { recursive: true })
      await writeFile(
        join(directory, 'checkrust', 'checkruntime', 'runtime.go'),
        go.rustFiles!.runtime,
      )
      await writeFile(
        join(directory, 'checkrust', 'langruntime', 'runtime.go'),
        go.rustFiles!.language,
      )
      await writeFile(join(directory, 'checkrust', 'checks.go'), go.rustFiles!.checks)
      await writeFile(
        join(directory, 'checkrust', 'pg_catalog', 'operations.go'),
        go.rustFiles!.operations,
      )
      if (go.rustFiles!.regex)
        await writeFile(
          join(directory, 'checkrust', 'regexengine', 'regex.go'),
          go.rustFiles!.regex,
        )
      await writeFile(
        join(directory, 'checks_test.go'),
        `package mixed
import (
  "testing"
  checkruntime "check-rust-production/checkrust/checkruntime"
)
func ptr[T any](value T) *T { return &value }
func TestMixedChecks(t *testing.T) {
  checks := EvaluatePublicRegulatedChecks(PublicRegulatedCheckInput{Email: KnownCheckValue(ptr("b")), Amount: KnownCheckValue(ptr(int32(1))), Enabled: KnownCheckValue(ptr(true))})
  results := map[string]EvalBool{}
  for _, check := range checks { results[check.Constraint] = check.Result }
  if result := results["email_format"]; !result.Certain || !result.Value.Valid || result.Value.Value { t.Fatalf("Rust CHECK: %+v", result) }
  if result := results["email_length"]; !result.Certain || !result.Value.Valid || !result.Value.Value { t.Fatalf("length CHECK: %+v", result) }
  for _, name := range []string{"amount_plus", "amount_minus"} { if result := results[name]; !result.Certain || !result.Value.Valid || !result.Value.Value { t.Fatalf("arithmetic CHECK %s: %+v", name, result) } }
  maxRows := EvaluatePublicRegulatedChecks(PublicRegulatedCheckInput{Amount: KnownCheckValue(ptr(int32(2147483647)))})
  for _, check := range maxRows { if check.Constraint == "amount_plus" && check.Result.Value.Error != "22003" { t.Fatalf("addition overflow: %+v", check.Result) } }
  minRows := EvaluatePublicRegulatedChecks(PublicRegulatedCheckInput{Amount: KnownCheckValue(ptr(int32(-2147483648)))})
  for _, check := range minRows { if check.Constraint == "amount_minus" && check.Result.Value.Error != "22003" { t.Fatalf("subtraction overflow: %+v", check.Result) } }
  for _, name := range []string{"enabled_equal", "enabled_unequal"} { if result := results[name]; !result.Certain || !result.Value.Valid || !result.Value.Value { t.Fatalf("boolean CHECK %s: %+v", name, result) } }
  if result := results["enabled_less"]; !result.Certain || !result.Value.Valid || result.Value.Value { t.Fatalf("boolean ordering CHECK: %+v", result) }
  if result := results["id_positive"]; result.Certain { t.Fatalf("missing input: %+v", result) }
  empty := EvaluatePublicRegulatedChecks(PublicRegulatedCheckInput{Email: KnownCheckValue(ptr(""))})
  for _, check := range empty { if check.Constraint == "email_length" && (!check.Result.Certain || !check.Result.Value.Valid || check.Result.Value.Value) { t.Fatalf("empty length: %+v", check.Result) } }
  knownId := EvaluatePublicRegulatedChecks(PublicRegulatedCheckInput{Id: KnownCheckValue(int64(1))})
  for _, check := range knownId { if check.Constraint == "id_positive" && (!check.Result.Certain || !check.Result.Value.Valid || !check.Result.Value.Value) { t.Fatalf("fallback CHECK: %+v", check.Result) } }
  if value := checkRustInt4(KnownCheckValue(int64(2147483648))); value.Kind != checkruntime.Int4ValueUnknown { t.Fatalf("int4 range: %+v", value) }
  if value := checkRustText(NullCheckValue[*string]()); value.Kind != checkruntime.TextValueNull { t.Fatalf("SQL null: %+v", value) }
  incoming := checkRustInt4(KnownCheckValue(SqlInteger{Error: "22003"}))
  if incoming.Kind != checkruntime.Int4ValueError { t.Fatalf("input error: %+v", incoming) }
  outgoing := checkRustOutcome(checkruntime.CheckOutcome{Kind: checkruntime.CheckOutcomeError, Error: incoming.Error})
  if !outgoing.Certain || outgoing.Value.Error != "22003" { t.Fatalf("SQLSTATE round trip: %+v", outgoing) }
  caseRows := EvaluatePublicCaseRustChecks(PublicCaseRustCheckInput{Amount: KnownCheckValue(ptr(int32(-2))), Flag: KnownCheckValue(ptr(false)), Note: NullCheckValue[*string]()})
  caseResults := map[string]EvalBool{}
  for _, check := range caseRows { caseResults[check.Constraint] = check.Result }
  if value := caseResults["negative_floor"]; !value.Certain || !value.Value.Valid || value.Value.Value { t.Fatalf("negative literal: %+v", value) }
  if value := caseResults["minimum_floor"]; !value.Certain || !value.Value.Valid || !value.Value.Value { t.Fatalf("minimum literal: %+v", value) }
  if value := caseResults["conditional_check"]; !value.Certain || !value.Value.Valid || !value.Value.Value { t.Fatalf("CASE fallback arm: %+v", value) }
  for name, expected := range map[string]bool{"simple_int4": false, "simple_bool": true, "simple_text": true, "scalar_int4": false, "scalar_text": true, "scalar_bool": true, "scalar_no_else": true} {
    if value := caseResults[name]; !value.Certain || !value.Value.Valid || value.Value.Value != expected { t.Fatalf("%s: %+v", name, value) }
  }
  partialCases := EvaluatePublicCaseRustChecks(PublicCaseRustCheckInput{Amount: KnownCheckValue(ptr(int32(1))), Flag: KnownCheckValue(ptr(true))})
  for _, check := range partialCases { if (check.Constraint == "simple_int4" || check.Constraint == "scalar_text") && check.Result.Certain { t.Fatalf("missing CASE input %s: %+v", check.Constraint, check.Result) } }
  nullCases := EvaluatePublicCaseRustChecks(PublicCaseRustCheckInput{Amount: KnownCheckValue(ptr(int32(0))), Flag: NullCheckValue[*bool](), Note: NullCheckValue[*string]()})
  for _, check := range nullCases { if check.Constraint == "simple_bool" && (!check.Result.Certain || check.Result.Value.Valid) { t.Fatalf("NULL simple CASE: %+v", check.Result) } }
  lazyCase := EvaluatePublicCaseRustChecks(PublicCaseRustCheckInput{Amount: KnownCheckValue(ptr(int32(2147483647))), Flag: KnownCheckValue(ptr(false)), Note: NullCheckValue[*string]()})
  for _, check := range lazyCase { if check.Constraint == "conditional_check" && (!check.Result.Certain || !check.Result.Value.Valid || !check.Result.Value.Value) { t.Fatalf("lazy CASE: %+v", check.Result) } }
  selectedCase := EvaluatePublicCaseRustChecks(PublicCaseRustCheckInput{Amount: KnownCheckValue(ptr(int32(2147483647))), Flag: KnownCheckValue(ptr(true)), Note: NullCheckValue[*string]()})
  for _, check := range selectedCase { if check.Constraint == "conditional_check" && check.Result.Value.Error != "22003" { t.Fatalf("selected CASE overflow: %+v", check.Result) } }
}`,
      )
      await run(process.env.PGSID_GO_BINARY ?? 'go', ['test', '.'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: join(tmpdir(), 'pgsid-check-rust-go-cache') },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

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

  it('preserves CASE behavior and a single scrutinee binding in fallback validators', async () => {
    const catalog = await snapshotCatalog(pg)
    const caseTable = catalog.tables.find((item) => item.name === 'case_rust')!
    const table = {
      ...caseTable,
      constraints: [
        ...caseTable.constraints.filter(
          (item) => item.name.startsWith('simple_') || item.name.startsWith('scalar_'),
        ),
        {
          ...caseTable.constraints[0]!,
          name: 'simple_once',
          type: 'check' as const,
          definition:
            'CHECK (CASE amount + 1 WHEN 0 THEN true WHEN 1 THEN false ELSE flag IS NULL END)',
        },
      ],
    }
    const rows = [
      { amount: -2, flag: false, note: null },
      { amount: 0, flag: null, note: 'a' },
      { amount: 1, flag: true, note: null },
      { amount: 1, flag: true },
      { flag: false, note: 'a' },
    ]
    const expected = [
      {
        simple_int4: false,
        simple_bool: true,
        simple_text: true,
        scalar_int4: false,
        scalar_text: true,
        scalar_bool: true,
        scalar_no_else: true,
        simple_once: false,
      },
      {
        simple_int4: true,
        simple_bool: null,
        simple_text: true,
        scalar_int4: false,
        scalar_text: true,
        scalar_bool: true,
        scalar_no_else: true,
        simple_once: false,
      },
      {
        simple_int4: true,
        simple_bool: true,
        simple_text: true,
        scalar_int4: true,
        scalar_text: null,
        scalar_bool: true,
        scalar_no_else: false,
        simple_once: false,
      },
      {
        simple_int4: undefined,
        simple_bool: true,
        simple_text: undefined,
        scalar_int4: true,
        scalar_text: undefined,
        scalar_bool: true,
        scalar_no_else: false,
        simple_once: false,
      },
      {
        simple_int4: undefined,
        simple_bool: false,
        simple_text: true,
        scalar_int4: false,
        scalar_text: true,
        scalar_bool: undefined,
        scalar_no_else: true,
        simple_once: undefined,
      },
    ]
    const source = renderTypescriptSchemaChecks([table])
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-case-fallback-'))
    try {
      await writeFile(join(directory, 'checks.ts'), source)
      await run('node_modules/.bin/tsc', [
        '--strict',
        '--noEmit',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'esnext',
        join(directory, 'checks.ts'),
      ])
      const js = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText
      const evaluate = Function('exports', `${js}; return evaluatePublicCaseRustChecks`)({}) as (
        row: Record<string, unknown>,
      ) => { constraint: string; result: { certain: boolean; value?: boolean | null } }[]
      for (const [index, row] of rows.entries()) {
        expect(
          Object.fromEntries(
            evaluate(row).map((item) => [
              item.constraint,
              item.result.certain ? item.result.value : undefined,
            ]),
          ),
        ).toEqual(expected[index])
      }
      const onceSource = renderTypescriptSchemaChecks([
        { ...table, constraints: table.constraints.filter((item) => item.name === 'simple_once') },
      ])
      const onceJs = ts.transpileModule(onceSource, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText
      const evaluateOnce = Function(
        'exports',
        `${onceJs}; return evaluatePublicCaseRustChecks`,
      )({}) as typeof evaluate
      let reads = 0
      const input = {
        flag: false,
        get amount() {
          reads++
          return 0
        },
      }
      expect(evaluateOnce(input)[0]!.result).toEqual({ certain: true, value: false })
      expect(reads).toBe(1)
      const goSource = renderGoSchemaChecks(
        [table],
        'cases',
        [],
        [],
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
      )
      const goRows = rows.map(
        (row) =>
          'PublicCaseRustCheckInput{' +
          Object.entries(row)
            .map(([name, value]) => {
              const field = name[0]!.toUpperCase() + name.slice(1)
              const type = name === 'amount' ? 'int32' : name === 'flag' ? 'bool' : 'string'
              return `${field}: ${value === null ? `NullCheckValue[*${type}]()` : `KnownCheckValue(ptr(${type}(${JSON.stringify(value)})))`}`
            })
            .join(', ') +
          '}',
      )
      const assertions = expected.flatMap((row, index) =>
        Object.entries(row).map(
          ([name, value]) =>
            `if result := results[${index}]["${name}"]; ${value === undefined ? 'result.Certain' : value === null ? '!result.Certain || result.Value.Valid' : `!result.Certain || !result.Value.Valid || result.Value.Value != ${value}`} {t.Fatalf("${index} ${name}: %+v", result)}`,
        ),
      )
      await writeFile(join(directory, 'go.mod'), 'module case-fallback\n\ngo 1.24\n')
      await writeFile(join(directory, 'checks.go'), goSource)
      await writeFile(
        join(directory, 'checks_test.go'),
        `package cases\nimport "testing"\nfunc ptr[T any](value T) *T {return &value}\nfunc TestCases(t *testing.T) {\nrows := []PublicCaseRustCheckInput{${goRows.join(', ')}}\nresults := []map[string]EvalBool{}\nfor _, row := range rows {values := map[string]EvalBool{}; for _, check := range EvaluatePublicCaseRustChecks(row) {values[check.Constraint] = check.Result}; results = append(results, values)}\n${assertions.join('\n')}\n}`,
      )
      await run('go', ['test', '.'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
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

  it('omits input codecs when a CHECK cannot be evaluated locally', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'regulated')!
    const unsupported = {
      ...table,
      constraints: table.constraints.filter((item) => item.name === 'ordinary_equality'),
    }
    const typescript = renderTypescriptSchemaChecks([unsupported])
    expect(typescript).not.toContain('function checkRawInput(')
    const goSource = renderGoSchemaChecks(
      [unsupported],
      'main',
      [],
      [],
      catalog,
      parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
    )
    expect(goSource).not.toContain('func checkPrimitive(')
    expect(goSource).not.toContain('"reflect"')
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
    expect(plans).toHaveLength(1)
    expect(
      plans[0]!.columns
        .map(({ name, parameter }) => ({ name, parameter }))
        .sort((left, right) => left.parameter - right.parameter),
    ).toEqual([
      { name: 'email', parameter: 1 },
      { name: 'amount', parameter: 2 },
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
      constraint: 'amount_minus',
    })
    expect(queries).toBe(0)
    await module.exports['insertRegulated']!(db, { email: 'a', amount: 1 })
    expect(queries).toBe(1)
    await module.exports['insertRegulated']!(db, { email: null, amount: 1 })
    expect(queries).toBe(2)

    const rustQuery = renderTypescriptQueryArtifacts(
      [item],
      config,
      {},
      {
        catalog,
        checkRustModuleSpecifier: './query.check-rust/checks.js',
      },
    )
    expect(rustQuery.checkRust).not.toBeNull()
    expect(rustQuery.runtime).toContain('from "./query.check-rust/checks.js"')
    const rustDirectory = await mkdtemp(join(tmpdir(), 'pgsid-query-rust-ts-'))
    try {
      await writeFile(join(rustDirectory, 'package.json'), '{"type":"module"}\n')
      await writeFile(join(rustDirectory, 'query.ts'), rustQuery.runtime!)
      for (const artifact of checkTypescriptArtifacts(rustQuery.checkRustFiles!)) {
        const path = join(rustDirectory, 'query.check-rust', artifact.path)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, artifact.content)
      }
      await writeFile(join(rustDirectory, 'types.d.ts'), rustQuery.types!)
      await run('node_modules/.bin/tsc', [
        '--strict',
        '--noEmit',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        join(rustDirectory, 'query.ts'),
        join(rustDirectory, 'query.check-rust/checks.ts'),
        join(rustDirectory, 'types.d.ts'),
      ])
    } finally {
      await rm(rustDirectory, { recursive: true, force: true })
    }

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
      const goSupport = renderGoSchemaCheckArtifacts(
        [plans[0]!.table],
        'pgsidpgx',
        [],
        [],
        catalog,
        config,
        undefined,
        'example.com/checks/pgsid/pgx',
      )
      expect(goSupport.rust).not.toBeNull()
      await writeFile(join(helperDir, 'checks.go'), goSupport.checks)
      await mkdir(join(helperDir, 'checkrust', 'pg_catalog'), { recursive: true })
      await mkdir(join(helperDir, 'checkrust', 'regexengine'), { recursive: true })
      await mkdir(join(helperDir, 'checkrust', 'checkruntime'), { recursive: true })
      await mkdir(join(helperDir, 'checkrust', 'langruntime'), { recursive: true })
      await writeFile(
        join(helperDir, 'checkrust', 'checkruntime', 'runtime.go'),
        goSupport.rustFiles!.runtime,
      )
      await writeFile(
        join(helperDir, 'checkrust', 'langruntime', 'runtime.go'),
        goSupport.rustFiles!.language,
      )
      await writeFile(join(helperDir, 'checkrust', 'checks.go'), goSupport.rustFiles!.checks)
      await writeFile(
        join(helperDir, 'checkrust', 'pg_catalog', 'operations.go'),
        goSupport.rustFiles!.operations,
      )
      if (goSupport.rustFiles!.regex)
        await writeFile(
          join(helperDir, 'checkrust', 'regexengine', 'regex.go'),
          goSupport.rustFiles!.regex,
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
