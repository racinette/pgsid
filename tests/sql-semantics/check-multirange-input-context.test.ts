import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('defers reached multirange DateStyle/TimeZone input while retaining grammar errors and normalized stored literals', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-context-'))
  try {
    const forms = [
      {
        type: 'datemultirange',
        subtype: 'date',
        expected: "'2000-01-02'::date",
        payload: '{[01/02/2000,2000-03-01)}',
        malformed: '{[01/02/2000,2000-99-01}',
        settings: ["SET DateStyle='ISO,MDY'", "SET DateStyle='ISO,DMY'"],
      },
      {
        type: 'tsmultirange',
        subtype: 'timestamp',
        expected: "'2000-01-02'::timestamp",
        payload: '{[01/02/2000 00:00:00,2000-03-01)}',
        malformed: '{[01/02/2000 00:00:00,2000-99-01}',
        settings: ["SET DateStyle='ISO,MDY'", "SET DateStyle='ISO,DMY'"],
      },
      {
        type: 'tstzmultirange',
        subtype: 'timestamptz',
        expected: "'2000-01-01 00:00:00+00'::timestamptz",
        payload: '{[2000-01-01,2000-03-01)}',
        malformed: '{[2000-01-01,2000-99-01}',
        settings: ["SET TimeZone='UTC'", "SET TimeZone='Europe/Minsk'"],
      },
    ].map((form, index) => ({
      ...form,
      table: 'multi_context_' + index,
      sql: `CASE WHEN bypass THEN true ELSE lower(payload::${form.type})=${form.expected} END`,
    }))
    for (const form of forms)
      await pg.exec(`CREATE TABLE ${form.table}(payload text,bypass boolean,CHECK(${form.sql}))`)
    await pg.exec(
      "SET DateStyle='ISO,DMY';SET TimeZone='Europe/Minsk';CREATE TABLE multi_captured(expected date,CHECK(lower('{[01/02/2000,03/02/2000)}'::datemultirange)=expected))",
    )
    const catalog = await snapshotCatalog(pg)
    const settings = (
      await pg.query<{ style: string; zone: string }>(
        "SELECT current_setting('DateStyle') style,current_setting('TimeZone') zone",
      )
    ).rows[0]!
    expect(settings).toEqual({ style: 'ISO, DMY', zone: 'Europe/Minsk' })
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: form.table,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: 'check', type: 'check', definition: `CHECK(${form.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      }))
    })
    const captured = catalog.tables.find((t) => t.name === 'multi_captured')!
    for (const origin of ['source', 'stored'])
      plans.push({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: captured.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            captured,
            origin === 'source'
              ? {
                  name: 'check',
                  type: 'check',
                  definition: "CHECK(lower('{[01/02/2000,03/02/2000)}'::datemultirange)=expected)",
                }
              : captured.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })
    expect(captured.constraints[0]!.definition).toContain('2000-02-01')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms) {
      const observed: string[] = []
      for (const setting of form.settings) {
        await pg.exec("SET DateStyle='ISO,MDY';SET TimeZone='UTC';" + setting)
        for (const bypass of [false, true]) {
          try {
            await pg.query(`INSERT INTO ${form.table} VALUES($1,$2)`, [form.payload, bypass])
            if (!bypass) observed.push('accepted')
          } catch (error) {
            expect((error as { code: string }).code).toBe('23514')
            if (!bypass) observed.push('rejected')
          }
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.table + '_' + origin,
              row: {
                payload: { kind: 'Value', value: form.payload },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: { kind: bypass ? 'True' : 'Unknown' },
            })
        }
        await expect(
          pg.query(`INSERT INTO ${form.table} VALUES($1,false)`, [form.malformed]),
        ).rejects.toMatchObject({ code: '22P02' })
        inserts++
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.table + '_' + origin,
            row: {
              payload: { kind: 'Value', value: form.malformed },
              bypass: { kind: 'Value', value: false },
            },
            expected: { kind: 'Error', value: { state: parseInt('22P02', 36) } },
          })
      }
      await expect(
        pg.query(`INSERT INTO ${form.table} VALUES($1,false)`, [form.payload + 'junk']),
      ).rejects.toMatchObject({ code: '22P02' })
      inserts++
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.table + '_' + origin,
          row: {
            payload: { kind: 'Value', value: form.payload + 'junk' },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'Unknown' },
        })
      expect(observed).toEqual(['accepted', 'rejected'])
    }
    for (const day of [31, 1]) {
      let expected: Outcome
      try {
        await pg.query("INSERT INTO multi_captured VALUES(DATE '2000-01-01'+$1::int)", [day])
        expected = { kind: 'True' }
      } catch (error) {
        expect((error as { code: string }).code).toBe('23514')
        expected = { kind: 'False' }
      }
      inserts++
      const row: Row = { expected: { kind: 'Value', value: day } }
      fixtures.push({ name: 'multi_captured_source', row, expected: { kind: 'Unknown' } })
      fixtures.push({ name: 'multi_captured_stored', row, expected })
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangecontext',
      group,
      [
        ...forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
        'multi_captured_source',
        'multi_captured_stored',
      ],
      fixtures,
    )
    expect(inserts).toBe(23)
    expect(fixtures).toHaveLength(46)
    await mkdir('artifacts/check-multirange-input', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-input/context-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          requirements: ['DateStyle', 'TimeZone'],
          normalizedStoredLiterals: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
