import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const packet = 'artifacts/goal-checks/nullable-quote-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const full: CheckExecutionContext = {
  defaultCollation: 'C',
  serverEncoding: 'UTF8',
  dateStyle: { format: 'ISO', order: 'MDY' },
  timeZone: 'UTC',
  intervalStyle: 'postgres',
  byteaOutput: 'hex',
  moneyLocale: 'C',
  extraFloatDigits: 1,
  arrayNulls: true,
}
const profiles: {
  type: string
  value: string
  context?: boolean
  catalog?: boolean
  castText?: boolean
}[] = [
  { type: 'text', value: "E'a''b\\\\c é😊'" },
  { type: 'char(4)', value: "'x'" },
  { type: 'varchar(4)', value: "'x'" },
  { type: 'name', value: "'select'" },
  { type: '"char"', value: "'x'", castText: true },
  { type: 'refcursor', value: "'cursor'" },
  { type: 'smallint', value: '-123' },
  { type: 'integer', value: '-123' },
  { type: 'bigint', value: '-123' },
  { type: 'numeric', value: '123.4500' },
  { type: 'boolean', value: 'true' },
  { type: 'float4', value: '1.23456789', context: true },
  { type: 'float8', value: '1.234567891234567', context: true },
  { type: 'date', value: "'2000-01-02'", context: true },
  { type: 'timestamp', value: "'2000-01-02 03:04:05'", context: true },
  { type: 'timestamptz', value: "'2000-01-02 03:04:05+00'", context: true },
  { type: 'time', value: "'12:34:56.123'" },
  { type: 'timetz', value: "'12:34:56+04'" },
  { type: 'interval', value: "'1 day 2 hours'", context: true },
  { type: 'money', value: "'12.34'", context: true },
  { type: 'bytea', value: "'\\x0102'", context: true },
  { type: 'uuid', value: "'00000000-0000-0000-0000-000000000001'" },
  { type: 'inet', value: "'127.0.0.1'" },
  { type: 'cidr', value: "'127.0.0.0/8'" },
  { type: 'macaddr', value: "'00:11:22:33:44:55'" },
  { type: 'macaddr8', value: "'00:11:22:33:44:55:66:77'" },
  { type: 'bit(2)', value: "B'10'" },
  { type: 'varbit', value: "B'10'" },
  { type: 'point', value: "'(1.234567891234567,2)'", context: true },
  { type: 'line', value: "'{1.234567891234567,2,3}'", context: true },
  { type: 'lseg', value: "'[(1.234567891234567,2),(3,4)]'", context: true },
  { type: 'box', value: "'((1.234567891234567,2),(3,4))'", context: true },
  { type: 'path', value: "'[(1.234567891234567,2),(3,4)]'", context: true },
  { type: 'polygon', value: "'((1.234567891234567,2),(3,4),(5,6))'", context: true },
  { type: 'circle', value: "'<(1.234567891234567,2),3>'", context: true },
  { type: 'json', value: '\'{ "a": 1, "a": null }\'' },
  { type: 'jsonb', value: '\'{"a": 1.00}\'' },
  { type: 'jsonpath', value: "'(-$.a).abs()'" },
  { type: 'xml', value: '\'<item a="value"/>\'' },
  { type: 'tsvector', value: "'lexeme:1A'" },
  { type: 'tsquery', value: "'lexeme & other'" },
  { type: 'oid', value: "'4294967295'" },
  { type: 'xid', value: "'4294967295'" },
  { type: 'cid', value: "'4294967295'" },
  { type: 'xid8', value: "'18446744073709551615'" },
  { type: 'pg_lsn', value: "'FFFFFFFF/FFFFFFFF'" },
  { type: 'tid', value: "'(1,2)'" },
  { type: 'pg_snapshot', value: "'1:3:2'" },
  { type: 'txid_snapshot', value: "'1:3:2'" },
  { type: 'int2vector', value: "'1 2'" },
  { type: 'oidvector', value: "'1 2'" },
  { type: 'int4range', value: "'[1,4)'" },
  { type: 'int4multirange', value: "'{[1,4)}'" },
  { type: 'quote_label', value: "'ready'" },
  { type: 'quote_positive', value: '1' },
  { type: 'quote_pair', value: 'ROW(NULL,NULL)' },
  { type: 'record', value: "ROW(1,'x'::text)" },
  { type: 'quote_label[]', value: "ARRAY['ready'::quote_label,NULL]" },
  { type: 'quote_positive[]', value: 'ARRAY[1::quote_positive,NULL]' },
  { type: 'quote_pair[]', value: 'ARRAY[ROW(NULL,NULL)::quote_pair,NULL]' },
  { type: 'integer[]', value: 'ARRAY[1,NULL,2]' },
  {
    type: 'quote_data',
    value: "ROW(1.234567891234567::float8,'2000-01-02'::date,'\\x0102'::bytea)",
    context: true,
  },
  { type: 'aclitem', value: "'=r/postgres'", catalog: true },
]

it('retains native ambiguity for internal char and accepts an explicit text conversion', async () => {
  const pg = await PGlite.create()
  try {
    await expect(pg.query(`SELECT quote_nullable('x'::"char")`)).rejects.toMatchObject({
      code: '42725',
    })
    expect(
      (await pg.query<{ value: string }>(`SELECT quote_nullable(('x'::"char")::text) value`))
        .rows[0]!.value,
    ).toBe("'x'")
    const lowered = lowerTableCheck(
      { columns: [{ name: 'value', typeName: 'pg_catalog."char"' }] },
      { name: 'ambiguous', type: 'check', definition: 'CHECK(quote_nullable(value) IS NOT NULL)' },
      [],
      [],
      'source',
    )!
    expect(hasUncertain(lowered.expression), JSON.stringify(lowered.expression)).toBe(true)
    await pg.exec(
      'CREATE TABLE quote_name_admission(value name,CHECK(quote_nullable(value) IS NOT NULL))',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'quote_name_admission')!
    const native = lowerTableCheck(
      table,
      table.constraints[0]!,
      catalog.enums,
      catalog.domains,
      'stored',
      catalog.rangeTypes,
      catalog.compositeTypeGraph,
    )!
    const source = lowerTableCheck(
      { columns: [{ name: 'value', typeName: 'pg_catalog.name' }] },
      { name: 'preferred', type: 'check', definition: 'CHECK(quote_nullable(value) IS NOT NULL)' },
      [],
      [],
      'source',
    )!
    const signature = 'function:["pg_catalog","quote_nullable"](pg_catalog.text)'
    expect(JSON.stringify(native.expression)).toContain(JSON.stringify(signature).slice(1, -1))
    expect(JSON.stringify(source.expression)).toContain(JSON.stringify(signature).slice(1, -1))
  } finally {
    await pg.close()
  }
})

it('quotes selected scalar and recursive text casts with NULL, owned values and explicit output settings', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nullable-quote-'))
  try {
    await pg.exec(
      "SET lc_monetary='C';SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='postgres';SET bytea_output='hex';SET extra_float_digits=1;CREATE TYPE quote_label AS ENUM ('ready','done');CREATE DOMAIN quote_positive AS int CHECK(VALUE>0);CREATE TYPE quote_pair AS (score int,label text);CREATE TYPE quote_data AS (quantity float8,day date,data bytea);",
    )
    const forms = profiles.map((profile, index) => ({
      ...profile,
      name: 'quote_' + index,
      output: `quote_nullable((CASE WHEN use_value THEN (${profile.value})::${profile.type} ELSE NULL::${profile.type} END)${profile.castText ? '::text' : ''})`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(use_value bool,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression,
        })
      }
    const group = prepareCheckRustGroup(plans, full)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      for (const useValue of [true, false, null]) {
        const expected = (
          await pg.query<{ value: string }>(
            `SELECT ${form.output} value FROM (SELECT $1::bool use_value) args`,
            [useValue],
          )
        ).rows[0]!.value
        for (const wanted of [expected, 'wrong', null]) {
          const valid = wanted === expected,
            insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,false)`, [useValue, wanted])
          if (valid) await insert
          else await expect(insert).rejects.toMatchObject({ code: '23514' })
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.name + '_' + origin,
              row: { use_value: known(useValue), expected: known(wanted), bypass: known(false) },
              expected:
                form.catalog && useValue === true
                  ? { kind: 'Unknown' }
                  : { kind: valid ? 'True' : 'False' },
            })
        }
        observations.push({ form: form.name, type: form.type, useValue, expected })
      }
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            use_value: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          forms: forms.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'nullable_quote', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('retains reached output requirements while quoting NULL and skipping errors without settings', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nullable-quote-context-'))
  try {
    await pg.exec('CREATE TYPE quote_data AS (quantity float8,day date,data bytea);')
    const forms = profiles
      .filter((p) => p.context)
      .map((p, i) => ({
        ...p,
        name: 'context_' + i,
        output: `quote_nullable(CASE WHEN use_value THEN (${p.value})::${p.type} ELSE NULL::${p.type} END)`,
      }))
    forms.push({
      type: 'integer',
      value: '0',
      context: false,
      name: 'context_error',
      output: 'quote_nullable(1/denominator)',
    })
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(use_value bool,expected text,bypass bool,denominator int,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const add = (row: Row, expected: Outcome) =>
          fixtures.push({ name: form.name + '_' + origin, row, expected })
        const base: Row = {
          use_value: known(false),
          expected: known('NULL'),
          bypass: known(false),
          denominator: known(1),
        }
        if (form.context) {
          add(base, { kind: 'True' })
          add({ ...base, use_value: known(true), expected: known('anything') }, { kind: 'Unknown' })
          add({ ...base, use_value: { kind: 'Unknown' } }, { kind: 'Unknown' })
        } else {
          add(
            { ...base, denominator: known(0) },
            { kind: 'Error', value: { state: parseInt('22012', 36) } },
          )
          add({ ...base, denominator: known(null) }, { kind: 'True' })
        }
        add(
          {
            ...base,
            denominator: known(0),
            use_value: known(true),
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          { kind: 'True' },
        )
      }
    await runCheckParity(root, 'nullable_quote_context', group, names, fixtures)
    await writeFile(
      packet + '/context-summary.json',
      JSON.stringify(
        { checks: names.length, fixtures: fixtures.length, targets: ['Rust', 'Go', 'TypeScript'] },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('captures custom text-cast choices and preserves strict NULLs, unavailable bodies and historical changes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-nullable-quote-casts-'))
  try {
    await pg.exec(`CREATE TYPE quote_plain AS ENUM ('ready');CREATE TYPE quote_strict AS ENUM ('ready');CREATE TYPE quote_called AS ENUM ('ready');CREATE TYPE quote_record AS (score int);CREATE DOMAIN quote_domain AS quote_called;
      CREATE FUNCTION strict_quote_text(quote_strict) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS 'SELECT ''strict-cast''::text';
      CREATE CAST (quote_strict AS text) WITH FUNCTION strict_quote_text(quote_strict);
      CREATE FUNCTION called_quote_text(quote_called) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT CASE WHEN $1 IS NULL THEN ''null-cast'' ELSE ''value-cast'' END';
      CREATE CAST (quote_called AS text) WITH FUNCTION called_quote_text(quote_called);
      CREATE FUNCTION record_quote_text(quote_record) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT ''record-cast''::text';
      CREATE CAST (quote_record AS text) WITH FUNCTION record_quote_text(quote_record);
      CREATE FUNCTION array_quote_text(quote_plain[]) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT ''array-cast''::text';
      CREATE CAST (quote_plain[] AS text) WITH FUNCTION array_quote_text(quote_plain[]);`)
    const forms = [
      { name: 'plain', type: 'quote_plain', value: "'ready'", custom: false, strict: true },
      { name: 'strict', type: 'quote_strict', value: "'ready'", custom: true, strict: true },
      { name: 'called', type: 'quote_called', value: "'ready'", custom: true, strict: false },
      { name: 'domain', type: 'quote_domain', value: "'ready'", custom: true, strict: false },
      { name: 'record', type: 'quote_record', value: 'ROW(NULL)', custom: true, strict: false },
      {
        name: 'array',
        type: 'quote_plain[]',
        value: "ARRAY['ready'::quote_plain,NULL]",
        custom: true,
        strict: false,
      },
    ]
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE custom_${form.name}(use_value bool,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE quote_nullable(CASE WHEN use_value THEN (${form.value})::${form.type} ELSE NULL::${form.type} END) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const before = await snapshotCatalog(pg)
    const beforeValues = new Map<string, string>()
    for (const form of forms)
      for (const useValue of [true, false])
        beforeValues.set(
          form.name + '_' + useValue,
          (
            await pg.query<{ value: string }>(
              `SELECT quote_nullable(CASE WHEN $1 THEN (${form.value})::${form.type} ELSE NULL::${form.type} END) value`,
              [useValue],
            )
          ).rows[0]!.value,
        )
    await pg.exec(
      "CREATE FUNCTION later_quote_text(quote_plain) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT ''later-cast''::text';CREATE CAST (quote_plain AS text) WITH FUNCTION later_quote_text(quote_plain);",
    )
    const after = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      names: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    expect(
      before.compositeTypeGraph!.definitions.find((d) => d.name === 'quote_plain')!.textCast,
    ).toBeNull()
    expect(
      after.compositeTypeGraph!.definitions.find((d) => d.name === 'quote_plain')!.textCast
        ?.function,
    ).toContain('later_quote_text')
    for (const [version, catalog] of [
      ['before', before],
      ['after', after],
    ] as const)
      for (const form of forms)
        for (const origin of ['source', 'stored'] as const) {
          const table = catalog.tables.find((t) => t.name === 'custom_' + form.name)!,
            name = version + '_' + form.name + '_' + origin
          const lowered = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!
          names.push(name)
          plans.push({
            identity: {
              schema: 'public',
              kind: 'table',
              owner: 'custom_' + form.name,
              constraint: name,
            },
            expression: portableCheckAtoms(lowered.expression),
          })
          const custom = form.custom || (version === 'after' && form.name === 'plain')
          const strict = form.strict && !(version === 'after' && form.name === 'plain')
          for (const useValue of [true, false]) {
            const expected =
              version === 'after'
                ? (
                    await pg.query<{ value: string }>(
                      `SELECT quote_nullable(CASE WHEN $1 THEN (${form.value})::${form.type} ELSE NULL::${form.type} END) value`,
                      [useValue],
                    )
                  ).rows[0]!.value
                : beforeValues.get(form.name + '_' + useValue)!
            fixtures.push({
              name,
              row: { use_value: known(useValue), expected: known(expected), bypass: known(false) },
              expected: custom && (!strict || useValue) ? { kind: 'Unknown' } : { kind: 'True' },
            })
            observations.push({
              name,
              useValue,
              native: version === 'after' ? expected : null,
              expected: fixtures.at(-1)!.expected,
            })
          }
          fixtures.push({
            name,
            row: {
              use_value: { kind: 'Unknown' },
              expected: { kind: 'Unknown' },
              bypass: known(true),
            },
            expected: { kind: 'True' },
          })
        }
    const group = prepareCheckRustGroup(plans)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    await runCheckParity(root, 'nullable_quote_casts', group, names, fixtures)
    await writeFile(
      packet + '/casts-summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)
