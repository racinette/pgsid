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

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('coerces captured inherited row values by live field names with strict states, domains and ordered child errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-inheritance-')),
    artifact = 'artifacts/goal-checks/composite-inheritance-active'
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');
CREATE TABLE ancestor(n int4,old int4,label text COLLATE "C",tag phase,vals int4[]);
ALTER TABLE ancestor DROP COLUMN old;
CREATE TABLE other(flag bool,n int4);
CREATE TABLE vacant();
CREATE TABLE descendant(extra int4,label text COLLATE "C",vals int4[],n int4,tag phase,flag bool);
ALTER TABLE descendant INHERIT ancestor;ALTER TABLE descendant INHERIT other;ALTER TABLE descendant INHERIT vacant;
CREATE TABLE leaf(tail int4) INHERITS(descendant);
CREATE DOMAIN approved AS ancestor CHECK((VALUE).n>=0);
CREATE DOMAIN descendant_domain AS descendant CHECK((VALUE).extra>=0);`)
    const forms: Record<string, { sql: string; eager?: boolean }> = {
        field: { sql: '(c::ancestor).n>=1' },
        label: { sql: '(c::ancestor).label COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"' },
        other: { sql: '(c::other).flag' },
        transitive: { sql: '(g::ancestor).n>=1' },
        nested: { sql: '((g::descendant)::ancestor).n>=1' },
        selected: { sql: '((CASE WHEN pick THEN c ELSE NULL::descendant END)::ancestor).n>=1' },
        domain: { sql: '((c::ancestor)::approved).n>=1' },
        source_domain: { sql: '((c::descendant_domain)::ancestor).n>=1' },
        nullness: { sql: '(c::ancestor) IS NULL' },
        present: { sql: '(c::ancestor) IS NOT NULL' },
        datum: { sql: '(c::ancestor) IS DISTINCT FROM NULL' },
        output: { sql: 'length((c::ancestor)::text)>0' },
        json: { sql: "(to_jsonb(c::ancestor)->>'n')::int4>=1" },
        tags: { sql: '((c::ancestor).vals)[1]>=1' },
        enum: { sql: "(c::ancestor).tag='z'::phase" },
        array: { sql: '(ARRAY[c::ancestor,NULL::ancestor])[1] IS NOT DISTINCT FROM c::ancestor' },
        comparison: { sql: 'c::ancestor IS NOT DISTINCT FROM g::ancestor' },
        empty: { sql: '(c::vacant) IS NULL AND (c::vacant) IS NOT NULL' },
        empty_datum: { sql: '(c::vacant) IS DISTINCT FROM NULL' },
        constructor: {
          sql: '((ROW(1/n,label,ARRAY[n],n,tag,true)::descendant)::ancestor).label IS NULL',
        },
        discarded: {
          sql: '((ROW(n/divisor,label,ARRAY[n],n,tag,true)::descendant)::ancestor).n>=1',
        },
        prepared: {
          sql: '((ROW(1/0,label,ARRAY[n],n,tag,true)::descendant)::ancestor).n>=1',
          eager: true,
        },
        pruned: {
          sql: 'CASE WHEN true THEN true ELSE ((ROW(1/0,label,ARRAY[n],n,tag,true)::descendant)::ancestor).n>=1 END',
        },
        empty_error: {
          sql: '(ROW(n/divisor,label,ARRAY[n],n,tag,true)::descendant)::vacant IS NULL',
        },
        folded: { sql: "((ROW(99,'x',ARRAY[3],3,'z',true)::descendant)::ancestor).n>=1" },
        hash: {
          sql: 'hash_record(c::other) IS NOT DISTINCT FROM hash_record(ROW((c::other).flag,(c::other).n))',
        },
        wire: { sql: "record_send(c::vacant)='\\x00000000'::bytea" },
      },
      columns =
        'c descendant,g leaf,n int4,label text COLLATE "C",tag phase,divisor int4,pick bool,bypass bool'
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
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
      })
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
          c: 'NULL::descendant',
          g: 'NULL::leaf',
          n: null,
          label: null,
          tag: null,
          divisor: 0,
          pick: true,
        },
        {
          c: 'ROW(NULL,NULL,NULL,NULL,NULL,NULL)::descendant',
          g: 'ROW(NULL,NULL,NULL,NULL,NULL,NULL,NULL)::leaf',
          n: 0,
          label: '',
          tag: 'z',
          divisor: 0,
          pick: false,
        },
        {
          c: "ROW(9,'ok',ARRAY[3],3,'z',true)::descendant",
          g: "ROW(7,'ok',ARRAY[3],3,'z',true,99)::leaf",
          n: 3,
          label: 'ok',
          tag: 'z',
          divisor: 1,
          pick: true,
        },
        {
          c: "ROW(-1,'snow😊',ARRAY[-1],-1,'a',false)::descendant",
          g: "ROW(7,'other',ARRAY[4],4,'a',false,99)::leaf",
          n: -1,
          label: 'snow😊',
          tag: 'a',
          divisor: 0,
          pick: false,
        },
      ]
    for (const s of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${s.c},${s.g},$1,$2,$3,$4,$5,false`, [
        s.n,
        s.label,
        s.tag,
        s.divisor,
        s.pick,
      ])
      const c = await readCompositeFixture(pg, 'SELECT c FROM oracle', 'c', typeOf('c')),
        g = await readCompositeFixture(pg, 'SELECT g FROM oracle', 'g', typeOf('g')),
        row: Row = {
          c: c ? { kind: 'Value', value: c } : known(null),
          g: g ? { kind: 'Value', value: g } : known(null),
          n: known(s.n),
          label: known(s.label),
          tag: known(s.tag === null ? null : s.tag === 'z' ? 0 : 1),
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
              `INSERT INTO gate_${name} SELECT c,g,n,label,tag,divisor,pick,$1 FROM oracle`,
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
          reference.push({ name, sample: s, bypass, expected })
        }
      }
      if (c && s.n === 3) {
        const absentExtra = structuredClone(c),
          absentNumber = structuredClone(c),
          failedExtra = structuredClone(c)
        absentExtra.fields[0] = { kind: 'Unknown' }
        absentNumber.fields[3] = { kind: 'Unknown' }
        failedExtra.fields[0] = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        for (const origin of ['source', 'stored']) {
          fixtures.push({
            name: 'field_' + origin,
            row: { ...row, c: { kind: 'Value', value: absentExtra }, bypass: known(false) },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name: 'json_' + origin,
            row: { ...row, c: { kind: 'Value', value: absentExtra }, bypass: known(false) },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name: 'other_' + origin,
            row: { ...row, c: { kind: 'Value', value: absentNumber }, bypass: known(false) },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name: 'field_' + origin,
            row: { ...row, c: { kind: 'Value', value: absentNumber }, bypass: known(false) },
            expected: { kind: 'Unknown' },
          })
          fixtures.push({
            name: 'field_' + origin,
            row: { ...row, c: { kind: 'Value', value: failedExtra }, bypass: known(false) },
            expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          })
        }
      }
    }
    for (const origin of ['source', 'stored']) {
      const partial: Row = {
        c: { kind: 'Unknown' },
        g: { kind: 'Unknown' },
        n: known(2),
        label: known('ok'),
        tag: known(0),
        divisor: known(0),
        pick: known(false),
        bypass: known(false),
      }
      fixtures.push({ name: 'field_' + origin, row: partial, expected: { kind: 'Unknown' } })
      fixtures.push({ name: 'selected_' + origin, row: partial, expected: { kind: 'Null' } })
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
      'compositeinheritance',
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
