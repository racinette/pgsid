struct SessionTimezone {
    seconds: i32,
    label: String,
    valid: bool,
}

fn timezone_output_offset(seconds: i32, json: bool) -> String {
    let mut value = seconds;
    let mut result = String::new();
    if value < 0 {
        result.push('-');
        value = 0 - value;
    } else {
        result.push('+');
    };
    result.push_str(clock_output_pair(value / 3600).as_str());
    let minute = value / 60 % 60;
    let second = value % 60;
    if json || minute != 0 || second != 0 {
        result.push(':');
        result.push_str(clock_output_pair(minute).as_str());
        if second != 0 {
            result.push(':');
            result.push_str(clock_output_pair(second).as_str());
        };
    };
    result
}

fn session_timezone_profile(name: &str, microseconds: i64, local: bool) -> SessionTimezone {
    let invalid = SessionTimezone {
        seconds: 0,
        label: String::new(),
        valid: false,
    };
    let zone = find_zone_name(name, false);
    if zone < ZONE_NAMES.len() {
        let offset = named_zone_offset(zone, microseconds, local);
        if let Int4Value::Value(seconds) = offset {
            let mut instant = microseconds;
            if local {
                instant = microseconds - (seconds as i64) * 1000000i64;
            };
            let abbreviation = named_zone_abbreviation(zone, instant);
            if let TextValue::Value(label) = abbreviation {
                return SessionTimezone {
                    seconds: seconds,
                    label: label,
                    valid: true,
                };
            };
        };
        return invalid;
    };
    let text = ZoneRuleText {
        chars: name.chars().collect(),
    };
    if text.chars.len() == 0 || text.chars.len() > 255 {
        return invalid;
    };
    if timezone_digit(text.chars[0]) >= 0
        || text.chars[0] == '+'
        || text.chars[0] == '-'
        || text.chars[0] == '.'
    {
        let mut colon = false;
        let mut index: usize = 0;
        while index < text.chars.len() {
            if text.chars[index] == ':' {
                colon = true;
            };
            index += 1;
        }
        if colon == false {
            let hours = name.parse::<f64>().unwrap_or(1000000.0f64);
            if hours != hours || hours <= -168.0f64 || hours >= 168.0f64 {
                return invalid;
            };
            let seconds = (hours * 3600.0f64) as i32;
            return SessionTimezone {
                seconds: seconds,
                label: timezone_output_offset(seconds, false),
                valid: true,
            };
        };
        let offset = timezone_fixed_offset(name);
        if let Int4Value::Value(west) = offset {
            if west % 60 != 0 {
                return invalid;
            };
            return SessionTimezone {
                seconds: 0 - west,
                label: String::new(),
                valid: true,
            };
        };
        return invalid;
    };
    let start = skip_zone_rule_name(&text, 0);
    let standard = read_zone_rule_clock(&text, start);
    if standard.valid == false {
        return invalid;
    };
    let mut seconds = 0 - standard.value;
    let mut daylight = false;
    if standard.next != text.chars.len() {
        let rules = parse_recurring_zone(name);
        let mut probe = microseconds;
        if local {
            probe = microseconds - 86400000000i64;
        };
        let boundary = next_recurring_boundary(rules, probe, -9223372036854775808i64, seconds);
        if boundary.valid == false {
            return invalid;
        };
        let resolved = resolve_zone_boundary(
            microseconds,
            local,
            boundary.before,
            boundary.after,
            boundary.boundary,
        );
        let mut resolved_known = false;
        if let Int4Value::Value(value) = resolved {
            resolved_known = true;
            seconds = value;
            daylight = boundary.before_daylight;
            if local {
                let instant = microseconds - (seconds as i64) * 1000000i64;
                let actual = next_recurring_boundary(
                    parse_recurring_zone(name),
                    instant,
                    -9223372036854775808i64,
                    seconds,
                );
                daylight = actual.before_daylight;
            };
        };
        if resolved_known == false {
            return invalid;
        };
    };
    let label = recurring_zone_abbreviation(name, daylight);
    if let TextValue::Value(value) = label {
        return SessionTimezone {
            seconds: seconds,
            label: value,
            valid: true,
        };
    };
    invalid
}

pub fn timestamptz_output_context(
    input: TimestamptzValue,
    style: i32,
    zone: &str,
    json: bool,
) -> TextValue {
    let state = timestamptz_output_without_context(input);
    if state != TextValue::NonNull {
        return state;
    };
    if json == false && (style < 1 || style > 6) {
        return TextValue::NonNull;
    };
    if let TimestamptzValue::Value(value) = input {
        let profile = session_timezone_profile(zone, value, false);
        if profile.valid == false {
            return TextValue::Unknown;
        };
        let seconds = profile.seconds as i64;
        let local = value + seconds * 1000000i64;
        let mut day = local / 86400000000i64;
        let mut clock = local % 86400000000i64;
        if clock < 0i64 {
            day = day - 1i64;
            clock = clock + 86400000000i64;
        };
        let calendar = temporal_calendar_from_julian(day + 2451545i64);
        let mut output = String::new();
        if json {
            output = jsonb_calendar_text(calendar);
            output.push('T');
            output.push_str(clock_output_time(clock).as_str());
        } else {
            let rendered = timestamp_output_context(TimestampValue::Value(local), style);
            let mut rendered_known = false;
            if let TextValue::Value(text) = rendered {
                rendered_known = true;
                let characters: Vec<char> = text.chars().collect();
                let mut end = characters.len();
                if calendar.year <= 0 {
                    end = end - 3;
                };
                let mut index: usize = 0;
                while index < end {
                    output.push(characters[index]);
                    index += 1;
                }
            };
            if rendered_known == false {
                return TextValue::Unknown;
            };
        };
        if json || style == 1 {
            output.push_str(timezone_output_offset(profile.seconds, json).as_str());
        } else {
            output.push(' ');
            let label: Vec<char> = profile.label.chars().collect();
            let mut index: usize = 0;
            while index < label.len() && index < 10 {
                output.push(label[index]);
                index += 1;
            }
        };
        if calendar.year <= 0 {
            output.push_str(" BC");
        };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}

pub fn jsonb_input_from_timestamptz_context(input: TimestamptzValue, zone: &str) -> JsonbInput {
    jsonb_input_from_text(timestamptz_output_context(input, 1, zone, true))
}
