import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { quoteContext } from './check-quote-fixtures.js'

const packet = 'artifacts/goal-checks/concat-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
const expressions = [
  "concat(input,number,true,NULL::text,''::text)",
  "concat_ws(separator,input,number,true,NULL::text,''::text)",
  "concat(VARIADIC ARRAY[input,NULL,number::text,''])",
  "concat_ws(separator,VARIADIC ARRAY[input,NULL,number::text,''])",
  "concat_ws(separator,VARIADIC '[0:1][4:5]={{1,NULL},{3,4}}'::int[])",
  "concat(VARIADIC '1 -2 3'::int2vector)",
  "concat_ws(separator,VARIADIC '1 2 3'::oidvector)",
  'concat(VARIADIC NULL::int[])',
  'concat_ws(separator,VARIADIC ARRAY[]::int[])',
  "concat_ws(separator,VARIADIC ARRAY['ready'::concat_label,NULL,'done'])",
  'concat_ws(separator,VARIADIC ARRAY[1::concat_positive,NULL,2])',
  'concat_ws(separator,VARIADIC ARRAY[NULL::concat_pair,ROW(NULL,NULL)::concat_pair,ROW(1,input)::concat_pair])',
  'concat_ws(separator,number/number)',
  'concat_ws(separator,input::int)',
  'concat(number/number,input::int)',
  'concat(input::int,number/number)',
  'concat_ws(separator::varchar,number,true)',
  'concat_ws(separator::char(3),number,true)',
  "concat('ready'::concat_label,ROW(1,input)::concat_pair)",
  "concat_ws(separator,NULL::money,'x'::text)",
  'concat_ws(separator,1::money)',
]

it('preserves expanded and VARIADIC joining, eager errors, lazy output and catalog-selected raw output', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-concat-states-'))
  try {
    await pg.exec(
      "SET lc_monetary='C';CREATE TYPE concat_label AS ENUM ('ready','done');CREATE DOMAIN concat_positive AS int CHECK(VALUE>0);CREATE TYPE concat_pair AS (number int,label text);CREATE FUNCTION concat_cast(concat_label) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT 'custom-cast'::text$$;CREATE CAST(concat_label AS text) WITH FUNCTION concat_cast(concat_label);",
    )
    for (const [index, output] of expressions.entries())
      await pg.exec(
        `CREATE TABLE concat_state_${index}(input text,number int,separator text,bypass bool,expected text,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const [index, output] of expressions.entries())
      for (const origin of ['source', 'stored'] as const) {
        const name = 'concat_state_' + index + '_' + origin,
          table = catalog.tables.find((t) => t.name === 'concat_state_' + index)!
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: {
            schema: 'public',
            kind: 'table',
            owner: 'concat_state_' + index,
            constraint: name,
          },
          expression,
        })
      }
    const group = prepareCheckRustGroup(plans, quoteContext)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations = []
    let inserts = 0
    for (const [index, output] of expressions.entries())
      for (const separator of ['|', '', null])
        for (const input of ['2', '', null, 'bad'])
          for (const number of [2, 0, null]) {
            let value: string | null = null,
              code: string | undefined
            try {
              value = (
                await pg.query<{ value: string | null }>(
                  `SELECT ${output} value FROM(SELECT $1::text input,$2::int number,$3::text separator) args`,
                  [input, number, separator],
                )
              ).rows[0]!.value
            } catch (error) {
              code = (error as { code: string }).code
            }
            for (const wanted of code ? [null] : new Set([value, 'wrong', null])) {
              const expected: Outcome = code
                ? { kind: 'Error', value: { state: parseInt(code, 36) } }
                : { kind: wanted === value ? 'True' : 'False' }
              const insert = pg.query(
                `INSERT INTO concat_state_${index} VALUES($1,$2,$3,false,$4)`,
                [input, number, separator, wanted],
              )
              if (expected.kind === 'True') await insert
              else await expect(insert).rejects.toMatchObject({ code: code ?? '23514' })
              inserts++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: 'concat_state_' + index + '_' + origin,
                  row: {
                    input: known(input),
                    number: known(number),
                    separator: known(separator),
                    bypass: known(false),
                    expected: known(wanted),
                  },
                  expected,
                })
            }
            observations.push({ index, input, number, separator, value, code })
          }
    for (const [index] of expressions.entries())
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: 'concat_state_' + index + '_' + origin,
          row: {
            input: { kind: 'Unknown' },
            number: { kind: 'Unknown' },
            separator: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/states-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/states-summary.json',
      JSON.stringify(
        { checks: names.length, fixtures: fixtures.length, inserts, observations },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'text_concat_states', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('requires output context only for reached non-NULL values and preserves partial array states', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-concat-context-'))
  try {
    const values = ['1.25::float8', "'2000-01-02'::date", 'amount', "'\\x0102'::bytea"]
    const forms = values.flatMap((value, index) => [
      {
        name: 'concat_context_' + index,
        output: `concat_ws(separator,CASE WHEN use_value THEN ${value} ELSE NULL END)`,
      },
      {
        name: 'concat_array_context_' + index,
        output: `concat_ws(separator,VARIADIC ARRAY[CASE WHEN use_value THEN ${value} ELSE NULL END,NULL])`,
      },
    ])
    forms.push({ name: 'concat_partial_array', output: 'concat_ws(separator,VARIADIC items)' })
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(use_value bool,separator text,items int[],amount money,expected text,CONSTRAINT valid CHECK((${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK((${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C")`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (form: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: form + '_' + origin, row: { amount: known(100), ...row }, expected })
    }
    for (const form of forms.slice(0, -1)) {
      for (const useValue of [true, false, null])
        for (const separator of ['|', null]) {
          const wanted = separator === null ? null : useValue ? 'unused' : ''
          const row = {
            use_value: known(useValue),
            separator: known(separator),
            expected: known(wanted),
          }
          add(form.name, row, { kind: useValue && separator !== null ? 'Unknown' : 'True' })
          if (!useValue || separator === null) {
            const native = (
              await pg.query<{ value: boolean }>(
                `SELECT (${form.output}) IS NOT DISTINCT FROM $3::text value FROM(SELECT $1::bool use_value,$2::text separator,1::money amount) args`,
                [useValue, separator, wanted],
              )
            ).rows[0]!.value
            expect(native).toBe(true)
            add(form.name, { ...row, expected: known('wrong') }, { kind: 'False' })
          }
        }
      add(
        form.name,
        { use_value: { kind: 'Unknown' }, separator: known(null), expected: known(null) },
        { kind: 'True' },
      )
      const error = { kind: 'Error' as const, value: { state: parseInt('22003', 36) } }
      add(form.name, { use_value: error, separator: known(null), expected: known(null) }, error)
      add(form.name, { use_value: error, separator: known('|'), expected: known(null) }, error)
    }
    const form = 'concat_partial_array',
      payload = {
        elementType: 'pg_catalog.int4',
        elementKind: 2,
        dimensions: [{ lower: -2, length: 2 }],
        elements: [{ kind: 'Unknown' as const }, { kind: 'Int4' as const, value: 1 }],
        nullBitmap: { kind: 'Value' as const, value: false },
      }
    add(
      form,
      { items: { kind: 'Unknown' }, separator: known(null), expected: known(null) },
      { kind: 'True' },
    )
    add(
      form,
      {
        items: { kind: 'Value', value: payload },
        separator: known('|'),
        expected: known('unused'),
      },
      { kind: 'Unknown' },
    )
    add(
      form,
      {
        items: {
          kind: 'Value',
          value: {
            ...payload,
            elements: [{ kind: 'Null' as const }, { kind: 'Null' as const }],
            nullBitmap: { kind: 'Value', value: true },
          },
        },
        separator: known('|'),
        expected: known(''),
      },
      { kind: 'True' },
    )
    const error = { kind: 'Error' as const, value: { state: parseInt('22003', 36) } }
    add(form, { items: error, separator: known(null), expected: known(null) }, error)
    await writeFile(packet + '/context-evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/context-summary.json',
      JSON.stringify({ checks: names.length, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(root, 'text_concat_context', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})
