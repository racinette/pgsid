import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('retains successful name-array shape without guessing identifier width while preserving grammar, strict NULLs and ordered errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-input-validity-'))
  try {
    await pg.exec(
      'CREATE TABLE array_input_validity(payload text,document jsonb,divisor integer,expected integer,bypass boolean);CREATE TABLE array_input_oracle(LIKE array_input_validity)',
    )
    const outputs: Record<string, string> = {
      count: 'cardinality(payload::name[])',
      rank: 'array_ndims(payload::name[])',
      emptied:
        'cardinality(trim_array(payload::name[],COALESCE(array_length(payload::name[],1),0)))',
    }
    const forms = {
      ...Object.fromEntries(
        Object.entries(outputs).map(([name, sql]) => [
          name,
          `${sql} IS NOT DISTINCT FROM expected`,
        ]),
      ),
      strict_null: "jsonb_set(document,payload::name[],'1'::jsonb,true) IS NULL",
      ordered: 'cardinality(payload::name[])+(1/divisor)>0',
      lazy: 'CASE WHEN bypass THEN true ELSE cardinality(payload::name[])>0 END',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE array_input_validity ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'array_input_validity')!,
      plans = Object.entries(forms).flatMap(([name, sql]) =>
        (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { name, type: 'check', definition: `CHECK(${sql})` }
                : table.constraints.find((c) => c.name === name)!,
              catalog.enums,
              catalog.domains,
              origin,
            )!.expression,
          ),
        })),
      )
    expect(plans.some((p) => hasUncertain(p.expression))).toBe(false)
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const samples = [
      '{a}',
      '{}',
      '{NULL,a}',
      '{"",NULL}',
      '[-2:-1]={a,b}',
      '{{a,b},{c,d}}',
      '{"' + '雪'.repeat(80) + '"}',
      'bad',
      '{a',
      '[1:2]={a}',
      '{a}tail',
      null,
    ]
    for (const [name, sql] of Object.entries(forms))
      for (const payload of samples)
        for (const divisor of name === 'ordered' ? [0, 1] : [1])
          for (const bypass of name === 'lazy' ? [false, true] : [false]) {
            await pg.exec('TRUNCATE array_input_oracle')
            await pg.query('INSERT INTO array_input_oracle VALUES($1,NULL,$2,NULL,$3)', [
              payload,
              divisor,
              bypass,
            ])
            let expectedNumber: number | null = null
            if (outputs[name]) {
              try {
                expectedNumber = (
                  await pg.query<{ value: number | null }>(
                    `SELECT ${outputs[name]} value FROM array_input_oracle`,
                  )
                ).rows[0]!.value
              } catch {}
              await pg.query('UPDATE array_input_oracle SET expected=$1', [expectedNumber])
            }
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} value FROM array_input_oracle`,
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              expected = failure((error as { code: string }).code)
            }
            const row: Row = {
              payload: known(payload),
              document: known(null),
              divisor: known(divisor),
              expected: known(expectedNumber),
              bypass: known(bypass),
            }
            add(name, row, expected)
            observations.push({ name, payload, divisor, bypass, expectedNumber, expected })
            if (outputs[name] && expected.kind === 'True' && expectedNumber !== null)
              add(name, { ...row, expected: known(expectedNumber + 1) }, { kind: 'False' })
          }
    for (const name of ['count', 'emptied', 'strict_null', 'ordered']) {
      const row: Row = {
        payload: { kind: 'Unknown' },
        document: known(null),
        divisor: known(0),
        expected: known(null),
      }
      add(name, row, { kind: 'Unknown' })
      add(name, { ...row, payload: failure('22012') }, failure('22012'))
    }
    add('lazy', { payload: { kind: 'Unknown' }, bypass: known(true) }, { kind: 'True' })
    await runCheckParity(
      directory,
      'arrayinputvalidity',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await mkdir('artifacts/goal-checks/integer-scalar-input', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/integer-scalar-input/name-array-validity.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
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
}, 300_000)
