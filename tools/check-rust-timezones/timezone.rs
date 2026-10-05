struct ZoneName {
    chars: Vec<char>,
}

fn compare_zone_name(name: &ZoneName, index: usize) -> i32 {
    let chars: Vec<char> = ZONE_NAMES[index].chars().collect();
    let mut cursor = 0;
    while cursor < name.chars.len() && cursor < chars.len() {
        let actual = name.chars[cursor].to_ascii_lowercase() as u32;
        let expected = chars[cursor] as u32;
        if actual < expected {
            return -1;
        }
        if actual > expected {
            return 1;
        }
        cursor += 1;
    }
    if name.chars.len() < chars.len() {
        return -1;
    }
    if name.chars.len() > chars.len() {
        return 1;
    }
    0
}

fn find_named_zone(name: &str) -> usize {
    let chars: Vec<char> = name.chars().collect();
    let mut slash = false;
    let mut cursor = 0;
    while cursor < chars.len() {
        if chars[cursor] == '/' {
            slash = true;
        }
        cursor += 1;
    }
    // Bare names can resolve through the session's abbreviation table first.
    if slash == false {
        return ZONE_NAMES.len();
    }
    let input = ZoneName { chars: chars };
    let mut left = 0;
    let mut step_index = 0;
    while step_index < ZONE_SEARCH_STEPS.len() {
        let candidate = left + ZONE_SEARCH_STEPS[step_index];
        if candidate <= ZONE_NAMES.len() && compare_zone_name(&input, candidate - 1) > 0 {
            left = candidate;
        }
        step_index += 1;
    }
    if left < ZONE_NAMES.len() && compare_zone_name(&input, left) == 0 {
        return ZONE_IDS[left];
    }
    ZONE_NAMES.len()
}

struct ZoneTransition {
    index: usize,
    boundary: i64,
}

fn next_zone_transition(zone: usize, microseconds: i64) -> ZoneTransition {
    let mut left = ZONE_BLOCK_STARTS[zone];
    let mut step_index = 0;
    while step_index < ZONE_SEARCH_STEPS.len() {
        let candidate = left + ZONE_SEARCH_STEPS[step_index];
        if candidate <= ZONE_BLOCK_ENDS[zone]
            && ZONE_CHECKPOINT_SECONDS[candidate - 1] * 1000000i64 <= microseconds
        {
            left = candidate;
        }
        step_index += 1;
    }
    if left == ZONE_BLOCK_STARTS[zone] {
        if left == ZONE_BLOCK_ENDS[zone] {
            return ZoneTransition {
                index: ZONE_ENDS[zone],
                boundary: 0i64,
            };
        }
        return ZoneTransition {
            index: ZONE_STARTS[zone],
            boundary: ZONE_CHECKPOINT_SECONDS[left] * 1000000i64,
        };
    }
    let block = left - 1;
    let mut index = ZONE_BLOCK_TRANSITION_STARTS[block];
    let mut seconds = ZONE_CHECKPOINT_SECONDS[block];
    let mut delta = ZONE_BLOCK_DELTA_STARTS[block];
    while index + 1 < ZONE_BLOCK_TRANSITION_ENDS[block] {
        let id = ZONE_TRANSITION_DELTA_IDS[delta] as usize;
        seconds = seconds + ZONE_TRANSITION_DELTA_SECONDS[id];
        let boundary = seconds * 1000000i64;
        if boundary > microseconds {
            return ZoneTransition {
                index: index + 1,
                boundary: boundary,
            };
        }
        index += 1;
        delta += 1;
    }
    if left < ZONE_BLOCK_ENDS[zone] {
        return ZoneTransition {
            index: ZONE_BLOCK_TRANSITION_STARTS[left],
            boundary: ZONE_CHECKPOINT_SECONDS[left] * 1000000i64,
        };
    }
    ZoneTransition {
        index: ZONE_ENDS[zone],
        boundary: 0i64,
    }
}

fn named_zone_offset(zone: usize, microseconds: i64, local: bool) -> Int4Value {
    let mut probe = microseconds;
    if local {
        probe = microseconds - 86400000000i64;
    }
    let transition = next_zone_transition(zone, probe);
    let next = transition.index;
    let offset_start = ZONE_OFFSET_STARTS[zone];
    let mut before = ZONE_OFFSET_SECONDS[offset_start + ZONE_INITIAL_OFFSET_IDS[zone]];
    if next > ZONE_STARTS[zone] {
        before = ZONE_OFFSET_SECONDS[offset_start + ZONE_OFFSET_IDS[next - 1]];
    }
    if next == ZONE_ENDS[zone] {
        if ZONE_RECURRING[zone] != 0 {
            return Int4Value::Unknown;
        }
        return make_int4_value(before);
    }
    if local == false {
        return make_int4_value(before);
    }
    let after = ZONE_OFFSET_SECONDS[offset_start + ZONE_OFFSET_IDS[next]];
    let before_wide = before as i64;
    let after_wide = after as i64;
    let before_time = microseconds - before_wide * 1000000i64;
    let after_time = microseconds - after_wide * 1000000i64;
    let boundary = transition.boundary;
    if before_time < boundary && after_time < boundary {
        return make_int4_value(before);
    }
    if before_time > boundary && after_time >= boundary {
        return make_int4_value(after);
    }
    // Forward jumps choose the preceding offset; backward jumps choose the following one.
    if before_time > after_time {
        return make_int4_value(before);
    }
    make_int4_value(after)
}

pub fn sql__pg_catalog__timezone__9nbk(zone: TextValue, value: TimestampValue) -> TimestamptzValue {
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    }
    if let TimestampValue::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    if zone == TextValue::Unknown || value == TimestampValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if zone == TextValue::Null || value == TimestampValue::Null {
        return TimestamptzValue::Null;
    }
    if let TimestampValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return make_timestamptz_value(microseconds);
        }
        if let TextValue::Value(name) = zone {
            let index = find_named_zone(name);
            if index < ZONE_NAMES.len() {
                let offset = named_zone_offset(index, microseconds, true);
                if let Int4Value::Value(seconds) = offset {
                    let wide = seconds as i64;
                    return make_timestamptz_value(microseconds - wide * 1000000i64);
                }
            }
        }
    }
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timezone__blof(zone: TextValue, value: TimestamptzValue) -> TimestampValue {
    if let TextValue::Error(error) = zone {
        return TimestampValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = value {
        return TimestampValue::Error(error);
    }
    if zone == TextValue::Unknown || value == TimestamptzValue::Unknown {
        return TimestampValue::Unknown;
    }
    if zone == TextValue::Null || value == TimestamptzValue::Null {
        return TimestampValue::Null;
    }
    if let TimestamptzValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return make_timestamp_value(microseconds);
        }
        if let TextValue::Value(name) = zone {
            let index = find_named_zone(name);
            if index < ZONE_NAMES.len() {
                let offset = named_zone_offset(index, microseconds, false);
                if let Int4Value::Value(seconds) = offset {
                    let wide = seconds as i64;
                    return make_timestamp_value(microseconds + wide * 1000000i64);
                }
            }
        }
    }
    TimestampValue::Unknown
}
