const INVALID_TIMESTAMP_TEXT: u32 = 3452551;
const INVALID_TIMESTAMP_ZONE: u32 = 3452553;

struct TimestampText {
    chars: Vec<char>,
}

struct TimestampNumber {
    next: usize,
    digits: usize,
    value: i32,
    overflow: bool,
}

fn read_timestamp_number(text: &TimestampText, start: usize, end: usize) -> TimestampNumber {
    let mut index = start;
    let mut value: i32 = 0;
    let mut overflow = false;
    while index < end && date_text_digit(text.chars[index]) >= 0 {
        if value < 214748364 || (value == 214748364 && date_text_digit(text.chars[index]) <= 7) {
            value = value * 10 + date_text_digit(text.chars[index]);
        } else {
            value = 2147483647;
            overflow = true;
        }
        index += 1;
    }
    TimestampNumber {
        next: index,
        digits: index - start,
        value: value,
        overflow: overflow,
    }
}

fn timestamp_calendar_microseconds(
    year: i32,
    month: i32,
    day: i32,
    hour: i32,
    minute: i32,
    second: i32,
    microsecond: i32,
    offset_seconds: i32,
    with_timezone: bool,
    allow_fraction_carry: bool,
    missing_timezone: bool,
    compact_clock: bool,
    ordinal_day: i32,
) -> Int8Value {
    let mut max_fraction: i32 = 999999;
    if allow_fraction_carry {
        max_fraction = 1000000;
    }
    if compact_clock == false
        && (hour < 0
            || hour > 24
            || minute < 0
            || minute > 59
            || second < 0
            || second > 60
            || microsecond < 0
            || microsecond > max_fraction)
    {
        return Int8Value::Error(SqlError {
            state: TIMESTAMP_FIELD_OVERFLOW,
        });
    }
    let clock_seconds: i32 = (hour * 60 + minute) * 60 + second;
    let clock_wide = clock_seconds as i64;
    let fraction_wide = microsecond as i64;
    let clock = clock_wide * 1000000i64 + fraction_wide;
    if compact_clock == false && clock > 86400000000i64 {
        return Int8Value::Error(SqlError {
            state: TIMESTAMP_FIELD_OVERFLOW,
        });
    }
    if offset_seconds < -57599 || offset_seconds > 57599 {
        return Int8Value::Error(SqlError {
            state: INVALID_TIMESTAMP_ZONE,
        });
    }
    let mut calendar_year = year;
    let mut calendar_month = month;
    let mut calendar_day = day;
    if ordinal_day > 0 {
        let ordinal = calendar_from_ordinal(year, ordinal_day);
        if ordinal.known == false {
            return Int8Value::Unknown;
        }
        calendar_year = ordinal.year;
        calendar_month = ordinal.month;
        calendar_day = ordinal.day;
    }
    let days = calendar_days_from_ymd(calendar_year, calendar_month, calendar_day);
    if let Int4Value::Error(error) = days {
        return Int8Value::Error(error);
    }
    if let Int4Value::Value(day_value) = days {
        if missing_timezone {
            return Int8Value::Unknown;
        }
        if (calendar_year == -4714 && calendar_month < 11)
            || (compact_clock == false && day_value < -2451546)
            || day_value > 106751983
        {
            return Int8Value::Error(SqlError {
                state: TIMESTAMP_FIELD_OVERFLOW,
            });
        }
        let days_wide = day_value as i64;
        let local = days_wide * 86400000000i64 + clock;
        let offset_wide = offset_seconds as i64;
        let mut microseconds = local;
        if with_timezone {
            microseconds = local - offset_wide * 1000000i64;
        }
        if timestamp_microseconds_valid(microseconds) == false {
            return Int8Value::Error(SqlError {
                state: TIMESTAMP_FIELD_OVERFLOW,
            });
        }
        return Int8Value::Value(microseconds);
    }
    Int8Value::Unknown
}

fn parse_timestamp_text(value: TextValue, with_timezone: bool) -> Int8Value {
    if let TextValue::Error(error) = value {
        return Int8Value::Error(error);
    }
    if (value == TextValue::Unknown || value == TextValue::NonNull) {
        return Int8Value::Unknown;
    }
    if value == TextValue::Null {
        return Int8Value::Null;
    }
    if let TextValue::Value(input) = value {
        let chars: Vec<char> = input.chars().collect();
        if chars.len() > 128 {
            return Int8Value::Unknown;
        }
        let text = TimestampText { chars: chars };
        let mut start = 0;
        let mut end = text.chars.len();
        while start < end && date_text_space(text.chars[start]) {
            start += 1;
        }
        while start < end && date_text_space(text.chars[end - 1]) {
            end = end - 1;
        }
        if start == end {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        let mut bc = false;
        if end - start >= 2
            && text.chars[end - 1].to_ascii_lowercase() == 'c'
            && text.chars[end - 2].to_ascii_lowercase() == 'b'
        {
            if end - start > 2
                && date_text_space(text.chars[end - 3]) == false
                && date_text_digit(text.chars[end - 3]) < 0
            {
                return Int8Value::Unknown;
            }
            bc = true;
            end = end - 2;
        } else if end - start >= 2
            && text.chars[end - 1].to_ascii_lowercase() == 'd'
            && text.chars[end - 2].to_ascii_lowercase() == 'a'
        {
            if end - start > 2
                && date_text_space(text.chars[end - 3]) == false
                && date_text_digit(text.chars[end - 3]) < 0
            {
                return Int8Value::Unknown;
            }
            end = end - 2;
        }
        while start < end && date_text_space(text.chars[end - 1]) {
            end = end - 1;
        }
        if end - start == 5
            && text.chars[start].to_ascii_lowercase() == 'e'
            && text.chars[start + 1].to_ascii_lowercase() == 'p'
            && text.chars[start + 2].to_ascii_lowercase() == 'o'
            && text.chars[start + 3].to_ascii_lowercase() == 'c'
            && text.chars[start + 4].to_ascii_lowercase() == 'h'
        {
            return timestamp_calendar_microseconds(
                1970,
                1,
                1,
                0,
                0,
                0,
                0,
                0,
                with_timezone,
                false,
                false,
                false,
                0,
            );
        }
        let mut infinity_start = start;
        let mut negative = false;
        if infinity_start < end && text.chars[infinity_start] == '-' {
            negative = true;
            infinity_start += 1;
        } else if infinity_start < end && text.chars[infinity_start] == '+' {
            infinity_start += 1;
        }
        if end - infinity_start == 8 {
            let infinity: Vec<char> = "infinity".chars().collect();
            let mut index = 0;
            let mut matches = true;
            while index < infinity.len() {
                if text.chars[infinity_start + index].to_ascii_lowercase() != infinity[index] {
                    matches = false;
                }
                index += 1;
            }
            if matches {
                if negative {
                    return make_int8_value(-9223372036854775808i64);
                }
                return make_int8_value(9223372036854775807i64);
            }
        }
        let ordinal = read_ordinal_date(&text, start, end);
        if ordinal.state == ORDINAL_DATE_SYNTAX {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        if ordinal.state == ORDINAL_DATE_OVERFLOW {
            return Int8Value::Error(SqlError {
                state: TIMESTAMP_FIELD_OVERFLOW,
            });
        }
        if ordinal.state == ORDINAL_DATE_DEFERRED {
            return Int8Value::Unknown;
        }
        let year_field = read_timestamp_number(&text, start, end);
        let mut year = year_field.value;
        let mut year_overflow = year_field.overflow;
        let mut index = year_field.next;
        let mut month: i32 = 0;
        let mut day: i32 = 0;
        let mut ordinal_day: i32 = 0;
        if ordinal.state == ORDINAL_DATE_FOUND {
            year = ordinal.year;
            year_overflow = ordinal.overflow;
            index = ordinal.next;
            ordinal_day = ordinal.day;
        } else if year_field.digits >= 6 && (index == end || text.chars[index] != '-') {
            let compact_year = read_timestamp_number(&text, start, index - 4);
            if compact_year.overflow {
                return Int8Value::Unknown;
            }
            year = calendar_short_year(compact_year.value, compact_year.digits, bc);
            year_overflow = false;
            let compact_month = read_timestamp_number(&text, index - 4, index - 2);
            let compact_day = read_timestamp_number(&text, index - 2, index);
            month = compact_month.value;
            day = compact_day.value;
        } else {
            if year_field.digits < 4 || index == end || text.chars[index] != '-' {
                return Int8Value::Unknown;
            }
            let month_field = read_timestamp_number(&text, index + 1, end);
            index = month_field.next;
            if month_field.digits < 1
                || month_field.digits > 2
                || index == end
                || text.chars[index] != '-'
            {
                return Int8Value::Unknown;
            }
            let day_field = read_timestamp_number(&text, index + 1, end);
            index = day_field.next;
            if day_field.digits < 1 || day_field.digits > 2 {
                return Int8Value::Unknown;
            }
            month = month_field.value;
            day = day_field.value;
        }
        if bc {
            year = 0 - year;
        }
        if index == end {
            if year_overflow {
                return Int8Value::Error(SqlError {
                    state: TIMESTAMP_FIELD_OVERFLOW,
                });
            }
            return timestamp_calendar_microseconds(
                year,
                month,
                day,
                0,
                0,
                0,
                0,
                0,
                false,
                false,
                with_timezone,
                false,
                ordinal_day,
            );
        }
        if text.chars[index].to_ascii_lowercase() == 't' {
            index += 1;
        } else if date_text_space(text.chars[index]) {
            while index < end && date_text_space(text.chars[index]) {
                index += 1;
            }
        } else {
            return Int8Value::Unknown;
        }
        let hours = read_timestamp_number(&text, index, end);
        index = hours.next;
        let mut hour = hours.value;
        let mut minute: i32 = 0;
        let mut second: i32 = 0;
        let mut fraction: i32 = 0;
        let mut fractional = false;
        let mut compact_clock = false;
        if hours.digits > 0 && index < end && text.chars[index] == ':' {
            let minutes = read_timestamp_number(&text, index + 1, end);
            index = minutes.next;
            if minutes.digits < 1 {
                return Int8Value::Unknown;
            }
            minute = minutes.value;
            if index < end && text.chars[index] == ':' {
                let seconds = read_timestamp_number(&text, index + 1, end);
                index = seconds.next;
                if seconds.digits < 1 {
                    return Int8Value::Unknown;
                }
                second = seconds.value;
                fractional = true;
            }
        } else if hours.digits == 4 || hours.digits == 6 {
            compact_clock = true;
            fractional = true;
            if hours.digits == 6 {
                second = hour % 100;
                hour = hour / 100;
            }
            minute = hour % 100;
            hour = hour / 100;
        } else {
            return Int8Value::Unknown;
        }
        if fractional && index < end && text.chars[index] == '.' {
            let fraction_start = index + 1;
            let digits = read_timestamp_number(&text, index + 1, end);
            index = digits.next;
            if digits.digits < 1 {
                return Int8Value::Unknown;
            }
            if digits.digits <= 6 {
                fraction = digits.value;
                let mut fraction_digits = digits.digits;
                while fraction_digits < 6 {
                    fraction = fraction * 10;
                    fraction_digits += 1;
                }
            } else {
                let mut fraction_text = String::new();
                fraction_text.push('0');
                fraction_text.push('.');
                let mut digit_index = fraction_start;
                while digit_index < index {
                    fraction_text.push(text.chars[digit_index]);
                    digit_index += 1;
                }
                let parsed = fraction_text.as_str().parse::<f64>().unwrap_or(0.0f64);
                let scaled = parsed * 1000000.0f64;
                fraction = scaled as i32;
                let integral = fraction as f64;
                let remainder = scaled - integral;
                if remainder > 0.5f64 || (remainder == 0.5f64 && fraction % 2 != 0) {
                    fraction = fraction + 1;
                };
            };
        }
        while index < end && date_text_space(text.chars[index]) {
            index += 1;
        }
        let mut offset: i32 = 0;
        let mut missing_timezone = false;
        if index < end && text.chars[index].to_ascii_lowercase() == 'z' {
            index += 1;
        } else if index < end && (text.chars[index] == '+' || text.chars[index] == '-') {
            let sign = text.chars[index];
            let zone_hour = read_timestamp_number(&text, index + 1, end);
            index = zone_hour.next;
            if zone_hour.digits < 1 || zone_hour.digits > 4 {
                return Int8Value::Unknown;
            }
            let mut hours = zone_hour.value;
            let mut minutes: i32 = 0;
            let mut seconds: i32 = 0;
            if index < end && text.chars[index] == ':' {
                if zone_hour.digits > 2 {
                    return Int8Value::Unknown;
                }
                let zone_minute = read_timestamp_number(&text, index + 1, end);
                index = zone_minute.next;
                if zone_minute.digits < 1 {
                    return Int8Value::Unknown;
                }
                minutes = zone_minute.value;
                if index < end && text.chars[index] == ':' {
                    let zone_second = read_timestamp_number(&text, index + 1, end);
                    index = zone_second.next;
                    if zone_second.digits < 1 {
                        return Int8Value::Unknown;
                    }
                    seconds = zone_second.value;
                }
            } else if zone_hour.digits > 2 {
                hours = zone_hour.value / 100;
                minutes = zone_hour.value % 100;
            }
            if index != end {
                return Int8Value::Unknown;
            }
            if hours > 15 || minutes > 59 || seconds > 59 {
                offset = 57600;
            } else {
                offset = (hours * 60 + minutes) * 60 + seconds;
                if sign == '-' {
                    offset = 0 - offset;
                }
            };
        } else if index != end {
            return Int8Value::Unknown;
        } else if with_timezone {
            missing_timezone = true;
        }
        if index != end {
            return Int8Value::Unknown;
        }
        if year_overflow {
            return Int8Value::Error(SqlError {
                state: TIMESTAMP_FIELD_OVERFLOW,
            });
        }
        return timestamp_calendar_microseconds(
            year,
            month,
            day,
            hour,
            minute,
            second,
            fraction,
            offset,
            with_timezone,
            true,
            missing_timezone,
            compact_clock,
            ordinal_day,
        );
    }
    Int8Value::Unknown
}

fn timestamp_from_microseconds(value: Int8Value) -> TimestampValue {
    if let Int8Value::Error(error) = value {
        return TimestampValue::Error(error);
    }
    if let Int8Value::Value(microseconds) = value {
        return make_timestamp_value(microseconds);
    }
    if value == Int8Value::Null {
        return TimestampValue::Null;
    }
    TimestampValue::Unknown
}

pub fn timestamp_from_calendar(
    year: i32,
    month: i32,
    day: i32,
    hour: i32,
    minute: i32,
    second: i32,
    microsecond: i32,
) -> TimestampValue {
    let parsed = timestamp_calendar_microseconds(
        year,
        month,
        day,
        hour,
        minute,
        second,
        microsecond,
        0,
        false,
        false,
        false,
        false,
        0,
    );
    timestamp_from_microseconds(parsed)
}

pub fn timestamp_from_text(value: TextValue) -> TimestampValue {
    let parsed = parse_timestamp_text(value, false);
    timestamp_from_microseconds(parsed)
}
