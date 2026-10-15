pub fn sql__pg_catalog__float4send__uk42(input: Float4Value) -> ByteaValue {
    if let Float4Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Float4Value::Null {
        return ByteaValue::Null;
    }
    if input == Float4Value::UnspecifiedNan { return ByteaValue::Unspecified(4); };
    if let Float4Value::Value(bits) = input {
        return binary_send_bits(Int8Value::Value(bits as i64), 4);
    };
    ByteaValue::Unknown
}
pub fn sql__pg_catalog__float8send__3bqt(input: Float8Value) -> ByteaValue {
    if let Float8Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Float8Value::Null {
        return ByteaValue::Null;
    }
    if input == Float8Value::UnspecifiedNan { return ByteaValue::Unspecified(8); };
    if let Float8Value::Value(bits) = input {
        return binary_send_bits(Int8Value::Value(bits), 8);
    };
    ByteaValue::Unknown
}
