import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const baseBranch = `ROW(ROW(9,'old')::leaf,ARRAY[ROW(8,'arr')::leaf],'base')::branch`
const profiles = [
  { name: 'branch', base: baseBranch },
  {
    name: 'domain_branch',
    base: `ROW(ROW(9,'old')::checked_leaf,ARRAY[ROW(8,'arr')::checked_leaf],'base')::domain_branch`,
  },
  { name: 'root', base: `ROW(${baseBranch},ROW(7,'dom')::checked_leaf)::root` },
  { name: 'fault_carrier', base: `ROW(ROW(2,'old')::fault_leaf,5)::fault_carrier` },
] as const

it('populates nested JSON objects and record arrays with recursive base defaults and ordered domain errors in every target', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-records-'))
  const pg = await PGlite.create()
  const packet = 'artifacts/goal-checks/json-populate-records-active'
  try {
    await pg.exec(`SET DateStyle='ISO, MDY';SET IntervalStyle='postgres';SET array_nulls=on;
      CREATE DOMAIN positive AS int CHECK(VALUE>0);
      CREATE DOMAIN fault AS int CHECK(10/VALUE>0);
      CREATE TYPE leaf AS(n positive,s varchar(3));
      CREATE TYPE branch AS(child leaf,children leaf[],tag text);
      CREATE DOMAIN checked_leaf AS leaf NOT NULL CHECK((VALUE).n>0);
      CREATE TYPE root AS(b branch,d checked_leaf);
      CREATE TYPE domain_branch AS(child checked_leaf,children checked_leaf[],tag text);
      CREATE TYPE fault_leaf AS(n fault,s text);
      CREATE TYPE fault_carrier AS(child fault_leaf,marker int)`)
    const forms = profiles.flatMap((profile) =>
      ['json_populate_record', 'jsonb_populate_record', 'jsonb_populate_record_valid'].map((fn) => {
        const name = profile.name + '_' + fn
        const valid = fn.endsWith('_valid')
        const base = `CASE WHEN use_base THEN ${profile.base} ELSE NULL::${profile.name} END`
        const call = `pg_catalog.${fn}((${base}),data::${fn === 'json_populate_record' ? 'json' : 'jsonb'})`
        const value = valid ? call : `(${call})::text`
        const expression = `CASE WHEN bypass THEN true ELSE (${value}) IS NOT DISTINCT FROM ${valid ? 'expected_bool' : 'expected_text'} END`
        return { name, profile, fn, valid, value, expression }
      }),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(data text,use_base bool,expected_text text COLLATE "C",expected_bool bool,bypass bool,CONSTRAINT populated CHECK(${form.expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.expression})` : undefined,
        )!
        expect(hasUncertain(lowered.expression), form.name + origin).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: form.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.constraint + JSON.stringify(check)).toBe('supported')
    const data = [
      null,
      '{}',
      'null',
      '[]',
      '1',
      '{"child":{}}',
      '{"child":{"n":2}}',
      '{"child":{"s":"new"}}',
      '{"child":null}',
      '{"child":"(2,sql)"}',
      '{"child":"(0,sql)"}',
      '{"child":"(bad,sql)"}',
      '{"child":"(2,long)"}',
      '{"child":"(2)"}',
      '{"child":[]}',
      '{"child":1}',
      '{"child":{"n":"bad"}}',
      '{"child":{"n":0}}',
      '{"child":{"n":-1}}',
      '{"child":{"n":2,"s":"long"}}',
      '{"child":{"n":2,"n":3}}',
      '{"child":{"n":"bad","n":2}}',
      '{"child":{"n":2},"child":{}}',
      '{"child":{},"tag":"changed"}',
      '{"children":[]}',
      '{"children":[{}, {"n":2}]}',
      '{"children":[null]}',
      '{"children":[{"n":2,"s":"ok"},"(3,sql)",null]}',
      '{"children":[[{"n":2}],[{"n":3}]]}',
      '{"children":[[{}],[{},{}]]}',
      '{"children":[{"n":0},{}]}',
      '{"children":[{"n":"bad"},{}]}',
      '{"children":[1]}',
      '{"children":[[]]}',
      '{"children":"{\\"(2,sql)\\"}"}',
      '{"children":[[[[[[[{}]]]]]]]}',
      '{"children":[[[[[[[{"n":0}]]]]]]]}',
      '{"b":{}}',
      '{"b":{"child":{}}}',
      '{"b":{"child":{"n":2}}}',
      '{"b":{"child":{"s":"new"},"tag":"changed"}}',
      '{"b":{"children":[{}]}}',
      '{"b":null}',
      '{"d":{}}',
      '{"d":{"n":2}}',
      '{"d":null}',
      '{"d":{"n":0}}',
      '{"b":{"child":{"n":"bad"}},"d":null}',
      '{"child":{"n":0},"marker":"bad"}',
      '{"child":{"n":"bad"},"marker":0}',
      '{"unused":"\\ud800"}',
      '{"child":{"unused":"\\ud800"}}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations = []
    for (const form of forms)
      for (const source of data)
        for (const useBase of [false, true]) {
          let output: string | boolean | null = null
          let expected: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ value: string | boolean | null }>(
                `WITH args AS MATERIALIZED(SELECT $1::text data,$2::bool use_base)SELECT ${form.value} value FROM args`,
                [source, useBase],
              )
            ).rows[0]!.value
          } catch (e) {
            const code = (e as { code?: string }).code
            if (!code) throw e
            expected = failure(code)
          }
          const row: Row = {
            data: known(source),
            use_base: known(useBase),
            expected_text: known(form.valid ? null : (output as string | null)),
            expected_bool: known(form.valid ? (output as boolean | null) : null),
            bypass: known(false),
          }
          for (const origin of ['source', 'stored']) {
            const name = form.name + '_' + origin
            fixtures.push({ name, row, expected })
            if (expected.kind === 'True')
              fixtures.push({
                name,
                row: {
                  ...row,
                  ...(form.valid
                    ? { expected_bool: known(output === null ? true : !output) }
                    : { expected_text: known('wrong') }),
                },
                expected: { kind: 'False' },
              })
          }
          observations.push({ name: form.name, source, useBase, output, expected })
        }
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const name = form.name + '_' + origin
        const row: Row = {
          data: { kind: 'Unknown' },
          use_base: known(false),
          expected_text: known(null),
          expected_bool: known(null),
          bypass: known(false),
        }
        fixtures.push({ name, row, expected: { kind: 'Unknown' } })
        fixtures.push({ name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } })
        fixtures.push({
          name,
          row: { ...row, data: failure('22012') as Input },
          expected: failure('22012'),
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(packet + '/plans.json', JSON.stringify(plans, null, 2) + '\n')
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          checks: plans.length,
          fixtures: fixtures.length,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'json_populate_records',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
