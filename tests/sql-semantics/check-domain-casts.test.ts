import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('coerces scalar domains with base input, explicit typmods, ordered CHECKs, NULL rules and local VALUE bindings', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-casts-'))
  try {
    await pg.exec(`
      CREATE DOMAIN positive_count AS integer CHECK(VALUE>0);
      CREATE DOMAIN limited_count AS positive_count CHECK(VALUE<=10);
      CREATE DOMAIN nonnull_count AS integer NOT NULL;
      CREATE DOMAIN required_positive AS positive_count NOT NULL;
      CREATE DOMAIN inner_null_check AS integer CHECK(VALUE IS NOT NULL);
      CREATE DOMAIN outer_required AS inner_null_check NOT NULL;
      CREATE DOMAIN check_first AS integer CONSTRAINT b_division CHECK(1/VALUE>0) CONSTRAINT a_positive CHECK(VALUE>0);
      CREATE DOMAIN division_first AS integer CONSTRAINT b_positive CHECK(VALUE>0) CONSTRAINT a_division CHECK(1/VALUE>0);
      CREATE DOMAIN rounded_count AS numeric(4,1) CHECK(VALUE>0);
      CREATE DOMAIN short_name AS varchar(3) COLLATE "C" CHECK(VALUE<>'');
      CREATE DOMAIN enabled_flag AS boolean CHECK(VALUE);
      CREATE TYPE conversion_stage AS ENUM ('new','done','雪');
      CREATE DOMAIN active_stage AS conversion_stage CHECK(VALUE<>'done'::conversion_stage);
      CREATE DOMAIN context_count AS integer CHECK(VALUE IS NULL OR current_setting('app.domain_check',true) IS NULL);
      CREATE DOMAIN constant_error AS integer CHECK(1/0>0);
      CREATE DOMAIN late_constant_error AS integer CONSTRAINT a_positive CHECK(VALUE>0) CONSTRAINT b_error CHECK(1/0>0);
      CREATE TYPE custom_stage AS ENUM ('new','done');
      CREATE FUNCTION custom_stage_from_text(text) RETURNS custom_stage LANGUAGE sql IMMUTABLE AS $$SELECT 'done'::custom_stage$$;
      CREATE CAST(text AS custom_stage) WITH FUNCTION custom_stage_from_text(text);
      CREATE TABLE domain_inputs(source text,quantity integer,divisor integer,bypass boolean,typed positive_count,typed_nn nonnull_count,label conversion_stage,expected_text text,value text);
      CREATE TABLE domain_oracle(LIKE domain_inputs);
      CREATE TABLE domain_nn_empty(value nonnull_count);
    `)
    const forms: Record<
      string,
      { sql: string; sourceOnly?: boolean; context?: boolean; alwaysUnknown?: boolean }
    > = {
      text_positive: { sql: 'source::positive_count>0' },
      int_positive: { sql: 'quantity::positive_count>0' },
      limited: { sql: 'quantity::limited_count>0' },
      required: { sql: 'source::required_positive IS NOT NULL' },
      required_null: { sql: 'source::nonnull_count IS NULL' },
      outer_required: { sql: 'source::outer_required IS NULL' },
      check_order: { sql: 'quantity::check_first IS NOT NULL' },
      division_order: { sql: 'quantity::division_first IS NOT NULL' },
      numeric_modifier: {
        sql: 'source::rounded_count::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      },
      varchar_modifier: {
        sql: 'source::short_name::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"',
      },
      boolean_check: { sql: 'source::enabled_flag IS NOT NULL' },
      enum_check: { sql: 'source::active_stage::conversion_stage=label' },
      same_domain: { sql: 'typed::positive_count IS NULL' },
      same_required: { sql: 'typed_nn::nonnull_count IS NULL' },
      divided_base: { sql: '(quantity/divisor)::positive_count>0' },
      first_error: { sql: 'source::positive_count+1/divisor>0' },
      guarded: { sql: 'CASE WHEN bypass THEN true ELSE source::positive_count>0 END' },
      pruned_domain: { sql: 'CASE WHEN true THEN true ELSE 0::positive_count>0 END' },
      pruned_expression: { sql: 'CASE WHEN true THEN true ELSE (1/0)::positive_count>0 END' },
      pruned_enum_runtime: {
        sql: "CASE WHEN true THEN true ELSE 'bad'::text::active_stage IS NULL END",
      },
      pruned_bad_literal: {
        sql: "CASE WHEN true THEN true ELSE 'bad'::positive_count>0 END",
        sourceOnly: true,
      },
      pruned_enum_literal: {
        sql: "CASE WHEN true THEN true ELSE 'bad'::active_stage IS NULL END",
        sourceOnly: true,
      },
      context_null: { sql: 'NULL::context_count IS NULL' },
      context_nonnull: { sql: 'quantity::context_count>0', context: true },
      value_column: { sql: 'source::positive_count>0 AND value COLLATE "C" = \'row-value\'' },
      custom_cast: { sql: "source::custom_stage='new'::custom_stage", alwaysUnknown: true },
      custom_literal: { sql: "'new'::custom_stage='new'::custom_stage" },
      metadata_error: { sql: 'source::constant_error IS NOT NULL' },
      metadata_late: { sql: 'quantity::late_constant_error>0' },
      metadata_guarded: { sql: 'CASE WHEN bypass THEN true ELSE source::constant_error>0 END' },
      metadata_pruned: { sql: 'CASE WHEN true THEN true ELSE source::constant_error>0 END' },
      metadata_base_planning: { sql: '(2147483647+1)::constant_error>0', sourceOnly: true },
      metadata_bad_literal: {
        sql: "CASE WHEN true THEN true ELSE 'bad'::constant_error>0 END",
        sourceOnly: true,
      },
      metadata_other_planning: { sql: 'source::constant_error+(2147483647+1)>0', sourceOnly: true },
    }
    for (const [name, form] of Object.entries(forms))
      if (!form.sourceOnly)
        await pg.exec(
          `ALTER TABLE domain_inputs ADD CONSTRAINT "${name}" CHECK(${form.sql}) NOT VALID`,
        )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'domain_inputs')!
    const custom = catalog.enums.find((item) => item.name === 'custom_stage')!
    expect(custom.inputSources).not.toContain('pg_catalog.text')
    expect(custom.inputSources).toContain('pg_catalog."varchar"')
    expect(
      (
        await pg.query<{ value: string }>(
          "SELECT ('not-a-label'::text::custom_stage)::text AS value",
        )
      ).rows[0]!.value,
    ).toBe('done')
    const plans = Object.entries(forms).flatMap(([name, form]) =>
      (form.sourceOnly ? ['source'] : ['source', 'stored']).map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'stored'
                ? constraint!
                : { name, type: 'check', definition: `CHECK(${form.sql})` },
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
            )!.expression,
          ),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries()) {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind === 'supported')
        expect(
          check.inputs.every((input) => table.columns.some((column) => column.name === input.name)),
        ).toBe(true)
    }
    expect(group.evaluatorSource).toContain('domain_conversion_check(')
    expect(group.evaluatorSource).not.toContain('make_catalog_enum_value(')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      ['1', 1, 1, false, 1, 1, 'new', '1'],
      ['0', 0, 0, false, null, 1, 'new', '0'],
      ['-1', -1, 0, true, 1, 1, 'done', '-1'],
      ['11', 11, 1, false, 1, 1, 'new', '11'],
      ['bad', 1, 0, false, 1, 1, 'new', 'bad'],
      [null, null, 0, false, null, 1, 'new', null],
      ['1.26', 1, 1, false, 1, 1, 'new', '1.3'],
      ['0.04', 0, 1, true, 1, 1, 'new', '0.0'],
      ['10000', 1, 1, false, 1, 1, 'new', '10000'],
      ['NaN', 1, 1, false, 1, 1, 'new', 'NaN'],
      ['abc', 1, 1, false, 1, 1, 'new', 'abc'],
      ['abcd', 1, 1, true, 1, 1, 'new', 'abc'],
      ['abc ', 1, 1, false, 1, 1, 'new', 'abc'],
      ['', 1, 1, false, 1, 1, 'new', ''],
      ['true', 1, 1, false, 1, 1, 'new', 'tru'],
      ['false', 1, 1, false, 1, 1, 'new', 'fal'],
      ['new', 1, 1, false, 1, 1, 'new', 'new'],
      ['done', 1, 1, false, 1, 1, 'done', 'don'],
      ['雪', 1, 1, false, 1, 1, '雪', '雪'],
    ] as const
    for (const sample of samples) {
      await pg.exec('TRUNCATE domain_oracle')
      await pg.query('INSERT INTO domain_oracle VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        ...sample,
        'row-value',
      ])
      const row: Row = Object.fromEntries(
        [
          'source',
          'quantity',
          'divisor',
          'bypass',
          'typed',
          'typed_nn',
          'label',
          'expected_text',
          'value',
        ].map((name, index) => [
          name,
          name === 'label'
            ? known(['new', 'done', '雪'].indexOf(sample[6]))
            : known([...sample, 'row-value'][index]!),
        ]),
      )
      for (const [name, form] of Object.entries(forms)) {
        let expected: Outcome
        let postgres: unknown
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(
              `SELECT ${form.sql} AS actual FROM domain_oracle`,
            )
          ).rows[0]!.actual
          postgres = actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          const state = (error as { code: string }).code
          postgres = { state, constraint: (error as { constraint?: string }).constraint ?? null }
          expected = failure(state)
        }
        if (form.context && sample[1] !== null) expected = { kind: 'Unknown' }
        if (form.alwaysUnknown) expected = { kind: 'Unknown' }
        references.push({ name, sample, postgres, expected })
        for (const origin of form.sourceOnly ? ['source'] : ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    }
    const base: Row = {
      source: known('1'),
      quantity: known(1),
      divisor: known(0),
      bypass: known(false),
      typed: known(null),
      typed_nn: known(1),
      label: known(0),
      expected_text: known('1'),
      value: known('row-value'),
    }
    fixtures.push({
      name: 'text_positive_source',
      row: { ...base, source: { kind: 'Unknown' } },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'first_error_source',
      row: { ...base, source: { kind: 'Unknown' } },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'text_positive_source',
      row: { ...base, source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
      expected: failure('22012'),
    })
    fixtures.push({
      name: 'guarded_source',
      row: { ...base, bypass: known(true), source: { kind: 'Unknown' } },
      expected: { kind: 'True' },
    })
    expect(
      (
        await pg.query<{ value: boolean }>(
          'SELECT ((SELECT value FROM domain_nn_empty)::nonnull_count) IS NULL AS value',
        )
      ).rows[0]!.value,
    ).toBe(true)
    fixtures.push({
      name: 'same_required_source',
      row: { ...base, typed_nn: known(null) },
      expected: { kind: 'True' },
    })
    await mkdir('artifacts/domain-casts', { recursive: true })
    await writeFile(
      'artifacts/domain-casts/scalar-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/domain-casts/scalar-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile('artifacts/domain-casts/scalar-evaluator.rs', group.evaluatorSource!)
    await writeFile(
      'artifacts/domain-casts/scalar-plans.json',
      JSON.stringify(plans, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(1202)
    await runCheckParity(
      directory,
      'domaincasts',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves reached domain CHECK preparation requirements, earlier errors and statically pruned branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-context-'))
  try {
    await pg.exec(
      `CREATE DOMAIN wide_character AS integer CHECK(chr(128512) COLLATE "C"='😀' COLLATE "C");CREATE TABLE domain_context(source text,bypass boolean);`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'domain_context')!
    const forms = {
      context_first: 'source::wide_character+(2147483647+1)>0',
      context_after: '(2147483647+1)+source::wide_character>0',
      runtime_input: 'source::wide_character>0',
      pruned: 'CASE WHEN true THEN true ELSE source::wide_character>0 END',
      runtime_skipped: 'CASE WHEN bypass THEN true ELSE source::wide_character>0 END',
      literal_error: "CASE WHEN true THEN true ELSE 'bad'::wide_character>0 END",
    }
    const evaluators: ReturnType<typeof emitCheckRustEvaluator>[] = [],
      names: string[] = []
    for (const utf8 of [false, true])
      for (const [name, sql] of Object.entries(forms)) {
        const constraint = name + '_' + (utf8 ? 'utf8' : 'missing')
        const expression = portableCheckAtoms(
          lowerTableCheck(
            table,
            { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            'source',
          )!.expression,
        )
        evaluators.push(
          emitCheckRustEvaluator(
            expression,
            { schema: 'public', kind: 'table', owner: table.name, constraint },
            utf8 ? { defaultCollation: 'C', serverEncoding: 'UTF8' } : { defaultCollation: 'C' },
          ),
        )
        names.push(constraint)
      }
    const evaluatorSource = evaluators.map((item) => item.source).join('\n')
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: [...new Set(evaluators.flatMap((item) => item.callables))],
    })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: evaluators.map((item) => ({
        kind: 'supported',
        entryName: item.entryName,
        inputs: item.inputs,
      })),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const payload of ['1', 'bad', null])
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE domain_context')
        await pg.query('INSERT INTO domain_context VALUES($1,$2)', [payload, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let postgres: Outcome
          try {
            const actual = (
              await pg.query<{ actual: boolean | null }>(
                `SELECT ${sql} AS actual FROM domain_context`,
              )
            ).rows[0]!.actual
            postgres = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
          } catch (error) {
            postgres = failure((error as { code: string }).code)
          }
          for (const utf8 of [false, true]) {
            const expected: Outcome =
              utf8 || ['context_after', 'pruned', 'literal_error'].includes(name)
                ? postgres
                : { kind: 'Unknown' }
            const fixture = {
              name: name + '_' + (utf8 ? 'utf8' : 'missing'),
              row: { source: known(payload), bypass: known(bypass) },
              expected,
            }
            fixtures.push(fixture)
            references.push({ payload, bypass, name, utf8, postgres, expected })
          }
        }
      }
    expect(fixtures).toHaveLength(72)
    await mkdir('artifacts/domain-casts', { recursive: true })
    await writeFile(
      'artifacts/domain-casts/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/domain-casts/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'domaincontext', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
