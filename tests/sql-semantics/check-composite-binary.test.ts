import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readCompositeFixture } from './check-composite-fixtures.js'

it('keeps record binary output independent of deployment OIDs, with portable empty frames, NULLs, errors and internal receive classification', async () => {
  const pg = await PGlite.create(),
    second = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-binary-')),
    artifact = 'artifacts/goal-checks/composite-binary-active'
  try {
    const schema = `CREATE TYPE phase AS ENUM('red','blue');CREATE TYPE packet AS(tag phase,n int4);
CREATE TYPE vacant AS();CREATE DOMAIN required_vacant AS vacant NOT NULL;
CREATE TYPE erased AS(old json);ALTER TYPE erased DROP ATTRIBUTE old;`
    await pg.exec(schema)
    await second.exec("CREATE TYPE shifted AS ENUM('extra');" + schema)
    const headers = []
    for (const db of [pg, second]) {
      const row = (
        await db.query<{
          oid: number
          nulls: string
          value: string
          empty: string
          erased: string
        }>(
          `SELECT 'phase'::regtype::oid::int oid,encode(record_send(ROW(NULL::phase,NULL::int4)::packet),'hex') nulls,encode(record_send(ROW('red'::phase,1)::packet),'hex') value,encode(record_send(ROW()::vacant),'hex') empty,encode(record_send(ROW()::erased),'hex') erased`,
        )
      ).rows[0]!
      expect(Buffer.from(row.nulls, 'hex').readInt32BE(0)).toBe(2)
      expect(Buffer.from(row.nulls, 'hex').readUInt32BE(4)).toBe(row.oid)
      expect(Buffer.from(row.nulls, 'hex').readInt32BE(8)).toBe(-1)
      expect(Buffer.from(row.value, 'hex').readUInt32BE(4)).toBe(row.oid)
      expect(row.empty).toBe('00000000')
      expect(row.erased).toBe(row.empty)
      headers.push(row)
    }
    expect(headers[0]!.oid).not.toBe(headers[1]!.oid)
    expect(headers[0]!.nulls).not.toBe(headers[1]!.nulls)
    expect(headers[0]!.value).not.toBe(headers[1]!.value)
    const forms: Record<
      string,
      { sql: string; context?: (sample: { record: string; pick: boolean }) => boolean }
    > = {
      root: { sql: 'record_send(value) IS NULL', context: (s) => s.record !== 'NULL::packet' },
      named: { sql: `encode(record_send(ROW()::vacant),'hex') IS NOT DISTINCT FROM expected` },
      erased: { sql: `encode(record_send(ROW()::erased),'hex') IS NOT DISTINCT FROM expected` },
      anonymous: { sql: `encode(record_send(ROW()),'hex') IS NOT DISTINCT FROM expected` },
      selected: {
        sql: `encode(record_send(CASE WHEN pick THEN ROW() ELSE ROW(n) END),'hex') IS NOT DISTINCT FROM expected`,
        context: (s) => !s.pick,
      },
      null_datum: { sql: 'record_send(NULL::record) IS NULL' },
      nullable: { sql: 'record_send(CASE WHEN pick THEN ROW()::vacant END) IS NULL' },
      fallback: {
        sql: 'record_send(COALESCE(CASE WHEN pick THEN NULL::vacant END,ROW()::vacant)) IS NULL',
      },
      nested: { sql: 'record_send(ROW(value)) IS NULL', context: () => true },
      divided: { sql: 'record_send(ROW(n/divisor)) IS NULL', context: () => true },
      wrapped: { sql: 'cardinality(ARRAY[record_send(ROW(n/divisor))])=1', context: () => true },
      wrapped_empty: { sql: 'cardinality(ARRAY[record_send(ROW())])=1' },
      input_cast: {
        sql: `encode(record_send(source::vacant),'hex') IS NOT DISTINCT FROM expected`,
      },
      required: {
        sql: 'record_send((CASE WHEN pick THEN NULL::vacant ELSE ROW()::vacant END)::required_vacant) IS NULL',
      },
      empty_array: {
        sql: `encode(record_send((ARRAY[ROW()::vacant,NULL::vacant])[CASE WHEN pick THEN 1 ELSE 2 END]),'hex') IS NOT DISTINCT FROM expected`,
      },
      empty_byte: { sql: 'get_byte(record_send(ROW()),3)=0' },
    }
    const columns =
      'value packet,n int4,divisor int4,source text,expected text,pick bool,bypass bool'
    for (const db of [pg, second])
      for (const [name, form] of Object.entries(forms))
        await db.exec(
          `CREATE TABLE gate_${name}(${columns},CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE ${form.sql} END));`,
        )
    await pg.exec(`CREATE TABLE oracle(${columns});`)
    const catalogs = await Promise.all([snapshotCatalog(pg), snapshotCatalog(second)]),
      groups = catalogs.map((catalog) => {
        const plans = Object.entries(forms).flatMap(([name, form]) => {
          const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
            constraint = table.constraints[0]!
          return (['source', 'stored'] as const).map((origin) => ({
            name: name + '_' + origin,
            identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
            expression: portableCheckAtoms(
              lowerTableCheck(
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
            ),
          }))
        })
        return {
          plans,
          group: prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
        }
      }),
      { plans, group } = groups[0]!
    expect(group.evaluatorSource).toBe(groups[1]!.group.evaluatorSource)
    expect(group.checks).toEqual(groups[1]!.group.checks)
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const rootCheck = group.checks[0]!
    if (rootCheck.kind !== 'supported') throw Error('Missing root check')
    const recordType = rootCheck.inputs.find((i) => i.name === 'value')!.type,
      known = (v: string | number | boolean | null) =>
        v === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value: v },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      { record: 'NULL::packet', n: null, divisor: 0, source: null, pick: true },
      { record: 'ROW(NULL,NULL)::packet', n: null, divisor: 0, source: '()', pick: false },
      { record: `ROW('red',2)::packet`, n: 2, divisor: 1, source: '()', pick: true },
      { record: `ROW('blue',3)::packet`, n: 3, divisor: 0, source: '()', pick: false },
      { record: 'NULL::packet', n: 7, divisor: 2, source: '(x)', pick: true },
    ]
    for (const sample of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${sample.record},$1,$2,$3,NULL,$4,false`, [
        sample.n,
        sample.divisor,
        sample.source,
        sample.pick,
      ])
      const payload = await readCompositeFixture(
          pg,
          'SELECT value FROM oracle',
          'value',
          recordType,
        ),
        row: Row = {
          value: payload ? { kind: 'Value', value: payload } : known(null),
          n: known(sample.n),
          divisor: known(sample.divisor),
          source: known(sample.source),
          pick: known(sample.pick),
        }
      for (const [name, form] of Object.entries(forms))
        for (const bypass of [false, true])
          for (const expectedText of ['00000000', 'wrong', null]) {
            let output: boolean | null = null,
              error: string | undefined
            try {
              output = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN $1::bool THEN true ELSE ${form.sql} END value FROM (SELECT value,n,divisor,source,$2::text expected,pick FROM oracle) o`,
                  [bypass, expectedText],
                )
              ).rows[0]!.value
            } catch (e) {
              error = (e as { code: string }).code
            }
            const native: Outcome = error
                ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                : { kind: output === null ? 'Null' : output ? 'True' : 'False' },
              expected: Outcome =
                !bypass && !error && form.context?.(sample) ? { kind: 'Unknown' } : native,
              insert = pg.query(
                `INSERT INTO gate_${name} SELECT value,n,divisor,source,$1,pick,$2 FROM oracle`,
                [expectedText, bypass],
              )
            if (error || output === false)
              await expect(insert).rejects.toMatchObject({ code: error ?? '23514' })
            else await insert
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, bypass: known(bypass), expected: known(expectedText) },
                expected,
              })
            references.push({ name, sample, bypass, expectedText, native, expected })
          }
    }
    for (const origin of ['source', 'stored']) {
      const base: Row = {
        value: { kind: 'Unknown' },
        n: known(1),
        divisor: known(1),
        source: known('()'),
        expected: known('00000000'),
        pick: known(true),
        bypass: known(false),
      }
      fixtures.push({ name: 'root_' + origin, row: base, expected: { kind: 'Unknown' } })
      fixtures.push({
        name: 'root_' + origin,
        row: { ...base, value: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
      fixtures.push({
        name: 'root_' + origin,
        row: { ...base, bypass: known(true) },
        expected: { kind: 'True' },
      })
    }
    expect(
      builtinCallables().find((i) => i.kind === 'function' && i.name === 'record_recv'),
    ).toMatchObject({
      args: ['pg_catalog.internal', 'pg_catalog.oid', 'pg_catalog.int4'],
      result: 'pg_catalog.record',
    })
    await expect(pg.query('SELECT record_recv(NULL::internal,0,0)')).rejects.toMatchObject({
      code: '42846',
    })
    await expect(pg.query("SELECT '(1)'::record")).rejects.toMatchObject({ code: '0A000' })
    await runCheckParity(
      root,
      'compositebinary',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: references.length, headers, references },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await second.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
