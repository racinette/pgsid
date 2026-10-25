import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves hidden numeric constants, scale and selected coercions across row evolution and lazy composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-numeric-evolution-')),
    artifact = 'artifacts/goal-checks/numeric-row-constants-active'
  try {
    await pg.exec(`CREATE TYPE ip AS(n int4,old int4);CREATE TYPE np AS(n int4,old numeric);
      CREATE TYPE sp AS(n int4,old int2);CREATE TYPE wp AS(n int4,old int8);`)
    const forms: Record<string, string> = {
      mixed: 'ROW(n,1.25)::ip IS DISTINCT FROM ROW(m,1.25)::np',
      positive_half: 'ROW(n,2.5000)::ip IS NOT DISTINCT FROM ROW(m,2.5)::np',
      negative_half: 'ROW(n,-1.5000)::ip IS DISTINCT FROM ROW(m,-1.50)::np',
      short_error: 'ROW(n,32767.5)::sp IS DISTINCT FROM ROW(m,0)::np',
      wide: 'ROW(n,9223372036854775807.4)::wp IS DISTINCT FROM ROW(m,9223372036854775807.400)::np',
      wide_error: 'ROW(n,9223372036854775807.5)::wp IS DISTINCT FROM ROW(m,0)::np',
      modifier: 'ROW(n,1.235::numeric(4,2))::np IS DISTINCT FROM ROW(m,1.24)::np',
      mixed_array: 'cardinality(ARRAY[ROW(n,1.25)::ip IS DISTINCT FROM ROW(m,1.25)::np])=1',
      mixed_json: "to_jsonb(ROW(n,1.25)::ip IS DISTINCT FROM ROW(m,1.25)::np)='true'::jsonb",
      removed: 'ROW(n,1.2500)::np IS NOT NULL',
      removed_scale: 'ROW(n,scale(1.2500)/n)::ip IS NOT NULL',
      removed_negative: 'ROW(n,scale(-1.2500)/n)::ip IS NOT NULL',
      removed_long: 'ROW(n,scale(1e-260)/n)::ip IS NOT NULL',
      removed_nan: "ROW(n,'NaN'::numeric)::np IS NOT NULL",
      removed_infinity: "ROW(n,'-Infinity'::numeric)::np IS NOT NULL",
      removed_error: "ROW(n,'Infinity'::numeric::int4)::ip IS NOT NULL",
      removed_json: "to_jsonb(ROW(n,1.2500)::np) IS NOT DISTINCT FROM jsonb_build_object('n',n)",
    }
    for (const [name, expression] of Object.entries(forms))
      for (const witness of [false, true])
        await pg.exec(`CREATE TABLE ${witness ? 'null_' : 'evolving_'}${name}(n int4,m int4,bypass bool,
          CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${expression} END${witness ? ') IS NULL' : ''}))`)
    await pg.exec(`ALTER TYPE ip DROP ATTRIBUTE old;ALTER TYPE np DROP ATTRIBUTE old;
      ALTER TYPE sp DROP ATTRIBUTE old;ALTER TYPE wp DROP ATTRIBUTE old;`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'evolving_' + name)!,
          constraint = table.constraints[0]!
        expect(constraint.rowCoercionContext?.complete, name).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
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
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name).toBe('supported')
    const known = (value: number | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const name of Object.keys(forms))
      for (const [n, m] of [
        [1, 1],
        [1, 2],
        [0, 0],
        [null, null],
        [-1, 1],
      ] as const)
        for (const bypass of [false, true]) {
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3)`, [n, m, bypass])
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error) {
            try {
              await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3)`, [n, m, bypass])
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          }
          const expected: Outcome = error
              ? error === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = { n: known(n), m: known(m), bypass: known(bypass) }
          reference.push({ name, n, m, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
    for (const name of Object.keys(forms))
      for (const origin of ['source', 'stored']) {
        const native = reference.find((r) => {
          const row = r as { name: string; n: number; bypass: boolean }
          return row.name === name && row.n === 1 && row.bypass
        }) as { expected: Outcome }
        fixtures.push({
          name: name + '_' + origin,
          row: { n: { kind: 'Unknown' }, m: { kind: 'Unknown' }, bypass: known(true) },
          expected: native.expected,
        })
      }
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      join(artifact, 'native-reference.json'),
      JSON.stringify(reference, null, 2) + '\n',
    )
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
    await runCheckParity(
      root,
      'example.com/row-numeric-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
