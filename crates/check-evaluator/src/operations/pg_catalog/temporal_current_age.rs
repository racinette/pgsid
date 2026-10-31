pub fn sql__pg_catalog__age__0wjc(input: TimestampValue) -> IntervalValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = input { unresolved_flavor = 1; };
    if let TimestampValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if input == TimestampValue::Null {
        return IntervalValue::Null;
    };
    if let TimestampValue::Value(value) = input {
        if value == -9223372036854775808i64 {
            return interval_infinity(1);
        };
        if value == 9223372036854775807i64 {
            return interval_infinity(-1);
        };
    };
    interval_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__age__62n0(input: TimestamptzValue) -> IntervalValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input { unresolved_flavor = 1; };
    if let TimestamptzValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if input == TimestamptzValue::Null {
        return IntervalValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 {
            return interval_infinity(1);
        };
        if value == 9223372036854775807i64 {
            return interval_infinity(-1);
        };
    };
    interval_unresolved(unresolved_flavor)
}
