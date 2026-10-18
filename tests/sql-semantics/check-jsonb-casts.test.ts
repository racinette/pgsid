import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain, bindProbe } from '../../scripts/check-measurements/probes.js'
import { builtinCast, builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const targets = [
  { name: 'bool', type: 'pg_catalog.bool', send: 'boolsend' },
  { name: 'numeric', type: 'pg_catalog."numeric"', send: 'numeric_send' },
  { name: 'int2', type: 'pg_catalog.int2', send: 'int2send' },
  { name: 'int4', type: 'pg_catalog.int4', send: 'int4send' },
  { name: 'int8', type: 'pg_catalog.int8', send: 'int8send' },
  { name: 'float4', type: 'pg_catalog.float4', send: 'float4send' },
  { name: 'float8', type: 'pg_catalog.float8', send: 'float8send' },
] as const

it('matches all JSONB scalar casts, JSON null, exact decimal scale, integer rounding and float bits in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-casts-'))
  const known = (value: string | number | bigint | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  const wire = (send: string, value: string) => `encode(pg_catalog.${send}(${value}),'hex')`
  const match = (value: string) =>
    `(${value}) COLLATE "C" IS NOT DISTINCT FROM expected_wire COLLATE "C"`
  try {
    await pg.exec(
      'CREATE DOMAIN cast_document AS jsonb;CREATE DOMAIN retained_cast_document AS cast_document;CREATE DOMAIN document_count AS int4',
    )
    for (const target of targets)
      await pg.exec(
        `CREATE DOMAIN scalar_target_${target.name} AS ${target.type};CREATE DOMAIN retained_scalar_target_${target.name} AS scalar_target_${target.name}`,
      )
    await pg.exec(
      'CREATE DOMAIN required_count AS document_count NOT NULL;CREATE DOMAIN positive_count AS document_count CHECK(VALUE>0);CREATE DOMAIN bounded_number AS numeric(6,2)',
    )
    const constrainedDomains = ['required_count', 'positive_count', 'bounded_number']
    for (const domain of constrainedDomains)
      await pg.exec(
        `CREATE TABLE domain_witness_${domain}(document retained_cast_document,bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE document::${domain} IS NOT NULL END))`,
      )
    const expressions: Record<string, string> = {}
    for (const target of targets) {
      const cast = `document::${target.type}`
      expressions['cast_' + target.name] = match(wire(target.send, cast))
      expressions['domain_' + target.name] = match(
        wire(target.send, `document::retained_scalar_target_${target.name}`),
      )
      expressions['call_' + target.name] = match(
        wire(target.send, `pg_catalog.${target.name}(document)`),
      )
      expressions['null_' + target.name] = `(${cast} IS NULL) IS NOT DISTINCT FROM expected_null`
      expressions['guard_' + target.name] =
        `CASE WHEN bypass THEN true ELSE ${match(wire(target.send, cast))} END`
    }
    const numericTypes = [
      'numeric(10,2)',
      'numeric(4)',
      'numeric(3,-2)',
      'numeric(3,5)',
      'numeric(1000,-1000)',
      'numeric(1000,1000)',
    ]
    for (const [index, type] of numericTypes.entries()) {
      expressions['modifier_' + index] = match(wire('numeric_send', 'document::' + type))
      expressions['guard_modifier_' + index] =
        `CASE WHEN bypass THEN true ELSE ${match(wire('numeric_send', 'document::' + type))} END`
    }
    Object.assign(expressions, {
      typed_existing_numeric: match(wire('numeric_send', 'decimal_value::numeric(4,2)')),
      typed_existing_integer: match(wire('numeric_send', 'integer_value::numeric(4,2)')),
      typed_existing_float: match(wire('numeric_send', 'float_value::numeric(4,2)')),
      typed_literal_numeric: match(wire('numeric_send', "'1.235'::numeric(4,2)")),
      bool_condition: 'document::boolean',
      numeric_scale: 'scale(document::numeric) IS NOT DISTINCT FROM expected_scale',
      typed_numeric: 'scale(document::numeric(10,2)) IS NOT DISTINCT FROM expected_scale',
      cast_domain: match(wire('int4send', 'document::document_count')),
      selected: match(wire('int4send', '(CASE WHEN bypass THEN fallback ELSE document END)::int4')),
      coalesced: match(wire('int4send', 'COALESCE(document::int4,fallback::int4)')),
      before_cast_coalesced: match(wire('int4send', 'COALESCE(document,fallback)::int4')),
      extracted: match(wire('int4send', "(document->'value')::int4")),
      element: match(wire('int4send', '(document->0)::int4')),
      runtime_text: `CASE WHEN bypass THEN true ELSE ${match(wire('int4send', 'source_text::jsonb::int4'))} END`,
      literal: `'1.50'::retained_cast_document::int4=2 AND 'null'::jsonb::boolean IS NULL`,
    })
    for (const domain of constrainedDomains) {
      expressions['constrained_' + domain] = `document::${domain} IS NOT NULL`
      expressions['guard_constrained_' + domain] =
        `CASE WHEN bypass THEN true ELSE document::${domain} IS NOT NULL END`
    }
    await pg.exec(
      `CREATE TABLE jsonb_scalar_casts(document retained_cast_document,fallback jsonb,source_text text,decimal_value numeric,integer_value integer,float_value double precision,expected_wire text,expected_null boolean,expected_scale integer,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`,
    )
    const eager: { table: string; sql: string; state: string }[] = []
    for (const target of targets) {
      const table = 'eager_' + target.name,
        sql = `CASE WHEN bypass THEN true ELSE ('"not"'::jsonb)::${target.type} IS NOT NULL END`
      await pg.exec(`CREATE TABLE ${table}(bypass boolean,CONSTRAINT eager CHECK(${sql}))`)
      await expect(pg.query(`INSERT INTO ${table} VALUES(true)`)).rejects.toMatchObject({
        code: '22023',
      })
      eager.push({ table, sql, state: '22023' })
    }
    const overflow = `CASE WHEN bypass THEN true ELSE '2147483647.5'::jsonb::int4=0 END`
    await pg.exec(`CREATE TABLE eager_overflow(bypass boolean,CONSTRAINT eager CHECK(${overflow}))`)
    await expect(pg.query('INSERT INTO eager_overflow VALUES(true)')).rejects.toMatchObject({
      code: '22003',
    })
    eager.push({ table: 'eager_overflow', sql: overflow, state: '22003' })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_scalar_casts')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((c) => c.name === name)!
      return [
        { table, constraint: { ...stored, name: name + '_raw', definition: `CHECK(${sql})` } },
        { table, constraint: { ...stored, name: name + '_stored' } },
      ]
    })
    for (const entry of eager) {
      const owner = catalog.tables.find((t) => t.name === entry.table)!,
        stored = owner.constraints.find((c) => c.name === 'eager')!
      constraints.push(
        {
          table: owner,
          constraint: { ...stored, name: entry.table + '_raw', definition: `CHECK(${entry.sql})` },
        },
        { table: owner, constraint: { ...stored, name: entry.table + '_stored' } },
      )
    }
    for (const target of targets) {
      const cast = builtinCast('pg_catalog.jsonb', target.type)!
      expect(cast).toMatchObject({ method: 'f', context: 'e' })
      expect(builtinMetadata(cast.implementation!)).toMatchObject({
        kind: 'function',
        name: target.name,
        args: ['pg_catalog.jsonb'],
        result: target.type,
        strict: true,
        volatility: 'i',
      })
    }
    const group = prepareCheckRustGroup(
      constraints.map(({ table, constraint }) => ({
        expression: portableCheckAtoms(
          lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        ),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const { table, constraint } of constraints)
      expect(
        hasUncertain(
          portableCheckAtoms(lowerTableCheck(table, constraint, [], catalog.domains)!.expression),
        ),
        constraint.name,
      ).toBe(false)
    for (const modifier of [
      'numeric(0)',
      'numeric(1001)',
      'numeric(4,1001)',
      'numeric(4,-1001)',
      'numeric(4,2,1)',
    ])
      expect(
        bindProbe('document::' + modifier + ' IS NOT NULL', [
          { name: 'document', typeName: 'jsonb' },
        ]).fullyBound,
      ).toBe(false)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.constraint.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const sources = [
      null,
      'null',
      'false',
      'true',
      '""',
      '"1"',
      '"true"',
      '"NaN"',
      '"Infinity"',
      '"雪"',
      '[]',
      '[1]',
      '[null]',
      '[true]',
      '{}',
      '{"n":1}',
      '0',
      '-0.000',
      '0.49',
      '0.5',
      '-0.5',
      '1.4',
      '1.5',
      '1.6',
      '-1.4',
      '-1.5',
      '-1.6',
      '1.2300',
      '1.2300e-5',
      '32767.49',
      '32767.5',
      '-32768.49',
      '-32768.5',
      '2147483647.49',
      '2147483647.5',
      '-2147483648.49',
      '-2147483648.5',
      '9223372036854775807.49',
      '9223372036854775807.5',
      '-9223372036854775808.49',
      '-9223372036854775808.5',
      '9007199254740993',
      '1.000000059604644775390625',
      '1.00000005960464477539062500001',
      '1.00000005960464477539062499999',
      '1.00000000000000011102230246251565404236316680908203125',
      '1.000000000000000111022302462515654042363166809082031250001',
      '3.4028234663852886e38',
      '3.4028235677973366e38',
      '1e39',
      '1e-44',
      '1e-45',
      '1e-46',
      '1.7976931348623157e308',
      '1.7976931348623159e308',
      '5e-324',
      '2.4703282292062327e-324',
      '2.4703282292062328e-324',
      '1e-1000',
      '1e1000',
      '0.0000e1000',
    ]
    for (let i = 0; i < 48; i++)
      sources.push(`${i % 2 ? '-' : ''}${i * 192837}.${(i * 97) % 1000}e${(i % 13) - 6}`)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      oracle: unknown[] = []
    const base: Row = {
      document: known('1.50'),
      fallback: known('2'),
      source_text: known('1.5'),
      decimal_value: known('1.235'),
      integer_value: known(12),
      float_value: known(0x3ff4000000000000n),
      expected_wire: known('00000002'),
      expected_null: known(false),
      expected_scale: known(2),
      bypass: known(false),
    }
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({ name: name + suffix, row, expected })
    }
    for (const source of sources) {
      const normalized = (
        await pg.query<{ value: string | null }>('SELECT $1::jsonb::text value', [source])
      ).rows[0]!.value
      for (const domain of constrainedDomains) {
        let outcome: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean }>(`SELECT $1::jsonb::${domain} IS NOT NULL AS value`, [
              source,
            ])
          ).rows[0]!.value
          outcome = { kind: value ? 'True' : 'False' }
        } catch (e) {
          outcome = error((e as { code: string }).code)
        }
        const row = { ...base, document: known(normalized) }
        add('constrained_' + domain, row, outcome)
        add('guard_constrained_' + domain, row, outcome)
        add('guard_constrained_' + domain, { ...row, bypass: known(true) }, { kind: 'True' })
        if (outcome.kind === 'Error' || outcome.kind === 'False')
          await expect(
            pg.query(`INSERT INTO domain_witness_${domain} VALUES($1::jsonb,false)`, [source]),
          ).rejects.toMatchObject({
            code:
              outcome.kind === 'Error'
                ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                : '23514',
          })
        else
          await pg.query(`INSERT INTO domain_witness_${domain} VALUES($1::jsonb,false)`, [source])
        await pg.query(`INSERT INTO domain_witness_${domain} VALUES($1::jsonb,true)`, [source])
        oracle.push({ input: source, domain, outcome })
      }
      for (const target of targets) {
        let result: { wire: string | null; is_null: boolean } | { state: string }
        try {
          result = (
            await pg.query<{ wire: string | null; is_null: boolean }>(
              `SELECT ${wire(target.send, `value::${target.type}`)} wire,value::${target.type} IS NULL is_null FROM (SELECT $1::jsonb value) q`,
              [source],
            )
          ).rows[0]!
        } catch (e) {
          result = { state: (e as { code: string }).code }
          expect(['22023', '22003']).toContain(result.state)
        }
        const row = {
          ...base,
          document: known(normalized),
          expected_wire: known('wire' in result ? result.wire : null),
          expected_null: known('is_null' in result ? result.is_null : false),
        }
        const expected: Outcome = 'state' in result ? error(result.state) : { kind: 'True' }
        for (const prefix of ['cast_', 'call_', 'domain_', 'null_', 'guard_'])
          add(prefix + target.name, row, expected)
        add('guard_' + target.name, { ...row, bypass: known(true) }, { kind: 'True' })
        if (target.name === 'bool')
          add(
            'bool_condition',
            row,
            'state' in result
              ? error(result.state)
              : result.wire === null
                ? { kind: 'Null' }
                : { kind: source === 'true' ? 'True' : 'False' },
          )
        oracle.push({ input: source, normalized, target: target.type, ...result })
      }
    }
    for (const [index, type] of numericTypes.entries()) {
      for (const source of [
        null,
        'null',
        '1.235',
        '-1.235',
        '12',
        '149.99',
        '150',
        '99999.5',
        '0.000995',
        '0.0009995',
        '1e999',
        '1e-999',
        '"1"',
        'true',
        '[]',
      ]) {
        let expected: Outcome = { kind: 'True' },
          result: string | null = null
        try {
          result = (
            await pg.query<{ wire: string | null }>(
              `SELECT ${wire('numeric_send', '$1::jsonb::' + type)} wire`,
              [source],
            )
          ).rows[0]!.wire
        } catch (e) {
          expected = error((e as { code: string }).code)
        }
        const row = { ...base, document: known(source), expected_wire: known(result) }
        add('modifier_' + index, row, expected)
        add('guard_modifier_' + index, row, expected)
        add('guard_modifier_' + index, { ...row, bypass: known(true) }, { kind: 'True' })
        oracle.push({ input: source, target: type, wire: result, expected })
      }
      add('modifier_' + index, { ...base, document: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(
        'guard_modifier_' + index,
        { ...base, document: error('22012'), bypass: known(true) },
        { kind: 'True' },
      )
    }
    for (const [name, sql] of Object.entries({
      typed_existing_numeric: '1.235::numeric(4,2)',
      typed_existing_integer: '12::int4::numeric(4,2)',
      typed_existing_float: '1.25::float8::numeric(4,2)',
      typed_literal_numeric: "'1.235'::numeric(4,2)",
    })) {
      const result = (await pg.query<{ wire: string }>(`SELECT ${wire('numeric_send', sql)} wire`))
        .rows[0]!.wire
      add(name, { ...base, expected_wire: known(result) }, { kind: 'True' })
    }
    for (const target of targets) {
      for (const value of [{ kind: 'Unknown' } as const, error('22012')]) {
        const expected: Outcome = value.kind === 'Error' ? value : { kind: 'Unknown' }
        for (const prefix of ['cast_', 'call_', 'domain_', 'null_', 'guard_'])
          add(prefix + target.name, { ...base, document: value }, expected)
        add(
          'guard_' + target.name,
          { ...base, document: value, bypass: known(true) },
          { kind: 'True' },
        )
      }
      add('cast_' + target.name, { ...base, document: known('[1,]') }, { kind: 'Unknown' })
    }
    for (const [source, scale] of [
      ['1.2300', 4],
      ['1.2300e-5', 9],
      ['0.0000', 4],
      ['null', null],
    ] as const)
      add(
        'numeric_scale',
        { ...base, document: known(source), expected_scale: known(scale) },
        { kind: 'True' },
      )
    add(
      'typed_numeric',
      { ...base, document: known('1.235'), expected_scale: known(2) },
      { kind: 'True' },
    )
    add('cast_domain', base, { kind: 'True' })
    add('cast_int4', { ...base, expected_wire: known('00000001') }, { kind: 'False' })
    add('literal', base, { kind: 'True' })
    add('selected', { ...base, document: error('22003'), bypass: known(true) }, { kind: 'True' })
    add('selected', { ...base, document: error('22003') }, error('22003'))
    add('coalesced', { ...base, document: known('null') }, { kind: 'True' })
    add(
      'before_cast_coalesced',
      { ...base, document: known('null'), expected_wire: known(null) },
      { kind: 'True' },
    )
    add(
      'coalesced',
      { ...base, document: known('1.5'), fallback: error('22012') },
      { kind: 'True' },
    )
    add('coalesced', { ...base, document: known('null'), fallback: error('22012') }, error('22012'))
    for (const source of [
      '{"value":1.50,"unused":false}',
      '{"value":2,"value":1.5}',
      '{"value":"1"}',
      '{"value":null}',
      '{}',
    ]) {
      try {
        const expected = (
          await pg.query<{ wire: string | null }>(
            `SELECT ${wire('int4send', "($1::jsonb->'value')::int4")} wire`,
            [source],
          )
        ).rows[0]!.wire
        add(
          'extracted',
          { ...base, document: known(source), expected_wire: known(expected) },
          { kind: 'True' },
        )
      } catch (e) {
        add('extracted', { ...base, document: known(source) }, error((e as { code: string }).code))
      }
    }
    for (const source of ['[1.50,99]', '[null]', '["1"]', '[]', '1.50']) {
      try {
        const expected = (
          await pg.query<{ wire: string | null }>(
            `SELECT ${wire('int4send', '($1::jsonb->0)::int4')} wire`,
            [source],
          )
        ).rows[0]!.wire
        add(
          'element',
          { ...base, document: known(source), expected_wire: known(expected) },
          { kind: 'True' },
        )
      } catch (e) {
        add('element', { ...base, document: known(source) }, error((e as { code: string }).code))
      }
    }
    add('runtime_text', base, { kind: 'True' })
    add('runtime_text', { ...base, source_text: known('[1,]') }, error('22P02'))
    add('runtime_text', { ...base, source_text: known('"1"') }, error('22023'))
    add(
      'runtime_text',
      { ...base, source_text: known('[1,]'), bypass: known(true) },
      { kind: 'True' },
    )
    for (const entry of eager)
      for (const bypass of [false, true])
        add(entry.table, { ...base, bypass: known(bypass) }, error(entry.state))
    await mkdir('artifacts/jsonb-casts', { recursive: true })
    await writeFile(
      'artifacts/jsonb-casts/oracle.json',
      JSON.stringify(
        { casts: oracle, checks: constraints.length, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_scalar_casts',
      group,
      constraints.map((c) => c.constraint.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
