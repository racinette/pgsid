import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customDefaultSchema } from './check-custom-range-default-fixtures.js'

const cell = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('executes captured constructor defaults, named omissions and variadic array defaults with native preparation and error order', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-constructor-defaults-'))
  try {
    await pg.exec(customDefaultSchema)
    const forms = Object.entries({
      closed: '"Default.Range".closed()',
      one: '"Default.Range".closed(start_position)',
      two: '"Default.Range".closed(start_position,finish_position)',
      named: '"Default.Range".closed(hi=>finish_position)',
      reordered: '"Default.Range".closed(bounds=>flags,hi=>finish_position,lo=>start_position)',
      middle: '"Default.Range".closed(start_position,bounds=>flags)',
      calculated: '"Default.Range".calculated()',
      null_bound: '"Default.Range".null_bound()',
      pack: '"Default.Range".pack()',
      null_pack: '"Default.Range".null_pack()',
      many: '"Default.Range".many()',
      empty_many: '"Default.Range".empty_many()',
      null_many: '"Default.Range".null_many()',
      explicit_array:
        '"Default.Range".many(VARIADIC ARRAY["Default.Range".closed(start_position,finish_position)])',
      expanded: '"Default.Range".many("Default.Range".closed(start_position,finish_position))',
      positive: '"Default.Range".positive_bounds()',
      positive_input: '"Default.Range".positive_bounds(start_position)',
      decimal: '"Default.Range".decimal_bounds()',
      days: `(lower("Default.Range".day_bounds())-DATE '2000-01-01')`,
      callback: '"Default.Range".callback()',
      callback_eager: '"Default.Range".callback(hi=>start_position/0)',
      callback_overridden: '"Default.Range".callback(start_position)',
      session: '"Default.Range".session_bound()',
      session_eager: '"Default.Range".session_bound(hi=>start_position/0)',
      session_overridden: '"Default.Range".session_bound(start_position)',
      division: '"Default.Range".division()',
      division_overridden: '"Default.Range".division(start_position)',
    }).map(([name, output]) => ({
      name,
      output: `(${output})::text`,
      table: 'constructor_defaults_' + name,
      sql: `CASE WHEN bypass THEN true ELSE (${output})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(start_position int4,finish_position int4,flags text,expected text,bypass bool,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((table) => table.name === form.table)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1500)).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const sample of [
      { lo: 1, hi: 3, flags: '[]' },
      { lo: null, hi: 3, flags: '[)' },
      { lo: 1, hi: null, flags: '(]' },
      { lo: 3, hi: 1, flags: '[)' },
      { lo: 0, hi: 3, flags: 'bad' },
      { lo: 2147483647, hi: 2147483647, flags: null },
    ])
      for (const form of forms) {
        let output: string | null = null,
          failure: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${form.output}) value FROM (SELECT $1::int4 start_position,$2::int4 finish_position,$3::text flags)q`,
              [sample.lo, sample.hi, sample.flags],
            )
          ).rows[0]!.value
        } catch (error) {
          failure = (error as { code: string }).code
        }
        references.push({ sample, form: form.name, output, failure })
        for (const bypass of [false, true])
          for (const wrong of [false, true]) {
            const expected = wrong ? '!different!' : output
            let native: Outcome
            try {
              const result = (
                await pg.query<{ value: boolean | null }>(
                  `INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5) RETURNING (${form.sql}) value`,
                  [sample.lo, sample.hi, sample.flags, expected, bypass],
                )
              ).rows[0]!.value
              native = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              const code = (error as { code: string }).code
              native =
                code === '23514' &&
                (error as { constraint?: string }).constraint ===
                  catalog.tables.find((table) => table.name === form.table)!.constraints[0]!.name
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            inserts++
            const deferred = ['callback', 'session', 'callback_eager', 'session_eager'].includes(
              form.name,
            )
            const outcome: Outcome = deferred ? { kind: 'Unknown' } : native
            const row: Row = {
              start_position: cell(sample.lo),
              finish_position: cell(sample.hi),
              flags: cell(sample.flags),
              expected: cell(expected),
              bypass: cell(bypass),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: form.table + '_' + origin, row, expected: outcome })
          }
      }
    await mkdir('artifacts/custom-constructor-defaults', { recursive: true })
    await writeFile(
      'artifacts/custom-constructor-defaults/report.json',
      JSON.stringify(
        { inserts, fixtures: fixtures.length, plans: plans.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'constructordefaults',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('keeps unknown default preparation ahead of skipped guards and later argument errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-default-preparation-'))
  try {
    await pg.exec(
      customDefaultSchema +
        `CREATE TABLE default_preparation(start_position int4,bypass bool,
   CHECK(CASE WHEN bypass THEN true ELSE isempty("Default.Range".callback(hi=>start_position/0)) END));`,
    )
    const before = await snapshotCatalog(pg)
    await pg.exec(
      `CREATE OR REPLACE FUNCTION "Default.Range".external_default() RETURNS int4 LANGUAGE plpgsql IMMUTABLE AS $$BEGIN RAISE EXCEPTION 'early default' USING ERRCODE='22000';END$$;`,
    )
    const after = await snapshotCatalog(pg),
      table = after.tables[0]!
    expect(after.rangeTypes).toEqual(before.rangeTypes)
    const plans = (['source', 'stored'] as const).map((origin) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: origin },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          table.constraints[0]!,
          after.enums,
          after.domains,
          origin,
          after.rangeTypes,
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans)
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const bypass of [false, true]) {
      await expect(
        pg.query('INSERT INTO default_preparation VALUES(1,$1)', [bypass]),
      ).rejects.toMatchObject({ code: '22000' })
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: origin,
          row: { start_position: cell(1), bypass: cell(bypass) },
          expected: { kind: 'Unknown' },
        })
    }
    await runCheckParity(
      directory,
      'defaultpreparation',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('prunes constant guards before unavailable defaults and retains errors from explicitly supplied arguments', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-default-constant-guards-'))
  try {
    await pg.exec(customDefaultSchema)
    const forms = [
      {
        name: 'constant_case',
        sql: 'CASE WHEN true THEN true ELSE isempty("Default.Range".callback()) END',
        expected: { kind: 'True' } as Outcome,
      },
      {
        name: 'constant_coalesce',
        sql: 'isempty(COALESCE(\'empty\'::"Default.Range".span,"Default.Range".callback()))',
        expected: { kind: 'True' } as Outcome,
      },
      {
        name: 'explicit_error',
        sql: 'isempty("Default.Range".callback(1/0))',
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } } as Outcome,
      },
    ]
    for (const form of forms)
      await pg.exec(`CREATE TABLE ${form.name}(value int4,CHECK(${form.sql}))`)
    await pg.exec(
      `CREATE OR REPLACE FUNCTION "Default.Range".external_default() RETURNS int4 LANGUAGE plpgsql IMMUTABLE AS $$BEGIN RAISE EXCEPTION 'unused default' USING ERRCODE='22000';END$$;`,
    )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((table) => table.name === form.name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const check of group.checks) expect(check.kind).toBe('supported')
    for (const form of forms) {
      const insert = pg.query(`INSERT INTO ${form.name} VALUES(1)`)
      if (form.name === 'explicit_error')
        await expect(insert).rejects.toMatchObject({ code: '22012' })
      else await insert
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: { value: cell(1) },
          expected: form.expected,
        })
    }
    await runCheckParity(
      directory,
      'defaultconstantguards',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
