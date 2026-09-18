import { describe, expect, it } from 'vitest'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import {
  checkGroupDeclarations,
  classifyBuiltin,
  groupBuiltins,
  typeFamily,
} from '../../scripts/builtin-grouping.js'
import {
  builtinGroupingReport,
  formatGroupingReport,
  inventoryCallables,
} from '../../scripts/explore-builtin-groups.js'
import type { BuiltinCallable } from '../../scripts/builtin-grouping.js'

const callables = inventoryCallables()
const groups = groupBuiltins(callables)
const find = (
  kind: BuiltinCallable['kind'],
  name: string,
  args: readonly string[],
): BuiltinCallable => {
  const callable = callables.find(
    (value) =>
      value.kind === kind &&
      value.name === name &&
      JSON.stringify(value.args) === JSON.stringify(args),
  )
  if (!callable) throw new Error(`Missing fixture callable: ${name}(${args.join(',')})`)
  return callable
}

describe('builtin grouping heuristics', () => {
  it('defines same-ish types explicitly while preserving distinct representations', () => {
    expect(typeFamily('pg_catalog.int2')).toBe(typeFamily('pg_catalog.int8'))
    expect(typeFamily('pg_catalog.float4')).toBe(typeFamily('pg_catalog.float8'))
    expect(typeFamily('pg_catalog.text')).toBe(typeFamily('pg_catalog."varchar"'))
    expect(typeFamily('pg_catalog."char"')).not.toBe(typeFamily('pg_catalog.text'))
    expect(typeFamily('pg_catalog.oid')).not.toBe(typeFamily('pg_catalog.int4'))
    expect(typeFamily('pg_catalog."json"')).not.toBe(typeFamily('pg_catalog.jsonb'))
    expect(typeFamily('pg_catalog._int4range')).toBe('array')
    expect(typeFamily('pg_catalog.anycompatiblearray')).toBe('array')
    expect(typeFamily('pg_catalog.anycompatiblerange')).toBe('range')
    expect(typeFamily('pg_catalog.int4multirange')).toBe('multirange')
    expect(typeFamily('public.int4')).toBe('public.int4')
    expect(typeFamily('public.customrange')).toBe('public.customrange')
    expect(typeFamily('pg_catalog.future_type')).toBe('pg_catalog.future_type')
  })

  it('recognizes the broad binary same-family Boolean comparison rule', () => {
    const compare = find('operator', '=', ['pg_catalog.int2', 'pg_catalog.int8'])
    const like = find('operator', '~~', ['pg_catalog.text', 'pg_catalog.text'])
    const containment = find('operator', '@>', ['pg_catalog.anyarray', 'pg_catalog.anyarray'])
    for (const callable of [compare, like, containment]) {
      expect(classifyBuiltin(callable).rule).toBe('comparison')
    }
    expect(classifyBuiltin({ ...compare, args: ['pg_catalog.int4', 'pg_catalog.oid'] }).rule).toBe(
      'predicate',
    )
    expect(classifyBuiltin({ ...compare, args: ['pg_catalog.int4'] }).rule).toBe('predicate')
    expect(
      classifyBuiltin(find('function', 'starts_with', ['pg_catalog.text', 'pg_catalog.text'])).rule,
    ).toBe('signature-profile')
  })

  it('uses arguments and result without requiring an object argument', () => {
    const constructor = classifyBuiltin(
      find('function', 'make_date', ['pg_catalog.int4', 'pg_catalog.int4', 'pg_catalog.int4']),
    )
    expect(constructor.inputs).toEqual(['integer'])
    expect(constructor.output).toBe('temporal')
    const left = find('operator', '*', ['pg_catalog."interval"', 'pg_catalog.float8'])
    const right = find('operator', '*', ['pg_catalog.float8', 'pg_catalog."interval"'])
    expect(classifyBuiltin(left).id).toBe(classifyBuiltin(right).id)
    expect(callableIdentity(left)).not.toBe(callableIdentity(right))
  })

  it('selects one broad domain from results and arguments in deterministic priority order', () => {
    const fixtures = [
      [
        'function',
        'make_date',
        ['pg_catalog.int4', 'pg_catalog.int4', 'pg_catalog.int4'],
        'temporal',
      ],
      ['function', 'date_part', ['pg_catalog.text', 'pg_catalog.date'], 'temporal'],
      ['function', 'length', ['pg_catalog.text'], 'text'],
      ['function', 'jsonb_extract_path_text', ['pg_catalog.jsonb', 'pg_catalog._text'], 'json'],
      ['function', 'encode', ['pg_catalog.bytea', 'pg_catalog.text'], 'binary'],
      ['aggregate', 'sum', ['pg_catalog.int4'], 'aggregates'],
      ['window', 'row_number', [], 'windows'],
    ] as const
    for (const [kind, name, args, domain] of fixtures) {
      expect(classifyBuiltin(find(kind, name, args)).domain).toBe(domain)
    }
    const scalar = find('function', 'abs', ['pg_catalog.int4'])
    expect(classifyBuiltin({ ...scalar, args: ['pg_catalog.internal'] }).domain).toBe('support')
    expect(classifyBuiltin({ ...scalar, result: 'pg_catalog.cstring' }).domain).toBe('support')
    expect(
      classifyBuiltin({ ...scalar, args: ['public.custom'], result: 'public.custom' }).domain,
    ).toBe('support')
    const mixed = { ...scalar, args: ['pg_catalog.jsonb', 'pg_catalog.date'] }
    expect(classifyBuiltin(mixed).domain).toBe('json')
    expect(classifyBuiltin({ ...mixed, args: [...mixed.args].reverse() }).domain).toBe('temporal')
    expect(groups).toHaveLength(19)
  })

  it('retains execution metadata without splitting domains', () => {
    const scalar = find('function', 'abs', ['pg_catalog.int4'])
    expect(classifyBuiltin(scalar).id).toBe(classifyBuiltin({ ...scalar, returnsSet: true }).id)
    expect(classifyBuiltin({ ...scalar, returnsSet: true }).execution).toBe('set-returning')
    expect(classifyBuiltin(find('aggregate', 'sum', ['pg_catalog.int4'])).execution).toBe('normal')
    const ordered = callables.find((value) => value.kind === 'aggregate' && value.aggKind === 'o')!
    const hypothetical = callables.find(
      (value) => value.kind === 'aggregate' && value.aggKind === 'h',
    )!
    expect(classifyBuiltin(ordered).execution).toBe('ordered-set')
    expect(classifyBuiltin(hypothetical).execution).toBe('hypothetical-set')
    const zero = classifyBuiltin(find('window', 'row_number', []))
    expect(zero.inputs).toEqual([])
    expect(zero.execution).toBe('window')
  })

  it('assigns every catalog signature exactly once and rejects duplicates', () => {
    const members = groups.flatMap((group) => group.members.map((member) => member.signature))
    expect(members.length).toBe(callables.length)
    expect(new Set(members).size).toBe(callables.length)
    expect([...members].sort()).toEqual(callables.map(callableIdentity).sort())
    expect(() => groupBuiltins([callables[0]!, callables[0]!])).toThrow(
      'Duplicate callable identity',
    )
  })

  it('produces the same membership and report for reversed catalog enumeration', () => {
    expect(groupBuiltins([...callables].reverse())).toEqual(groups)
    const report = builtinGroupingReport(groups, true)
    expect(builtinGroupingReport(groupBuiltins([...callables].reverse()), true)).toEqual(report)
    expect(report.totalOverloads).toBe(callables.length)
    expect(report.summary.reduce((sum, kind) => sum + kind.overloads, 0)).toBe(callables.length)
    const csv = formatGroupingReport(report, 'csv')
    expect(csv.split('\n').filter(Boolean).length).toBe(groups.length + 1)
    expect(JSON.parse(formatGroupingReport(report, 'json'))).toEqual(report)
    expect(formatGroupingReport(report, 'markdown')).toContain('Grouping predicates:')
    expect(() => formatGroupingReport(report, 'unknown')).toThrow('Unknown format')
  })

  it('emits independent literal inventory declarations for the projected groups', async () => {
    await expect(checkGroupDeclarations(groups)).resolves.toBeUndefined()
  })
})
