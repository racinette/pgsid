import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

it('matches xmlvalidate feature errors, strict states, partial values and INSERT-time immutable preparation in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xmlvalidate-')),
    packet = 'artifacts/goal-checks/xmlvalidate-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  type NativeRow = { v: string | null; s: string | null; gate: boolean | null; divisor: number }
  const base: NativeRow = { v: '<r/>', s: 'schema', gate: false, divisor: 1 },
    gates = [true, false, null].map((gate) => ({ ...base, gate })),
    values = ['<r/>', 'plain', null] as const,
    schemas = ['', 'schema', null] as const,
    bad = "xmlvalidate('<r/>'::xml,'schema')",
    partial = "(xpath('1 div 3','<r/>'::xml))[1]",
    ordered = 'xmlvalidate(XMLPARSE(DOCUMENT v::text),(1/divisor)::text)'
  const definitions = [
    {
      name: 'runtime',
      sql: 'CASE WHEN gate THEN true ELSE xmlvalidate(v,s) END',
      rows: values.flatMap((v) => schemas.flatMap((s) => gates.map((row) => ({ ...row, v, s })))),
    },
    { name: 'fixed', sql: `CASE WHEN gate THEN true ELSE ${bad} END`, rows: gates },
    { name: 'literal', sql: `CASE WHEN true THEN true ELSE ${bad} END`, rows: gates },
    { name: 'computed', sql: `CASE WHEN 1=1 THEN true ELSE ${bad} END`, rows: gates },
    {
      name: 'document',
      sql: `CASE WHEN '<r/>'::xml IS DOCUMENT THEN true ELSE ${bad} END`,
      rows: gates,
    },
    {
      name: 'text_null',
      sql: `CASE WHEN ('<r/>'::xml)::text IS NOT NULL THEN true ELSE ${bad} END`,
      rows: gates,
    },
    {
      name: 'serialize',
      sql: `CASE WHEN XMLSERIALIZE(CONTENT '<r/>'::xml AS text) IS NOT NULL THEN true ELSE ${bad} END`,
      rows: gates,
    },
    { name: 'coalesce', sql: `COALESCE(true,${bad})`, rows: gates },
    { name: 'or_true', sql: `true OR ${bad}`, rows: gates },
    { name: 'and_false', sql: `false AND ${bad}`, rows: gates },
    { name: 'row_or', sql: `gate OR ${bad}`, rows: gates },
    { name: 'fixed_null', sql: "xmlvalidate('<r/>'::xml,NULL)", rows: gates },
    {
      name: 'partial_xml',
      sql: `xmlvalidate(${partial},s)`,
      rows: schemas.map((s) => ({ ...base, s })),
    },
    {
      name: 'partial_schema',
      sql: `xmlvalidate(v,${partial}::text)`,
      rows: values.map((v) => ({ ...base, v })),
    },
    {
      name: 'ordered',
      sql: ordered,
      rows: values.flatMap((v) => [0, 1].map((divisor) => ({ ...base, v, divisor }))),
    },
    {
      name: 'guarded_order',
      sql: `CASE WHEN gate THEN true ELSE ${ordered} END`,
      rows: values.flatMap((v) =>
        [0, 1].flatMap((divisor) => gates.map((row) => ({ ...row, v, divisor }))),
      ),
    },
  ]
  try {
    for (const d of definitions)
      await pg.exec(
        `CREATE TABLE validate_${d.name}(v xml,s text,gate bool,divisor int,CONSTRAINT rule CHECK(${d.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      definitions.flatMap((d) => {
        const table = catalog.tables.find((t) => t.name === 'validate_' + d.name)!
        return ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: d.name + '_' + origin,
          },
          expression: lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === 'rule')!,
            [],
            [],
            origin as 'source' | 'stored',
            [],
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${d.sql})` : undefined,
          )!.expression,
        }))
      }),
      {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        xmlOption: 'content',
        xpathRecursionLimit: 5000,
      },
    )
    expect(group.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual([])
    const names = definitions.flatMap((d) =>
        ['source', 'stored'].map((origin) => d.name + '_' + origin),
      ),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: { name: string; input: NativeRow; outcome: Outcome }[] = []
    for (const d of definitions)
      for (const row of d.rows) {
        let rejected: { code: string; constraint?: string } | undefined
        try {
          await pg.query(`INSERT INTO validate_${d.name}(v,s,gate,divisor) VALUES($1,$2,$3,$4)`, [
            row.v,
            row.s,
            row.gate,
            row.divisor,
          ])
        } catch (e) {
          rejected = e as { code: string; constraint?: string }
        }
        let outcome: Outcome
        if (rejected)
          outcome =
            rejected.code === '23514' && rejected.constraint === 'rule'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(rejected.code, 36) } }
        else {
          const result = await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED(SELECT $1::xml v,$2::text s,$3::bool gate,$4::int divisor)SELECT (${d.sql})value FROM candidate`,
            [row.v, row.s, row.gate, row.divisor],
          )
          expect(result.rows[0]!.value).not.toBe(false)
          outcome = { kind: result.rows[0]!.value === null ? 'Null' : 'True' }
        }
        const input: Row = {
          v: known(row.v),
          s: known(row.s),
          gate: known(row.gate),
          divisor: known(row.divisor),
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: d.name + '_' + origin, row: input, expected: outcome })
        reference.push({ name: d.name, input: row, outcome })
      }
    for (const name of [
      'fixed',
      'literal',
      'computed',
      'document',
      'text_null',
      'serialize',
      'coalesce',
      'or_true',
      'and_false',
      'row_or',
      'fixed_null',
    ]) {
      const results = reference.filter((r) => r.name === name).map((r) => r.outcome)
      expect(
        results.every((r) => JSON.stringify(r) === JSON.stringify(results[0])),
        name,
      ).toBe(true)
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: name + '_' + origin,
          row: {
            v: { kind: 'Unknown' },
            s: { kind: 'Unknown' },
            gate: { kind: 'Unknown' },
            divisor: { kind: 'Unknown' },
          },
          expected: results[0]!,
        })
    }
    expect(reference).toHaveLength(90)
    expect(fixtures).toHaveLength(202)
    expect(
      reference.some(
        (r) => r.outcome.kind === 'Error' && r.outcome.value.state === parseInt('0A000', 36),
      ),
    ).toBe(true)
    expect(reference.some((r) => r.outcome.kind === 'Null')).toBe(true)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        { nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'xmlvalidate', group, names, fixtures)
    console.info('xmlvalidate native parity', {
      nativeInserts: reference.length,
      fixtures: fixtures.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
