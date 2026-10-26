fn timezone_interval_rebuild(zone: &str, day: i64, clock: i64) -> TimestamptzValue {
    if day < -2451552i64 || day > 106751989i64 {
        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
    };
    let local = day * 86400000000i64 + clock;
    let profile = session_timezone_profile(zone, local, true);
    if profile.valid == false {
        return TimestamptzValue::Unknown;
    };
    let adjustment = (profile.seconds as i64) * 1000000i64;
    if adjustment < 0i64 && local > 9223372036854775807i64 + adjustment {
        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
    };
    let result = local - adjustment;
    if result == -9223372036854775808i64 || result == 9223372036854775807i64 {
        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
    };
    make_timestamptz_value(result)
}

fn timezone_interval_step(zone: &str, value: i64, months: i32, days: i32) -> TimestamptzValue {
    let profile = session_timezone_profile(zone, value, false);
    if profile.valid == false {
        return TimestamptzValue::Unknown;
    };
    let local = value + (profile.seconds as i64) * 1000000i64;
    let mut day = local / 86400000000i64;
    let mut clock = local % 86400000000i64;
    if clock < 0i64 {
        day = day - 1i64;
        clock = clock + 86400000000i64;
    };
    if months != 0 {
        let calendar = temporal_calendar_from_julian(day + 2451545i64);
        let mut month = (calendar.month as i64) + (months as i64);
        if month < -2147483648i64 || month > 2147483647i64 {
            return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
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
        let mut date = calendar.day;
        if date > max_day {
            date = max_day;
        };
        day = temporal_julian_from_calendar(year as i32, month as i32, date) - 2451545i64;
    };
    if days != 0 {
        let julian = day + 2451545i64 + (days as i64);
        if julian < 0i64 || julian > 2147483647i64 {
            return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
        };
        day = julian - 2451545i64;
    };
    timezone_interval_rebuild(zone, day, clock)
}

fn timezone_interval_add(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: &str,
    subtract: bool,
) -> TimestamptzValue {
    if let TimestamptzValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if let IntervalValue::Error(error) = amount {
        return TimestamptzValue::Error(error);
    };
    if input == TimestamptzValue::Unknown || amount == IntervalValue::Unknown {
        return TimestamptzValue::Unknown;
    };
    if input == TimestamptzValue::Null || amount == IntervalValue::Null {
        return TimestamptzValue::Null;
    };
    let mut interval = amount;
    if subtract {
        interval = sql__pg_catalog__interval_um__k6pj(amount);
    };
    if let IntervalValue::Error(error) = interval {
        return TimestamptzValue::Error(error);
    };
    if let TimestamptzValue::Value(value) = input {
        if let IntervalValue::Value(span) = interval {
            let special = interval_special(span);
            if special != 0 || value == -9223372036854775808i64 || value == 9223372036854775807i64 {
                let result = interval_calendar_add(
                    TimestampValue::Value(value),
                    IntervalValue::Value(span),
                    false,
                );
                if let TimestampValue::Error(error) = result {
                    return TimestamptzValue::Error(error);
                };
                if let TimestampValue::Value(time) = result {
                    return TimestamptzValue::Value(time);
                };
                return TimestamptzValue::Unknown;
            };
            let mut timestamp = input;
            if span.months != 0 {
                timestamp = timezone_interval_step(zone, value, span.months, 0);
            };
            if let TimestamptzValue::Error(error) = timestamp {
                return TimestamptzValue::Error(error);
            };
            if let TimestamptzValue::Value(time) = timestamp {
                if span.days != 0 {
                    timestamp = timezone_interval_step(zone, time, 0, span.days);
                };
            };
            if let TimestamptzValue::Error(error) = timestamp {
                return TimestamptzValue::Error(error);
            };
            if let TimestamptzValue::Value(time) = timestamp {
                if (span.time > 0i64 && time > 9223372036854775807i64 - span.time)
                    || (span.time < 0i64 && time < -9223372036854775808i64 - span.time)
                {
                    return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
                };
                let result = time + span.time;
                if result == -9223372036854775808i64 || result == 9223372036854775807i64 {
                    return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
                };
                return make_timestamptz_value(result);
            };
        };
    };
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_pl_interval__wpau(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: &str,
) -> TimestamptzValue {
    timezone_interval_add(input, amount, zone, false)
}
pub fn sql__pg_catalog__timestamptz_mi_interval__wsbj(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: &str,
) -> TimestamptzValue {
    timezone_interval_add(input, amount, zone, true)
}
pub fn sql__pg_catalog__interval_pl_timestamptz__4jdi(
    amount: IntervalValue,
    input: TimestamptzValue,
    zone: &str,
) -> TimestamptzValue {
    if let IntervalValue::Error(error) = amount {
        return TimestamptzValue::Error(error);
    };
    timezone_interval_add(input, amount, zone, false)
}
pub fn sql__pg_catalog__date_add__p5sx(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: &str,
) -> TimestamptzValue {
    timezone_interval_add(input, amount, zone, false)
}
pub fn sql__pg_catalog__date_subtract__cjsv(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: &str,
) -> TimestamptzValue {
    timezone_interval_add(input, amount, zone, true)
}
