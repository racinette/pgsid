pub fn sql__pg_catalog__bit_send__1fyo(input: BitValue) -> ByteaValue {
    sql__pg_catalog__varbit_send__yt0j(input)
}

pub fn sql__pg_catalog__varbit_send__yt0j(input: BitValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_12_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_12_4 < 1 { condition_flavor_12_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_12_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_12_4);
    }
    if input == BitValue::Null {
        return ByteaValue::Null;
    }
    if let BitValue::Value(value) = input {
        let length = bit_payload_length(value.as_str());
        let mut output = String::new();
        output = bytea_append_byte(output, length / 16777216);
        output = bytea_append_byte(output, length / 65536 % 256);
        output = bytea_append_byte(output, length / 256 % 256);
        output = bytea_append_byte(output, length % 256);
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        while index < chars.len() {
            let mut byte: i32 = 0;
            let mut bit: usize = 0;
            while bit < 8 {
                byte = byte * 2;
                if index < chars.len() {
                    if chars[index] == '1' {
                        byte = byte + 1;
                    }
                    index = index + 1;
                }
                bit = bit + 1;
            }
            output = bytea_append_byte(output, byte);
        }
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}
