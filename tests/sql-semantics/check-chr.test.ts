import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const columns = {
  codepoint: 'stored_codepoint',
  backup: 'integer',
  label: 'text',
  recorded: 'integer',
  skip: 'boolean',
}
const expressions = {
  character: 'chr(codepoint) = label',
  ordinal: 'ascii(chr(codepoint)) = recorded',
  defaulted_input: 'chr(COALESCE(codepoint, backup)) = label',
  defaulted_result: 'COALESCE(chr(codepoint), chr(backup)) = label',
  selected: '(CASE WHEN skip THEN chr(backup) ELSE chr(codepoint) END) = label',
  lazy: 'CASE WHEN skip THEN true ELSE chr(codepoint) = label END',
  literal: "chr(128512) = '😀'",
  typed_null: 'chr(NULL::integer) IS NULL',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK Unicode character construction', () => {
  it('matches PostgreSQL UTF8 construction, errors, ownership and lazy branches in every target', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-chr-checks-'))
    try {
      expect((await pg.query('SHOW server_encoding')).rows[0]).toEqual({ server_encoding: 'UTF8' })
      await pg.exec(`CREATE DOMAIN raw_codepoint AS integer; CREATE DOMAIN stored_codepoint AS raw_codepoint;
        CREATE TABLE character_checks (${Object.entries(columns)
          .map(([name, type]) => `${name} ${type}`)
          .join(',')},
          ${Object.entries(expressions)
            .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
            .join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'character_checks')!
      const names = Object.keys(expressions)
      const fixtureNames = names.flatMap((name) =>
        ['raw', 'stored'].map((form) => name + '_' + form),
      )
      const group = prepareCheckRustGroup(
        names.flatMap((name) =>
          ['raw', 'stored'].map((form) => ({
            expression: lowerTableCheck(
              table,
              form === 'stored'
                ? table.constraints.find((check) => check.name === name)!
                : {
                    name,
                    type: 'check',
                    definition: `CHECK (${expressions[name as keyof typeof expressions]})`,
                  },
              [],
              catalog.domains,
            )!.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          })),
        ),
      )
      for (const [index, check] of group.checks.entries())
        expect(check.kind, fixtureNames[index]).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (name: string, row: Row, expected: Outcome) => {
        for (const form of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      const projection = Object.entries(columns)
        .map(([name, type], index) => `$${index + 1}::${type} ${name}`)
        .join(',')
      const oracle = async (name: string, row: Row) => {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${expressions[name as keyof typeof expressions]}) value FROM (SELECT ${projection}) candidate`,
              Object.keys(columns).map((name) =>
                row[name]?.kind === 'Value' ? row[name].value : null,
              ),
            )
          ).rows[0]!.value
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (error) {
          const code = (error as { code: string }).code
          expect(['22023', '54000']).toContain(code)
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        record(name, row, expected)
      }
      const known: Row = {
        codepoint: input(233),
        backup: input(233),
        label: input('é'),
        recorded: input(233),
        skip: input(false),
      }
      const codepoints = new Set([
        -2147483648, -1, 0, 1, 9, 31, 32, 65, 127, 128, 255, 256, 2047, 2048, 55295, 55296, 57343,
        57344, 65535, 65536, 128512, 1114111, 1114112, 2147483647,
      ])
      for (let point = 0; point <= 1114111; point += 65536)
        for (const delta of [-1, 0, 1])
          if (point + delta >= 0 && point + delta <= 1114111) codepoints.add(point + delta)
      for (const point of codepoints) {
        const scalar = point > 0 && point <= 1114111 && !(point >= 55296 && point <= 57343)
        const row = {
          ...known,
          codepoint: input(point),
          label: input(scalar ? String.fromCodePoint(point) : 'A'),
          recorded: input(point),
        }
        for (const name of names) await oracle(name, row)
        for (const name of ['character', 'ordinal', 'defaulted_input', 'defaulted_result'])
          await oracle(name, { ...row, label: input('wrong'), recorded: input(0) })
      }
      for (const row of [
        { ...known, codepoint: input(null) },
        { ...known, label: input(null) },
        { ...known, recorded: input(null) },
        { ...known, codepoint: input(null), backup: input(null) },
        { ...known, codepoint: input(-1), skip: input(true) },
        { ...known, backup: input(-1) },
        { ...known, skip: input(null) },
      ])
        for (const name of names) await oracle(name, row)
      const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
      const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      const unknown: Input = { kind: 'Unknown' }
      for (const name of ['character', 'ordinal', 'defaulted_input', 'defaulted_result']) {
        record(name, { ...known, codepoint: unknown }, { kind: 'Unknown' })
        record(name, { ...known, codepoint: error }, error as Outcome)
      }
      record('character', { ...known, codepoint: unknown, label: error }, error as Outcome)
      record('character', { ...known, codepoint: error, label: other }, error as Outcome)
      record('lazy', { ...known, codepoint: error, skip: input(true) }, { kind: 'True' })
      record('selected', { ...known, codepoint: error, skip: input(true) }, { kind: 'True' })
      record('defaulted_result', { ...known, backup: error }, { kind: 'True' })
      record(
        'defaulted_result',
        { ...known, codepoint: unknown, backup: error },
        { kind: 'Unknown' },
      )
      record(
        'defaulted_result',
        { ...known, codepoint: input(null), backup: error },
        error as Outcome,
      )
      for (const name of ['character', 'ordinal', 'defaulted_input', 'defaulted_result'])
        for (const kind of ['True', 'False', 'Null'])
          expect(
            fixtures.some(
              (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
            ),
            name + ':' + kind,
          ).toBe(true)
      await runCheckParity(directory, 'pgsidchrchecks', group, fixtureNames, fixtures)
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 240000)
})
