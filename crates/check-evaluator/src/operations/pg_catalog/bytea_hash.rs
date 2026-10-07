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

pub fn sql__pg_catalog__hashbytea__mypt(input: ByteaValue) -> Int4Value {
    if let ByteaValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == ByteaValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == ByteaValue::Null {
        return Int4Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        let bytes = bytea_hash_bytes(value.as_str());
        let hash = hash_bytes32(bytes);
        return Int4Value::Value(hash);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashbyteaextended__u1vz(input: ByteaValue, seed: Int8Value) -> Int8Value {
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    if input == ByteaValue::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if input == ByteaValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            let bytes = bytea_hash_bytes(value.as_str());
            let hash = hash_bytes64(bytes, salt);
            return Int8Value::Value(hash);
        }
    }
    Int8Value::Unknown
}

fn bytea_crc(input: ByteaValue, polynomial: i64) -> Int8Value {
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == ByteaValue::Unknown {
        return Int8Value::Unknown;
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
    Int8Value::Unknown
}

pub fn sql__pg_catalog__crc32__0obw(input: ByteaValue) -> Int8Value {
    bytea_crc(input, 3988292384i64)
}

pub fn sql__pg_catalog__crc32c__f1hu(input: ByteaValue) -> Int8Value {
    bytea_crc(input, 2197175160i64)
}
