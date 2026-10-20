fn range_subdiff_integer(left: Int8Value, right: Int8Value, seconds: bool) -> Float8Value {
    let first = integer_float8(left);
    let second = integer_float8(right);
    let result = sql__pg_catalog__float8mi__r1nu(first, second);
    if seconds {
        return sql__pg_catalog__float8div__kumj(result, make_float8_value(1000000.0f64));
    };
    result
}

fn range_subdiff_date(input: DateValue) -> Int8Value {
    if let DateValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == DateValue::Null {
        return Int8Value::Null;
    };
    if let DateValue::Value(value) = input {
        return Int8Value::Value(value as i64);
    };
    Int8Value::Unknown
}

fn range_subdiff_timestamp(input: TimestampValue) -> Int8Value {
    if let TimestampValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == TimestampValue::Null {
        return Int8Value::Null;
    };
    if let TimestampValue::Value(value) = input {
        return Int8Value::Value(value);
    };
    Int8Value::Unknown
}

fn range_subdiff_timestamptz(input: TimestamptzValue) -> Int8Value {
    if let TimestamptzValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == TimestamptzValue::Null {
        return Int8Value::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        return Int8Value::Value(value);
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int4range_subdiff__e24d(left: Int4Value, right: Int4Value) -> Float8Value {
    range_subdiff_integer(sql__pg_catalog__int8__mzac(left), sql__pg_catalog__int8__mzac(right), false)
}

pub fn sql__pg_catalog__int8range_subdiff__b2ct(left: Int8Value, right: Int8Value) -> Float8Value {
    range_subdiff_integer(left, right, false)
}

pub fn sql__pg_catalog__numrange_subdiff__wqu8(left: NumericValue, right: NumericValue) -> Float8Value {
    let difference = sql__pg_catalog__numeric_sub__ys09(left, right);
    sql__pg_catalog__float8__bkfn(difference)
}

pub fn sql__pg_catalog__daterange_subdiff__3xcy(left: DateValue, right: DateValue) -> Float8Value {
    range_subdiff_integer(range_subdiff_date(left), range_subdiff_date(right), false)
}

pub fn sql__pg_catalog__tsrange_subdiff__3mzs(left: TimestampValue, right: TimestampValue) -> Float8Value {
    range_subdiff_integer(range_subdiff_timestamp(left), range_subdiff_timestamp(right), true)
}

pub fn sql__pg_catalog__tstzrange_subdiff__oyoc(left: TimestamptzValue, right: TimestamptzValue) -> Float8Value {
    range_subdiff_integer(range_subdiff_timestamptz(left), range_subdiff_timestamptz(right), true)
}
