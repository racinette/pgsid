import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { callableBoundary } from '../../scripts/check-measurements/catalog.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'

it('matches JSON source bytes and versioned canonical JSONB bytes, context boundaries and state composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-binary-'))
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec('CREATE DOMAIN wire_source AS json;CREATE DOMAIN wire_document AS jsonb')
    const expressions: Record<string, string> = {
      raw: 'json_send(raw) IS NOT DISTINCT FROM expected',
      normalized: 'jsonb_send(document) IS NOT DISTINCT FROM expected',
      qualified_raw: 'pg_catalog.json_send(raw) IS NOT DISTINCT FROM expected',
      qualified_normalized: 'pg_catalog.jsonb_send(document) IS NOT DISTINCT FROM expected',
      raw_hex: "encode(json_send(raw),'hex') IS NOT DISTINCT FROM expected_hex",
      normalized_hex: "encode(jsonb_send(document),'hex') IS NOT DISTINCT FROM expected_hex",
      raw_length: 'octet_length(json_send(raw)) IS NOT DISTINCT FROM expected_length',
      normalized_length: 'octet_length(jsonb_send(document)) IS NOT DISTINCT FROM expected_length',
      version: 'get_byte(jsonb_send(document),0) IS NOT DISTINCT FROM expected_version',
      guarded_raw:
        'CASE WHEN bypass THEN true ELSE json_send(raw) IS NOT DISTINCT FROM expected END',
      guarded_normalized:
        'CASE WHEN bypass THEN true ELSE jsonb_send(document) IS NOT DISTINCT FROM expected END',
      coalesced_raw: 'COALESCE(json_send(raw),fallback) IS NOT DISTINCT FROM expected',
      coalesced_normalized: 'COALESCE(jsonb_send(document),fallback) IS NOT DISTINCT FROM expected',
      selected:
        'jsonb_send(CASE WHEN bypass THEN document ELSE backup END) IS NOT DISTINCT FROM expected',
      field: 'jsonb_send(document->key_name) IS NOT DISTINCT FROM expected',
      element: 'jsonb_send(document->element_index) IS NOT DISTINCT FROM expected',
      concat: 'jsonb_send(document||backup) IS NOT DISTINCT FROM expected',
      builder:
        "jsonb_send(jsonb_build_object('payload',document,'number',1.2300)) IS NOT DISTINCT FROM expected",
      cast: 'jsonb_send(raw::jsonb) IS NOT DISTINCT FROM expected',
      literal: "jsonb_send('{\"a\":1,\"a\":2}'::wire_document)=decode('017b2261223a20327d','hex')",
      literal_source:
        "json_send(' {\"a\":1, \"a\":2} '::wire_source)=decode('207b2261223a312c202261223a327d20','hex')",
      raw_null: '(json_send(raw) IS NULL) IS NOT DISTINCT FROM expected_null',
      normalized_null: '(jsonb_send(document) IS NULL) IS NOT DISTINCT FROM expected_null',
    }
    await pg.exec(
      `CREATE TABLE wire_inputs(raw wire_source,document wire_document,backup jsonb,expected bytea,fallback bytea,expected_hex text,expected_length integer,expected_version integer,expected_null boolean,key_name text,element_index integer,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'wire_inputs')!
    for (const name of ['json_recv', 'jsonb_recv']) {
      const fn = builtinCallables().find(
        (f) => f.kind === 'function' && f.schema === 'pg_catalog' && f.name === name,
      )!
      expect(
        callableBoundary(fn, new Set(['pg_catalog."json"', 'pg_catalog.jsonb', 'pg_catalog.bytea']))
          .categories,
      ).toContain('internal-interface')
      await expect(pg.query(`SELECT ${name}(NULL)`)).rejects.toMatchObject({ code: '42883' })
    }
    await expect(pg.exec('CREATE TABLE wire_internal(value internal)')).rejects.toMatchObject({
      code: '42P16',
    })
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const plans = constraints.map((c) => ({
      expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    for (const [i, p] of plans.entries())
      expect(hasUncertain(p.expression), constraints[i]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name + ('reason' in c ? ':' + c.reason : '')).toBe('supported')
    const missing: Row = Object.fromEntries(
      [
        'raw',
        'document',
        'backup',
        'expected',
        'fallback',
        'expected_hex',
        'expected_length',
        'expected_version',
        'expected_null',
        'key_name',
        'element_index',
        'bypass',
      ].map((name) => [name, { kind: 'Unknown' }]),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row: { ...missing, ...row }, expected })
    }
    const common = [
      null,
      'null',
      'false',
      'true',
      '0.000',
      '-0.000',
      '1e2',
      '1e-10',
      '9007199254740993.123456789',
      '""',
      '"a\\n\\t\\u0001\\\"\\\\"',
      '[]',
      '{}',
      ' { "aa": 1, "b": 2, "aa":3 } ',
      '[null,true,{"x":[1.2300,2]}]',
      '"ñ"',
      '"雪😊"',
      '{"é":1,"a":2}',
    ]
    for (const type of ['json', 'jsonb'] as const)
      for (const value of [
        ...common,
        ...(type === 'json' ? ['"\\u0000"', '"\\ud800"', '"\\u96ea"', '1e131072'] : []),
      ]) {
        const send = type === 'json' ? 'json_send' : 'jsonb_send'
        const result = (
          await pg.query<{ input: string | null; wire: string | null }>(
            `SELECT $1::${type}::text input,encode(${send}($1::${type}),'hex') wire`,
            [value],
          )
        ).rows[0]!
        const portable =
          result.wire === null ||
          /^[\x00-\x7f]*$/u.test(
            Buffer.from(result.wire.slice(type === 'jsonb' ? 2 : 0), 'hex').toString('utf8'),
          )
        const row: Row = {
          raw: known(result.input),
          document: known(result.input),
          expected: known(result.wire),
          expected_hex: known(result.wire),
          expected_length: known(result.wire === null ? null : result.wire.length / 2),
          expected_version: known(result.wire === null ? null : 1),
          expected_null: known(result.wire === null),
          bypass: known(false),
        }
        const names =
          type === 'json'
            ? ['raw', 'qualified_raw', 'raw_hex', 'raw_length', 'guarded_raw', 'raw_null']
            : [
                'normalized',
                'qualified_normalized',
                'normalized_hex',
                'normalized_length',
                'version',
                'guarded_normalized',
                'normalized_null',
              ]
        for (const name of names) add(name, row, portable ? { kind: 'True' } : { kind: 'Unknown' })
        add(
          type === 'json' ? 'guarded_raw' : 'guarded_normalized',
          { ...row, bypass: known(true) },
          { kind: 'True' },
        )
        if (portable)
          add(
            type === 'json' ? 'raw' : 'normalized',
            { ...row, expected: known('ff') },
            { kind: 'False' },
          )
        if (type === 'jsonb' && result.wire !== null) expect(result.wire.slice(0, 2)).toBe('01')
        oracle.push({ type, value, input: result.input, wire: result.wire, portable })
      }
    const scenarios: { name: string; sql: string; setup: string; row: Row }[] = [
      {
        name: 'field',
        sql: "jsonb_send(document->'held')",
        setup: 'SELECT \'{"held":{"a":[1,null]},"unused":2}\'::jsonb document',
        row: { document: known('{"held":{"a":[1,null]},"unused":2}'), key_name: known('held') },
      },
      {
        name: 'field',
        sql: "jsonb_send(document->'missing')",
        setup: 'SELECT \'{"held":1}\'::jsonb document',
        row: { document: known('{"held":1}'), key_name: known('missing') },
      },
      {
        name: 'element',
        sql: 'jsonb_send(document->1)',
        setup: 'SELECT \'[1,{"a":2},3]\'::jsonb document',
        row: { document: known('[1,{"a":2},3]'), element_index: known(1) },
      },
      {
        name: 'concat',
        sql: 'jsonb_send(document||backup)',
        setup: 'SELECT \'{"a":1}\'::jsonb document,\'{"a":2,"b":3}\'::jsonb backup',
        row: { document: known('{"a":1}'), backup: known('{"a":2,"b":3}') },
      },
      {
        name: 'builder',
        sql: "jsonb_send(jsonb_build_object('payload',document,'number',1.2300))",
        setup: 'SELECT \'{"held":true}\'::jsonb document',
        row: { document: known('{"held":true}') },
      },
      {
        name: 'cast',
        sql: 'jsonb_send(raw::jsonb)',
        setup: 'SELECT \' {"a":1,"a":2} \'::json raw',
        row: { raw: known(' {"a":1,"a":2} ') },
      },
    ]
    for (const scenario of scenarios) {
      const wire = (
        await pg.query<{ wire: string | null }>(
          `SELECT encode(${scenario.sql},'hex') wire FROM(${scenario.setup})s`,
        )
      ).rows[0]!.wire
      add(scenario.name, { ...scenario.row, expected: known(wire) }, { kind: 'True' })
      oracle.push({ scenario: scenario.name, wire })
    }
    for (const type of ['raw', 'document'] as const)
      for (const state of [{ kind: 'Unknown' } as const, error('22003')]) {
        const row: Row = {
          [type]: state,
          expected: known(null),
          expected_hex: known(null),
          expected_length: known(null),
          expected_version: known(null),
          expected_null: known(false),
          bypass: known(false),
        }
        for (const name of type === 'raw'
          ? ['raw', 'raw_hex', 'raw_length', 'raw_null', 'guarded_raw']
          : [
              'normalized',
              'normalized_hex',
              'normalized_length',
              'normalized_null',
              'version',
              'guarded_normalized',
            ])
          add(name, row, state)
        add(
          type === 'raw' ? 'guarded_raw' : 'guarded_normalized',
          { ...row, bypass: known(true) },
          { kind: 'True' },
        )
      }
    for (const name of ['coalesced_raw', 'coalesced_normalized']) {
      add(
        name,
        { raw: known(null), document: known(null), fallback: known('ff'), expected: known('ff') },
        { kind: 'True' },
      )
      const wire = name === 'coalesced_raw' ? '6e756c6c' : '016e756c6c'
      add(
        name,
        {
          raw: known('null'),
          document: known('null'),
          fallback: error('22012'),
          expected: known(wire),
        },
        { kind: 'True' },
      )
    }
    add(
      'selected',
      {
        bypass: known(true),
        document: known('null'),
        backup: error('22012'),
        expected: known('016e756c6c'),
      },
      { kind: 'True' },
    )
    add('literal', {}, { kind: 'True' })
    add('literal_source', {}, { kind: 'True' })
    for (const [source, state] of [
      ['"\\u0000"', '22P05'],
      ['"\\ud800"', '22P02'],
      ['1e131072', '22003'],
    ]) {
      await expect(pg.query('SELECT jsonb_send($1::json::jsonb)', [source])).rejects.toMatchObject({
        code: state,
      })
      add('cast', { raw: known(source!), expected: known(null) }, error(state!))
    }
    await mkdir('artifacts/json-binary', { recursive: true })
    await writeFile(
      'artifacts/json-binary/oracle.json',
      JSON.stringify(
        { cases: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'json_binary',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
