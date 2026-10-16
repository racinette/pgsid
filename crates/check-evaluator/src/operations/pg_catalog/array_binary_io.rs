pub fn sql__pg_catalog__array_send__g245(input: ArrayValue) -> ByteaValue {
    if let ArrayValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return ByteaValue::Null;
    };
    ByteaValue::Unknown
}
