import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('preserves omitted physical row expressions through preparation, live consumers and row NULL tests after type evolution', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-evolution-')),
    artifact = 'artifacts/goal-checks/row-evolution-active'
  try {
    await pg.exec(`CREATE TYPE pair AS(a int4,old int4);
CREATE TYPE head AS(old int4,a int4);
CREATE TYPE middle AS(a int4,old int4,c int4);
CREATE TYPE vacant AS(old int4);
CREATE TYPE boolpair AS(a int4,old bool);
CREATE TYPE widepair AS(a int4,old int8);
CREATE TYPE smallpair AS(a int4,old int2);
CREATE TYPE growing AS(a int4);`)
    const forms: Record<string, string> = {
      grown: 'ROW(n)::growing IS NOT NULL',
      json_null_test: "to_jsonb(ROW(n,n/d)::pair IS NOT NULL)='true'::jsonb",
      array_null_test: 'cardinality(ARRAY[ROW(n,n/d)::pair IS NOT NULL])=1',
      nested_null_test: '(ROW(ROW(n,n/d)::pair IS NOT NULL)).f1 IS NOT NULL',
      present: 'ROW(n,n/d)::pair IS NOT NULL',
      absent: 'ROW(n,n/d)::pair IS NULL',
      hidden_value: 'ROW(n,42)::pair IS NOT NULL',
      hidden_null: 'ROW(n,NULL::int4)::pair IS NOT NULL',
      field: '(ROW(n,n/d)::pair).a>=1',
      datum: 'ROW(n,n/d)::pair IS DISTINCT FROM NULL',
      text: "(ROW(n,n/d)::pair)::text='(1)'",
      json: "to_jsonb(ROW(n,n/d)::pair)='{" + '"a":1' + "}'::jsonb",
      equal: 'ROW(n,n/d)::pair = ROW(1,1)::pair',
      array: 'cardinality(ARRAY[ROW(n,n/d)::pair])=1',
      hash: 'hash_record(ROW(n,n/d)::pair)=hash_record(ROW(n))',
      nested: 'to_jsonb(ROW(ROW(n,n/d)::pair))->0 IS NULL',
      function: 'ROW(n,abs(n/d))::pair IS NOT NULL',
      coalesce: 'ROW(n,COALESCE(n/d,1))::pair IS NOT NULL',
      choice: 'ROW(n,CASE WHEN pick THEN n/d ELSE NULL::int4 END)::pair IS NOT NULL',
      head: 'ROW(n/d,n)::head IS NOT NULL',
      head_null: 'ROW(n/d,n)::head IS NULL',
      head_field: '(ROW(n/d,n)::head).a>=1',
      middle: 'ROW(n,n/d,1)::middle IS NOT NULL',
      middle_field: '(ROW(n,n/d,1)::middle).a>=1',
      middle_json: "to_jsonb(ROW(n,n/d,1)::middle)->'new'='null'::jsonb",
      middle_constant: 'ROW(1,1,1)::middle IS NOT NULL',
      empty: 'ROW(n/d)::vacant IS NOT NULL',
      empty_null: 'ROW(n/d)::vacant IS NULL',
      empty_text: "ROW(n/d)::vacant::text='()'",
      boolean: 'ROW(n,n/d>0)::boolpair IS NOT NULL',
      boolean_const: 'ROW(n,false)::boolpair IS NOT NULL',
      small_const: 'ROW(n,(-32768)::int2)::smallpair IS NOT NULL',
      wide_const: "ROW(n,'-9223372036854775808'::int8)::widepair IS NOT NULL",
      boolean_logic: 'ROW(n,pick AND n/d>0)::boolpair IS NOT NULL',
      wide: 'ROW(n,n::int8/d::int8)::widepair IS NOT NULL',
      prepared: '(ROW(n,1/0)::pair).a>=1',
      prepared_text: 'ROW(n,1/0)::pair::text IS NOT NULL',
      prepared_json: 'to_jsonb(ROW(n,1/0)::pair) IS NOT NULL',
      prepared_null: 'ROW(n,1/0)::pair IS NOT NULL',
      pruned: 'CASE WHEN true THEN true ELSE ROW(n,1/0)::pair IS NOT NULL END',
      constant_drop_null: 'ROW(1,NULL::int4)::pair IS NOT NULL',
    }
    for (const [name, expression] of Object.entries(forms)) {
      await pg.exec(`CREATE TABLE evolving_${name}(n int4,d int4,pick bool,bypass bool,
        CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${expression} END))`)
      await pg.exec(`CREATE TABLE null_${name}(n int4,d int4,pick bool,bypass bool,
        CONSTRAINT valid CHECK((CASE WHEN bypass THEN true ELSE ${expression} END) IS NULL))`)
    }
    await pg.exec(`ALTER TYPE pair DROP ATTRIBUTE old;ALTER TYPE head DROP ATTRIBUTE old;
ALTER TYPE middle DROP ATTRIBUTE old;ALTER TYPE middle ADD ATTRIBUTE new int4;
ALTER TYPE vacant DROP ATTRIBUTE old;ALTER TYPE boolpair DROP ATTRIBUTE old;
ALTER TYPE widepair DROP ATTRIBUTE old;ALTER TYPE smallpair DROP ATTRIBUTE old;ALTER TYPE growing ADD ATTRIBUTE b int4;`)
    forms.current_grown = 'ROW(n,NULL)::growing IS NOT NULL'
    await pg.exec(`CREATE TABLE evolving_current_grown(n int4,d int4,pick bool,bypass bool,
      CHECK(CASE WHEN bypass THEN true ELSE ${forms.current_grown} END));
      CREATE TABLE null_current_grown(n int4,d int4,pick bool,bypass bool,
      CHECK((CASE WHEN bypass THEN true ELSE ${forms.current_grown} END) IS NULL));`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'evolving_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete ?? true, name).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext ?? null)).not.toMatch(/"\w*oid\w*":/iu)
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
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    for (const [i, p] of plans.entries()) {
      expect(uncertain(p.expression), p.name).toBe(false)
      expect(group.checks[i]!.kind, p.name).toBe('supported')
    }
    const known = (value: number | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = [],
      samples = [
        { n: 0, d: 0, pick: true },
        { n: 1, d: 0, pick: false },
        { n: 1, d: 1, pick: true },
        { n: null, d: 0, pick: true },
        { n: -2, d: 1, pick: false },
        { n: 2, d: null, pick: null },
      ]
    for (const [name] of Object.entries(forms))
      for (const sample of samples)
        for (const bypass of [false, true]) {
          let error: string | undefined
          try {
            await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3,$4)`, [
              sample.n,
              sample.d,
              sample.pick,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
          }
          let nullResult = false
          if (!error) {
            try {
              await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4)`, [
                sample.n,
                sample.d,
                sample.pick,
                bypass,
              ])
              nullResult = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          }
          const expected: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: nullResult ? 'Null' : 'True' },
            row: Row = {
              n: known(sample.n),
              d: known(sample.d),
              pick: known(sample.pick),
              bypass: known(bypass),
            }
          reference.push({ name, ...sample, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
    for (const [name] of Object.entries(forms))
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            pick: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: name.startsWith('prepared')
            ? { kind: 'Error', value: { state: parseInt('22012', 36) } }
            : { kind: 'True' },
        })
      }
    await writeFile(
      join(artifact, 'native-reference.json'),
      JSON.stringify(reference, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
