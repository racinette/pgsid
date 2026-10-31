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
import { domainElementDefinition } from '../../src/sql-semantics/expressions.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('formats nested domain-array cells with independent bounds, enum labels, quoting and NULL rules in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-output-'))
  try {
    await pg.exec(`CREATE TYPE output_state AS ENUM ('new','done','NULL','a,b','"');
      CREATE DOMAIN integer_group AS integer[];
      CREATE DOMAIN text_group AS text[] COLLATE "C";
      CREATE DOMAIN state_group AS output_state[];
      CREATE DOMAIN jsonb_group AS jsonb[];
      CREATE DOMAIN text_batch AS text_group[];`)
    const targets = ['integer_group', 'text_group', 'state_group', 'jsonb_group', 'text_batch']
    const operations = {
      text: (input: string) => `(${input})::text`,
      join: (input: string) => `array_to_string(${input},'|')`,
      marker: (input: string) => `array_to_string(${input},'|','<NULL>')`,
      constructor: (input: string) => `ARRAY[(${input})[1],(${input})[2]]::text`,
      coalesce: (input: string) => `(COALESCE(${input},${input}))::text`,
    }
    const forms = targets.flatMap((target) =>
      Object.entries(operations).map(([operation, render]) => ({
        name: target + '_' + operation,
        target,
        output: render(`payload::${target}[]`),
        sql: `CASE WHEN bypass THEN true ELSE (${render(`payload::${target}[]`)}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE nested_${form.name}(payload text,expected text,bypass boolean,CONSTRAINT ${form.name} CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((item) => item.name === 'nested_' + form.name)!
      const constraint = table.constraints.find((item) => item.name === form.name)!
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
    const samples: (string | null)[] = [
      '{"{1,2}","[5:5]={3}"}',
      '[5:6]={"[-3:-2]={1,2}","{}"}',
      '{{"{{1,2},{3,4}}",NULL},{"{}","{5}"}}',
      '{NULL,"{NULL}"}',
      '{}',
      null,
      '{"{new,done}","{\\"NULL\\",\\"a,b\\",\\"\\\\\\"\\"}"}',
      '{"{\\"{1}\\",\\"{2}\\"}"}',
      '{"{bad}"}',
      '{"{1}"',
    ]
    for (const value of ['', 'NULL', 'a,b', 'a b', '"', '\\', '雪😊', 'a\nb'])
      samples.push(
        (
          await pg.query<{ value: string }>(
            `SELECT ARRAY[ARRAY[$1::text,NULL,'NULL']::text_group,'{}'::text_group]::text AS value`,
            [value],
          )
        ).rows[0]!.value,
      )
    samples.push(
      (
        await pg.query<{ value: string }>(
          `SELECT ARRAY[ARRAY['{"é":1,"aa":2}'::jsonb,'null'::jsonb,NULL]::jsonb_group]::text AS value`,
        )
      ).rows[0]!.value,
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const form of forms)
      for (const payload of samples) {
        let canonical: string | null = null
        try {
          canonical = (
            await pg.query<{ value: string | null }>(
              `SELECT ${form.output} AS value FROM (SELECT $1::text payload) candidate`,
              [payload],
            )
          ).rows[0]!.value
        } catch {}
        for (const mode of ['equal', 'different', 'skip'] as const) {
          const expected = mode === 'different' ? 'different' : canonical
          const bypass = mode === 'skip'
          let outcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${form.sql} AS value FROM (SELECT $1::text payload,$2::text expected,$3::boolean bypass) candidate`,
                [payload, expected, bypass],
              )
            ).rows[0]!.value
            outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(`INSERT INTO nested_${form.name} VALUES($1,$2,$3)`, [
            payload,
            expected,
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
              name: form.name + '_' + origin,
              row: {
                payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                expected: expected === null ? { kind: 'Null' } : { kind: 'Value', value: expected },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: outcome,
            })
          references.push({ form: form.name, payload, expected, bypass, outcome })
        }
      }
    await mkdir('artifacts/nested-domain-array-output', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-output/references.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 10) {
      const selected = plans.slice(offset, offset + 10)
      const group = prepareCheckRustGroup(selected, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = selected.map((plan) => plan.identity.constraint)
      const batch = join(directory, 'batch-' + offset)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedoutput' + offset,
        group,
        names,
        fixtures.filter((fixture) => names.includes(fixture.name)),
      )
    }
    expect(fixtures).toHaveLength(forms.length * samples.length * 6)
    expect(inserts).toBe(forms.length * samples.length * 3)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('retains nested output partial states and propagates declared JSONB encoding through every array level', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-output-context-'))
  try {
    await pg.exec(`CREATE DOMAIN output_json_group AS jsonb[];
      CREATE DOMAIN output_json_batch AS output_json_group[];`)
    const profiles = ['jsonb[]', 'output_json_group[]', 'output_json_batch[]']
    const operations = {
      text: 'payload::text',
      join: "array_to_string(payload,'|','<NULL>')",
    }
    for (const [index, type] of profiles.entries())
      for (const [operation, output] of Object.entries(operations))
        await pg.exec(
          `CREATE TABLE context_${index}_${operation}(payload ${type},expected text,bypass boolean,CONSTRAINT rendered CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
        )
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const helpers: string[] = []
    const references: unknown[] = []
    const cases = [
      { value: '{"é":1,"aa":2}', dependent: true },
      { value: '{"z":1,"a":2}', dependent: false },
      { value: '"雪😊"', dependent: false },
      { value: null, dependent: false },
    ]
    for (const index of profiles.keys()) {
      const table = catalog.tables.find((item) => item.name === 'context_' + index + '_text')!
      const column = table.columns.find((item) => item.name === 'payload')!
      const identity = catalogArrayType(
        column.typeName,
        column.typeOid,
        catalog.domains,
        catalog.enums,
      )!
      const identities: string[] = []
      let current: string = identity
      while (current.startsWith('array:')) {
        identities.push(current.slice(6))
        current = domainElementDefinition(current.slice(6))?.base ?? current.slice(6)
      }
      const wrap = (value: string) =>
        identities.reduceRight((inner, element, depth) => {
          const name = `context_value_${index}_${helpers.length}`
          helpers.push(`pub fn ${name}()->ArrayValue {
          let mut values=make_array_arguments(${rustStringLiteral(element)},${depth === identities.length - 1 ? 12 : 41});
          values=append_array_dimension(values,-3,1);
          values=append_array_argument(values,${depth === identities.length - 1 ? `array_element_from_jsonb(${inner})` : `array_element_from_array(${inner})`});
          finish_array_arguments(values)
        }`)
          return name + '()'
        }, value)
      const values = cases.map((item) =>
        wrap(
          item.value === null
            ? 'JsonbValue::Null'
            : `make_jsonb_value(${rustStringLiteral(item.value)})`,
        ),
      )
      const unknownCell = wrap('JsonbValue::Unknown')
      helpers.push(`pub fn context_payload_${index}(mode:Int4Value)->ArrayValue {
        if let Int4Value::Value(selected)=mode {
          ${values.map((value, mode) => `if selected==${mode} {return ${value};};`).join('\n')}
          if selected==4 {return ArrayValue::Null;};
          if selected==5 {return ArrayValue::Unknown;};
          if selected==6 {return ArrayValue::Error(make_sql_error(3452582));};
          if selected==7 {return ${unknownCell};};
          if selected==8 {return ArrayValue::Unknown;};
          if selected==9 {return ArrayValue::Error(make_sql_error(3452582));};
        };ArrayValue::Unknown
      }`)
      for (const [operation, output] of Object.entries(operations)) {
        const target = catalog.tables.find(
          (item) => item.name === 'context_' + index + '_' + operation,
        )!
        const expectedValues: (string | null)[] = []
        for (const item of cases) {
          let input = '$1::jsonb'
          for (let depth = 0; depth <= index; depth++)
            input = `array_fill(${input},ARRAY[1],ARRAY[-3])${depth < index ? '::' + profiles[depth + 1]!.slice(0, -2) : ''}`
          const value = (
            await pg.query<{ value: string }>(
              `SELECT ${output} AS value FROM (SELECT ${input} payload) candidate`,
              [item.value],
            )
          ).rows[0]!.value
          expectedValues.push(value)
          await pg.query(
            `INSERT INTO ${target.name} SELECT payload,$2,false FROM (SELECT ${input} payload) candidate`,
            [item.value, value],
          )
          references.push({ index, operation, input: item.value, value })
        }
        helpers.push(`pub fn context_expected_${index}_${operation}(mode:Int4Value)->TextValue {
          if let Int4Value::Value(selected)=mode {
            ${expectedValues.map((value, mode) => `if selected==${mode} {return make_text_value(${rustStringLiteral(value!)});};`).join('\n')}
            if selected==4 {return TextValue::Null;};
          };TextValue::Unknown
        }`)
        for (const origin of ['source', 'stored'] as const) {
          const constraint = target.constraints.find((item) => item.name === 'rendered')!
          const sql = `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`
          const name = 'context_' + index + '_' + operation + '_' + origin
          plans.push({
            identity: { schema: 'public', kind: 'table', owner: target.name, constraint: name },
            expression: portableCheckAtoms(
              lowerTableCheck(
                target,
                origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
                catalog.enums,
                catalog.domains,
                origin,
              )!.expression,
            ),
          })
          for (let mode = 0; mode < 10; mode++)
            fixtures.push({
              name,
              row: { mode: { kind: 'Value', value: mode } },
              expected: {
                kind: mode === 5 || mode === 7 ? 'Unknown' : mode === 6 ? 'Error' : 'True',
                ...(mode === 6 ? { value: { state: 3452582 } } : {}),
              } as Outcome,
            })
        }
      }
    }
    helpers.push(
      `pub fn context_bypass(mode:Int4Value)->BoolValue {if let Int4Value::Value(selected)=mode {return make_bool_value(selected>=8);};BoolValue::Unknown}`,
    )
    for (const encoding of [false, true]) {
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        ...(encoding ? { serverEncoding: 'UTF8' as const } : {}),
      })
      const wrappers: string[] = []
      group.checks = group.checks.map((check, index) => {
        expect(
          check.kind,
          plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
        if (check.kind !== 'supported') throw new Error(check.reason)
        const profile = Math.floor(index / 4),
          operation = index % 4 < 2 ? 'text' : 'join'
        const entryName = checkRustEntryName({
          ...plans[index]!.identity,
          owner: 'context_fixture',
        })
        const declarations: string[] = []
        const args = check.inputs.map((input, i) => {
          const name = 'argument_' + i
          const helper =
            input.name === 'payload'
              ? 'context_payload_' + profile
              : input.name === 'expected'
                ? `context_expected_${profile}_${operation}`
                : 'context_bypass'
          declarations.push(`let ${name}=${helper}(mode);`)
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
        .files.push({ path: 'test/nested_output_context.rs', source: helpers.join('\n') })
      group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
        '\n' + wrappers.join('\n')
      group.evaluatorSource += '\n' + wrappers.join('\n')
      const batch = join(directory, encoding ? 'utf8' : 'missing')
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedoutputcontext' + Number(encoding),
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures.map((fixture) =>
          !encoding && fixture.row.mode?.kind === 'Value' && fixture.row.mode.value === 0
            ? { ...fixture, expected: { kind: 'Unknown' } }
            : fixture,
        ),
      )
    }
    await mkdir('artifacts/nested-domain-array-output', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-output/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(profiles.length * Object.keys(operations).length * 2 * 10)
    expect(references).toHaveLength(profiles.length * Object.keys(operations).length * cases.length)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)

it('retains scalar output context requirements inside nested arrays and uses the inner box delimiter', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-output-scalars-'))
  try {
    // Integral coordinates print the same under every extra_float_digits setting, so only the
    // fractional box depends on the output context.
    const profiles = [
      ['box', "'(1.23456789012345,1),(0,0)'", true],
      ['double precision', "'1.23456789012345'", true],
      ['timestamp', "'2000-01-01 12:34:56'", true],
      ['bytea', String.raw`'\x0001ff'`, true],
      ['double precision', "'NaN'", false],
      ['box', "'(1,1),(0,0)'", false],
    ] as const
    for (const [index, [type]] of profiles.entries())
      await pg.exec(`CREATE DOMAIN scalar_group_${index} AS ${type}[];
        CREATE DOMAIN scalar_output_${index} AS scalar_group_${index}[];
        CREATE TABLE scalar_output_table_${index}(payload text,expected text,bypass boolean,CONSTRAINT output CHECK(CASE WHEN bypass THEN true ELSE (payload::scalar_output_${index}[])::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`)
    const delimiters = await pg.query<{ typdelim: string }>(
      "SELECT typdelim FROM pg_type WHERE typname IN ('scalar_group_0','_scalar_group_0','scalar_output_0','_scalar_output_0')",
    )
    expect(delimiters.rows.map((item) => item.typdelim)).toEqual([';', ';', ';', ';'])
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const [index, [type, literal, deferred]] of profiles.entries()) {
      const target = 'scalar_output_' + index
      const table = catalog.tables.find((item) => item.name === 'scalar_output_table_' + index)!
      const constraint = table.constraints.find((item) => item.name === 'output')!
      for (const origin of ['source', 'stored'] as const)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: target + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
          ),
        })
      const inputs = [
        `ARRAY[ARRAY[ARRAY[${literal}::${type},NULL]::scalar_group_${index}]::${target}]`,
        `ARRAY[ARRAY[ARRAY[NULL::${type},NULL]::scalar_group_${index},'{}'::scalar_group_${index}]::${target},'{}'::${target}]`,
        `NULL::${target}[]`,
        `ARRAY[NULL::${target}]`,
      ]
      for (const [mode, input] of inputs.entries()) {
        const payload = (
          await pg.query<{ value: string | null }>(`SELECT (${input})::text AS value`)
        ).rows[0]!.value
        for (const bypass of [false, true]) {
          const expected = payload
          const insert = pg.query(`INSERT INTO ${table.name} VALUES($1,$2,$3)`, [
            payload,
            expected,
            bypass,
          ])
          await insert
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: target + '_' + origin,
              row: {
                payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                expected: expected === null ? { kind: 'Null' } : { kind: 'Value', value: expected },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: { kind: !bypass && mode === 0 && deferred ? 'Unknown' : 'True' },
            })
        }
      }
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
      'nestedoutputscalars',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    expect(inserts).toBe(profiles.length * 8)
    expect(fixtures).toHaveLength(profiles.length * 16)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
