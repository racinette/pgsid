import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const sourceNames = new Set(
  [
    ...readFileSync('crates/check-evaluator/src/operations/pg_catalog/xml.rs', 'utf8').matchAll(
      /pub fn (sql__[a-z0-9_]+)\(/gu,
    ),
  ].map((match) => match[1]!),
)
const callables = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && sourceNames.has(fn.rustName),
)
const value = (input: string | boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

const samples = [
  '',
  'plain',
  ' ',
  '<root/>',
  '<a/><b/>',
  '<a>text<b/>tail</a>',
  '<a>',
  '</a>',
  '<a></b>',
  '<a x="1" x="2"/>',
  '<a x="&lt;">&#x1F60A;</a>',
  '<a x="<"/>',
  '<é>😊</é>',
  '<p:root/>',
  '<p:root p:a="1" p:a="2"/>',
  '<root xmlns:p="urn:x" p:a="1" p:a="2"/>',
  '<root xmlns:p="urn:x" xmlns:q="urn:x" p:a="1" q:a="2"/>',
  '<!--comment-->',
  '<!--a--b-->',
  '<?target value?>',
  '<![CDATA[<&text]]>',
  '<root><![CDATA[<&text]]></root>',
  '<root>]]></root>',
  '<root>&unknown;</root>',
  '<root>&#0;</root>',
  '<root>\u0001</root>',
  '<?xml version="1.0"?><root/>',
  '<?xml version="2.0"?><root/>',
  '\ufeff<?xml version="1.0"?><root/>',
  '<!DOCTYPE root [<!ENTITY label "text">]><root>&label;</root>',
  '<!DOCTYPE root [<!ENTITY label "<child/>">]><root>&label;</root>',
  '<!DOCTYPE root [<!ENTITY label "&label;">]><root>&label;</root>',
  '<!DOCTYPE root [<!ENTITY label SYSTEM "missing">]><root>&label;</root>',
  '<!DOCTYPE root [<!ENTITY label SYSTEM "missing">]><root a="&label;"/>',
  '<!DOCTYPE root SYSTEM "missing"><root>&unknown;</root>',
  '<?xml version="1.0" standalone="yes"?><!DOCTYPE root SYSTEM "missing"><root>&unknown;</root>',
  '<!DOCTYPE root [<!ATTLIST root xmlns:p CDATA "urn:x">]><root p:a="1" p:a="2"/>',
]

describe('Rust CHECK XML well-formedness callables', () => {
  it('matches raw and stored PostgreSQL calls, default collation, value states, lazy arms and errors as values', async () => {
    expect(callables).toHaveLength(2)
    expect(sourceNames.size).toBe(callables.length)
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-xml-calls-'))
    try {
      const expressions = callables
        .flatMap((fn) => [
          { name: fn.rustName, sql: `pg_catalog.${fn.name}(source)`, comparison: false, fn },
          {
            name: 'recorded_' + fn.rustName,
            sql: `pg_catalog.${fn.name}(source) = recorded`,
            comparison: true,
            fn,
          },
        ])
        .map((item) => ({ ...item, sql: `CASE WHEN skip THEN true ELSE ${item.sql} END` }))
      await pg.exec(`CREATE TABLE xml_checks (
        source text, recorded boolean, skip boolean,
        ${expressions.map(({ name, sql }) => `CONSTRAINT "${name}" CHECK (${sql})`).join(',')}
      )`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'xml_checks')!
      const names = expressions.flatMap(({ name }) => [name + '_raw', name + '_stored'])
      const group = prepareCheckRustGroup(
        expressions.flatMap((item) =>
          ['raw', 'stored'].map((form) => {
            const plan = lowerTableCheck(
              table,
              form === 'stored'
                ? table.constraints.find((check) => check.name === item.name)!
                : { name: item.name, type: 'check', definition: `CHECK (${item.sql})` },
              [],
              catalog.domains,
            )!
            expect(plan.expression.kind, item.name + '_' + form).not.toBe('uncertain')
            return {
              expression: plan.expression,
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: item.name + '_' + form,
              },
            }
          }),
        ),
      )
      for (const check of group.checks) expect(check.kind).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (name: string, row: Row, expected: Outcome) => {
        for (const form of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      for (const item of expressions) {
        const rows = (
          await pg.query<{ ordinal: number; valid: boolean }>(
            `SELECT ordinal, pg_catalog.${item.fn.name}(input) AS valid
           FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS samples(input, ordinal)`,
            [JSON.stringify(samples)],
          )
        ).rows
        for (const row of rows) {
          const input = samples[Number(row.ordinal) - 1]!
          record(
            item.name,
            { source: value(input), recorded: value(row.valid), skip: value(false) },
            { kind: item.comparison || row.valid ? 'True' : 'False' },
          )
          if (item.comparison)
            record(
              item.name,
              { source: value(input), recorded: value(!row.valid), skip: value(false) },
              { kind: 'False' },
            )
        }
        const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        for (const input of [value(null), { kind: 'Unknown' } as Input, error]) {
          record(
            item.name,
            { source: input, recorded: value(false), skip: value(false) },
            input.kind === 'Error'
              ? { kind: 'Error', value: input.value }
              : { kind: input.kind as 'Null' | 'Unknown' },
          )
        }
        record(item.name, { source: error, recorded: error, skip: value(true) }, { kind: 'True' })
      }
      await runCheckParity(directory, 'pgsid-xml-calls', group, names, fixtures)
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 180_000)
})
