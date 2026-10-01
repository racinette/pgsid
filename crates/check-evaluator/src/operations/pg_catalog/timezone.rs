const INVALID_TIMEZONE_NAME: u32 = 3452619;

struct TimezoneText {
    chars: Vec<char>,
}

struct TimezoneNumber {
    next: usize,
    value: i32,
    valid: bool,
}

fn timezone_digit(value: char) -> i32 {
    if value == '0' {
        return 0;
    }
    if value == '1' {
        return 1;
    }
    if value == '2' {
        return 2;
    }
    if value == '3' {
        return 3;
    }
    if value == '4' {
        return 4;
    }
    if value == '5' {
        return 5;
    }
    if value == '6' {
        return 6;
    }
    if value == '7' {
        return 7;
    }
    if value == '8' {
        return 8;
    }
    if value == '9' {
        return 9;
    }
    -1
}

fn read_timezone_number(text: &TimezoneText, start: usize, maximum: i32) -> TimezoneNumber {
    let mut index = start;
    let mut value: i32 = 0;
    let mut valid = false;
    while index < text.chars.len() && timezone_digit(text.chars[index]) >= 0 {
        valid = true;
        value = value * 10 + timezone_digit(text.chars[index]);
        if value > maximum {
            return TimezoneNumber {
                next: index,
                value: 0,
                valid: false,
            };
        }
        index += 1;
    }
    TimezoneNumber {
        next: index,
        value: value,
        valid: valid,
    }
}

fn timezone_fixed_offset(name: &str) -> Int4Value {
    let chars: Vec<char> = name.chars().collect();
    if chars.len() > 128 {
        return Int4Value::Unknown;
    }
    let text = TimezoneText { chars: chars };
    let mut index = 0;
    if text.chars.len() >= 3 {
        let utc = text.chars[0].to_ascii_lowercase() == 'u'
            && text.chars[1].to_ascii_lowercase() == 't'
            && text.chars[2].to_ascii_lowercase() == 'c';
        let gmt = text.chars[0].to_ascii_lowercase() == 'g'
            && text.chars[1].to_ascii_lowercase() == 'm'
            && text.chars[2].to_ascii_lowercase() == 't';
        if utc || gmt {
            index = 3;
            if index == text.chars.len() {
                return Int4Value::Value(0);
            }
        }
    }
    if index < text.chars.len()
        && timezone_digit(text.chars[index]) < 0
        && text.chars[index] != '+'
        && text.chars[index] != '-'
    {
        return Int4Value::Unknown;
    }
    let mut scan = index;
    while scan < text.chars.len() {
        let character = text.chars[scan];
        if timezone_digit(character) < 0 && character != '+' && character != '-' && character != ':'
        {
            return Int4Value::Unknown;
        }
        scan += 1;
    }
    let mut sign: i32 = 1;
    if index < text.chars.len() && (text.chars[index] == '+' || text.chars[index] == '-') {
        if text.chars[index] == '-' {
            sign = -1;
        }
        index += 1;
    }
    let hour = read_timezone_number(&text, index, 167);
    if hour.valid == false {
        return Int4Value::Error(SqlError {
            state: INVALID_TIMEZONE_NAME,
        });
    }
    index = hour.next;
    let mut minute: i32 = 0;
    let mut second: i32 = 0;
    if index < text.chars.len() && text.chars[index] == ':' {
        index += 1;
        let number = read_timezone_number(&text, index, 59);
        if number.valid == false {
            return Int4Value::Error(SqlError {
                state: INVALID_TIMEZONE_NAME,
            });
        }
        minute = number.value;
        index = number.next;
        if index < text.chars.len() && text.chars[index] == ':' {
            index += 1;
            let number = read_timezone_number(&text, index, 60);
            if number.valid == false {
                return Int4Value::Error(SqlError {
                    state: INVALID_TIMEZONE_NAME,
                });
            }
            second = number.value;
            index = number.next;
        }
    }
    if index < text.chars.len() {
        return Int4Value::Unknown;
    }
    // POSIX signs measure seconds west of UTC, unlike timestamp literal offsets.
    Int4Value::Value(sign * (hour.value * 3600 + minute * 60 + second))
}

pub fn sql__pg_catalog__timezone__9nbk(zone: TextValue, value: TimestampValue) -> TimestamptzValue {
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    }
    if let TimestampValue::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    if zone == TextValue::Unknown || value == TimestampValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if zone == TextValue::Null || value == TimestampValue::Null {
        return TimestamptzValue::Null;
    }
    if let TimestampValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return make_timestamptz_value(microseconds);
        }
        if let TextValue::Value(name) = zone {
            let offset = timezone_fixed_offset(name);
            if let Int4Value::Error(error) = offset {
                return TimestamptzValue::Error(error);
            }
            if let Int4Value::Value(seconds) = offset {
                let wide = seconds as i64;
                return make_timestamptz_value(microseconds + wide * 1000000i64);
            }
        }
    }
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timezone__blof(zone: TextValue, value: TimestamptzValue) -> TimestampValue {
    if let TextValue::Error(error) = zone {
        return TimestampValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = value {
        return TimestampValue::Error(error);
    }
    if zone == TextValue::Unknown || value == TimestamptzValue::Unknown {
        return TimestampValue::Unknown;
    }
    if zone == TextValue::Null || value == TimestamptzValue::Null {
        return TimestampValue::Null;
    }
    if let TimestamptzValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return make_timestamp_value(microseconds);
        }
        if let TextValue::Value(name) = zone {
            let offset = timezone_fixed_offset(name);
            if let Int4Value::Error(error) = offset {
                return TimestampValue::Error(error);
            }
            if let Int4Value::Value(seconds) = offset {
                let wide = seconds as i64;
                return make_timestamp_value(microseconds - wide * 1000000i64);
            }
        }
    }
    TimestampValue::Unknown
}
