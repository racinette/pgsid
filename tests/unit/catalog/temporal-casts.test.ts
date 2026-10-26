import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'
import {
  temporalCastRequirements,
  temporalArithmeticRequirements,
  callableBoundary,
} from '../../../scripts/check-measurements/catalog.js'
import { checkUnknownMessage } from '../../../src/codegen/shared/check-diagnostics.js'
import {
  builtinCallables,
  builtinCast,
  builtinMetadata,
} from '../../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../../src/postgres/builtins/catalog.js'
import {
  isTemporalContextArithmetic,
  isTemporalContextCast,
} from '../../../src/sql-semantics/temporal-casts.js'
import { constantCheckExpression } from '../../../src/codegen/shared/check-rust-constants.js'
import { portableCheckAtoms } from '../../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../../scripts/check-measurements/probes.js'

it('identifies only the selected catalog temporal casts and reports timezone and transaction date requirements', () => {
  const casts = builtinCallables().filter(isTemporalContextCast)
  expect(casts).toHaveLength(7)
  for (const cast of casts) {
    expect(builtinCast(cast.args[0]!, cast.result)?.implementation).toBe(callableIdentity(cast))
    expect(isTemporalContextCast({ ...cast, schema: 'other' })).toBe(false)
    expect(isTemporalContextCast({ ...cast, volatility: 'i' })).toBe(false)
    expect(isTemporalContextCast({ ...cast, strict: false })).toBe(false)
    expect(temporalCastRequirements(cast)?.map((r) => r.setting)).toEqual(
      cast.args[0] === 'pg_catalog."time"' ? ['TimeZone', 'local_date'] : ['TimeZone'],
    )
    const boundary = callableBoundary(cast, new Set([cast.args[0]!, cast.result]))
    expect(boundary.categories).toContain('session-setting:TimeZone')
    const probe = bindProbe(`value::${cast.result} IS NOT NULL`, [
      { name: 'value', typeName: cast.args[0]! },
    ])
    expect(probe.fullyBound, callableIdentity(cast)).toBe(true)
    expect(hasUncertain(portableCheckAtoms(probe.expression))).toBe(false)
    expect(hasUncertain(portableCheckAtoms(probe.expression, false))).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.timeZone')
    expect(checkUnknownMessage(probe.expression, undefined, { timeZone: 'UTC' })).not.toContain(
      'sql.codegen.checks.timeZone',
    )
    expect(checkUnknownMessage(probe.expression).includes('transaction local date')).toBe(
      cast.args[0] === 'pg_catalog."time"',
    )
  }
  expect(
    temporalCastRequirements(
      builtinMetadata('function:["pg_catalog","date"](pg_catalog."timestamp")'),
    ),
  ).toBeNull()
  const probe = bindProbe("(TIMESTAMP '2000-01-01')::timestamptz IS NOT NULL", [])
  expect(probe.fullyBound).toBe(true)
  expect(constantCheckExpression(probe.expression)).toBe(false)
})

it('admits selected stable instant arithmetic with explicit conditional calendar timezone requirements', () => {
  const operations = builtinCallables().filter(isTemporalContextArithmetic)
  expect(operations).toHaveLength(5)
  for (const item of operations) {
    expect(isTemporalContextArithmetic({ ...item, schema: 'other' })).toBe(false)
    expect(isTemporalContextArithmetic({ ...item, volatility: 'i' })).toBe(false)
    expect(temporalArithmeticRequirements(item)).toMatchObject([
      {
        kind: 'session',
        setting: 'TimeZone',
        owner: 'tests/sql-semantics/check-timestamptz-arithmetic.test.ts',
      },
    ])
    expect(callableBoundary(item, new Set(item.args)).categories).toContain(
      'session-setting:TimeZone',
    )
    const columns = item.args.map((typeName, index) => ({ name: 'v' + index, typeName })),
      probe = bindProbe(`pg_catalog.${item.name}(v0,v1) IS NOT NULL`, columns)
    expect(probe.fullyBound, callableIdentity(item)).toBe(true)
    expect(hasUncertain(portableCheckAtoms(probe.expression))).toBe(false)
    expect(hasUncertain(portableCheckAtoms(probe.expression, false))).toBe(true)
    expect(checkUnknownMessage(probe.expression)).toContain('sql.codegen.checks.timeZone')
  }
})
