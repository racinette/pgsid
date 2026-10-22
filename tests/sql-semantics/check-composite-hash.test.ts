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

it('hashes captured and anonymous record fields in order with wrapping seeds, nested callbacks, missing support and NULLs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-hash-')),
    artifact = 'artifacts/goal-checks/composite-hash-active'
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');CREATE TYPE pair AS(n int4,label text COLLATE "C");CREATE TYPE leaf AS(n int4,obsolete json,label text COLLATE "C",flag bool,amount numeric,bag int4[],period int4range,doc jsonb,phase phase);ALTER TYPE leaf DROP ATTRIBUTE obsolete;
CREATE TYPE nested AS(first leaf,other leaf);CREATE TYPE bad AS(n int4,document json);CREATE TYPE no_fields AS();`)
    const forms: Record<string, { sql: string; requiresEnum?: boolean; constantError?: boolean }> =
      {
        row: { sql: 'hash_record(value)::text', requiresEnum: true },
        extended: { sql: 'hash_record_extended(value,seed)::text', requiresEnum: true },
        nested: { sql: 'hash_record(ROW(value,value)::nested)::text', requiresEnum: true },
        nested_extended: {
          sql: 'hash_record_extended(ROW(value,NULL::leaf)::nested,seed)::text',
          requiresEnum: true,
        },
        anonymous: { sql: 'hash_record(ROW(n,label,flag))::text' },
        anonymous_extended: { sql: 'hash_record_extended(ROW(n,label,flag),seed)::text' },
        child: { sql: 'hash_record(ROW(ROW(n,label),ROW(flag)))::text' },
        array: { sql: 'hash_record(ROW(ARRAY[n,2,NULL],period))::text' },
        array_extended: { sql: 'hash_record_extended(ROW(ARRAY[n,2,NULL],period),seed)::text' },
        selected: { sql: 'hash_record(CASE WHEN pick THEN ROW(n,label) ELSE ROW(flag) END)::text' },
        empty: { sql: 'hash_record(ROW()::no_fields)::text' },
        empty_extended: { sql: 'hash_record_extended(ROW(),seed)::text' },
        missing: { sql: 'hash_record(ROW(n,NULL::json)::bad)::text' },
        missing_extended: { sql: 'hash_record_extended(ROW(n,NULL::json)::bad,seed)::text' },
        missing_parent: { sql: 'hash_record(ROW(NULL::bad))::text', constantError: true },
        missing_unknown_type: { sql: 'hash_record(ROW(NULL))::text', constantError: true },
        record_array: { sql: 'hash_array(ARRAY[value,NULL::leaf])::text', requiresEnum: true },
        record_array_extended: {
          sql: 'hash_array_extended(ARRAY[value,NULL::leaf],seed)::text',
          requiresEnum: true,
        },
        array_record: {
          sql: 'hash_record(ROW(ARRAY[value,NULL::leaf]))::text',
          requiresEnum: true,
        },
        pair_array: { sql: 'hash_array(ARRAY[ROW(n,label)::pair,NULL::pair])::text' },
        pair_array_extended: {
          sql: 'hash_array_extended(ARRAY[ROW(n,label)::pair,NULL::pair],seed)::text',
        },
        missing_array: { sql: 'hash_array(ARRAY[ROW(n,NULL::json)::bad])::text' },
        empty_missing_array: { sql: 'hash_array(ARRAY[]::bad[])::text', constantError: true },
        anonymous_array: { sql: 'hash_array(ARRAY[ROW(n,label)])::text' },
        null_record: { sql: 'hash_record(NULL::record)::text' },
        coalesced: {
          sql: 'hash_record(COALESCE(CASE WHEN pick THEN ROW(n,label) END,ROW(flag)))::text',
        },
      }
    for (const [name, form] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(value leaf,n int4,label text COLLATE "C",flag bool,period int4range,seed int8,pick bool,skip bool,expected text,CONSTRAINT valid CHECK(CASE WHEN skip THEN true ELSE (${form.sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    await pg.exec(
      'CREATE TABLE oracle(value leaf,n int4,label text COLLATE "C",flag bool,period int4range,seed int8,pick bool)',
    )
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(forms).flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...constraint,
                  definition: `CHECK(CASE WHEN skip THEN true ELSE (${forms[name]!.sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`,
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
      JSON.stringify({ plans, checks: group.checks }, null, 2),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const recordCheck = group.checks[0]!
    if (recordCheck.kind !== 'supported') throw Error('Missing record check')
    const recordType = recordCheck.inputs.find((i) => i.name === 'value')!.type
    const known = (v: string | number | boolean | bigint | null) =>
      v === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value: v }
    const samples = [
      {
        record: 'NULL::leaf',
        n: null,
        label: null,
        flag: null,
        seed: null,
        pick: true,
        enum: false,
      },
      {
        record: 'ROW(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)::leaf',
        n: 0,
        label: '',
        flag: false,
        seed: 0n,
        pick: false,
        enum: false,
      },
      {
        record: `ROW(2,'snow😊',true,1.2300,ARRAY[1,NULL,2],'[1,3)'::int4range,'{"a":1}'::jsonb,NULL)::leaf`,
        n: 2,
        label: 'snow😊',
        flag: true,
        seed: 1n,
        pick: true,
        enum: false,
      },
      {
        record: `ROW(-2147483648,'abc',false,-1.20,ARRAY[]::int4[],'empty'::int4range,'{}'::jsonb,NULL)::leaf`,
        n: -2147483648,
        label: 'abc',
        flag: false,
        seed: -9223372036854775808n,
        pick: false,
        enum: false,
      },
      {
        record: `ROW(2147483647,'hi',true,0,ARRAY[-1,2],'(,)'::int4range,'[]'::jsonb,NULL)::leaf`,
        n: 2147483647,
        label: 'hi',
        flag: true,
        seed: 9223372036854775807n,
        pick: true,
        enum: false,
      },
      {
        record: `ROW(1,NULL,NULL,NULL,NULL,NULL,NULL,'z')::leaf`,
        n: 1,
        label: null,
        flag: null,
        seed: 0n,
        pick: false,
        enum: true,
      },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const sample of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(
        `INSERT INTO oracle SELECT ${sample.record},$1,$2,$3,'[1,3)'::int4range,$4,$5`,
        [sample.n, sample.label, sample.flag, sample.seed?.toString() ?? null, sample.pick],
      )
      const payload = await readCompositeFixture(
        pg,
        'SELECT value FROM oracle',
        'value',
        recordType,
      )
      const row: Row = {
        value: payload ? { kind: 'Value', value: payload } : known(null),
        n: known(sample.n),
        label: known(sample.label),
        flag: known(sample.flag),
        seed: known(sample.seed),
        pick: known(sample.pick),
      }
      const periodCheck = group.checks.find(
        (c) => c.kind === 'supported' && c.inputs.some((i) => i.name === 'period'),
      )!
      if (periodCheck.kind !== 'supported') throw Error('Missing period check')
      const { readRangeFixture } = await import('./check-range-fixtures.js')
      row.period = {
        kind: 'Value',
        value: (await readRangeFixture(
          pg,
          'SELECT period FROM oracle',
          'period',
          'pg_catalog.int4range',
        ))!,
      }
      for (const [name, form] of Object.entries(forms)) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ${form.sql} value FROM oracle`)
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const skip of [false, true])
          for (const wrong of [false, true]) {
            const expectedText = wrong ? 'wrong' : output,
              eagerError = error && form.constantError,
              code = eagerError
                ? error
                : skip
                  ? undefined
                  : (error ?? (wrong ? '23514' : undefined))
            const insert = pg.query(
              `INSERT INTO gate_${name} SELECT value,n,label,flag,period,seed,pick,$1,$2 FROM oracle`,
              [skip, expectedText],
            )
            if (code) await expect(insert).rejects.toMatchObject({ code })
            else await insert
            const expected: Outcome = eagerError
              ? { kind: 'Error', value: { state: parseInt(error!, 36) } }
              : skip
                ? { kind: 'True' }
                : error
                  ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                  : form.requiresEnum && sample.enum
                    ? { kind: 'Unknown' }
                    : wrong
                      ? { kind: 'False' }
                      : { kind: 'True' }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, skip: known(skip), expected: known(expectedText) },
                expected,
              })
            reference.push({
              name,
              record: sample.record,
              seed: sample.seed?.toString() ?? null,
              skip,
              wrong,
              output,
              error,
              expected,
            })
          }
      }
    }
    await runCheckParity(
      root,
      'compositehash',
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
}, 600_000)
