import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { arrayFixtureSource, arrayScalarProfiles } from './check-array-fixtures.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves every represented array element carrier and dimensions through domain conversion, partial cells, errors and skipped branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-domain-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='iso_8601';CREATE TYPE array_stage AS ENUM ('new','done')",
    )
    for (const [index, [type]] of arrayScalarProfiles.entries())
      await pg.exec(
        `CREATE DOMAIN required_scalar_${index} AS ${type} CHECK(VALUE IS NOT NULL);CREATE TABLE scalar_source_${index}(source ${type}[],bypass boolean,CONSTRAINT preserved CHECK(CASE WHEN bypass THEN true ELSE array_lower(source::required_scalar_${index}[],1)=-2 AND cardinality(source::required_scalar_${index}[])=2 END))`,
      )
    const catalog = await snapshotCatalog(pg),
      references: unknown[] = []
    const plans = arrayScalarProfiles.flatMap(([, literal], index) => {
      const table = catalog.tables.find((item) => item.name === 'scalar_source_' + index)!
      const type = arrayScalarProfiles[index]![0]
      return ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints[0]!
              : {
                  name: 'preserved',
                  type: 'check',
                  definition: `CHECK(CASE WHEN bypass THEN true ELSE array_lower(source::required_scalar_${index}[],1)=-2 AND cardinality(source::required_scalar_${index}[])=2 END)`,
                },
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
        type,
        literal,
        index,
      }))
    })
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      families = new Set<number>()
    const wrappers: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const checks = group.checks.map((check, index) => {
      const plan = plans[index]!
      expect(
        check.kind,
        plan.type + ':' + plan.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind !== 'supported') throw new Error(check.reason)
      const input = check.inputs.find((input) => input.name === 'source')!,
        family = arrayElementFamily(input.type.slice(6))!
      families.add(family)
      const modifier = catalog.domains.find(
        (domain) => domain.name === 'required_scalar_' + plan.index,
      )!.baseTypeMod!
      const entryName = checkRustEntryName({
        ...plan.identity,
        owner: plan.identity.owner + '_fixture',
      })
      const args = check.inputs.map((input) => (input.name === 'source' ? 'value' : 'bypass'))
      wrappers.push(`pub fn ${entryName}(mode:Int4Value)->CheckOutcome {
 let value=domain_array_family_input(mode,${family},${rustStringLiteral(input.type.slice(6))},${modifier});let bypass=domain_family_skip(mode);${check.entryName}(${args.join(',')})
}`)
      for (const mode of [0, 1, 2, 3, 4, 5, 6])
        fixtures.push({
          name: plan.identity.owner + '_' + plan.identity.constraint,
          row: { mode: { kind: 'Value', value: mode } },
          expected:
            mode === 0 || mode === 4
              ? { kind: 'True' }
              : mode === 2
                ? { kind: 'Unknown' }
                : mode === 5
                  ? { kind: 'Null' }
                  : mode === 6
                    ? { kind: 'False' }
                    : {
                        kind: 'Error',
                        value: { state: parseInt(mode === 1 ? '23514' : '22012', 36) },
                      },
        })
      return {
        ...check,
        entryName,
        inputs: [
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      }
    })
    expect(fixtures).toHaveLength(812)
    expect(families.size).toBe(40)
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      expect(
        (
          await pg.query<{ value: boolean }>(
            `SELECT cardinality(ARRAY[${literal}::${type},${literal}::${type}]::required_scalar_${index}[])=2 AS value`,
          )
        ).rows[0]!.value,
        type,
      ).toBe(true)
      await expect(
        pg.query(`SELECT (ARRAY[NULL::${type}]::required_scalar_${index}[]) IS NOT NULL`),
      ).rejects.toMatchObject({ code: '23514', constraint: 'required_scalar_' + index + '_check' })
      references.push({ type, literal, accepted: true, nullState: '23514' })
    }
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group
      .source!.modules.find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/domain_families.rs',
        source:
          arrayFixtureSource +
          String.raw`
pub fn domain_array_family_input(mode:Int4Value,family:i32,identity:&str,modifier:i32)->ArrayValue {
 if let Int4Value::Value(selected)=mode {
  if selected==5 {return ArrayValue::Null;};
  let mut cells=make_array_arguments(identity,family);
  if selected==6 {return finish_array_arguments(cells);};
  cells=append_array_dimension(cells,-2,2);
  let mut value=array_fixture_element(family);
  if family==6 {value=array_element_from_enum(make_enum_value(0));};
  if identity=="pg_catalog.cidr" {value=array_element_from_network(make_network_value("2001:db8::/64"));};
  if modifier>=0 {value=array_element_typmod(value,identity,modifier);};
  let mut first=value.clone();
  if selected==1 {first=ArrayElement::Null;};
  if selected==2 {first=ArrayElement::Unknown;};
  if selected==3 {first=ArrayElement::Error(make_sql_error(3452582));};
  cells=append_array_argument(cells,first);
  if selected==2 {cells=append_array_argument(cells,ArrayElement::Null);}
  else {cells=append_array_argument(cells,value);};
  return finish_array_arguments(cells);
 };
 ArrayValue::Unknown
}
pub fn domain_family_skip(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {return make_bool_value(selected==4);};
 BoolValue::Unknown
}
`,
      })
    group.evaluatorSource += '\n' + wrappers.join('\n')
    group.checks = checks
    await mkdir('artifacts/domain-array-casts', { recursive: true })
    await writeFile(
      'artifacts/domain-array-casts/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/domain-array-casts/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'domainarrayfamilies',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
