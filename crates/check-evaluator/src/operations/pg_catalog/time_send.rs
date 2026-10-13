pub fn sql__pg_catalog__time_send__0qc6(input: TimeValue) -> ByteaValue {
if let TimeValue::Error(error) = input { return ByteaValue::Error(error); }
if input == TimeValue::Null { return ByteaValue::Null; }
if let TimeValue::Value(value) = input {
let part_0 = binary_send_bits(Int8Value::Value(value), 8);
let output = part_0;
return output;
}
ByteaValue::Unknown
}
pub fn sql__pg_catalog__timetz_send__r9py(input: TimetzValue) -> ByteaValue {
if let TimetzValue::Error(error) = input { return ByteaValue::Error(error); }
if input == TimetzValue::Null { return ByteaValue::Null; }
if let TimetzValue::Value(value) = input {
let part_0 = binary_send_bits(Int8Value::Value(value.time), 8);
let part_1 = binary_send_bits(Int8Value::Value(value.zone as i64), 4);
let mut output = part_0;
output = sql__pg_catalog__byteacat__zitv(output, part_1);
return output;
}
ByteaValue::Unknown
}
pub fn sql__pg_catalog__interval_send__jxgl(input: IntervalValue) -> ByteaValue {
if let IntervalValue::Error(error) = input { return ByteaValue::Error(error); }
if input == IntervalValue::Null { return ByteaValue::Null; }
if let IntervalValue::Value(value) = input {
let part_0 = binary_send_bits(Int8Value::Value(value.time), 8);
let part_1 = binary_send_bits(Int8Value::Value(value.days as i64), 4);
let part_2 = binary_send_bits(Int8Value::Value(value.months as i64), 4);
let mut output = part_0;
output = sql__pg_catalog__byteacat__zitv(output, part_1);
output = sql__pg_catalog__byteacat__zitv(output, part_2);
return output;
}
ByteaValue::Unknown
}
