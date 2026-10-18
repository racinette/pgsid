import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { constantScalarExpression } from '../../src/codegen/shared/check-rust-constants.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
const known = (value: number | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
it('keeps quantifier value uncertainty separate from eager argument validity and reached comparison errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-quantifier-state-'))
  try {
    await mkdir('artifacts/goal-checks/array-quantifier', { recursive: true })
    const forms = {
      empty_any: 'quantity=ANY(ARRAY[]::integer[])',
      empty_all: 'quantity=ALL(ARRAY[]::integer[])',
      null_array: 'quantity=ANY(NULL::integer[])',
      unknown_array: 'quantity=ALL(values)',
      recover_any: 'quantity=ANY(ARRAY[divisor,quantity])',
      recover_all: 'quantity=ALL(ARRAY[divisor,quantity+1])',
      null_cells: 'quantity=ANY(ARRAY[NULL]::integer[])',
      unsafe_empty: 'quantity/divisor=ANY(ARRAY[]::integer[])',
      unsafe_null: 'quantity/divisor=ALL(NULL::integer[])',
      unsafe_array: 'NULL::integer=ANY(ARRAY[quantity/divisor])',
      wrapped: 'cardinality(ARRAY[quantity=ANY(ARRAY[divisor])])=1',
      wrapped_unsafe: 'cardinality(ARRAY[quantity/divisor=ANY(ARRAY[]::integer[])])=1',
      regex_before: "'a' COLLATE \"C\" ~ ANY(ARRAY[pattern,'a'])",
      regex_after: "'a' COLLATE \"C\" ~ ANY(ARRAY['a',pattern])",
      regex_wrapped: "cardinality(ARRAY['a' COLLATE \"C\" ~ ANY(ARRAY[pattern,'a'])])=1",
      lazy: 'CASE WHEN bypass THEN true ELSE quantity=ANY(ARRAY[quantity/divisor]) END',
      stable: "'cat' @@ ANY(ARRAY['cat'])",
      stable_lazy: "CASE WHEN bypass THEN true ELSE 'cat' @@ ANY(ARRAY['cat']) END",
    }
    await pg.exec(
      'CREATE TABLE quantifier_state(quantity integer,divisor integer,pattern text,values integer[],bypass boolean)',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE quantifier_state ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'quantifier_state')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: lowerTableCheck(
          table,
          origin === 'source'
            ? { name, type: 'check', definition: `CHECK(${sql})` }
            : table.constraints.find((c) => c.name === name)!,
          [],
          [],
          origin,
        )!.expression,
      })),
    )
    for (const p of plans) expect(hasUncertain(p.expression), p.identity.constraint).toBe(false)
    const stable = plans.find((p) => p.identity.constraint === 'stable_source')!.expression
    expect(stable.kind).toBe('eval-scalar')
    if (stable.kind === 'eval-scalar' && stable.expression.kind === 'array-quantifier') {
      expect(builtinMetadata(stable.expression.comparison.signature!).volatility).toBe('s')
      expect(constantScalarExpression(stable.expression)).toBe(false)
    } else throw new Error('Expected a stable array quantifier')
    await pg.exec(
      'CREATE TABLE stable_oracle(bypass boolean);INSERT INTO stable_oracle VALUES(true)',
    )
    expect(
      (await pg.query<{ value: boolean }>(`SELECT (${forms.stable_lazy}) value FROM stable_oracle`))
        .rows[0]!.value,
    ).toBe(true)
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const base: Row = {
      quantity: known(1),
      divisor: known(1),
      pattern: known('a'),
      values: { kind: 'Unknown' },
      bypass: known(false),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    add('stable', base, { kind: 'Unknown' })
    add('stable_lazy', { ...base, bypass: known(true) }, { kind: 'True' })
    add('stable_lazy', base, { kind: 'Unknown' })
    for (const state of [{ kind: 'Unknown' } as const, { kind: 'Null' } as const, error('22003')]) {
      const row = { ...base, quantity: state }
      add('empty_any', row, state.kind === 'Error' ? state : { kind: 'False' })
      add('empty_all', row, state.kind === 'Error' ? state : { kind: 'True' })
      add('null_array', row, state.kind === 'Error' ? state : { kind: 'Null' })
      add('unknown_array', row, state.kind === 'Error' ? state : { kind: 'Unknown' })
      add(
        'unknown_array',
        { ...row, values: { kind: 'Null' } },
        state.kind === 'Error' ? state : { kind: 'Null' },
      )
      add(
        'unknown_array',
        { ...row, values: error('22P02') },
        state.kind === 'Error' ? state : error('22P02'),
      )
      add(
        'recover_any',
        { ...base, divisor: state },
        state.kind === 'Error' ? state : { kind: 'True' },
      )
      add(
        'recover_all',
        { ...base, divisor: state },
        state.kind === 'Error' ? state : { kind: 'False' },
      )
      add('null_cells', row, state.kind === 'Error' ? state : { kind: 'Null' })
      add('wrapped', { ...base, divisor: state }, state.kind === 'Error' ? state : { kind: 'True' })
      add(
        'unsafe_empty',
        { ...base, divisor: state },
        state.kind === 'Error'
          ? state
          : state.kind === 'Null'
            ? { kind: 'False' }
            : { kind: 'Unknown' },
      )
      add(
        'unsafe_null',
        { ...base, divisor: state },
        state.kind === 'Error'
          ? state
          : state.kind === 'Null'
            ? { kind: 'Null' }
            : { kind: 'Unknown' },
      )
      add(
        'unsafe_array',
        { ...base, divisor: state },
        state.kind === 'Error'
          ? state
          : state.kind === 'Null'
            ? { kind: 'Null' }
            : { kind: 'Unknown' },
      )
      add(
        'wrapped_unsafe',
        { ...base, divisor: state },
        state.kind === 'Error'
          ? state
          : state.kind === 'Null'
            ? { kind: 'True' }
            : { kind: 'Unknown' },
      )
      add('lazy', { ...base, divisor: state, bypass: known(true) }, { kind: 'True' })
    }
    for (const name of ['unsafe_empty', 'unsafe_null', 'unsafe_array', 'wrapped_unsafe'])
      add(name, { ...base, divisor: known(0) }, error('22012'))
    for (const state of [
      { kind: 'Unknown' } as const,
      known('['),
      { kind: 'Null' } as const,
      error('22003'),
    ]) {
      for (const name of ['regex_before', 'regex_wrapped'])
        add(
          name,
          { ...base, pattern: state },
          state.kind === 'Error'
            ? state
            : state.kind === 'Null'
              ? { kind: 'True' }
              : state.kind === 'Unknown'
                ? { kind: 'Unknown' }
                : error('2201B'),
        )
      add(
        'regex_after',
        { ...base, pattern: state },
        state.kind === 'Error' ? state : { kind: 'True' },
      )
    }
    await runCheckParity(
      directory,
      'arrayquantifierstate',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-quantifier/state-measurements.json',
      JSON.stringify({ fixtures: fixtures.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
