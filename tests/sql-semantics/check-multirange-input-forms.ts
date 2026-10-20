import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
export const multirangeInputForms = Object.values(PG18_RANGE_TYPES).map((range) => ({
  type: range.multirange,
  rangeType: range.identity,
  boundType: range.subtype,
  handled: ['{}', ' { EMPTY,empty,(,) } ', '{[,] , empty}'],
  rejected: [
    '',
    '{',
    '{,}',
    '{empty,}',
    '{empty,,empty}',
    '{empty} junk',
    '{emptyX}',
    '{"empty"}',
    '{{}}',
  ],
  deferred:
    range.subtype === 'pg_catalog.date' || range.subtype === 'pg_catalog."timestamp"'
      ? ['DateStyle-dependent member bounds']
      : range.subtype === 'pg_catalog.timestamptz'
        ? ['Member bounds requiring TimeZone']
        : [],
}))
