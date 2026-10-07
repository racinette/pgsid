pub fn sql__pg_catalog__date_cmp__u18z(left: DateValue, right: DateValue) -> Int4Value {
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let DateValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == DateValue::Null || right == DateValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return Int4Value::Value(temporal_compare(left_value as i64, right_value as i64));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__date_larger__xxhy(left: DateValue, right: DateValue) -> DateValue {
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return DateValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return DateValue::Unknown;
    }
    if left == DateValue::Null || right == DateValue::Null {
        return DateValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            if left_value > right_value {
                return DateValue::Value(left_value);
            }
            return DateValue::Value(right_value);
        }
    }
    DateValue::Unknown
}

pub fn sql__pg_catalog__date_smaller__e286(left: DateValue, right: DateValue) -> DateValue {
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return DateValue::Error(error);
    }
    if left == DateValue::Unknown || right == DateValue::Unknown {
        return DateValue::Unknown;
    }
    if left == DateValue::Null || right == DateValue::Null {
        return DateValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            if left_value < right_value {
                return DateValue::Value(left_value);
            }
            return DateValue::Value(right_value);
        }
    }
    DateValue::Unknown
}

pub fn sql__pg_catalog__hashdate__knfp(left: DateValue) -> Int4Value {
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if left == DateValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == DateValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        return sql__pg_catalog__hashint4__zr00(Int4Value::Value(left_value));
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashdateextended__863n(left: DateValue, right: Int8Value) -> Int8Value {
    if let DateValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == DateValue::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == DateValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return sql__pg_catalog__hashint4extended__xf6v(
                Int4Value::Value(left_value),
                Int8Value::Value(right_value),
            );
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__isfinite__2dqo(left: DateValue) -> BoolValue {
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if left == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        return BoolValue::Value(left_value != -2147483647 - 1 && left_value != 2147483647);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__isfinite__cdmf(left: TimestamptzValue) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        return BoolValue::Value(
            left_value != -9223372036854775808i64 && left_value != 9223372036854775807i64,
        );
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__isfinite__4zxx(left: TimestampValue) -> BoolValue {
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        return BoolValue::Value(
            left_value != -9223372036854775808i64 && left_value != 9223372036854775807i64,
        );
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamp_cmp__lpkm(
    left: TimestampValue,
    right: TimestampValue,
) -> Int4Value {
    if let TimestampValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return Int4Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return Int4Value::Value(temporal_compare(left_value, right_value));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timestamp_hash__71nv(left: TimestampValue) -> Int4Value {
    if let TimestampValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if left == TimestampValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimestampValue::Null {
        return Int4Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        return sql__pg_catalog__hashint8__3wid(Int8Value::Value(left_value));
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timestamp_hash_extended__xc4h(
    left: TimestampValue,
    right: Int8Value,
) -> Int8Value {
    if let TimestampValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == TimestampValue::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == TimestampValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return sql__pg_catalog__hashint8extended__frvh(
                Int8Value::Value(left_value),
                Int8Value::Value(right_value),
            );
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__timestamp_larger__utuv(
    left: TimestampValue,
    right: TimestampValue,
) -> TimestampValue {
    if let TimestampValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return TimestampValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return TimestampValue::Unknown;
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return TimestampValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            if left_value > right_value {
                return TimestampValue::Value(left_value);
            }
            return TimestampValue::Value(right_value);
        }
    }
    TimestampValue::Unknown
}

pub fn sql__pg_catalog__timestamp_smaller__5aln(
    left: TimestampValue,
    right: TimestampValue,
) -> TimestampValue {
    if let TimestampValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return TimestampValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return TimestampValue::Unknown;
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return TimestampValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            if left_value < right_value {
                return TimestampValue::Value(left_value);
            }
            return TimestampValue::Value(right_value);
        }
    }
    TimestampValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_cmp__ca0r(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> Int4Value {
    if let TimestamptzValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return Int4Value::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return Int4Value::Value(temporal_compare(left_value, right_value));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timestamptz_hash__usaa(left: TimestamptzValue) -> Int4Value {
    if let TimestamptzValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if left == TimestamptzValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimestamptzValue::Null {
        return Int4Value::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        return sql__pg_catalog__hashint8__3wid(Int8Value::Value(left_value));
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timestamptz_hash_extended__veri(
    left: TimestamptzValue,
    right: Int8Value,
) -> Int8Value {
    if let TimestamptzValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == TimestamptzValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return sql__pg_catalog__hashint8extended__frvh(
                Int8Value::Value(left_value),
                Int8Value::Value(right_value),
            );
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__timestamptz_larger__63cv(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> TimestamptzValue {
    if let TimestamptzValue::Error(error) = left {
        return TimestamptzValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return TimestamptzValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return TimestamptzValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            if left_value > right_value {
                return TimestamptzValue::Value(left_value);
            }
            return TimestamptzValue::Value(right_value);
        }
    }
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_smaller__lbk9(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> TimestamptzValue {
    if let TimestamptzValue::Error(error) = left {
        return TimestamptzValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return TimestamptzValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return TimestamptzValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            if left_value < right_value {
                return TimestamptzValue::Value(left_value);
            }
            return TimestamptzValue::Value(right_value);
        }
    }
    TimestamptzValue::Unknown
}
