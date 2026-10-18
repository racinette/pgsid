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
const arrayOf = (...values: (string | null)[]) =>
  '{' +
  values
    .map((value) =>
      value === null ? 'NULL' : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
    )
    .join(',') +
  '}'

it('matches domain array text input, lexical constraint and grammar errors, input typmods, literals and lazy branches across targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-array-input-'))
  try {
    await pg.exec(`
      CREATE DOMAIN positive_input AS integer CHECK(VALUE>0);
      CREATE DOMAIN required_input AS positive_input NOT NULL;
      CREATE DOMAIN nonnull_input AS integer CHECK(VALUE IS NOT NULL);
      CREATE DOMAIN outer_required_input AS nonnull_input NOT NULL;
      CREATE DOMAIN limited_input AS positive_input CHECK(VALUE<10);
      CREATE DOMAIN code_input AS varchar(3) COLLATE "C" CHECK(VALUE<>'');
      CREATE DOMAIN rounded_input AS numeric(3,1) CHECK(VALUE>0);
      CREATE TYPE input_stage AS ENUM('new','done','雪');
      CREATE DOMAIN stage_input AS input_stage CHECK(VALUE<>'done');
      CREATE DOMAIN object_input AS jsonb CHECK(jsonb_typeof(VALUE)='object');
      CREATE DOMAIN box_input AS box CHECK(VALUE IS NOT NULL);
      CREATE DOMAIN text_input AS text COLLATE "C" CHECK(VALUE<>'blocked');
      CREATE DOMAIN error_input AS integer CHECK(VALUE>1/0);
      CREATE TABLE domain_input(payload text,bypass boolean);
      CREATE TABLE input_oracle(LIKE domain_input);
    `)
    const forms: { [name: string]: { sql: string; sourceOnly?: boolean } } = {
      positive: { sql: 'cardinality(payload::positive_input[])=2' },
      first: { sql: '(payload::positive_input[])[1]=1' },
      dimensions: { sql: 'array_dims(payload::positive_input[]) COLLATE "C"=\'[1:2]\'' },
      output: { sql: 'payload::positive_input[]::text COLLATE "C"=\'{1,2}\'' },
      required: { sql: 'cardinality(payload::required_input[])=2' },
      nonnull: { sql: 'cardinality(payload::nonnull_input[])=2' },
      outer_not_null: { sql: 'cardinality(payload::outer_required_input[])=2' },
      limited: { sql: 'cardinality(payload::limited_input[])=2' },
      code: { sql: 'cardinality(payload::code_input[])=2' },
      rounded: { sql: 'cardinality(payload::rounded_input[])=2' },
      stage: { sql: 'cardinality(payload::stage_input[])=2' },
      object: { sql: 'cardinality(payload::object_input[])=2' },
      box: { sql: 'cardinality(payload::box_input[])=2' },
      text: { sql: 'cardinality(payload::text_input[])=2' },
      skipped: {
        sql: 'CASE WHEN bypass THEN true ELSE cardinality(payload::required_input[])=2 END',
      },
      coalesce: {
        sql: 'cardinality(COALESCE(payload::positive_input[],ARRAY[1]::positive_input[]))>0',
      },
      metadata: { sql: 'cardinality(payload::error_input[])=0', sourceOnly: true },
      metadata_skipped: {
        sql: 'CASE WHEN bypass THEN true ELSE cardinality(payload::error_input[])=0 END',
        sourceOnly: true,
      },
    }
    for (const [name, form] of Object.entries(forms))
      if (!form.sourceOnly)
        await pg.exec(`ALTER TABLE domain_input ADD CONSTRAINT "${name}" CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'domain_input')!
    const plans = Object.entries(forms).flatMap(([name, form]) =>
      (form.sourceOnly ? ['source'] : ['source', 'stored']).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: 'domain_input',
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
    for (const [index, check] of group.checks.entries()) {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind === 'supported')
        expect(check.inputs.every((input) => ['payload', 'bypass'].includes(input.name))).toBe(true)
    }
    expect(group.evaluatorSource).toContain('array_text_event_needs_input(')
    const samples: [string | null, boolean][] = [
      ['{1,2}', false],
      ['{0,bad}', false],
      ['{bad,0}', false],
      ['{1,0}', false],
      ['{NULL,2}', false],
      [arrayOf('NULL', '2'), false],
      ['{}', false],
      [null, false],
      ['{', false],
      ['bad', false],
      ['{0,', false],
      ['{bad,', false],
      ['{{1},{0,}}', false],
      ['{{1},{2,3}}', false],
      ['[0:1]={1,2}', false],
      ['[0:2]={1,0}', false],
      ['[0:2]={1,2}', false],
      ['{{1,2},{3,4}}', false],
      ['{11,1}', false],
      ['{2147483648,0}', false],
      [arrayOf('abc', 'abcd'), false],
      [arrayOf('abc', 'ab '), false],
      [arrayOf('', 'abc'), false],
      [arrayOf('雪😊a', 'é😀'), false],
      [arrayOf('1.26', '0.04'), false],
      [arrayOf('NaN', '1'), false],
      [arrayOf('new', '雪'), false],
      [arrayOf('done', 'new'), false],
      [arrayOf('{"a":1}', '{}'), false],
      ['{(1,1),(0,0);(2,2),(1,1)}', false],
      ['{0,bad}', true],
      [null, true],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [payload, bypass] of samples) {
      await pg.exec('TRUNCATE input_oracle')
      await pg.query('INSERT INTO input_oracle VALUES($1,$2)', [payload, bypass])
      for (const [name, form] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(
              `SELECT ${form.sql} AS actual FROM input_oracle`,
            )
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = failure((error as { code: string }).code)
        }
        references.push({ name, payload, bypass, expected })
        for (const origin of form.sourceOnly ? ['source'] : ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: { payload: known(payload), bypass: known(bypass) },
            expected,
          })
      }
    }
    expect(fixtures).toHaveLength(1088)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
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
      'domainarrayinput',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
