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
    julian: bool,
    julian_time: i64,
}

struct OrdinalCalendar {
    known: bool,
    year: i32,
    month: i32,
    day: i32,
}

fn english_date_letter(value: char) -> bool {
    let code = value.to_ascii_lowercase() as i32;
    code >= 97 && code <= 122
}

fn english_date_word(text: &TimestampText, start: usize, end: usize) -> String {
    let mut word = String::new();
    let mut index = start;
    while index < end && english_date_letter(text.chars[index]) {
        word.push(text.chars[index].to_ascii_lowercase());
        index += 1;
    }
    word
}

fn english_date_word_end(text: &TimestampText, start: usize, end: usize) -> usize {
    let mut index = start;
    while index < end && english_date_letter(text.chars[index]) {
        index += 1;
    }
    index
}

fn english_date_month(word: &str) -> i32 {
    if word == "jan" || word == "january" {
        return 1;
    }
    if word == "feb" || word == "february" {
        return 2;
    }
    if word == "mar" || word == "march" {
        return 3;
    }
    if word == "apr" || word == "april" {
        return 4;
    }
    if word == "may" {
        return 5;
    }
    if word == "jun" || word == "june" {
        return 6;
    }
    if word == "jul" || word == "july" {
        return 7;
    }
    if word == "aug" || word == "august" {
        return 8;
    }
    if word == "sep" || word == "sept" || word == "september" {
        return 9;
    }
    if word == "oct" || word == "october" {
        return 10;
    }
    if word == "nov" || word == "november" {
        return 11;
    }
    if word == "dec" || word == "december" {
        return 12;
    }
    0
}

fn english_date_weekday(word: &str) -> bool {
    word == "sun"
        || word == "sunday"
        || word == "mon"
        || word == "monday"
        || word == "tue"
        || word == "tues"
        || word == "tuesday"
        || word == "wed"
        || word == "wednesday"
        || word == "thu"
        || word == "thur"
        || word == "thurs"
        || word == "thursday"
        || word == "fri"
        || word == "friday"
        || word == "sat"
        || word == "saturday"
}

fn english_date_gap(text: &TimestampText, start: usize, end: usize) -> usize {
    let mut index = start;
    while index < end && (date_text_space(text.chars[index]) || text.chars[index] == ',') {
        index += 1;
    }
    index
}

fn english_date_delimiter(value: char) -> bool {
    value == '-' || value == '/' || value == '.'
}

fn english_date_result(
    state: i32,
    next: usize,
    year: i32,
    month: i32,
    day: i32,
) -> OrdinalDateText {
    OrdinalDateText {
        state: state,
        next: next,
        year: year,
        overflow: false,
        month: month,
        day: day,
        minus_zone: false,
        julian: false,
        julian_time: -1i64,
    }
}

fn english_date_fields(
    first: &TimestampNumber,
    second: &TimestampNumber,
    month: i32,
    next: usize,
    delimited: bool,
    number_first: bool,
) -> OrdinalDateText {
    if delimited == false && (first.digits >= 6 || second.digits >= 6) {
        return english_date_result(ORDINAL_DATE_SYNTAX, next, 0, 0, 0);
    }
    if delimited && (first.digits >= 10 || second.digits >= 10) {
        return english_date_result(ORDINAL_DATE_DEFERRED, next, 0, 0, 0);
    }
    if first.digits >= 3 {
        return english_date_result(
            ORDINAL_DATE_CALENDAR,
            next,
            first.value,
            month,
            second.value,
        );
    }
    // Two short numbers take their roles from DateStyle; a numeric month before a
    // textual one is moved to the day only from 1 through 31.
    if second.digits < 3
        || (delimited == false && number_first && (first.value < 1 || first.value > 31))
    {
        return english_date_result(ORDINAL_DATE_DEFERRED, next, 0, 0, 0);
    }
    english_date_result(
        ORDINAL_DATE_CALENDAR,
        next,
        second.value,
        month,
        first.value,
    )
}

fn read_english_trailing_month(
    text: &TimestampText,
    first: &TimestampNumber,
    second_start: usize,
    end: usize,
) -> OrdinalDateText {
    let absent = english_date_result(ORDINAL_DATE_ABSENT, second_start, 0, 0, 0);
    let second = read_timestamp_number(text, second_start, end);
    let word_start = english_date_gap(text, second.next, end);
    if word_start == end || english_date_letter(text.chars[word_start]) == false {
        return absent;
    }
    let word = english_date_word(text, word_start, end);
    let month = english_date_month(word.as_str());
    if month == 0 {
        return absent;
    }
    let word_end = english_date_word_end(text, word_start, end);
    if word_end < end
        && date_text_space(text.chars[word_end]) == false
        && text.chars[word_end].to_ascii_lowercase() != 't'
        && text.chars[word_end] != '+'
    {
        return english_date_result(ORDINAL_DATE_DEFERRED, word_end, 0, 0, 0);
    }
    if first.digits >= 6 || second.digits >= 6 {
        return english_date_result(ORDINAL_DATE_SYNTAX, word_end, 0, 0, 0);
    }
    if first.digits <= 2 {
        return english_date_result(ORDINAL_DATE_DEFERRED, word_end, 0, 0, 0);
    }
    // The second number is first a numeric month (or a day of year when it has three
    // digits); the textual month moves only a month from 1 through 31 to the day.
    if (second.digits == 3 && second.value >= 1 && second.value <= 366)
        || second.value < 1
        || second.value > 31
    {
        return english_date_result(ORDINAL_DATE_SYNTAX, word_end, 0, 0, 0);
    }
    english_date_result(
        ORDINAL_DATE_CALENDAR,
        word_end,
        first.value,
        month,
        second.value,
    )
}

fn read_english_date(text: &TimestampText, start: usize, end: usize) -> OrdinalDateText {
    let absent = english_date_result(ORDINAL_DATE_ABSENT, start, 0, 0, 0);
    let mut index = start;
    let leading = english_date_word(text, index, end);
    if english_date_weekday(leading.as_str()) {
        let leading_end = english_date_word_end(text, index, end);
        index = english_date_gap(text, leading_end, end);
        if index == leading_end {
            return absent;
        }
    }
    if index == end {
        return absent;
    }
    if english_date_letter(text.chars[index]) {
        let word = english_date_word(text, index, end);
        let month = english_date_month(word.as_str());
        if month == 0 {
            return absent;
        }
        let after = english_date_word_end(text, index, end);
        if after < end && english_date_delimiter(text.chars[after]) {
            let delimiter = text.chars[after];
            let first = read_timestamp_number(text, after + 1, end);
            if first.digits == 0 || first.next == end || text.chars[first.next] != delimiter {
                return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
            }
            let second = read_timestamp_number(text, first.next + 1, end);
            if second.digits == 0
                || (second.next < end && date_text_space(text.chars[second.next]) == false)
            {
                return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
            }
            return english_date_fields(&first, &second, month, second.next, true, false);
        }
        let first_start = english_date_gap(text, after, end);
        let first = read_timestamp_number(text, first_start, end);
        if first.digits == 0 {
            return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
        }
        let second_start = english_date_gap(text, first.next, end);
        let second = read_timestamp_number(text, second_start, end);
        if second_start == first.next
            || second.digits == 0
            || (second.next < end
                && date_text_space(text.chars[second.next]) == false
                && text.chars[second.next].to_ascii_lowercase() != 't'
                && text.chars[second.next] != '+')
        {
            return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
        }
        return english_date_fields(&first, &second, month, second.next, false, false);
    }
    let first = read_timestamp_number(text, index, end);
    if first.digits == 0 || first.next == end {
        return absent;
    }
    let after = first.next;
    if english_date_delimiter(text.chars[after])
        && after + 1 < end
        && english_date_letter(text.chars[after + 1])
    {
        let delimiter = text.chars[after];
        let word = english_date_word(text, after + 1, end);
        let month = english_date_month(word.as_str());
        let word_end = english_date_word_end(text, after + 1, end);
        if month == 0 || word_end == end || text.chars[word_end] != delimiter {
            return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
        }
        let second = read_timestamp_number(text, word_end + 1, end);
        if second.digits == 0
            || (second.next < end && date_text_space(text.chars[second.next]) == false)
        {
            return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
        }
        return english_date_fields(&first, &second, month, second.next, true, true);
    }
    let word_start = english_date_gap(text, after, end);
    if word_start < end && word_start > after && date_text_digit(text.chars[word_start]) >= 0 {
        return read_english_trailing_month(text, &first, word_start, end);
    }
    if word_start == end || english_date_letter(text.chars[word_start]) == false {
        return absent;
    }
    let word = english_date_word(text, word_start, end);
    let month = english_date_month(word.as_str());
    if month == 0 {
        return absent;
    }
    let word_end = english_date_word_end(text, word_start, end);
    let second_start = english_date_gap(text, word_end, end);
    let second = read_timestamp_number(text, second_start, end);
    if second.digits == 0
        || (second.next < end
            && date_text_space(text.chars[second.next]) == false
            && text.chars[second.next].to_ascii_lowercase() != 't'
            && text.chars[second.next] != '+')
    {
        return english_date_result(ORDINAL_DATE_DEFERRED, after, 0, 0, 0);
    }
    english_date_fields(&first, &second, month, second.next, false, true)
}

fn read_julian_date(text: &TimestampText, start: usize, end: usize) -> OrdinalDateText {
    let absent = english_date_result(ORDINAL_DATE_ABSENT, start, 0, 0, 0);
    let label = english_date_word(text, start, end);
    if label != "j" && label != "jd" && label != "julian" {
        return absent;
    }
    let mut index = english_date_word_end(text, start, end);
    while index < end && date_text_space(text.chars[index]) {
        index += 1;
    }
    let number = read_timestamp_number(text, index, end);
    if number.digits == 0 {
        if index == end {
            return english_date_result(ORDINAL_DATE_SYNTAX, index, 0, 0, 0);
        }
        return english_date_result(ORDINAL_DATE_DEFERRED, index, 0, 0, 0);
    }
    if number.overflow {
        if number.next == end {
            return english_date_result(ORDINAL_DATE_OVERFLOW, index, 0, 0, 0);
        }
        return english_date_result(ORDINAL_DATE_DEFERRED, index, 0, 0, 0);
    }
    index = number.next;
    let mut julian_time: i64 = -1i64;
    if index < end && text.chars[index] == '.' {
        let fraction = read_timestamp_number(text, index + 1, end);
        if fraction.digits == 0 {
            return english_date_result(ORDINAL_DATE_DEFERRED, index, 0, 0, 0);
        }
        let mut fraction_text = String::new();
        fraction_text.push('0');
        let mut digit = index;
        while digit < fraction.next {
            fraction_text.push(text.chars[digit]);
            digit += 1;
        }
        // PostgreSQL scales the fractional day in double precision, then truncates;
        // the second split keeps that truncation exact within i32 conversions.
        let parsed = fraction_text.as_str().parse::<f64>().unwrap_or(0.0f64);
        let scaled = parsed * 86400000000.0f64;
        let mut seconds = (scaled / 1000000.0f64) as i32;
        let seconds_float = seconds as f64;
        let mut remainder = scaled - seconds_float * 1000000.0f64;
        if remainder < 0.0f64 {
            seconds = seconds - 1;
            remainder = remainder + 1000000.0f64;
        }
        let microseconds = remainder as i32;
        let wide_seconds = seconds as i64;
        let wide_microseconds = microseconds as i64;
        julian_time = wide_seconds * 1000000i64 + wide_microseconds;
        index = fraction.next;
    }
    if index < end
        && date_text_space(text.chars[index]) == false
        && text.chars[index].to_ascii_lowercase() != 't'
        && text.chars[index].to_ascii_lowercase() != 'z'
        && text.chars[index] != '+'
    {
        return english_date_result(ORDINAL_DATE_DEFERRED, index, 0, 0, 0);
    }
    let wide_day = number.value as i64;
    let calendar = julian_calendar(wide_day);
    OrdinalDateText {
        state: ORDINAL_DATE_CALENDAR,
        next: index,
        year: calendar.year,
        overflow: false,
        month: calendar.month,
        day: calendar.day,
        minus_zone: false,
        julian: true,
        julian_time: julian_time,
    }
}

fn read_ordinal_date(text: &TimestampText, start: usize, end: usize) -> OrdinalDateText {
    let julian = read_julian_date(text, start, end);
    if julian.state != ORDINAL_DATE_ABSENT {
        return julian;
    }
    let english = read_english_date(text, start, end);
    if english.state != ORDINAL_DATE_ABSENT {
        return english;
    }
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
                } else if third.digits == 0
                    && third_start < end
                    && text.chars[third_start].to_ascii_lowercase() == 't'
                    && (third_start + 1 == end
                        || date_text_digit(text.chars[third_start + 1]) >= 0
                        || date_text_space(text.chars[third_start + 1]))
                {
                    // The `T` filler requires a complete date before it.
                    state = ORDINAL_DATE_SYNTAX;
                } else if third.digits > 0 && third.next < end && text.chars[third.next] == ':' {
                    // A clock follows a year and month; the missing day is reported after the
                    // clock and zone decode.
                    state = ORDINAL_DATE_CALENDAR;
                    month = field.value;
                    day = -1;
                    index = field.next;
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
        julian: false,
        julian_time: -1i64,
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
    julian_calendar(julian_day)
}

fn julian_calendar(julian_day: i64) -> OrdinalCalendar {
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
    date_from_text_order(value, 0)
}

// The date order is the session DateStyle field order: 0 when unknown, 1 MDY, 2 DMY, 3 YMD.
pub fn date_from_text_order(value: TextValue, date_order: i32) -> DateValue {
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
        let mut label = String::new();
        let mut label_end = start;
        while label_end < end {
            let character = chars[label_end].to_ascii_lowercase();
            let code = character as i32;
            if code < 97 || code > 122 {
                break;
            }
            label.push(character);
            label_end += 1;
        }
        if label == "j" || label == "jd" || label == "julian" {
            let mut index = label_end;
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
            if index == first {
                return DateValue::Unknown;
            }
            if index != end {
                return date_from_temporal_text(TextValue::Value(text.clone()), date_order);
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
        return date_from_temporal_text(TextValue::Value(text.clone()), date_order);
    }
    DateValue::Unknown
}

fn date_from_temporal_text(value: TextValue, date_order: i32) -> DateValue {
    let parsed = parse_temporal_text(value, false, true, date_order);
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
