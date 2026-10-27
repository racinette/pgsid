import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  measureNonStrict,
  nonStrictValueRequirement,
} from '../../scripts/check-measurements/non-strict.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { writeReport } from '../../scripts/check-measurements/worlds.js'

it('inventories every non-strict scalar signature without treating source presence or state requirements as completion', async () => {
  const pg = await PGlite.create()
  try {
    const report = await measureNonStrict(pg)
    expect(new Set(report.callables.map((item) => item.identity)).size).toBe(
      report.callables.length,
    )
    expect(report.summary.representedSignatures).toBe(
      report.summary.sourcePresent +
        report.summary.missingWithStateRequirements +
        report.summary.portableImplementationGaps +
        report.summary.unclassifiedImplementationGaps,
    )
    expect(report.summary.unclassifiedImplementationGaps).toBe(0)
    expect(
      report.callables
        .filter((row) => row.classification === 'portable-implementation-gap')
        .map((row) => row.metadata.name)
        .sort(),
    ).toEqual(['int2_sum', 'int4_sum', 'int8_sum'])
    for (const row of report.callables.filter((row) => row.requirement)) {
      expect(row.requirement!.owner).toBe(
        'tests/sql-semantics/check-non-strict-measurements.test.ts',
      )
      for (const metadata of [
        { ...row.metadata, schema: 'custom' },
        { ...row.metadata, strict: true },
        { ...row.metadata, returnsSet: true },
        { ...row.metadata, result: 'custom.result' },
        { ...row.metadata, args: [...row.metadata.args, 'pg_catalog.bool'] },
      ])
        expect(nonStrictValueRequirement(metadata), row.identity).toBeNull()
    }
    expect(
      nonStrictValueRequirement(
        builtinMetadata('function:["pg_catalog","int4_sum"](pg_catalog.int8,pg_catalog.int4)'),
      ),
    ).toBeNull()
    await writeReport('check-non-strict', report)
  } finally {
    await pg.close()
  }
})

it('observes native type, collation and partition metadata requirements without exporting deployment OIDs', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA boundary_inventory;
      CREATE TYPE boundary_inventory.label AS ENUM ('ready');
      CREATE TABLE boundary_inventory.plain(i int);
      CREATE TABLE boundary_inventory.parts(i int) PARTITION BY HASH(i)`)
    const render = async () =>
      (
        await pg.query(`SELECT
      format_type('boundary_inventory.label'::regtype::oid,NULL) rendered,
      pg_typeof(NULL::boundary_inventory.label)::text typed_null,
      pg_collation_for(NULL::text COLLATE "C") explicit_c`)
      ).rows[0]!
    expect(await render()).toEqual({
      rendered: 'boundary_inventory.label',
      typed_null: 'boundary_inventory.label',
      explicit_c: '"C"',
    })
    await pg.exec('SET search_path=boundary_inventory')
    expect(await render()).toEqual({
      rendered: 'label',
      typed_null: 'label',
      explicit_c: '"C"',
    })
    expect(
      (
        await pg.query(`SELECT format_type(NULL,NULL) no_type,
      pg_collation_for(NULL::text) default_collation,
      pg_typeof(NULL::boundary_inventory.label)='boundary_inventory.label'::regtype same_local_identity`)
      ).rows[0],
    ).toEqual({ no_type: null, default_collation: '"default"', same_local_identity: true })
    await expect(pg.query('SELECT pg_collation_for(NULL::int)')).rejects.toMatchObject({
      code: '42804',
    })
    expect(
      (
        await pg.query(`SELECT satisfies_hash_partition('boundary_inventory.parts'::regclass,2,0,1)
      <>satisfies_hash_partition('boundary_inventory.parts'::regclass,2,1,1) exclusive_remainders`)
      ).rows[0],
    ).toEqual({ exclusive_remainders: true })
    await expect(
      pg.query(`SELECT satisfies_hash_partition('boundary_inventory.plain'::regclass,2,0,1)`),
    ).rejects.toMatchObject({ code: '22023' })
  } finally {
    await pg.close()
  }
})

it('observes statistics mutation and runtime record contents separately from captured record shape', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('BEGIN; CREATE TABLE boundary_stats(i int)')
    expect(
      (
        await pg.query(`SELECT pg_restore_relation_stats('schemaname','public','relname','boundary_stats',
      'relpages',173::int,'reltuples',10000::real) updated`)
      ).rows[0],
    ).toEqual({ updated: true })
    expect(
      (
        await pg.query(
          `SELECT relpages,reltuples FROM pg_class WHERE oid='boundary_stats'::regclass`,
        )
      ).rows[0],
    ).toEqual({ relpages: 173, reltuples: 10000 })
    expect(
      (
        await pg.query(`SELECT pg_restore_attribute_stats('schemaname','public','relname','boundary_stats',
      'attname','i','inherited',false,'avg_width',125::int,'null_frac',0.5::real) updated`)
      ).rows[0],
    ).toEqual({ updated: true })
    expect(
      (
        await pg.query(
          `SELECT stawidth,stanullfrac FROM pg_statistic WHERE starelid='boundary_stats'::regclass`,
        )
      ).rows[0],
    ).toEqual({ stawidth: 125, stanullfrac: 0.5 })
    await pg.exec('ROLLBACK')
    expect(
      (
        await pg.query(`SELECT to_regclass('boundary_stats') absent,
      to_jsonb(pg_stat_get_archiver()) IS NOT NULL archiver,
      to_jsonb(pg_stat_get_wal()) IS NOT NULL wal,
      to_jsonb(pg_stat_get_wal_receiver()) IS NULL no_receiver`)
      ).rows[0],
    ).toEqual({ absent: null, archiver: true, wal: true, no_receiver: true })
  } finally {
    await pg.close()
  }
})

it('observes native connection, submitted-query, logging and configuration boundaries', async () => {
  const pg = await PGlite.create()
  try {
    expect(
      (
        await pg.query(`SELECT inet_client_addr() client_addr,inet_server_addr() server_addr,
      inet_client_port() client_port,inet_server_port() server_port`)
      ).rows[0],
    ).toEqual({ client_addr: '127.0.0.1', server_addr: null, client_port: 5432, server_port: null })
    for (const marker of ['first_statement', 'second_statement']) {
      const sql = `SELECT current_query() query_text /* ${marker} */`
      expect((await pg.query(sql)).rows[0]).toEqual({ query_text: sql })
    }
    expect(
      (
        await pg.query(`SELECT pg_current_logfile() current_file,pg_current_logfile(NULL) null_format,
      pg_current_logfile('stderr') stderr_file`)
      ).rows[0],
    ).toEqual({ current_file: null, null_format: null, stderr_file: null })
    await expect(pg.query("SELECT pg_current_logfile('bad')")).rejects.toMatchObject({
      code: '22023',
    })
    const original = (
      await pg.query<{ value: string }>("SELECT current_setting('application_name') value")
    ).rows[0]!.value
    await pg.exec('BEGIN')
    expect(
      (await pg.query("SELECT set_config('application_name','boundary-test',true) changed"))
        .rows[0],
    ).toEqual({ changed: 'boundary-test' })
    expect((await pg.query("SELECT current_setting('application_name') value")).rows[0]).toEqual({
      value: 'boundary-test',
    })
    await pg.exec('ROLLBACK')
    expect((await pg.query("SELECT current_setting('application_name') value")).rows[0]).toEqual({
      value: original,
    })
  } finally {
    await pg.close()
  }
})

it('admits the integer sum transition helpers as direct scalar CHECK calls with native non-strict semantics', async () => {
  const pg = await PGlite.create()
  try {
    expect(
      (
        await pg.query(`SELECT int2_sum(NULL,2::smallint)::text small_initial,
      int2_sum(5,NULL)::text small_unchanged,int2_sum(NULL,NULL)::text small_null,
      int4_sum(NULL,3)::text initial,int4_sum(5,6)::text added,int4_sum(5,NULL)::text unchanged,
      int8_sum(NULL,7)::text numeric_initial,int8_sum(5.25,6)::text numeric_added,
      int8_sum('Infinity',4)::text infinite,int8_sum(NULL,NULL)::text numeric_null`)
      ).rows[0],
    ).toEqual({
      small_initial: '2',
      small_unchanged: '5',
      small_null: null,
      initial: '3',
      added: '11',
      unchanged: '5',
      numeric_initial: '7',
      numeric_added: '11.25',
      infinite: 'Infinity',
      numeric_null: null,
    })
    await pg.exec(
      `CREATE TABLE direct_sum(i int,CHECK(int4_sum(5,i)<10)); INSERT INTO direct_sum VALUES(4),(NULL)`,
    )
    await expect(pg.exec('INSERT INTO direct_sum VALUES(5)')).rejects.toMatchObject({
      code: '23514',
    })
  } finally {
    await pg.close()
  }
})
