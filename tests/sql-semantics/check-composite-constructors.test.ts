import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('constructs named composite rows with field coercion, preparation, projection and datum NULL parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-composite-constructors-'))
  const forms: Record<string, string> = {
    number: '(ROW(n,payload)::pair).n>=2',
    label: '(ROW(n,payload)::pair).code=\'abc\' COLLATE "C"',
    row_null: 'ROW(n,payload)::pair IS NULL',
    row_present: 'ROW(n,payload)::pair IS NOT NULL',
    null_datum: 'NULL::pair IS NULL',
    all_null_datum: '(COALESCE(ROW(NULL,NULL)::pair,ROW(n,payload)::pair)).n IS NULL',
    coalesced: '(COALESCE(NULL::pair,ROW(n,payload)::pair)).n>=2',
    selected: '(CASE WHEN bypass THEN NULL::pair ELSE ROW(n,payload)::pair END).n>=2',
    guarded: 'CASE WHEN bypass THEN true ELSE (ROW(n,payload)::guarded).n>=2 END',
    discarded_division: '(ROW(n/divisor,payload)::pair).code=\'abc\' COLLATE "C"',
    discarded_domain: '(ROW(n,payload)::guarded).code=\'abc\' COLLATE "C"',
    reached_domain: 'ROW(n,payload)::guarded IS NOT NULL',
    domain_record: '(ROW(n,payload)::required_pair).n>=2',
    domain_present_null_fields: 'ROW(NULL,NULL)::required_pair IS NULL',
    domain_null: 'CASE WHEN bypass THEN true ELSE NULL::required_pair IS NULL END',
    nested: '(ROW(ROW(n,payload)::pair,n)::packet).child.n>=2',
    nested_null: '(ROW(NULL::pair,n)::packet).child IS NULL',
    constant_division: 'CASE WHEN bypass THEN true ELSE (ROW(1/0,payload)::pair).code IS NULL END',
    pruned_division: 'CASE WHEN true THEN true ELSE (ROW(1/0,payload)::pair).code IS NULL END',
    discarded_constant_domain: '(ROW(-1,payload)::guarded).code=\'abc\' COLLATE "C"',
    field_error_order: 'ROW(n/divisor,payload::int4)::int_pair IS NOT NULL',
    whole_constant_preparation:
      'CASE WHEN bypass THEN true ELSE ROW(70000,payload)::pair IS NULL END',
    enum_field: "(ROW(n,'z')::phased).phase='z'::stage",
    scalar_array_field: 'cardinality((ROW(ARRAY[n,divisor])::bag).items)=2',
    fixed_numeric: '(ROW(n, payload)::measured).amount<1000',
    fixed_char: 'length((ROW(n,payload)::measured).code)=3',
    constant_present: "ROW(2,'abc')::pair IS NOT NULL",
    trailing_present: 'ROW(n,payload)::tail_drop IS NOT NULL',
    trailing_constant: "ROW(2,'abc')::tail_drop IS NOT NULL",
    case_present:
      '(CASE WHEN bypass THEN ROW(n,payload)::pair ELSE ROW(n,payload)::pair END) IS NOT NULL',
    coalesced_present: 'COALESCE(ROW(n,payload)::pair,NULL::pair) IS NOT NULL',
    untyped_null: '(COALESCE(NULL,ROW(n,payload)::pair)).n>=2',
    nested_null_test: 'ROW(ROW(n,payload)::pair,NULL)::packet IS NULL',
    collation_reached: '(ROW(n/divisor,payload)::collated_pair).code=\'abc\' COLLATE "C"',
    collation_skipped:
      '(ROW(n/divisor,payload COLLATE "C")::collated_pair).code=\'abc\' COLLATE "C"',
    collation_default: '(ROW(n/divisor,payload COLLATE "C")::pair).code=\'abc\' COLLATE "C"',
    collation_domain: '(ROW(n,payload)::collated_guard).code=\'abc\' COLLATE "C"',
    array_width: "array_to_string((ROW(ARRAY[payload])::width_bag).items,',')='abc' COLLATE \"C\"",
    distinct_null: 'ROW(n,payload)::pair IS DISTINCT FROM NULL',
    not_distinct_null: 'ROW(n,payload)::pair IS NOT DISTINCT FROM NULL',
    distinct_all_null: 'ROW(NULL,NULL)::pair IS DISTINCT FROM NULL',
    empty_record: 'ROW()::empty_record IS NULL',
  }
  try {
    await pg.exec(`CREATE DOMAIN positive AS int4 CHECK(VALUE>0);CREATE TYPE stage AS ENUM('z','a');
CREATE TYPE pair AS(n int2,discard int4,code varchar(3));ALTER TYPE pair DROP ATTRIBUTE discard;
CREATE TYPE guarded AS(n positive,code varchar(3));CREATE TYPE packet AS(child pair,score int4);
CREATE TYPE int_pair AS(first_value int4,second_value int4);CREATE TYPE phased AS(n int4,phase stage);
CREATE TYPE bag AS(items int4[]);CREATE TYPE measured AS(amount numeric(4,1),code char(3));
CREATE TYPE tail_drop AS(n int2,code varchar(3),obsolete int4);ALTER TYPE tail_drop DROP ATTRIBUTE obsolete;
CREATE TYPE collated_pair AS(n int2,code varchar(3) COLLATE "C");CREATE TYPE collated_guard AS(n positive,code varchar(3) COLLATE "C");CREATE TYPE width_bag AS(items varchar(3)[]);
CREATE TYPE empty_record AS();CREATE DOMAIN required_pair AS pair NOT NULL CHECK((VALUE).n IS NULL OR (VALUE).n>0);`)
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(n int4,payload text,divisor int4,bypass bool,CONSTRAINT test_check CHECK(${expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.entries(forms).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
        constraint = table.constraints.find((c) => c.name === 'test_check')!
      return (['source', 'stored'] as const).map((origin) => ({
        name: name + '_' + origin,
        expression: lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
      }))
    })
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const rows = [
      { n: 2, payload: 'abcdef', divisor: 1, bypass: false },
      { n: 1, payload: 'abc', divisor: 0, bypass: false },
      { n: 0, payload: 'abc', divisor: 0, bypass: true },
      { n: -1, payload: '1', divisor: 1, bypass: false },
      { n: 70000, payload: 'bad', divisor: 0, bypass: false },
      { n: null, payload: null, divisor: 1, bypass: false },
      { n: 2, payload: null, divisor: null, bypass: false },
      { n: null, payload: 'abc', divisor: 0, bypass: true },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    await pg.exec('CREATE TABLE constructor_oracle(n int4,payload text,divisor int4,bypass bool)')
    for (const row of rows) {
      await pg.exec('TRUNCATE constructor_oracle')
      await pg.query('INSERT INTO constructor_oracle VALUES($1,$2,$3,$4)', [
        row.n,
        row.payload,
        row.divisor,
        row.bypass,
      ])
      const input: Row = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value === null ? { kind: 'Null' } : { kind: 'Value', value },
        ]),
      )
      for (const name of Object.keys(forms)) {
        let expected: Outcome = { kind: 'True' }
        try {
          await pg.query(`INSERT INTO gate_${name} VALUES($1,$2,$3,$4)`, [
            row.n,
            row.payload,
            row.divisor,
            row.bypass,
          ])
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${forms[name]}) value FROM constructor_oracle`,
            )
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          const code = (error as { code: string }).code
          expected =
            code === '23514'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(code, 36) } }
          if (
            code === '23514' &&
            (error as { message: string }).message.includes('value for domain')
          )
            expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        reference.push({ name, row, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row: input, expected })
      }
    }
    const partial: { name: string; row: Row; expected: Outcome }[] = [
      {
        name: 'number',
        row: { n: { kind: 'Value', value: 2 }, payload: { kind: 'Unknown' } },
        expected: { kind: 'True' },
      },
      {
        name: 'label',
        row: {
          n: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          payload: { kind: 'Value', value: 'abcdef' },
        },
        expected: { kind: 'True' },
      },
      {
        name: 'row_null',
        row: { n: { kind: 'Value', value: 2 }, payload: { kind: 'Unknown' } },
        expected: { kind: 'False' },
      },
      {
        name: 'row_present',
        row: { n: { kind: 'Unknown' }, payload: { kind: 'Unknown' } },
        expected: { kind: 'False' },
      },
      {
        name: 'row_null',
        row: { n: { kind: 'Null' }, payload: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'scalar_array_field',
        row: { n: { kind: 'Unknown' }, divisor: { kind: 'Unknown' } },
        expected: { kind: 'True' },
      },
      {
        name: 'domain_record',
        row: { n: { kind: 'Value', value: 2 }, payload: { kind: 'Unknown' } },
        expected: { kind: 'True' },
      },
      {
        name: 'guarded',
        row: {
          n: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          payload: { kind: 'Unknown' },
          bypass: { kind: 'Value', value: true },
        },
        expected: { kind: 'True' },
      },
    ]
    for (const item of partial)
      for (const origin of ['source', 'stored'])
        fixtures.push({ ...item, name: item.name + '_' + origin })
    await mkdir('artifacts/composite-constructors', { recursive: true })
    await writeFile('artifacts/composite-constructors/plans.json', JSON.stringify(plans, null, 2))
    await writeFile('artifacts/composite-constructors/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      'artifacts/composite-constructors/fixtures.json',
      JSON.stringify({ fixtures, reference }, null, 2),
    )
    await runCheckParity(
      directory,
      'compositeconstructors',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await mkdir('artifacts/composite-constructors', { recursive: true })
    await writeFile(
      'artifacts/composite-constructors/report.json',
      JSON.stringify(
        { nativeInserts: reference.length, fixtures: fixtures.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360_000)
