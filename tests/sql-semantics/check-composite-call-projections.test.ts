import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readCompositeFixture } from './check-composite-fixtures.js'
import { WorldCheckOracles } from './check-world-oracles.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('preserves captured function versus field choices across row syntax, shadowing and owned composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-call-projections-')),
    artifact = 'artifacts/goal-checks/composite-call-binding-active',
    oracles = new WorldCheckOracles()
  try {
    const forms: Record<string, { sql: string; deferred?: boolean; eager?: boolean }> = {
        named: { sql: 'n(p)>=1' },
        label: { sql: 'label(p) COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"' },
        selected: {
          sql: 'n(CASE WHEN pick THEN p ELSE ROW(n,label,tag,ARRAY[n],label,label)::pair END)>=1',
        },
        domain: { sql: 'n(p::guarded)>=1' },
        array: { sql: '(vals(p))[1] IS NOT DISTINCT FROM n' },
        enum: { sql: "tag(p)='z'::phase" },
        anonymous: { sql: 'f1(ROW(n,label))>=1' },
        discarded: { sql: 'f2(ROW(n/divisor,label)) IS NULL' },
        prepared: { sql: 'f2(ROW(1/0,label)) IS NULL', eager: true },
        pruned: { sql: 'CASE WHEN true THEN true ELSE f2(ROW(1/0,label)) IS NULL END' },
        nested: { sql: 'f1(ROW(n(p),label))>=1' },
        unknown: { sql: "jsonb_build_array(f1(ROW('abc')))='[\"abc\"]'::jsonb" },
        string_cast: { sql: "f1(ROW('abcdef'))::varchar(2)='ab' COLLATE \"C\"" },
        builtin: { sql: 'to_jsonb(p) IS NOT NULL' },
        explicit: { sql: 'pg_catalog.to_jsonb(p) IS NOT NULL' },
        field: { sql: '(p).to_jsonb IS NULL' },
        computed: { sql: '(p).row_to_json IS NOT NULL' },
        type_named_field: { sql: 'text(p) IS NOT NULL' },
        domain_call: { sql: 'guarded(p) IS NOT NULL' },
        qualified_domain_call: { sql: 'public.guarded(p) IS NOT NULL' },
        custom: { sql: 'n(p)>=1', deferred: true },
        mixed: { sql: 'n(p)>=1 AND (p).n>=1', deferred: true },
        shadow: { sql: 'to_jsonb(p) IS NOT NULL', deferred: true },
        shadow_field: { sql: '(p).to_jsonb IS NULL' },
        defaulted: { sql: 'label(p) IS NULL', deferred: true },
      },
      columns = 'p pair,n int4,label text COLLATE "C",tag phase,divisor int4,pick bool,bypass bool',
      create = (name: string) =>
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${forms[name]!.sql} END));`
    const later = new Set(['custom', 'mixed', 'shadow', 'shadow_field', 'defaulted']),
      before = Object.keys(forms)
        .filter((name) => !later.has(name))
        .map(create)
        .join('\n'),
      after = Object.keys(forms)
        .filter((name) => later.has(name))
        .map(create)
        .join('\n')
    await oracles.load(
      pg,
      `CREATE TYPE phase AS ENUM('z','a');
CREATE TYPE pair AS(n int4,old int4,label text COLLATE "C",tag phase,vals int4[],to_jsonb text,text text);
ALTER TYPE pair DROP ATTRIBUTE old;
CREATE DOMAIN guarded AS pair CHECK((VALUE).n>=0);
${before}
CREATE FUNCTION n(pair) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT -1';
CREATE FUNCTION to_jsonb(pair) RETURNS jsonb LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT NULL::jsonb';
CREATE FUNCTION label(pair,int4 DEFAULT 0) RETURNS text LANGUAGE SQL IMMUTABLE AS 'SELECT NULL::text';
${after}`,
      'public',
    )
    await pg.exec(`CREATE TABLE oracle(${columns})`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, form]) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${form.sql} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      rootCheck = group.checks.find(
        (c) => c.kind === 'supported' && c.inputs.some((i) => i.name === 'p'),
      )!
    for (const [i, plan] of plans.entries()) {
      const form = forms[plan.name.replace(/_(source|stored)$/u, '')]!
      if (!form.deferred) expect(uncertain(plan.expression), plan.name).toBe(false)
      expect(group.checks[i]!.kind, plan.name).toBe('supported')
    }
    if (rootCheck.kind !== 'supported') throw Error('Missing record input')
    const type = rootCheck.inputs.find((i) => i.name === 'p')!.type,
      known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        { record: 'NULL::pair', n: null, label: null, tag: null, divisor: 0, pick: true },
        {
          record: 'ROW(NULL,NULL,NULL,NULL,NULL,NULL)::pair',
          n: 0,
          label: '',
          tag: 'z',
          divisor: 0,
          pick: false,
        },
        {
          record: "ROW(3,'ok','z',ARRAY[3],NULL,'other')::pair",
          n: 3,
          label: 'ok',
          tag: 'z',
          divisor: 1,
          pick: true,
        },
        {
          record: "ROW(-1,'snow😊','a',ARRAY[7],'text','other')::pair",
          n: -1,
          label: 'snow😊',
          tag: 'a',
          divisor: 0,
          pick: false,
        },
      ]
    for (const sample of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${sample.record},$1,$2,$3,$4,$5,false`, [
        sample.n,
        sample.label,
        sample.tag,
        sample.divisor,
        sample.pick,
      ])
      const payload = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', type),
        fieldFalse =
          (await pg.query<{ value: boolean | null }>('SELECT (p).n>=1 value FROM oracle')).rows[0]!
            .value === false,
        row: Row = {
          p: payload ? { kind: 'Value', value: payload } : known(null),
          n: known(sample.n),
          label: known(sample.label),
          tag: known(sample.tag === null ? null : sample.tag === 'z' ? 0 : 1),
          divisor: known(sample.divisor),
          pick: known(sample.pick),
        }
      for (const [name, form] of Object.entries(forms)) {
        let output: boolean | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${oracles.expression('public.gate_' + name + '.valid', 'candidate')} value FROM oracle AS candidate`,
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const bypass of [false, true]) {
          const native: Outcome =
              (error && form.eager) || (!bypass && error)
                ? { kind: 'Error', value: { state: parseInt(error!, 36) } }
                : bypass
                  ? { kind: 'True' }
                  : { kind: output === null ? 'Null' : output ? 'True' : 'False' },
            expected: Outcome =
              form.deferred && !bypass
                ? { kind: name === 'mixed' && fieldFalse ? 'False' : 'Unknown' }
                : native,
            code = native.kind === 'Error' ? error : native.kind === 'False' ? '23514' : undefined,
            insert = pg.query(
              `INSERT INTO gate_${name} SELECT p,n,label,tag,divisor,pick,$1 FROM oracle`,
              [bypass],
            )
          if (code) await expect(insert).rejects.toMatchObject({ code })
          else await insert
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, bypass: known(bypass) },
              expected,
            })
          reference.push({ name, sample, bypass, native, expected })
        }
      }
    }
    for (const origin of ['source', 'stored']) {
      const partial: Row = {
        p: { kind: 'Unknown' },
        n: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        label: known(null),
        tag: known(null),
        divisor: known(0),
        pick: known(true),
        bypass: known(false),
      }
      fixtures.push({ name: 'discarded_' + origin, row: partial, expected: { kind: 'True' } })
      fixtures.push({ name: 'named_' + origin, row: partial, expected: { kind: 'Unknown' } })
      fixtures.push({
        name: 'anonymous_' + origin,
        row: partial,
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      })
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositecallprojections',
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
