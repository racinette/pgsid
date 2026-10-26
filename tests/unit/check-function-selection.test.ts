import { expect, it } from 'vitest'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { selectCheckFunctions } from '../sql-semantics/check-function-selection.js'

const available = builtinCallables().filter(
  (fn): fn is FunctionMetadata =>
    fn.kind === 'function' &&
    fn.schema === 'pg_catalog' &&
    ['make_interval', 'timestamp_pl_interval', 'date_add'].includes(fn.name),
)
it('keeps complete default coverage and selects catalog operations with their concrete overload identities', () => {
  expect(selectCheckFunctions(available, undefined)).toEqual({
    functions: available,
    scope: { kind: 'all-functions' },
  })
  const additions = available.filter((fn) => fn.name === 'date_add'),
    selection = selectCheckFunctions(available, ' date_add , timestamp_pl_interval '),
    expected = available.filter((fn) => ['date_add', 'timestamp_pl_interval'].includes(fn.name))
  expect(additions).toHaveLength(2)
  expect(selection).toEqual({
    functions: expected,
    scope: {
      kind: 'selected-functions',
      requested: ['date_add', 'timestamp_pl_interval'],
      identities: expected.map(callableIdentity),
    },
  })
  for (const addition of additions)
    expect(selectCheckFunctions(available, addition.rustName).functions).toEqual([addition])
  expect(
    selectCheckFunctions(available, 'timestamp_pl_interval').functions.map((fn) => fn.name),
  ).toEqual(['timestamp_pl_interval'])
  expect(selectCheckFunctions(available, 'make_interval').functions.map((fn) => fn.name)).toEqual([
    'make_interval',
  ])
})
it('rejects empty, duplicate, overlapping and out-of-owner selections before filtering the native corpus', () => {
  for (const invalid of [
    '',
    ' ',
    ',',
    'make_interval,',
    'make_interval,,date_add',
    'make_interval,make_interval',
    'no_such_function',
    'date_subtract',
    'timestamp_*',
    `date_add,${available.find((fn) => fn.name === 'date_add')!.rustName}`,
  ])
    expect(() => selectCheckFunctions(available, invalid), invalid).toThrow()
})
