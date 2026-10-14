import { oidAliasTypes } from '../../src/sql-semantics/expressions.js'

export const oidAliasInputForms = oidAliasTypes.map((type) => {
  const name = type.slice('pg_catalog.'.length)
  const signature = name === 'regprocedure' || name === 'regoperator'
  const numericNames = ['+1', '-1', ' 1', '1 ', '0xFF']
  return {
    type,
    handled: [
      '0',
      '1',
      '012',
      '08',
      '4294967295',
      '4294967296',
      '18446744073709551616',
      '',
      '  ',
      ...(name === 'regoper' || name === 'regoperator' ? [] : ['-']),
      ...(signature ? [...numericNames, 'pgsid_runtime_object'] : []),
    ],
    platformDependent: ['18446744071562067968', '18446744073709551614', '18446744073709551615'],
    contextRequired: signature
      ? ['pgsid_runtime_object(integer,integer)']
      : ['pgsid_runtime_object', ...(name === 'regtype' ? [] : numericNames)],
    unimplementedGrammar: signature
      ? ['foo(']
      : ['"unterminated', 'foo..bar', ...(name === 'regtype' ? [...numericNames, 'integer['] : [])],
  }
})
