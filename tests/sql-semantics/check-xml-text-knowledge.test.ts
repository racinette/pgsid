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

it('retains XML text nullness and serialization errors through lazy composition in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-xml-text-knowledge-')),
    packet = 'artifacts/goal-checks/xml-text-knowledge-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const cell = '(xpath(p,v))[i]'
    const expressions = {
      coalesce_null: `COALESCE(${cell}::text,XMLSERIALIZE(DOCUMENT XMLPARSE(DOCUMENT fallback) AS text)) IS NULL`,
      selected_null: `(CASE WHEN gate THEN ${cell}::text ELSE fallback END) IS NULL`,
      constructed_null: `(ARRAY[${cell}::text])[1] IS NULL`,
      record_null: `(ROW(${cell}::text,gate)).f1 IS NULL`,
      content_null: `XMLSERIALIZE(CONTENT ${cell} AS text) IS NULL`,
      content_indent_null: `XMLSERIALIZE(CONTENT ${cell} AS text INDENT) IS NULL`,
      document_null: `XMLSERIALIZE(DOCUMENT ${cell} AS text) IS NULL`,
      document_indent_null: `XMLSERIALIZE(DOCUMENT ${cell} AS text INDENT) IS NULL`,
      guarded: `CASE WHEN COALESCE(${cell}::text,'fallback') IS NOT NULL THEN true ELSE xpath_exists('[',v) END`,
    }
    const entries = Object.entries(expressions)
    for (const [name, expression] of entries)
      await pg.exec(
        `CREATE TABLE xml_text_${name}(v xml,p text,i int,fallback text,gate bool,CONSTRAINT rule CHECK(${expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      entries.flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'xml_text_' + name)!
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
                await pg.query(`INSERT INTO xml_text_${name} VALUES($1,$2,$3,$4,$5)`, [
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
    await runCheckParity(root, 'xmltextknowledge', group, names, fixtures)
    console.info('XML text knowledge parity', {
      fixtures: fixtures.length,
      inserts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
