import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { PGlite } from '@electric-sql/pglite'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  catalogArrayType,
  catalogScalarType,
} from '../../src/sql-semantics/catalog-check-binder.js'

const arrays: Record<string, string> = {
  fill: 'array_fill(a,ARRAY[2])',
  fill_coalesce: 'array_fill(COALESCE(a,b),ARRAY[2])',
  fill_nullable: 'array_fill(COALESCE(a,NULL),ARRAY[2])',
  fill_case: 'array_fill(CASE WHEN flag THEN a ELSE b END,ARRAY[2])',
  fill_minmax: 'array_fill(GREATEST(a,b),ARRAY[2])',
  fill_mixed: 'array_fill(GREATEST(a,c),ARRAY[2])',
  append: 'array_append(vals,a)',
  append_base: 'array_append(vals,1)',
  append_null: 'array_append(vals,NULL)',
  append_literal: "array_append(vals,'3')",
  prepend: 'array_prepend(a,vals)',
  cat: 'array_cat(vals,other)',
  cat_base: 'array_cat(vals,ints)',
  cat_same: 'array_cat(vals,vals)',
  positions: 'array_positions(vals,a)',
  replace: 'array_replace(vals,a,b)',
  replace_null: 'array_replace(vals,a,NULL)',
  remove: 'array_remove(vals,a)',
  enum_fill: 'array_fill(status,ARRAY[2])',
  enum_append: 'array_append(statuses,status)',
  mixed_case: 'CASE WHEN flag THEN other ELSE vals END',
  mixed_coalesce: 'COALESCE(vals,other)',
  mixed_minmax: 'GREATEST(vals,other)',
  mixed_constructor: 'ARRAY[vals,other]',
  fill_fetched: 'array_fill((array_fill(a,ARRAY[2]))[1],ARRAY[2])',
  fill_appended: 'array_fill((array_append(vals,a))[1],ARRAY[2])',
  append_nested_domain: 'array_append(vals,a::nested_units)',
}
const forms: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(arrays).map(([name, sql]) => [name, `cardinality(${sql})=2`]),
  ),
  fill_value: '(array_fill(a,ARRAY[2]))[1]::positive_units IS NOT DISTINCT FROM a',
  append_value: '(array_append(vals,a))[1]::positive_units IS NOT DISTINCT FROM a',
  position: 'array_position(vals,a)=1',
  bucket: 'width_bucket(a,vals)=1',
  required_null: 'cardinality(array_append(required_values,NULL))=2',
  required_valid: 'cardinality(array_append(required_values,required))=2',
  rejected_literal: "cardinality(array_append(vals,'0'))=3",
  skipped_literal: "CASE WHEN flag THEN true ELSE cardinality(array_append(vals,'0'))=3 END",
  skipped_required:
    'CASE WHEN flag THEN true ELSE cardinality(array_append(required_values,NULL))=2 END',
  constructor_error_order: 'cardinality(ARRAY[vals,other,ARRAY[1,1/divisor]])=6',
  minmax_error_order: 'cardinality(GREATEST(vals,other,ARRAY[1,1/divisor]))=2',
  coalesce_error_order: 'cardinality(COALESCE(vals,other,ARRAY[1,1/divisor]))=2',
}
let directory: string
let pg: PGlite
let catalog: CatalogSnapshot
let table: TableInfo
beforeAll(async () => {
  pg = await PGlite.create()
  directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-polymorphic-'))
  await pg.exec(`CREATE DOMAIN positive_units AS integer CHECK(VALUE>0);
    CREATE DOMAIN other_units AS integer CHECK(VALUE<>0);
    CREATE DOMAIN nested_units AS positive_units;
    CREATE DOMAIN required_units AS integer NOT NULL CHECK(VALUE>0);
    CREATE DOMAIN pair_units AS integer[] CHECK(cardinality(VALUE)=2);
    CREATE TYPE urgency AS ENUM('low','high');
    CREATE DOMAIN approved_urgency AS urgency CHECK(VALUE='high');
    CREATE TABLE domain_polymorphic(a positive_units,b positive_units,c other_units,vals positive_units[],other other_units[],ints integer[],status approved_urgency,statuses approved_urgency[],whole pair_units,required required_units,required_values required_units[],flag boolean,divisor integer,
      ${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')});`)
  await pg.exec('CREATE TABLE domain_oracle(LIKE domain_polymorphic)')
  catalog = await snapshotCatalog(pg)
  table = catalog.tables.find((item) => item.name === 'domain_polymorphic')!
})
afterAll(async () => {
  if (pg && !pg.closed) await pg.close()
  if (directory) await rm(directory, { recursive: true, force: true })
})
it('retains domain element identities for simple polymorphism and selects PostgreSQL common array identities', async () => {
  for (const [name, sql] of Object.entries(arrays)) {
    const result = (
      await pg.query<{
        type: string
        oid: number
      }>(`SELECT pg_typeof(value)::text AS type,pg_typeof(value)::oid AS oid FROM
      (SELECT ${sql} value FROM (SELECT NULL::positive_units a,NULL::positive_units b,NULL::other_units c,NULL::positive_units[] vals,NULL::other_units[] other,NULL::integer[] ints,NULL::approved_urgency status,NULL::approved_urgency[] statuses,true flag) inputs) resolved`)
    ).rows[0]!
    const expected =
      catalogArrayType(result.type, result.oid, catalog.domains, catalog.enums) ??
      catalogScalarType(result.type)
    expect(expected, name).not.toBeNull()
    for (const origin of ['source', 'stored'] as const) {
      const constraint = table.constraints.find((item) => item.name === name)!
      const plan = lowerTableCheck(
        table,
        origin === 'source'
          ? { ...constraint, definition: `CHECK((${sql}) IS NULL)` }
          : {
              ...constraint,
              definition: constraint.definition
                .replace(/^CHECK\s*\(/u, 'CHECK ((')
                .replace(/\)\s*$/u, ') IS NULL)'),
            },
        catalog.enums,
        catalog.domains,
        origin,
      )!
      expect(plan.expression.kind, name + ' ' + origin).toBe('eval-scalar')
      if (plan.expression.kind !== 'eval-scalar' || plan.expression.expression.kind !== 'null-test')
        throw new Error('Expected scalar null test')
      const value = plan.expression.expression.operand
      const type = value.kind === 'call' ? value.call.type : 'type' in value ? value.type : null
      if (origin === 'source') expect(type, name).toBe(expected)
    }
  }
})

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const base: Row = {
  a: known(1),
  b: known(2),
  c: known(3),
  vals: known('{1,2}'),
  other: known('{3,4}'),
  ints: known('{1,2}'),
  status: known(1),
  statuses: known('{high,high}'),
  whole: known('{1,2}'),
  required: known(1),
  required_values: known('{1}'),
  flag: known(true),
  divisor: known(1),
}
function prepare(
  plans: {
    identity: { schema: string; kind: 'table'; owner: string; constraint: string }
    expression: EvalBoolExpression
  }[],
) {
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
  const wrappers: string[] = []
  group.checks = group.checks.map((check, index) => {
    if (check.kind !== 'supported') throw new Error(check.reason)
    const inputs = check.inputs.map((input) =>
      input.type.startsWith('array:')
        ? { ...input, type: 'pg_catalog.text', rustType: 'TextValue' }
        : input,
    )
    const conversions = check.inputs
      .filter((input) => input.type.startsWith('array:'))
      .map(
        (input) =>
          `let converted_${input.rustName}=poly_fixture_array(${input.rustName},${rustStringLiteral(input.type.slice(6))},${arrayElementFamily(input.type.slice(6))});`,
      )
    const args = check.inputs.map((input) =>
      input.type.startsWith('array:') ? 'converted_' + input.rustName : input.rustName,
    )
    const entryName = checkRustEntryName({ ...plans[index]!.identity, owner: 'poly_fixture' })
    wrappers.push(
      `pub fn ${entryName}(${inputs.map((input) => input.rustName + ':' + input.rustType).join(',')})->CheckOutcome {${conversions.join('\n')} ${check.entryName}(${args.join(',')})}`,
    )
    return { ...check, entryName, inputs }
  })
  group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
    '\n' + wrappers.join('\n')
  group
    .source!.modules.find((module) => module.name === 'pg_catalog')!
    .files.push({
      path: 'test/poly_fixture.rs',
      source: String.raw`
pub fn poly_fixture_array(input:TextValue,identity:&str,family:i32)->ArrayValue {
 let plan=prepare_array_text(input,false,1);let mut index=make_int4_value(0);let mut builder=make_array_arguments(identity,family);
 while array_text_has_event(&plan,index) {
  let event=array_text_event_at(&plan,index);let mut cell=array_integer_text_element(event.clone(),2);
  if family==6 {
   cell=ArrayElement::Null;
   if let TextValue::Value(label)=event {cell=ArrayElement::Unknown;
    if label=="low" {cell=array_element_from_enum(make_enum_value(0));};
    if label=="high" {cell=array_element_from_enum(make_enum_value(1));};
   };
  };
  builder=append_array_argument(builder,cell);index=array_text_next_index(index);
 }
 finish_prepared_array_text(plan,builder)
}
`,
    })
  group.evaluatorSource += '\n' + wrappers.join('\n')
  return group
}
it('evaluates domain-valued polymorphic calls, common array coercions, lazy constraints and reached error order in every target', async () => {
  const entries = Object.entries(forms).flatMap(([name, sql]) => {
    const constraint = table.constraints.find((item) => item.name === name)!
    return (['source', 'stored'] as const).map((origin) => ({
      name: name + '_' + origin,
      sql: origin === 'source' ? sql : constraint.definition.replace(/^CHECK\s*/u, ''),
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: name + '_' + origin,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin,
        )!.expression,
      ),
    }))
  })
  const group = prepare(entries)
  const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    references: unknown[] = []
  const samples: Partial<Row>[] = [
    {},
    { flag: known(false) },
    {
      a: known(null),
      b: known(null),
      vals: known(null),
      other: known(null),
      ints: known(null),
      status: known(null),
      statuses: known(null),
    },
    { vals: known(null), other: known('{-1,2}'), flag: known(false) },
    { other: known('{-1,2}'), divisor: known(0) },
    { vals: known('{}'), other: known('{}'), ints: known('{}'), required_values: known('{}') },
    { vals: known('{1,NULL}'), other: known('{NULL,2}') },
    { vals: known('[0:1]={1,2}'), other: known('[0:1]={3,4}') },
    { vals: known('{{1,2},{3,4}}'), other: known('{{3,4},{5,6}}'), ints: known('{{1,2},{3,4}}') },
    { divisor: known(0), flag: known(true) },
  ]
  for (const sample of samples) {
    const row: Row = { ...base }
    Object.assign(row, sample)
    const keys = Object.keys(base)
    const parameters = keys.map((key) => {
      const item = row[key]!
      return item.kind === 'Null'
        ? null
        : key === 'status'
          ? 'high'
          : item.kind === 'Value'
            ? item.value
            : null
    })
    await pg.exec('TRUNCATE domain_oracle')
    await pg.query(
      `INSERT INTO domain_oracle(${keys.join(',')}) VALUES(${keys.map((_, i) => '$' + (i + 1)).join(',')})`,
      parameters,
    )
    for (const entry of entries) {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(`SELECT ${entry.sql} value FROM domain_oracle`)
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expected = {
          kind: 'Error',
          value: { state: parseInt((error as { code: string }).code, 36) },
        }
      }
      fixtures.push({ name: entry.name, row, expected })
      references.push({ name: entry.name, parameters, expected })
    }
  }
  const add = (name: string, row: Row, expected: Outcome) => {
    for (const origin of ['source', 'stored'])
      fixtures.push({ name: name + '_' + origin, row, expected })
  }
  const fillWitnesses = (
    await pg.query<{ value: boolean }>(
      'SELECT cardinality(array_fill(item,ARRAY[2]))=2 value FROM (VALUES(NULL::positive_units),(1::positive_units),(2147483647::positive_units)) inputs(item)',
    )
  ).rows
  expect(fillWitnesses.map((row) => row.value)).toEqual([true, true, true])
  add('fill', { ...base, a: { kind: 'Unknown' } }, { kind: 'True' })
  add(
    'fill',
    { ...base, a: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
    { kind: 'Error', value: { state: parseInt('22012', 36) } },
  )
  add(
    'mixed_coalesce',
    { ...base, other: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
    { kind: 'True' },
  )
  add(
    'mixed_coalesce',
    {
      ...base,
      vals: { kind: 'Unknown' },
      other: { kind: 'Error', value: { state: parseInt('22012', 36) } },
    },
    { kind: 'Unknown' },
  )
  add(
    'skipped_required',
    { ...base, flag: known(true), required_values: { kind: 'Unknown' } },
    { kind: 'True' },
  )
  add(
    'constructor_error_order',
    { ...base, other: { kind: 'Unknown' }, divisor: known(0) },
    { kind: 'Unknown' },
  )
  const artifact = process.env['PGSID_DOMAIN_POLY_ARTIFACTS']
  if (artifact) {
    await mkdir(artifact, { recursive: true })
    await writeFile(join(artifact, 'fixtures.json'), JSON.stringify(fixtures))
    await writeFile(join(artifact, 'references.json'), JSON.stringify(references))
    await writeFile(join(artifact, 'plans.json'), JSON.stringify(entries))
  }
  console.log(`Domain polymorphism: ${fixtures.length} cross-target fixtures`)
  await runCheckParity(
    directory,
    'domainpolymorphic',
    group,
    entries.map((e) => e.name),
    fixtures,
  )
}, 240000)

it('preserves already-coerced domain ownership through polymorphic results after a domain CHECK is tightened', async () => {
  await pg.exec(`CREATE TABLE legacy_domain_values(id integer,a positive_units,vals positive_units[]);
    INSERT INTO legacy_domain_values VALUES(1,1,ARRAY[1,2]::positive_units[]),(2,NULL,NULL);
    ALTER DOMAIN positive_units ADD CONSTRAINT later_limit CHECK(VALUE>5) NOT VALID`)
  const legacyForms: Record<string, string> = {
    retained_fill: '(array_fill(a,ARRAY[2]))[1]::positive_units IS NOT DISTINCT FROM a',
    retained_append: '(array_append(vals,a))[1]::positive_units>0',
    erased_fill: '(array_fill(a::integer,ARRAY[2]))[1]::positive_units>0',
    erased_append: '(array_append(vals,a::other_units))[1]::positive_units>0',
    retained_choice: '(array_fill(COALESCE(a,a),ARRAY[2]))[1]::positive_units>0',
    erased_choice: '(array_fill(COALESCE(a,NULL),ARRAY[2]))[1]::positive_units>0',
  }
  for (const [name, sql] of Object.entries(legacyForms))
    await pg.exec(`ALTER TABLE legacy_domain_values ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
  const captured = await snapshotCatalog(pg),
    legacyTable = captured.tables.find((t) => t.name === 'legacy_domain_values')!
  const entries = Object.entries(legacyForms).flatMap(([name, sql]) => {
    const constraint = legacyTable.constraints.find((c) => c.name === name)!
    return (['source', 'stored'] as const).map((origin) => ({
      name: name + '_' + origin,
      sql,
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: legacyTable.name,
        constraint: name + '_' + origin,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          legacyTable,
          origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
          captured.enums,
          captured.domains,
          origin,
        )!.expression,
      ),
    }))
  })
  const group = prepare(entries),
    fixtures: { name: string; row: Row; expected: Outcome }[] = []
  for (const id of [1, 2])
    for (const entry of entries) {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${entry.sql} value FROM legacy_domain_values WHERE id=$1`,
            [id],
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expected = {
          kind: 'Error',
          value: { state: parseInt((error as { code: string }).code, 36) },
        }
      }
      if (id === 1)
        expect(expected, entry.name).toEqual(
          entry.name.startsWith('erased_')
            ? { kind: 'Error', value: { state: parseInt('23514', 36) } }
            : { kind: 'True' },
        )
      fixtures.push({
        name: entry.name,
        row: { a: known(id === 1 ? 1 : null), vals: known(id === 1 ? '{1,2}' : null) },
        expected,
      })
    }
  const artifact = process.env['PGSID_DOMAIN_POLY_ARTIFACTS']
  if (artifact) await writeFile(join(artifact, 'legacy-fixtures.json'), JSON.stringify(fixtures))
  const legacyDirectory = join(directory, 'legacy')
  await mkdir(legacyDirectory)
  await runCheckParity(
    legacyDirectory,
    'domainpolylegacy',
    group,
    entries.map((e) => e.name),
    fixtures,
  )
}, 240000)
