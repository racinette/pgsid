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
    if let UuidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_27_4: i32 = unresolved_flavor; if let UuidValue::Unknown = input { if condition_flavor_27_4 < 1 { condition_flavor_27_4 = 1; }; }; if let UuidValue::Unimplemented = input { condition_flavor_27_4 = 2; }; if (input == UuidValue::Unknown || input == UuidValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_27_4);
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
    if let UuidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_53_4: i32 = unresolved_flavor; if let UuidValue::Unknown = input { if condition_flavor_53_4 < 1 { condition_flavor_53_4 = 1; }; }; if let UuidValue::Unimplemented = input { condition_flavor_53_4 = 2; }; if (input == UuidValue::Unknown || input == UuidValue::Unimplemented) {
        return int4_unresolved(condition_flavor_53_4);
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
    if let UuidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_82_4: i32 = unresolved_flavor; if let UuidValue::Unknown = left { if condition_flavor_82_4 < 1 { condition_flavor_82_4 = 1; }; }; if let UuidValue::Unimplemented = left { condition_flavor_82_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_82_4 < 1 { condition_flavor_82_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_82_4 = 2; }; if (left == UuidValue::Unknown || left == UuidValue::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_82_4);
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
    if let UuidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = input {
        return Int2Value::Error(error);
    }
    let mut condition_flavor_104_4: i32 = unresolved_flavor; if let UuidValue::Unknown = input { if condition_flavor_104_4 < 1 { condition_flavor_104_4 = 1; }; }; if let UuidValue::Unimplemented = input { condition_flavor_104_4 = 2; }; if (input == UuidValue::Unknown || input == UuidValue::Unimplemented) {
        return int2_unresolved(condition_flavor_104_4);
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
