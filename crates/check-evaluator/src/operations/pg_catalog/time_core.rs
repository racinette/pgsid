fn interval_special(value: IntervalPayload) -> i32 {
    if value.months == 2147483647
        && value.days == 2147483647
        && value.time == 9223372036854775807i64
    {
        return 1;
    }
    if value.months == (-2147483647 - 1)
        && value.days == (-2147483647 - 1)
        && value.time == (-9223372036854775808i64)
    {
        return -1;
    }
    0
}
fn clock_order(left: i64, right: i64) -> i32 {
    if left < right {
        return -1;
    }
    if left > right {
        return 1;
    }
    0
}
fn interval_order(left: IntervalPayload, right: IntervalPayload) -> i32 {
    let a_special = interval_special(left);
    let b_special = interval_special(right);
    if a_special != 0 || b_special != 0 {
        return clock_order(a_special as i64, b_special as i64);
    }
    let mut a_days = (left.months as i64) * 30i64 + (left.days as i64) + left.time / 86400000000i64;
    let mut b_days =
        (right.months as i64) * 30i64 + (right.days as i64) + right.time / 86400000000i64;
    let mut a_remainder = left.time % 86400000000i64;
    let mut b_remainder = right.time % 86400000000i64;
    if a_remainder < 0i64 {
        a_days = a_days - 1i64;
        a_remainder = a_remainder + 86400000000i64;
    };
    if b_remainder < 0i64 {
        b_days = b_days - 1i64;
        b_remainder = b_remainder + 86400000000i64;
    };
    let days = clock_order(a_days, b_days);
    if days != 0 {
        return days;
    }
    clock_order(a_remainder, b_remainder)
}
fn timetz_order(left: TimetzPayload, right: TimetzPayload) -> i32 {
    let a = left.time + (left.zone as i64) * 1000000i64;
    let b = right.time + (right.zone as i64) * 1000000i64;
    let utc = clock_order(a, b);
    if utc != 0 {
        return utc;
    }
    clock_order(left.zone as i64, right.zone as i64)
}

fn time_value_order(left: TimeValue, right: TimeValue) -> Int4Value {
    if let TimeValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimeValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TimeValue::Unknown || right == TimeValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimeValue::Null || right == TimeValue::Null {
        return Int4Value::Null;
    }
    if let TimeValue::Value(a) = left {
        if let TimeValue::Value(b) = right {
            return make_int4_value(clock_order(a, b));
        };
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__time_cmp__rxkq(left: TimeValue, right: TimeValue) -> Int4Value {
    time_value_order(left, right)
}

pub fn sql__pg_catalog__time_eq__6vbi(left: TimeValue, right: TimeValue) -> BoolValue {
    value_order_finish(time_value_order(left, right), 0)
}

pub fn sql__pg_catalog__time_ge__dsjr(left: TimeValue, right: TimeValue) -> BoolValue {
    value_order_finish(time_value_order(left, right), 5)
}

pub fn sql__pg_catalog__time_gt__sf2e(left: TimeValue, right: TimeValue) -> BoolValue {
    value_order_finish(time_value_order(left, right), 4)
}

pub fn sql__pg_catalog__time_larger__98xe(left: TimeValue, right: TimeValue) -> TimeValue {
    let order = time_value_order(left, right);
    if let Int4Value::Error(error) = order {
        return TimeValue::Error(error);
    }
    if order == Int4Value::Unknown {
        return TimeValue::Unknown;
    }
    if order == Int4Value::Null {
        return TimeValue::Null;
    }
    if let Int4Value::Value(value) = order {
        if value > 0 {
            return left;
        }
        return right;
    };
    TimeValue::Unknown
}

pub fn sql__pg_catalog__time_le__fpuk(left: TimeValue, right: TimeValue) -> BoolValue {
    value_order_finish(time_value_order(left, right), 3)
}

pub fn sql__pg_catalog__time_lt__bga9(left: TimeValue, right: TimeValue) -> BoolValue {
    value_order_finish(time_value_order(left, right), 2)
}

pub fn sql__pg_catalog__time_ne__1le4(left: TimeValue, right: TimeValue) -> BoolValue {
    value_order_finish(time_value_order(left, right), 1)
}

pub fn sql__pg_catalog__time_smaller__a0k2(left: TimeValue, right: TimeValue) -> TimeValue {
    let order = time_value_order(left, right);
    if let Int4Value::Error(error) = order {
        return TimeValue::Error(error);
    }
    if order == Int4Value::Unknown {
        return TimeValue::Unknown;
    }
    if order == Int4Value::Null {
        return TimeValue::Null;
    }
    if let Int4Value::Value(value) = order {
        if value < 0 {
            return left;
        }
        return right;
    };
    TimeValue::Unknown
}

fn timetz_value_order(left: TimetzValue, right: TimetzValue) -> Int4Value {
    if let TimetzValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TimetzValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TimetzValue::Unknown || right == TimetzValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TimetzValue::Null || right == TimetzValue::Null {
        return Int4Value::Null;
    }
    if let TimetzValue::Value(a) = left {
        if let TimetzValue::Value(b) = right {
            return make_int4_value(timetz_order(a, b));
        };
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timetz_cmp__wy50(left: TimetzValue, right: TimetzValue) -> Int4Value {
    timetz_value_order(left, right)
}

pub fn sql__pg_catalog__timetz_eq__h04s(left: TimetzValue, right: TimetzValue) -> BoolValue {
    value_order_finish(timetz_value_order(left, right), 0)
}

pub fn sql__pg_catalog__timetz_ge__wb7v(left: TimetzValue, right: TimetzValue) -> BoolValue {
    value_order_finish(timetz_value_order(left, right), 5)
}

pub fn sql__pg_catalog__timetz_gt__4zis(left: TimetzValue, right: TimetzValue) -> BoolValue {
    value_order_finish(timetz_value_order(left, right), 4)
}

pub fn sql__pg_catalog__timetz_larger__yvok(left: TimetzValue, right: TimetzValue) -> TimetzValue {
    let order = timetz_value_order(left, right);
    if let Int4Value::Error(error) = order {
        return TimetzValue::Error(error);
    }
    if order == Int4Value::Unknown {
        return TimetzValue::Unknown;
    }
    if order == Int4Value::Null {
        return TimetzValue::Null;
    }
    if let Int4Value::Value(value) = order {
        if value > 0 {
            return left;
        }
        return right;
    };
    TimetzValue::Unknown
}

pub fn sql__pg_catalog__timetz_le__a2hu(left: TimetzValue, right: TimetzValue) -> BoolValue {
    value_order_finish(timetz_value_order(left, right), 3)
}

pub fn sql__pg_catalog__timetz_lt__skyw(left: TimetzValue, right: TimetzValue) -> BoolValue {
    value_order_finish(timetz_value_order(left, right), 2)
}

pub fn sql__pg_catalog__timetz_ne__07by(left: TimetzValue, right: TimetzValue) -> BoolValue {
    value_order_finish(timetz_value_order(left, right), 1)
}

pub fn sql__pg_catalog__timetz_smaller__5wru(left: TimetzValue, right: TimetzValue) -> TimetzValue {
    let order = timetz_value_order(left, right);
    if let Int4Value::Error(error) = order {
        return TimetzValue::Error(error);
    }
    if order == Int4Value::Unknown {
        return TimetzValue::Unknown;
    }
    if order == Int4Value::Null {
        return TimetzValue::Null;
    }
    if let Int4Value::Value(value) = order {
        if value < 0 {
            return left;
        }
        return right;
    };
    TimetzValue::Unknown
}

fn interval_value_order(left: IntervalValue, right: IntervalValue) -> Int4Value {
    if let IntervalValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let IntervalValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == IntervalValue::Unknown || right == IntervalValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == IntervalValue::Null || right == IntervalValue::Null {
        return Int4Value::Null;
    }
    if let IntervalValue::Value(a) = left {
        if let IntervalValue::Value(b) = right {
            return make_int4_value(interval_order(a, b));
        };
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__interval_cmp__swxt(left: IntervalValue, right: IntervalValue) -> Int4Value {
    interval_value_order(left, right)
}

pub fn sql__pg_catalog__interval_eq__3wnh(left: IntervalValue, right: IntervalValue) -> BoolValue {
    value_order_finish(interval_value_order(left, right), 0)
}

pub fn sql__pg_catalog__interval_ge__j2eu(left: IntervalValue, right: IntervalValue) -> BoolValue {
    value_order_finish(interval_value_order(left, right), 5)
}

pub fn sql__pg_catalog__interval_gt__qbkh(left: IntervalValue, right: IntervalValue) -> BoolValue {
    value_order_finish(interval_value_order(left, right), 4)
}

pub fn sql__pg_catalog__interval_larger__vd9t(
    left: IntervalValue,
    right: IntervalValue,
) -> IntervalValue {
    let order = interval_value_order(left, right);
    if let Int4Value::Error(error) = order {
        return IntervalValue::Error(error);
    }
    if order == Int4Value::Unknown {
        return IntervalValue::Unknown;
    }
    if order == Int4Value::Null {
        return IntervalValue::Null;
    }
    if let Int4Value::Value(value) = order {
        if value > 0 {
            return left;
        }
        return right;
    };
    IntervalValue::Unknown
}

pub fn sql__pg_catalog__interval_le__ep4r(left: IntervalValue, right: IntervalValue) -> BoolValue {
    value_order_finish(interval_value_order(left, right), 3)
}

pub fn sql__pg_catalog__interval_lt__myly(left: IntervalValue, right: IntervalValue) -> BoolValue {
    value_order_finish(interval_value_order(left, right), 2)
}

pub fn sql__pg_catalog__interval_ne__a38a(left: IntervalValue, right: IntervalValue) -> BoolValue {
    value_order_finish(interval_value_order(left, right), 1)
}

pub fn sql__pg_catalog__interval_smaller__ns56(
    left: IntervalValue,
    right: IntervalValue,
) -> IntervalValue {
    let order = interval_value_order(left, right);
    if let Int4Value::Error(error) = order {
        return IntervalValue::Error(error);
    }
    if order == Int4Value::Unknown {
        return IntervalValue::Unknown;
    }
    if order == Int4Value::Null {
        return IntervalValue::Null;
    }
    if let Int4Value::Value(value) = order {
        if value < 0 {
            return left;
        }
        return right;
    };
    IntervalValue::Unknown
}
