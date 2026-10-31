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
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = input { unresolved_flavor = 1; };
    if let UuidValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == UuidValue::Unknown {
        return bytea_unresolved(unresolved_flavor);
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
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_hash__8nnn(input: UuidValue, byte_order: i32) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = input { unresolved_flavor = 1; };
    if let UuidValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == UuidValue::Unknown {
        return int4_unresolved(unresolved_flavor);
    }
    if input == UuidValue::Null {
        return Int4Value::Null;
    }
    if let UuidValue::Value(value) = input {
        let bytes = uuid_hash_bytes(value);
        return hash_native32(bytes, byte_order, 1);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_hash_extended__i59z(
    left: UuidValue,
    right: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let UuidValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == UuidValue::Unknown || right == Int8Value::Unknown {
        return int8_unresolved(unresolved_flavor);
    }
    if left == UuidValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let UuidValue::Value(value) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = uuid_hash_bytes(value);
            return hash_native64(bytes, seed, byte_order, 1);
        }
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__uuid_extract_version__ydwe(input: UuidValue) -> Int2Value {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = input { unresolved_flavor = 1; };
    if let UuidValue::Error(error) = input {
        return Int2Value::Error(error);
    }
    if input == UuidValue::Unknown {
        return int2_unresolved(unresolved_flavor);
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
    int2_unresolved(unresolved_flavor)
}
