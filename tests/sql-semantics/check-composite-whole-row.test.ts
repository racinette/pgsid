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
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { WorldCheckOracles } from './check-world-oracles.js'

const uncertain = (x: unknown): boolean =>
  !!x &&
  typeof x === 'object' &&
  (('kind' in x && x.kind === 'uncertain') ||
    Object.entries(x).some(
      ([key, value]) =>
        key !== 'type' && (Array.isArray(value) ? value.some(uncertain) : uncertain(value)),
    ))

it('evaluates named whole-table rows, forced stars, fields, dropped attributes and owned composition with native row identity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-whole-row-')),
    artifact = 'artifacts/goal-checks/composite-whole-row-active',
    oracles = new WorldCheckOracles()
  try {
    const forms: Record<string, string> = {
        json: "(to_jsonb($T)->>'n')::int4>=1",
        star: "(to_jsonb($T.*)->>'n')::int4>=1",
        qualified_star: "(to_jsonb(public.$T.*)->>'n')::int4>=1",
        field: '($T).n>=1',
        qualified_field: 'public.$T.n>=1',
        function_field: 'n($T)>=1',
        function_star: 'n($T.*)>=1',
        computed: '$T.to_jsonb IS NOT NULL',
        indirect_computed: '($T).to_jsonb IS NOT NULL',
        nullness: '$T IS NULL',
        present: '$T.* IS NOT NULL',
        datum: '$T.* IS DISTINCT FROM NULL',
        expanded: "(to_jsonb(ROW($T.*))->>'f1')::int4>=1",
        equality: '$T IS NOT DISTINCT FROM ROW(n,label,tag,vals,p,divisor,pick,bypass)::$T',
        output: 'length($T::text)>0',
        array: 'cardinality(ARRAY[$T,$T.*])=2',
        fetched: '((ARRAY[$T])[1]).n>=1',
        casted_null: 'ROW($T.*)::$T IS NOT NULL',
        constructor: 'to_jsonb(ROW($T.*,1/divisor)) IS NOT NULL',
        discarded: '(ROW($T.*,1/divisor)).f1>=1',
        prepared: '(ROW($T.*,1/0)).f1>=1',
        nested: '(($T).p).n>=1',
        ancestor: '($T::owner_base).n>=1',
        ancestor_json:
          '(to_jsonb($T::owner_base)->>\'label\') COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C"',
      },
      columns =
        'n int4,old int4,label text COLLATE "C",tag phase,vals int4[],p pair,divisor int4,pick bool,bypass bool',
      names = 'n,label,tag,vals,p,divisor,pick,bypass',
      sqls = Object.fromEntries(
        Object.entries(forms).map(([name, sql]) => [name, sql.replaceAll('$T', 'gate_' + name)]),
      ),
      ddl =
        `CREATE TYPE phase AS ENUM('z','a');CREATE TYPE pair AS(n int4,label text COLLATE "C");CREATE TABLE owner_base(n int4,label text COLLATE "C");\n` +
        Object.entries(sqls)
          .map(
            ([name, sql]) => `CREATE TABLE gate_${name}(${columns}) INHERITS(owner_base);
          ALTER TABLE gate_${name} DROP COLUMN old;
          ALTER TABLE gate_${name} ADD CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${sql} END) NOT VALID;`,
          )
          .join('\n') +
        '\nCREATE TABLE vacant(CONSTRAINT valid CHECK(vacant IS NULL AND vacant IS NOT NULL AND vacant IS DISTINCT FROM NULL));'
    await oracles.load(pg, ddl, 'public')
    await pg.exec(`CREATE TABLE oracle(${columns});ALTER TABLE oracle DROP COLUMN old`)
    const c = await snapshotCatalog(pg),
      plans = [
        ...Object.entries(sqls).flatMap(([name, sql]) => {
          const t = c.tables.find((t) => t.name === 'gate_' + name)!,
            constraint = t.constraints[0]!
          return (['source', 'stored'] as const).map((origin) => ({
            name: name + '_' + origin,
            identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
            expression: lowerTableCheck(
              t,
              constraint,
              c.enums,
              c.domains,
              origin,
              c.rangeTypes,
              c.compositeTypeGraph,
              origin === 'source' ? `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` : undefined,
            )!.expression,
          }))
        }),
        ...(['source', 'stored'] as const).map((origin) => {
          const t = c.tables.find((t) => t.name === 'vacant')!
          return {
            name: 'empty_' + origin,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: 'empty',
              constraint: origin,
            },
            expression: lowerTableCheck(
              t,
              t.constraints[0]!,
              c.enums,
              c.domains,
              origin,
              c.rangeTypes,
              c.compositeTypeGraph,
              origin === 'source'
                ? 'CHECK(vacant IS NULL AND vacant IS NOT NULL AND vacant IS DISTINCT FROM NULL)'
                : undefined,
            )!.expression,
          }
        }),
      ],
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
      }),
      pairCheck = group.checks.find(
        (x) => x.kind === 'supported' && x.inputs.some((i) => i.name === 'p'),
      )!
    for (const [i, plan] of plans.entries()) {
      expect(uncertain(plan.expression), plan.name).toBe(false)
      expect(group.checks[i]!.kind, plan.name).toBe('supported')
    }
    if (pairCheck.kind !== 'supported') throw Error('Missing nested row input')
    const pairType = pairCheck.inputs.find((i) => i.name === 'p')!.type,
      known = (value: number | string | boolean | null) =>
        value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value },
      samples = [
        { n: null, label: null, tag: null, vals: null, p: 'NULL::pair', divisor: null, pick: null },
        { n: 0, label: '', tag: 'z', vals: [], p: 'ROW(NULL,NULL)::pair', divisor: 0, pick: false },
        {
          n: 3,
          label: 'ok',
          tag: 'z',
          vals: [3, null],
          p: "ROW(3,'ok')::pair",
          divisor: 1,
          pick: true,
        },
        {
          n: -1,
          label: 'snow😊',
          tag: 'a',
          vals: [-1],
          p: "ROW(-1,'x')::pair",
          divisor: 0,
          pick: false,
        },
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const s of samples) {
      await pg.exec('TRUNCATE oracle')
      const array =
        s.vals === null
          ? 'NULL::int4[]'
          : `ARRAY[${s.vals.map((n) => (n === null ? 'NULL' : n)).join(',')}]::int4[]`
      await pg.query(`INSERT INTO oracle(${names}) SELECT $1,$2,$3,${array},${s.p},$4,$5,false`, [
        s.n,
        s.label,
        s.tag,
        s.divisor,
        s.pick,
      ])
      const payload = await readCompositeFixture(pg, 'SELECT p FROM oracle', 'p', pairType),
        vals: OwnedArrayInputPayload | null =
          s.vals === null
            ? null
            : {
                elementType: 'pg_catalog.int4',
                elementKind: 2,
                dimensions: s.vals.length ? [{ lower: 1, length: s.vals.length }] : [],
                elements: s.vals.map((n) =>
                  n === null ? { kind: 'Null' } : { kind: 'Int4', value: n },
                ),
                nullBitmap: { kind: 'Value', value: s.vals.includes(null) },
              },
        row: Row = {
          n: known(s.n),
          label: known(s.label),
          tag: known(s.tag === null ? null : s.tag === 'z' ? 0 : 1),
          vals: vals ? { kind: 'Value', value: vals } : known(null),
          p: payload ? { kind: 'Value', value: payload } : known(null),
          divisor: known(s.divisor),
          pick: known(s.pick),
        }
      for (const bypass of [false, true, null]) {
        await pg.query('UPDATE oracle SET bypass=$1', [bypass])
        for (const name of Object.keys(sqls)) {
          let value: boolean | null = null,
            error: string | undefined
          try {
            value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${oracles.expression('public.gate_' + name + '.valid', 'candidate')} value FROM oracle AS candidate`,
              )
            ).rows[0]!.value
          } catch (e) {
            error = (e as { code: string }).code
          }
          const expected: Outcome = error
              ? { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            code = error ?? (expected.kind === 'False' ? '23514' : undefined),
            insert = pg.query(`INSERT INTO gate_${name}(${names}) SELECT ${names} FROM oracle`)
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
    }
    const partial: Row = {
      n: known(3),
      label: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      tag: known(null),
      vals: known(null),
      p: known(null),
      divisor: known(0),
      pick: known(false),
      bypass: known(false),
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({ name: 'field_' + origin, row: partial, expected: { kind: 'True' } })
      fixtures.push({ name: 'function_field_' + origin, row: partial, expected: { kind: 'True' } })
      fixtures.push({
        name: 'json_' + origin,
        row: partial,
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      })
      fixtures.push({
        name: 'field_' + origin,
        row: { ...partial, n: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
    }
    expect(
      (
        await pg.query<{ value: boolean }>(
          `SELECT ${oracles.expression('public.vacant.valid', 'candidate')} value FROM(SELECT 1) candidate`,
        )
      ).rows[0]!.value,
    ).toBe(true)
    await pg.exec('INSERT INTO vacant DEFAULT VALUES')
    for (const origin of ['source', 'stored'])
      fixtures.push({ name: 'empty_' + origin, row: {}, expected: { kind: 'True' } })
    reference.push({ name: 'empty', expected: { kind: 'True' } })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositewholerow',
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
