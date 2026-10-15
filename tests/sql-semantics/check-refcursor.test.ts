import { refcursorInputForms } from './check-refcursor-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { bindProbe, valueRepresentation } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const sqlError: Input & Outcome = { kind: 'Error', value: { state: parseInt('22003', 36) } }
describe('refcursor names without portal assumptions', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-refcursor-'))
  })
  afterAll(async () => {
    await pg?.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves nominal values, shared text I/O, domains, explicit casts and lazy state propagation in Rust, Go and TypeScript', async () => {
    await pg.exec(
      'CREATE DOMAIN cursor_name AS refcursor;CREATE DOMAIN report_cursor AS cursor_name',
    )
    const expressions: Record<string, string> = {
      value: 'active_cursor::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      source:
        'source::report_cursor::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      constructor:
        'pg_catalog.refcursor(source)::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      padded:
        'padded::refcursor::text COLLATE "C" IS NOT DISTINCT FROM expected_padded COLLATE "C"',
      named:
        'identifier::refcursor::text COLLATE "C" IS NOT DISTINCT FROM identifier::text COLLATE "C"',
      wire: 'textsend(active_cursor::text) IS NOT DISTINCT FROM wire',
      short:
        'active_cursor::varchar(3)::text COLLATE "C" IS NOT DISTINCT FROM expected_short COLLATE "C"',
      padded_output:
        'active_cursor::char(8)::text COLLATE "C" IS NOT DISTINCT FROM expected_trimmed COLLATE "C"',
      selected:
        '(CASE WHEN choose_active THEN active_cursor ELSE backup_cursor END)::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      literal_fallback: `COALESCE(active_cursor,'backup')::text COLLATE "C" IS NOT DISTINCT FROM expected_selected COLLATE "C"`,
      coalesced:
        'COALESCE(active_cursor,backup_cursor)::text COLLATE "C" IS NOT DISTINCT FROM expected_selected COLLATE "C"',
      skipped:
        '(CASE WHEN bypass THEN \'guard\'::refcursor ELSE source::refcursor END)::text COLLATE "C"=\'guard\' COLLATE "C"',
      null_literal: 'NULL::refcursor IS NULL',
      literal: '\'literal 😀  \'::refcursor::text COLLATE "C"=\'literal 😀  \'::text COLLATE "C"',
    }
    const columns =
      'active_cursor report_cursor,backup_cursor refcursor,source text,padded char(8),identifier name,wire bytea,choose_active boolean,bypass boolean,expected_text text,expected_padded text,expected_short text,expected_trimmed text,expected_selected text'
    await pg.exec(
      `CREATE TABLE cursor_values(${columns},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'cursor_values')!
    const checks = Object.entries(expressions).flatMap(([name, sql]) => {
      const constraint = table.constraints.find((c) => c.name === name)!
      return [
        { ...constraint, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...constraint, name: name + '_stored' },
      ].map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name,
        },
      }))
    })
    const group = prepareCheckRustGroup(checks)
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        checks[i]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(valueRepresentation('pg_catalog.refcursor')).toEqual({
      represented: true,
      type: 'pg_catalog.refcursor',
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let baseline: Row | undefined
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    for (const value of [...refcursorInputForms, null]) {
      const data = (
        await pg.query<{ padded: string | null; short: string | null; trimmed: string | null }>(
          `SELECT $1::text::char(8)::refcursor::text AS padded,$1::text::refcursor::varchar(3)::text AS short,$1::text::refcursor::char(8)::text AS trimmed`,
          [value],
        )
      ).rows[0]!
      const row: Row = {
        active_cursor: known(value),
        backup_cursor: known('backup'),
        source: known(value),
        padded: known(data.padded),
        identifier: known('report_identifier'),
        wire: known(value === null ? null : Buffer.from(value, 'utf8').toString('hex')),
        choose_active: known(true),
        bypass: known(true),
        expected_text: known(value),
        expected_padded: known(data.padded),
        expected_short: known(data.short),
        expected_trimmed: known(data.trimmed),
        expected_selected: known(value ?? 'backup'),
      }
      for (const name of Object.keys(expressions))
        add(name, row, {
          kind:
            name === 'wire' && value !== null && /[^\x00-\x7f]/u.test(value) ? 'Unknown' : 'True',
        })
      if (value === 'report_cursor') baseline = row
    }
    const base = baseline!
    add('value', { ...base, expected_text: known('different') }, { kind: 'False' })
    add('wire', { ...base, wire: known('00') }, { kind: 'False' })
    add('wire', { ...base, active_cursor: sqlError }, sqlError)
    add('wire', { ...base, active_cursor: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('wire', { ...base, active_cursor: known(null), wire: known(null) }, { kind: 'True' })
    add('wire', { ...base, active_cursor: known(null), wire: sqlError }, sqlError)
    add('value', { ...base, active_cursor: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('value', { ...base, active_cursor: sqlError }, sqlError)
    add('source', { ...base, source: sqlError }, sqlError)
    add('coalesced', { ...base, backup_cursor: sqlError }, { kind: 'True' })
    add('coalesced', { ...base, active_cursor: known(null), backup_cursor: sqlError }, sqlError)
    add('skipped', { ...base, source: sqlError }, { kind: 'True' })
    add('skipped', { ...base, bypass: known(false), source: sqlError }, sqlError)
    add('selected', { ...base, backup_cursor: sqlError }, { kind: 'True' })
    add('selected', { ...base, choose_active: sqlError }, sqlError)
    await runCheckParity(
      directory,
      'refcursor_names',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  }, 480000)
  it('does not add equality, implicit text calls, integer casts or knowledge of live cursors', async () => {
    for (const sql of [
      "SELECT 'a'::refcursor='a'::refcursor",
      "SELECT textsend('a'::refcursor)",
      "SELECT 'a'::refcursor<'b'::refcursor",
      "SELECT length('a'::refcursor)",
      "SELECT NULLIF('a'::refcursor,'a'::refcursor)",
    ])
      await expect(pg.query(sql)).rejects.toMatchObject({ code: '42883' })
    await expect(pg.query('SELECT 42::refcursor')).rejects.toMatchObject({ code: '42846' })
    await expect(
      pg.query("SELECT cursor_to_xml('absent_cursor'::refcursor,1,false,false,'')"),
    ).rejects.toMatchObject({ code: '34000' })
    for (const sql of [
      'active_cursor=backup_cursor',
      'textsend(active_cursor)=wire',
      'length(active_cursor)>0',
      "cursor_to_xml(active_cursor,1,false,false,'') IS NOT NULL",
    ]) {
      const probe = bindProbe(sql, [
        { name: 'active_cursor', typeName: 'refcursor' },
        { name: 'backup_cursor', typeName: 'refcursor' },
        { name: 'wire', typeName: 'bytea' },
      ])
      expect(probe.fullyBound, sql).toBe(false)
    }
  })
})
