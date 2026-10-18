import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { domainElementType, domainElementDefinition } from '../../src/sql-semantics/expressions.js'
import { catalogArrayType } from '../../src/sql-semantics/catalog-check-binder.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('resolves nominal domain array identities independently of deployment OIDs and rejects ambiguous or malformed carriers', async () => {
  const identities: string[][] = []
  const catalogOids: number[][] = []
  for (const padding of ['', "CREATE TYPE deployment_padding AS ENUM ('unused');"]) {
    const pg = await PGlite.create()
    try {
      await pg.exec(`${padding}
        CREATE SCHEMA alternative;
        CREATE DOMAIN public.quantity AS integer;
        CREATE DOMAIN alternative.quantity AS integer;
        CREATE DOMAIN public.quantity_alias AS public.quantity;
        CREATE DOMAIN public.row_quantity AS integer[];
        CREATE TABLE public.domain_identities(a public.quantity[], b alternative.quantity[], c public.quantity_alias[], d public.row_quantity[]);
      `)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((item) => item.name === 'domain_identities')!
      const resolved = table.columns.map((column) =>
        catalogArrayType(column.typeName, column.typeOid, catalog.domains, catalog.enums),
      )
      expect(resolved).toEqual([
        'array:' + domainElementType({ schema: 'public', name: 'quantity' }, 'pg_catalog.int4'),
        'array:' +
          domainElementType({ schema: 'alternative', name: 'quantity' }, 'pg_catalog.int4'),
        'array:' +
          domainElementType({ schema: 'public', name: 'quantity_alias' }, 'pg_catalog.int4'),
        'array:' +
          domainElementType({ schema: 'public', name: 'row_quantity' }, 'array:pg_catalog.int4'),
      ])
      expect(catalogArrayType('quantity[]', undefined, catalog.domains)).toBeNull()
      identities.push(resolved as string[])
      catalogOids.push(catalog.domains.map((domain) => domain.oid))
    } finally {
      await pg.close()
    }
  }
  expect(identities[0]).toEqual(identities[1])
  expect(catalogOids[0]).not.toEqual(catalogOids[1])
  for (const malformed of [
    'domain:[]',
    'domain:["public","x","array:array:pg_catalog.int4"]',
    'domain:["public","x","domain:other"]',
    'domain:["public","x","enum:bad"]',
  ]) {
    expect(domainElementDefinition(malformed)).toBeNull()
    expect(arrayElementFamily(malformed)).toBeNull()
  }
})

it('evaluates SQL-coerced scalar-domain arrays through raw and stored CHECKs in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-array-'))
  try {
    await pg.exec(`
      CREATE DOMAIN positive_count AS integer CHECK (VALUE>0);
      CREATE TYPE domain_stage AS ENUM ('new','done');
      CREATE DOMAIN stage_value AS domain_stage;
      CREATE TABLE domain_values(a positive_count[], b positive_count[], item positive_count, stages stage_value[], bypass boolean);
      CREATE TABLE domain_oracle(LIKE domain_values);
    `)
    const forms = {
      count: 'cardinality(a)=3',
      rank: 'array_ndims(a)=1',
      dimensions: 'array_dims(a) COLLATE "C" = \'[1:3]\'',
      lower: 'array_lower(a,1)=1',
      upper: 'array_upper(a,1)=3',
      fetch: 'a[1]=1',
      null_fetch: 'a[2] IS NULL',
      slice_count: 'cardinality(a[1:2])=2',
      equal: 'a=b',
      ordered: 'a<b',
      contains: 'a @> b',
      overlap: 'a && b',
      concatenate: 'cardinality(array_cat(a,b))=5',
      reverse_fetch: '(array_reverse(a))[1]=2',
      sorted_fetch: '(array_sort(a))[1]=1',
      output: 'a::text COLLATE "C" = \'{1,NULL,2}\'',
      constructor: 'cardinality(ARRAY[item,item])=2',
      fetched_constructor: 'cardinality(ARRAY[a[1],a[2]])=2',
      retained_case: 'cardinality(CASE WHEN bypass THEN a ELSE b END)=3',
      retained_coalesce: 'cardinality(COALESCE(a,b))=3',
      enum_fetch: "stages[1]::domain_stage='new'::domain_stage",
      enum_output: 'stages::text COLLATE "C" = \'{new,done}\'',
      skipped: 'CASE WHEN bypass THEN true ELSE cardinality(a)=3 END',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE domain_values ADD CONSTRAINT "${name}" CHECK (${sql})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'domain_values')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)!
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
              origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
            )!.expression,
          ),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const plan of plans.filter(
      (plan) =>
        plan.identity.constraint.startsWith('constructor_') ||
        plan.identity.constraint.startsWith('fetched_constructor_'),
    ))
      expect(JSON.stringify(plan.expression)).toContain('array:domain:')
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const wrappers: string[] = []
    const checks = group.checks.map((check, index) => {
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
            `let domain_${input.rustName}=domain_fixture_array(${input.rustName},${rustStringLiteral(input.type.slice(6))},${arrayElementFamily(input.type.slice(6))});`,
        )
      const args = check.inputs.map((input) =>
        input.type.startsWith('array:') ? 'domain_' + input.rustName : input.rustName,
      )
      const entryName = checkRustEntryName({ ...plans[index]!.identity, owner: 'domain_fixture' })
      wrappers.push(
        `pub fn ${entryName}(${inputs.map((input) => input.rustName + ':' + input.rustType).join(',')})->CheckOutcome { ${conversions.join('\n')} ${check.entryName}(${args.join(',')}) }`,
      )
      return { ...check, entryName, inputs }
    })
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group
      .source!.modules.find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/domain_array.rs',
        source: String.raw`
pub fn domain_fixture_array(input:TextValue,identity:&str,family:i32)->ArrayValue {
 let plan=prepare_array_text(input,false,1);let mut index=make_int4_value(0);let mut builder=make_array_arguments(identity,family);
 while array_text_has_event(&plan,index) {
  let event=array_text_event_at(&plan,index);let mut cell=array_integer_text_element(event.clone(),2);
  if family==6 {
   cell=ArrayElement::Null;
   if let TextValue::Value(label)=event {
    cell=ArrayElement::Unknown;
    if label=="new" {cell=array_element_from_enum(make_enum_value(0));};
    if label=="done" {cell=array_element_from_enum(make_enum_value(1));};
   };
  };
  builder=append_array_argument(builder,cell);index=array_text_next_index(index);
 }
 finish_prepared_array_text(plan,builder)
}
`,
      })
    group.evaluatorSource += '\n' + wrappers.join('\n')
    group.checks = checks
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const values of [
      ['{1,NULL,2}', '{1,2}', 2, '{new,done}', false],
      ['{}', '{3}', null, '{}', true],
      [null, null, 1, null, false],
      ['[0:2]={1,NULL,2}', '{1,NULL,2}', 1, '{done,new}', false],
      ['{{1,2},{3,4}}', '{{1,2},{3,4}}', 3, '{new,NULL}', true],
      ['{NULL}', '{}', null, '{NULL}', false],
    ] as const) {
      await pg.exec('TRUNCATE domain_oracle')
      await pg.query('INSERT INTO domain_oracle VALUES($1,$2,$3,$4,$5)', [...values])
      const row: Row = Object.fromEntries(
        ['a', 'b', 'item', 'stages', 'bypass'].map((name, index) => [name, known(values[index]!)]),
      )
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ actual: boolean | null }>(`SELECT ${sql} AS actual FROM domain_oracle`)
          ).rows[0]!.actual
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name, values, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
    }
    fixtures.push({
      name: 'skipped_source',
      row: { a: { kind: 'Unknown' }, bypass: known(true) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'count_source',
      row: { a: { kind: 'Unknown' } },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'count_source',
      row: { a: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
      expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
    })
    await mkdir('artifacts/array-domains', { recursive: true })
    await writeFile(
      'artifacts/array-domains/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-domains/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(279)
    await runCheckParity(
      directory,
      'domainarrays',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
