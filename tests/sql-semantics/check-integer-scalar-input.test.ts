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
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { integerInputForms, invalidIntegerInputForms } from './check-integer-input-forms.js'

const known = (value: string | number | boolean | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('admits integer scalar I/O through actual catalog identities with width, syntax, character payloads, domains and array composition', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-integer-scalar-input-'))
  try {
    await pg.exec(
      'CREATE DOMAIN input_int AS integer;CREATE TABLE integer_input_values(payload text,code_varchar varchar,code_bpchar char(32),code_name name,divisor integer,bypass boolean,expected bigint);CREATE TABLE integer_input_oracle(LIKE integer_input_values)',
    )
    const forms: Record<string, string> = {},
      outputs: Record<string, string> = {}
    for (const type of ['int2', 'int4', 'int8']) {
      for (const source of ['payload', 'code_varchar', 'code_bpchar', 'code_name']) {
        const name = type + '_' + source,
          value = `${source}::${type}`
        outputs[name] = value
        forms[name] = `${value} IS NOT DISTINCT FROM expected`
      }
      const value = `payload::${type}`
      for (const [mode, sql] of Object.entries({
        roundtrip: `((${value})::text)::${type}`,
        coalesce: `COALESCE(${value},0::${type})`,
        ordered: `(${value})+(1/divisor)`,
      })) {
        const name = type + '_' + mode
        outputs[name] = sql
        forms[name] = `${sql} IS NOT DISTINCT FROM expected`
      }
      forms[type + '_constructor'] = `cardinality(ARRAY[${value}])=1`
      forms[type + '_empty_fill'] = `cardinality(array_fill(${value},ARRAY[0]))=0`
      forms[type + '_lazy'] =
        `CASE WHEN bypass THEN true ELSE ${value} IS NOT DISTINCT FROM expected END`
      forms[type + '_prepared'] =
        `CASE WHEN bypass THEN true ELSE ('bad'::text)::${type} IS NULL END`
      forms[type + '_pruned'] = `CASE WHEN true THEN true ELSE ('bad'::text)::${type} IS NULL END`
    }
    outputs.domain = 'payload::input_int'
    forms.domain = 'payload::input_int IS NOT DISTINCT FROM expected'
    outputs.implicit_literal = "divisor+'0x_10'"
    forms.implicit_literal = "divisor+'0x_10' IS NOT DISTINCT FROM expected"
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE integer_input_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'integer_input_values')!
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
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        plans[i]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const samples: (string | null)[] = [
      ...integerInputForms,
      ...invalidIntegerInputForms,
      '32767',
      '32768',
      '32769',
      '-32768',
      '-32769',
      '32768x',
      '32769x',
      '327690x',
      '2147483647',
      '2147483648',
      '2147483649',
      '-2147483648',
      '-2147483649',
      '9223372036854775807',
      '9223372036854775808',
      '9223372036854775809',
      '-9223372036854775808',
      '-9223372036854775809',
      '9223372036854775808x',
      '9223372036854775809x',
      '92233720368547758090x',
      '0x8000000000000000',
      '-0x8000000000000000',
      '0x8000000000000001x',
      '0b' + '1'.repeat(65),
      '0o' + '7'.repeat(24),
      '9'.repeat(100),
      null,
    ]
    for (const [name, sql] of Object.entries(forms)) {
      const selected =
        name.endsWith('_prepared') || name.endsWith('_pruned') || name === 'implicit_literal'
          ? ['bad']
          : samples
      for (const payload of selected)
        for (const divisor of name.endsWith('_ordered') ? [0, 1] : [1])
          for (const bypass of name.endsWith('_lazy') ? [false, true] : [false]) {
            await pg.exec('TRUNCATE integer_input_oracle')
            await pg.query(
              'INSERT INTO integer_input_oracle(payload,code_varchar,code_bpchar,code_name,divisor,bypass) VALUES($1::text,$1::text,($1::text)::char(32),($1::text)::name,$2,$3)',
              [payload, divisor, bypass],
            )
            const coerced = (
              await pg.query<{
                code_varchar: string | null
                code_bpchar: string | null
                code_name: string | null
              }>('SELECT code_varchar,code_bpchar,code_name FROM integer_input_oracle')
            ).rows[0]!
            let text: string | null = null
            try {
              text = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${outputs[name] ?? 'payload::' + name.split('_')[0]})::text value FROM integer_input_oracle`,
                )
              ).rows[0]!.value
            } catch {}
            await pg.query('UPDATE integer_input_oracle SET expected=$1::bigint', [text])
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${sql} value FROM integer_input_oracle`,
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              expected = failure((error as { code: string }).code)
            }
            add(
              name,
              {
                payload: known(payload),
                code_varchar: known(coerced.code_varchar),
                code_bpchar: known(coerced.code_bpchar),
                code_name: known(coerced.code_name),
                divisor: known(divisor),
                bypass: known(bypass),
                expected: known(text === null ? null : BigInt(text)),
              },
              expected,
            )
            observations.push({ name, payload, ...coerced, divisor, bypass, text, expected })
          }
    }
    for (const type of ['int2', 'int4', 'int8']) {
      for (const mode of ['payload', 'constructor', 'empty_fill']) {
        const name = type + '_' + mode
        add(name, { payload: { kind: 'Unknown' }, expected: { kind: 'Null' } }, { kind: 'Unknown' })
        add(
          name,
          {
            payload: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            expected: { kind: 'Null' },
          },
          failure('22012'),
        )
      }
      add(
        type + '_ordered',
        { payload: { kind: 'Unknown' }, divisor: known(0), expected: { kind: 'Null' } },
        { kind: 'Unknown' },
      )
      add(
        type + '_lazy',
        { payload: { kind: 'Unknown' }, bypass: known(true), expected: { kind: 'Null' } },
        { kind: 'True' },
      )
    }
    await mkdir('artifacts/goal-checks/integer-scalar-input', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/integer-scalar-input/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'integerscalarinput',
      group,
      Object.keys(forms).flatMap((name) =>
        ['source', 'stored'].map((origin) => name + '_' + origin),
      ),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/integer-scalar-input/measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
          handledForms: integerInputForms.length,
          rejectedForms: invalidIntegerInputForms.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('prepares integer type literals before lazy branches while retaining pruning of runtime text casts', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-integer-literal-input-'))
  try {
    await pg.exec(
      'CREATE TABLE integer_literal_host(payload text);INSERT INTO integer_literal_host VALUES(NULL)',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    const forms: Record<string, string> = {
      invalid_literal: "CASE WHEN true THEN true ELSE INTEGER 'bad'=0 END",
      range_literal: "CASE WHEN true THEN true ELSE SMALLINT '32768'=0 END",
      valid_literal: "SMALLINT '0x_7fff'=32767",
      implicit_invalid_literal: "CASE WHEN true THEN true ELSE 1+'bad'=0 END",
      pruned_runtime: "CASE WHEN true THEN true ELSE ('bad'::text)::integer=0 END",
      lazy_runtime: 'CASE WHEN payload IS NULL THEN true ELSE payload::integer=0 END',
      coalesce_literal: "COALESCE(1,INTEGER 'bad')=1",
      coalesce_runtime: "COALESCE(1,('bad'::text)::integer)=1",
      minmax_literal: "GREATEST(1,'1.5') IS NULL",
      prepared_runtime: "CASE WHEN payload IS NULL THEN true ELSE ('bad'::text)::integer=0 END",
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
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [name, sql] of Object.entries(forms)) {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM integer_literal_host`)
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expected = failure((error as { code: string }).code)
      }
      fixtures.push({ name, row: { payload: known(null) }, expected })
    }
    await runCheckParity(directory, 'integerliteralinput', group, Object.keys(forms), fixtures)
    await mkdir('artifacts/goal-checks/integer-scalar-input', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/integer-scalar-input/literal-measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          outcomes: fixtures.map((f) => ({ name: f.name, expected: f.expected })),
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
