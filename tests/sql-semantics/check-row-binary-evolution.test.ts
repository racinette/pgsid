import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves captured binary and UUID constants across row evolution and lazy composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-binary-evolution-')),
    artifact = 'artifacts/goal-checks/binary-row-constants-active'
  try {
    await pg.exec(`CREATE TYPE ip AS(n int4,old int4);CREATE TYPE bp AS(n int4,old bytea);
      CREATE TYPE up AS(n int4,old uuid);`)
    const forms: Record<string, string> = {
      binary: String.raw`ROW(n,'\x000180ff'::bytea)::bp IS NOT NULL`,
      empty: String.raw`ROW(n,'\x'::bytea)::bp IS NOT NULL`,
      uuid: "ROW(n,'01234567-89ab-cdef-8012-3456789abcde'::uuid)::up IS NOT NULL",
      gate: String.raw`ROW(n,CASE WHEN '\x000180ff'::bytea=payload THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`,
      uuid_gate:
        "ROW(n,CASE WHEN uuid_send('01234567-89ab-cdef-8012-3456789abcde'::uuid)=payload THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL",
      length: String.raw`ROW(n,octet_length('\x000180ff'::bytea)/d)::ip IS NOT NULL`,
      byte: String.raw`ROW(n,get_byte('\x000180ff'::bytea,n))::ip IS NOT NULL`,
      bit: String.raw`ROW(n,get_bit('\x000180ff'::bytea,n))::ip IS NOT NULL`,
      prepared: String.raw`ROW(n,get_byte('\x'::bytea,0))::ip IS NOT NULL`,
      pruned: String.raw`CASE WHEN true THEN true ELSE ROW(n,get_byte('\x'::bytea,0))::ip IS NOT NULL END`,
      instant: String.raw`ROW(n,CASE WHEN timestamptz_send(TIMESTAMPTZ '2001-02-03 04:05:06.123456+03:02')='\x00001f5b645a48c0'::bytea THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`,
      nan: String.raw`ROW(n,CASE WHEN float8send('NaN'::float8)='\x7ff8000000000000'::bytea THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`,
      uuid_wire: String.raw`ROW(n,CASE WHEN uuid_send('01234567-89ab-cdef-8012-3456789abcde'::uuid)='\x0123456789abcdef80123456789abcde'::bytea THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`,
      json: String.raw`to_jsonb(ROW(n,'\x000180ff'::bytea)::bp) IS NOT DISTINCT FROM jsonb_build_object('n',n)`,
      array: "cardinality(ARRAY[ROW(n,'01234567-89ab-cdef-8012-3456789abcde'::uuid)::up])=1",
      compare:
        "ROW(n,'00000000-0000-0000-0000-000000000000'::uuid)::up IS DISTINCT FROM ROW(d,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)::up",
    }
    const digest = (
      await pg.query<{ digest: string }>(
        String.raw`SELECT encode(sha256('\x000180ff'::bytea),'hex') digest`,
      )
    ).rows[0]!.digest
    forms.digest = String.raw`ROW(n,CASE WHEN sha256('\x000180ff'::bytea)='\x${digest}'::bytea THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`
    for (const [name, expression] of Object.entries(forms))
      for (const witness of [false, true])
        await pg.exec(`CREATE TABLE ${witness ? 'null_' : 'evolving_'}${name}(n int4,d int4,payload bytea,bypass bool,
          CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${expression} END${witness ? ') IS NULL' : ''}))`)
    await pg.exec(`ALTER TYPE ip DROP ATTRIBUTE old;ALTER TYPE bp DROP ATTRIBUTE old;
      ALTER TYPE up DROP ATTRIBUTE old;SET bytea_output='escape';`)
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
      for (const [n, d, wrongWire] of [
        [1, 1, false],
        [1, 2, false],
        [0, 0, false],
        [null, null, false],
        [-1, 1, false],
        [0, 0, true],
      ] as const)
        for (const bypass of [false, true]) {
          const bytes = Buffer.from(
            name === 'uuid_gate' ? '0123456789abcdef80123456789abcde' : '000180ff',
            'hex',
          )
          if (wrongWire) bytes[0] = bytes[0]! ^ 255
          let error: string | undefined,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${name} VALUES($1,$2,$3,$4)`, [
              n,
              d,
              bytes,
              bypass,
            ])
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error) {
            try {
              await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4)`, [n, d, bytes, bypass])
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
            row: Row = {
              n: known(n),
              d: known(d),
              payload: { kind: 'Value', value: bytes.toString('hex') },
              bypass: known(bypass),
            }
          reference.push({ name, n, d, bypass, wrongWire, expected })
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
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Unknown' },
            payload: { kind: 'Unknown' },
            bypass: known(true),
          },
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
      'example.com/row-binary-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
