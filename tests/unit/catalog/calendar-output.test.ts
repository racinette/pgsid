import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'
import { checkUnknownMessage } from '../../../src/codegen/shared/check-diagnostics.js'
import { builtinTypeIO, builtinMetadata } from '../../../src/postgres/builtins/inventory.js'
import { constantScalarExpression } from '../../../src/codegen/shared/check-rust-constants.js'

it('retains stable calendar output preparation and reports SQL formatting independently of JSON', () => {
  for (const type of ['pg_catalog.date', 'pg_catalog."timestamp"'] as const) {
    const output = builtinTypeIO(type)!.output!
    expect(builtinMetadata(output).volatility).toBe('s')
    expect(
      constantScalarExpression({
        kind: 'io-to-text',
        type: 'pg_catalog.text',
        output,
        operand: { kind: 'certain', expression: { kind: 'temporal', type, value: '2001-02-03' } },
      }),
    ).toBe(false)
    const columns = [
      { name: 'value', typeName: type },
      { name: 'expected', typeName: 'pg_catalog.text' },
    ]
    for (const sql of [
      'value::text COLLATE "C"=expected COLLATE "C"',
      'ARRAY[value]::text COLLATE "C"=expected COLLATE "C"',
    ]) {
      const probe = bindProbe(sql, columns)
      expect(probe.fullyBound, sql).toBe(true)
      expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.dateStyle')
      expect(
        checkUnknownMessage(probe.expression, undefined, {
          dateStyle: { format: 'ISO', order: 'MDY' },
        }),
      ).not.toContain('sql.codegen.checks.dateStyle')
    }
    expect(
      checkUnknownMessage(bindProbe('to_jsonb(value) IS NOT NULL', columns).expression),
    ).not.toContain('sql.codegen.checks.dateStyle')
  }
})
