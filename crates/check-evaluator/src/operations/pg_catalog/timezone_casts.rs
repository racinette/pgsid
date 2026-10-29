const TEMPORAL_CAST_RANGE: u32 = 3452552;

fn session_timezone_fixed_offset(name: &str) -> Int4Value {
    let zone = find_zone_name(name, false);
    if zone < ZONE_NAMES.len() {
        let start = ZONE_OFFSET_STARTS[zone];
        let seconds = ZONE_OFFSET_SECONDS[start + ZONE_INITIAL_OFFSET_IDS[zone]];
        let mut index = ZONE_STARTS[zone];
        while index < ZONE_ENDS[zone] {
            if ZONE_OFFSET_SECONDS[start + ZONE_OFFSET_IDS[index]] != seconds {
                return Int4Value::Unknown;
            };
            index += 1;
        }
        if ZONE_RECURRING[zone] != 0 {
            let rules = parse_recurring_zone(ZONE_FUTURE_RULES[zone]);
            if rules.valid == false
                || rules.standard != rules.daylight
                || 0 - rules.standard != seconds
            {
                return Int4Value::Unknown;
            };
        };
        return make_int4_value(seconds);
    };
    let upper_name = timezone_lookup_ascii(name, true);
    let rules = parse_recurring_zone(upper_name.as_str());
    if rules.valid && rules.standard != rules.daylight {
        return Int4Value::Unknown;
    };
    let profile = session_timezone_profile(name, 0i64, false);
    if profile.valid {
        return make_int4_value(profile.seconds);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__timetz__qcb2(input: TimeValue, zone: &str) -> TimetzValue {
    if let TimeValue::Error(error) = input {
        return TimetzValue::Error(error);
    };
    if input == TimeValue::Null {
        return TimetzValue::Null;
    };
    if let TimeValue::Value(clock) = input {
        let offset = session_timezone_fixed_offset(zone);
        if let Int4Value::Value(seconds) = offset {
            return make_timetz_value(clock, 0 - seconds);
        };
    };
    TimetzValue::Unknown
}

pub fn sql__pg_catalog__timestamptz__m17a(input: TimestampValue, zone: &str) -> TimestamptzValue {
    if let TimestampValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if input == TimestampValue::Null {
        return TimestamptzValue::Null;
    };
    if let TimestampValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
            return TimestamptzValue::Value(value);
        };
        if value < -211813488000000000i64 {
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_CAST_RANGE));
        };
        let profile = session_timezone_profile(zone, value, true);
        if profile.valid {
            return make_timestamptz_value(value - (profile.seconds as i64) * 1000000i64);
        };
    };
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timestamptz__6zge(input: DateValue, zone: &str) -> TimestamptzValue {
    if let DateValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    if input == DateValue::Null {
        return TimestamptzValue::Null;
    };
    if let DateValue::Value(day) = input {
        if day == (-2147483647 - 1) {
            return TimestamptzValue::Value(-9223372036854775808i64);
        };
        if day == 2147483647 {
            return TimestamptzValue::Value(9223372036854775807i64);
        };
        if day >= 106751983 {
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_CAST_RANGE));
        };
        let local = (day as i64) * 86400000000i64;
        let profile = session_timezone_profile(zone, local, true);
        if profile.valid {
            return make_timestamptz_value(local - (profile.seconds as i64) * 1000000i64);
        };
    };
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timestamp__i0gp(input: TimestamptzValue, zone: &str) -> TimestampValue {
    if let TimestamptzValue::Error(error) = input {
        return TimestampValue::Error(error);
    };
    if input == TimestamptzValue::Null {
        return TimestampValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
            return TimestampValue::Value(value);
        };
        let profile = session_timezone_profile(zone, value, false);
        if profile.valid {
            return make_timestamp_value(value + (profile.seconds as i64) * 1000000i64);
        };
    };
    TimestampValue::Unknown
}

pub fn sql__pg_catalog__date__h28y(input: TimestamptzValue, zone: &str) -> DateValue {
    if let TimestamptzValue::Error(error) = input {
        return DateValue::Error(error);
    };
    if input == TimestamptzValue::Null {
        return DateValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 {
            return DateValue::Value(-2147483647 - 1);
        };
        if value == 9223372036854775807i64 {
            return DateValue::Value(2147483647);
        };
        let profile = session_timezone_profile(zone, value, false);
        if profile.valid {
            let local = value + (profile.seconds as i64) * 1000000i64;
            let mut day = local / 86400000000i64;
            if local % 86400000000i64 < 0i64 {
                day = day - 1i64;
            };
            return DateValue::Value(day as i32);
        };
    };
    DateValue::Unknown
}

pub fn sql__pg_catalog__time__az0x(input: TimestamptzValue, zone: &str) -> TimeValue {
    if let TimestamptzValue::Error(error) = input {
        return TimeValue::Error(error);
    };
    if input == TimestamptzValue::Null {
        return TimeValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
            return TimeValue::Null;
        };
        let profile = session_timezone_profile(zone, value, false);
        if profile.valid {
            let local = value + (profile.seconds as i64) * 1000000i64;
            let mut clock = local % 86400000000i64;
            if clock < 0i64 {
                clock = clock + 86400000000i64;
            };
            return make_time_value(clock);
        };
    };
    TimeValue::Unknown
}

pub fn sql__pg_catalog__timetz__sqdw(input: TimestamptzValue, zone: &str) -> TimetzValue {
    if let TimestamptzValue::Error(error) = input {
        return TimetzValue::Error(error);
    };
    if input == TimestamptzValue::Null {
        return TimetzValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
            return TimetzValue::Null;
        };
        let profile = session_timezone_profile(zone, value, false);
        if profile.valid {
            let local = value + (profile.seconds as i64) * 1000000i64;
            let mut clock = local % 86400000000i64;
            if clock < 0i64 {
                clock = clock + 86400000000i64;
            };
            return make_timetz_value(clock, 0 - profile.seconds);
        };
    };
    TimetzValue::Unknown
}

// Timestamptz input without a zone takes the session time zone through the same local-time
// resolution as a timestamp cast. Input and casts check the range limits at different points,
// so local times within a day of either limit defer.
// The session zone may be empty and the date order 0 when either is not configured;
// abbreviations, the identifier limit and the encoding qualify trailing zone abbreviations.
pub fn timestamptz_from_text_context(
    input: TextValue,
    zone: &str,
    date_order: i32,
    abbreviations: bool,
    limit: i32,
    utf8: bool,
) -> TimestamptzValue {
    let parsed = timestamptz_from_text_order(input.clone(), date_order);
    if parsed != TimestamptzValue::Unknown {
        return parsed;
    };
    let local = timestamp_from_text_order(input.clone(), date_order);
    if let TimestampValue::Value(value) = local {
        if value > -211813488000000000i64 + 86400000000i64
            && value < 9223371331200000000i64 - 86400000000i64
        {
            return sql__pg_catalog__timestamptz__m17a(local, zone);
        };
        return TimestamptzValue::Unknown;
    };
    timestamptz_from_text_trailing_zone(input, date_order, zone, abbreviations, limit, utf8)
}

fn timestamptz_text_space(value: char) -> bool {
    value == ' '
        || value == '\t'
        || value == '\n'
        || value == '\r'
        || value == '\u{b}'
        || value == '\u{c}'
}

// A trailing zone applies to the local time that the rest of the text gives. A name containing a
// slash is never an abbreviation and needs no session context. An all-letter word resolves as an
// abbreviation of the session zone or the Default table, fixed or through its zone at that local
// time; all-letter zone names, which PostgreSQL tries only after its special words, defer, as do
// zones elsewhere in the text, unknown names and zones after an explicit offset.
fn timestamptz_from_text_trailing_zone(
    input: TextValue,
    date_order: i32,
    session: &str,
    abbreviations: bool,
    limit: i32,
    utf8: bool,
) -> TimestamptzValue {
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut zone_end = chars.len();
        while zone_end > 0 && timestamptz_text_space(chars[zone_end - 1]) {
            zone_end = zone_end - 1;
        }
        let mut zone_start = zone_end;
        let mut slash = false;
        let mut letters = true;
        while zone_start > 0 && timestamptz_text_space(chars[zone_start - 1]) == false {
            let character = chars[zone_start - 1];
            if character == '/' {
                slash = true;
            };
            let code = character.to_ascii_lowercase() as i32;
            if code < 97 || code > 122 {
                letters = false;
            };
            zone_start = zone_start - 1;
        }
        if zone_start == 0 || (slash == false && (letters == false || abbreviations == false)) {
            return TimestamptzValue::Unknown;
        };
        let mut name = String::new();
        let mut cursor = zone_start;
        while cursor < zone_end {
            name.push(chars[cursor]);
            cursor += 1;
        }
        if slash && find_zone_name(name.as_str(), false) >= ZONE_NAMES.len() {
            return TimestamptzValue::Unknown;
        };
        let mut rest = String::new();
        cursor = 0;
        while cursor < zone_start {
            rest.push(chars[cursor]);
            cursor += 1;
        }
        let remainder = TextValue::Value(rest);
        let zoned = timestamptz_from_text_order(remainder.clone(), date_order);
        // Errors in the earlier fields stand, since a known zone changes none of them.
        if let TimestamptzValue::Error(error) = zoned {
            if slash {
                return TimestamptzValue::Error(error);
            };
            return TimestamptzValue::Unknown;
        };
        if zoned != TimestamptzValue::Unknown {
            return TimestamptzValue::Unknown;
        };
        let local = timestamp_from_text_order(remainder, date_order);
        if let TimestampValue::Value(value) = local {
            if value <= -211813488000000000i64 + 86400000000i64
                || value >= 9223371331200000000i64 - 86400000000i64
            {
                return TimestamptzValue::Unknown;
            };
            if slash {
                return sql__pg_catalog__timestamptz__m17a(local, name.as_str());
            };
            let lookup = timezone_lookup_classify(
                TextValue::Value(name.clone()),
                session,
                limit,
                utf8,
                true,
            );
            let mut east = Int4Value::Unknown;
            if lookup.kind == 1 {
                east = make_int4_value(lookup.seconds);
            };
            if lookup.kind == 2 {
                let dynamic = lookup.profile.clone();
                if let TextValue::Value(profile) = dynamic {
                    east = timezone_forced_offset(
                        profile.as_str(),
                        lookup.spelling.as_str(),
                        value,
                        true,
                    );
                };
            };
            if let Int4Value::Value(seconds) = east {
                return make_timestamptz_value(value - (seconds as i64) * 1000000i64);
            };
        };
    };
    TimestamptzValue::Unknown
}
