fn timezone_calendar_resolve(day: i64, clock: i64, zone: &str) -> TimestamptzValue {
    if day < (-106751991i64) || day > 106751991i64 {
        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
    };
    let midnight = day * 86400000000i64;
    if midnight > 9223372036854775807i64 - clock {
        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
    };
    let local = midnight + clock;
    let offset = timezone_offset(zone, local, true);
    if let Int4Value::Error(error) = offset {
        return TimestamptzValue::Error(error);
    };
    if let Int4Value::Value(seconds) = offset {
        let wide = (seconds as i64) * 1000000i64;
        if (wide > 0i64 && local < (-9223372036854775808i64) + wide)
            || (wide < 0i64 && local > 9223372036854775807i64 + wide)
        {
            return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
        };
        let result = local - wide;
        if result == (-9223372036854775808i64) || result == 9223372036854775807i64 {
            return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
        };
        return make_timestamptz_value(result);
    };
    TimestamptzValue::Unknown
}
fn timezone_calendar_step(input: i64, months: i32, days: i32, zone: &str) -> TimestamptzValue {
    let offset = timezone_offset(zone, input, false);
    if let Int4Value::Error(error) = offset {
        return TimestamptzValue::Error(error);
    };
    if let Int4Value::Value(seconds) = offset {
        let local = input + (seconds as i64) * 1000000i64;
        let mut day = local / 86400000000i64;
        let mut clock = local % 86400000000i64;
        if clock < 0i64 {
            day = day - 1i64;
            clock = clock + 86400000000i64;
        };
        if months != 0 {
            let calendar = temporal_calendar_from_julian(day + 2451545i64);
            let mut month = (calendar.month as i64) + (months as i64);
            if month < (-2147483648i64) || month > 2147483647i64 {
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
            if year < (-4713i64)
                || (year == (-4713i64) && month < 11i64)
                || year > 5874898i64
                || (year == 5874898i64 && month >= 6i64)
            {
                return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let mut limit: i32 = 31;
            if month == 4i64 || month == 6i64 || month == 9i64 || month == 11i64 {
                limit = 30;
            };
            if month == 2i64 {
                limit = 28;
                if year % 4i64 == 0i64 && (year % 100i64 != 0i64 || year % 400i64 == 0i64) {
                    limit = 29;
                };
            };
            let mut date = calendar.day;
            if date > limit {
                date = limit;
            };
            day = temporal_julian_from_calendar(year as i32, month as i32, date) - 2451545i64;
        } else {
            let julian = day + 2451545i64 + (days as i64);
            if julian < (-1i64) || julian > 2147483647i64 {
                return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
            };
            day = julian - 2451545i64;
        };
        return timezone_calendar_resolve(day, clock, zone);
    };
    TimestamptzValue::Unknown
}
fn timezone_calendar_add(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: TextValue,
    subtract: bool,
) -> TimestamptzValue {
    if let TimestamptzValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if let IntervalValue::Error(error) = amount {
        return TimestamptzValue::Error(error);
    };
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    };
    if input == TimestamptzValue::Unknown
        || amount == IntervalValue::Unknown
        || (zone == TextValue::Unknown || zone == TextValue::NonNull)
    {
        return TimestamptzValue::Unknown;
    };
    if input == TimestamptzValue::Null || amount == IntervalValue::Null || zone == TextValue::Null {
        return TimestamptzValue::Null;
    };
    if let TextValue::Value(name) = zone {
        let lookup = timezone_offset(name.as_str(), 0i64, false);
        if let Int4Value::Error(error) = lookup {
            return TimestamptzValue::Error(error);
        };
        if lookup == Int4Value::Unknown {
            return TimestamptzValue::Unknown;
        };
        let mut adjusted = amount;
        if subtract {
            adjusted = sql__pg_catalog__interval_um__k6pj(amount);
        };
        if let IntervalValue::Error(error) = adjusted {
            return TimestamptzValue::Error(error);
        };
        if let IntervalValue::Value(span) = adjusted {
            if let TimestamptzValue::Value(timestamp) = input {
                let special = interval_special(span);
                if special != 0 {
                    if (special < 0 && timestamp == 9223372036854775807i64)
                        || (special > 0 && timestamp == (-9223372036854775808i64))
                    {
                        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
                    };
                    if special < 0 {
                        return make_timestamptz_value(-9223372036854775808i64);
                    };
                    return make_timestamptz_value(9223372036854775807i64);
                };
                if timestamp == (-9223372036854775808i64) || timestamp == 9223372036854775807i64 {
                    return input;
                };
                let mut result = input;
                if span.months != 0 {
                    result = timezone_calendar_step(timestamp, span.months, 0, name.as_str());
                };
                if let TimestamptzValue::Value(after_month) = result {
                    if span.days != 0 {
                        result = timezone_calendar_step(after_month, 0, span.days, name.as_str());
                    };
                };
                if let TimestamptzValue::Value(after_day) = result {
                    if (span.time > 0i64 && after_day > 9223372036854775807i64 - span.time)
                        || (span.time < 0i64 && after_day < (-9223372036854775808i64) - span.time)
                    {
                        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
                    };
                    let final_time = after_day + span.time;
                    if final_time == (-9223372036854775808i64)
                        || final_time == 9223372036854775807i64
                    {
                        return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
                    };
                    return make_timestamptz_value(final_time);
                };
                return result;
            };
        };
    };
    TimestamptzValue::Unknown
}
pub fn sql__pg_catalog__date_add__kklw(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: TextValue,
) -> TimestamptzValue {
    timezone_calendar_add(input, amount, zone, false)
}
pub fn sql__pg_catalog__date_subtract__kpni(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: TextValue,
) -> TimestamptzValue {
    timezone_calendar_add(input, amount, zone, true)
}
