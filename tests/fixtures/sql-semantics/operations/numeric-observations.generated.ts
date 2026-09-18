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
  'numeric parsing: parse 0': {
    kind: 'value',
    value: '0',
  },
  'numeric parsing: parse -0.0000': {
    kind: 'value',
    value: '0.0000',
  },
  'numeric parsing: parse 1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric parsing: parse 1.00e-3': {
    kind: 'value',
    value: '0.00100',
  },
  'numeric parsing: parse 1e40': {
    kind: 'value',
    value: '10000000000000000000000000000000000000000',
  },
  'numeric parsing: parse 1e-100': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric parsing: parse 9007199254740993.0001': {
    kind: 'value',
    value: '9007199254740993.0001',
  },
  'numeric parsing: parse 9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999':
    {
      kind: 'value',
      value:
        '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
    },
  'numeric parsing: parse NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric parsing: parse Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric parsing: parse -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric finite arithmetic: add 0.1 / 0.2': {
    kind: 'value',
    value: '0.3',
  },
  'numeric finite arithmetic: sub 0.1 / 0.2': {
    kind: 'value',
    value: '-0.1',
  },
  'numeric finite arithmetic: mul 0.1 / 0.2': {
    kind: 'value',
    value: '0.02',
  },
  'numeric finite arithmetic: mod 0.1 / 0.2': {
    kind: 'value',
    value: '0.1',
  },
  'numeric finite arithmetic: add 1.2300 / 2.1': {
    kind: 'value',
    value: '3.3300',
  },
  'numeric finite arithmetic: sub 1.2300 / 2.1': {
    kind: 'value',
    value: '-0.8700',
  },
  'numeric finite arithmetic: mul 1.2300 / 2.1': {
    kind: 'value',
    value: '2.58300',
  },
  'numeric finite arithmetic: mod 1.2300 / 2.1': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric finite arithmetic: add -1.2300 / 2.1': {
    kind: 'value',
    value: '0.8700',
  },
  'numeric finite arithmetic: sub -1.2300 / 2.1': {
    kind: 'value',
    value: '-3.3300',
  },
  'numeric finite arithmetic: mul -1.2300 / 2.1': {
    kind: 'value',
    value: '-2.58300',
  },
  'numeric finite arithmetic: mod -1.2300 / 2.1': {
    kind: 'value',
    value: '-1.2300',
  },
  'numeric finite arithmetic: add -7.00 / 3.0': {
    kind: 'value',
    value: '-4.00',
  },
  'numeric finite arithmetic: sub -7.00 / 3.0': {
    kind: 'value',
    value: '-10.00',
  },
  'numeric finite arithmetic: mul -7.00 / 3.0': {
    kind: 'value',
    value: '-21.000',
  },
  'numeric finite arithmetic: mod -7.00 / 3.0': {
    kind: 'value',
    value: '-1.00',
  },
  'numeric finite arithmetic: add 7.00 / -3.0': {
    kind: 'value',
    value: '4.00',
  },
  'numeric finite arithmetic: sub 7.00 / -3.0': {
    kind: 'value',
    value: '10.00',
  },
  'numeric finite arithmetic: mul 7.00 / -3.0': {
    kind: 'value',
    value: '-21.000',
  },
  'numeric finite arithmetic: mod 7.00 / -3.0': {
    kind: 'value',
    value: '1.00',
  },
  'numeric finite arithmetic: add 0.00000000000000000001 / 3': {
    kind: 'value',
    value: '3.00000000000000000001',
  },
  'numeric finite arithmetic: sub 0.00000000000000000001 / 3': {
    kind: 'value',
    value: '-2.99999999999999999999',
  },
  'numeric finite arithmetic: mul 0.00000000000000000001 / 3': {
    kind: 'value',
    value: '0.00000000000000000003',
  },
  'numeric finite arithmetic: mod 0.00000000000000000001 / 3': {
    kind: 'value',
    value: '0.00000000000000000001',
  },
  'numeric finite arithmetic: add 123456789012345678901234567890 / 1': {
    kind: 'value',
    value: '123456789012345678901234567891',
  },
  'numeric finite arithmetic: sub 123456789012345678901234567890 / 1': {
    kind: 'value',
    value: '123456789012345678901234567889',
  },
  'numeric finite arithmetic: mul 123456789012345678901234567890 / 1': {
    kind: 'value',
    value: '123456789012345678901234567890',
  },
  'numeric finite arithmetic: mod 123456789012345678901234567890 / 1': {
    kind: 'value',
    value: '0',
  },
  'numeric finite arithmetic: add 1e100 / 1': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric finite arithmetic: sub 1e100 / 1': {
    kind: 'value',
    value:
      '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
  },
  'numeric finite arithmetic: mul 1e100 / 1': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric finite arithmetic: mod 1e100 / 1': {
    kind: 'value',
    value: '0',
  },
  'numeric finite arithmetic: add 9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999 / 99999999999999999999999999999999999999999999999999999999999999999999999999999999':
    {
      kind: 'value',
      value:
        '10000000000000000000099999999999999999999999999999999999999999999999999999999999999999999999999999998',
    },
  'numeric finite arithmetic: sub 9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999 / 99999999999999999999999999999999999999999999999999999999999999999999999999999999':
    {
      kind: 'value',
      value:
        '9999999999999999999900000000000000000000000000000000000000000000000000000000000000000000000000000000',
    },
  'numeric finite arithmetic: mul 9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999 / 99999999999999999999999999999999999999999999999999999999999999999999999999999999':
    {
      kind: 'value',
      value:
        '999999999999999999999999999999999999999999999999999999999999999999999999999999989999999999999999999900000000000000000000000000000000000000000000000000000000000000000000000000000001',
    },
  'numeric finite arithmetic: mod 9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999 / 99999999999999999999999999999999999999999999999999999999999999999999999999999999':
    {
      kind: 'value',
      value: '99999999999999999999',
    },
  'numeric finite arithmetic: add 1.2345678901234567890123456789 / 9.8765432109876543210987654321':
    {
      kind: 'value',
      value: '11.1111111011111111101111111110',
    },
  'numeric finite arithmetic: sub 1.2345678901234567890123456789 / 9.8765432109876543210987654321':
    {
      kind: 'value',
      value: '-8.6419753208641975320864197532',
    },
  'numeric finite arithmetic: mul 1.2345678901234567890123456789 / 9.8765432109876543210987654321':
    {
      kind: 'value',
      value: '12.19326311370217952261850327336229233322374638011112635269',
    },
  'numeric finite arithmetic: mod 1.2345678901234567890123456789 / 9.8765432109876543210987654321':
    {
      kind: 'value',
      value: '1.2345678901234567890123456789',
    },
  'numeric division: div 0 / 3': {
    kind: 'value',
    value: '0.00000000000000000000',
  },
  'numeric division: div 1 / 3': {
    kind: 'value',
    value: '0.33333333333333333333',
  },
  'numeric division: div 2 / 3': {
    kind: 'value',
    value: '0.66666666666666666667',
  },
  'numeric division: div 1.00 / 2': {
    kind: 'value',
    value: '0.50000000000000000000',
  },
  'numeric division: div 10 / 3': {
    kind: 'value',
    value: '3.3333333333333333',
  },
  'numeric division: div 10000 / 3': {
    kind: 'value',
    value: '3333.3333333333333333',
  },
  'numeric division: div 1e20 / 3': {
    kind: 'value',
    value: '33333333333333333333',
  },
  'numeric division: div 1e-100 / 3': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000033333333333333333333',
  },
  'numeric division: div 1 / 1e100': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000',
  },
  'numeric division: div 1.000000000000000000000000 / 3': {
    kind: 'value',
    value: '0.333333333333333333333333',
  },
  'numeric division: div -7.00 / 3.0': {
    kind: 'value',
    value: '-2.3333333333333333',
  },
  'numeric division: div 7.00 / -3.0': {
    kind: 'value',
    value: '-2.3333333333333333',
  },
  'numeric division: div 123456789012345678901234567890 / 7': {
    kind: 'value',
    value: '17636684144620811271604938270',
  },
  'numeric division: div 1.2345 / 0.9876': {
    kind: 'value',
    value: '1.2500000000000000',
  },
  'numeric division: div 1.0000 / 1.0001': {
    kind: 'value',
    value: '0.99990000999900009999',
  },
  'numeric division: div 9999 / 10000': {
    kind: 'value',
    value: '0.99990000000000000000',
  },
  'numeric division: div 10000 / 9999': {
    kind: 'value',
    value: '1.0001000100010001',
  },
  'numeric division: div 1.0000000000000000000050000000000000000000000000000000000000001 / 1': {
    kind: 'value',
    value: '1.0000000000000000000050000000000000000000000000000000000000001',
  },
  'numeric rounding: round 2.5 at -3': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 2.5 at -1': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 2.5 at 0': {
    kind: 'value',
    value: '3',
  },
  'numeric rounding: round 2.5 at 2': {
    kind: 'value',
    value: '2.50',
  },
  'numeric rounding: round 2.5 at 3': {
    kind: 'value',
    value: '2.500',
  },
  'numeric rounding: round 2.5 at 8': {
    kind: 'value',
    value: '2.50000000',
  },
  'numeric rounding: round -2.5 at -3': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -2.5 at -1': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -2.5 at 0': {
    kind: 'value',
    value: '-3',
  },
  'numeric rounding: round -2.5 at 2': {
    kind: 'value',
    value: '-2.50',
  },
  'numeric rounding: round -2.5 at 3': {
    kind: 'value',
    value: '-2.500',
  },
  'numeric rounding: round -2.5 at 8': {
    kind: 'value',
    value: '-2.50000000',
  },
  'numeric rounding: round 1.005 at -3': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 1.005 at -1': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 1.005 at 0': {
    kind: 'value',
    value: '1',
  },
  'numeric rounding: round 1.005 at 2': {
    kind: 'value',
    value: '1.01',
  },
  'numeric rounding: round 1.005 at 3': {
    kind: 'value',
    value: '1.005',
  },
  'numeric rounding: round 1.005 at 8': {
    kind: 'value',
    value: '1.00500000',
  },
  'numeric rounding: round -1.005 at -3': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -1.005 at -1': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -1.005 at 0': {
    kind: 'value',
    value: '-1',
  },
  'numeric rounding: round -1.005 at 2': {
    kind: 'value',
    value: '-1.01',
  },
  'numeric rounding: round -1.005 at 3': {
    kind: 'value',
    value: '-1.005',
  },
  'numeric rounding: round -1.005 at 8': {
    kind: 'value',
    value: '-1.00500000',
  },
  'numeric rounding: round 999.995 at -3': {
    kind: 'value',
    value: '1000',
  },
  'numeric rounding: round 999.995 at -1': {
    kind: 'value',
    value: '1000',
  },
  'numeric rounding: round 999.995 at 0': {
    kind: 'value',
    value: '1000',
  },
  'numeric rounding: round 999.995 at 2': {
    kind: 'value',
    value: '1000.00',
  },
  'numeric rounding: round 999.995 at 3': {
    kind: 'value',
    value: '999.995',
  },
  'numeric rounding: round 999.995 at 8': {
    kind: 'value',
    value: '999.99500000',
  },
  'numeric rounding: round -999.995 at -3': {
    kind: 'value',
    value: '-1000',
  },
  'numeric rounding: round -999.995 at -1': {
    kind: 'value',
    value: '-1000',
  },
  'numeric rounding: round -999.995 at 0': {
    kind: 'value',
    value: '-1000',
  },
  'numeric rounding: round -999.995 at 2': {
    kind: 'value',
    value: '-1000.00',
  },
  'numeric rounding: round -999.995 at 3': {
    kind: 'value',
    value: '-999.995',
  },
  'numeric rounding: round -999.995 at 8': {
    kind: 'value',
    value: '-999.99500000',
  },
  'numeric rounding: round 0.0005 at -3': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 0.0005 at -1': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 0.0005 at 0': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round 0.0005 at 2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric rounding: round 0.0005 at 3': {
    kind: 'value',
    value: '0.001',
  },
  'numeric rounding: round 0.0005 at 8': {
    kind: 'value',
    value: '0.00050000',
  },
  'numeric rounding: round -0.0005 at -3': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -0.0005 at -1': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -0.0005 at 0': {
    kind: 'value',
    value: '0',
  },
  'numeric rounding: round -0.0005 at 2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric rounding: round -0.0005 at 3': {
    kind: 'value',
    value: '-0.001',
  },
  'numeric rounding: round -0.0005 at 8': {
    kind: 'value',
    value: '-0.00050000',
  },
  'numeric rounding: round 123456789012345678901234567890.5 at -3': {
    kind: 'value',
    value: '123456789012345678901234568000',
  },
  'numeric rounding: round 123456789012345678901234567890.5 at -1': {
    kind: 'value',
    value: '123456789012345678901234567890',
  },
  'numeric rounding: round 123456789012345678901234567890.5 at 0': {
    kind: 'value',
    value: '123456789012345678901234567891',
  },
  'numeric rounding: round 123456789012345678901234567890.5 at 2': {
    kind: 'value',
    value: '123456789012345678901234567890.50',
  },
  'numeric rounding: round 123456789012345678901234567890.5 at 3': {
    kind: 'value',
    value: '123456789012345678901234567890.500',
  },
  'numeric rounding: round 123456789012345678901234567890.5 at 8': {
    kind: 'value',
    value: '123456789012345678901234567890.50000000',
  },
  'numeric comparisons: eq 1.00 / 1': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: ne 1.00 / 1': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: lt 1.00 / 1': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: le 1.00 / 1': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: gt 1.00 / 1': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ge 1.00 / 1': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: eq -0.00 / 0': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: ne -0.00 / 0': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: lt -0.00 / 0': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: le -0.00 / 0': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: gt -0.00 / 0': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ge -0.00 / 0': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: eq NaN / NaN': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: ne NaN / NaN': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: lt NaN / NaN': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: le NaN / NaN': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: gt NaN / NaN': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ge NaN / NaN': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: eq NaN / Infinity': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ne NaN / Infinity': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: lt NaN / Infinity': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: le NaN / Infinity': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: gt NaN / Infinity': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: ge NaN / Infinity': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: eq Infinity / NaN': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ne Infinity / NaN': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: lt Infinity / NaN': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: le Infinity / NaN': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: gt Infinity / NaN': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ge Infinity / NaN': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: eq -Infinity / 0': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ne -Infinity / 0': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: lt -Infinity / 0': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: le -Infinity / 0': {
    kind: 'value',
    value: 'true',
  },
  'numeric comparisons: gt -Infinity / 0': {
    kind: 'value',
    value: 'false',
  },
  'numeric comparisons: ge -Infinity / 0': {
    kind: 'value',
    value: 'false',
  },
  'numeric special values: add NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: sub NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mul NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: div NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mod NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: add 0 / NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: sub 0 / NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mul 0 / NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: div 0 / NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mod 0 / NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: add Infinity / Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: sub Infinity / Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mul Infinity / Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: div Infinity / Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mod Infinity / Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: add Infinity / -Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: sub Infinity / -Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: mul Infinity / -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: div Infinity / -Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: mod Infinity / -Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: add Infinity / 0': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: sub Infinity / 0': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: mul Infinity / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: div Infinity / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric special values: mod Infinity / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric special values: add 0 / Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: sub 0 / Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: mul 0 / Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: div 0 / Infinity': {
    kind: 'value',
    value: '0',
  },
  'numeric special values: mod 0 / Infinity': {
    kind: 'value',
    value: '0',
  },
  'numeric special values: add 1 / Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: sub 1 / Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: mul 1 / Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: div 1 / Infinity': {
    kind: 'value',
    value: '0',
  },
  'numeric special values: mod 1 / Infinity': {
    kind: 'value',
    value: '1',
  },
  'numeric special values: add -1 / Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: sub -1 / Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: mul -1 / Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: div -1 / Infinity': {
    kind: 'value',
    value: '0',
  },
  'numeric special values: mod -1 / Infinity': {
    kind: 'value',
    value: '-1',
  },
  'numeric special values: add Infinity / 2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: sub Infinity / 2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: mul Infinity / 2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: div Infinity / 2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: mod Infinity / 2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: add -Infinity / 2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: sub -Infinity / 2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: mul -Infinity / 2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: div -Infinity / 2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric special values: mod -Infinity / 2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric zero divisor: div 0 / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: div 1 / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: div -1 / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: div NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric zero divisor: div Infinity / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: mod 0 / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: mod 1 / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: mod -1 / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric zero divisor: mod NaN / 0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric zero divisor: mod Infinity / 0': {
    kind: 'error',
    code: '22012',
  },
  'numeric null: add null / 0': {
    kind: 'null',
  },
  'numeric null: sub null / 0': {
    kind: 'null',
  },
  'numeric null: mul null / 0': {
    kind: 'null',
  },
  'numeric null: div null / 0': {
    kind: 'null',
  },
  'numeric null: mod null / 0': {
    kind: 'null',
  },
  'numeric null: eq null / 0': {
    kind: 'null',
  },
  'numeric null: round null / 0 at 0': {
    kind: 'null',
  },
  'numeric composition: cancel 123456789012345678901234567890 / 1 sum': {
    kind: 'value',
    value: '123456789012345678901234567891',
  },
  'numeric composition: cancel 123456789012345678901234567890 / 1': {
    kind: 'value',
    value: '1',
  },
  'numeric composition: cancel 1e100 / 1 sum': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric composition: cancel 1e100 / 1': {
    kind: 'value',
    value: '1',
  },
  'numeric range limits: parse 1e100000': {
    kind: 'value',
    value: 'true',
  },
  'numeric range limits: parse 1e100001': {
    kind: 'value',
    value: 'true',
  },
  'numeric range limits: parse 1e131071': {
    kind: 'value',
    value: 'true',
  },
  'numeric range limits: parse 1e131072': {
    kind: 'error',
    code: '22003',
  },
  'numeric range limits: parse 1e-16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric range limits: parse 1e-16384': {
    kind: 'error',
    code: '22003',
  },
  'numeric range limits: add 1e100001 / 1': {
    kind: 'value',
    value: 'true',
  },
  'numeric range limits: mul 1e131071 / 10': {
    kind: 'error',
    code: '22003',
  },
  'numeric special values: round NaN at 2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric special values: round Infinity at 2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric special values: round -Infinity at 2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary + null': {
    kind: 'null',
  },
  'numeric unary + 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary + -0.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric unary + 1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unary + -1.2300': {
    kind: 'value',
    value: '-1.2300',
  },
  'numeric unary + 2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unary + -2.5': {
    kind: 'value',
    value: '-2.5',
  },
  'numeric unary + 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary + 1e-100': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric unary + NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary + Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary + -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary - null': {
    kind: 'null',
  },
  'numeric unary - 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary - -0.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric unary - 1.2300': {
    kind: 'value',
    value: '-1.2300',
  },
  'numeric unary - -1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unary - 2.5': {
    kind: 'value',
    value: '-2.5',
  },
  'numeric unary - -2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unary - 1e100': {
    kind: 'value',
    value:
      '-10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary - 1e-100': {
    kind: 'value',
    value:
      '-0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric unary - NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary - Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary - -Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary @ null': {
    kind: 'null',
  },
  'numeric unary @ 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary @ -0.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric unary @ 1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unary @ -1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unary @ 2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unary @ -2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unary @ 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary @ 1e-100': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric unary @ NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary @ Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary @ -Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary abs null': {
    kind: 'null',
  },
  'numeric unary abs 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary abs -0.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric unary abs 1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unary abs -1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unary abs 2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unary abs -2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unary abs 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary abs 1e-100': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric unary abs NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary abs Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary abs -Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary ceil null': {
    kind: 'null',
  },
  'numeric unary ceil 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary ceil -0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric unary ceil 1.2300': {
    kind: 'value',
    value: '2',
  },
  'numeric unary ceil -1.2300': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary ceil 2.5': {
    kind: 'value',
    value: '3',
  },
  'numeric unary ceil -2.5': {
    kind: 'value',
    value: '-2',
  },
  'numeric unary ceil 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary ceil 1e-100': {
    kind: 'value',
    value: '1',
  },
  'numeric unary ceil NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary ceil Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary ceil -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary ceiling null': {
    kind: 'null',
  },
  'numeric unary ceiling 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary ceiling -0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric unary ceiling 1.2300': {
    kind: 'value',
    value: '2',
  },
  'numeric unary ceiling -1.2300': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary ceiling 2.5': {
    kind: 'value',
    value: '3',
  },
  'numeric unary ceiling -2.5': {
    kind: 'value',
    value: '-2',
  },
  'numeric unary ceiling 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary ceiling 1e-100': {
    kind: 'value',
    value: '1',
  },
  'numeric unary ceiling NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary ceiling Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary ceiling -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary floor null': {
    kind: 'null',
  },
  'numeric unary floor 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary floor -0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric unary floor 1.2300': {
    kind: 'value',
    value: '1',
  },
  'numeric unary floor -1.2300': {
    kind: 'value',
    value: '-2',
  },
  'numeric unary floor 2.5': {
    kind: 'value',
    value: '2',
  },
  'numeric unary floor -2.5': {
    kind: 'value',
    value: '-3',
  },
  'numeric unary floor 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary floor 1e-100': {
    kind: 'value',
    value: '0',
  },
  'numeric unary floor NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary floor Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary floor -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary sign null': {
    kind: 'null',
  },
  'numeric unary sign 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary sign -0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric unary sign 1.2300': {
    kind: 'value',
    value: '1',
  },
  'numeric unary sign -1.2300': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary sign 2.5': {
    kind: 'value',
    value: '1',
  },
  'numeric unary sign -2.5': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary sign 1e100': {
    kind: 'value',
    value: '1',
  },
  'numeric unary sign 1e-100': {
    kind: 'value',
    value: '1',
  },
  'numeric unary sign NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary sign Infinity': {
    kind: 'value',
    value: '1',
  },
  'numeric unary sign -Infinity': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary round null': {
    kind: 'null',
  },
  'numeric unary round 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary round -0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric unary round 1.2300': {
    kind: 'value',
    value: '1',
  },
  'numeric unary round -1.2300': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary round 2.5': {
    kind: 'value',
    value: '3',
  },
  'numeric unary round -2.5': {
    kind: 'value',
    value: '-3',
  },
  'numeric unary round 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary round 1e-100': {
    kind: 'value',
    value: '0',
  },
  'numeric unary round NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary round Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary round -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unary trunc null': {
    kind: 'null',
  },
  'numeric unary trunc 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unary trunc -0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric unary trunc 1.2300': {
    kind: 'value',
    value: '1',
  },
  'numeric unary trunc -1.2300': {
    kind: 'value',
    value: '-1',
  },
  'numeric unary trunc 2.5': {
    kind: 'value',
    value: '2',
  },
  'numeric unary trunc -2.5': {
    kind: 'value',
    value: '-2',
  },
  'numeric unary trunc 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unary trunc 1e-100': {
    kind: 'value',
    value: '0',
  },
  'numeric unary trunc NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unary trunc Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unary trunc -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme 2.5/null': {
    kind: 'null',
  },
  'numeric round extreme 2.5/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 2.5/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 2.5/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 2.5/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 2.5/0': {
    kind: 'value',
    value: '3',
  },
  'numeric round extreme 2.5/2': {
    kind: 'value',
    value: '2.50',
  },
  'numeric round extreme 2.5/8': {
    kind: 'value',
    value: '2.50000000',
  },
  'numeric round extreme 2.5/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 2.5/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme -2.5/null': {
    kind: 'null',
  },
  'numeric round extreme -2.5/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -2.5/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -2.5/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -2.5/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -2.5/0': {
    kind: 'value',
    value: '-3',
  },
  'numeric round extreme -2.5/2': {
    kind: 'value',
    value: '-2.50',
  },
  'numeric round extreme -2.5/8': {
    kind: 'value',
    value: '-2.50000000',
  },
  'numeric round extreme -2.5/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme -2.5/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 999.995/null': {
    kind: 'null',
  },
  'numeric round extreme 999.995/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 999.995/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 999.995/-3': {
    kind: 'value',
    value: '1000',
  },
  'numeric round extreme 999.995/-1': {
    kind: 'value',
    value: '1000',
  },
  'numeric round extreme 999.995/0': {
    kind: 'value',
    value: '1000',
  },
  'numeric round extreme 999.995/2': {
    kind: 'value',
    value: '1000.00',
  },
  'numeric round extreme 999.995/8': {
    kind: 'value',
    value: '999.99500000',
  },
  'numeric round extreme 999.995/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 999.995/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme -999.995/null': {
    kind: 'null',
  },
  'numeric round extreme -999.995/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -999.995/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -999.995/-3': {
    kind: 'value',
    value: '-1000',
  },
  'numeric round extreme -999.995/-1': {
    kind: 'value',
    value: '-1000',
  },
  'numeric round extreme -999.995/0': {
    kind: 'value',
    value: '-1000',
  },
  'numeric round extreme -999.995/2': {
    kind: 'value',
    value: '-1000.00',
  },
  'numeric round extreme -999.995/8': {
    kind: 'value',
    value: '-999.99500000',
  },
  'numeric round extreme -999.995/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme -999.995/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 0.0005/null': {
    kind: 'null',
  },
  'numeric round extreme 0.0005/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0.0005/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0.0005/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0.0005/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0.0005/0': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0.0005/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric round extreme 0.0005/8': {
    kind: 'value',
    value: '0.00050000',
  },
  'numeric round extreme 0.0005/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 0.0005/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme -0.0005/null': {
    kind: 'null',
  },
  'numeric round extreme -0.0005/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -0.0005/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -0.0005/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -0.0005/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -0.0005/0': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme -0.0005/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric round extreme -0.0005/8': {
    kind: 'value',
    value: '-0.00050000',
  },
  'numeric round extreme -0.0005/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme -0.0005/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 1e-16383/null': {
    kind: 'null',
  },
  'numeric round extreme 1e-16383/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 1e-16383/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 1e-16383/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 1e-16383/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 1e-16383/0': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 1e-16383/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric round extreme 1e-16383/8': {
    kind: 'value',
    value: '0.00000000',
  },
  'numeric round extreme 1e-16383/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 1e-16383/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 0/null': {
    kind: 'null',
  },
  'numeric round extreme 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0/0': {
    kind: 'value',
    value: '0',
  },
  'numeric round extreme 0/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric round extreme 0/8': {
    kind: 'value',
    value: '0.00000000',
  },
  'numeric round extreme 0/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme 0/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric round extreme NaN/null': {
    kind: 'null',
  },
  'numeric round extreme NaN/-2147483648': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/-131073': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/-3': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/-1': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/8': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/16383': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme NaN/2147483647': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric round extreme Infinity/null': {
    kind: 'null',
  },
  'numeric round extreme Infinity/-2147483648': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/-131073': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/-3': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/-1': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/0': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/8': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/16383': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme Infinity/2147483647': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric round extreme -Infinity/null': {
    kind: 'null',
  },
  'numeric round extreme -Infinity/-2147483648': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/-131073': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/-3': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/-1': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/0': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/8': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/16383': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme -Infinity/2147483647': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric round extreme null/null': {
    kind: 'null',
  },
  'numeric round extreme null/-2147483648': {
    kind: 'null',
  },
  'numeric round extreme null/-131073': {
    kind: 'null',
  },
  'numeric round extreme null/-3': {
    kind: 'null',
  },
  'numeric round extreme null/-1': {
    kind: 'null',
  },
  'numeric round extreme null/0': {
    kind: 'null',
  },
  'numeric round extreme null/2': {
    kind: 'null',
  },
  'numeric round extreme null/8': {
    kind: 'null',
  },
  'numeric round extreme null/16383': {
    kind: 'null',
  },
  'numeric round extreme null/2147483647': {
    kind: 'null',
  },
  'numeric trunc extreme 2.5/null': {
    kind: 'null',
  },
  'numeric trunc extreme 2.5/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 2.5/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 2.5/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 2.5/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 2.5/0': {
    kind: 'value',
    value: '2',
  },
  'numeric trunc extreme 2.5/2': {
    kind: 'value',
    value: '2.50',
  },
  'numeric trunc extreme 2.5/8': {
    kind: 'value',
    value: '2.50000000',
  },
  'numeric trunc extreme 2.5/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 2.5/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme -2.5/null': {
    kind: 'null',
  },
  'numeric trunc extreme -2.5/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -2.5/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -2.5/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -2.5/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -2.5/0': {
    kind: 'value',
    value: '-2',
  },
  'numeric trunc extreme -2.5/2': {
    kind: 'value',
    value: '-2.50',
  },
  'numeric trunc extreme -2.5/8': {
    kind: 'value',
    value: '-2.50000000',
  },
  'numeric trunc extreme -2.5/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme -2.5/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 999.995/null': {
    kind: 'null',
  },
  'numeric trunc extreme 999.995/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 999.995/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 999.995/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 999.995/-1': {
    kind: 'value',
    value: '990',
  },
  'numeric trunc extreme 999.995/0': {
    kind: 'value',
    value: '999',
  },
  'numeric trunc extreme 999.995/2': {
    kind: 'value',
    value: '999.99',
  },
  'numeric trunc extreme 999.995/8': {
    kind: 'value',
    value: '999.99500000',
  },
  'numeric trunc extreme 999.995/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 999.995/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme -999.995/null': {
    kind: 'null',
  },
  'numeric trunc extreme -999.995/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -999.995/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -999.995/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -999.995/-1': {
    kind: 'value',
    value: '-990',
  },
  'numeric trunc extreme -999.995/0': {
    kind: 'value',
    value: '-999',
  },
  'numeric trunc extreme -999.995/2': {
    kind: 'value',
    value: '-999.99',
  },
  'numeric trunc extreme -999.995/8': {
    kind: 'value',
    value: '-999.99500000',
  },
  'numeric trunc extreme -999.995/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme -999.995/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 0.0005/null': {
    kind: 'null',
  },
  'numeric trunc extreme 0.0005/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0.0005/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0.0005/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0.0005/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0.0005/0': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0.0005/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric trunc extreme 0.0005/8': {
    kind: 'value',
    value: '0.00050000',
  },
  'numeric trunc extreme 0.0005/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 0.0005/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme -0.0005/null': {
    kind: 'null',
  },
  'numeric trunc extreme -0.0005/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -0.0005/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -0.0005/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -0.0005/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -0.0005/0': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme -0.0005/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric trunc extreme -0.0005/8': {
    kind: 'value',
    value: '-0.00050000',
  },
  'numeric trunc extreme -0.0005/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme -0.0005/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 1e-16383/null': {
    kind: 'null',
  },
  'numeric trunc extreme 1e-16383/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 1e-16383/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 1e-16383/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 1e-16383/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 1e-16383/0': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 1e-16383/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric trunc extreme 1e-16383/8': {
    kind: 'value',
    value: '0.00000000',
  },
  'numeric trunc extreme 1e-16383/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 1e-16383/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 0/null': {
    kind: 'null',
  },
  'numeric trunc extreme 0/-2147483648': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0/-131073': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0/-3': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0/-1': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0/0': {
    kind: 'value',
    value: '0',
  },
  'numeric trunc extreme 0/2': {
    kind: 'value',
    value: '0.00',
  },
  'numeric trunc extreme 0/8': {
    kind: 'value',
    value: '0.00000000',
  },
  'numeric trunc extreme 0/16383': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme 0/2147483647': {
    kind: 'value',
    value: 'true',
  },
  'numeric trunc extreme NaN/null': {
    kind: 'null',
  },
  'numeric trunc extreme NaN/-2147483648': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/-131073': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/-3': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/-1': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/8': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/16383': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme NaN/2147483647': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric trunc extreme Infinity/null': {
    kind: 'null',
  },
  'numeric trunc extreme Infinity/-2147483648': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/-131073': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/-3': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/-1': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/0': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/8': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/16383': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme Infinity/2147483647': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric trunc extreme -Infinity/null': {
    kind: 'null',
  },
  'numeric trunc extreme -Infinity/-2147483648': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/-131073': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/-3': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/-1': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/0': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/2': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/8': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/16383': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme -Infinity/2147483647': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric trunc extreme null/null': {
    kind: 'null',
  },
  'numeric trunc extreme null/-2147483648': {
    kind: 'null',
  },
  'numeric trunc extreme null/-131073': {
    kind: 'null',
  },
  'numeric trunc extreme null/-3': {
    kind: 'null',
  },
  'numeric trunc extreme null/-1': {
    kind: 'null',
  },
  'numeric trunc extreme null/0': {
    kind: 'null',
  },
  'numeric trunc extreme null/2': {
    kind: 'null',
  },
  'numeric trunc extreme null/8': {
    kind: 'null',
  },
  'numeric trunc extreme null/16383': {
    kind: 'null',
  },
  'numeric trunc extreme null/2147483647': {
    kind: 'null',
  },
  'numeric function mod 12.00/18.0': {
    kind: 'value',
    value: '12.00',
  },
  'numeric function mod -12.00/18.0': {
    kind: 'value',
    value: '-12.00',
  },
  'numeric function mod 1.2300/0.030': {
    kind: 'value',
    value: '0.0000',
  },
  'numeric function mod 0/3.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric function mod 0/0': {
    kind: 'error',
    code: '22012',
  },
  'numeric function mod 7/0': {
    kind: 'error',
    code: '22012',
  },
  'numeric function mod NaN/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function mod Infinity/0': {
    kind: 'error',
    code: '22012',
  },
  'numeric function mod Infinity/1': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function mod 1/Infinity': {
    kind: 'value',
    value: '1',
  },
  'numeric function mod -Infinity/-2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function mod NaN/NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function mod null/0': {
    kind: 'null',
  },
  'numeric function mod 0/null': {
    kind: 'null',
  },
  'numeric function mod null/null': {
    kind: 'null',
  },
  'numeric function div 12.00/18.0': {
    kind: 'value',
    value: '0',
  },
  'numeric function div -12.00/18.0': {
    kind: 'value',
    value: '0',
  },
  'numeric function div 1.2300/0.030': {
    kind: 'value',
    value: '41',
  },
  'numeric function div 0/3.000': {
    kind: 'value',
    value: '0',
  },
  'numeric function div 0/0': {
    kind: 'error',
    code: '22012',
  },
  'numeric function div 7/0': {
    kind: 'error',
    code: '22012',
  },
  'numeric function div NaN/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function div Infinity/0': {
    kind: 'error',
    code: '22012',
  },
  'numeric function div Infinity/1': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric function div 1/Infinity': {
    kind: 'value',
    value: '0',
  },
  'numeric function div -Infinity/-2': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric function div NaN/NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function div null/0': {
    kind: 'null',
  },
  'numeric function div 0/null': {
    kind: 'null',
  },
  'numeric function div null/null': {
    kind: 'null',
  },
  'numeric function gcd 12.00/18.0': {
    kind: 'value',
    value: '6.00',
  },
  'numeric function gcd -12.00/18.0': {
    kind: 'value',
    value: '6.00',
  },
  'numeric function gcd 1.2300/0.030': {
    kind: 'value',
    value: '0.0300',
  },
  'numeric function gcd 0/3.000': {
    kind: 'value',
    value: '3.000',
  },
  'numeric function gcd 0/0': {
    kind: 'value',
    value: '0',
  },
  'numeric function gcd 7/0': {
    kind: 'value',
    value: '7',
  },
  'numeric function gcd NaN/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function gcd Infinity/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function gcd Infinity/1': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function gcd 1/Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function gcd -Infinity/-2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function gcd NaN/NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function gcd null/0': {
    kind: 'null',
  },
  'numeric function gcd 0/null': {
    kind: 'null',
  },
  'numeric function gcd null/null': {
    kind: 'null',
  },
  'numeric function lcm 12.00/18.0': {
    kind: 'value',
    value: '36.00',
  },
  'numeric function lcm -12.00/18.0': {
    kind: 'value',
    value: '36.00',
  },
  'numeric function lcm 1.2300/0.030': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric function lcm 0/3.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric function lcm 0/0': {
    kind: 'value',
    value: '0',
  },
  'numeric function lcm 7/0': {
    kind: 'value',
    value: '0',
  },
  'numeric function lcm NaN/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function lcm Infinity/0': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function lcm Infinity/1': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function lcm 1/Infinity': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function lcm -Infinity/-2': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function lcm NaN/NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric function lcm null/0': {
    kind: 'null',
  },
  'numeric function lcm 0/null': {
    kind: 'null',
  },
  'numeric function lcm null/null': {
    kind: 'null',
  },
  'pg_catalog.int2 to numeric null': {
    kind: 'null',
  },
  'pg_catalog.int2 to numeric 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int2 to numeric 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int2 to numeric -1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int2 to numeric -32768': {
    kind: 'value',
    value: '-32768',
  },
  'pg_catalog.int2 to numeric 32767': {
    kind: 'value',
    value: '32767',
  },
  'numeric to pg_catalog.int2 null': {
    kind: 'null',
  },
  'numeric to pg_catalog.int2 0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric to pg_catalog.int2 1.5': {
    kind: 'value',
    value: '2',
  },
  'numeric to pg_catalog.int2 -1.5': {
    kind: 'value',
    value: '-2',
  },
  'numeric to pg_catalog.int2 2.5': {
    kind: 'value',
    value: '3',
  },
  'numeric to pg_catalog.int2 -2.5': {
    kind: 'value',
    value: '-3',
  },
  'numeric to pg_catalog.int2 NaN': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int2 Infinity': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int2 -Infinity': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int2 -32768': {
    kind: 'value',
    value: '-32768',
  },
  'numeric to pg_catalog.int2 32767': {
    kind: 'value',
    value: '32767',
  },
  'numeric to pg_catalog.int2 32767.4': {
    kind: 'value',
    value: '32767',
  },
  'numeric to pg_catalog.int2 32767.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.int2 -32768.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.int2 1e100': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int4 to numeric null': {
    kind: 'null',
  },
  'pg_catalog.int4 to numeric 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int4 to numeric 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int4 to numeric -1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int4 to numeric -2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'pg_catalog.int4 to numeric 2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'numeric to pg_catalog.int4 null': {
    kind: 'null',
  },
  'numeric to pg_catalog.int4 0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric to pg_catalog.int4 1.5': {
    kind: 'value',
    value: '2',
  },
  'numeric to pg_catalog.int4 -1.5': {
    kind: 'value',
    value: '-2',
  },
  'numeric to pg_catalog.int4 2.5': {
    kind: 'value',
    value: '3',
  },
  'numeric to pg_catalog.int4 -2.5': {
    kind: 'value',
    value: '-3',
  },
  'numeric to pg_catalog.int4 NaN': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int4 Infinity': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int4 -Infinity': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int4 -2147483648': {
    kind: 'value',
    value: '-2147483648',
  },
  'numeric to pg_catalog.int4 2147483647': {
    kind: 'value',
    value: '2147483647',
  },
  'numeric to pg_catalog.int4 2147483647.4': {
    kind: 'value',
    value: '2147483647',
  },
  'numeric to pg_catalog.int4 2147483647.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.int4 -2147483648.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.int4 1e100': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.int8 to numeric null': {
    kind: 'null',
  },
  'pg_catalog.int8 to numeric 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.int8 to numeric 1': {
    kind: 'value',
    value: '1',
  },
  'pg_catalog.int8 to numeric -1': {
    kind: 'value',
    value: '-1',
  },
  'pg_catalog.int8 to numeric -9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'pg_catalog.int8 to numeric 9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'numeric to pg_catalog.int8 null': {
    kind: 'null',
  },
  'numeric to pg_catalog.int8 0.000': {
    kind: 'value',
    value: '0',
  },
  'numeric to pg_catalog.int8 1.5': {
    kind: 'value',
    value: '2',
  },
  'numeric to pg_catalog.int8 -1.5': {
    kind: 'value',
    value: '-2',
  },
  'numeric to pg_catalog.int8 2.5': {
    kind: 'value',
    value: '3',
  },
  'numeric to pg_catalog.int8 -2.5': {
    kind: 'value',
    value: '-3',
  },
  'numeric to pg_catalog.int8 NaN': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int8 Infinity': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int8 -Infinity': {
    kind: 'error',
    code: '0A000',
  },
  'numeric to pg_catalog.int8 -9223372036854775808': {
    kind: 'value',
    value: '-9223372036854775808',
  },
  'numeric to pg_catalog.int8 9223372036854775807': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'numeric to pg_catalog.int8 9223372036854775807.4': {
    kind: 'value',
    value: '9223372036854775807',
  },
  'numeric to pg_catalog.int8 9223372036854775807.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.int8 -9223372036854775808.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.int8 1e100': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float4 to numeric null': {
    kind: 'null',
  },
  'pg_catalog.float4 to numeric 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to numeric -0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float4 to numeric 0.1': {
    kind: 'value',
    value: '0.1',
  },
  'pg_catalog.float4 to numeric 1.23456789': {
    kind: 'value',
    value: '1.23457',
  },
  'pg_catalog.float4 to numeric -1.23456789': {
    kind: 'value',
    value: '-1.23457',
  },
  'pg_catalog.float4 to numeric 16777217': {
    kind: 'value',
    value: '16777200',
  },
  'pg_catalog.float4 to numeric 9007199254740992': {
    kind: 'value',
    value: '9007200000000000',
  },
  'pg_catalog.float4 to numeric 3.4028234663852886e+38': {
    kind: 'value',
    value: '340282000000000000000000000000000000000',
  },
  'pg_catalog.float4 to numeric 1.401298464324817e-45': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000000000000014013',
  },
  'pg_catalog.float4 to numeric NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'pg_catalog.float4 to numeric Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'pg_catalog.float4 to numeric -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'pg_catalog.float4 to numeric 1.234565': {
    kind: 'value',
    value: '1.23457',
  },
  'pg_catalog.float4 to numeric 1.234575': {
    kind: 'value',
    value: '1.23458',
  },
  'numeric to pg_catalog.float4 null': {
    kind: 'null',
  },
  'numeric to pg_catalog.float4 0.000': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'numeric to pg_catalog.float4 -0.000': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000000',
  },
  'numeric to pg_catalog.float4 0.1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3dcccccd',
  },
  'numeric to pg_catalog.float4 1.234567890123456789': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3f9e0652',
  },
  'numeric to pg_catalog.float4 NaN': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'NaN',
  },
  'numeric to pg_catalog.float4 Infinity': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'Infinity',
  },
  'numeric to pg_catalog.float4 -Infinity': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '-Infinity',
  },
  'numeric to pg_catalog.float4 1e1000': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 1e-1000': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 7.038531e-26': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '15ae43fd',
  },
  'numeric to pg_catalog.float4 -7.038531e-26': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '95ae43fd',
  },
  'numeric to pg_catalog.float4 16777217': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800000',
  },
  'numeric to pg_catalog.float4 16777219': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4b800002',
  },
  'numeric to pg_catalog.float4 3.4028234663852886e38': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '7f7fffff',
  },
  'numeric to pg_catalog.float4 3.4028236e38': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 1.401298464324817e-45': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'numeric to pg_catalog.float4 7.006492321624085e-46': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 7.006492321624086e-46': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '00000001',
  },
  'numeric to pg_catalog.float4 4.9406564584124654e-324': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 2.4703282292062327e-324': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 2.4703282292062328e-324': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 1.7976931348623157e308': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float4 1.7976931348623159e308': {
    kind: 'error',
    code: '22003',
  },
  'pg_catalog.float8 to numeric null': {
    kind: 'null',
  },
  'pg_catalog.float8 to numeric 0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to numeric -0': {
    kind: 'value',
    value: '0',
  },
  'pg_catalog.float8 to numeric 0.1': {
    kind: 'value',
    value: '0.1',
  },
  'pg_catalog.float8 to numeric 1.23456789': {
    kind: 'value',
    value: '1.23456789',
  },
  'pg_catalog.float8 to numeric -1.23456789': {
    kind: 'value',
    value: '-1.23456789',
  },
  'pg_catalog.float8 to numeric 16777217': {
    kind: 'value',
    value: '16777217',
  },
  'pg_catalog.float8 to numeric 9007199254740992': {
    kind: 'value',
    value: '9007199254740990',
  },
  'pg_catalog.float8 to numeric 3.4028234663852886e+38': {
    kind: 'value',
    value: '340282346638529000000000000000000000000',
  },
  'pg_catalog.float8 to numeric 1.401298464324817e-45': {
    kind: 'value',
    value: '0.00000000000000000000000000000000000000000000140129846432482',
  },
  'pg_catalog.float8 to numeric NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'pg_catalog.float8 to numeric Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'pg_catalog.float8 to numeric -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'pg_catalog.float8 to numeric 1.7976931348623157e+308': {
    kind: 'value',
    value:
      '179769313486232000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'pg_catalog.float8 to numeric 5e-324': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000494065645841247',
  },
  'pg_catalog.float8 to numeric 1e-300': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'pg_catalog.float8 to numeric 1e+300': {
    kind: 'value',
    value:
      '1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'pg_catalog.float8 to numeric 1.234565': {
    kind: 'value',
    value: '1.234565',
  },
  'pg_catalog.float8 to numeric 1.234575': {
    kind: 'value',
    value: '1.234575',
  },
  'numeric to pg_catalog.float8 null': {
    kind: 'null',
  },
  'numeric to pg_catalog.float8 0.000': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'numeric to pg_catalog.float8 -0.000': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000000',
  },
  'numeric to pg_catalog.float8 0.1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fb999999999999a',
  },
  'numeric to pg_catalog.float8 1.234567890123456789': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ff3c0ca428c59fb',
  },
  'numeric to pg_catalog.float8 NaN': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'NaN',
  },
  'numeric to pg_catalog.float8 Infinity': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'Infinity',
  },
  'numeric to pg_catalog.float8 -Infinity': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '-Infinity',
  },
  'numeric to pg_catalog.float8 1e1000': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float8 1e-1000': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float8 7.038531e-26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ab5c87fb0000000',
  },
  'numeric to pg_catalog.float8 -7.038531e-26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bab5c87fb0000000',
  },
  'numeric to pg_catalog.float8 16777217': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4170000010000000',
  },
  'numeric to pg_catalog.float8 16777219': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4170000030000000',
  },
  'numeric to pg_catalog.float8 3.4028234663852886e38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47efffffe0000000',
  },
  'numeric to pg_catalog.float8 3.4028236e38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '47effffff514a7bc',
  },
  'numeric to pg_catalog.float8 1.401298464324817e-45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '36a0000000000000',
  },
  'numeric to pg_catalog.float8 7.006492321624085e-46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3690000000000000',
  },
  'numeric to pg_catalog.float8 7.006492321624086e-46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3690000000000000',
  },
  'numeric to pg_catalog.float8 4.9406564584124654e-324': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'numeric to pg_catalog.float8 2.4703282292062327e-324': {
    kind: 'error',
    code: '22003',
  },
  'numeric to pg_catalog.float8 2.4703282292062328e-324': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '0000000000000001',
  },
  'numeric to pg_catalog.float8 1.7976931348623157e308': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '7fefffffffffffff',
  },
  'numeric to pg_catalog.float8 1.7976931348623159e308': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 null': {
    kind: 'null',
  },
  'numeric typmod 3/2 0': {
    kind: 'value',
    value: '0.00',
  },
  'numeric typmod 3/2 1.2345': {
    kind: 'value',
    value: '1.23',
  },
  'numeric typmod 3/2 9.994': {
    kind: 'value',
    value: '9.99',
  },
  'numeric typmod 3/2 9.995': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 -99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 1499': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 1500': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 99999': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 0.0012345': {
    kind: 'value',
    value: '0.00',
  },
  'numeric typmod 3/2 0.009995': {
    kind: 'value',
    value: '0.01',
  },
  'numeric typmod 3/2 NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric typmod 3/2 Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/2 -Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 2/-3 null': {
    kind: 'null',
  },
  'numeric typmod 2/-3 0': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 1.2345': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 9.994': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 9.995': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 99.5': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 -99.5': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 1499': {
    kind: 'value',
    value: '1000',
  },
  'numeric typmod 2/-3 1500': {
    kind: 'value',
    value: '2000',
  },
  'numeric typmod 2/-3 99999': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 2/-3 0.0012345': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 0.009995': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 2/-3 NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric typmod 2/-3 Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 2/-3 -Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 null': {
    kind: 'null',
  },
  'numeric typmod 3/5 0': {
    kind: 'value',
    value: '0.00000',
  },
  'numeric typmod 3/5 1.2345': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 9.994': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 9.995': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 -99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 1499': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 1500': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 99999': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 0.0012345': {
    kind: 'value',
    value: '0.00123',
  },
  'numeric typmod 3/5 0.009995': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric typmod 3/5 Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 3/5 -Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 null': {
    kind: 'null',
  },
  'numeric typmod 1/0 0': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1/0 1.2345': {
    kind: 'value',
    value: '1',
  },
  'numeric typmod 1/0 9.994': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 9.995': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 -99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 1499': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 1500': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 99999': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 0.0012345': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1/0 0.009995': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1/0 NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric typmod 1/0 Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1/0 -Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 null': {
    kind: 'null',
  },
  'numeric typmod 1000/1000 0': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric typmod 1000/1000 1.2345': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 9.994': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 9.995': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 -99.5': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 1499': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 1500': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 99999': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 0.0012345': {
    kind: 'value',
    value:
      '0.0012345000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric typmod 1000/1000 0.009995': {
    kind: 'value',
    value:
      '0.0099950000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric typmod 1000/1000 NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric typmod 1000/1000 Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/1000 -Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/-1000 null': {
    kind: 'null',
  },
  'numeric typmod 1000/-1000 0': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 1.2345': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 9.994': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 9.995': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 99.5': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 -99.5': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 1499': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 1500': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 99999': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 0.0012345': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 0.009995': {
    kind: 'value',
    value: '0',
  },
  'numeric typmod 1000/-1000 NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric typmod 1000/-1000 Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric typmod 1000/-1000 -Infinity': {
    kind: 'error',
    code: '22003',
  },
  'numeric relabel null': {
    kind: 'null',
  },
  'numeric unconstrained typmod null': {
    kind: 'null',
  },
  'numeric relabel 0': {
    kind: 'value',
    value: '0',
  },
  'numeric unconstrained typmod 0': {
    kind: 'value',
    value: '0',
  },
  'numeric relabel -0.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric unconstrained typmod -0.000': {
    kind: 'value',
    value: '0.000',
  },
  'numeric relabel 1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric unconstrained typmod 1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric relabel -1.2300': {
    kind: 'value',
    value: '-1.2300',
  },
  'numeric unconstrained typmod -1.2300': {
    kind: 'value',
    value: '-1.2300',
  },
  'numeric relabel 2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric unconstrained typmod 2.5': {
    kind: 'value',
    value: '2.5',
  },
  'numeric relabel -2.5': {
    kind: 'value',
    value: '-2.5',
  },
  'numeric unconstrained typmod -2.5': {
    kind: 'value',
    value: '-2.5',
  },
  'numeric relabel 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric unconstrained typmod 1e100': {
    kind: 'value',
    value:
      '10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric relabel 1e-100': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric unconstrained typmod 1e-100': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  },
  'numeric relabel NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric unconstrained typmod NaN': {
    kind: 'value',
    value: 'NaN',
  },
  'numeric relabel Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric unconstrained typmod Infinity': {
    kind: 'value',
    value: 'Infinity',
  },
  'numeric relabel -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric unconstrained typmod -Infinity': {
    kind: 'value',
    value: '-Infinity',
  },
  'numeric nested zero divisor': {
    kind: 'error',
    code: '22012',
  },
  'numeric error through null comparison': {
    kind: 'error',
    code: '22012',
  },
  'numeric error through null rounding': {
    kind: 'error',
    code: '22012',
  },
  'integer error through numeric cast': {
    kind: 'error',
    code: '22012',
  },
  'numeric error through integer cast': {
    kind: 'error',
    code: '22012',
  },
  'numeric error through float cast': {
    kind: 'error',
    code: '22012',
  },
  'numeric scale capped multiplication': {
    kind: 'value',
    value: 'true',
  },
  'numeric sampled + 0': {
    kind: 'value',
    value: '-0.000038516128662087882708015561',
  },
  'numeric sampled - 0': {
    kind: 'value',
    value: '0.000038516118786151519345984439',
  },
  'numeric sampled * 0': {
    kind: 'value',
    value: '0.000000000000000190191393431392385512085809313054681147',
  },
  'numeric sampled / 0': {
    kind: 'value',
    value: '0.000000128205221715723795515707',
  },
  'numeric sampled % 0': {
    kind: 'value',
    value: '-0.000000000004937968181681015561',
  },
  'numeric sampled to pg_catalog.float4 0': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'acadbd43',
  },
  'pg_catalog.float4 sampled to numeric 0': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000000000000014013',
  },
  'numeric sampled to pg_catalog.float8 0': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bd95b7a86d2a96ba',
  },
  'pg_catalog.float8 sampled to numeric 0': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000988131291682493',
  },
  'numeric sampled + 1': {
    kind: 'value',
    value: '0.00041692613997505879483807815',
  },
  'numeric sampled - 1': {
    kind: 'value',
    value: '-0.00041692564768136116710192185',
  },
  'numeric sampled * 1': {
    kind: 'value',
    value: '0.0000000000001026249949547192162388416860267019728055',
  },
  'numeric sampled / 1': {
    kind: 'value',
    value: '0.00000059038513188458942584047',
  },
  'numeric sampled % 1': {
    kind: 'value',
    value: '0.00000000024614684881386807815',
  },
  'numeric sampled to pg_catalog.float4 1': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '2f875217',
  },
  'pg_catalog.float4 sampled to numeric 1': {
    kind: 'value',
    value: '0.00000000000000000000000000000000000570401',
  },
  'numeric sampled to pg_catalog.float8 1': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3df0ea42db49e97b',
  },
  'pg_catalog.float8 sampled to numeric 1': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000126755687156539',
  },
  'numeric sampled + 2': {
    kind: 'value',
    value: '0.0011236347969282842625242667',
  },
  'numeric sampled - 2': {
    kind: 'value',
    value: '-0.0011236355717407286556757333',
  },
  'numeric sampled * 2': {
    kind: 'value',
    value: '-0.00000000000043530326189018414187676479989116895803',
  },
  'numeric sampled / 2': {
    kind: 'value',
    value: '-0.0000003447793621966583147514',
  },
  'numeric sampled % 2': {
    kind: 'value',
    value: '-0.0000000003874062221965757333',
  },
  'numeric sampled to pg_catalog.float4 2': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'afd4fa94',
  },
  'pg_catalog.float4 sampled to numeric 2': {
    kind: 'value',
    value: '0.00000000000000000000000000734905',
  },
  'numeric sampled to pg_catalog.float8 2': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bdfa9f528496c427',
  },
  'pg_catalog.float8 sampled to numeric 2': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000318157281132875',
  },
  'numeric sampled + 3': {
    kind: 'value',
    value: '-0.014571186533000992308654605',
  },
  'numeric sampled - 3': {
    kind: 'value',
    value: '0.014571254230594037125345395',
  },
  'numeric sampled * 3': {
    kind: 'value',
    value: '-0.000000000493218273786633319003470571231131678215',
  },
  'numeric sampled / 3': {
    kind: 'value',
    value: '-0.000002322989813858867531393',
  },
  'numeric sampled % 3': {
    kind: 'value',
    value: '0.000000033848796522408345395',
  },
  'numeric sampled to pg_catalog.float4 3': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '33116125',
  },
  'pg_catalog.float4 sampled to numeric 3': {
    kind: 'value',
    value: '0.0000000000000000198097',
  },
  'numeric sampled to pg_catalog.float8 3': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3e622c24a6cf7df9',
  },
  'pg_catalog.float8 sampled to numeric 3': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000512162594053916',
  },
  'numeric sampled + 4': {
    kind: 'value',
    value: '0.04532333848530596840123487',
  },
  'numeric sampled - 4': {
    kind: 'value',
    value: '-0.04532351193792878221876513',
  },
  'numeric sampled * 4': {
    kind: 'value',
    value: '-0.0000000039307334889304682884599165274438509403',
  },
  'numeric sampled / 4': {
    kind: 'value',
    value: '-0.00000191349861582568418847',
  },
  'numeric sampled % 4': {
    kind: 'value',
    value: '-0.00000008672631140690876513',
  },
  'numeric sampled to pg_catalog.float4 4': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'b3ba3e4b',
  },
  'pg_catalog.float4 sampled to numeric 4': {
    kind: 'value',
    value: '0.0000000427929',
  },
  'numeric sampled to pg_catalog.float8 4': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'be7747c967bc4155',
  },
  'pg_catalog.float8 sampled to numeric 4': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000154636827822457',
  },
  'numeric sampled + 5': {
    kind: 'value',
    value: '0.7644849213052529568699103',
  },
  'numeric sampled - 5': {
    kind: 'value',
    value: '-0.7644799149117807793300897',
  },
  'numeric sampled * 5': {
    kind: 'value',
    value: '0.00000191364989380648975371028265964727393143',
  },
  'numeric sampled / 5': {
    kind: 'value',
    value: '0.0000032743679603282200719',
  },
  'numeric sampled % 5': {
    kind: 'value',
    value: '0.0000025031967360887699103',
  },
  'numeric sampled to pg_catalog.float4 5': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3627fc98',
  },
  'pg_catalog.float4 sampled to numeric 5': {
    kind: 'value',
    value: '127.503',
  },
  'numeric sampled to pg_catalog.float8 5': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ec4ff92f57f134e',
  },
  'pg_catalog.float8 sampled to numeric 5': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000334513429133484',
  },
  'numeric sampled + 6': {
    kind: 'value',
    value: '-11.034423574642330426242349',
  },
  'numeric sampled - 6': {
    kind: 'value',
    value: '11.034373385592604947757651',
  },
  'numeric sampled * 6': {
    kind: 'value',
    value: '0.000276902987004679900204147200802869476763',
  },
  'numeric sampled / 6': {
    kind: 'value',
    value: '0.000002274208685498921398',
  },
  'numeric sampled % 6': {
    kind: 'value',
    value: '-0.000025094524862739242349',
  },
  'numeric sampled to pg_catalog.float4 6': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'b7d28215',
  },
  'pg_catalog.float4 sampled to numeric 6': {
    kind: 'value',
    value: '154382000000',
  },
  'numeric sampled to pg_catalog.float8 6': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'befa50429e14df42',
  },
  'pg_catalog.float8 sampled to numeric 6': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000859873780920447',
  },
  'numeric sampled + 7': {
    kind: 'value',
    value: '63.39449066072224185772939',
  },
  'numeric sampled - 7': {
    kind: 'value',
    value: '-63.39376820140139440227061',
  },
  'numeric sampled * 7': {
    kind: 'value',
    value: '0.0228998398472403045225613325329500358407',
  },
  'numeric sampled / 7': {
    kind: 'value',
    value: '0.000005698156338222899131',
  },
  'numeric sampled % 7': {
    kind: 'value',
    value: '0.00036122966042372772939',
  },
  'numeric sampled to pg_catalog.float4 7': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '39bd636d',
  },
  'pg_catalog.float4 sampled to numeric 7': {
    kind: 'value',
    value: '453582000000000000000',
  },
  'numeric sampled to pg_catalog.float8 7': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f37ac6d93eef789',
  },
  'pg_catalog.float8 sampled to numeric 7': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000208032736455069',
  },
  'numeric sampled + 8': {
    kind: 'value',
    value: '1032.6710194393073449186311',
  },
  'numeric sampled - 8': {
    kind: 'value',
    value: '-1032.6759328597275516813689',
  },
  'numeric sampled * 8': {
    kind: 'value',
    value: '-2.53697947255947019940281575787968897787',
  },
  'numeric sampled / 8': {
    kind: 'value',
    value: '-0.000002378980642810353593',
  },
  'numeric sampled % 8': {
    kind: 'value',
    value: '-0.0024567102101033813689',
  },
  'numeric sampled to pg_catalog.float4 8': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bb2100c2',
  },
  'pg_catalog.float4 sampled to numeric 8': {
    kind: 'value',
    value: '1100280000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 8': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bf6420184042b5c3',
  },
  'pg_catalog.float8 sampled to numeric 8': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000326851628145975',
  },
  'numeric sampled + 9': {
    kind: 'value',
    value: '-33454.337827360369354964489',
  },
  'numeric sampled - 9': {
    kind: 'value',
    value: '33454.416939092693047035511',
  },
  'numeric sampled * 9': {
    kind: 'value',
    value: '-1323.316874298797665795651490514395478711',
  },
  'numeric sampled / 9': {
    kind: 'value',
    value: '-0.000001182382374322072704',
  },
  'numeric sampled % 9': {
    kind: 'value',
    value: '0.039555866161846035511',
  },
  'numeric sampled to pg_catalog.float4 9': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3d220555',
  },
  'pg_catalog.float4 sampled to numeric 9': {
    kind: 'value',
    value: '0.000000000000000000000000000000000000000000014013',
  },
  'numeric sampled to pg_catalog.float8 9': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fa440aa9f0f66e1',
  },
  'pg_catalog.float8 sampled to numeric 9': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000780227455059316',
  },
  'numeric sampled + 10': {
    kind: 'value',
    value: '208493.64703002993949142395',
  },
  'numeric sampled - 10': {
    kind: 'value',
    value: '-208493.73862176075872857605',
  },
  'numeric sampled * 10': {
    kind: 'value',
    value: '-9548.1490954090614827187836187558348155',
  },
  'numeric sampled / 10': {
    kind: 'value',
    value: '-0.000000219651082912425803',
  },
  'numeric sampled % 10': {
    kind: 'value',
    value: '-0.04579586540961857605',
  },
  'numeric sampled to pg_catalog.float4 10': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bd3b9472',
  },
  'pg_catalog.float4 sampled to numeric 10': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000427546',
  },
  'numeric sampled to pg_catalog.float8 10': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bfa7728e4073e173',
  },
  'pg_catalog.float8 sampled to numeric 10': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000178065716004636',
  },
  'numeric sampled + 11': {
    kind: 'value',
    value: '3767530.3413030256047763363',
  },
  'numeric sampled - 11': {
    kind: 'value',
    value: '-3767522.6629342172010236637',
  },
  'numeric sampled * 11': {
    kind: 'value',
    value: '14464228.98935105869515514184842421819527',
  },
  'numeric sampled / 11': {
    kind: 'value',
    value: '0.000001019019880030826328',
  },
  'numeric sampled % 11': {
    kind: 'value',
    value: '3.8391844042018763363',
  },
  'numeric sampled to pg_catalog.float4 11': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4075b533',
  },
  'pg_catalog.float4 sampled to numeric 11': {
    kind: 'value',
    value: '0.0000000000000000000000000704189',
  },
  'numeric sampled to pg_catalog.float8 11': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '400eb6a6501ae1e7',
  },
  'pg_catalog.float8 sampled to numeric 11': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000442250378018146',
  },
  'numeric sampled + 12': {
    kind: 'value',
    value: '-8732314.328413620125165265',
  },
  'numeric sampled - 12': {
    kind: 'value',
    value: '8732293.598419498296834735',
  },
  'numeric sampled * 12': {
    kind: 'value',
    value: '90510304.915821752744108168816512005915',
  },
  'numeric sampled / 12': {
    kind: 'value',
    value: '0.000001186971629061204417',
  },
  'numeric sampled % 12': {
    kind: 'value',
    value: '-10.364997060914165265',
  },
  'numeric sampled to pg_catalog.float4 12': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c125d707',
  },
  'pg_catalog.float4 sampled to numeric 12': {
    kind: 'value',
    value: '0.000000000000000116653',
  },
  'numeric sampled to pg_catalog.float8 12': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c024bae0e50f8661',
  },
  'pg_catalog.float8 sampled to numeric 12': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000769596247872886',
  },
  'numeric sampled + 13': {
    kind: 'value',
    value: '77820794.21848708223677199',
  },
  'numeric sampled - 13': {
    kind: 'value',
    value: '-77820339.04428223282322801',
  },
  'numeric sampled * 13': {
    kind: 'value',
    value: '17710957268.6856581029632641835779465847',
  },
  'numeric sampled / 13': {
    kind: 'value',
    value: '0.000002924510990812061192',
  },
  'numeric sampled % 13': {
    kind: 'value',
    value: '227.58710242470677199',
  },
  'numeric sampled to pg_catalog.float4 13': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4363964c',
  },
  'pg_catalog.float4 sampled to numeric 13': {
    kind: 'value',
    value: '0.000000299478',
  },
  'numeric sampled to pg_catalog.float8 13': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '406c72c98b063093',
  },
  'pg_catalog.float8 sampled to numeric 13': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000195087178274792',
  },
  'numeric sampled + 14': {
    kind: 'value',
    value: '3943794920.8418762916835235',
  },
  'numeric sampled - 14': {
    kind: 'value',
    value: '-3943797959.2599046153164765',
  },
  'numeric sampled * 14': {
    kind: 'value',
    value: '-5991451101744.59463964602642287285709275',
  },
  'numeric sampled / 14': {
    kind: 'value',
    value: '-0.000000385214865233311260',
  },
  'numeric sampled % 14': {
    kind: 'value',
    value: '-1519.2090141618164765',
  },
  'numeric sampled to pg_catalog.float4 14': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c4bde6b0',
  },
  'pg_catalog.float4 sampled to numeric 14': {
    kind: 'value',
    value: '728.977',
  },
  'numeric sampled to pg_catalog.float8 14': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c097bcd607cef59c',
  },
  'pg_catalog.float8 sampled to numeric 14': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000375170569229865',
  },
  'numeric sampled + 15': {
    kind: 'value',
    value: '-16602817995.519248422513093',
  },
  'numeric sampled - 15': {
    kind: 'value',
    value: '16602883730.930689699486907',
  },
  'numeric sampled * 15': {
    kind: 'value',
    value: '-545697616296126.956148095519460928584327',
  },
  'numeric sampled / 15': {
    kind: 'value',
    value: '-0.000001979642291038094753',
  },
  'numeric sampled % 15': {
    kind: 'value',
    value: '32867.705720638486907',
  },
  'numeric sampled to pg_catalog.float4 15': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '470063b5',
  },
  'pg_catalog.float4 sampled to numeric 15': {
    kind: 'value',
    value: '2004490000000',
  },
  'numeric sampled to pg_catalog.float8 15': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '40e00c76954372cd',
  },
  'pg_catalog.float8 sampled to numeric 15': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000774794150711009',
  },
  'numeric sampled + 16': {
    kind: 'value',
    value: '380330935477.84689501544535',
  },
  'numeric sampled - 16': {
    kind: 'value',
    value: '-380331730969.31293608455465',
  },
  'numeric sampled * 16': {
    kind: 'value',
    value: '-151275164923689980.9416998105945038598075',
  },
  'numeric sampled / 16': {
    kind: 'value',
    value: '-0.000001045787444461530826',
  },
  'numeric sampled % 16': {
    kind: 'value',
    value: '-397745.73302053455465',
  },
  'numeric sampled to pg_catalog.float4 16': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c8c23637',
  },
  'pg_catalog.float4 sampled to numeric 16': {
    kind: 'value',
    value: '3745680000000000000000',
  },
  'numeric sampled to pg_catalog.float8 16': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c11846c6ee9cef5d',
  },
  'pg_catalog.float8 sampled to numeric 16': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000155671446744018',
  },
  'numeric sampled + 17': {
    kind: 'value',
    value: '3834933059217.0593397930151',
  },
  'numeric sampled - 17': {
    kind: 'value',
    value: '-3834927601464.4025836069849',
  },
  'numeric sampled * 17': {
    kind: 'value',
    value: '10465050599446001266.89677061724707562167',
  },
  'numeric sampled / 17': {
    kind: 'value',
    value: '0.000000711584329652120226',
  },
  'numeric sampled % 17': {
    kind: 'value',
    value: '2728876.3283780930151',
  },
  'numeric sampled to pg_catalog.float4 17': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4a268eb1',
  },
  'pg_catalog.float4 sampled to numeric 17': {
    kind: 'value',
    value: '6835740000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 17': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4144d1d62a084b19',
  },
  'pg_catalog.float8 sampled to numeric 17': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000351048584486051',
  },
  'numeric sampled + 18': {
    kind: 'value',
    value: '-37887584902488.023932572341',
  },
  'numeric sampled - 18': {
    kind: 'value',
    value: '37887584704218.942049427659',
  },
  'numeric sampled * 18': {
    kind: 'value',
    value: '3755968326865339911.840172770339551931',
  },
  'numeric sampled / 18': {
    kind: 'value',
    value: '0.0000000026165442177459093268',
  },
  'numeric sampled % 18': {
    kind: 'value',
    value: '-99134.540941572341',
  },
  'numeric sampled to pg_catalog.float4 18': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c7c19f45',
  },
  'pg_catalog.float4 sampled to numeric 18': {
    kind: 'value',
    value: '0.000000000000000000000000000000000000000000152742',
  },
  'numeric sampled to pg_catalog.float8 18': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c0f833e8a7b259a4',
  },
  'pg_catalog.float8 sampled to numeric 18': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000919711359350943',
  },
  'numeric sampled + 19': {
    kind: 'value',
    value: '379527195394660.98115023571',
  },
  'numeric sampled - 19': {
    kind: 'value',
    value: '-379526415455332.16950976429',
  },
  'numeric sampled * 19': {
    kind: 'value',
    value: '148003940944598949318426.2060463633710343',
  },
  'numeric sampled / 19': {
    kind: 'value',
    value: '0.000001027515471454327657',
  },
  'numeric sampled % 19': {
    kind: 'value',
    value: '389969664.40582023571',
  },
  'numeric sampled to pg_catalog.float4 19': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4db9f3b8',
  },
  'pg_catalog.float4 sampled to numeric 19': {
    kind: 'value',
    value: '0.000000000000000000000000000000000304291',
  },
  'numeric sampled to pg_catalog.float8 19': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '41b73e770067e3d6',
  },
  'pg_catalog.float8 sampled to numeric 19': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000114140563855322',
  },
  'numeric sampled + 20': {
    kind: 'value',
    value: '444775102840649.0522305791',
  },
  'numeric sampled - 20': {
    kind: 'value',
    value: '-444780953194013.5323694209',
  },
  'numeric sampled * 20': {
    kind: 'value',
    value: '-1301054316329017791720050.84710590962907',
  },
  'numeric sampled / 20': {
    kind: 'value',
    value: '-0.000006576711298621267584',
  },
  'numeric sampled % 20': {
    kind: 'value',
    value: '-2925176682.2400694209',
  },
  'numeric sampled to pg_catalog.float4 20': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'cf2e5aa7',
  },
  'pg_catalog.float4 sampled to numeric 20': {
    kind: 'value',
    value: '0.00000000000000000000000044669',
  },
  'numeric sampled to pg_catalog.float8 20': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c1e5cb54ed47aea6',
  },
  'pg_catalog.float8 sampled to numeric 20': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000418358442306012',
  },
  'numeric sampled + 21': {
    kind: 'value',
    value: '-25712981003853351.287222593',
  },
  'numeric sampled - 21': {
    kind: 'value',
    value: '25713058400917673.370777407',
  },
  'numeric sampled * 21': {
    kind: 'value',
    value: '-995056119910266620573574091.388472150903',
  },
  'numeric sampled / 21': {
    kind: 'value',
    value: '-0.000001505017015074722661',
  },
  'numeric sampled % 21': {
    kind: 'value',
    value: '38698532161.041777407',
  },
  'numeric sampled to pg_catalog.float4 21': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '511029cc',
  },
  'pg_catalog.float4 sampled to numeric 21': {
    kind: 'value',
    value: '0.00000000000000118049',
  },
  'numeric sampled to pg_catalog.float8 21': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '422205397a821564',
  },
  'pg_catalog.float8 sampled to numeric 21': {
    kind: 'value',
    value:
      '0.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000628810487742387',
  },
  'numeric sampled + 22': {
    kind: 'value',
    value: '65086400378514674.44084979',
  },
  'numeric sampled - 22': {
    kind: 'value',
    value: '-65086618871629553.53915021',
  },
  'numeric sampled * 22': {
    kind: 'value',
    value: '-7110477112295209325954465844.2727524379',
  },
  'numeric sampled / 22': {
    kind: 'value',
    value: '-0.000001678482347092492566',
  },
  'numeric sampled % 22': {
    kind: 'value',
    value: '-109246557439.54915021',
  },
  'numeric sampled to pg_catalog.float4 22': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'd1cb7cd1',
  },
  'pg_catalog.float4 sampled to numeric 22': {
    kind: 'value',
    value: '0.00000209632',
  },
  'numeric sampled to pg_catalog.float8 22': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c2396f9a2cff8c95',
  },
  'pg_catalog.float8 sampled to numeric 22': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000121737566538026',
  },
  'numeric sampled + 23': {
    kind: 'value',
    value: '3900935100705172061.1295723',
  },
  'numeric sampled - 23': {
    kind: 'value',
    value: '-3900933215927963866.2704277',
  },
  'numeric sampled * 23': {
    kind: 'value',
    value: '3676195896131931819997609379507.17292551',
  },
  'numeric sampled / 23': {
    kind: 'value',
    value: '0.000000241580238438095937',
  },
  'numeric sampled % 23': {
    kind: 'value',
    value: '942388604097.4295723',
  },
  'numeric sampled to pg_catalog.float4 23': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '535b6abd',
  },
  'pg_catalog.float4 sampled to numeric 23': {
    kind: 'value',
    value: '4353.63',
  },
  'numeric sampled to pg_catalog.float8 23': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '426b6d579d982dbf',
  },
  'pg_catalog.float8 sampled to numeric 23': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000352331946249154',
  },
  'numeric sampled + 24': {
    kind: 'value',
    value: '-14905392434706374559.014105',
  },
  'numeric sampled - 24': {
    kind: 'value',
    value: '14905319333204250566.985895',
  },
  'numeric sampled * 24': {
    kind: 'value',
    value: '544801952404908178239123113845431.701115',
  },
  'numeric sampled / 24': {
    kind: 'value',
    value: '0.000002452189088711435704',
  },
  'numeric sampled % 24': {
    kind: 'value',
    value: '-36550751061996.014105',
  },
  'numeric sampled to pg_catalog.float4 24': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'd604f88a',
  },
  'pg_catalog.float4 sampled to numeric 24': {
    kind: 'value',
    value: '10730400000000',
  },
  'numeric sampled to pg_catalog.float8 24': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c2c09f114443f602',
  },
  'pg_catalog.float8 sampled to numeric 24': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000521186775248637',
  },
  'numeric sampled + 25': {
    kind: 'value',
    value: '235562999513846260738.33175',
  },
  'numeric sampled - 25': {
    kind: 'value',
    value: '-235562660146314993041.66825',
  },
  'numeric sampled * 25': {
    kind: 'value',
    value: '39971188008933497734361182172220690.75750',
  },
  'numeric sampled / 25': {
    kind: 'value',
    value: '0.000000720333363953247316',
  },
  'numeric sampled % 25': {
    kind: 'value',
    value: '169683765633848.33175',
  },
  'numeric sampled to pg_catalog.float4 25': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '571a5395',
  },
  'pg_catalog.float4 sampled to numeric 25': {
    kind: 'value',
    value: '23274500000000000000000',
  },
  'numeric sampled to pg_catalog.float8 25': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '42e34a729264670b',
  },
  'pg_catalog.float8 sampled to numeric 25': {
    kind: 'value',
    value:
      '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000999296194411747',
  },
  'numeric sampled + 26': {
    kind: 'value',
    value: '3662350105322507701423.7211',
  },
  'numeric sampled - 26': {
    kind: 'value',
    value: '-3662356070732744426376.2789',
  },
  'numeric sampled * 26': {
    kind: 'value',
    value: '-10923719300910620905550903076243125621.7100',
  },
  'numeric sampled / 26': {
    kind: 'value',
    value: '-0.000000814423144538699643',
  },
  'numeric sampled % 26': {
    kind: 'value',
    value: '-2982705118362476.2789',
  },
  'numeric sampled to pg_catalog.float4 26': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'd9298c12',
  },
  'pg_catalog.float4 sampled to numeric 26': {
    kind: 'value',
    value: '69659200000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 26': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c32531824e1976d9',
  },
  'pg_catalog.float8 sampled to numeric 26': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000000000000295657619353261',
  },
  'numeric sampled + 27': {
    kind: 'value',
    value: '-26926633273443521831145.597',
  },
  'numeric sampled - 27': {
    kind: 'value',
    value: '26926690371283926706854.403',
  },
  'numeric sampled * 27': {
    kind: 'value',
    value: '-768727119684691820612225742876659606407.000',
  },
  'numeric sampled / 27': {
    kind: 'value',
    value: '-0.000001060247289128382649',
  },
  'numeric sampled % 27': {
    kind: 'value',
    value: '28548920202437854.403',
  },
  'numeric sampled to pg_catalog.float4 27': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5acada2f',
  },
  'pg_catalog.float4 sampled to numeric 27': {
    kind: 'value',
    value: '0.000000000000000000000000000000000000000000943074',
  },
  'numeric sampled to pg_catalog.float8 27': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43595b45ddd8c938',
  },
  'pg_catalog.float8 sampled to numeric 27': {
    kind: 'value',
    value:
      '0.00000000000000000000000000000000000000000000000000000000000000000000000581598740744296',
  },
  'numeric sampled + 28': {
    kind: 'value',
    value: '145737587309791086501916.95',
  },
  'numeric sampled - 28': {
    kind: 'value',
    value: '-145737874320189896758083.05',
  },
  'numeric sampled * 28': {
    kind: 'value',
    value: '-20914122121456090197604996448038969871500.00',
  },
  'numeric sampled / 28': {
    kind: 'value',
    value: '-0.000000984681170775901968',
  },
  'numeric sampled % 28': {
    kind: 'value',
    value: '-143505199405128083.05',
  },
  'numeric sampled to pg_catalog.float4 28': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'dbfeea9c',
  },
  'pg_catalog.float4 sampled to numeric 28': {
    kind: 'value',
    value: '0.00000000000000000000000000000000212249',
  },
  'numeric sampled to pg_catalog.float8 28': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c37fdd537f1f6d99',
  },
  'pg_catalog.float8 sampled to numeric 28': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000000000000000000000000000000148516887868229',
  },
  'numeric sampled + 29': {
    kind: 'value',
    value: '1587640080001064119.900011105409940402514745',
  },
  'numeric sampled - 29': {
    kind: 'value',
    value: '1587640080001064119.899988894590059597485255',
  },
  'numeric sampled * 29': {
    kind: 'value',
    value: '17631393926225.2612296682197299501979255',
  },
  'numeric sampled / 29': {
    kind: 'value',
    value: '142960961236116262183032.009526794985413972439614',
  },
  'numeric sampled % 29': {
    kind: 'value',
    value: '0.000000105798963731193160',
  },
  'numeric sampled to pg_catalog.float4 29': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '5db04372',
  },
  'pg_catalog.float4 sampled to numeric 29': {
    kind: 'value',
    value: '0.0000000000000000000000059638',
  },
  'numeric sampled to pg_catalog.float8 29': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '43b6086e3db7a2dd',
  },
  'pg_catalog.float8 sampled to numeric 29': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000000000000000000000247183018600782',
  },
  'numeric sampled + 30': {
    kind: 'value',
    value: '-19746941663233838461.00007755347762666439863',
  },
  'numeric sampled - 30': {
    kind: 'value',
    value: '-19746941663233838460.99992244652237333560137',
  },
  'numeric sampled * 30': {
    kind: 'value',
    value: '1531443998474652.55887900425722912970843',
  },
  'numeric sampled / 30': {
    kind: 'value',
    value: '254623548389330443979494.71969179457206130339654',
  },
  'numeric sampled % 30': {
    kind: 'value',
    value: '-0.00005581460148843830678',
  },
  'numeric sampled to pg_catalog.float4 30': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'df89059d',
  },
  'pg_catalog.float4 sampled to numeric 30': {
    kind: 'value',
    value: '0.000000000000010493',
  },
  'numeric sampled to pg_catalog.float8 30': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c3f120b3ad1a56a1',
  },
  'pg_catalog.float8 sampled to numeric 30': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000000000000642987059866579',
  },
  'numeric sampled + 31': {
    kind: 'value',
    value: '305876055613466828430.0018916934382660074693',
  },
  'numeric sampled - 31': {
    kind: 'value',
    value: '305876055613466828429.9981083065617339925307',
  },
  'numeric sampled * 31': {
    kind: 'value',
    value: '578623727326683579.2449072123701615921990',
  },
  'numeric sampled / 31': {
    kind: 'value',
    value: '161694304915411423856315.5900589807105237071206',
  },
  'numeric sampled % 31': {
    kind: 'value',
    value: '0.0011162107020000263705',
  },
  'numeric sampled to pg_catalog.float4 31': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '6184a710',
  },
  'pg_catalog.float4 sampled to numeric 31': {
    kind: 'value',
    value: '0.0000250196',
  },
  'numeric sampled to pg_catalog.float8 31': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '443094e20bfaca51',
  },
  'pg_catalog.float8 sampled to numeric 31': {
    kind: 'value',
    value: '0.000000000000000000000000000000000149163777348534',
  },
  'numeric sampled + 32': {
    kind: 'value',
    value: '-679997330365823840899.982369647156394399005',
  },
  'numeric sampled - 32': {
    kind: 'value',
    value: '-679997330365823840900.017630352843605600995',
  },
  'numeric sampled * 32': {
    kind: 'value',
    value: '-11988592867059319643.315381310743761695500',
  },
  'numeric sampled / 32': {
    kind: 'value',
    value: '-38569694911832343710998.064417776189355731129',
  },
  'numeric sampled % 32': {
    kind: 'value',
    value: '-0.001135708123618756990',
  },
  'numeric sampled to pg_catalog.float4 32': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'e213736f',
  },
  'pg_catalog.float4 sampled to numeric 32': {
    kind: 'value',
    value: '54163.4',
  },
  'numeric sampled to pg_catalog.float8 32': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c4426e6de897fe70',
  },
  'pg_catalog.float8 sampled to numeric 32': {
    kind: 'value',
    value: '0.000000000000000000000000248410684980358',
  },
  'numeric sampled + 33': {
    kind: 'value',
    value: '36617244241821336262999.77433821495872812399',
  },
  'numeric sampled - 33': {
    kind: 'value',
    value: '36617244241821336263000.22566178504127187601',
  },
  'numeric sampled * 33': {
    kind: 'value',
    value: '-8263112698901636756370.14610181905275063000',
  },
  'numeric sampled / 33': {
    kind: 'value',
    value: '-162266040017029522206356.11506392067573681814',
  },
  'numeric sampled % 33': {
    kind: 'value',
    value: '0.02596552973353408044',
  },
  'numeric sampled to pg_catalog.float4 33': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '64f820cb',
  },
  'pg_catalog.float4 sampled to numeric 33': {
    kind: 'value',
    value: '127230000000000',
  },
  'numeric sampled to pg_catalog.float8 33': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '449f041961fdd8da',
  },
  'pg_catalog.float8 sampled to numeric 33': {
    kind: 'value',
    value: '0.000000000000000543624658115497',
  },
  'numeric sampled + 34': {
    kind: 'value',
    value: '-310263790203671650129996.0142162718308377777',
  },
  'numeric sampled - 34': {
    kind: 'value',
    value: '-310263790203671650130003.9857837281691622223',
  },
  'numeric sampled * 34': {
    kind: 'value',
    value: '-1236644366433885181193137.1505954988838990000',
  },
  'numeric sampled / 34': {
    kind: 'value',
    value: '-77842605460730513073297.5662916103361885494',
  },
  'numeric sampled % 34': {
    kind: 'value',
    value: '-2.2571158858766920769',
  },
  'numeric sampled to pg_catalog.float4 34': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'e68366de',
  },
  'pg_catalog.float4 sampled to numeric 34': {
    kind: 'value',
    value: '231868000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 34': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c4d06cdbc2df8e83',
  },
  'pg_catalog.float8 sampled to numeric 34': {
    kind: 'value',
    value: '0.0000010856686201155',
  },
  'numeric sampled + 35': {
    kind: 'value',
    value: '2497245668367578827500038.811588383280513181',
  },
  'numeric sampled - 35': {
    kind: 'value',
    value: '2497245668367578827499961.188411616719486819',
  },
  'numeric sampled * 35': {
    kind: 'value',
    value: '96922070972612703321408021.546670275277500000',
  },
  'numeric sampled / 35': {
    kind: 'value',
    value: '64342784523690279196138.151775778951224737',
  },
  'numeric sampled % 35': {
    kind: 'value',
    value: '5.890659059206705022',
  },
  'numeric sampled to pg_catalog.float4 35': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '680433fd',
  },
  'pg_catalog.float4 sampled to numeric 35': {
    kind: 'value',
    value: '350996000000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 35': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4500867fabeaadaa',
  },
  'pg_catalog.float8 sampled to numeric 35': {
    kind: 'value',
    value: '2995.74668455124',
  },
  'numeric sampled + 36': {
    kind: 'value',
    value: '-15887391464072374049000293.31655802902389243',
  },
  'numeric sampled - 36': {
    kind: 'value',
    value: '-15887391464072374048999706.68344197097610757',
  },
  'numeric sampled * 36': {
    kind: 'value',
    value: '4660034980301403359787740136.13289954907000000',
  },
  'numeric sampled / 36': {
    kind: 'value',
    value: '54164659406988898324873.86076859204747566',
  },
  'numeric sampled % 36': {
    kind: 'value',
    value: '-252.47768067885458861',
  },
  'numeric sampled to pg_catalog.float4 36': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'e9524493',
  },
  'pg_catalog.float4 sampled to numeric 36': {
    kind: 'value',
    value: '0.00000000000000000000000000000000000000000706955',
  },
  'numeric sampled to pg_catalog.float8 36': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c52a48926f1dbc8a',
  },
  'pg_catalog.float8 sampled to numeric 36': {
    kind: 'value',
    value: '6983355700224',
  },
  'numeric sampled + 37': {
    kind: 'value',
    value: '22168268838648461750003228.3784180548258537',
  },
  'numeric sampled - 37': {
    kind: 'value',
    value: '22168268838648461749996771.6215819451741463',
  },
  'numeric sampled * 37': {
    kind: 'value',
    value: '71567560684330012466728520969.6355459750000000',
  },
  'numeric sampled / 37': {
    kind: 'value',
    value: '6866688463369596746233.6754723538101916',
  },
  'numeric sampled % 37': {
    kind: 'value',
    value: '2180.6803690335158879',
  },
  'numeric sampled to pg_catalog.float4 37': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '6992b282',
  },
  'pg_catalog.float4 sampled to numeric 37': {
    kind: 'value',
    value: '0.0000000000000000000000000000000143323',
  },
  'numeric sampled to pg_catalog.float8 37': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '45325650430264ae',
  },
  'pg_catalog.float8 sampled to numeric 37': {
    kind: 'value',
    value: '17636466005499300000000',
  },
  'numeric sampled + 38': {
    kind: 'value',
    value: '-2080211590123141943699964450.990956952237337',
  },
  'numeric sampled - 38': {
    kind: 'value',
    value: '-2080211590123141943700035549.009043047762663',
  },
  'numeric sampled * 38': {
    kind: 'value',
    value: '-73949460628740338885311642636258.108073100000000',
  },
  'numeric sampled / 38': {
    kind: 'value',
    value: '-58516725110512302869727.084086153137959',
  },
  'numeric sampled % 38': {
    kind: 'value',
    value: '-2989.179418296396999',
  },
  'numeric sampled to pg_catalog.float4 38': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'ecd716be',
  },
  'pg_catalog.float4 sampled to numeric 38': {
    kind: 'value',
    value: '0.0000000000000000000000278839',
  },
  'numeric sampled to pg_catalog.float8 38': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c59ae2d7c10c574f',
  },
  'pg_catalog.float8 sampled to numeric 38': {
    kind: 'value',
    value: '23050597900931700000000000000000',
  },
  'numeric sampled + 39': {
    kind: 'value',
    value: '13054088602612007178999588557.13459797404299',
  },
  'numeric sampled - 39': {
    kind: 'value',
    value: '13054088602612007179000411442.86540202595701',
  },
  'numeric sampled * 39': {
    kind: 'value',
    value: '-5371011619870613180486753606854465.37479000000000',
  },
  'numeric sampled / 39': {
    kind: 'value',
    value: '-31727585286614933377280.06600780788864',
  },
  'numeric sampled % 39': {
    kind: 'value',
    value: '27158.44161660926720',
  },
  'numeric sampled to pg_catalog.float4 39': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '6e28b85b',
  },
  'pg_catalog.float4 sampled to numeric 39': {
    kind: 'value',
    value: '0.0000000000000961629',
  },
  'numeric sampled to pg_catalog.float8 39': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '45c5170b6491bab2',
  },
  'pg_catalog.float8 sampled to numeric 39': {
    kind: 'value',
    value: '50749196487033200000000000000000000000000',
  },
  'numeric sampled + 40': {
    kind: 'value',
    value: '-100807014611504735929999702007.6756201102829',
  },
  'numeric sampled - 40': {
    kind: 'value',
    value: '-100807014611504735930000297992.3243798897171',
  },
  'numeric sampled * 40': {
    kind: 'value',
    value: '-30039716597879801659247101857757905.4030000000000',
  },
  'numeric sampled / 40': {
    kind: 'value',
    value: '-338287285826170725857251.1524752805535',
  },
  'numeric sampled % 40': {
    kind: 'value',
    value: '-45436.4632626263079',
  },
  'numeric sampled to pg_catalog.float4 40': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'efa2dcce',
  },
  'pg_catalog.float4 sampled to numeric 40': {
    kind: 'value',
    value: '0.000128796',
  },
  'numeric sampled to pg_catalog.float8 40': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c5f45b99bac2db6d',
  },
  'pg_catalog.float8 sampled to numeric 40': {
    kind: 'value',
    value: '108136022098857000000000000000000000000000000000000',
  },
  'numeric sampled + 41': {
    kind: 'value',
    value: '25123261.221384637529541742001734620407',
  },
  'numeric sampled - 41': {
    kind: 'value',
    value: '-25123261.221384637480458257998265379593',
  },
  'numeric sampled * 41': {
    kind: 'value',
    value: '0.000616568595137405978016239247012470564535',
  },
  'numeric sampled / 41': {
    kind: 'value',
    value: '0.000000000000000000976853354565487920',
  },
  'numeric sampled % 41': {
    kind: 'value',
    value: '0.000000000024541742001734620407',
  },
  'numeric sampled to pg_catalog.float4 41': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '2dd7df17',
  },
  'pg_catalog.float4 sampled to numeric 41': {
    kind: 'value',
    value: '488066',
  },
  'numeric sampled to pg_catalog.float8 41': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3dbafbe2e1d439cc',
  },
  'pg_catalog.float8 sampled to numeric 41': {
    kind: 'value',
    value: '274835309146858000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 42': {
    kind: 'value',
    value: '-303355305.60368259996418031980882983685',
  },
  'numeric sampled - 42': {
    kind: 'value',
    value: '303355305.60368259937581968019117016315',
  },
  'numeric sampled * 42': {
    kind: 'value',
    value: '0.0892411608181966570846783825802699638395',
  },
  'numeric sampled / 42': {
    kind: 'value',
    value: '0.000000000000000000969754984912512496',
  },
  'numeric sampled % 42': {
    kind: 'value',
    value: '-0.00000000029418031980882983685',
  },
  'numeric sampled to pg_catalog.float4 42': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'afa1ba33',
  },
  'pg_catalog.float4 sampled to numeric 42': {
    kind: 'value',
    value: '720628000000000',
  },
  'numeric sampled to pg_catalog.float8 42': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bdf4374660f09175',
  },
  'pg_catalog.float8 sampled to numeric 42': {
    kind: 'value',
    value: '795573789323336000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 43': {
    kind: 'value',
    value: '2045448742.3696231270598294601530402595',
  },
  'numeric sampled - 43': {
    kind: 'value',
    value: '-2045448742.3696231219401705398469597405',
  },
  'numeric sampled * 43': {
    kind: 'value',
    value: '5.23599994995074748951854353789068080775',
  },
  'numeric sampled / 43': {
    kind: 'value',
    value: '0.000000000000000001251475731035681895',
  },
  'numeric sampled % 43': {
    kind: 'value',
    value: '0.0000000025598294601530402595',
  },
  'numeric sampled to pg_catalog.float4 43': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '312fe8ff',
  },
  'pg_catalog.float4 sampled to numeric 43': {
    kind: 'value',
    value: '1966070000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 43': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3e25fd1fe0179208',
  },
  'pg_catalog.float8 sampled to numeric 43': {
    kind: 'value',
    value: '1031867122535280000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 44': {
    kind: 'value',
    value: '3584819163.318700810711137976046168879',
  },
  'numeric sampled - 44': {
    kind: 'value',
    value: '-3584819163.318700875288862023953831121',
  },
  'numeric sampled * 44': {
    kind: 'value',
    value: '-115.749731345223146376371343894342335003',
  },
  'numeric sampled / 44': {
    kind: 'value',
    value: '-0.000000000000000009007110415595392598',
  },
  'numeric sampled % 44': {
    kind: 'value',
    value: '-0.000000032288862023953831121',
  },
  'numeric sampled to pg_catalog.float4 44': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'b30aadfb',
  },
  'pg_catalog.float4 sampled to numeric 44': {
    kind: 'value',
    value: '4680040000000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 44': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'be6155bf55f56643',
  },
  'pg_catalog.float8 sampled to numeric 44': {
    kind: 'value',
    value:
      '2365162925398300000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 45': {
    kind: 'value',
    value: '-373220035423.26963845989509278204656753',
  },
  'numeric sampled - 45': {
    kind: 'value',
    value: '373220035423.26963884010490721795343247',
  },
  'numeric sampled * 45': {
    kind: 'value',
    value: '-70950.9602060219680785584626041040769655',
  },
  'numeric sampled / 45': {
    kind: 'value',
    value: '-0.000000000000000000509364152978430141',
  },
  'numeric sampled % 45': {
    kind: 'value',
    value: '0.00000019010490721795343247',
  },
  'numeric sampled to pg_catalog.float4 45': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '344c1fa4',
  },
  'pg_catalog.float4 sampled to numeric 45': {
    kind: 'value',
    value: '0.0000000000000000000000000000000000000000794284',
  },
  'numeric sampled to pg_catalog.float8 45': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3e8983f472a76f18',
  },
  'pg_catalog.float8 sampled to numeric 45': {
    kind: 'value',
    value:
      '5266381752920140000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 46': {
    kind: 'value',
    value: '1938797208343.4845436338050657620863267',
  },
  'numeric sampled - 46': {
    kind: 'value',
    value: '-1938797208343.4845489661949342379136733',
  },
  'numeric sampled * 46': {
    kind: 'value',
    value: '-5169211.29540000739487313226073201692379',
  },
  'numeric sampled / 46': {
    kind: 'value',
    value: '-0.000000000000000001375179891307931279',
  },
  'numeric sampled % 46': {
    kind: 'value',
    value: '-0.0000026661949342379136733',
  },
  'numeric sampled to pg_catalog.float4 46': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'b632ece1',
  },
  'pg_catalog.float4 sampled to numeric 46': {
    kind: 'value',
    value: '0.000000000000000000000000000000190516',
  },
  'numeric sampled to pg_catalog.float8 46': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bec65d9c2a82a5d5',
  },
  'pg_catalog.float8 sampled to numeric 46': {
    kind: 'value',
    value:
      '14003142977684600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 47': {
    kind: 'value',
    value: '5163761580298.121788381041400731874875',
  },
  'numeric sampled - 47': {
    kind: 'value',
    value: '-5163761580298.121741618958599268125125',
  },
  'numeric sampled * 47': {
    kind: 'value',
    value: '120734123.292459036690816561329494154375',
  },
  'numeric sampled / 47': {
    kind: 'value',
    value: '0.000000000000000004527908780672636462',
  },
  'numeric sampled % 47': {
    kind: 'value',
    value: '0.000023381041400731874875',
  },
  'numeric sampled to pg_catalog.float4 47': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '37c42267',
  },
  'pg_catalog.float4 sampled to numeric 47': {
    kind: 'value',
    value: '0.000000000000000000000222277',
  },
  'numeric sampled to pg_catalog.float8 47': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3ef8844cee3bdec6',
  },
  'pg_catalog.float8 sampled to numeric 47': {
    kind: 'value',
    value:
      '36272798219997600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 48': {
    kind: 'value',
    value: '-198747250001172.22743597310580029320489',
  },
  'numeric sampled - 48': {
    kind: 'value',
    value: '198747250001172.22702402689419970679511',
  },
  'numeric sampled * 48': {
    kind: 'value',
    value: '40936588352.0087709488408271367560271547',
  },
  'numeric sampled / 48': {
    kind: 'value',
    value: '0.000000000000000001036357010218145705',
  },
  'numeric sampled % 48': {
    kind: 'value',
    value: '-0.00020597310580029320489',
  },
  'numeric sampled to pg_catalog.float4 48': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'b957fa7c',
  },
  'pg_catalog.float4 sampled to numeric 48': {
    kind: 'value',
    value: '0.000000000000539731',
  },
  'numeric sampled to pg_catalog.float8 48': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bf2aff4f81ac516a',
  },
  'pg_catalog.float8 sampled to numeric 48': {
    kind: 'value',
    value:
      '68426147901277300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 49': {
    kind: 'value',
    value: '3896536666205458.0762396093203759794983',
  },
  'numeric sampled - 49': {
    kind: 'value',
    value: '-3896536666205458.0679603906796240205017',
  },
  'numeric sampled * 49': {
    kind: 'value',
    value: '16130139500610.86117100187466266984322743',
  },
  'numeric sampled / 49': {
    kind: 'value',
    value: '0.000000000000000001062381718688465846',
  },
  'numeric sampled % 49': {
    kind: 'value',
    value: '0.0041396093203759794983',
  },
  'numeric sampled to pg_catalog.float4 49': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3b87a58f',
  },
  'pg_catalog.float4 sampled to numeric 49': {
    kind: 'value',
    value: '0.00193479',
  },
  'numeric sampled to pg_catalog.float8 49': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3f70f4b1ea6340b2',
  },
  'pg_catalog.float8 sampled to numeric 49': {
    kind: 'value',
    value:
      '136735187734162000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 50': {
    kind: 'value',
    value: '33961025440084914.065877741618162056267',
  },
  'numeric sampled - 50': {
    kind: 'value',
    value: '-33961025440084914.124122258381837943733',
  },
  'numeric sampled * 50': {
    kind: 'value',
    value: '-989021757778324.531288551500948748616635',
  },
  'numeric sampled / 50': {
    kind: 'value',
    value: '-0.000000000000000000857519995478826984',
  },
  'numeric sampled % 50': {
    kind: 'value',
    value: '-0.029122258381837943733',
  },
  'numeric sampled to pg_catalog.float4 50': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'bcee91cd',
  },
  'pg_catalog.float4 sampled to numeric 50': {
    kind: 'value',
    value: '3983920',
  },
  'numeric sampled to pg_catalog.float8 50': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'bf9dd239ad57b62b',
  },
  'pg_catalog.float8 sampled to numeric 50': {
    kind: 'value',
    value:
      '275200163523417000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 51': {
    kind: 'value',
    value: '-219242075809539834.80521234516223439277',
  },
  'numeric sampled - 51': {
    kind: 'value',
    value: '219242075809539834.89478765483776560723',
  },
  'numeric sampled * 51': {
    kind: 'value',
    value: '-9819338417272910.7934237754699841659655',
  },
  'numeric sampled / 51': {
    kind: 'value',
    value: '-0.000000000000000000204284030209026015',
  },
  'numeric sampled % 51': {
    kind: 'value',
    value: '0.04478765483776560723',
  },
  'numeric sampled to pg_catalog.float4 51': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '3d377343',
  },
  'pg_catalog.float4 sampled to numeric 51': {
    kind: 'value',
    value: '8336700000000000',
  },
  'numeric sampled to pg_catalog.float8 51': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '3fa6ee685195e1f3',
  },
  'pg_catalog.float8 sampled to numeric 51': {
    kind: 'value',
    value:
      '532782811716731000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 52': {
    kind: 'value',
    value: '2595300844162043705.4027760218193213823',
  },
  'numeric sampled - 52': {
    kind: 'value',
    value: '-2595300844162043711.1972239781806786177',
  },
  'numeric sampled * 52': {
    kind: 'value',
    value: '-7519167836298829718.20963878942262601691',
  },
  'numeric sampled / 52': {
    kind: 'value',
    value: '-0.000000000000000001116334541599595622',
  },
  'numeric sampled % 52': {
    kind: 'value',
    value: '-2.8972239781806786177',
  },
  'numeric sampled to pg_catalog.float4 52': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c0396c1e',
  },
  'pg_catalog.float4 sampled to numeric 52': {
    kind: 'value',
    value: '15093100000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 52': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c0072d83c3dbc8c5',
  },
  'pg_catalog.float8 sampled to numeric 52': {
    kind: 'value',
    value:
      '1724646616639970000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 53': {
    kind: 'value',
    value: '1682734260046108248.280214722861501375',
  },
  'numeric sampled - 53': {
    kind: 'value',
    value: '-1682734260046108217.719785277138498625',
  },
  'numeric sampled * 53': {
    kind: 'value',
    value: '25712540815019997299.481336032128320375',
  },
  'numeric sampled / 53': {
    kind: 'value',
    value: '0.000000000000000009080586926686101677',
  },
  'numeric sampled % 53': {
    kind: 'value',
    value: '15.280214722861501375',
  },
  'numeric sampled to pg_catalog.float4 53': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '41747bc2',
  },
  'pg_catalog.float4 sampled to numeric 53': {
    kind: 'value',
    value: '33099400000000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 53': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '402e8f784ddd1880',
  },
  'pg_catalog.float8 sampled to numeric 53': {
    kind: 'value',
    value:
      '3123877516895860000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 54': {
    kind: 'value',
    value: '-379619674421391532392.17951743831351693',
  },
  'numeric sampled - 54': {
    kind: 'value',
    value: '379619674421391532067.82048256168648307',
  },
  'numeric sampled * 54': {
    kind: 'value',
    value: '61566535607750967756413.01822625274565390',
  },
  'numeric sampled / 54': {
    kind: 'value',
    value: '0.000000000000000000427215785603062297',
  },
  'numeric sampled % 54': {
    kind: 'value',
    value: '-162.17951743831351693',
  },
  'numeric sampled to pg_catalog.float4 54': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c3222df5',
  },
  'pg_catalog.float4 sampled to numeric 54': {
    kind: 'value',
    value: '0.000000000000000000000000000000000000000462719',
  },
  'numeric sampled to pg_catalog.float8 54': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c06445be9b5ad3c9',
  },
  'pg_catalog.float8 sampled to numeric 54': {
    kind: 'value',
    value:
      '7741573904297240000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 55': {
    kind: 'value',
    value: '3043896782352985776660.6259800463347563',
  },
  'numeric sampled - 55': {
    kind: 'value',
    value: '-3043896782352985773139.3740199536652437',
  },
  'numeric sampled * 55': {
    kind: 'value',
    value: '5359163755590110501472051.6384573581568700',
  },
  'numeric sampled / 55': {
    kind: 'value',
    value: '0.000000000000000000578411853599496857',
  },
  'numeric sampled % 55': {
    kind: 'value',
    value: '1760.6259800463347563',
  },
  'numeric sampled to pg_catalog.float4 55': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '44dc1408',
  },
  'pg_catalog.float4 sampled to numeric 55': {
    kind: 'value',
    value: '0.000000000000000000000000000000926209',
  },
  'numeric sampled to pg_catalog.float8 55': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '409b828100e9cbd3',
  },
  'pg_catalog.float8 sampled to numeric 55': {
    kind: 'value',
    value:
      '14287550293100700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 56': {
    kind: 'value',
    value: '34901228523514723411110.082856929443623',
  },
  'numeric sampled - 56': {
    kind: 'value',
    value: '-34901228523514723474889.917143070556377',
  },
  'numeric sampled * 56': {
    kind: 'value',
    value: '-1112997285806255261975297941.541295046011000',
  },
  'numeric sampled / 56': {
    kind: 'value',
    value: '-0.000000000000000000913719043488245858',
  },
  'numeric sampled % 56': {
    kind: 'value',
    value: '-31889.917143070556377',
  },
  'numeric sampled to pg_catalog.float4 56': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c6f923d6',
  },
  'pg_catalog.float4 sampled to numeric 56': {
    kind: 'value',
    value: '0.00000000000000000000311215',
  },
  'numeric sampled to pg_catalog.float8 56': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c0df247ab278d973',
  },
  'pg_catalog.float8 sampled to numeric 56': {
    kind: 'value',
    value:
      '20399754569635100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 57': {
    kind: 'value',
    value: '-227150305032483869672000.23436966763177',
  },
  'numeric sampled - 57': {
    kind: 'value',
    value: '227150305032483869867999.76563033236823',
  },
  'numeric sampled * 57': {
    kind: 'value',
    value: '-22260676656041926319043048761.39900540710000',
  },
  'numeric sampled / 57': {
    kind: 'value',
    value: '-0.000000000000000000431431362666749701',
  },
  'numeric sampled % 57': {
    kind: 'value',
    value: '97999.76563033236823',
  },
  'numeric sampled to pg_catalog.float4 57': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '47bf67e2',
  },
  'pg_catalog.float4 sampled to numeric 57': {
    kind: 'value',
    value: '0.00000000000543243',
  },
  'numeric sampled to pg_catalog.float8 57': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '40f7ecfc40059766',
  },
  'pg_catalog.float8 sampled to numeric 57': {
    kind: 'value',
    value:
      '73952823498716700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 58': {
    kind: 'value',
    value: '-3144912.286237483800176449222689',
  },
  'numeric sampled - 58': {
    kind: 'value',
    value: '-3144912.286299912648823550777311',
  },
  'numeric sampled * 58': {
    kind: 'value',
    value: '-98.1666265639393391047416503450605843195',
  },
  'numeric sampled / 58': {
    kind: 'value',
    value: '-100751891294.561305394945476896275039',
  },
  'numeric sampled % 58': {
    kind: 'value',
    value: '-0.000017520824772926369566',
  },
  'numeric sampled to pg_catalog.float4 58': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'ca3ff341',
  },
  'pg_catalog.float4 sampled to numeric 58': {
    kind: 'value',
    value: '0.0125089',
  },
  'numeric sampled to pg_catalog.float8 58': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c147fe6824a473e4',
  },
  'pg_catalog.float8 sampled to numeric 58': {
    kind: 'value',
    value:
      '144935719555332000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 59': {
    kind: 'value',
    value: '38552477.96377044992362836497581',
  },
  'numeric sampled - 59': {
    kind: 'value',
    value: '38552477.96375937920237163502419',
  },
  'numeric sampled * 59': {
    kind: 'value',
    value: '213.40186864653264059214627590621172103',
  },
  'numeric sampled / 59': {
    kind: 'value',
    value: '6964763554195.46918512876876571005369',
  },
  'numeric sampled % 59': {
    kind: 'value',
    value: '0.00000259710888920097705',
  },
  'numeric sampled to pg_catalog.float4 59': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4c1310e7',
  },
  'pg_catalog.float4 sampled to numeric 59': {
    kind: 'value',
    value: '29496500',
  },
  'numeric sampled to pg_catalog.float8 59': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '4182621cefb5ca61',
  },
  'pg_catalog.float8 sampled to numeric 59': {
    kind: 'value',
    value:
      '331951266933818000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 60': {
    kind: 'value',
    value: '-858153.0027870355901717410187',
  },
  'numeric sampled - 60': {
    kind: 'value',
    value: '-858152.9996909839498282589813',
  },
  'numeric sampled * 60': {
    kind: 'value',
    value: '1328.443003575859185825511300079052699',
  },
  'numeric sampled / 60': {
    kind: 'value',
    value: '554353157.4581905836806835989983',
  },
  'numeric sampled % 60': {
    kind: 'value',
    value: '-0.0007092908540972589641',
  },
  'numeric sampled to pg_catalog.float4 60': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'c9518290',
  },
  'pg_catalog.float4 sampled to numeric 60': {
    kind: 'value',
    value: '62056500000000000',
  },
  'numeric sampled to pg_catalog.float8 60': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c12a305200a26645',
  },
  'pg_catalog.float8 sampled to numeric 60': {
    kind: 'value',
    value:
      '638597120315139000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 61': {
    kind: 'value',
    value: '3689530064.276574832242949085689',
  },
  'numeric sampled - 61': {
    kind: 'value',
    value: '3689530064.210760281157050914311',
  },
  'numeric sampled * 61': {
    kind: 'value',
    value: '121412382.4480610103000817237183375660663',
  },
  'numeric sampled / 61': {
    kind: 'value',
    value: '112118976833.200913680254328505369',
  },
  'numeric sampled % 61': {
    kind: 'value',
    value: '0.006611521836477157063',
  },
  'numeric sampled to pg_catalog.float4 61': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '4f5be9c3',
  },
  'pg_catalog.float4 sampled to numeric 61': {
    kind: 'value',
    value: '120130000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 61': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '41eb7d385a07cc20',
  },
  'pg_catalog.float8 sampled to numeric 61': {
    kind: 'value',
    value:
      '926229430669118000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 62': {
    kind: 'value',
    value: '-39371199582.55486499618899776137',
  },
  'numeric sampled - 62': {
    kind: 'value',
    value: '-39371199582.87126606981100223863',
  },
  'numeric sampled * 62': {
    kind: 'value',
    value: '-6228544908.87831430065254368421289413979',
  },
  'numeric sampled / 62': {
    kind: 'value',
    value: '-248868937971.73860215270940662910',
  },
  'numeric sampled % 62': {
    kind: 'value',
    value: '-0.11684725704838998027',
  },
  'numeric sampled to pg_catalog.float4 62': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: 'd112ab4d',
  },
  'pg_catalog.float4 sampled to numeric 62': {
    kind: 'value',
    value: '276572000000000000000000000000000000',
  },
  'numeric sampled to pg_catalog.float8 62': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: 'c2225569a8bd6d17',
  },
  'pg_catalog.float8 sampled to numeric 62': {
    kind: 'value',
    value:
      '2205456121095110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric sampled + 63': {
    kind: 'value',
    value: '103619665232.5165846559077810299',
  },
  'numeric sampled - 63': {
    kind: 'value',
    value: '103619665233.0703522040922189701',
  },
  'numeric sampled * 63': {
    kind: 'value',
    value: '-28690603979.828142911323245224621463943',
  },
  'numeric sampled / 63': {
    kind: 'value',
    value: '-374235238494.9862759414153738711',
  },
  'numeric sampled % 63': {
    kind: 'value',
    value: '0.2730838049554449706',
  },
  'numeric sampled to pg_catalog.float4 63': {
    kind: 'float',
    type: 'pg_catalog.float4',
    value: '51c101b5',
  },
  'pg_catalog.float4 sampled to numeric 63': {
    kind: 'value',
    value: '0.00000000000000000000000000000000000000321193',
  },
  'numeric sampled to pg_catalog.float8 63': {
    kind: 'float',
    type: 'pg_catalog.float8',
    value: '423820369d50cb21',
  },
  'pg_catalog.float8 sampled to numeric 63': {
    kind: 'value',
    value:
      '5457351159267190000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  'numeric alternate literal +1.2300': {
    kind: 'value',
    value: '1.2300',
  },
  'numeric alternate literal .00100': {
    kind: 'value',
    value: '0.00100',
  },
  'numeric alternate literal 123.': {
    kind: 'value',
    value: '123',
  },
  'numeric alternate literal 0001.0000': {
    kind: 'value',
    value: '1.0000',
  },
  'numeric alternate literal 0e131072': {
    kind: 'value',
    value: '0',
  },
  'numeric alternate literal 1e1073741824': {
    kind: 'error',
    code: '22003',
  },
  'numeric alternate literal 1e-1073741824': {
    kind: 'error',
    code: '22003',
  },
}
