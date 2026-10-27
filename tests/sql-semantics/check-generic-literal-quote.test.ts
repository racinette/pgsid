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
import { quoteContext as full, quoteProfiles as profiles } from './check-quote-fixtures.js'

const packet = 'artifacts/goal-checks/generic-literal-quote-active'
const known = (value: string | number | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('quotes generic scalar and recursive values through selected text casts and strict datum NULLs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-generic-literal-quote-'))
  try {
    await pg.exec(
      "SET lc_monetary='C';SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='postgres';SET bytea_output='hex';SET extra_float_digits=1;CREATE TYPE quote_label AS ENUM ('ready','done');CREATE DOMAIN quote_positive AS int CHECK(VALUE>0);CREATE TYPE quote_pair AS (score int,label text);CREATE TYPE quote_data AS (quantity float8,day date,data bytea);",
    )
    const forms = profiles.map((profile, index) => ({
      ...profile,
      name: 'quote_' + index,
      output: `quote_literal((CASE WHEN use_value THEN (${profile.value})::${profile.type} ELSE NULL::${profile.type} END)${profile.castText ? '::text' : ''})`,
    }))
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.name}(use_value bool,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
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
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        const expression = portableCheckAtoms(lowered.expression)
        expect(hasUncertain(expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: form.name, constraint: name },
          expression,
        })
      }
    const group = prepareCheckRustGroup(plans, full)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      for (const useValue of [true, false, null]) {
        const expected = (
          await pg.query<{ value: string | null }>(
            `SELECT ${form.output} value FROM (SELECT $1::bool use_value) args`,
            [useValue],
          )
        ).rows[0]!.value
        for (const wanted of new Set([expected, 'wrong', null])) {
          const valid = wanted === expected,
            insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,false)`, [useValue, wanted])
          if (valid) await insert
          else await expect(insert).rejects.toMatchObject({ code: '23514' })
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.name + '_' + origin,
              row: { use_value: known(useValue), expected: known(wanted), bypass: known(false) },
              expected:
                form.catalog && useValue === true
                  ? { kind: 'Unknown' }
                  : { kind: valid ? 'True' : 'False' },
            })
        }
        observations.push({ form: form.name, type: form.type, useValue, expected })
      }
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: form.name + '_' + origin,
          row: {
            use_value: { kind: 'Unknown' },
            expected: { kind: 'Unknown' },
            bypass: known(true),
          },
          expected: { kind: 'True' },
        })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          forms: forms.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts,
          targets: ['Rust', 'Go', 'TypeScript'],
          observations,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'generic_literal_quote', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('retains output context only after a non-NULL datum and evaluates a failing argument once', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-generic-literal-quote-context-'))
  try {
    await pg.exec('CREATE TYPE quote_data AS (quantity float8,day date,data bytea);')
    const forms = profiles
      .filter((profile) => profile.context)
      .map((profile, index) => ({
        name: 'context_' + index,
        expression: `CASE WHEN bypass THEN true ELSE quote_literal(CASE WHEN use_value THEN (${profile.value})::${profile.type} ELSE NULL::${profile.type} END) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        context: true,
      }))
    forms.push({
      name: 'direct',
      expression:
        'quote_literal(number/denominator) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      context: false,
    })
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE literal_${form.name}(use_value bool,number int,denominator int,expected text,bypass bool,CONSTRAINT valid CHECK(${form.expression}))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === 'literal_' + form.name)!,
          name = form.name + '_' + origin
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${form.expression})` : undefined,
        )!
        expect(hasUncertain(lowered.expression), name).toBe(false)
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    expect([
      ...group.evaluatorSource!.matchAll(/\bsql__pg_catalog__int4div__\w+\(/gu),
    ]).toHaveLength(2)
    for (const form of forms)
      for (const origin of ['source', 'stored']) {
        const base: Row = {
          use_value: known(false),
          number: { kind: 'Null' },
          denominator: { kind: 'Value', value: 0 },
          expected: { kind: 'Null' },
          bypass: known(false),
        }
        const add = (row: Row, expected: Outcome) =>
          fixtures.push({ name: form.name + '_' + origin, row, expected })
        add(base, { kind: 'True' })
        if (form.context) {
          add(
            { ...base, use_value: known(true), expected: known('unknown output') },
            { kind: 'Unknown' },
          )
          add({ ...base, use_value: { kind: 'Unknown' } }, { kind: 'Unknown' })
          add(
            { ...base, use_value: known(true), bypass: known(true), expected: { kind: 'Unknown' } },
            { kind: 'True' },
          )
        } else {
          add(
            { ...base, number: { kind: 'Value', value: 1 } },
            { kind: 'Error', value: { state: parseInt('22012', 36) } },
          )
          add(
            { ...base, number: { kind: 'Unknown' }, denominator: { kind: 'Value', value: 1 } },
            { kind: 'Unknown' },
          )
          add(
            { ...base, number: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
            { kind: 'Error', value: { state: parseInt('22003', 36) } },
          )
          expect(
            (
              await pg.query<{ value: string | null }>(
                'SELECT quote_literal($1::int/$2::int) value',
                [null, 0],
              )
            ).rows[0]!.value,
          ).toBeNull()
          await expect(
            pg.query('SELECT quote_literal($1::int/$2::int)', [1, 0]),
          ).rejects.toMatchObject({ code: '22012' })
        }
      }
    await runCheckParity(root, 'generic_literal_quote_context', group, names, fixtures)
    await writeFile(
      packet + '/context-summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          divisionEvaluationsPerCheck: 1,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)

it('skips text casts for NULL original datums and preserves missing bodies, errors and lazy branches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-generic-literal-quote-states-'))
  try {
    await pg.exec(`CREATE TYPE literal_called AS ENUM ('ready');CREATE DOMAIN literal_domain AS literal_called;CREATE TYPE literal_pair AS (score int,label text);
      CREATE FUNCTION literal_called_text(literal_called) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT CASE WHEN $1 IS NULL THEN ''null-cast'' ELSE ''value-cast'' END';
      CREATE CAST (literal_called AS text) WITH FUNCTION literal_called_text(literal_called);
      CREATE FUNCTION literal_pair_text(literal_pair) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT ''record-cast''::text';
      CREATE CAST (literal_pair AS text) WITH FUNCTION literal_pair_text(literal_pair);
      CREATE FUNCTION literal_array_text(literal_called[]) RETURNS text LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT ''array-cast''::text';
      CREATE CAST (literal_called[] AS text) WITH FUNCTION literal_array_text(literal_called[]);`)
    const forms = [
      {
        name: 'called',
        arg: "CASE WHEN use_value THEN 'ready'::literal_called ELSE NULL::literal_called END",
        custom: true,
      },
      {
        name: 'domain',
        arg: "CASE WHEN use_value THEN 'ready'::literal_domain ELSE NULL::literal_domain END",
        custom: true,
      },
      {
        name: 'record',
        arg: 'CASE WHEN use_value THEN ROW(NULL,NULL)::literal_pair ELSE NULL::literal_pair END',
        custom: true,
      },
      {
        name: 'array',
        arg: "CASE WHEN use_value THEN ARRAY['ready'::literal_called,NULL] ELSE NULL::literal_called[] END",
        custom: true,
      },
      { name: 'constant', arg: 'NULL::literal_called', custom: false },
      { name: 'constant_record', arg: 'NULL::literal_pair', custom: false },
      { name: 'constant_array', arg: 'NULL::literal_called[]', custom: false },
      { name: 'quotient', arg: 'number/denominator', custom: false },
      {
        name: 'simple_case',
        arg: 'CASE number WHEN 4 THEN number/denominator ELSE NULL END',
        custom: false,
      },
      {
        name: 'nested_case',
        arg: 'CASE WHEN use_value THEN CASE number WHEN 4 THEN number/denominator ELSE NULL END ELSE NULL END',
        custom: false,
      },
      { name: 'collision', arg: '__pgsid_quote_operand_0', custom: false },
      { name: 'constructed', arg: 'ROW(number/denominator,NULL)::literal_pair', custom: true },
    ]
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE literal_case_${form.name}(use_value bool,number int,denominator int,__pgsid_quote_operand_0 int,expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE quote_literal(${form.arg}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    const catalog = await snapshotCatalog(pg),
      names: string[] = [],
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    for (const form of forms)
      for (const origin of ['source', 'stored'] as const) {
        const table = catalog.tables.find((t) => t.name === 'literal_case_' + form.name)!,
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
            ? `CHECK(CASE WHEN bypass THEN true ELSE quote_literal(${form.arg}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`
            : undefined,
        )!
        names.push(name)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression: portableCheckAtoms(lowered.expression),
        })
      }
    const group = prepareCheckRustGroup(plans),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    for (const form of forms)
      for (const useValue of [true, false, null])
        for (const number of [4, null])
          for (const denominator of [2, 0]) {
            let value: string | null = null,
              code: string | undefined
            try {
              value = (
                await pg.query<{ value: string | null }>(
                  `SELECT quote_literal(${form.arg}) value FROM (SELECT $1::bool use_value,$2::int number,$3::int denominator,$2::int __pgsid_quote_operand_0) args`,
                  [useValue, number, denominator],
                )
              ).rows[0]!.value
            } catch (e) {
              code = (e as { code: string }).code
            }
            for (const origin of ['source', 'stored'])
              for (const bypass of [false, true]) {
                const missing = form.custom && (form.name === 'constructed' || useValue === true)
                fixtures.push({
                  name: form.name + '_' + origin,
                  row: {
                    use_value: known(useValue),
                    number: number === null ? { kind: 'Null' } : { kind: 'Value', value: number },
                    denominator: { kind: 'Value', value: denominator },
                    __pgsid_quote_operand_0:
                      number === null ? { kind: 'Null' } : { kind: 'Value', value: number },
                    expected: known(value),
                    bypass: known(bypass),
                  },
                  expected: bypass
                    ? { kind: 'True' }
                    : code
                      ? { kind: 'Error', value: { state: parseInt(code, 36) } }
                      : missing
                        ? { kind: 'Unknown' }
                        : { kind: 'True' },
                })
              }
            observations.push({
              form: form.name,
              useValue,
              number,
              denominator,
              value,
              error: code ?? null,
            })
          }
    const native = (
      await pg.query<{ strict: string | null; nullable: string }>(
        `SELECT quote_literal(NULL::literal_called) strict,quote_nullable(NULL::literal_called) nullable`,
      )
    ).rows[0]!
    expect(native).toEqual({ strict: null, nullable: "'null-cast'" })
    await writeFile(packet + '/states-evaluator.rs', group.evaluatorSource!)
    await runCheckParity(root, 'generic_literal_quote_states', group, names, fixtures)
    await writeFile(
      packet + '/states-summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          native,
          observations,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 480_000)
