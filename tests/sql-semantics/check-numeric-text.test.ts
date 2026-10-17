import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('prepares invalid typed numeric literals before pruning and ordinary constant-expression errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-text-literals-'))
  try {
    await pg.exec('CREATE TABLE numeric_literals(bypass boolean)')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'numeric_literals')!
    const forms = {
      plain: "'bad'::numeric = 0",
      guarded: "CASE WHEN bypass THEN true ELSE 'bad'::numeric = 0 END",
      pruned: "CASE WHEN true THEN true ELSE 'bad'::numeric = 0 END",
      coalesce: "COALESCE(1::numeric,'bad'::numeric) = 1",
      strict_null: "NULL::numeric + 'bad'::numeric IS NULL",
      source_order: "json_build_array(1/0,'bad'::numeric) IS NULL",
      overflow: "CASE WHEN true THEN true ELSE '1e131072'::numeric = 0 END",
      scale_overflow: "CASE WHEN true THEN true ELSE '1e-16384'::numeric = 0 END",
      modifier: "CASE WHEN true THEN true ELSE 'bad'::numeric(4,1) = 0 END",
    }
    const plans = Object.entries(forms).map(([name, sql]) => ({
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
    const group = prepareCheckRustGroup(plans, context)
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(forms)) {
      let expected: Outcome
      try {
        await pg.query(`SELECT (${sql}) value FROM (SELECT true bypass) q`)
        throw new Error('Typed numeric input unexpectedly accepted')
      } catch (cause) {
        const code = (cause as { code: string }).code
        expect(code).toBe(name.includes('overflow') ? '22003' : '22P02')
        expected = error(code)
      }
      references.push({ name, sql, expected })
      fixtures.push({ name, row: { bypass: known(true) }, expected })
    }
    await mkdir('artifacts/numeric-text-input', { recursive: true })
    await writeFile(
      'artifacts/numeric-text-input/literal-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/numeric-text-input/literal-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'numerictextliterals',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('resolves numeric text I/O, modifiers, domains, literals and scalar/array/JSON composition against PostgreSQL in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-text-values-'))
  try {
    await pg.exec(
      'CREATE DOMAIN import_source AS text; CREATE DOMAIN import_source_chain AS import_source; CREATE DOMAIN import_varying AS varchar; CREATE DOMAIN import_padded AS pg_catalog.bpchar; CREATE DOMAIN import_named AS name; CREATE DOMAIN import_amount AS numeric; CREATE DOMAIN import_amount_chain AS import_amount; CREATE TABLE numeric_imports(source text,named name,other text,divisor integer,bypass boolean,expected text); CREATE TABLE numeric_oracle(LIKE numeric_imports)',
    )
    const outputs: Record<string, string> = {
      plain: '(source::numeric)::text',
      function: 'pg_catalog.numeric(source)::text',
      output_function: 'pg_catalog.text(source::numeric)',
      varying: '(source::varchar)::numeric::text',
      padded: '(source::char(80))::numeric::text',
      named: 'named::numeric::text',
      name_cast: '(source::name)::numeric::text',
      domain_source: '(source::import_source)::numeric::text',
      domain_source_chain: '(source::import_source_chain)::numeric::text',
      domain_varying: '(source::import_varying)::numeric::text',
      domain_padded: '(source::import_padded)::numeric::text',
      domain_named: '(named::import_named)::numeric::text',
      domain_target: '(source::import_amount_chain)::text',
      precision: 'source::numeric(6,2)::text',
      negative_scale: 'source::numeric(3,-2)::text',
      fractional: 'source::numeric(3,5)::text',
      default_scale: 'source::numeric(4)::text',
      wire: "encode(numeric_send(source::numeric),'hex')",
      scale: 'scale(source::numeric)::text',
      arithmetic: '((source::numeric+1.25::numeric)/2)::text',
      array: 'array_to_json(ARRAY[source::numeric,other::numeric,NULL])::text',
      nested:
        'array_to_json(ARRAY[ARRAY[source::numeric,other::numeric],ARRAY[0::numeric,NULL::numeric]])::text',
      json: 'json_build_array(source::numeric,other::numeric)::text',
      jsonb: 'jsonb_build_array(source::numeric,other::numeric)::text',
      coalesce: 'COALESCE(source::numeric,other::numeric)::text',
      guarded: 'CASE WHEN bypass THEN expected ELSE source::numeric::text END',
      eager: '(source::numeric+(1/divisor)::numeric)::text',
      json_eager: 'json_build_array(source::numeric,1/divisor)::text',
      output_width: 'source::numeric::varchar(3)',
    }
    const literals = [
      '0x_FF',
      '-0b10_1',
      '0o7_7',
      '1_2.3_400',
      '000.00100',
      '-0.000',
      '+Inf',
      '-Infinity',
      'NaN',
      '1.e2',
      '.5e1',
    ]
    for (const [index, literal] of literals.entries())
      outputs['literal_' + index] = `'${literal}'::numeric::text`
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE numeric_imports ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'numeric_imports')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const payloads = [
      null,
      '',
      ' ',
      '0',
      '-0.0000',
      '+0',
      '000123.4500',
      ' \t+42.00100\r\n',
      '.5',
      '1.',
      '1.e2',
      '.5e1',
      '1e-5',
      '1e+5',
      '1_2.3_4',
      '1e1_0',
      '0x_FF',
      '-0Xabcdef',
      '0o7_7',
      '-0b10_1',
      'NaN',
      'nan',
      '+NaN',
      '-NaN',
      'inf',
      '+Inf',
      '-Infinity',
      ' Infinity ',
      'Infinityx',
      '0x',
      '0x__ff',
      '0b2',
      '0o8',
      '_1',
      '1_',
      '1__2',
      '1_.2',
      '1._2',
      '1e',
      '1e+',
      '1e_2',
      '.',
      '+ 1',
      '1 2',
      '--1',
      '1.2.3',
      '1e999999999x',
      '1e999999999999',
      '0e-999999999',
      '1e131072',
      '1e-16384',
      '99.9995',
      '-99.9995',
      '9999.995',
      '-9999.995',
      '149.5',
      '150',
      '-150',
      '0.000995',
      '999999999999999999999999999999.0012300',
      '雪',
      '１２',
      '1\u00a0',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const source of payloads)
      for (const divisor of [0, 1]) {
        await pg.exec('TRUNCATE numeric_oracle')
        const named = (
          await pg.query<{ named: string | null }>(
            'INSERT INTO numeric_oracle VALUES($1,$1::text::name,$2,$3,false,NULL) RETURNING named::text named',
            [source, '2.500', divisor],
          )
        ).rows[0]!.named
        for (const [name, sql] of Object.entries(outputs)) {
          let output: string | null = null,
            expected: Outcome
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql})::text value FROM numeric_oracle`,
              )
            ).rows[0]!.value
            await pg.query('UPDATE numeric_oracle SET expected=$1', [output])
            expect(
              (
                await pg.query<{ value: boolean }>(
                  `SELECT ${forms[name]} value FROM numeric_oracle`,
                )
              ).rows[0]!.value,
            ).toBe(true)
            expected = { kind: 'True' }
          } catch (cause) {
            const code = (cause as { code: string }).code
            expect(['22P02', '22003', '22012']).toContain(code)
            expected = error(code)
          }
          const row: Row = {
            source: known(source),
            named: known(named),
            other: known('2.500'),
            divisor: known(divisor),
            bypass: known(false),
            expected: known(output),
          }
          const deferred = name === 'name_cast' && source !== null && source !== ''
          references.push({ name, source, named, divisor, output, expected, deferred })
          for (const origin of ['source', 'stored']) {
            fixtures.push({
              name: name + '_' + origin,
              row,
              expected: deferred ? { kind: 'Unknown' } : expected,
            })
            if (expected.kind === 'True')
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, expected: known('wrong') },
                expected: deferred ? { kind: 'Unknown' } : { kind: 'False' },
              })
          }
        }
      }
    await mkdir('artifacts/numeric-text-input', { recursive: true })
    await writeFile(
      'artifacts/numeric-text-input/values-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/numeric-text-input/values-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'numerictextvalues',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('preserves numeric I/O NULL, partial states, source errors, runtime laziness and constant preparation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-text-context-'))
  try {
    await pg.exec(
      'CREATE TABLE numeric_context(source text,other text,divisor integer,bypass boolean,expected text);CREATE TABLE numeric_context_oracle(LIKE numeric_context)',
    )
    const outputs = {
      plain: 'source::numeric::text',
      precision: 'source::numeric(4,1)::text',
      coalesce: 'COALESCE(source::numeric,other::numeric)::text',
      guarded: 'CASE WHEN bypass THEN expected ELSE source::numeric::text END',
      eager: 'json_build_array(source::numeric,1/divisor)::text',
      prepared: "CASE WHEN bypass THEN expected ELSE ('bad'::text)::numeric::text END",
      pruned: "CASE WHEN true THEN expected ELSE ('bad'::text)::numeric::text END",
      strict_null: 'NULL::numeric::text',
      prepared_null: "json_build_array(NULL::numeric,('bad'::text)::numeric)::text",
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE numeric_context ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'numeric_context')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            [],
            [],
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const base: Row = {
      source: known('12.3400'),
      other: known('bad'),
      divisor: known(1),
      bypass: known(false),
      expected: known('12.3400'),
    }
    add('plain', { ...base, source: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('precision', { ...base, source: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add(
      'plain',
      { ...base, source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
      error('22012'),
    )
    add('plain', { ...base, source: known(null), expected: known(null) }, { kind: 'True' })
    add(
      'coalesce',
      { ...base, other: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
      { kind: 'True' },
    )
    add('coalesce', { ...base, source: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('coalesce', { ...base, source: known(null) }, error('22P02'))
    add(
      'guarded',
      {
        ...base,
        source: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        bypass: known(true),
      },
      { kind: 'True' },
    )
    add('eager', { ...base, source: { kind: 'Unknown' }, divisor: known(0) }, error('22012'))
    add('eager', { ...base, source: known('bad'), divisor: known(0) }, error('22P02'))
    add('prepared', { ...base, bypass: known(true) }, error('22P02'))
    add('pruned', { ...base, bypass: known(false) }, { kind: 'True' })
    add('strict_null', { expected: known(null) }, { kind: 'True' })
    add('prepared_null', base, error('22P02'))
    for (const source of ['12.3400', 'bad', null])
      for (const bypass of [false, true]) {
        await pg.exec('TRUNCATE numeric_context_oracle')
        await pg.query('INSERT INTO numeric_context_oracle VALUES($1,$2,0,$3,$4)', [
          source,
          'bad',
          bypass,
          source,
        ])
        for (const [name, sql] of Object.entries(forms)) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ value: boolean }>(`SELECT ${sql} value FROM numeric_context_oracle`)
            ).rows[0]!.value
            expected = { kind: result ? 'True' : 'False' }
          } catch (cause) {
            expected = error((cause as { code: string }).code)
          }
          const row = {
            source: known(source),
            other: known('bad'),
            divisor: known(0),
            bypass: known(bypass),
            expected: known(source),
          }
          references.push({ name, source, bypass, expected })
          add(name, row, expected)
        }
      }
    await mkdir('artifacts/numeric-text-input', { recursive: true })
    await writeFile(
      'artifacts/numeric-text-input/context-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/numeric-text-input/context-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'numerictextcontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
