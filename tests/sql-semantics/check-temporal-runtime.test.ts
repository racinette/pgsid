import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { callableIdentity, readBuiltinCatalog } from '../../src/postgres/builtins/catalog.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  callableBoundary,
  temporalRuntimeRequirements,
} from '../../scripts/check-measurements/catalog.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  checkRustCallableNames,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { isTemporalCurrentAge } from '../../src/sql-semantics/temporal-casts.js'

const packet = 'artifacts/goal-checks/temporal-runtime-active'
const callables = builtinCallables().filter((item) => temporalRuntimeRequirements(item))
const sources = [
  'https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT',
  'https://www.postgresql.org/docs/18/functions-info.html',
  'https://www.postgresql.org/docs/18/monitoring-stats.html',
  'https://raw.githubusercontent.com/postgres/postgres/REL_18_STABLE/src/backend/utils/adt/timestamp.c',
]

it('classifies temporal runtime reads by their native state rather than treating stable calls as settings', async () => {
  const pg = await PGlite.create()
  try {
    const live = (await readBuiltinCatalog(pg)).functions
      .map(({ metadata }) => metadata)
      .filter((item) => temporalRuntimeRequirements(item))
    expect(Object.fromEntries(live.map((item) => [callableIdentity(item), item]))).toEqual(
      Object.fromEntries(callables.map((item) => [callableIdentity(item), item])),
    )
    expect(callables).toHaveLength(24)
    const groups: Record<string, number> = {}
    for (const item of callables) {
      const requirement = temporalRuntimeRequirements(item)![0]!
      const key = requirement.kind + ':' + requirement.setting
      groups[key] = (groups[key] ?? 0) + 1
    }
    expect(groups).toEqual({
      'transaction:local_date': 2,
      'transaction:start_timestamp': 2,
      'statement:start_timestamp': 1,
      'execution:wall_clock': 2,
      'database:configuration_load': 1,
      'database:server_start': 1,
      'database:replication_replay': 1,
      'database:commit_timestamp_history': 1,
      'database:statistics': 13,
    })
    const available = checkRustCallableNames()
    for (const item of callables) {
      const requirements = temporalRuntimeRequirements(item)!
      expect(item.kind).toBe('function')
      if (item.kind !== 'function') throw new Error(callableIdentity(item))
      expect(available.has(item.rustName), callableIdentity(item)).toBe(isTemporalCurrentAge(item))
      const categories = callableBoundary(item, new Set([...item.args, item.result])).categories
      for (const requirement of requirements) {
        expect(requirement.owner).toBe('tests/sql-semantics/check-temporal-runtime.test.ts')
        expect(categories).toContain(
          `${requirement.kind}-${requirement.kind === 'session' ? 'setting' : 'state'}:${requirement.setting}`,
        )
      }
      expect(categories).not.toContain('pure-callable-candidate')
      for (const unrelated of [
        { ...item, schema: 'custom' },
        { ...item, kind: 'aggregate' as const },
        { ...item, returnsSet: true },
        { ...item, strict: false },
        { ...item, volatility: 'i' as const },
        { ...item, result: 'pg_catalog.bool' },
        { ...item, args: [...item.args, 'pg_catalog.bool'] },
        { ...item, name: 'unrelated_runtime_read' },
      ])
        expect(temporalRuntimeRequirements(unrelated), callableIdentity(unrelated)).toBeNull()
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/requirements.json',
      JSON.stringify(
        {
          sources,
          callables: callables.map((metadata) => ({
            identity: callableIdentity(metadata),
            metadata,
            ...callableBoundary(metadata, new Set([...metadata.args, metadata.result])),
            implementationPresent: metadata.kind === 'function' && available.has(metadata.rustName),
            valueRequirements: temporalRuntimeRequirements(metadata),
          })),
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
  }
})

it('observes transaction, statement and invocation clocks and the local-midnight age wrapper', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('BEGIN')
    const clockSql = `SELECT encode(timestamptz_send(transaction_timestamp()),'hex') tx,
      encode(timestamptz_send(statement_timestamp()),'hex') statement,
      now()=transaction_timestamp() aliases,now()=CURRENT_TIMESTAMP standard_alias,
      encode(timestamptz_send(clock_timestamp()),'hex') clock`
    type ClockRow = {
      tx: string
      statement: string
      clock: string
      aliases: boolean
      standard_alias: boolean
    }
    const first = (await pg.query<ClockRow>(clockSql)).rows[0]!
    await pg.query('SELECT pg_sleep(0.02)')
    const second = (await pg.query<ClockRow>(clockSql)).rows[0]!
    expect(first.tx).toBe(second.tx)
    expect(first).toMatchObject({ aliases: true, standard_alias: true })
    expect(second).toMatchObject({ aliases: true, standard_alias: true })
    expect(first.statement).not.toBe(second.statement)
    expect(first.clock).not.toBe(second.clock)
    const withinStatement = (
      await pg.query(`WITH first AS MATERIALIZED (
        SELECT transaction_timestamp() tx,statement_timestamp() statement,clock_timestamp() clock
      ), waited AS MATERIALIZED (SELECT *,pg_sleep(0.02) FROM first)
      SELECT tx=transaction_timestamp() same_transaction,statement=statement_timestamp() same_statement,
        clock<>clock_timestamp() changed_clock FROM waited`)
    ).rows[0]!
    expect(withinStatement).toEqual({
      same_transaction: true,
      same_statement: true,
      changed_clock: true,
    })
    const profiles = []
    for (const zone of ['UTC', 'America/New_York', '167.999', '-167.999']) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
      const row = (
        await pg.query<{
          today: string
          tx: string
          local_age: string
          local_midnight: boolean
          instant_midnight: boolean
          local_null: boolean
          instant_null: boolean
          local_infinity: boolean
          instant_infinity: boolean
        }>(`SELECT encode(date_send(CURRENT_DATE),'hex') today,
          encode(timestamptz_send(transaction_timestamp()),'hex') tx,
          encode(interval_send(age(timestamp '2000-01-01')),'hex') local_age,
          age(timestamp '2000-01-01')=age(CURRENT_DATE::timestamp,timestamp '2000-01-01') local_midnight,
          age(timestamptz '2000-01-01+00')=age(CURRENT_DATE::timestamptz,timestamptz '2000-01-01+00') instant_midnight,
          age(NULL::timestamp) IS NULL local_null,age(NULL::timestamptz) IS NULL instant_null,
          age(timestamp 'infinity')=interval '-infinity' local_infinity,
          age(timestamptz '-infinity')=interval 'infinity' instant_infinity`)
      ).rows[0]!
      expect(row).toMatchObject({
        tx: first.tx,
        local_midnight: true,
        instant_midnight: true,
        local_null: true,
        instant_null: true,
        local_infinity: true,
        instant_infinity: true,
      })
      profiles.push({ zone, ...row })
    }
    expect(profiles[2]!.today).not.toBe(profiles[3]!.today)
    expect(profiles[2]!.local_age).not.toBe(profiles[3]!.local_age)
    await pg.exec('ROLLBACK')
    const third = (await pg.query<ClockRow>(clockSql)).rows[0]!
    expect(third.tx).not.toBe(first.tx)
    const sqlBodies = (
      await pg.query<{
        signature: string
        definition: string
      }>(`SELECT oid::regprocedure::text signature,pg_get_functiondef(oid) definition
        FROM pg_proc WHERE pronamespace='pg_catalog'::regnamespace AND proname='age'
        AND proargtypes IN (ARRAY['pg_catalog.timestamp'::regtype]::oidvector,
          ARRAY['pg_catalog.timestamptz'::regtype]::oidvector)
        ORDER BY oid::regprocedure::text`)
    ).rows
    expect(sqlBodies).toHaveLength(2)
    for (const row of sqlBodies) expect(row.definition).toMatch(/CURRENT_DATE/iu)
    const textual = []
    for (const zone of ['UTC', 'abc3']) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
      const row = (await pg.query<{ value: string }>('SELECT timeofday() value')).rows[0]!
      expect(row.value).toMatch(/^[A-Z][a-z]{2} [A-Z][a-z]{2} /u)
      expect(row.value.endsWith(zone === 'UTC' ? 'UTC' : 'ABC')).toBe(true)
      textual.push({ zone, ...row })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/native-clocks.json',
      JSON.stringify(
        { first, second, third, withinStatement, profiles, sqlBodies, textual },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
  }
})

it('keeps reached runtime reads unknown and skipped branches definite in raw and stored Rust, Go and TypeScript CHECKs', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-temporal-runtime-'))
  try {
    const forms = callables.map((item, index) => {
      const args = item.args.map((type) =>
        type === 'pg_catalog."timestamp"'
          ? 'local_stamp'
          : type === 'pg_catalog.timestamptz'
            ? 'instant'
            : type === 'pg_catalog.int4'
              ? 'backend_slot'
              : type === 'pg_catalog.oid'
                ? 'object_id'
                : 'transaction_id',
      )
      const call = `pg_catalog.${item.name}(${args.join(',')})`
      return { name: 'runtime_' + index, item, call, sql: `bypass OR ${call} IS NOT NULL` }
    })
    await pg.exec(`CREATE TABLE runtime_checks(bypass boolean,local_stamp timestamp,instant timestamptz,
      backend_slot integer,object_id oid,transaction_id xid,
      ${forms.map((form) => `CONSTRAINT ${form.name} CHECK(${form.sql})`).join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'runtime_checks')!
    const names: string[] = []
    const checks = forms.flatMap((form) =>
      (['source', 'stored'] as const).map((origin) => {
        const name = form.name + '_' + origin
        names.push(name)
        const lowered = lowerTableCheck(
          table,
          table.constraints.find((c) => c.name === form.name)!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.sql})` : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(!isTemporalCurrentAge(form.item))
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name,
          },
          expression,
        }
      }),
    )
    const group = prepareCheckRustGroup(checks, {
      timeZone: 'UTC',
      defaultCollation: 'C',
      timeLocale: 'C',
      serverEncoding: 'UTF8',
      maxIdentifierBytes: 63,
    })
    for (const [index, check] of group.checks.entries()) {
      expect(check.kind, names[index]).toBe('supported')
      if (check.kind === 'supported') {
        const form = forms[Math.floor(index / 2)]!
        const inputs = ['bypass']
        if (isTemporalCurrentAge(form.item))
          inputs.push(form.item.args[0] === 'pg_catalog.timestamptz' ? 'instant' : 'local_stamp')
        expect(check.inputs.map((i) => i.name).sort()).toEqual(inputs.sort())
      }
    }
    expect(group.evaluatorSource).not.toMatch(
      /sql__pg_catalog__(?:now|clock_timestamp|timeofday)__/u,
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const name of names) {
      for (const bypass of [true, false, null])
        fixtures.push({
          name,
          row: {
            bypass: bypass === null ? { kind: 'Null' } : { kind: 'Value', value: bypass },
            local_stamp: { kind: 'Value', value: 0n },
            instant: { kind: 'Value', value: 0n },
          },
          expected: { kind: bypass === true ? 'True' : 'Unknown' },
        })
      fixtures.push(
        {
          name,
          row: {
            bypass: { kind: 'Unknown' },
            local_stamp: { kind: 'Value', value: 0n },
            instant: { kind: 'Value', value: 0n },
          },
          expected: { kind: 'Unknown' },
        },
        {
          name,
          row: {
            bypass: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            local_stamp: { kind: 'Value', value: 0n },
            instant: { kind: 'Value', value: 0n },
          },
          expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        },
      )
    }
    await expect(pg.query('INSERT INTO runtime_checks(bypass) VALUES(true)')).resolves.toBeDefined()
    const observations: unknown[] = []
    for (const form of forms) {
      const sql = `SELECT ${form.call}::text value FROM (SELECT timestamp '2000-01-01' local_stamp,
        timestamptz '2000-01-01+00' instant,-1::integer backend_slot,0::oid object_id,'3'::xid transaction_id) inputs`
      try {
        observations.push({
          identity: callableIdentity(form.item),
          ...(await pg.query<{ value: string | null }>(sql)).rows[0],
        })
      } catch (error) {
        expect(form.item.name).toBe('pg_xact_commit_timestamp')
        expect(error).toMatchObject({ code: '55000' })
        observations.push({ identity: callableIdentity(form.item), error: '55000' })
      }
      if (form.item.args.length === 1)
        expect(
          (
            await pg.query(
              `SELECT pg_catalog.${form.item.name}(NULL::${form.item.args[0]}) IS NULL value`,
            )
          ).rows[0],
        ).toEqual({ value: true })
    }
    await runCheckParity(directory, 'temporal_runtime', group, names, fixtures)
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 480_000)
