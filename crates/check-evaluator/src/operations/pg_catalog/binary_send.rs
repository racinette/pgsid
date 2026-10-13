fn binary_send_bits(input: Int8Value, width: i32) -> ByteaValue {
    if let Int8Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Int8Value::Null {
        return ByteaValue::Null;
    }
    if let Int8Value::Value(bits) = input {
        let mut word = bits;
        let mut divisor: i64 = 72057594037927936i64;
        if width == 4 {
            divisor = 16777216i64;
        }
        let mut output = String::new();
        while divisor > 0i64 {
            let mut octet = (word / divisor) as i32;
            let mut remainder = word % divisor;
            if remainder < 0i64 {
                octet = octet - 1;
                remainder = remainder + divisor;
            }
            if octet < 0 {
                octet = octet + 256;
            }
            output = bytea_append_byte(output, octet);
            word = remainder;
            divisor = divisor / 256i64;
        }
        return ByteaValue::Value(output);
    };
    ByteaValue::Unknown
}
