export const PG18_TYPE_IO = {
  'pg_catalog."any"': {
    identity: 'pg_catalog."any"',
    input: 'function:["pg_catalog","any_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","any_out"](pg_catalog."any")',
    send: null,
    receive: null,
  },
  'pg_catalog."bit"': {
    identity: 'pg_catalog."bit"',
    input: 'function:["pg_catalog","bit_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","bit_out"](pg_catalog."bit")',
    send: 'function:["pg_catalog","bit_send"](pg_catalog."bit")',
    receive:
      'function:["pg_catalog","bit_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog."char"': {
    identity: 'pg_catalog."char"',
    input: 'function:["pg_catalog","charin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","charout"](pg_catalog."char")',
    send: 'function:["pg_catalog","charsend"](pg_catalog."char")',
    receive: 'function:["pg_catalog","charrecv"](pg_catalog.internal)',
  },
  'pg_catalog."interval"': {
    identity: 'pg_catalog."interval"',
    input:
      'function:["pg_catalog","interval_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","interval_out"](pg_catalog."interval")',
    send: 'function:["pg_catalog","interval_send"](pg_catalog."interval")',
    receive:
      'function:["pg_catalog","interval_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog."json"': {
    identity: 'pg_catalog."json"',
    input: 'function:["pg_catalog","json_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","json_out"](pg_catalog."json")',
    send: 'function:["pg_catalog","json_send"](pg_catalog."json")',
    receive: 'function:["pg_catalog","json_recv"](pg_catalog.internal)',
  },
  'pg_catalog."numeric"': {
    identity: 'pg_catalog."numeric"',
    input:
      'function:["pg_catalog","numeric_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","numeric_out"](pg_catalog."numeric")',
    send: 'function:["pg_catalog","numeric_send"](pg_catalog."numeric")',
    receive:
      'function:["pg_catalog","numeric_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog."time"': {
    identity: 'pg_catalog."time"',
    input: 'function:["pg_catalog","time_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","time_out"](pg_catalog."time")',
    send: 'function:["pg_catalog","time_send"](pg_catalog."time")',
    receive:
      'function:["pg_catalog","time_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog."timestamp"': {
    identity: 'pg_catalog."timestamp"',
    input:
      'function:["pg_catalog","timestamp_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","timestamp_out"](pg_catalog."timestamp")',
    send: 'function:["pg_catalog","timestamp_send"](pg_catalog."timestamp")',
    receive:
      'function:["pg_catalog","timestamp_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog."varchar"': {
    identity: 'pg_catalog."varchar"',
    input: 'function:["pg_catalog","varcharin"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","varcharout"](pg_catalog."varchar")',
    send: 'function:["pg_catalog","varcharsend"](pg_catalog."varchar")',
    receive:
      'function:["pg_catalog","varcharrecv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._aclitem': {
    identity: 'pg_catalog._aclitem',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._bit': {
    identity: 'pg_catalog._bit',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._bool': {
    identity: 'pg_catalog._bool',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._box': {
    identity: 'pg_catalog._box',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._bpchar': {
    identity: 'pg_catalog._bpchar',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._bytea': {
    identity: 'pg_catalog._bytea',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._char': {
    identity: 'pg_catalog._char',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._cid': {
    identity: 'pg_catalog._cid',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._cidr': {
    identity: 'pg_catalog._cidr',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._circle': {
    identity: 'pg_catalog._circle',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._cstring': {
    identity: 'pg_catalog._cstring',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._date': {
    identity: 'pg_catalog._date',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._datemultirange': {
    identity: 'pg_catalog._datemultirange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._daterange': {
    identity: 'pg_catalog._daterange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._float4': {
    identity: 'pg_catalog._float4',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._float8': {
    identity: 'pg_catalog._float8',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._gtsvector': {
    identity: 'pg_catalog._gtsvector',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._inet': {
    identity: 'pg_catalog._inet',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int2': {
    identity: 'pg_catalog._int2',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int2vector': {
    identity: 'pg_catalog._int2vector',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int4': {
    identity: 'pg_catalog._int4',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int4multirange': {
    identity: 'pg_catalog._int4multirange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int4range': {
    identity: 'pg_catalog._int4range',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int8': {
    identity: 'pg_catalog._int8',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int8multirange': {
    identity: 'pg_catalog._int8multirange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._int8range': {
    identity: 'pg_catalog._int8range',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._interval': {
    identity: 'pg_catalog._interval',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._json': {
    identity: 'pg_catalog._json',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._jsonb': {
    identity: 'pg_catalog._jsonb',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._jsonpath': {
    identity: 'pg_catalog._jsonpath',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._line': {
    identity: 'pg_catalog._line',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._lseg': {
    identity: 'pg_catalog._lseg',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._macaddr': {
    identity: 'pg_catalog._macaddr',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._macaddr8': {
    identity: 'pg_catalog._macaddr8',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._money': {
    identity: 'pg_catalog._money',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._name': {
    identity: 'pg_catalog._name',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._numeric': {
    identity: 'pg_catalog._numeric',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._nummultirange': {
    identity: 'pg_catalog._nummultirange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._numrange': {
    identity: 'pg_catalog._numrange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._oid': {
    identity: 'pg_catalog._oid',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._oidvector': {
    identity: 'pg_catalog._oidvector',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._path': {
    identity: 'pg_catalog._path',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_aggregate': {
    identity: 'pg_catalog._pg_aggregate',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_aios': {
    identity: 'pg_catalog._pg_aios',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_am': {
    identity: 'pg_catalog._pg_am',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_amop': {
    identity: 'pg_catalog._pg_amop',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_amproc': {
    identity: 'pg_catalog._pg_amproc',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_attrdef': {
    identity: 'pg_catalog._pg_attrdef',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_attribute': {
    identity: 'pg_catalog._pg_attribute',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_auth_members': {
    identity: 'pg_catalog._pg_auth_members',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_authid': {
    identity: 'pg_catalog._pg_authid',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_available_extension_versions': {
    identity: 'pg_catalog._pg_available_extension_versions',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_available_extensions': {
    identity: 'pg_catalog._pg_available_extensions',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_backend_memory_contexts': {
    identity: 'pg_catalog._pg_backend_memory_contexts',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_cast': {
    identity: 'pg_catalog._pg_cast',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_class': {
    identity: 'pg_catalog._pg_class',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_collation': {
    identity: 'pg_catalog._pg_collation',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_config': {
    identity: 'pg_catalog._pg_config',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_constraint': {
    identity: 'pg_catalog._pg_constraint',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_conversion': {
    identity: 'pg_catalog._pg_conversion',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_cursors': {
    identity: 'pg_catalog._pg_cursors',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_database': {
    identity: 'pg_catalog._pg_database',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_db_role_setting': {
    identity: 'pg_catalog._pg_db_role_setting',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_default_acl': {
    identity: 'pg_catalog._pg_default_acl',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_depend': {
    identity: 'pg_catalog._pg_depend',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_description': {
    identity: 'pg_catalog._pg_description',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_enum': {
    identity: 'pg_catalog._pg_enum',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_event_trigger': {
    identity: 'pg_catalog._pg_event_trigger',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_extension': {
    identity: 'pg_catalog._pg_extension',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_file_settings': {
    identity: 'pg_catalog._pg_file_settings',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_foreign_data_wrapper': {
    identity: 'pg_catalog._pg_foreign_data_wrapper',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_foreign_server': {
    identity: 'pg_catalog._pg_foreign_server',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_foreign_table': {
    identity: 'pg_catalog._pg_foreign_table',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_group': {
    identity: 'pg_catalog._pg_group',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_hba_file_rules': {
    identity: 'pg_catalog._pg_hba_file_rules',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_ident_file_mappings': {
    identity: 'pg_catalog._pg_ident_file_mappings',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_index': {
    identity: 'pg_catalog._pg_index',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_indexes': {
    identity: 'pg_catalog._pg_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_inherits': {
    identity: 'pg_catalog._pg_inherits',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_init_privs': {
    identity: 'pg_catalog._pg_init_privs',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_language': {
    identity: 'pg_catalog._pg_language',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_largeobject': {
    identity: 'pg_catalog._pg_largeobject',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_largeobject_metadata': {
    identity: 'pg_catalog._pg_largeobject_metadata',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_locks': {
    identity: 'pg_catalog._pg_locks',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_lsn': {
    identity: 'pg_catalog._pg_lsn',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_matviews': {
    identity: 'pg_catalog._pg_matviews',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_namespace': {
    identity: 'pg_catalog._pg_namespace',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_opclass': {
    identity: 'pg_catalog._pg_opclass',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_operator': {
    identity: 'pg_catalog._pg_operator',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_opfamily': {
    identity: 'pg_catalog._pg_opfamily',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_parameter_acl': {
    identity: 'pg_catalog._pg_parameter_acl',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_partitioned_table': {
    identity: 'pg_catalog._pg_partitioned_table',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_policies': {
    identity: 'pg_catalog._pg_policies',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_policy': {
    identity: 'pg_catalog._pg_policy',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_prepared_statements': {
    identity: 'pg_catalog._pg_prepared_statements',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_prepared_xacts': {
    identity: 'pg_catalog._pg_prepared_xacts',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_proc': {
    identity: 'pg_catalog._pg_proc',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_publication': {
    identity: 'pg_catalog._pg_publication',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_publication_namespace': {
    identity: 'pg_catalog._pg_publication_namespace',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_publication_rel': {
    identity: 'pg_catalog._pg_publication_rel',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_publication_tables': {
    identity: 'pg_catalog._pg_publication_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_range': {
    identity: 'pg_catalog._pg_range',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_replication_origin': {
    identity: 'pg_catalog._pg_replication_origin',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_replication_origin_status': {
    identity: 'pg_catalog._pg_replication_origin_status',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_replication_slots': {
    identity: 'pg_catalog._pg_replication_slots',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_rewrite': {
    identity: 'pg_catalog._pg_rewrite',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_roles': {
    identity: 'pg_catalog._pg_roles',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_rules': {
    identity: 'pg_catalog._pg_rules',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_seclabel': {
    identity: 'pg_catalog._pg_seclabel',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_seclabels': {
    identity: 'pg_catalog._pg_seclabels',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_sequence': {
    identity: 'pg_catalog._pg_sequence',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_sequences': {
    identity: 'pg_catalog._pg_sequences',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_settings': {
    identity: 'pg_catalog._pg_settings',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_shadow': {
    identity: 'pg_catalog._pg_shadow',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_shdepend': {
    identity: 'pg_catalog._pg_shdepend',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_shdescription': {
    identity: 'pg_catalog._pg_shdescription',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_shmem_allocations': {
    identity: 'pg_catalog._pg_shmem_allocations',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_shmem_allocations_numa': {
    identity: 'pg_catalog._pg_shmem_allocations_numa',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_shseclabel': {
    identity: 'pg_catalog._pg_shseclabel',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_snapshot': {
    identity: 'pg_catalog._pg_snapshot',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_activity': {
    identity: 'pg_catalog._pg_stat_activity',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_all_indexes': {
    identity: 'pg_catalog._pg_stat_all_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_all_tables': {
    identity: 'pg_catalog._pg_stat_all_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_archiver': {
    identity: 'pg_catalog._pg_stat_archiver',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_bgwriter': {
    identity: 'pg_catalog._pg_stat_bgwriter',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_checkpointer': {
    identity: 'pg_catalog._pg_stat_checkpointer',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_database': {
    identity: 'pg_catalog._pg_stat_database',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_database_conflicts': {
    identity: 'pg_catalog._pg_stat_database_conflicts',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_gssapi': {
    identity: 'pg_catalog._pg_stat_gssapi',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_io': {
    identity: 'pg_catalog._pg_stat_io',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_progress_analyze': {
    identity: 'pg_catalog._pg_stat_progress_analyze',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_progress_basebackup': {
    identity: 'pg_catalog._pg_stat_progress_basebackup',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_progress_cluster': {
    identity: 'pg_catalog._pg_stat_progress_cluster',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_progress_copy': {
    identity: 'pg_catalog._pg_stat_progress_copy',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_progress_create_index': {
    identity: 'pg_catalog._pg_stat_progress_create_index',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_progress_vacuum': {
    identity: 'pg_catalog._pg_stat_progress_vacuum',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_recovery_prefetch': {
    identity: 'pg_catalog._pg_stat_recovery_prefetch',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_replication': {
    identity: 'pg_catalog._pg_stat_replication',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_replication_slots': {
    identity: 'pg_catalog._pg_stat_replication_slots',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_slru': {
    identity: 'pg_catalog._pg_stat_slru',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_ssl': {
    identity: 'pg_catalog._pg_stat_ssl',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_subscription': {
    identity: 'pg_catalog._pg_stat_subscription',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_subscription_stats': {
    identity: 'pg_catalog._pg_stat_subscription_stats',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_sys_indexes': {
    identity: 'pg_catalog._pg_stat_sys_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_sys_tables': {
    identity: 'pg_catalog._pg_stat_sys_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_user_functions': {
    identity: 'pg_catalog._pg_stat_user_functions',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_user_indexes': {
    identity: 'pg_catalog._pg_stat_user_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_user_tables': {
    identity: 'pg_catalog._pg_stat_user_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_wal': {
    identity: 'pg_catalog._pg_stat_wal',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_wal_receiver': {
    identity: 'pg_catalog._pg_stat_wal_receiver',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_xact_all_tables': {
    identity: 'pg_catalog._pg_stat_xact_all_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_xact_sys_tables': {
    identity: 'pg_catalog._pg_stat_xact_sys_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_xact_user_functions': {
    identity: 'pg_catalog._pg_stat_xact_user_functions',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stat_xact_user_tables': {
    identity: 'pg_catalog._pg_stat_xact_user_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_all_indexes': {
    identity: 'pg_catalog._pg_statio_all_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_all_sequences': {
    identity: 'pg_catalog._pg_statio_all_sequences',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_all_tables': {
    identity: 'pg_catalog._pg_statio_all_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_sys_indexes': {
    identity: 'pg_catalog._pg_statio_sys_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_sys_sequences': {
    identity: 'pg_catalog._pg_statio_sys_sequences',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_sys_tables': {
    identity: 'pg_catalog._pg_statio_sys_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_user_indexes': {
    identity: 'pg_catalog._pg_statio_user_indexes',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_user_sequences': {
    identity: 'pg_catalog._pg_statio_user_sequences',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statio_user_tables': {
    identity: 'pg_catalog._pg_statio_user_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statistic': {
    identity: 'pg_catalog._pg_statistic',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statistic_ext': {
    identity: 'pg_catalog._pg_statistic_ext',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_statistic_ext_data': {
    identity: 'pg_catalog._pg_statistic_ext_data',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stats': {
    identity: 'pg_catalog._pg_stats',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stats_ext': {
    identity: 'pg_catalog._pg_stats_ext',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_stats_ext_exprs': {
    identity: 'pg_catalog._pg_stats_ext_exprs',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_subscription': {
    identity: 'pg_catalog._pg_subscription',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_subscription_rel': {
    identity: 'pg_catalog._pg_subscription_rel',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_tables': {
    identity: 'pg_catalog._pg_tables',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_tablespace': {
    identity: 'pg_catalog._pg_tablespace',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_timezone_abbrevs': {
    identity: 'pg_catalog._pg_timezone_abbrevs',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_timezone_names': {
    identity: 'pg_catalog._pg_timezone_names',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_transform': {
    identity: 'pg_catalog._pg_transform',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_trigger': {
    identity: 'pg_catalog._pg_trigger',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_ts_config': {
    identity: 'pg_catalog._pg_ts_config',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_ts_config_map': {
    identity: 'pg_catalog._pg_ts_config_map',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_ts_dict': {
    identity: 'pg_catalog._pg_ts_dict',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_ts_parser': {
    identity: 'pg_catalog._pg_ts_parser',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_ts_template': {
    identity: 'pg_catalog._pg_ts_template',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_type': {
    identity: 'pg_catalog._pg_type',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_user': {
    identity: 'pg_catalog._pg_user',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_user_mapping': {
    identity: 'pg_catalog._pg_user_mapping',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_user_mappings': {
    identity: 'pg_catalog._pg_user_mappings',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_views': {
    identity: 'pg_catalog._pg_views',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._pg_wait_events': {
    identity: 'pg_catalog._pg_wait_events',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._point': {
    identity: 'pg_catalog._point',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._polygon': {
    identity: 'pg_catalog._polygon',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._record': {
    identity: 'pg_catalog._record',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._refcursor': {
    identity: 'pg_catalog._refcursor',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regclass': {
    identity: 'pg_catalog._regclass',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regcollation': {
    identity: 'pg_catalog._regcollation',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regconfig': {
    identity: 'pg_catalog._regconfig',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regdictionary': {
    identity: 'pg_catalog._regdictionary',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regnamespace': {
    identity: 'pg_catalog._regnamespace',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regoper': {
    identity: 'pg_catalog._regoper',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regoperator': {
    identity: 'pg_catalog._regoperator',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regproc': {
    identity: 'pg_catalog._regproc',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regprocedure': {
    identity: 'pg_catalog._regprocedure',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regrole': {
    identity: 'pg_catalog._regrole',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._regtype': {
    identity: 'pg_catalog._regtype',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._text': {
    identity: 'pg_catalog._text',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tid': {
    identity: 'pg_catalog._tid',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._time': {
    identity: 'pg_catalog._time',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._timestamp': {
    identity: 'pg_catalog._timestamp',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._timestamptz': {
    identity: 'pg_catalog._timestamptz',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._timetz': {
    identity: 'pg_catalog._timetz',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tsmultirange': {
    identity: 'pg_catalog._tsmultirange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tsquery': {
    identity: 'pg_catalog._tsquery',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tsrange': {
    identity: 'pg_catalog._tsrange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tstzmultirange': {
    identity: 'pg_catalog._tstzmultirange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tstzrange': {
    identity: 'pg_catalog._tstzrange',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._tsvector': {
    identity: 'pg_catalog._tsvector',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._txid_snapshot': {
    identity: 'pg_catalog._txid_snapshot',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._uuid': {
    identity: 'pg_catalog._uuid',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._varbit': {
    identity: 'pg_catalog._varbit',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._varchar': {
    identity: 'pg_catalog._varchar',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._xid': {
    identity: 'pg_catalog._xid',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._xid8': {
    identity: 'pg_catalog._xid8',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog._xml': {
    identity: 'pg_catalog._xml',
    input: 'function:["pg_catalog","array_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","array_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","array_send"](pg_catalog.anyarray)',
    receive:
      'function:["pg_catalog","array_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.aclitem': {
    identity: 'pg_catalog.aclitem',
    input: 'function:["pg_catalog","aclitemin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","aclitemout"](pg_catalog.aclitem)',
    send: null,
    receive: null,
  },
  'pg_catalog.anyarray': {
    identity: 'pg_catalog.anyarray',
    input: 'function:["pg_catalog","anyarray_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anyarray_out"](pg_catalog.anyarray)',
    send: 'function:["pg_catalog","anyarray_send"](pg_catalog.anyarray)',
    receive: 'function:["pg_catalog","anyarray_recv"](pg_catalog.internal)',
  },
  'pg_catalog.anycompatible': {
    identity: 'pg_catalog.anycompatible',
    input: 'function:["pg_catalog","anycompatible_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anycompatible_out"](pg_catalog.anycompatible)',
    send: null,
    receive: null,
  },
  'pg_catalog.anycompatiblearray': {
    identity: 'pg_catalog.anycompatiblearray',
    input: 'function:["pg_catalog","anycompatiblearray_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anycompatiblearray_out"](pg_catalog.anycompatiblearray)',
    send: 'function:["pg_catalog","anycompatiblearray_send"](pg_catalog.anycompatiblearray)',
    receive: 'function:["pg_catalog","anycompatiblearray_recv"](pg_catalog.internal)',
  },
  'pg_catalog.anycompatiblemultirange': {
    identity: 'pg_catalog.anycompatiblemultirange',
    input:
      'function:["pg_catalog","anycompatiblemultirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output:
      'function:["pg_catalog","anycompatiblemultirange_out"](pg_catalog.anycompatiblemultirange)',
    send: null,
    receive: null,
  },
  'pg_catalog.anycompatiblenonarray': {
    identity: 'pg_catalog.anycompatiblenonarray',
    input: 'function:["pg_catalog","anycompatiblenonarray_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anycompatiblenonarray_out"](pg_catalog.anycompatiblenonarray)',
    send: null,
    receive: null,
  },
  'pg_catalog.anycompatiblerange': {
    identity: 'pg_catalog.anycompatiblerange',
    input:
      'function:["pg_catalog","anycompatiblerange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","anycompatiblerange_out"](pg_catalog.anycompatiblerange)',
    send: null,
    receive: null,
  },
  'pg_catalog.anyelement': {
    identity: 'pg_catalog.anyelement',
    input: 'function:["pg_catalog","anyelement_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anyelement_out"](pg_catalog.anyelement)',
    send: null,
    receive: null,
  },
  'pg_catalog.anyenum': {
    identity: 'pg_catalog.anyenum',
    input: 'function:["pg_catalog","anyenum_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anyenum_out"](pg_catalog.anyenum)',
    send: null,
    receive: null,
  },
  'pg_catalog.anymultirange': {
    identity: 'pg_catalog.anymultirange',
    input:
      'function:["pg_catalog","anymultirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","anymultirange_out"](pg_catalog.anymultirange)',
    send: null,
    receive: null,
  },
  'pg_catalog.anynonarray': {
    identity: 'pg_catalog.anynonarray',
    input: 'function:["pg_catalog","anynonarray_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","anynonarray_out"](pg_catalog.anynonarray)',
    send: null,
    receive: null,
  },
  'pg_catalog.anyrange': {
    identity: 'pg_catalog.anyrange',
    input:
      'function:["pg_catalog","anyrange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","anyrange_out"](pg_catalog.anyrange)',
    send: null,
    receive: null,
  },
  'pg_catalog.bool': {
    identity: 'pg_catalog.bool',
    input: 'function:["pg_catalog","boolin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","boolout"](pg_catalog.bool)',
    send: 'function:["pg_catalog","boolsend"](pg_catalog.bool)',
    receive: 'function:["pg_catalog","boolrecv"](pg_catalog.internal)',
  },
  'pg_catalog.box': {
    identity: 'pg_catalog.box',
    input: 'function:["pg_catalog","box_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","box_out"](pg_catalog.box)',
    send: 'function:["pg_catalog","box_send"](pg_catalog.box)',
    receive: 'function:["pg_catalog","box_recv"](pg_catalog.internal)',
  },
  'pg_catalog.bpchar': {
    identity: 'pg_catalog.bpchar',
    input: 'function:["pg_catalog","bpcharin"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","bpcharout"](pg_catalog.bpchar)',
    send: 'function:["pg_catalog","bpcharsend"](pg_catalog.bpchar)',
    receive:
      'function:["pg_catalog","bpcharrecv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.bytea': {
    identity: 'pg_catalog.bytea',
    input: 'function:["pg_catalog","byteain"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","byteaout"](pg_catalog.bytea)',
    send: 'function:["pg_catalog","byteasend"](pg_catalog.bytea)',
    receive: 'function:["pg_catalog","bytearecv"](pg_catalog.internal)',
  },
  'pg_catalog.cid': {
    identity: 'pg_catalog.cid',
    input: 'function:["pg_catalog","cidin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","cidout"](pg_catalog.cid)',
    send: 'function:["pg_catalog","cidsend"](pg_catalog.cid)',
    receive: 'function:["pg_catalog","cidrecv"](pg_catalog.internal)',
  },
  'pg_catalog.cidr': {
    identity: 'pg_catalog.cidr',
    input: 'function:["pg_catalog","cidr_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","cidr_out"](pg_catalog.cidr)',
    send: 'function:["pg_catalog","cidr_send"](pg_catalog.cidr)',
    receive: 'function:["pg_catalog","cidr_recv"](pg_catalog.internal)',
  },
  'pg_catalog.circle': {
    identity: 'pg_catalog.circle',
    input: 'function:["pg_catalog","circle_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","circle_out"](pg_catalog.circle)',
    send: 'function:["pg_catalog","circle_send"](pg_catalog.circle)',
    receive: 'function:["pg_catalog","circle_recv"](pg_catalog.internal)',
  },
  'pg_catalog.cstring': {
    identity: 'pg_catalog.cstring',
    input: 'function:["pg_catalog","cstring_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","cstring_out"](pg_catalog.cstring)',
    send: 'function:["pg_catalog","cstring_send"](pg_catalog.cstring)',
    receive: 'function:["pg_catalog","cstring_recv"](pg_catalog.internal)',
  },
  'pg_catalog.date': {
    identity: 'pg_catalog.date',
    input: 'function:["pg_catalog","date_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","date_out"](pg_catalog.date)',
    send: 'function:["pg_catalog","date_send"](pg_catalog.date)',
    receive: 'function:["pg_catalog","date_recv"](pg_catalog.internal)',
  },
  'pg_catalog.datemultirange': {
    identity: 'pg_catalog.datemultirange',
    input:
      'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    send: 'function:["pg_catalog","multirange_send"](pg_catalog.anymultirange)',
    receive:
      'function:["pg_catalog","multirange_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.daterange': {
    identity: 'pg_catalog.daterange',
    input: 'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    send: 'function:["pg_catalog","range_send"](pg_catalog.anyrange)',
    receive:
      'function:["pg_catalog","range_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.event_trigger': {
    identity: 'pg_catalog.event_trigger',
    input: 'function:["pg_catalog","event_trigger_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","event_trigger_out"](pg_catalog.event_trigger)',
    send: null,
    receive: null,
  },
  'pg_catalog.fdw_handler': {
    identity: 'pg_catalog.fdw_handler',
    input: 'function:["pg_catalog","fdw_handler_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","fdw_handler_out"](pg_catalog.fdw_handler)',
    send: null,
    receive: null,
  },
  'pg_catalog.float4': {
    identity: 'pg_catalog.float4',
    input: 'function:["pg_catalog","float4in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","float4out"](pg_catalog.float4)',
    send: 'function:["pg_catalog","float4send"](pg_catalog.float4)',
    receive: 'function:["pg_catalog","float4recv"](pg_catalog.internal)',
  },
  'pg_catalog.float8': {
    identity: 'pg_catalog.float8',
    input: 'function:["pg_catalog","float8in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","float8out"](pg_catalog.float8)',
    send: 'function:["pg_catalog","float8send"](pg_catalog.float8)',
    receive: 'function:["pg_catalog","float8recv"](pg_catalog.internal)',
  },
  'pg_catalog.gtsvector': {
    identity: 'pg_catalog.gtsvector',
    input: 'function:["pg_catalog","gtsvectorin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","gtsvectorout"](pg_catalog.gtsvector)',
    send: null,
    receive: null,
  },
  'pg_catalog.index_am_handler': {
    identity: 'pg_catalog.index_am_handler',
    input: 'function:["pg_catalog","index_am_handler_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","index_am_handler_out"](pg_catalog.index_am_handler)',
    send: null,
    receive: null,
  },
  'pg_catalog.inet': {
    identity: 'pg_catalog.inet',
    input: 'function:["pg_catalog","inet_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","inet_out"](pg_catalog.inet)',
    send: 'function:["pg_catalog","inet_send"](pg_catalog.inet)',
    receive: 'function:["pg_catalog","inet_recv"](pg_catalog.internal)',
  },
  'pg_catalog.int2': {
    identity: 'pg_catalog.int2',
    input: 'function:["pg_catalog","int2in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","int2out"](pg_catalog.int2)',
    send: 'function:["pg_catalog","int2send"](pg_catalog.int2)',
    receive: 'function:["pg_catalog","int2recv"](pg_catalog.internal)',
  },
  'pg_catalog.int2vector': {
    identity: 'pg_catalog.int2vector',
    input: 'function:["pg_catalog","int2vectorin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","int2vectorout"](pg_catalog.int2vector)',
    send: 'function:["pg_catalog","int2vectorsend"](pg_catalog.int2vector)',
    receive: 'function:["pg_catalog","int2vectorrecv"](pg_catalog.internal)',
  },
  'pg_catalog.int4': {
    identity: 'pg_catalog.int4',
    input: 'function:["pg_catalog","int4in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","int4out"](pg_catalog.int4)',
    send: 'function:["pg_catalog","int4send"](pg_catalog.int4)',
    receive: 'function:["pg_catalog","int4recv"](pg_catalog.internal)',
  },
  'pg_catalog.int4multirange': {
    identity: 'pg_catalog.int4multirange',
    input:
      'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    send: 'function:["pg_catalog","multirange_send"](pg_catalog.anymultirange)',
    receive:
      'function:["pg_catalog","multirange_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.int4range': {
    identity: 'pg_catalog.int4range',
    input: 'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    send: 'function:["pg_catalog","range_send"](pg_catalog.anyrange)',
    receive:
      'function:["pg_catalog","range_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.int8': {
    identity: 'pg_catalog.int8',
    input: 'function:["pg_catalog","int8in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","int8out"](pg_catalog.int8)',
    send: 'function:["pg_catalog","int8send"](pg_catalog.int8)',
    receive: 'function:["pg_catalog","int8recv"](pg_catalog.internal)',
  },
  'pg_catalog.int8multirange': {
    identity: 'pg_catalog.int8multirange',
    input:
      'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    send: 'function:["pg_catalog","multirange_send"](pg_catalog.anymultirange)',
    receive:
      'function:["pg_catalog","multirange_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.int8range': {
    identity: 'pg_catalog.int8range',
    input: 'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    send: 'function:["pg_catalog","range_send"](pg_catalog.anyrange)',
    receive:
      'function:["pg_catalog","range_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.internal': {
    identity: 'pg_catalog.internal',
    input: 'function:["pg_catalog","internal_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","internal_out"](pg_catalog.internal)',
    send: null,
    receive: null,
  },
  'pg_catalog.jsonb': {
    identity: 'pg_catalog.jsonb',
    input: 'function:["pg_catalog","jsonb_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","jsonb_out"](pg_catalog.jsonb)',
    send: 'function:["pg_catalog","jsonb_send"](pg_catalog.jsonb)',
    receive: 'function:["pg_catalog","jsonb_recv"](pg_catalog.internal)',
  },
  'pg_catalog.jsonpath': {
    identity: 'pg_catalog.jsonpath',
    input: 'function:["pg_catalog","jsonpath_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","jsonpath_out"](pg_catalog.jsonpath)',
    send: 'function:["pg_catalog","jsonpath_send"](pg_catalog.jsonpath)',
    receive: 'function:["pg_catalog","jsonpath_recv"](pg_catalog.internal)',
  },
  'pg_catalog.language_handler': {
    identity: 'pg_catalog.language_handler',
    input: 'function:["pg_catalog","language_handler_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","language_handler_out"](pg_catalog.language_handler)',
    send: null,
    receive: null,
  },
  'pg_catalog.line': {
    identity: 'pg_catalog.line',
    input: 'function:["pg_catalog","line_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","line_out"](pg_catalog.line)',
    send: 'function:["pg_catalog","line_send"](pg_catalog.line)',
    receive: 'function:["pg_catalog","line_recv"](pg_catalog.internal)',
  },
  'pg_catalog.lseg': {
    identity: 'pg_catalog.lseg',
    input: 'function:["pg_catalog","lseg_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","lseg_out"](pg_catalog.lseg)',
    send: 'function:["pg_catalog","lseg_send"](pg_catalog.lseg)',
    receive: 'function:["pg_catalog","lseg_recv"](pg_catalog.internal)',
  },
  'pg_catalog.macaddr': {
    identity: 'pg_catalog.macaddr',
    input: 'function:["pg_catalog","macaddr_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","macaddr_out"](pg_catalog.macaddr)',
    send: 'function:["pg_catalog","macaddr_send"](pg_catalog.macaddr)',
    receive: 'function:["pg_catalog","macaddr_recv"](pg_catalog.internal)',
  },
  'pg_catalog.macaddr8': {
    identity: 'pg_catalog.macaddr8',
    input: 'function:["pg_catalog","macaddr8_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","macaddr8_out"](pg_catalog.macaddr8)',
    send: 'function:["pg_catalog","macaddr8_send"](pg_catalog.macaddr8)',
    receive: 'function:["pg_catalog","macaddr8_recv"](pg_catalog.internal)',
  },
  'pg_catalog.money': {
    identity: 'pg_catalog.money',
    input: 'function:["pg_catalog","cash_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","cash_out"](pg_catalog.money)',
    send: 'function:["pg_catalog","cash_send"](pg_catalog.money)',
    receive: 'function:["pg_catalog","cash_recv"](pg_catalog.internal)',
  },
  'pg_catalog.name': {
    identity: 'pg_catalog.name',
    input: 'function:["pg_catalog","namein"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","nameout"](pg_catalog.name)',
    send: 'function:["pg_catalog","namesend"](pg_catalog.name)',
    receive: 'function:["pg_catalog","namerecv"](pg_catalog.internal)',
  },
  'pg_catalog.nummultirange': {
    identity: 'pg_catalog.nummultirange',
    input:
      'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    send: 'function:["pg_catalog","multirange_send"](pg_catalog.anymultirange)',
    receive:
      'function:["pg_catalog","multirange_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.numrange': {
    identity: 'pg_catalog.numrange',
    input: 'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    send: 'function:["pg_catalog","range_send"](pg_catalog.anyrange)',
    receive:
      'function:["pg_catalog","range_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.oid': {
    identity: 'pg_catalog.oid',
    input: 'function:["pg_catalog","oidin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","oidout"](pg_catalog.oid)',
    send: 'function:["pg_catalog","oidsend"](pg_catalog.oid)',
    receive: 'function:["pg_catalog","oidrecv"](pg_catalog.internal)',
  },
  'pg_catalog.oidvector': {
    identity: 'pg_catalog.oidvector',
    input: 'function:["pg_catalog","oidvectorin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","oidvectorout"](pg_catalog.oidvector)',
    send: 'function:["pg_catalog","oidvectorsend"](pg_catalog.oidvector)',
    receive: 'function:["pg_catalog","oidvectorrecv"](pg_catalog.internal)',
  },
  'pg_catalog.path': {
    identity: 'pg_catalog.path',
    input: 'function:["pg_catalog","path_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","path_out"](pg_catalog.path)',
    send: 'function:["pg_catalog","path_send"](pg_catalog.path)',
    receive: 'function:["pg_catalog","path_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_aggregate': {
    identity: 'pg_catalog.pg_aggregate',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_aios': {
    identity: 'pg_catalog.pg_aios',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_am': {
    identity: 'pg_catalog.pg_am',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_amop': {
    identity: 'pg_catalog.pg_amop',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_amproc': {
    identity: 'pg_catalog.pg_amproc',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_attrdef': {
    identity: 'pg_catalog.pg_attrdef',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_attribute': {
    identity: 'pg_catalog.pg_attribute',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_auth_members': {
    identity: 'pg_catalog.pg_auth_members',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_authid': {
    identity: 'pg_catalog.pg_authid',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_available_extension_versions': {
    identity: 'pg_catalog.pg_available_extension_versions',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_available_extensions': {
    identity: 'pg_catalog.pg_available_extensions',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_backend_memory_contexts': {
    identity: 'pg_catalog.pg_backend_memory_contexts',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_brin_bloom_summary': {
    identity: 'pg_catalog.pg_brin_bloom_summary',
    input: 'function:["pg_catalog","brin_bloom_summary_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","brin_bloom_summary_out"](pg_catalog.pg_brin_bloom_summary)',
    send: 'function:["pg_catalog","brin_bloom_summary_send"](pg_catalog.pg_brin_bloom_summary)',
    receive: 'function:["pg_catalog","brin_bloom_summary_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_brin_minmax_multi_summary': {
    identity: 'pg_catalog.pg_brin_minmax_multi_summary',
    input: 'function:["pg_catalog","brin_minmax_multi_summary_in"](pg_catalog.cstring)',
    output:
      'function:["pg_catalog","brin_minmax_multi_summary_out"](pg_catalog.pg_brin_minmax_multi_summary)',
    send: 'function:["pg_catalog","brin_minmax_multi_summary_send"](pg_catalog.pg_brin_minmax_multi_summary)',
    receive: 'function:["pg_catalog","brin_minmax_multi_summary_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_cast': {
    identity: 'pg_catalog.pg_cast',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_class': {
    identity: 'pg_catalog.pg_class',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_collation': {
    identity: 'pg_catalog.pg_collation',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_config': {
    identity: 'pg_catalog.pg_config',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_constraint': {
    identity: 'pg_catalog.pg_constraint',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_conversion': {
    identity: 'pg_catalog.pg_conversion',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_cursors': {
    identity: 'pg_catalog.pg_cursors',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_database': {
    identity: 'pg_catalog.pg_database',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_db_role_setting': {
    identity: 'pg_catalog.pg_db_role_setting',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ddl_command': {
    identity: 'pg_catalog.pg_ddl_command',
    input: 'function:["pg_catalog","pg_ddl_command_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_ddl_command_out"](pg_catalog.pg_ddl_command)',
    send: 'function:["pg_catalog","pg_ddl_command_send"](pg_catalog.pg_ddl_command)',
    receive: 'function:["pg_catalog","pg_ddl_command_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_default_acl': {
    identity: 'pg_catalog.pg_default_acl',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_depend': {
    identity: 'pg_catalog.pg_depend',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_dependencies': {
    identity: 'pg_catalog.pg_dependencies',
    input: 'function:["pg_catalog","pg_dependencies_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_dependencies_out"](pg_catalog.pg_dependencies)',
    send: 'function:["pg_catalog","pg_dependencies_send"](pg_catalog.pg_dependencies)',
    receive: 'function:["pg_catalog","pg_dependencies_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_description': {
    identity: 'pg_catalog.pg_description',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_enum': {
    identity: 'pg_catalog.pg_enum',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_event_trigger': {
    identity: 'pg_catalog.pg_event_trigger',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_extension': {
    identity: 'pg_catalog.pg_extension',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_file_settings': {
    identity: 'pg_catalog.pg_file_settings',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_foreign_data_wrapper': {
    identity: 'pg_catalog.pg_foreign_data_wrapper',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_foreign_server': {
    identity: 'pg_catalog.pg_foreign_server',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_foreign_table': {
    identity: 'pg_catalog.pg_foreign_table',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_group': {
    identity: 'pg_catalog.pg_group',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_hba_file_rules': {
    identity: 'pg_catalog.pg_hba_file_rules',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ident_file_mappings': {
    identity: 'pg_catalog.pg_ident_file_mappings',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_index': {
    identity: 'pg_catalog.pg_index',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_indexes': {
    identity: 'pg_catalog.pg_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_inherits': {
    identity: 'pg_catalog.pg_inherits',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_init_privs': {
    identity: 'pg_catalog.pg_init_privs',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_language': {
    identity: 'pg_catalog.pg_language',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_largeobject': {
    identity: 'pg_catalog.pg_largeobject',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_largeobject_metadata': {
    identity: 'pg_catalog.pg_largeobject_metadata',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_locks': {
    identity: 'pg_catalog.pg_locks',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_lsn': {
    identity: 'pg_catalog.pg_lsn',
    input: 'function:["pg_catalog","pg_lsn_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_lsn_out"](pg_catalog.pg_lsn)',
    send: 'function:["pg_catalog","pg_lsn_send"](pg_catalog.pg_lsn)',
    receive: 'function:["pg_catalog","pg_lsn_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_matviews': {
    identity: 'pg_catalog.pg_matviews',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_mcv_list': {
    identity: 'pg_catalog.pg_mcv_list',
    input: 'function:["pg_catalog","pg_mcv_list_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_mcv_list_out"](pg_catalog.pg_mcv_list)',
    send: 'function:["pg_catalog","pg_mcv_list_send"](pg_catalog.pg_mcv_list)',
    receive: 'function:["pg_catalog","pg_mcv_list_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_namespace': {
    identity: 'pg_catalog.pg_namespace',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ndistinct': {
    identity: 'pg_catalog.pg_ndistinct',
    input: 'function:["pg_catalog","pg_ndistinct_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_ndistinct_out"](pg_catalog.pg_ndistinct)',
    send: 'function:["pg_catalog","pg_ndistinct_send"](pg_catalog.pg_ndistinct)',
    receive: 'function:["pg_catalog","pg_ndistinct_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_node_tree': {
    identity: 'pg_catalog.pg_node_tree',
    input: 'function:["pg_catalog","pg_node_tree_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_node_tree_out"](pg_catalog.pg_node_tree)',
    send: 'function:["pg_catalog","pg_node_tree_send"](pg_catalog.pg_node_tree)',
    receive: 'function:["pg_catalog","pg_node_tree_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_opclass': {
    identity: 'pg_catalog.pg_opclass',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_operator': {
    identity: 'pg_catalog.pg_operator',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_opfamily': {
    identity: 'pg_catalog.pg_opfamily',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_parameter_acl': {
    identity: 'pg_catalog.pg_parameter_acl',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_partitioned_table': {
    identity: 'pg_catalog.pg_partitioned_table',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_policies': {
    identity: 'pg_catalog.pg_policies',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_policy': {
    identity: 'pg_catalog.pg_policy',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_prepared_statements': {
    identity: 'pg_catalog.pg_prepared_statements',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_prepared_xacts': {
    identity: 'pg_catalog.pg_prepared_xacts',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_proc': {
    identity: 'pg_catalog.pg_proc',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_publication': {
    identity: 'pg_catalog.pg_publication',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_publication_namespace': {
    identity: 'pg_catalog.pg_publication_namespace',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_publication_rel': {
    identity: 'pg_catalog.pg_publication_rel',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_publication_tables': {
    identity: 'pg_catalog.pg_publication_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_range': {
    identity: 'pg_catalog.pg_range',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_replication_origin': {
    identity: 'pg_catalog.pg_replication_origin',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_replication_origin_status': {
    identity: 'pg_catalog.pg_replication_origin_status',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_replication_slots': {
    identity: 'pg_catalog.pg_replication_slots',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_rewrite': {
    identity: 'pg_catalog.pg_rewrite',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_roles': {
    identity: 'pg_catalog.pg_roles',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_rules': {
    identity: 'pg_catalog.pg_rules',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_seclabel': {
    identity: 'pg_catalog.pg_seclabel',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_seclabels': {
    identity: 'pg_catalog.pg_seclabels',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_sequence': {
    identity: 'pg_catalog.pg_sequence',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_sequences': {
    identity: 'pg_catalog.pg_sequences',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_settings': {
    identity: 'pg_catalog.pg_settings',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_shadow': {
    identity: 'pg_catalog.pg_shadow',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_shdepend': {
    identity: 'pg_catalog.pg_shdepend',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_shdescription': {
    identity: 'pg_catalog.pg_shdescription',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_shmem_allocations': {
    identity: 'pg_catalog.pg_shmem_allocations',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_shmem_allocations_numa': {
    identity: 'pg_catalog.pg_shmem_allocations_numa',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_shseclabel': {
    identity: 'pg_catalog.pg_shseclabel',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_snapshot': {
    identity: 'pg_catalog.pg_snapshot',
    input: 'function:["pg_catalog","pg_snapshot_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","pg_snapshot_out"](pg_catalog.pg_snapshot)',
    send: 'function:["pg_catalog","pg_snapshot_send"](pg_catalog.pg_snapshot)',
    receive: 'function:["pg_catalog","pg_snapshot_recv"](pg_catalog.internal)',
  },
  'pg_catalog.pg_stat_activity': {
    identity: 'pg_catalog.pg_stat_activity',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_all_indexes': {
    identity: 'pg_catalog.pg_stat_all_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_all_tables': {
    identity: 'pg_catalog.pg_stat_all_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_archiver': {
    identity: 'pg_catalog.pg_stat_archiver',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_bgwriter': {
    identity: 'pg_catalog.pg_stat_bgwriter',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_checkpointer': {
    identity: 'pg_catalog.pg_stat_checkpointer',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_database': {
    identity: 'pg_catalog.pg_stat_database',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_database_conflicts': {
    identity: 'pg_catalog.pg_stat_database_conflicts',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_gssapi': {
    identity: 'pg_catalog.pg_stat_gssapi',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_io': {
    identity: 'pg_catalog.pg_stat_io',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_progress_analyze': {
    identity: 'pg_catalog.pg_stat_progress_analyze',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_progress_basebackup': {
    identity: 'pg_catalog.pg_stat_progress_basebackup',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_progress_cluster': {
    identity: 'pg_catalog.pg_stat_progress_cluster',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_progress_copy': {
    identity: 'pg_catalog.pg_stat_progress_copy',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_progress_create_index': {
    identity: 'pg_catalog.pg_stat_progress_create_index',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_progress_vacuum': {
    identity: 'pg_catalog.pg_stat_progress_vacuum',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_recovery_prefetch': {
    identity: 'pg_catalog.pg_stat_recovery_prefetch',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_replication': {
    identity: 'pg_catalog.pg_stat_replication',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_replication_slots': {
    identity: 'pg_catalog.pg_stat_replication_slots',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_slru': {
    identity: 'pg_catalog.pg_stat_slru',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_ssl': {
    identity: 'pg_catalog.pg_stat_ssl',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_subscription': {
    identity: 'pg_catalog.pg_stat_subscription',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_subscription_stats': {
    identity: 'pg_catalog.pg_stat_subscription_stats',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_sys_indexes': {
    identity: 'pg_catalog.pg_stat_sys_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_sys_tables': {
    identity: 'pg_catalog.pg_stat_sys_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_user_functions': {
    identity: 'pg_catalog.pg_stat_user_functions',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_user_indexes': {
    identity: 'pg_catalog.pg_stat_user_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_user_tables': {
    identity: 'pg_catalog.pg_stat_user_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_wal': {
    identity: 'pg_catalog.pg_stat_wal',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_wal_receiver': {
    identity: 'pg_catalog.pg_stat_wal_receiver',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_xact_all_tables': {
    identity: 'pg_catalog.pg_stat_xact_all_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_xact_sys_tables': {
    identity: 'pg_catalog.pg_stat_xact_sys_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_xact_user_functions': {
    identity: 'pg_catalog.pg_stat_xact_user_functions',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stat_xact_user_tables': {
    identity: 'pg_catalog.pg_stat_xact_user_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_all_indexes': {
    identity: 'pg_catalog.pg_statio_all_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_all_sequences': {
    identity: 'pg_catalog.pg_statio_all_sequences',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_all_tables': {
    identity: 'pg_catalog.pg_statio_all_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_sys_indexes': {
    identity: 'pg_catalog.pg_statio_sys_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_sys_sequences': {
    identity: 'pg_catalog.pg_statio_sys_sequences',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_sys_tables': {
    identity: 'pg_catalog.pg_statio_sys_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_user_indexes': {
    identity: 'pg_catalog.pg_statio_user_indexes',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_user_sequences': {
    identity: 'pg_catalog.pg_statio_user_sequences',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statio_user_tables': {
    identity: 'pg_catalog.pg_statio_user_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statistic': {
    identity: 'pg_catalog.pg_statistic',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statistic_ext': {
    identity: 'pg_catalog.pg_statistic_ext',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_statistic_ext_data': {
    identity: 'pg_catalog.pg_statistic_ext_data',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stats': {
    identity: 'pg_catalog.pg_stats',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stats_ext': {
    identity: 'pg_catalog.pg_stats_ext',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_stats_ext_exprs': {
    identity: 'pg_catalog.pg_stats_ext_exprs',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_subscription': {
    identity: 'pg_catalog.pg_subscription',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_subscription_rel': {
    identity: 'pg_catalog.pg_subscription_rel',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_tables': {
    identity: 'pg_catalog.pg_tables',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_tablespace': {
    identity: 'pg_catalog.pg_tablespace',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_timezone_abbrevs': {
    identity: 'pg_catalog.pg_timezone_abbrevs',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_timezone_names': {
    identity: 'pg_catalog.pg_timezone_names',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_transform': {
    identity: 'pg_catalog.pg_transform',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_trigger': {
    identity: 'pg_catalog.pg_trigger',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ts_config': {
    identity: 'pg_catalog.pg_ts_config',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ts_config_map': {
    identity: 'pg_catalog.pg_ts_config_map',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ts_dict': {
    identity: 'pg_catalog.pg_ts_dict',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ts_parser': {
    identity: 'pg_catalog.pg_ts_parser',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_ts_template': {
    identity: 'pg_catalog.pg_ts_template',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_type': {
    identity: 'pg_catalog.pg_type',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_user': {
    identity: 'pg_catalog.pg_user',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_user_mapping': {
    identity: 'pg_catalog.pg_user_mapping',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_user_mappings': {
    identity: 'pg_catalog.pg_user_mappings',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_views': {
    identity: 'pg_catalog.pg_views',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.pg_wait_events': {
    identity: 'pg_catalog.pg_wait_events',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.point': {
    identity: 'pg_catalog.point',
    input: 'function:["pg_catalog","point_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","point_out"](pg_catalog.point)',
    send: 'function:["pg_catalog","point_send"](pg_catalog.point)',
    receive: 'function:["pg_catalog","point_recv"](pg_catalog.internal)',
  },
  'pg_catalog.polygon': {
    identity: 'pg_catalog.polygon',
    input: 'function:["pg_catalog","poly_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","poly_out"](pg_catalog.polygon)',
    send: 'function:["pg_catalog","poly_send"](pg_catalog.polygon)',
    receive: 'function:["pg_catalog","poly_recv"](pg_catalog.internal)',
  },
  'pg_catalog.record': {
    identity: 'pg_catalog.record',
    input: 'function:["pg_catalog","record_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","record_out"](pg_catalog.record)',
    send: 'function:["pg_catalog","record_send"](pg_catalog.record)',
    receive:
      'function:["pg_catalog","record_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.refcursor': {
    identity: 'pg_catalog.refcursor',
    input: 'function:["pg_catalog","textin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","textout"](pg_catalog.text)',
    send: 'function:["pg_catalog","textsend"](pg_catalog.text)',
    receive: 'function:["pg_catalog","textrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regclass': {
    identity: 'pg_catalog.regclass',
    input: 'function:["pg_catalog","regclassin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regclassout"](pg_catalog.regclass)',
    send: 'function:["pg_catalog","regclasssend"](pg_catalog.regclass)',
    receive: 'function:["pg_catalog","regclassrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regcollation': {
    identity: 'pg_catalog.regcollation',
    input: 'function:["pg_catalog","regcollationin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regcollationout"](pg_catalog.regcollation)',
    send: 'function:["pg_catalog","regcollationsend"](pg_catalog.regcollation)',
    receive: 'function:["pg_catalog","regcollationrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regconfig': {
    identity: 'pg_catalog.regconfig',
    input: 'function:["pg_catalog","regconfigin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regconfigout"](pg_catalog.regconfig)',
    send: 'function:["pg_catalog","regconfigsend"](pg_catalog.regconfig)',
    receive: 'function:["pg_catalog","regconfigrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regdictionary': {
    identity: 'pg_catalog.regdictionary',
    input: 'function:["pg_catalog","regdictionaryin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regdictionaryout"](pg_catalog.regdictionary)',
    send: 'function:["pg_catalog","regdictionarysend"](pg_catalog.regdictionary)',
    receive: 'function:["pg_catalog","regdictionaryrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regnamespace': {
    identity: 'pg_catalog.regnamespace',
    input: 'function:["pg_catalog","regnamespacein"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regnamespaceout"](pg_catalog.regnamespace)',
    send: 'function:["pg_catalog","regnamespacesend"](pg_catalog.regnamespace)',
    receive: 'function:["pg_catalog","regnamespacerecv"](pg_catalog.internal)',
  },
  'pg_catalog.regoper': {
    identity: 'pg_catalog.regoper',
    input: 'function:["pg_catalog","regoperin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regoperout"](pg_catalog.regoper)',
    send: 'function:["pg_catalog","regopersend"](pg_catalog.regoper)',
    receive: 'function:["pg_catalog","regoperrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regoperator': {
    identity: 'pg_catalog.regoperator',
    input: 'function:["pg_catalog","regoperatorin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regoperatorout"](pg_catalog.regoperator)',
    send: 'function:["pg_catalog","regoperatorsend"](pg_catalog.regoperator)',
    receive: 'function:["pg_catalog","regoperatorrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regproc': {
    identity: 'pg_catalog.regproc',
    input: 'function:["pg_catalog","regprocin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regprocout"](pg_catalog.regproc)',
    send: 'function:["pg_catalog","regprocsend"](pg_catalog.regproc)',
    receive: 'function:["pg_catalog","regprocrecv"](pg_catalog.internal)',
  },
  'pg_catalog.regprocedure': {
    identity: 'pg_catalog.regprocedure',
    input: 'function:["pg_catalog","regprocedurein"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regprocedureout"](pg_catalog.regprocedure)',
    send: 'function:["pg_catalog","regproceduresend"](pg_catalog.regprocedure)',
    receive: 'function:["pg_catalog","regprocedurerecv"](pg_catalog.internal)',
  },
  'pg_catalog.regrole': {
    identity: 'pg_catalog.regrole',
    input: 'function:["pg_catalog","regrolein"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regroleout"](pg_catalog.regrole)',
    send: 'function:["pg_catalog","regrolesend"](pg_catalog.regrole)',
    receive: 'function:["pg_catalog","regrolerecv"](pg_catalog.internal)',
  },
  'pg_catalog.regtype': {
    identity: 'pg_catalog.regtype',
    input: 'function:["pg_catalog","regtypein"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","regtypeout"](pg_catalog.regtype)',
    send: 'function:["pg_catalog","regtypesend"](pg_catalog.regtype)',
    receive: 'function:["pg_catalog","regtyperecv"](pg_catalog.internal)',
  },
  'pg_catalog.table_am_handler': {
    identity: 'pg_catalog.table_am_handler',
    input: 'function:["pg_catalog","table_am_handler_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","table_am_handler_out"](pg_catalog.table_am_handler)',
    send: null,
    receive: null,
  },
  'pg_catalog.text': {
    identity: 'pg_catalog.text',
    input: 'function:["pg_catalog","textin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","textout"](pg_catalog.text)',
    send: 'function:["pg_catalog","textsend"](pg_catalog.text)',
    receive: 'function:["pg_catalog","textrecv"](pg_catalog.internal)',
  },
  'pg_catalog.tid': {
    identity: 'pg_catalog.tid',
    input: 'function:["pg_catalog","tidin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","tidout"](pg_catalog.tid)',
    send: 'function:["pg_catalog","tidsend"](pg_catalog.tid)',
    receive: 'function:["pg_catalog","tidrecv"](pg_catalog.internal)',
  },
  'pg_catalog.timestamptz': {
    identity: 'pg_catalog.timestamptz',
    input:
      'function:["pg_catalog","timestamptz_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","timestamptz_out"](pg_catalog.timestamptz)',
    send: 'function:["pg_catalog","timestamptz_send"](pg_catalog.timestamptz)',
    receive:
      'function:["pg_catalog","timestamptz_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.timetz': {
    identity: 'pg_catalog.timetz',
    input: 'function:["pg_catalog","timetz_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","timetz_out"](pg_catalog.timetz)',
    send: 'function:["pg_catalog","timetz_send"](pg_catalog.timetz)',
    receive:
      'function:["pg_catalog","timetz_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.trigger': {
    identity: 'pg_catalog.trigger',
    input: 'function:["pg_catalog","trigger_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","trigger_out"](pg_catalog.trigger)',
    send: null,
    receive: null,
  },
  'pg_catalog.tsm_handler': {
    identity: 'pg_catalog.tsm_handler',
    input: 'function:["pg_catalog","tsm_handler_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","tsm_handler_out"](pg_catalog.tsm_handler)',
    send: null,
    receive: null,
  },
  'pg_catalog.tsmultirange': {
    identity: 'pg_catalog.tsmultirange',
    input:
      'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    send: 'function:["pg_catalog","multirange_send"](pg_catalog.anymultirange)',
    receive:
      'function:["pg_catalog","multirange_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.tsquery': {
    identity: 'pg_catalog.tsquery',
    input: 'function:["pg_catalog","tsqueryin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","tsqueryout"](pg_catalog.tsquery)',
    send: 'function:["pg_catalog","tsquerysend"](pg_catalog.tsquery)',
    receive: 'function:["pg_catalog","tsqueryrecv"](pg_catalog.internal)',
  },
  'pg_catalog.tsrange': {
    identity: 'pg_catalog.tsrange',
    input: 'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    send: 'function:["pg_catalog","range_send"](pg_catalog.anyrange)',
    receive:
      'function:["pg_catalog","range_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.tstzmultirange': {
    identity: 'pg_catalog.tstzmultirange',
    input:
      'function:["pg_catalog","multirange_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","multirange_out"](pg_catalog.anymultirange)',
    send: 'function:["pg_catalog","multirange_send"](pg_catalog.anymultirange)',
    receive:
      'function:["pg_catalog","multirange_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.tstzrange': {
    identity: 'pg_catalog.tstzrange',
    input: 'function:["pg_catalog","range_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","range_out"](pg_catalog.anyrange)',
    send: 'function:["pg_catalog","range_send"](pg_catalog.anyrange)',
    receive:
      'function:["pg_catalog","range_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.tsvector': {
    identity: 'pg_catalog.tsvector',
    input: 'function:["pg_catalog","tsvectorin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","tsvectorout"](pg_catalog.tsvector)',
    send: 'function:["pg_catalog","tsvectorsend"](pg_catalog.tsvector)',
    receive: 'function:["pg_catalog","tsvectorrecv"](pg_catalog.internal)',
  },
  'pg_catalog.txid_snapshot': {
    identity: 'pg_catalog.txid_snapshot',
    input: 'function:["pg_catalog","txid_snapshot_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","txid_snapshot_out"](pg_catalog.txid_snapshot)',
    send: 'function:["pg_catalog","txid_snapshot_send"](pg_catalog.txid_snapshot)',
    receive: 'function:["pg_catalog","txid_snapshot_recv"](pg_catalog.internal)',
  },
  'pg_catalog.unknown': {
    identity: 'pg_catalog.unknown',
    input: 'function:["pg_catalog","unknownin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","unknownout"](pg_catalog.unknown)',
    send: 'function:["pg_catalog","unknownsend"](pg_catalog.unknown)',
    receive: 'function:["pg_catalog","unknownrecv"](pg_catalog.internal)',
  },
  'pg_catalog.uuid': {
    identity: 'pg_catalog.uuid',
    input: 'function:["pg_catalog","uuid_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","uuid_out"](pg_catalog.uuid)',
    send: 'function:["pg_catalog","uuid_send"](pg_catalog.uuid)',
    receive: 'function:["pg_catalog","uuid_recv"](pg_catalog.internal)',
  },
  'pg_catalog.varbit': {
    identity: 'pg_catalog.varbit',
    input: 'function:["pg_catalog","varbit_in"](pg_catalog.cstring,pg_catalog.oid,pg_catalog.int4)',
    output: 'function:["pg_catalog","varbit_out"](pg_catalog.varbit)',
    send: 'function:["pg_catalog","varbit_send"](pg_catalog.varbit)',
    receive:
      'function:["pg_catalog","varbit_recv"](pg_catalog.internal,pg_catalog.oid,pg_catalog.int4)',
  },
  'pg_catalog.void': {
    identity: 'pg_catalog.void',
    input: 'function:["pg_catalog","void_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","void_out"](pg_catalog.void)',
    send: 'function:["pg_catalog","void_send"](pg_catalog.void)',
    receive: 'function:["pg_catalog","void_recv"](pg_catalog.internal)',
  },
  'pg_catalog.xid': {
    identity: 'pg_catalog.xid',
    input: 'function:["pg_catalog","xidin"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","xidout"](pg_catalog.xid)',
    send: 'function:["pg_catalog","xidsend"](pg_catalog.xid)',
    receive: 'function:["pg_catalog","xidrecv"](pg_catalog.internal)',
  },
  'pg_catalog.xid8': {
    identity: 'pg_catalog.xid8',
    input: 'function:["pg_catalog","xid8in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","xid8out"](pg_catalog.xid8)',
    send: 'function:["pg_catalog","xid8send"](pg_catalog.xid8)',
    receive: 'function:["pg_catalog","xid8recv"](pg_catalog.internal)',
  },
  'pg_catalog.xml': {
    identity: 'pg_catalog.xml',
    input: 'function:["pg_catalog","xml_in"](pg_catalog.cstring)',
    output: 'function:["pg_catalog","xml_out"](pg_catalog.xml)',
    send: 'function:["pg_catalog","xml_send"](pg_catalog.xml)',
    receive: 'function:["pg_catalog","xml_recv"](pg_catalog.internal)',
  },
} as const
