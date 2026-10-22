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

it('coerces typed-table rows through captured OF identities with common rows, arrays, domains and ordered states', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-typed-tables-')),
    artifact = 'artifacts/goal-checks/composite-typed-tables-active'
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');CREATE TYPE reading AS(score int4,obsolete int4,label text COLLATE "C",tag phase,vals int4[]);
      ALTER TYPE reading DROP ATTRIBUTE obsolete;CREATE TABLE readings OF reading;
      CREATE TABLE extended(extra int4) INHERITS(readings);
      CREATE DOMAIN approved AS reading CHECK((VALUE).score>=0);
      CREATE DOMAIN table_domain AS readings CHECK((VALUE).score>=0);
      CREATE DOMAIN reading_batch AS reading[] CHECK(cardinality(VALUE)<=2);
      CREATE TYPE vacant AS();CREATE TABLE vacant_table OF vacant;`)
    const forms: Record<string, { sql: string; eager?: boolean }> = {
        direct: { sql: '(t::reading).score>=1' },
        transitive_explicit: { sql: '(g::readings::reading).score>=1' },
        source_domain: { sql: '(t::table_domain::reading).score>=1' },
        target_domain: { sql: '(t::reading::approved).score>=1' },
        field_array: { sql: '((t::reading).vals)[1]>=1' },
        field_enum: { sql: "(t::reading).tag='z'::phase" },
        nullness: { sql: '(t::reading) IS NULL' },
        present: { sql: '(t::reading) IS NOT NULL' },
        datum: { sql: '(t::reading) IS DISTINCT FROM NULL' },
        text: { sql: '(t::reading)::text IS NOT DISTINCT FROM t::text' },
        json: { sql: 'to_jsonb(t::reading) IS NOT DISTINCT FROM to_jsonb(t)' },
        case_forward: { sql: '(CASE WHEN pick THEN t ELSE p END).score>=1' },
        case_reverse: { sql: '(CASE WHEN pick THEN p ELSE t END).score>=1' },
        coalesce: { sql: '(COALESCE(t,p)).score>=1' },
        greatest: { sql: '(GREATEST(t,p)).score>=1' },
        least: { sql: '(LEAST(p,t)).score>=1' },
        inferred: { sql: "(COALESCE(t::reading,'(2,ok,z,{2})')).score>=1" },
        constructor: { sql: '(ARRAY[t,p])[1] IS NOT DISTINCT FROM t::reading' },
        explicit_constructor: { sql: '(ARRAY[t]::reading[])[1] IS NOT DISTINCT FROM t::reading' },
        nested_constructor: {
          sql: '(ARRAY[ARRAY[t::reading],ARRAY[p]])[2][1] IS NOT DISTINCT FROM p',
        },
        batch_domain: { sql: 'cardinality((ARRAY[t,p]::reading_batch))=2' },
        append: { sql: 'cardinality(array_append(ps,t))=COALESCE(cardinality(ps),0)+1' },
        prepend: { sql: '(array_prepend(t,ps))[1] IS NOT DISTINCT FROM t::reading' },
        find: { sql: 'array_position(ARRAY[t::reading,p],t)=1' },
        remove: { sql: 'cardinality(array_remove(ARRAY[t::reading],t))=0' },
        replace: { sql: '(array_replace(ARRAY[t::reading],t,p))[1] IS NOT DISTINCT FROM p' },
        concat: { sql: 'cardinality(ps||t)=COALESCE(cardinality(ps),0)+1' },
        discarded: {
          sql: '(ROW(n,NULL,NULL,ARRAY[n],n/divisor)::extended::readings::reading).score>=1',
        },
        prepared: {
          sql: '(ROW(n,NULL,NULL,ARRAY[n],1/0)::extended::readings::reading).score>=1',
          eager: true,
        },
        pruned: {
          sql: 'CASE WHEN true THEN true ELSE (ROW(n,NULL,NULL,ARRAY[n],1/0)::extended::readings::reading).score>=1 END',
        },
        empty: { sql: "record_send(ROW()::vacant_table::vacant)='\\x00000000'::bytea" },
      },
      columns =
        't readings,g extended,p reading,ps reading[],n int4,divisor int4,pick bool,bypass bool'
    for (const [name, f] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END));`,
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
    const typeOf = (name: string) => {
        const c = group.checks.find(
          (c) => c.kind === 'supported' && c.inputs.some((i) => i.name === name),
        )!
        if (c.kind !== 'supported') throw Error('Missing input ' + name)
        return c.inputs.find((i) => i.name === name)!.type
      },
      known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        {
          t: 'NULL::readings',
          g: 'NULL::extended',
          p: 'NULL::reading',
          ps: 'NULL::reading[]',
          n: null,
          divisor: 0,
          pick: true,
        },
        {
          t: 'ROW(NULL,NULL,NULL,NULL)::readings',
          g: 'ROW(NULL,NULL,NULL,NULL,NULL)::extended',
          p: "ROW(2,'fallback','z',ARRAY[2])::reading",
          ps: 'ARRAY[]::reading[]',
          n: 0,
          divisor: 0,
          pick: false,
        },
        {
          t: "ROW(3,'ok','z',ARRAY[3])::readings",
          g: "ROW(3,'ok','z',ARRAY[3],99)::extended",
          p: "ROW(4,'higher','a',ARRAY[4])::reading",
          ps: '\'[0:0]={"(1,first,z,{1})"}\'::reading[]',
          n: 3,
          divisor: 1,
          pick: true,
        },
        {
          t: "ROW(-1,'snow😊','a',ARRAY[-1])::readings",
          g: "ROW(-1,'snow😊','a',ARRAY[-1],99)::extended",
          p: "ROW(-2,'lower','a',ARRAY[-2])::reading",
          ps: 'ARRAY[NULL::reading]',
          n: -1,
          divisor: 0,
          pick: false,
        },
      ]
    for (const s of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${s.t},${s.g},${s.p},${s.ps},$1,$2,$3,false`, [
        s.n,
        s.divisor,
        s.pick,
      ])
      const t = await readCompositeFixture(pg, 'SELECT t FROM oracle', 't', typeOf('t')),
        g = await readCompositeFixture(pg, 'SELECT g FROM oracle', 'g', typeOf('g')),
        p = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', typeOf('p')),
        ps = await readCompositeArrayFixture(
          pg,
          'SELECT ps FROM oracle',
          'ps',
          typeOf('ps').slice(6),
        ),
        row: Row = {
          t: t ? { kind: 'Value', value: t } : known(null),
          g: g ? { kind: 'Value', value: g } : known(null),
          p: p ? { kind: 'Value', value: p } : known(null),
          ps: ps ? { kind: 'Value', value: ps } : known(null),
          n: known(s.n),
          divisor: known(s.divisor),
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
              `INSERT INTO gate_${name} SELECT t,g,p,ps,n,divisor,pick,$1 FROM oracle`,
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
      if (t && s.n === 3) {
        const missing = structuredClone(t),
          failed = structuredClone(t)
        missing.fields[0] = { kind: 'Unknown' }
        failed.fields[0] = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        for (const origin of ['source', 'stored']) {
          fixtures.push({
            name: 'direct_' + origin,
            row: { ...row, t: { kind: 'Value', value: missing }, bypass: known(false) },
            expected: { kind: 'Unknown' },
          })
          fixtures.push({
            name: 'direct_' + origin,
            row: { ...row, t: { kind: 'Value', value: failed }, bypass: known(false) },
            expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          })
          fixtures.push({
            name: 'case_reverse_' + origin,
            row: {
              ...row,
              t: { kind: 'Value', value: failed },
              bypass: known(false),
              pick: known(true),
            },
            expected: { kind: 'True' },
          })
        }
      }
    }
    for (const origin of ['source', 'stored']) {
      const partial: Row = {
        t: { kind: 'Unknown' },
        g: { kind: 'Unknown' },
        p: known(null),
        ps: known(null),
        n: known(2),
        divisor: known(0),
        pick: known(false),
        bypass: known(false),
      }
      fixtures.push({ name: 'direct_' + origin, row: partial, expected: { kind: 'Unknown' } })
      fixtures.push({ name: 'case_forward_' + origin, row: partial, expected: { kind: 'Null' } })
      fixtures.push({
        name: 'discarded_' + origin,
        row: partial,
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositetypedtables',
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

it('preserves selected catalog row-cast deferrals and implicit inheritance fallback in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-row-casts-')),
    artifact = 'artifacts/goal-checks/composite-typed-tables-active'
  try {
    await pg.exec(`CREATE TABLE parent(n int4);CREATE TABLE child(extra int4) INHERITS(parent);
      CREATE TABLE io_child(extra int4) INHERITS(parent);
      CREATE FUNCTION custom(child) RETURNS parent LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(99)::parent';
      CREATE CAST(child AS parent) WITH FUNCTION custom(child);
      CREATE CAST(io_child AS parent) WITH INOUT;
      CREATE TYPE base AS(n int4);CREATE TABLE typed OF base;
      CREATE FUNCTION custom_typed(typed) RETURNS base LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(99)::base';
      CREATE CAST(typed AS base) WITH FUNCTION custom_typed(typed) AS IMPLICIT;`)
    const forms = {
        explicit: '(c::parent).n=99',
        common: '(COALESCE(c,p)).n=1',
        constructor: '(ARRAY[c]::parent[])[1].n=99',
        typed: '(COALESCE(t,b)).n=99',
        io: '(d::parent).n=1',
      },
      columns = 'c child,p parent,t typed,b base,d io_child,bypass bool'
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(`CREATE TABLE oracle(${columns})`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, sql]) => {
        const t = catalog.tables.find((t) => t.name === 'gate_' + name)!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            t,
            t.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans)
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(p.name !== 'common_source')
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const common = group.checks.find((_, i) => plans[i]!.name === 'common_source')!
    if (common.kind !== 'supported') throw Error('Missing common row check')
    const type = (name: string) => common.inputs.find((i) => i.name === name)!.type,
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const missing of [false, true]) {
      await pg.exec('TRUNCATE oracle')
      await pg.exec(
        `INSERT INTO oracle SELECT ${missing ? 'NULL::child' : 'ROW(1,2)::child'},ROW(1)::parent,ROW(1)::typed,ROW(1)::base,ROW(1,2)::io_child,false`,
      )
      const c = await readCompositeFixture(pg, 'SELECT c FROM oracle', 'c', type('c')),
        p = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', type('p'))
      for (const [name, sql] of Object.entries(forms)) {
        let value: boolean | null = null,
          error: string | undefined
        try {
          value = (
            await pg.query<{ value: boolean | null }>('SELECT ' + sql + ' AS value FROM oracle')
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const bypass of [false, true]) {
          const native: Outcome =
              !bypass && error
                ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                : bypass
                  ? { kind: 'True' }
                  : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            insert = pg.query(`INSERT INTO gate_${name} SELECT c,p,t,b,d,$1 FROM oracle`, [bypass])
          if (native.kind === 'Error') await expect(insert).rejects.toMatchObject({ code: error })
          else if (native.kind === 'False')
            await expect(insert).rejects.toMatchObject({ code: '23514' })
          else await insert
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: {
                c: c ? { kind: 'Value', value: c } : { kind: 'Null' },
                p: p ? { kind: 'Value', value: p } : { kind: 'Null' },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: bypass
                ? { kind: 'True' }
                : name === 'common' && origin === 'source'
                  ? native
                  : { kind: 'Unknown' },
            })
          reference.push({ name, missing, bypass, native })
        }
      }
    }
    await runCheckParity(
      root,
      'compositerowcasts',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'cast-report.json'),
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
