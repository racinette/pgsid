import { expect, it } from 'vitest'
import { bindProbe } from '../../../scripts/check-measurements/probes.js'
import { builtinMetadata, builtinTypeIO } from '../../../src/postgres/builtins/inventory.js'
import { constantScalarExpression } from '../../../src/codegen/shared/check-rust-constants.js'
import { prepareCheckRust } from '../../../src/codegen/shared/check-rust-source.js'
import type { EvalExpression } from '../../../src/sql-semantics/eval-expressions.js'

it('retains float output identities and catalog-immutable constants without accepting a different output implementation', () => {
  for (const type of ['pg_catalog.float4', 'pg_catalog.float8'] as const) {
    const probe = bindProbe('value::text COLLATE "C" = expected COLLATE "C"', [
      { name: 'value', typeName: type },
      { name: 'expected', typeName: 'pg_catalog.text' },
    ])
    expect(probe.fullyBound).toBe(true)
    const found: Extract<EvalExpression, { kind: 'io-to-text' }>[] = []
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      if ('kind' in value && value.kind === 'io-to-text')
        found.push(value as Extract<EvalExpression, { kind: 'io-to-text' }>)
      Object.values(value).forEach(visit)
    }
    visit(probe.expression)
    expect(found).toHaveLength(1)
    const output = found[0]!
    expect(output.output).toBe(builtinTypeIO(type)?.output)
    expect(builtinMetadata(output.output).volatility).toBe('i')
    expect(
      constantScalarExpression({
        ...output,
        operand: {
          kind: 'certain',
          expression: {
            kind: 'float',
            type,
            bits: type === 'pg_catalog.float4' ? '1067450368' : '4608308318706860032',
          },
        },
      }),
    ).toBe(true)
    const changed = {
      ...output,
      output: builtinTypeIO(
        type === 'pg_catalog.float4' ? 'pg_catalog.float8' : 'pg_catalog.float4',
      )!.output!,
    }
    expect(
      prepareCheckRust({
        kind: 'eval-scalar',
        expression: { kind: 'null-test', type: 'pg_catalog.bool', negated: true, operand: changed },
      }).kind,
    ).toBe('unsupported')
  }
})
