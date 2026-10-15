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
