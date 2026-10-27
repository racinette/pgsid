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
import { domainElementDefinition } from '../../src/sql-semantics/expressions.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const profiles = [
  'free_root',
  'positive_root',
  'layered_root',
  'required_root',
  'fault_root',
  'constant_fault_root',
] as const
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const baseInput = (id: number): Input =>
  id === 4
    ? { kind: 'Null' }
    : {
        kind: 'Value',
        value: {
          typeName: 'public.root_leaf',
          fields: [
            id === 5 ? { kind: 'Null' } : { kind: 'Int4', value: id === 1 ? 2 : id === 2 ? 0 : -1 },
            id === 5 ? { kind: 'Null' } : { kind: 'Text', value: id === 2 ? 'bad' : 'old' },
          ],
        },
      }

it('populates composite-domain roots with nominal results, coerced bases and reached root checks in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-populate-root-domains-'))
  const packet = 'artifacts/goal-checks/json-populate-root-domain-active'
  try {
    await pg.exec(`CREATE TYPE root_leaf AS(n int,s varchar(3));
      CREATE DOMAIN free_root AS root_leaf;
      CREATE DOMAIN positive_root AS root_leaf;
      CREATE DOMAIN layered_root AS positive_root;
      CREATE DOMAIN required_root AS root_leaf NOT NULL;
      CREATE DOMAIN fault_root AS root_leaf;
      CREATE DOMAIN constant_fault_root AS root_leaf`)
    for (const profile of profiles)
      await pg.exec(`CREATE TABLE seed_${profile}(id int,base ${profile});
        INSERT INTO seed_${profile} VALUES (1,ROW(2,'old')::${profile}),(2,ROW(0,'bad')::${profile}),
        (3,ROW(-1,'old')::${profile}),(5,ROW(NULL,NULL)::${profile})`)
    await pg.exec(`ALTER DOMAIN positive_root ADD CONSTRAINT positive CHECK((VALUE).n>0)NOT VALID;
      ALTER DOMAIN layered_root ADD CONSTRAINT label CHECK((VALUE).s<>'bad')NOT VALID;
      ALTER DOMAIN fault_root ADD CONSTRAINT fault CHECK(10/(VALUE).n>0)NOT VALID;
      ALTER DOMAIN constant_fault_root ADD CONSTRAINT constant_fault CHECK(1/0>0)NOT VALID`)
    const forms = profiles.flatMap((profile) =>
      ['json_populate_record', 'jsonb_populate_record', 'jsonb_populate_record_valid'].flatMap(
        (fn) =>
          (fn.endsWith('_valid') || !['positive_root', 'layered_root'].includes(profile)
            ? [false]
            : [false, true]
          ).flatMap((array) =>
            (fn === 'json_populate_record' && profile === 'positive_root'
              ? [false, true]
              : [false]
            ).map((explicit) => {
              const name =
                profile + '_' + fn + (array ? '_array' : '') + (explicit ? '_explicit' : '')
              const valid = fn.endsWith('_valid')
              const call = `pg_catalog.${fn}(base,data::${fn === 'json_populate_record' ? 'json' : 'jsonb'}${explicit ? ',NULL::boolean' : ''})`
              const value = valid
                ? call
                : array
                  ? `to_jsonb(ARRAY[${call}])::text`
                  : `(${call})::text`
              const expression = `CASE WHEN bypass THEN true ELSE (${array ? `to_jsonb(ARRAY[${call}])` : value}) IS NOT DISTINCT FROM ${valid ? 'expected_bool' : array ? 'expected_text::jsonb' : 'expected_text'} END`
              return { profile, fn, array, name, valid, value, expression }
            }),
          ),
      ),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(base ${form.profile},data text,expected_text text COLLATE "C",expected_bool bool,bypass bool,CONSTRAINT populated CHECK(${form.expression}))`,
      )
    for (const form of forms.filter((f) => f.array)) {
      const call = `pg_catalog.${form.fn}(base,'{}'::${form.fn === 'json_populate_record' ? 'json' : 'jsonb'})`
      expect(
        (
          await pg.query<{ type: string }>(
            `SELECT pg_typeof(ARRAY[${call}])::text type FROM seed_${form.profile} WHERE id=1`,
          )
        ).rows[0]!.type,
      ).toBe(form.profile + '[]')
    }
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!
        const lower = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.expression})` : undefined,
        )!
        if (hasUncertain(lower.expression)) {
          await mkdir(packet, { recursive: true })
          await writeFile(
            packet + '/binding-failure.json',
            JSON.stringify({ form, origin, lower }, null, 2) + '\n',
          )
        }
        expect(hasUncertain(lower.expression), form.name + origin).toBe(false)
        if (form.array) {
          const domains: string[] = []
          const visit = (value: unknown): void => {
            if (Array.isArray(value)) return value.forEach(visit)
            if (!value || typeof value !== 'object') return
            const record = value as Record<string, unknown>
            if (
              record['kind'] === 'array-constructor' &&
              typeof record['elementType'] === 'string'
            ) {
              const definition = domainElementDefinition(record['elementType'])
              if (definition) domains.push(definition.name)
            }
            Object.values(record).forEach(visit)
          }
          visit(lower.expression)
          expect(domains, form.name + origin).toContain(form.profile)
        }
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
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.identity.constraint + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations = []
    for (const form of forms)
      for (const id of [1, 2, 3, 4, 5])
        for (const data of [
          null,
          '{}',
          '{"n":2}',
          '{"n":0}',
          '{"n":-1}',
          '{"n":null}',
          '{"s":"new"}',
          '{"s":"bad"}',
          '{"s":"long"}',
          '{"n":"bad"}',
          '{"n":"bad","n":2}',
          '{"n":2,"s":"long"}',
          'null',
          '[]',
          '1',
          '{',
        ]) {
          let output: string | boolean | null = null
          let expected: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ value: string | boolean | null }>(
                `WITH args AS MATERIALIZED(SELECT t.base,$1::text data FROM (VALUES(1))v(n)LEFT JOIN seed_${form.profile} t ON t.id=$2)SELECT ${form.value} value FROM args`,
                [data, id],
              )
            ).rows[0]!.value
          } catch (e) {
            const code = (e as { code?: string }).code
            if (!code) throw e
            expected = failure(code)
          }
          const row: Row = {
            base: baseInput(id),
            data: known(data),
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
                    : { expected_text: known(form.array ? '{}' : 'wrong') }),
                },
                expected: { kind: 'False' },
              })
          }
          observations.push({ name: form.name, id, data, output, expected })
        }
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const name = form.name + '_' + origin
        const row: Row = {
          base: { kind: 'Unknown' },
          data: known('{}'),
          expected_text: known(null),
          expected_bool: known(null),
          bypass: known(false),
        }
        fixtures.push({ name, row, expected: { kind: 'Unknown' } })
        fixtures.push({
          name,
          row: { ...row, base: failure('22003') as Input, data: failure('22012') as Input },
          expected: failure('22003'),
        })
        fixtures.push({ name, row: { ...row, bypass: known(true) }, expected: { kind: 'True' } })
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
      'json_populate_root_domains',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
