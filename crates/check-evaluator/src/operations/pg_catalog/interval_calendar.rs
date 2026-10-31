fn interval_calendar_timestamp(day: i64, clock: i64) -> TimestampValue {
    if day < (-2451545i64) || day >= 106751983i64 {
        return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
    };
    make_timestamp_value(day * 86400000000i64 + clock)
}
fn interval_calendar_add(
    input: TimestampValue,
    amount: IntervalValue,
    subtract: bool,
) -> TimestampValue {
    if let TimestampValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if let IntervalValue::Error(error) = amount {
        return TimestampValue::Error(error);
    };
    if input == TimestampValue::Unknown || amount == IntervalValue::Unknown {
        return TimestampValue::Unknown;
    };
    if input == TimestampValue::Null || amount == IntervalValue::Null {
        return TimestampValue::Null;
    };
    let mut span_value = amount;
    if subtract {
        span_value = sql__pg_catalog__interval_um__k6pj(amount);
    };
    if let IntervalValue::Error(error) = span_value {
        return TimestampValue::Error(error);
    };
    if let TimestampValue::Value(timestamp) = input {
        if let IntervalValue::Value(span) = span_value {
            let special = interval_special(span);
            if special != 0 {
                if (special < 0 && timestamp == 9223372036854775807i64)
                    || (special > 0 && timestamp == (-9223372036854775808i64))
                {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                if special < 0 {
                    return make_timestamp_value(-9223372036854775808i64);
                };
                return make_timestamp_value(9223372036854775807i64);
            };
            if timestamp == (-9223372036854775808i64) || timestamp == 9223372036854775807i64 {
                return input;
            };
            let mut day = timestamp / 86400000000i64;
            let mut clock = timestamp % 86400000000i64;
            if clock < 0i64 {
                day = day - 1i64;
                clock = clock + 86400000000i64;
            };
            if span.months != 0 {
                if timestamp < -211813488000000000i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let calendar = temporal_calendar_from_julian(day + 2451545i64);
                let mut month = (calendar.month as i64) + (span.months as i64);
                if month < (-2147483648i64) || month > 2147483647i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let mut year = calendar.year as i64;
                if month > 12i64 {
                    year = year + (month - 1i64) / 12i64;
                    month = (month - 1i64) % 12i64 + 1i64;
                };
                if month < 1i64 {
                    year = year + month / 12i64 - 1i64;
                    month = month % 12i64 + 12i64;
                };
                let mut max_day: i32 = 31;
                if month == 4i64 || month == 6i64 || month == 9i64 || month == 11i64 {
                    max_day = 30;
                };
                if month == 2i64 {
                    max_day = 28;
                    if year % 4i64 == 0i64 && (year % 100i64 != 0i64 || year % 400i64 == 0i64) {
                        max_day = 29;
                    };
                };
                let mut month_day = calendar.day;
                if month_day > max_day {
                    month_day = max_day;
                };
                day = temporal_julian_from_calendar(year as i32, month as i32, month_day)
                    - 2451545i64;
                let month_result = interval_calendar_timestamp(day, clock);
                if let TimestampValue::Error(error) = month_result {
                    return TimestampValue::Error(error);
                };
            };
            let mut calendar_result = TimestampValue::Value(timestamp);
            if span.months != 0 {
                calendar_result = interval_calendar_timestamp(day, clock);
            };
            if span.days != 0 {
                if timestamp < -211813488000000000i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                day = day + (span.days as i64);
                calendar_result = interval_calendar_timestamp(day, clock);
            };
            if let TimestampValue::Error(error) = calendar_result {
                return TimestampValue::Error(error);
            };
            if let TimestampValue::Value(calendar_time) = calendar_result {
                if (span.time > 0i64 && calendar_time > 9223372036854775807i64 - span.time)
                    || (span.time < 0i64 && calendar_time < (-9223372036854775808i64) - span.time)
                {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let result = calendar_time + span.time;
                if result == (-9223372036854775808i64) || result == 9223372036854775807i64 {
                    return TimestampValue::Error(make_sql_error(CLOCK_RANGE));
                };
                return make_timestamp_value(result);
            };
        };
    };
    TimestampValue::Unknown
}
pub fn sql__pg_catalog__timestamp_pl_interval__zi2i(
    input: TimestampValue,
    amount: IntervalValue,
) -> TimestampValue {
    interval_calendar_add(input, amount, false)
}
pub fn sql__pg_catalog__timestamp_mi_interval__71gp(
    input: TimestampValue,
    amount: IntervalValue,
) -> TimestampValue {
    interval_calendar_add(input, amount, true)
}
pub fn sql__pg_catalog__interval_pl_timestamp__3uks(
    amount: IntervalValue,
    input: TimestampValue,
) -> TimestampValue {
    if let IntervalValue::Error(error) = amount {
        return TimestampValue::Error(error);
    };
    if let TimestampValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    // The SQL body is one strict operator on the arguments, so a NULL decides beside an unknown.
    if let IntervalValue::Null = amount {
        return TimestampValue::Null;
    };
    if let TimestampValue::Null = input {
        return TimestampValue::Null;
    };
    interval_calendar_add(input, amount, false)
}
fn interval_calendar_date(
    input: DateValue,
    amount: IntervalValue,
    subtract: bool,
) -> TimestampValue {
    if let DateValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if let IntervalValue::Error(error) = amount {
        return TimestampValue::Error(error);
    };
    if input == DateValue::Unknown || amount == IntervalValue::Unknown {
        return TimestampValue::Unknown;
    };
    if input == DateValue::Null || amount == IntervalValue::Null {
        return TimestampValue::Null;
    };
    let timestamp = sql__pg_catalog__timestamp__swxj(input);
    interval_calendar_add(timestamp, amount, subtract)
}
pub fn sql__pg_catalog__date_pl_interval__gu7h(
    input: DateValue,
    amount: IntervalValue,
) -> TimestampValue {
    interval_calendar_date(input, amount, false)
}
pub fn sql__pg_catalog__date_mi_interval__3eqi(
    input: DateValue,
    amount: IntervalValue,
) -> TimestampValue {
    interval_calendar_date(input, amount, true)
}
pub fn sql__pg_catalog__interval_pl_date__tgwh(
    amount: IntervalValue,
    input: DateValue,
) -> TimestampValue {
    if let IntervalValue::Error(error) = amount {
        return TimestampValue::Error(error);
    };
    if let DateValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    // The SQL body is one strict operator on the arguments, so a NULL decides beside an unknown.
    if let IntervalValue::Null = amount {
        return TimestampValue::Null;
    };
    if let DateValue::Null = input {
        return TimestampValue::Null;
    };
    interval_calendar_date(input, amount, false)
}
pub fn sql__pg_catalog__timestamp_mi__sntt(
    left: TimestampValue,
    right: TimestampValue,
) -> IntervalValue {
    if let TimestampValue::Error(error) = left {
        return IntervalValue::Error(error);
    };
    if let TimestampValue::Error(error) = right {
        return IntervalValue::Error(error);
    };
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return IntervalValue::Unknown;
    };
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return IntervalValue::Null;
    };
    if let TimestampValue::Value(a) = left {
        if let TimestampValue::Value(b) = right {
            let low = -9223372036854775808i64;
            let high = 9223372036854775807i64;
            if (a == low && b == low) || (a == high && b == high) {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            if a == low || b == high {
                return interval_infinity(-1);
            };
            if a == high || b == low {
                return interval_infinity(1);
            };
            if (b > 0i64 && a < low + b) || (b < 0i64 && a > high + b) {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            return sql__pg_catalog__justify_hours__kx1s(make_interval_value(0, 0, a - b));
        };
    };
    IntervalValue::Unknown
}
fn interval_calendar_local_payload(input: TimestamptzValue) -> TimestampValue {
    if let TimestamptzValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if input == TimestamptzValue::Null {
        return TimestampValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        return TimestampValue::Value(value);
    };
    TimestampValue::Unknown
}
pub fn sql__pg_catalog__timestamptz_mi__av9n(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> IntervalValue {
    let a = interval_calendar_local_payload(left);
    let b = interval_calendar_local_payload(right);
    sql__pg_catalog__timestamp_mi__sntt(a, b)
}
