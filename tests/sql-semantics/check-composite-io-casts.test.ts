import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readCompositeFixture, readCompositeArrayFixture } from './check-composite-fixtures.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('executes captured composite I/O casts through shared record converters, recursive values, domains and arrays', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-io-casts-')),
    artifact = 'artifacts/goal-checks/composite-io-casts-active'
  try {
    await pg.exec(`CREATE TYPE source_value AS(code text,obsolete int4,label text);ALTER TYPE source_value DROP ATTRIBUTE obsolete;
      CREATE TYPE target_value AS(n int4,obsolete int4,label varchar(2));ALTER TYPE target_value DROP ATTRIBUTE obsolete;
      CREATE CAST(source_value AS target_value) WITH INOUT AS IMPLICIT;
      CREATE DOMAIN source_domain AS source_value;CREATE DOMAIN target_domain AS target_value CHECK((VALUE).n>=0);
      CREATE DOMAIN parsed_source AS source_value CHECK((VALUE::target_value).n>=0);
      CREATE DOMAIN nonnull_target AS target_value NOT NULL;CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
      CREATE TYPE approved_value AS(n positive,label varchar(2));CREATE CAST(source_value AS approved_value) WITH INOUT;
      CREATE DOMAIN target_batch AS target_value[] CHECK(cardinality(VALUE)<=2);
      CREATE TYPE phase AS ENUM('z','a');
      CREATE TYPE source_nested AS(entry text,labels text,span text);
      CREATE TYPE target_nested AS(entry target_value,labels phase[],span int4range);
      CREATE CAST(source_nested AS target_nested) WITH INOUT;`)
    const forms: Record<string, { sql: string; eager?: boolean }> = {
        field: { sql: '(s::target_value).n>=1' },
        nullness: { sql: '(s::target_value) IS NULL' },
        present: { sql: '(s::target_value) IS NOT NULL' },
        datum: { sql: '(s::target_value) IS DISTINCT FROM NULL' },
        output: {
          sql: '(s::target_value)::text IS NOT DISTINCT FROM (s::text::target_value)::text',
        },
        json: {
          sql: "to_jsonb(s::target_value)->>'n' IS NOT DISTINCT FROM (s::target_value).n::text",
        },
        selected: { sql: '(CASE WHEN pick THEN s ELSE t END).n>=1' },
        reversed: { sql: '(CASE WHEN pick THEN t ELSE s END).n>=1' },
        coalesce: { sql: '(COALESCE(s,t)).n>=1' },
        greatest: { sql: '(GREATEST(s,t)).n>=1' },
        least: { sql: '(LEAST(s,t)).n>=1' },
        constructor: { sql: '(ARRAY[s,t])[1] IS NOT DISTINCT FROM s::target_value' },
        explicit_constructor: {
          sql: '(ARRAY[s]::target_value[])[1] IS NOT DISTINCT FROM s::target_value',
        },
        array_cast: { sql: 'cardinality(ss::target_value[]) IS NOT DISTINCT FROM cardinality(ss)' },
        array_common: { sql: 'cardinality(COALESCE(ss,ts))>=0' },
        nested_arrays: { sql: 'cardinality(ARRAY[ss,ts])>=0' },
        append: { sql: 'cardinality(array_append(ts,s))=COALESCE(cardinality(ts),0)+1' },
        prepend: { sql: '(array_prepend(s,ts))[1] IS NOT DISTINCT FROM s::target_value' },
        find: { sql: 'array_position(ARRAY[s::target_value,t],s)=1' },
        remove: { sql: 'cardinality(array_remove(ARRAY[s::target_value],s))=0' },
        replace: { sql: '(array_replace(ARRAY[s::target_value],s,t))[1] IS NOT DISTINCT FROM t' },
        concat: { sql: 'cardinality(ts||s)=COALESCE(cardinality(ts),0)+1' },
        source_domain: { sql: '(s::source_domain::target_value).n>=1' },
        parsed_domain: { sql: '(s::parsed_source::target_value).n>=1' },
        target_domain: { sql: '(s::target_domain).n>=1' },
        not_null: { sql: '(s::nonnull_target).n>=1' },
        field_domain: { sql: '(s::approved_value).n>=1' },
        element_domain: { sql: 'cardinality(ss::target_domain[])>=0' },
        array_domain: { sql: 'cardinality(ss::target_batch)>=0' },
        nested_field: { sql: '((nested::target_nested).entry).n>=1' },
        nested_enum: { sql: "(nested::target_nested).labels[1]='z'::phase" },
        nested_range: { sql: 'lower((nested::target_nested).span)>=0' },
        delayed: { sql: "(ROW('bad','ok')::source_value::target_value).n>=1" },
        prepared: { sql: "(ROW((1/0)::text,'ok')::source_value::target_value).n>=1", eager: true },
        pruned: {
          sql: "CASE WHEN true THEN true ELSE (ROW((1/0)::text,'ok')::source_value::target_value).n>=1 END",
        },
      },
      columns =
        's source_value,t target_value,ss source_value[],ts target_value[],nested source_nested,pick bool,bypass bool'
    for (const [name, f] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END))`,
      )
    await pg.exec(`CREATE TABLE oracle(${columns})`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, f]) => {
        const t = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = t.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            t,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END)` : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(false)
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const type = (name: string) => {
        const c = group.checks.find(
          (c) => c.kind === 'supported' && c.inputs.some((i) => i.name === name),
        )!
        if (c.kind !== 'supported') throw Error('Missing input ' + name)
        return c.inputs.find((i) => i.name === name)!.type
      },
      known = (value: boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        {
          s: 'NULL::source_value',
          t: 'NULL::target_value',
          ss: 'NULL::source_value[]',
          ts: 'NULL::target_value[]',
          nested: 'NULL::source_nested',
          pick: true,
        },
        {
          s: 'ROW(NULL,NULL)::source_value',
          t: "ROW(2,'ok')::target_value",
          ss: 'ARRAY[]::source_value[]',
          ts: 'ARRAY[]::target_value[]',
          nested: 'ROW(NULL,NULL,NULL)::source_nested',
          pick: false,
        },
        {
          s: "ROW('3','😊😊')::source_value",
          t: "ROW(4,'ok')::target_value",
          ss: '\'[0:0]={"(3,ok)"}\'::source_value[]',
          ts: "ARRAY[ROW(4,'ok')::target_value]",
          nested: "ROW('(3,ok)','{z,a}','[1,4)')::source_nested",
          pick: true,
        },
        {
          s: "ROW('-1','ok')::source_value",
          t: "ROW(-2,'no')::target_value",
          ss: "ARRAY[ROW('-1','ok')::source_value]",
          ts: "ARRAY[ROW(-2,'no')::target_value]",
          nested: "ROW('(-1,ok)','{a}','[-2,0)')::source_nested",
          pick: false,
        },
        {
          s: "ROW('bad','abc')::source_value",
          t: "ROW(4,'ok')::target_value",
          ss: "ARRAY[ROW('bad','abc')::source_value]",
          ts: "ARRAY[ROW(4,'ok')::target_value]",
          nested: "ROW('(bad,ok)','{missing}','bad')::source_nested",
          pick: false,
        },
        {
          s: "ROW('3','abc')::source_value",
          t: "ROW(4,'ok')::target_value",
          ss: "ARRAY[NULL::source_value,ROW('3','abc')::source_value]",
          ts: "ARRAY[ROW(4,'ok')::target_value]",
          nested: "ROW('(3,abc)','{z}','[1,4)')::source_nested",
          pick: true,
        },
      ]
    for (const s of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(
        `INSERT INTO oracle SELECT ${s.s},${s.t},${s.ss},${s.ts},${s.nested},$1,false`,
        [s.pick],
      )
      const source = await readCompositeFixture(pg, 'SELECT s FROM oracle', 's', type('s')),
        target = await readCompositeFixture(pg, 'SELECT t FROM oracle', 't', type('t')),
        nested = await readCompositeFixture(
          pg,
          'SELECT nested FROM oracle',
          'nested',
          type('nested'),
        ),
        ss = await readCompositeArrayFixture(
          pg,
          'SELECT ss FROM oracle',
          'ss',
          type('ss').slice(6),
        ),
        ts = await readCompositeArrayFixture(
          pg,
          'SELECT ts FROM oracle',
          'ts',
          type('ts').slice(6),
        ),
        row: Row = {
          s: source ? { kind: 'Value', value: source } : known(null),
          t: target ? { kind: 'Value', value: target } : known(null),
          nested: nested ? { kind: 'Value', value: nested } : known(null),
          ss: ss ? { kind: 'Value', value: ss } : known(null),
          ts: ts ? { kind: 'Value', value: ts } : known(null),
          pick: known(s.pick),
        }
      for (const [name, f] of Object.entries(forms)) {
        let value: boolean | null = null,
          error: string | undefined
        try {
          value = (
            await pg.query<{ value: boolean | null }>('SELECT ' + f.sql + ' AS value FROM oracle')
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const bypass of [false, true]) {
          const expected: Outcome =
              (error && f.eager) || (!bypass && error)
                ? { kind: 'Error', value: { state: parseInt(error!, 36) } }
                : bypass
                  ? { kind: 'True' }
                  : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            code =
              expected.kind === 'Error' ? error : expected.kind === 'False' ? '23514' : undefined,
            insert = pg.query(
              `INSERT INTO gate_${name} SELECT s,t,ss,ts,nested,pick,$1 FROM oracle`,
              [bypass],
            )
          if (code) await expect(insert, name).rejects.toMatchObject({ code })
          else await insert
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, bypass: known(bypass) },
              expected,
            })
          reference.push({ name, sample: s, bypass, expected })
        }
      }
      if (source && s.s.includes("'3','😊😊'")) {
        const missing = structuredClone(source),
          failed = structuredClone(source)
        missing.fields[0] = { kind: 'Unknown' }
        failed.fields[0] = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        for (const origin of ['source', 'stored']) {
          fixtures.push({
            name: 'field_' + origin,
            row: { ...row, s: { kind: 'Value', value: missing }, bypass: known(false) },
            expected: { kind: 'Unknown' },
          })
          fixtures.push({
            name: 'field_' + origin,
            row: { ...row, s: { kind: 'Value', value: failed }, bypass: known(false) },
            expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          })
          fixtures.push({
            name: 'reversed_' + origin,
            row: {
              ...row,
              s: { kind: 'Value', value: failed },
              bypass: known(false),
              pick: known(true),
            },
            expected: { kind: 'True' },
          })
        }
      }
    }
    for (const origin of ['source', 'stored']) {
      const row: Row = {
        s: { kind: 'Unknown' },
        t: known(null),
        ss: { kind: 'Unknown' },
        ts: known(null),
        nested: { kind: 'Unknown' },
        pick: known(false),
        bypass: known(false),
      }
      fixtures.push({ name: 'field_' + origin, row, expected: { kind: 'Unknown' } })
      fixtures.push({ name: 'selected_' + origin, row, expected: { kind: 'Null' } })
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositeiocasts',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
