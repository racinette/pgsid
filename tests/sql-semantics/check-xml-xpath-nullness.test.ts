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

it('retains XPath XML cell nullness independently of numeric formatting in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xpath-nullness-')),
    packet = 'artifacts/goal-checks/xml-xpath-nullness-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const fixed = "(xpath('1 div 3','<r/>'::xml))[1]",
      invalid = "xpath_exists('[','<r/>'::xml)"
    const expressions = {
      fixed_null: `${fixed} IS NULL`,
      fixed_text_null: `(${fixed}::text) IS NULL`,
      fixed_guard: `CASE WHEN (${fixed}::text) IS NOT NULL THEN true ELSE ${invalid} END`,
      fixed_coalesce: `COALESCE(${fixed},XMLPARSE(DOCUMENT fallback)) IS NULL`,
      fixed_case_null: `CASE WHEN (${fixed}::text) IS NULL THEN ${invalid} ELSE true END`,
      fixed_document_guard: `CASE WHEN ${fixed} IS DOCUMENT THEN ${invalid} ELSE true END`,
      fixed_serialize_guard: `CASE WHEN XMLSERIALIZE(CONTENT ${fixed} AS text) IS NOT NULL THEN true ELSE ${invalid} END`,
      cell_null: '(xpath(p,v))[i] IS NULL',
      cell_present: '(xpath(p,v))[i] IS NOT NULL',
      text_null: '((xpath(p,v))[i]::text) IS NULL',
      text_present: '((xpath(p,v))[i]::text) IS NOT NULL',
      document: '(xpath(p,v))[i] IS DOCUMENT',
      relabeled_text_null: '((xpath(p,v))[i]::text::varchar) IS NULL',
      constructed_null: '(ARRAY[(xpath(p,v))[i]])[1] IS NULL',
      concatenated_null: '(ARRAY[(xpath(p,v))[i]] || ARRAY[NULL::xml])[1] IS NULL',
      sliced_null: '((xpath(p,v))[1:2])[i] IS NULL',
      record_null: '(ROW((xpath(p,v))[i],gate)).f1 IS NULL',
      nested_record_null: '(ROW(ARRAY[(xpath(p,v))[i]],gate)).f1[1] IS NULL',
      coalesced_null: 'COALESCE((xpath(p,v))[i],XMLPARSE(DOCUMENT fallback)) IS NULL',
      guarded: "CASE WHEN (xpath(p,v))[i] IS NOT NULL THEN true ELSE xpath_exists('[',v) END",
      selected_null: "(CASE WHEN gate THEN (xpath(p,v))[i] ELSE '<fallback/>'::xml END) IS NULL",
    }
    const entries = Object.entries(expressions)
    for (const [name, expression] of entries)
      await pg.exec(
        `CREATE TABLE xpath_null_${name}(v xml,p text,i int,fallback text,gate bool,CONSTRAINT rule CHECK(${expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      entries.flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'xpath_null_' + name)!
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
            [],
            origin as 'source' | 'stored',
            [],
            undefined,
            origin === 'source' ? `CHECK(${expression})` : undefined,
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
    const names = entries.flatMap(([name]) =>
      ['source', 'stored'].map((origin) => name + '_' + origin),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    for (const [name, expression] of entries)
      for (const v of [
        '<r/>',
        'plain',
        '<!DOCTYPE r [<!NOTATION n SYSTEM "n"><!NOTATION m SYSTEM "m">]><r/>',
        null,
      ])
        for (const p of ['1 div 3', '/', '//missing', '[', null])
          for (const i of [1, 2, 0, null]) {
            const gate = true,
              fallback = '<broken'
            const outcomes: Outcome[] = []
            for (const digits of [-15, -3, 0, 1, 3]) {
              await pg.exec(`SET extra_float_digits=${digits}`)
              let rejected: { code: string; constraint?: string } | undefined
              try {
                await pg.query(`INSERT INTO xpath_null_${name} VALUES($1,$2,$3,$4,$5)`, [
                  v,
                  p,
                  i,
                  fallback,
                  gate,
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
                const r = await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED(SELECT $1::xml v,$2::text p,$3::int i,$4::text fallback,$5::bool gate)SELECT (${expression})value FROM candidate`,
                  [v, p, i, fallback, gate],
                )
                expect(r.rows[0]!.value).not.toBe(false)
                outcome = { kind: r.rows[0]!.value === null ? 'Null' : 'True' }
              }
              outcomes.push(outcome)
              inserts++
            }
            expect(
              outcomes.every((outcome) => JSON.stringify(outcome) === JSON.stringify(outcomes[0])),
              name,
            ).toBe(true)
            const row: Row = {
              v: known(v),
              p: known(p),
              i: known(i),
              fallback: known(fallback),
              gate: known(gate),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected: outcomes[0]! })
            reference.push({ name, v, p, i, outcome: outcomes[0] })
          }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify({ fixtures: fixtures.length, inserts, reference }, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(entries.length * 160)
    expect(inserts).toBe(entries.length * 400)
    await runCheckParity(root, 'xpathnullness', group, names, fixtures)
    console.info('XPath formatting-independent nullness parity', {
      fixtures: fixtures.length,
      inserts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
