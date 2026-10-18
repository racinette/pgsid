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

it('casts nested domain-array cells through catalog conversions with retained bounds, target constraints and input modifiers in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-casts-'))
  try {
    await pg.exec(`CREATE DOMAIN group_int AS integer[];
      CREATE DOMAIN group_big AS bigint[];
      CREATE DOMAIN group_positive AS integer[] CHECK(VALUE[1]>0);
      CREATE DOMAIN group_required AS integer[] NOT NULL;
      CREATE DOMAIN group_text AS text[] COLLATE "C";
      CREATE DOMAIN group_short AS varchar(2)[] COLLATE "C";
      CREATE DOMAIN group_numeric AS numeric[];
      CREATE DOMAIN group_rounded AS numeric(3,1)[];
      CREATE DOMAIN batch_int AS group_int[];
      CREATE DOMAIN batch_big AS group_big[];
      CREATE DOMAIN batch_positive AS group_positive[];
      CREATE DOMAIN group_alias AS group_int;
      CREATE TYPE cast_stage AS ENUM ('new','done','a,b','NULL');
      CREATE DOMAIN group_enum AS cast_stage[] CHECK(cardinality(VALUE)>0);
      CREATE DOMAIN batch_enum AS group_enum[];
      CREATE DOMAIN batch_text AS group_text[];`)
    const pairs = [
      ['group_int[]', 'group_big[]'],
      ['group_int[]', 'group_positive[]'],
      ['group_int[]', 'group_required[]'],
      ['group_int[]', 'text[]'],
      ['group_int[]', 'group_text[]'],
      ['text[]', 'group_int[]'],
      ['group_text[]', 'group_int[]'],
      ['batch_int[]', 'batch_big[]'],
      ['batch_int[]', 'batch_positive[]'],
      ['group_int[]', 'group_alias[]'],
      ['group_text[]', 'group_short[]'],
      ['group_numeric[]', 'group_rounded[]'],
      ['group_int[]', 'group_numeric[]'],
      ['group_text[]', 'group_enum[]'],
      ['group_enum[]', 'group_text[]'],
      ['group_enum[]', 'text[]'],
      ['text[]', 'group_enum[]'],
      ['batch_enum[]', 'batch_text[]'],
    ] as const
    const forms = pairs.map(([source, target], index) => ({
      name: 'cast_' + index,
      source,
      target,
      sql: `CASE WHEN bypass THEN true ELSE (payload::${source}::${target})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(payload text,expected text,bypass boolean,CONSTRAINT converted CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((item) => item.name === form.name)!,
        constraint = table.constraints.find((item) => item.name === 'converted')!
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
      '{"{1,2}","{3}"}',
      '[5:6]={"[-3:-2]={1,2}","{}"}',
      '{{"{{1,2},{3,4}}",NULL},{"{}","{5}"}}',
      '{NULL,"{NULL}"}',
      '{}',
      null,
      '{"{-1,2}","{bad}"}',
      '{"{bad}","{-1,2}"}',
      '{"{2147483647,-2147483648}"}',
      '{"{2147483648}"}',
      '{"{99.94}"}',
      '{"{99.95}"}',
      '{"{ab,abc}"}',
      '{"{ab,ab }"}',
      '{"{\\"{1}\\",\\"{2}\\"}"}',
      '{"{\\"{-1}\\",\\"{bad}\\"}"}',
      '{"{new,done}"}',
      '{"{\\"{new}\\",\\"{done}\\"}"}',
      'bad',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const form of forms)
      for (const payload of samples) {
        let canonical: string | null = null
        try {
          canonical = (
            await pg.query<{ value: string | null }>(
              `SELECT (payload::${form.source}::${form.target})::text AS value FROM (SELECT $1::text payload) candidate`,
              [payload],
            )
          ).rows[0]!.value
        } catch {}
        for (const mode of ['equal', 'different', 'skip'] as const) {
          const expected = mode === 'different' ? 'different' : canonical,
            bypass = mode === 'skip'
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
          const insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,$3)`, [
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
          references.push({
            form: form.name,
            source: form.source,
            target: form.target,
            payload,
            expected,
            bypass,
            outcome,
          })
        }
      }
    await mkdir('artifacts/nested-domain-array-casts', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-casts/references.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 10) {
      const selected = plans.slice(offset, offset + 10),
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
        'nestedcasts' + offset,
        group,
        names,
        fixtures.filter((fixture) => names.includes(fixture.name)),
      )
    }
    expect(fixtures).toHaveLength(pairs.length * samples.length * 6)
    expect(inserts).toBe(pairs.length * samples.length * 3)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 150000)

type NestedArray = { dimensions: string | null; elements: (NestedArray | number | null)[] }
const arrayJson = (value: string, depth: number): string =>
  `CASE WHEN (${value}) IS NULL THEN NULL ELSE jsonb_build_object('dimensions',array_dims(${value}),'elements',COALESCE((SELECT jsonb_agg(${depth > 0 ? arrayJson('cell_' + depth, depth - 1) : 'cell_' + depth}) FROM unnest(${value}) AS cell_${depth}),'[]'::jsonb)) END`

it('casts already-coerced nested domain arrays after source constraints change with nested error order and partial states', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-coerced-casts-'))
  try {
    await pg.exec(`CREATE DOMAIN source_group AS integer[];
      CREATE DOMAIN source_batch AS source_group[];
      CREATE DOMAIN target_group AS smallint[] CHECK(VALUE[1]>0);
      CREATE DOMAIN required_group AS target_group NOT NULL;
      CREATE DOMAIN target_batch AS target_group[] CHECK(cardinality(VALUE)>0);
      CREATE DOMAIN required_batch AS required_group[] CHECK(cardinality(VALUE)>0);`)
    const targets = ['target_batch[]', 'required_batch[]']
    for (const [index, target] of targets.entries())
      await pg.exec(
        `CREATE TABLE coerced_cast_${index}(payload source_batch[],expected integer,bypass boolean,CONSTRAINT converted CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::${target}) IS NOT DISTINCT FROM expected END))`,
      )
    const sourceValues = [
      [`ARRAY[ARRAY[ARRAY[1,2]::source_group]::source_batch]`, null],
      [`ARRAY[ARRAY[ARRAY[-1]::source_group,ARRAY[32768]::source_group]::source_batch]`, '23514'],
      [`ARRAY[ARRAY[ARRAY[32768]::source_group,ARRAY[-1]::source_group]::source_batch]`, '22003'],
      [`ARRAY[ARRAY[ARRAY[-1,32768]::source_group]::source_batch]`, '22003'],
      [
        `ARRAY[ARRAY[ARRAY[-1]::source_group]::source_batch,ARRAY[ARRAY[32768]::source_group]::source_batch]`,
        '23514',
      ],
      [`ARRAY['{}'::source_batch]`, '23514'],
      [`ARRAY[ARRAY[NULL::source_group]::source_batch]`, null],
      [`NULL::source_batch[]`, null],
      [`'{}'::source_batch[]`, null],
      [
        `array_fill(array_fill('[5:6]={1,2}'::source_group,ARRAY[1],ARRAY[-3])::source_batch,ARRAY[1],ARRAY[5])`,
        null,
      ],
    ] as const
    await pg.exec('CREATE TABLE source_fixture(mode integer,payload source_batch[])')
    for (const [mode, [value]] of sourceValues.entries())
      await pg.exec(`INSERT INTO source_fixture VALUES(${mode},${value})`)
    await pg.exec(
      'ALTER DOMAIN source_group ADD CONSTRAINT tightened CHECK(cardinality(VALUE)<0) NOT VALID',
    )
    await expect(pg.exec('SELECT ARRAY[1]::source_group')).rejects.toMatchObject({ code: '23514' })
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'coerced_cast_0')!
    const column = table.columns.find((item) => item.name === 'payload')!
    const type = catalogArrayType(column.typeName, column.typeOid, catalog.domains, catalog.enums)!
    const identities: string[] = []
    let current: string = type
    while (current.startsWith('array:')) {
      identities.push(current.slice(6))
      current = domainElementDefinition(current.slice(6))?.base ?? current.slice(6)
    }
    const inputs: (NestedArray | null)[] = []
    for (const mode of sourceValues.keys())
      inputs.push(
        (
          await pg.query<{ value: NestedArray | null }>(
            `SELECT ${arrayJson('payload', 2)} AS value FROM source_fixture WHERE mode=$1`,
            [mode],
          )
        ).rows[0]!.value,
      )
    const bodies: string[] = []
    let sequence = 0
    const render = (value: NestedArray | null, depth: number): string => {
      const name = 'nested_cast_input_' + sequence++,
        lines: string[] = []
      if (value === null) lines.push('ArrayValue::Null')
      else {
        lines.push(
          `let mut values=make_array_arguments(${rustStringLiteral(identities[depth]!)},${depth === 2 ? 2 : 41});`,
        )
        for (const match of (value.dimensions ?? '').matchAll(/\[(-?\d+):(-?\d+)\]/gu))
          lines.push(
            `values=append_array_dimension(values,${Number(match[1])},${Number(match[2]) - Number(match[1]) + 1});`,
          )
        for (const cell of value.elements)
          lines.push(
            `values=append_array_argument(values,${cell === null ? 'ArrayElement::Null' : depth === 2 ? `array_element_from_int4(make_int4_value(${cell}))` : `array_element_from_array(${render(cell as NestedArray, depth + 1)}())`});`,
          )
        lines.push('finish_array_arguments(values)')
      }
      bodies.push(`pub fn ${name}()->ArrayValue {${lines.join('\n')}}`)
      return name
    }
    const inputHelpers = inputs.map((input) => render(input, 0))
    const partialStart = sourceValues.length * 2
    bodies.push(`pub fn nested_cast_payload(mode:Int4Value)->ArrayValue {
      if let Int4Value::Value(selected)=mode {
        ${inputHelpers.map((helper, index) => `if selected==${index * 2} || selected==${index * 2 + 1} {return ${helper}();};`).join('\n')}
        if selected==${partialStart + 2} || selected==${partialStart + 3} {return ArrayValue::Error(make_sql_error(3452582));};
      };ArrayValue::Unknown
    }
    pub fn nested_cast_bypass(mode:Int4Value)->BoolValue {if let Int4Value::Value(selected)=mode{return make_bool_value(selected%2==1);};BoolValue::Unknown}`)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const [index, target] of targets.entries()) {
      const table = catalog.tables.find((item) => item.name === 'coerced_cast_' + index)!,
        constraint = table.constraints.find((item) => item.name === 'converted')!
      const expectedValues: (number | null)[] = []
      const outcomes: Outcome[] = []
      for (const [sample, [input, state]] of sourceValues.entries()) {
        const declared = sample === 6 && index === 1 ? '23502' : state
        let expected: number | null = 0
        try {
          expected = (
            await pg.query<{ value: number | null }>(
              `SELECT cardinality(payload::${target}) AS value FROM source_fixture WHERE mode=$1`,
              [sample],
            )
          ).rows[0]!.value
        } catch {}
        expectedValues.push(expected)
        for (const bypass of [false, true]) {
          const query = pg.query<{ value: boolean | null }>(
            `SELECT CASE WHEN $2::boolean THEN true ELSE cardinality(payload::${target}) IS NOT DISTINCT FROM $1::integer END AS value FROM source_fixture WHERE mode=$3`,
            [expected, bypass, sample],
          )
          if (declared && !bypass) {
            await expect(query).rejects.toMatchObject({ code: declared })
            outcomes.push({ kind: 'Error', value: { state: parseInt(declared, 36) } })
          } else {
            expect((await query).rows[0]!.value).toBe(true)
            outcomes.push({ kind: 'True' })
          }
          const insert = pg.query(
            `INSERT INTO ${table.name} SELECT payload,$1,$2 FROM source_fixture WHERE mode=$3`,
            [expected, bypass, sample],
          )
          if (declared && !bypass) await expect(insert).rejects.toMatchObject({ code: declared })
          else await insert
          references.push({
            target,
            input,
            expected,
            bypass,
            sqlstate: declared && !bypass ? declared : null,
          })
        }
      }
      bodies.push(`pub fn nested_cast_expected_${index}(mode:Int4Value)->Int4Value {
        if let Int4Value::Value(selected)=mode {
          ${expectedValues.map((value, index) => `if selected==${index * 2} || selected==${index * 2 + 1} {return ${value === null ? 'Int4Value::Null' : `make_int4_value(${value})`};};`).join('\n')}
        };make_int4_value(1)
      }`)
      for (const origin of ['source', 'stored'] as const) {
        const name = 'coerced_' + index + '_' + origin
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression: portableCheckAtoms(
            lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
          ),
        })
        for (const [mode, expected] of outcomes.entries())
          fixtures.push({ name, row: { mode: { kind: 'Value', value: mode } }, expected })
        for (const [mode, expected] of [
          { kind: 'Unknown' },
          { kind: 'True' },
          { kind: 'Error', value: { state: 3452582 } },
          { kind: 'True' },
        ].entries())
          fixtures.push({
            name,
            row: { mode: { kind: 'Value', value: partialStart + mode } },
            expected: expected as Outcome,
          })
      }
    }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    const wrappers: string[] = []
    group.checks = group.checks.map((check, index) => {
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
      if (check.kind !== 'supported') throw new Error(check.reason)
      const entryName = checkRustEntryName({
        ...plans[index]!.identity,
        owner: 'nested_cast_fixture',
      })
      const declarations: string[] = []
      const args = check.inputs.map((input, inputIndex) => {
        const name = 'argument_' + inputIndex,
          helper =
            input.name === 'expected'
              ? 'nested_cast_expected_' + Math.floor(index / 2)
              : 'nested_cast_' + input.name
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
      .files.push({ path: 'test/nested_cast_inputs.rs', source: bodies.join('\n') })
    group.source!.modules.find((module) => module.name === 'checks')!.files[0]!.source +=
      '\n' + wrappers.join('\n')
    group.evaluatorSource += '\n' + wrappers.join('\n')
    await runCheckParity(
      directory,
      'nestedcoercedcasts',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    await mkdir('artifacts/nested-domain-array-casts', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-casts/coerced-references.json',
      JSON.stringify({ fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(targets.length * 2 * (sourceValues.length * 2 + 4))
    expect(references).toHaveLength(targets.length * sourceValues.length * 2)
    await expect(pg.exec(`SELECT NULL::source_group[]::integer[]`)).rejects.toMatchObject({
      code: '42846',
    })
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
