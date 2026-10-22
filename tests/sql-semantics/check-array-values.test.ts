import { arrayFixtureSource } from './check-array-fixtures.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const carrierProbe =
  arrayFixtureSource +
  String.raw`
pub fn array_carrier_probe(family:Int4Value)->BoolValue {
 if let Int4Value::Value(kind)=family {
  if kind==1 {
   let original=make_int2_value(-123);
   let encoded=array_element_from_int2(original.clone());
   if array_element_family(encoded.clone())!=1 {return BoolValue::Value(false);};
   let restored=array_element_to_int2(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_int2(array_element_from_int2(Int2Value::Null));
   let mut correct_null=false;if let Int2Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_int2(array_element_from_int2(Int2Value::Unknown));
   let mut correct_unknown=false;if let Int2Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_int2(array_element_from_int2(Int2Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Int2Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==2 {
   let original=make_int4_value(-2147483647 - 1);
   let encoded=array_element_from_int4(original.clone());
   if array_element_family(encoded.clone())!=2 {return BoolValue::Value(false);};
   let restored=array_element_to_int4(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_int4(array_element_from_int4(Int4Value::Null));
   let mut correct_null=false;if let Int4Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_int4(array_element_from_int4(Int4Value::Unknown));
   let mut correct_unknown=false;if let Int4Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_int4(array_element_from_int4(Int4Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Int4Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==3 {
   let original=make_int8_value(9007199254740993i64);
   let encoded=array_element_from_int8(original.clone());
   if array_element_family(encoded.clone())!=3 {return BoolValue::Value(false);};
   let restored=array_element_to_int8(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_int8(array_element_from_int8(Int8Value::Null));
   let mut correct_null=false;if let Int8Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_int8(array_element_from_int8(Int8Value::Unknown));
   let mut correct_unknown=false;if let Int8Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_int8(array_element_from_int8(Int8Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Int8Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==4 {
   let original=make_timestamp_value(-9007199254740993i64);
   let encoded=array_element_from_timestamp(original.clone());
   if array_element_family(encoded.clone())!=4 {return BoolValue::Value(false);};
   let restored=array_element_to_timestamp(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_timestamp(array_element_from_timestamp(TimestampValue::Null));
   let mut correct_null=false;if let TimestampValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_timestamp(array_element_from_timestamp(TimestampValue::Unknown));
   let mut correct_unknown=false;if let TimestampValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_timestamp(array_element_from_timestamp(TimestampValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let TimestampValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==5 {
   let original=make_timestamptz_value(9007199254740993i64);
   let encoded=array_element_from_timestamptz(original.clone());
   if array_element_family(encoded.clone())!=5 {return BoolValue::Value(false);};
   let restored=array_element_to_timestamptz(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_timestamptz(array_element_from_timestamptz(TimestamptzValue::Null));
   let mut correct_null=false;if let TimestamptzValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_timestamptz(array_element_from_timestamptz(TimestamptzValue::Unknown));
   let mut correct_unknown=false;if let TimestamptzValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_timestamptz(array_element_from_timestamptz(TimestamptzValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let TimestamptzValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==6 {
   let original=make_enum_value(3);
   let encoded=array_element_from_enum(original.clone());
   if array_element_family(encoded.clone())!=6 {return BoolValue::Value(false);};
   let restored=array_element_to_enum(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_enum(array_element_from_enum(EnumValue::Null));
   let mut correct_null=false;if let EnumValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_enum(array_element_from_enum(EnumValue::Unknown));
   let mut correct_unknown=false;if let EnumValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_enum(array_element_from_enum(EnumValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let EnumValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==7 {
   let original=make_date_value(-1);
   let encoded=array_element_from_date(original.clone());
   if array_element_family(encoded.clone())!=7 {return BoolValue::Value(false);};
   let restored=array_element_to_date(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_date(array_element_from_date(DateValue::Null));
   let mut correct_null=false;if let DateValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_date(array_element_from_date(DateValue::Unknown));
   let mut correct_unknown=false;if let DateValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_date(array_element_from_date(DateValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let DateValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==8 {
   let original=make_text_value("NULL,\"😊");
   let encoded=array_element_from_text(original.clone());
   if array_element_family(encoded.clone())!=8 {return BoolValue::Value(false);};
   let restored=array_element_to_text(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_text(array_element_from_text(TextValue::Null));
   let mut correct_null=false;if let TextValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_text(array_element_from_text(TextValue::Unknown));
   let mut correct_unknown=false;if let TextValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_text(array_element_from_text(TextValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let TextValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==9 {
   let original=make_bool_value(true);
   let encoded=array_element_from_bool(original.clone());
   if array_element_family(encoded.clone())!=9 {return BoolValue::Value(false);};
   let restored=array_element_to_bool(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_bool(array_element_from_bool(BoolValue::Null));
   let mut correct_null=false;if let BoolValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_bool(array_element_from_bool(BoolValue::Unknown));
   let mut correct_unknown=false;if let BoolValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_bool(array_element_from_bool(BoolValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let BoolValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==10 {
   let original=make_numeric_value("12345678901234567890.0012300");
   let encoded=array_element_from_numeric(original.clone());
   if array_element_family(encoded.clone())!=10 {return BoolValue::Value(false);};
   let restored=array_element_to_numeric(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_numeric(array_element_from_numeric(NumericValue::Null));
   let mut correct_null=false;if let NumericValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_numeric(array_element_from_numeric(NumericValue::Unknown));
   let mut correct_unknown=false;if let NumericValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_numeric(array_element_from_numeric(NumericValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let NumericValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==11 {
   let original=make_json_value("{\"a\": [1, 2]} ");
   let encoded=array_element_from_json(original.clone());
   if array_element_family(encoded.clone())!=11 {return BoolValue::Value(false);};
   let restored=array_element_to_json(encoded);
   let mut same=false;
   if let JsonValue::Value(a)=original {if let JsonValue::Value(b)=restored {same=a.source==b.source && a.kind==b.kind && a.depth==b.depth;};};
   if same==false {return BoolValue::Value(false);};
   let absent=array_element_to_json(array_element_from_json(JsonValue::Null));
   let mut correct_null=false;if let JsonValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_json(array_element_from_json(JsonValue::Unknown));
   let mut correct_unknown=false;if let JsonValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_json(array_element_from_json(JsonValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let JsonValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==12 {
   let original=make_jsonb_value("{\"a\": [1,2]}");
   let encoded=array_element_from_jsonb(original.clone());
   if array_element_family(encoded.clone())!=12 {return BoolValue::Value(false);};
   let restored=array_element_to_jsonb(encoded);
   let mut same=false;
   same=jsonb_to_text(original)==jsonb_to_text(restored);
   if same==false {return BoolValue::Value(false);};
   let absent=array_element_to_jsonb(array_element_from_jsonb(JsonbValue::Null));
   let mut correct_null=false;if let JsonbValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_jsonb(array_element_from_jsonb(JsonbValue::Unknown));
   let mut correct_unknown=false;if let JsonbValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_jsonb(array_element_from_jsonb(JsonbValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let JsonbValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==13 {
   let original=make_network_value("2001:db8::1/64");
   let encoded=array_element_from_network(original.clone());
   if array_element_family(encoded.clone())!=13 {return BoolValue::Value(false);};
   let restored=array_element_to_network(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_network(array_element_from_network(NetworkValue::Null));
   let mut correct_null=false;if let NetworkValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_network(array_element_from_network(NetworkValue::Unknown));
   let mut correct_unknown=false;if let NetworkValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_network(array_element_from_network(NetworkValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let NetworkValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==14 {
   let original=make_bit_value("101001");
   let encoded=array_element_from_bit(original.clone());
   if array_element_family(encoded.clone())!=14 {return BoolValue::Value(false);};
   let restored=array_element_to_bit(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_bit(array_element_from_bit(BitValue::Null));
   let mut correct_null=false;if let BitValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_bit(array_element_from_bit(BitValue::Unknown));
   let mut correct_unknown=false;if let BitValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_bit(array_element_from_bit(BitValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let BitValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==15 {
   let original=make_bytea_value("0001ff");
   let encoded=array_element_from_bytea(original.clone());
   if array_element_family(encoded.clone())!=15 {return BoolValue::Value(false);};
   let restored=array_element_to_bytea(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_bytea(array_element_from_bytea(ByteaValue::Null));
   let mut correct_null=false;if let ByteaValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_bytea(array_element_from_bytea(ByteaValue::Unknown));
   let mut correct_unknown=false;if let ByteaValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_bytea(array_element_from_bytea(ByteaValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let ByteaValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==16 {
   let original=make_macaddr_value("08:00:2b:01:02:03");
   let encoded=array_element_from_macaddr(original.clone());
   if array_element_family(encoded.clone())!=16 {return BoolValue::Value(false);};
   let restored=array_element_to_macaddr(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_macaddr(array_element_from_macaddr(MacaddrValue::Null));
   let mut correct_null=false;if let MacaddrValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_macaddr(array_element_from_macaddr(MacaddrValue::Unknown));
   let mut correct_unknown=false;if let MacaddrValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_macaddr(array_element_from_macaddr(MacaddrValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let MacaddrValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==17 {
   let original=make_macaddr8_value("08:00:2b:01:02:03:04:05");
   let encoded=array_element_from_macaddr8(original.clone());
   if array_element_family(encoded.clone())!=17 {return BoolValue::Value(false);};
   let restored=array_element_to_macaddr8(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_macaddr8(array_element_from_macaddr8(Macaddr8Value::Null));
   let mut correct_null=false;if let Macaddr8Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_macaddr8(array_element_from_macaddr8(Macaddr8Value::Unknown));
   let mut correct_unknown=false;if let Macaddr8Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_macaddr8(array_element_from_macaddr8(Macaddr8Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Macaddr8Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==18 {
   let original=make_uuid_value("12345678-1234-1234-1234-123456789abc");
   let encoded=array_element_from_uuid(original.clone());
   if array_element_family(encoded.clone())!=18 {return BoolValue::Value(false);};
   let restored=array_element_to_uuid(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_uuid(array_element_from_uuid(UuidValue::Null));
   let mut correct_null=false;if let UuidValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_uuid(array_element_from_uuid(UuidValue::Unknown));
   let mut correct_unknown=false;if let UuidValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_uuid(array_element_from_uuid(UuidValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let UuidValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==19 {
   let original=make_float4_bits(-2147483647 - 1);
   let encoded=array_element_from_float4(original.clone());
   if array_element_family(encoded.clone())!=19 {return BoolValue::Value(false);};
   let restored=array_element_to_float4(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_float4(array_element_from_float4(Float4Value::Null));
   let mut correct_null=false;if let Float4Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_float4(array_element_from_float4(Float4Value::Unknown));
   let mut correct_unknown=false;if let Float4Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_float4(array_element_from_float4(Float4Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Float4Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==20 {
   let original=make_float8_bits(-9223372036854775808i64);
   let encoded=array_element_from_float8(original.clone());
   if array_element_family(encoded.clone())!=20 {return BoolValue::Value(false);};
   let restored=array_element_to_float8(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_float8(array_element_from_float8(Float8Value::Null));
   let mut correct_null=false;if let Float8Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_float8(array_element_from_float8(Float8Value::Unknown));
   let mut correct_unknown=false;if let Float8Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_float8(array_element_from_float8(Float8Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Float8Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==21 {
   let original=make_time_value(86400000000i64);
   let encoded=array_element_from_time(original.clone());
   if array_element_family(encoded.clone())!=21 {return BoolValue::Value(false);};
   let restored=array_element_to_time(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_time(array_element_from_time(TimeValue::Null));
   let mut correct_null=false;if let TimeValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_time(array_element_from_time(TimeValue::Unknown));
   let mut correct_unknown=false;if let TimeValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_time(array_element_from_time(TimeValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let TimeValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==22 {
   let original=make_timetz_value(12345678901i64,-19800);
   let encoded=array_element_from_timetz(original.clone());
   if array_element_family(encoded.clone())!=22 {return BoolValue::Value(false);};
   let restored=array_element_to_timetz(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_timetz(array_element_from_timetz(TimetzValue::Null));
   let mut correct_null=false;if let TimetzValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_timetz(array_element_from_timetz(TimetzValue::Unknown));
   let mut correct_unknown=false;if let TimetzValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_timetz(array_element_from_timetz(TimetzValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let TimetzValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==23 {
   let original=make_interval_value(-3,5,-12345678901i64);
   let encoded=array_element_from_interval(original.clone());
   if array_element_family(encoded.clone())!=23 {return BoolValue::Value(false);};
   let restored=array_element_to_interval(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_interval(array_element_from_interval(IntervalValue::Null));
   let mut correct_null=false;if let IntervalValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_interval(array_element_from_interval(IntervalValue::Unknown));
   let mut correct_unknown=false;if let IntervalValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_interval(array_element_from_interval(IntervalValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let IntervalValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==24 {
   let original=make_point_bits(-9223372036854775808i64,4607182418800017408i64);
   let encoded=array_element_from_point(original.clone());
   if array_element_family(encoded.clone())!=24 {return BoolValue::Value(false);};
   let restored=array_element_to_point(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_point(array_element_from_point(PointValue::Null));
   let mut correct_null=false;if let PointValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_point(array_element_from_point(PointValue::Unknown));
   let mut correct_unknown=false;if let PointValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_point(array_element_from_point(PointValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let PointValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==25 {
   let original=make_line_bits(4607182418800017408i64,0i64,0i64);
   let encoded=array_element_from_line(original.clone());
   if array_element_family(encoded.clone())!=25 {return BoolValue::Value(false);};
   let restored=array_element_to_line(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_line(array_element_from_line(LineValue::Null));
   let mut correct_null=false;if let LineValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_line(array_element_from_line(LineValue::Unknown));
   let mut correct_unknown=false;if let LineValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_line(array_element_from_line(LineValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let LineValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==26 {
   let original=make_lseg_bits(0i64,0i64,4607182418800017408i64,4607182418800017408i64);
   let encoded=array_element_from_lseg(original.clone());
   if array_element_family(encoded.clone())!=26 {return BoolValue::Value(false);};
   let restored=array_element_to_lseg(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_lseg(array_element_from_lseg(LsegValue::Null));
   let mut correct_null=false;if let LsegValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_lseg(array_element_from_lseg(LsegValue::Unknown));
   let mut correct_unknown=false;if let LsegValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_lseg(array_element_from_lseg(LsegValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let LsegValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==27 {
   let original=make_box_bits(4607182418800017408i64,4607182418800017408i64,0i64,0i64);
   let encoded=array_element_from_box(original.clone());
   if array_element_family(encoded.clone())!=27 {return BoolValue::Value(false);};
   let restored=array_element_to_box(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_box(array_element_from_box(BoxValue::Null));
   let mut correct_null=false;if let BoxValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_box(array_element_from_box(BoxValue::Unknown));
   let mut correct_unknown=false;if let BoxValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_box(array_element_from_box(BoxValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let BoxValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==28 {
   let original=path_from_text(make_text_value("[(0,0),(1,1)]"));
   let encoded=array_element_from_path(original.clone());
   if array_element_family(encoded.clone())!=28 {return BoolValue::Value(false);};
   let restored=array_element_to_path(encoded);
   let mut same=false;
   if let PathValue::Value(a)=original {if let PathValue::Value(b)=restored {same=a.points.len()==b.points.len() && a.points[0]==b.points[0];};};
   if same==false {return BoolValue::Value(false);};
   let absent=array_element_to_path(array_element_from_path(PathValue::Null));
   let mut correct_null=false;if let PathValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_path(array_element_from_path(PathValue::Unknown));
   let mut correct_unknown=false;if let PathValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_path(array_element_from_path(PathValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let PathValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==29 {
   let original=polygon_from_text(make_text_value("((0,0),(1,0),(0,1))"));
   let encoded=array_element_from_polygon(original.clone());
   if array_element_family(encoded.clone())!=29 {return BoolValue::Value(false);};
   let restored=array_element_to_polygon(encoded);
   let mut same=false;
   if let PolygonValue::Value(a)=original {if let PolygonValue::Value(b)=restored {same=a.points.len()==b.points.len() && a.points[0]==b.points[0];};};
   if same==false {return BoolValue::Value(false);};
   let absent=array_element_to_polygon(array_element_from_polygon(PolygonValue::Null));
   let mut correct_null=false;if let PolygonValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_polygon(array_element_from_polygon(PolygonValue::Unknown));
   let mut correct_unknown=false;if let PolygonValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_polygon(array_element_from_polygon(PolygonValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let PolygonValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==30 {
   let original=make_circle_bits(0i64,0i64,4607182418800017408i64);
   let encoded=array_element_from_circle(original.clone());
   if array_element_family(encoded.clone())!=30 {return BoolValue::Value(false);};
   let restored=array_element_to_circle(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_circle(array_element_from_circle(CircleValue::Null));
   let mut correct_null=false;if let CircleValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_circle(array_element_from_circle(CircleValue::Unknown));
   let mut correct_unknown=false;if let CircleValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_circle(array_element_from_circle(CircleValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let CircleValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==31 {
   let original=make_money_value(-9007199254740993i64);
   let encoded=array_element_from_money(original.clone());
   if array_element_family(encoded.clone())!=31 {return BoolValue::Value(false);};
   let restored=array_element_to_money(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_money(array_element_from_money(MoneyValue::Null));
   let mut correct_null=false;if let MoneyValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_money(array_element_from_money(MoneyValue::Unknown));
   let mut correct_unknown=false;if let MoneyValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_money(array_element_from_money(MoneyValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let MoneyValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==32 {
   let original=make_internal_char_value(255);
   let encoded=array_element_from_internal_char(original.clone());
   if array_element_family(encoded.clone())!=32 {return BoolValue::Value(false);};
   let restored=array_element_to_internal_char(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_internal_char(array_element_from_internal_char(InternalCharValue::Null));
   let mut correct_null=false;if let InternalCharValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_internal_char(array_element_from_internal_char(InternalCharValue::Unknown));
   let mut correct_unknown=false;if let InternalCharValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_internal_char(array_element_from_internal_char(InternalCharValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let InternalCharValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==33 {
   let original=make_oid_value(4294967295i64);
   let encoded=array_element_from_oid(original.clone());
   if array_element_family(encoded.clone())!=33 {return BoolValue::Value(false);};
   let restored=array_element_to_oid(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_oid(array_element_from_oid(OidValue::Null));
   let mut correct_null=false;if let OidValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_oid(array_element_from_oid(OidValue::Unknown));
   let mut correct_unknown=false;if let OidValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_oid(array_element_from_oid(OidValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let OidValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==34 {
   let original=make_xid_value(4294967295i64);
   let encoded=array_element_from_xid(original.clone());
   if array_element_family(encoded.clone())!=34 {return BoolValue::Value(false);};
   let restored=array_element_to_xid(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_xid(array_element_from_xid(XidValue::Null));
   let mut correct_null=false;if let XidValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_xid(array_element_from_xid(XidValue::Unknown));
   let mut correct_unknown=false;if let XidValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_xid(array_element_from_xid(XidValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let XidValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==35 {
   let original=make_cid_value(4294967295i64);
   let encoded=array_element_from_cid(original.clone());
   if array_element_family(encoded.clone())!=35 {return BoolValue::Value(false);};
   let restored=array_element_to_cid(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_cid(array_element_from_cid(CidValue::Null));
   let mut correct_null=false;if let CidValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_cid(array_element_from_cid(CidValue::Unknown));
   let mut correct_unknown=false;if let CidValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_cid(array_element_from_cid(CidValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let CidValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==36 {
   let original=snapshot_from_text(make_text_value("10:20:12,15"));
   let encoded=array_element_from_snapshot(original.clone());
   if array_element_family(encoded.clone())!=36 {return BoolValue::Value(false);};
   let restored=array_element_to_snapshot(encoded);
   let mut same=false;
   same=snapshot_to_text(original)==snapshot_to_text(restored);
   if same==false {return BoolValue::Value(false);};
   let absent=array_element_to_snapshot(array_element_from_snapshot(SnapshotValue::Null));
   let mut correct_null=false;if let SnapshotValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_snapshot(array_element_from_snapshot(SnapshotValue::Unknown));
   let mut correct_unknown=false;if let SnapshotValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_snapshot(array_element_from_snapshot(SnapshotValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let SnapshotValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==37 {
   let original=make_xid8_bits(-1i64);
   let encoded=array_element_from_xid8(original.clone());
   if array_element_family(encoded.clone())!=37 {return BoolValue::Value(false);};
   let restored=array_element_to_xid8(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_xid8(array_element_from_xid8(Xid8Value::Null));
   let mut correct_null=false;if let Xid8Value::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_xid8(array_element_from_xid8(Xid8Value::Unknown));
   let mut correct_unknown=false;if let Xid8Value::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_xid8(array_element_from_xid8(Xid8Value::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let Xid8Value::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==38 {
   let original=make_pg_lsn_bits(-1i64);
   let encoded=array_element_from_pg_lsn(original.clone());
   if array_element_family(encoded.clone())!=38 {return BoolValue::Value(false);};
   let restored=array_element_to_pg_lsn(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_pg_lsn(array_element_from_pg_lsn(PgLsnValue::Null));
   let mut correct_null=false;if let PgLsnValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_pg_lsn(array_element_from_pg_lsn(PgLsnValue::Unknown));
   let mut correct_unknown=false;if let PgLsnValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_pg_lsn(array_element_from_pg_lsn(PgLsnValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let PgLsnValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==39 {
   let original=make_tid_parts(4294967295i64,65535);
   let encoded=array_element_from_tid(original.clone());
   if array_element_family(encoded.clone())!=39 {return BoolValue::Value(false);};
   let restored=array_element_to_tid(encoded);
   if restored!=original {return BoolValue::Value(false);};
   let absent=array_element_to_tid(array_element_from_tid(TidValue::Null));
   let mut correct_null=false;if let TidValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_tid(array_element_from_tid(TidValue::Unknown));
   let mut correct_unknown=false;if let TidValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_tid(array_element_from_tid(TidValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let TidValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
  if kind==40 {
   let original=jsonpath_from_coerced_source_utf8(make_text_value("$.a[0]"));
   let encoded=array_element_from_jsonpath(original.clone());
   if array_element_family(encoded.clone())!=40 {return BoolValue::Value(false);};
   let restored=array_element_to_jsonpath(encoded);
   let mut same=false;
   same=jsonpath_to_text(original)==jsonpath_to_text(restored);
   if same==false {return BoolValue::Value(false);};
   let absent=array_element_to_jsonpath(array_element_from_jsonpath(JsonpathValue::Null));
   let mut correct_null=false;if let JsonpathValue::Null=absent {correct_null=true;};if correct_null==false {return BoolValue::Value(false);};
   let unknown=array_element_to_jsonpath(array_element_from_jsonpath(JsonpathValue::Unknown));
   let mut correct_unknown=false;if let JsonpathValue::Unknown=unknown {correct_unknown=true;};if correct_unknown==false {return BoolValue::Value(false);};
   let failure=array_element_to_jsonpath(array_element_from_jsonpath(JsonpathValue::Error(make_sql_error(3452558))));
   let mut correct_error=false;if let JsonpathValue::Error(error)=failure {correct_error=error.state==3452558;};if correct_error==false {return BoolValue::Value(false);};
   return BoolValue::Value(true);
  };
 };
 BoolValue::Unknown
}
`

const ownershipProbe = String.raw`
fn array_fixture_state(input:ArrayValue)->i32 {
 if let ArrayValue::Unknown=input {return 0;};if let ArrayValue::Null=input {return 1;};
 if let ArrayValue::Error(_)=input {return 2;};3
}
fn array_fixture_element_state(input:ArrayElement)->i32 {
 if let ArrayElement::Unknown=input {return 0;};if let ArrayElement::Null=input {return 1;};
 if let ArrayElement::Error(_)=input {return 2;};3
}
fn array_fixture_error(input:ArrayValue)->u32 {
 if let ArrayValue::Error(error)=input {return error.state;};0
}
pub fn array_state_probe()->BoolValue {
 let stored=array_element_from_jsonpath(JsonpathValue::StoredText("$.a".to_owned()));
 if array_element_family(stored.clone())!=40 {return BoolValue::Value(false);};
 let recovered=array_element_to_jsonpath(stored);
 let mut retained=false;
 if let JsonpathValue::StoredText(text)=recovered {retained=text=="$.a";};
 if retained==false {return BoolValue::Value(false);};
 let mut builder=make_array_arguments("public.first",2);
 builder=append_array_dimension(builder,-2,2);
 builder=append_array_argument(builder,ArrayElement::Int4(10));
 builder=append_array_argument(builder,ArrayElement::Unknown);
 let input=finish_array_arguments(builder);
 if sql__pg_catalog__cardinality__m1rn(input.clone())!=Int4Value::Value(2) {return BoolValue::Value(false);};
 if array_is_null(input.clone())!=BoolValue::Value(false) {return BoolValue::Value(false);};
 if array_element_to_int4(array_flat_element(input.clone(),Int4Value::Value(0)))!=Int4Value::Value(10) {return BoolValue::Value(false);};
 if array_fixture_element_state(array_flat_element(input.clone(),Int4Value::Value(1)))!=0 {return BoolValue::Value(false);};
 if array_fixture_element_state(array_flat_element(input.clone(),Int4Value::Value(2)))!=1 {return BoolValue::Value(false);};
 if array_fixture_element_state(array_flat_element(input.clone(),Int4Value::Value(-1)))!=1 {return BoolValue::Value(false);};
 if array_fixture_state(array_from_coerced_value(input.clone(),"public.first",2))!=3 {return BoolValue::Value(false);};
 if array_fixture_state(array_from_coerced_value(input.clone(),"public.other",2))!=0 {return BoolValue::Value(false);};
 if array_fixture_state(array_from_coerced_value(input,"public.first",3))!=0 {return BoolValue::Value(false);};
 let mut mixed=make_array_arguments("public.first",2);
 mixed=append_array_dimension(mixed,1,1);mixed=append_array_argument(mixed,ArrayElement::Text("x".to_owned()));
 if array_fixture_state(finish_array_arguments(mixed))!=0 {return BoolValue::Value(false);};
 if array_fixture_state(finish_array_arguments(make_array_arguments("",2)))!=0 {return BoolValue::Value(false);};
 if array_fixture_state(finish_array_arguments(make_array_arguments("public.first",41)))!=3 {return BoolValue::Value(false);};
 if array_fixture_state(finish_array_arguments(make_array_arguments("public.first",42)))!=3 {return BoolValue::Value(false);};
 if array_fixture_state(finish_array_arguments(make_array_arguments("public.first",43)))!=3 {return BoolValue::Value(false);};
 if array_fixture_state(finish_array_arguments(make_array_arguments("public.first",44)))!=3 {return BoolValue::Value(false);};
 let error=make_sql_error(3452582);let other=make_sql_error(3452547);
 let prior=ArrayArguments::Error(error);let later=append_array_argument(prior,ArrayElement::Error(other));
 if array_fixture_error(finish_array_arguments(later))!=3452582 {return BoolValue::Value(false);};
 let deferred=append_array_argument(ArrayArguments::Unknown,ArrayElement::Error(other));
 if array_fixture_error(finish_array_arguments(deferred))!=3452547 {return BoolValue::Value(false);};
 if sql__pg_catalog__array_length__pebh(ArrayValue::Unknown,Int4Value::Null)!=Int4Value::Null {return BoolValue::Value(false);};
 if sql__pg_catalog__array_length__pebh(ArrayValue::Null,Int4Value::Unknown)!=Int4Value::Null {return BoolValue::Value(false);};
 if sql__pg_catalog__array_length__pebh(ArrayValue::Error(error),Int4Value::Null)!=Int4Value::Error(error) {return BoolValue::Value(false);};
 if sql__pg_catalog__array_lower__3uq2(ArrayValue::Unknown,Int4Value::Error(other))!=Int4Value::Error(other) {return BoolValue::Value(false);};
 if array_fixture_element_state(array_flat_element(ArrayValue::Unknown,Int4Value::Null))!=1 {return BoolValue::Value(false);};
 if array_fixture_element_state(array_flat_element(ArrayValue::Null,Int4Value::Error(error)))!=2 {return BoolValue::Value(false);};
 if array_fixture_error(array_from_case_guard(CheckOutcome::Error(error)))!=3452582 {return BoolValue::Value(false);};
 if array_fixture_state(array_from_case_guard(CheckOutcome::Null))!=0 {return BoolValue::Value(false);};
 if array_element_to_float4(array_element_from_float4(Float4Value::UnspecifiedNan))!=Float4Value::UnspecifiedNan {return BoolValue::Value(false);};
 if array_element_to_float8(array_element_from_float8(Float8Value::UnspecifiedNan))!=Float8Value::UnspecifiedNan {return BoolValue::Value(false);};
 if array_element_to_bytea(array_element_from_bytea(ByteaValue::Unspecified(17)))!=ByteaValue::Unspecified(17) {return BoolValue::Value(false);};
 if array_element_to_box(array_element_from_box(BoxValue::NonNull))!=BoxValue::NonNull {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
fn array_fixture_storage(input:ArrayElement)->usize {
 if let ArrayElement::Numeric(value)=input {let chars:Vec<char>=value.chars().collect();return chars.len();};
 if let ArrayElement::Text(value)=input {let chars:Vec<char>=value.chars().collect();return chars.len();};
 if let ArrayElement::Bytea(value)=input {let chars:Vec<char>=value.chars().collect();return chars.len();};
 if let ArrayElement::Bit(value)=input {let chars:Vec<char>=value.chars().collect();return chars.len();};
 if let ArrayElement::Json(value)=input {let chars:Vec<char>=value.source.chars().collect();return chars.len();};
 if let ArrayElement::Jsonb(value)=input {return value.characters.len();};
 if let ArrayElement::Jsonpath(value)=input {return value.characters.len();};
 if let ArrayElement::Snapshot(value)=input {return value.xip.len();};
 if let ArrayElement::Path(value)=input {return value.points.len();};
 if let ArrayElement::Polygon(value)=input {return value.points.len();};
 0
}
fn array_fixture_head(input:ArrayElement)->i64 {
 if let ArrayElement::Jsonb(value)=input {if value.characters.len()>0 {let code=value.characters[0] as i32;return code as i64;};return 0i64;};
 if let ArrayElement::Jsonpath(value)=input {if value.characters.len()>0 {let code=value.characters[0] as i32;return code as i64;};return 0i64;};
 if let ArrayElement::Snapshot(value)=input {if value.xip.len()>0 {return value.xip[0].bits;};return 0i64;};
 if let ArrayElement::Path(value)=input {if value.points.len()>0 {return value.points[0].x;};return 0i64;};
 if let ArrayElement::Polygon(value)=input {if value.points.len()>0 {return value.points[0].x;};return 0i64;};
 0i64
}
fn array_fixture_extend(input:ArrayElement)->ArrayElement {
 if let ArrayElement::Numeric(value)=input {let mut text=value;text.push('0');return ArrayElement::Numeric(text);};
 if let ArrayElement::Text(value)=input {let mut text=value;text.push('X');return ArrayElement::Text(text);};
 if let ArrayElement::Bytea(value)=input {let mut text=value;text.push_str("00");return ArrayElement::Bytea(text);};
 if let ArrayElement::Bit(value)=input {let mut text=value;text.push('1');return ArrayElement::Bit(text);};
 if let ArrayElement::Json(value)=input {let mut text=value.source;text.push(' ');return ArrayElement::Json(JsonPayload{source:text,kind:value.kind,depth:value.depth});};
 if let ArrayElement::Jsonb(value)=input {let mut chars=value.characters;if chars.len()>0 {chars[0]='Z';};chars.push('X');return ArrayElement::Jsonb(JsonbPayload{characters:chars,nodes:value.nodes,root:value.root});};
 if let ArrayElement::Jsonpath(value)=input {let mut chars=value.characters;if chars.len()>0 {chars[0]='Z';};chars.push('X');return ArrayElement::Jsonpath(JsonpathPayload{characters:chars,nodes:value.nodes,root:value.root,lax:value.lax});};
 if let ArrayElement::Snapshot(value)=input {let mut xip=value.xip;xip[0]=SnapshotXid{bits:13i64};xip.push(SnapshotXid{bits:17i64});return ArrayElement::Snapshot(SnapshotPayload{xmin:value.xmin,xmax:value.xmax,xip:xip});};
 if let ArrayElement::Path(value)=input {let mut points=value.points;points[0]=PointPayload{x:4602678819172646912i64,y:0i64,wire_known:true};points.push(PointPayload{x:0i64,y:0i64,wire_known:true});return ArrayElement::Path(PathPayload{closed:value.closed,points:points});};
 if let ArrayElement::Polygon(value)=input {let mut points=value.points;points[0]=PointPayload{x:4602678819172646912i64,y:0i64,wire_known:true};points.push(PointPayload{x:0i64,y:0i64,wire_known:true});return ArrayElement::Polygon(PolygonPayload{bounds:value.bounds,points:points});};
 input
}
`

const probe = `
fn array_fixture_number(value:&JsonbPayload,index:usize)->i32 {
 let node=value.nodes[index];let mut text=String::new();let mut position=node.text_start;
 while position<node.text_end {text.push(value.characters[position]);position+=1;}
 let number=sql__pg_catalog__int4__z4rh(make_numeric_value(text.as_str()));
 if let Int4Value::Value(result)=number {return result;};0
}
fn array_fixture(shape:TextValue,count:Int4Value,family:Int4Value)->ArrayValue {
 if let TextValue::Error(error)=shape {return ArrayValue::Error(error);};
 if let Int4Value::Error(error)=count {return ArrayValue::Error(error);};
 if let Int4Value::Error(error)=family {return ArrayValue::Error(error);};
 if let TextValue::Null=shape {return ArrayValue::Null;};
 let parsed=jsonb_from_text(shape);
 if let JsonbValue::Value(value)=parsed {
  if let Int4Value::Value(size)=count {
   if let Int4Value::Value(kind)=family {
    let mut builder=make_array_arguments("public.array_element",kind);
    let mut dimension=value.nodes[value.root].child;
    while dimension>0 {
     let first=value.nodes[dimension].child;let second=value.nodes[first].next;
     builder=append_array_dimension(builder,array_fixture_number(&value,first),array_fixture_number(&value,second));
     dimension=value.nodes[dimension].next;
    }
    let mut index:i32=0;
    while index<size {
     let mut element=array_fixture_element(kind);
     if index%2==1 {element=ArrayElement::Null;};
     builder=append_array_argument(builder,element);index=index+1;
    }
    return finish_array_arguments(builder);
   };
  };
 };
 ArrayValue::Unknown
}
pub fn array_metadata_probe(shape:TextValue,count:Int4Value,family:Int4Value,dimension:Int4Value,expected:TextValue,mode:i32)->BoolValue {
 let input=array_fixture(shape,count,family);let mut actual=TextValue::Unknown;
 if mode==5 {actual=sql__pg_catalog__array_dims__01ex(input);}
 else if mode==6 {return array_is_null(input);}
 else {
  let mut number=Int4Value::Unknown;
  if mode==0 {number=sql__pg_catalog__cardinality__m1rn(input);}
  else if mode==1 {number=sql__pg_catalog__array_ndims__8wu3(input);}
  else if mode==2 {number=sql__pg_catalog__array_length__pebh(input,dimension);}
  else if mode==3 {number=sql__pg_catalog__array_lower__3uq2(input,dimension);}
  else if mode==4 {number=sql__pg_catalog__array_upper__lnz3(input,dimension);};
  actual=int4_to_text(number);
 };
 if let TextValue::Error(error)=actual {return BoolValue::Error(error);};
 if let TextValue::Unknown=actual {return BoolValue::Unknown;};
 if let TextValue::Null=actual {if let TextValue::Null=expected {return BoolValue::Value(true);};return BoolValue::Value(false);};
 sql__pg_catalog__texteq__aet8(actual,expected)
}
pub fn array_ownership_probe(shape:TextValue,count:Int4Value,family:Int4Value,dimension:Int4Value,expected:TextValue)->BoolValue {
 let input=array_fixture(shape,count,family);let saved=input.clone();
 if let ArrayValue::Value(value)=input {
  if value.elements.len()<1 {return BoolValue::Value(true);};
  let first=value.elements[0].clone();let size=array_fixture_storage(first.clone());let head=array_fixture_head(first.clone());
  let extended=array_fixture_extend(first.clone());let changed_size=array_fixture_storage(extended.clone());
  if size>0 && changed_size<=size {return BoolValue::Value(false);};
  let mut elements=value.elements;
  elements[0]=extended;
  let changed=ArrayValue::Value(ArrayPayload{null_bitmap:BoolValue::Unknown,element_type:value.element_type,element_kind:value.element_kind,dimensions:value.dimensions,elements:elements});
  let original=array_flat_element(saved.clone(),Int4Value::Value(0));
  let replacement=array_flat_element(changed,Int4Value::Value(0));
  if let ArrayValue::Value(prior)=saved {
   return BoolValue::Value(array_element_family(original.clone())==array_element_family(first) && array_fixture_storage(original.clone())==size && array_fixture_head(original)==head && array_fixture_storage(replacement)==changed_size && prior.elements.len()>0 && prior.element_type=="public.array_element".to_owned());
  };
 };
 BoolValue::Unknown
}
`

it('owns typed flattened array values, bounds, NULL elements and metadata in every target before SQL admission', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-values-'))
  const value = (value: string | number): Input => ({ kind: 'Value', value })
  const modes = [
    'cardinality',
    'array_ndims',
    'array_length',
    'array_lower',
    'array_upper',
    'array_dims',
    'nullness',
    'ownership',
    'carriers',
    'states',
  ]
  const entries = modes.map((constraint) =>
    checkRustEntryName({ schema: 'public', kind: 'table', owner: 'array_values', constraint }),
  )
  const evaluatorSource = entries
    .map(
      (
        entry,
        index,
      ) => `pub fn ${entry}(shape:TextValue,count:Int4Value,family:Int4Value,dimension:Int4Value,expected:TextValue)->CheckOutcome {
 let result=${index === 7 ? 'array_ownership_probe(shape,count,family,dimension,expected)' : index === 8 ? 'array_carrier_probe(family)' : index === 9 ? 'array_state_probe()' : `array_metadata_probe(shape,count,family,dimension,expected,${index})`};check_from_bool(result)
}`,
    )
    .join('\n')
  try {
    await pg.exec('CREATE TYPE empty_record_member AS (value integer)')
    expect(
      (await pg.query('SELECT cardinality(ARRAY[]::empty_record_member[]) AS value')).rows,
    ).toEqual([{ value: 0 }])
    const source = assembleCheckRust({
      source: evaluatorSource,
      callables: ['sql__pg_catalog__cardinality__m1rn'],
    })
    expect(source.modules.some((module) => module.name === 'regex_engine')).toBe(false)
    source.modules
      .find((module) => module.name === 'pg_catalog')!
      .files.push({ path: 'test/array_values.rs', source: probe + carrierProbe + ownershipProbe })
    const inputs = ['shape', 'count', 'family', 'dimension', 'expected'].map((name) => ({
      name,
      rustName: name,
      type: name === 'shape' || name === 'expected' ? 'pg_catalog.text' : 'pg_catalog.int4',
      rustType: name === 'shape' || name === 'expected' ? 'TextValue' : 'Int4Value',
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: entries.map((entryName) => ({ kind: 'supported', entryName, inputs })),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    fixtures.push({
      name: 'states',
      row: {
        shape: value('[]'),
        count: value(0),
        family: value(2),
        dimension: value(1),
        expected: value(''),
      },
      expected: { kind: 'True' },
    })
    const shapes = [
      [],
      [[1, 1]],
      [[0, 3]],
      [[-3, 2]],
      [
        [1, 2],
        [-1, 3],
      ],
      [
        [0, 1],
        [1, 2],
        [-7, 2],
      ],
      [[-2147483648, 1]],
      [[2147483646, 1]],
      [
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
      ],
    ]
    for (const shape of shapes) {
      const count = shape.length ? shape.reduce((total, [, length]) => total * length!, 1) : 0
      const bounds = shape
        .map(([lower, length]) => '[' + lower + ':' + (lower! + length! - 1) + ']')
        .join('')
      const sql = shape.length
        ? `array_fill(NULL::integer,ARRAY[${shape.map(([, length]) => length).join(',')}],ARRAY[${shape.map(([lower]) => lower).join(',')}])`
        : `'{}'::integer[]`
      for (const dimension of [-2147483648, -1, 0, 1, 2, 3, 6, 7, 2147483647])
        for (const [mode, name] of modes.slice(0, 6).entries()) {
          const call = name + '(' + sql + ([2, 3, 4].includes(mode) ? ',' + dimension : '') + ')'
          const output = (
            await pg.query<{ value: string | null }>('SELECT (' + call + ')::text AS value')
          ).rows[0]!.value
          references.push({ shape, bounds, dimension, call, output })
          for (const family of Array.from({ length: 40 }, (_, index) => index + 1)) {
            const row: Row = {
              shape: value(JSON.stringify(shape)),
              count: value(count),
              family: value(family),
              dimension: value(dimension),
              expected: output === null ? { kind: 'Null' } : value(output),
            }
            fixtures.push({ name, row, expected: { kind: 'True' } })
          }
        }
      for (const family of Array.from({ length: 40 }, (_, index) => index + 1)) {
        const row: Row = {
          shape: value(JSON.stringify(shape)),
          count: value(count),
          family: value(family),
          dimension: value(1),
          expected: value(''),
        }
        fixtures.push(
          { name: 'ownership', row, expected: { kind: 'True' } },
          { name: 'nullness', row, expected: { kind: 'False' } },
        )
      }
    }
    for (const family of Array.from({ length: 40 }, (_, index) => index + 1))
      fixtures.push({
        name: 'carriers',
        row: {
          shape: value('[]'),
          count: value(0),
          family: value(family),
          dimension: value(1),
          expected: value(''),
        },
        expected: { kind: 'True' },
      })
    for (const shape of [
      [[1, 0]],
      [[1, -1]],
      [[2147483647, 1]],
      [[2147483646, 2]],
      Array.from({ length: 7 }, () => [1, 1]),
      [
        [1, 65536],
        [1, 65536],
      ],
    ])
      for (const name of modes.slice(0, 7))
        fixtures.push({
          name,
          row: {
            shape: value(JSON.stringify(shape)),
            count: value(0),
            family: value(2),
            dimension: value(1),
            expected: value(''),
          },
          expected: { kind: 'Unknown' },
        })
    for (const shape of ['[]', '[[1,2]]'])
      for (const count of [1, 3])
        fixtures.push({
          name: 'cardinality',
          row: {
            shape: value(shape),
            count: value(count),
            family: value(2),
            dimension: value(1),
            expected: value(''),
          },
          expected: { kind: 'Unknown' },
        })
    for (const name of modes.slice(0, 7))
      for (const input of [
        { kind: 'Null' },
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[]) {
        fixtures.push({
          name,
          row: {
            shape: input,
            count: value(0),
            family: value(2),
            dimension: value(1),
            expected: { kind: 'Null' },
          },
          expected:
            input.kind === 'Error'
              ? { kind: 'Error', value: input.value }
              : input.kind === 'Unknown'
                ? { kind: 'Unknown' }
                : { kind: 'True' },
        })
      }
    await mkdir('artifacts/array-values', { recursive: true })
    await writeFile(
      'artifacts/array-values/fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-values/references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(directory, 'arrayvaluesparity', group, modes, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
