import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogArrayType } from '../../src/sql-semantics/catalog-check-binder.js'
import { domainElementType, domainElementDefinition } from '../../src/sql-semantics/expressions.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { arrayScalarProfiles, arrayFixtureSource } from './check-array-fixtures.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

type ArrayInput = { dimensions: string | null; elements: (number | null | ArrayInput)[] }

const forms = {
  count: 'cardinality(groups)=expected',
  first: 'cardinality(groups[1])=expected',
  cell: '(groups[1])[1]=expected',
  slice: 'cardinality(groups[1:1])=expected',
  constructor: 'cardinality(ARRAY[first,second])=2',
  constructor_first: 'cardinality((ARRAY[first,second])[1])=expected',
  fill: 'cardinality(array_fill(first,ARRAY[2]))=2',
  append: 'cardinality(array_append(groups,first))=expected',
  lazy: 'CASE WHEN bypass THEN true ELSE cardinality(groups[1])=expected END',
}

const rows = [
  [
    "ARRAY['[5:6]={10,20}'::slot_group,'[-3:-3]={30}'::slot_group]",
    "'[5:6]={10,20}'",
    "'[-3:-3]={30}'",
    2,
    false,
  ],
  ["ARRAY['{{1,2},{3,4}}'::slot_group,'{9}'::slot_group]", "'{{1,2},{3,4}}'", "'{9}'", 2, false],
  ["'{}'::slot_group[]", "'{1,2}'", "'{3}'", 0, false],
  ['NULL', 'NULL', 'NULL', 2, false],
  ["ARRAY[NULL::slot_group,'{3}'::slot_group]", 'NULL', "'{3}'", 2, false],
  ["ARRAY['{1,2,3}'::slot_group,'{4}'::slot_group]", "'{1,2,3}'", "'{4}'", 2, false],
  ['NULL', 'NULL', 'NULL', 2, true],
  [`'[5:6]={"[5:6]={10,20}","[-3:-3]={30}"}'::slot_group[]`, `'{1,2}'`, `'{3}'`, 2, false],
] as const

const arrayJson = (value: string, nested: boolean): string =>
  `CASE WHEN (${value}) IS NULL THEN NULL ELSE jsonb_build_object('dimensions',array_dims(${value}),'elements',COALESCE((SELECT jsonb_agg(${nested ? arrayJson('inner_value::integer[]', false) : 'inner_value'}) FROM unnest(${value}) AS inner_value),'[]'::jsonb)) END`

it('retains array-valued domain cells through columns, constructors, metadata, fetches, slices, fill, append and lazy composition', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-domain-cells-'))
  try {
    await pg.exec(`CREATE DOMAIN slot_group AS integer[] CHECK(cardinality(VALUE)>0);
      CREATE TABLE nested_source(groups slot_group[],first slot_group,second slot_group,expected integer,bypass boolean);`)
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE nested_${name}(LIKE nested_source,CONSTRAINT ${name} CHECK(${sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'nested_source')!
    const innerType = 'array:pg_catalog.int4'
    const element = domainElementType({ schema: 'public', name: 'slot_group' }, innerType)
    expect(domainElementDefinition(element)?.base).toBe(innerType)
    expect(catalogArrayType('public.slot_group[]', undefined, catalog.domains)).toBe(
      'array:' + element,
    )
    const plans = Object.entries(forms).flatMap(([name, sql]) => {
      const target = catalog.tables.find((item) => item.name === 'nested_' + name)!
      const stored = target.constraints.find((item) => item.name === name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: target.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check' as const, definition: `CHECK(${sql})` }
              : stored,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: { mode: number; name: string; expected: Outcome; accepted: boolean }[] = []
    const inputs: {
      groups: ArrayInput | null
      first: ArrayInput | null
      second: ArrayInput | null
    }[] = []
    for (const [mode, row] of rows.entries()) {
      const [groups, first, second, expected, bypass] = row
      const values = `${groups}::slot_group[] AS groups,${first}::slot_group AS first,${second}::slot_group AS second,${expected}::integer AS expected,${bypass}::boolean AS bypass`
      inputs.push(
        (
          await pg.query<{
            groups: ArrayInput | null
            first: ArrayInput | null
            second: ArrayInput | null
          }>(
            `SELECT ${arrayJson('groups', true)} AS groups,${arrayJson('first::integer[]', false)} AS first,${arrayJson('second::integer[]', false)} AS second FROM (SELECT ${values}) candidate`,
          )
        ).rows[0]!,
      )
      for (const [name, sql] of Object.entries(forms)) {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED(SELECT ${values}) SELECT ${sql} AS value FROM candidate`,
          )
        ).rows[0]!.value
        const outcome: Outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        let accepted = false
        try {
          await pg.exec(`INSERT INTO nested_${name} SELECT * FROM (SELECT ${values}) candidate`)
          accepted = true
        } catch (error) {
          expect(error).toMatchObject({ code: '23514' })
        }
        expect(accepted).toBe(value !== false)
        references.push({ mode, name, expected: outcome, accepted })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: { mode: { kind: 'Value', value: mode } },
            expected: outcome,
          })
      }
    }
    let next = 0
    const helperBodies: string[] = []
    const render = (value: ArrayInput | null, nested: boolean): string => {
      const name = `nested_cell_input_${next++}`
      const body: string[] = []
      if (value === null) body.push('ArrayValue::Null')
      else {
        body.push(
          `let mut values=make_array_arguments(${rustStringLiteral(nested ? element : 'pg_catalog.int4')},${nested ? 41 : 2});`,
        )
        for (const match of (value.dimensions ?? '').matchAll(/\[(-?\d+):(-?\d+)\]/gu))
          body.push(
            `values=append_array_dimension(values,${Number(match[1])},${Number(match[2]) - Number(match[1]) + 1});`,
          )
        for (const cell of value.elements) {
          const item =
            cell === null
              ? 'ArrayElement::Null'
              : nested
                ? `array_element_from_array(${render(cell as ArrayInput, false)}())`
                : `array_element_from_int4(make_int4_value(${cell}))`
          body.push(`values=append_array_argument(values,${item});`)
        }
        body.push('finish_array_arguments(values)')
      }
      helperBodies.push(`pub fn ${name}()->ArrayValue {${body.join('\n')}}`)
      return name
    }
    const inputHelpers = inputs.map((input) =>
      Object.fromEntries(
        Object.entries(input).map(([name, value]) => [name, render(value, name === 'groups')]),
      ),
    )
    for (const name of ['groups', 'first', 'second', 'expected', 'bypass']) {
      const type =
        name === 'expected' ? 'Int4Value' : name === 'bypass' ? 'BoolValue' : 'ArrayValue'
      const branches = rows.map((row, mode) => {
        const value =
          name === 'expected'
            ? `make_int4_value(${row[3]})`
            : name === 'bypass'
              ? `make_bool_value(${row[4]})`
              : `${inputHelpers[mode]![name]}()`
        return `if selected==${mode} {return ${value};}`
      })
      helperBodies.push(
        `pub fn nested_fixture_${name}(mode:Int4Value)->${type} {if let Int4Value::Value(selected)=mode {${branches.join('\n')}}${type}::Unknown}`,
      )
    }
    const wrappers: string[] = []
    const checks = group.checks.map((check, index) => {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind !== 'supported') throw new Error(check.reason)
      const entryName = checkRustEntryName({ ...plans[index]!.identity, owner: 'nested_fixture' })
      const declarations: string[] = []
      const args = check.inputs.map((input, inputIndex) => {
        const name = 'argument_' + inputIndex
        declarations.push(`let ${name}=nested_fixture_${input.name}(mode);`)
        if (input.nullness) {
          declarations.push(`let ${name}_nullness=array_is_null(${name});`)
          return name + '_nullness'
        }
        return name
      })
      wrappers.push(
        `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {${declarations.join('\n')}${check.entryName}(${args.join(',')})}`,
      )
      return {
        ...check,
        entryName,
        inputs: [
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      }
    })
    group
      .source!.modules.find((module) => module.name === 'pg_catalog')!
      .files.push({ path: 'test/nested_domain_cells.rs', source: helperBodies.join('\n') })
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group.evaluatorSource += '\n' + wrappers.join('\n')
    group.checks = checks
    await writeFile(join(directory, 'references.json'), JSON.stringify(references, null, 2))
    await runCheckParity(
      directory,
      'nested_domain_cells',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    expect(fixtures).toHaveLength(Object.keys(forms).length * rows.length * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})

it('retains independently shaped array-valued domains at two nominal levels over every represented scalar profile', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-profiles-'))
  try {
    await pg.exec("CREATE TYPE array_stage AS ENUM ('new','active','done')")
    const expression = `CASE WHEN bypass THEN true ELSE cardinality(groups)=expected AND cardinality(groups[1])=2 AND cardinality((groups[1])[1])=1 AND (groups IS NULL OR (((groups[1])[1])[1]) IS NOT NULL) END`
    for (const [index, [type]] of arrayScalarProfiles.entries())
      await pg.exec(`CREATE DOMAIN scalar_group_${index} AS ${type}[] CHECK(cardinality(VALUE)>0);
        CREATE DOMAIN group_batch_${index} AS scalar_group_${index}[] CHECK(cardinality(VALUE)>0);
        CREATE TABLE nested_profile_${index}(groups group_batch_${index}[],expected integer,bypass boolean,CONSTRAINT shape CHECK(${expression}))`)
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const bodies = [
      arrayFixtureSource.replace('fn array_fixture_element', 'pub fn array_fixture_element'),
    ]
    const expectedStates = ['True', 'False', 'Null', 'True'] as const
    let insertCount = 0
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const table = catalog.tables.find((item) => item.name === 'nested_profile_' + index)!
      const column = table.columns.find((column) => column.name === 'groups')!
      const groups = catalogArrayType(
        column.typeName,
        column.typeOid,
        catalog.domains,
        catalog.enums,
      )!
      expect(groups).not.toBeNull()
      const batch = domainElementDefinition(groups.slice(6))!
      const group = domainElementDefinition(batch.base.slice(6))!
      const scalar = group.base.slice(6)
      const family = arrayElementFamily(scalar)!
      expect(family).toBeGreaterThan(0)
      const value = `ARRAY[ARRAY[ARRAY[${literal}::${type}]::scalar_group_${index},ARRAY[${literal}::${type},NULL::${type}]::scalar_group_${index}]::group_batch_${index}]`
      for (const origin of ['source', 'stored'] as const) {
        const name = 'profile_' + index + '_' + origin
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { name, type: 'check' as const, definition: `CHECK(${expression})` }
                : table.constraints.find((item) => item.name === 'shape')!,
              catalog.enums,
              catalog.domains,
              origin,
            )!.expression,
          ),
        })
        for (const [mode, kind] of expectedStates.entries())
          fixtures.push({ name, row: { mode: { kind: 'Value', value: mode } }, expected: { kind } })
      }
      for (const [mode, kind] of expectedStates.entries()) {
        const input = mode >= 2 ? 'NULL' : value
        const expected = mode === 1 ? 2 : 1
        const bypass = mode === 3
        const candidate = `${input}::group_batch_${index}[] AS groups,${expected}::integer AS expected,${bypass}::boolean AS bypass`
        const result = (
          await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED(SELECT ${candidate}) SELECT ${expression} AS value FROM candidate`,
          )
        ).rows[0]!.value
        expect(result, type + ':' + mode).toBe(kind === 'Null' ? null : kind === 'True')
        const insert = `INSERT INTO nested_profile_${index} SELECT * FROM (SELECT ${candidate}) candidate`
        if (kind === 'False') await expect(pg.exec(insert)).rejects.toMatchObject({ code: '23514' })
        else await pg.exec(insert)
        insertCount++
      }
      bodies.push(`pub fn profile_value_${index}(mode:Int4Value)->ArrayValue {
        if let Int4Value::Value(selected)=mode {if selected>=2 {return ArrayValue::Null;};};
        let mut first=make_array_arguments(${rustStringLiteral(scalar)},${family});
        first=append_array_dimension(first,1,1);
        first=append_array_argument(first,array_fixture_element(${family}));
        let mut second=make_array_arguments(${rustStringLiteral(scalar)},${family});
        second=append_array_dimension(second,-3,2);
        second=append_array_argument(second,array_fixture_element(${family}));
        second=append_array_argument(second,ArrayElement::Null);
        let mut batch=make_array_arguments(${rustStringLiteral(batch.base.slice(6))},41);
        batch=append_array_dimension(batch,1,2);
        batch=append_array_argument(batch,array_element_from_array(finish_array_arguments(first)));
        batch=append_array_argument(batch,array_element_from_array(finish_array_arguments(second)));
        let mut outer=make_array_arguments(${rustStringLiteral(groups.slice(6))},41);
        outer=append_array_dimension(outer,1,1);
        outer=append_array_argument(outer,array_element_from_array(finish_array_arguments(batch)));
        finish_array_arguments(outer)
      }`)
    }
    bodies.push(`pub fn profile_expected(mode:Int4Value)->Int4Value {if let Int4Value::Value(selected)=mode {if selected==1 {return make_int4_value(2);};};make_int4_value(1)}
      pub fn profile_bypass(mode:Int4Value)->BoolValue {if let Int4Value::Value(selected)=mode {return make_bool_value(selected==3);};BoolValue::Unknown}`)
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await mkdir('artifacts/nested-domain-profiles', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-profiles/coverage.json',
      JSON.stringify(
        {
          profiles: arrayScalarProfiles.length,
          nominalLevels: 2,
          crossTargetFixtures: fixtures.length,
          actualInsertWitnesses: insertCount,
        },
        null,
        2,
      ) + '\n',
    )
    const wrappers: string[] = []
    const checks = group.checks.map((check, index) => {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind !== 'supported') throw new Error(check.reason)
      const entryName = checkRustEntryName({ ...plans[index]!.identity, owner: 'profile_fixture' })
      const declarations: string[] = []
      const args = check.inputs.map((input, inputIndex) => {
        const variable = 'argument_' + inputIndex
        const helper =
          input.name === 'groups'
            ? 'profile_value_' + Math.floor(index / 2)
            : 'profile_' + input.name
        declarations.push(`let ${variable}=${helper}(mode);`)
        if (input.nullness) {
          declarations.push(`let ${variable}_nullness=array_is_null(${variable});`)
          return variable + '_nullness'
        }
        return variable
      })
      wrappers.push(
        `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {${declarations.join('\n')}${check.entryName}(${args.join(',')})}`,
      )
      return {
        ...check,
        entryName,
        inputs: [
          { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
        ],
      }
    })
    group
      .source!.modules.find((module) => module.name === 'pg_catalog')!
      .files.push({ path: 'test/nested_profiles.rs', source: bodies.join('\n') })
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group.evaluatorSource += '\n' + wrappers.join('\n')
    group.checks = checks
    await runCheckParity(
      directory,
      'nested_profiles',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    expect(fixtures).toHaveLength(arrayScalarProfiles.length * 8)
    expect(insertCount).toBe(arrayScalarProfiles.length * 4)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})

it('evaluates nested-domain array text conversion while preserving known skipped branches', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-text-boundary-'))
  try {
    const sql = 'CASE WHEN bypass THEN true ELSE cardinality(payload::nested_text_group[])=1 END'
    await pg.exec(`CREATE DOMAIN nested_text_group AS integer[];
      CREATE TABLE nested_text_input(payload text,bypass boolean,CHECK(${sql}))`)
    const literal = '{"{1,2}"}'
    await pg.query('INSERT INTO nested_text_input VALUES($1,false)', [literal])
    await pg.query('INSERT INTO nested_text_input VALUES($1,true)', ['bad'])
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'nested_text_input')!
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const origin of ['source', 'stored'] as const) {
      const constraint =
        origin === 'source'
          ? { name: 'converted', type: 'check' as const, definition: `CHECK(${sql})` }
          : table.constraints.find((item) => item.type === 'check')!
      const expression = portableCheckAtoms(
        lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
      )
      expect(hasUncertain(expression)).toBe(false)
      plans.push({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression,
      })
      fixtures.push({
        name: origin,
        row: {
          payload: { kind: 'Value', value: literal },
          bypass: { kind: 'Value', value: false },
        },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name: origin,
        row: { payload: { kind: 'Value', value: 'bad' }, bypass: { kind: 'Value', value: true } },
        expected: { kind: 'True' },
      })
    }
    const group = prepareCheckRustGroup(plans)
    await runCheckParity(
      directory,
      'nested_text_boundary',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})
