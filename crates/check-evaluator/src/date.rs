const DATE_FIELD_OVERFLOW: u32 = 3452552;
const INVALID_DATE_TEXT: u32 = 3452551;

fn date_text_space(value: char) -> bool {
    value == ' '
        || value == '\t'
        || value == '\n'
        || value == '\r'
        || value == '\u{b}'
        || value == '\u{c}'
}

fn date_text_digit(value: char) -> i32 {
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

const ORDINAL_DATE_ABSENT: i32 = 0;
const ORDINAL_DATE_FOUND: i32 = 1;
const ORDINAL_DATE_DEFERRED: i32 = 2;
const ORDINAL_DATE_SYNTAX: i32 = 3;
const ORDINAL_DATE_OVERFLOW: i32 = 4;
const ORDINAL_DATE_CALENDAR: i32 = 5;

struct OrdinalDateText {
    state: i32,
    next: usize,
    year: i32,
    overflow: bool,
    month: i32,
    day: i32,
    minus_zone: bool,
}

struct OrdinalCalendar {
    known: bool,
    year: i32,
    month: i32,
    day: i32,
}

fn read_ordinal_date(text: &TimestampText, start: usize, end: usize) -> OrdinalDateText {
    let year = read_timestamp_number(text, start, end);
    let mut index = year.next;
    let mut state = ORDINAL_DATE_ABSENT;
    let mut month: i32 = 0;
    let mut day: i32 = 0;
    let mut minus_zone = false;
    if year.digits > 0 && index < end {
        let separator = text.chars[index];
        if separator == '-' || separator == '/' || separator == '.' {
            let field = read_timestamp_number(text, index + 1, end);
            if field.digits > 0 && (field.next == end || text.chars[field.next] != separator) {
                index = field.next;
                if field.digits == 3 && field.value >= 1 && field.value <= 366 {
                    state = ORDINAL_DATE_FOUND;
                    day = field.value;
                    minus_zone = separator != '-';
                    if year.digits <= 2 {
                        state = ORDINAL_DATE_DEFERRED;
                    };
                } else if year.overflow || field.overflow {
                    state = ORDINAL_DATE_DEFERRED;
                    if index == end {
                        state = ORDINAL_DATE_OVERFLOW;
                    };
                } else {
                    state = ORDINAL_DATE_SYNTAX;
                };
            };
        } else if date_text_space(separator) && year.digits >= 3 && year.digits <= 5 {
            let mut position = index;
            while position < end && date_text_space(text.chars[position]) {
                position += 1;
            }
            let field = read_timestamp_number(text, position, end);
            if field.digits == 3
                && field.value >= 1
                && field.value <= 366
                && (field.next == end
                    || date_text_space(text.chars[field.next])
                    || text.chars[field.next].to_ascii_lowercase() == 't'
                    || text.chars[field.next] == '+')
            {
                state = ORDINAL_DATE_FOUND;
                day = field.value;
                index = field.next;
            } else if field.digits >= 6 {
                state = ORDINAL_DATE_SYNTAX;
            } else if field.digits > 0 && field.next == end {
                index = field.next;
                state = ORDINAL_DATE_OVERFLOW;
                if year.value != 0 && field.value >= 1 && field.value <= 12 {
                    state = ORDINAL_DATE_SYNTAX;
                };
            } else if field.digits > 0 && date_text_space(text.chars[field.next]) {
                let mut third_start = field.next;
                while third_start < end && date_text_space(text.chars[third_start]) {
                    third_start += 1;
                }
                let third = read_timestamp_number(text, third_start, end);
                if third.digits >= 6 {
                    state = ORDINAL_DATE_SYNTAX;
                } else if third.digits > 0
                    && (third.next == end
                        || date_text_space(text.chars[third.next])
                        || text.chars[third.next].to_ascii_lowercase() == 't'
                        || text.chars[third.next] == '+')
                {
                    state = ORDINAL_DATE_CALENDAR;
                    month = field.value;
                    day = third.value;
                    index = third.next;
                };
            };
        };
    };
    OrdinalDateText {
        state: state,
        next: index,
        year: year.value,
        overflow: year.overflow,
        month: month,
        day: day,
        minus_zone: minus_zone,
    }
}

fn ordinal_int4_range(value: i64) -> bool {
    value >= -2147483648i64 && value <= 2147483647i64
}

fn calendar_from_ordinal(year: i32, day: i32) -> OrdinalCalendar {
    if year == 0 {
        return OrdinalCalendar {
            known: true,
            year: 0,
            month: 1,
            day: 1,
        };
    }
    let mut astronomical = year as i64;
    if year < 0 {
        astronomical = astronomical + 1i64;
    }
    let shifted = astronomical + 4799i64;
    let century = shifted / 100i64;
    let scaled = shifted * 365i64;
    let based = scaled - 32167i64;
    let leap = based + (shifted / 4i64 - century + century / 4i64);
    let first = leap + 429i64;
    let wide_day = day as i64;
    let counted = first + wide_day;
    let julian_day = counted - 1i64;
    if ordinal_int4_range(shifted) == false
        || ordinal_int4_range(scaled) == false
        || ordinal_int4_range(based) == false
        || ordinal_int4_range(leap) == false
        || ordinal_int4_range(first) == false
        || ordinal_int4_range(counted) == false
        || ordinal_int4_range(julian_day) == false
    {
        return OrdinalCalendar {
            known: false,
            year: 0,
            month: 0,
            day: 0,
        };
    }
    // PostgreSQL splits Julian days with unsigned 32-bit arithmetic; days before its
    // supported range wrap rather than fail.
    let mut julian = julian_day + 32044i64;
    if julian < 0i64 {
        julian = julian + 4294967296i64;
    }
    let era = julian / 146097i64;
    let extra = (julian - era * 146097i64) * 4i64 + 3i64;
    julian = julian + 60i64 + era * 3i64 + extra / 146097i64;
    if julian >= 4294967296i64 {
        julian = julian - 4294967296i64;
    }
    let cycle = julian / 1461i64;
    julian = julian - cycle * 1461i64;
    let mut cycle_year = julian * 4i64 / 1461i64;
    if cycle_year != 0i64 {
        julian = (julian + 305i64) % 365i64 + 123i64;
    } else {
        julian = (julian + 306i64) % 366i64 + 123i64;
    }
    cycle_year = cycle_year + cycle * 4i64;
    let mut calendar_year = cycle_year - 4800i64;
    if calendar_year <= 0i64 {
        calendar_year = calendar_year - 1i64;
    }
    let month_index = julian * 2141i64 / 65536i64;
    let calendar_day = julian - 7834i64 * month_index / 256i64;
    let calendar_month = (month_index + 10i64) % 12i64 + 1i64;
    OrdinalCalendar {
        known: true,
        year: calendar_year as i32,
        month: calendar_month as i32,
        day: calendar_day as i32,
    }
}

fn calendar_short_year(year: i32, digits: usize, bc: bool) -> i32 {
    if digits == 2 && bc == false {
        if year < 70 {
            return year + 2000;
        }
        return year + 1900;
    }
    year
}

pub fn date_from_text(value: TextValue) -> DateValue {
    if let TextValue::Error(error) = value {
        return DateValue::Error(error);
    }
    if (value == TextValue::Unknown || value == TextValue::NonNull) {
        return DateValue::Unknown;
    }
    if value == TextValue::Null {
        return DateValue::Null;
    }
    if let TextValue::Value(text) = value {
        let chars: Vec<char> = text.chars().collect();
        if chars.len() > 128 {
            return DateValue::Unknown;
        }
        let mut start = 0;
        let mut end = chars.len();
        while start < end && date_text_space(chars[start]) {
            start += 1;
        }
        while start < end && date_text_space(chars[end - 1]) {
            end = end - 1;
        }
        if start == end {
            return DateValue::Error(SqlError {
                state: INVALID_DATE_TEXT,
            });
        }
        if end - start >= 2
            && chars[end - 1].to_ascii_lowercase() == 'c'
            && chars[end - 2].to_ascii_lowercase() == 'b'
        {
            if end - start > 2
                && date_text_space(chars[end - 3]) == false
                && date_text_digit(chars[end - 3]) < 0
            {
                return DateValue::Unknown;
            }
            end = end - 2;
        } else if end - start >= 2
            && chars[end - 1].to_ascii_lowercase() == 'd'
            && chars[end - 2].to_ascii_lowercase() == 'a'
        {
            if end - start > 2
                && date_text_space(chars[end - 3]) == false
                && date_text_digit(chars[end - 3]) < 0
            {
                return DateValue::Unknown;
            }
            end = end - 2;
        }
        while start < end && date_text_space(chars[end - 1]) {
            end = end - 1;
        }
        if start < end && chars[start].to_ascii_lowercase() == 'j' {
            let mut index = start;
            let mut label = String::new();
            while index < end {
                let character = chars[index].to_ascii_lowercase();
                let code = character as i32;
                if code < 97 || code > 122 {
                    break;
                }
                label.push(character);
                index += 1;
            }
            if label != "j" && label != "jd" && label != "julian" {
                return DateValue::Unknown;
            }
            while index < end && date_text_space(chars[index]) {
                index += 1;
            }
            if index == end {
                return DateValue::Error(SqlError {
                    state: INVALID_DATE_TEXT,
                });
            }
            let first = index;
            let mut julian: i32 = 0;
            let mut overflow = false;
            while index < end && date_text_digit(chars[index]) >= 0 {
                let digit = date_text_digit(chars[index]);
                if julian < 214748364 || (julian == 214748364 && digit <= 7) {
                    julian = julian * 10 + digit;
                } else {
                    overflow = true;
                }
                index += 1;
            }
            if index != end || index == first {
                return DateValue::Unknown;
            }
            if overflow {
                return DateValue::Error(SqlError {
                    state: DATE_FIELD_OVERFLOW,
                });
            }
            return make_date_value(julian - 2451545);
        }
        if end - start == 5
            && chars[start].to_ascii_lowercase() == 'e'
            && chars[start + 1].to_ascii_lowercase() == 'p'
            && chars[start + 2].to_ascii_lowercase() == 'o'
            && chars[start + 3].to_ascii_lowercase() == 'c'
            && chars[start + 4].to_ascii_lowercase() == 'h'
        {
            return date_from_ymd(1970, 1, 1);
        }
        let mut infinity_start = start;
        let mut negative = false;
        if infinity_start < end && chars[infinity_start] == '-' {
            negative = true;
            infinity_start += 1;
        } else if infinity_start < end && chars[infinity_start] == '+' {
            infinity_start += 1;
        }
        if end - infinity_start == 8 {
            let infinity: Vec<char> = "infinity".chars().collect();
            let mut index = 0;
            let mut matches = true;
            while index < infinity.len() {
                if chars[infinity_start + index].to_ascii_lowercase() != infinity[index] {
                    matches = false;
                }
                index += 1;
            }
            if matches {
                if negative {
                    return DateValue::Value(-2147483647 - 1);
                }
                return DateValue::Value(2147483647);
            }
        }
        return date_from_temporal_text(TextValue::Value(text.clone()));
    }
    DateValue::Unknown
}

fn date_from_temporal_text(value: TextValue) -> DateValue {
    let parsed = parse_temporal_text(value, false, true);
    if let Int8Value::Error(error) = parsed {
        return DateValue::Error(error);
    }
    if let Int8Value::Value(days) = parsed {
        if days >= -2147483648i64 && days <= 2147483647i64 {
            let narrow = days as i32;
            return make_date_value(narrow);
        }
    }
    DateValue::Unknown
}

pub fn date_from_ymd(year: i32, month: i32, day: i32) -> DateValue {
    let days = calendar_days_from_ymd(year, month, day);
    if let Int4Value::Error(error) = days {
        return DateValue::Error(error);
    }
    if let Int4Value::Value(value) = days {
        return make_date_value(value);
    }
    DateValue::Unknown
}

fn calendar_days_from_ymd(year: i32, month: i32, day: i32) -> Int4Value {
    if year == 0 || year == -2147483647 - 1 {
        return Int4Value::Error(SqlError {
            state: DATE_FIELD_OVERFLOW,
        });
    }
    let mut calendar_year: i32 = year;
    if year < 0 {
        calendar_year = year + 1;
    }
    if month < 1 || month > 12 || day < 1 || day > 31 {
        return Int4Value::Error(SqlError {
            state: DATE_FIELD_OVERFLOW,
        });
    }
    let mut month_days: i32 = 31;
    if month == 4 || month == 6 || month == 9 || month == 11 {
        month_days = 30;
    } else if month == 2 {
        month_days = 28;
        if calendar_year % 4 == 0 && (calendar_year % 100 != 0 || calendar_year % 400 == 0) {
            month_days = 29;
        }
    }
    if day > month_days || calendar_year < -4713 || calendar_year > 5874897 {
        return Int4Value::Error(SqlError {
            state: DATE_FIELD_OVERFLOW,
        });
    }
    let mut julian_year: i32 = calendar_year + 4799;
    let mut julian_month: i32 = month + 13;
    if month > 2 {
        julian_year = calendar_year + 4800;
        julian_month = month + 1;
    }
    let century = julian_year / 100;
    let base = julian_year * 365 - 32167;
    let leap_adjustment = julian_year / 4 - century + century / 4;
    let month_adjustment = 7834 * julian_month / 256 + day;
    let julian = base + leap_adjustment + month_adjustment;
    make_int4_value(julian - 2451545)
}
