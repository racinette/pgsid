import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'

const packet = 'artifacts/goal-checks/json-populate-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('retains selected unavailable enum text casts after JSON record projection', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TYPE label AS ENUM('ready');CREATE TYPE carrier AS(value label);CREATE FUNCTION label_text(label) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$SELECT 'custom:'||pg_catalog.enum_out($1)::text$$;CREATE CAST(label AS text)WITH FUNCTION label_text(label);CREATE TABLE custom_projection(data text,expected text,CONSTRAINT projected CHECK((json_populate_record(NULL::carrier,data::json)).value::text IS NOT DISTINCT FROM expected))`,
    )
    expect(
      (
        await pg.query<{ value: string }>(
          `SELECT (json_populate_record(NULL::carrier,'{"value":"ready"}')).value::text value`,
        )
      ).rows[0]!.value,
    ).toBe('custom:ready')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'custom_projection')!,
      constraint = table.constraints[0]!
    for (const origin of ['source', 'stored'] as const) {
      const lowered = lowerTableCheck(
        table,
        constraint,
        catalog.enums,
        catalog.domains,
        origin,
        catalog.rangeTypes,
        catalog.compositeTypeGraph,
        origin === 'source' ? constraint.definition : undefined,
      )!
      expect(hasUncertain(lowered.expression), origin).toBe(true)
    }
  } finally {
    await pg.close()
  }
})

it('populates declared scalar record fields while preserving base rows, NULLs and validation errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-'))
  try {
    await pg.exec(
      `CREATE TYPE populated_row AS(n int,s text);CREATE DOMAIN positive_input AS int NOT NULL CHECK(VALUE>0);CREATE TYPE populated_domain AS(n positive_input,s varchar(3));CREATE DOMAIN fault_input AS int CHECK(10/VALUE>0);CREATE TYPE populated_fault AS(n fault_input,s text)`,
    )
    const forms = ['populated_row', 'populated_domain', 'populated_fault']
      .flatMap((type) =>
        ['json_populate_record', 'jsonb_populate_record', 'jsonb_populate_record_valid'].map(
          (fn) => {
            const name = type + '_' + fn,
              base = `CASE WHEN use_base THEN ROW(base_n,base_s)::${type} ELSE NULL::${type} END`,
              call = `pg_catalog.${fn}(${base},data::${fn === 'json_populate_record' ? 'json' : 'jsonb'}${fn === 'json_populate_record' ? ',flag' : ''})`,
              expression = `CASE WHEN bypass THEN true ELSE ${fn.endsWith('_valid') ? call + ' IS NOT DISTINCT FROM expected_bool' : `(${call}).n IS NOT DISTINCT FROM expected_n`} END`
            return { type, fn, name, call, expression }
          },
        ),
      )
      .flatMap((form) =>
        form.fn.endsWith('_valid')
          ? [
              form,
              {
                ...form,
                name: form.name + '_test',
                expression: `CASE WHEN bypass THEN true ELSE ${form.call} IS NOT FALSE END`,
              },
            ]
          : [form],
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.name}(use_base bool,base_n int,base_s text,data text,flag bool,expected_n int,expected_bool bool,bypass bool,CONSTRAINT populated CHECK(${f.expression}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          lower = lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${form.expression})` : undefined,
          )!
        expect(hasUncertain(lower.expression), form.name + origin).toBe(false)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: form.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(lower.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.constraint + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    for (const form of forms)
      for (const useBase of [true, false, null])
        for (const data of [
          null,
          '{}',
          '{"n":null}',
          '{"s":"x"}',
          '{"n":2,"s":"ok"}',
          '{"n":"12"}',
          '{"n":"bad"}',
          '{"n":0}',
          '{"n":-1}',
          '{"n":1.5}',
          '{"n":true}',
          '{"n":2,"s":"long"}',
          'null',
          '[]',
          '1',
          '{"n":1,"n":2}',
          '{"n":"bad","n":2}',
          '{"unused":"\\ud800"}',
          '{"unused":"\\u0000"}',
        ]) {
          const row: Row = {
            use_base: known(useBase),
            base_n: known(3),
            base_s: known('old'),
            data: known(data),
            flag: known(null),
            expected_n: known(data === null && useBase ? 3 : 2),
            expected_bool: known(true),
            bypass: known(false),
          }
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ result: boolean | null }>(
                `WITH args AS MATERIALIZED (SELECT $1::bool use_base,3::int base_n,'old'::text base_s,$2::text data,NULL::bool flag,$3::int expected_n,true expected_bool,false bypass) SELECT ${form.expression} result FROM args`,
                [useBase, data, data === null && useBase ? 3 : 2],
              )
            ).rows[0]!.result
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (e) {
            const code = (e as { code?: string }).code
            if (!code) throw e
            expected = error(code)
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: form.name + '_' + origin, row, expected })
          observations.push({ form: form.name, useBase, data, expected })
        }
    for (const form of forms.filter((f) => f.fn === 'json_populate_record'))
      for (const origin of ['source', 'stored']) {
        const row: Row = {
          use_base: known(false),
          base_n: known(3),
          base_s: known('old'),
          data: known('{"n":2,"s":"ok"}'),
          flag: { kind: 'Unknown' },
          expected_n: known(2),
          expected_bool: known(true),
          bypass: known(false),
        }
        fixtures.push({ name: form.name + '_' + origin, row, expected: { kind: 'True' } })
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            ...row,
            data: known('[]'),
            flag: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          expected: error('22012'),
        })
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            ...row,
            data: known('{'),
            flag: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          expected: error('22P02'),
        })
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            ...row,
            use_base: known(true),
            base_n: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            data: known('{'),
            flag: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          expected: error('22003'),
        })
      }
    for (const [data, code] of [
      ['[]', '22012'],
      ['{', '22P02'],
      [null, '22012'],
    ] as const) {
      await expect(
        pg.query(
          `WITH args AS MATERIALIZED(SELECT $1::text data,0::int denominator)SELECT json_populate_record(NULL::populated_row,data::json,(1/denominator)>0) FROM args`,
          [data],
        ),
      ).rejects.toMatchObject({ code })
    }
    for (const form of forms)
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            use_base: { kind: 'Unknown' },
            base_n: { kind: 'Unknown' },
            base_s: { kind: 'Unknown' },
            data: { kind: 'Unknown' },
            flag: { kind: 'Unknown' },
            expected_n: { kind: 'Unknown' },
            expected_bool: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await runCheckParity(
      directory,
      'json_populate',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})
