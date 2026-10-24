import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('retains reached XPath requirement provenance through projections and lazy CHECK composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xpath-diagnostics-')),
    packet = 'artifacts/goal-checks/xml-xpath-diagnostics-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const captured = await pg.exec(
      await readFile('tools/check-rust/xpath-power-context.sql', 'utf8'),
    )
    const words = captured.flatMap((r) => r.rows).find((r) => 'xpathPowerOfTenBits' in r)![
      'xpathPowerOfTenBits'
    ] as string[]
    await pg.exec('SET extra_float_digits=1')
    const expressions = {
      exists: 'xpath_exists(p,v)',
      first: '(xpath(p,v))[position]::text=expected',
      distinct: '(xpath(p,v))[position]::text IS NOT DISTINCT FROM expected',
      count: 'cardinality(xpath(p,v))=1',
      count_flag: 'cardinality(xpath(p,v))=1 AND flag',
      or_gate: '((xpath(p,v))[position]::text=expected) OR gate',
      gate_or: 'gate OR xpath_exists(p,v)',
      and_gate: 'xpath_exists(p,v) AND gate',
      case_bool: 'CASE WHEN gate THEN true ELSE xpath_exists(p,v) END',
      case_text: "(CASE WHEN gate THEN 'chosen' ELSE (xpath(p,v))[position]::text END)=expected",
      coalesce: "COALESCE((xpath(p,v))[position]::text,'fallback')=expected",
      opaque: 'lower((xpath(p,v))[position]::text)=expected',
      array_text: 'xpath(p,v)::text=expected',
      namespaces: "xpath_exists(p,v,ARRAY[ARRAY['p',namespace]])",
      both: "(xpath(p,v))[1]::text=expected AND (xpath('1 div 3',v))[1]::text=expected",
    }
    const definitions = Object.entries(expressions).map(([name, expression], selector) => ({
      name,
      expression,
      selector,
      sql: `CASE WHEN selector<>${selector} THEN true ELSE (${expression}) END`,
    }))
    await pg.exec(
      `CREATE TABLE xpath_diagnostic_checked(v xml,p text,expected text,gate bool,flag bool,position int,selector int,namespace text,${definitions.map((c) => `CONSTRAINT "${c.name}" CHECK(${c.sql})`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xpath_diagnostic_checked')!
    const full = {
      defaultCollation: 'C' as const,
      defaultCtype: 'C' as const,
      serverEncoding: 'UTF8' as const,
      extraFloatDigits: 1,
      xpathRecursionLimit: 5000,
      xpathPowerOfTenBits: words,
    }
    const { extraFloatDigits: _digits, ...noDigits } = full,
      { serverEncoding: _encoding, ...noEncoding } = full,
      { xpathPowerOfTenBits: _powers, ...noPowers } = full,
      { xpathRecursionLimit: _limit, ...noLimit } = full
    const profiles = [
      { name: 'full', context: full },
      { name: 'no_digits', context: noDigits },
      { name: 'no_encoding', context: noEncoding },
      { name: 'no_powers', context: noPowers },
      { name: 'no_limit', context: noLimit },
      {
        name: 'no_numbers',
        context: {
          defaultCollation: 'C' as const,
          serverEncoding: 'UTF8' as const,
          xpathRecursionLimit: 5000,
        },
      },
    ]
    const groups = profiles.map((profile) =>
      prepareCheckRustGroup(
        definitions.flatMap((c) =>
          ['source', 'stored'].map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: profile.name + '_' + c.name + '_' + origin,
            },
            expression: lowerTableCheck(
              table,
              table.constraints.find((x) => x.name === c.name)!,
              [],
              [],
              origin as 'source' | 'stored',
              [],
              undefined,
              origin === 'source' ? `CHECK(${c.sql})` : undefined,
            )!.expression,
          })),
        ),
        profile.context,
      ),
    )
    for (const group of groups)
      expect(group.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual([])
    const probes: string[] = [],
      probeChecks: Array<(typeof groups)[number]['checks'][number]> = [],
      names: string[] = []
    for (const [profileIndex, profile] of profiles.entries())
      for (const [definitionIndex, c] of definitions.entries())
        for (const [originIndex, origin] of ['source', 'stored'].entries()) {
          const check = groups[profileIndex]!.checks[definitionIndex * 2 + originIndex]!
          if (check.kind !== 'supported') throw new Error('unsupported')
          if (c.name !== 'opaque')
            expect(
              check.diagnosticEntryName,
              profile.name + '_' + c.name + '_' + origin,
            ).toBeTruthy()
          const entryName = check.entryName.replace(/(_h[a-z0-9]{4})$/u, '_reason$1'),
            probeName = profile.name + '_' + c.name + '_' + origin + '_reason'
          const diagnostic = check.diagnosticEntryName
            ? `let result=${check.diagnosticEntryName}(${check.inputs.map((input) => input.rustName).join(',')});`
            : `let outcome=${check.entryName}(${check.inputs.map((input) => input.rustName).join(',')}); let reason=check_requirement_for_outcome(outcome,-1); let result=make_check_evaluation_result(outcome,reason);`
          probes.push(
            `pub fn ${entryName}(${check.inputs
              .map((input) => `${input.rustName}:${input.rustType}`)
              .concat('expected_reason:Int4Value')
              .join(
                ',',
              )})->CheckOutcome { ${diagnostic} let actual=check_evaluation_reason(result); let same=sql__pg_catalog__int4eq__lrxe(actual,expected_reason); check_from_bool(same) }`,
          )
          probeChecks.push({
            ...check,
            entryName,
            inputs: [
              ...check.inputs,
              {
                name: 'expected_reason',
                rustName: 'expected_reason',
                type: 'pg_catalog.int4',
                rustType: 'Int4Value',
              },
            ],
          })
          names.push(probeName)
        }
    const evaluatorSource =
      groups.map((g) => g.evaluatorSource).join('\n') + '\n' + probes.join('\n')
    const group = {
      ...groups[0]!,
      checks: [...groups.flatMap((g) => g.checks), ...probeChecks],
      evaluatorSource,
      source: {
        ...groups[0]!.source!,
        modules: groups[0]!.source!.modules.map((m) =>
          m.name === 'checks'
            ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
            : m,
        ),
      },
    }
    const checkNames = profiles
      .flatMap((profile) =>
        definitions.flatMap((c) =>
          ['source', 'stored'].map((origin) => profile.name + '_' + c.name + '_' + origin),
        ),
      )
      .concat(names)
    type Sample = {
      check: keyof typeof expressions
      profile?: string
      patch?: Row
      reason: number
      outcome?: Outcome
    }
    const samples: Sample[] = [
      {
        check: 'namespaces',
        patch: { namespace: { kind: 'Unknown' } },
        reason: 256,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'first',
        patch: {
          v: known('<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>'),
          p: known('/'),
        },
        reason: 32,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'both',
        profile: 'no_digits',
        patch: {
          v: known('<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>'),
          p: known('/'),
        },
        reason: 48,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'both',
        profile: 'no_numbers',
        patch: { p: known("number('1e23')") },
        reason: 17,
        outcome: { kind: 'Unknown' },
      },
      { check: 'exists', reason: 0 },
      { check: 'first', reason: 0 },
      { check: 'distinct', reason: 0 },
      { check: 'count', reason: 0 },
      { check: 'first', profile: 'no_digits', reason: 16, outcome: { kind: 'Unknown' } },
      { check: 'distinct', profile: 'no_digits', reason: 16, outcome: { kind: 'Unknown' } },
      {
        check: 'first',
        profile: 'no_powers',
        patch: { p: known("number('1e23')") },
        reason: 1,
        outcome: { kind: 'Unknown' },
      },
      { check: 'exists', profile: 'no_encoding', reason: 64, outcome: { kind: 'Unknown' } },
      {
        check: 'exists',
        profile: 'no_limit',
        patch: { p: known('('.repeat(52) + 'true()' + ')'.repeat(52)) },
        reason: 8,
        outcome: { kind: 'Unknown' },
      },
      { check: 'exists', profile: 'no_digits', reason: 0 },
      { check: 'count', profile: 'no_digits', reason: 0 },
      {
        check: 'count_flag',
        profile: 'no_digits',
        patch: { flag: { kind: 'Unknown' } },
        reason: -1,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'first',
        profile: 'no_digits',
        patch: { expected: { kind: 'Unknown' } },
        reason: -1,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'or_gate',
        profile: 'no_digits',
        patch: { gate: known(true) },
        reason: 0,
        outcome: { kind: 'True' },
      },
      {
        check: 'gate_or',
        profile: 'no_encoding',
        patch: { gate: known(true) },
        reason: 0,
        outcome: { kind: 'True' },
      },
      {
        check: 'gate_or',
        patch: { gate: { kind: 'Unknown' } },
        reason: 0,
        outcome: { kind: 'True' },
      },
      {
        check: 'gate_or',
        profile: 'no_encoding',
        patch: { gate: { kind: 'Unknown' } },
        reason: -1,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'and_gate',
        profile: 'no_encoding',
        patch: { gate: known(false) },
        reason: 64,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'case_bool',
        profile: 'no_encoding',
        patch: { gate: known(true) },
        reason: 0,
        outcome: { kind: 'True' },
      },
      {
        check: 'case_bool',
        profile: 'no_encoding',
        patch: { gate: known(false) },
        reason: 64,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'case_text',
        profile: 'no_digits',
        patch: { gate: known(true), expected: known('chosen') },
        reason: 0,
        outcome: { kind: 'True' },
      },
      {
        check: 'case_text',
        profile: 'no_digits',
        patch: { gate: known(false) },
        reason: 16,
        outcome: { kind: 'Unknown' },
      },
      {
        check: 'case_text',
        profile: 'no_digits',
        patch: { gate: { kind: 'Unknown' } },
        reason: -1,
        outcome: { kind: 'Unknown' },
      },
      { check: 'coalesce', profile: 'no_digits', reason: 16, outcome: { kind: 'Unknown' } },
      { check: 'opaque', profile: 'no_digits', reason: -1, outcome: { kind: 'Unknown' } },
      { check: 'array_text', profile: 'no_digits', reason: 16, outcome: { kind: 'Unknown' } },
      {
        check: 'first',
        profile: 'no_digits',
        patch: { position: known(99) },
        reason: 0,
        outcome: { kind: 'Null' },
      },
      {
        check: 'first',
        profile: 'no_digits',
        patch: { p: known('/missing') },
        reason: 0,
        outcome: { kind: 'Null' },
      },
      {
        check: 'exists',
        profile: 'no_encoding',
        patch: { p: known(null) },
        reason: 0,
        outcome: { kind: 'Null' },
      },
      { check: 'exists', patch: { p: known('[') }, reason: 0 },
      { check: 'first', patch: { expected: known('wrong') }, reason: 0 },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
    for (const sample of samples) {
      const definition = definitions.find((c) => c.name === sample.check)!,
        profile = sample.profile ?? 'full'
      const row: Row = {
        v: known('<r/>'),
        p: known('1 div 3'),
        expected: known('0.3333333333333333'),
        gate: known(false),
        flag: known(true),
        position: known(1),
        selector: known(definition.selector),
        namespace: known('urn:p'),
        ...sample.patch,
      }
      let expected = sample.outcome
      let native: Outcome | undefined
      if (Object.values(row).every((input) => input.kind !== 'Unknown')) {
        const values = Object.entries(row)
          .map(([key, input]) =>
            input.kind === 'Value'
              ? `${typeof input.value === 'string' ? quote(input.value) : String(input.value)}::${key === 'v' ? 'xml' : key === 'p' || key === 'expected' || key === 'namespace' ? 'text' : key === 'selector' || key === 'position' ? 'int' : 'bool'} AS ${key}`
              : `NULL AS ${key}`,
          )
          .join(',')
        try {
          const result = await pg.query<{ value: boolean | null }>(
            `SELECT (${definition.expression})value FROM (SELECT ${values})r`,
          )
          native = {
            kind:
              result.rows[0]!.value === null ? 'Null' : result.rows[0]!.value ? 'True' : 'False',
          }
        } catch (error) {
          native = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        const cells = Object.values(row)
          .map((input) =>
            input.kind === 'Value'
              ? typeof input.value === 'string'
                ? quote(input.value)
                : String(input.value)
              : 'NULL',
          )
          .join(',')
        let rejected = false
        try {
          await pg.exec(`INSERT INTO xpath_diagnostic_checked VALUES(${cells})`)
        } catch {
          rejected = true
        }
        expect(rejected).toBe(native.kind === 'False' || native.kind === 'Error')
        if (expected && expected.kind !== 'Unknown') expect(native).toEqual(expected)
        expected ??= native
        inserts++
      }
      if (!expected) throw new Error('Missing expected local outcome')
      for (const origin of ['source', 'stored']) {
        const name = profile + '_' + sample.check + '_' + origin
        fixtures.push(
          { name, row, expected },
          {
            name: name + '_reason',
            row: { ...row, expected_reason: known(sample.reason) },
            expected: { kind: 'True' },
          },
        )
      }
      reference.push({ sample, row, expected, native })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify({ fixtures: fixtures.length, inserts, reference }, null, 2) + '\n',
    )
    await writeFile(packet + '/evaluators.rs', evaluatorSource)
    await writeFile(
      packet + '/lowered-first.json',
      JSON.stringify(
        lowerTableCheck(
          table,
          table.constraints.find((x) => x.name === 'first')!,
          [],
          [],
          'source',
          [],
          undefined,
          `CHECK(${definitions.find((x) => x.name === 'first')!.sql})`,
        ),
        null,
        2,
      ),
    )
    await runCheckParity(root, 'xpathdiagnostics', group, checkNames, fixtures)
    console.info('XPath composed diagnostics parity', { fixtures: fixtures.length, inserts })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
