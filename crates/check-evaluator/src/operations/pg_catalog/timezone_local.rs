fn timezone_local_name(session: &str) -> TextValue {
    let chars: Vec<char> = session.chars().collect();
    if chars.len() == 0 {
        return TextValue::Unknown;
    };
    if chars[0] == ':' {
        let mut name = String::new();
        let mut index: usize = 1;
        while index < chars.len() {
            name.push(chars[index]);
            index += 1;
        }
        if find_zone_name(name.as_str(), false) < ZONE_NAMES.len() {
            return TextValue::Value(name);
        };
        return TextValue::Unknown;
    };
    if timezone_digit(chars[0]) >= 0 || chars[0] == '+' || chars[0] == '-' || chars[0] == '.' {
        let mut index: usize = 0;
        while index < chars.len() {
            if chars[index] == ':' {
                return TextValue::Value(session.to_owned());
            };
            index += 1;
        }
        let profile = session_timezone_profile(session, 0i64, false);
        if profile.valid {
            let mut name = "<".to_owned();
            name.push_str(timezone_output_offset(profile.seconds, false).as_str());
            name.push('>');
            if profile.seconds == 0 {
                name.push_str("-00");
            } else {
                name.push_str(timezone_output_offset(0 - profile.seconds, false).as_str());
            };
            return TextValue::Value(name);
        };
        return TextValue::Unknown;
    };
    if find_zone_name(session, false) < ZONE_NAMES.len() {
        return TextValue::Value(session.to_owned());
    };
    TextValue::Value(timezone_lookup_ascii(session, true))
}

pub fn sql__pg_catalog__timezone__xasl(input: TimestampValue, session: &str) -> TimestamptzValue {
    let selected = timezone_local_name(session);
    if let TextValue::Value(name) = selected {
        return sql__pg_catalog__timestamptz__m17a(input, name.as_str());
    };
    sql__pg_catalog__timestamptz__m17a(input, session)
}

pub fn sql__pg_catalog__timezone__v3jy(input: TimestamptzValue, session: &str) -> TimestampValue {
    let selected = timezone_local_name(session);
    if let TextValue::Value(name) = selected {
        return sql__pg_catalog__timestamp__i0gp(input, name.as_str());
    };
    sql__pg_catalog__timestamp__i0gp(input, session)
}

pub fn sql__pg_catalog__timezone__ez14(
    input: TimetzValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimetzValue {
    if let TimetzValue::Error(error) = input {
        return TimetzValue::Error(error);
    };
    if input == TimetzValue::Null {
        return TimetzValue::Null;
    };
    let selected = timezone_local_name(session);
    if let TextValue::Value(name) = selected {
        return sql__pg_catalog__timezone__nsm6(
            TextValue::Value(name.clone()),
            input,
            name.as_str(),
            limit,
            utf8,
            default_profile,
        );
    };
    TimetzValue::Unknown
}
