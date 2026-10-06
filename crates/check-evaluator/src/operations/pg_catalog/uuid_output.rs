fn uuid_byte(value: Uuid, index: i32) -> i32 {
    let word = uuid_word(value, index / 2);
    if index % 2 == 0 {
        return word / 256;
    }
    word % 256
}

fn uuid_hash_bytes(value: Uuid) -> Vec<HashByte> {
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut index: i32 = 0;
    while index < 16 {
        let byte = uuid_byte(value, index);
        bytes.push(HashByte { value: byte as i64 });
        index = index + 1;
    }
    bytes
}

pub fn sql__pg_catalog__uuid_send__32nf(input: UuidValue) -> ByteaValue {
    if let UuidValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == UuidValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == UuidValue::Null {
        return ByteaValue::Null;
    }
    if let UuidValue::Value(value) = input {
        let mut output = String::new();
        let mut index: i32 = 0;
        while index < 16 {
            let byte = uuid_byte(value, index);
            output = bytea_append_byte(output, byte);
            index = index + 1;
        }
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__uuid_hash__8nnn(input: UuidValue) -> Int4Value {
    if let UuidValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == UuidValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == UuidValue::Null {
        return Int4Value::Null;
    }
    if let UuidValue::Value(value) = input {
        let bytes = uuid_hash_bytes(value);
        let hash = hash_bytes32(bytes);
        return Int4Value::Value(hash);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__uuid_hash_extended__i59z(left: UuidValue, right: Int8Value) -> Int8Value {
    if let UuidValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == UuidValue::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == UuidValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let UuidValue::Value(value) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = uuid_hash_bytes(value);
            let hash = hash_bytes64(bytes, seed);
            return Int8Value::Value(hash);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__uuid_extract_version__ydwe(input: UuidValue) -> Int2Value {
    if let UuidValue::Error(error) = input {
        return Int2Value::Error(error);
    }
    if input == UuidValue::Unknown {
        return Int2Value::Unknown;
    }
    if input == UuidValue::Null {
        return Int2Value::Null;
    }
    if let UuidValue::Value(value) = input {
        if value.word4 / 16384 != 2 {
            return Int2Value::Null;
        }
        return Int2Value::Value(value.word3 / 4096);
    }
    Int2Value::Unknown
}
