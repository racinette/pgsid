const CLOCK_RANGE: u32 = 3452552;
fn interval_infinity(sign: i32) -> IntervalValue {
    if sign < 0 {
        return make_interval_value(-2147483647 - 1, -2147483647 - 1, -9223372036854775808i64);
    }
    make_interval_value(2147483647, 2147483647, 9223372036854775807i64)
}
fn clock_wrapped_add(left: i64, right: i64) -> i64 {
    if right > 0i64 && left > 9223372036854775807i64 - right {
        return (left - (9223372036854775807i64 - right) - 1i64) + (-9223372036854775808i64);
    }
    if right < 0i64 && left < (-9223372036854775808i64) - right {
        return (left - ((-9223372036854775808i64) - right) + 9223372036854775807i64) + 1i64;
    }
    left + right
}
fn clock_wrapped_subtract(left: i64, right: i64) -> i64 {
    if right == (-9223372036854775808i64) {
        return clock_wrapped_add(clock_wrapped_add(left, 9223372036854775807i64), 1i64);
    }
    clock_wrapped_add(left, 0i64 - right)
}
fn clock_interval_value(left: TimeValue, right: IntervalValue, subtract: bool) -> TimeValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = left { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = right { unresolved_flavor = 1; };
    if let TimeValue::Error(error) = left {
        return TimeValue::Error(error);
    }
    if let IntervalValue::Error(error) = right {
        return TimeValue::Error(error);
    }
    if left == TimeValue::Unknown || right == IntervalValue::Unknown {
        return time_unresolved(unresolved_flavor);
    }
    if left == TimeValue::Null || right == IntervalValue::Null {
        return TimeValue::Null;
    }
    if let TimeValue::Value(clock) = left {
        if let IntervalValue::Value(span) = right {
            if interval_special(span) != 0 {
                return TimeValue::Error(make_sql_error(CLOCK_RANGE));
            }
            let mut result = clock_wrapped_add(clock, span.time);
            if subtract {
                result = clock_wrapped_subtract(clock, span.time);
            };
            result = result % 86400000000i64;
            if result < 0i64 {
                result = result + 86400000000i64;
            };
            return make_time_value(result);
        };
    };
    time_unresolved(unresolved_flavor)
}
fn interval_binary_value(
    left: IntervalValue,
    right: IntervalValue,
    subtract: bool,
) -> IntervalValue {
    let mut unresolved_flavor: i32 = 0;
    if let IntervalValue::Unknown = left { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = right { unresolved_flavor = 1; };
    if let IntervalValue::Error(error) = left {
        return IntervalValue::Error(error);
    }
    if let IntervalValue::Error(error) = right {
        return IntervalValue::Error(error);
    }
    if left == IntervalValue::Unknown || right == IntervalValue::Unknown {
        return interval_unresolved(unresolved_flavor);
    }
    if left == IntervalValue::Null || right == IntervalValue::Null {
        return IntervalValue::Null;
    }
    if let IntervalValue::Value(a) = left {
        if let IntervalValue::Value(b) = right {
            let a_special = interval_special(a);
            let mut b_special = interval_special(b);
            if subtract {
                b_special = 0 - b_special;
            };
            if a_special != 0 || b_special != 0 {
                if a_special != 0 && b_special != 0 && a_special != b_special {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                }
                if a_special != 0 {
                    return interval_infinity(a_special);
                }
                return interval_infinity(b_special);
            }
            let mut months = (a.months as i64) + (b.months as i64);
            let mut days = (a.days as i64) + (b.days as i64);
            if subtract {
                months = (a.months as i64) - (b.months as i64);
                days = (a.days as i64) - (b.days as i64);
            };
            if months < (-2147483648i64)
                || months > 2147483647i64
                || days < (-2147483648i64)
                || days > 2147483647i64
            {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            }
            if subtract {
                if (b.time > 0i64 && a.time < (-9223372036854775808i64) + b.time)
                    || (b.time < 0i64 && a.time > 9223372036854775807i64 + b.time)
                {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                }
            } else {
                if (b.time > 0i64 && a.time > 9223372036854775807i64 - b.time)
                    || (b.time < 0i64 && a.time < (-9223372036854775808i64) - b.time)
                {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                }
            };
            let mut micros = 0i64;
            if subtract {
                micros = a.time - b.time;
            } else {
                micros = a.time + b.time;
            };
            let result = IntervalPayload {
                months: months as i32,
                days: days as i32,
                time: micros,
            };
            if interval_special(result) != 0 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            }
            return IntervalValue::Value(result);
        };
    };
    interval_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__time_pl_interval__osxy(left: TimeValue, right: IntervalValue) -> TimeValue {
    clock_interval_value(left, right, false)
}

pub fn sql__pg_catalog__time_mi_interval__9t51(left: TimeValue, right: IntervalValue) -> TimeValue {
    clock_interval_value(left, right, true)
}

pub fn sql__pg_catalog__timetz_pl_interval__wmqy(
    left: TimetzValue,
    right: IntervalValue,
) -> TimetzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimetzValue::Unknown = left { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = right { unresolved_flavor = 1; };
    if let TimetzValue::Error(error) = left {
        return TimetzValue::Error(error);
    }
    if let IntervalValue::Error(error) = right {
        return TimetzValue::Error(error);
    }
    if left == TimetzValue::Unknown || right == IntervalValue::Unknown {
        return timetz_unresolved(unresolved_flavor);
    }
    if left == TimetzValue::Null || right == IntervalValue::Null {
        return TimetzValue::Null;
    }
    if let TimetzValue::Value(clock) = left {
        let result = clock_interval_value(make_time_value(clock.time), right, false);
        if let TimeValue::Error(error) = result {
            return TimetzValue::Error(error);
        }
        if let TimeValue::Value(time) = result {
            return make_timetz_value(time, clock.zone);
        };
    };
    timetz_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timetz_mi_interval__adb2(
    left: TimetzValue,
    right: IntervalValue,
) -> TimetzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimetzValue::Unknown = left { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = right { unresolved_flavor = 1; };
    if let TimetzValue::Error(error) = left {
        return TimetzValue::Error(error);
    }
    if let IntervalValue::Error(error) = right {
        return TimetzValue::Error(error);
    }
    if left == TimetzValue::Unknown || right == IntervalValue::Unknown {
        return timetz_unresolved(unresolved_flavor);
    }
    if left == TimetzValue::Null || right == IntervalValue::Null {
        return TimetzValue::Null;
    }
    if let TimetzValue::Value(clock) = left {
        let result = clock_interval_value(make_time_value(clock.time), right, true);
        if let TimeValue::Error(error) = result {
            return TimetzValue::Error(error);
        }
        if let TimeValue::Value(time) = result {
            return make_timetz_value(time, clock.zone);
        };
    };
    timetz_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__interval_pl__2mgc(
    left: IntervalValue,
    right: IntervalValue,
) -> IntervalValue {
    interval_binary_value(left, right, false)
}

pub fn sql__pg_catalog__interval_mi__ngfq(
    left: IntervalValue,
    right: IntervalValue,
) -> IntervalValue {
    interval_binary_value(left, right, true)
}

pub fn sql__pg_catalog__interval_um__k6pj(input: IntervalValue) -> IntervalValue {
    interval_binary_value(make_interval_value(0, 0, 0i64), input, true)
}

pub fn sql__pg_catalog__time_mi_time__qauq(left: TimeValue, right: TimeValue) -> IntervalValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = left { unresolved_flavor = 1; };
    if let TimeValue::Unknown = right { unresolved_flavor = 1; };
    if let TimeValue::Error(error) = left {
        return IntervalValue::Error(error);
    }
    if let TimeValue::Error(error) = right {
        return IntervalValue::Error(error);
    }
    if left == TimeValue::Unknown || right == TimeValue::Unknown {
        return interval_unresolved(unresolved_flavor);
    }
    if left == TimeValue::Null || right == TimeValue::Null {
        return IntervalValue::Null;
    }
    if let TimeValue::Value(a) = left {
        if let TimeValue::Value(b) = right {
            return make_interval_value(0, 0, a - b);
        };
    };
    interval_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__interval__39db(input: TimeValue) -> IntervalValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = input { unresolved_flavor = 1; };
    if let TimeValue::Error(error) = input {
        return IntervalValue::Error(error);
    }
    if input == TimeValue::Null {
        return IntervalValue::Null;
    }
    if let TimeValue::Value(clock) = input {
        return make_interval_value(0, 0, clock);
    }
    interval_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__time__3hf3(input: TimetzValue) -> TimeValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimetzValue::Unknown = input { unresolved_flavor = 1; };
    if let TimetzValue::Error(error) = input {
        return TimeValue::Error(error);
    }
    if input == TimetzValue::Null {
        return TimeValue::Null;
    }
    if let TimetzValue::Value(clock) = input {
        return make_time_value(clock.time);
    }
    time_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__time__akgc(input: IntervalValue) -> TimeValue {
    let mut unresolved_flavor: i32 = 0;
    if let IntervalValue::Unknown = input { unresolved_flavor = 1; };
    if let IntervalValue::Error(error) = input {
        return TimeValue::Error(error);
    }
    if input == IntervalValue::Null {
        return TimeValue::Null;
    }
    if let IntervalValue::Value(span) = input {
        if interval_special(span) != 0 {
            return TimeValue::Error(make_sql_error(CLOCK_RANGE));
        }
        let mut clock = span.time % 86400000000i64;
        if clock < 0i64 {
            clock = clock + 86400000000i64;
        };
        return make_time_value(clock);
    }
    time_unresolved(unresolved_flavor)
}
