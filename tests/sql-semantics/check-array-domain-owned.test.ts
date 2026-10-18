import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('retains whole-array domain ownership, partial shape knowledge, already-coerced NULLs and the nested-cell boundary', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-domain-owned-'))
  try {
    await pg.exec(`CREATE DOMAIN owned_pair AS integer[] CHECK(cardinality(VALUE)=2);
      CREATE DOMAIN positive_owned_pair AS owned_pair CHECK(VALUE[1]>0);
      CREATE DOMAIN required_owned_pair AS positive_owned_pair NOT NULL;
      CREATE TABLE owned_source(source integer[],typed owned_pair,required required_owned_pair,bypass boolean);
      CREATE TABLE required_empty(slots required_owned_pair);
      CREATE DOMAIN legacy_pair AS integer[];
      CREATE TABLE legacy_values(slots legacy_pair);
      INSERT INTO legacy_values VALUES('{1}');
      ALTER DOMAIN legacy_pair ADD CONSTRAINT pair_size CHECK(cardinality(VALUE)=2) NOT VALID`)
    expect(
      (
        await pg.query<{ value: boolean }>(
          'SELECT slots::legacy_pair IS NOT NULL AS value FROM legacy_values',
        )
      ).rows[0]!.value,
    ).toBe(true)
    await expect(
      pg.query('SELECT slots::integer[]::legacy_pair IS NOT NULL FROM legacy_values'),
    ).rejects.toMatchObject({ code: '23514' })
    expect(
      (
        await pg.query<{ value: boolean }>(
          'SELECT ((SELECT slots FROM required_empty WHERE false)::required_owned_pair) IS NULL AS value',
        )
      ).rows[0]!.value,
    ).toBe(true)
    await expect(
      pg.query(
        'SELECT ((SELECT slots FROM required_empty WHERE false)::integer[]::required_owned_pair) IS NULL',
      ),
    ).rejects.toMatchObject({ code: '23502' })
    const forms = {
      shape: 'source::owned_pair IS NOT NULL',
      positive: 'source::positive_owned_pair IS NOT NULL',
      required: 'source::required_owned_pair IS NOT NULL',
      typed: 'typed::owned_pair IS NOT NULL',
      retained_required_null: 'required::required_owned_pair IS NULL',
      rechecked_required_null: 'required::integer[]::required_owned_pair IS NULL',
      skipped: 'CASE WHEN bypass THEN true ELSE source::positive_owned_pair IS NOT NULL END',
      nested: 'cardinality(ARRAY[typed,typed])=2',
    }
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'owned_source')!
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
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
      }),
      wrappers: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const error = (state: string): Outcome => ({
      kind: 'Error',
      value: { state: parseInt(state, 36) },
    })
    const checks = group.checks.map((check, index) => {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind !== 'supported') throw new Error(check.reason)
      const entryName = checkRustEntryName({ ...plans[index]!.identity, owner: 'owned_fixture' })
      const args = check.inputs.map((input) =>
        input.name === 'bypass' ? 'bypass' : input.nullness ? 'nullness' : 'value.clone()',
      )
      const declarations = [
        ...(check.inputs.some((input) => input.name !== 'bypass')
          ? ['let value=owned_array_domain_fixture(mode);']
          : []),
        ...(check.inputs.some((input) => input.nullness)
          ? ['let nullness=array_is_null(value.clone());']
          : []),
        ...(check.inputs.some((input) => input.name === 'bypass')
          ? ['let bypass=owned_array_domain_skip(mode);']
          : []),
      ]
      wrappers.push(
        `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {${declarations.join('\n')}${check.entryName}(${args.join(',')})}`,
      )
      const name = plans[index]!.identity.constraint
      for (const mode of [0, 1, 2, 3, 4, 5, 6, 7]) {
        let expected: Outcome
        if (name === 'nested') expected = { kind: 'Unknown' }
        else if (name === 'skipped' && mode === 7) expected = { kind: 'True' }
        else if (mode === 2) expected = { kind: 'Unknown' }
        else if (mode === 3) expected = error('22012')
        else if (name === 'typed' || name === 'retained_required_null')
          expected = {
            kind:
              name === 'typed' ? (mode === 1 ? 'False' : 'True') : mode === 1 ? 'True' : 'False',
          }
        else if (mode === 1)
          expected =
            name === 'required' || name === 'rechecked_required_null'
              ? error('23502')
              : { kind: 'False' }
        else if (mode === 6) expected = error('23514')
        else if (mode === 4 && name !== 'shape') expected = { kind: 'Unknown' }
        else expected = { kind: name === 'rechecked_required_null' ? 'False' : 'True' }
        fixtures.push({ name, row: { mode: { kind: 'Value', value: mode } }, expected })
      }
      return {
        ...check,
        entryName,
        inputs: [
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      }
    })
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group.evaluatorSource += '\n' + wrappers.join('\n')
    group.checks = checks
    group
      .source!.modules.find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/owned_array_domains.rs',
        source: String.raw`
pub fn owned_array_domain_fixture(mode:Int4Value)->ArrayValue {
 if let Int4Value::Value(selected)=mode {
  if selected==1 {return ArrayValue::Null;};
  if selected==2 {return ArrayValue::Unknown;};
  if selected==3 {return ArrayValue::Error(make_sql_error(3452582));};
  let mut cells=make_array_arguments("pg_catalog.int4",2);
  if selected==6 {cells=append_array_dimension(cells,1,1);}
  else {cells=append_array_dimension(cells,1,2);};
  let mut first=array_element_from_int4(make_int4_value(1));
  if selected==4 {first=ArrayElement::Unknown;};
  if selected==5 {first=ArrayElement::Null;};
  cells=append_array_argument(cells,first);
  if selected!=6 {cells=append_array_argument(cells,array_element_from_int4(make_int4_value(2)));};
  return finish_array_arguments(cells);
 };
 ArrayValue::Unknown
}
pub fn owned_array_domain_skip(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {return make_bool_value(selected==7);};
 BoolValue::Unknown
}
`,
      })
    expect(fixtures).toHaveLength(64)
    const artifacts = process.env['PGSID_ARRAY_DOMAIN_VALUE_ARTIFACT_DIR']
    if (artifacts) {
      await mkdir(artifacts, { recursive: true })
      await writeFile(
        join(artifacts, 'owned-fixtures.json'),
        JSON.stringify(fixtures, null, 2) + '\n',
      )
    }
    await runCheckParity(
      directory,
      'ownedarraydomains',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
