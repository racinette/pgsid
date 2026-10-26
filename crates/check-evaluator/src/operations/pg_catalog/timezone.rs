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

fn timezone_forced_type(entry: usize, spelling: &str) -> Int4Value {
    if ZONE_TYPE_VISIBLE[entry] != 0
        && ZONE_ABBREVIATIONS[ZONE_TYPE_ABBREVIATION_IDS[entry]] == spelling
    {
        return make_int4_value(ZONE_TYPE_OFFSET_SECONDS[entry]);
    };
    Int4Value::Null
}

fn timezone_forced_history(zone: usize, spelling: &str, seconds: i64) -> Int4Value {
    let mut left = ZONE_FORCE_STARTS[zone];
    let mut step: usize = 0;
    while step < ZONE_SEARCH_STEPS.len() {
        let candidate = left + ZONE_SEARCH_STEPS[step];
        if candidate <= ZONE_FORCE_ENDS[zone] && ZONE_FORCE_SECONDS[candidate - 1] <= seconds {
            left = candidate;
        };
        step += 1;
    }
    let cutoff = left;
    let mut index = cutoff;
    while index > ZONE_FORCE_STARTS[zone] {
        index = index - 1;
        let found = timezone_forced_type(ZONE_FORCE_TYPE_IDS[index] as usize, spelling);
        if found != Int4Value::Null {
            return found;
        };
    }
    let initial = timezone_forced_type(ZONE_FORCE_INITIAL_TYPES[zone], spelling);
    if initial != Int4Value::Null {
        return initial;
    };
    index = cutoff;
    while index < ZONE_FORCE_ENDS[zone] {
        let found = timezone_forced_type(ZONE_FORCE_TYPE_IDS[index] as usize, spelling);
        if found != Int4Value::Null {
            return found;
        };
        index += 1;
    }
    if ZONE_RECURRING[zone] != 0 {
        index = ZONE_TYPE_ENDS[zone] - 2;
        while index < ZONE_TYPE_ENDS[zone] {
            let found = timezone_forced_type(index, spelling);
            if found != Int4Value::Null {
                return found;
            };
            index += 1;
        }
    };
    Int4Value::Null
}

fn timezone_forced_offset(name: &str, spelling: &str, microseconds: i64, local: bool) -> Int4Value {
    let zone = find_zone_name(name, false);
    if zone >= ZONE_NAMES.len() {
        return Int4Value::Unknown;
    };
    let mut probe = microseconds / 1000000i64;
    let mut fallback: i32 = 0;
    if local {
        if microseconds % 1000000i64 < 0i64 {
            probe = probe - 1i64;
        };
        let profile = session_timezone_profile(name, microseconds, true);
        if profile.valid == false {
            return Int4Value::Unknown;
        };
        fallback = profile.seconds;
        probe = probe - (fallback as i64);
    };
    let upper = timezone_lookup_ascii(spelling, true);
    let found = timezone_forced_history(zone, upper.as_str(), probe);
    if found != Int4Value::Null {
        return found;
    };
    if local == false {
        let profile = session_timezone_profile(name, microseconds, false);
        if profile.valid == false {
            return Int4Value::Unknown;
        };
        let projected = microseconds + (profile.seconds as i64) * 1000000i64;
        let adjusted = session_timezone_profile(name, projected, true);
        if adjusted.valid == false {
            return Int4Value::Unknown;
        };
        fallback = adjusted.seconds;
    };
    make_int4_value(fallback)
}

pub fn sql__pg_catalog__timezone__9nbk(
    zone: TextValue,
    value: TimestampValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimestamptzValue {
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    };
    if let TimestampValue::Error(error) = value {
        return TimestamptzValue::Error(error);
    };
    if zone == TextValue::Unknown || value == TimestampValue::Unknown {
        return TimestamptzValue::Unknown;
    };
    if zone == TextValue::Null || value == TimestampValue::Null {
        return TimestamptzValue::Null;
    };
    if let TimestampValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return TimestamptzValue::Value(microseconds);
        };
        let selected = timezone_lookup_classify(zone, session, limit, utf8, default_profile);
        let selected_profile = selected.profile;
        if let TextValue::Error(error) = selected_profile {
            return TimestamptzValue::Error(error);
        };
        if let TextValue::Value(name) = selected_profile {
            let mut seconds = selected.seconds;
            if selected.kind != 1 {
                if microseconds < -211813488000000000i64 {
                    return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
                };
                if selected.kind == 2 {
                    let forced = timezone_forced_offset(
                        name.as_str(),
                        selected.spelling.as_str(),
                        microseconds,
                        true,
                    );
                    if let Int4Value::Error(error) = forced {
                        return TimestamptzValue::Error(error);
                    };
                    let mut known = false;
                    if let Int4Value::Value(offset) = forced {
                        seconds = offset;
                        known = true;
                    };
                    if known == false {
                        return TimestamptzValue::Unknown;
                    };
                } else {
                    let profile = session_timezone_profile(name.as_str(), microseconds, true);
                    if profile.valid == false {
                        return TimestamptzValue::Unknown;
                    };
                    seconds = profile.seconds;
                };
            };
            return make_timestamptz_value(microseconds - (seconds as i64) * 1000000i64);
        };
    };
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timezone__blof(
    zone: TextValue,
    value: TimestamptzValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimestampValue {
    if let TextValue::Error(error) = zone {
        return TimestampValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = value {
        return TimestampValue::Error(error);
    };
    if zone == TextValue::Unknown || value == TimestamptzValue::Unknown {
        return TimestampValue::Unknown;
    };
    if zone == TextValue::Null || value == TimestamptzValue::Null {
        return TimestampValue::Null;
    };
    if let TimestamptzValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return TimestampValue::Value(microseconds);
        };
        let selected = timezone_lookup_classify(zone, session, limit, utf8, default_profile);
        let selected_profile = selected.profile;
        if let TextValue::Error(error) = selected_profile {
            return TimestampValue::Error(error);
        };
        if let TextValue::Value(name) = selected_profile {
            let mut seconds = selected.seconds;
            if selected.kind == 2 {
                let forced = timezone_forced_offset(
                    name.as_str(),
                    selected.spelling.as_str(),
                    microseconds,
                    false,
                );
                if let Int4Value::Error(error) = forced {
                    return TimestampValue::Error(error);
                };
                let mut known = false;
                if let Int4Value::Value(offset) = forced {
                    seconds = offset;
                    known = true;
                };
                if known == false {
                    return TimestampValue::Unknown;
                };
            } else if selected.kind == 0 {
                let profile = session_timezone_profile(name.as_str(), microseconds, false);
                if profile.valid == false {
                    return TimestampValue::Unknown;
                };
                seconds = profile.seconds;
            };
            return make_timestamp_value(microseconds + (seconds as i64) * 1000000i64);
        };
    };
    TimestampValue::Unknown
}
