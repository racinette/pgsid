pub(crate) fn record_binary_initial(input: CompositeValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let CompositeValue::Unknown = input { unresolved_flavor = 1; };
    if let CompositeValue::Unimplemented = input { unresolved_flavor = 2; };
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
    bytea_unresolved(unresolved_flavor)
}

pub(crate) fn record_binary_start() -> ByteaValue {
    ByteaValue::Value("00000000".to_owned())
}

pub fn sql__pg_catalog__record_send__yv22(input: CompositeValue, output: ByteaValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let CompositeValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unknown = output { unresolved_flavor = 1; };
    if let CompositeValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ByteaValue::Unimplemented = output { unresolved_flavor = 2; };
    if let CompositeValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let CompositeValue::Null = input {
        return ByteaValue::Null;
    };
    if let CompositeValue::Value(_) = input {
        return output;
    };
    bytea_unresolved(unresolved_flavor)
}
