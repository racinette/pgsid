pub fn sql__pg_catalog__json_typeof__vzgr(input: JsonValue) -> TextValue {
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if let JsonValue::Value(value) = input {
        if value.kind == 0 {
            return make_text_value("null");
        };
        if value.kind == 1 || value.kind == 2 {
            return make_text_value("boolean");
        };
        if value.kind == 3 {
            return make_text_value("number");
        };
        if value.kind == 4 {
            return make_text_value("string");
        };
        if value.kind == 5 {
            return make_text_value("array");
        };
        if value.kind == 6 {
            return make_text_value("object");
        };
    };
    TextValue::Unknown
}

pub fn json_to_text(input: JsonValue) -> TextValue {
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if let JsonValue::Value(value) = input {
        return TextValue::Value(value.source);
    };
    TextValue::Unknown
}
const JSON_INVALID_TEXT: u32 = 3484946;

pub fn json_from_text(input: TextValue) -> JsonValue {
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
        };
        return parsed;
    };
    JsonValue::Unknown
}
