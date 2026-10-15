pub fn sql__pg_catalog__to_jsonb__9y7o(input: JsonbInput) -> JsonbValue {
    if let JsonbInput::Error(error) = input {
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
