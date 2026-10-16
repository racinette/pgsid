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

const targets = [
  { name: 'text', type: 'text', values: [null, '', 'a', '雪😊', 'a  ', '\b\f\n\r\t"\\'] },
  {
    name: 'number',
    type: 'numeric',
    values: [null, '0.000', '1.2300', '1e100', '1e-100', 'NaN', 'Infinity', '-Infinity'],
  },
  {
    name: 'big',
    type: 'bigint',
    values: [null, '-9223372036854775808', '9007199254740993', '9223372036854775807'],
  },
  { name: 'boolean', type: 'boolean', values: [null, false, true] },
  {
    name: 'real',
    type: 'real',
    values: [null, '-0', '0', '1', '-9', 'NaN', 'Infinity', '-Infinity', '1.23456789'],
  },
  {
    name: 'double',
    type: 'float8',
    values: [null, '-0', '0', '1', '-9', 'NaN', 'Infinity', '-Infinity', '1.2345678901234567'],
  },
  {
    name: 'json',
    type: 'json',
    values: [
      null,
      'null',
      'true',
      '1.2300',
      '"a"',
      '{"a":1,"a":2}',
      '[true,null,{"n":1.2300}]',
      '"\\u0000"',
      '1e131072',
    ],
  },
  {
    name: 'document',
    type: 'jsonb',
    values: [null, 'null', 'true', '1.2300', '"a"', '{"aa":1,"é":2}', '[true,null,{"n":1.2300}]'],
  },
  { name: 'uuid', type: 'uuid', values: [null, '550E8400-E29B-41D4-A716-446655440000'] },
  { name: 'network', type: 'inet', values: [null, '192.0.2.129/24', '2001:db8::1/64'] },
  { name: 'padded', type: 'char(4)', values: [null, '', 'a', '雪😊'] },
  { name: 'alias', type: 'regclass', values: [null, '0', 'pg_class'] },
  { name: 'bytes', type: 'bytea', values: [null, '\\x', '\\x00ff'] },
  { name: 'enum', type: 'builder_label', values: [null, 'one', 'two'] },
] as const

it('matches heterogeneous JSONB builders, scalar keys, eager arguments, normalization, ownership and lazy composition in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-builders-'))
  const known = (value: string | number | bigint | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(
      "CREATE TYPE builder_label AS ENUM('one','two');CREATE DOMAIN builder_number AS numeric;CREATE DOMAIN builder_document AS jsonb",
    )
    const expressions: Record<string, string> = {}
    const outputs: Record<string, string> = {}
    for (const target of targets) {
      outputs['array_' + target.name] = `jsonb_build_array(v_${target.name},'tail',NULL)`
      outputs['object_' + target.name] = `jsonb_build_object(v_${target.name},v_document)`
      for (const prefix of ['array_', 'object_']) {
        const name = prefix + target.name
        expressions[name] = `${outputs[name]} IS NOT DISTINCT FROM expected`
        expressions['guard_' + name] =
          `CASE WHEN bypass THEN true ELSE ${outputs[name]} IS NOT DISTINCT FROM expected END`
      }
    }
    Object.assign(outputs, {
      mixed: 'jsonb_build_array(v_text,v_number,v_big,v_boolean,v_json,v_document,NULL)',
      duplicate: "jsonb_build_object(v_text,v_json,'overwritten',v_document,v_text,v_number)",
      selected_roots:
        "jsonb_build_array(v_document->'selected',v_document->'other',v_document->'selected')",
      object_roots: "jsonb_build_object('a',v_document->'selected','b',v_document->'other')",
      nested:
        "jsonb_build_object('values',jsonb_build_array(v_text,v_number,NULL),'original',v_document)",
      domain: 'jsonb_build_array(v_domain,v_domain_document)',
      coalesced: "COALESCE(jsonb_build_array(v_text,NULL),'[]'::jsonb)",
      chosen: 'jsonb_build_array(CASE WHEN bypass THEN v_text ELSE v_fallback END,v_number)',
      null_key: 'jsonb_build_object(NULL,v_integer)',
      odd: "jsonb_build_object('a',v_integer, v_text)",
      argument_error: 'jsonb_build_object(NULL,1/v_integer)',
      odd_argument_error: "jsonb_build_object('a',1/v_integer,'unpaired')",
    })
    for (const name of [
      'mixed',
      'duplicate',
      'selected_roots',
      'object_roots',
      'nested',
      'domain',
      'coalesced',
      'chosen',
    ])
      expressions[name] = `${outputs[name]} IS NOT DISTINCT FROM expected`
    for (const name of ['null_key', 'odd', 'argument_error', 'odd_argument_error']) {
      expressions[name] = `${outputs[name]} IS NULL`
      expressions['skip_' + name] = `CASE WHEN bypass THEN true ELSE ${outputs[name]} IS NULL END`
    }
    Object.assign(expressions, {
      length: 'jsonb_array_length(jsonb_build_array(v_text,NULL))=2',
      extracted:
        "(jsonb_build_object('selected',v_document)->'selected') IS NOT DISTINCT FROM expected",
      empty_array: "pg_catalog.jsonb_build_array()='[]'::jsonb",
      empty_object: "pg_catalog.jsonb_build_object()='{}'::jsonb",
      literal_array:
        "jsonb_build_array(NULL,true,123,9007199254740993,9223372036854775808,1.2300,'a')='[null,true,123,9007199254740993,9223372036854775808,1.2300,\"a\"]'::jsonb",
      literal_object:
        "jsonb_build_object('a',NULL,'b',jsonb_build_array(),'a',2)='{\"a\":2,\"b\":[]}'::jsonb",
      literal_keys:
        'jsonb_build_object(\'-0\'::float8,1,\'-0\'::real,2,true,3,1.2300::numeric,4)=\'{"-0":2,"true":3,"1.2300":4}\'::jsonb',
      skipped_literal_key: 'CASE WHEN bypass THEN true ELSE jsonb_build_object(NULL,1) IS NULL END',
      eager_argument: 'CASE WHEN bypass THEN true ELSE jsonb_build_object(NULL,1/0) IS NULL END',
      skip_bad_key_coalesce:
        'COALESCE(v_document,jsonb_build_object(NULL,v_integer)) IS NOT DISTINCT FROM expected',
    })
    await pg.exec(
      `CREATE TABLE builder_inputs(${targets.map((t) => `v_${t.name} ${t.type}`).join(',')},v_domain builder_number,v_domain_document builder_document,v_integer integer,v_fallback text,expected jsonb,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'builder_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return [
        { ...c, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...c, name: name + '_stored' },
      ]
    })
    const plans = constraints.map((c) => ({
      expression: portableCheckAtoms(
        lowerTableCheck(table, c, catalog.enums, catalog.domains)!.expression,
      ),
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: c.name },
    }))
    for (const [i, p] of plans.entries())
      expect(hasUncertain(p.expression), constraints[i]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, constraints[i]!.name + ('reason' in c ? ':' + c.reason : '')).toBe('supported')
    for (const sql of [
      'jsonb_build_array(VARIADIC ARRAY[1,2]) IS NULL',
      'jsonb_build_object(VARIADIC NULL::text[]) IS NULL',
    ]) {
      const lowered = lowerTableCheck(
        table,
        { name: 'variadic_array', type: 'check', definition: `CHECK(${sql})` },
        [],
        catalog.domains,
      )!
      expect(hasUncertain(lowered.expression)).toBe(false)
      expect(JSON.stringify(lowered.expression)).toContain('"variadic":true')
      expect(hasUncertain(portableCheckAtoms(lowered.expression))).toBe(false)
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const oracle: unknown[] = []
    const missing: Row = Object.fromEntries(
      [
        ...targets.map((t) => 'v_' + t.name),
        'v_domain',
        'v_domain_document',
        'v_integer',
        'v_fallback',
        'expected',
        'bypass',
      ].map((name) => [name, { kind: 'Unknown' }]),
    )
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row: { ...missing, ...row }, expected })
    }
    for (const target of targets)
      for (const value of target.values) {
        const parameter =
          target.name === 'bytes' && value !== null
            ? Buffer.from(String(value).slice(2), 'hex')
            : value
        const isFloat = target.name === 'real' || target.name === 'double'
        const coerced = (
          await pg.query<{ input: string | null; wire: string | null }>(
            `SELECT ${target.name === 'padded' ? `bpcharout($1::${target.type})` : `$1::${target.type}::text`} input,${isFloat ? `encode(${target.name === 'real' ? 'float4send' : 'float8send'}($1::${target.type}),'hex')` : target.name === 'alias' ? `($1::regclass)::oid::text` : 'NULL::text'} wire`,
            [parameter],
          )
        ).rows[0]!
        let payload: string | number | bigint | boolean | null = coerced.input
        if (target.name === 'big') payload = coerced.input === null ? null : BigInt(coerced.input)
        if (target.name === 'boolean') payload = value
        if (target.name === 'enum')
          payload = coerced.input === null ? null : coerced.input === 'one' ? 0 : 1
        if (target.name === 'bytes')
          payload = coerced.input === null ? null : coerced.input.slice(2)
        if (target.name === 'alias') payload = coerced.wire === null ? null : BigInt(coerced.wire)
        if (isFloat)
          payload =
            coerced.wire === null
              ? null
              : target.name === 'real'
                ? Buffer.from(coerced.wire, 'hex').readInt32BE()
                : Buffer.from(coerced.wire, 'hex').readBigInt64BE()
        const deferred =
          value !== null &&
          ((['alias', 'bytes', 'enum'].includes(target.name) &&
            !(target.name === 'alias' && value === '0')) ||
            (isFloat && String(value).startsWith('1.234')))
        for (const prefix of ['array_', 'object_']) {
          const name = prefix + target.name,
            sql = outputs[name]!
          let output: string | null = null,
            state: string | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql})::text value FROM(SELECT $1::${target.type} AS v_${target.name}${target.name === 'document' ? '' : `, '{"held":true}'::jsonb AS v_document`})s`,
                [parameter],
              )
            ).rows[0]!.value
          } catch (e) {
            state = (e as { code: string }).code
          }
          const row: Row = {
            ['v_' + target.name]: known(payload),
            expected: known(output),
            bypass: known(false),
          }
          if (target.name !== 'document') row.v_document = known('{"held":true}')
          const outcome: Outcome = deferred
            ? { kind: 'Unknown' }
            : state
              ? error(state)
              : { kind: 'True' }
          add(name, row, outcome)
          add('guard_' + name, row, outcome)
          add('guard_' + name, { ...row, bypass: known(true) }, { kind: 'True' })
          if (outcome.kind === 'True')
            add(name, { ...row, expected: known('["wrong"]') }, { kind: 'False' })
          oracle.push({ target: target.name, value, operation: prefix, output, state, outcome })
        }
      }
    const scenarios = [
      {
        name: 'mixed',
        sql: 'SELECT NULL::text v_text,1.2300::numeric v_number,9007199254740993::bigint v_big,true v_boolean,\'{"a":1,"a":2}\'::json v_json,\'[1,null]\'::jsonb v_document',
        row: {
          v_text: known(null),
          v_number: known('1.2300'),
          v_big: known(9007199254740993n),
          v_boolean: known(true),
          v_json: known('{"a":1,"a":2}'),
          v_document: known('[1,null]'),
        },
      },
      {
        name: 'duplicate',
        sql: "SELECT 'overwritten'::text v_text,'[1]'::json v_json,'{\"held\":true}'::jsonb v_document,1.2300::numeric v_number",
        row: {
          v_text: known('overwritten'),
          v_json: known('[1]'),
          v_document: known('{"held":true}'),
          v_number: known('1.2300'),
        },
      },
      ...['selected_roots', 'object_roots'].map((name) => ({
        name,
        sql: 'SELECT \'{"selected":{"x":[1,null]},"other":[2,3],"unused":4}\'::jsonb v_document',
        row: { v_document: known('{"selected":{"x":[1,null]},"other":[2,3],"unused":4}') },
      })),
      {
        name: 'nested',
        sql: "SELECT '雪😊'::text v_text,1.2300::numeric v_number,'{\"original\":true}'::jsonb v_document",
        row: {
          v_text: known('雪😊'),
          v_number: known('1.2300'),
          v_document: known('{"original":true}'),
        },
      },
      {
        name: 'domain',
        sql: 'SELECT 1.2300::builder_number v_domain,\'{"a":1}\'::builder_document v_domain_document',
        row: { v_domain: known('1.2300'), v_domain_document: known('{"a":1}') },
      },
      { name: 'coalesced', sql: 'SELECT NULL::text v_text', row: { v_text: known(null) } },
      {
        name: 'chosen',
        sql: "SELECT true bypass,'chosen'::text v_text,'ignored'::text v_fallback,2::numeric v_number",
        row: {
          bypass: known(true),
          v_text: known('chosen'),
          v_fallback: error('22012'),
          v_number: known('2'),
        },
      },
    ]
    for (const scenario of scenarios) {
      const output = (
        await pg.query<{ value: string }>(
          `SELECT (${outputs[scenario.name]})::text value FROM(${scenario.sql})s`,
        )
      ).rows[0]!.value
      const row = { ...scenario.row, expected: known(output) } as Row
      add(scenario.name, row, { kind: 'True' })
      add(scenario.name, { ...row, expected: known('["wrong"]') }, { kind: 'False' })
      oracle.push({ scenario: scenario.name, output })
    }
    for (const target of targets)
      for (const state of [{ kind: 'Unknown' } as const, error('22003')]) {
        const row: Row = {
          ['v_' + target.name]: state,
          v_document: known('{}'),
          expected: known(null),
          bypass: known(false),
        }
        row['v_' + target.name] = state
        for (const prefix of ['array_', 'object_']) {
          add(prefix + target.name, row, state)
          add('guard_' + prefix + target.name, { ...row, bypass: known(true) }, { kind: 'True' })
        }
      }
    for (const name of [
      'empty_array',
      'empty_object',
      'literal_array',
      'literal_object',
      'literal_keys',
    ])
      add(name, {}, { kind: 'True' })
    for (const name of ['null_key', 'odd', 'argument_error', 'odd_argument_error']) {
      const row: Row = { v_integer: known(0), v_text: known('unpaired'), bypass: known(false) }
      const state = name.includes('argument_error') ? '22012' : '22023'
      await expect(
        pg.query(
          `SELECT (${outputs[name]}) FROM(SELECT $1::int v_integer,'unpaired'::text v_text)s`,
          [0],
        ),
      ).rejects.toMatchObject({ code: state })
      add(name, row, error(state))
      add('skip_' + name, row, error(state))
      add('skip_' + name, { ...row, bypass: known(true) }, { kind: 'True' })
      add(name, { ...row, v_integer: error('22003') }, error('22003'))
    }
    add('skipped_literal_key', { bypass: known(true) }, { kind: 'True' })
    add('skipped_literal_key', { bypass: known(false) }, error('22023'))
    await pg.exec(
      'CREATE TABLE builder_eager_argument(bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE jsonb_build_object(NULL,1/0) IS NULL END))',
    )
    await expect(pg.query('INSERT INTO builder_eager_argument VALUES(true)')).rejects.toMatchObject(
      { code: '22012' },
    )
    add('eager_argument', { bypass: known(true) }, error('22012'))
    add('eager_argument', { bypass: known(false) }, error('22012'))
    add('length', { v_text: known(null) }, { kind: 'True' })
    add('length', { v_text: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('length', { v_text: error('22012') }, error('22012'))
    add('extracted', { v_document: known('null'), expected: known('null') }, { kind: 'True' })
    add(
      'skip_bad_key_coalesce',
      { v_document: known('{}'), v_integer: error('22012'), expected: known('{}') },
      { kind: 'True' },
    )
    add(
      'skip_bad_key_coalesce',
      { v_document: known(null), v_integer: known(1), expected: known(null) },
      error('22023'),
    )
    add('mixed', { v_text: error('22003'), v_number: error('22012') }, error('22003'))
    add('mixed', { v_text: { kind: 'Unknown' }, v_number: error('22012') }, error('22012'))
    add('object_text', { v_text: { kind: 'Unknown' }, v_document: error('22003') }, error('22003'))
    const zeroRendering: unknown[] = []
    for (let setting = -15; setting <= 3; setting++) {
      await pg.exec(`SET extra_float_digits=${setting}`)
      const rendered = (
        await pg.query<{ keys: string; values: string }>(
          `SELECT jsonb_build_object('-0'::real,1,'-0'::float8,2)::text keys,jsonb_build_array('-0'::real,'-0'::float8)::text values`,
        )
      ).rows[0]!
      expect(rendered).toEqual({ keys: '{"-0": 2}', values: '[0, 0]' })
      zeroRendering.push({ setting, ...rendered })
    }
    await pg.exec('RESET extra_float_digits')
    await mkdir('artifacts/jsonb-builders', { recursive: true })
    await writeFile(
      'artifacts/jsonb-builders/oracle.json',
      JSON.stringify(
        { cases: oracle, zeroRendering, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_builders',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
