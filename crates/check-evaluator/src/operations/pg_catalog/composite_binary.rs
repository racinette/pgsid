pub(crate) fn record_binary_initial(input: CompositeValue) -> ByteaValue {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked {
        return ByteaValue::Error(error);
    };
    if let CompositeValue::Null = checked {
        return ByteaValue::Null;
    };
    if let CompositeValue::Value(value) = checked {
        if value.fields.len() == 0 {
            return ByteaValue::Value("00000000".to_owned());
        };
    };
    ByteaValue::Unknown
}

pub(crate) fn record_binary_start() -> ByteaValue {
    ByteaValue::Value("00000000".to_owned())
}

pub fn sql__pg_catalog__record_send__yv22(input: CompositeValue, output: ByteaValue) -> ByteaValue {
    if let CompositeValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let CompositeValue::Null = input {
        return ByteaValue::Null;
    };
    if let CompositeValue::Value(_) = input {
        return output;
    };
    ByteaValue::Unknown
}
