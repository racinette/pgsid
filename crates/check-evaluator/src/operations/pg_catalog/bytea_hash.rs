fn bytea_hash_bytes(value: &str) -> Vec<HashByte> {
    let chars: Vec<char> = value.chars().collect();
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut index: usize = 0;
    while index < chars.len() {
        let high = hex_digit(chars[index]);
        let low = hex_digit(chars[index + 1]);
        let byte = high * 16 + low;
        bytes.push(HashByte { value: byte as i64 });
        index = index + 2;
    }
    bytes
}

pub fn sql__pg_catalog__hashbytea__mypt(input: ByteaValue, byte_order: i32) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_22_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = input { if condition_flavor_22_4 < 1 { condition_flavor_22_4 = 1; }; }; if let ByteaValue::Unimplemented = input { condition_flavor_22_4 = 2; }; if (input == ByteaValue::Unknown || input == ByteaValue::Unimplemented) {
        return int4_unresolved(condition_flavor_22_4);
    }
    if input == ByteaValue::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        let bytes = bytea_hash_bytes(value.as_str());
        return hash_native32(bytes, byte_order, 1);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashbyteaextended__u1vz(
    input: ByteaValue,
    seed: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unknown = seed { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = seed { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_51_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = input { if condition_flavor_51_4 < 1 { condition_flavor_51_4 = 1; }; }; if let ByteaValue::Unimplemented = input { condition_flavor_51_4 = 2; }; if let Int8Value::Unknown = seed { if condition_flavor_51_4 < 1 { condition_flavor_51_4 = 1; }; }; if let Int8Value::Unimplemented = seed { condition_flavor_51_4 = 2; }; if (input == ByteaValue::Unknown || input == ByteaValue::Unimplemented) || (seed == Int8Value::Unknown || seed == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_51_4);
    }
    if input == ByteaValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            let bytes = bytea_hash_bytes(value.as_str());
            return hash_native64(bytes, salt, byte_order, 1);
        }
    }
    int8_unresolved(unresolved_flavor)
}

fn bytea_crc(input: ByteaValue, polynomial: i64) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_73_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = input { if condition_flavor_73_4 < 1 { condition_flavor_73_4 = 1; }; }; if let ByteaValue::Unimplemented = input { condition_flavor_73_4 = 2; }; if (input == ByteaValue::Unknown || input == ByteaValue::Unimplemented) {
        return int8_unresolved(condition_flavor_73_4);
    }
    if input == ByteaValue::Null {
        return Int8Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut crc: i64 = 4294967295i64;
        let mut index: usize = 0;
        while index < chars.len() {
            let high = hex_digit(chars[index]);
            let low = hex_digit(chars[index + 1]);
            let byte = high * 16 + low;
            let wide_byte = byte as i64;
            crc = hash_xor(crc, wide_byte);
            let mut bit: i32 = 0;
            while bit < 8 {
                let low_bit = crc % 2i64;
                crc = crc / 2i64;
                if low_bit == 1i64 {
                    crc = hash_xor(crc, polynomial);
                }
                bit = bit + 1;
            }
            index = index + 2;
        }
        let result = 4294967295i64 - crc;
        return Int8Value::Value(result);
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__crc32__0obw(input: ByteaValue) -> Int8Value {
    bytea_crc(input, 3988292384i64)
}

pub fn sql__pg_catalog__crc32c__f1hu(input: ByteaValue) -> Int8Value {
    bytea_crc(input, 2197175160i64)
}
