import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('parses nested domain-array cells and enforces reached domain checks in event order in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-text-'))
  try {
    await pg.exec(`CREATE DOMAIN positive_group AS integer[] CHECK(cardinality(VALUE)>0 AND VALUE[1]>0);
      CREATE DOMAIN required_group AS positive_group NOT NULL;
      CREATE TYPE group_state AS ENUM ('new','done');
      CREATE DOMAIN state_group AS group_state[] CHECK(cardinality(VALUE)>0);
      CREATE DOMAIN rounded_group AS numeric(3,1)[] CHECK(cardinality(VALUE)>0);
      CREATE DOMAIN short_group AS varchar(2)[] COLLATE "C" CHECK(cardinality(VALUE)>0);
      CREATE DOMAIN group_batch AS positive_group[] CHECK(cardinality(VALUE)=2)`)
    const targets = [
      'positive_group',
      'required_group',
      'state_group',
      'rounded_group',
      'short_group',
      'group_batch',
    ]
    const forms = targets.flatMap((target) => [
      {
        name: target + '_count',
        target,
        sql: `CASE WHEN bypass THEN true ELSE cardinality(payload::${target}[])<=2 END`,
      },
      {
        name: target + '_first',
        target,
        sql: `CASE WHEN bypass THEN true ELSE cardinality((payload::${target}[])[1])<=2 END`,
      },
    ])
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE nested_${form.name}(payload text,bypass boolean,CONSTRAINT ${form.name} CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    await mkdir('artifacts/nested-domain-array-io', { recursive: true })
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
    const cases: (string | null)[] = [
      '{"{1,2}"}',
      '{"{1,2}","{3}"}',
      '{"{1}","{2}","{3}"}',
      '{"[5:6]={1,2}"}',
      '{"{}"}',
      '{NULL}',
      '{"NULL"}',
      '{"{bad}"}',
      '{"{1,broken}","{-1,3}"}',
      '{"{-1,2}","{bad}"}',
      '{"{1,2}"',
      '{BAD}',
      '{}',
      null,
      '{"{new,done}"}',
      '{"{new,bad}"}',
      '{"{99.94}"}',
      '{"{99.95}"}',
      '{"{abc}"}',
      '{"{ab}"}',
      '{"{\\"{1}\\",\\"{2}\\"}"}',
      '{"{\\"{1}\\"}"}',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const form of forms)
      for (const payload of cases)
        for (const bypass of [false, true]) {
          let outcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${form.sql} AS value FROM (SELECT $1::text payload,$2::boolean bypass) candidate`,
                [payload, bypass],
              )
            ).rows[0]!.value
            outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(`INSERT INTO nested_${form.name} VALUES($1,$2)`, [
            payload,
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
                bypass: { kind: 'Value', value: bypass },
              },
              expected: outcome,
            })
          references.push({ name: form.name, payload, bypass, outcome })
        }
    await mkdir('artifacts/nested-domain-array-io', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-io/references.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 8) {
      const selected = plans.slice(offset, offset + 8)
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
        'nesteddomaintext' + offset,
        group,
        names,
        fixtures.filter((fixture) => names.includes(fixture.name)),
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('preserves already-coerced nested domain-array constants when domain constraints change', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-constant-'))
  try {
    await pg.exec(`CREATE DOMAIN frozen_group AS integer[];
      CREATE DOMAIN frozen_error_group AS integer[];
      CREATE DOMAIN frozen_required_group AS integer[];
      CREATE DOMAIN frozen_inner_group AS integer[];
      CREATE DOMAIN frozen_batch AS frozen_inner_group[];`)
    const literals: [string, string, string][] = [
      ['frozen_group', '{"{0,NULL}"}', '23514'],
      ['frozen_error_group', '{"{1}"}', '22012'],
      ['frozen_required_group', '{NULL}', '23502'],
      ['frozen_batch', '{"{\\"{0}\\"}"}', '23514'],
    ]
    for (const [type, literal] of literals)
      await pg.exec(
        `CREATE TABLE constant_${type}(marker integer,CONSTRAINT retained CHECK(cardinality('${literal}'::${type}[])=1))`,
      )
    await pg.exec(`ALTER DOMAIN frozen_group ADD CONSTRAINT positive CHECK(VALUE[1]>0) NOT VALID;
      ALTER DOMAIN frozen_error_group ADD CONSTRAINT broken CHECK(VALUE[1]>1/0) NOT VALID;
      ALTER DOMAIN frozen_required_group SET NOT NULL;
      ALTER DOMAIN frozen_inner_group ADD CONSTRAINT inner_positive CHECK(VALUE[1]>0) NOT VALID;`)
    const catalog = await snapshotCatalog(pg)
    const plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [type, , state] of literals) {
      const table = catalog.tables.find((item) => item.name === 'constant_' + type)!
      const constraint = table.constraints.find((item) => item.name === 'retained')!
      await pg.exec(`INSERT INTO ${table.name} VALUES(1)`)
      await expect(
        pg.exec('SELECT ' + constraint.definition.slice('CHECK '.length)),
      ).rejects.toMatchObject({ code: state })
      for (const origin of ['source', 'stored'] as const) {
        const name = type + '_' + origin
        const expression = portableCheckAtoms(
          lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!.expression,
        )
        expect(hasUncertain(expression), name).toBe(false)
        plans.push({
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          expression,
        })
        fixtures.push({
          name,
          row: {},
          expected:
            origin === 'stored'
              ? { kind: 'True' }
              : { kind: 'Error', value: { state: parseInt(state, 36) } },
        })
      }
    }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await runCheckParity(
      directory,
      'nesteddomainconstants',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)

it('preserves lexer and domain preparation boundaries before recursive base input and lazy skips', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-preparation-'))
  try {
    await pg.exec(`CREATE DOMAIN broken_group AS integer[] CHECK(VALUE[1]>1/0);
      CREATE DOMAIN rejected_group AS integer[] CHECK(false);
      CREATE DOMAIN required_broken_group AS broken_group NOT NULL;`)
    const targets = ['broken_group', 'rejected_group', 'required_broken_group']
    const sql = (target: string) =>
      `CASE WHEN bypass THEN true ELSE payload::${target}[] IS NOT NULL END`
    for (const target of targets)
      await pg.exec(
        `CREATE TABLE prepare_${target}(payload text,bypass boolean,CONSTRAINT checked CHECK(${sql(target)}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = targets.flatMap((target) => {
      const table = catalog.tables.find((item) => item.name === 'prepare_' + target)!
      const constraint = table.constraints.find((item) => item.name === 'checked')!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: target + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...constraint, definition: `CHECK(${sql(target)})` }
              : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const samples = [
      null,
      '{}',
      '{',
      '{bad',
      '{bad}',
      '{NULL}',
      '{"{bad}"}',
      '{"{1}"}',
      '{"{1}",bad}',
      '{"{1}"} extra',
      '[1:2]={"{1}"}',
      '{{"{1}"},{"{2}"}}',
    ]
    for (const target of targets)
      for (const payload of samples)
        for (const bypass of [false, true]) {
          let outcome: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${sql(target)} AS value FROM (SELECT $1::text payload,$2::boolean bypass) candidate`,
                [payload, bypass],
              )
            ).rows[0]!.value
            outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            outcome = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          const insert = pg.query(`INSERT INTO prepare_${target} VALUES($1,$2)`, [payload, bypass])
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
              name: target + '_' + origin,
              row: {
                payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: outcome,
            })
        }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    await runCheckParity(
      directory,
      'nesteddomainpreparation',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)

it('prepares nested array literals before branch pruning and defers only reached missing NULL-token context', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-literal-'))
  try {
    await pg.exec(`CREATE DOMAIN literal_group AS integer[] CHECK(VALUE[1]>0);
      CREATE DOMAIN literal_short_group AS varchar(2)[];
      CREATE DOMAIN literal_broken_group AS integer[] CHECK(VALUE[1]>1/0);
      CREATE TABLE nested_literal_source(payload text,bypass boolean)`)
    const table = (await snapshotCatalog(pg)).tables.find(
      (item) => item.name === 'nested_literal_source',
    )!
    const catalog = await snapshotCatalog(pg)
    const forms = {
      valid: `cardinality('{"{1,2}"}'::literal_group[])=1`,
      check_before_grammar: `cardinality('{"{-1}","{bad}"}'::literal_group[])>0`,
      grammar_before_check: `cardinality('{"{bad}","{-1}"}'::literal_group[])>0`,
      static_literal: `CASE WHEN true THEN true ELSE cardinality('{"{-1}"}'::literal_group[])>0 END`,
      static_text: `CASE WHEN true THEN true ELSE cardinality('{"{-1}"}'::text::literal_group[])>0 END`,
      runtime_literal: `CASE WHEN bypass THEN true ELSE cardinality('{"{-1}"}'::literal_group[])>0 END`,
      runtime_text: `CASE WHEN bypass THEN true ELSE cardinality('{"{-1}"}'::text::literal_group[])>0 END`,
      literal_before_operator: `1/0+cardinality('{"{bad}"}'::literal_group[])>0`,
      width_literal: `CASE WHEN true THEN true ELSE cardinality('{"{abc}"}'::literal_short_group[])>0 END`,
      preparation_before_input: `CASE WHEN true THEN true ELSE cardinality('{bad}'::literal_broken_group[])>0 END`,
    }
    const plans = Object.entries(forms).map(([name, sql]) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
        )!.expression,
      ),
    }))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const bypass of [false, true])
      for (const [name, sql] of Object.entries(forms)) {
        let outcome: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${sql} AS value FROM (SELECT $1::boolean bypass) candidate`,
              [bypass],
            )
          ).rows[0]!.value
          outcome = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          outcome = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        fixtures.push({
          name,
          row: { bypass: { kind: 'Value', value: bypass } },
          expected: outcome,
        })
      }
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await runCheckParity(
      directory,
      'nesteddomainliterals',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
    const expression = portableCheckAtoms(
      lowerTableCheck(
        table,
        {
          name: 'context',
          type: 'check',
          definition:
            'CHECK(CASE WHEN bypass THEN true ELSE payload::literal_group[] IS NOT NULL END)',
        },
        catalog.enums,
        catalog.domains,
        'source',
      )!.expression,
    )
    const contextGroup = prepareCheckRustGroup(
      [
        {
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'context' },
          expression,
        },
      ],
      { defaultCollation: 'C', serverEncoding: 'UTF8' },
    )
    const contextDirectory = join(directory, 'context')
    await mkdir(contextDirectory)
    await runCheckParity(
      contextDirectory,
      'nesteddomainnullcontext',
      contextGroup,
      ['context'],
      [
        {
          name: 'context',
          row: {
            payload: { kind: 'Value', value: '{NULL}' },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'Unknown' },
        },
        {
          name: 'context',
          row: {
            payload: { kind: 'Value', value: '{"{1}"}' },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'True' },
        },
        {
          name: 'context',
          row: { payload: { kind: 'Value', value: '{}' }, bypass: { kind: 'Value', value: false } },
          expected: { kind: 'True' },
        },
        {
          name: 'context',
          row: { payload: { kind: 'Unknown' }, bypass: { kind: 'Value', value: true } },
          expected: { kind: 'True' },
        },
      ],
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)

it('carries declared JSONB input encoding through recursive domain array parsers', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-jsonb-domain-input-'))
  try {
    await pg.exec(`CREATE DOMAIN document_group AS jsonb[];
      CREATE DOMAIN document_batch AS document_group[];
      CREATE TABLE document_imports(payload text,bypass boolean,CONSTRAINT imported CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::document_batch[])=1 END))`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'document_imports')!
    const expression = portableCheckAtoms(
      lowerTableCheck(
        table,
        table.constraints.find((item) => item.name === 'imported')!,
        catalog.enums,
        catalog.domains,
        'stored',
      )!.expression,
    )
    expect(hasUncertain(expression)).toBe(false)
    const arrayText = (values: readonly string[]) =>
      '{' +
      values
        .map((value) => '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"')
        .join(',') +
      '}'
    const sources: string[] = []
    for (const document of ['{"key":"value"}', '{"key":"雪"}', String.raw`{"key":"\u96ea"}`]) {
      const source = arrayText([arrayText([arrayText([document])])])
      sources.push(source)
      await pg.query('INSERT INTO document_imports VALUES($1,false)', [source])
    }
    for (const utf8 of [false, true]) {
      const group = prepareCheckRustGroup(
        [
          {
            identity: {
              schema: 'public',
              kind: 'table',
              owner: table.name,
              constraint: 'imported',
            },
            expression,
          },
        ],
        {
          defaultCollation: 'C',
          arrayNulls: true,
          ...(utf8 ? { serverEncoding: 'UTF8' as const } : {}),
        },
      )
      const batch = join(directory, utf8 ? 'utf8' : 'missing')
      await mkdir(batch)
      const fixtures: { name: string; row: Row; expected: Outcome }[] = sources.map(
        (payload, index) => ({
          name: 'imported',
          row: {
            payload: { kind: 'Value', value: payload },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: index === 2 && !utf8 ? 'Unknown' : 'True' },
        }),
      )
      fixtures.push({
        name: 'imported',
        row: { payload: { kind: 'Unknown' }, bypass: { kind: 'Value', value: true } },
        expected: { kind: 'True' },
      })
      await runCheckParity(batch, 'nesteddomainjsonb' + utf8, group, ['imported'], fixtures)
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
