import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'

it('retains source collation on functional name casts and rejects unsupported ordering or explicit conflicts', () => {
  for (const typeName of ['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar']) {
    const c = [
        {
          name: 'value',
          typeName,
          collationIsC: true,
          collationDeterministic: true,
          collationIsDefault: false,
        },
      ],
      other = [{ ...c[0]!, collationIsC: false, collationOid: 51001 }]
    for (const operation of ['=', '<', 'IS NOT DISTINCT FROM'])
      expect(
        bindProbe(`value::name ${operation} value::name`, c).fullyBound,
        typeName + ' ' + operation,
      ).toBe(true)
    expect(bindProbe('value::name<value::name', other).fullyBound).toBe(false)
    expect(
      bindProbe('(value COLLATE "C")::name=(value COLLATE "ucs_basic")::name', c).fullyBound,
    ).toBe(false)
    expect(
      bindProbe('((value COLLATE "ucs_basic")::name COLLATE "C")<value::name', c).fullyBound,
    ).toBe(true)
  }
})
