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
                  // The lexer reads a comment as whitespace and rejects one left open; text that
                  // is only a comment is no longer the blank text the lookups catch.
                  'int4 /* unterminated',
                  'int4 /* /* nested */',
                  'int4 /*/',
                  '/* only */',
                  '-- only',
                  '1 /* c */',
                  // Two words are a type only in the grammar's multi-word spellings.
                  'int4 x',
                  'a b',
                  '"int4" x',
                  'pg_catalog.int4 x',
                  'decimal precision',
                  'double x',
                  'bit x',
                  'int4 with time zone',
                  'int4 ,',
                  'int4 */',
                  // SETOF is rejected before the type resolves.
                  'setof int4',
                  'setof nosuch',
                  'SETOF int4[]',
                  'setof double precision',
                  'setof int4 x',
                  'setof setof int4',
                  'setof',
                  'setof 1',
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
          ...(name === 'regtype'
            ? [
                '""""',
                '"a"""',
                'int4 /* c */',
                '/* c */ int4',
                'int4 -- c',
                'pg_catalog./* x */int4',
                'int4 /* /* nested */ */',
                'int4 --\n[]',
                '"a /* b */"',
                'int4$',
                'int4 array',
                'int4 []',
                'pg_catalog. int4',
                'double precision',
                'character varying(3)',
                'time with time zone',
                'interval year to month',
              ]
            : [...numericNames, 'foo(', 'foo[', 'a"b"']),
          // A third part names a database, which must be the current one.
          ...(single ? [] : ['a.b.c']),
        ],
    // A literal or parameter, the words of a multi-word spelling in another order, and other
    // punctuation after SETOF need the full grammar to tell a syntax error from a type.
    unimplementedGrammar:
      name === 'regtype'
        ? [
            "varchar('10')",
            "numeric(E'1')",
            '$$int4$$',
            'int4 $1',
            'time without zone',
            'interval year to day',
            'setof int4*',
          ]
        : [],
  }
})
