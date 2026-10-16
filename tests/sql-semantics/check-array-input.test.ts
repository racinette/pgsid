import { arrayScalarProfiles } from './check-array-fixtures.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('admits bounded borrowed event loops for integer array text casts and preserves literal versus runtime preparation and typmod order', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-input-loops-'))
  try {
    await pg.exec(
      'CREATE TABLE input_values(source text,expected integer,bypass boolean,b integer,divisor integer);CREATE TABLE input_oracle(LIKE input_values)',
    )
    const expressions = {
      count: 'cardinality(source::integer[]) IS NOT DISTINCT FROM expected',
      lazy: 'bypass OR cardinality(source::integer[]) = expected',
      literal: "cardinality('{1,2}'::integer[]) = 2",
      invalid_literal: "CASE WHEN bypass THEN true ELSE cardinality('{bad}'::integer[]) = 1 END",
      runtime_constant:
        "CASE WHEN bypass THEN true ELSE cardinality('bad'::text::integer[]) = 1 END",
      pruned_width: "CASE WHEN true THEN true ELSE cardinality('{9999}'::numeric(2)[]) = 1 END",
      constructor_width_order: 'cardinality(ARRAY[999999,b/divisor]::numeric(2)[]) > 0',
    }
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'input_values')!
    const plans = Object.entries(expressions).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          [],
          'source',
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(group.evaluatorSource).toContain('while array_text_has_event(&')
    expect(group.requiresRegex).toBe(false)
    expect(group.source!.modules.some((module) => module.name === 'regex_engine')).toBe(false)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    for (const row of [
      ['{1,2,NULL}', 3, false, 1, 1],
      ['[-1:0]={1,2}', 2, true, 1, 0],
      ['{}', 0, false, 1, 1],
      ['{bad,}', 1, true, 1, 1],
      ['{2147483648}', 1, false, 1, 1],
      [null, null, false, 1, 1],
      ['{0x_FF,-0b10,1_000}', 3, false, 1, 1],
    ] as const) {
      await pg.exec('TRUNCATE input_oracle')
      await pg.query('INSERT INTO input_oracle VALUES($1,$2,$3,$4,$5)', [...row])
      const input: Row = Object.fromEntries(
        ['source', 'expected', 'bypass', 'b', 'divisor'].map((name, index) => [
          name,
          row[index] === null ? { kind: 'Null' } : { kind: 'Value', value: row[index] },
        ]),
      ) as Row
      for (const [name, sql] of Object.entries(expressions)) {
        let expected: Outcome
        try {
          const actual = (
            await pg.query<{ value: boolean | null }>(`SELECT ${sql} AS value FROM input_oracle`)
          ).rows[0]!.value
          expected = { kind: actual === null ? 'Null' : actual ? 'True' : 'False' }
        } catch (error) {
          expected = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        references.push({ name, row, expected })
        fixtures.push({ name, row: input, expected })
      }
    }
    const base = {
      expected: { kind: 'Value', value: 1 },
      bypass: { kind: 'Value', value: false },
      b: { kind: 'Value', value: 1 },
      divisor: { kind: 'Value', value: 1 },
    } as const
    fixtures.push({
      name: 'count',
      row: { ...base, source: { kind: 'Unknown' } },
      expected: { kind: 'Unknown' },
    })
    fixtures.push({
      name: 'count',
      row: { ...base, source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
      expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
    })
    await mkdir('artifacts/array-input', { recursive: true })
    await writeFile(
      'artifacts/array-input/loop-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-input/loop-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arrayinputloops', group, Object.keys(expressions), fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('binds source and stored array text I/O for every represented scalar carrier and nominal builtin profile, retaining context requirements', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-input-families-'))

  try {
    await pg.exec(
      "SET TIME ZONE 'UTC'; SET DateStyle='ISO, MDY'; SET IntervalStyle='iso_8601'; SET array_nulls=on; CREATE TYPE array_stage AS ENUM ('new','done'); CREATE DOMAIN import_slots AS integer[]; CREATE DOMAIN nested_import_slots AS import_slots; CREATE TABLE family_inputs(source text,stages array_stage[],bypass boolean)",
    )
    const forms: {
      name: string
      sql: string
      array: string
      type: string
      literal: boolean
    }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      let token = (await pg.query<{ value: string }>(`SELECT (${literal}::${type})::text AS value`))
        .rows[0]!.value
      if (type === 'money') token = '0'
      const array =
        '{"' +
        token.replaceAll('\\', '\\\\').replaceAll('"', '\\"') +
        '"' +
        (type === 'box' ? ';' : ',') +
        'NULL}'
      const quoted = "'" + array.replaceAll("'", "''") + "'"
      for (const [kind, input] of [
        ['literal', quoted],
        ['runtime', 'source'],
      ] as const)
        for (const mode of ['cardinality', 'array_dims'])
          forms.push({
            name: `family_${index}_${kind}_${mode}`,
            type,
            array,
            literal: kind === 'literal',
            sql:
              mode === 'cardinality'
                ? `cardinality(${input}::${type}[]) = 2`
                : `array_dims(${input}::${type}[]) COLLATE "C" = '[1:2]' COLLATE "C"`,
          })
    }
    for (const [name, sql, array] of [
      ['domain', 'cardinality(source::nested_import_slots) = 2', '{1,2}'],
      ['enum_fallback', "cardinality(COALESCE(stages,'{new,NULL}')) = 2", '{1,2}'],
    ])
      forms.push({
        name: name!,
        sql: sql!,
        array: array!,
        type: 'integer',
        literal: false,
      })
    for (const form of forms)
      await pg.exec(
        `ALTER TABLE family_inputs ADD CONSTRAINT "${form.name}" CHECK(${form.sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'family_inputs')!
    const plans = forms.flatMap((form) =>
      ['source', 'stored'].map((origin) => ({
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: form.name, type: 'check', definition: `CHECK(${form.sql})` }
              : table.constraints.find((item) => item.name === form.name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const form of forms) {
      const actual = (
        await pg.query<{ value: boolean }>(
          `SELECT ${form.sql} AS value FROM (SELECT $1::text source,NULL::array_stage[] stages,false bypass) q`,
          [form.array],
        )
      ).rows[0]!.value
      expect(actual, form.name).toBe(true)
      for (const origin of ['source', 'stored']) {
        const expected: Outcome = { kind: 'True' }
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            source: { kind: 'Value', value: form.array },
            stages: { kind: 'Null' },
            bypass: { kind: 'Value', value: false },
          },
          expected,
        })
        references.push({
          name: form.name,
          origin,
          array: form.array,
          postgres: actual,
          expected,
          requirement: null,
        })
      }
    }
    await mkdir('artifacts/array-input', { recursive: true })
    await writeFile(
      'artifacts/array-input/family-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-input/family-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayinputfamilies',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('distinguishes explicit array_nulls settings, missing context, stored NULL elements and skipped runtime casts', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-input-context-'))
  try {
    await pg.exec(
      "SET array_nulls=on; CREATE TABLE context_inputs(source text,bypass boolean,CONSTRAINT retained CHECK(cardinality('{NULL}'::integer[]) = 1),CONSTRAINT prices CHECK(cardinality('{1.23,-1.23,NULL}'::money[]) = 3),CONSTRAINT names CHECK(cardinality('{identifier,NULL}'::name[]) = 2))",
    )
    await pg.exec('SET array_nulls=off')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'context_inputs')!
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('array_nulls') AS value")).rows[0]!
        .value,
    ).toBe('off')
    expect(
      table.constraints
        .find((item) => item.name === 'prices')!
        .moneyLiterals?.map((item) => item.units)
        .sort(),
    ).toEqual(['-123', '123'])
    const cases = [
      {
        name: 'runtime',
        sql: 'cardinality(source::integer[]) = 1',
        input: '{NULL}',
        bypass: false,
        literal: false,
      },
      {
        name: 'guarded',
        sql: 'CASE WHEN bypass THEN true ELSE cardinality(source::integer[]) = 1 END',
        input: '{NULL}',
        bypass: true,
        literal: false,
      },
      {
        name: 'literal',
        sql: "CASE WHEN bypass THEN true ELSE cardinality('{NULL}'::integer[]) = 1 END",
        input: '{}',
        bypass: true,
        literal: true,
      },
      {
        name: 'quoted',
        sql: 'cardinality(source::text[]) = 1',
        input: '{"NULL"}',
        bypass: false,
        literal: false,
      },
    ]
    const evaluators: ReturnType<typeof emitCheckRustEvaluator>[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const setting of ['on', 'off', 'missing'] as const) {
      for (const item of cases) {
        const name = setting + '_' + item.name
        const plan = lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${item.sql})` },
          [],
          [],
          'source',
        )!
        evaluators.push(
          emitCheckRustEvaluator(
            portableCheckAtoms(plan.expression),
            { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            setting === 'missing' ? {} : { arrayNulls: setting === 'on' },
          ),
        )
        const outcomes: Outcome[] = []
        for (const postgresSetting of setting === 'missing' ? ['on', 'off'] : [setting]) {
          await pg.exec('SET array_nulls=' + postgresSetting)
          try {
            const actual = (
              await pg.query<{ value: boolean }>(
                `SELECT ${item.sql} AS value FROM (SELECT $1::text source,$2::boolean bypass) q`,
                [item.input, item.bypass],
              )
            ).rows[0]!.value
            outcomes.push({ kind: actual ? 'True' : 'False' })
          } catch (error) {
            outcomes.push({
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            })
          }
        }
        const expected: Outcome =
          setting === 'missing' && (item.name === 'runtime' || item.literal)
            ? { kind: 'Unknown' }
            : outcomes[0]!
        fixtures.push({
          name,
          row: {
            source: { kind: 'Value', value: item.input },
            bypass: { kind: 'Value', value: item.bypass },
          },
          expected,
        })
        references.push({ name, outcomes, expected })
      }
      await pg.exec('SET array_nulls=' + (setting === 'on' ? 'on' : 'off'))
      await expect(pg.exec('INSERT INTO context_inputs DEFAULT VALUES')).resolves.toBeDefined()
      for (const constraint of ['retained', 'prices', 'names']) {
        const name = setting + '_stored_' + constraint
        const stored = lowerTableCheck(
          table,
          table.constraints.find((item) => item.name === constraint)!,
          [],
          [],
          'stored',
        )!
        evaluators.push(
          emitCheckRustEvaluator(
            portableCheckAtoms(stored.expression),
            { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            setting === 'missing' ? {} : { arrayNulls: setting === 'on' },
          ),
        )
        fixtures.push({ name, row: {}, expected: { kind: 'True' } })
        references.push({ name, storedConstraintInsert: true, expected: { kind: 'True' } })
      }
    }
    const evaluatorSource = evaluators.map((item) => item.source).join('\n')
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: [...new Set(evaluators.flatMap((item) => item.callables))],
    })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: evaluators.map((item) => ({
        kind: 'supported',
        entryName: item.entryName,
        inputs: item.inputs,
      })),
    }
    await mkdir('artifacts/array-input', { recursive: true })
    await writeFile(
      'artifacts/array-input/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-input/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayinputcontext',
      group,
      fixtures.map((item) => item.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
