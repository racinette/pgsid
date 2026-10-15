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
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { jsonInputForms, invalidJsonInputForms } from './check-json-input-forms.js'
import { bindProbe } from '../../scripts/check-measurements/probes.js'

it('matches JSON input grammar, lossless I/O casts, eager literals and lazy runtime casts across Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-input-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error: Input & Outcome = { kind: 'Error', value: { state: parseInt('22003', 36) } }
  const invalid: Outcome = { kind: 'Error', value: { state: parseInt('22P02', 36) } }
  try {
    await pg.exec(
      'CREATE DOMAIN input_document AS json;CREATE DOMAIN nested_input_document AS input_document',
    )
    const expressions: Record<string, string> = {
      source: 'source::json::text COLLATE "C" = expected_source',
      shape: 'json_typeof(source::json) COLLATE "C" = expected_kind',
      domain: 'source::nested_input_document::text COLLATE "C" = expected_source',
      constructor: 'pg_catalog.json(source)::text COLLATE "C" = expected_source',
      varying: 'source::varchar::json::text COLLATE "C" = expected_source',
      named: 'identifier::json::text COLLATE "C" = expected_identifier',
      padded: 'padded::json::text COLLATE "C" = expected_padded',
      named_constructor: 'pg_catalog.json(identifier)::text COLLATE "C" = expected_identifier',
      padded_constructor: 'pg_catalog.json(padded)::text COLLATE "C" = expected_padded',
      text_constructor: 'pg_catalog.text(source::json) COLLATE "C" = expected_source',
      present: 'source::json IS NOT NULL',
      lazy: 'CASE WHEN bypass THEN true ELSE json_typeof(source::json) COLLATE "C" = expected_kind END',
      selected:
        'json_typeof(CASE WHEN bypass THEN document ELSE source::json END) COLLATE "C" = expected_kind',
      coalesced: 'json_typeof(COALESCE(document,source::json)) COLLATE "C" = expected_kind',
      literal: `json_typeof('{"a":1,"a":2}'::json) COLLATE "C" = 'object' COLLATE "C"`,
      domain_literal: `'{"a":1,"a":2}'::nested_input_document::text COLLATE "C" = '{"a":1,"a":2}' COLLATE "C"`,
      implicit_literal: `json_typeof(COALESCE(document,'{"a":1,"a":2}')) COLLATE "C" = expected_kind`,
      null_literal: 'NULL::json IS NULL',
      literal_fallback: `json_typeof(COALESCE(document,'{}'::json)) COLLATE "C" = expected_kind`,
    }
    await pg.exec(
      `CREATE TABLE json_input_values(source text,document nested_input_document,identifier name,padded char(12),expected_source text COLLATE "C",expected_kind text COLLATE "C",expected_identifier text COLLATE "C",expected_padded text COLLATE "C",bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'json_input_values')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalidLiterals = {
      invalid_literal: `CASE WHEN bypass THEN true ELSE json_typeof('[1,]'::json) = expected_kind END`,
      invalid_short_circuit: `true OR json_typeof('[1,]'::json) = expected_kind`,
      invalid_coalesced_literal: `json_typeof(COALESCE(document,'[1,]'::json)) = expected_kind`,
    }
    for (const [name, sql] of Object.entries(invalidLiterals)) {
      constraints.push({
        ...table.constraints.find((c) => c.name === 'literal')!,
        name,
        definition: `CHECK(${sql})`,
      })
      await expect(
        pg.query(
          `SELECT ${sql} FROM (SELECT true bypass,'array'::text expected_kind,'{}'::json document) q`,
        ),
      ).rejects.toMatchObject({ code: '22P02' })
    }
    expect(
      bindProbe('source::pg_catalog.json(2) IS NOT NULL', [{ name: 'source', typeName: 'text' }])
        .fullyBound,
    ).toBe(false)
    const group = prepareCheckRustGroup(
      constraints.map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: c.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    const base: Row = {
      source: known('{}'),
      document: known('{}'),
      identifier: known('{}'),
      padded: known('{}          '),
      expected_source: known('{}'),
      expected_kind: known('object'),
      expected_identifier: known('{}'),
      expected_padded: known('{}          '),
      bypass: known(false),
    }
    for (const source of [...jsonInputForms, null]) {
      const oracle = (
        await pg.query<{ kind: string | null; source: string | null }>(
          'SELECT json_typeof(value) kind,value::text source FROM (SELECT $1::json value) q',
          [source],
        )
      ).rows[0]!
      const identifier = (
        await pg.query<{ value: string | null }>('SELECT $1::name::text value', [source])
      ).rows[0]!.value
      let namedExpected: Outcome = { kind: source === null ? 'Null' : 'True' }
      try {
        await pg.query('SELECT ($1::name)::json', [source])
      } catch (e) {
        expect(e).toMatchObject({ code: '22P02' })
        namedExpected = invalid
      }
      const padded = (
        await pg.query<{ value: string | null }>('SELECT $1::char(12) value', [source])
      ).rows[0]!.value
      let paddedExpected: Outcome = { kind: source === null ? 'Null' : 'True' }
      try {
        await pg.query('SELECT ($1::char(12))::json', [source])
      } catch (e) {
        expect(e).toMatchObject({ code: '22P02' })
        paddedExpected = invalid
      }
      const row: Row = {
        ...base,
        source: known(source),
        document: known(source),
        identifier: known(identifier),
        padded: known(padded),
        expected_source: known(oracle.source),
        expected_kind: known(oracle.kind),
        expected_identifier: known(identifier),
        expected_padded: known(padded),
      }
      for (const name of [
        'source',
        'shape',
        'domain',
        'constructor',
        'varying',
        'text_constructor',
        'lazy',
        'selected',
        'coalesced',
      ])
        add(name, row, { kind: source === null ? 'Null' : 'True' })
      for (const name of ['named', 'named_constructor']) add(name, row, namedExpected)
      for (const name of ['padded', 'padded_constructor']) add(name, row, paddedExpected)
      add('present', row, { kind: source === null ? 'False' : 'True' })
      add('literal', row, { kind: 'True' })
      add('domain_literal', row, { kind: 'True' })
      add('null_literal', row, { kind: 'True' })
    }
    for (const source of invalidJsonInputForms) {
      await expect(pg.query('SELECT $1::json', [source])).rejects.toMatchObject({ code: '22P02' })
      const row = { ...base, source: known(source) }
      for (const name of [
        'source',
        'shape',
        'domain',
        'constructor',
        'varying',
        'text_constructor',
        'present',
        'lazy',
        'selected',
      ])
        add(name, row, invalid)
      add('lazy', { ...row, bypass: known(true) }, { kind: 'True' })
      add('selected', { ...row, bypass: known(true) }, { kind: 'True' })
      add('coalesced', row, { kind: 'True' })
      add('coalesced', { ...row, document: known(null) }, invalid)
    }
    for (const source of [{ kind: 'Unknown' } as const, error]) {
      const expected: Outcome = source.kind === 'Error' ? error : { kind: 'Unknown' }
      for (const name of ['source', 'shape', 'domain', 'present', 'lazy', 'selected'])
        add(name, { ...base, source }, expected)
      add('lazy', { ...base, source, bypass: known(true) }, { kind: 'True' })
      add('coalesced', { ...base, source }, { kind: 'True' })
      add('coalesced', { ...base, source, document: known(null) }, expected)
    }
    for (const name of ['implicit_literal', 'literal_fallback']) {
      add(name, base, { kind: 'True' })
      add(name, { ...base, document: known(null) }, { kind: 'True' })
      add(name, { ...base, document: error }, error)
      add(name, { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
    }
    for (const name of Object.keys(invalidLiterals))
      fixtures.push({ name, row: { ...base, bypass: known(true) }, expected: invalid })
    add(
      'source',
      {
        ...base,
        source: known('['.repeat(16384) + '0' + ']'.repeat(16384)),
        expected_source: known('['.repeat(16384) + '0' + ']'.repeat(16384)),
      },
      { kind: 'True' },
    )
    await runCheckParity(
      directory,
      'json_input_values',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
