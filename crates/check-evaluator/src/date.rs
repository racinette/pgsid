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

pub fn date_from_text(value: TextValue) -> DateValue {
    if let TextValue::Error(error) = value {
        return DateValue::Error(error);
    }
    if value == TextValue::Unknown {
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
        let mut bc = false;
        if end - start >= 2
            && chars[end - 1].to_ascii_lowercase() == 'c'
            && chars[end - 2].to_ascii_lowercase() == 'b'
        {
            bc = true;
            end = end - 2;
        } else if end - start >= 2
            && chars[end - 1].to_ascii_lowercase() == 'd'
            && chars[end - 2].to_ascii_lowercase() == 'a'
        {
            end = end - 2;
        }
        while start < end && date_text_space(chars[end - 1]) {
            end = end - 1;
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
        let mut index = start;
        let mut year: i32 = 0;
        let mut year_digits = 0;
        while index < end && date_text_digit(chars[index]) >= 0 {
            if year < 5874898 {
                year = year * 10 + date_text_digit(chars[index]);
            }
            year_digits += 1;
            index += 1;
        }
        if year_digits < 4 || index == end || chars[index] != '-' {
            return DateValue::Unknown;
        }
        index += 1;
        let mut month: i32 = 0;
        let mut month_digits = 0;
        while index < end && date_text_digit(chars[index]) >= 0 {
            if month_digits < 2 {
                month = month * 10 + date_text_digit(chars[index]);
            }
            month_digits += 1;
            index += 1;
        }
        if month_digits < 1 || month_digits > 2 || index == end || chars[index] != '-' {
            return DateValue::Unknown;
        }
        index += 1;
        let mut day: i32 = 0;
        let mut day_digits = 0;
        while index < end && date_text_digit(chars[index]) >= 0 {
            if day_digits < 2 {
                day = day * 10 + date_text_digit(chars[index]);
            }
            day_digits += 1;
            index += 1;
        }
        if day_digits == 0 && index == end {
            return DateValue::Error(SqlError {
                state: INVALID_DATE_TEXT,
            });
        }
        if day_digits < 1 || day_digits > 2 || index != end {
            return DateValue::Unknown;
        }
        if bc {
            year = 0 - year;
        }
        return date_from_ymd(year, month, day);
    }
    DateValue::Unknown
}

pub fn date_from_ymd(year: i32, month: i32, day: i32) -> DateValue {
    if year == 0 || year == -2147483647 - 1 {
        return DateValue::Error(SqlError {
            state: DATE_FIELD_OVERFLOW,
        });
    }
    let mut calendar_year: i32 = year;
    if year < 0 {
        calendar_year = year + 1;
    }
    if month < 1 || month > 12 || day < 1 || day > 31 {
        return DateValue::Error(SqlError {
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
        return DateValue::Error(SqlError {
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
    make_date_value(julian - 2451545)
}
