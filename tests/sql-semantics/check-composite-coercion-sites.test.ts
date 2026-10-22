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
      ([key, v]) => key !== 'type' && (Array.isArray(v) ? v.some(uncertain) : uncertain(v)),
    ))

it('matches individual native row conversion sites through mixed branches, nested casts, fields and containers', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-coercion-sites-')),
    artifact = 'artifacts/goal-checks/composite-coercion-sites-active'
  try {
    await pg.exec(`CREATE TABLE parent(score int4,obsolete int4,label text);ALTER TABLE parent DROP COLUMN obsolete;
      CREATE TABLE child(label text,score int4);ALTER TABLE child INHERIT parent;
      CREATE CAST(child AS parent) WITH INOUT;CREATE CAST(parent AS child) WITH INOUT;
      CREATE DOMAIN approved AS parent CHECK((VALUE).score>=0);
      CREATE DOMAIN source_guard AS child CHECK((COALESCE(VALUE,NULL::parent)).score>=0 OR (VALUE::parent).score>=0);
      CREATE DOMAIN batch_guard AS child[] CHECK(((VALUE)[1]::parent).score>=0 OR (COALESCE((VALUE)[1],NULL::parent)).score>=0);
      CREATE TYPE pair AS(first parent,obsolete int4,second parent);ALTER TYPE pair DROP ATTRIBUTE obsolete;`)
    const forms: Record<string, { sql: string }> = {
        selected: { sql: '(CASE WHEN pick THEN c::parent ELSE COALESCE(c,p) END).score>=minimum' },
        reversed: { sql: '(CASE WHEN pick THEN COALESCE(c,p) ELSE c::parent END).score>=minimum' },
        and: { sql: '(COALESCE(c,p)).score>=minimum AND (c::parent).score>=minimum' },
        or: { sql: '(COALESCE(c,p)).score>=minimum OR (c::parent).score>=minimum' },
        not_distinct: { sql: '(c::parent).score IS NOT DISTINCT FROM (COALESCE(c,p)).score' },
        bool_test: {
          sql: '((c::parent).score>=minimum OR (COALESCE(c,p)).score>=minimum) IS TRUE',
        },
        field_calls: { sql: 'score(c::parent)>=minimum OR score(COALESCE(c,p))>=minimum' },
        field_text: { sql: 'label(c::parent) IS DISTINCT FROM label(COALESCE(c,p))' },
        syntax: {
          sql: "substring('abcdef' FROM (c::parent).score) IS NOT DISTINCT FROM substring('abcdef' FROM (COALESCE(c,p)).score)",
        },
        null_test: { sql: '(c::parent) IS NULL OR COALESCE(c,p) IS NOT NULL' },
        simple_case: {
          sql: 'CASE 1 WHEN (c::parent).score THEN true ELSE (COALESCE(c,p)).score>=minimum END',
        },
        row_case: { sql: 'CASE c::parent WHEN COALESCE(c,p) THEN true ELSE false END' },
        greatest: { sql: '(GREATEST(c::parent,COALESCE(c,p))).score>=minimum' },
        least: { sql: '(LEAST(COALESCE(c,p),c::parent)).score>=minimum' },
        nested: { sql: '(COALESCE(c::parent::child,p)).score>=minimum' },
        repeated: { sql: '(COALESCE(c::parent::child::parent::child,p)).score>=minimum' },
        redundant: { sql: '(COALESCE(c::parent::parent::child,p)).score>=minimum' },
        domain: { sql: '(CASE WHEN pick THEN c::approved ELSE COALESCE(c,p) END).score>=minimum' },
        staged_domain: {
          sql: '(CASE WHEN pick THEN (c::parent)::approved ELSE COALESCE(c,p) END).score>=minimum',
        },
        source_checked: { sql: '(c::source_guard).score>=minimum' },
        array_checked: { sql: 'cardinality(cs::batch_guard)>=0' },
        record: { sql: '((ROW(c::parent,COALESCE(c,p))::pair).second).score>=minimum' },
        record_first: { sql: '((ROW(COALESCE(c,p),c::parent)::pair).first).score>=minimum' },
        anonymous: { sql: '(ROW(c::parent,COALESCE(c,p))).f2.score>=minimum' },
        array: { sql: '(ARRAY[c::parent,COALESCE(c,p)])[2].score>=minimum' },
        append: { sql: '(array_append(ARRAY[c::parent],c))[2].score>=minimum' },
        prepend: { sql: '(array_prepend(c,ARRAY[c::parent]))[1].score>=minimum' },
        replace: { sql: '(array_replace(ARRAY[c::parent],c,p))[1] IS NOT DISTINCT FROM p' },
        json: { sql: "(to_jsonb(ROW(c::parent,COALESCE(c,p)))->'f2'->>'score')::int4>=minimum" },
        array_cast: { sql: 'cardinality(cs::parent[])>=0 AND (COALESCE(c,p)).score>=minimum' },
        index: { sql: '(ps[(c::parent).score]).score>=0 OR (COALESCE(c,p)).score>=minimum' },
        same_index: { sql: '(ps[(COALESCE(c,p)).score]).score>=0 OR (c::parent).score>=minimum' },
      },
      columns = 'c child,p parent,cs child[],ps parent[],minimum int4,pick bool,bypass bool'
    for (const [name, f] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END))`,
      )
    await pg.exec(`CREATE TABLE oracle(${columns})`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, f]) => {
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
            origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.sql} END)` : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(false)
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const type = (name: string) =>
        group.checks
          .flatMap((c) => (c.kind === 'supported' ? c.inputs : []))
          .find((i) => i.name === name)!.type,
      known = (v: number | boolean | null) =>
        v === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value: v },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        {
          c: 'NULL::child',
          p: 'NULL::parent',
          cs: 'NULL::child[]',
          ps: 'NULL::parent[]',
          minimum: 1,
          pick: true,
        },
        {
          c: 'ROW(NULL,NULL)::child',
          p: "ROW(2,'ok')::parent",
          cs: 'ARRAY[]::child[]',
          ps: 'ARRAY[]::parent[]',
          minimum: 1,
          pick: false,
        },
        {
          c: "ROW('7',3)::child",
          p: "ROW(4,'fallback')::parent",
          cs: '\'[0:0]={"(7,3)"}\'::child[]',
          ps: "ARRAY[ROW(1,'a')::parent,ROW(2,'b')::parent,ROW(3,'c')::parent]",
          minimum: 5,
          pick: true,
        },
        {
          c: "ROW('-1',-3)::child",
          p: "ROW(-4,'fallback')::parent",
          cs: "ARRAY[NULL::child,ROW('-1',-3)::child]",
          ps: "ARRAY[ROW(1,'a')::parent]",
          minimum: -2,
          pick: false,
        },
        {
          c: "ROW('bad',3)::child",
          p: "ROW(4,'fallback')::parent",
          cs: "ARRAY[ROW('bad',3)::child]",
          ps: "ARRAY[ROW(1,'a')::parent]",
          minimum: 1,
          pick: false,
        },
      ]
    for (const s of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${s.c},${s.p},${s.cs},${s.ps},$1,$2,false`, [
        s.minimum,
        s.pick,
      ])
      const c = await readCompositeFixture(pg, 'SELECT c FROM oracle', 'c', type('c')),
        p = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', type('p')),
        cs = await readCompositeArrayFixture(
          pg,
          'SELECT cs FROM oracle',
          'cs',
          type('cs').slice(6),
        ),
        ps = await readCompositeArrayFixture(
          pg,
          'SELECT ps FROM oracle',
          'ps',
          type('ps').slice(6),
        ),
        row: Row = {
          c: c ? { kind: 'Value', value: c } : known(null),
          p: p ? { kind: 'Value', value: p } : known(null),
          cs: cs ? { kind: 'Value', value: cs } : known(null),
          ps: ps ? { kind: 'Value', value: ps } : known(null),
          minimum: known(s.minimum),
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
              !bypass && error
                ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                : bypass
                  ? { kind: 'True' }
                  : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            code =
              expected.kind === 'Error' ? error : expected.kind === 'False' ? '23514' : undefined,
            insert = pg.query(
              `INSERT INTO gate_${name} SELECT c,p,cs,ps,minimum,pick,$1 FROM oracle`,
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
      if (c && s.c.includes("'7'")) {
        const missing = structuredClone(c)
        missing.fields[0] = { kind: 'Unknown' }
        for (const origin of ['source', 'stored']) {
          fixtures.push({
            name: 'selected_' + origin,
            row: {
              ...row,
              c: { kind: 'Value', value: missing },
              minimum: known(1),
              pick: known(false),
              bypass: known(false),
            },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name: 'selected_' + origin,
            row: {
              ...row,
              c: { kind: 'Value', value: missing },
              minimum: known(1),
              pick: known(true),
              bypass: known(false),
            },
            expected: { kind: 'Unknown' },
          })
        }
      }
    }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositecoercionsites',
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

it('keeps unavailable historical function casts local while evaluating default row branches for the same types', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-function-sites-')),
    artifact = 'artifacts/goal-checks/composite-coercion-sites-active'
  try {
    const sql =
      'CASE WHEN bypass THEN true ELSE CASE WHEN pick THEN (c::parent).score>=minimum ELSE (COALESCE(c,p)).score>=minimum END END'
    await pg.exec(`CREATE TABLE parent(score int4,label text);CREATE TABLE child(label text,score int4);ALTER TABLE child INHERIT parent;
      CREATE FUNCTION custom(child) RETURNS parent LANGUAGE SQL IMMUTABLE AS 'SELECT ROW(99,''custom'')::parent';
      CREATE CAST(child AS parent) WITH FUNCTION custom(child);
      CREATE TABLE gate(c child,p parent,minimum int4,pick bool,bypass bool,CONSTRAINT valid CHECK(${sql}));
      CREATE FUNCTION expected(c child,p parent,minimum int4,pick bool,bypass bool) RETURNS boolean LANGUAGE SQL RETURN ${sql};
      DROP CAST(child AS parent);CREATE CAST(child AS parent) WITH INOUT AS IMPLICIT;
      CREATE TABLE oracle(c child,p parent,minimum int4,pick bool,bypass bool);`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'gate')!,
      constraint = table.constraints[0]!,
      plans = (['source', 'stored'] as const).map((origin) => ({
        name: origin,
        identity: { schema: 'public', kind: 'table' as const, owner: 'gate', constraint: origin },
        expression: lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${sql})` : undefined,
        )!.expression,
      })),
      group = prepareCheckRustGroup(plans)
    expect(constraint.rowCoercionContext!.casts.map((c) => c.kind)).toEqual(['function', 'row'])
    for (const p of plans) expect(uncertain(p.expression)).toBe(true)
    for (const c of group.checks) expect(c.kind).toBe('supported')
    const type = (name: string) =>
        group.checks
          .flatMap((c) => (c.kind === 'supported' ? c.inputs : []))
          .find((i) => i.name === name)!.type,
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const missing of [false, true]) {
      await pg.exec('TRUNCATE oracle')
      await pg.exec(
        `INSERT INTO oracle SELECT ${missing ? 'NULL::child' : "ROW('bad',3)::child"},ROW(4,'fallback')::parent,${missing ? 1 : 5},false,false`,
      )
      const c = await readCompositeFixture(pg, 'SELECT c FROM oracle', 'c', type('c')),
        p = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', type('p'))
      for (const pick of [false, true])
        for (const bypass of [false, true]) {
          const value = (
              await pg.query<{ value: boolean | null }>(
                'SELECT expected(c,p,minimum,$1,$2) AS value FROM oracle',
                [pick, bypass],
              )
            ).rows[0]!.value,
            native: Outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            insert = pg.query('INSERT INTO gate SELECT c,p,minimum,$1,$2 FROM oracle', [
              pick,
              bypass,
            ])
          if (native.kind === 'False') await expect(insert).rejects.toMatchObject({ code: '23514' })
          else await insert
          for (const name of ['source', 'stored'])
            fixtures.push({
              name,
              row: {
                c: c ? { kind: 'Value', value: c } : { kind: 'Null' },
                p: p ? { kind: 'Value', value: p } : { kind: 'Null' },
                minimum: { kind: 'Value', value: missing ? 1 : 5 },
                pick: { kind: 'Value', value: pick },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: !bypass && pick ? { kind: 'Unknown' } : native,
            })
          reference.push({ missing, pick, bypass, native })
        }
    }
    await runCheckParity(
      root,
      'compositefunctionsites',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'function-report.json'),
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
