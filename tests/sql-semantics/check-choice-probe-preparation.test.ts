import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('keeps validity-probe constant arguments inside their choice guard without suppressing ordinary eager preparation', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-choice-probe-preparation-'))
  try {
    const calls = {
      json: 'to_json(1/0)::text',
      jsonb: 'to_jsonb(1/0)::text',
      array: 'array_to_json(ARRAY[1/0])::text',
      raw_builder: 'json_build_array(1/0)::text',
      binary_builder: 'jsonb_build_array(1/0)::text',
      object: "jsonb_build_object('value',1/0)::text",
    }
    const outputs: Record<string, string> = {}
    for (const [name, call] of Object.entries(calls))
      Object.assign(outputs, {
        [name + '_true']: `CASE WHEN true THEN label ELSE ${call} END`,
        [name + '_false']: `CASE WHEN false THEN ${call} ELSE label END`,
        [name + '_coalesce']: `COALESCE('retained'::text,${call})`,
        [name + '_dynamic']: `CASE WHEN bypass THEN label ELSE ${call} END`,
        [name + '_reached']: `CASE WHEN true THEN ${call} ELSE label END`,
        [name + '_null']: `COALESCE(NULL::text,${call})`,
      })
    Object.assign(outputs, {
      runtime_case: 'CASE WHEN bypass THEN label ELSE to_json(1/divisor)::text END',
      runtime_coalesce: 'COALESCE(label,to_json(1/divisor)::text)',
    })
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [name, `(${sql})=expected`]),
    )
    await pg.exec(`CREATE TABLE probe_values(label text COLLATE "C",expected text COLLATE "C",divisor integer,bypass boolean);
      CREATE TABLE probe_checks(LIKE probe_values,${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'probe_checks')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: lowerTableCheck(
          table,
          origin === 'stored'
            ? table.constraints.find((check) => check.name === name)!
            : { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          origin,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const cases: [string | null, string | null, number, boolean | null][] = [
      ['kept', 'kept', 0, true],
      ['kept', 'wrong', 0, false],
      [null, null, 0, false],
      [null, 'null', 1, false],
      [null, '1', 1, false],
      ['retained', 'retained', 0, null],
    ]
    for (const values of cases) {
      await pg.exec('TRUNCATE probe_values')
      await pg.query('INSERT INTO probe_values VALUES($1,$2,$3,$4)', values)
      const row = Object.fromEntries(
        ['label', 'expected', 'divisor', 'bypass'].map((name, index) => [
          name,
          known(values[index]!),
        ]),
      )
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM probe_values`)
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (cause) {
          expect((cause as { code: string }).code).toBe('22012')
          expected = failure('22012')
        }
        add(name, row, expected)
      }
    }
    const base: Row = {
      label: known('kept'),
      expected: known('kept'),
      divisor: known(0),
      bypass: known(true),
    }
    for (const name of Object.keys(calls)) {
      add(name + '_true', { ...base, label: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(name + '_dynamic', { ...base, bypass: { kind: 'Unknown' } }, failure('22012'))
    }
    add('runtime_case', { ...base, divisor: failure('22003') }, { kind: 'True' })
    add('runtime_coalesce', { ...base, divisor: failure('22003') }, { kind: 'True' })
    add(
      'runtime_coalesce',
      { ...base, label: known(null), divisor: failure('22003') },
      failure('22003'),
    )
    add('runtime_case', { ...base, bypass: { kind: 'Unknown' } }, { kind: 'Unknown' })
    await mkdir('artifacts/goal-checks/choice-probe-preparation', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/choice-probe-preparation/fixtures.json',
      JSON.stringify({ outputs, fixtures }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'choiceprobes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
