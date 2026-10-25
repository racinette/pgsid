import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves captured temporal payloads and binary output across row evolution and lazy composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-temporal-evolution-')),
    artifact = 'artifacts/goal-checks/temporal-row-constants-active'
  try {
    await pg.exec(`CREATE TYPE ip AS(n int4,old int4);`)
    const literals: Record<string, [string, string]> = {
        date: ["DATE '2001-02-03'", 'date_send'],
        date_min: ["DATE '4714-11-24 BC'", 'date_send'],
        date_infinite: ["DATE '-infinity'", 'date_send'],
        timestamp: ["TIMESTAMP '1999-12-31 23:59:59.999999'", 'timestamp_send'],
        timestamp_max: ["TIMESTAMP '294276-12-31 23:59:59.999999'", 'timestamp_send'],
        timestamp_infinite: ["TIMESTAMP 'infinity'", 'timestamp_send'],
        instant: ["TIMESTAMPTZ '2001-02-03 04:05:06.123456+03:02'", 'timestamptz_send'],
        instant_infinite: ["TIMESTAMPTZ '-infinity'", 'timestamptz_send'],
        clock: ["TIME '12:34:56.123456'", 'time_send'],
        midnight: ["TIME '24:00:00'", 'time_send'],
        offset: ["TIMETZ '12:34:56.123456-05:30'", 'timetz_send'],
        wide_offset: ["TIMETZ '24:00:00+15:59:59'", 'timetz_send'],
        duration: ["INTERVAL '-1 month 2 days -03:04:05.000006'", 'interval_send'],
        duration_infinite: ["INTERVAL 'infinity'", 'interval_send'],
        duration_negative_infinite: ["INTERVAL '-infinity'", 'interval_send'],
      },
      forms: Record<string, string> = {},
      wires: Record<string, string> = {}
    for (const [name, [literal, send]] of Object.entries(literals)) {
      forms[name] =
        `ROW(n,CASE WHEN ${send}(${literal})=expected THEN 1/d ELSE NULL::int4 END)::ip IS NOT NULL`
      wires[name] = (
        await pg.query<{ wire: string }>(`SELECT encode(${send}(${literal}),'hex') wire`)
      ).rows[0]!.wire
    }
    for (const [name, expression] of Object.entries(forms))
      for (const witness of [false, true])
        await pg.exec(`CREATE TABLE ${witness ? 'null_' : 'evolving_'}${name}(n int4,d int4,expected bytea,bypass bool,
          CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${expression} END${witness ? ') IS NULL' : ''}))`)
    await pg.exec(`ALTER TYPE ip DROP ATTRIBUTE old;SET DateStyle='SQL, DMY';
      SET IntervalStyle='postgres_verbose';SET TimeZone='Asia/Kathmandu';`)
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
      for (const [n, d] of [
        [1, 1],
        [1, 0],
        [0, 0],
        [null, null],
        [-1, 1],
        [null, 0],
      ] as const)
        for (const wrongWire of [false, true])
          for (const bypass of [false, true]) {
            const bytes = Buffer.from(wires[name]!, 'hex')
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
                await pg.query(`INSERT INTO null_${name} VALUES($1,$2,$3,$4)`, [
                  n,
                  d,
                  bytes,
                  bypass,
                ])
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
                expected: { kind: 'Value', value: bytes.toString('hex') },
                bypass: known(bypass),
              }
            reference.push({ name, n, d, wrongWire, bypass, expected })
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
            d: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            expected: { kind: 'Unknown' },
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
      'example.com/row-temporal-evolution',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)

it('prepares reached temporal constant errors while pruning dead temporal expressions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-temporal-storage-preparation-')),
    artifact = 'artifacts/goal-checks/temporal-row-constants-active'
  try {
    await pg.exec('CREATE TYPE pair AS(n int4,old int4);CREATE TYPE span AS(n int4,old interval)')
    const forms = {
      date: "ROW(n,DATE 'infinity'-DATE 'infinity')::pair IS NOT NULL",
      timestamp: "ROW(n,TIMESTAMP 'infinity'-TIMESTAMP 'infinity')::span IS NOT NULL",
      interval: "ROW(n,INTERVAL 'infinity'-INTERVAL 'infinity')::span IS NOT NULL",
      pruned:
        "CASE WHEN true THEN true ELSE ROW(n,DATE 'infinity'-DATE 'infinity')::pair IS NOT NULL END",
    }
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE prepared_${name}(n int4,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE ${expression} END))`,
      )
    await pg.exec('ALTER TYPE pair DROP ATTRIBUTE old;ALTER TYPE span DROP ATTRIBUTE old')
    const c = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, expression]) => {
        const t = c.tables.find((t) => t.name === 'prepared_' + name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const check of group.checks) expect(check.kind).toBe('supported')
    for (const name of Object.keys(forms))
      for (const n of [1, null])
        for (const bypass of [false, true]) {
          let error: string | undefined
          try {
            await pg.query(`INSERT INTO prepared_${name} VALUES($1,$2)`, [n, bypass])
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (name === 'pruned') expect(error).toBeUndefined()
          else expect(error, name).toBeDefined()
          const expected: Outcome = error
              ? { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: 'True' },
            row: Row = {
              n: n === null ? { kind: 'Null' } : { kind: 'Value', value: n },
              bypass: { kind: 'Value', value: bypass },
            }
          native.push({ name, n, bypass, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
        }
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'preparation-native.json'),
      JSON.stringify(native, null, 2) + '\n',
    )
    await writeFile(
      join(artifact, 'preparation-fixtures.json'),
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'example.com/temporal-storage-preparation',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
