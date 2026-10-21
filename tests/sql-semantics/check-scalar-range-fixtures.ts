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
] as const

export const scalarRangeText = (lower: string | null, upper: string | null, flags = '[]') => {
  const quote = (value: string | null) =>
    value === null ? '' : '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
  return flags[0] + quote(lower) + ',' + quote(upper) + flags[1]
}
