struct ConstructorZoneNumber {
    next: usize,
    value: i32,
    overflow: bool,
}

fn constructor_read_zone_number(text: &TimezoneText, start: usize) -> ConstructorZoneNumber {
    let mut index = start;
    while index < text.chars.len() {
        let code = text.chars[index] as u32;
        if code != 32 && (code < 9 || code > 13) {
            break;
        };
        index += 1;
    }
    let mut negative = false;
    if index < text.chars.len() && (text.chars[index] == '+' || text.chars[index] == '-') {
        negative = text.chars[index] == '-';
        index += 1;
    };
    let digits = index;
    let mut value: i32 = 0;
    while index < text.chars.len() && timezone_digit(text.chars[index]) >= 0 {
        let digit = timezone_digit(text.chars[index]);
        if value > 214748364 || (value == 214748364 && digit > 7) {
            return ConstructorZoneNumber {
                next: index,
                value: 0,
                overflow: true,
            };
        };
        value = value * 10 + digit;
        index += 1;
    }
    if index == digits {
        return ConstructorZoneNumber {
            next: start,
            value: 0,
            overflow: false,
        };
    };
    if negative {
        value = 0 - value;
    };
    ConstructorZoneNumber {
        next: index,
        value: value,
        overflow: false,
    }
}

fn constructor_numeric_zone(name: &str) -> Int4Value {
    let text = TimezoneText {
        chars: name.chars().collect(),
    };
    if text.chars.len() == 0 {
        return Int4Value::Null;
    };
    if timezone_digit(text.chars[0]) >= 0 {
        return Int4Value::Error(make_sql_error(INVALID_TIMEZONE_NAME));
    };
    if text.chars[0] != '+' && text.chars[0] != '-' {
        return Int4Value::Null;
    };
    let hour = constructor_read_zone_number(&text, 1);
    if hour.overflow {
        return Int4Value::Error(make_sql_error(INVALID_TIMEZONE_NAME));
    };
    let mut hours = hour.value;
    let mut minute: i32 = 0;
    let mut second: i32 = 0;
    let mut index = hour.next;
    if index < text.chars.len() && text.chars[index] == ':' {
        let minutes = constructor_read_zone_number(&text, index + 1);
        if minutes.overflow {
            return Int4Value::Error(make_sql_error(INVALID_TIMEZONE_NAME));
        };
        minute = minutes.value;
        index = minutes.next;
        if index < text.chars.len() && text.chars[index] == ':' {
            let seconds = constructor_read_zone_number(&text, index + 1);
            if seconds.overflow {
                return Int4Value::Error(make_sql_error(INVALID_TIMEZONE_NAME));
            };
            second = seconds.value;
            index = seconds.next;
        };
    } else if index == text.chars.len() && text.chars.len() > 3 {
        minute = hours % 100;
        hours = hours / 100;
    };
    if hours < 0 || hours > 15 || minute < 0 || minute >= 60 || second < 0 || second >= 60 {
        return Int4Value::Error(make_sql_error(INVALID_TIMEZONE_NAME));
    };
    if index != text.chars.len() {
        return Int4Value::Null;
    };
    let mut east = (hours * 60 + minute) * 60 + second;
    if text.chars[0] == '-' {
        east = 0 - east;
    };
    make_int4_value(east)
}

pub fn sql__pg_catalog__timestamptz__98ye(
    date: DateValue,
    clock: TimeValue,
    session: &str,
) -> TimestamptzValue {
    sql__pg_catalog__timezone__xasl(clock_date_timestamp(date, clock), session)
}

pub fn sql__pg_catalog__make_timestamptz__2wh4(
    year: Int4Value,
    month: Int4Value,
    day: Int4Value,
    hour: Int4Value,
    minute: Int4Value,
    second: Float8Value,
    session: &str,
) -> TimestamptzValue {
    sql__pg_catalog__timezone__xasl(
        sql__pg_catalog__make_timestamp__n30u(year, month, day, hour, minute, second),
        session,
    )
}

pub fn sql__pg_catalog__make_timestamptz__nko2(
    year: Int4Value,
    month: Int4Value,
    day: Int4Value,
    hour: Int4Value,
    minute: Int4Value,
    second: Float8Value,
    zone: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
) -> TimestamptzValue {
    if let Int4Value::Error(error) = year {
        return TimestamptzValue::Error(error);
    };
    if let Int4Value::Error(error) = month {
        return TimestamptzValue::Error(error);
    };
    if let Int4Value::Error(error) = day {
        return TimestamptzValue::Error(error);
    };
    if let Int4Value::Error(error) = hour {
        return TimestamptzValue::Error(error);
    };
    if let Int4Value::Error(error) = minute {
        return TimestamptzValue::Error(error);
    };
    if let Float8Value::Error(error) = second {
        return TimestamptzValue::Error(error);
    };
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    };
    if year == Int4Value::Unknown
        || month == Int4Value::Unknown
        || day == Int4Value::Unknown
        || hour == Int4Value::Unknown
        || minute == Int4Value::Unknown
        || second == Float8Value::Unknown
        || zone == TextValue::Unknown
    {
        return TimestamptzValue::Unknown;
    };
    if year == Int4Value::Null
        || month == Int4Value::Null
        || day == Int4Value::Null
        || hour == Int4Value::Null
        || minute == Int4Value::Null
        || second == Float8Value::Null
        || zone == TextValue::Null
    {
        return TimestamptzValue::Null;
    };
    let local = sql__pg_catalog__make_timestamp__n30u(year, month, day, hour, minute, second);
    if let TimestampValue::Error(error) = local {
        return TimestamptzValue::Error(error);
    };
    if let TimestampValue::Value(time) = local {
        let clipped = name_from_text_context(zone, 255, utf8);
        if let TextValue::Value(name) = clipped {
            let numeric = constructor_numeric_zone(name.as_str());
            if let Int4Value::Error(error) = numeric {
                return TimestamptzValue::Error(error);
            };
            if let Int4Value::Value(east) = numeric {
                return make_timestamptz_value(time - (east as i64) * 1000000i64);
            };
            return sql__pg_catalog__timezone__9nbk(
                TextValue::Value(name),
                local,
                session,
                limit,
                utf8,
                default_profile,
            );
        };
        if let TextValue::Error(error) = clipped {
            return TimestamptzValue::Error(error);
        };
    };
    TimestamptzValue::Unknown
}
