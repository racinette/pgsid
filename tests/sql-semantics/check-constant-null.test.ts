import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

const constantNullExpressions = [
  'pg_catalog.lpad(NULL::text, amount, fill) IS NULL',
  'pg_catalog.lpad(label, NULL::int4, fill) IS NULL',
  'pg_catalog.repeat(NULL::text, amount / 0) IS NULL',
  'pg_catalog.lpad(NULL::text, amount + (1 / 0), fill) IS NULL',
  'pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL',
  'pg_catalog.lpad(NULL::text, amount, NULL::text) IS NULL',
  'pg_catalog.lpad(NULL::text, pg_catalog.length(fill), fill) IS NULL',
  "pg_catalog.lpad(NULL::text, amount / 0, pg_catalog.lpad('x', 1 / 0, fill)) IS NULL",
  'pg_catalog.lpad(NULL::text, amount / (1 / 0), fill) IS NULL',
  "pg_catalog.lpad(NULL::text, amount / pg_catalog.length(''::text), fill) IS NULL",
  'pg_catalog.similar_to_escape(NULL::text, escape) IS NULL',
  'pg_catalog.similar_to_escape(label, NULL::text) IS NULL',
  'pg_catalog.lpad(NULL::text, 1, pg_catalog.similar_to_escape(pattern, escape)) IS NULL',
  "pg_catalog.lpad(NULL::text, 1, pg_catalog.similar_to_escape('%', 'ab')) IS NULL",
  'pg_catalog.lpad(NULL::text, 1, pg_catalog.similar_to_escape(NULL::text, escape)) IS NULL',
  "pg_catalog.lpad(NULL::text, 1, pg_catalog.textcat(fill, pg_catalog.similar_to_escape('%', 'ab'))) IS NULL",
  "pg_catalog.lpad(NULL::text, 1 / 0, pg_catalog.similar_to_escape('%', 'ab')) IS NULL",
  "pg_catalog.lpad(pg_catalog.similar_to_escape('%', 'ab'), 1 / 0, NULL::text) IS NULL",
  "pg_catalog.lpad(NULL::text, 1 / 0, pg_catalog.lpad(NULL::text, 1, pg_catalog.similar_to_escape('%', 'ab'))) IS NULL",
  'pg_catalog.lpad(NULL::text, CASE WHEN skip THEN amount / 0 ELSE 1 END, fill) IS NULL',
  'pg_catalog.lpad(NULL::text, CASE WHEN skip THEN 1 / 0 ELSE 1 END, fill) IS NULL',
  'pg_catalog.lpad(NULL::text, CASE WHEN 1 > 0 THEN amount ELSE 1 / 0 END, fill) IS NULL',
  'pg_catalog.lpad(NULL::text, CASE 1 WHEN 1 THEN amount ELSE 1 / 0 END, fill) IS NULL',
  'pg_catalog.lpad(NULL::text, COALESCE(1, amount / 0), fill) IS NULL',
  'pg_catalog.lpad(NULL::text, COALESCE(amount, 1 / 0), fill) IS NULL',
]
const expressions = [
  ...constantNullExpressions,
  'pg_catalog.lpad(label, amount / 0, fill) IS NULL',
  'pg_catalog.similar_to_escape(pattern, escape) IS NULL',
  'CASE WHEN skip THEN true ELSE pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL END',
  'CASE WHEN true THEN true ELSE pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL END',
  'CASE WHEN 1 > 0 THEN true ELSE pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL END',
  'false AND pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL',
  'pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL AND false',
  'CASE WHEN skip THEN true ELSE pg_catalog.lpad(NULL::text, amount / 0, fill) IS NULL END',
  'CASE WHEN skip THEN true WHEN 1 > 0 THEN true ELSE pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL END',
  'CASE 1 WHEN 1 THEN true ELSE pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL END',
  'CASE 1 WHEN 2 THEN pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL ELSE true END',
  'CASE skip WHEN true THEN true ELSE pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL END',
  'COALESCE(true, pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL)',
  'COALESCE(skip, pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL)',
  'COALESCE(NULL::boolean, pg_catalog.lpad(NULL::text, 1 / 0, fill) IS NULL)',
  'CASE WHEN true THEN 1 ELSE pg_catalog.length(pg_catalog.lpad(NULL::text, 1 / 0, fill)) END > 0',
]
const samples: { sql: string; row: Row }[] = [
  {
    sql: "NULL,'(', 'ab', 0, 'x',true",
    row: {
      label: { kind: 'Null' },
      pattern: { kind: 'Value', value: '(' },
      escape: { kind: 'Value', value: 'ab' },
      amount: { kind: 'Value', value: 0 },
      fill: { kind: 'Value', value: 'x' },
      skip: { kind: 'Value', value: true },
    },
  },
  {
    sql: "'abc','%', '', 2, '😊',false",
    row: {
      label: { kind: 'Value', value: 'abc' },
      pattern: { kind: 'Value', value: '%' },
      escape: { kind: 'Value', value: '' },
      amount: { kind: 'Value', value: 2 },
      fill: { kind: 'Value', value: '😊' },
      skip: { kind: 'Value', value: false },
    },
  },
]

describe('CHECK constant NULL preparation', () => {
  it('skips dynamic strict-call operands while preserving errors in constant argument subtrees in Rust and both targets', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-constant-null-'))
    try {
      await pg.exec(`CREATE TABLE constant_null_checks (
        label text COLLATE "C", pattern text COLLATE "C", escape text COLLATE "C",
        amount integer, fill text COLLATE "C", skip boolean,
        ${expressions.map((sql, index) => `CONSTRAINT check_${index} CHECK (${sql})`).join(',')}
      )`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'constant_null_checks')!
      const checks = expressions.flatMap((sql, index) =>
        ['raw', 'stored'].map((form) => {
          const name = `check_${index}_${form}`
          const plan = lowerTableCheck(
            table,
            form === 'raw'
              ? { name: `check_${index}`, type: 'check', definition: `CHECK (${sql})` }
              : table.constraints.find((constraint) => constraint.name === `check_${index}`)!,
          )!
          expect(plan.expression.kind, name).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
          }
        }),
      )
      const group = prepareCheckRustGroup(checks)
      for (const check of group.checks) expect(check.kind).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const observed = new Set<string>()
      for (const [index, expression] of expressions.entries()) {
        for (const sample of samples) {
          let expected: Outcome
          try {
            const { rows } = await pg.query<{ result: boolean | null }>(`
              WITH fixture AS MATERIALIZED (
                SELECT label::text COLLATE "C" label, pattern::text COLLATE "C" pattern,
                  escape::text COLLATE "C" escape, amount::int4 amount, fill::text COLLATE "C" fill, skip::boolean skip
                FROM (VALUES (${sample.sql})) AS v(label,pattern,escape,amount,fill,skip)
              ) SELECT ${expression} result FROM fixture
            `)
            expected = {
              kind: rows[0]!.result === null ? 'Null' : rows[0]!.result ? 'True' : 'False',
            }
          } catch (error) {
            const code = (error as { code?: string }).code
            if (!code) throw error
            expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
            observed.add(code)
          }
          for (const form of ['raw', 'stored']) {
            const name = `check_${index}_${form}`
            fixtures.push({ name, row: sample.row, expected })
            if (index < constantNullExpressions.length) {
              fixtures.push({
                name,
                row: Object.fromEntries(
                  Object.keys(sample.row).map((name) => [name, { kind: 'Unknown' }]),
                ),
                expected,
              })
              fixtures.push({
                name,
                row: Object.fromEntries(
                  Object.keys(sample.row).map((name) => [
                    name,
                    { kind: 'Error', value: { state: parseInt('22003', 36) } },
                  ]),
                ),
                expected,
              })
            }
          }
        }
      }
      expect([...observed].sort()).toEqual(['22012', '22025'])
      for (const [index, check] of group.checks
        .slice(0, constantNullExpressions.length * 2)
        .entries()) {
        expect(check.kind, checks[index]!.identity.constraint).toBe('supported')
        if (check.kind === 'supported')
          expect(check.inputs, checks[index]!.identity.constraint).toHaveLength(0)
      }
      await runCheckParity(
        directory,
        'pgsid-check-constant-null',
        group,
        checks.map((check) => check.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600000)
})
