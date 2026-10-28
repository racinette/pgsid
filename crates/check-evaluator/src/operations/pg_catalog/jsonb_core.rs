pub fn sql__pg_catalog__jsonb_typeof__68xu(input: JsonbValue) -> TextValue {
    if let JsonbValue::NonNull(facts) = input {
        if facts.kind >= 0 {
            return json_kind_text(facts.kind);
        };
        return TextValue::NonNull;
    };
    if let JsonbValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return TextValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        return json_kind_text(value.nodes[value.root].kind);
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__jsonb_send__8nmo(input: JsonbValue) -> ByteaValue {
    jsonb_send_context(input,false,false)
}

pub fn jsonb_send_context(input: JsonbValue, server_utf8: bool, client_utf8: bool) -> ByteaValue {
    let text = jsonb_text_context(input,server_utf8);
    let bytes = json_wire_bytes(text,client_utf8);
    if let ByteaValue::Value(value) = bytes {
        let mut output = "01".to_owned();
        output.push_str(value.as_str());
        return ByteaValue::Value(output);
    };
    bytes
}
