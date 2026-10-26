import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'
import { checkUnknownMessage } from '../../../src/codegen/shared/check-diagnostics.js'

it('names missing bytea output context only for dependent rendering paths', () => {
  const columns = [
    { name: 'value', typeName: 'pg_catalog.bytea' },
    { name: 'expected', typeName: 'pg_catalog.text' },
  ]
  for (const sql of [
    'value::text COLLATE "C"=expected COLLATE "C"',
    'ARRAY[value]::text COLLATE "C"=expected COLLATE "C"',
    'to_jsonb(value) IS NOT NULL',
  ]) {
    const probe = bindProbe(sql, columns)
    expect(probe.fullyBound, sql).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.byteaOutput')
    expect(checkUnknownMessage(probe.expression, undefined, { byteaOutput: 'hex' })).not.toContain(
      'sql.codegen.checks.byteaOutput',
    )
  }
  expect(
    checkUnknownMessage(bindProbe("encode(value,'hex')=expected", columns).expression),
  ).not.toContain('sql.codegen.checks.byteaOutput')
})
