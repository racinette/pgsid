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
    date_only: bool,
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
    // A year and month followed by a clock (`2000 01 12:00`) leave the day missing, which
    // PostgreSQL reports only after the clock and zone fields decode.
    if day < 0 {
        if year != 0 && month >= 1 && month <= 12 {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        return Int8Value::Error(SqlError {
            state: TIMESTAMP_FIELD_OVERFLOW,
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
        if date_only {
            let date_wide = day_value as i64;
            return Int8Value::Value(date_wide);
        }
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

// ParseDateTime skips ASCII punctuation where a field would start; these characters never
// continue a field, so they separate fields wherever they appear.
fn temporal_skipped_punctuation(value: char) -> bool {
    value == '!'
        || value == '"'
        || value == '#'
        || value == '$'
        || value == '%'
        || value == '&'
        || value == '\''
        || value == '('
        || value == ')'
        || value == '*'
        || value == ','
        || value == ';'
        || value == '<'
        || value == '='
        || value == '>'
        || value == '?'
        || value == '@'
        || value == '['
        || value == '\\'
        || value == ']'
        || value == '^'
        || value == '`'
        || value == '{'
        || value == '|'
        || value == '}'
        || value == '~'
}

// PostgreSQL decodes a clock before any later field, so a number after the clock reports the
// clock's range error first and otherwise rejects the extra field. An hour of 24, whose carry
// rules apply only after the loop, defers.
fn temporal_number_after_clock(
    hour: i32,
    minute: i32,
    second: i32,
    compact_clock: bool,
    year_overflow: bool,
) -> Int8Value {
    if year_overflow || compact_clock || hour == 24 {
        return Int8Value::Unknown;
    }
    if hour < 0 || hour > 24 || minute < 0 || minute > 59 || second < 0 || second > 60 {
        return Int8Value::Error(SqlError {
            state: TIMESTAMP_FIELD_OVERFLOW,
        });
    }
    Int8Value::Error(SqlError {
        state: INVALID_TIMESTAMP_TEXT,
    })
}

fn parse_timestamp_text(value: TextValue, with_timezone: bool) -> Int8Value {
    parse_temporal_text(value, with_timezone, false)
}

fn parse_temporal_text(value: TextValue, with_timezone: bool, date_only: bool) -> Int8Value {
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
        // PostgreSQL reads BC or AD as an ordinary field anywhere after the first one, so the era
        // is blanked before the date and clock grammar runs, as is punctuation its lexer skips
        // where a field would start. A leading era is rejected before
        // other fields are validated; a repeated era is reported in field order, after clock and
        // zone errors but before date validation, so it defers.
        let mut bc = false;
        let mut eras = 0;
        let mut scanned: Vec<char> = Vec::new();
        let mut era_index = 0;
        while era_index < chars.len() {
            let mut era_end = era_index;
            while era_end < chars.len() && english_date_letter(chars[era_end]) {
                era_end += 1;
            }
            if era_end == era_index {
                let era_character = chars[era_index];
                let era_field_start =
                    scanned.len() == 0 || date_text_space(scanned[scanned.len() - 1]);
                if temporal_skipped_punctuation(era_character)
                    || (era_field_start
                        && (era_character == '/' || era_character == ':' || era_character == '_'))
                {
                    scanned.push(' ');
                } else {
                    scanned.push(era_character);
                }
                era_index += 1;
            } else {
                let era_letter = chars[era_index].to_ascii_lowercase();
                let era = era_end - era_index == 2
                    && ((era_letter == 'b' && chars[era_index + 1].to_ascii_lowercase() == 'c')
                        || (era_letter == 'a' && chars[era_index + 1].to_ascii_lowercase() == 'd'));
                if era {
                    let mut era_leading = true;
                    let mut era_digit_before = false;
                    let mut era_before = 0;
                    while era_before < era_index {
                        if date_text_space(chars[era_before]) == false {
                            era_leading = false;
                        }
                        if date_text_digit(chars[era_before]) >= 0 {
                            era_digit_before = true;
                        }
                        era_before += 1;
                    }
                    if era_leading {
                        return Int8Value::Error(SqlError {
                            state: INVALID_TIMESTAMP_TEXT,
                        });
                    }
                    let mut era_trailing = true;
                    let mut era_after = era_end;
                    while era_after < chars.len() {
                        if date_text_space(chars[era_after]) == false {
                            era_trailing = false;
                        }
                        era_after += 1;
                    }
                    // A trailing era after special words such as epoch is ignored, as before.
                    if (era_digit_before == false && era_trailing == false) || eras > 0 {
                        return Int8Value::Unknown;
                    }
                    let era_previous = chars[era_index - 1];
                    if date_text_space(era_previous) == false && date_text_digit(era_previous) < 0 {
                        return Int8Value::Unknown;
                    }
                    if era_end < chars.len() {
                        let era_next = chars[era_end];
                        if date_text_space(era_next) == false
                            && date_text_digit(era_next) < 0
                            && era_next != '+'
                        {
                            return Int8Value::Unknown;
                        }
                    }
                    eras += 1;
                    if era_letter == 'b' {
                        bc = true;
                    }
                    scanned.push(' ');
                    scanned.push(' ');
                } else {
                    while era_index < era_end {
                        scanned.push(chars[era_index]);
                        era_index += 1;
                    }
                }
                era_index = era_end;
            };
        }
        let text = TimestampText { chars: scanned };
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
                date_only,
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
        let leading_word = english_date_word(&text, start, end);
        if english_date_weekday(leading_word.as_str()) {
            let leading_end = english_date_word_end(&text, start, end);
            let after = english_date_gap(&text, leading_end, end);
            let mut token_end = after;
            let mut delimited = false;
            let mut long_number = false;
            let mut digit_run = 0;
            while token_end < end && date_text_space(text.chars[token_end]) == false {
                let character = text.chars[token_end];
                if date_text_digit(character) >= 0 {
                    digit_run += 1;
                    if digit_run >= 10 {
                        long_number = true;
                    }
                } else {
                    digit_run = 0;
                    if token_end > after && english_date_delimiter(character) {
                        delimited = true;
                    }
                }
                token_end += 1;
            }
            let first_word = english_date_word(&text, after, end);
            let julian_label = first_word == "j" || first_word == "jd" || first_word == "julian";
            // A weekday's field mask makes PostgreSQL reject any delimited date after it.
            if delimited && julian_label == false && after < end {
                if long_number {
                    return Int8Value::Unknown;
                }
                return Int8Value::Error(SqlError {
                    state: INVALID_TIMESTAMP_TEXT,
                });
            }
            if after > leading_end {
                start = after;
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
        let mut julian_date = false;
        let mut julian_time: i64 = -1i64;
        if ordinal.state == ORDINAL_DATE_FOUND {
            year = ordinal.year;
            year_overflow = ordinal.overflow;
            index = ordinal.next;
            ordinal_day = ordinal.day;
        } else if ordinal.state == ORDINAL_DATE_CALENDAR {
            year = ordinal.year;
            year_overflow = false;
            index = ordinal.next;
            month = ordinal.month;
            day = ordinal.day;
            julian_date = ordinal.julian;
            julian_time = ordinal.julian_time;
        } else if year_field.digits >= 6
            && (index == end
                || (text.chars[index] != '-'
                    && text.chars[index] != '/'
                    && text.chars[index] != '.'))
        {
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
            if year_field.digits < 3 || index == end {
                return Int8Value::Unknown;
            }
            let separator = text.chars[index];
            if separator != '-' && separator != '/' && separator != '.' {
                return Int8Value::Unknown;
            }
            let month_field = read_timestamp_number(&text, index + 1, end);
            index = month_field.next;
            if month_field.digits < 1 || index == end || text.chars[index] != separator {
                return Int8Value::Unknown;
            }
            let day_field = read_timestamp_number(&text, index + 1, end);
            index = day_field.next;
            if index < end && text.chars[index] == separator {
                let extra_field = read_timestamp_number(&text, index + 1, end);
                if day_field.digits == 0
                    || extra_field.digits == 0
                    || extra_field.overflow
                    || year_overflow
                    || month_field.overflow
                    || day_field.overflow
                    || (month_field.digits == 3
                        && month_field.value >= 1
                        && month_field.value <= 366)
                {
                    return Int8Value::Unknown;
                }
                return Int8Value::Error(SqlError {
                    state: INVALID_TIMESTAMP_TEXT,
                });
            }
            if month_field.digits == 3 && month_field.value >= 1 && month_field.value <= 366 {
                // A field after a day of year is rejected in every width; four or six digits are
                // not read as a clock on this path.
                if day_field.digits > 0 {
                    if year_overflow || day_field.overflow {
                        if index == end {
                            return Int8Value::Error(SqlError {
                                state: TIMESTAMP_FIELD_OVERFLOW,
                            });
                        }
                        return Int8Value::Unknown;
                    }
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_TEXT,
                    });
                }
                ordinal_day = month_field.value;
            } else {
                if day_field.digits < 1 {
                    if year_overflow || month_field.overflow {
                        if index == end {
                            return Int8Value::Error(SqlError {
                                state: TIMESTAMP_FIELD_OVERFLOW,
                            });
                        }
                        return Int8Value::Unknown;
                    }
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_TEXT,
                    });
                }
                if month_field.overflow || day_field.overflow {
                    year_overflow = true;
                }
                month = month_field.value;
                day = day_field.value;
            };
        }
        if bc && julian_date == false {
            year = 0 - year;
        }
        let mut julian_hour: i32 = 0;
        let mut julian_minute: i32 = 0;
        let mut julian_second: i32 = 0;
        let mut julian_fraction: i32 = 0;
        if julian_time >= 0i64 {
            julian_hour = (julian_time / 3600000000i64) as i32;
            julian_minute = (julian_time / 60000000i64 % 60i64) as i32;
            julian_second = (julian_time / 1000000i64 % 60i64) as i32;
            julian_fraction = (julian_time % 1000000i64) as i32;
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
                julian_hour,
                julian_minute,
                julian_second,
                julian_fraction,
                0,
                false,
                false,
                with_timezone,
                false,
                ordinal_day,
                date_only,
            );
        }
        let mut deferred_zone = false;
        let mut deferred_zone_start = index;
        let mut deferred_zone_end = index;
        let mut zone_only = text.chars[index] == '+'
            || text.chars[index].to_ascii_lowercase() == 'z'
            || (ordinal.state == ORDINAL_DATE_FOUND
                && ordinal.minus_zone
                && text.chars[index] == '-');
        if text.chars[index].to_ascii_lowercase() == 't' {
            index += 1;
        } else if date_text_space(text.chars[index]) {
            while index < end && date_text_space(text.chars[index]) {
                index += 1;
            }
            let leading_word = english_date_word(&text, index, end);
            if english_date_weekday(leading_word.as_str()) {
                index = english_date_word_end(&text, index, end);
                while index < end && date_text_space(text.chars[index]) {
                    index += 1;
                }
            }
            // `T` after whitespace still separates the date from the clock.
            if index < end
                && text.chars[index].to_ascii_lowercase() == 't'
                && (index + 1 == end
                    || date_text_digit(text.chars[index + 1]) >= 0
                    || date_text_space(text.chars[index + 1]))
            {
                index += 1;
                while index < end && date_text_space(text.chars[index]) {
                    index += 1;
                }
                if index == end {
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_TEXT,
                    });
                }
            }
            let clock_word = english_date_word(&text, index, end);
            if index == end
                || text.chars[index] == '+'
                || text.chars[index] == '-'
                || text.chars[index].to_ascii_lowercase() == 'z'
                || clock_word == "am"
                || clock_word == "pm"
            {
                zone_only = true;
            }
        } else if zone_only == false {
            return Int8Value::Unknown;
        }
        if zone_only && index < end {
            let zone_mark = text.chars[index].to_ascii_lowercase();
            if zone_mark == '+' || zone_mark == '-' || zone_mark == 'z' {
                let mut token_end = index + 1;
                if zone_mark != 'z' {
                    while token_end < end
                        && (date_text_digit(text.chars[token_end]) >= 0
                            || text.chars[token_end] == ':')
                    {
                        token_end += 1;
                    }
                }
                let mut clock_start = token_end;
                while clock_start < end && date_text_space(text.chars[clock_start]) {
                    clock_start += 1;
                }
                let mut digit_start = clock_start;
                if digit_start < end && text.chars[digit_start].to_ascii_lowercase() == 't' {
                    digit_start += 1;
                }
                let zone_body = zone_mark == 'z' || token_end > index + 1;
                // A zone written before the clock decodes first, so it is parsed from
                // its own span after the clock.
                if zone_body
                    && clock_start > token_end
                    && digit_start < end
                    && date_text_digit(text.chars[digit_start]) >= 0
                {
                    deferred_zone = true;
                    deferred_zone_start = index;
                    deferred_zone_end = token_end;
                    index = digit_start;
                }
            }
            if deferred_zone {
                zone_only = false;
            }
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
        } else if hours.digits > 0 {
            // A number that is not a clock after a complete date is rejected in the field loop,
            // after earlier date overflow and zone errors.
            if year_overflow || deferred_zone {
                return Int8Value::Unknown;
            }
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        } else if zone_only == false {
            return Int8Value::Unknown;
        }
        if julian_time >= 0i64 {
            if hours.digits > 0 {
                return Int8Value::Error(SqlError {
                    state: INVALID_TIMESTAMP_TEXT,
                });
            }
            hour = julian_hour;
            minute = julian_minute;
            second = julian_second;
            fraction = julian_fraction;
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
        let mut meridian: i32 = 0;
        while index < end && english_date_letter(text.chars[index]) {
            let word = english_date_word(&text, index, end);
            if word == "am" || word == "pm" {
                if meridian != 0 {
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_TEXT,
                    });
                }
                meridian = 1;
                if word == "pm" {
                    meridian = 2;
                }
            } else if english_date_weekday(word.as_str()) == false {
                break;
            }
            index = english_date_word_end(&text, index, end);
            while index < end && date_text_space(text.chars[index]) {
                index += 1;
            }
        }
        let resume_index = index;
        if deferred_zone {
            index = deferred_zone_start;
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
            if hours > 15 || minutes > 59 || seconds > 59 {
                offset = 57600;
            } else {
                offset = (hours * 60 + minutes) * 60 + seconds;
                if sign == '-' {
                    offset = 0 - offset;
                }
            };
        } else if index < end
            && deferred_zone == false
            && hours.digits > 0
            && date_text_digit(text.chars[index]) >= 0
        {
            return temporal_number_after_clock(hour, minute, second, compact_clock, year_overflow);
        } else if index != end {
            return Int8Value::Unknown;
        } else if with_timezone {
            missing_timezone = true;
        }
        if deferred_zone {
            if index != deferred_zone_end {
                return Int8Value::Unknown;
            }
            if offset < -57599 || offset > 57599 {
                return Int8Value::Error(SqlError {
                    state: INVALID_TIMESTAMP_ZONE,
                });
            }
            index = resume_index;
        }
        while index < end && date_text_space(text.chars[index]) {
            index += 1;
        }
        while index < end && english_date_letter(text.chars[index]) {
            let word = english_date_word(&text, index, end);
            if word == "am" || word == "pm" {
                if meridian != 0 {
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_TEXT,
                    });
                }
                meridian = 1;
                if word == "pm" {
                    meridian = 2;
                }
            } else if english_date_weekday(word.as_str()) == false {
                break;
            }
            index = english_date_word_end(&text, index, end);
            while index < end && date_text_space(text.chars[index]) {
                index += 1;
            }
        }
        if index < end
            && deferred_zone == false
            && hours.digits > 0
            && date_text_digit(text.chars[index]) >= 0
        {
            let after_clock =
                temporal_number_after_clock(hour, minute, second, compact_clock, year_overflow);
            if after_clock == Int8Value::Unknown {
                return Int8Value::Unknown;
            }
            if let Int8Value::Error(error) = after_clock {
                if error.state == INVALID_TIMESTAMP_TEXT && (offset < -57599 || offset > 57599) {
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_ZONE,
                    });
                }
            }
            return after_clock;
        }
        if index != end {
            return Int8Value::Unknown;
        }
        if year_overflow {
            return Int8Value::Error(SqlError {
                state: TIMESTAMP_FIELD_OVERFLOW,
            });
        }
        if meridian != 0 {
            // PostgreSQL rejects a meridian hour above twelve only after zone fields decode.
            if hour > 12 {
                if offset < -57599 || offset > 57599 {
                    return Int8Value::Error(SqlError {
                        state: INVALID_TIMESTAMP_ZONE,
                    });
                }
                return Int8Value::Error(SqlError {
                    state: TIMESTAMP_FIELD_OVERFLOW,
                });
            }
            if meridian == 1 && hour == 12 {
                hour = 0;
            } else if meridian == 2 && hour != 12 {
                hour = hour + 12;
            };
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
            date_only,
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
        false,
    );
    timestamp_from_microseconds(parsed)
}

pub fn timestamp_from_text(value: TextValue) -> TimestampValue {
    let parsed = parse_timestamp_text(value, false);
    timestamp_from_microseconds(parsed)
}
