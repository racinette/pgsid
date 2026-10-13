fn temporal_hash_time_input(input: TimeValue) -> Int8Value {
    if let TimeValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == TimeValue::Null {
        return Int8Value::Null;
    };
    if let TimeValue::Value(value) = input {
        return make_int8_value(value);
    };
    Int8Value::Unknown
}
fn temporal_hash_interval_input(input: IntervalValue) -> Int8Value {
    if let IntervalValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == IntervalValue::Null {
        return Int8Value::Null;
    };
    if let IntervalValue::Value(span) = input {
        let mut days = (span.months as i64) * 30i64 + (span.days as i64);
        let mut factor = 86400000000i64;
        let mut result = span.time;
        while factor > 0i64 {
            if factor % 2i64 != 0i64 {
                result = clock_wrapped_add(result, days);
            };
            days = clock_wrapped_add(days, days);
            factor = factor / 2i64;
        };
        return make_int8_value(result);
    };
    Int8Value::Unknown
}
fn temporal_hash_timetz(input: TimetzValue, seed: Int8Value) -> Int8Value {
    if let TimetzValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    };
    if input == TimetzValue::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    };
    if input == TimetzValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    };
    if let TimetzValue::Value(clock) = input {
        let time_hash = sql__pg_catalog__hashint8extended__frvh(make_int8_value(clock.time), seed);
        let zone_hash = sql__pg_catalog__hashint4extended__xf6v(make_int4_value(clock.zone), seed);
        return sql__pg_catalog__int8xor__4v56(time_hash, zone_hash);
    };
    Int8Value::Unknown
}
fn temporal_hash_narrow(input: Int8Value) -> Int4Value {
    if let Int8Value::Error(error) = input {
        return Int4Value::Error(error);
    };
    if input == Int8Value::Null {
        return Int4Value::Null;
    };
    if let Int8Value::Value(value) = input {
        return make_int4_value(value as i32);
    };
    Int4Value::Unknown
}
pub fn sql__pg_catalog__time_hash__yc41(input: TimeValue) -> Int4Value {
    sql__pg_catalog__hashint8__3wid(temporal_hash_time_input(input))
}
pub fn sql__pg_catalog__time_hash_extended__jsyf(input: TimeValue, seed: Int8Value) -> Int8Value {
    sql__pg_catalog__hashint8extended__frvh(temporal_hash_time_input(input), seed)
}
pub fn sql__pg_catalog__timetz_hash__e9xu(input: TimetzValue) -> Int4Value {
    temporal_hash_narrow(temporal_hash_timetz(input, make_int8_value(0i64)))
}
pub fn sql__pg_catalog__timetz_hash_extended__8tni(
    input: TimetzValue,
    seed: Int8Value,
) -> Int8Value {
    temporal_hash_timetz(input, seed)
}
pub fn sql__pg_catalog__interval_hash__1uw4(input: IntervalValue) -> Int4Value {
    sql__pg_catalog__hashint8__3wid(temporal_hash_interval_input(input))
}
pub fn sql__pg_catalog__interval_hash_extended__4x7k(
    input: IntervalValue,
    seed: Int8Value,
) -> Int8Value {
    sql__pg_catalog__hashint8extended__frvh(temporal_hash_interval_input(input), seed)
}
pub fn sql__pg_catalog__interval_pl_time__cdi6(
    amount: IntervalValue,
    input: TimeValue,
) -> TimeValue {
    if let IntervalValue::Error(error) = amount {
        return TimeValue::Error(error);
    };
    sql__pg_catalog__time_pl_interval__osxy(input, amount)
}
pub fn sql__pg_catalog__interval_pl_timetz__0g00(
    amount: IntervalValue,
    input: TimetzValue,
) -> TimetzValue {
    if let IntervalValue::Error(error) = amount {
        return TimetzValue::Error(error);
    };
    sql__pg_catalog__timetz_pl_interval__wmqy(input, amount)
}
