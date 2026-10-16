import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { hasUncertain, valueRepresentation } from '../../scripts/check-measurements/probes.js'

import { jsonpathInputForms, invalidJsonpathInputForms } from './check-jsonpath-input-forms.js'

it('binds raw and stored JSONPath values, casts, state composition and versioned send in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonpath-sql-'))
  const known = (input: string | number | boolean | null): Input =>
    input === null ? { kind: 'Null' } : { kind: 'Value', value: input }
  const error = (state: string): Input & Outcome => ({
    kind: 'Error',
    value: { state: parseInt(state, 36) },
  })
  try {
    const expressions: Record<string, string> = {
      output: 'path::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      varchar: 'path::varchar COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      wire: 'encode(jsonpath_send(path),\'hex\') COLLATE "C" IS NOT DISTINCT FROM expected_hex COLLATE "C"',
      version: 'get_byte(jsonpath_send(path),0) IS NOT DISTINCT FROM expected_version',
      source: 'source::jsonpath::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      domain: 'source::retained_path::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      alias: 'jsonpath(source)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      text_alias: 'text(path) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      guarded:
        'CASE WHEN bypass THEN true ELSE source::jsonpath::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END',
      selected:
        '(CASE WHEN bypass THEN path ELSE backup END)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      selected_literal: `(CASE WHEN bypass THEN path ELSE '$'::jsonpath END)::text COLLATE "C" IS NOT DISTINCT FROM (CASE WHEN bypass THEN expected ELSE '$' END) COLLATE "C"`,
      coalesced_literal: `COALESCE(path,'$'::jsonpath)::text COLLATE "C" IS NOT DISTINCT FROM COALESCE(expected,'$') COLLATE "C"`,
      coalesced:
        'COALESCE(path,backup)::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      nullness: '(path IS NULL) IS NOT DISTINCT FROM expected_null',
      literal:
        '(\'lax $.a[0 to last]\'::retained_path)::text COLLATE "C"=\'$."a"[0 to last]\' COLLATE "C"',
      null_literal: 'NULL::retained_path IS NULL',
      converted_literal: `to_jsonb('$'::jsonpath) IS NOT DISTINCT FROM '"$"'::jsonb`,
      built_literal: `jsonb_build_array('null'::jsonpath,NULL::jsonpath) IS NOT DISTINCT FROM '["null",null]'::jsonb`,
    }
    const printedPredicates = []
    const predicateInputs = [
      '(exists($)).type()',
      '(!(exists($))).type()',
      '(($==1) is unknown).type()',
      'strict (exists($)).type()',
      '$?((exists(@.a)).type() == "boolean" && ((@.b == 1) is unknown).type() == "boolean")',
    ]
    for (const [index, input] of predicateInputs.entries()) {
      const canonical = (
        await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [input])
      ).rows[0]!.output
      const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'"
      expressions['printed_predicate_' + index] =
        `${quote(input)}::jsonpath::text COLLATE "C"=${quote(canonical)} COLLATE "C"`
      printedPredicates.push({ input, canonical })
      await expect(pg.query('SELECT $1::jsonpath', [canonical])).rejects.toMatchObject({
        code: '42601',
      })
    }
    const lossyInputs = [
      '((1+2).type()) == "number"',
      '((-$.x).abs()) == 1',
      '((1+2)[0]) == 3',
      '(($ like_regex "a").type()) == "boolean"',
    ]
    const lossyPaths = []
    for (const [index, input] of lossyInputs.entries()) {
      const canonical = (
        await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [input])
      ).rows[0]!.output
      const reparsed = await pg
        .query<{ output: string }>('SELECT $1::jsonpath::text output', [canonical])
        .then(
          (r) => ({ output: r.rows[0]!.output }),
          (e: { code: string }) => ({ sqlstate: e.code }),
        )
      const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'"
      expressions['lossy_literal_' + index] =
        `${quote(input)}::jsonpath::text COLLATE "C"=${quote(canonical)} COLLATE "C"`
      lossyPaths.push({ input, canonical, reparsed })
    }
    const witness = (
      await pg.query<{ original: boolean; printed: boolean }>(
        `SELECT jsonb_path_match('{"x":-1}'::jsonb,$1::jsonpath) original,jsonb_path_match('{"x":-1}'::jsonb,$2::jsonpath) printed`,
        [lossyPaths[1]!.input, lossyPaths[1]!.canonical],
      )
    ).rows[0]!
    expect(witness).toEqual({ original: true, printed: false })
    await pg.exec(`CREATE DOMAIN stored_path AS jsonpath;CREATE DOMAIN retained_path AS stored_path;
      CREATE TABLE path_inputs(path retained_path,backup jsonpath,source text,expected text,expected_hex text,expected_version integer,expected_null boolean,bypass boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
        .join(',')})`)
    await pg.exec(
      "INSERT INTO path_inputs VALUES('$'::jsonpath,'$'::jsonpath,'$','$','0124',1,false,false)",
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'path_inputs')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((item) => item.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalidLiterals: Record<string, string> = {
      literal_invalid_syntax: "CASE WHEN bypass THEN true ELSE '('::jsonpath::text='unused' END",
      literal_overflow: "CASE WHEN bypass THEN true ELSE '1e131072'::jsonpath::text='unused' END",
      literal_invalid_regex: `CASE WHEN bypass THEN true ELSE '$ like_regex "["'::jsonpath::text='unused' END`,
    }
    constraints.push(
      ...Object.entries(invalidLiterals).map(([name, sql]) => ({
        ...table.constraints[0]!,
        name,
        definition: `CHECK(${sql})`,
      })),
    )
    const plans = constraints.map((constraint) => ({
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          constraint.name.endsWith('_stored') ? 'stored' : 'source',
        )!.expression,
      ),
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: constraint.name,
      },
    }))
    for (const [index, plan] of plans.entries())
      expect(hasUncertain(plan.expression), constraints[index]!.name).toBe(false)
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        constraints[index]!.name + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    expect(valueRepresentation('pg_catalog.jsonpath').represented).toBe(true)
    const missing: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const oracle: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['_raw', '_stored'])
        fixtures.push({
          name: name + suffix,
          row: { ...missing, ...row },
          expected,
        })
    }
    for (const input of [null, ...jsonpathInputForms]) {
      const result = (
        await pg.query<{ output: string | null; wire: string | null }>(
          "SELECT $1::jsonpath::text output,encode(jsonpath_send($1::jsonpath),'hex') wire",
          [input],
        )
      ).rows[0]!
      const row: Row = {
        path: known(input),
        backup: known(input),
        source: known(input),
        expected: known(result.output),
        expected_hex: known(result.wire),
        expected_version: known(input === null ? null : 1),
        expected_null: known(input === null),
        bypass: known(false),
      }
      const ascii = result.output === null || /^[\x00-\x7f]*$/u.test(result.output)
      for (const name of Object.keys(expressions)) {
        const expected: Outcome =
          ['wire', 'version'].includes(name) && !ascii ? { kind: 'Unknown' } : { kind: 'True' }
        add(name, row, expected)
        oracle.push({ input, name, expected })
      }
      add('output', { ...row, expected: known('wrong') }, { kind: 'False' })
      add('coalesced', { ...row, path: { kind: 'Null' } }, { kind: 'True' })
      add('selected', { ...row, path: { kind: 'Unknown' } }, { kind: 'True' })
      add(
        'selected',
        { ...row, backup: { kind: 'Unknown' }, bypass: known(true) },
        { kind: 'True' },
      )
    }
    for (const source of invalidJsonpathInputForms) {
      const outcome = await pg.query('SELECT $1::jsonpath', [source]).then(
        () => ({ kind: 'True' }) as Outcome,
        (failure: { code: string }) => error(failure.code),
      )
      for (const name of ['source', 'domain', 'alias', 'guarded'])
        add(name, { source: known(source), expected: known(''), bypass: known(false) }, outcome)
      add('guarded', { source: known(source), bypass: known(true) }, { kind: 'True' })
    }
    for (const input of [{ kind: 'Unknown' }, error('22012')] as Input[]) {
      for (const name of ['output', 'wire', 'nullness', 'coalesced'])
        add(
          name,
          {
            path: input,
            backup: known('$'),
            expected: known('$'),
            expected_hex: known('0124'),
            expected_null: known(false),
          },
          input as Outcome,
        )
      add('guarded', { source: input, bypass: known(true) }, { kind: 'True' })
    }
    for (const [name, sql] of Object.entries(invalidLiterals)) {
      for (const bypass of [false, true]) {
        const expected = await pg
          .query(`SELECT ${sql} FROM (SELECT $1::boolean bypass) input`, [bypass])
          .then(
            () => ({ kind: 'True' }) as Outcome,
            (failure: { code: string }) => error(failure.code),
          )
        expect(expected.kind).toBe('Error')
        fixtures.push({ name, row: { ...missing, bypass: known(bypass) }, expected })
      }
    }
    await runCheckParity(
      directory,
      'jsonpathsqlparity',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
    const literalPlans = plans.filter(
      (plan) =>
        /^(?:printed_predicate_|lossy_literal_|converted_literal|built_literal)/u.test(
          plan.identity.constraint,
        ) && plan.identity.constraint.endsWith('_stored'),
    )
    const literalNames = literalPlans.map((plan) => plan.identity.constraint)
    const literalGroup = prepareCheckRustGroup(literalPlans)
    expect(literalGroup.requiresRegex).toBe(false)
    const literalDirectory = join(directory, 'stored-literals')
    await mkdir(literalDirectory)
    await runCheckParity(
      literalDirectory,
      'jsonpathstoredliteralparity',
      literalGroup,
      literalNames,
      fixtures.filter((f) => literalNames.includes(f.name)),
    )
    const noContext = prepareCheckRustGroup(plans)
    const contextFixtures: typeof fixtures = []
    for (const [source, outcome] of [
      ['$', { kind: 'True' }],
      ['"雪"', { kind: 'Unknown' }],
      [String.raw`"\u96ea"`, { kind: 'Unknown' }],
      ['$ like_regex "a"', { kind: 'Unknown' }],
      ['$ like_regex "a" flag "q"', { kind: 'True' }],
    ] as [string, Outcome][]) {
      const output = (
        await pg.query<{ output: string }>('SELECT $1::jsonpath::text output', [source])
      ).rows[0]!.output
      for (const suffix of ['_raw', '_stored'])
        contextFixtures.push({
          name: 'source' + suffix,
          row: { ...missing, source: known(source), expected: known(output) },
          expected: outcome,
        })
    }
    const contextDirectory = join(directory, 'without-context')
    await mkdir(contextDirectory)
    await runCheckParity(
      contextDirectory,
      'jsonpathcontextparity',
      noContext,
      constraints.map((constraint) => constraint.name),
      contextFixtures,
    )
    await mkdir('artifacts/jsonpath-sql', { recursive: true })
    await writeFile(
      'artifacts/jsonpath-sql/oracle.json',
      JSON.stringify(
        {
          rawStoredForms: Object.keys(expressions).length * 2,
          additionalRawLiteralForms: Object.keys(invalidLiterals).length,
          printedPredicates,
          lossyPaths,
          semanticLossWitness: witness,
          storedLiteralFormsWithoutRegex: literalNames.length,
          fixtures: fixtures.length,
          contextFixtures: contextFixtures.length,
          targets: ['Rust', 'Go', 'TypeScript'],
          oracle,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
