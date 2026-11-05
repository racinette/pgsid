const TEMPORAL_CAST_RANGE: u32 = 3452552;

// A zone whose offset changes over time takes the offset at the transaction's current date, and
// a zone outside the bundled tables comes from the server's zone database.
fn session_timezone_fixed_offset(name: &str) -> Int4Value {
    let unresolved_flavor: i32 = 0;
    let zone = find_zone_name(name, false);
    if zone < ZONE_NAMES.len() {
        let start = ZONE_OFFSET_STARTS[zone];
        let seconds = ZONE_OFFSET_SECONDS[start + ZONE_INITIAL_OFFSET_IDS[zone]];
        let mut index = ZONE_STARTS[zone];
        while index < ZONE_ENDS[zone] {
            if ZONE_OFFSET_SECONDS[start + ZONE_OFFSET_IDS[index]] != seconds {
                return int4_unresolved(resolution_context(unresolved_flavor));
            };
            index += 1;
        }
        if ZONE_RECURRING[zone] != 0 {
            let rules = parse_recurring_zone(ZONE_FUTURE_RULES[zone]);
            if rules.valid == false
                || rules.standard != rules.daylight
                || 0 - rules.standard != seconds
            {
                return int4_unresolved(resolution_context(unresolved_flavor));
            };
        };
        return make_int4_value(seconds);
    };
    let upper_name = timezone_lookup_ascii(name, true);
    let rules = parse_recurring_zone(upper_name.as_str());
    if rules.valid && rules.standard != rules.daylight {
        return int4_unresolved(resolution_context(unresolved_flavor));
    };
    let profile = session_timezone_profile(name, 0i64, false);
    if profile.valid {
        return make_int4_value(profile.seconds);
    };
    int4_unresolved(resolution_context(unresolved_flavor))
}

pub fn sql__pg_catalog__timetz__qcb2(input: TimeValue, zone: &str) -> TimetzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TimeValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
        return timetz_unresolved(resolution_context(unresolved_flavor));
    };
    timetz_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz__m17a(input: TimestampValue, zone: &str) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TimestampValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
    // The session zone's offset is unknown, or the zone lies outside the bundled tables.
    timestamptz_unresolved(resolution_context(unresolved_flavor))
}

pub fn sql__pg_catalog__timestamptz__6zge(input: DateValue, zone: &str) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let DateValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
    // The session zone's offset is unknown, or the zone lies outside the bundled tables.
    timestamptz_unresolved(resolution_context(unresolved_flavor))
}

pub fn sql__pg_catalog__timestamp__i0gp(input: TimestamptzValue, zone: &str) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TimestamptzValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
    // The session zone's offset is unknown, or the zone lies outside the bundled tables.
    timestamp_unresolved(resolution_context(unresolved_flavor))
}

pub fn sql__pg_catalog__date__h28y(input: TimestamptzValue, zone: &str) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TimestamptzValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
    // The session zone's offset is unknown, or the zone lies outside the bundled tables.
    date_unresolved(resolution_context(unresolved_flavor))
}

pub fn sql__pg_catalog__time__az0x(input: TimestamptzValue, zone: &str) -> TimeValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TimestamptzValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
    // The session zone's offset is unknown, or the zone lies outside the bundled tables.
    time_unresolved(resolution_context(unresolved_flavor))
}

pub fn sql__pg_catalog__timetz__sqdw(input: TimestamptzValue, zone: &str) -> TimetzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TimestamptzValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
    // The session zone's offset is unknown, or the zone lies outside the bundled tables.
    timetz_unresolved(resolution_context(unresolved_flavor))
}

// Timestamptz input without a zone takes the session time zone through the same local-time
// resolution as a timestamp cast; both subtract the offset and then check the instant's range.
// Input also accepts a local time just past the timestamp range whose instant is inside it: the
// server applies the zone before its range check, so that local time is read again with the
// largest offset written after it, which brings it back into range without changing its fields.
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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TextValue::NonNull = input {
        if unresolved_flavor < 1 {
            unresolved_flavor = 1;
        };
    };
    if let TextValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
    let parsed = timestamptz_from_text_order(input.clone(), date_order);
    if parsed != TimestamptzValue::Unknown && parsed != TimestamptzValue::Unimplemented {
        return parsed;
    };
    let local = timestamp_from_text_order(input.clone(), date_order);
    if let TimestampValue::Value(_) = local {
        return sql__pg_catalog__timestamptz__m17a(local, zone);
    };
    if local == TimestampValue::Error(make_sql_error(TEMPORAL_CAST_RANGE)) {
        let past = timestamptz_past_range(input.clone(), zone, date_order);
        if let TimestamptzValue::Value(_) = past {
            return past;
        };
        if let TimestamptzValue::Error(_) = past {
            return past;
        };
    };
    // A trailing joined field names the zone the local time is read in.
    let copy = input.clone();
    if let TextValue::Value(text) = copy {
        let parts = temporal_zone_field(text.as_str(), date_order);
        if parts.twice {
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_ZONE_FIELD_SYNTAX));
        };
        if parts.found {
            let zoned = timestamp_from_text_order(TextValue::Value(parts.rest.clone()), date_order);
            if let TimestampValue::Value(_) = zoned {
                return sql__pg_catalog__timestamptz__m17a(zoned, parts.name.as_str());
            };
        };
    };
    let mut reading_flavor: i32 = unresolved_flavor;
    if let TimestampValue::Unknown = local {
        if reading_flavor < 1 {
            reading_flavor = 1;
        };
    };
    if let TimestampValue::Unimplemented = local {
        reading_flavor = 2;
    };
    timestamptz_from_text_trailing_zone(
        input,
        date_order,
        zone,
        abbreviations,
        limit,
        utf8,
        reading_flavor,
    )
}

fn timestamptz_past_range(input: TextValue, zone: &str, date_order: i32) -> TimestamptzValue {
    if let TextValue::Value(text) = input {
        let mut eastern = text.clone();
        eastern.push_str(" +15:59:59");
        let earliest = timestamptz_from_text_order(TextValue::Value(eastern), date_order);
        let mut western = text.clone();
        western.push_str(" -15:59:59");
        let latest = timestamptz_from_text_order(TextValue::Value(western), date_order);
        // No zone brings the instant into range, or the local time itself is out of range.
        if earliest == TimestamptzValue::Error(make_sql_error(TEMPORAL_CAST_RANGE))
            && latest == TimestamptzValue::Error(make_sql_error(TEMPORAL_CAST_RANGE))
        {
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_CAST_RANGE));
        };
        if let TimestamptzValue::Value(instant) = earliest {
            let local = instant + 57599000000i64;
            if local >= 9223371331200000000i64 {
                return timestamptz_from_local_wide(local, zone);
            };
        };
        if let TimestamptzValue::Value(instant) = latest {
            let local = instant - 57599000000i64;
            if local < -211813488000000000i64 {
                return timestamptz_from_local_wide(local, zone);
            };
        };
    };
    TimestamptzValue::Unknown
}

fn timestamptz_from_local_wide(local: i64, zone: &str) -> TimestamptzValue {
    let profile = session_timezone_profile(zone, local, true);
    if profile.valid {
        return make_timestamptz_value(local - (profile.seconds as i64) * 1000000i64);
    };
    TimestamptzValue::Unknown
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
// time; with that table declared, any other all-letter word naming a zone applies that zone. Zones
// elsewhere in the text, unknown names and zones after an explicit offset defer.
fn timestamptz_from_text_trailing_zone(
    input: TextValue,
    date_order: i32,
    session: &str,
    abbreviations: bool,
    limit: i32,
    utf8: bool,
    reading_flavor: i32,
) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TextValue::NonNull = input {
        if unresolved_flavor < 1 {
            unresolved_flavor = 1;
        };
    };
    if let TextValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
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
        // Without a trailing zone word, the whole text's own reading decides.
        if zone_start == 0 || (slash == false && letters == false) {
            let mut text_flavor: i32 = unresolved_flavor;
            if reading_flavor > text_flavor {
                text_flavor = reading_flavor;
            };
            return timestamptz_unresolved(text_flavor);
        };
        let mut name = String::new();
        let mut cursor = zone_start;
        while cursor < zone_end {
            name.push(chars[cursor]);
            cursor += 1;
        }
        if slash && find_zone_name(name.as_str(), false) >= ZONE_NAMES.len() {
            return timestamptz_unresolved(resolution_context(unresolved_flavor));
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
            return timestamptz_unresolved(unresolved_flavor);
        };
        if zoned != TimestamptzValue::Unknown && zoned != TimestamptzValue::Unimplemented {
            return timestamptz_unresolved(unresolved_flavor);
        };
        let local = timestamp_from_text_order(remainder, date_order);
        let mut local_flavor: i32 = unresolved_flavor;
        if let TimestampValue::Unknown = local {
            if local_flavor < 1 {
                local_flavor = 1;
            };
        };
        if let TimestampValue::Unimplemented = local {
            local_flavor = 2;
        };
        if let TimestampValue::Value(value) = local {
            if slash {
                return sql__pg_catalog__timestamptz__m17a(local, name.as_str());
            };
            // Without declared abbreviations, the session's abbreviation table decides the word.
            if abbreviations == false {
                return timestamptz_unresolved(resolution_context(unresolved_flavor));
            };
            let lookup = timezone_lookup_classify(
                TextValue::Value(name.clone()),
                session,
                limit,
                utf8,
                true,
            );
            // A word that is neither an abbreviation nor a built-in token names a zone of the
            // server's database, which applies at that local time like a name with a slash.
            if lookup.kind == 0 && find_zone_name(name.as_str(), false) < ZONE_NAMES.len() {
                return sql__pg_catalog__timestamptz__m17a(local, name.as_str());
            };
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
            let mut east_flavor: i32 = unresolved_flavor;
            if lookup.profile == TextValue::Unknown {
                east_flavor = resolution_context(east_flavor);
            };
            if lookup.kind == 2 {
                if let Int4Value::Unknown = east {
                    east_flavor = resolution_context(east_flavor);
                };
                if let Int4Value::Unimplemented = east {
                    east_flavor = 2;
                };
            };
            return timestamptz_unresolved(east_flavor);
        };
        return timestamptz_unresolved(local_flavor);
    };
    timestamptz_unresolved(unresolved_flavor)
}

// Timetz text without a zone takes the session offset at the current date, as the time-to-timetz
// cast does; only session zones with a single fixed offset resolve, since others depend on the
// transaction date.
pub fn timetz_from_text_context(input: TextValue, zone: &str) -> TimetzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input {
        unresolved_flavor = 1;
    };
    if let TextValue::NonNull = input {
        if unresolved_flavor < 1 {
            unresolved_flavor = 1;
        };
    };
    if let TextValue::Unimplemented = input {
        unresolved_flavor = 2;
    };
    let parsed = timetz_from_text(input.clone());
    if parsed != TimetzValue::Unknown && parsed != TimetzValue::Unimplemented {
        return parsed;
    };
    let clock = time_from_text(input);
    if let TimeValue::Value(_) = clock {
        return sql__pg_catalog__timetz__qcb2(clock, zone);
    };
    let mut local_flavor_380_4: i32 = unresolved_flavor;
    if let TimeValue::Unknown = clock {
        if local_flavor_380_4 < 1 {
            local_flavor_380_4 = 1;
        };
    };
    if let TimeValue::Unimplemented = clock {
        local_flavor_380_4 = 2;
    };
    timetz_unresolved(local_flavor_380_4)
}

// The zone a trailing joined field names, if the zone tables resolve it: a zone database name or
// a POSIX specification. Its text and the text before it come back; an unresolved field gives
// no split, so the plain reading decides.
const TEMPORAL_ZONE_FIELD_SYNTAX: u32 = 3452551;

// `found` is a resolved zone after text with no zone of its own; `twice` is a zone after text
// that already gives an explicit offset, which the server rejects.
struct TemporalZoneSplit {
    found: bool,
    twice: bool,
    rest: String,
    name: String,
}

fn temporal_zone_word_letter(value: char) -> bool {
    let code = value as i32;
    (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

fn temporal_zone_field(text: &str, date_order: i32) -> TemporalZoneSplit {
    let start = temporal_trailing_zone_start(text);
    if start < 0i64 {
        return TemporalZoneSplit {
            found: false,
            twice: false,
            rest: String::new(),
            name: String::new(),
        };
    };
    let chars: Vec<char> = text.chars().collect();
    let narrow = start as i32;
    let begin = usize::try_from(narrow).unwrap_or(0);
    let mut rest = String::new();
    let mut name = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        if index < begin {
            rest.push(chars[index]);
        } else if timestamptz_text_space(chars[index]) == false {
            name.push(chars[index]);
        };
        index += 1;
    }
    let profile = session_timezone_profile(name.as_str(), 0i64, false);
    let own = timestamptz_from_text_order(TextValue::Value(rest.clone()), date_order);
    let mut zoned = false;
    if let TimestamptzValue::Value(_) = own {
        zoned = true;
    };
    // Now sets the zone as well, so a zone field after it repeats one.
    let mut word = String::new();
    let rest_chars: Vec<char> = rest.chars().collect();
    let mut letter: usize = 0;
    while letter < rest_chars.len() {
        if timestamptz_text_space(rest_chars[letter]) == false {
            word.push(rest_chars[letter].to_ascii_lowercase());
        };
        letter += 1;
    }
    if word == "now" {
        zoned = true;
    };
    // A month or day the calendar rejects is reported only after the zone field.
    if own == TimestamptzValue::Error(make_sql_error(TEMPORAL_CAST_RANGE)) {
        let valid = temporal_valid_date_spelling(rest.as_str());
        if valid != "" {
            let checked = timestamptz_from_text_order(TextValue::Value(valid), date_order);
            if let TimestamptzValue::Value(_) = checked {
                zoned = true;
            };
        };
    };
    // A word outside the core table right before the zone field is either a zone, which the field
    // then repeats, or a word the server rejects; both are 22007 once the fields before it read.
    let mut end = begin;
    while end > 0 && timestamptz_text_space(chars[end - 1]) {
        end = end - 1;
    }
    let mut word_start = end;
    while word_start > 0 && temporal_zone_word_letter(chars[word_start - 1]) {
        word_start = word_start - 1;
    }
    if word_start < end && word_start > 0 && timestamptz_text_space(chars[word_start - 1]) {
        let mut word = String::new();
        let mut before = String::new();
        let mut position: usize = 0;
        while position < end {
            if position < word_start {
                before.push(chars[position]);
            } else {
                word.push(chars[position].to_ascii_lowercase());
            };
            position += 1;
        }
        if temporal_core_token(word.as_str()) == false {
            let valid = temporal_valid_date_spelling(before.as_str());
            let local = timestamp_from_text_order(TextValue::Value(before), date_order);
            if let TimestampValue::Value(_) = local {
                zoned = true;
            };
            if local == TimestampValue::Error(make_sql_error(TEMPORAL_CAST_RANGE)) && valid != "" {
                let checked = timestamp_from_text_order(TextValue::Value(valid), date_order);
                if let TimestampValue::Value(_) = checked {
                    zoned = true;
                };
            };
        };
    };
    TemporalZoneSplit {
        found: profile.valid && zoned == false,
        twice: profile.valid && zoned,
        rest: rest,
        name: name,
    }
}

// After a full date the server reads a trailing joined field as a zone, which date input checks
// and then ignores.
// A day word with at most a clock before a valid zone takes the date from the transaction.
fn temporal_zone_rest_day(rest: &str) -> bool {
    let chars: Vec<char> = rest.chars().collect();
    let mut days = 0;
    let mut clocks = 0;
    let mut other = false;
    let mut index: usize = 0;
    while index < chars.len() {
        if timestamptz_text_space(chars[index]) {
            index += 1;
        } else {
            let mut word = String::new();
            let mut clock = true;
            let mut colon = false;
            while index < chars.len() && timestamptz_text_space(chars[index]) == false {
                let character = chars[index];
                let code = character as i32;
                if character == ':' {
                    colon = true;
                } else if character != '.' && (code < 48 || code > 57) {
                    clock = false;
                };
                word.push(character.to_ascii_lowercase());
                index += 1;
            }
            if word == "today" || word == "tomorrow" || word == "yesterday" {
                days = days + 1;
            } else if clock && colon {
                clocks = clocks + 1;
            } else {
                other = true;
            };
        };
    }
    days == 1 && clocks <= 1 && other == false
}

pub fn date_from_text_zone(input: TextValue, date_order: i32) -> DateValue {
    let copy = input.clone();
    if let TextValue::Value(text) = copy {
        let parts = temporal_zone_field(text.as_str(), date_order);
        if parts.twice {
            return DateValue::Error(make_sql_error(TEMPORAL_ZONE_FIELD_SYNTAX));
        };
        if parts.found {
            // A valid trailing zone raises nothing, so the earlier fields decide, errors included.
            let without = date_from_text_order(TextValue::Value(parts.rest.clone()), date_order);
            if let DateValue::Value(_) = without {
                return without;
            };
            if let DateValue::Error(_) = without {
                return without;
            };
            if without == DateValue::Unknown && temporal_zone_rest_day(parts.rest.as_str()) {
                return without;
            };
        };
    };
    date_from_text_order(input, date_order)
}

pub fn timestamp_from_text_zone(input: TextValue, date_order: i32) -> TimestampValue {
    let copy = input.clone();
    if let TextValue::Value(text) = copy {
        let parts = temporal_zone_field(text.as_str(), date_order);
        if parts.twice {
            return TimestampValue::Error(make_sql_error(TEMPORAL_ZONE_FIELD_SYNTAX));
        };
        if parts.found {
            let without =
                timestamp_from_text_order(TextValue::Value(parts.rest.clone()), date_order);
            if let TimestampValue::Value(_) = without {
                return without;
            };
            if let TimestampValue::Error(_) = without {
                return without;
            };
            if without == TimestampValue::Unknown && temporal_zone_rest_day(parts.rest.as_str()) {
                return without;
            };
        };
    };
    timestamp_from_text_order(input, date_order)
}
