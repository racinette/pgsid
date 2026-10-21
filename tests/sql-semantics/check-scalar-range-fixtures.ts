import type { RangeInputCell } from '../../tools/check-rust/range-input.js'

export const scalarRangeBackends = [
  { type: 'pg_catalog.int2', kind: 1, prefix: 'int2', values: ['-32768', '0', '32767'] },
  { type: 'pg_catalog.bool', kind: 9, prefix: 'bool', values: ['f', 't', 't'] },
  {
    type: 'pg_catalog.inet',
    kind: 13,
    prefix: 'network',
    values: ['10.0.0.0/8', '10.0.0.1/8', '::1'],
  },
  { type: 'pg_catalog."bit"', kind: 14, prefix: 'bit', values: ['', '01', '1'] },
  { type: 'pg_catalog.varbit', kind: 14, prefix: 'bit', values: ['', '01', '1'] },
  { type: 'pg_catalog.bytea', kind: 15, prefix: 'bytea', values: ['\\x00', '\\x00ff', '\\xff'] },
  {
    type: 'pg_catalog.macaddr',
    kind: 16,
    prefix: 'macaddr',
    values: ['00:00:00:00:00:00', '08:00:2b:01:02:03', 'ff:ff:ff:ff:ff:ff'],
  },
  {
    type: 'pg_catalog.macaddr8',
    kind: 17,
    prefix: 'macaddr8',
    values: ['00:00:00:00:00:00:00:00', '08:00:2b:01:02:03:04:05', 'ff:ff:ff:ff:ff:ff:ff:ff'],
  },
  {
    type: 'pg_catalog.uuid',
    kind: 18,
    prefix: 'uuid',
    values: [
      '00000000-0000-0000-0000-000000000000',
      '80000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ],
  },
  { type: 'pg_catalog.float4', kind: 19, prefix: 'float4', values: ['-0', '0', '3'] },
  { type: 'pg_catalog.float8', kind: 20, prefix: 'float8', values: ['-0', '0', '3'] },
  {
    type: 'pg_catalog."time"',
    kind: 21,
    prefix: 'time',
    values: ['00:00:00', '12:34:56.123456', '24:00:00'],
  },
  {
    type: 'pg_catalog.timetz',
    kind: 22,
    prefix: 'timetz',
    values: ['00:00:00+00', '01:00:00+00', '00:00:00-02'],
  },
  {
    type: 'pg_catalog."interval"',
    kind: 23,
    prefix: 'interval',
    values: ['0 days', '1 mon', '60 days'],
  },
  { type: 'pg_catalog.money', kind: 31, prefix: 'money', values: ['0', '0', '0'] },
  { type: 'pg_catalog."char"', kind: 32, prefix: 'internal_char', values: ['', 'A', '\\377'] },
  { type: 'pg_catalog.oid', kind: 33, prefix: 'oid', values: ['0', '2147483648', '4294967295'] },
  {
    type: 'pg_catalog.xid8',
    kind: 37,
    prefix: 'xid8',
    values: ['0', '9223372036854775808', '18446744073709551615'],
  },
  {
    type: 'pg_catalog.pg_lsn',
    kind: 38,
    prefix: 'pg_lsn',
    values: ['0/0', '80000000/0', 'FFFFFFFF/FFFFFFFF'],
  },
  {
    type: 'pg_catalog.tid',
    kind: 39,
    prefix: 'tid',
    values: ['(0,0)', '(2147483648,1)', '(4294967295,65535)'],
  },
  {
    type: 'pg_catalog.cidr',
    kind: 13,
    prefix: 'network',
    values: ['10.0.0.0/8', '10.0.0.1/32', '::1/128'],
  },
  { type: 'pg_catalog."varchar"', kind: 8, prefix: 'text', values: ['alpha ', 'beta', 'zeta  '] },
  { type: 'pg_catalog.bpchar', kind: 8, prefix: 'text', values: ['alpha ', 'beta  ', 'zeta '] },
  { type: 'pg_catalog.name', kind: 8, prefix: 'text', values: ['alpha ', 'beta', 'zeta '] },
  {
    type: 'pg_catalog.regclass',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regcollation',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regconfig',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regdictionary',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regnamespace',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regoper',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regoperator',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regproc',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regprocedure',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regrole',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.regtype',
    kind: 33,
    prefix: 'oid',
    values: ['0', '2147483648', '4294967295'],
  },
  {
    type: 'pg_catalog.jsonb',
    kind: 12,
    prefix: 'jsonb',
    values: ['{"a":[-1.00,null]}', '{"a":[0.00,null]}', '{"a":[1.2300,null]}'],
  },
] as const

export function scalarRangeComparison(profile: (typeof scalarRangeBackends)[number]): number {
  if (profile.type.startsWith('pg_catalog.reg')) {
    return (
      330 +
      (profile.type === 'pg_catalog.regoper'
        ? 2
        : profile.type === 'pg_catalog.regoperator'
          ? 4
          : profile.type === 'pg_catalog.regprocedure'
            ? 3
            : profile.type === 'pg_catalog.regtype'
              ? 5
              : 1)
    )
  }
  return profile.type === 'pg_catalog.bpchar'
    ? 108
    : profile.type === 'pg_catalog.name'
      ? 208
      : profile.type === 'pg_catalog.cidr'
        ? 113
        : profile.kind
}

export const scalarRangeText = (lower: string | null, upper: string | null, flags = '[]') => {
  const quote = (value: string | null) =>
    value === null ? '' : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
  return flags[0] + quote(lower) + ',' + quote(upper) + flags[1]
}

export function invalidScalarRangeBounds(input: RangeInputCell, cidr = false): RangeInputCell[] {
  if (input.kind === 'Jsonb') {
    const root = structuredClone(input)
    root.value.root = 0
    const cycle = structuredClone(input)
    cycle.value.nodes[cycle.value.root]!.child = cycle.value.root
    const span = structuredClone(input)
    span.value.nodes[span.value.root]!.textEnd = span.value.characters.length + 1
    return [root, cycle, span]
  }
  if (input.kind === 'Int2') return [{ kind: 'Int2', value: 32768 }]
  if (input.kind === 'Bit') return [{ kind: 'Bit', value: 'not binary' }]
  if (input.kind === 'Bytea')
    return [
      { kind: 'Bytea', value: '0' },
      { kind: 'Bytea', value: 'FF' },
    ]
  if (input.kind === 'Time') return [{ kind: 'Time', value: -1n }]
  if (input.kind === 'Timetz')
    return [{ kind: 'Timetz', value: { ...input.value, time: 86400000001n } }]
  if (input.kind === 'InternalChar') return [{ kind: 'InternalChar', value: 256 }]
  if (input.kind === 'Oid')
    return [
      { kind: 'Oid', value: -1n },
      { kind: 'Oid', value: 4294967296n },
    ]
  if (input.kind === 'Tid')
    return [
      { kind: 'Tid', value: -1n },
      { kind: 'Tid', value: 281474976710656n },
    ]
  if (input.kind === 'Network')
    return [
      ...(cidr
        ? [{ kind: 'Network' as const, value: { ...input.value, prefix: 0, word0: 1 } }]
        : []),
      { kind: 'Network', value: { ...input.value, family: 0 } },
      { kind: 'Network', value: { ...input.value, prefix: 129 } },
      { kind: 'Network', value: { ...input.value, word0: 65536 } },
      ...(input.value.family === 4
        ? [{ kind: 'Network' as const, value: { ...input.value, word2: 1 } }]
        : []),
    ]
  if (input.kind === 'Macaddr' || input.kind === 'Macaddr8')
    return [
      { kind: input.kind, value: { ...input.value, word0: -1 } },
      { kind: input.kind, value: { ...input.value, word3: input.kind === 'Macaddr' ? 1 : 65536 } },
    ]
  if (input.kind === 'Uuid') return [{ kind: 'Uuid', value: { ...input.value, word7: 65536 } }]
  return []
}

export const scalarRangeBatchStarts: number[] = []
const aliasStart = scalarRangeBackends.findIndex((p) => p.type.startsWith('pg_catalog.reg'))
const jsonbStart = scalarRangeBackends.findIndex((p) => p.type === 'pg_catalog.jsonb')
for (let start = 0; start < aliasStart; start += 5) scalarRangeBatchStarts.push(start)
for (let start = aliasStart; start < jsonbStart; start += 5) scalarRangeBatchStarts.push(start)
scalarRangeBatchStarts.push(jsonbStart)
export function scalarRangeBatch(start: number) {
  const next =
    scalarRangeBatchStarts[scalarRangeBatchStarts.indexOf(start) + 1] ?? scalarRangeBackends.length
  return scalarRangeBackends.slice(start, next)
}

export function rangeHasNonzeroOid(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false
  if ('kind' in input && 'value' in input && input.kind === 'Oid') return input.value !== 0n
  if ('bounds' in input && Array.isArray(input.bounds)) return input.bounds.some(rangeHasNonzeroOid)
  if ('ranges' in input && Array.isArray(input.ranges)) return input.ranges.some(rangeHasNonzeroOid)
  if ('elements' in input && Array.isArray(input.elements))
    return input.elements.some(rangeHasNonzeroOid)
  if ('value' in input) return rangeHasNonzeroOid(input.value)
  return false
}
