import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'
import { checkUnknownMessage } from '../../../src/codegen/shared/check-diagnostics.js'
import { builtinTypeIO, builtinMetadata } from '../../../src/postgres/builtins/inventory.js'
import { constantScalarExpression } from '../../../src/codegen/shared/check-rust-constants.js'

it('keeps interval output session-stable and reports missing context through SQL and JSON', () => {
  const output = builtinTypeIO('pg_catalog."interval"')!.output!
  expect(builtinMetadata(output).volatility).toBe('s')
  expect(
    constantScalarExpression({
      kind: 'io-to-text',
      type: 'pg_catalog.text',
      output,
      operand: {
        kind: 'certain',
        expression: { kind: 'temporal', type: 'pg_catalog."interval"', value: 'P1D' },
      },
    }),
  ).toBe(false)
  const columns = [
    { name: 'value', typeName: 'pg_catalog."interval"' },
    { name: 'expected', typeName: 'pg_catalog.text' },
  ]
  for (const sql of [
    'value::text COLLATE "C"=expected COLLATE "C"',
    'ARRAY[value]::text COLLATE "C"=expected COLLATE "C"',
    'to_jsonb(value) IS NOT NULL',
  ]) {
    const probe = bindProbe(sql, columns)
    expect(probe.fullyBound, sql).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.intervalStyle')
    expect(
      checkUnknownMessage(probe.expression, undefined, { intervalStyle: 'postgres' }),
    ).not.toContain('sql.codegen.checks.intervalStyle')
  }
  expect(checkUnknownMessage(bindProbe('value IS NOT NULL', columns).expression)).not.toContain(
    'sql.codegen.checks.intervalStyle',
  )
})

it('reports missing interval input context through scalar and array conversions', () => {
  const columns = [{ name: 'source', typeName: 'pg_catalog.text' }]
  for (const sql of [
    'source::interval IS NOT NULL',
    '(source::interval[])[1] IS NOT NULL',
    'source::interval day to second(3) IS NOT NULL',
  ]) {
    const probe = bindProbe(sql, columns)
    expect(probe.fullyBound, sql).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.intervalStyle')
    expect(
      checkUnknownMessage(probe.expression, undefined, { intervalStyle: 'sql_standard' }),
    ).not.toContain('sql.codegen.checks.intervalStyle')
  }
})
