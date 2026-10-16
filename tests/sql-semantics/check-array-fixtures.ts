export const arrayFixtureSource = String.raw`
fn array_fixture_element(kind:i32)->ArrayElement {
 if kind==1 {return array_element_from_int2(make_int2_value(-123));};
 if kind==2 {return array_element_from_int4(make_int4_value(-2147483647 - 1));};
 if kind==3 {return array_element_from_int8(make_int8_value(9007199254740993i64));};
 if kind==4 {return array_element_from_timestamp(make_timestamp_value(-9007199254740993i64));};
 if kind==5 {return array_element_from_timestamptz(make_timestamptz_value(9007199254740993i64));};
 if kind==6 {return array_element_from_enum(make_enum_value(3));};
 if kind==7 {return array_element_from_date(make_date_value(-1));};
 if kind==8 {return array_element_from_text(make_text_value("NULL,\"😊"));};
 if kind==9 {return array_element_from_bool(make_bool_value(true));};
 if kind==10 {return array_element_from_numeric(make_numeric_value("12345678901234567890.0012300"));};
 if kind==11 {return array_element_from_json(make_json_value("{\"a\": [1, 2]} "));};
 if kind==12 {return array_element_from_jsonb(make_jsonb_value("{\"a\": [1,2]}"));};
 if kind==13 {return array_element_from_network(make_network_value("2001:db8::1/64"));};
 if kind==14 {return array_element_from_bit(make_bit_value("101001"));};
 if kind==15 {return array_element_from_bytea(make_bytea_value("0001ff"));};
 if kind==16 {return array_element_from_macaddr(make_macaddr_value("08:00:2b:01:02:03"));};
 if kind==17 {return array_element_from_macaddr8(make_macaddr8_value("08:00:2b:01:02:03:04:05"));};
 if kind==18 {return array_element_from_uuid(make_uuid_value("12345678-1234-1234-1234-123456789abc"));};
 if kind==19 {return array_element_from_float4(make_float4_bits(-2147483647 - 1));};
 if kind==20 {return array_element_from_float8(make_float8_bits(-9223372036854775808i64));};
 if kind==21 {return array_element_from_time(make_time_value(86400000000i64));};
 if kind==22 {return array_element_from_timetz(make_timetz_value(12345678901i64,-19800));};
 if kind==23 {return array_element_from_interval(make_interval_value(-3,5,-12345678901i64));};
 if kind==24 {return array_element_from_point(make_point_bits(-9223372036854775808i64,4607182418800017408i64));};
 if kind==25 {return array_element_from_line(make_line_bits(4607182418800017408i64,0i64,0i64));};
 if kind==26 {return array_element_from_lseg(make_lseg_bits(0i64,0i64,4607182418800017408i64,4607182418800017408i64));};
 if kind==27 {return array_element_from_box(make_box_bits(4607182418800017408i64,4607182418800017408i64,0i64,0i64));};
 if kind==28 {return array_element_from_path(path_from_text(make_text_value("[(0,0),(1,1)]")));};
 if kind==29 {return array_element_from_polygon(polygon_from_text(make_text_value("((0,0),(1,0),(0,1))")));};
 if kind==30 {return array_element_from_circle(make_circle_bits(0i64,0i64,4607182418800017408i64));};
 if kind==31 {return array_element_from_money(make_money_value(-9007199254740993i64));};
 if kind==32 {return array_element_from_internal_char(make_internal_char_value(255));};
 if kind==33 {return array_element_from_oid(make_oid_value(4294967295i64));};
 if kind==34 {return array_element_from_xid(make_xid_value(4294967295i64));};
 if kind==35 {return array_element_from_cid(make_cid_value(4294967295i64));};
 if kind==36 {return array_element_from_snapshot(snapshot_from_text(make_text_value("10:20:12,15")));};
 if kind==37 {return array_element_from_xid8(make_xid8_bits(-1i64));};
 if kind==38 {return array_element_from_pg_lsn(make_pg_lsn_bits(-1i64));};
 if kind==39 {return array_element_from_tid(make_tid_parts(4294967295i64,65535));};
 if kind==40 {return array_element_from_jsonpath(jsonpath_from_coerced_source_utf8(make_text_value("$.a[0]")));};
 ArrayElement::Unknown
}
`

const scalarLiterals = [
  ['smallint', "'-123'"],
  ['integer', "'-2147483648'"],
  ['bigint', "'9007199254740993'"],
  ['timestamp', "'2000-01-01 12:34:56'"],
  ['timestamptz', "'2000-01-01 12:34:56+00'"],
  ['array_stage', "'new'"],
  ['date', "'2000-01-01'"],
  ['text', "'雪,NULL'"],
  ['boolean', 'true'],
  ['numeric', "'12345678901234567890.0012300'"],
  ['json', '\'{"a":1}\''],
  ['jsonb', '\'{"a":1}\''],
  ['inet', "'2001:db8::1/64'"],
  ['bit varying', "'101001'"],
  ['bytea', String.raw`'\x0001ff'`],
  ['macaddr', "'08:00:2b:01:02:03'"],
  ['macaddr8', "'08:00:2b:01:02:03:04:05'"],
  ['uuid', "'12345678-1234-1234-1234-123456789abc'"],
  ['real', "'NaN'"],
  ['double precision', "'-0'"],
  ['time', "'12:34:56'"],
  ['timetz', "'12:34:56+00'"],
  ['interval', "'1 day'"],
  ['point', "'(0,1)'"],
  ['line', "'{1,0,0}'"],
  ['lseg', "'[(0,0),(1,1)]'"],
  ['box', "'(1,1),(0,0)'"],
  ['path', "'[(0,0),(1,1)]'"],
  ['polygon', "'((0,0),(1,0),(0,1))'"],
  ['circle', "'<(0,0),1>'"],
  ['money', "'0'"],
  ['"char"', "'a'"],
  ['oid', "'4294967295'"],
  ['xid', "'4294967295'"],
  ['cid', "'4294967295'"],
  ['pg_snapshot', "'10:20:12,15'"],
  ['xid8', "'18446744073709551615'"],
  ['pg_lsn', "'FFFFFFFF/FFFFFFFF'"],
  ['tid', "'(4294967295,65535)'"],
  ['jsonpath', "'$.a[0]'"],
] as const
const extraFamilies = [
  ['varchar(2)', "'雪😊abc'"],
  ['character(3)', "'abcdef'"],
  ['name', "''"],
  ['refcursor', "'cursor_name'"],
  ['bit(4)', "'1010'"],
  ['cidr', "'192.0.2.0/24'"],
  ['txid_snapshot', "'10:20:12,15'"],
  ...[
    'regclass',
    'regcollation',
    'regconfig',
    'regdictionary',
    'regnamespace',
    'regoper',
    'regoperator',
    'regproc',
    'regprocedure',
    'regrole',
    'regtype',
  ].map((type) => [type, "'0'"] as const),
] as const

export const arrayScalarProfiles = [...scalarLiterals, ...extraFamilies] as const
