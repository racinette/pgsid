const CLOCK_INPUT_SYNTAX: u32 = 3452551;
const CLOCK_INPUT_RANGE: u32 = 3452552;

fn clock_input_text(input: TextValue) -> TextValue {
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
        }
        let mut meridian: i32 = 0;
        if end - start >= 2 && text.chars[end - 1].to_ascii_lowercase() == 'm' {
            let initial = text.chars[end - 2].to_ascii_lowercase();
            if initial == 'a' || initial == 'p' {
                meridian = 1;
                if initial == 'p' {
                    meridian = 2;
                }
                end = end - 2;
                while start < end && date_text_space(text.chars[end - 1]) {
                    end = end - 1;
                }
            }
        }
        let mut output = "2000-01-01 ".to_owned();
        if meridian != 0 {
            let hours = read_timestamp_number(&text, start, end);
            if hours.digits == 0 || hours.next == end || text.chars[hours.next] != ':' {
                return TextValue::Unknown;
            }
            if hours.overflow || hours.value > 12 {
                return TextValue::Error(make_sql_error(CLOCK_INPUT_RANGE));
            }
            let mut hour = hours.value;
            if hour == 12 {
                hour = 0;
            }
            if meridian == 2 {
                hour = hour + 12;
            }
            let symbols: Vec<char> = "0123456789".chars().collect();
            let tens = usize::try_from(hour / 10).unwrap_or(0);
            let ones = usize::try_from(hour % 10).unwrap_or(0);
            output.push(symbols[tens]);
            output.push(symbols[ones]);
            start = hours.next;
        }
        while start < end {
            output.push(text.chars[start]);
            start += 1;
        }
        return TextValue::Value(output);
    }
    input
}

pub fn time_from_text(input: TextValue) -> TimeValue {
    let parsed = parse_timestamp_text(clock_input_text(input), false);
    if let Int8Value::Error(error) = parsed {
        return TimeValue::Error(error);
    }
    if parsed == Int8Value::Null {
        return TimeValue::Null;
    }
    if let Int8Value::Value(time) = parsed {
        return make_time_value(time);
    }
    TimeValue::Unknown
}

pub fn timetz_from_text(input: TextValue) -> TimetzValue {
    let normalized = clock_input_text(input);
    let local = parse_timestamp_text(normalized.clone(), false);
    let utc = parse_timestamp_text(normalized, true);
    if let Int8Value::Error(error) = local {
        return TimetzValue::Error(error);
    }
    if let Int8Value::Error(error) = utc {
        return TimetzValue::Error(error);
    }
    if local == Int8Value::Null || utc == Int8Value::Null {
        return TimetzValue::Null;
    }
    if let Int8Value::Value(time) = local {
        if let Int8Value::Value(instant) = utc {
            let zone = (instant - time) / 1000000i64;
            return make_timetz_value(time, zone as i32);
        }
    }
    TimetzValue::Unknown
}
