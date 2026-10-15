import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

type Sample = { sql: string; known: boolean }
type Target = {
  name: string
  type: string
  send: string
  values: Sample[]
  family: 'alias' | 'geometry' | 'float' | 'bytea' | 'interval' | 'money' | 'enum'
}
const sample = (sql: string, known = true): Sample => ({ sql, known })
const targets: Target[] = [
  {
    name: 'bytea',
    type: 'bytea',
    send: 'byteasend',
    family: 'bytea',
    values: [
      sample('NULL::bytea'),
      sample("'\\x'::bytea", false),
      sample("'\\x00615cff'::bytea", false),
    ],
  },
  {
    name: 'money',
    type: 'money',
    send: 'cash_send',
    family: 'money',
    values: [
      sample('NULL::money'),
      sample('0::numeric::money', false),
      sample('1::numeric::money', false),
      sample('(-123.45)::numeric::money', false),
    ],
  },
  {
    name: 'interval',
    type: 'interval',
    send: 'interval_send',
    family: 'interval',
    values: [
      sample('NULL::interval'),
      sample("'0'::interval", false),
      sample("'P1M2DT3H4M5.123456S'::interval", false),
      sample("'infinity'::interval"),
      sample("'-infinity'::interval"),
    ],
  },
  {
    name: 'point',
    type: 'point',
    send: 'point_send',
    family: 'geometry',
    values: [
      sample('NULL::point'),
      sample("'(0,-0)'::point"),
      sample("'(1,-9)'::point"),
      sample("'(10,0)'::point", false),
      sample("'(NaN,Infinity)'::point"),
      sample("'(-Infinity,NaN)'::point"),
      sample("'(1.2345678901234567,0)'::point", false),
    ],
  },
  {
    name: 'line',
    type: 'line',
    send: 'line_send',
    family: 'geometry',
    values: [
      sample('NULL::line'),
      sample("'{1,0,1}'::line"),
      sample("'{-1,2,-3}'::line"),
      sample("'{NaN,NaN,NaN}'::line"),
      sample("'{Infinity,1,-Infinity}'::line"),
      sample("'{1.2345678901234567,1,0}'::line", false),
    ],
  },
  {
    name: 'lseg',
    type: 'lseg',
    send: 'lseg_send',
    family: 'geometry',
    values: [
      sample('NULL::lseg'),
      sample("'[(0,-0),(1,9)]'::lseg"),
      sample("'[(NaN,Infinity),(-Infinity,0)]'::lseg"),
      sample("'[(1.2345678901234567,0),(0,0)]'::lseg", false),
    ],
  },
  {
    name: 'box',
    type: 'box',
    send: 'box_send',
    family: 'geometry',
    values: [
      sample('NULL::box'),
      sample("'(1,2),(-3,-4)'::box"),
      sample("'(NaN,Infinity),(-Infinity,0)'::box"),
      sample("'(1.2345678901234567,1),(0,0)'::box", false),
    ],
  },
  {
    name: 'circle',
    type: 'circle',
    send: 'circle_send',
    family: 'geometry',
    values: [
      sample('NULL::circle'),
      sample("'<(0,-0),0>'::circle"),
      sample("'<(1,2),3>'::circle"),
      sample("'<(NaN,NaN),NaN>'::circle"),
      sample("'<(Infinity,-Infinity),Infinity>'::circle"),
      sample('circle(point(1,2),-2::float8)'),
      sample("'<(0,0),1.2345678901234567>'::circle", false),
    ],
  },
  {
    name: 'path',
    type: 'path',
    send: 'path_send',
    family: 'geometry',
    values: [
      sample('NULL::path'),
      sample("'[(-0,0),(1,2)]'::path"),
      sample("'((NaN,Infinity),(-Infinity,0))'::path"),
      sample("'[(-9,9)]'::path"),
      sample("'[(1.2345678901234567,0)]'::path", false),
    ],
  },
  {
    name: 'polygon',
    type: 'polygon',
    send: 'poly_send',
    family: 'geometry',
    values: [
      sample('NULL::polygon'),
      sample("'((0,0),(1,0),(0,1))'::polygon"),
      sample("'((NaN,Infinity),(-Infinity,NaN))'::polygon"),
      sample("'((1.2345678901234567,0),(0,1))'::polygon", false),
    ],
  },
]
for (const type of ['float4', 'float8'])
  targets.push({
    name: type,
    type,
    send: type === 'float4' ? 'float4send' : 'float8send',
    family: 'float',
    values: [
      sample('NULL::' + type),
      ...Array.from({ length: 19 }, (_, i) => sample(`${i - 9}::${type}`)),
      ...['-0', 'NaN', 'Infinity', '-Infinity'].map((v) => sample(`'${v}'::${type}`)),
      sample(`1.2345678901234567::${type}`, false),
      sample(`1.5::${type}`, false),
    ],
  })
const aliases: Record<string, string> = {
  regclass: "'catalog_target'::regclass::oid",
  regcollation: '\'"C"\'::regcollation::oid',
  regconfig: "'simple'::regconfig::oid",
  regdictionary: "'simple'::regdictionary::oid",
  regnamespace: "'public'::regnamespace::oid",
  regoper:
    "(SELECT oid FROM pg_operator WHERE oprname='=' AND oprleft='bool'::regtype AND oprright='bool'::regtype)",
  regoperator: "'pg_catalog.+(integer,integer)'::regoperator::oid",
  regproc: "'int4eq'::regproc::oid",
  regprocedure: "'int4eq(integer,integer)'::regprocedure::oid",
  regrole: 'CURRENT_USER::regrole::oid',
  regtype: "'integer'::regtype::oid",
}
for (const [type, sql] of Object.entries(aliases))
  targets.push({
    name: type,
    type,
    send: 'oidsend',
    family: 'alias',
    values: [
      sample('NULL::' + type),
      sample(`0::oid::${type}`),
      sample(`(${sql})::${type}`, false),
    ],
  })
targets.push({
  name: 'enum',
  type: 'context_enum',
  send: 'enum_send',
  family: 'enum',
  values: [
    sample('NULL::context_enum'),
    sample("'one'::context_enum", false),
    sample("'two'::context_enum", false),
  ],
})
const decode = (
  target: Target,
  wire: string | null,
): Extract<Input, { kind: 'Value' }>['value'] | null => {
  if (wire === null) return null
  const b = Buffer.from(wire, 'hex'),
    f = (i: number) => b.readBigInt64BE(i * 8)
  if (target.family === 'enum') return b.toString('utf8') === 'one' ? 0 : 1
  if (target.family === 'alias') return BigInt(b.readUInt32BE())
  if (target.family === 'bytea') return wire
  if (target.family === 'interval')
    return { time: f(0), days: b.readInt32BE(8), months: b.readInt32BE(12) }
  if (target.name === 'float4') return b.readInt32BE()
  if (target.name === 'float8' || target.name === 'money') return f(0)
  if (target.name === 'point') return { x: f(0), y: f(1) }
  if (target.name === 'line') return { a: f(0), b: f(1), c: f(2) }
  if (target.name === 'lseg') return { x1: f(0), y1: f(1), x2: f(2), y2: f(3) }
  if (target.name === 'box') return { highX: f(0), highY: f(1), lowX: f(2), lowY: f(3) }
  if (target.name === 'circle') return { x: f(0), y: f(1), radius: f(2) }
  const path = target.name === 'path',
    count = b.readInt32BE(path ? 1 : 0),
    offset = path ? 5 : 4
  const points = Array.from({ length: count }, (_, i) => ({
    x: b.readBigInt64BE(offset + i * 16),
    y: b.readBigInt64BE(offset + i * 16 + 8),
  }))
  return path ? { closed: b[0] === 1, points } : { points }
}

it('matches deterministic and catalog/session-bound to_jsonb conversions, strict states and invariant geometric output in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-context-'))
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    await pg.exec(`CREATE TABLE catalog_target(id int);SET lc_monetary='C';
    CREATE TYPE context_enum AS ENUM('one','two');
    CREATE FUNCTION context_enum_json(context_enum) RETURNS json LANGUAGE SQL IMMUTABLE AS $$ SELECT '"custom"'::json $$;
    CREATE CAST(context_enum AS json) WITH FUNCTION context_enum_json(context_enum)`)
    const expressions: Record<string, string> = {}
    for (const target of targets) {
      expressions['converted_' + target.name] =
        `to_jsonb(v_${target.name}) IS NOT DISTINCT FROM expected`
      expressions['guarded_' + target.name] =
        `CASE WHEN bypass THEN true ELSE to_jsonb(v_${target.name}) IS NOT DISTINCT FROM expected END`
      expressions['null_' + target.name] =
        `(to_jsonb(v_${target.name}) IS NULL) IS NOT DISTINCT FROM expected_null`
      expressions['coalesced_' + target.name] =
        `COALESCE(to_jsonb(v_${target.name}),'null'::jsonb) IS NOT DISTINCT FROM expected_coalesced`
    }
    expressions.computed_nan = `to_jsonb(point('NaN'::float8,v_float8)) IS NOT DISTINCT FROM expected`
    await pg.exec(
      `CREATE TABLE jsonb_context_conversion(${targets.map((t) => `v_${t.name} ${t.type}`).join(',')},expected jsonb,expected_coalesced jsonb,expected_null bool,bypass bool,${Object.entries(
        expressions,
      )
        .map(([n, s]) => `CONSTRAINT ${n} CHECK(${s})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_context_conversion')!
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      seen = new Set<string>(),
      oracle: unknown[] = []
    const add = (name: string, row: Row, outcome: Outcome) => {
      const full = {
        ...Object.fromEntries(targets.map((t) => ['v_' + t.name, known(null)])),
        expected: known(null),
        expected_coalesced: known('null'),
        expected_null: known(false),
        bypass: known(false),
        ...row,
      }
      for (const suffix of ['_raw', '_stored']) {
        const fixture = { name: name + suffix, row: full, expected: outcome }
        const key = JSON.stringify(fixture, (_, v) =>
          typeof v === 'bigint' ? { bits: String(v) } : v,
        )
        if (!seen.has(key)) {
          seen.add(key)
          fixtures.push(fixture)
        }
      }
    }
    const outputSets = new Map<
      string,
      { known: boolean; values: Set<string | null>; family: string }
    >()
    for (const target of targets) {
      const settings =
        target.family === 'geometry' || target.family === 'float'
          ? Array.from({ length: 19 }, (_, i) => ({
              float: i - 15,
              bytea: 'hex',
              interval: 'postgres',
            }))
          : target.family === 'bytea'
            ? ['hex', 'escape'].map((bytea) => ({ float: 1, bytea, interval: 'postgres' }))
            : target.family === 'interval'
              ? ['postgres', 'postgres_verbose', 'sql_standard', 'iso_8601'].map((interval) => ({
                  float: 1,
                  bytea: 'hex',
                  interval,
                }))
              : [{ float: 1, bytea: 'hex', interval: 'postgres' }]
      for (const setting of settings) {
        await pg.exec(
          `SET extra_float_digits=${setting.float};SET bytea_output='${setting.bytea}';SET IntervalStyle='${setting.interval}'`,
        )
        for (const value of target.values) {
          const result = (
            await pg.query<{ output: string | null; wire: string | null }>(
              `SELECT to_jsonb(${value.sql})::text output,encode(${target.send}(${value.sql}${target.family === 'alias' ? '::oid' : ''}),'hex') wire`,
            )
          ).rows[0]!
          const payload = decode(target, result.wire),
            outcome: Outcome = { kind: value.known ? 'True' : 'Unknown' }
          const row: Row = {
            ['v_' + target.name]: known(payload),
            expected: known(result.output),
            expected_coalesced: known(result.output ?? 'null'),
            expected_null: known(result.wire === null),
          }
          for (const prefix of ['converted_', 'guarded_', 'null_', 'coalesced_'])
            add(prefix + target.name, row, outcome)
          add('guarded_' + target.name, { ...row, bypass: known(true) }, { kind: 'True' })
          if (value.known)
            add(
              'converted_' + target.name,
              { ...row, expected: known('["wrong"]') },
              { kind: 'False' },
            )
          const key = target.name + '/' + value.sql,
            entry = outputSets.get(key) ?? {
              known: value.known,
              values: new Set(),
              family: target.family,
            }
          entry.values.add(result.output)
          outputSets.set(key, entry)
          oracle.push({
            target: target.name,
            sql: value.sql,
            setting,
            ...result,
            known: value.known,
          })
        }
      }
      for (const input of [{ kind: 'Unknown' } as const, error('22003')]) {
        for (const prefix of ['converted_', 'guarded_', 'null_', 'coalesced_'])
          add(prefix + target.name, { ['v_' + target.name]: input }, input)
        add(
          'guarded_' + target.name,
          { ['v_' + target.name]: input, bypass: known(true) },
          { kind: 'True' },
        )
      }
    }
    for (const [name, entry] of outputSets) {
      if (entry.known) expect(entry.values.size, name).toBe(1)
      else if (!['alias', 'money', 'enum'].includes(entry.family))
        expect(entry.values.size, name).toBeGreaterThan(1)
    }
    const oid = (await pg.query<{ value: number }>("SELECT 'catalog_target'::regclass::oid value"))
      .rows[0]!.value
    const before = (
      await pg.query<{ value: string }>('SELECT to_jsonb($1::regclass)::text value', [oid])
    ).rows[0]!.value
    await pg.exec('ALTER TABLE catalog_target RENAME TO renamed_catalog_target')
    const after = (
      await pg.query<{ value: string }>('SELECT to_jsonb($1::regclass)::text value', [oid])
    ).rows[0]!.value
    expect(after).not.toBe(before)
    for (const expected of [before, after])
      add(
        'converted_regclass',
        { v_regclass: known(BigInt(oid)), expected: known(expected) },
        { kind: 'Unknown' },
      )
    for (const source of ['0', '1', '-9']) {
      const result = (
        await pg.query<{ output: string; wire: string }>(
          `SELECT to_jsonb(point('NaN'::float8,$1::float8))::text output,encode(float8send($1::float8),'hex') wire`,
          [source],
        )
      ).rows[0]!
      add(
        'computed_nan',
        {
          v_float8: known(Buffer.from(result.wire, 'hex').readBigInt64BE()),
          expected: known(result.output),
        },
        { kind: 'True' },
      )
    }
    await mkdir('artifacts/jsonb-context-conversion', { recursive: true })
    await writeFile(
      'artifacts/jsonb-context-conversion/oracle.json',
      JSON.stringify(
        {
          cases: oracle,
          catalogRename: { oid, before, after },
          checks: constraints.length,
          fixtures: fixtures.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonb_context_conversion',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
