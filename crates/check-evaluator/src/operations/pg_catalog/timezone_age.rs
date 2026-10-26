fn timezone_age_local_fields(later: i64, earlier: i64, negative: bool) -> IntervalValue {
    let mut first_day = later / 86400000000i64;
    let mut first_clock = later % 86400000000i64;
    let mut second_day = earlier / 86400000000i64;
    let mut second_clock = earlier % 86400000000i64;
    if first_clock < 0i64 {
        first_clock = first_clock + 86400000000i64;
        first_day = first_day - 1i64;
    };
    if second_clock < 0i64 {
        second_clock = second_clock + 86400000000i64;
        second_day = second_day - 1i64;
    };
    let first = temporal_calendar_from_julian(first_day + 2451545i64);
    let second = temporal_calendar_from_julian(second_day + 2451545i64);
    let mut years = first.year - second.year;
    let mut months = first.month - second.month;
    let mut days = first.day - second.day;
    let mut clock = first_clock - second_clock;
    if clock < 0i64 {
        clock = clock + 86400000000i64;
        days = days - 1;
    };
    while days < 0 {
        days = days + interval_age_month_days(second);
        months = months - 1;
    }
    while months < 0 {
        months = months + 12;
        years = years - 1;
    }
    let mut total_months = years * 12 + months;
    if negative {
        total_months = 0 - total_months;
        days = 0 - days;
        clock = 0i64 - clock;
    };
    make_interval_value(total_months, days, clock)
}

pub fn sql__pg_catalog__age__74kj(
    left: TimestamptzValue,
    right: TimestamptzValue,
    session: &str,
) -> IntervalValue {
    if let TimestamptzValue::Error(error) = left {
        return IntervalValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = right {
        return IntervalValue::Error(error);
    };
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return IntervalValue::Unknown;
    };
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return IntervalValue::Null;
    };
    if let TimestamptzValue::Value(a) = left {
        if let TimestamptzValue::Value(b) = right {
            if a == -9223372036854775808i64
                || a == 9223372036854775807i64
                || b == -9223372036854775808i64
                || b == 9223372036854775807i64
            {
                return sql__pg_catalog__timestamptz_mi__av9n(
                    TimestamptzValue::Value(a),
                    TimestamptzValue::Value(b),
                );
            };
            if a < -211813488000000000i64 || b < -211813488000000000i64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            if a == b {
                return make_interval_value(0, 0, 0i64);
            };
            let first = session_timezone_profile(session, a, false);
            let second = session_timezone_profile(session, b, false);
            if first.valid == false || second.valid == false {
                return IntervalValue::Unknown;
            };
            let first_local = a + (first.seconds as i64) * 1000000i64;
            let second_local = b + (second.seconds as i64) * 1000000i64;
            if a < b {
                return timezone_age_local_fields(second_local, first_local, true);
            };
            return timezone_age_local_fields(first_local, second_local, false);
        };
    };
    IntervalValue::Unknown
}
