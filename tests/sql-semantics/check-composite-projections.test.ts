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

it('projects anonymous fields and expands captured row stars with coercions, dropped fields, unknown types and ordered preparation', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-projections-')),
    artifact = 'artifacts/goal-checks/composite-projections-active'
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
CREATE TYPE pair AS(n int4,old json,label text COLLATE "C",tag phase);ALTER TYPE pair DROP ATTRIBUTE old;
CREATE DOMAIN guarded AS pair CHECK((VALUE).n>=0);CREATE TYPE vacant AS();`)
    const forms: Record<string, { sql: string; constantError?: boolean }> = {
      scalar: { sql: '(ROW(n,label)).f1>=1' },
      label: {
        sql: '(ROW(n/divisor,label)).f2 COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"',
      },
      constant_error: { sql: '(ROW(1/0,label)).f2 IS NULL', constantError: true },
      constant_pruned: { sql: 'CASE WHEN true THEN true ELSE (ROW(1/0,label)).f2 IS NULL END' },
      enum_field: { sql: "(ROW(tag)).f1='z'::phase" },
      array_field: { sql: '(ROW(ARRAY[n,NULL],NULL::int4[])).f1[1] IS NOT DISTINCT FROM n' },
      domain_field: { sql: '(ROW(n::positive,label)).f1>=0' },
      domain_discarded: { sql: '(ROW(n::positive,label)).f2 IS NULL' },
      named_star: {
        sql: `to_jsonb(ROW((p).*)) IS NOT DISTINCT FROM jsonb_build_object('f1',(p).n,'f2',(p).label,'f3',(p).tag)`,
      },
      anonymous_star: {
        sql: 'to_jsonb(ROW((ROW(n,label,tag)).*)) IS NOT DISTINCT FROM to_jsonb(ROW(n,label,tag))',
      },
      record_star: {
        sql: 'to_jsonb(ROW((ROW(n,label)::record).*)) IS NOT DISTINCT FROM to_jsonb(ROW(n,label))',
      },
      extra_star: {
        sql: 'to_jsonb(ROW(7,(p).*,9)) IS NOT DISTINCT FROM to_jsonb(ROW(7,(p).n,(p).label,(p).tag,9))',
      },
      whole: {
        sql: 'to_jsonb(ROW(gate_whole.*)) IS NOT DISTINCT FROM to_jsonb(ROW(p,n,label,tag,divisor,pick,bypass))',
      },
      qualified: { sql: 'gate_qualified.n IS NOT DISTINCT FROM n' },
      selected: {
        sql: 'to_jsonb(ROW((CASE WHEN pick THEN p ELSE ROW(n,label,tag)::pair END).*)) IS NOT NULL',
      },
      casted: { sql: 'ROW((p).*)::pair IS NOT DISTINCT FROM p' },
      pruned_star: {
        sql: '(ROW((ROW(n/divisor,label,tag)::pair).*)::pair).label COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"',
      },
      domain_star: { sql: '(ROW((ROW(n,label,tag)::guarded).*)::pair).label IS NULL' },
      unknown_null: { sql: '(ROW(NULL)).f1 IS NULL' },
      unknown_distinct: { sql: '(ROW(NULL)).f1 IS DISTINCT FROM NULL' },
      unknown_present: { sql: "(ROW('abc')).f1 IS NOT DISTINCT FROM NULL" },
      unknown_builder: { sql: "jsonb_build_array((ROW('abc')).f1)='[\"abc\"]'::jsonb" },
      unknown_key: { sql: 'jsonb_build_object((ROW(NULL)).f1,2) IS NULL' },
      unknown_text: { sql: '((ROW(NULL)).f1::text) IS NULL' },
      unknown_width: { sql: "(ROW(n/divisor,'abcdef')).f2::varchar(2)='ab' COLLATE \"C\"" },
      unknown_array: { sql: "to_jsonb(ARRAY[(ROW(NULL)).f1]::text[])='[null]'::jsonb" },
      unknown_resolved_hash: { sql: 'hash_record(ROW((ROW(NULL)).f1::text))=0' },
      unknown_hash: { sql: 'hash_record(ROW((ROW(NULL)).f1))=0', constantError: true },
      unknown_star: { sql: `to_jsonb(ROW((ROW(NULL,'abc')).*))='{"f1":null,"f2":"abc"}'::jsonb` },
      empty_star: {
        sql: 'ROW((CASE WHEN n/divisor>0 THEN ROW()::vacant ELSE NULL::vacant END).*) IS NULL',
      },
      empty_constant_star: {
        sql: 'ROW((CASE WHEN 1/0>0 THEN ROW()::vacant ELSE NULL::vacant END).*) IS NULL',
      },
    }
    const columns =
      'p pair,n int4,label text COLLATE "C",tag phase,divisor int4,pick bool,bypass bool'
    for (const [name, form] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.sql} END));`,
      )
    await pg.exec(`CREATE TABLE oracle(${columns});`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, form]) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...constraint,
                  definition: `CHECK(CASE WHEN bypass THEN true ELSE ${form.sql} END)`,
                }
              : constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
      })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    const uncertain = (x: unknown): boolean =>
      !!x &&
      typeof x === 'object' &&
      (('kind' in x && x.kind === 'uncertain') ||
        Object.entries(x).some(
          ([key, value]) =>
            key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
        ))
    for (const [index, check] of group.checks.entries()) {
      expect(uncertain(plans[index]!.expression), plans[index]!.name + ' unresolved').toBe(false)
      expect(check.kind, plans[index]!.name + ':' + JSON.stringify(check)).toBe('supported')
    }
    const rootCheck = group.checks.find(
      (c) => c.kind === 'supported' && c.inputs.some((i) => i.name === 'p'),
    )!
    if (rootCheck.kind !== 'supported') throw Error('Missing composite input')
    const type = rootCheck.inputs.find((i) => i.name === 'p')!.type,
      known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const samples = [
      { record: 'NULL::pair', n: null, label: null, tag: null, divisor: 0, pick: true },
      { record: 'ROW(NULL,NULL,NULL)::pair', n: 0, label: '', tag: 'z', divisor: 0, pick: false },
      { record: `ROW(3,'ok','z')::pair`, n: 2, label: 'abc', tag: 'a', divisor: 1, pick: true },
      {
        record: `ROW(-1,'snow😊','a')::pair`,
        n: -1,
        label: 'snow😊',
        tag: 'z',
        divisor: 0,
        pick: false,
      },
      { record: 'NULL::pair', n: 70000, label: 'long', tag: null, divisor: 2, pick: false },
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
              `SELECT (${form.sql}) value FROM oracle AS gate_${name}`,
            )
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const bypass of [false, true]) {
          const eager = error && form.constantError,
            expected: Outcome =
              eager || (!bypass && error)
                ? { kind: 'Error', value: { state: parseInt(error!, 36) } }
                : bypass
                  ? { kind: 'True' }
                  : { kind: output === null ? 'Null' : output ? 'True' : 'False' },
            code =
              expected.kind === 'Error' ? error : expected.kind === 'False' ? '23514' : undefined,
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
          reference.push({ name, sample, bypass, output, error, expected })
        }
      }
    }
    const partial: Row = {
      p: { kind: 'Unknown' },
      n: { kind: 'Unknown' },
      label: known('abc'),
      tag: known(null),
      divisor: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      pick: known(false),
      bypass: known(false),
    }
    for (const origin of ['source', 'stored']) {
      for (const [name, expected] of [
        ['label', 'True'],
        ['scalar', 'Unknown'],
        ['named_star', 'Unknown'],
        ['empty_star', 'True'],
        ['empty_constant_star', 'True'],
      ] as const)
        fixtures.push({ name: name + '_' + origin, row: partial, expected: { kind: expected } })
      fixtures.push({
        name: 'scalar_' + origin,
        row: {
          ...partial,
          n: known(2),
          label: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: 'scalar_' + origin,
        row: { ...partial, n: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      })
    }
    await runCheckParity(
      root,
      'compositeprojections',
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
