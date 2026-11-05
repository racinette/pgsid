import { oidAliasTypes } from '../../src/sql-semantics/expressions.js'

export const oidAliasInputForms = oidAliasTypes.map((type) => {
  const name = type.slice('pg_catalog.'.length)
  const signature = name === 'regprocedure' || name === 'regoperator'
  const single = name === 'regnamespace' || name === 'regrole'
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
      // Shapes the server rejects before any lookup; the lookups catch some of these errors and
      // not others, so each answer comes from the server.
      ...(signature
        ? [
            ...numericNames,
            'pgsid_runtime_object',
            'a.b.c.d',
            'foo(',
            'foo(integer',
            'foo..bar(integer)',
            ' (integer)',
            '"foo(integer)',
            'foo("integer)',
            'foo(integer[)',
            'foo(integer) x',
            'a.b.c.d()',
            ...(name === 'regoperator' ? ['foo()', 'foo( )'] : []),
          ]
        : [
            '"unterminated',
            'foo..bar',
            'foo.',
            '.foo',
            'a.b.c.d',
            'a.b.c.d.e',
            ...(name === 'regtype'
              ? [
                  ...numericNames,
                  'integer[',
                  'integer)',
                  'integer(1',
                  '""',
                  'public.""',
                  '"""a',
                  'x."""',
                ]
              : ['a b', '"a"b']),
            ...(single ? ['a.b', 'a.b.c'] : []),
          ]),
    ],
    platformDependent: ['18446744071562067968', '18446744073709551614', '18446744073709551615'],
    contextRequired: signature
      ? [
          'pgsid_runtime_object(integer,integer)',
          'a.b.c.d(integer)',
          ...(name === 'regprocedure' ? ['foo()'] : []),
        ]
      : [
          'pgsid_runtime_object',
          ...(name === 'regtype' ? ['""""', '"a"""'] : [...numericNames, 'foo(', 'foo[', 'a"b"']),
          // A third part names a database, which must be the current one.
          ...(single ? [] : ['a.b.c']),
        ],
    unimplementedGrammar: [] as string[],
  }
})
