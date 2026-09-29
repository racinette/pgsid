import { describe, expect, it } from 'vitest'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import {
  assertUniqueRustCallableNames,
  rustCallableName,
} from '../../src/postgres/builtins/rust-name.js'

describe('Rust callable names', () => {
  it('resolves an operator and its function call to the same implementation', () => {
    const operator = builtinMetadata('operator:["pg_catalog",">"](pg_catalog.int4,pg_catalog.int4)')
    const fn = builtinMetadata('function:["pg_catalog","int4gt"](pg_catalog.int4,pg_catalog.int4)')
    expect(operator.kind).toBe('operator')
    expect(fn.kind).toBe('function')
    if (operator.kind !== 'operator' || fn.kind !== 'function') return
    expect(operator.implementation).toBe(
      'function:["pg_catalog","int4gt"](pg_catalog.int4,pg_catalog.int4)',
    )
    expect(fn.rustName).toBe('sql__pg_catalog__int4gt__5vlv')
    expect(fn.rustName).toBe(rustCallableName({ schema: fn.schema, name: fn.name, args: fn.args }))
  })

  it('keeps overloads stable and rejects a truncated-hash collision', () => {
    const base = { schema: 'pg_catalog', name: 'collision_probe' }
    const first = { ...base, args: ['pg_catalog.t732'] }
    const second = { ...base, args: ['pg_catalog.t2447'] }
    expect(rustCallableName(first)).toBe(rustCallableName(second))
    expect(() => assertUniqueRustCallableNames([first, second])).toThrow(/collision/u)
    const int4 = {
      schema: 'pg_catalog',
      name: 'int4gt',
      args: ['pg_catalog.int4', 'pg_catalog.int4'],
    }
    const int8 = {
      schema: 'pg_catalog',
      name: 'int4gt',
      args: ['pg_catalog.int4', 'pg_catalog.int8'],
    }
    expect(rustCallableName(int4)).not.toBe(rustCallableName(int8))
  })
})
