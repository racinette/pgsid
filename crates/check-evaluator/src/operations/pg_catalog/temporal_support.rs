pub fn sql__pg_catalog__date_cmp__u18z(left: DateValue, right: DateValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let DateValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return int4_unresolved(condition_flavor_13_4);
    }
    if left == DateValue::Null || right == DateValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        if let DateValue::Value(right_value) = right {
            return Int4Value::Value(temporal_compare(left_value as i64, right_value as i64));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_larger__xxhy(left: DateValue, right: DateValue) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return DateValue::Error(error);
    }
    let mut condition_flavor_39_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_39_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_39_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return date_unresolved(condition_flavor_39_4);
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
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_smaller__e286(left: DateValue, right: DateValue) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return DateValue::Error(error);
    }
    if let DateValue::Error(error) = right {
        return DateValue::Error(error);
    }
    let mut condition_flavor_68_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_68_4 < 1 { condition_flavor_68_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_68_4 = 2; }; if let DateValue::Unknown = right { if condition_flavor_68_4 < 1 { condition_flavor_68_4 = 1; }; }; if let DateValue::Unimplemented = right { condition_flavor_68_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == DateValue::Unknown || right == DateValue::Unimplemented) {
        return date_unresolved(condition_flavor_68_4);
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
    date_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashdate__knfp(left: DateValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_92_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_92_4 < 1 { condition_flavor_92_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_92_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) {
        return int4_unresolved(condition_flavor_92_4);
    }
    if left == DateValue::Null {
        return Int4Value::Null;
    }
    if let DateValue::Value(left_value) = left {
        return sql__pg_catalog__hashint4__zr00(Int4Value::Value(left_value));
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashdateextended__863n(left: DateValue, right: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_116_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_116_4 < 1 { condition_flavor_116_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_116_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_116_4 < 1 { condition_flavor_116_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_116_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_116_4);
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
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__isfinite__2dqo(left: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = left { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = left { unresolved_flavor = 2; };
    if let DateValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_140_4: i32 = unresolved_flavor; if let DateValue::Unknown = left { if condition_flavor_140_4 < 1 { condition_flavor_140_4 = 1; }; }; if let DateValue::Unimplemented = left { condition_flavor_140_4 = 2; }; if (left == DateValue::Unknown || left == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_140_4);
    }
    if left == DateValue::Null {
        return BoolValue::Null;
    }
    if let DateValue::Value(left_value) = left {
        return BoolValue::Value(left_value != -2147483647 - 1 && left_value != 2147483647);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__isfinite__cdmf(left: TimestamptzValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_159_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_159_4 < 1 { condition_flavor_159_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_159_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_159_4);
    }
    if left == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        return BoolValue::Value(
            left_value != -9223372036854775808i64 && left_value != 9223372036854775807i64,
        );
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__isfinite__4zxx(left: TimestampValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_180_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_180_4 < 1 { condition_flavor_180_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_180_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_180_4);
    }
    if left == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        return BoolValue::Value(
            left_value != -9223372036854775808i64 && left_value != 9223372036854775807i64,
        );
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_cmp__lpkm(
    left: TimestampValue,
    right: TimestampValue,
) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_209_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_209_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_209_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return int4_unresolved(condition_flavor_209_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return Int4Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return Int4Value::Value(temporal_compare(left_value, right_value));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_hash__71nv(left: TimestampValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_230_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_230_4 < 1 { condition_flavor_230_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_230_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) {
        return int4_unresolved(condition_flavor_230_4);
    }
    if left == TimestampValue::Null {
        return Int4Value::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        return sql__pg_catalog__hashint8__3wid(Int8Value::Value(left_value));
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_hash_extended__xc4h(
    left: TimestampValue,
    right: Int8Value,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_257_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_257_4 < 1 { condition_flavor_257_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_257_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_257_4 < 1 { condition_flavor_257_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_257_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_257_4);
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
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_larger__utuv(
    left: TimestampValue,
    right: TimestampValue,
) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return TimestampValue::Error(error);
    }
    let mut condition_flavor_289_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_289_4 < 1 { condition_flavor_289_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_289_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_289_4 < 1 { condition_flavor_289_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_289_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return timestamp_unresolved(condition_flavor_289_4);
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
    timestamp_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_smaller__5aln(
    left: TimestampValue,
    right: TimestampValue,
) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return TimestampValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return TimestampValue::Error(error);
    }
    let mut condition_flavor_321_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_321_4 < 1 { condition_flavor_321_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_321_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_321_4 < 1 { condition_flavor_321_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_321_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return timestamp_unresolved(condition_flavor_321_4);
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
    timestamp_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_cmp__ca0r(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_353_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_353_4 < 1 { condition_flavor_353_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_353_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_353_4 < 1 { condition_flavor_353_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_353_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return int4_unresolved(condition_flavor_353_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return Int4Value::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return Int4Value::Value(temporal_compare(left_value, right_value));
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_hash__usaa(left: TimestamptzValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_374_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_374_4 < 1 { condition_flavor_374_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_374_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) {
        return int4_unresolved(condition_flavor_374_4);
    }
    if left == TimestamptzValue::Null {
        return Int4Value::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        return sql__pg_catalog__hashint8__3wid(Int8Value::Value(left_value));
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_hash_extended__veri(
    left: TimestamptzValue,
    right: Int8Value,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_401_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_401_4 < 1 { condition_flavor_401_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_401_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_401_4 < 1 { condition_flavor_401_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_401_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_401_4);
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
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_larger__63cv(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return TimestamptzValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return TimestamptzValue::Error(error);
    }
    let mut condition_flavor_433_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_433_4 < 1 { condition_flavor_433_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_433_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_433_4 < 1 { condition_flavor_433_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_433_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return timestamptz_unresolved(condition_flavor_433_4);
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
    timestamptz_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_smaller__lbk9(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return TimestamptzValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return TimestamptzValue::Error(error);
    }
    let mut condition_flavor_465_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_465_4 < 1 { condition_flavor_465_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_465_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_465_4 < 1 { condition_flavor_465_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_465_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return timestamptz_unresolved(condition_flavor_465_4);
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
    timestamptz_unresolved(unresolved_flavor)
}
