fn interval_age_month_days(calendar: TemporalCalendarFields) -> i32 {
    if calendar.month == 4 || calendar.month == 6 || calendar.month == 9 || calendar.month == 11 {
        return 30;
    };
    if calendar.month == 2 {
        if calendar.year % 4 == 0 && (calendar.year % 100 != 0 || calendar.year % 400 == 0) {
            return 29;
        };
        return 28;
    };
    31
}
fn interval_age_value(left: i64, right: i64) -> IntervalValue {
    let mut first = left;
    let mut second = right;
    if left < right {
        first = right;
        second = left;
    };
    let mut first_day = first / 86400000000i64;
    let mut first_clock = first % 86400000000i64;
    let mut second_day = second / 86400000000i64;
    let mut second_clock = second % 86400000000i64;
    if first_clock < 0i64 {
        first_clock = first_clock + 86400000000i64;
        first_day = first_day - 1i64;
    };
    if second_clock < 0i64 {
        second_clock = second_clock + 86400000000i64;
        second_day = second_day - 1i64;
    };
    let later = temporal_calendar_from_julian(first_day + 2451545i64);
    let earlier = temporal_calendar_from_julian(second_day + 2451545i64);
    let mut years = later.year - earlier.year;
    let mut months = later.month - earlier.month;
    let mut days = later.day - earlier.day;
    let mut clock = first_clock - second_clock;
    if clock < 0i64 {
        clock = clock + 86400000000i64;
        days = days - 1;
    };
    while days < 0 {
        days = days + interval_age_month_days(earlier);
        months = months - 1;
    }
    while months < 0 {
        months = months + 12;
        years = years - 1;
    }
    let mut total_months = years * 12 + months;
    if left < right {
        total_months = 0 - total_months;
        days = 0 - days;
        clock = 0i64 - clock;
    };
    make_interval_value(total_months, days, clock)
}
pub fn sql__pg_catalog__age__7dfp(left: TimestampValue, right: TimestampValue) -> IntervalValue {
    if let TimestampValue::Value(first) = left {
        if let TimestampValue::Value(second) = right {
            if first != (-9223372036854775808i64)
                && first != 9223372036854775807i64
                && second != (-9223372036854775808i64)
                && second != 9223372036854775807i64
            {
                if first < -211813488000000000i64 || second < -211813488000000000i64 {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                };
                return interval_age_value(first, second);
            };
        };
    };
    sql__pg_catalog__timestamp_mi__sntt(left, right)
}
