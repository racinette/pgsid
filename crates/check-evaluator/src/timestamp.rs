const INVALID_TIMESTAMP_TEXT: u32 = 3452551;
const INVALID_TIMESTAMP_ZONE: u32 = 3452553;
const TEMPORAL_FIELD_OVERFLOW: u32 = 3452552;

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
    let unresolved_flavor: i32 = 0;
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
            return int8_unresolved(unresolved_flavor);
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
            // Without a written zone the instant follows the session TimeZone setting.
            return int8_unresolved(resolution_context(unresolved_flavor));
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
    let mut local_flavor_143_4: i32 = unresolved_flavor;
    if let Int4Value::Unknown = days {
        if local_flavor_143_4 < 1 {
            local_flavor_143_4 = 1;
        };
    };
    if let Int4Value::Unimplemented = days {
        local_flavor_143_4 = 2;
    };
    int8_unresolved(local_flavor_143_4)
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
    let unresolved_flavor: i32 = 0;
    if year_overflow || compact_clock || hour == 24 {
        return int8_unresolved(unresolved_flavor);
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
    parse_temporal_text(value, with_timezone, false, 0)
}

// The date order is the session DateStyle field order: 0 when unknown, 1 MDY, 2 DMY, 3 YMD.
// The relative date words resolve against the transaction start time, a session fact.
fn temporal_special_word(word: &str) -> bool {
    word == "now"
        || word == "today"
        || word == "tomorrow"
        || word == "yesterday"
        || word == "epoch"
        || word == "infinity"
        || word == "-infinity"
}

// The server checks a date's month and day only after every field reads, so a later field's error
// comes first. For a leading date with a four-digit year first (separated by a dash, slash or dot,
// or eight digits run together), this gives the text with that date replaced by a valid one.
// Otherwise one- and two-digit numbers, whose role depends on their length and position but not
// their value, are replaced by ones of the same length; the result is empty when nothing changed.
pub fn temporal_valid_date_spelling(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut start: usize = 0;
    while start < chars.len() && date_text_space(chars[start]) {
        start += 1;
    }
    let mut output = String::new();
    let mut end = start;
    while end < chars.len() && date_text_space(chars[end]) == false {
        end += 1;
    }
    let length = end - start;
    let mut shaped = false;
    if length == 8 {
        shaped = true;
        let mut position: usize = 0;
        while position < 8 {
            if date_text_digit(chars[start + position]) < 0 {
                shaped = false;
            };
            position += 1;
        }
    };
    if length == 10 {
        let separator = chars[start + 4];
        shaped = (separator == '-' || separator == '/' || separator == '.')
            && chars[start + 7] == separator;
        let mut position: usize = 0;
        while position < 10 {
            if position != 4 && position != 7 && date_text_digit(chars[start + position]) < 0 {
                shaped = false;
            };
            position += 1;
        }
    };
    if shaped == false {
        let mut changed = false;
        let mut index: usize = 0;
        while index < chars.len() {
            if date_text_space(chars[index]) {
                output.push(chars[index]);
                index += 1;
            } else {
                let token = index;
                let mut digits = true;
                while index < chars.len() && date_text_space(chars[index]) == false {
                    if date_text_digit(chars[index]) < 0 {
                        digits = false;
                    };
                    index += 1;
                }
                let size = index - token;
                if digits && size == 1 {
                    output.push('1');
                    changed = changed || chars[token] != '1';
                } else if digits && size == 2 {
                    output.push('0');
                    output.push('1');
                    changed = changed || chars[token] != '0' || chars[token + 1] != '1';
                } else {
                    let mut copy = token;
                    while copy < index {
                        output.push(chars[copy]);
                        copy += 1;
                    }
                };
            };
        }
        if changed == false {
            return String::new();
        };
        return output;
    }
    if length == 8 {
        output.push_str("20000101");
    } else {
        output.push_str("2000-01-01");
    };
    let mut rest = end;
    while rest < chars.len() {
        output.push(chars[rest]);
        rest += 1;
    }
    output
}

// Every special word sets the date fields, and now, epoch and infinity the clock and zone too.
// Once the fields before the first one hold a date, or it follows another special word, the
// server rejects it as a repeated field before reading further (1). After a clock alone, now,
// epoch and infinity repeat the clock (1), while a trailing today, tomorrow or yesterday supplies
// the date from the transaction (2).
fn temporal_special_word_conflict(input: &str, date_order: i32) -> i32 {
    let chars: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    let mut fields: i32 = 0;
    let mut previous_sign = false;
    let mut found = false;
    let mut special_start: usize = 0;
    let mut special_end: usize = 0;
    let mut special_first = false;
    let mut special_sign = false;
    let mut special_word = String::new();
    let mut special_fields: i32 = 0;
    while index < chars.len() && found == false {
        if date_text_space(chars[index]) {
            index += 1;
        } else {
            let start = index;
            let mut word = String::new();
            while index < chars.len() && date_text_space(chars[index]) == false {
                word.push(chars[index].to_ascii_lowercase());
                index += 1;
            }
            if temporal_special_word(word.as_str()) {
                found = true;
                special_start = start;
                special_end = index;
                special_first = fields == 0;
                special_sign = previous_sign;
                special_word = word.clone();
                special_fields = fields;
            };
            previous_sign = word == "+" || word == "-";
            fields = fields + 1;
        };
    }
    if found == false || special_sign {
        return 0;
    }
    if special_first {
        let mut next = special_end;
        while next < chars.len() && date_text_space(chars[next]) {
            next += 1;
        }
        let mut word = String::new();
        while next < chars.len() && date_text_space(chars[next]) == false {
            word.push(chars[next].to_ascii_lowercase());
            next += 1;
        }
        if temporal_special_word(word.as_str()) {
            return 1;
        };
        return 0;
    }
    let mut prefix = String::new();
    let mut position: usize = 0;
    while position < special_start {
        prefix.push(chars[position]);
        position += 1;
    }
    let before = parse_temporal_text(TextValue::Value(prefix.clone()), false, false, date_order);
    if let Int8Value::Value(_) = before {
        return 1;
    };
    if before
        == Int8Value::Error(SqlError {
            state: TEMPORAL_FIELD_OVERFLOW,
        })
    {
        let valid = temporal_valid_date_spelling(prefix.as_str());
        if valid != "" {
            let checked = parse_temporal_text(TextValue::Value(valid), false, false, date_order);
            if let Int8Value::Value(_) = checked {
                return 1;
            };
        };
    };
    // A clock that fails on its own fails where it stands, before the word.
    if before
        == Int8Value::Error(SqlError {
            state: TEMPORAL_FIELD_OVERFLOW,
        })
    {
        let mut scan: usize = 0;
        while scan < special_start {
            if date_text_space(chars[scan]) {
                scan += 1;
            } else {
                let token_start = scan;
                let mut colon = false;
                while scan < special_start && date_text_space(chars[scan]) == false {
                    if chars[scan] == ':' {
                        colon = true;
                    };
                    scan += 1;
                }
                if colon && date_text_digit(chars[token_start]) >= 0 {
                    let mut alone = String::new();
                    alone.push_str("2000-01-01 ");
                    let mut copy = token_start;
                    while copy < scan {
                        alone.push(chars[copy]);
                        copy += 1;
                    }
                    let clock =
                        parse_temporal_text(TextValue::Value(alone), false, false, date_order);
                    if clock
                        == Int8Value::Error(SqlError {
                            state: TEMPORAL_FIELD_OVERFLOW,
                        })
                    {
                        return 3;
                    };
                };
            };
        }
    };
    if special_fields != 1 {
        return 0;
    }
    // A clock alone is the only field before the word; it reads when a date before it does.
    let mut lone_clock = false;
    let mut colon = false;
    let mut digit_first = false;
    let mut seen = false;
    let mut scan: usize = 0;
    while scan < special_start {
        let character = chars[scan];
        if date_text_space(character) == false {
            if seen == false {
                digit_first = date_text_digit(character) >= 0;
                seen = true;
                lone_clock = true;
            };
            if character == ':' {
                colon = true;
            } else if character != '.' && date_text_digit(character) < 0 {
                lone_clock = false;
            };
        };
        scan += 1;
    }
    if lone_clock == false || colon == false || digit_first == false {
        return 0;
    }
    let mut dated = String::new();
    dated.push_str("2000-01-01 ");
    dated.push_str(prefix.as_str());
    let reading = parse_temporal_text(TextValue::Value(dated), false, false, date_order);
    if let Int8Value::Value(_) = reading {
        if special_word == "today" || special_word == "tomorrow" || special_word == "yesterday" {
            let mut rest = special_end;
            while rest < chars.len() && date_text_space(chars[rest]) {
                rest += 1;
            }
            if rest == chars.len() {
                return 2;
            };
            return 0;
        };
        return 1;
    };
    0
}

// A first field of digits and one separator with no digit after it is a date of one number,
// which the date decoder rejects once the number reads; a number past the integer range overflows.
fn temporal_lone_date_field(text: &str) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let mut start: usize = 0;
    while start < chars.len() && date_text_space(chars[start]) {
        start += 1;
    }
    let mut end = start;
    while end < chars.len() && date_text_digit(chars[end]) >= 0 {
        end += 1;
    }
    if end == start || end >= chars.len() {
        return 0;
    }
    let delimiter = chars[end];
    if delimiter != '-' && delimiter != '/' && delimiter != '.' {
        return 0;
    }
    if end + 1 < chars.len() && date_text_space(chars[end + 1]) == false {
        return 0;
    }
    let mut significant = start;
    while significant + 1 < end && chars[significant] == '0' {
        significant += 1;
    }
    let digits = end - significant;
    let mut fits = digits < 10;
    if digits == 10 {
        let limit: Vec<char> = "2147483647".chars().collect();
        let mut place: usize = 0;
        let mut decided = false;
        fits = true;
        while place < 10 && decided == false {
            let digit = date_text_digit(chars[significant + place]);
            let bound = date_text_digit(limit[place]);
            if digit != bound {
                fits = digit < bound;
                decided = true;
            };
            place += 1;
        }
    }
    if fits {
        return 1;
    }
    2
}

// The server's time decoder reads each part of a clock field as one integer, so an empty part is
// zero, and two parts before a dot are minutes and seconds; a bare dot is no fraction. Rewriting
// such a field to hours, minutes and seconds with digits in every part keeps its meaning.
fn temporal_clock_spelling(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        if date_text_space(chars[index]) {
            output.push(chars[index]);
            index += 1;
        } else {
            let start = index;
            let mut clock = date_text_digit(chars[index]) >= 0;
            let mut colons = 0;
            while index < chars.len() && date_text_space(chars[index]) == false {
                let character = chars[index];
                if character == ':' {
                    colons = colons + 1;
                } else if character != '.' && date_text_digit(character) < 0 {
                    clock = false;
                };
                index += 1;
            }
            let end = index;
            let mut rewritten = String::new();
            let mut done = false;
            // The grammar throws away "at" and "on", and reads "allballs" as midnight in UTC.
            let mut lowered = String::new();
            let mut letter = start;
            while letter < end {
                lowered.push(chars[letter].to_ascii_lowercase());
                letter += 1;
            }
            if lowered == "at" || lowered == "on" {
                rewritten.push(' ');
                done = true;
            };
            if lowered == "allballs" {
                rewritten.push_str("00:00:00+00");
                done = true;
            };
            if done == false && clock && colons >= 1 && colons <= 2 {
                let mut hour = String::new();
                let mut minute = String::new();
                let mut second = String::new();
                let mut fraction = String::new();
                let mut dotted = false;
                let mut part = 0;
                let mut valid = true;
                let mut cursor = start;
                while cursor < end {
                    let character = chars[cursor];
                    if character == ':' {
                        if dotted {
                            valid = false;
                        };
                        part = part + 1;
                    } else if character == '.' {
                        if dotted || part == 0 {
                            valid = false;
                        };
                        dotted = true;
                    } else if dotted {
                        fraction.push(character);
                    } else if part == 0 {
                        hour.push(character);
                    } else if part == 1 {
                        minute.push(character);
                    } else {
                        second.push(character);
                    };
                    cursor += 1;
                }
                if valid {
                    if minute == "" {
                        minute.push_str("00");
                    };
                    if second == "" {
                        second.push_str("00");
                    };
                    if dotted && part == 1 {
                        rewritten.push_str("00:");
                        rewritten.push_str(hour.as_str());
                        rewritten.push(':');
                        rewritten.push_str(minute.as_str());
                    } else {
                        rewritten.push_str(hour.as_str());
                        rewritten.push(':');
                        rewritten.push_str(minute.as_str());
                        rewritten.push(':');
                        rewritten.push_str(second.as_str());
                    };
                    if fraction != "" {
                        rewritten.push('.');
                        rewritten.push_str(fraction.as_str());
                    };
                    done = true;
                };
            };
            if done {
                output.push_str(rewritten.as_str());
            } else {
                let mut copy = start;
                while copy < end {
                    output.push(chars[copy]);
                    copy += 1;
                }
            };
        };
    }
    output
}

// A clock field with a third colon, a second dot, or a colon after its dot is rejected where it
// stands; this finds the first such field, or -1.
fn temporal_bad_clock_start(text: &str) -> i64 {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    while index < chars.len() {
        if date_text_space(chars[index]) {
            index += 1;
        } else {
            let start = index;
            let mut clock = date_text_digit(chars[index]) >= 0;
            let mut colons = 0;
            let mut dots = 0;
            let mut colon_after_dot = false;
            let mut dot_first = false;
            while index < chars.len() && date_text_space(chars[index]) == false {
                let character = chars[index];
                if character == ':' {
                    colons = colons + 1;
                    if dots > 0 {
                        colon_after_dot = true;
                    };
                } else if character == '.' {
                    if colons == 0 {
                        dot_first = true;
                    };
                    dots = dots + 1;
                } else if date_text_digit(character) < 0 {
                    clock = false;
                };
                index += 1;
            }
            if clock
                && dot_first == false
                && colons >= 1
                && (colons > 2 || dots > 1 || colon_after_dot)
            {
                return (start as i32) as i64;
            };
        };
    }
    -1i64
}

// A number, clock or numeric date ends where letters follow its digits, so the letters start a
// field of their own; an ISO T before digits stays with the clock that follows it.
fn temporal_glued_letters(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut output = String::new();
    let mut token_digit = false;
    let mut token_letters = false;
    let mut previous = ' ';
    let mut index: usize = 0;
    while index < chars.len() {
        let character = chars[index];
        let mut julian = false;
        if date_text_space(character) {
            token_digit = false;
            token_letters = false;
            output.push(character);
        } else {
            if date_text_space(previous) {
                token_digit = date_text_digit(character) >= 0;
                token_letters = false;
                // A Julian day's J is a field of its own, so its digits are a number.
                julian = (character == 'j' || character == 'J')
                    && index + 1 < chars.len()
                    && date_text_digit(chars[index + 1]) >= 0;
                if julian {
                    token_digit = true;
                };
            };
            let letter = english_date_letter(character) && julian == false;
            if letter && token_digit && token_letters == false && date_text_digit(previous) >= 0 {
                let iso = (character == 't' || character == 'T')
                    && index + 1 < chars.len()
                    && (date_text_digit(chars[index + 1]) >= 0 || chars[index + 1] == ':');
                if iso == false {
                    output.push(' ');
                };
            };
            if letter {
                token_letters = true;
            };
            output.push(character);
        };
        previous = character;
        if julian {
            previous = '0';
        };
        index += 1;
    }
    output
}

// A first field that starts with letters and continues with digits or a date separator is a date
// to the server, whose decoder accepts only month names among its letters; another word there is
// rejected before any later field.
fn temporal_leading_lettered_date(text: &str) -> bool {
    let chars: Vec<char> = text.chars().collect();
    let mut start: usize = 0;
    while start < chars.len() && date_text_space(chars[start]) {
        start += 1;
    }
    let mut end = start;
    let mut word = String::new();
    while end < chars.len() && english_date_letter(chars[end]) {
        word.push(chars[end].to_ascii_lowercase());
        end += 1;
    }
    if end == start || end >= chars.len() {
        return false;
    }
    let next = chars[end];
    if date_text_digit(next) < 0 && next != '-' && next != '/' && next != '.' {
        return false;
    }
    if temporal_core_token(word.as_str()) || english_date_month(word.as_str()) != 0 {
        return false;
    }
    true
}

// The date decoder accepts a delimited date only when the fields before it hold nothing but zones,
// so one after a clock, era, weekday or meridian is rejected once those fields read.
fn temporal_delimited_after_fields(text: &str, date_order: i32) -> bool {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    let mut nondate = false;
    let mut prefix_end: usize = 0;
    let mut found = false;
    let mut stop = false;
    while index < chars.len() && found == false && stop == false {
        if date_text_space(chars[index]) {
            index += 1;
        } else {
            let start = index;
            let mut colon = false;
            let mut dashes = 0;
            let mut dots = 0;
            let mut lowered = String::new();
            while index < chars.len() && date_text_space(chars[index]) == false {
                let character = chars[index];
                if character == ':' {
                    colon = true;
                } else if character == '-' || character == '/' {
                    dashes = dashes + 1;
                } else if character == '.' {
                    dots = dots + 1;
                };
                lowered.push(character.to_ascii_lowercase());
                index += 1;
            }
            let first = chars[start];
            let digit_led = date_text_digit(first) >= 0;
            let mut letters = String::new();
            let mut letter = start;
            while letter < index && english_date_letter(chars[letter]) {
                letters.push(chars[letter].to_ascii_lowercase());
                letter += 1;
            }
            let delimited = (digit_led && colon == false && (dashes > 0 || dots > 1))
                || (english_date_month(letters.as_str()) != 0 && dashes > 0);
            if delimited {
                found = true;
                prefix_end = start;
            } else if digit_led && colon {
                nondate = true;
            } else if lowered == "bc" || lowered == "ad" || lowered == "am" || lowered == "pm" {
                nondate = true;
            } else if english_date_weekday(lowered.as_str()) {
                nondate = true;
            } else if first == '+' || first == '-' {
                // A zone offset is allowed before the date.
            } else {
                stop = true;
            };
        };
    }
    if found == false || nondate == false {
        return false;
    }
    let mut completed = String::new();
    completed.push_str("2000-01-01 ");
    let mut copy: usize = 0;
    while copy < prefix_end {
        completed.push(chars[copy]);
        copy += 1;
    }
    let reading = parse_temporal_text(TextValue::Value(completed), false, false, date_order);
    if let Int8Value::Value(_) = reading {
        return true;
    };
    false
}

// A clock's fields never change how date numbers read, so a leading clock before a compact,
// Julian or text-month date reads as the date followed by the clock.
fn temporal_leading_clock_moved(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut tokens_start: Vec<usize> = Vec::new();
    let mut tokens_end: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < chars.len() {
        if date_text_space(chars[index]) {
            index += 1;
        } else {
            tokens_start.push(index);
            while index < chars.len() && date_text_space(chars[index]) == false {
                index += 1;
            }
            tokens_end.push(index);
        };
    }
    let unchanged = String::new();
    let count = tokens_start.len();
    if count < 2 || count > 4 {
        return unchanged;
    }
    let mut clock = date_text_digit(chars[tokens_start[0]]) >= 0;
    let mut colon = false;
    let mut position = tokens_start[0];
    while position < tokens_end[0] {
        let character = chars[position];
        if character == ':' {
            colon = true;
        } else if character != '.' && date_text_digit(character) < 0 {
            clock = false;
        };
        position += 1;
    }
    if clock == false || colon == false {
        return unchanged;
    }
    let mut shapes = String::new();
    let mut token: usize = 1;
    while token < count {
        let mut digits = 0;
        let mut letters = String::new();
        let mut other = false;
        let mut cursor = tokens_start[token];
        while cursor < tokens_end[token] {
            let character = chars[cursor];
            if date_text_digit(character) >= 0 {
                digits = digits + 1;
            } else if english_date_letter(character) {
                letters.push(character.to_ascii_lowercase());
            } else {
                other = true;
            };
            cursor += 1;
        }
        if other {
            return unchanged;
        }
        if letters == "" && digits == 8 {
            shapes.push('c');
        } else if letters == "j" && digits > 0 && english_date_letter(chars[tokens_start[token]]) {
            shapes.push('j');
        } else if letters == "" && digits == 4 {
            shapes.push('y');
        } else if letters == "" && digits <= 2 {
            shapes.push('d');
        } else if digits == 0 && english_date_month(letters.as_str()) != 0 {
            shapes.push('m');
        } else {
            return unchanged;
        };
        token += 1;
    }
    if shapes != "c" && shapes != "j" && shapes != "mdy" && shapes != "dmy" {
        return unchanged;
    }
    let mut moved = String::new();
    let mut copy = tokens_start[1];
    while copy < chars.len() {
        moved.push(chars[copy]);
        copy += 1;
    }
    moved.push(' ');
    let mut clock_copy = tokens_start[0];
    while clock_copy < tokens_end[0] {
        moved.push(chars[clock_copy]);
        clock_copy += 1;
    }
    moved
}

fn temporal_relative_word(input: &str) -> bool {
    let chars: Vec<char> = input.chars().collect();
    let mut start: usize = 0;
    let mut end: usize = chars.len();
    while start < end && date_text_space(chars[start]) {
        start += 1;
    }
    while start < end && date_text_space(chars[end - 1]) {
        end = end - 1;
    }
    let mut word = String::new();
    while start < end {
        word.push(chars[start].to_ascii_lowercase());
        start += 1;
    }
    word == "now" || word == "today" || word == "tomorrow" || word == "yesterday"
}

// A trailing word the grammar does not claim is looked up in the session zone abbreviations and
// then in the server zone database, so what it means is a database fact.
fn temporal_zone_word(text: &TimestampText, from: usize, end: usize) -> bool {
    let mut start = from;
    while start < end && date_text_space(text.chars[start]) {
        start += 1;
    }
    if start == end || english_date_letter(text.chars[start]) == false {
        return false;
    }
    let mut index = start;
    while index < end {
        let character = text.chars[index];
        if english_date_letter(character) == false
            && date_text_digit(character) < 0
            && character != '/'
            && character != '_'
            && character != '+'
            && character != '-'
        {
            return false;
        }
        index += 1;
    }
    let word = english_date_word(text, start, end);
    if english_date_month(word.as_str()) != 0 || english_date_weekday(word.as_str()) {
        return false;
    }
    let mut keyword: usize = 0;
    while keyword < TEMPORAL_FIELD_WORDS.len() {
        if word.as_str() == TEMPORAL_FIELD_WORDS[keyword] {
            return false;
        }
        keyword += 1;
    }
    true
}

// Words the datetime grammar reads as fields rather than as zones.
const TEMPORAL_FIELD_WORDS: &[&str] = &[
    "ad",
    "allballs",
    "ago",
    "am",
    "at",
    "bc",
    "d",
    "epoch",
    "h",
    "infinity",
    "j",
    "jd",
    "julian",
    "m",
    "mm",
    "now",
    "on",
    "pm",
    "s",
    "t",
    "today",
    "tomorrow",
    "y",
    "yesterday",
    "z",
    "zulu",
];

// DateStyle offers three field orders, so a result all of them agree on does not depend on it.
fn temporal_text_any_order(input: String, with_timezone: bool, date_only: bool) -> Int8Value {
    let month_first =
        parse_temporal_text(TextValue::Value(input.clone()), with_timezone, date_only, 1);
    let day_first =
        parse_temporal_text(TextValue::Value(input.clone()), with_timezone, date_only, 2);
    let year_first =
        parse_temporal_text(TextValue::Value(input.clone()), with_timezone, date_only, 3);
    if month_first == day_first && day_first == year_first {
        return month_first;
    }
    let mut flavor: i32 = 1;
    if month_first == Int8Value::Unimplemented
        || day_first == Int8Value::Unimplemented
        || year_first == Int8Value::Unimplemented
    {
        flavor = 2;
    }
    int8_unresolved(flavor)
}

// Every word of the server's core date token table; a word in it ends a field before digits.
const TEMPORAL_CORE_TOKENS: &[&str] = &[
    "ad",
    "allballs",
    "am",
    "apr",
    "april",
    "at",
    "aug",
    "august",
    "bc",
    "d",
    "dec",
    "december",
    "dow",
    "doy",
    "dst",
    "epoch",
    "feb",
    "february",
    "fri",
    "friday",
    "h",
    "infinity",
    "isodow",
    "isoyear",
    "j",
    "jan",
    "january",
    "jd",
    "jul",
    "julian",
    "july",
    "jun",
    "june",
    "m",
    "mar",
    "march",
    "may",
    "mm",
    "mon",
    "monday",
    "now",
    "nov",
    "november",
    "oct",
    "october",
    "on",
    "pm",
    "s",
    "sat",
    "saturday",
    "sep",
    "sept",
    "september",
    "sun",
    "sunday",
    "t",
    "thu",
    "thur",
    "thurs",
    "thursday",
    "today",
    "tomorrow",
    "tue",
    "tues",
    "tuesday",
    "wed",
    "wednesday",
    "weds",
    "y",
    "yesterday",
];

pub fn temporal_core_token(word: &str) -> bool {
    let mut token: usize = 0;
    while token < TEMPORAL_CORE_TOKENS.len() {
        if TEMPORAL_CORE_TOKENS[token] == word {
            return true;
        };
        token += 1;
    }
    false
}

fn temporal_ascii_digit(value: char) -> bool {
    let code = value as i32;
    code >= 48 && code <= 57
}

fn temporal_ascii_alnum(value: char) -> bool {
    temporal_ascii_digit(value) || english_date_letter(value)
}

// The server's lexer copies each field into a buffer of `limit` bytes, each followed by a
// terminator, and rejects text whose fields do not fit or that has more than 25 fields. Returns 1
// when the server rejects the text, 0 when it fits, and -1 for text with non-ASCII characters,
// which the server classifies through its C library.
fn temporal_field_buffer(text: &str, limit: usize) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let length = chars.len();
    let mut index: usize = 0;
    while index < length {
        let code = chars[index] as i32;
        if code >= 128 {
            return -1;
        };
        index += 1;
    }
    let mut position: usize = 0;
    let mut fields: usize = 0;
    index = 0;
    while index < length {
        let character = chars[index];
        let code = character as i32;
        let punctuation = (code >= 33 && code <= 47)
            || (code >= 58 && code <= 64)
            || (code >= 91 && code <= 96)
            || (code >= 123 && code <= 126);
        if date_text_space(character) {
            index += 1;
        } else if punctuation && character != '+' && character != '-' && character != '.' {
            index += 1;
        } else {
            if fields >= 25 {
                return 1;
            };
            let mut end = index + 1;
            let mut skipped: usize = 0;
            if temporal_ascii_digit(character) {
                while end < length && temporal_ascii_digit(chars[end]) {
                    end += 1;
                }
                if end < length && chars[end] == ':' {
                    end += 1;
                    while end < length
                        && (temporal_ascii_digit(chars[end])
                            || chars[end] == ':'
                            || chars[end] == '.')
                    {
                        end += 1;
                    }
                } else if end < length
                    && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.')
                {
                    let delimiter = chars[end];
                    end += 1;
                    if end < length && temporal_ascii_digit(chars[end]) {
                        while end < length && temporal_ascii_digit(chars[end]) {
                            end += 1;
                        }
                        if end < length && chars[end] == delimiter {
                            end += 1;
                            while end < length
                                && (temporal_ascii_digit(chars[end]) || chars[end] == delimiter)
                            {
                                end += 1;
                            }
                        };
                    } else {
                        while end < length
                            && (temporal_ascii_alnum(chars[end]) || chars[end] == delimiter)
                        {
                            end += 1;
                        }
                    };
                };
            } else if character == '.' {
                while end < length && temporal_ascii_digit(chars[end]) {
                    end += 1;
                }
            } else if english_date_letter(character) {
                while end < length && english_date_letter(chars[end]) {
                    end += 1;
                }
                let mut joined = false;
                if end < length && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.') {
                    joined = true;
                } else if end < length && (chars[end] == '+' || temporal_ascii_digit(chars[end])) {
                    let mut word = String::new();
                    let mut letter = index;
                    while letter < end {
                        word.push(chars[letter].to_ascii_lowercase());
                        letter += 1;
                    }
                    joined = true;
                    let mut token: usize = 0;
                    while token < TEMPORAL_CORE_TOKENS.len() {
                        if TEMPORAL_CORE_TOKENS[token] == word.as_str() {
                            joined = false;
                        };
                        token += 1;
                    }
                };
                if joined {
                    end += 1;
                    while end < length
                        && (temporal_ascii_alnum(chars[end])
                            || chars[end] == '+'
                            || chars[end] == '-'
                            || chars[end] == '/'
                            || chars[end] == '_'
                            || chars[end] == '.'
                            || chars[end] == ':')
                    {
                        end += 1;
                    }
                };
            } else if character == '+' || character == '-' {
                while end < length && date_text_space(chars[end]) {
                    end += 1;
                    skipped += 1;
                }
                if end < length && temporal_ascii_digit(chars[end]) {
                    end += 1;
                    while end < length
                        && (temporal_ascii_digit(chars[end])
                            || chars[end] == ':'
                            || chars[end] == '.'
                            || chars[end] == '-')
                    {
                        end += 1;
                    }
                } else if end < length && english_date_letter(chars[end]) {
                    while end < length && english_date_letter(chars[end]) {
                        end += 1;
                    }
                } else {
                    return 1;
                };
            } else {
                return 1;
            };
            let appended = end - index - skipped;
            if position + appended >= limit {
                return 1;
            };
            position += appended + 1;
            fields += 1;
            index = end;
        };
    }
    0
}

// Where the lexer's last field starts when it is a letter-led field joined with digits or zone
// punctuation and ends the text, which after a full date the server reads as a zone; -1 otherwise.
pub fn temporal_trailing_zone_start(text: &str) -> i64 {
    let chars: Vec<char> = text.chars().collect();
    let length = chars.len();
    let mut index: usize = 0;
    while index < length {
        if (chars[index] as i32) >= 128 {
            return -1i64;
        };
        index += 1;
    }
    let mut last: i64 = -1i64;
    let mut last_end: usize = 0;
    index = 0;
    while index < length {
        let character = chars[index];
        let code = character as i32;
        let punctuation = (code >= 33 && code <= 47)
            || (code >= 58 && code <= 64)
            || (code >= 91 && code <= 96)
            || (code >= 123 && code <= 126);
        if date_text_space(character)
            || (punctuation && character != '+' && character != '-' && character != '.')
        {
            index += 1;
        } else {
            let mut end = index + 1;
            let mut zone = false;
            if temporal_ascii_digit(character) {
                while end < length && temporal_ascii_digit(chars[end]) {
                    end += 1;
                }
                if end < length && chars[end] == ':' {
                    end += 1;
                    while end < length
                        && (temporal_ascii_digit(chars[end])
                            || chars[end] == ':'
                            || chars[end] == '.')
                    {
                        end += 1;
                    }
                } else if end < length
                    && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.')
                {
                    let delimiter = chars[end];
                    end += 1;
                    if end < length && temporal_ascii_digit(chars[end]) {
                        while end < length && temporal_ascii_digit(chars[end]) {
                            end += 1;
                        }
                        if end < length && chars[end] == delimiter {
                            end += 1;
                            while end < length
                                && (temporal_ascii_digit(chars[end]) || chars[end] == delimiter)
                            {
                                end += 1;
                            }
                        };
                    } else {
                        while end < length
                            && (temporal_ascii_alnum(chars[end]) || chars[end] == delimiter)
                        {
                            end += 1;
                        }
                    };
                };
            } else if character == '.' {
                while end < length && temporal_ascii_digit(chars[end]) {
                    end += 1;
                }
            } else if english_date_letter(character) {
                while end < length && english_date_letter(chars[end]) {
                    end += 1;
                }
                let mut joined = false;
                if end < length && (chars[end] == '-' || chars[end] == '/' || chars[end] == '.') {
                    joined = true;
                } else if end < length && (chars[end] == '+' || temporal_ascii_digit(chars[end])) {
                    let mut word = String::new();
                    let mut letter = index;
                    while letter < end {
                        word.push(chars[letter].to_ascii_lowercase());
                        letter += 1;
                    }
                    joined = true;
                    let mut token: usize = 0;
                    while token < TEMPORAL_CORE_TOKENS.len() {
                        if TEMPORAL_CORE_TOKENS[token] == word.as_str() {
                            joined = false;
                        };
                        token += 1;
                    }
                };
                if joined {
                    zone = true;
                    end += 1;
                    while end < length
                        && (temporal_ascii_alnum(chars[end])
                            || chars[end] == '+'
                            || chars[end] == '-'
                            || chars[end] == '/'
                            || chars[end] == '_'
                            || chars[end] == '.'
                            || chars[end] == ':')
                    {
                        end += 1;
                    }
                };
            } else if character == '+' || character == '-' {
                while end < length && date_text_space(chars[end]) {
                    end += 1;
                }
                while end < length
                    && (temporal_ascii_alnum(chars[end])
                        || chars[end] == ':'
                        || chars[end] == '.'
                        || chars[end] == '-')
                {
                    end += 1;
                }
            } else {
                return -1i64;
            };
            if zone {
                last = (index as i32) as i64;
            } else {
                last = -1i64;
            };
            last_end = end;
            index = end;
        };
    }
    let mut rest = last_end;
    while rest < length && date_text_space(chars[rest]) {
        rest += 1;
    }
    if rest != length {
        return -1i64;
    }
    last
}

// Runs of whitespace separate fields exactly as one space does.
fn temporal_collapsed_space(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut output = String::new();
    let mut previous = false;
    let mut index: usize = 0;
    while index < chars.len() {
        if date_text_space(chars[index]) {
            if previous == false {
                output.push(' ');
            };
            previous = true;
        } else {
            output.push(chars[index]);
            previous = false;
        };
        index += 1;
    }
    output
}

// The server reads leading digits joined by a repeated '-' or '/' as one date field, and its date
// splitter skips runs of separators and one trailing separator but rejects a field ending in two.
// Collapsing those leaves the grammar below one spelling to read; no characters come back when
// the server rejects the field. Only a leading field is read this way, since a later date field
// can be a zone name, and only one without letters, which would extend it.
fn temporal_first_date_field(chars: Vec<char>) -> Vec<char> {
    let mut start: usize = 0;
    while start < chars.len() && date_text_space(chars[start]) {
        start += 1;
    }
    let mut first_end = start;
    while first_end < chars.len() && date_text_digit(chars[first_end]) >= 0 {
        first_end += 1;
    }
    if first_end == start || first_end == chars.len() {
        return chars;
    }
    let delimiter = chars[first_end];
    if delimiter != '-' && delimiter != '/' {
        return chars;
    }
    let mut field_end = first_end;
    let mut parts: i32 = 1;
    let mut run: i32 = 0;
    let mut collapsed = false;
    while field_end < chars.len()
        && (chars[field_end] == delimiter || date_text_digit(chars[field_end]) >= 0)
    {
        if chars[field_end] == delimiter {
            run = run + 1;
            if run > 1 {
                collapsed = true;
            };
        } else {
            if run > 0 {
                parts = parts + 1;
            };
            run = 0;
        };
        field_end += 1;
    }
    // Letters right after the date's digits start a new field, as if a space stood before them.
    if field_end < chars.len()
        && english_date_letter(chars[field_end])
        && run == 0
        && parts >= 2
        && collapsed == false
    {
        let mut word_end = field_end;
        while word_end < chars.len() && english_date_letter(chars[word_end]) {
            word_end += 1;
        }
        if word_end == chars.len() || date_text_space(chars[word_end]) {
            let mut spaced: Vec<char> = Vec::new();
            let mut index: usize = 0;
            while index < chars.len() {
                if index == field_end {
                    spaced.push(' ');
                };
                spaced.push(chars[index]);
                index += 1;
            }
            return spaced;
        };
    }
    if field_end < chars.len() && english_date_letter(chars[field_end]) {
        return chars;
    }
    if run >= 2 {
        let rejected: Vec<char> = Vec::new();
        return rejected;
    }
    let trailing = run == 1 && parts >= 2;
    if collapsed == false && trailing == false {
        return chars;
    }
    let mut copy_end = field_end;
    if trailing {
        copy_end = field_end - 1;
    }
    let mut output: Vec<char> = Vec::new();
    let mut index: usize = 0;
    while index < chars.len() {
        let character = chars[index];
        let inside = index >= first_end && index < field_end;
        if inside == false
            || (index < copy_end && (character != delimiter || chars[index - 1] != delimiter))
        {
            output.push(character);
        };
        index += 1;
    }
    output
}

fn parse_temporal_text(
    value: TextValue,
    with_timezone: bool,
    date_only: bool,
    date_order: i32,
) -> Int8Value {
    let mut spelled = value.clone();
    if let TextValue::Value(text) = value {
        let mut limit: usize = 153;
        if date_only {
            limit = 129;
        };
        let buffer = temporal_field_buffer(text.as_str(), limit);
        if buffer == 1 {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        let mut compact = text.clone();
        if buffer == 0 {
            compact = temporal_collapsed_space(text.as_str());
        };
        if temporal_leading_lettered_date(compact.as_str())
            || temporal_delimited_after_fields(compact.as_str(), date_order)
        {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        compact = temporal_glued_letters(compact.as_str());
        let moved = temporal_leading_clock_moved(compact.as_str());
        if moved != "" {
            compact = moved;
        };
        // Fields before a malformed clock decode first; once they read, the clock is rejected.
        let bad_clock = temporal_bad_clock_start(compact.as_str());
        if bad_clock > 0i64 {
            let narrow = bad_clock as i32;
            let cut = usize::try_from(narrow).unwrap_or(0);
            let compact_chars: Vec<char> = compact.chars().collect();
            let mut prefix = String::new();
            let mut position: usize = 0;
            while position < cut {
                prefix.push(compact_chars[position]);
                position += 1;
            }
            let before = parse_temporal_text(TextValue::Value(prefix), false, false, date_order);
            if let Int8Value::Value(_) = before {
                return Int8Value::Error(SqlError {
                    state: INVALID_TIMESTAMP_TEXT,
                });
            };
        };
        compact = temporal_clock_spelling(compact.as_str());
        let lone = temporal_lone_date_field(compact.as_str());
        if lone == 1 {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        if lone == 2 {
            return Int8Value::Error(SqlError {
                state: TEMPORAL_FIELD_OVERFLOW,
            });
        }
        let typed: Vec<char> = compact.chars().collect();
        let typed_length = typed.len();
        let fields = temporal_first_date_field(typed);
        if fields.len() == 0 && typed_length != 0 {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        let mut output = String::new();
        let mut index: usize = 0;
        while index < fields.len() {
            output.push(fields[index]);
            index += 1;
        }
        spelled = TextValue::Value(output);
    };
    parse_temporal_fields(spelled, with_timezone, date_only, date_order)
}

fn parse_temporal_fields(
    value: TextValue,
    with_timezone: bool,
    date_only: bool,
    date_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = value {
        unresolved_flavor = 1;
    };
    if let TextValue::NonNull = value {
        if unresolved_flavor < 1 {
            unresolved_flavor = 1;
        };
    };
    if let TextValue::Unimplemented = value {
        unresolved_flavor = 2;
    };
    if let TextValue::Error(error) = value {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_218_4: i32 = unresolved_flavor;
    if let TextValue::Unknown = value {
        if condition_flavor_218_4 < 1 {
            condition_flavor_218_4 = 1;
        };
    };
    if let TextValue::Unimplemented = value {
        condition_flavor_218_4 = 2;
    };
    if (value == TextValue::Unknown || value == TextValue::Unimplemented)
        || value == TextValue::NonNull
    {
        return int8_unresolved(condition_flavor_218_4);
    }
    if value == TextValue::Null {
        return Int8Value::Null;
    }
    if let TextValue::Value(input) = value {
        // The field buffer already bounds the text; this only guards a direct caller.
        let chars: Vec<char> = input.chars().collect();
        if chars.len() > 152 {
            return int8_unresolved(unresolved_flavor);
        }
        let special = temporal_special_word_conflict(input.as_str(), date_order);
        if special == 1 {
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        }
        if special == 2 {
            return int8_unresolved(resolution_context(unresolved_flavor));
        }
        if special == 3 {
            return Int8Value::Error(SqlError {
                state: TEMPORAL_FIELD_OVERFLOW,
            });
        }
        if temporal_relative_word(input.as_str()) {
            return int8_unresolved(resolution_context(unresolved_flavor));
        }
        // PostgreSQL reads BC or AD as an ordinary field anywhere after the first one, so the era
        // is blanked before the date and clock grammar runs, as is punctuation its lexer skips
        // where a field would start. A leading era is rejected before
        // other fields are validated; a repeated era is reported in field order, after clock and
        // zone errors but before date validation, so it is decided only when the fields before
        // it read without error.
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
                // A field that starts with a digit is a date, a time or a number. It continues
                // with digits, its own separator, or the colon and dot of a clock, so other
                // punctuation right after it falls where the next field would start, which the
                // lexer skips.
                let mut field_ended = false;
                let scanned_length = scanned.len();
                if (era_character == '/' || era_character == ':' || era_character == '_')
                    && scanned_length > 0
                    && date_text_digit(scanned[scanned_length - 1]) >= 0
                {
                    let mut token_start = scanned_length;
                    while token_start > 0 && date_text_space(scanned[token_start - 1]) == false {
                        token_start = token_start - 1;
                    }
                    let mut colon = false;
                    let mut dash = false;
                    let mut dot = false;
                    let mut slash = false;
                    let mut separators = 0;
                    let mut plain = date_text_digit(scanned[token_start]) >= 0;
                    let mut token_index = token_start;
                    while token_index < scanned_length {
                        let token_character = scanned[token_index];
                        if token_character == ':' {
                            colon = true;
                        } else if token_character == '-' {
                            dash = true;
                            separators = separators + 1;
                        } else if token_character == '.' {
                            dot = true;
                            separators = separators + 1;
                        } else if token_character == '/' {
                            slash = true;
                            separators = separators + 1;
                        } else if date_text_digit(token_character) < 0 {
                            plain = false;
                        };
                        token_index += 1;
                    }
                    // A sign or a second kind of separator can start another field inside the
                    // run, so only a clock (which may carry its fraction) or a three-part date
                    // with one separator qualifies.
                    let mut shaped = colon && dash == false && slash == false;
                    let date_separators = separators;
                    if colon == false {
                        let mut kinds = 0;
                        if dash {
                            kinds = kinds + 1;
                        };
                        if slash {
                            kinds = kinds + 1;
                        };
                        if dot {
                            kinds = kinds + 1;
                        };
                        // The first field of the text is a date even with two parts, such as an
                        // ordinal date.
                        let mut leading = true;
                        let mut before = 0;
                        while before < token_start {
                            if date_text_space(scanned[before]) == false {
                                leading = false;
                            };
                            before += 1;
                        }
                        shaped = kinds == 0
                            || (kinds == 1 && date_separators == 2)
                            || (kinds == 1 && date_separators == 1 && leading);
                    };
                    if plain && shaped {
                        let digits_only =
                            colon == false && dash == false && dot == false && slash == false;
                        if era_character == '_' {
                            field_ended = true;
                        } else if era_character == ':' {
                            field_ended = digits_only == false && colon == false;
                        } else {
                            field_ended = colon || dash || dot;
                        };
                    };
                };
                if temporal_skipped_punctuation(era_character)
                    || ((era_field_start || field_ended)
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
                    // The date decoder accepts only date fields collected before a delimited date,
                    // so one after the era is rejected; numbers and month names after it read.
                    if era_leading {
                        let mut delimited = false;
                        let mut dated = false;
                        let mut plain_date = true;
                        let mut scan = era_end;
                        while scan < chars.len() {
                            if date_text_space(chars[scan]) {
                                scan += 1;
                            } else {
                                let token_start = scan;
                                let mut separators = 0;
                                let mut dots = 0;
                                while scan < chars.len() && date_text_space(chars[scan]) == false {
                                    if chars[scan] == '-' || chars[scan] == '/' {
                                        separators = separators + 1;
                                    };
                                    if chars[scan] == '.' {
                                        dots = dots + 1;
                                    };
                                    scan += 1;
                                }
                                let digit_led = date_text_digit(chars[token_start]) >= 0;
                                let mut month_led = false;
                                if english_date_letter(chars[token_start]) {
                                    let mut word = String::new();
                                    let mut letter = token_start;
                                    while letter < scan && english_date_letter(chars[letter]) {
                                        word.push(chars[letter].to_ascii_lowercase());
                                        letter += 1;
                                    }
                                    month_led =
                                        english_date_month(word.as_str()) > 0 && separators > 0;
                                };
                                if (digit_led && (separators > 0 || dots > 1)) || month_led {
                                    delimited = true;
                                };
                                // Numbers, month names, special words and Julian days can supply
                                // the date; clocks, zones and other words cannot.
                                let mut colon = false;
                                let mut lowered = String::new();
                                let mut look = token_start;
                                while look < scan {
                                    if chars[look] == ':' {
                                        colon = true;
                                    };
                                    lowered.push(chars[look].to_ascii_lowercase());
                                    look += 1;
                                }
                                let julian_led = (chars[token_start] == 'j'
                                    || chars[token_start] == 'J')
                                    && token_start + 1 < scan
                                    && date_text_digit(chars[token_start + 1]) >= 0;
                                if (digit_led && colon == false)
                                    || english_date_month(lowered.as_str()) != 0
                                    || temporal_special_word(lowered.as_str())
                                    || julian_led
                                {
                                    dated = true;
                                };
                                // The era is ignored for a Julian day and the special words.
                                if temporal_special_word(lowered.as_str()) || julian_led {
                                    plain_date = false;
                                };
                            };
                        }
                        if delimited {
                            return Int8Value::Error(SqlError {
                                state: INVALID_TIMESTAMP_TEXT,
                            });
                        }
                        // Without a field that supplies the date it is missing once the other
                        // fields read.
                        if dated == false {
                            let mut completed = String::new();
                            completed.push_str("2000-01-01 ");
                            let mut copy = era_end;
                            while copy < chars.len() {
                                completed.push(chars[copy]);
                                copy += 1;
                            }
                            let reading = parse_temporal_text(
                                TextValue::Value(completed),
                                false,
                                false,
                                date_order,
                            );
                            if let Int8Value::Value(_) = reading {
                                return Int8Value::Error(SqlError {
                                    state: INVALID_TIMESTAMP_TEXT,
                                });
                            };
                            return int8_unresolved(unresolved_flavor);
                        };
                        if plain_date == false {
                            return int8_unresolved(unresolved_flavor);
                        }
                    }
                    let mut era_trailing = true;
                    let mut era_after = era_end;
                    while era_after < chars.len() {
                        if date_text_space(chars[era_after]) == false {
                            era_trailing = false;
                        }
                        era_after += 1;
                    }
                    // A repeated era is a repeated field, rejected where it stands once the
                    // fields before it read.
                    if eras > 0 {
                        let mut prefix = String::new();
                        let mut position: usize = 0;
                        while position < era_index {
                            prefix.push(chars[position]);
                            position += 1;
                        }
                        let before =
                            parse_temporal_text(TextValue::Value(prefix), false, false, date_order);
                        if let Int8Value::Value(_) = before {
                            return Int8Value::Error(SqlError {
                                state: INVALID_TIMESTAMP_TEXT,
                            });
                        };
                        return int8_unresolved(unresolved_flavor);
                    }
                    // A trailing era after special words such as epoch is ignored, as before.
                    if era_digit_before == false && era_trailing == false && era_leading == false {
                        return int8_unresolved(unresolved_flavor);
                    }
                    let mut era_previous = ' ';
                    if era_index > 0 {
                        era_previous = chars[era_index - 1];
                    };
                    if date_text_space(era_previous) == false && date_text_digit(era_previous) < 0 {
                        return int8_unresolved(unresolved_flavor);
                    }
                    if era_end < chars.len() {
                        let era_next = chars[era_end];
                        if date_text_space(era_next) == false
                            && date_text_digit(era_next) < 0
                            && era_next != '+'
                        {
                            return int8_unresolved(unresolved_flavor);
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
                    return int8_unresolved(unresolved_flavor);
                }
                return Int8Value::Error(SqlError {
                    state: INVALID_TIMESTAMP_TEXT,
                });
            }
            if after > leading_end {
                start = after;
            }
        }
        let ordinal = read_date_fields(&text, start, end, date_order, bc);
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
            if date_order == 0 {
                return temporal_text_any_order(input.clone(), with_timezone, date_only);
            }
            return int8_unresolved(unresolved_flavor);
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
                return int8_unresolved(unresolved_flavor);
            }
            year = calendar_short_year(compact_year.value, compact_year.digits, bc);
            year_overflow = false;
            let compact_month = read_timestamp_number(&text, index - 4, index - 2);
            let compact_day = read_timestamp_number(&text, index - 2, index);
            month = compact_month.value;
            day = compact_day.value;
        } else {
            // A short first field's role follows the session DateStyle order, which was not declared.
            if (year_field.digits == 1 || year_field.digits == 2) && date_order == 0 && index < end
            {
                return temporal_text_any_order(input.clone(), with_timezone, date_only);
            }
            if (year_field.digits == 1 || year_field.digits == 2) && date_order > 0 && index < end {
                // A short first field takes its role from the session field order, as in
                // DecodeNumber; a one- or two-digit year maps into 1970-2069 unless BC is given.
                let separator = text.chars[index];
                if separator != '-' && separator != '/' && separator != '.' {
                    return int8_unresolved(unresolved_flavor);
                }
                let second_field = read_timestamp_number(&text, index + 1, end);
                index = second_field.next;
                if second_field.digits < 1
                    || second_field.digits > 2
                    || index == end
                    || text.chars[index] != separator
                {
                    return int8_unresolved(unresolved_flavor);
                }
                let third_field = read_timestamp_number(&text, index + 1, end);
                index = third_field.next;
                if third_field.digits < 1
                    || third_field.overflow
                    || (index < end && text.chars[index] == separator)
                {
                    return int8_unresolved(unresolved_flavor);
                }
                let mut short_year = third_field.value;
                let mut year_digits = third_field.digits;
                if date_order == 1 {
                    month = year_field.value;
                    day = second_field.value;
                } else if date_order == 2 {
                    day = year_field.value;
                    month = second_field.value;
                } else {
                    short_year = year_field.value;
                    year_digits = year_field.digits;
                    month = second_field.value;
                    day = third_field.value;
                };
                year = short_year;
                if year_digits <= 2 && bc == false {
                    if year < 70 {
                        year = year + 2000;
                    } else {
                        year = year + 1900;
                    };
                };
            } else if year_field.digits < 3 || index == end {
                // A leading word the grammar does not claim is looked up in the session zone
                // abbreviations; the grammar's own words are not.
                if year_field.digits == 0 && start < end && english_date_letter(text.chars[start]) {
                    let mut word_end = start;
                    while word_end < end && english_date_letter(text.chars[word_end]) {
                        word_end += 1;
                    }
                    if temporal_zone_word(&text, start, word_end) {
                        return int8_unresolved(resolution_context(unresolved_flavor));
                    }
                    // A day word before clocks and zones takes the date from the transaction.
                    let day = english_date_word(&text, start, word_end);
                    if day == "today" || day == "tomorrow" || day == "yesterday" {
                        let mut timed = true;
                        let mut look = word_end;
                        while look < end {
                            let character = text.chars[look];
                            if date_text_space(character) == false
                                && character != ':'
                                && character != '.'
                                && character != '+'
                                && character != '-'
                                && date_text_digit(character) < 0
                                && english_date_letter(character) == false
                            {
                                timed = false;
                            };
                            look += 1;
                        }
                        let mut token = word_end;
                        while token < end {
                            while token < end && date_text_space(text.chars[token]) {
                                token += 1;
                            }
                            let token_start = token;
                            let mut colon = false;
                            while token < end && date_text_space(text.chars[token]) == false {
                                if text.chars[token] == ':' {
                                    colon = true;
                                };
                                token += 1;
                            }
                            if token_start < end
                                && date_text_digit(text.chars[token_start]) >= 0
                                && colon == false
                            {
                                timed = false;
                            };
                        }
                        if timed {
                            return int8_unresolved(resolution_context(unresolved_flavor));
                        };
                    };
                    return int8_unresolved(unresolved_flavor);
                }
                return int8_unresolved(unresolved_flavor);
            } else {
                let separator = text.chars[index];
                if separator != '-' && separator != '/' && separator != '.' {
                    return int8_unresolved(unresolved_flavor);
                }
                let month_field = read_timestamp_number(&text, index + 1, end);
                index = month_field.next;
                if month_field.digits < 1 || index == end || text.chars[index] != separator {
                    return int8_unresolved(unresolved_flavor);
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
                        return int8_unresolved(unresolved_flavor);
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
                            return int8_unresolved(unresolved_flavor);
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
                            return int8_unresolved(unresolved_flavor);
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
            return int8_unresolved(unresolved_flavor);
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
                return int8_unresolved(unresolved_flavor);
            }
            minute = minutes.value;
            if index < end && text.chars[index] == ':' {
                let seconds = read_timestamp_number(&text, index + 1, end);
                index = seconds.next;
                if seconds.digits < 1 {
                    return int8_unresolved(unresolved_flavor);
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
                return int8_unresolved(unresolved_flavor);
            }
            return Int8Value::Error(SqlError {
                state: INVALID_TIMESTAMP_TEXT,
            });
        } else if zone_only == false {
            if temporal_zone_word(&text, index, end) {
                return int8_unresolved(resolution_context(unresolved_flavor));
            }
            return int8_unresolved(unresolved_flavor);
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
                return int8_unresolved(unresolved_flavor);
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
            if zone_hour.digits < 1 {
                return int8_unresolved(unresolved_flavor);
            }
            // The server reads each part as one integer, so leading zeros never matter and a part
            // past the integer range is a displacement overflow like any out-of-range part.
            let mut hours = zone_hour.value;
            let mut minutes: i32 = 0;
            let mut seconds: i32 = 0;
            let mut zone_overflow = zone_hour.overflow;
            if index < end && text.chars[index] == ':' {
                let zone_minute = read_timestamp_number(&text, index + 1, end);
                index = zone_minute.next;
                if zone_minute.digits < 1 {
                    return int8_unresolved(unresolved_flavor);
                }
                minutes = zone_minute.value;
                zone_overflow = zone_overflow || zone_minute.overflow;
                if index < end && text.chars[index] == ':' {
                    let zone_second = read_timestamp_number(&text, index + 1, end);
                    index = zone_second.next;
                    if zone_second.digits < 1 {
                        return int8_unresolved(unresolved_flavor);
                    }
                    seconds = zone_second.value;
                    zone_overflow = zone_overflow || zone_second.overflow;
                }
            } else if zone_hour.digits > 2 && zone_overflow == false {
                hours = zone_hour.value / 100;
                minutes = zone_hour.value % 100;
            }
            if zone_overflow || hours > 15 || minutes > 59 || seconds > 59 {
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
            if temporal_zone_word(&text, index, end) {
                return int8_unresolved(resolution_context(unresolved_flavor));
            }
            return int8_unresolved(unresolved_flavor);
        } else if with_timezone {
            missing_timezone = true;
        }
        if deferred_zone {
            if index != deferred_zone_end {
                return int8_unresolved(unresolved_flavor);
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
            let mut condition_flavor_931_12: i32 = unresolved_flavor;
            if let Int8Value::Unknown = after_clock {
                if condition_flavor_931_12 < 1 {
                    condition_flavor_931_12 = 1;
                };
            };
            if let Int8Value::Unimplemented = after_clock {
                condition_flavor_931_12 = 2;
            };
            if after_clock == Int8Value::Unknown || after_clock == Int8Value::Unimplemented {
                return int8_unresolved(condition_flavor_931_12);
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
            if temporal_zone_word(&text, index, end) {
                return int8_unresolved(resolution_context(unresolved_flavor));
            }
            return int8_unresolved(unresolved_flavor);
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
    int8_unresolved(unresolved_flavor)
}

fn timestamp_from_microseconds(value: Int8Value) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = value {
        unresolved_flavor = 1;
    };
    if let Int8Value::Unimplemented = value {
        unresolved_flavor = 2;
    };
    if let Int8Value::Error(error) = value {
        return TimestampValue::Error(error);
    }
    if let Int8Value::Value(microseconds) = value {
        return make_timestamp_value(microseconds);
    }
    if value == Int8Value::Null {
        return TimestampValue::Null;
    }
    timestamp_unresolved(unresolved_flavor)
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

pub fn timestamp_from_text_order(value: TextValue, date_order: i32) -> TimestampValue {
    let parsed = parse_temporal_text(value, false, false, date_order);
    timestamp_from_microseconds(parsed)
}
