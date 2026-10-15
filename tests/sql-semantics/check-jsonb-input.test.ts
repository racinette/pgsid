import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { bindProbe } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import {
  jsonbInputForms,
  invalidJsonbInputForms,
  deferredJsonbEncodingForms,
} from './check-jsonb-input-forms.js'

it('matches JSONB literals, catalog text/JSON I/O casts, eager input errors and lazy runtime branches in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-input-'))
  const known = (value: string | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Outcome & Input => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      'CREATE DOMAIN input_document AS jsonb;CREATE DOMAIN nested_input_document AS input_document',
    )
    const expressions: Record<string, string> = {
      source: 'source::jsonb::text COLLATE "C" = expected_source',
      shape: 'jsonb_typeof(source::jsonb) COLLATE "C" = expected_kind',
      domain: 'source::nested_input_document::text COLLATE "C" = expected_source',
      constructor: 'pg_catalog.jsonb(source)::text COLLATE "C" = expected_source',
      varying: 'source::varchar::jsonb::text COLLATE "C" = expected_source',
      named: 'identifier::jsonb::text COLLATE "C" = expected_identifier',
      padded: 'padded::jsonb::text COLLATE "C" = expected_padded',
      named_constructor: 'pg_catalog.jsonb(identifier)::text COLLATE "C" = expected_identifier',
      padded_constructor: 'pg_catalog.jsonb(padded)::text COLLATE "C" = expected_padded',
      text_constructor: 'pg_catalog.text(source::jsonb) COLLATE "C" = expected_source',
      json_input: 'raw_document::jsonb::text COLLATE "C" = expected_source',
      json_output: 'json_typeof(document::json) COLLATE "C" = expected_kind',
      present: 'source::jsonb IS NOT NULL',
      lazy: 'CASE WHEN bypass THEN true ELSE jsonb_typeof(source::jsonb) COLLATE "C" = expected_kind END',
      selected:
        'jsonb_typeof(CASE WHEN bypass THEN document ELSE source::jsonb END) COLLATE "C" = expected_kind',
      coalesced: 'jsonb_typeof(COALESCE(document,source::jsonb)) COLLATE "C" = expected_kind',
      literal: `jsonb_typeof('{"a":1,"a":2}'::jsonb) COLLATE "C" = 'object' COLLATE "C"`,
      domain_literal: `'{"a":1,"a":2}'::nested_input_document::text COLLATE "C" = '{"a": 2}' COLLATE "C"`,
      implicit_literal: `jsonb_typeof(COALESCE(document,'{"a":1,"a":2}')) COLLATE "C" = expected_kind`,
      null_literal: 'NULL::jsonb IS NULL',
      literal_fallback: `jsonb_typeof(COALESCE(document,'{}'::jsonb)) COLLATE "C" = expected_kind`,
    }
    await pg.exec(
      `CREATE TABLE jsonb_input_values(source text,document nested_input_document,raw_document json,identifier name,padded char(12),expected_source text COLLATE "C",expected_kind text COLLATE "C",expected_identifier text COLLATE "C",expected_padded text COLLATE "C",bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_input_values')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const eager: { name: string; sql: string; state: string }[] = []
    for (const [input, state] of [
      ['[1,]', '22P02'],
      ['1e131072', '22003'],
      ['"\\u0000"', '22P05'],
    ] as const) {
      const literal = `'${input}'::nested_input_document`
      for (const [label, sql] of Object.entries({
        case: `CASE WHEN bypass THEN true ELSE jsonb_typeof(${literal}) = expected_kind END`,
        or: `true OR jsonb_typeof(${literal}) = expected_kind`,
        coalesce: `jsonb_typeof(COALESCE(document,${literal})) = expected_kind`,
      })) {
        const name = 'eager_' + eager.length + '_' + label
        eager.push({ name, sql, state })
        constraints.push({
          ...table.constraints.find((c) => c.name === 'literal')!,
          name,
          definition: `CHECK(${sql})`,
        })
        await expect(
          pg.query(
            `SELECT ${sql} FROM (SELECT true bypass,'object'::text expected_kind,'{}'::jsonb document) q`,
          ),
        ).rejects.toMatchObject({ code: state })
      }
    }
    expect(
      bindProbe('source::pg_catalog.jsonb(2) IS NOT NULL', [{ name: 'source', typeName: 'text' }])
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: {
        input: string | null
        output?: string | null
        kind?: string | null
        state?: string
      }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    const base: Row = {
      source: known('{}'),
      document: known('{}'),
      raw_document: known('{}'),
      identifier: known('{}'),
      padded: known('{}          '),
      expected_source: known('{}'),
      expected_kind: known('object'),
      expected_identifier: known('{}'),
      expected_padded: known('{}'),
      bypass: known(false),
    }
    const reference = async (input: string | null, cast = 'jsonb') => {
      try {
        const row = (
          await pg.query<{ output: string | null; kind: string | null }>(
            `SELECT value::text output,jsonb_typeof(value) kind FROM (SELECT $1::${cast} value) q`,
            [input],
          )
        ).rows[0]!
        return { row, outcome: { kind: input === null ? 'Null' : 'True' } as Outcome }
      } catch (e) {
        const state = (e as { code: string }).code
        expect(['22P02', '22P05', '22003']).toContain(state)
        return { row: { output: null, kind: null }, outcome: error(state) }
      }
    }
    const conversionNames = [
      'source',
      'shape',
      'domain',
      'constructor',
      'varying',
      'text_constructor',
      'present',
      'lazy',
      'selected',
    ]
    for (const input of [...jsonbInputForms, null]) {
      const { row: data, outcome } = await reference(input)
      expect(outcome.kind, input ?? 'SQL NULL').not.toBe('Error')
      oracle.push({ input, ...data })
      const identifier = (
        await pg.query<{ value: string | null }>('SELECT $1::name::text value', [input])
      ).rows[0]!.value
      const padded = (
        await pg.query<{ value: string | null }>('SELECT $1::char(12) value', [input])
      ).rows[0]!.value
      const nameResult = await reference(identifier, 'name::jsonb'),
        padResult = await reference(padded, 'char(12)::jsonb')
      const row: Row = {
        ...base,
        source: known(input),
        document: known(data.output),
        raw_document: known(input),
        identifier: known(identifier),
        padded: known(padded),
        expected_source: known(data.output),
        expected_kind: known(data.kind),
        expected_identifier: known(nameResult.row.output),
        expected_padded: known(padResult.row.output),
      }
      for (const name of conversionNames)
        add(name, row, name === 'present' ? { kind: input === null ? 'False' : 'True' } : outcome)
      for (const name of ['json_input', 'json_output', 'coalesced']) add(name, row, outcome)
      for (const name of ['named', 'named_constructor']) add(name, row, nameResult.outcome)
      for (const name of ['padded', 'padded_constructor']) add(name, row, padResult.outcome)
      for (const name of ['literal', 'domain_literal', 'null_literal'])
        add(name, row, { kind: 'True' })
    }
    for (const input of invalidJsonbInputForms) {
      const { outcome } = await reference(input)
      expect(outcome.kind, input).toBe('Error')
      oracle.push({
        input,
        state: outcome.kind === 'Error' ? outcome.value.state.toString(36).toUpperCase() : '',
      })
      const row = { ...base, source: known(input) }
      for (const name of conversionNames) add(name, row, outcome)
      add('lazy', { ...row, bypass: known(true) }, { kind: 'True' })
      add('selected', { ...row, bypass: known(true) }, { kind: 'True' })
      add('coalesced', row, { kind: 'True' })
      add('coalesced', { ...row, document: known(null) }, outcome)
      const validJson = await pg.query('SELECT $1::json', [input]).then(
        () => true,
        () => false,
      )
      if (validJson) add('json_input', { ...row, raw_document: known(input) }, outcome)
    }
    for (const input of deferredJsonbEncodingForms) {
      const { row: data } = await reference(input)
      expect(data.output).not.toBeNull()
      const row = {
        ...base,
        source: known(input),
        raw_document: known(input),
        expected_source: known(data.output),
        expected_kind: known(data.kind),
      }
      for (const name of conversionNames) add(name, row, { kind: 'Unknown' })
      add('json_input', row, { kind: 'Unknown' })
      add('lazy', { ...row, bypass: known(true) }, { kind: 'True' })
      add('coalesced', row, { kind: data.kind === 'object' ? 'True' : 'False' })
    }
    for (const input of [{ kind: 'Unknown' } as const, error('22003')]) {
      const outcome: Outcome = input.kind === 'Error' ? input : { kind: 'Unknown' }
      for (const name of conversionNames) add(name, { ...base, source: input }, outcome)
      add('lazy', { ...base, source: input, bypass: known(true) }, { kind: 'True' })
      add('coalesced', { ...base, source: input }, { kind: 'True' })
      add('coalesced', { ...base, source: input, document: known(null) }, outcome)
    }
    for (const name of ['implicit_literal', 'literal_fallback']) {
      add(name, base, { kind: 'True' })
      add(name, { ...base, document: known(null) }, { kind: 'True' })
      add(name, { ...base, document: error('22003') }, error('22003'))
      add(name, { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
    }
    for (const item of eager)
      fixtures.push({
        name: item.name,
        row: { ...base, bypass: known(true) },
        expected: error(item.state),
      })
    for (const input of ['{"aa":1,"é":2}', '{"雪":1,"a":2}']) {
      const row = { ...base, source: known(input), document: known(input) }
      add('shape', row, { kind: 'True' })
      add('source', row, { kind: 'Unknown' })
      add('json_output', row, { kind: 'Unknown' })
    }
    const deep = '['.repeat(16384) + '0' + ']'.repeat(16384)
    add('source', { ...base, source: known(deep), expected_source: known(deep) }, { kind: 'True' })
    await mkdir('artifacts/jsonb-input', { recursive: true })
    await writeFile(
      'artifacts/jsonb-input/oracle.json',
      JSON.stringify({ oracle, fixtures: fixtures.length, checks: constraints.length }, null, 2) +
        '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_input_values',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
