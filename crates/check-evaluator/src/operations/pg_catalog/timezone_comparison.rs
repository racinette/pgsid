struct TimezoneComparison {
    value: Int4Value,
    unequal: bool,
}

fn timezone_comparison_result(value: Int4Value) -> TimezoneComparison {
    TimezoneComparison {
        value: value,
        unequal: false,
    }
}

fn timezone_comparison_finite(value: i64, instant: i64) -> i32 {
    if value < -211813488000000000i64 {
        if instant == -9223372036854775808i64 {
            return 1;
        };
        return -1;
    };
    if value >= 9223371331200000000i64 {
        if instant == 9223372036854775807i64 {
            return -1;
        };
        return 1;
    };
    temporal_compare(value, instant)
}

fn timezone_comparison_local(
    local: i64,
    instant: i64,
    session: &str,
    date: bool,
) -> TimezoneComparison {
    if instant == -9223372036854775808i64 {
        return timezone_comparison_result(make_int4_value(1));
    };
    if instant == 9223372036854775807i64 {
        return timezone_comparison_result(make_int4_value(-1));
    };
    let profile = session_timezone_profile(session, local, true);
    if profile.valid {
        return timezone_comparison_result(make_int4_value(timezone_comparison_finite(
            local - (profile.seconds as i64) * 1000000i64,
            instant,
        )));
    };
    let margin = 2147483648i64 * 1000000i64;
    if local >= -9223372036854775808i64 + margin && local <= 9223372036854775807i64 - margin {
        if instant < local - margin {
            return timezone_comparison_result(make_int4_value(1));
        };
        if instant > local + margin {
            return timezone_comparison_result(make_int4_value(-1));
        };
    };
    let mut local_second = local / 1000000i64;
    let mut local_fraction = local % 1000000i64;
    let mut instant_second = instant / 1000000i64;
    let mut instant_fraction = instant % 1000000i64;
    if local_fraction < 0i64 {
        local_second = local_second - 1i64;
        local_fraction = local_fraction + 1000000i64;
    };
    if instant_fraction < 0i64 {
        instant_second = instant_second - 1i64;
        instant_fraction = instant_fraction + 1000000i64;
    };
    let required = local_second - instant_second;
    let mut minimum = -2147483648i64;
    let mut maximum = 2147483647i64;
    if date {
        minimum = minimum + 1i64;
        maximum = maximum + 1i64;
    };
    TimezoneComparison {
        value: Int4Value::Unknown,
        unequal: local_fraction != instant_fraction
            || required < minimum
            || required > maximum
            || instant >= 9223371331200000000i64,
    }
}

fn timezone_compare_date(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> TimezoneComparison {
    if let DateValue::Error(error) = left {
        return timezone_comparison_result(Int4Value::Error(error));
    };
    if let TimestamptzValue::Error(error) = right {
        return timezone_comparison_result(Int4Value::Error(error));
    };
    if left == DateValue::Unknown || right == TimestamptzValue::Unknown {
        return timezone_comparison_result(Int4Value::Unknown);
    };
    if left == DateValue::Null || right == TimestamptzValue::Null {
        return timezone_comparison_result(Int4Value::Null);
    };
    if let DateValue::Value(day) = left {
        if let TimestamptzValue::Value(instant) = right {
            if day == -2147483647 - 1 {
                return timezone_comparison_result(make_int4_value(temporal_compare(
                    -9223372036854775808i64,
                    instant,
                )));
            };
            if day == 2147483647 {
                return timezone_comparison_result(make_int4_value(temporal_compare(
                    9223372036854775807i64,
                    instant,
                )));
            };
            if day >= 106751983 {
                if instant == 9223372036854775807i64 {
                    return timezone_comparison_result(make_int4_value(-1));
                };
                return timezone_comparison_result(make_int4_value(1));
            };
            return timezone_comparison_local(
                (day as i64) * 86400000000i64,
                instant,
                session,
                true,
            );
        };
    };
    timezone_comparison_result(Int4Value::Unknown)
}

fn timezone_compare_timestamp(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> TimezoneComparison {
    if let TimestampValue::Error(error) = left {
        return timezone_comparison_result(Int4Value::Error(error));
    };
    if let TimestamptzValue::Error(error) = right {
        return timezone_comparison_result(Int4Value::Error(error));
    };
    if left == TimestampValue::Unknown || right == TimestamptzValue::Unknown {
        return timezone_comparison_result(Int4Value::Unknown);
    };
    if left == TimestampValue::Null || right == TimestamptzValue::Null {
        return timezone_comparison_result(Int4Value::Null);
    };
    if let TimestampValue::Value(local) = left {
        if let TimestamptzValue::Value(instant) = right {
            if local == -9223372036854775808i64 || local == 9223372036854775807i64 {
                return timezone_comparison_result(make_int4_value(temporal_compare(
                    local, instant,
                )));
            };
            if local < -211813488000000000i64 {
                return timezone_comparison_result(Int4Value::Error(make_sql_error(
                    TEMPORAL_CAST_RANGE,
                )));
            };
            return timezone_comparison_local(local, instant, session, false);
        };
    };
    timezone_comparison_result(Int4Value::Unknown)
}

fn timezone_comparison_reverse(input: TimezoneComparison) -> TimezoneComparison {
    let value = input.value;
    let mut result = value;
    if let Int4Value::Value(order) = value {
        result = make_int4_value(0 - order);
    };
    TimezoneComparison {
        value: result,
        unequal: input.unequal,
    }
}

fn timezone_compare_instant_date(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> TimezoneComparison {
    if let TimestamptzValue::Error(error) = left {
        return timezone_comparison_result(Int4Value::Error(error));
    };
    timezone_comparison_reverse(timezone_compare_date(right, left, session))
}

fn timezone_compare_instant_timestamp(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> TimezoneComparison {
    if let TimestamptzValue::Error(error) = left {
        return timezone_comparison_result(Int4Value::Error(error));
    };
    timezone_comparison_reverse(timezone_compare_timestamp(right, left, session))
}

fn timezone_comparison_boolean(
    input: TimezoneComparison,
    less: bool,
    equal: bool,
    greater: bool,
) -> BoolValue {
    let value = input.value;
    if let Int4Value::Error(error) = value {
        return BoolValue::Error(error);
    };
    if value == Int4Value::Null {
        return BoolValue::Null;
    };
    if value == Int4Value::Unknown {
        if input.unequal && less == greater && equal != less {
            return BoolValue::Value(less);
        };
        return BoolValue::Unknown;
    };
    if let Int4Value::Value(order) = value {
        return BoolValue::Value(
            (order < 0 && less) || (order == 0 && equal) || (order > 0 && greater),
        );
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__date_cmp_timestamptz__k3m9(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> Int4Value {
    let comparison = timezone_compare_date(left, right, session);
    comparison.value
}

pub fn sql__pg_catalog__date_eq_timestamptz__drdv(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_date(left, right, session),
        false,
        true,
        false,
    )
}

pub fn sql__pg_catalog__date_ge_timestamptz__paie(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_date(left, right, session),
        false,
        true,
        true,
    )
}

pub fn sql__pg_catalog__date_gt_timestamptz__v9rh(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_date(left, right, session),
        false,
        false,
        true,
    )
}

pub fn sql__pg_catalog__date_le_timestamptz__ijcb(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_date(left, right, session),
        true,
        true,
        false,
    )
}

pub fn sql__pg_catalog__date_lt_timestamptz__1fw2(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_date(left, right, session),
        true,
        false,
        false,
    )
}

pub fn sql__pg_catalog__date_ne_timestamptz__qcup(
    left: DateValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_date(left, right, session),
        true,
        false,
        true,
    )
}

pub fn sql__pg_catalog__timestamp_cmp_timestamptz__bj5c(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> Int4Value {
    let comparison = timezone_compare_timestamp(left, right, session);
    comparison.value
}

pub fn sql__pg_catalog__timestamp_eq_timestamptz__ngpx(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_timestamp(left, right, session),
        false,
        true,
        false,
    )
}

pub fn sql__pg_catalog__timestamp_ge_timestamptz__iuwm(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_timestamp(left, right, session),
        false,
        true,
        true,
    )
}

pub fn sql__pg_catalog__timestamp_gt_timestamptz__5yia(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_timestamp(left, right, session),
        false,
        false,
        true,
    )
}

pub fn sql__pg_catalog__timestamp_le_timestamptz__qfen(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_timestamp(left, right, session),
        true,
        true,
        false,
    )
}

pub fn sql__pg_catalog__timestamp_lt_timestamptz__fmsq(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_timestamp(left, right, session),
        true,
        false,
        false,
    )
}

pub fn sql__pg_catalog__timestamp_ne_timestamptz__uxce(
    left: TimestampValue,
    right: TimestamptzValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_timestamp(left, right, session),
        true,
        false,
        true,
    )
}

pub fn sql__pg_catalog__timestamptz_cmp_date__4rqm(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> Int4Value {
    let comparison = timezone_compare_instant_date(left, right, session);
    comparison.value
}

pub fn sql__pg_catalog__timestamptz_cmp_timestamp__8ts2(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> Int4Value {
    let comparison = timezone_compare_instant_timestamp(left, right, session);
    comparison.value
}

pub fn sql__pg_catalog__timestamptz_eq_date__1385(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_date(left, right, session),
        false,
        true,
        false,
    )
}

pub fn sql__pg_catalog__timestamptz_eq_timestamp__dqy7(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_timestamp(left, right, session),
        false,
        true,
        false,
    )
}

pub fn sql__pg_catalog__timestamptz_ge_date__iq91(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_date(left, right, session),
        false,
        true,
        true,
    )
}

pub fn sql__pg_catalog__timestamptz_ge_timestamp__ho0f(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_timestamp(left, right, session),
        false,
        true,
        true,
    )
}

pub fn sql__pg_catalog__timestamptz_gt_date__45t2(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_date(left, right, session),
        false,
        false,
        true,
    )
}

pub fn sql__pg_catalog__timestamptz_gt_timestamp__aiaq(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_timestamp(left, right, session),
        false,
        false,
        true,
    )
}

pub fn sql__pg_catalog__timestamptz_le_date__ma3u(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_date(left, right, session),
        true,
        true,
        false,
    )
}

pub fn sql__pg_catalog__timestamptz_le_timestamp__antn(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_timestamp(left, right, session),
        true,
        true,
        false,
    )
}

pub fn sql__pg_catalog__timestamptz_lt_date__tndh(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_date(left, right, session),
        true,
        false,
        false,
    )
}

pub fn sql__pg_catalog__timestamptz_lt_timestamp__vtrw(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_timestamp(left, right, session),
        true,
        false,
        false,
    )
}

pub fn sql__pg_catalog__timestamptz_ne_date__l9se(
    left: TimestamptzValue,
    right: DateValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_date(left, right, session),
        true,
        false,
        true,
    )
}

pub fn sql__pg_catalog__timestamptz_ne_timestamp__1l0u(
    left: TimestamptzValue,
    right: TimestampValue,
    session: &str,
) -> BoolValue {
    timezone_comparison_boolean(
        timezone_compare_instant_timestamp(left, right, session),
        true,
        false,
        true,
    )
}
