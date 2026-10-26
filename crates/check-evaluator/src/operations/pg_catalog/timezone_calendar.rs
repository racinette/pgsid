fn timezone_lookup_length(value: &str) -> usize {
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut bytes: usize = 0;
    while index < chars.len() {
        let code = chars[index] as i32;
        let mut width: usize = 1;
        if code >= 65536 {
            width = 4;
        } else if code >= 2048 {
            width = 3;
        } else if code >= 128 {
            width = 2;
        };
        bytes = bytes + width;
        index += 1;
    }
    bytes
}

fn timezone_lookup_ascii(value: &str, upper: bool) -> String {
    let mut result = String::new();
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    while index < chars.len() {
        let original = chars[index];
        let mut character = original.to_ascii_lowercase();
        if upper {
            character = original;
            let code = original as i32;
            if code >= 97 && code <= 122 {
                let upper_code = code - 32;
                character = char::from_u32(upper_code as u32).unwrap_or(original);
            };
        };
        result.push(character);
        index += 1;
    }
    result
}

fn timezone_lookup_fixed(seconds: i32) -> TextValue {
    if seconds == -604800 {
        return TextValue::Value("UTC+167:59:60".to_owned());
    };
    if seconds == 604800 {
        return TextValue::Value("UTC-167:59:60".to_owned());
    };
    let mut result = "UTC".to_owned();
    result.push_str(timezone_output_offset(0 - seconds, true).as_str());
    TextValue::Value(result)
}

struct TimezoneAbbreviation {
    label: String,
    seconds: i32,
    daylight: i32,
    valid: bool,
}

fn timezone_lookup_candidate(session: &str, zone: usize, index: usize) -> TimezoneAbbreviation {
    let invalid = TimezoneAbbreviation {
        label: String::new(),
        seconds: 0,
        daylight: 0,
        valid: false,
    };
    if zone < ZONE_NAMES.len() {
        let entry = ZONE_TYPE_STARTS[zone] + index;
        if entry < ZONE_TYPE_ENDS[zone] && ZONE_TYPE_VISIBLE[entry] != 0 {
            return TimezoneAbbreviation {
                label: ZONE_ABBREVIATIONS[ZONE_TYPE_ABBREVIATION_IDS[entry]].to_owned(),
                seconds: ZONE_TYPE_OFFSET_SECONDS[entry],
                daylight: ZONE_TYPE_DAYLIGHT[entry],
                valid: true,
            };
        };
        return invalid;
    };
    let text = ZoneRuleText {
        chars: session.chars().collect(),
    };
    let start = skip_zone_rule_name(&text, 0);
    let standard = read_zone_rule_clock(&text, start);
    if standard.valid {
        let mut seconds = 0 - standard.value;
        if index == 1 {
            let rules = parse_recurring_zone(session);
            if rules.valid == false {
                return invalid;
            };
            seconds = 0 - rules.daylight;
        };
        let upper_session = timezone_lookup_ascii(session, true);
        let label = recurring_zone_abbreviation(upper_session.as_str(), index == 1);
        if let TextValue::Value(value) = label {
            return TimezoneAbbreviation {
                label: timezone_lookup_ascii(value.as_str(), true),
                seconds: seconds,
                daylight: index as i32,
                valid: index == 0
                    || recurring_zone_abbreviation(upper_session.as_str(), false)
                        != TextValue::Value(value),
            };
        };
        return invalid;
    };
    if index == 0 {
        let profile = session_timezone_profile(session, 0i64, false);
        return TimezoneAbbreviation {
            label: profile.label,
            seconds: profile.seconds,
            daylight: 0,
            valid: profile.valid,
        };
    };
    invalid
}

struct TimezoneLookup {
    profile: TextValue,
    kind: i32,
    seconds: i32,
    spelling: String,
}

fn timezone_lookup_class(
    profile: TextValue,
    kind: i32,
    seconds: i32,
    spelling: &str,
) -> TimezoneLookup {
    TimezoneLookup {
        profile: profile,
        kind: kind,
        seconds: seconds,
        spelling: spelling.to_owned(),
    }
}

fn timezone_lookup_session_classify(
    key: &str,
    session: &str,
    default_profile: bool,
) -> TimezoneLookup {
    let zone = find_zone_name(session, false);
    let mut count: usize = 2;
    if zone < ZONE_NAMES.len() {
        count = ZONE_TYPE_ENDS[zone] - ZONE_TYPE_STARTS[zone];
    } else {
        let profile = session_timezone_profile(session, 0i64, false);
        if profile.valid == false {
            return timezone_lookup_class(TextValue::Unknown, 0, 0, "");
        };
    };
    let requested = timezone_lookup_ascii(key, true);
    let prefix = name_from_text_context(TextValue::Value(requested.clone()), 10, true);
    let mut found = false;
    let mut seconds: i32 = 0;
    let mut daylight: i32 = 0;
    let mut dynamic = false;
    let mut cursor: usize = 0;
    while cursor < count {
        let abbreviation = timezone_lookup_candidate(session, zone, cursor);
        if abbreviation.valid {
            let label = abbreviation.label;
            let abbreviation_seconds = abbreviation.seconds;
            let abbreviation_daylight = abbreviation.daylight;
            if label == requested {
                if timezone_lookup_length(requested.as_str()) == 0
                    || (timezone_lookup_length(requested.as_str()) >= 10
                        && default_profile == false)
                {
                    return timezone_lookup_class(TextValue::Unknown, 0, 0, "");
                };
                if found && (seconds != abbreviation_seconds || daylight != abbreviation_daylight) {
                    dynamic = true;
                };
                if found == false {
                    seconds = abbreviation_seconds;
                    daylight = abbreviation_daylight;
                    found = true;
                };
            } else if timezone_lookup_length(label.as_str()) >= 10
                && name_from_text_context(TextValue::Value(label), 10, true) == prefix
            {
                return timezone_lookup_class(TextValue::Unknown, 0, 0, "");
            };
        };
        cursor += 1;
    }

    if found {
        if dynamic {
            return timezone_lookup_class(TextValue::Value(session.to_owned()), 2, 0, key);
        };
        return timezone_lookup_class(timezone_lookup_fixed(seconds), 1, seconds, key);
    };
    timezone_lookup_class(TextValue::Null, 0, 0, "")
}

fn timezone_lookup_classify(
    input: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimezoneLookup {
    let clipped = name_from_text_context(input, 255, utf8);
    if let TextValue::Value(name) = clipped {
        let key = name_from_text_context(TextValue::Value(name.clone()), limit, utf8);
        if let TextValue::Value(value) = key {
            let selected =
                timezone_lookup_session_classify(value.as_str(), session, default_profile);
            if selected.profile != TextValue::Null {
                return timezone_lookup_class(
                    selected.profile,
                    selected.kind,
                    selected.seconds,
                    name.as_str(),
                );
            };
            if default_profile == false {
                return timezone_lookup_class(TextValue::Unknown, 0, 0, "");
            };
            let lower = timezone_lookup_ascii(value.as_str(), false);
            let mut index: usize = 0;
            while index < ZONE_DEFAULT_ABBREVIATION_NAMES.len() {
                if lower == ZONE_DEFAULT_ABBREVIATION_NAMES[index] {
                    if timezone_lookup_length(ZONE_DEFAULT_ABBREVIATION_ZONES[index]) > 0 {
                        return timezone_lookup_class(
                            TextValue::Value(ZONE_DEFAULT_ABBREVIATION_ZONES[index].to_owned()),
                            2,
                            0,
                            name.as_str(),
                        );
                    };
                    return timezone_lookup_class(
                        timezone_lookup_fixed(ZONE_DEFAULT_ABBREVIATION_SECONDS[index]),
                        1,
                        ZONE_DEFAULT_ABBREVIATION_SECONDS[index],
                        name.as_str(),
                    );
                };
                index += 1;
            }
            if timezone_lookup_length(name.as_str()) == 0 {
                return timezone_lookup_class(
                    TextValue::Error(make_sql_error(INVALID_TIMEZONE_NAME)),
                    0,
                    0,
                    name.as_str(),
                );
            };
            let fixed = timezone_fixed_offset(name.as_str());
            if let Int4Value::Value(west) = fixed {
                return timezone_lookup_class(
                    timezone_lookup_fixed(0 - west),
                    0,
                    0 - west,
                    name.as_str(),
                );
            };
            if let Int4Value::Error(error) = fixed {
                return timezone_lookup_class(TextValue::Error(error), 0, 0, name.as_str());
            };
            let named = find_zone_name(name.as_str(), false);
            if named < ZONE_NAMES.len() {
                return timezone_lookup_class(TextValue::Value(name.clone()), 0, 0, name.as_str());
            };
            let text = ZoneRuleText {
                chars: name.chars().collect(),
            };
            let start = skip_zone_rule_name(&text, 0);
            let standard = read_zone_rule_clock(&text, start);
            if standard.valid
                && (standard.next == text.chars.len() || parse_recurring_zone(name.as_str()).valid)
            {
                let profile = session_timezone_profile(name.as_str(), 0i64, false);
                if profile.valid {
                    return timezone_lookup_class(
                        TextValue::Value(name.clone()),
                        0,
                        0,
                        name.as_str(),
                    );
                };
            };
            return timezone_lookup_class(TextValue::Unknown, 0, 0, "");
        };
        return timezone_lookup_class(TextValue::Unknown, 0, 0, "");
    };
    timezone_lookup_class(clipped, 0, 0, "")
}

fn timezone_lookup_name(
    input: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TextValue {
    timezone_lookup_classify(input, session, limit, utf8, default_profile).profile
}

fn timezone_explicit_interval(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
    subtract: bool,
) -> TimestamptzValue {
    if let TimestamptzValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if let IntervalValue::Error(error) = amount {
        return TimestamptzValue::Error(error);
    };
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    };
    if input == TimestamptzValue::Unknown
        || amount == IntervalValue::Unknown
        || zone == TextValue::Unknown
        || zone == TextValue::NonNull
    {
        return TimestamptzValue::Unknown;
    };
    if input == TimestamptzValue::Null || amount == IntervalValue::Null || zone == TextValue::Null {
        return TimestamptzValue::Null;
    };
    let selected = timezone_lookup_name(zone, session, limit, utf8, default_profile);
    if let TextValue::Error(error) = selected {
        return TimestamptzValue::Error(error);
    };
    if let TextValue::Value(name) = selected {
        return timezone_interval_add(input, amount, name.as_str(), subtract);
    };
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__date_add__kklw(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimestamptzValue {
    timezone_explicit_interval(
        input,
        amount,
        zone,
        session,
        limit,
        utf8,
        default_profile,
        false,
    )
}
pub fn sql__pg_catalog__date_subtract__kpni(
    input: TimestamptzValue,
    amount: IntervalValue,
    zone: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimestamptzValue {
    timezone_explicit_interval(
        input,
        amount,
        zone,
        session,
        limit,
        utf8,
        default_profile,
        true,
    )
}
