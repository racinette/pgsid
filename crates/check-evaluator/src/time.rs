const CLOCK_INPUT_SYNTAX: u32 = 3452551;
const CLOCK_INPUT_RANGE: u32 = 3452552;

fn clock_input_alpha(character: char) -> bool {
    let code = character.to_ascii_lowercase() as i32;
    code >= 97 && code <= 122
}

fn clock_input_complete(text: &str) -> String {
    let characters: Vec<char> = text.chars().collect();
    let mut result = String::new();
    let mut active = true;
    let mut seen = false;
    let mut position: usize = 0;
    while position < characters.len() {
        let character = characters[position];
        if date_text_digit(character) >= 0 {
            seen = true;
        };
        if character == '+'
            || character == '-'
            || clock_input_alpha(character)
            || (seen && date_text_space(character))
        {
            active = false;
        };
        result.push(character);
        if active && seen && character == ':' {
            let mut missing = position + 1 == characters.len();
            if position + 1 < characters.len() {
                let next = characters[position + 1];
                missing = next == ':'
                    || next == '.'
                    || next == '+'
                    || next == '-'
                    || date_text_space(next)
                    || clock_input_alpha(next);
            };
            if missing {
                result.push('0');
            };
        };
        position += 1;
    }
    result
}

fn clock_grammar_normalized(input: TextValue) -> TextValue {
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut start: usize = 0;
        let mut end = chars.len();
        while start < end && (date_text_space(chars[start]) || chars[start] == ':') {
            start += 1;
        }
        while end > start && date_text_space(chars[end - 1]) {
            end = end - 1;
        }
        let mut position = start;
        while position < end && date_text_digit(chars[position]) >= 0 {
            position += 1;
        }
        if position - start >= 4 && position < end && chars[position] == '-' {
            position += 1;
            while position < end && date_text_digit(chars[position]) >= 0 {
                position += 1;
            }
            if position < end && chars[position] == '-' {
                position += 1;
                while position < end && date_text_digit(chars[position]) >= 0 {
                    position += 1;
                }
                if position < end
                    && (date_text_space(chars[position])
                        || chars[position] == 'T'
                        || chars[position] == 't')
                {
                    if date_text_space(chars[position]) == false {
                        return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
                    }
                    let mut date = String::new();
                    let mut index = start;
                    while index < position {
                        date.push(chars[index]);
                        index += 1;
                    }
                    let parsed = date_from_text(TextValue::Value(date));
                    if let DateValue::Error(error) = parsed {
                        return TextValue::Error(error);
                    };
                    if parsed == DateValue::Unknown {
                        return TextValue::Unknown;
                    };
                    start = position + 1;
                    while start < end && date_text_space(chars[start]) {
                        start += 1;
                    }
                };
            };
        };
        let mut clock = String::new();
        let mut meridian: i32 = 0;
        if start + 1 < end
            && chars[start].to_ascii_lowercase() == 't'
            && date_text_digit(chars[start + 1]) >= 0
        {
            start += 1;
        };
        position = start;
        while position < end {
            let mut consumed = false;
            let letter = chars[position].to_ascii_lowercase();
            if position + 1 < end
                && (letter == 'a' || letter == 'p')
                && chars[position + 1].to_ascii_lowercase() == 'm'
            {
                let mut before = true;
                let mut after = true;
                if position > start {
                    before = date_text_space(chars[position - 1])
                        || date_text_digit(chars[position - 1]) >= 0;
                };
                if position + 2 < end {
                    after = date_text_space(chars[position + 2])
                        || chars[position + 2] == '+'
                        || chars[position + 2] == '-';
                };
                if before && after {
                    if meridian != 0 {
                        return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
                    };
                    meridian = 1;
                    if letter == 'p' {
                        meridian = 2;
                    };
                    position += 2;
                    consumed = true;
                };
            };
            if consumed == false {
                clock.push(chars[position]);
                position += 1;
            };
        }
        let raw: Vec<char> = clock.chars().collect();
        start = 0;
        while start < raw.len() && date_text_space(raw[start]) {
            start += 1;
        }
        position = start;
        while position < raw.len() && date_text_digit(raw[position]) >= 0 {
            position += 1;
        }
        let digits = position - start;
        let mut normalized = String::new();
        if (digits == 4 || digits == 6) && (position == raw.len() || raw[position] != ':') {
            normalized.push(raw[start]);
            normalized.push(raw[start + 1]);
            normalized.push(':');
            normalized.push(raw[start + 2]);
            normalized.push(raw[start + 3]);
            normalized.push(':');
            if digits == 6 {
                normalized.push(raw[start + 4]);
                normalized.push(raw[start + 5]);
            } else {
                normalized.push('0');
                normalized.push('0');
            };
        } else {
            let mut clock_end = position;
            if position < raw.len() && raw[position] == ':' {
                clock_end += 1;
                while clock_end < raw.len() && date_text_digit(raw[clock_end]) >= 0 {
                    clock_end += 1;
                }
                if clock_end < raw.len() && raw[clock_end] == '.' {
                    normalized.push_str("00:");
                };
            };
            position = start;
        };
        while position < raw.len() {
            normalized.push(raw[position]);
            position += 1;
        }
        normalized = clock_input_complete(normalized.as_str());
        if meridian != 0 {
            normalized.push(' ');
            if meridian == 1 {
                normalized.push_str("AM");
            } else {
                normalized.push_str("PM");
            };
        };
        return TextValue::Value(normalized);
    };
    input
}

fn clock_input_text(raw_input: TextValue) -> TextValue {
    let input = clock_grammar_normalized(raw_input);
    if let TextValue::Value(value) = input {
        let text = TimestampText {
            chars: value.chars().collect(),
        };
        let mut start: usize = 0;
        let mut end = text.chars.len();
        while start < end && date_text_space(text.chars[start]) {
            start += 1;
        }
        while start < end && date_text_space(text.chars[end - 1]) {
            end = end - 1;
        }
        if start == end || text.chars[start] == '+' || text.chars[start] == '-' {
            return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
        };
        let mut keyword = String::new();
        let mut digit_count: usize = 0;
        let mut word_end = start;
        while word_end < end && clock_input_alpha(text.chars[word_end]) {
            word_end += 1;
        }
        let mut word_digits = word_end;
        while word_digits < end && date_text_digit(text.chars[word_digits]) >= 0 {
            word_digits += 1;
        }
        let mut scan = start;
        while scan < end {
            keyword.push(text.chars[scan].to_ascii_lowercase());
            if date_text_digit(text.chars[scan]) >= 0 {
                digit_count += 1;
            };
            scan += 1;
        }
        if digit_count == 0 {
            if keyword == "now" {
                return TextValue::Unknown;
            };
            if keyword == "allballs" {
                return make_text_value("2000-01-01 00:00:00+00");
            };
            return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
        };
        if word_end > start && word_digits == end && word_digits - word_end < 4 {
            return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
        };
        let mut numeric_end = start;
        while numeric_end < end && date_text_digit(text.chars[numeric_end]) >= 0 {
            numeric_end += 1;
        }
        if numeric_end > start
            && numeric_end - start < 4
            && numeric_end < end
            && text.chars[numeric_end] != ':'
        {
            return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
        };
        if numeric_end > start && numeric_end < end && text.chars[numeric_end] == '.' {
            numeric_end += 1;
            while numeric_end < end && date_text_digit(text.chars[numeric_end]) >= 0 {
                numeric_end += 1;
            }
        };
        if numeric_end == end {
            return TextValue::Error(make_sql_error(CLOCK_INPUT_SYNTAX));
        };
        let mut meridian: i32 = 0;
        if end - start >= 2 && text.chars[end - 1].to_ascii_lowercase() == 'm' {
            let initial = text.chars[end - 2].to_ascii_lowercase();
            if initial == 'a' || initial == 'p' {
                meridian = 1;
                if initial == 'p' {
                    meridian = 2;
                };
                end = end - 2;
                while start < end && date_text_space(text.chars[end - 1]) {
                    end = end - 1;
                }
            };
        };
        let mut output = "2000-01-01 ".to_owned();
        if meridian != 0 {
            let hours = read_timestamp_number(&text, start, end);
            if hours.digits == 0 || hours.next == end || text.chars[hours.next] != ':' {
                return TextValue::Unknown;
            };
            if hours.overflow || hours.value > 12 {
                return TextValue::Error(make_sql_error(CLOCK_INPUT_RANGE));
            };
            let mut hour = hours.value;
            if hour == 12 {
                hour = 0;
            };
            if meridian == 2 {
                hour = hour + 12;
            };
            let symbols: Vec<char> = "0123456789".chars().collect();
            let tens = usize::try_from(hour / 10).unwrap_or(0);
            let ones = usize::try_from(hour % 10).unwrap_or(0);
            output.push(symbols[tens]);
            output.push(symbols[ones]);
            start = hours.next;
        };
        while start < end {
            output.push(text.chars[start]);
            start += 1;
        }
        return TextValue::Value(output);
    };
    input
}

pub fn time_from_text(input: TextValue) -> TimeValue {
    let parsed = parse_timestamp_text(clock_input_text(input), false);
    if let Int8Value::Error(error) = parsed {
        return TimeValue::Error(error);
    };
    if parsed == Int8Value::Null {
        return TimeValue::Null;
    };
    if let Int8Value::Value(time) = parsed {
        return make_time_value(time);
    };
    TimeValue::Unknown
}

pub fn timetz_from_text(input: TextValue) -> TimetzValue {
    let normalized = clock_input_text(input);
    let local = parse_timestamp_text(normalized.clone(), false);
    let utc = parse_timestamp_text(normalized, true);
    if let Int8Value::Error(error) = local {
        return TimetzValue::Error(error);
    };
    if let Int8Value::Error(error) = utc {
        return TimetzValue::Error(error);
    };
    if local == Int8Value::Null || utc == Int8Value::Null {
        return TimetzValue::Null;
    };
    if let Int8Value::Value(time) = local {
        if let Int8Value::Value(instant) = utc {
            let zone = (instant - time) / 1000000i64;
            return make_timetz_value(time, zone as i32);
        };
    };
    TimetzValue::Unknown
}
