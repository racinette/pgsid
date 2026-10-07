import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

const columns: Record<string, string> = {
  label: 'stored_label',
  short_label: 'varchar',
  fixed_label: 'char(8)',
  backup: 'text',
  expected: 'integer',
  skip: 'boolean',
}
const expressions: Record<string, string> = {
  label: 'ascii(label COLLATE "C") = expected',
  plain: 'ascii(label) = expected',
  varchar: 'ascii(short_label COLLATE "C") = expected',
  fixed: 'ascii(fixed_label::text COLLATE "C") = expected',
  trimmed: '(fixed_label::text COLLATE "C") = backup',
  plain_trimmed: 'fixed_label::text = backup',
  empty: `ascii('' COLLATE "C") = 0`,
  unicode: `ascii('😀' COLLATE "C") = 128512`,
  lazy: 'CASE WHEN skip THEN true ELSE ascii(label COLLATE "C") = expected END',
  selected:
    '(CASE WHEN skip THEN ascii(backup COLLATE "C") ELSE ascii(label COLLATE "C") END) = expected',
  defaulted: 'COALESCE(ascii(label COLLATE "C"), ascii(backup COLLATE "C")) = expected',
  typed_null: 'ascii(NULL::text COLLATE "C") IS NULL',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK Unicode character codes', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-ascii-'))
    await pg.exec(`CREATE DOMAIN raw_label AS text; CREATE DOMAIN stored_label AS raw_label;
      CREATE TABLE ascii_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches UTF8 code points, empty strings, NULLs, errors and lazy branches in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'ascii_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind, name + '_' + form).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      ),
    )
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        fixtureNames[index] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
    }
    const candidate = `(SELECT ${Object.entries(columns)
      .map(([name, type], index) => `$${index + 1}::${type} ${name}`)
      .join(',')}) candidate`

    const query = async (name: string, row: Row) => {
      const value = (
        await pg.query<{ value: boolean | null }>(
          `SELECT (${expressions[name]}) value FROM ${candidate}`,
          Object.keys(columns).map((name) =>
            row[name]?.kind === 'Value' ? row[name].value : null,
          ),
        )
      ).rows[0]!.value
      record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
    }
    const known: Row = {
      label: input('é'),
      short_label: input('é'),
      fixed_label: input('é'),
      backup: input('é'),
      expected: input(233),
      skip: input(false),
    }
    for (const value of [
      '',
      'A',
      ' ',
      '\t',
      'é',
      '界',
      '😀',
      '\u007f',
      '\u0080',
      '\u07ff',
      '\u0800',
      '\uffff',
      '\u{10000}',
      '\u{10ffff}',
      'e\u0301',
      'émore',
      'A B   ',
      'A\u00a0',
      '\u00a0 ',
      '\u2003 ',
      '\t  ',
      '    ',
    ]) {
      const expected = (await pg.query<{ value: number }>('SELECT ascii($1::text) value', [value]))
        .rows[0]!.value
      const row = {
        ...known,
        label: input(value),
        short_label: input(value),
        fixed_label: input(value),
        backup: input(value),
        expected: input(expected),
      }
      for (const name of names) await query(name, row)
      for (const name of ['label', 'plain', 'varchar'])
        await query(name, { ...row, expected: input(expected + 1) })
    }
    for (const row of [
      known,
      {
        ...known,
        label: input(null),
        short_label: input(null),
        fixed_label: input(null),
        backup: input(null),
      },
      { ...known, expected: input(null) },
      { ...known, skip: input(true) },
      { ...known, skip: input(null) },
    ])
      for (const name of names) await query(name, row)
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const unknown: Input = { kind: 'Unknown' }
    for (const [name, column] of [
      ['label', 'label'],
      ['varchar', 'short_label'],
      ['fixed', 'fixed_label'],
    ] as const) {
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, [column]: error }, error as Outcome)
      record(name, { ...known, [column]: unknown, expected: error }, error as Outcome)
      record(name, { ...known, [column]: error, expected: other }, error as Outcome)
    }
    record('lazy', { ...known, label: error, skip: input(true) }, { kind: 'True' })
    record('selected', { ...known, label: error, skip: input(true) }, { kind: 'True' })
    record('defaulted', { ...known, backup: error }, { kind: 'True' })
    record('defaulted', { ...known, label: input(null), backup: error }, error as Outcome)
    record('defaulted', { ...known, label: unknown, backup: error }, { kind: 'Unknown' })
    record('defaulted', { ...known, label: error, backup: other }, error as Outcome)
    for (const name of ['label', 'varchar', 'fixed'])
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'asciichecks', group, fixtureNames, fixtures)
  }, 180000)
})
