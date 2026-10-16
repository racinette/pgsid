const JSONPATH_TEMPORAL_ARGUMENT: u32 = 3452653;
const JSONPATH_TEMPORAL_FEATURE: u32 = 466560;

#[derive(Clone, Copy)]
struct JsonpathTemporalValue {
    kind: i32,
    value: i64,
    zone: i32,
    error: u32,
    unknown: bool,
    hard: bool,
}

#[derive(Clone)]
struct JsonpathTemporalSource {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct JsonpathTemporalRead {
    value: i32,
    end: usize,
    width: usize,
    valid: bool,
}

fn jsonpath_temporal_state(
    kind: i32,
    value: i64,
    zone: i32,
    error: u32,
    unknown: bool,
    hard: bool,
) -> JsonpathTemporalValue {
    JsonpathTemporalValue {
        kind: kind,
        value: value,
        zone: zone,
        error: error,
        unknown: unknown,
        hard: hard,
    }
}

fn jsonpath_temporal_invalid() -> JsonpathTemporalValue {
    jsonpath_temporal_state(0, 0i64, 0, JSONPATH_TEMPORAL_ARGUMENT, false, false)
}

fn jsonpath_temporal_number(source: &JsonpathTemporalSource, begin: usize) -> JsonpathTemporalRead {
    let mut position = begin;
    while position < source.characters.len() && numeric_space(source.characters[position]) {
        position += 1;
    }
    let mut negative = false;
    if position < source.characters.len()
        && (source.characters[position] == '+' || source.characters[position] == '-')
    {
        negative = source.characters[position] == '-';
        position += 1;
    };
    let start = position;
    let mut number: i64 = 0i64;
    let mut valid = true;
    while position < source.characters.len()
        && numeric_wire_decimal_digit(source.characters[position]) >= 0
    {
        let digit = numeric_wire_decimal_digit(source.characters[position]) as i64;
        if number > (2147483648i64 - digit) / 10i64 {
            valid = false;
        };
        if valid {
            number = number * 10i64 + digit;
        };
        position += 1;
    }
    if position == start || (negative == false && number > 2147483647i64) {
        valid = false;
    };
    if negative {
        number = 0i64 - number;
    };
    JsonpathTemporalRead {
        value: number as i32,
        end: position,
        width: position - begin,
        valid: valid,
    }
}

fn jsonpath_temporal_letter(character: char) -> bool {
    let code = character as i32;
    (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

fn jsonpath_temporal_decode(input: TextValue) -> JsonpathTemporalValue {
    if let TextValue::Null = input {
        return jsonpath_temporal_state(-1, 0i64, 0, 0, false, false);
    };
    if let TextValue::Error(error) = input {
        return jsonpath_temporal_state(0, 0i64, 0, error.state, false, false);
    };
    if let TextValue::Value(text) = input {
        let source = JsonpathTemporalSource {
            characters: text.chars().collect(),
        };
        let length = source.characters.len();
        let first = jsonpath_temporal_number(&source, 0);
        if first.valid == false || first.end == length {
            return jsonpath_temporal_invalid();
        };
        let mut has_date = false;
        let mut day: i32 = 0;
        let mut position = first.end;
        let mut hour = first.value;
        if source.characters[position] == '-' {
            has_date = true;
            let month = jsonpath_temporal_number(&source, position + 1);
            if month.valid == false || month.end == length || source.characters[month.end] != '-' {
                return jsonpath_temporal_invalid();
            };
            let date = jsonpath_temporal_number(&source, month.end + 1);
            if date.valid == false {
                return jsonpath_temporal_invalid();
            };
            let mut year = first.value;
            if year == 0 {
                year = -1;
            };
            let mut month_value = month.value;
            let mut day_value = date.value;
            if month_value == 0 {
                month_value = 1;
            };
            if day_value == 0 {
                day_value = 1;
            };
            let calendar = date_from_ymd(year, month_value, day_value);
            let mut valid = false;
            if let DateValue::Value(number) = calendar {
                day = number;
                valid = true;
            };
            if valid == false {
                return jsonpath_temporal_invalid();
            };
            position = date.end;
            let mut following = position;
            while following < length && numeric_space(source.characters[following]) {
                following += 1;
            }
            if following == length {
                return jsonpath_temporal_state(1, day as i64, 0, 0, false, false);
            };
            if source.characters[position] != ' ' && source.characters[position] != 'T' {
                return jsonpath_temporal_invalid();
            };
            let hours = jsonpath_temporal_number(&source, position + 1);
            if hours.valid == false {
                return jsonpath_temporal_invalid();
            };
            hour = hours.value;
            position = hours.end;
        };
        if position == length || source.characters[position] != ':' {
            return jsonpath_temporal_invalid();
        };
        let minute = jsonpath_temporal_number(&source, position + 1);
        if minute.valid == false || minute.end == length || source.characters[minute.end] != ':' {
            return jsonpath_temporal_invalid();
        };
        let second = jsonpath_temporal_number(&source, minute.end + 1);
        if second.valid == false
            || hour < 0
            || hour > 23
            || minute.value < 0
            || minute.value > 59
            || second.value < 0
            || second.value > 59
        {
            return jsonpath_temporal_invalid();
        };
        position = second.end;
        let mut fraction: i32 = 0;
        if position < length && source.characters[position] == '.' {
            let microseconds = jsonpath_temporal_number(&source, position + 1);
            if microseconds.valid == false {
                return jsonpath_temporal_invalid();
            };
            fraction = microseconds.value;
            let mut width = microseconds.width;
            while width < 6 {
                fraction = fraction * 10;
                width += 1;
            }
            if fraction < 0 || fraction > 999999 {
                return jsonpath_temporal_invalid();
            };
            position = microseconds.end;
        };
        let mut zone: i32 = 0;
        let mut zoned = false;
        let mut following = position;
        while following < length && numeric_space(source.characters[following]) {
            following += 1;
        }
        if following < length {
            let character = source.characters[position];
            if jsonpath_temporal_letter(character) {
                let mut cursor = position;
                while cursor < length && jsonpath_temporal_letter(source.characters[cursor]) {
                    cursor += 1;
                }
                while cursor < length && numeric_space(source.characters[cursor]) {
                    cursor += 1;
                }
                if cursor != length {
                    return jsonpath_temporal_invalid();
                };
                let mut partial_kind: i32 = 3;
                if has_date {
                    partial_kind = 5;
                };
                return jsonpath_temporal_state(partial_kind, 0i64, 0, 0, true, false);
            };
            if character != '+' && character != '-' && character != ' ' {
                return jsonpath_temporal_invalid();
            };
            zoned = true;
            let mut sign: i32 = -1;
            if character == '-' {
                sign = 1;
            };
            let hours = jsonpath_temporal_number(&source, position + 1);
            if hours.valid == false || hours.value < 0 || hours.value > 15 {
                return jsonpath_temporal_invalid();
            };
            position = hours.end;
            let mut minutes: i32 = 0;
            if position < length && source.characters[position] == ':' {
                let read = jsonpath_temporal_number(&source, position + 1);
                if read.valid == false || read.value < 0 || read.value > 59 {
                    return jsonpath_temporal_invalid();
                };
                minutes = read.value;
                position = read.end;
            };
            zone = sign * (hours.value * 3600 + minutes * 60);
        };
        while position < length && numeric_space(source.characters[position]) {
            position += 1;
        }
        if position != length {
            return jsonpath_temporal_invalid();
        };
        let time = (hour as i64) * 3600000000i64
            + (minute.value as i64) * 60000000i64
            + (second.value as i64) * 1000000i64
            + fraction as i64;
        if has_date {
            let midnight = sql__pg_catalog__timestamp__swxj(DateValue::Value(day));
            if let TimestampValue::Value(start) = midnight {
                let added =
                    sql__pg_catalog__int8pl__1v1h(Int8Value::Value(start), Int8Value::Value(time));
                if let Int8Value::Value(number) = added {
                    let checked = make_timestamp_value(number);
                    if let TimestampValue::Value(value) = checked {
                        if zoned {
                            let adjustment = (zone as i64) * 1000000i64;
                            let shifted = sql__pg_catalog__int8pl__1v1h(
                                Int8Value::Value(value),
                                Int8Value::Value(adjustment),
                            );
                            if let Int8Value::Value(utc) = shifted {
                                let valid = make_timestamptz_value(utc);
                                if let TimestamptzValue::Value(value) = valid {
                                    return jsonpath_temporal_state(
                                        5, value, zone, 0, false, false,
                                    );
                                };
                            };
                        } else {
                            return jsonpath_temporal_state(4, value, 0, 0, false, false);
                        };
                    };
                };
            };
            return jsonpath_temporal_invalid();
        };
        let mut kind: i32 = 2;
        if zoned {
            kind = 3;
        };
        return jsonpath_temporal_state(kind, time, zone, 0, false, false);
    };
    jsonpath_temporal_state(0, 0i64, 0, 0, true, false)
}

fn jsonpath_temporal_convert(
    input: TextValue,
    method: i32,
    precision: i32,
) -> JsonpathTemporalValue {
    let parsed = jsonpath_temporal_decode(input);
    if parsed.unknown && parsed.kind == 3 && (method == 104 || method == 130 || method == 132) {
        return jsonpath_temporal_invalid();
    };
    if parsed.kind < 0 || parsed.error > 0 || parsed.unknown {
        return parsed;
    };
    let mut kind = parsed.kind;
    let mut value = parsed.value;
    let mut zone = parsed.zone;
    if method == 104 {
        if kind == 5 {
            return jsonpath_temporal_state(0, 0i64, 0, JSONPATH_TEMPORAL_FEATURE, false, true);
        };
        if kind == 2 || kind == 3 {
            return jsonpath_temporal_invalid();
        };
        if kind == 4 {
            let date = sql__pg_catalog__date__bvna(TimestampValue::Value(value));
            if let DateValue::Value(day) = date {
                value = day as i64;
            };
        };
        kind = 1;
        zone = 0;
    };
    if method == 109 {
        if kind == 3 || kind == 5 {
            return jsonpath_temporal_state(0, 0i64, 0, JSONPATH_TEMPORAL_FEATURE, false, true);
        };
        if kind == 1 {
            return jsonpath_temporal_invalid();
        };
        if kind == 4 {
            value = value % 86400000000i64;
            if value < 0i64 {
                value = value + 86400000000i64;
            };
        };
        kind = 2;
    };
    if method == 126 {
        if kind == 1 || kind == 4 {
            return jsonpath_temporal_invalid();
        };
        if kind == 2 {
            return jsonpath_temporal_state(0, 0i64, 0, JSONPATH_TEMPORAL_FEATURE, false, true);
        };
        if kind == 5 {
            return jsonpath_temporal_state(0, 0i64, 0, 0, true, false);
        };
        kind = 3;
    };
    if method == 130 {
        if kind == 2 || kind == 3 {
            return jsonpath_temporal_invalid();
        };
        if kind == 5 {
            return jsonpath_temporal_state(0, 0i64, 0, JSONPATH_TEMPORAL_FEATURE, false, true);
        };
        if kind == 1 {
            let timestamp = sql__pg_catalog__timestamp__swxj(DateValue::Value(value as i32));
            if let TimestampValue::Error(error) = timestamp {
                return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
            };
            if let TimestampValue::Value(number) = timestamp {
                value = number;
            };
        };
        kind = 4;
    };
    if method == 132 {
        if kind == 2 || kind == 3 {
            return jsonpath_temporal_invalid();
        };
        if kind == 1 || kind == 4 {
            return jsonpath_temporal_state(0, 0i64, 0, JSONPATH_TEMPORAL_FEATURE, false, true);
        };
        kind = 5;
    };
    if method != 104 && method != 128 && precision != -1 {
        let mut digits = precision;
        if digits > 6 {
            digits = 6;
        };
        if digits < 0 {
            return jsonpath_temporal_state(0, 0i64, 0, 3452619, false, true);
        };
        if kind == 2 || kind == 3 {
            let scaled = clock_scale_value(TimeValue::Value(value), Int4Value::Value(digits));
            if let TimeValue::Value(number) = scaled {
                value = number;
            };
        } else {
            let scaled = temporal_adjust_precision(value, digits);
            if let Int8Value::Value(number) = scaled {
                let checked = make_timestamp_value(number);
                if let TimestampValue::Error(_) = checked {
                    return jsonpath_temporal_invalid();
                };
                value = number;
            };
        };
    };
    jsonpath_temporal_state(kind, value, zone, 0, false, false)
}

fn jsonpath_temporal_render(input: JsonpathTemporalValue) -> TextValue {
    if input.kind < 0 {
        return TextValue::Null;
    };
    if input.error > 0 {
        return TextValue::Error(make_sql_error(input.error));
    };
    if input.unknown {
        return TextValue::Unknown;
    };
    let mut output = String::new();
    let mut bc = false;
    let mut local = input.value;
    if input.kind == 5 {
        let shifted = sql__pg_catalog__int8mi__jasl(
            Int8Value::Value(local),
            Int8Value::Value((input.zone as i64) * 1000000i64),
        );
        if let Int8Value::Error(error) = shifted {
            return TextValue::Error(error);
        };
        if let Int8Value::Value(value) = shifted {
            local = value;
        };
    };
    if input.kind == 1 || input.kind == 4 || input.kind == 5 {
        let mut day = local;
        if input.kind != 1 {
            day = local / 86400000000i64;
            if local < 0i64 && local % 86400000000i64 != 0i64 {
                day = day - 1i64;
            };
            local = local - day * 86400000000i64;
        };
        let calendar = temporal_calendar_from_julian(day + 2451545i64);
        output = jsonb_calendar_text(calendar);
        bc = calendar.year <= 0;
        if input.kind != 1 {
            output.push('T');
        };
    };
    if input.kind != 1 {
        let clock = clock_output_time(local);
        output.push_str(clock.as_str());
    };
    if input.kind == 3 || input.kind == 5 {
        let mut offset = input.zone;
        if offset > 0 {
            output.push('-');
        } else {
            output.push('+');
            offset = 0 - offset;
        };
        let hour = clock_output_pair(offset / 3600);
        let minute = clock_output_pair((offset / 60) % 60);
        output.push_str(hour.as_str());
        output.push(':');
        output.push_str(minute.as_str());
    };
    if bc {
        output.push_str(" BC");
    };
    TextValue::Value(output)
}
