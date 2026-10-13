import type { Input } from '../../tools/check-rust/parity.js'

const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

export const comparisonFamilies: {
  name: string
  type: string
  values: { sql: string; input: Input }[]
}[] = [
  {
    name: 'boolean',
    type: 'boolean',
    values: [true, false].map((value) => ({ sql: String(value), input: input(value) })),
  },
  ...['smallint', 'integer', 'bigint'].map((type) => ({
    name: type,
    type,
    values: [-1, 0, 1].map((value) => ({
      sql: String(value),
      input: input(type === 'bigint' ? BigInt(value) : value),
    })),
  })),
  {
    name: 'decimal',
    type: 'numeric',
    values: ['0', '-0.00', '1.00', 'NaN', 'Infinity', '-Infinity'].map((value) => ({
      sql: `'${value}'`,
      input: input(value),
    })),
  },
  ...['text', 'varchar', 'bpchar'].map((type) => ({
    name: type,
    type,
    values: ['a', 'a ', 'é'].map((value) => ({ sql: `'${value}'`, input: input(value) })),
  })),
  ...['inet', 'cidr'].map((type) => ({
    name: type,
    type,
    values: ['192.0.2.0/24', '192.0.2.0/32', '2001:db8::/64'].map((value) => ({
      sql: `'${value}'`,
      input: input(value),
    })),
  })),
  {
    name: 'macaddr',
    type: 'macaddr',
    values: ['08:00:2b:01:02:03', '08:00:2b:01:02:04'].map((value) => ({
      sql: `'${value}'`,
      input: input(value),
    })),
  },
  {
    name: 'macaddr8',
    type: 'macaddr8',
    values: ['08:00:2b:ff:fe:01:02:03', '08:00:2b:ff:fe:01:02:04'].map((value) => ({
      sql: `'${value}'`,
      input: input(value),
    })),
  },
  {
    name: 'uuid',
    type: 'uuid',
    values: ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001'].map(
      (value) => ({ sql: `'${value}'`, input: input(value) }),
    ),
  },
  {
    name: 'bytea',
    type: 'bytea',
    values: ['', '00ff', 'ff00'].map((value) => ({ sql: `'\\x${value}'`, input: input(value) })),
  },
  ...['bit', 'varbit'].map((type) => ({
    name: type,
    type: type === 'bit' ? 'bit(3)' : type,
    values: ['000', '001', '111'].map((value) => ({ sql: `B'${value}'`, input: input(value) })),
  })),
  {
    name: 'date',
    type: 'date',
    values: ['2000-01-01', '2000-01-02'].map((value, index) => ({
      sql: `'${value}'`,
      input: input(index),
    })),
  },
  ...['timestamp', 'timestamptz'].map((type) => ({
    name: type,
    type,
    values: ['2000-01-01 00:00:00+00', '2000-01-01 00:00:00.000001+00'].map((value, index) => ({
      sql: `'${value}'`,
      input: input(BigInt(index)),
    })),
  })),
  {
    name: 'status',
    type: 'review_status',
    values: ['pending', 'approved'].map((value, index) => ({
      sql: `'${value}'`,
      input: input(index),
    })),
  },
]
