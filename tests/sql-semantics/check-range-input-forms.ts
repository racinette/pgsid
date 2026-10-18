import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'

export const rangeInputForms = Object.values(PG18_RANGE_TYPES).map((range) => ({
  type: range.identity,
  handled: ['empty', '(,)', '[,]'],
  rejected: ['', '[', 'empty junk'],
  deferred:
    range.subtype === 'pg_catalog.date' || range.subtype === 'pg_catalog."timestamp"'
      ? ['DateStyle-dependent bound input']
      : range.subtype === 'pg_catalog.timestamptz'
        ? ['Bound input requiring TimeZone']
        : [],
  boundType: range.subtype,
}))
