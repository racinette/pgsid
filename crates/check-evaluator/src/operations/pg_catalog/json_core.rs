pub fn sql__pg_catalog__json_typeof__vzgr(input: JsonValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if let JsonValue::Value(value) = input {
        return json_kind_text(value.kind);
    };
    text_unresolved(unresolved_flavor)
}

pub fn json_to_text(input: JsonValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonValue::NonNull = input {
        return TextValue::NonNull;
    };
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if let JsonValue::Value(value) = input {
        return TextValue::Value(value.source);
    };
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__json_send__wrp3(input: JsonValue) -> ByteaValue {
    json_send_context(input,false)
}

fn json_wire_bytes(input: TextValue, client_utf8: bool) -> ByteaValue {
    if client_utf8 {
        if let TextValue::Value(value) = input {
            return ByteaValue::Value(text_binary_hex(value.as_str(),false));
        };
    };
    sql__pg_catalog__textsend__mgfj(input)
}

pub fn json_send_context(input: JsonValue, client_utf8: bool) -> ByteaValue {
    let text = json_to_text(input);
    json_wire_bytes(text,client_utf8)
}
const JSON_INVALID_TEXT: u32 = 3484946;

pub fn json_from_text(input: TextValue) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonValue::Null;
    };
    if let TextValue::Value(value) = input {
        let parsed = make_json_value(value.as_str());
        if let JsonValue::Unknown = parsed {
            return JsonValue::Error(make_sql_error(JSON_INVALID_TEXT));
        }; if let JsonValue::Unimplemented = parsed {
            return JsonValue::Error(make_sql_error(JSON_INVALID_TEXT));
        };
        return parsed;
    };
    json_unresolved(unresolved_flavor)
}
