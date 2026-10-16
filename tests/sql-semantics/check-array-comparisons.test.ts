import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'

const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('compares integer array prefixes, NULL cells, dimensions and bounds with raw/stored operators and expression composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-comparisons-shapes-'))
  try {
    await pg.exec(
      'SET array_nulls=on;CREATE DOMAIN comparison_slots AS integer[];CREATE TABLE comparison_values(a text,b text,expected integer,bypass boolean);CREATE TABLE comparison_oracle(LIKE comparison_values)',
    )
    const expressions = {
      equal: 'a::integer[] = b::integer[]',
      different: 'a::integer[] <> b::integer[]',
      less: 'a::integer[] < b::integer[]',
      less_equal: 'a::integer[] <= b::integer[]',
      greater: 'a::integer[] > b::integer[]',
      greater_equal: 'a::integer[] >= b::integer[]',
      named_eq: 'array_eq(a::integer[],b::integer[])',
      named_ne: 'array_ne(a::integer[],b::integer[])',
      cmp: 'btarraycmp(a::integer[],b::integer[]) IS NOT DISTINCT FROM expected',
      distinct: 'a::comparison_slots IS DISTINCT FROM b::integer[]',
      nullif: 'cardinality(NULLIF(a::integer[],b::integer[])) IS NULL',
      greatest:
        '(GREATEST(a::integer[],b::integer[]))::text COLLATE "C" IS NOT DISTINCT FROM b::integer[]::text COLLATE "C"',
      least:
        '(LEAST(a::integer[],b::integer[]))::text COLLATE "C" IS NOT DISTINCT FROM a::integer[]::text COLLATE "C"',
      row_compare: 'ROW(a::integer[],1) < ROW(b::integer[],2)',
      simple_case: 'CASE a::integer[] WHEN b::integer[] THEN true ELSE false END',
      lazy: 'bypass OR a::integer[] = b::integer[]',
      null_literal: 'a::integer[] = NULL',
      array_literal: "a::integer[] = '{1,NULL}'",
    }
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(`ALTER TABLE comparison_values ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'comparison_values')!
    const plans = Object.entries(expressions).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === name)!
        const plan = lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.requiresRegex).toBe(false)
    expect(group.evaluatorSource).toContain('while array_comparison_continues(&')
    const arrays = [
      '{}',
      '{NULL}',
      '{1,NULL}',
      '{1,2}',
      '{2,0}',
      '[0:1]={1,2}',
      '{{1,2}}',
      '[0:0][-1:0]={{1,2}}',
      '[-2147483648:-2147483647]={1,2}',
      '[2147483645:2147483646]={1,2}',
      null,
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const a of arrays)
      for (const b of arrays) {
        const expected = (
          await pg.query<{ value: number | null }>(
            'SELECT btarraycmp($1::integer[],$2::integer[]) AS value',
            [a, b],
          )
        ).rows[0]!.value
        await pg.exec('TRUNCATE comparison_oracle')
        await pg.query('INSERT INTO comparison_oracle VALUES($1,$2,$3,$4)', [a, b, expected, false])
        for (const [name, sql] of Object.entries(expressions)) {
          let expectedOutcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} AS value FROM comparison_oracle`,
              )
            ).rows[0]!.value
            expectedOutcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expectedOutcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, a, b, comparison: expected, expected: expectedOutcome })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { a: known(a), b: known(b), expected: known(expected), bypass: known(false) },
              expected: expectedOutcome,
            })
        }
      }
    const base: Row = { a: known('{1}'), b: known('{1}'), expected: known(0), bypass: known(false) }
    for (const name of ['equal_source', 'less_stored'])
      fixtures.push({
        name,
        row: { ...base, a: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
    fixtures.push({
      name: 'equal_source',
      row: {
        ...base,
        a: known(null),
        b: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
    })
    fixtures.push({
      name: 'lazy_source',
      row: { ...base, b: known('{bad}'), bypass: known(true) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'lazy_stored',
      row: { ...base, b: known('{bad}') },
      expected: { kind: 'Error', value: { state: parseInt('22P02', 36) } },
    })
    await mkdir('artifacts/array-comparisons', { recursive: true })
    await writeFile(
      'artifacts/array-comparisons/shape-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-comparisons/shape-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycomparisonshapes',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('uses each represented element type default equality and ordering, including absent operators and hash-only equality', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-comparisons-families-'))
  try {
    await pg.exec(
      "SET array_nulls=on; SET TIME ZONE 'UTC'; CREATE TYPE array_stage AS ENUM ('new','done'); CREATE TABLE family_comparisons(a text,b text,expected_order integer);CREATE TABLE family_oracle(LIKE family_comparisons)",
    )
    const forms: { name: string; sql: string; type: string; cmp: boolean }[] = [],
      samples = new Map<string, (string | null)[][]>()
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const value = `${literal}::${type}`
      const result = (
        await pg.query<{ base: string; shorter: string; reversed: string; shifted: string }>(
          `SELECT ARRAY[${value},NULL::${type}]::text AS base,ARRAY[${value}]::text AS shorter,ARRAY[NULL::${type},${value}]::text AS reversed,array_fill(${value},ARRAY[1,2],ARRAY[-1,0])::text AS shifted`,
        )
      ).rows[0]!
      if (type === 'money') {
        result.base = '{0,NULL}'
        result.shorter = '{0}'
        result.reversed = '{NULL,0}'
        result.shifted = '[-1:-1][0:1]={{0,0}}'
      }
      samples.set(type, [
        [result.base, result.base],
        [result.base, result.shorter],
        [result.base, result.reversed],
        [result.base, result.shifted],
        [result.base, '{}'],
        ['{}', '{}'],
        ['{NULL}', '{NULL}'],
        [null, result.base],
        [result.base, null],
        [null, null],
      ])
      forms.push({
        name: 'family_' + index + '_eq',
        sql: `a::${type}[] = b::${type}[]`,
        type,
        cmp: false,
      })
      forms.push({
        name: 'family_' + index + '_cmp',
        sql: `btarraycmp(a::${type}[],b::${type}[]) IS NOT DISTINCT FROM expected_order`,
        type,
        cmp: true,
      })
    }
    for (const form of forms)
      await pg.exec(`ALTER TABLE family_comparisons ADD CONSTRAINT ${form.name} CHECK(${form.sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'family_comparisons')!
    const plans = forms.flatMap((form) =>
      ['source', 'stored'].map((origin) => {
        const constraint = table.constraints.find((item) => item.name === form.name)!
        const plan = lowerTableCheck(
          table,
          origin === 'source' ? { ...constraint, definition: `CHECK(${form.sql})` } : constraint,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms)
      for (const [a, b] of samples.get(form.type)!) {
        await pg.exec('TRUNCATE family_oracle')
        await pg.query('INSERT INTO family_oracle(a,b) VALUES($1,$2)', [a, b])
        let order: number | null = null,
          expected: Outcome
        try {
          if (form.cmp)
            order = (
              await pg.query<{ value: number | null }>(
                `SELECT btarraycmp(a::${form.type}[],b::${form.type}[]) AS value FROM family_oracle`,
              )
            ).rows[0]!.value
          const value = form.cmp
            ? true
            : (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${form.sql} AS value FROM family_oracle`,
                )
              ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name: form.name, a, b, order, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.name + '_' + origin,
            row: { a: known(a!), b: known(b!), expected_order: known(order) },
            expected,
          })
      }
    expect(arrayScalarProfiles).toHaveLength(58)
    await mkdir('artifacts/array-comparisons', { recursive: true })
    await writeFile(
      'artifacts/array-comparisons/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-comparisons/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycomparisonfamilies',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('preserves the C name comparator integer result for SQL-coerced Unicode names and string prefixes', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-comparisons-name-'))
  try {
    await pg.exec(
      'CREATE TABLE name_comparisons(first_name name,second_name name,expected integer)',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'name_comparisons')!
    const plan = lowerTableCheck(
      table,
      {
        name: 'name_order',
        type: 'check',
        definition:
          'CHECK(btnamecmp(first_name COLLATE "C",second_name COLLATE "C") IS NOT DISTINCT FROM expected)',
      },
      [],
      [],
      'source',
    )!
    const group = prepareCheckRustGroup([
      {
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: 'name_order',
        },
        expression: portableCheckAtoms(plan.expression),
      },
    ])
    expect(group.checks[0]!.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const a of ['', 'a', 'abc', 'z', 'é', '雪', '😊', 'x'.repeat(62) + '😊', null])
      for (const b of ['', 'a', 'abc', 'z', 'é', '雪', '😊', null]) {
        const row = (
          await pg.query<{ a: string | null; b: string | null; value: number | null }>(
            'SELECT $1::name::text AS a,$2::name::text AS b,btnamecmp($1::name COLLATE "C",$2::name COLLATE "C") AS value',
            [a, b],
          )
        ).rows[0]!
        references.push(row)
        fixtures.push({
          name: 'name_order',
          row: { first_name: known(row.a), second_name: known(row.b), expected: known(row.value) },
          expected: { kind: 'True' },
        })
      }
    fixtures.push({
      name: 'name_order',
      row: { first_name: { kind: 'Unknown' }, second_name: known('a'), expected: known(0) },
      expected: { kind: 'Unknown' },
    })
    await writeFile(
      'artifacts/array-comparisons/name-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-comparisons/name-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arraycomparisonname', group, ['name_order'], fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('retains default and explicit array collations and resolves context-independent prefixes before deferring a missing ordering provider', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-comparisons-context-'))
  try {
    await pg.exec(
      'SET array_nulls=on;CREATE TABLE context_comparisons(a text,b text,bypass boolean);CREATE TABLE context_captured(a text COLLATE "C",b text COLLATE "C",bypass boolean);CREATE TABLE context_oracle(LIKE context_comparisons)',
    )
    const expressions = {
      less: 'a::text[] < b::text[]',
      equal: 'a::text[] = b::text[]',
      explicit: '(a::text[] COLLATE "C") < (b::text[] COLLATE "C")',
      inherited: '((a COLLATE "C")::text[]) < b::text[]',
      same_literal: "ARRAY['x'] <= ARRAY['x']",
      different_literal: "ARRAY['a'] < ARRAY['z']",
      mixed: "ARRAY['x'] < b::text[]",
      coalesce: "COALESCE(a::text[],ARRAY['x']) < b::text[]",
      case_array: "(CASE WHEN bypass THEN a::text[] ELSE ARRAY['x'] END) < b::text[]",
    }
    const catalog = await snapshotCatalog(pg),
      original = catalog.tables.find((item) => item.name === 'context_comparisons')!,
      captured = catalog.tables.find((item) => item.name === 'context_captured')!
    expect(
      captured.columns
        .filter((column) => column.name !== 'bypass')
        .every((column) => column.collationIsC),
    ).toBe(true)
    const unknownDefault = {
      ...original,
      columns: original.columns.map((column) =>
        column.name === 'a' || column.name === 'b'
          ? {
              ...column,
              collationIsC: false,
              collationDeterministic: true,
              collationIsDefault: true,
            }
          : column,
      ),
    }
    const cases: (readonly [string | null, string | null, boolean])[] = [
      ['{}', '{}', false],
      ['{}', '{z}', false],
      [null, '{z}', false],
      ['{NULL}', '{z}', false],
      ['{x}', '{x}', false],
      ['{x}', '{y}', true],
      ['{x,NULL}', '{x,y}', false],
      ['{x,a}', '{x,z}', true],
      ['[0:0]={x}', '{x}', false],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const plans: {
      identity: { schema: string; kind: 'table'; owner: string; constraint: string }
      expression: ReturnType<typeof portableCheckAtoms>
    }[] = []
    for (const profile of ['declared', 'missing', 'captured'] as const)
      for (const [name, sql] of Object.entries(expressions)) {
        if (profile === 'missing' && ['mixed', 'coalesce', 'case_array'].includes(name)) continue
        const table = profile === 'captured' ? captured : unknownDefault
        const plan = lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: profile + '_' + name,
          },
          expression: portableCheckAtoms(plan.expression),
        })
        for (const [a, b, needsContext] of cases) {
          await pg.exec('TRUNCATE context_oracle')
          await pg.query('INSERT INTO context_oracle VALUES($1,$2,$3)', [a, b, true])
          const value = (
            await pg.query<{ value: boolean | null }>(`SELECT ${sql} AS value FROM context_oracle`)
          ).rows[0]!.value
          const deferred =
            (profile === 'missing' && name === 'less' && needsContext) ||
            ((profile === 'missing' || profile === 'captured') && name === 'different_literal')
          const expected: Outcome = {
            kind: deferred ? 'Unknown' : value === null ? 'Null' : value ? 'True' : 'False',
          }
          references.push({ profile, name, a, b, postgres: value, expected })
          fixtures.push({
            name: profile + '_' + name,
            row: { a: known(a), b: known(b), bypass: known(true) },
            expected,
          })
        }
      }
    const groups = plans.map((plan) =>
      prepareCheckRustGroup([plan], {
        arrayNulls: true,
        ...(plan.identity.constraint.startsWith('declared_')
          ? { defaultCollation: 'C' as const }
          : {}),
      }),
    )
    for (const [index, group] of groups.entries())
      expect(
        group.checks[0]!.kind,
        plans[index]!.identity.constraint +
          ('reason' in group.checks[0]! ? ':' + group.checks[0]!.reason : ''),
      ).toBe('supported')
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    group.evaluatorSource = groups.map((item) => item.evaluatorSource).join('\n')
    group.checks = groups.flatMap((item) => item.checks)
    group.source = assembleCheckRust({
      source: group.evaluatorSource,
      callables: [],
      requiresRegex: false,
    })
    await writeFile(
      'artifacts/array-comparisons/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-comparisons/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycomparisoncontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('preserves constant comparison preparation and catalog errors through lazy branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-comparisons-constants-'))
  try {
    await pg.exec('CREATE TABLE comparison_constants(bypass boolean,divisor integer)')
    const expressions = {
      pruned: "CASE WHEN true THEN true ELSE '{}'::json[] = '{}'::json[] END",
      constant_missing: "CASE WHEN bypass THEN true ELSE '{}'::json[] = '{}'::json[] END",
      runtime_missing:
        "CASE WHEN bypass THEN true ELSE '{}'::text::json[] = '{}'::text::json[] END",
      shape_before_missing: "'{}'::json[] <> '{NULL}'::json[]",
      null_before_missing: "NULL::json[] = '{}'::json[]",
      error_operand: 'ARRAY[1/divisor] = ARRAY[1]',
      enum_order: "ARRAY['new'::array_stage] < ARRAY['done'::array_stage]",
      enum_case:
        "CASE ARRAY['new'::array_stage] WHEN ARRAY['done'::array_stage] THEN false WHEN ARRAY['new'::array_stage] THEN true ELSE false END",
    }
    await pg.exec("CREATE TYPE array_stage AS ENUM ('new','done')")
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'comparison_constants')!
    const plans = Object.entries(expressions).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const bypass of [false, true])
      for (const divisor of [0, 1]) {
        await pg.exec('TRUNCATE comparison_constants')
        await pg.query('INSERT INTO comparison_constants VALUES($1,$2)', [bypass, divisor])
        for (const [name, sql] of Object.entries(expressions)) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} AS value FROM comparison_constants`,
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          references.push({ name, bypass, divisor, expected })
          fixtures.push({ name, row: { bypass: known(bypass), divisor: known(divisor) }, expected })
        }
      }
    for (const sql of ['ARRAY[1] = ARRAY[1::bigint]', 'array_eq(ARRAY[1],ARRAY[1::bigint])']) {
      await expect(pg.query('SELECT ' + sql)).rejects.toMatchObject({ code: '42883' })
      expect(
        lowerTableCheck(
          table,
          { name: 'invalid', type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
    }
    await writeFile(
      'artifacts/array-comparisons/constant-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-comparisons/constant-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycomparisonconstants',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('preserves decisive prefixes, unknown cells and independent nested comparison snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-comparisons-owned-'))
  try {
    const evaluatorSource =
      'pub fn evaluate_check()->CheckOutcome {let result=array_comparison_owned_probe();check_from_bool(result)}'
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({
        path: 'test/array_comparisons.rs',
        source: String.raw`
fn array_comparison_partial(first:i32,lower:i32)->ArrayValue {
 let mut builder=make_array_arguments("pg_catalog.int4",2);
 builder=append_array_dimension(builder,lower,2);
 builder=append_array_argument(builder,array_element_from_int4(make_int4_value(first)));
 builder=append_array_argument(builder,ArrayElement::Unknown);
 finish_array_arguments(builder)
}
fn array_comparison_probe(left:ArrayValue,right:ArrayValue,equality:bool)->Int4Value {
 let payload=prepare_array_comparison(left,right,equality,true);
 let mut result=array_comparison_initial(&payload);
 let mut index=make_int4_value(0);
 while array_comparison_continues(&payload,index,result) {
  let left_cell=array_comparison_element_at(&payload,index,false);
  let right_cell=array_comparison_element_at(&payload,index,true);
  let pair=array_comparison_pair(left_cell.clone(),right_cell.clone(),equality);
  if array_pair_requires_scalar(pair) {
   let a=array_element_to_int4(left_cell);
   let b=array_element_to_int4(right_cell);
   if equality {result=array_equality_step(sql__pg_catalog__int4eq__lrxe(a,b));}
   else {result=array_order_step(sql__pg_catalog__btint4cmp__e3r7(a,b));};
  } else {result=pair;};
  index=array_text_next_index(index);
 }
 finish_array_comparison(&payload,result)
}
pub fn array_comparison_owned_probe()->BoolValue {
 let first=array_comparison_partial(1,1);
 let second=array_comparison_partial(2,1);
 if array_comparison_probe(first.clone(),second.clone(),false)!=make_int4_value(-1) {return BoolValue::Value(false);};
 if array_comparison_probe(first.clone(),second,true)!=make_int4_value(1) {return BoolValue::Value(false);};
 if array_comparison_probe(first.clone(),first.clone(),false)!=Int4Value::Unknown {return BoolValue::Value(false);};
 if array_comparison_probe(first.clone(),first.clone(),true)!=Int4Value::Unknown {return BoolValue::Value(false);};
 let shifted=array_comparison_partial(1,0);
 if array_comparison_probe(first.clone(),shifted.clone(),true)!=make_int4_value(1) {return BoolValue::Value(false);};
 if array_comparison_probe(first,shifted,false)!=Int4Value::Unknown {return BoolValue::Value(false);};
 let no_equality=finish_array_constructor(make_array_arguments("pg_catalog.\"json\"",11));
 let unavailable=prepare_array_comparison(no_equality.clone(),no_equality.clone(),true,false);
 if array_comparison_initial(&unavailable)!=Int4Value::Error(make_sql_error(6822435)) {return BoolValue::Value(false);};
 let error_plan=prepare_array_comparison(ArrayValue::Null,ArrayValue::Error(make_sql_error(3452582)),true,true);
 if array_comparison_initial(&error_plan)!=Int4Value::Error(make_sql_error(3452582)) {return BoolValue::Value(false);};
 let unknown_plan=prepare_array_comparison(ArrayValue::Null,ArrayValue::Unknown,true,true);
 if array_comparison_initial(&unknown_plan)!=Int4Value::Unknown {return BoolValue::Value(false);};
 let original=make_jsonb_value("{\"a\": [1, 2]}");
 let mut builder=make_array_arguments("pg_catalog.jsonb",12);
 builder=append_array_argument(builder,array_element_from_jsonb(original.clone()));
 let array=finish_array_constructor(builder);
 let payload=prepare_array_comparison(array.clone(),array.clone(),true,true);
 let plan=ArrayComparisonPlan::Value(payload);
 let copied=plan.clone();
 if let ArrayComparisonPlan::Value(snapshot)=copied {
  let mut cells=snapshot.left;
  let cell=cells[0].clone();
  if let ArrayElement::Jsonb(value)=cell {
   let mut characters=value.characters;characters[0]='x';
   cells[0]=ArrayElement::Jsonb(JsonbPayload{root:value.root,nodes:value.nodes,characters:characters});
  };
  let changed=ArrayComparisonPayload{left:cells,right:snapshot.right,limit:snapshot.limit,state:snapshot.state,error:snapshot.error,tail:snapshot.tail,value:snapshot.value};
  let left=array_element_to_jsonb(array_comparison_element_at(&changed,make_int4_value(0),false));
  let right=array_element_to_jsonb(array_comparison_element_at(&changed,make_int4_value(0),true));
  if jsonb_to_text(left)==jsonb_to_text(original.clone()) {return BoolValue::Value(false);};
  if jsonb_to_text(right)!=jsonb_to_text(original.clone()) {return BoolValue::Value(false);};
 };
 if let ArrayComparisonPlan::Value(snapshot)=plan {
  let left=array_element_to_jsonb(array_comparison_element_at(&snapshot,make_int4_value(0),false));
  if jsonb_to_text(left)!=jsonb_to_text(original) {return BoolValue::Value(false);};
 };
 BoolValue::Value(true)
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [{ kind: 'supported', entryName: 'evaluate_check', inputs: [] }],
    }
    await runCheckParity(
      directory,
      'arraycomparisonowned',
      group,
      ['ownership'],
      [{ name: 'ownership', row: {}, expected: { kind: 'True' } }],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
