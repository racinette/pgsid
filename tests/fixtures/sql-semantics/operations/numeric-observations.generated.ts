import type { SqlObservation } from '../../../support/postgres/observe.js'
export const numericObservations: Readonly<Record<string, SqlObservation>> = {
  'pg_catalog.int2/pg_catalog.int2 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2/pg_catalog.int2 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2/pg_catalog.int2 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2/pg_catalog.int2 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2/pg_catalog.int2 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int2 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2/pg_catalog.int2 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2/pg_catalog.int2 division -32768/-1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int2/pg_catalog.int2 division 32767/-1': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2/pg_catalog.int2 division -32768/1': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2/pg_catalog.int2 division 32767/1': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2/pg_catalog.int2 division -32768/-32768': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2/pg_catalog.int2 division 32767/32767': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2/pg_catalog.int2 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int2 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int2 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 remainder 7/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 mod 7/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 remainder -7/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 mod -7/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 remainder 7/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 mod 7/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 remainder -7/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 mod -7/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 remainder 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2 mod 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2 remainder 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2 mod 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2 remainder -32768/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod -32768/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder 32767/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod 32767/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder -32768/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod -32768/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder 32767/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod 32767/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder -32768/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod -32768/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder 32767/32767': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 mod 32767/32767': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 remainder null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 mod null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 remainder 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 mod 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 remainder null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 mod null/null': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int4 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2/pg_catalog.int4 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2/pg_catalog.int4 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2/pg_catalog.int4 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2/pg_catalog.int4 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int4 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2/pg_catalog.int4 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2/pg_catalog.int4 division -32768/-1': {
    kind: 'value',
    value: '32768',
  },
  'pg_catalog.int2/pg_catalog.int4 division 32767/-1': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2/pg_catalog.int4 division -32768/1': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2/pg_catalog.int4 division 32767/1': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2/pg_catalog.int4 division -32768/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int4 division 32767/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int4 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int4 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int4 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int8 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2/pg_catalog.int8 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2/pg_catalog.int8 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2/pg_catalog.int8 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2/pg_catalog.int8 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int8 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2/pg_catalog.int8 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int2/pg_catalog.int8 division -32768/-1': {
    kind: 'value',
    value: '32768',
  },
  'pg_catalog.int2/pg_catalog.int8 division 32767/-1': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2/pg_catalog.int8 division -32768/1': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2/pg_catalog.int8 division 32767/1': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2/pg_catalog.int8 division -32768/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int8 division 32767/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2/pg_catalog.int8 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int8 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2/pg_catalog.int8 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int2 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4/pg_catalog.int2 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4/pg_catalog.int2 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4/pg_catalog.int2 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4/pg_catalog.int2 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4/pg_catalog.int2 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4/pg_catalog.int2 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4/pg_catalog.int2 division -2147483648/-1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4/pg_catalog.int2 division 2147483647/-1': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4/pg_catalog.int2 division -2147483648/1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4/pg_catalog.int2 division 2147483647/1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4/pg_catalog.int2 division -2147483648/-32768': {
    kind: 'value',
    value: '65536',
  },
  'pg_catalog.int4/pg_catalog.int2 division 2147483647/32767': {
    kind: 'value',
    value: '65538',
  },
  'pg_catalog.int4/pg_catalog.int2 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int2 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int2 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int4 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4/pg_catalog.int4 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4/pg_catalog.int4 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4/pg_catalog.int4 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4/pg_catalog.int4 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4/pg_catalog.int4 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4/pg_catalog.int4 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4/pg_catalog.int4 division -2147483648/-1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4/pg_catalog.int4 division 2147483647/-1': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4/pg_catalog.int4 division -2147483648/1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4/pg_catalog.int4 division 2147483647/1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4/pg_catalog.int4 division -2147483648/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4/pg_catalog.int4 division 2147483647/2147483647': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4/pg_catalog.int4 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int4 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int4 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 remainder 7/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 mod 7/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 remainder -7/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 mod -7/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 remainder 7/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 mod 7/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 remainder -7/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 mod -7/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 remainder 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4 mod 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4 remainder 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4 mod 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4 remainder -2147483648/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod -2147483648/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder 2147483647/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod 2147483647/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder -2147483648/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod -2147483648/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder 2147483647/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod 2147483647/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder -2147483648/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod -2147483648/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder 2147483647/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 mod 2147483647/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 remainder null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 mod null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 remainder 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 mod 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 remainder null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 mod null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 gcd 12/18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 gcd -12/18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 gcd 12/-18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 gcd -12/-18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 gcd 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 gcd 0/7': {
    kind: 'value',
    value: '7',
  },
  'pg_catalog.int4 gcd 7/0': {
    kind: 'value',
    value: '7',
  },
  'pg_catalog.int4 gcd -2147483648/0': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 gcd 0/-2147483648': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 gcd -2147483648/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 gcd -2147483648/2': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 gcd -2147483648/-2147483648': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 gcd -2147483648/2147483647': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 gcd 2147483647/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 gcd 2147483647/2': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 gcd 2147483647/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 gcd 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 gcd null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 gcd 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 gcd null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 lcm 12/18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int4 lcm -12/18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int4 lcm 12/-18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int4 lcm -12/-18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int4 lcm 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 lcm 0/7': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 lcm 7/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 lcm -2147483648/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 lcm 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 lcm -2147483648/1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 lcm -2147483648/2': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 lcm -2147483648/-2147483648': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 lcm -2147483648/2147483647': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 lcm 2147483647/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 lcm 2147483647/2': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 lcm 2147483647/1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 lcm 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 lcm null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 lcm 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 lcm null/null': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int8 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4/pg_catalog.int8 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4/pg_catalog.int8 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4/pg_catalog.int8 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4/pg_catalog.int8 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4/pg_catalog.int8 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4/pg_catalog.int8 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int4/pg_catalog.int8 division -2147483648/-1': {
    kind: 'value',
    value: '2147483648',
  },
  'pg_catalog.int4/pg_catalog.int8 division 2147483647/-1': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4/pg_catalog.int8 division -2147483648/1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4/pg_catalog.int8 division 2147483647/1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4/pg_catalog.int8 division -2147483648/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4/pg_catalog.int8 division 2147483647/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4/pg_catalog.int8 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int8 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4/pg_catalog.int8 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int2 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8/pg_catalog.int2 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8/pg_catalog.int2 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8/pg_catalog.int2 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8/pg_catalog.int2 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8/pg_catalog.int2 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8/pg_catalog.int2 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8/pg_catalog.int2 division -9223372036854775808/-1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8/pg_catalog.int2 division 9223372036854775807/-1': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8/pg_catalog.int2 division -9223372036854775808/1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8/pg_catalog.int2 division 9223372036854775807/1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8/pg_catalog.int2 division -9223372036854775808/-32768': {
    kind: 'value',
    value: '281474976710656',
  },
  'pg_catalog.int8/pg_catalog.int2 division 9223372036854775807/32767': {
    kind: 'value',
    value: '281483566907400',
  },
  'pg_catalog.int8/pg_catalog.int2 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int2 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int2 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int4 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8/pg_catalog.int4 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8/pg_catalog.int4 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8/pg_catalog.int4 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8/pg_catalog.int4 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8/pg_catalog.int4 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8/pg_catalog.int4 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8/pg_catalog.int4 division -9223372036854775808/-1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8/pg_catalog.int4 division 9223372036854775807/-1': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8/pg_catalog.int4 division -9223372036854775808/1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8/pg_catalog.int4 division 9223372036854775807/1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8/pg_catalog.int4 division -9223372036854775808/-2147483648': {
    kind: 'value',
    value: '4294967296',
  },
  'pg_catalog.int8/pg_catalog.int4 division 9223372036854775807/2147483647': {
    kind: 'value',
    value: '4294967298',
  },
  'pg_catalog.int8/pg_catalog.int4 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int4 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int4 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int8 division 7/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8/pg_catalog.int8 division -7/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8/pg_catalog.int8 division 7/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8/pg_catalog.int8 division -7/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8/pg_catalog.int8 division 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8/pg_catalog.int8 division 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8/pg_catalog.int8 division 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8/pg_catalog.int8 division -9223372036854775808/-1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8/pg_catalog.int8 division 9223372036854775807/-1': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8/pg_catalog.int8 division -9223372036854775808/1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8/pg_catalog.int8 division 9223372036854775807/1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8/pg_catalog.int8 division -9223372036854775808/-9223372036854775808': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8/pg_catalog.int8 division 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8/pg_catalog.int8 division null/0': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int8 division 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8/pg_catalog.int8 division null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 remainder 7/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 mod 7/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 remainder -7/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 mod -7/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 remainder 7/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 mod 7/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 remainder -7/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 mod -7/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 remainder 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8 mod 1/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8 remainder 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8 mod 0/0': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.int8 remainder -9223372036854775808/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod -9223372036854775808/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder 9223372036854775807/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod 9223372036854775807/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder -9223372036854775808/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod -9223372036854775808/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder 9223372036854775807/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod 9223372036854775807/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder -9223372036854775808/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod -9223372036854775808/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 mod 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 remainder null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 mod null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 remainder 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 mod 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 remainder null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 mod null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 gcd 12/18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int8 gcd -12/18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int8 gcd 12/-18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int8 gcd -12/-18': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int8 gcd 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 gcd 0/7': {
    kind: 'value',
    value: '7',
  },
  'pg_catalog.int8 gcd 7/0': {
    kind: 'value',
    value: '7',
  },
  'pg_catalog.int8 gcd -9223372036854775808/0': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 gcd 0/-9223372036854775808': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 gcd -9223372036854775808/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 gcd -9223372036854775808/2': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 gcd -9223372036854775808/-9223372036854775808': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 gcd -9223372036854775808/9223372036854775807': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 gcd 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 gcd 9223372036854775807/2': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 gcd 9223372036854775807/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 gcd 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 gcd null/-9223372036854775808': {
    kind: 'null',
  },
  'pg_catalog.int8 gcd 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 gcd null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 lcm 12/18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int8 lcm -12/18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int8 lcm 12/-18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int8 lcm -12/-18': {
    kind: 'value',
    value: '36',
  },
  'pg_catalog.int8 lcm 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 lcm 0/7': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 lcm 7/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 lcm -9223372036854775808/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 lcm 0/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 lcm -9223372036854775808/1': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 lcm -9223372036854775808/2': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 lcm -9223372036854775808/-9223372036854775808': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 lcm -9223372036854775808/9223372036854775807': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 lcm 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 lcm 9223372036854775807/2': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 lcm 9223372036854775807/1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 lcm 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 lcm null/-9223372036854775808': {
    kind: 'null',
  },
  'pg_catalog.int8 lcm 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 lcm null/null': {
    kind: 'null',
  },
  'pg_catalog.float4 literal 0': {
    kind: 'null',
  },
  'pg_catalog.float4 literal 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 literal 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4 literal 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 literal 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4 literal 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4 literal 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float4 literal 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4 literal 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'pg_catalog.float4 literal 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 literal 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'ff7fffff',
  },
  'pg_catalog.float4 literal 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00800000',
  },
  'pg_catalog.float4 literal 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 literal 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000001',
  },
  'pg_catalog.float4 literal 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4 literal 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 literal 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4 unary - 0': {
    kind: 'null',
  },
  'pg_catalog.float4 unary - 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4 unary - 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 unary - 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4 unary - 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 unary - 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0000000',
  },
  'pg_catalog.float4 unary - 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0400000',
  },
  'pg_catalog.float4 unary - 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf000000',
  },
  'pg_catalog.float4 unary - 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bdcccccd',
  },
  'pg_catalog.float4 unary - 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'ff7fffff',
  },
  'pg_catalog.float4 unary - 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 unary - 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80800000',
  },
  'pg_catalog.float4 unary - 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000001',
  },
  'pg_catalog.float4 unary - 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 unary - 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4 unary - 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4 unary - 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 unary + 0': {
    kind: 'null',
  },
  'pg_catalog.float4 unary + 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 unary + 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4 unary + 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 unary + 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4 unary + 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4 unary + 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float4 unary + 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4 unary + 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'pg_catalog.float4 unary + 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 unary + 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'ff7fffff',
  },
  'pg_catalog.float4 unary + 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00800000',
  },
  'pg_catalog.float4 unary + 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 unary + 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000001',
  },
  'pg_catalog.float4 unary + 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4 unary + 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 unary + 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4 unary @ 0': {
    kind: 'null',
  },
  'pg_catalog.float4 unary @ 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 unary @ 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 unary @ 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 unary @ 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 unary @ 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4 unary @ 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float4 unary @ 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4 unary @ 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'pg_catalog.float4 unary @ 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 unary @ 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 unary @ 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00800000',
  },
  'pg_catalog.float4 unary @ 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 unary @ 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 unary @ 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4 unary @ 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 unary @ 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 unary abs 0': {
    kind: 'null',
  },
  'pg_catalog.float4 unary abs 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 unary abs 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 unary abs 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 unary abs 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 unary abs 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4 unary abs 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float4 unary abs 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4 unary abs 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'pg_catalog.float4 unary abs 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 unary abs 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 unary abs 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00800000',
  },
  'pg_catalog.float4 unary abs 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 unary abs 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 unary abs 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4 unary abs 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 unary abs 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 relabel 0': {
    kind: 'null',
  },
  'pg_catalog.float4 relabel 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4 relabel 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4 relabel 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4 relabel 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4 relabel 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4 relabel 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float4 relabel 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4 relabel 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'pg_catalog.float4 relabel 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4 relabel 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'ff7fffff',
  },
  'pg_catalog.float4 relabel 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00800000',
  },
  'pg_catalog.float4 relabel 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'pg_catalog.float4 relabel 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000001',
  },
  'pg_catalog.float4 relabel 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4 relabel 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4 relabel 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4 to pg_catalog.float8 0': {
    kind: 'null',
  },
  'pg_catalog.float4 to pg_catalog.float8 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb99999a0000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47efffffe0000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c7efffffe0000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3810000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36a0000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b6a0000000000000',
  },
  'pg_catalog.float4 to pg_catalog.float8 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4 to pg_catalog.float8 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4 to pg_catalog.float8 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.int2 to pg_catalog.float4 null': {
    kind: 'null',
  },
  'pg_catalog.int2 to pg_catalog.float4 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.int2 to pg_catalog.float4 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.int2 to pg_catalog.float4 -1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.int2 to pg_catalog.float4 -32768': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c7000000',
  },
  'pg_catalog.int2 to pg_catalog.float4 32767': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '46fffe00',
  },
  'pg_catalog.float4 to pg_catalog.int2 0': {
    kind: 'null',
  },
  'pg_catalog.float4 to pg_catalog.int2 1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int2 2': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int2 3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int2 4': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int2 5': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float4 to pg_catalog.int2 6': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float4 to pg_catalog.int2 7': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float4 to pg_catalog.int2 8': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float4 to pg_catalog.int2 9': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.float4 to pg_catalog.int2 10': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.float4 to pg_catalog.int2 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int2 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int2 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int2 14': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.float4 to pg_catalog.int2 15': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.float4 to pg_catalog.int2 16': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int2 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int2 18': {
    kind: 'value',
    value: '32766',
  },
  'pg_catalog.float4 to pg_catalog.int2 19': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.float4 to pg_catalog.int2 20': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int2 21': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.float4 to pg_catalog.int2 22': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 to pg_catalog.float4 null': {
    kind: 'null',
  },
  'pg_catalog.int4 to pg_catalog.float4 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.int4 to pg_catalog.float4 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.int4 to pg_catalog.float4 -1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.int4 to pg_catalog.float4 -2147483648': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'cf000000',
  },
  'pg_catalog.int4 to pg_catalog.float4 2147483647': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4f000000',
  },
  'pg_catalog.int4 to pg_catalog.float4 16777217': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800000',
  },
  'pg_catalog.int4 to pg_catalog.float4 -16777217': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'cb800000',
  },
  'pg_catalog.int4 to pg_catalog.float4 16777219': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800002',
  },
  'pg_catalog.float4 to pg_catalog.int4 0': {
    kind: 'null',
  },
  'pg_catalog.float4 to pg_catalog.int4 1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int4 2': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int4 3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int4 4': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int4 5': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float4 to pg_catalog.int4 6': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float4 to pg_catalog.int4 7': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float4 to pg_catalog.int4 8': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float4 to pg_catalog.int4 9': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.float4 to pg_catalog.int4 10': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.float4 to pg_catalog.int4 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 14': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.float4 to pg_catalog.int4 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 16': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.float4 to pg_catalog.int4 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 18': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 19': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 20': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int4 21': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.float4 to pg_catalog.int4 22': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 to pg_catalog.float4 null': {
    kind: 'null',
  },
  'pg_catalog.int8 to pg_catalog.float4 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.int8 to pg_catalog.float4 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.int8 to pg_catalog.float4 -1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.int8 to pg_catalog.float4 -9223372036854775808': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'df000000',
  },
  'pg_catalog.int8 to pg_catalog.float4 9223372036854775807': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5f000000',
  },
  'pg_catalog.int8 to pg_catalog.float4 9007199254740993': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5a000000',
  },
  'pg_catalog.int8 to pg_catalog.float4 4611686293305294847': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5e800000',
  },
  'pg_catalog.int8 to pg_catalog.float4 -4611686293305294847': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'de800000',
  },
  'pg_catalog.int8 to pg_catalog.float4 4611686293305294848': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5e800000',
  },
  'pg_catalog.int8 to pg_catalog.float4 -4611686293305294848': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'de800000',
  },
  'pg_catalog.int8 to pg_catalog.float4 4611686293305294849': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5e800001',
  },
  'pg_catalog.int8 to pg_catalog.float4 -4611686293305294849': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'de800001',
  },
  'pg_catalog.float4 to pg_catalog.int8 0': {
    kind: 'null',
  },
  'pg_catalog.float4 to pg_catalog.int8 1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int8 2': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int8 3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int8 4': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to pg_catalog.int8 5': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float4 to pg_catalog.int8 6': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float4 to pg_catalog.int8 7': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float4 to pg_catalog.int8 8': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float4 to pg_catalog.int8 9': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.float4 to pg_catalog.int8 10': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.float4 to pg_catalog.int8 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int8 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int8 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int8 14': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.float4 to pg_catalog.int8 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int8 16': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.float4 to pg_catalog.int8 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int8 18': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to pg_catalog.int8 19': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.float4/pg_catalog.float4 + 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3e4ccccd',
  },
  'pg_catalog.float4/pg_catalog.float4 + 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40a00000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 + 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4/pg_catalog.float4 + 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4/pg_catalog.float4 + 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 17': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 18': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4/pg_catalog.float4 + 19': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000002',
  },
  'pg_catalog.float4/pg_catalog.float4 + 20': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 + 21': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 + 22': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 + 23': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 + 24': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 + 25': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 26': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 + 27': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 28': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 29': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 30': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 31': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 32': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 33': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 + 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 + 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 + 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 + 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 + 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 - 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0a00000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40a00000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 - 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4/pg_catalog.float4 - 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'pg_catalog.float4/pg_catalog.float4 - 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 17': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 18': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 19': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 - 20': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 - 21': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 - 22': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 - 23': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 - 24': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 25': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 - 26': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 - 27': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 28': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 29': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 30': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 31': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 32': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 33': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 - 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 - 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 - 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 - 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 - 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 * 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3c23d70b',
  },
  'pg_catalog.float4/pg_catalog.float4 * 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40c00000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0c00000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0c00000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 * 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 * 14': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 * 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '34ffffff',
  },
  'pg_catalog.float4/pg_catalog.float4 * 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00400000',
  },
  'pg_catalog.float4/pg_catalog.float4 * 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 * 18': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000002',
  },
  'pg_catalog.float4/pg_catalog.float4 * 19': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 * 20': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 * 21': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 * 22': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 * 23': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 * 24': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 * 25': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 * 26': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 27': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 28': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 29': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 30': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 31': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 32': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 33': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 * 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 * 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 * 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 * 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 * 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 / 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3fc00000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bfc00000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bfc00000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 5': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 6': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 7': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 8': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 9': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 11': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7effffff',
  },
  'pg_catalog.float4/pg_catalog.float4 / 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 / 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '01000000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 17': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000002',
  },
  'pg_catalog.float4/pg_catalog.float4 / 18': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float4 / 19': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 20': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 / 21': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float4 / 22': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 23': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float4/pg_catalog.float4 / 24': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 25': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 26': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float4 / 27': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 28': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 29': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 30': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 31': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 32': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 33': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float4 / 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 / 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 / 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 / 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 / 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 = 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 = 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 = 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 = 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 = 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 = 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 = 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <> 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 < 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 < 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 < 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 < 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 < 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 < 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 < 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 <= 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 > 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 > 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 > 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 > 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 > 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 > 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 > 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 >= 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float4 precision = 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision = 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision = -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision = NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <> 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <> 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <> -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <> NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision < 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision < 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision < -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision < NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <= 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <= -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision <= NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision > 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision > 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision > -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision > NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision >= 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision >= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float4 precision >= -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float4 precision >= NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 + 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fc999999ccccccd',
  },
  'pg_catalog.float4/pg_catalog.float8 + 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float4/pg_catalog.float8 + 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float4/pg_catalog.float8 + 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47efffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47efffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36a0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 + 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 + 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 + 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 + 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 + 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 + 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 + 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 + 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 + 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 + 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 + 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 + 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 - 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3e19999998000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c014000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float4/pg_catalog.float8 - 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float4/pg_catalog.float8 - 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47efffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47efffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36a0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 - 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 - 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 - 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 - 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 - 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 - 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 - 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 - 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 - 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 - 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 - 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 - 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 * 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f847ae14ccccccd',
  },
  'pg_catalog.float4/pg_catalog.float8 * 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4018000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c018000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c018000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float8 * 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float8 * 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47ffffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '04cfffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3800000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3690000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36b0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 * 19': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float8 * 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 * 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 * 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 * 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 * 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 * 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 * 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 * 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 * 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 * 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 * 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 * 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 / 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000004000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff8000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff8000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff8000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 5': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 6': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 7': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 8': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 9': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 11': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '07efffffe0000001',
  },
  'pg_catalog.float4/pg_catalog.float8 / 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '87efffffe0000001',
  },
  'pg_catalog.float4/pg_catalog.float8 / 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47dfffffe0000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4/pg_catalog.float8 / 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3820000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36b0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3690000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '79c0000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 / 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float4/pg_catalog.float8 / 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float4/pg_catalog.float8 / 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 26': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float4/pg_catalog.float8 / 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float4/pg_catalog.float8 / 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 / 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 / 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 / 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 / 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 = 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 = 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 = 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 = 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 = 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 = 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 = 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 = 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 = 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 = 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 = 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 = 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <> 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 < 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 < 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 < 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 < 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 < 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 < 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 < 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 <= 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 > 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 > 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 > 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 > 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 > 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 > 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 > 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 34': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 35': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 36': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 37': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 >= 38': {
    kind: 'null',
  },
  'pg_catalog.float4/pg_catalog.float8 precision = 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision = 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision = -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision = NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <> 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <> 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <> -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <> NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision < 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision < 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision < -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision < NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <= 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <= -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision <= NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision > 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision > 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision > -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision > NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float4/pg_catalog.float8 precision >= 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision >= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision >= -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float4/pg_catalog.float8 precision >= NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8 literal 0': {
    kind: 'null',
  },
  'pg_catalog.float8 literal 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 literal 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8 literal 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 literal 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8 literal 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8 literal 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8 literal 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8 literal 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb999999999999a',
  },
  'pg_catalog.float8 literal 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 literal 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float8 literal 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0010000000000000',
  },
  'pg_catalog.float8 literal 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 literal 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000001',
  },
  'pg_catalog.float8 literal 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8 literal 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 literal 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8 unary - 0': {
    kind: 'null',
  },
  'pg_catalog.float8 unary - 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8 unary - 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 unary - 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8 unary - 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 unary - 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'pg_catalog.float8 unary - 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'pg_catalog.float8 unary - 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float8 unary - 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfb999999999999a',
  },
  'pg_catalog.float8 unary - 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float8 unary - 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 unary - 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8010000000000000',
  },
  'pg_catalog.float8 unary - 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000001',
  },
  'pg_catalog.float8 unary - 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 unary - 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8 unary - 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8 unary - 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 unary + 0': {
    kind: 'null',
  },
  'pg_catalog.float8 unary + 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 unary + 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8 unary + 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 unary + 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8 unary + 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8 unary + 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8 unary + 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8 unary + 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb999999999999a',
  },
  'pg_catalog.float8 unary + 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 unary + 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float8 unary + 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0010000000000000',
  },
  'pg_catalog.float8 unary + 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 unary + 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000001',
  },
  'pg_catalog.float8 unary + 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8 unary + 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 unary + 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8 unary @ 0': {
    kind: 'null',
  },
  'pg_catalog.float8 unary @ 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 unary @ 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 unary @ 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 unary @ 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 unary @ 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8 unary @ 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8 unary @ 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8 unary @ 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb999999999999a',
  },
  'pg_catalog.float8 unary @ 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 unary @ 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 unary @ 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0010000000000000',
  },
  'pg_catalog.float8 unary @ 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 unary @ 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 unary @ 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8 unary @ 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 unary @ 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 unary abs 0': {
    kind: 'null',
  },
  'pg_catalog.float8 unary abs 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 unary abs 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 unary abs 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 unary abs 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 unary abs 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8 unary abs 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8 unary abs 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8 unary abs 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb999999999999a',
  },
  'pg_catalog.float8 unary abs 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 unary abs 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 unary abs 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0010000000000000',
  },
  'pg_catalog.float8 unary abs 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 unary abs 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 unary abs 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8 unary abs 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 unary abs 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 relabel 0': {
    kind: 'null',
  },
  'pg_catalog.float8 relabel 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8 relabel 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8 relabel 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8 relabel 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8 relabel 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8 relabel 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8 relabel 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8 relabel 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb999999999999a',
  },
  'pg_catalog.float8 relabel 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8 relabel 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float8 relabel 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0010000000000000',
  },
  'pg_catalog.float8 relabel 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'pg_catalog.float8 relabel 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000001',
  },
  'pg_catalog.float8 relabel 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8 relabel 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8 relabel 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8 to pg_catalog.float4 0': {
    kind: 'null',
  },
  'pg_catalog.float8 to pg_catalog.float4 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'pg_catalog.float8 to pg_catalog.float4 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '80000000',
  },
  'pg_catalog.float8 to pg_catalog.float4 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f800000',
  },
  'pg_catalog.float8 to pg_catalog.float4 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bf800000',
  },
  'pg_catalog.float8 to pg_catalog.float4 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40000000',
  },
  'pg_catalog.float8 to pg_catalog.float4 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '40400000',
  },
  'pg_catalog.float8 to pg_catalog.float4 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f000000',
  },
  'pg_catalog.float8 to pg_catalog.float4 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'pg_catalog.float8 to pg_catalog.float4 9': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.float4 10': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.float4 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.float4 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.float4 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.float4 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'pg_catalog.float8 to pg_catalog.float4 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'pg_catalog.float8 to pg_catalog.float4 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'float8 narrowing 1e+39': {
    kind: 'error',
    code: '22003',
  },
  'float8 narrowing -1e+39': {
    kind: 'error',
    code: '22003',
  },
  'float8 narrowing 1e-46': {
    kind: 'error',
    code: '22003',
  },
  'float8 narrowing -1e-46': {
    kind: 'error',
    code: '22003',
  },
  'float8 narrowing 16777217': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800000',
  },
  'float8 narrowing 16777219': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800002',
  },
  'float8 narrowing 7.006492321624085e-46': {
    kind: 'error',
    code: '22003',
  },
  'float8 narrowing 2.1019476964872256e-45': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000002',
  },
  'pg_catalog.int2 to pg_catalog.float8 null': {
    kind: 'null',
  },
  'pg_catalog.int2 to pg_catalog.float8 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.int2 to pg_catalog.float8 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.int2 to pg_catalog.float8 -1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.int2 to pg_catalog.float8 -32768': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c0e0000000000000',
  },
  'pg_catalog.int2 to pg_catalog.float8 32767': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '40dfffc000000000',
  },
  'pg_catalog.float8 to pg_catalog.int2 0': {
    kind: 'null',
  },
  'pg_catalog.float8 to pg_catalog.int2 1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int2 2': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int2 3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int2 4': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int2 5': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float8 to pg_catalog.int2 6': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float8 to pg_catalog.int2 7': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float8 to pg_catalog.int2 8': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float8 to pg_catalog.int2 9': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.float8 to pg_catalog.int2 10': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.float8 to pg_catalog.int2 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int2 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int2 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int2 14': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.float8 to pg_catalog.int2 15': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.float8 to pg_catalog.int2 16': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int2 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int2 18': {
    kind: 'value',
    value: '32766',
  },
  'pg_catalog.float8 to pg_catalog.int2 19': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.float8 to pg_catalog.int2 20': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int2 21': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.float8 to pg_catalog.int2 22': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 to pg_catalog.float8 null': {
    kind: 'null',
  },
  'pg_catalog.int4 to pg_catalog.float8 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.int4 to pg_catalog.float8 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.int4 to pg_catalog.float8 -1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.int4 to pg_catalog.float8 -2147483648': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c1e0000000000000',
  },
  'pg_catalog.int4 to pg_catalog.float8 2147483647': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '41dfffffffc00000',
  },
  'pg_catalog.int4 to pg_catalog.float8 16777217': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4170000010000000',
  },
  'pg_catalog.int4 to pg_catalog.float8 -16777217': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c170000010000000',
  },
  'pg_catalog.int4 to pg_catalog.float8 16777219': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4170000030000000',
  },
  'pg_catalog.float8 to pg_catalog.int4 0': {
    kind: 'null',
  },
  'pg_catalog.float8 to pg_catalog.int4 1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int4 2': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int4 3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int4 4': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int4 5': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float8 to pg_catalog.int4 6': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float8 to pg_catalog.int4 7': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float8 to pg_catalog.int4 8': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float8 to pg_catalog.int4 9': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.float8 to pg_catalog.int4 10': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.float8 to pg_catalog.int4 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int4 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int4 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int4 14': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.float8 to pg_catalog.int4 15': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.float8 to pg_catalog.int4 16': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int4 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int4 18': {
    kind: 'value',
    value: '2147483646',
  },
  'pg_catalog.float8 to pg_catalog.int4 19': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.float8 to pg_catalog.int4 20': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int4 21': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.float8 to pg_catalog.int4 22': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 to pg_catalog.float8 null': {
    kind: 'null',
  },
  'pg_catalog.int8 to pg_catalog.float8 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 -1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 -9223372036854775808': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c3e0000000000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 9223372036854775807': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43e0000000000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 9007199254740993': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4340000000000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 4611686293305294847': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43d0000010000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 -4611686293305294847': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c3d0000010000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 4611686293305294848': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43d0000010000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 -4611686293305294848': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c3d0000010000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 4611686293305294849': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43d0000010000000',
  },
  'pg_catalog.int8 to pg_catalog.float8 -4611686293305294849': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c3d0000010000000',
  },
  'pg_catalog.float8 to pg_catalog.int8 0': {
    kind: 'null',
  },
  'pg_catalog.float8 to pg_catalog.int8 1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int8 2': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int8 3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int8 4': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to pg_catalog.int8 5': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float8 to pg_catalog.int8 6': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float8 to pg_catalog.int8 7': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.float8 to pg_catalog.int8 8': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.float8 to pg_catalog.int8 9': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.float8 to pg_catalog.int8 10': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.float8 to pg_catalog.int8 11': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int8 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int8 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int8 14': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.float8 to pg_catalog.int8 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int8 16': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.float8 to pg_catalog.int8 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to pg_catalog.int8 18': {
    kind: 'value',
    value: '9223372036854774784',
  },
  'pg_catalog.float8 to pg_catalog.int8 19': {
    kind: 'value',
    value: '-9223372036854774784',
  },
  'pg_catalog.float8/pg_catalog.float4 + 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fc999999ccccccd',
  },
  'pg_catalog.float8/pg_catalog.float4 + 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 + 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 + 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 + 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 + 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36a0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 + 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 + 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 + 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 + 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 + 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 + 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 + 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 + 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 + 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 + 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 + 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 + 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 - 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'be19999998000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c014000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 - 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 - 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 - 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 - 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b6a0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 - 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 - 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 - 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 - 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 - 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 - 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 - 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 - 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 - 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 - 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 - 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 - 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 * 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f847ae14ccccccd',
  },
  'pg_catalog.float8/pg_catalog.float4 * 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4018000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c018000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c018000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 * 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 * 14': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 * 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '769fffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 * 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0008000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 * 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 * 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000002',
  },
  'pg_catalog.float8/pg_catalog.float4 * 19': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 * 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 * 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 * 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 * 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 * 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 * 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 * 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 * 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 * 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 * 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 * 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 * 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 / 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3feffffff8000002',
  },
  'pg_catalog.float8/pg_catalog.float4 / 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff8000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff8000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff8000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 5': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 6': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 7': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 8': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 9': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 11': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '77f0000010000010',
  },
  'pg_catalog.float8/pg_catalog.float4 / 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'f7f0000010000010',
  },
  'pg_catalog.float8/pg_catalog.float4 / 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fdfffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float4 / 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 / 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0020000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000002',
  },
  'pg_catalog.float8/pg_catalog.float4 / 18': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float4 / 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0620000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 / 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float4 / 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float4 / 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 26': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float4 / 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float4 / 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 / 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 / 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 / 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 / 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 = 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 = 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 = 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 = 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 = 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 = 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 = 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 = 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 = 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 = 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 = 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 = 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <> 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 < 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 < 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 < 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 < 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 < 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 < 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 < 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 <= 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 > 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 > 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 > 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 > 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 > 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 > 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 > 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 >= 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float4 precision = 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision = 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision = -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision = NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <> 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <> 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <> -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <> NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision < 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision < 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision < -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision < NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <= 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <= -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision <= NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision > 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision > 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision > -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision > NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision >= 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision >= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float4 precision >= -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float4 precision >= NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 + 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fc999999999999a',
  },
  'pg_catalog.float8/pg_catalog.float8 + 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 + 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float8 + 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float8 + 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 + 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000002',
  },
  'pg_catalog.float8/pg_catalog.float8 + 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 + 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 + 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 + 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 + 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 + 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 + 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 + 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 + 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 + 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 + 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 + 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 - 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c014000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 - 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float8 - 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float8 - 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 - 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 - 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 - 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 - 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 - 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 - 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 - 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 - 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 - 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 - 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 - 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 - 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 * 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f847ae147ae147c',
  },
  'pg_catalog.float8/pg_catalog.float8 * 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4018000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c018000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c018000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 12': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 * 13': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 * 14': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 * 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ccfffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float8 * 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0008000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 * 17': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 * 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000002',
  },
  'pg_catalog.float8/pg_catalog.float8 * 19': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 * 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 * 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 * 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 * 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 * 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 * 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 * 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 * 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 * 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 * 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 * 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 * 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 / 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff8000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff8000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff8000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 5': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 6': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 7': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 8': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 9': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 11': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fdfffffffffffff',
  },
  'pg_catalog.float8/pg_catalog.float8 / 15': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 / 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0020000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000002',
  },
  'pg_catalog.float8/pg_catalog.float8 / 18': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8/pg_catalog.float8 / 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 / 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'pg_catalog.float8/pg_catalog.float8 / 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'pg_catalog.float8/pg_catalog.float8 / 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 26': {
    kind: 'error',
    code: '22012',
  },
  'pg_catalog.float8/pg_catalog.float8 / 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'pg_catalog.float8/pg_catalog.float8 / 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 / 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 / 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 / 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 / 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 = 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 = 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 = 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 = 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 = 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 = 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 = 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <> 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 < 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 < 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 < 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 < 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 < 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 < 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 < 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 2': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 3': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 4': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 9': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 10': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 11': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 13': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 14': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 15': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 16': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 17': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 18': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 20': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 21': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 22': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 23': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 25': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 26': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 28': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 29': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 30': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 31': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 32': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 33': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 <= 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 > 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 1': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 5': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 6': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 7': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 8': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 12': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 19': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 24': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 27': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 > 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 > 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 > 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 > 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 > 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 > 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 1': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 2': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 3': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 4': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 5': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 6': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 7': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 8': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 9': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 10': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 11': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 12': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 13': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 14': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 15': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 16': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 17': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 18': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 19': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 20': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 21': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 22': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 23': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 24': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 25': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 26': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 27': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 28': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 29': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 30': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 31': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 32': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 33': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 34': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 35': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 36': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 37': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 >= 38': {
    kind: 'null',
  },
  'pg_catalog.float8/pg_catalog.float8 precision = 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision = 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision = -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision = NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <> 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <> 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <> -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <> NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision < 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision < 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision < -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision < NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <= 16777216/16777217': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <= -Infinity/0': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision <= NaN/-Infinity': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision > 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision > 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision > -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision > NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'pg_catalog.float8/pg_catalog.float8 precision >= 16777216/16777217': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision >= 9007199254740992/9007199254740994': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision >= -Infinity/0': {
    kind: 'value',
    value: 'false',
  },
  'pg_catalog.float8/pg_catalog.float8 precision >= NaN/-Infinity': {
    kind: 'value',
    value: 'true',
  },
  'nested integer zero divisor': {
    kind: 'error',
    code: '22012',
  },
  'integer division error through float cast': {
    kind: 'error',
    code: '22012',
  },
  'integer division error through float comparison': {
    kind: 'error',
    code: '22012',
  },
  'integer division error through float abs': {
    kind: 'error',
    code: '22012',
  },
  'nested float zero divisor': {
    kind: 'error',
    code: '22012',
  },
  'float division error through integer cast': {
    kind: 'error',
    code: '22012',
  },
  'float division error through integer remainder': {
    kind: 'error',
    code: '22012',
  },
  'float4 rounds intermediate addition': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800000',
  },
  'widen rounded float4 intermediate': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4170000000000000',
  },
  'widening preserves intermediate rounding': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'integer modulo minimum by negative one': {
    kind: 'value',
    value: '0',
  },
  'minimum remainder to float': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'float4 decimal parsing double rounding boundary': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '15ae43fd',
  },
  'pg_catalog.int2 bitwise & null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/1': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/-1': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/3': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/-3': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/-32768': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & null/32767': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 0/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 0/-3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 0/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 0/32767': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & 1/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 1/-1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 1/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 1/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 1/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 1/32767': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & -1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & -1/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & -1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise & -1/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise & -1/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise & -1/-32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise & -1/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise & 3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & 3/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 3/-1': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise & 3/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise & 3/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 3/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 3/32767': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise & -3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & -3/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & -3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & -3/-1': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise & -3/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & -3/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise & -3/-32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise & -3/32767': {
    kind: 'value',
    value: '32765',
  },
  'pg_catalog.int2 bitwise & -32768/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & -32768/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & -32768/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & -32768/-1': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise & -32768/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & -32768/-3': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise & -32768/-32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise & -32768/32767': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 32767/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise & 32767/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 32767/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise & 32767/-1': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise & 32767/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise & 32767/-3': {
    kind: 'value',
    value: '32765',
  },
  'pg_catalog.int2 bitwise & 32767/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise & 32767/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/1': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/-1': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/3': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/-3': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/-32768': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | null/32767': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise | 0/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise | 0/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 0/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise | 0/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | 0/-32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise | 0/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | 1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise | 1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise | 1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 1/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise | 1/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | 1/-32768': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2 bitwise | 1/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | -1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -1/1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -1/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -1/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -1/-32768': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -1/32767': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise | 3/1': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise | 3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 3/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise | 3/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 3/-32768': {
    kind: 'value',
    value: '-32765',
  },
  'pg_catalog.int2 bitwise | 3/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | -3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | -3/1': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | -3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -3/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -3/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | -3/-32768': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | -3/32767': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -32768/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | -32768/0': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise | -32768/1': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2 bitwise | -32768/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | -32768/3': {
    kind: 'value',
    value: '-32765',
  },
  'pg_catalog.int2 bitwise | -32768/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise | -32768/-32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise | -32768/32767': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 32767/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise | 32767/0': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | 32767/1': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | 32767/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 32767/3': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise | 32767/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 32767/-32768': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise | 32767/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise # null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/1': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/-1': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/3': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/-3': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/-32768': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # null/32767': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise # 0/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise # 0/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise # 0/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise # 0/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise # 0/-32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise # 0/32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise # 1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 bitwise # 1/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise # 1/-1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 bitwise # 1/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 bitwise # 1/-3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int2 bitwise # 1/-32768': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2 bitwise # 1/32767': {
    kind: 'value',
    value: '32766',
  },
  'pg_catalog.int2 bitwise # -1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise # -1/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 bitwise # -1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise # -1/3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int2 bitwise # -1/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 bitwise # -1/-32768': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise # -1/32767': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise # 3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 bitwise # 3/1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 bitwise # 3/-1': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int2 bitwise # 3/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise # 3/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 bitwise # 3/-32768': {
    kind: 'value',
    value: '-32765',
  },
  'pg_catalog.int2 bitwise # 3/32767': {
    kind: 'value',
    value: '32764',
  },
  'pg_catalog.int2 bitwise # -3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 bitwise # -3/1': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int2 bitwise # -3/-1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 bitwise # -3/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 bitwise # -3/-3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise # -3/-32768': {
    kind: 'value',
    value: '32765',
  },
  'pg_catalog.int2 bitwise # -3/32767': {
    kind: 'value',
    value: '-32766',
  },
  'pg_catalog.int2 bitwise # -32768/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # -32768/0': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise # -32768/1': {
    kind: 'value',
    value: '-32767',
  },
  'pg_catalog.int2 bitwise # -32768/-1': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise # -32768/3': {
    kind: 'value',
    value: '-32765',
  },
  'pg_catalog.int2 bitwise # -32768/-3': {
    kind: 'value',
    value: '32765',
  },
  'pg_catalog.int2 bitwise # -32768/-32768': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 bitwise # -32768/32767': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise # 32767/null': {
    kind: 'null',
  },
  'pg_catalog.int2 bitwise # 32767/0': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 bitwise # 32767/1': {
    kind: 'value',
    value: '32766',
  },
  'pg_catalog.int2 bitwise # 32767/-1': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 bitwise # 32767/3': {
    kind: 'value',
    value: '32764',
  },
  'pg_catalog.int2 bitwise # 32767/-3': {
    kind: 'value',
    value: '-32766',
  },
  'pg_catalog.int2 bitwise # 32767/-32768': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 bitwise # 32767/32767': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 integer unary ~ null': {
    kind: 'null',
  },
  'pg_catalog.int2 integer unary ~ 0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 integer unary ~ 1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 integer unary ~ -1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 integer unary ~ 3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int2 integer unary ~ -3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 integer unary ~ -32768': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 integer unary ~ 32767': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 integer unary + null': {
    kind: 'null',
  },
  'pg_catalog.int2 integer unary + 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 integer unary + 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 integer unary + -1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 integer unary + 3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 integer unary + -3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 integer unary + -32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 integer unary + 32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 integer unary @ null': {
    kind: 'null',
  },
  'pg_catalog.int2 integer unary @ 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 integer unary @ 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 integer unary @ -1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 integer unary @ 3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 integer unary @ -3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 integer unary @ -32768': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int2 integer unary @ 32767': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-65': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-64': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-33': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-32': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-17': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-16': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/-1': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/1': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/15': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/16': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/17': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/31': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/32': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/33': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/63': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/64': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/65': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << 1/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift << 1/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/-64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift << 1/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/-32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift << 1/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << 1/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift << 1/1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 shift << 1/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << 1/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift << 1/33': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 shift << 1/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 1/64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift << 1/65': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int2 shift << 1/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift << -1/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/-64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift << -1/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/-32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift << -1/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -1/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift << -1/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift << -1/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -1/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift << -1/33': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift << -1/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -1/64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift << -1/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift << -1/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << 3/-2147483648': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift << 3/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/-64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift << 3/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/-32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift << 3/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << 3/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift << 3/1': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int2 shift << 3/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << 3/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift << 3/33': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int2 shift << 3/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 3/64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift << 3/65': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int2 shift << 3/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift << -3/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/-64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift << -3/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/-32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift << -3/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -3/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift << -3/1': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int2 shift << -3/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -3/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift << -3/33': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int2 shift << -3/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -3/64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift << -3/65': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int2 shift << -3/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << -32768/-2147483648': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -32768/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/-64': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -32768/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/-32': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -32768/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/0': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -32768/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/32': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -32768/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/64': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << -32768/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << -32768/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift << 32767/-2147483648': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << 32767/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/-64': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << 32767/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/-32': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << 32767/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << 32767/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/0': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << 32767/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift << 32767/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift << 32767/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/32': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << 32767/33': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift << 32767/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift << 32767/64': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift << 32767/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift << 32767/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-65': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-64': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-33': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-32': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-17': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-16': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/-1': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/0': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/1': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/15': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/16': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/17': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/31': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/32': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/33': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/63': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/64': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/65': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> 0/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> 1/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 1/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/-64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 1/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/-32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 1/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 1/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 1/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 1/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 1/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> -1/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -1/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> 3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> 3/-2147483648': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift >> 3/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/-64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift >> 3/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/-32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift >> 3/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift >> 3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 3/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift >> 3/33': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 3/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 3/64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int2 shift >> 3/65': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 shift >> 3/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> -3/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift >> -3/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/-64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift >> -3/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/-32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift >> -3/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift >> -3/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift >> -3/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift >> -3/33': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift >> -3/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -3/64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int2 shift >> -3/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int2 shift >> -3/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> -32768/-2147483648': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift >> -32768/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/-64': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift >> -32768/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/-32': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift >> -32768/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/0': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift >> -32768/1': {
    kind: 'value',
    value: '-16384',
  },
  'pg_catalog.int2 shift >> -32768/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/32': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift >> -32768/33': {
    kind: 'value',
    value: '-16384',
  },
  'pg_catalog.int2 shift >> -32768/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> -32768/64': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 shift >> -32768/65': {
    kind: 'value',
    value: '-16384',
  },
  'pg_catalog.int2 shift >> -32768/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 shift >> 32767/null': {
    kind: 'null',
  },
  'pg_catalog.int2 shift >> 32767/-2147483648': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift >> 32767/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/-64': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift >> 32767/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/-32': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift >> 32767/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/0': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift >> 32767/1': {
    kind: 'value',
    value: '16383',
  },
  'pg_catalog.int2 shift >> 32767/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/32': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift >> 32767/33': {
    kind: 'value',
    value: '16383',
  },
  'pg_catalog.int2 shift >> 32767/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 shift >> 32767/64': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int2 shift >> 32767/65': {
    kind: 'value',
    value: '16383',
  },
  'pg_catalog.int2 shift >> 32767/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/1': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/-1': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/3': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/-3': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 0/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 0/-3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & 1/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 1/-1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 1/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 1/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 1/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 1/2147483647': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & -1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & -1/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & -1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise & -1/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise & -1/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise & -1/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise & -1/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise & 3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & 3/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 3/-1': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise & 3/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise & 3/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 3/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 3/2147483647': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise & -3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & -3/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & -3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & -3/-1': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise & -3/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & -3/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise & -3/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise & -3/2147483647': {
    kind: 'value',
    value: '2147483645',
  },
  'pg_catalog.int4 bitwise & -2147483648/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & -2147483648/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & -2147483648/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & -2147483648/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise & -2147483648/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & -2147483648/-3': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise & -2147483648/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise & -2147483648/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise & 2147483647/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 2147483647/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise & 2147483647/-1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise & 2147483647/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise & 2147483647/-3': {
    kind: 'value',
    value: '2147483645',
  },
  'pg_catalog.int4 bitwise & 2147483647/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise & 2147483647/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/1': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/-1': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/3': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/-3': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise | 0/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise | 0/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 0/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise | 0/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | 0/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise | 0/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | 1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise | 1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise | 1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 1/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise | 1/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | 1/-2147483648': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4 bitwise | 1/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | -1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -1/1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -1/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -1/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -1/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise | 3/1': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise | 3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 3/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise | 3/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 3/-2147483648': {
    kind: 'value',
    value: '-2147483645',
  },
  'pg_catalog.int4 bitwise | 3/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | -3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | -3/1': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | -3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -3/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -3/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | -3/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -2147483648/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | -2147483648/0': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise | -2147483648/1': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4 bitwise | -2147483648/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | -2147483648/3': {
    kind: 'value',
    value: '-2147483645',
  },
  'pg_catalog.int4 bitwise | -2147483648/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise | -2147483648/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise | -2147483648/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise | 2147483647/0': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | 2147483647/1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | 2147483647/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 2147483647/3': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise | 2147483647/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 2147483647/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise | 2147483647/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise # null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/1': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/-1': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/3': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/-3': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise # 0/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise # 0/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise # 0/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise # 0/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise # 0/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise # 0/2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise # 1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 bitwise # 1/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise # 1/-1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 bitwise # 1/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 bitwise # 1/-3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int4 bitwise # 1/-2147483648': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4 bitwise # 1/2147483647': {
    kind: 'value',
    value: '2147483646',
  },
  'pg_catalog.int4 bitwise # -1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise # -1/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 bitwise # -1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise # -1/3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int4 bitwise # -1/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 bitwise # -1/-2147483648': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise # -1/2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise # 3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 bitwise # 3/1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 bitwise # 3/-1': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int4 bitwise # 3/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise # 3/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 bitwise # 3/-2147483648': {
    kind: 'value',
    value: '-2147483645',
  },
  'pg_catalog.int4 bitwise # 3/2147483647': {
    kind: 'value',
    value: '2147483644',
  },
  'pg_catalog.int4 bitwise # -3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 bitwise # -3/1': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int4 bitwise # -3/-1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 bitwise # -3/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 bitwise # -3/-3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise # -3/-2147483648': {
    kind: 'value',
    value: '2147483645',
  },
  'pg_catalog.int4 bitwise # -3/2147483647': {
    kind: 'value',
    value: '-2147483646',
  },
  'pg_catalog.int4 bitwise # -2147483648/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # -2147483648/0': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise # -2147483648/1': {
    kind: 'value',
    value: '-2147483647',
  },
  'pg_catalog.int4 bitwise # -2147483648/-1': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise # -2147483648/3': {
    kind: 'value',
    value: '-2147483645',
  },
  'pg_catalog.int4 bitwise # -2147483648/-3': {
    kind: 'value',
    value: '2147483645',
  },
  'pg_catalog.int4 bitwise # -2147483648/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 bitwise # -2147483648/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise # 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 bitwise # 2147483647/0': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 bitwise # 2147483647/1': {
    kind: 'value',
    value: '2147483646',
  },
  'pg_catalog.int4 bitwise # 2147483647/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 bitwise # 2147483647/3': {
    kind: 'value',
    value: '2147483644',
  },
  'pg_catalog.int4 bitwise # 2147483647/-3': {
    kind: 'value',
    value: '-2147483646',
  },
  'pg_catalog.int4 bitwise # 2147483647/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 bitwise # 2147483647/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 integer unary ~ null': {
    kind: 'null',
  },
  'pg_catalog.int4 integer unary ~ 0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 integer unary ~ 1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 integer unary ~ -1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 integer unary ~ 3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int4 integer unary ~ -3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 integer unary ~ -2147483648': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 integer unary ~ 2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 integer unary + null': {
    kind: 'null',
  },
  'pg_catalog.int4 integer unary + 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 integer unary + 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 integer unary + -1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 integer unary + 3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 integer unary + -3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 integer unary + -2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 integer unary + 2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 integer unary @ null': {
    kind: 'null',
  },
  'pg_catalog.int4 integer unary @ 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 integer unary @ 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 integer unary @ -1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 integer unary @ 3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 integer unary @ -3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 integer unary @ -2147483648': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 integer unary @ 2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-65': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-64': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-33': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-32': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-17': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-16': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/-1': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/1': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/15': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/16': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/17': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/31': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/32': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/33': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/63': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/64': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/65': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << 1/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift << 1/-65': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 1/-64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift << 1/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 1/-32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift << 1/-17': {
    kind: 'value',
    value: '32768',
  },
  'pg_catalog.int4 shift << 1/-16': {
    kind: 'value',
    value: '65536',
  },
  'pg_catalog.int4 shift << 1/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift << 1/1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 shift << 1/15': {
    kind: 'value',
    value: '32768',
  },
  'pg_catalog.int4 shift << 1/16': {
    kind: 'value',
    value: '65536',
  },
  'pg_catalog.int4 shift << 1/17': {
    kind: 'value',
    value: '131072',
  },
  'pg_catalog.int4 shift << 1/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 1/32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift << 1/33': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 shift << 1/63': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 1/64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift << 1/65': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int4 shift << 1/2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift << -1/-65': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -1/-64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift << -1/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -1/-32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift << -1/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int4 shift << -1/-16': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int4 shift << -1/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift << -1/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift << -1/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int4 shift << -1/16': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int4 shift << -1/17': {
    kind: 'value',
    value: '-131072',
  },
  'pg_catalog.int4 shift << -1/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -1/32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift << -1/33': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift << -1/63': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -1/64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift << -1/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift << -1/2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << 3/-2147483648': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift << 3/-65': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 3/-64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift << 3/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 3/-32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift << 3/-17': {
    kind: 'value',
    value: '98304',
  },
  'pg_catalog.int4 shift << 3/-16': {
    kind: 'value',
    value: '196608',
  },
  'pg_catalog.int4 shift << 3/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift << 3/1': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 shift << 3/15': {
    kind: 'value',
    value: '98304',
  },
  'pg_catalog.int4 shift << 3/16': {
    kind: 'value',
    value: '196608',
  },
  'pg_catalog.int4 shift << 3/17': {
    kind: 'value',
    value: '393216',
  },
  'pg_catalog.int4 shift << 3/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 3/32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift << 3/33': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 shift << 3/63': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 3/64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift << 3/65': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int4 shift << 3/2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift << -3/-65': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -3/-64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift << -3/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -3/-32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift << -3/-17': {
    kind: 'value',
    value: '-98304',
  },
  'pg_catalog.int4 shift << -3/-16': {
    kind: 'value',
    value: '-196608',
  },
  'pg_catalog.int4 shift << -3/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift << -3/1': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int4 shift << -3/15': {
    kind: 'value',
    value: '-98304',
  },
  'pg_catalog.int4 shift << -3/16': {
    kind: 'value',
    value: '-196608',
  },
  'pg_catalog.int4 shift << -3/17': {
    kind: 'value',
    value: '-393216',
  },
  'pg_catalog.int4 shift << -3/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -3/32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift << -3/33': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int4 shift << -3/63': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -3/64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift << -3/65': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int4 shift << -3/2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << -2147483648/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/-64': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/-32': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/0': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/32': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/64': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << -2147483648/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << -2147483648/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift << 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift << 2147483647/-2147483648': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << 2147483647/-65': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 2147483647/-64': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << 2147483647/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 2147483647/-32': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << 2147483647/-17': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int4 shift << 2147483647/-16': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int4 shift << 2147483647/-1': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 2147483647/0': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << 2147483647/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift << 2147483647/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int4 shift << 2147483647/16': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int4 shift << 2147483647/17': {
    kind: 'value',
    value: '-131072',
  },
  'pg_catalog.int4 shift << 2147483647/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 2147483647/32': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << 2147483647/33': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift << 2147483647/63': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift << 2147483647/64': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift << 2147483647/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift << 2147483647/2147483647': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> null/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-65': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-64': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-33': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-32': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-17': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-16': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/-1': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/0': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/1': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/15': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/16': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/17': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/31': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/32': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/33': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/63': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/64': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/65': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> 0/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> 1/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 1/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/-64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 1/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/-32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 1/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 1/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/32': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 1/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 1/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 1/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> -1/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -1/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> 3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> 3/-2147483648': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift >> 3/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/-64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift >> 3/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/-32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift >> 3/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift >> 3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 3/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/32': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift >> 3/33': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 3/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 3/64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int4 shift >> 3/65': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 shift >> 3/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> -3/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift >> -3/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/-64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift >> -3/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/-32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift >> -3/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift >> -3/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift >> -3/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/32': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift >> -3/33': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift >> -3/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -3/64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int4 shift >> -3/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int4 shift >> -3/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -2147483648/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> -2147483648/-2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> -2147483648/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -2147483648/-64': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> -2147483648/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -2147483648/-32': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> -2147483648/-17': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int4 shift >> -2147483648/-16': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int4 shift >> -2147483648/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -2147483648/0': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> -2147483648/1': {
    kind: 'value',
    value: '-1073741824',
  },
  'pg_catalog.int4 shift >> -2147483648/15': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int4 shift >> -2147483648/16': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int4 shift >> -2147483648/17': {
    kind: 'value',
    value: '-16384',
  },
  'pg_catalog.int4 shift >> -2147483648/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -2147483648/32': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> -2147483648/33': {
    kind: 'value',
    value: '-1073741824',
  },
  'pg_catalog.int4 shift >> -2147483648/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> -2147483648/64': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 shift >> -2147483648/65': {
    kind: 'value',
    value: '-1073741824',
  },
  'pg_catalog.int4 shift >> -2147483648/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 shift >> 2147483647/null': {
    kind: 'null',
  },
  'pg_catalog.int4 shift >> 2147483647/-2147483648': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift >> 2147483647/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 2147483647/-64': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift >> 2147483647/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 2147483647/-32': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift >> 2147483647/-17': {
    kind: 'value',
    value: '65535',
  },
  'pg_catalog.int4 shift >> 2147483647/-16': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int4 shift >> 2147483647/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 2147483647/0': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift >> 2147483647/1': {
    kind: 'value',
    value: '1073741823',
  },
  'pg_catalog.int4 shift >> 2147483647/15': {
    kind: 'value',
    value: '65535',
  },
  'pg_catalog.int4 shift >> 2147483647/16': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int4 shift >> 2147483647/17': {
    kind: 'value',
    value: '16383',
  },
  'pg_catalog.int4 shift >> 2147483647/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 2147483647/32': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift >> 2147483647/33': {
    kind: 'value',
    value: '1073741823',
  },
  'pg_catalog.int4 shift >> 2147483647/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 shift >> 2147483647/64': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int4 shift >> 2147483647/65': {
    kind: 'value',
    value: '1073741823',
  },
  'pg_catalog.int4 shift >> 2147483647/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/1': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/-1': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/3': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/-3': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/-9223372036854775808': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & null/9223372036854775807': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 0/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 0/-3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 0/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 0/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & 1/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 1/-1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 1/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 1/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 1/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 1/9223372036854775807': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & -1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & -1/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & -1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise & -1/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise & -1/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise & -1/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise & -1/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise & 3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & 3/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 3/-1': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise & 3/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise & 3/-3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 3/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 3/9223372036854775807': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise & -3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & -3/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & -3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & -3/-1': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise & -3/3': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & -3/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise & -3/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise & -3/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775805',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/-3': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise & -9223372036854775808/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/-1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/-3': {
    kind: 'value',
    value: '9223372036854775805',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise & 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/1': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/-1': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/3': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/-3': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/-9223372036854775808': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | null/9223372036854775807': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise | 0/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise | 0/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 0/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise | 0/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | 0/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise | 0/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | 1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise | 1/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise | 1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 1/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise | 1/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | 1/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8 bitwise | 1/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | -1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -1/1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -1/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -1/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -1/-9223372036854775808': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -1/9223372036854775807': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise | 3/1': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise | 3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 3/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise | 3/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 3/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775805',
  },
  'pg_catalog.int8 bitwise | 3/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | -3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | -3/1': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | -3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -3/3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -3/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | -3/-9223372036854775808': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | -3/9223372036854775807': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/0': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/1': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/3': {
    kind: 'value',
    value: '-9223372036854775805',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise | -9223372036854775808/9223372036854775807': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/0': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/3': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/-3': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/-9223372036854775808': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise | 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise # null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/1': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/-1': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/3': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/-3': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/-9223372036854775808': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # null/9223372036854775807': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise # 0/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise # 0/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise # 0/3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise # 0/-3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise # 0/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise # 0/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise # 1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 bitwise # 1/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise # 1/-1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 bitwise # 1/3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 bitwise # 1/-3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int8 bitwise # 1/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8 bitwise # 1/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775806',
  },
  'pg_catalog.int8 bitwise # -1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise # -1/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 bitwise # -1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise # -1/3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int8 bitwise # -1/-3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 bitwise # -1/-9223372036854775808': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise # -1/9223372036854775807': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise # 3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 bitwise # 3/1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 bitwise # 3/-1': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int8 bitwise # 3/3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise # 3/-3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 bitwise # 3/-9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775805',
  },
  'pg_catalog.int8 bitwise # 3/9223372036854775807': {
    kind: 'value',
    value: '9223372036854775804',
  },
  'pg_catalog.int8 bitwise # -3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 bitwise # -3/1': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int8 bitwise # -3/-1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 bitwise # -3/3': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 bitwise # -3/-3': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise # -3/-9223372036854775808': {
    kind: 'value',
    value: '9223372036854775805',
  },
  'pg_catalog.int8 bitwise # -3/9223372036854775807': {
    kind: 'value',
    value: '-9223372036854775806',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/0': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/1': {
    kind: 'value',
    value: '-9223372036854775807',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/-1': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/3': {
    kind: 'value',
    value: '-9223372036854775805',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/-3': {
    kind: 'value',
    value: '9223372036854775805',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/-9223372036854775808': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 bitwise # -9223372036854775808/9223372036854775807': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/0': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/1': {
    kind: 'value',
    value: '9223372036854775806',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/3': {
    kind: 'value',
    value: '9223372036854775804',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/-3': {
    kind: 'value',
    value: '-9223372036854775806',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/-9223372036854775808': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 bitwise # 9223372036854775807/9223372036854775807': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 integer unary ~ null': {
    kind: 'null',
  },
  'pg_catalog.int8 integer unary ~ 0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 integer unary ~ 1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 integer unary ~ -1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 integer unary ~ 3': {
    kind: 'value',
    value: '-4',
  },
  'pg_catalog.int8 integer unary ~ -3': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 integer unary ~ -9223372036854775808': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 integer unary ~ 9223372036854775807': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 integer unary + null': {
    kind: 'null',
  },
  'pg_catalog.int8 integer unary + 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 integer unary + 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 integer unary + -1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 integer unary + 3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 integer unary + -3': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 integer unary + -9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 integer unary + 9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 integer unary @ null': {
    kind: 'null',
  },
  'pg_catalog.int8 integer unary @ 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 integer unary @ 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 integer unary @ -1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 integer unary @ 3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 integer unary @ -3': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 integer unary @ -9223372036854775808': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 integer unary @ 9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift << null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-65': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-64': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-33': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-32': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-17': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-16': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/-1': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/1': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/15': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/16': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/17': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/31': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/32': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/33': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/63': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/64': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/65': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << 1/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift << 1/-65': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 1/-64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift << 1/-33': {
    kind: 'value',
    value: '2147483648',
  },
  'pg_catalog.int8 shift << 1/-32': {
    kind: 'value',
    value: '4294967296',
  },
  'pg_catalog.int8 shift << 1/-17': {
    kind: 'value',
    value: '140737488355328',
  },
  'pg_catalog.int8 shift << 1/-16': {
    kind: 'value',
    value: '281474976710656',
  },
  'pg_catalog.int8 shift << 1/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift << 1/1': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 shift << 1/15': {
    kind: 'value',
    value: '32768',
  },
  'pg_catalog.int8 shift << 1/16': {
    kind: 'value',
    value: '65536',
  },
  'pg_catalog.int8 shift << 1/17': {
    kind: 'value',
    value: '131072',
  },
  'pg_catalog.int8 shift << 1/31': {
    kind: 'value',
    value: '2147483648',
  },
  'pg_catalog.int8 shift << 1/32': {
    kind: 'value',
    value: '4294967296',
  },
  'pg_catalog.int8 shift << 1/33': {
    kind: 'value',
    value: '8589934592',
  },
  'pg_catalog.int8 shift << 1/63': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 1/64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift << 1/65': {
    kind: 'value',
    value: '2',
  },
  'pg_catalog.int8 shift << 1/2147483647': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift << -1/-65': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -1/-64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift << -1/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 shift << -1/-32': {
    kind: 'value',
    value: '-4294967296',
  },
  'pg_catalog.int8 shift << -1/-17': {
    kind: 'value',
    value: '-140737488355328',
  },
  'pg_catalog.int8 shift << -1/-16': {
    kind: 'value',
    value: '-281474976710656',
  },
  'pg_catalog.int8 shift << -1/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift << -1/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 shift << -1/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int8 shift << -1/16': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int8 shift << -1/17': {
    kind: 'value',
    value: '-131072',
  },
  'pg_catalog.int8 shift << -1/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 shift << -1/32': {
    kind: 'value',
    value: '-4294967296',
  },
  'pg_catalog.int8 shift << -1/33': {
    kind: 'value',
    value: '-8589934592',
  },
  'pg_catalog.int8 shift << -1/63': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -1/64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift << -1/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 shift << -1/2147483647': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << 3/-2147483648': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift << 3/-65': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 3/-64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift << 3/-33': {
    kind: 'value',
    value: '6442450944',
  },
  'pg_catalog.int8 shift << 3/-32': {
    kind: 'value',
    value: '12884901888',
  },
  'pg_catalog.int8 shift << 3/-17': {
    kind: 'value',
    value: '422212465065984',
  },
  'pg_catalog.int8 shift << 3/-16': {
    kind: 'value',
    value: '844424930131968',
  },
  'pg_catalog.int8 shift << 3/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift << 3/1': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int8 shift << 3/15': {
    kind: 'value',
    value: '98304',
  },
  'pg_catalog.int8 shift << 3/16': {
    kind: 'value',
    value: '196608',
  },
  'pg_catalog.int8 shift << 3/17': {
    kind: 'value',
    value: '393216',
  },
  'pg_catalog.int8 shift << 3/31': {
    kind: 'value',
    value: '6442450944',
  },
  'pg_catalog.int8 shift << 3/32': {
    kind: 'value',
    value: '12884901888',
  },
  'pg_catalog.int8 shift << 3/33': {
    kind: 'value',
    value: '25769803776',
  },
  'pg_catalog.int8 shift << 3/63': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 3/64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift << 3/65': {
    kind: 'value',
    value: '6',
  },
  'pg_catalog.int8 shift << 3/2147483647': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift << -3/-65': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -3/-64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift << -3/-33': {
    kind: 'value',
    value: '-6442450944',
  },
  'pg_catalog.int8 shift << -3/-32': {
    kind: 'value',
    value: '-12884901888',
  },
  'pg_catalog.int8 shift << -3/-17': {
    kind: 'value',
    value: '-422212465065984',
  },
  'pg_catalog.int8 shift << -3/-16': {
    kind: 'value',
    value: '-844424930131968',
  },
  'pg_catalog.int8 shift << -3/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift << -3/1': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int8 shift << -3/15': {
    kind: 'value',
    value: '-98304',
  },
  'pg_catalog.int8 shift << -3/16': {
    kind: 'value',
    value: '-196608',
  },
  'pg_catalog.int8 shift << -3/17': {
    kind: 'value',
    value: '-393216',
  },
  'pg_catalog.int8 shift << -3/31': {
    kind: 'value',
    value: '-6442450944',
  },
  'pg_catalog.int8 shift << -3/32': {
    kind: 'value',
    value: '-12884901888',
  },
  'pg_catalog.int8 shift << -3/33': {
    kind: 'value',
    value: '-25769803776',
  },
  'pg_catalog.int8 shift << -3/63': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -3/64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift << -3/65': {
    kind: 'value',
    value: '-6',
  },
  'pg_catalog.int8 shift << -3/2147483647': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -9223372036854775808/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-2147483648': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-64': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/0': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -9223372036854775808/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/64': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << -9223372036854775808/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << -9223372036854775808/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift << 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-2147483648': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-65': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-64': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-33': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-32': {
    kind: 'value',
    value: '-4294967296',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-17': {
    kind: 'value',
    value: '-140737488355328',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-16': {
    kind: 'value',
    value: '-281474976710656',
  },
  'pg_catalog.int8 shift << 9223372036854775807/-1': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 9223372036854775807/0': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift << 9223372036854775807/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 shift << 9223372036854775807/15': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int8 shift << 9223372036854775807/16': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int8 shift << 9223372036854775807/17': {
    kind: 'value',
    value: '-131072',
  },
  'pg_catalog.int8 shift << 9223372036854775807/31': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 shift << 9223372036854775807/32': {
    kind: 'value',
    value: '-4294967296',
  },
  'pg_catalog.int8 shift << 9223372036854775807/33': {
    kind: 'value',
    value: '-8589934592',
  },
  'pg_catalog.int8 shift << 9223372036854775807/63': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift << 9223372036854775807/64': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift << 9223372036854775807/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 shift << 9223372036854775807/2147483647': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift >> null/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-2147483648': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-65': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-64': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-33': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-32': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-17': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-16': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/-1': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/0': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/1': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/15': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/16': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/17': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/31': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/32': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/33': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/63': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/64': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/65': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> null/2147483647': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> 0/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/64': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 0/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> 1/-2147483648': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift >> 1/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/-64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift >> 1/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/0': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift >> 1/1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/64': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift >> 1/65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 1/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> -1/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> -1/-2147483648': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/0': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/64': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -1/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> 3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> 3/-2147483648': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift >> 3/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/-64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift >> 3/-33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/-32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/-17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/-16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/0': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift >> 3/1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift >> 3/15': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/16': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/17': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/31': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/32': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/33': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 3/64': {
    kind: 'value',
    value: '3',
  },
  'pg_catalog.int8 shift >> 3/65': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 shift >> 3/2147483647': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> -3/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> -3/-2147483648': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift >> -3/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/-64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift >> -3/-33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/-32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/-17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/-16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/0': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift >> -3/1': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 shift >> -3/15': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/16': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/17': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/31': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/32': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/33': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -3/64': {
    kind: 'value',
    value: '-3',
  },
  'pg_catalog.int8 shift >> -3/65': {
    kind: 'value',
    value: '-2',
  },
  'pg_catalog.int8 shift >> -3/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-2147483648': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-65': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-64': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-33': {
    kind: 'value',
    value: '-4294967296',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-32': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-17': {
    kind: 'value',
    value: '-65536',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-16': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/-1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/0': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/1': {
    kind: 'value',
    value: '-4611686018427387904',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/15': {
    kind: 'value',
    value: '-281474976710656',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/16': {
    kind: 'value',
    value: '-140737488355328',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/17': {
    kind: 'value',
    value: '-70368744177664',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/31': {
    kind: 'value',
    value: '-4294967296',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/32': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/33': {
    kind: 'value',
    value: '-1073741824',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/63': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/64': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/65': {
    kind: 'value',
    value: '-4611686018427387904',
  },
  'pg_catalog.int8 shift >> -9223372036854775808/2147483647': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/null': {
    kind: 'null',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-2147483648': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-65': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-64': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-33': {
    kind: 'value',
    value: '4294967295',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-32': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-17': {
    kind: 'value',
    value: '65535',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-16': {
    kind: 'value',
    value: '32767',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/-1': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/0': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/1': {
    kind: 'value',
    value: '4611686018427387903',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/15': {
    kind: 'value',
    value: '281474976710655',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/16': {
    kind: 'value',
    value: '140737488355327',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/17': {
    kind: 'value',
    value: '70368744177663',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/31': {
    kind: 'value',
    value: '4294967295',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/32': {
    kind: 'value',
    value: '2147483647',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/33': {
    kind: 'value',
    value: '1073741823',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/63': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/64': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/65': {
    kind: 'value',
    value: '4611686018427387903',
  },
  'pg_catalog.int8 shift >> 9223372036854775807/2147483647': {
    kind: 'value',
    value: '0',
  },
  'float8 utility ceil 0': {
    kind: 'null',
  },
  'float8 utility ceil 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility ceil 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility ceil 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceil 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility ceil 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'float8 utility ceil 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'float8 utility ceil 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility ceil 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility ceil 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 utility ceil 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceil 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility ceil 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility ceil 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility ceil 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility ceil 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'float8 utility ceil 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceil 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceil 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility ceil 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 utility ceil 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c020000000000000',
  },
  'float8 utility ceil 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '403b000000000000',
  },
  'float8 utility ceil 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c03b000000000000',
  },
  'float8 utility ceil 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4050000000000000',
  },
  'float8 utility ceil 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c050000000000000',
  },
  'float8 utility ceil 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceil 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceil 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7e37e43c8800759c',
  },
  'float8 utility ceil 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'fe37e43c8800759c',
  },
  'float8 utility ceil 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility ceil 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c32ffffffffffffe',
  },
  'float8 utility ceil 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility ceil 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4340000000000000',
  },
  'float8 utility ceiling 0': {
    kind: 'null',
  },
  'float8 utility ceiling 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility ceiling 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility ceiling 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceiling 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility ceiling 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'float8 utility ceiling 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'float8 utility ceiling 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility ceiling 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility ceiling 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 utility ceiling 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceiling 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility ceiling 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility ceiling 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility ceiling 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility ceiling 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'float8 utility ceiling 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceiling 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility ceiling 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility ceiling 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 utility ceiling 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c020000000000000',
  },
  'float8 utility ceiling 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '403b000000000000',
  },
  'float8 utility ceiling 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c03b000000000000',
  },
  'float8 utility ceiling 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4050000000000000',
  },
  'float8 utility ceiling 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c050000000000000',
  },
  'float8 utility ceiling 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility ceiling 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility ceiling 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7e37e43c8800759c',
  },
  'float8 utility ceiling 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'fe37e43c8800759c',
  },
  'float8 utility ceiling 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility ceiling 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c32ffffffffffffe',
  },
  'float8 utility ceiling 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility ceiling 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4340000000000000',
  },
  'float8 utility floor 0': {
    kind: 'null',
  },
  'float8 utility floor 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility floor 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility floor 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility floor 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility floor 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'float8 utility floor 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'float8 utility floor 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility floor 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility floor 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 utility floor 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility floor 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility floor 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility floor 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'float8 utility floor 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility floor 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c010000000000000',
  },
  'float8 utility floor 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility floor 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility floor 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility floor 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 utility floor 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c020000000000000',
  },
  'float8 utility floor 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '403b000000000000',
  },
  'float8 utility floor 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c03b000000000000',
  },
  'float8 utility floor 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4050000000000000',
  },
  'float8 utility floor 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c050000000000000',
  },
  'float8 utility floor 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility floor 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility floor 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7e37e43c8800759c',
  },
  'float8 utility floor 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'fe37e43c8800759c',
  },
  'float8 utility floor 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '432ffffffffffffe',
  },
  'float8 utility floor 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c330000000000000',
  },
  'float8 utility floor 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility floor 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4340000000000000',
  },
  'float8 utility round 0': {
    kind: 'null',
  },
  'float8 utility round 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility round 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility round 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility round 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility round 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility round 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'float8 utility round 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'float8 utility round 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility round 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility round 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility round 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 utility round 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility round 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility round 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility round 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility round 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility round 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility round 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility round 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c010000000000000',
  },
  'float8 utility round 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility round 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility round 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility round 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility round 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility round 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility round 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 utility round 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c020000000000000',
  },
  'float8 utility round 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '403b000000000000',
  },
  'float8 utility round 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c03b000000000000',
  },
  'float8 utility round 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4050000000000000',
  },
  'float8 utility round 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c050000000000000',
  },
  'float8 utility round 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility round 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility round 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7e37e43c8800759c',
  },
  'float8 utility round 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'fe37e43c8800759c',
  },
  'float8 utility round 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility round 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c330000000000000',
  },
  'float8 utility round 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility round 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4340000000000000',
  },
  'float8 utility trunc 0': {
    kind: 'null',
  },
  'float8 utility trunc 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility trunc 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility trunc 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility trunc 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility trunc 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'float8 utility trunc 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ffefffffffffffff',
  },
  'float8 utility trunc 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility trunc 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility trunc 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 utility trunc 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility trunc 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility trunc 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility trunc 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility trunc 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility trunc 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'float8 utility trunc 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility trunc 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility trunc 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility trunc 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 utility trunc 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c020000000000000',
  },
  'float8 utility trunc 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '403b000000000000',
  },
  'float8 utility trunc 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c03b000000000000',
  },
  'float8 utility trunc 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4050000000000000',
  },
  'float8 utility trunc 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c050000000000000',
  },
  'float8 utility trunc 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility trunc 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility trunc 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7e37e43c8800759c',
  },
  'float8 utility trunc 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'fe37e43c8800759c',
  },
  'float8 utility trunc 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '432ffffffffffffe',
  },
  'float8 utility trunc 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c32ffffffffffffe',
  },
  'float8 utility trunc 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4330000000000000',
  },
  'float8 utility trunc 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4340000000000000',
  },
  'float8 utility sign 0': {
    kind: 'null',
  },
  'float8 utility sign 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility sign 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility sign 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility sign 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility sign 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sign 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sqrt 0': {
    kind: 'null',
  },
  'float8 utility sqrt 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility sqrt 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility sqrt 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility sqrt 4': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff6a09e667f3bcd',
  },
  'float8 utility sqrt 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ffbb67ae8584caa',
  },
  'float8 utility sqrt 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe6a09e667f3bcd',
  },
  'float8 utility sqrt 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fd43d136248490f',
  },
  'float8 utility sqrt 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5fefffffffffffff',
  },
  'float8 utility sqrt 10': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2000000000000000',
  },
  'float8 utility sqrt 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1e60000000000000',
  },
  'float8 utility sqrt 13': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility sqrt 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility sqrt 16': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'float8 utility sqrt 18': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 19': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3988e1409212e',
  },
  'float8 utility sqrt 21': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff94c583ada5b53',
  },
  'float8 utility sqrt 23': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ffdeeea11683f49',
  },
  'float8 utility sqrt 25': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe6a09e667f3bcc',
  },
  'float8 utility sqrt 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe6a09e667f3bcd',
  },
  'float8 utility sqrt 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3988e1409212e',
  },
  'float8 utility sqrt 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3988e1409212f',
  },
  'float8 utility sqrt 30': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 31': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility sqrt 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4006a09e667f3bcd',
  },
  'float8 utility sqrt 34': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014c8dc2e423980',
  },
  'float8 utility sqrt 36': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 utility sqrt 38': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '20ca2fe76a3f9475',
  },
  'float8 utility sqrt 40': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5f138d352e5096af',
  },
  'float8 utility sqrt 42': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '418fffffffffffff',
  },
  'float8 utility sqrt 44': {
    kind: 'error',
    code: '2201F',
  },
  'float8 utility sqrt 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4190000000000000',
  },
  'float8 utility sqrt 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4196a09e667f3bcd',
  },
  'float8 utility cbrt 0': {
    kind: 'null',
  },
  'float8 utility cbrt 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 utility cbrt 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 utility cbrt 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 utility cbrt 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 utility cbrt 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff428a2f98d728b',
  },
  'float8 utility cbrt 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff7137449123ef6',
  },
  'float8 utility cbrt 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe965fea53d6e3d',
  },
  'float8 utility cbrt 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fddb4c7760bcff3',
  },
  'float8 utility cbrt 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '554428a2f98d728b',
  },
  'float8 utility cbrt 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd54428a2f98d728b',
  },
  'float8 utility cbrt 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2aa428a2f98d728b',
  },
  'float8 utility cbrt 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2990000000000000',
  },
  'float8 utility cbrt 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'a990000000000000',
  },
  'float8 utility cbrt 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 utility cbrt 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 utility cbrt 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 utility cbrt 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe428a2f98d728b',
  },
  'float8 utility cbrt 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe428a2f98d728b',
  },
  'float8 utility cbrt 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe965fea53d6e3d',
  },
  'float8 utility cbrt 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff250bfe1b082f5',
  },
  'float8 utility cbrt 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff250bfe1b082f5',
  },
  'float8 utility cbrt 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff5b7209557b0ed',
  },
  'float8 utility cbrt 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff5b7209557b0ed',
  },
  'float8 utility cbrt 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff84aef28accd48',
  },
  'float8 utility cbrt 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff84aef28accd48',
  },
  'float8 utility cbrt 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe965fea53d6e3c',
  },
  'float8 utility cbrt 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe965fea53d6e3d',
  },
  'float8 utility cbrt 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff250bfe1b082f5',
  },
  'float8 utility cbrt 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff250bfe1b082f5',
  },
  'float8 utility cbrt 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe965fea53d6e3c',
  },
  'float8 utility cbrt 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe965fea53d6e3d',
  },
  'float8 utility cbrt 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff965fea53d6e3d',
  },
  'float8 utility cbrt 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 utility cbrt 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 utility cbrt 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 utility cbrt 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'float8 utility cbrt 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 utility cbrt 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c010000000000000',
  },
  'float8 utility cbrt 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2b2bff2ee48e0530',
  },
  'float8 utility cbrt 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ab2bff2ee48e0530',
  },
  'float8 utility cbrt 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '54b249ad2594c37d',
  },
  'float8 utility cbrt 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd4b249ad2594c37d',
  },
  'float8 utility cbrt 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410428a2f98d728b',
  },
  'float8 utility cbrt 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c10428a2f98d728b',
  },
  'float8 utility cbrt 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410428a2f98d728b',
  },
  'float8 utility cbrt 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410965fea53d6e3d',
  },
  'float8 root operator |/ 0': {
    kind: 'null',
  },
  'float8 root operator |/ 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 root operator |/ 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 root operator |/ 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 root operator |/ 4': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff6a09e667f3bcd',
  },
  'float8 root operator |/ 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ffbb67ae8584caa',
  },
  'float8 root operator |/ 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe6a09e667f3bcd',
  },
  'float8 root operator |/ 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fd43d136248490f',
  },
  'float8 root operator |/ 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5fefffffffffffff',
  },
  'float8 root operator |/ 10': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2000000000000000',
  },
  'float8 root operator |/ 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1e60000000000000',
  },
  'float8 root operator |/ 13': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 root operator |/ 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 root operator |/ 16': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe0000000000000',
  },
  'float8 root operator |/ 18': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 19': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3988e1409212e',
  },
  'float8 root operator |/ 21': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff94c583ada5b53',
  },
  'float8 root operator |/ 23': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ffdeeea11683f49',
  },
  'float8 root operator |/ 25': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe6a09e667f3bcc',
  },
  'float8 root operator |/ 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe6a09e667f3bcd',
  },
  'float8 root operator |/ 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3988e1409212e',
  },
  'float8 root operator |/ 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3988e1409212f',
  },
  'float8 root operator |/ 30': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 31': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 root operator |/ 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4006a09e667f3bcd',
  },
  'float8 root operator |/ 34': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4014c8dc2e423980',
  },
  'float8 root operator |/ 36': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4020000000000000',
  },
  'float8 root operator |/ 38': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '20ca2fe76a3f9475',
  },
  'float8 root operator |/ 40': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5f138d352e5096af',
  },
  'float8 root operator |/ 42': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '418fffffffffffff',
  },
  'float8 root operator |/ 44': {
    kind: 'error',
    code: '2201F',
  },
  'float8 root operator |/ 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4190000000000000',
  },
  'float8 root operator |/ 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4196a09e667f3bcd',
  },
  'float8 root operator ||/ 0': {
    kind: 'null',
  },
  'float8 root operator ||/ 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'float8 root operator ||/ 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '8000000000000000',
  },
  'float8 root operator ||/ 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'float8 root operator ||/ 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff0000000000000',
  },
  'float8 root operator ||/ 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff428a2f98d728b',
  },
  'float8 root operator ||/ 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff7137449123ef6',
  },
  'float8 root operator ||/ 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe965fea53d6e3d',
  },
  'float8 root operator ||/ 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fddb4c7760bcff3',
  },
  'float8 root operator ||/ 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '554428a2f98d728b',
  },
  'float8 root operator ||/ 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd54428a2f98d728b',
  },
  'float8 root operator ||/ 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2aa428a2f98d728b',
  },
  'float8 root operator ||/ 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2990000000000000',
  },
  'float8 root operator ||/ 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'a990000000000000',
  },
  'float8 root operator ||/ 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'float8 root operator ||/ 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'float8 root operator ||/ 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'float8 root operator ||/ 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe428a2f98d728b',
  },
  'float8 root operator ||/ 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe428a2f98d728b',
  },
  'float8 root operator ||/ 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe965fea53d6e3d',
  },
  'float8 root operator ||/ 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff250bfe1b082f5',
  },
  'float8 root operator ||/ 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff250bfe1b082f5',
  },
  'float8 root operator ||/ 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff5b7209557b0ed',
  },
  'float8 root operator ||/ 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff5b7209557b0ed',
  },
  'float8 root operator ||/ 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff84aef28accd48',
  },
  'float8 root operator ||/ 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bff84aef28accd48',
  },
  'float8 root operator ||/ 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe965fea53d6e3c',
  },
  'float8 root operator ||/ 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fe965fea53d6e3d',
  },
  'float8 root operator ||/ 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff250bfe1b082f5',
  },
  'float8 root operator ||/ 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff250bfe1b082f5',
  },
  'float8 root operator ||/ 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe965fea53d6e3c',
  },
  'float8 root operator ||/ 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfe965fea53d6e3d',
  },
  'float8 root operator ||/ 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff965fea53d6e3d',
  },
  'float8 root operator ||/ 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'float8 root operator ||/ 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c000000000000000',
  },
  'float8 root operator ||/ 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'float8 root operator ||/ 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c008000000000000',
  },
  'float8 root operator ||/ 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4010000000000000',
  },
  'float8 root operator ||/ 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c010000000000000',
  },
  'float8 root operator ||/ 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2b2bff2ee48e0530',
  },
  'float8 root operator ||/ 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ab2bff2ee48e0530',
  },
  'float8 root operator ||/ 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '54b249ad2594c37d',
  },
  'float8 root operator ||/ 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd4b249ad2594c37d',
  },
  'float8 root operator ||/ 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410428a2f98d728b',
  },
  'float8 root operator ||/ 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c10428a2f98d728b',
  },
  'float8 root operator ||/ 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410428a2f98d728b',
  },
  'float8 root operator ||/ 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410965fea53d6e3d',
  },
  'float8 sampled cbrt 0 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2990000000000000',
  },
  'float8 sampled sqrt 0 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1e60000000000000',
  },
  'float8 sampled cbrt 0 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'a990000000000000',
  },
  'float8 sampled sqrt 0 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 1 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2a0d07275427f6d2',
  },
  'float8 sampled sqrt 1 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1f1ba5a7acb2117e',
  },
  'float8 sampled cbrt 1 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'aa0d07275427f6d2',
  },
  'float8 sampled sqrt 1 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 2 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2a8463fbdd39bc41',
  },
  'float8 sampled sqrt 2 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1fd046dbcf4f22fd',
  },
  'float8 sampled cbrt 2 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'aa8463fbdd39bc41',
  },
  'float8 sampled sqrt 2 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 3 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2b00ed84acbeb422',
  },
  'float8 sampled sqrt 3 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '20889fb4cfeac709',
  },
  'float8 sampled cbrt 3 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ab00ed84acbeb422',
  },
  'float8 sampled sqrt 3 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 4 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2b7f43a583f7c4e1',
  },
  'float8 sampled sqrt 4 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2145d9fe16782ead',
  },
  'float8 sampled cbrt 4 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ab7f43a583f7c4e1',
  },
  'float8 sampled sqrt 4 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 5 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2bf5d18ded87fc39',
  },
  'float8 sampled sqrt 5 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '21f97a94a35c2346',
  },
  'float8 sampled cbrt 5 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'abf5d18ded87fc39',
  },
  'float8 sampled sqrt 5 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 6 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2c700aad1317ad80',
  },
  'float8 sampled sqrt 6 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '22b0100648368dbb',
  },
  'float8 sampled cbrt 6 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ac700aad1317ad80',
  },
  'float8 sampled sqrt 6 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 7 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2ceea870c15459e8',
  },
  'float8 sampled sqrt 7 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '236e021a284fc693',
  },
  'float8 sampled cbrt 7 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'aceea870c15459e8',
  },
  'float8 sampled sqrt 7 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 8 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2d64aefe96ce8280',
  },
  'float8 sampled sqrt 8 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2420a0ff1cfc4edc',
  },
  'float8 sampled cbrt 8 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ad64aefe96ce8280',
  },
  'float8 sampled sqrt 8 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 9 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2de3702db4cc3d8f',
  },
  'float8 sampled sqrt 9 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '24de4cbc2951c761',
  },
  'float8 sampled cbrt 9 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ade3702db4cc3d8f',
  },
  'float8 sampled sqrt 9 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 10 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2e5a5dd44158c491',
  },
  'float8 sampled sqrt 10 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2590ec680fe340b8',
  },
  'float8 sampled cbrt 10 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ae5a5dd44158c491',
  },
  'float8 sampled sqrt 10 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 11 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2ed93603c2438cba',
  },
  'float8 sampled sqrt 11 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '264fa57dad053d36',
  },
  'float8 sampled cbrt 11 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'aed93603c2438cba',
  },
  'float8 sampled sqrt 11 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 12 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2f5364b5179a8bff',
  },
  'float8 sampled sqrt 12 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '270559e2a15c7c4d',
  },
  'float8 sampled cbrt 12 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'af5364b5179a8bff',
  },
  'float8 sampled sqrt 12 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 13 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2fce26acf2a77322',
  },
  'float8 sampled sqrt 13 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '27bd445eb0b56735',
  },
  'float8 sampled cbrt 13 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'afce26acf2a77322',
  },
  'float8 sampled sqrt 13 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 14 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3044533c8bcdce69',
  },
  'float8 sampled sqrt 14 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '287032d264dd7ebb',
  },
  'float8 sampled cbrt 14 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b044533c8bcdce69',
  },
  'float8 sampled sqrt 14 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 15 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '30c1572730f73b18',
  },
  'float8 sampled sqrt 15 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '292987989cc0ffa0',
  },
  'float8 sampled cbrt 15 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b0c1572730f73b18',
  },
  'float8 sampled sqrt 15 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 16 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '313a575e0a84d009',
  },
  'float8 sampled sqrt 16 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '29e0e62fcbf4bda7',
  },
  'float8 sampled cbrt 16 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b13a575e0a84d009',
  },
  'float8 sampled sqrt 16 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 17 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '31b8c6ed04a3d982',
  },
  'float8 sampled sqrt 17 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2a9ed53993d15fb4',
  },
  'float8 sampled cbrt 17 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b1b8c6ed04a3d982',
  },
  'float8 sampled sqrt 17 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 18 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '32308cc0a82dffa6',
  },
  'float8 sampled sqrt 18 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2b50d4eeafd20615',
  },
  'float8 sampled cbrt 18 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b2308cc0a82dffa6',
  },
  'float8 sampled sqrt 18 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 19 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '32ae799475e948a5',
  },
  'float8 sampled sqrt 19 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2c0dbd67672311ed',
  },
  'float8 sampled cbrt 19 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b2ae799475e948a5',
  },
  'float8 sampled sqrt 19 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 20 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '33279b34547023e7',
  },
  'float8 sampled sqrt 20 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2cc44676161616bc',
  },
  'float8 sampled cbrt 20 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b3279b34547023e7',
  },
  'float8 sampled sqrt 20 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 21 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '33a3ee09f2f1b216',
  },
  'float8 sampled sqrt 21 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2d7f74de9f19af10',
  },
  'float8 sampled cbrt 21 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b3a3ee09f2f1b216',
  },
  'float8 sampled sqrt 21 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 22 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '341c4be127e4da2a',
  },
  'float8 sampled sqrt 22 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2e32d0ab6b8397d7',
  },
  'float8 sampled cbrt 22 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b41c4be127e4da2a',
  },
  'float8 sampled sqrt 22 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 23 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3499537e1dba9252',
  },
  'float8 sampled sqrt 23 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2eefdd0ee43e2cf8',
  },
  'float8 sampled cbrt 23 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b499537e1dba9252',
  },
  'float8 sampled sqrt 23 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 24 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3512bf2e40fcecfd',
  },
  'float8 sampled sqrt 24 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2fa44ad2730fd8ba',
  },
  'float8 sampled cbrt 24 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b512bf2e40fcecfd',
  },
  'float8 sampled sqrt 24 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 25 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '358a5bed97e07ff0',
  },
  'float8 sampled sqrt 25 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3057ec5c1c719c3e',
  },
  'float8 sampled cbrt 25 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b58a5bed97e07ff0',
  },
  'float8 sampled sqrt 25 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 26 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36094ef046ac1365',
  },
  'float8 sampled sqrt 26 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '311681d5c6e325e5',
  },
  'float8 sampled cbrt 26 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b6094ef046ac1365',
  },
  'float8 sampled sqrt 26 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 27 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3680be5a2ecf2f76',
  },
  'float8 sampled sqrt 27 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '31c83912954b9016',
  },
  'float8 sampled cbrt 27 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b680be5a2ecf2f76',
  },
  'float8 sampled sqrt 27 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 28 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36f99f6f24546dfb',
  },
  'float8 sampled sqrt 28 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '32803665854c0bbd',
  },
  'float8 sampled cbrt 28 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b6f99f6f24546dfb',
  },
  'float8 sampled sqrt 28 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 29 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '37793b52e43bca74',
  },
  'float8 sampled sqrt 29 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '333faf7d4ea1b1c2',
  },
  'float8 sampled cbrt 29 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b7793b52e43bca74',
  },
  'float8 sampled sqrt 29 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 30 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '37f1ad70c5cadc97',
  },
  'float8 sampled sqrt 30 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '33f294c2c70bc7ca',
  },
  'float8 sampled cbrt 30 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b7f1ad70c5cadc97',
  },
  'float8 sampled sqrt 30 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 31 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '386f545b0d6c155a',
  },
  'float8 sampled sqrt 31 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '34aeffe30c8f6273',
  },
  'float8 sampled cbrt 31 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b86f545b0d6c155a',
  },
  'float8 sampled sqrt 31 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 32 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '38e78dc82172f8ce',
  },
  'float8 sampled sqrt 32 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3564352d8eeafa8c',
  },
  'float8 sampled cbrt 32 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b8e78dc82172f8ce',
  },
  'float8 sampled sqrt 32 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 33 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '39601d2143520c18',
  },
  'float8 sampled sqrt 33 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3616de85bc91f0e7',
  },
  'float8 sampled cbrt 33 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b9601d2143520c18',
  },
  'float8 sampled sqrt 33 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 34 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '39de58eb53cb7e2b',
  },
  'float8 sampled sqrt 34 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36d4e5b7f8876976',
  },
  'float8 sampled cbrt 34 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'b9de58eb53cb7e2b',
  },
  'float8 sampled sqrt 34 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 35 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3a58151be80513b5',
  },
  'float8 sampled sqrt 35 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '378d8ba53fdc9ab8',
  },
  'float8 sampled cbrt 35 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ba58151be80513b5',
  },
  'float8 sampled sqrt 35 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 36 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ad18b8fa869c411',
  },
  'float8 sampled sqrt 36 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '38425f71bc0d82f7',
  },
  'float8 sampled cbrt 36 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bad18b8fa869c411',
  },
  'float8 sampled sqrt 36 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 37 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3b49c27efe148c4e',
  },
  'float8 sampled sqrt 37 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '38f71cabdf4183a1',
  },
  'float8 sampled cbrt 37 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bb49c27efe148c4e',
  },
  'float8 sampled sqrt 37 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 38 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3bc65c3b5cad8956',
  },
  'float8 sampled sqrt 38 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '39b2b0fcef77a4b9',
  },
  'float8 sampled cbrt 38 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bbc65c3b5cad8956',
  },
  'float8 sampled sqrt 38 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 39 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3c430d090006d715',
  },
  'float8 sampled sqrt 39 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3a6d661494ca0f00',
  },
  'float8 sampled cbrt 39 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bc430d090006d715',
  },
  'float8 sampled sqrt 39 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 40 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3cbf6aafe42f4d7d',
  },
  'float8 sampled sqrt 40 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3b2602f8ea7628fe',
  },
  'float8 sampled cbrt 40 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bcbf6aafe42f4d7d',
  },
  'float8 sampled sqrt 40 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 41 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3d3679562faa3e0c',
  },
  'float8 sampled sqrt 41 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3bdaa2aba9c50bae',
  },
  'float8 sampled cbrt 41 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bd3679562faa3e0c',
  },
  'float8 sampled sqrt 41 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 42 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3db3fa143aca74ad',
  },
  'float8 sampled sqrt 42 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3c965268387c6ac6',
  },
  'float8 sampled cbrt 42 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bdb3fa143aca74ad',
  },
  'float8 sampled sqrt 42 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 43 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3e2ef0be0f85f301',
  },
  'float8 sampled sqrt 43 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3d4e6c802ee76e0d',
  },
  'float8 sampled cbrt 43 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'be2ef0be0f85f301',
  },
  'float8 sampled sqrt 43 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 44 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ea551fbc85c61ed',
  },
  'float8 sampled sqrt 44 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3e01670ed6b76b0d',
  },
  'float8 sampled cbrt 44 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bea551fbc85c61ed',
  },
  'float8 sampled sqrt 44 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 45 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f2334cd26e9a75f',
  },
  'float8 sampled sqrt 45 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ebdc251109b31bf',
  },
  'float8 sampled cbrt 45 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bf2334cd26e9a75f',
  },
  'float8 sampled sqrt 45 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 46 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f9e062f2d6a537c',
  },
  'float8 sampled sqrt 46 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f74907d2d010bcc',
  },
  'float8 sampled cbrt 46 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bf9e062f2d6a537c',
  },
  'float8 sampled sqrt 46 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 47 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '40183fd558f0aa67',
  },
  'float8 sampled sqrt 47 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '402dda67ee6050ad',
  },
  'float8 sampled cbrt 47 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c0183fd558f0aa67',
  },
  'float8 sampled sqrt 47 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 48 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '40907bbb4adbcd87',
  },
  'float8 sampled sqrt 48 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '40e0bafdf80cc98c',
  },
  'float8 sampled cbrt 48 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c0907bbb4adbcd87',
  },
  'float8 sampled sqrt 48 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 49 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '410be4aa291a1ef1',
  },
  'float8 sampled sqrt 49 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '419a0abb5b7eadd2',
  },
  'float8 sampled cbrt 49 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c10be4aa291a1ef1',
  },
  'float8 sampled sqrt 49 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 50 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '418487e1120961b9',
  },
  'float8 sampled sqrt 50 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '425071e9a5949fbb',
  },
  'float8 sampled cbrt 50 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c18487e1120961b9',
  },
  'float8 sampled sqrt 50 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 51 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4203ccf89adbb07b',
  },
  'float8 sampled sqrt 51 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '430f26b50d422391',
  },
  'float8 sampled cbrt 51 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c203ccf89adbb07b',
  },
  'float8 sampled sqrt 51 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 52 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '427c673389777bfb',
  },
  'float8 sampled sqrt 52 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43c2ebf22666be30',
  },
  'float8 sampled cbrt 52 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c27c673389777bfb',
  },
  'float8 sampled sqrt 52 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 53 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '42f5f0a4c0ff375a',
  },
  'float8 sampled sqrt 53 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4479b11d00dec662',
  },
  'float8 sampled cbrt 53 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c2f5f0a4c0ff375a',
  },
  'float8 sampled sqrt 53 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 54 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4370a520dc8528f6',
  },
  'float8 sampled sqrt 54 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4530fa2c240fa80b',
  },
  'float8 sampled cbrt 54 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c370a520dc8528f6',
  },
  'float8 sampled sqrt 54 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 55 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43ef393ee7af7744',
  },
  'float8 sampled sqrt 55 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '45eed7af2cf1a8ff',
  },
  'float8 sampled cbrt 55 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c3ef393ee7af7744',
  },
  'float8 sampled sqrt 55 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 56 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '446665f3cc902cbd',
  },
  'float8 sampled sqrt 56 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '46a2bd2e740fa382',
  },
  'float8 sampled cbrt 56 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c46665f3cc902cbd',
  },
  'float8 sampled sqrt 56 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 57 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '44e33a2f8154f357',
  },
  'float8 sampled sqrt 57 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '475dced57782eade',
  },
  'float8 sampled cbrt 57 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c4e33a2f8154f357',
  },
  'float8 sampled sqrt 57 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 58 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '455c7e3fdf1ea481',
  },
  'float8 sampled sqrt 58 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '481302fede2dba40',
  },
  'float8 sampled cbrt 58 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c55c7e3fdf1ea481',
  },
  'float8 sampled sqrt 58 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 59 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '45d7bf3762fc7a67',
  },
  'float8 sampled sqrt 59 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '48ccee21b1a14cd4',
  },
  'float8 sampled cbrt 59 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c5d7bf3762fc7a67',
  },
  'float8 sampled sqrt 59 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 60 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4651638fd5a48413',
  },
  'float8 sampled sqrt 60 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '498220c149d286ef',
  },
  'float8 sampled cbrt 60 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c651638fd5a48413',
  },
  'float8 sampled sqrt 60 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 61 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '46ce7a20fe196113',
  },
  'float8 sampled sqrt 61 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4a3dbe351eb6aca1',
  },
  'float8 sampled cbrt 61 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c6ce7a20fe196113',
  },
  'float8 sampled sqrt 61 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 62 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4747b38e890feee8',
  },
  'float8 sampled sqrt 62 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4af465ddf0339153',
  },
  'float8 sampled cbrt 62 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c747b38e890feee8',
  },
  'float8 sampled sqrt 62 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 63 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47c19bd526c12914',
  },
  'float8 sampled sqrt 63 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4baa1fda486df5d2',
  },
  'float8 sampled cbrt 63 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c7c19bd526c12914',
  },
  'float8 sampled sqrt 63 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 64 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '483a3d6d0a12ed4f',
  },
  'float8 sampled sqrt 64 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4c60cd3f2ce41c54',
  },
  'float8 sampled cbrt 64 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c83a3d6d0a12ed4f',
  },
  'float8 sampled sqrt 64 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 65 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '48b642fbea014fd4',
  },
  'float8 sampled sqrt 65 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4d1a42460d3b1ee8',
  },
  'float8 sampled cbrt 65 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c8b642fbea014fd4',
  },
  'float8 sampled sqrt 65 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 66 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '49303a6477d0a4fc',
  },
  'float8 sampled sqrt 66 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4dd057e66d719f75',
  },
  'float8 sampled cbrt 66 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c9303a6477d0a4fc',
  },
  'float8 sampled sqrt 66 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 67 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '49aac6e6c59b47b7',
  },
  'float8 sampled sqrt 67 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4e887e914beedeb4',
  },
  'float8 sampled cbrt 67 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c9aac6e6c59b47b7',
  },
  'float8 sampled sqrt 67 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 68 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4a29479a97d3dc2e',
  },
  'float8 sampled sqrt 68 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4f46780db3636ef5',
  },
  'float8 sampled cbrt 68 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ca29479a97d3dc2e',
  },
  'float8 sampled sqrt 68 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 69 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4aa1c389317ac155',
  },
  'float8 sampled sqrt 69 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4ffa78672edaffc2',
  },
  'float8 sampled cbrt 69 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'caa1c389317ac155',
  },
  'float8 sampled sqrt 69 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 70 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4b1cc4746252c268',
  },
  'float8 sampled sqrt 70 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '50b3496dfa50cf7a',
  },
  'float8 sampled cbrt 70 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cb1cc4746252c268',
  },
  'float8 sampled sqrt 70 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 71 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4b993c6134cf0566',
  },
  'float8 sampled sqrt 71 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '516fb17a8300e5b8',
  },
  'float8 sampled cbrt 71 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cb993c6134cf0566',
  },
  'float8 sampled sqrt 71 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 72 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4c116fed0d5d7763',
  },
  'float8 sampled sqrt 72 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5222341a55ae1ab3',
  },
  'float8 sampled cbrt 72 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cc116fed0d5d7763',
  },
  'float8 sampled sqrt 72 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 73 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4c8beee09e500258',
  },
  'float8 sampled sqrt 73 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '52da190a111ed1ea',
  },
  'float8 sampled cbrt 73 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cc8beee09e500258',
  },
  'float8 sampled sqrt 73 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 74 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4d077ec7cb19b6f9',
  },
  'float8 sampled sqrt 74 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '539421e27a341089',
  },
  'float8 sampled cbrt 74 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cd077ec7cb19b6f9',
  },
  'float8 sampled sqrt 74 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 75 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4d82176d14375fc7',
  },
  'float8 sampled sqrt 75 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '544b34c690070039',
  },
  'float8 sampled cbrt 75 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cd82176d14375fc7',
  },
  'float8 sampled sqrt 75 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 76 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4dfd13e8e8f381e2',
  },
  'float8 sampled sqrt 76 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5503998cb9c0bc25',
  },
  'float8 sampled cbrt 76 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cdfd13e8e8f381e2',
  },
  'float8 sampled sqrt 76 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 77 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4e795f37af57b721',
  },
  'float8 sampled sqrt 77 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '55bff331fc0f5c65',
  },
  'float8 sampled cbrt 77 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ce795f37af57b721',
  },
  'float8 sampled sqrt 77 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 78 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4ef12454a0d741bf',
  },
  'float8 sampled sqrt 78 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5671be3aa2d92917',
  },
  'float8 sampled cbrt 78 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cef12454a0d741bf',
  },
  'float8 sampled sqrt 78 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 79 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4f6a86d127c4702c',
  },
  'float8 sampled sqrt 79 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '572826d744590908',
  },
  'float8 sampled cbrt 79 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cf6a86d127c4702c',
  },
  'float8 sampled sqrt 79 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 80 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4fe8a9d867861e6c',
  },
  'float8 sampled sqrt 80 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '57e5a70374c0c65e',
  },
  'float8 sampled cbrt 80 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'cfe8a9d867861e6c',
  },
  'float8 sampled sqrt 80 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 81 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '506235dcb76cdf00',
  },
  'float8 sampled sqrt 81 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '589b798b18c27324',
  },
  'float8 sampled cbrt 81 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd06235dcb76cdf00',
  },
  'float8 sampled sqrt 81 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 82 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '50dd3cea52831e03',
  },
  'float8 sampled sqrt 82 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5953c310f668599d',
  },
  'float8 sampled cbrt 82 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd0dd3cea52831e03',
  },
  'float8 sampled sqrt 82 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 83 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '515767a4433c2c17',
  },
  'float8 sampled sqrt 83 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5a0c4eacbfefd888',
  },
  'float8 sampled cbrt 83 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd15767a4433c2c17',
  },
  'float8 sampled sqrt 83 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 84 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '51d321a856de0e79',
  },
  'float8 sampled sqrt 84 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5ac4eb884c9e7cfb',
  },
  'float8 sampled cbrt 84 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd1d321a856de0e79',
  },
  'float8 sampled sqrt 84 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 85 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '524d65c49604fd30',
  },
  'float8 sampled sqrt 85 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5b7c2d412bb70b11',
  },
  'float8 sampled cbrt 85 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd24d65c49604fd30',
  },
  'float8 sampled sqrt 85 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 86 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '52c48d51d56db494',
  },
  'float8 sampled sqrt 86 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5c30787377600be7',
  },
  'float8 sampled cbrt 86 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd2c48d51d56db494',
  },
  'float8 sampled sqrt 86 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 87 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '534016f22e984281',
  },
  'float8 sampled sqrt 87 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5ce6d15cdb95f7ab',
  },
  'float8 sampled cbrt 87 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd34016f22e984281',
  },
  'float8 sampled sqrt 87 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 88 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '53bd46d94d000b7b',
  },
  'float8 sampled sqrt 88 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5da3cd2405c7e68a',
  },
  'float8 sampled cbrt 88 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd3bd46d94d000b7b',
  },
  'float8 sampled sqrt 88 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 89 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '54390e9a9508a0ac',
  },
  'float8 sampled sqrt 89 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5e5f5b65d6c147f8',
  },
  'float8 sampled cbrt 89 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd4390e9a9508a0ac',
  },
  'float8 sampled sqrt 89 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 90 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '54b374d4b30b644c',
  },
  'float8 sampled sqrt 90 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5f157488956bfa2d',
  },
  'float8 sampled cbrt 90 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd4b374d4b30b644c',
  },
  'float8 sampled sqrt 90 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 91 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '552b58f2f5b05d66',
  },
  'float8 sampled sqrt 91 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '5fc948073bebfa86',
  },
  'float8 sampled cbrt 91 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'd52b58f2f5b05d66',
  },
  'float8 sampled sqrt 91 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 92 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '29f935b473145ee5',
  },
  'float8 sampled sqrt 92 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1effa4e858b38081',
  },
  'float8 sampled cbrt 92 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'a9f935b473145ee5',
  },
  'float8 sampled sqrt 92 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 93 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2a71fa398e5c3b5d',
  },
  'float8 sampled sqrt 93 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '1fb30e5632973214',
  },
  'float8 sampled cbrt 93 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'aa71fa398e5c3b5d',
  },
  'float8 sampled sqrt 93 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 94 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2ae97a2b0e89006d',
  },
  'float8 sampled sqrt 94 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2066bb9933b31fd7',
  },
  'float8 sampled cbrt 94 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'aae97a2b0e89006d',
  },
  'float8 sampled sqrt 94 negative': {
    kind: 'error',
    code: '2201F',
  },
  'float8 sampled cbrt 95 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '2b682bf5c88f2adf',
  },
  'float8 sampled sqrt 95 positive': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '212502116493ca3b',
  },
  'float8 sampled cbrt 95 negative': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'ab682bf5c88f2adf',
  },
  'float8 sampled sqrt 95 negative': {
    kind: 'error',
    code: '2201F',
  },
  'utility ceil widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility ceil accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'utility ceil propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility ceiling widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility ceiling accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4008000000000000',
  },
  'utility ceiling propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility floor widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility floor accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'utility floor propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility round widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility round accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'utility round propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility trunc widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility trunc accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4000000000000000',
  },
  'utility trunc propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility sign widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility sign accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff0000000000000',
  },
  'utility sign propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility sqrt widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility sqrt accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff94c583ada5b53',
  },
  'utility sqrt propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'utility cbrt widen float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4004000000000000',
  },
  'utility cbrt accepts widened float4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff5b7209557b0ed',
  },
  'utility cbrt propagates division error': {
    kind: 'error',
    code: '22012',
  },
  'nested negative square root': {
    kind: 'error',
    code: '2201F',
  },
  'negative square root error through round': {
    kind: 'error',
    code: '2201F',
  },
  'negative square root error through null comparison': {
    kind: 'error',
    code: '2201F',
  },
  'shift wraps int2 before cast': {
    kind: 'value',
    value: '-32768',
  },
  'shift wrapping preserved when widened': {
    kind: 'value',
    value: '-32768',
  },
  'division error through null bitwise operand': {
    kind: 'error',
    code: '22012',
  },
}
