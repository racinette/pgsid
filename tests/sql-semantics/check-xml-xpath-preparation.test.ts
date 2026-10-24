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

const deep = '('.repeat(52) + 'true()' + ')'.repeat(52)
const expressions = {
  constant_path: "CASE WHEN gate THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  runtime_document: "CASE WHEN gate THEN true ELSE xpath_exists('[',v) END",
  runtime_path: "CASE WHEN gate THEN true ELSE xpath_exists(p,'<r/>'::xml) END",
  constant_content: "CASE WHEN gate THEN true ELSE xpath_exists('false()','plain'::xml) END",
  constant_null: "CASE WHEN gate THEN true ELSE xpath_exists('[',NULL::xml) END",
  null_path: "CASE WHEN gate THEN true ELSE xpath_exists(NULL::text,'plain'::xml) END",
  constant_guard: "CASE WHEN true THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  constant_else: "CASE WHEN false THEN xpath_exists('[','<r/>'::xml) ELSE true END",
  runtime_or: "gate OR xpath_exists('[','<r/>'::xml)",
  constant_or: "true OR xpath_exists('[','<r/>'::xml)",
  constant_and: "false AND xpath_exists('[','<r/>'::xml)",
  constant_array: "CASE WHEN gate THEN true ELSE cardinality(xpath('[','<r/>'::xml))=1 END",
  constant_namespace:
    "CASE WHEN gate THEN true ELSE xpath_exists('false()','<r/>'::xml,ARRAY['bad']) END",
  runtime_namespace: "CASE WHEN gate THEN true ELSE xpath_exists('false()',v,ARRAY['bad']) END",
  constant_coalesce: "COALESCE(gate,xpath_exists('[','<r/>'::xml))",
  folded_coalesce: "COALESCE(true,xpath_exists('[','<r/>'::xml))",
  constant_standard:
    "CASE WHEN gate THEN true ELSE XMLEXISTS('[' PASSING BY REF ('<r/>'::xml) BY REF) END",
  constant_float:
    "CASE WHEN gate THEN true ELSE (xpath('1 div 3','<r/>'::xml))[1]::text='0.3333333333333333' END",
  constant_power: "CASE WHEN gate THEN true ELSE xpath_exists('number(''1e23'')','<r/>'::xml) END",
  constant_count_float:
    "CASE WHEN gate THEN true ELSE cardinality(xpath('1 div 3','<r/>'::xml))=1 END",
  constant_deep: `CASE WHEN gate THEN true ELSE xpath_exists('${deep}','<r/>'::xml) END`,
  domain_constant:
    "CASE WHEN gate THEN true ELSE ('<r/>'::xml::xpath_prepared_document)::text IS NOT NULL END",
  domain_runtime:
    'CASE WHEN gate THEN true ELSE (v::xpath_prepared_document)::text IS NOT NULL END',
  domain_value: 'CASE WHEN gate THEN true ELSE (v::xpath_value_document)::text IS NOT NULL END',
  domain_before_constant:
    "CASE WHEN gate THEN (v::xpath_mapping_document)::text IS NOT NULL ELSE xpath_exists('[','<r/>'::xml) END",
  constant_before_domain:
    "CASE WHEN gate THEN xpath_exists('[','<r/>'::xml) ELSE (v::xpath_mapping_document)::text IS NOT NULL END",
  exists_guard:
    "CASE WHEN xpath_exists('true()','<r/>'::xml) THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  text_guard:
    "CASE WHEN (xpath('1 div 3','<r/>'::xml))[1]::text='0.3333333333333333' THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  count_guard:
    "CASE WHEN cardinality(xpath('true()','<r/>'::xml))=1 THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  null_guard:
    "CASE WHEN (xpath('true()','<r/>'::xml))[1] IS NOT NULL THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  serialize_guard:
    "CASE WHEN XMLSERIALIZE(CONTENT (xpath('true()','<r/>'::xml))[1] AS text)='true' THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  document_guard:
    "CASE WHEN (xpath('/*','<r/>'::xml))[1] IS DOCUMENT THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  parse_guard:
    "CASE WHEN XMLPARSE(CONTENT '<r/>') IS DOCUMENT THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  cast_guard:
    "CASE WHEN ('<r/>'::text::xml) IS DOCUMENT THEN true ELSE xpath_exists('[','<r/>'::xml) END",
  text_coalesce:
    "COALESCE((xpath('true()','<r/>'::xml))[1]::text,(xpath('[','<r/>'::xml))[1]::text)='true'",
  numeric_coalesce:
    "COALESCE((xpath('1 div 3','<r/>'::xml))[1]::text,(xpath('[','<r/>'::xml))[1]::text)='0.3333333333333333'",
  null_coalesce:
    "COALESCE((xpath(NULL::text,'<r/>'::xml))[1]::text,(xpath('[','<r/>'::xml))[1]::text)='true'",
  first_error:
    "CASE WHEN gate THEN xpath_exists('false()','plain'::xml) ELSE xpath_exists('false()','<r/>'::xml,ARRAY['bad']) END",
  reversed_error:
    "CASE WHEN gate THEN xpath_exists('false()','<r/>'::xml,ARRAY['bad']) ELSE xpath_exists('false()','plain'::xml) END",
} as const

it('matches INSERT-time XPath constant preparation while preserving constant guards, strict NULLs and lazy row calls', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xpath-preparation-')),
    packet = 'artifacts/goal-checks/xml-xpath-preparation-active'
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      "SET extra_float_digits=1;SET xmloption=CONTENT;CREATE DOMAIN xpath_prepared_document AS xml CHECK(xpath_exists('[','<r/>'::xml));CREATE DOMAIN xpath_value_document AS xml CHECK(xpath_exists('[',VALUE));CREATE DOMAIN xpath_mapping_document AS xml CHECK(xpath_exists('false()','<r/>'::xml,ARRAY['bad']));",
    )
    const captured = await pg.exec(
      await readFile('tools/check-rust/xpath-power-context.sql', 'utf8'),
    )
    const words = captured.flatMap((r) => r.rows).find((r) => 'xpathPowerOfTenBits' in r)![
      'xpathPowerOfTenBits'
    ] as string[]
    for (const [name, expression] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE xpath_prepare_${name}(gate bool,v xml,p text,CONSTRAINT rule CHECK(${expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.entries(expressions).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'xpath_prepare_' + name)!
      return ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: lowerTableCheck(
          table,
          table.constraints.find((c) => c.name === 'rule')!,
          [],
          catalog.domains,
          origin as 'source' | 'stored',
          [],
          undefined,
          origin === 'source' ? `CHECK(${sql})` : undefined,
        )!.expression,
      }))
    })
    const context = {
      defaultCollation: 'C' as const,
      serverEncoding: 'UTF8' as const,
      clientEncoding: 'UTF8' as const,
      xmlOption: 'content' as const,
      extraFloatDigits: 1,
      xpathRecursionLimit: 5000,
      xpathPowerOfTenBits: words,
    }
    const group = prepareCheckRustGroup(plans, context)
    expect(group.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual([])
    const names = Object.keys(expressions).flatMap((name) =>
      ['source', 'stored'].map((origin) => name + '_' + origin),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      errors = 0
    for (const [name, sql] of Object.entries(expressions))
      for (const gate of [true, false, null])
        for (const v of ['<r/>', 'plain'])
          for (const p of ['false()', '[']) {
            const row: Row = { gate: known(gate), v: known(v), p: known(p) }
            let expected: Outcome
            let rejected: { code: string; constraint?: string } | undefined
            try {
              await pg.query(`INSERT INTO xpath_prepare_${name} VALUES($1,$2,$3)`, [gate, v, p])
            } catch (error) {
              rejected = error as { code: string; constraint?: string }
            }
            if (rejected) {
              const tableViolation = rejected.code === '23514' && rejected.constraint === 'rule'
              expected = tableViolation
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(rejected.code, 36) } }
              if (!tableViolation) errors++
            } else {
              const result = await pg.query<{ value: boolean | null }>(
                `SELECT (${sql})value FROM(SELECT $1::bool gate,$2::xml v,$3::text p)r`,
                [gate, v, p],
              )
              expect(result.rows[0]!.value, name + ': accepted INSERT must satisfy CHECK').not.toBe(
                false,
              )
              expected = { kind: result.rows[0]!.value === null ? 'Null' : 'True' }
            }
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            reference.push({
              name,
              gate,
              v,
              p,
              expected,
              insert: rejected
                ? { code: rejected.code, constraint: rejected.constraint }
                : { accepted: true },
            })
          }
    const specialized = await pg.query<{ value: boolean }>(
      `SELECT (${expressions.constant_path})value FROM(SELECT true gate)r`,
    )
    expect(specialized.rows).toEqual([{ value: true }])
    expect(fixtures.find((f) => f.name === 'constant_path_source')!.expected).toEqual({
      kind: 'Error',
      value: { state: parseInt('10608', 36) },
    })
    for (const name of [
      'constant_path',
      'constant_content',
      'constant_namespace',
      'constant_array',
      'constant_standard',
      'constant_coalesce',
      'domain_constant',
      'domain_runtime',
      'domain_before_constant',
      'constant_before_domain',
      'first_error',
      'reversed_error',
    ]) {
      const original = fixtures.find((f) => f.name === name + '_source')!.expected
      expect(original.kind).toBe('Error')
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: name + '_' + origin,
          row: { gate: { kind: 'Unknown' }, v: { kind: 'Unknown' }, p: { kind: 'Unknown' } },
          expected: original,
        })
    }
    for (const name of ['runtime_document', 'runtime_path', 'runtime_namespace', 'domain_value'])
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: name + '_' + origin,
          row: { gate: known(true), v: { kind: 'Unknown' }, p: { kind: 'Unknown' } },
          expected: { kind: 'True' },
        })
    const { serverEncoding: _encoding, ...noEncoding } = context,
      { extraFloatDigits: _digits, ...noDigits } = context,
      { xpathPowerOfTenBits: _powers, ...noPowers } = context,
      { xpathRecursionLimit: _limit, ...noLimit } = context
    const contextCases = [
      {
        profile: 'no_digits',
        context: noDigits,
        name: 'numeric_coalesce',
        gate: false,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 16,
      },
      {
        profile: 'no_digits',
        context: noDigits,
        name: 'text_guard',
        gate: false,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 16,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'constant_before_domain',
        gate: false,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 64,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'domain_before_constant',
        gate: false,
        expected: { kind: 'Error', value: { state: parseInt('22000', 36) } } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'domain_runtime',
        gate: true,
        expected: { kind: 'Unknown' } as Outcome,
        reason: -1,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'constant_path',
        gate: true,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 64,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'first_error',
        gate: false,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 64,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'reversed_error',
        gate: false,
        expected: { kind: 'Error', value: { state: parseInt('22000', 36) } } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'constant_guard',
        gate: true,
        expected: { kind: 'True' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'constant_or',
        gate: true,
        expected: { kind: 'True' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'folded_coalesce',
        gate: true,
        expected: { kind: 'True' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'constant_null',
        gate: false,
        expected: { kind: 'Null' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_encoding',
        context: noEncoding,
        name: 'runtime_document',
        gate: true,
        expected: { kind: 'True' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_digits',
        context: noDigits,
        name: 'constant_float',
        gate: true,
        expected: { kind: 'True' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_digits',
        context: noDigits,
        name: 'constant_float',
        gate: false,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 16,
      },
      {
        profile: 'no_digits',
        context: noDigits,
        name: 'constant_count_float',
        gate: false,
        expected: { kind: 'True' } as Outcome,
        reason: 0,
      },
      {
        profile: 'no_powers',
        context: noPowers,
        name: 'constant_power',
        gate: true,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 1,
      },
      {
        profile: 'no_limit',
        context: noLimit,
        name: 'constant_deep',
        gate: true,
        expected: { kind: 'Unknown' } as Outcome,
        reason: 8,
      },
    ]
    const contextGroups: (typeof group)[] = [],
      probes: string[] = [],
      probeNames: string[] = [],
      probeChecks: Array<(typeof group.checks)[number]> = []
    for (const [index, item] of contextCases.entries()) {
      const name = item.name as keyof typeof expressions
      const table = catalog.tables.find((t) => t.name === 'xpath_prepare_' + name)!
      const prepared = prepareCheckRustGroup(
        ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: item.profile + '_' + index + '_' + origin,
          },
          expression: lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === 'rule')!,
            [],
            catalog.domains,
            origin as 'source' | 'stored',
            [],
            undefined,
            origin === 'source' ? `CHECK(${expressions[name]})` : undefined,
          )!.expression,
        })),
        item.context,
      )
      expect(prepared.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual(
        [],
      )
      contextGroups.push(prepared)
      for (const [originIndex, origin] of ['source', 'stored'].entries()) {
        const publicName = item.profile + '_' + index + '_' + origin
        names.push(publicName)
        const row: Row = { gate: known(item.gate), v: known('<r/>'), p: known('false()') }
        fixtures.push({ name: publicName, row, expected: item.expected })
        const check = prepared.checks[originIndex]!
        if (check.kind !== 'supported') throw new Error('unsupported context')
        const entryName = check.entryName.replace(/(_h[a-z0-9]{4})$/u, '_reason$1')
        const body = check.diagnosticEntryName
          ? `let result=${check.diagnosticEntryName}(${check.inputs.map((input) => input.rustName).join(',')});let actual=check_evaluation_reason(result);`
          : `let result=${check.entryName}(${check.inputs.map((input) => input.rustName).join(',')});let reason=check_requirement_for_outcome(result,-1);let actual=make_int4_value(reason);`
        probes.push(
          `pub fn ${entryName}(${check.inputs
            .map((input) => input.rustName + ':' + input.rustType)
            .concat('expected_reason:Int4Value')
            .join(
              ',',
            )})->CheckOutcome{${body}let same=sql__pg_catalog__int4eq__lrxe(actual,expected_reason);check_from_bool(same)}`,
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
        probeNames.push(publicName + '_reason')
        fixtures.push({
          name: publicName + '_reason',
          row: { ...row, expected_reason: { kind: 'Value', value: item.reason } },
          expected: { kind: 'True' },
        })
      }
    }
    names.push(...probeNames)
    const evaluatorSource = [
      group.evaluatorSource,
      ...contextGroups.map((g) => g.evaluatorSource),
      ...probes,
    ].join('\n')
    const combined = {
      ...group,
      checks: [...group.checks, ...contextGroups.flatMap((g) => g.checks), ...probeChecks],
      evaluatorSource,
      source: {
        ...group.source!,
        modules: group.source!.modules.map((m) =>
          m.name === 'checks'
            ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
            : m,
        ),
      },
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        {
          inserts,
          errors,
          fixtures: fixtures.length,
          contextCases: contextCases.map(({ context: _context, ...sample }) => sample),
          reference,
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(packet + '/evaluators.rs', evaluatorSource)
    await runCheckParity(root, 'xpathpreparation', combined, names, fixtures)
    console.info('XPath constant preparation parity', {
      fixtures: fixtures.length,
      inserts,
      errors,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
