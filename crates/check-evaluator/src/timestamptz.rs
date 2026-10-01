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

pub fn timestamptz_from_calendar(
    year: i32,
    month: i32,
    day: i32,
    hour: i32,
    minute: i32,
    second: i32,
    microsecond: i32,
    offset_seconds: i32,
) -> TimestamptzValue {
    if hour < 0
        || hour > 24
        || minute < 0
        || minute > 59
        || second < 0
        || second > 60
        || microsecond < 0
        || microsecond > 999999
    {
        return TimestamptzValue::Error(SqlError {
            state: TIMESTAMPTZ_FIELD_OVERFLOW,
        });
    }
    let clock_seconds: i32 = (hour * 60 + minute) * 60 + second;
    let clock_wide = clock_seconds as i64;
    let fraction_wide = microsecond as i64;
    let clock = clock_wide * 1000000i64 + fraction_wide;
    if clock > 86400000000i64 {
        return TimestamptzValue::Error(SqlError {
            state: TIMESTAMPTZ_FIELD_OVERFLOW,
        });
    }
    if offset_seconds < -57599 || offset_seconds > 57599 {
        return TimestamptzValue::Error(SqlError {
            state: INVALID_TIMESTAMP_ZONE,
        });
    }
    let days = calendar_days_from_ymd(year, month, day);
    if let Int4Value::Error(error) = days {
        return TimestamptzValue::Error(error);
    }
    if let Int4Value::Value(day_value) = days {
        if (year == -4714 && month < 11) || day_value < -2451546 || day_value > 106751983 {
            return TimestamptzValue::Error(SqlError {
                state: TIMESTAMPTZ_FIELD_OVERFLOW,
            });
        }
        let days_wide = day_value as i64;
        let local = days_wide * 86400000000i64 + clock;
        let offset_wide = offset_seconds as i64;
        let utc = local - offset_wide * 1000000i64;
        return make_timestamptz_value(utc);
    }
    TimestamptzValue::Unknown
}

pub fn timestamptz_from_text(value: TextValue) -> TimestamptzValue {
    if let TextValue::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    if value == TextValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if value == TextValue::Null {
        return TimestamptzValue::Null;
    }
    if let TextValue::Value(input) = value {
        let chars: Vec<char> = input.chars().collect();
        if chars.len() > 128 {
            return TimestamptzValue::Unknown;
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
            return TimestamptzValue::Error(SqlError {
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
                return TimestamptzValue::Unknown;
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
                return TimestamptzValue::Unknown;
            }
            end = end - 2;
        }
        while start < end && date_text_space(text.chars[end - 1]) {
            end = end - 1;
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
                    return make_timestamptz_value(-9223372036854775808i64);
                }
                return make_timestamptz_value(9223372036854775807i64);
            }
        }
        let year_field = read_timestamp_number(&text, start, end);
        let mut index = year_field.next;
        if year_field.digits < 4 || index == end || text.chars[index] != '-' {
            return TimestamptzValue::Unknown;
        }
        let month = read_timestamp_number(&text, index + 1, end);
        index = month.next;
        if month.digits < 1 || month.digits > 2 || index == end || text.chars[index] != '-' {
            return TimestamptzValue::Unknown;
        }
        let day = read_timestamp_number(&text, index + 1, end);
        index = day.next;
        if day.digits < 1 || day.digits > 2 || index == end {
            return TimestamptzValue::Unknown;
        }
        if text.chars[index].to_ascii_lowercase() == 't' {
            index += 1;
        } else if date_text_space(text.chars[index]) {
            while index < end && date_text_space(text.chars[index]) {
                index += 1;
            }
        } else {
            return TimestamptzValue::Unknown;
        }
        let hour = read_timestamp_number(&text, index, end);
        index = hour.next;
        if hour.digits < 1 || index == end || text.chars[index] != ':' {
            return TimestamptzValue::Unknown;
        }
        let minute = read_timestamp_number(&text, index + 1, end);
        index = minute.next;
        if minute.digits < 1 {
            return TimestamptzValue::Unknown;
        }
        let mut second: i32 = 0;
        let mut fraction: i32 = 0;
        if index < end && text.chars[index] == ':' {
            let seconds = read_timestamp_number(&text, index + 1, end);
            index = seconds.next;
            if seconds.digits < 1 {
                return TimestamptzValue::Unknown;
            }
            second = seconds.value;
            if index < end && text.chars[index] == '.' {
                let digits = read_timestamp_number(&text, index + 1, end);
                index = digits.next;
                if digits.digits < 1 || digits.digits > 6 {
                    return TimestamptzValue::Unknown;
                }
                fraction = digits.value;
                let mut fraction_digits = digits.digits;
                while fraction_digits < 6 {
                    fraction = fraction * 10;
                    fraction_digits += 1;
                }
            }
        }
        while index < end && date_text_space(text.chars[index]) {
            index += 1;
        }
        let mut offset: i32 = 0;
        if index < end && text.chars[index].to_ascii_lowercase() == 'z' {
            index += 1;
        } else if index < end && (text.chars[index] == '+' || text.chars[index] == '-') {
            let sign = text.chars[index];
            let zone_hour = read_timestamp_number(&text, index + 1, end);
            index = zone_hour.next;
            if zone_hour.digits < 1 || zone_hour.digits > 4 {
                return TimestamptzValue::Unknown;
            }
            let mut hours = zone_hour.value;
            let mut minutes: i32 = 0;
            let mut seconds: i32 = 0;
            if index < end && text.chars[index] == ':' {
                if zone_hour.digits > 2 {
                    return TimestamptzValue::Unknown;
                }
                let zone_minute = read_timestamp_number(&text, index + 1, end);
                index = zone_minute.next;
                if zone_minute.digits < 1 {
                    return TimestamptzValue::Unknown;
                }
                minutes = zone_minute.value;
                if index < end && text.chars[index] == ':' {
                    let zone_second = read_timestamp_number(&text, index + 1, end);
                    index = zone_second.next;
                    if zone_second.digits < 1 {
                        return TimestamptzValue::Unknown;
                    }
                    seconds = zone_second.value;
                }
            } else if zone_hour.digits > 2 {
                hours = zone_hour.value / 100;
                minutes = zone_hour.value % 100;
            }
            if index != end {
                return TimestamptzValue::Unknown;
            }
            if hours > 15 || minutes > 59 || seconds > 59 {
                offset = 57600;
            } else {
                offset = (hours * 60 + minutes) * 60 + seconds;
                if sign == '-' {
                    offset = 0 - offset;
                }
            };
        } else {
            return TimestamptzValue::Unknown;
        }
        if index != end {
            return TimestamptzValue::Unknown;
        }
        if year_field.overflow {
            return TimestamptzValue::Error(SqlError {
                state: TIMESTAMPTZ_FIELD_OVERFLOW,
            });
        }
        let mut year = year_field.value;
        if bc {
            year = 0 - year;
        }
        return timestamptz_from_calendar(
            year,
            month.value,
            day.value,
            hour.value,
            minute.value,
            second,
            fraction,
            offset,
        );
    }
    TimestamptzValue::Unknown
}
