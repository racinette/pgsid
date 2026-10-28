pub fn sql__pg_catalog__date_part__g4hw(
    units: TextValue,
    input: DateValue,
    limit: i32,
    utf8: bool,
) -> Float8Value {
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
    if units == TextValue::Unknown || input == DateValue::Unknown {
        return Float8Value::Unknown;
    };
    let clipped = name_from_text_context(units, limit, utf8);
    sql__pg_catalog__date_part__nzwd(clipped, timestamp)
}

pub fn sql__pg_catalog__to_timestamp__kymq(input: Float8Value) -> TimestamptzValue {
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
    TimestamptzValue::Unknown
}
