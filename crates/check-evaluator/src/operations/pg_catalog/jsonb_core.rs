pub fn sql__pg_catalog__jsonb_typeof__68xu(input: JsonbValue) -> TextValue {
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
    let text = jsonb_to_text(input);
    let bytes = sql__pg_catalog__textsend__mgfj(text);
    if let ByteaValue::Value(value) = bytes {
        let mut output = "01".to_owned();
        output.push_str(value.as_str());
        return ByteaValue::Value(output);
    };
    bytes
}
