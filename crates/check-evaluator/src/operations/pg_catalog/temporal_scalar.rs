pub fn sql__pg_catalog__date_part__g4hw(
    units: TextValue,
    input: DateValue,
    limit: i32,
    utf8: bool,
) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = units { unresolved_flavor = 1; };
    if let DateValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = units { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = units {
        return Float8Value::Error(error);
    };
    if let DateValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if input == DateValue::Null {
        return Float8Value::Null;
    };
    let timestamp = sql__pg_catalog__timestamp__swxj(input);
    if let TimestampValue::Error(error) = timestamp {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_25_4: i32 = unresolved_flavor; if let TextValue::Unknown = units { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let TextValue::Unimplemented = units { condition_flavor_25_4 = 2; }; if let DateValue::Unknown = input { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let DateValue::Unimplemented = input { condition_flavor_25_4 = 2; }; if (units == TextValue::Unknown || units == TextValue::Unimplemented) || (input == DateValue::Unknown || input == DateValue::Unimplemented) {
        return float8_unresolved(condition_flavor_25_4);
    };
    let clipped = name_from_text_context(units, limit, utf8);
    sql__pg_catalog__date_part__nzwd(clipped, timestamp)
}

pub fn sql__pg_catalog__to_timestamp__kymq(input: Float8Value) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = input { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if input == Float8Value::Null {
        return TimestamptzValue::Null;
    };
    let semantic = float8_semantic(input);
    if let Float8Value::Value(bits) = semantic {
        let seconds = float8_number(bits);
        if seconds != seconds {
            return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
        };
        let infinity = float8_number(9218868437227405312i64);
        if seconds == infinity {
            return TimestamptzValue::Value(9223372036854775807i64);
        };
        if seconds == -infinity {
            return TimestamptzValue::Value(-9223372036854775808i64);
        };
        if seconds < -210866803200.0f64 || seconds >= 9224318016000.0f64 {
            return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
        };
        let microseconds = (seconds - 946684800.0f64) * 1000000.0f64;
        let rounded = float8_integer(make_float8_value(microseconds));
        if let Int8Value::Value(value) = rounded {
            return make_timestamptz_value(value);
        };
    };
    let mut local_flavor_64_4: i32 = unresolved_flavor; if let Float8Value::Unknown = semantic { if local_flavor_64_4 < 1 { local_flavor_64_4 = 1; }; }; if let Float8Value::Unimplemented = semantic { local_flavor_64_4 = 2; }; timestamptz_unresolved(local_flavor_64_4)
}
