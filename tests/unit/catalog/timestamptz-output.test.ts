import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'
import { checkUnknownMessage } from '../../../src/codegen/shared/check-diagnostics.js'
import { builtinMetadata, builtinTypeIO } from '../../../src/postgres/builtins/inventory.js'
import { constantScalarExpression } from '../../../src/codegen/shared/check-rust-constants.js'
import { calendarOutputRequirements } from '../../../scripts/check-measurements/catalog.js'

it('keeps timestamptz formatting stable and separates SQL DateStyle from shared SQL/JSON timezone requirements', () => {
  const type = 'pg_catalog.timestamptz',
    output = builtinTypeIO(type)!.output!,
    metadata = builtinMetadata(output)
  expect(metadata.volatility).toBe('s')
  expect(
    constantScalarExpression({
      kind: 'io-to-text',
      type: 'pg_catalog.text',
      output,
      operand: {
        kind: 'certain',
        expression: { kind: 'temporal', type, value: '2000-01-01T00:00:00Z' },
      },
    }),
  ).toBe(false)
  expect(calendarOutputRequirements(metadata)?.map((r) => r.setting)).toEqual([
    'DateStyle',
    'TimeZone',
  ])
  const columns = [
    { name: 'value', typeName: type },
    { name: 'expected', typeName: 'pg_catalog.text' },
  ]
  for (const sql of [
    'value::text COLLATE "C"=expected COLLATE "C"',
    'ARRAY[value]::text COLLATE "C"=expected COLLATE "C"',
    'tstzrange(value,value,\'[]\')::text COLLATE "C"=expected COLLATE "C"',
  ]) {
    const probe = bindProbe(sql, columns)
    expect(probe.fullyBound, sql).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.timeZone')
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.dateStyle')
    expect(
      checkUnknownMessage(probe.expression, undefined, {
        timeZone: 'UTC',
        dateStyle: { format: 'ISO', order: 'MDY' },
      }),
    ).not.toMatch(/checks\.(?:timeZone|dateStyle)/u)
  }
  for (const sql of ['to_jsonb(value) IS NOT NULL', 'to_jsonb(ARRAY[value]) IS NOT NULL']) {
    const probe = bindProbe(sql, columns)
    expect(probe.fullyBound, sql).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.timeZone')
    expect(checkUnknownMessage(probe.expression)).not.toContain('sql.codegen.checks.dateStyle')
  }
})
