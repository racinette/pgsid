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

it('uses every represented scalar carrier through constrained domain casts with NULL, partial, error and skipped states', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='iso_8601';CREATE TYPE array_stage AS ENUM ('new','done')",
    )
    for (const [index, [type]] of arrayScalarProfiles.entries())
      await pg.exec(
        `CREATE DOMAIN required_scalar_${index} AS ${type} CHECK(VALUE IS NOT NULL);CREATE TABLE scalar_source_${index}(source ${type},bypass boolean,CONSTRAINT preserved CHECK(CASE WHEN bypass THEN true ELSE source::required_scalar_${index} IS NOT NULL END))`,
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
                  definition: `CHECK(CASE WHEN bypass THEN true ELSE source::required_scalar_${index} IS NOT NULL END)`,
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
        family = arrayElementFamily(input.type)!
      families.add(family)
      const modifier = catalog.domains.find(
        (domain) => domain.name === 'required_scalar_' + plan.index,
      )!.baseTypeMod!
      const prefix = input.rustType
        .slice(0, -5)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
      const entryName = checkRustEntryName({
        ...plan.identity,
        owner: plan.identity.owner + '_fixture',
      })
      const args = check.inputs.map((input) => (input.name === 'source' ? 'value' : 'bypass'))
      wrappers.push(`pub fn ${entryName}(mode:Int4Value)->CheckOutcome {
 let original=domain_family_input(mode,${family},${rustStringLiteral(input.type)},${modifier});
 let value=array_element_to_${prefix}(original);let bypass=domain_family_skip(mode);${check.entryName}(${args.join(',')})
}`)
      for (const mode of [0, 1, 2, 3, 4])
        fixtures.push({
          name: plan.identity.owner + '_' + plan.identity.constraint,
          row: { mode: { kind: 'Value', value: mode } },
          expected:
            mode === 0 || mode === 4
              ? { kind: 'True' }
              : mode === 2
                ? { kind: 'Unknown' }
                : { kind: 'Error', value: { state: parseInt(mode === 1 ? '23514' : '22012', 36) } },
        })
      return {
        ...check,
        entryName,
        inputs: [
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      }
    })
    expect(families.size).toBe(40)
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      expect(
        (
          await pg.query<{ value: boolean }>(
            `SELECT (${literal}::${type}::required_scalar_${index}) IS NOT NULL AS value`,
          )
        ).rows[0]!.value,
        type,
      ).toBe(true)
      await expect(
        pg.query(`SELECT (NULL::${type}::required_scalar_${index}) IS NOT NULL`),
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
pub fn domain_family_input(mode:Int4Value,family:i32,identity:&str,modifier:i32)->ArrayElement {
 if let Int4Value::Value(selected)=mode {
  if selected==0 {
   let mut value=array_fixture_element(family);
   if family==6 {value=array_element_from_enum(make_enum_value(0));};
   if identity=="pg_catalog.cidr" {value=array_element_from_network(make_network_value("2001:db8::/64"));};
   if modifier>=0 {value=array_element_typmod(value,identity,modifier);};
   return value;
  };
  if selected==1 {return ArrayElement::Null;};
  if selected==3 {return ArrayElement::Error(make_sql_error(3452582));};
 };
 ArrayElement::Unknown
}
pub fn domain_family_skip(mode:Int4Value)->BoolValue {
 if let Int4Value::Value(selected)=mode {return make_bool_value(selected==4);};
 BoolValue::Unknown
}
`,
      })
    group.evaluatorSource += '\n' + wrappers.join('\n')
    group.checks = checks
    await mkdir('artifacts/domain-casts', { recursive: true })
    await writeFile(
      'artifacts/domain-casts/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/domain-casts/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'domainfamilies',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
