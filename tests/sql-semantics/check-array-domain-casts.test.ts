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

it('preserves per-element domain conversion and computed-array evaluation order in raw and stored CHECKs across all targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-array-casts-'))
  try {
    await pg.exec(`
      CREATE DOMAIN constant_error AS integer CHECK(VALUE>1/0);
      CREATE DOMAIN positive_count AS integer CHECK (VALUE>0);
      CREATE DOMAIN required_count AS positive_count NOT NULL;
      CREATE DOMAIN limited_count AS positive_count CHECK (VALUE<10);
      CREATE DOMAIN code AS varchar(3) COLLATE "C" CHECK (VALUE<>'');
      CREATE DOMAIN rounded AS numeric(3,1) CHECK (VALUE>0);
      CREATE TYPE domain_stage AS ENUM ('new','done');
      CREATE DOMAIN stage_value AS domain_stage CHECK (VALUE<>'done');
      CREATE TABLE array_casts(quantity integer,divisor integer,first text,second text,bypass boolean,typed positive_count,typed_nn required_count);
      CREATE TABLE array_oracle(LIKE array_casts);
    `)
    const forms = {
      direct: 'cardinality(ARRAY[quantity,1/divisor]::positive_count[])=2',
      computed: 'cardinality(ARRAY[quantity,1/divisor]::integer[]::positive_count[])=2',
      direct_text: 'cardinality(ARRAY[first,second]::positive_count[])=2',
      computed_text: 'cardinality(ARRAY[first,second]::text[]::positive_count[])=2',
      nested: 'cardinality(ARRAY[ARRAY[quantity,1],ARRAY[2,3]]::positive_count[])=4',
      computed_nested:
        'cardinality(ARRAY[ARRAY[quantity,1],ARRAY[2,3]]::integer[]::positive_count[])=4',
      nn: 'cardinality(ARRAY[quantity,NULL]::required_count[])=2',
      computed_nn: 'cardinality(ARRAY[quantity,NULL]::integer[]::required_count[])=2',
      domain_chain: 'cardinality(ARRAY[quantity]::limited_count[])=1',
      empty: 'cardinality(ARRAY[]::required_count[])=0',
      computed_empty: 'cardinality(ARRAY[]::integer[]::required_count[])=0',
      null_array: 'NULL::integer[]::required_count[] IS NULL',
      code_direct: '(ARRAY[first]::code[])[1]::text COLLATE "C"=left(first,3) COLLATE "C"',
      code_computed:
        '(ARRAY[first]::text[]::code[])[1]::text COLLATE "C"=left(first,3) COLLATE "C"',
      numeric_direct: 'cardinality(ARRAY[first]::rounded[])=1',
      numeric_computed: 'cardinality(ARRAY[first]::text[]::rounded[])=1',
      enum_direct: 'cardinality(ARRAY[first]::stage_value[])=1',
      enum_computed: 'cardinality(ARRAY[first]::text[]::stage_value[])=1',
      typed_noop: 'cardinality(ARRAY[typed]::positive_count[])=1',
      typed_nn_noop: 'cardinality(ARRAY[typed_nn]::required_count[])=1',
      domain_to_base: 'cardinality(ARRAY[typed]::integer[])=1',
      domain_to_wide: 'cardinality(ARRAY[typed]::bigint[])=1',
      domain_to_domain: 'cardinality(ARRAY[typed]::required_count[])=1',
      empty_constant: 'cardinality(ARRAY[]::constant_error[])=0',
      skipped_direct:
        'CASE WHEN bypass THEN true ELSE cardinality(ARRAY[quantity,1/divisor]::positive_count[])=2 END',
      skipped_computed:
        'CASE WHEN bypass THEN true ELSE cardinality(ARRAY[quantity,1/divisor]::integer[]::positive_count[])=2 END',
      skipped_text:
        'CASE WHEN bypass THEN true ELSE cardinality(ARRAY[first,second]::text[]::positive_count[])=2 END',
      coalesce: 'cardinality(COALESCE(NULL::positive_count[],ARRAY[quantity]::positive_count[]))=1',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE array_casts ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_casts')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: 'array_casts',
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
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
    const samples = [
      [1, 1, '1', '2', false, 1, 1],
      [0, 0, '0', 'bad', false, null, 1],
      [-1, 0, 'bad', '0', false, 1, 1],
      [11, 1, '11', '1', false, 1, 1],
      [null, 1, null, null, false, null, 1],
      [1, 0, 'bad', 'bad', true, 1, 1],
      [1, 1, 'abc', 'abcd', false, 1, 1],
      [1, 1, '', '', false, 1, 1],
      [1, 1, '1.26', '0.04', false, 1, 1],
      [1, 1, 'new', 'done', false, 1, 1],
      [1, 1, 'done', 'new', false, 1, 1],
      [1, 1, '雪abc', 'abc', false, 1, 1],
    ] as const
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const sample of samples) {
      await pg.exec('TRUNCATE array_oracle')
      await pg.query('INSERT INTO array_oracle VALUES($1,$2,$3,$4,$5,$6,$7)', [...sample])
      const row: Row = Object.fromEntries(
        ['quantity', 'divisor', 'first', 'second', 'bypass', 'typed', 'typed_nn'].map(
          (name, index) => [name, known(sample[index]!)],
        ),
      )
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(`SELECT ${sql} AS actual FROM array_oracle`)
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = failure((error as { code: string }).code)
        }
        references.push({ name, sample, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    }
    const base: Row = {
      quantity: known(1),
      divisor: known(1),
      first: known('1'),
      second: known('2'),
      bypass: known(false),
      typed: known(1),
      typed_nn: known(1),
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'typed_nn_noop_' + origin,
        row: { ...base, typed_nn: known(null) },
        expected: { kind: 'True' },
      })
      for (const name of ['direct', 'computed', 'skipped_direct', 'skipped_computed']) {
        fixtures.push({
          name: name + '_' + origin,
          row: { ...base, quantity: { kind: 'Unknown' }, divisor: known(0) },
          expected: name.includes('computed') ? failure('22012') : { kind: 'Unknown' },
        })
        fixtures.push({
          name: name + '_' + origin,
          row: {
            ...base,
            quantity: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            divisor: known(0),
          },
          expected: failure('22003'),
        })
      }
    }
    expect(fixtures).toHaveLength(690)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_CAST_ARTIFACT_DIR']
    if (artifacts) {
      await mkdir(artifacts, { recursive: true })
      await writeFile(join(artifacts, 'fixtures.json'), JSON.stringify(fixtures, null, 2) + '\n')
      await writeFile(
        join(artifacts, 'postgres-reference.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
      await writeFile(join(artifacts, 'plans.json'), JSON.stringify(plans, null, 2) + '\n')
    }
    await runCheckParity(
      directory,
      'domainarraycasts',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600000)

it('prepares domain-array cast metadata in PostgreSQL order while retaining static branch pruning and explicit encoding requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-array-preparation-'))
  try {
    await pg.exec(`CREATE DOMAIN prepared_error AS integer CHECK(VALUE>1/0);
      CREATE DOMAIN prepared_overflow AS integer CHECK(VALUE>2147483647+1);
      CREATE DOMAIN prepared_unicode AS integer CHECK(VALUE>length(chr(233)));
      CREATE TABLE array_preparation(source integer,divisor integer,bypass boolean);
      INSERT INTO array_preparation VALUES(2,0,true)`)
    const forms = {
      empty_direct: 'cardinality(ARRAY[]::prepared_error[])=0',
      empty_computed: 'cardinality(ARRAY[]::integer[]::prepared_error[])=0',
      null_computed: 'NULL::integer[]::prepared_error[] IS NULL',
      runtime_skip:
        'CASE WHEN bypass THEN true ELSE cardinality(ARRAY[]::integer[]::prepared_error[])=0 END',
      static_skip:
        'CASE WHEN true THEN true ELSE cardinality(ARRAY[]::integer[]::prepared_error[])=0 END',
      direct_runtime_skip:
        'CASE WHEN bypass THEN true ELSE cardinality(ARRAY[source]::prepared_error[])=1 END',
      metadata_before_runtime: 'cardinality(ARRAY[1/divisor]::integer[]::prepared_overflow[])=1',
      operand_constant_first: 'cardinality(ARRAY[2147483647+1]::integer[]::prepared_error[])=1',
      unicode_empty_direct: 'cardinality(ARRAY[]::prepared_unicode[])=0',
      unicode_empty_computed: 'cardinality(ARRAY[]::integer[]::prepared_unicode[])=0',
      unicode_value: 'cardinality(ARRAY[source]::integer[]::prepared_unicode[])=1',
      unicode_runtime_skip:
        'CASE WHEN bypass THEN true ELSE cardinality(ARRAY[source]::integer[]::prepared_unicode[])=1 END',
      unicode_static_skip:
        'CASE WHEN true THEN true ELSE cardinality(ARRAY[source]::integer[]::prepared_unicode[])=1 END',
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_preparation')!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: 'array_preparation',
        constraint: name,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
        )!.expression,
      ),
    }))
    for (const plan of plans)
      expect(plan.expression.kind, plan.identity.constraint).not.toBe('uncertain')
    const references: unknown[] = []
    for (const [context, encoding] of [
      ['utf8', true],
      ['missing', false],
    ] as const) {
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        ...(encoding ? { serverEncoding: 'UTF8' as const } : {}),
      })
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [source, bypass] of [
        [2, true],
        [1, false],
        [null, false],
      ] as const) {
        await pg.query('UPDATE array_preparation SET source=$1,bypass=$2', [source, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const actual = (
              await pg.query<{ actual: boolean | null }>(
                `SELECT ${sql} AS actual FROM array_preparation`,
              )
            ).rows[0]!.actual
            expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
          } catch (error) {
            expected = failure((error as { code: string }).code)
          }
          references.push({ context, name, source, bypass, postgres: expected })
          if (
            !encoding &&
            ['unicode_empty_computed', 'unicode_value', 'unicode_runtime_skip'].includes(name)
          )
            expected = { kind: 'Unknown' }
          fixtures.push({
            name,
            row: { source: known(source), divisor: known(0), bypass: known(bypass) },
            expected,
          })
        }
      }
      expect(fixtures).toHaveLength(39)
      await mkdir(join(directory, context), { recursive: true })
      await runCheckParity(
        join(directory, context),
        'domainarraypreparation',
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures,
      )
    }
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_CAST_ARTIFACT_DIR']
    if (artifacts)
      await writeFile(
        join(artifacts, 'preparation-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
