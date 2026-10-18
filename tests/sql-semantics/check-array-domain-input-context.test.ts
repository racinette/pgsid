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

const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('prepares domain-array literals before pruning while preserving runtime text-cast laziness and first input failures', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-input-literal-'))
  try {
    await pg.exec(
      `CREATE DOMAIN positive_literal AS integer CHECK(VALUE>0);CREATE DOMAIN required_literal AS positive_literal NOT NULL;CREATE DOMAIN error_literal AS integer CHECK(VALUE>1/0);CREATE DOMAIN short_literal AS varchar(3);CREATE TABLE literal_source(bypass boolean);INSERT INTO literal_source VALUES(true)`,
    )
    const forms = {
      good: "cardinality('{1,2}'::positive_literal[])=2",
      check_first: "cardinality('{0,bad}'::positive_literal[])>0",
      input_first: "cardinality('{bad,0}'::positive_literal[])>0",
      before_grammar: "cardinality('{0,'::positive_literal[])>0",
      grammar_first: "cardinality('{'::positive_literal[])>0",
      static_pruned_literal:
        "CASE WHEN true THEN true ELSE cardinality('{0}'::positive_literal[])>0 END",
      runtime_pruned_literal:
        "CASE WHEN bypass THEN true ELSE cardinality('{0}'::positive_literal[])>0 END",
      static_pruned_text:
        "CASE WHEN true THEN true ELSE cardinality('{0}'::text::positive_literal[])>0 END",
      runtime_pruned_text:
        "CASE WHEN bypass THEN true ELSE cardinality('{0}'::text::positive_literal[])>0 END",
      metadata_first: "cardinality('{bad}'::error_literal[])>0",
      metadata_empty: "cardinality('{}'::error_literal[])=0",
      metadata_pruned: "CASE WHEN true THEN true ELSE cardinality('{bad}'::error_literal[])>0 END",
      null_not_null: "cardinality('{NULL}'::required_literal[])>0",
      null_pruned: "CASE WHEN true THEN true ELSE cardinality('{NULL}'::required_literal[])>0 END",
      width_input: "cardinality('{abcd}'::short_literal[])>0",
      width_pruned: "CASE WHEN true THEN true ELSE cardinality('{abcd}'::short_literal[])>0 END",
      width_cast: "cardinality(ARRAY['abcd']::text[]::short_literal[])=1",
      first_literal_error: "cardinality('{0}'::positive_literal[])+1/0>0",
      literal_before_operator: "1/0+cardinality('{bad}'::positive_literal[])>0",
      empty_then_operator: "cardinality('{}'::positive_literal[])+1/0>0",
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'literal_source')!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: 'literal_source',
        constraint: name,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
        )!.expression,
      ),
    }))
    for (const plan of plans)
      expect(plan.expression.kind, plan.identity.constraint).not.toBe('uncertain')
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const bypass of [true, false]) {
      await pg.query('UPDATE literal_source SET bypass=$1', [bypass])
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(
              `SELECT ${sql} AS actual FROM literal_source`,
            )
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = failure((error as { code: string }).code)
        }
        fixtures.push({ name, row: { bypass: known(bypass) }, expected })
        references.push({ name, sql, bypass, expected })
      }
    }
    expect(fixtures).toHaveLength(40)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
    if (artifacts) {
      await mkdir(artifacts, { recursive: true })
      await writeFile(
        join(artifacts, 'literal-fixtures.json'),
        JSON.stringify(fixtures, null, 2) + '\n',
      )
      await writeFile(
        join(artifacts, 'literal-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
    }
    await runCheckParity(
      directory,
      'domaininputliterals',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('initializes input constraints only for reached element events and preserves missing encoding and array-NULL context as Unknown', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-input-context-'))
  try {
    await pg.exec(
      `CREATE DOMAIN unicode_input AS integer CHECK(VALUE>length(chr(233)));CREATE DOMAIN positive_context AS integer CHECK(VALUE>0);CREATE DOMAIN error_context AS integer CHECK(VALUE>1/0);CREATE TABLE context_source(payload text,bypass boolean);INSERT INTO context_source VALUES('{}',false)`,
    )
    const forms = {
      unicode: 'cardinality(payload::unicode_input[])>=0',
      unicode_skipped:
        'CASE WHEN bypass THEN true ELSE cardinality(payload::unicode_input[])>=0 END',
      positive: 'cardinality(payload::positive_context[])>=0',
      metadata: 'cardinality(payload::error_context[])>=0',
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'context_source')!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: 'context_source',
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
    const samples: [string | null, boolean][] = [
      ['{}', false],
      ['{2}', false],
      ['{1}', false],
      ['{bad}', false],
      ['{bad,', false],
      ['{', false],
      ['bad', false],
      ['{NULL}', false],
      ['{"NULL"}', false],
      [null, false],
      ['{bad}', true],
    ]
    const references: unknown[] = [],
      allFixtures: unknown[] = []
    for (const [profile, encoding, nulls] of [
      ['utf8', true, true],
      ['no_encoding', false, true],
      ['no_nulls', true, undefined],
    ] as const) {
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        ...(encoding ? { serverEncoding: 'UTF8' as const } : {}),
        ...(nulls === undefined ? {} : { arrayNulls: nulls }),
      })
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [payload, bypass] of samples) {
        await pg.query('UPDATE context_source SET payload=$1,bypass=$2', [payload, bypass])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const actual = (
              await pg.query<{ actual: boolean | null }>(
                `SELECT ${sql} AS actual FROM context_source`,
              )
            ).rows[0]!.actual
            expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
          } catch (error) {
            expected = failure((error as { code: string }).code)
          }
          references.push({ profile, name, payload, bypass, postgres: expected })
          if (
            !encoding &&
            name.startsWith('unicode') &&
            !(name === 'unicode_skipped' && bypass) &&
            payload !== null &&
            !['{}', '{', 'bad'].includes(payload)
          )
            expected = { kind: 'Unknown' }
          if (nulls === undefined && payload === '{NULL}' && name !== 'metadata')
            expected = { kind: 'Unknown' }
          fixtures.push({ name, row: { payload: known(payload), bypass: known(bypass) }, expected })
        }
      }
      expect(fixtures).toHaveLength(44)
      allFixtures.push({ profile, fixtures })
      await mkdir(join(directory, profile), { recursive: true })
      await runCheckParity(
        join(directory, profile),
        'domaininputcontext',
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures,
      )
    }
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
    if (artifacts) {
      await writeFile(
        join(artifacts, 'context-fixtures.json'),
        JSON.stringify(allFixtures, null, 2) + '\n',
      )
      await writeFile(
        join(artifacts, 'context-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)

it('preserves already-coerced stored domain-array constants after later CHECK and NOT NULL changes', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-stored-constant-'))
  try {
    await pg.exec(`CREATE DOMAIN frozen_positive AS integer;CREATE DOMAIN frozen_error AS integer;CREATE DOMAIN frozen_required AS integer;
      CREATE TABLE frozen_positive_source(x integer,CONSTRAINT preserved CHECK(cardinality('{0,NULL}'::frozen_positive[])=2));
      CREATE TABLE frozen_error_source(x integer,CONSTRAINT preserved CHECK(cardinality('{1}'::frozen_error[])=1));
      CREATE TABLE frozen_required_source(x integer,CONSTRAINT preserved CHECK(cardinality('{NULL}'::frozen_required[])=1));
      ALTER DOMAIN frozen_positive ADD CONSTRAINT positive CHECK(VALUE>0) NOT VALID;
      ALTER DOMAIN frozen_positive SET NOT NULL;
      ALTER DOMAIN frozen_error ADD CONSTRAINT bad_constant CHECK(VALUE>1/0) NOT VALID;
      ALTER DOMAIN frozen_required SET NOT NULL;`)
    const catalog = await snapshotCatalog(pg),
      plans = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [type, state] of [
      ['frozen_positive', '23514'],
      ['frozen_error', '22012'],
      ['frozen_required', '23502'],
    ] as const) {
      const table = catalog.tables.find((item) => item.name === type + '_source')!,
        constraint = table.constraints[0]!
      await pg.exec(`INSERT INTO ${table.name} VALUES(1)`)
      const count = (
        await pg.query<{ count: number }>(`SELECT count(*)::integer AS count FROM ${table.name}`)
      ).rows[0]!.count
      expect(count).toBe(1)
      await expect(
        pg.query('SELECT ' + constraint.definition.slice('CHECK '.length)),
      ).rejects.toMatchObject({ code: state })
      for (const origin of ['source', 'stored'] as const) {
        const name = type + '_' + origin
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
          ),
        })
        const expected: Outcome = origin === 'stored' ? { kind: 'True' } : failure(state)
        fixtures.push({ name, row: {}, expected })
        references.push({
          name,
          definition: constraint.definition,
          actualInsertAccepted: true,
          reparsedState: state,
          expected,
        })
      }
    }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    expect(fixtures).toHaveLength(6)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
    if (artifacts)
      await writeFile(
        join(artifacts, 'stored-constant-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
    await runCheckParity(
      directory,
      'storedomainconstants',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('preserves the lexer boundary before domain input initialization for incomplete tokens, braces, dimensions and trailing syntax', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-input-lexer-'))
  try {
    await pg.exec(
      `CREATE DOMAIN bad_lexer_domain AS integer CHECK(VALUE>1/0);CREATE DOMAIN rejected_lexer_domain AS integer CHECK(false);CREATE TABLE lexer_source(payload text)`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'lexer_source')!
    const forms = {
      bad: 'payload::bad_lexer_domain[] IS NOT NULL',
      rejected: 'payload::rejected_lexer_domain[] IS NOT NULL',
    }
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: 'lexer_source',
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    const payloads = [
      '{1',
      '{1,',
      '{"1"',
      '{"1",',
      '{""',
      '{"1",,"2"}',
      '{,1}',
      '{1,,2}',
      '{1 2}',
      '{{}}',
      '{{1}}',
      '{{1},2}',
      '{1,{2}}',
      '{{1},}',
      '{{1},{}}',
      '{1}x',
      ' {1} ',
      '{}x',
      '[1:1]={}',
      '[1:2]={1}',
      '[1:2]={1,2,3}',
      '[1:0]={}',
      '[1:2][1:2]={{1,2},{3,4}}',
      '[1:2][1:2]={{1,2},{3}}',
      '{"unterminated',
      '{\\',
      '{\\}',
      '{"\\"}',
      '{"\\',
      '{NULL',
      '{NULL,',
      '{"NULL"',
      '{bad',
      '{{bad}',
      '[a:b]={1}',
      '[1:2]={0',
      '[1:2]={bad',
      '{{1},{bad}}',
      '{1} {2}',
      '{ }',
      '{{ },{ }}',
      '{{{}}}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const payload of payloads) {
      await pg.exec('TRUNCATE lexer_source')
      await pg.query('INSERT INTO lexer_source VALUES($1)', [payload])
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(`SELECT ${sql} AS actual FROM lexer_source`)
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = failure((error as { code: string }).code)
        }
        references.push({ name, payload, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row: { payload: known(payload) }, expected })
      }
    }
    expect(fixtures).toHaveLength(168)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
    if (artifacts) {
      await writeFile(
        join(artifacts, 'lexer-fixtures.json'),
        JSON.stringify(fixtures, null, 2) + '\n',
      )
      await writeFile(
        join(artifacts, 'lexer-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
    }
    await runCheckParity(
      directory,
      'domaininputlexer',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('defers opaque domain CHECK preparation before base input while preserving empty arrays and statically pruned CHECK branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-input-opaque-'))
  try {
    await pg.exec(`CREATE FUNCTION opaque_fault() RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT 1/0';
      CREATE DOMAIN stable_input AS integer CHECK(VALUE IS NULL OR current_setting('app.domain_input',true) IS NULL);
      CREATE DOMAIN opaque_input AS integer CHECK(VALUE>opaque_fault());
      CREATE DOMAIN pruned_input AS integer CHECK(CASE WHEN true THEN true ELSE VALUE>opaque_fault() END);
      CREATE DOMAIN rejected_pruned_input AS integer CHECK(false AND VALUE>opaque_fault());
      CREATE TABLE opaque_source(payload text,bypass boolean)`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'opaque_source')!
    const forms = {
      array: 'payload::opaque_input[] IS NOT NULL',
      skipped_array: 'CASE WHEN bypass THEN true ELSE payload::opaque_input[] IS NOT NULL END',
      pruned_check: 'payload::pruned_input[] IS NOT NULL',
      false_check: 'payload::rejected_pruned_input[] IS NOT NULL',
      scalar: 'payload::opaque_input IS NOT NULL',
      skipped_scalar: 'CASE WHEN bypass THEN true ELSE payload::opaque_input IS NOT NULL END',
      constant_scalar: "'bad'::text::opaque_input IS NOT NULL",
      stable_array: 'payload::stable_input[] IS NOT NULL',
      stable_null: 'NULL::stable_input IS NULL',
    }
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: 'opaque_source',
        constraint: name,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    const samples: [string | null, boolean][] = [
      ['{}', false],
      ['{1}', false],
      ['{bad}', false],
      ['{bad,', false],
      ['{', false],
      ['bad', false],
      ['{NULL}', false],
      [null, false],
      ['{bad}', true],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [payload, bypass] of samples) {
      await pg.exec('TRUNCATE opaque_source')
      await pg.query('INSERT INTO opaque_source VALUES($1,$2)', [payload, bypass])
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(`SELECT ${sql} AS actual FROM opaque_source`)
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = failure((error as { code: string }).code)
        }
        references.push({ name, payload, bypass, postgres: expected })
        const reached = payload !== null && !['{}', '{', 'bad'].includes(payload)
        if (
          name === 'scalar' ||
          name === 'skipped_scalar' ||
          (name === 'array' && reached) ||
          (name === 'skipped_array' && !bypass && reached)
        )
          expected = { kind: 'Unknown' }
        if (name === 'stable_array' && payload === '{1}') expected = { kind: 'Unknown' }
        fixtures.push({ name, row: { payload: known(payload), bypass: known(bypass) }, expected })
      }
    }
    expect(fixtures).toHaveLength(81)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
    if (artifacts) {
      await writeFile(
        join(artifacts, 'opaque-fixtures.json'),
        JSON.stringify(fixtures, null, 2) + '\n',
      )
      await writeFile(
        join(artifacts, 'opaque-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
    }
    await runCheckParity(
      directory,
      'opaqueinputpreparation',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
