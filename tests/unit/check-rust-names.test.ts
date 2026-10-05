import { describe, expect, it } from 'vitest'
import {
  assertUniqueCheckEntryNames,
  checkRustEntryName,
  type CheckConstraintIdentity,
} from '../../src/codegen/shared/check-rust-names.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'

const identity: CheckConstraintIdentity = {
  schema: 'public',
  kind: 'table',
  owner: 'orders',
  constraint: 'amount_positive',
}
const expression: EvalBoolExpression = {
  kind: 'certain',
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
}

const names = (constraints: Parameters<typeof prepareCheckRustGroup>[0]): string[] =>
  prepareCheckRustGroup(constraints).checks.flatMap((check) =>
    check.kind === 'supported' ? [check.entryName] : [],
  )

describe('CHECK evaluator identity names', () => {
  it('includes timezone sources only when a bundle calls timezone', () => {
    const withoutZones = assembleCheckRust({ source: '', callables: [] })
    const withZones = assembleCheckRust({
      source: '',
      callables: ['sql__pg_catalog__timezone__9nbk'],
    })
    const sources = (graph: typeof withoutZones) =>
      graph.modules.flatMap((module) => module.files.map((file) => file.path))
    expect(sources(withoutZones).some((path) => path.includes('/timezone'))).toBe(false)
    expect(sources(withZones)).toContain('generated/timezone_tables.rs')
    expect(sources(withZones).filter((path) => path.includes('/timezone'))).toHaveLength(4)
  })
  it('keeps names stable across reordering, additions, and unsupported constraints', () => {
    const first = { identity, expression }
    const second = { identity: { ...identity, constraint: 'amount_bounded' }, expression }
    const unavailable = {
      identity: { ...identity, constraint: 'wide_guard' },
      expression: {
        kind: 'eval-scalar',
        expression: { kind: 'input', type: 'pg_catalog.int8', name: 'wide' },
      } as const,
    }
    expect(names([first, second])).toEqual(names([unavailable, second, first]).reverse())
    expect(names([first])).toEqual([checkRustEntryName(identity)])
    expect(
      names([
        {
          ...first,
          expression: {
            ...expression,
            expression: { kind: 'boolean', type: 'pg_catalog.bool', value: false },
          },
        },
      ]),
    ).toEqual(names([first]))
    expect(checkRustEntryName(identity)).toMatch(
      /^evaluate_check_public_table_orders_amount_positive_h[a-z0-9]{4}$/u,
    )
  })

  it('distinguishes quoted identifiers, tuple boundaries, schemas, and owner kinds', () => {
    const identities: CheckConstraintIdentity[] = [
      identity,
      { ...identity, constraint: 'Amount positive' },
      { ...identity, constraint: 'amount-positive' },
      { ...identity, owner: 'orders_amount', constraint: 'positive' },
      { ...identity, kind: 'domain' },
      { ...identity, schema: 'tenant' },
      { ...identity, schema: '租户', owner: 'Order 😀', constraint: 'CHECK "✓"' },
    ]
    const generated = identities.map(checkRustEntryName)
    expect(new Set(generated).size).toBe(identities.length)
    for (const name of generated) expect(name).toMatch(/^[a-z][a-z0-9_]*$/u)
    expect(() => assertUniqueCheckEntryNames(identities)).not.toThrow()
    expect(() => assertUniqueCheckEntryNames([identity, identity])).toThrow(
      /CHECK evaluator name collision/u,
    )
  })

  it('rejects a short-hash collision before emitting either evaluator', () => {
    const first = { ...identity, constraint: 'collision./  ----' }
    const second = { ...identity, constraint: 'collision/._-.---' }
    expect(checkRustEntryName(first)).toBe(checkRustEntryName(second))
    expect(() =>
      prepareCheckRustGroup([
        { identity: first, expression },
        { identity: second, expression },
      ]),
    ).toThrow(/CHECK evaluator name collision/u)
  })

  it('identifies inherited constraints separately from a domain’s own constraint', () => {
    const own: CheckConstraintIdentity = { ...identity, kind: 'domain' }
    const inherited = { ...own, declaredOn: { schema: 'public', owner: 'base_amount' } }
    expect(checkRustEntryName(inherited)).toMatch(
      /_domain_orders_from_public_base_amount_amount_positive_h/u,
    )
    expect(checkRustEntryName(inherited)).not.toBe(checkRustEntryName(own))
    expect(
      checkRustEntryName({ ...own, declaredOn: { schema: own.schema, owner: own.owner } }),
    ).toBe(checkRustEntryName(own))
    expect(() => assertUniqueCheckEntryNames([own, inherited])).not.toThrow()
  })
})
