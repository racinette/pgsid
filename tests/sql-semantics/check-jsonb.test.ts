import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  bindProbe,
  valueRepresentation,
  hasUncertain,
} from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('binds SQL-coerced jsonb values, source output, domains, SQL NULL and lazy composition in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-check-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error: Input & Outcome = { kind: 'Error', value: { state: parseInt('22003', 36) } }
  try {
    await pg.exec(
      'CREATE DOMAIN jsonb_document AS jsonb;CREATE DOMAIN nested_jsonb AS jsonb_document',
    )
    const expressions: Record<string, string> = {
      shape: 'jsonb_typeof(document) COLLATE "C" = expected_kind',
      source: 'document::text COLLATE "C" = expected_source',
      padded: 'document::char(3)::text COLLATE "C" = expected_padded',
      clipped: 'document::varchar(3)::text COLLATE "C" = expected_clipped',
      absent: 'document IS NULL',
      present: 'document IS NOT NULL',
      null_literal: 'NULL::jsonb IS NULL',
      domain_null: 'NULL::nested_jsonb IS NULL',
      domain_relabel: 'jsonb_typeof(document::nested_jsonb) COLLATE "C" = expected_kind',
      selected:
        'jsonb_typeof(CASE WHEN choose_document THEN document ELSE backup END) COLLATE "C" = expected_selected',
      coalesced:
        'jsonb_typeof(COALESCE(document,backup,NULL::jsonb)) COLLATE "C" = expected_selected',
      guarded:
        'CASE WHEN bypass THEN true ELSE jsonb_typeof(document) COLLATE "C" = expected_kind END',
    }
    const columns =
      'document nested_jsonb,backup jsonb,choose_document boolean,bypass boolean,expected_kind text COLLATE "C",expected_source text COLLATE "C",expected_selected text COLLATE "C",expected_padded text COLLATE "C",expected_clipped text COLLATE "C"'
    await pg.exec(
      `CREATE TABLE jsonb_checks(${columns},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'jsonb_checks')!
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
    for (const item of checks)
      expect(hasUncertain(item.expression), item.identity.constraint).toBe(false)
    const group = prepareCheckRustGroup(checks)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        checks[index]!.identity.constraint + ('reason' in check ? ': ' + check.reason : ''),
      ).toBe('supported')
    expect(valueRepresentation('pg_catalog.jsonb')).toEqual({
      represented: true,
      type: 'pg_catalog.jsonb',
    })
    expect(valueRepresentation('pg_catalog."json"').represented).toBe(true)
    expect(
      bindProbe('document = document', [{ name: 'document', typeName: 'jsonb' }]).fullyBound,
    ).toBe(true)
    for (const sql of [
      'source_text::pg_catalog.jsonb(2) IS NOT NULL',
      '\'{"a":2}\'::pg_catalog.jsonb(2) IS NOT NULL',
    ])
      expect(bindProbe(sql, [{ name: 'source_text', typeName: 'text' }]).fullyBound, sql).toBe(
        false,
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    let baseline: Row | undefined
    for (const value of [
      null,
      'null',
      'true',
      'false',
      '-0.00',
      '9007199254740993.00',
      '"雪😊"',
      '[]',
      '[1, null, true]',
      '{"a":1,"a":2}',
      ' \n {"list": [1, 2]} \t ',
    ]) {
      const data = (
        await pg.query<{
          kind: string | null
          source: string | null
          padded: string | null
          clipped: string | null
        }>(
          'SELECT jsonb_typeof(value) AS kind,value::text AS source,value::char(3)::text AS padded,value::varchar(3)::text AS clipped FROM (SELECT $1::jsonb AS value) q',
          [value],
        )
      ).rows[0]!
      const row: Row = {
        document: known(data.source),
        backup: known('[]'),
        choose_document: known(true),
        bypass: known(true),
        expected_kind: known(data.kind),
        expected_source: known(data.source),
        expected_selected: known(data.kind ?? 'array'),
        expected_padded: known(data.padded),
        expected_clipped: known(data.clipped),
      }
      for (const name of Object.keys(expressions)) {
        let kind: Outcome['kind'] = 'True'
        if (name === 'absent') kind = value === null ? 'True' : 'False'
        else if (name === 'present') kind = value === null ? 'False' : 'True'
        else if (
          value === null &&
          ['shape', 'source', 'padded', 'clipped', 'selected', 'domain_relabel'].includes(name)
        )
          kind = 'Null'
        add(name, row, { kind })
      }
      if (value === 'true') baseline = row
    }
    const base = baseline!
    add('shape', { ...base, expected_kind: known('array') }, { kind: 'False' })
    add('source', { ...base, expected_source: known('false') }, { kind: 'False' })
    for (const document of [{ kind: 'Unknown' } as const, error, known('NaN'), known('[1,]')]) {
      const expected: Outcome = document.kind === 'Error' ? error : { kind: 'Unknown' }
      for (const name of ['shape', 'source', 'absent', 'present', 'selected', 'coalesced'])
        add(name, { ...base, document }, expected)
      add('guarded', { ...base, document }, { kind: 'True' })
      add('guarded', { ...base, document, bypass: known(false) }, expected)
    }
    add('selected', { ...base, backup: error }, { kind: 'True' })
    add('selected', { ...base, choose_document: known(false), backup: error }, error)
    add('selected', { ...base, choose_document: error }, error)
    add('coalesced', { ...base, backup: error }, { kind: 'True' })
    add('coalesced', { ...base, document: known(null), backup: error }, error)
    add('coalesced', { ...base, document: known(null), backup: known(null) }, { kind: 'Null' })
    await runCheckParity(
      directory,
      'jsonb_checks',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
