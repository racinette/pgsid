pub fn sql__pg_catalog__to_jsonb__9y7o(input: JsonbInput) -> JsonbValue {
    if let JsonbInput::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let JsonbInput::ConvertedError(error) = input {
        return JsonbValue::Error(error);
    };
    if let JsonbInput::Null = input {
        return JsonbValue::Null;
    };
    if let JsonbInput::Boolean(value) = input {
        if value {
            return make_jsonb_value("true");
        };
        return make_jsonb_value("false");
    };
    if let JsonbInput::Number(value) = input {
        if value == "NaN" || value == "Infinity" || value == "-Infinity" {
            return jsonb_from_string(TextValue::Value(value));
        };
        return jsonb_from_text(TextValue::Value(value));
    };
    if let JsonbInput::Text(value) = input {
        return jsonb_from_string(TextValue::Value(value));
    };
    if let JsonbInput::Json(value) = input {
        return jsonb_from_text(TextValue::Value(value.source));
    };
    if let JsonbInput::Jsonb(value) = input {
        return JsonbValue::Value(value);
    };
    JsonbValue::Unknown
}

pub fn jsonb_input_from_uuid(input: UuidValue) -> JsonbInput {
    let text = uuid_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_oid(input: OidValue) -> JsonbInput {
    let text = oid_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_inet(input: NetworkValue) -> JsonbInput {
    let text = network_output(input, 2);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_cidr(input: NetworkValue) -> JsonbInput {
    let text = network_output(input, 1);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_macaddr(input: MacaddrValue) -> JsonbInput {
    let text = macaddr_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_macaddr8(input: Macaddr8Value) -> JsonbInput {
    let text = macaddr8_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_bit(input: BitValue) -> JsonbInput {
    let text = bit_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_time(input: TimeValue) -> JsonbInput {
    let text = clock_time_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_timetz(input: TimetzValue) -> JsonbInput {
    let text = clock_timetz_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_xid(input: XidValue) -> JsonbInput {
    let text = xid_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_cid(input: CidValue) -> JsonbInput {
    let text = cid_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_xid8(input: Xid8Value) -> JsonbInput {
    let text = xid8_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_pg_lsn(input: PgLsnValue) -> JsonbInput {
    let text = pg_lsn_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_tid(input: TidValue) -> JsonbInput {
    let text = tid_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_snapshot(input: SnapshotValue) -> JsonbInput {
    let text = snapshot_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_internal_char(input: InternalCharValue) -> JsonbInput {
    let text = sql__pg_catalog__text__j1jh(input);
    jsonb_input_from_text(text)
}

fn jsonb_calendar_text(calendar: TemporalCalendarFields) -> String {
    let mut year = calendar.year;
    if year <= 0 {
        year = 1 - year;
    };
    let mut output = String::new();
    if year < 1000 {
        output.push('0');
    };
    if year < 100 {
        output.push('0');
    };
    if year < 10 {
        output.push('0');
    };
    let digits = text_number(year, 10);
    output.push_str(digits.as_str());
    output.push('-');
    let month = clock_output_pair(calendar.month);
    output.push_str(month.as_str());
    output.push('-');
    let day = clock_output_pair(calendar.day);
    output.push_str(day.as_str());
    output
}

pub fn jsonb_input_from_date(input: DateValue) -> JsonbInput {
    if let DateValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == DateValue::Null {
        return JsonbInput::Null;
    };
    if let DateValue::Value(day) = input {
        if day == (-2147483647 - 1) {
            return JsonbInput::Text("-infinity".to_owned());
        };
        if day == 2147483647 {
            return JsonbInput::Text("infinity".to_owned());
        };
        let julian = (day as i64) + 2451545i64;
        let calendar = temporal_calendar_from_julian(julian);
        let mut output = jsonb_calendar_text(calendar);
        if calendar.year <= 0 {
            output.push_str(" BC");
        };
        return JsonbInput::Text(output);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_timestamp(input: TimestampValue) -> JsonbInput {
    if let TimestampValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == TimestampValue::Null {
        return JsonbInput::Null;
    };
    if let TimestampValue::Value(value) = input {
        if value == -9223372036854775808i64 {
            return JsonbInput::Text("-infinity".to_owned());
        };
        if value == 9223372036854775807i64 {
            return JsonbInput::Text("infinity".to_owned());
        };
        let mut day = value / 86400000000i64;
        let mut clock = value % 86400000000i64;
        if clock < 0i64 {
            day = day - 1i64;
            clock = clock + 86400000000i64;
        };
        let calendar = temporal_calendar_from_julian(day + 2451545i64);
        let mut output = jsonb_calendar_text(calendar);
        output.push('T');
        let time = clock_output_time(clock);
        output.push_str(time.as_str());
        if calendar.year <= 0 {
            output.push_str(" BC");
        };
        return JsonbInput::Text(output);
    };
    JsonbInput::Unknown
}

pub fn jsonb_input_from_timestamptz(input: TimestamptzValue) -> JsonbInput {
    if let TimestamptzValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == TimestamptzValue::Null {
        return JsonbInput::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 {
            return JsonbInput::Text("-infinity".to_owned());
        };
        if value == 9223372036854775807i64 {
            return JsonbInput::Text("infinity".to_owned());
        };
    };
    JsonbInput::Unknown
}
