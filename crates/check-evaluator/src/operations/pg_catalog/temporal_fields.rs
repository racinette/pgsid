const TEMPORAL_FIELD_UNIT_ERROR: u32 = 3452619;
const TEMPORAL_FIELD_UNSUPPORTED_ERROR: u32 = 466560;

const TEMPORAL_UNIT_KEYS: &[&str] = &[
    "@",
    "ago",
    "c",
    "cent",
    "centuries",
    "century",
    "d",
    "day",
    "days",
    "dec",
    "decade",
    "decades",
    "decs",
    "h",
    "hour",
    "hours",
    "hr",
    "hrs",
    "m",
    "microsecon",
    "mil",
    "millennia",
    "millennium",
    "millisecon",
    "mils",
    "min",
    "mins",
    "minute",
    "minutes",
    "mon",
    "mons",
    "month",
    "months",
    "ms",
    "msec",
    "msecond",
    "mseconds",
    "msecs",
    "qtr",
    "quarter",
    "s",
    "sec",
    "second",
    "seconds",
    "secs",
    "timezone",
    "timezone_h",
    "timezone_m",
    "us",
    "usec",
    "usecond",
    "useconds",
    "usecs",
    "w",
    "week",
    "weeks",
    "y",
    "year",
    "years",
    "yr",
    "yrs",
];
const TEMPORAL_UNIT_CODES: &[i32] = &[
    -2, -2, 12, 12, 12, 12, 6, 6, 6, 11, 11, 11, 11, 5, 5, 5, 5, 5, 4, 1, 13, 13, 13, 2, 13, 4, 4,
    4, 4, 8, 8, 8, 8, 2, 2, 2, 2, 2, 9, 9, 3, 3, 3, 3, 3, -1, -1, -1, 1, 1, 1, 1, 1, 7, 7, 7, 10,
    10, 10, 10, 10,
];

fn temporal_unit_code(value: &str) -> i32 {
    let characters: Vec<char> = value.chars().collect();
    let mut key = String::new();
    let mut index: usize = 0;
    while index < characters.len() && index < 10 {
        key.push(characters[index].to_ascii_lowercase());
        index += 1;
    }
    let mut entry: usize = 0;
    while entry < TEMPORAL_UNIT_KEYS.len() {
        if key.as_str() == TEMPORAL_UNIT_KEYS[entry] {
            return TEMPORAL_UNIT_CODES[entry];
        }
        entry += 1;
    }
    0
}

#[derive(Clone, Copy)]
struct TemporalCalendarFields {
    year: i32,
    month: i32,
    day: i32,
}

fn temporal_calendar_from_julian(day: i64) -> TemporalCalendarFields {
    let mut julian = day + 32044i64;
    let mut quad = julian / 146097i64;
    let extra = (julian - quad * 146097i64) * 4i64 + 3i64;
    julian = julian + 60i64 + quad * 3i64 + extra / 146097i64;
    quad = julian / 1461i64;
    julian = julian - quad * 1461i64;
    let mut year = julian * 4i64 / 1461i64;
    if year != 0i64 {
        julian = (julian + 305i64) % 365i64 + 123i64;
    } else {
        julian = (julian + 306i64) % 366i64 + 123i64;
    };
    year = year + quad * 4i64;
    quad = julian * 2141i64 / 65536i64;
    TemporalCalendarFields {
        year: (year - 4800i64) as i32,
        month: ((quad + 10i64) % 12i64 + 1i64) as i32,
        day: (julian - 7834i64 * quad / 256i64) as i32,
    }
}

fn temporal_truncate_timestamp(value: i64, code: i32) -> TimestampValue {
    if code <= 0 {
        if code == -1 {
            return TimestampValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
        }
        return TimestampValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    }
    if value == -9223372036854775808i64 || value == 9223372036854775807i64 || code == 1 {
        return TimestampValue::Value(value);
    }
    let mut scale: i64 = 86400000000i64;
    if code == 2 {
        scale = 1000i64;
    }
    if code == 3 {
        scale = 1000000i64;
    }
    if code == 4 {
        scale = 60000000i64;
    }
    if code == 5 {
        scale = 3600000000i64;
    }
    if code <= 6 {
        let mut result = (value / scale) * scale;
        if value % scale < 0i64 {
            result = result - scale;
        }
        return TimestampValue::Value(result);
    }
    let mut day = value / 86400000000i64;
    if value % 86400000000i64 < 0i64 {
        day = day - 1i64;
    }
    let julian = day + 2451545i64;
    if code == 7 {
        let mut weekday = julian % 7i64;
        if weekday < 0i64 {
            weekday = weekday + 7i64;
        }
        return TimestampValue::Value((day - weekday) * 86400000000i64);
    }
    let calendar = temporal_calendar_from_julian(julian);
    let mut year = calendar.year;
    let mut month = calendar.month;
    if code == 9 {
        month = ((month - 1) / 3) * 3 + 1;
    }
    if code >= 10 {
        month = 1;
    }
    if code == 11 {
        if year > 0 {
            year = (year / 10) * 10;
        } else {
            year = 0 - ((8 - (year - 1)) / 10) * 10;
        };
    }
    if code == 12 {
        if year > 0 {
            year = ((year + 99) / 100) * 100 - 99;
        } else {
            year = 0 - ((99 - (year - 1)) / 100) * 100 + 1;
        };
    }
    if code == 13 {
        if year > 0 {
            year = ((year + 999) / 1000) * 1000 - 999;
        } else {
            year = 0 - ((999 - (year - 1)) / 1000) * 1000 + 1;
        };
    }
    let truncated_julian = temporal_julian_from_calendar(year, month, 1);
    TimestampValue::Value((truncated_julian - 2451545i64) * 86400000000i64)
}

pub fn sql__pg_catalog__date_trunc__3i0u(
    units: TextValue,
    input: TimestampValue,
) -> TimestampValue {
    if let TextValue::Error(error) = units {
        return TimestampValue::Error(error);
    }
    if let TimestampValue::Error(error) = input {
        return TimestampValue::Error(error);
    }
    if units == TextValue::Unknown || input == TimestampValue::Unknown {
        return TimestampValue::Unknown;
    }
    if units == TextValue::Null || input == TimestampValue::Null {
        return TimestampValue::Null;
    }
    if let TextValue::Value(unit) = units {
        if let TimestampValue::Value(value) = input {
            let truncated = temporal_truncate_timestamp(value, temporal_unit_code(unit.as_str()));
            if let TimestampValue::Value(result) = truncated {
                return make_timestamp_value(result);
            }
            return truncated;
        }
    }
    TimestampValue::Unknown
}
