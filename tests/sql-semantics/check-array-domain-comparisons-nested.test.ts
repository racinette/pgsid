import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { catalogArrayType } from '../../src/sql-semantics/catalog-check-binder.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('compares and searches nested domain-array cells with independent shapes, NULL cells and composed operators in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-comparisons-'))
  try {
    await pg.exec('CREATE DOMAIN comparison_group AS integer[]')
    const a = 'a::comparison_group[]',
      b = 'b::comparison_group[]',
      needle = `(${b})[1]`
    const forms = [
      ...['=', '<>', '<', '<=', '>', '>=', '@>', '<@', '&&'].map((operator, index) => ({
        name: 'operator_' + index,
        sql: `${a} ${operator} ${b}`,
        output: null,
      })),
      {
        name: 'cmp',
        output: `btarraycmp(${a},${b})`,
        sql: `btarraycmp(${a},${b}) IS NOT DISTINCT FROM expected_number`,
      },
      { name: 'distinct', output: null, sql: `${a} IS DISTINCT FROM ${b}` },
      { name: 'nullif', output: null, sql: `cardinality(NULLIF(${a},${b})) IS NULL` },
      { name: 'row', output: null, sql: `ROW(${a},1)<ROW(${b},2)` },
      { name: 'case', output: null, sql: `CASE ${a} WHEN ${b} THEN true ELSE false END` },
      ...['greatest', 'least', 'sort', 'positions', 'remove', 'replace'].map((name) => {
        const output =
          name === 'greatest'
            ? `GREATEST(${a},${b})`
            : name === 'least'
              ? `LEAST(${a},${b})`
              : name === 'sort'
                ? `array_sort(${a})`
                : name === 'positions'
                  ? `array_positions(${a},${needle})`
                  : name === 'remove'
                    ? `array_remove(${a},${needle})`
                    : `array_replace(${a},${needle},'{}'::comparison_group)`
        return {
          name,
          output: `(${output})::text`,
          sql: `(${output})::text COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C"`,
        }
      }),
      {
        name: 'position',
        output: `array_position(${a},${needle})`,
        sql: `array_position(${a},${needle}) IS NOT DISTINCT FROM expected_number`,
      },
      {
        name: 'bucket',
        output: `width_bucket(${needle},${a})`,
        sql: `width_bucket(${needle},${a}) IS NOT DISTINCT FROM expected_number`,
      },
      { name: 'any', output: null, sql: `${needle}=ANY(${a})` },
      { name: 'all', output: null, sql: `${needle}<ALL(${a})` },
    ].map((form) => ({ ...form, sql: `CASE WHEN bypass THEN true ELSE ${form.sql} END` }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE nested_${form.name}(a text,b text,expected_number integer,expected_text text,bypass boolean,CONSTRAINT compared CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((item) => item.name === 'nested_' + form.name)!,
        constraint = table.constraints.find((item) => item.name === 'compared')!
      return (['source', 'stored'] as const).map((origin) => {
        const expression = portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${form.sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        )
        expect(hasUncertain(expression), form.name + '_' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression,
        }
      })
    })
    const pairs: (readonly [string | null, string | null])[] = [
      ['{"{1,2}","{3}"}', '{"{1,2}","{3}"}'],
      ['{"{1,2}","{3}"}', '{"{1,2}","{4}"}'],
      ['{"{1,2}","{1,2}",NULL}', '{"{1,2}"}'],
      ['{"[5:6]={1,2}"}', '{"{1,2}"}'],
      ['{"{{1,2}}"}', '{"{1,2}"}'],
      ['[5:5]={"{1,2}"}', '{"{1,2}"}'],
      ['{{"{1}","{2}"}}', '{"{1}","{2}"}'],
      ['{NULL,"{NULL}"}', '{"{NULL}",NULL}'],
      ['{"{}",NULL}', '{"{}"}'],
      ['{}', '{}'],
      ['{}', '{NULL}'],
      [null, '{"{1}"}'],
      ['{"{1}"}', null],
      ['bad', '{"{1}"}'],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const form of forms)
      for (const [left, right] of pairs) {
        let expected_number: number | null = 0,
          expected_text: string | null = null
        if (form.output)
          try {
            const value = (
              await pg.query<{ value: string | number | null }>(
                `SELECT ${form.output} AS value FROM (SELECT $1::text a,$2::text b) candidate`,
                [left, right],
              )
            ).rows[0]!.value
            if (typeof value === 'number' || value === null) expected_number = value
            if (typeof value === 'string' || value === null) expected_text = value
          } catch {}
        for (const bypass of [false, true]) {
          let outcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${form.sql} AS value FROM (SELECT $1::text a,$2::text b,$3::integer expected_number,$4::text expected_text,$5::boolean bypass) candidate`,
                [left, right, expected_number, expected_text, bypass],
              )
            ).rows[0]!.value
            outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(`INSERT INTO nested_${form.name} VALUES($1,$2,$3,$4,$5)`, [
            left,
            right,
            expected_number,
            expected_text,
            bypass,
          ])
          if (outcome.kind === 'False' || outcome.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                outcome.kind === 'Error'
                  ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          inserts++
          const known = (value: string | number | boolean | null) =>
            value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.name + '_' + origin,
              row: {
                a: known(left),
                b: known(right),
                expected_number: known(expected_number),
                expected_text: known(expected_text),
                bypass: known(bypass),
              },
              expected: outcome,
            })
          references.push({
            name: form.name,
            left,
            right,
            expected_number,
            expected_text,
            bypass,
            outcome,
          })
        }
      }
    await mkdir('artifacts/nested-domain-array-comparisons', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-comparisons/references.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 12) {
      const selected = plans.slice(offset, offset + 12),
        group = prepareCheckRustGroup(selected, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          arrayNulls: true,
        })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = selected.map((plan) => plan.identity.constraint),
        batch = join(directory, 'batch-' + offset)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedcomparisons' + offset,
        group,
        names,
        fixtures.filter((fixture) => names.includes(fixture.name)),
      )
    }
    expect(fixtures).toHaveLength(forms.length * pairs.length * 4)
    expect(inserts).toBe(forms.length * pairs.length * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('selects recursive scalar support at two domain levels and retains missing-support errors before empty and NULL pairs', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-comparison-profiles-'))
  try {
    await pg.exec("CREATE TYPE comparison_stage AS ENUM ('new','done')")
    const profiles = [
      ['integer', '1', '2'],
      ['text', "'a'", "'b'"],
      ['comparison_stage', "'new'", "'done'"],
      ['numeric', "'1.0'", "'2.00'"],
      ['jsonb', `'{"é":1,"aa":2}'`, `'{"é":2,"aa":2}'`],
      ['json', `'{"a":1}'`, `'{"a":2}'`],
      ['point', "'(0,0)'", "'(1,1)'"],
    ] as const
    const operations = ['=', '<>', '<', '@>', '&&']
    for (const [index, [type]] of profiles.entries()) {
      await pg.exec(`CREATE DOMAIN scalar_group_${index} AS ${type}[];
        CREATE DOMAIN batch_group_${index} AS scalar_group_${index}[];`)
      for (const [operation, operator] of operations.entries())
        await pg.exec(
          `CREATE TABLE profile_${index}_${operation}(a text,b text,bypass boolean,CONSTRAINT compared CHECK(CASE WHEN bypass THEN true ELSE a::batch_group_${index}[] ${operator} b::batch_group_${index}[] END))`,
        )
    }
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const [index, [type, first, last]] of profiles.entries()) {
      const value = (literal: string) =>
        `ARRAY[ARRAY[ARRAY[${literal}::${type},NULL]::scalar_group_${index}]::batch_group_${index}]`
      const left = (await pg.query<{ value: string }>(`SELECT (${value(first)})::text AS value`))
        .rows[0]!.value
      const right = (await pg.query<{ value: string }>(`SELECT (${value(last)})::text AS value`))
        .rows[0]!.value
      const pairs: (readonly [string | null, string | null])[] = [
        [left, left],
        [left, right],
        [right, left],
        ['{}', '{}'],
        ['{}', left],
        ['{NULL}', '{NULL}'],
        ['{"{NULL}"}', '{"{NULL}"}'],
        [null, left],
        [left, null],
      ]
      for (const [operation, operator] of operations.entries()) {
        const table = catalog.tables.find((item) => item.name === `profile_${index}_${operation}`)!,
          constraint = table.constraints.find((item) => item.name === 'compared')!
        const sql = `CASE WHEN bypass THEN true ELSE a::batch_group_${index}[] ${operator} b::batch_group_${index}[] END`
        for (const origin of ['source', 'stored'] as const) {
          const name = `profile_${index}_${operation}_${origin}`
          const expression = portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
              catalog.enums,
              catalog.domains,
              origin,
            )!.expression,
          )
          expect(hasUncertain(expression), name).toBe(false)
          plans.push({
            identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            expression,
          })
        }
        for (const [a, b] of pairs)
          for (const bypass of [false, true]) {
            let outcome: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} AS value FROM (SELECT $1::text a,$2::text b,$3::boolean bypass) candidate`,
                  [a, b, bypass],
                )
              ).rows[0]!.value
              outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              outcome = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            const insert = pg.query(`INSERT INTO ${table.name} VALUES($1,$2,$3)`, [a, b, bypass])
            if (outcome.kind === 'Error' || outcome.kind === 'False')
              await expect(insert).rejects.toMatchObject({
                code:
                  outcome.kind === 'Error'
                    ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : '23514',
              })
            else await insert
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `profile_${index}_${operation}_${origin}`,
                row: {
                  a: a === null ? { kind: 'Null' } : { kind: 'Value', value: a },
                  b: b === null ? { kind: 'Null' } : { kind: 'Value', value: b },
                  bypass: { kind: 'Value', value: bypass },
                },
                expected: outcome,
              })
            references.push({ profile: type, operator, a, b, bypass, outcome })
          }
      }
    }
    await mkdir('artifacts/nested-domain-array-comparisons', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-comparisons/profile-references.json',
      JSON.stringify({ fixtures: fixtures.length, inserts, references }, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 20) {
      const selected = plans.slice(offset, offset + 20),
        group = prepareCheckRustGroup(selected, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          arrayNulls: true,
        })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = selected.map((plan) => plan.identity.constraint),
        batch = join(directory, 'batch-' + offset)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedcomparisonprofiles' + offset,
        group,
        names,
        fixtures.filter((fixture) => names.includes(fixture.name)),
      )
    }
    expect(fixtures).toHaveLength(profiles.length * operations.length * 9 * 4)
    expect(inserts).toBe(profiles.length * operations.length * 9 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('preserves partial nested cells, safe quantified recovery, incoming errors and skipped comparison branches', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-comparison-states-'))
  try {
    await pg.exec('CREATE DOMAIN partial_group AS integer[]')
    const forms = {
      equal: 'a=b',
      less: 'a<b',
      contains: 'a@>b',
      position: 'array_position(a,needle) IS NOT DISTINCT FROM expected',
      any: 'needle=ANY(a)',
    }
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE partial_${name}(a partial_group[],b partial_group[],needle partial_group,expected integer,bypass boolean,CONSTRAINT compared CHECK(CASE WHEN bypass THEN true ELSE ${expression} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'partial_equal')!,
      column = table.columns.find((item) => item.name === 'a')!
    const element = catalogArrayType(
      column.typeName,
      column.typeOid,
      catalog.domains,
      catalog.enums,
    )!.slice(6)
    type Tree = 'Unknown' | 'Null' | 'Error' | { cells: (Tree | number | null)[] }
    const inner = (...cells: (number | 'Unknown' | null)[]): Tree => ({ cells }),
      outer = (...cells: (Tree | null)[]): Tree => ({ cells })
    const cases: {
      a: Tree
      b: Tree
      needle: Tree
      position: number | null
      bypass?: boolean
      outcomes: Outcome['kind'][]
    }[] = [
      {
        a: outer(inner(1), inner('Unknown')),
        b: outer(inner(1), inner(2)),
        needle: inner(1),
        position: 1,
        outcomes: ['Unknown', 'Unknown', 'Unknown', 'True', 'True'],
      },
      {
        a: outer(inner(0), inner('Unknown')),
        b: outer(inner(1), inner('Unknown')),
        needle: inner(1),
        position: null,
        outcomes: ['False', 'True', 'Unknown', 'Unknown', 'Unknown'],
      },
      {
        a: outer(inner('Unknown'), inner(1)),
        b: outer(inner(2)),
        needle: inner(1),
        position: 2,
        outcomes: ['False', 'Unknown', 'Unknown', 'Unknown', 'True'],
      },
      {
        a: 'Null',
        b: 'Null',
        needle: 'Null',
        position: null,
        outcomes: ['Null', 'Null', 'Null', 'True', 'Null'],
      },
      {
        a: outer(),
        b: outer(),
        needle: 'Unknown',
        position: null,
        outcomes: ['True', 'False', 'True', 'True', 'False'],
      },
      {
        a: 'Error',
        b: outer(inner(1)),
        needle: inner(1),
        position: 1,
        outcomes: ['Error', 'Error', 'Error', 'Error', 'Error'],
      },
      {
        a: 'Error',
        b: 'Error',
        needle: 'Error',
        position: null,
        bypass: true,
        outcomes: ['True', 'True', 'True', 'True', 'True'],
      },
      {
        a: outer(null, inner(1)),
        b: outer(null, inner(1)),
        needle: 'Null',
        position: 1,
        outcomes: ['True', 'False', 'False', 'True', 'Null'],
      },
      {
        a: outer(inner(null)),
        b: outer(inner(null)),
        needle: inner(null),
        position: 1,
        outcomes: ['True', 'False', 'True', 'True', 'True'],
      },
      {
        a: outer(inner('Unknown')),
        b: outer(inner('Unknown')),
        needle: inner(1),
        position: 1,
        outcomes: ['Unknown', 'Unknown', 'Unknown', 'Unknown', 'Unknown'],
      },
      {
        a: outer(),
        b: outer(inner(1)),
        needle: 'Null',
        position: null,
        outcomes: ['False', 'True', 'False', 'True', 'False'],
      },
    ]
    const bodies: string[] = []
    let sequence = 0
    const render = (tree: Tree, depth: number): string => {
      const name = 'partial_array_' + sequence++,
        lines: string[] = []
      if (typeof tree === 'string')
        lines.push(
          tree === 'Error' ? 'ArrayValue::Error(make_sql_error(3452582))' : 'ArrayValue::' + tree,
        )
      else {
        lines.push(
          `let mut values=make_array_arguments(${rustStringLiteral(depth === 0 ? element : 'pg_catalog.int4')},${depth === 0 ? 41 : 2});`,
        )
        if (tree.cells.length)
          lines.push(`values=append_array_dimension(values,1,${tree.cells.length});`)
        for (const cell of tree.cells)
          lines.push(
            `values=append_array_argument(values,${cell === null ? 'ArrayElement::Null' : typeof cell === 'number' ? `array_element_from_int4(make_int4_value(${cell}))` : cell === 'Unknown' ? 'ArrayElement::Unknown' : `array_element_from_array(${render(cell, depth + 1)}())`});`,
          )
        lines.push('finish_array_arguments(values)')
      }
      bodies.push(`pub fn ${name}()->ArrayValue {${lines.join('\n')}}`)
      return name
    }
    for (const field of ['a', 'b', 'needle'] as const) {
      const helpers = cases.map((item) => render(item[field], field === 'needle' ? 1 : 0))
      bodies.push(
        `pub fn partial_${field}(mode:Int4Value)->ArrayValue {if let Int4Value::Value(selected)=mode {${helpers.map((helper, index) => `if selected==${index} {return ${helper}();};`).join('\n')}}ArrayValue::Unknown}`,
      )
    }
    bodies.push(`pub fn partial_expected(mode:Int4Value)->Int4Value {if let Int4Value::Value(selected)=mode {${cases.map((item, index) => `if selected==${index} {return ${item.position === null ? 'Int4Value::Null' : `make_int4_value(${item.position})`};};`).join('\n')}}Int4Value::Unknown}
      pub fn partial_bypass(mode:Int4Value)->BoolValue {if let Int4Value::Value(selected)=mode {return make_bool_value(selected==6);};BoolValue::Unknown}`)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, name] of Object.keys(forms).entries()) {
      const table = catalog.tables.find((item) => item.name === 'partial_' + name)!,
        constraint = table.constraints.find((item) => item.name === 'compared')!
      for (const origin of ['source', 'stored'] as const) {
        const identity = {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        }
        plans.push({
          identity,
          expression: portableCheckAtoms(
            lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
          ),
        })
        for (const [mode, item] of cases.entries())
          fixtures.push({
            name: identity.constraint,
            row: { mode: { kind: 'Value', value: mode } },
            expected:
              item.outcomes[index] === 'Error'
                ? { kind: 'Error', value: { state: 3452582 } }
                : ({ kind: item.outcomes[index]! } as Outcome),
          })
      }
    }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    const wrappers: string[] = []
    group.checks = group.checks.map((check, index) => {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind !== 'supported') throw new Error(check.reason)
      const entryName = checkRustEntryName({ ...plans[index]!.identity, owner: 'partial_fixture' })
      const declarations: string[] = []
      const args = check.inputs.map((input, i) => {
        const variable = 'argument_' + i
        declarations.push(`let ${variable}=partial_${input.name}(mode);`)
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
      .files.push({ path: 'test/partial_nested_comparisons.rs', source: bodies.join('\n') })
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group.evaluatorSource += '\n' + wrappers.join('\n')
    await runCheckParity(
      directory,
      'partialnestedcomparisons',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    expect(fixtures).toHaveLength(Object.keys(forms).length * cases.length * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)

it('propagates JSONB comparison context through scalar and array domains without losing equal, empty, NULL or skipped results', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-comparison-context-'))
  try {
    await pg.exec(
      'CREATE DOMAIN scalar_json AS jsonb;CREATE DOMAIN group_json AS scalar_json[];CREATE DOMAIN batch_json AS group_json[]',
    )
    const profiles = ['scalar_json[]', 'group_json[]', 'batch_json[]']
    for (const [index, type] of profiles.entries())
      for (const [name, operator] of [
        ['equal', '='],
        ['less', '<'],
      ])
        await pg.exec(
          `CREATE TABLE context_${index}_${name}(a text,b text,bypass boolean,CONSTRAINT compared CHECK(CASE WHEN bypass THEN true ELSE a::${type} ${operator} b::${type} END))`,
        )
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome; dependent: boolean }[] = []
    const references: unknown[] = []
    for (const [index, type] of profiles.entries()) {
      const value = (source: string) => {
        let result = `ARRAY['${source}'::scalar_json]`
        if (index > 0) result = `ARRAY[(${result})::group_json]`
        if (index > 1) result = `ARRAY[(${result})::batch_json]`
        return result
      }
      const a = (await pg.query<{ value: string }>(`SELECT (${value('{"é":1}')})::text AS value`))
        .rows[0]!.value
      const b = (await pg.query<{ value: string }>(`SELECT (${value('{"aa":1}')})::text AS value`))
        .rows[0]!.value
      const pairs: (readonly [string | null, string | null])[] = [
        [a, a],
        [a, b],
        ['{}', b],
        [null, b],
        [b, a],
      ]
      for (const [name, operator] of [
        ['equal', '='],
        ['less', '<'],
      ]) {
        const table = catalog.tables.find((item) => item.name === `context_${index}_${name}`)!,
          constraint = table.constraints.find((item) => item.name === 'compared')!
        const sql = `CASE WHEN bypass THEN true ELSE a::${type} ${operator} b::${type} END`
        for (const origin of ['source', 'stored'] as const)
          plans.push({
            identity: {
              schema: 'public',
              kind: 'table',
              owner: table.name,
              constraint: `context_${index}_${name}_${origin}`,
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
          })
        for (const [mode, [a, b]] of pairs.entries())
          for (const bypass of [false, true]) {
            const result = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql} AS value FROM (SELECT $1::text a,$2::text b,$3::boolean bypass) candidate`,
                [a, b, bypass],
              )
            ).rows[0]!.value
            const insert = pg.query(`INSERT INTO ${table.name} VALUES($1,$2,$3)`, [a, b, bypass])
            if (result === false) await expect(insert).rejects.toMatchObject({ code: '23514' })
            else await insert
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `context_${index}_${name}_${origin}`,
                row: {
                  a: a === null ? { kind: 'Null' } : { kind: 'Value', value: a },
                  b: b === null ? { kind: 'Null' } : { kind: 'Value', value: b },
                  bypass: { kind: 'Value', value: bypass },
                },
                expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
                dependent: !bypass && name === 'less' && (mode === 1 || mode === 4),
              })
            references.push({ type, name, a, b, bypass, result })
          }
      }
    }
    const contexts = [
      { defaultCollation: 'C' as const, serverEncoding: 'UTF8' as const },
      { defaultCollation: 'C' as const },
      { serverEncoding: 'UTF8' as const },
    ]
    for (const [index, context] of contexts.entries()) {
      const group = prepareCheckRustGroup(plans, { ...context, arrayNulls: true })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const batch = join(directory, 'context-' + index)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedcomparisoncontext' + index,
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures.map((fixture) =>
          index > 0 && fixture.dependent ? { ...fixture, expected: { kind: 'Unknown' } } : fixture,
        ),
      )
    }
    await mkdir('artifacts/nested-domain-array-comparisons', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-comparisons/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(profiles.length * 2 * 5 * 2 * 2)
    expect(references).toHaveLength(profiles.length * 2 * 5 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)

it('keeps scalar-domain quantifier identities while applying the catalog-selected numeric element coercion', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-quantifier-coercion-'))
  try {
    await pg.exec('CREATE DOMAIN positive_quantifier AS integer CHECK(VALUE>0)')
    const forms = {
      any: 'needle=ANY(payload::positive_quantifier[])',
      all: 'needle<ALL(payload::positive_quantifier[])',
    }
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE scalar_${name}(payload text,needle numeric,bypass boolean,CONSTRAINT quantified CHECK(CASE WHEN bypass THEN true ELSE ${expression} END))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.keys(forms).flatMap((name) => {
      const table = catalog.tables.find((item) => item.name === 'scalar_' + name)!,
        constraint = table.constraints.find((item) => item.name === 'quantified')!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
        ),
      }))
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const [name, expression] of Object.entries(forms))
      for (const payload of ['{1,2,NULL}', '{}', '{-1,2}', '{bad}', null])
        for (const needle of ['2.0', '2.5', null])
          for (const bypass of [false, true]) {
            let outcome: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${expression} END AS value FROM (SELECT $1::text payload,$2::numeric needle,$3::boolean bypass) candidate`,
                  [payload, needle, bypass],
                )
              ).rows[0]!.value
              outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              outcome = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            const insert = pg.query(`INSERT INTO scalar_${name} VALUES($1,$2,$3)`, [
              payload,
              needle,
              bypass,
            ])
            if (outcome.kind === 'Error' || outcome.kind === 'False')
              await expect(insert).rejects.toMatchObject({
                code:
                  outcome.kind === 'Error'
                    ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : '23514',
              })
            else await insert
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: {
                  payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                  needle: needle === null ? { kind: 'Null' } : { kind: 'Value', value: needle },
                  bypass: { kind: 'Value', value: bypass },
                },
                expected: outcome,
              })
          }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', arrayNulls: true })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    await runCheckParity(
      directory,
      'domainquantifiercoercion',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    expect(fixtures).toHaveLength(Object.keys(forms).length * 5 * 3 * 2 * 2)
    expect(inserts).toBe(Object.keys(forms).length * 5 * 3 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)

it('preserves nested comparison constant preparation, runtime laziness and static branch pruning', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-comparison-preparation-'))
  try {
    await pg.exec('CREATE DOMAIN missing_group AS json[]')
    const missing = "'{}'::missing_group[] = '{}'::missing_group[]"
    const forms = {
      runtime: `CASE WHEN bypass THEN true ELSE payload::missing_group[] = '{}'::missing_group[] END`,
      constant: `CASE WHEN bypass THEN true ELSE ${missing} END`,
      pruned: `CASE WHEN true THEN true ELSE ${missing} END`,
      order: `(1/divisor)>0 AND (${missing})`,
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE preparation_${name}(payload text,bypass boolean,divisor integer,CONSTRAINT compared CHECK(${sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.entries(forms).flatMap(([name, sql]) => {
      const table = catalog.tables.find((item) => item.name === 'preparation_' + name)!,
        constraint = table.constraints.find((item) => item.name === 'compared')!
      return (['source', 'stored'] as const).map((origin) => ({
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const [name, sql] of Object.entries(forms))
      for (const payload of ['{}', '{NULL}', 'bad'])
        for (const bypass of [false, true])
          for (const divisor of [0, 1]) {
            let outcome: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED(SELECT $1::text payload,$2::boolean bypass,$3::integer divisor) SELECT ${sql} AS value FROM candidate`,
                  [payload, bypass, divisor],
                )
              ).rows[0]!.value
              outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              outcome = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            const insert = pg.query(`INSERT INTO preparation_${name} VALUES($1,$2,$3)`, [
              payload,
              bypass,
              divisor,
            ])
            if (outcome.kind === 'Error' || outcome.kind === 'False')
              await expect(insert).rejects.toMatchObject({
                code:
                  outcome.kind === 'Error'
                    ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : '23514',
              })
            else await insert
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: {
                  payload: { kind: 'Value', value: payload },
                  bypass: { kind: 'Value', value: bypass },
                  divisor: { kind: 'Value', value: divisor },
                },
                expected: outcome,
              })
            references.push({ name, payload, bypass, divisor, outcome })
          }
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
    await runCheckParity(
      directory,
      'nestedcomparisonpreparation',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    await mkdir('artifacts/nested-domain-array-comparisons', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-comparisons/preparation-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(Object.keys(forms).length * 3 * 2 * 2 * 2)
    expect(references).toHaveLength(Object.keys(forms).length * 3 * 2 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
