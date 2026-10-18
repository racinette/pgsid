import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('coerces constrained whole-array domains with ordered constraints, NOT NULL, typmods, nominal element arrays and lazy composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-domain-value-'))
  try {
    await pg.exec(`CREATE DOMAIN slot_pair AS integer[] CHECK(cardinality(VALUE)=2);
      CREATE DOMAIN positive_pair AS slot_pair CHECK(VALUE[1]>0);
      CREATE DOMAIN required_pair AS positive_pair NOT NULL;
      CREATE DOMAIN present_array AS integer[] CHECK(VALUE IS NOT NULL);
      CREATE DOMAIN required_array AS present_array NOT NULL;
      CREATE DOMAIN short_codes AS varchar(3)[] COLLATE "C" CHECK(cardinality(VALUE)=2);
      CREATE DOMAIN rounded_array AS numeric(3,1)[] CHECK(VALUE[1]>0);
      CREATE TYPE array_stage AS ENUM('new','done','雪');
      CREATE DOMAIN active_stages AS array_stage[] CHECK(VALUE[1]<>'done');
      CREATE DOMAIN positive_slot AS integer CHECK(VALUE>0);
      CREATE DOMAIN nominal_pair AS positive_slot[] CHECK(cardinality(VALUE)=2);
      CREATE DOMAIN error_array AS integer[] CHECK(cardinality(VALUE)>1/0);
      CREATE DOMAIN context_array AS integer[] CHECK(VALUE IS NULL OR current_setting('app.array_domain',true) IS NULL);
      CREATE TABLE array_domain_input(payload text,numerator integer,divisor integer,bypass boolean);
      CREATE TABLE array_domain_oracle(LIKE array_domain_input)`)
    const forms: Record<string, { sql: string; sourceOnly?: boolean; context?: boolean }> = {
      size: { sql: 'cardinality(payload::slot_pair)=2' },
      first: { sql: '(payload::slot_pair)[1]=1' },
      dimensions: { sql: 'array_dims(payload::slot_pair) COLLATE "C"=\'[1:2]\'' },
      positive: { sql: 'cardinality(payload::positive_pair)=2' },
      required: { sql: 'payload::required_pair IS NOT NULL' },
      not_null_precedence: { sql: 'payload::required_array IS NOT NULL' },
      present: { sql: 'payload::present_array IS NOT NULL' },
      code_size: { sql: 'cardinality(payload::short_codes)=2' },
      code_value: { sql: '(payload::short_codes)[1]::text COLLATE "C"=\'abc\'' },
      numeric_value: { sql: '(payload::rounded_array)[1]=1.3::numeric' },
      enum_value: { sql: "(payload::active_stages)[1]='new'::array_stage" },
      element_domains: { sql: 'cardinality(payload::nominal_pair)=2' },
      constructed: { sql: 'cardinality(ARRAY[numerator,1/divisor]::positive_pair)=2' },
      numeric_values: {
        sql: '(ARRAY[1::numeric,1::numeric/3::numeric]::rounded_array)[2]=0.3::numeric',
      },
      numeric_constructor: {
        sql: 'cardinality(ARRAY[numerator::numeric,1::numeric/divisor::numeric]::rounded_array)=2',
      },
      numeric_computed: {
        sql: 'cardinality(ARRAY[numerator::numeric,1::numeric/divisor::numeric]::numeric[]::rounded_array)=2',
      },
      numeric_nested: {
        sql: 'cardinality(ARRAY[ARRAY[numerator::numeric,1::numeric/divisor::numeric],ARRAY[1::numeric,2::numeric]]::rounded_array)=4',
      },
      numeric_nested_computed: {
        sql: 'cardinality(ARRAY[ARRAY[numerator::numeric,1::numeric/divisor::numeric],ARRAY[1::numeric,2::numeric]]::numeric[]::rounded_array)=4',
      },
      constructed_elements: { sql: 'cardinality(ARRAY[numerator,1/divisor]::nominal_pair)=2' },
      skipped: { sql: 'CASE WHEN bypass THEN true ELSE cardinality(payload::required_pair)=2 END' },
      coalesce: { sql: 'cardinality(COALESCE(payload::slot_pair,ARRAY[1,2]::slot_pair))=2' },
      case_result: {
        sql: 'cardinality(CASE WHEN bypass THEN ARRAY[1,2]::slot_pair ELSE payload::slot_pair END)=2',
      },
      any: { sql: '1=ANY(payload::slot_pair)' },
      metadata: { sql: 'payload::error_array IS NOT NULL', sourceOnly: true },
      metadata_skipped: {
        sql: 'CASE WHEN bypass THEN true ELSE payload::error_array IS NOT NULL END',
        sourceOnly: true,
      },
      metadata_pruned: {
        sql: 'CASE WHEN true THEN true ELSE payload::error_array IS NOT NULL END',
        sourceOnly: true,
      },
      literal_constraint_pruned: {
        sql: "CASE WHEN true THEN true ELSE '{1}'::slot_pair IS NOT NULL END",
        sourceOnly: true,
      },
      literal_input_pruned: {
        sql: "CASE WHEN true THEN true ELSE '{bad}'::slot_pair IS NOT NULL END",
        sourceOnly: true,
      },
      width_literal: {
        sql: "('{abcd,efgh}'::short_codes)[1]::text COLLATE \"C\"='abc'",
        sourceOnly: true,
      },
      width_constructor: {
        sql: "(ARRAY['abcd','efgh']::short_codes)[1]::text COLLATE \"C\"='abc'",
      },
      context_null: { sql: 'NULL::context_array IS NULL' },
      context_value: { sql: 'payload::context_array IS NOT NULL', context: true },
    }
    for (const [name, form] of Object.entries(forms))
      if (!form.sourceOnly)
        await pg.exec(`ALTER TABLE array_domain_input ADD CONSTRAINT "${name}" CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_domain_input')!
    const plans = Object.entries(forms).flatMap(([name, form]) =>
      (form.sourceOnly ? ['source'] : ['source', 'stored']).map((origin) => ({
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
              ? { name, type: 'check', definition: `CHECK(${form.sql})` }
              : table.constraints.find((item) => item.name === name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
    for (const plan of plans)
      expect(plan.expression.kind, plan.identity.constraint).not.toBe('uncertain')
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
    const samples: [string | null, number | null, number, boolean][] = [
      ['{1,2}', 1000, 0, false],
      ['{1,2}', 1000, 1, false],
      ['{1,2}', 1, 1, false],
      ['{1}', 0, 0, false],
      ['{0,2}', 0, 0, false],
      ['{bad,0}', 1, 1, false],
      ['{NULL,2}', null, 1, false],
      ['{}', 1, 1, false],
      [null, null, 1, false],
      ['{{1,2},{3,4}}', 1, 1, false],
      ['[0:1]={1,2}', 1, 1, false],
      ['{abc,def}', 1, 1, false],
      ['{abcd,efgh}', 1, 1, false],
      ['{1.26,2.34}', 1, 1, false],
      ['{0.04,1}', 1, 1, false],
      ['{new,雪}', 1, 1, false],
      ['{done,new}', 1, 1, false],
      ['{bad,0}', 0, 0, true],
      ['{', 1, 1, false],
      ['{1,}', 1, 1, false],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [payload, numerator, divisor, bypass] of samples) {
      await pg.exec('TRUNCATE array_domain_oracle')
      await pg.query('INSERT INTO array_domain_oracle VALUES($1,$2,$3,$4)', [
        payload,
        numerator,
        divisor,
        bypass,
      ])
      for (const [name, form] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(
              `SELECT ${form.sql} AS actual FROM array_domain_oracle`,
            )
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = failure((error as { code: string }).code)
        }
        references.push({ name, payload, numerator, divisor, bypass, postgres: expected })
        if (
          form.context &&
          payload !== null &&
          payload !== '{' &&
          payload !== '{bad,0}' &&
          payload !== '{1,}' &&
          ![
            '{abc,def}',
            '{abcd,efgh}',
            '{1.26,2.34}',
            '{0.04,1}',
            '{new,雪}',
            '{done,new}',
          ].includes(payload)
        )
          expected = { kind: 'Unknown' }
        for (const origin of form.sourceOnly ? ['source'] : ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: {
              payload: known(payload),
              numerator: known(numerator),
              divisor: known(divisor),
              bypass: known(bypass),
            },
            expected,
          })
      }
    }
    for (const name of [
      'numeric_constructor',
      'numeric_computed',
      'numeric_nested',
      'numeric_nested_computed',
    ])
      for (const origin of ['source', 'stored']) {
        const row: Row = {
          payload: known('{1,2}'),
          numerator: { kind: 'Unknown' },
          divisor: known(0),
          bypass: known(false),
        }
        fixtures.push({
          name: name + '_' + origin,
          row,
          expected: name.includes('computed') ? failure('22012') : { kind: 'Unknown' },
        })
        fixtures.push({
          name: name + '_' + origin,
          row: { ...row, numerator: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
          expected: failure('22003'),
        })
      }
    expect(fixtures).toHaveLength(1176)
    const artifacts = process.env['PGSID_ARRAY_DOMAIN_VALUE_ARTIFACT_DIR']
    if (artifacts) {
      await mkdir(artifacts, { recursive: true })
      await writeFile(join(artifacts, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
      await writeFile(
        join(artifacts, 'references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
      await writeFile(join(artifacts, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    }
    await runCheckParity(
      directory,
      'arraydomainvalues',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
