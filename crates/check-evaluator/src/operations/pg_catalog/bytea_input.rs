pub fn bytea_from_text(input: TextValue) -> ByteaValue {
    if let TextValue::Error(error) = input { return ByteaValue::Error(error); }
    if input == TextValue::Unknown { return ByteaValue::Unknown; }
    if input == TextValue::Null { return ByteaValue::Null; }
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        if chars.len() >= 2 && chars[0] == '\\' && chars[1] == 'x' {
            let length = (bytea_codec_utf8_length(value.as_str()) - 2i64) / 2i64;
            if bytea_codec_length_fits(length) == false {
                return ByteaValue::Error(make_sql_error(BYTEA_ALLOCATION_ERROR));
            }
            let mut payload = String::new();
            let mut index: usize = 2;
            while index < chars.len() {
                payload.push(chars[index]);
                index += 1;
            }
            return bytea_hex_decode(payload.as_str());
        }
        let estimate = bytea_escape_decoded_length(value.as_str());
        if let Int8Value::Error(error) = estimate { return ByteaValue::Error(error); }
        if let Int8Value::Value(length) = estimate {
            if bytea_codec_length_fits(length) == false {
                return ByteaValue::Error(make_sql_error(BYTEA_ALLOCATION_ERROR));
            }
        }
        return bytea_escape_decode(value.as_str());
    }
    ByteaValue::Unknown
}
