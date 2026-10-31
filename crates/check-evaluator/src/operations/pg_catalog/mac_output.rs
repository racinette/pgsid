fn mac_address_byte(address: MacAddress, index: i32) -> i32 {
    let mut word = address.word0;
    if index >= 6 {
        word = address.word3;
    } else if index >= 4 {
        word = address.word2;
    } else if index >= 2 {
        word = address.word1;
    };
    if index % 2 == 0 {
        return word / 256;
    }
    word % 256
}

fn mac_output_text(address: MacAddress, size: i32) -> String {
    let mut output = String::new();
    let mut index: i32 = 0;
    while index < size {
        if index > 0 {
            output.push(':');
        }
        let byte = mac_address_byte(address, index);
        if byte < 16 {
            output.push('0');
        }
        let number = text_number(byte, 16);
        output.push_str(number.as_str());
        index = index + 1;
    }
    output
}

fn mac_output_bytes(address: MacAddress, size: i32) -> String {
    let mut output = String::new();
    let mut index: i32 = 0;
    while index < size {
        let byte = mac_address_byte(address, index);
        output = bytea_append_byte(output, byte);
        index = index + 1;
    }
    output
}

fn mac_hash_bytes(address: MacAddress, size: i32) -> Vec<HashByte> {
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut index: i32 = 0;
    while index < size {
        let byte = mac_address_byte(address, index);
        bytes.push(HashByte { value: byte as i64 });
        index = index + 1;
    }
    bytes
}

pub fn macaddr_to_text(input: MacaddrValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = input { unresolved_flavor = 1; };
    if let MacaddrValue::Unimplemented = input { unresolved_flavor = 2; };
    if let MacaddrValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_63_4: i32 = unresolved_flavor; if let MacaddrValue::Unknown = input { if condition_flavor_63_4 < 1 { condition_flavor_63_4 = 1; }; }; if let MacaddrValue::Unimplemented = input { condition_flavor_63_4 = 2; }; if (input == MacaddrValue::Unknown || input == MacaddrValue::Unimplemented) {
        return text_unresolved(condition_flavor_63_4);
    }
    if input == MacaddrValue::Null {
        return TextValue::Null;
    }
    if let MacaddrValue::Value(address) = input {
        let result = mac_output_text(address, 6);
        return TextValue::Value(result);
    }
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr_send__fk4p(input: MacaddrValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = input { unresolved_flavor = 1; };
    if let MacaddrValue::Unimplemented = input { unresolved_flavor = 2; };
    if let MacaddrValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_83_4: i32 = unresolved_flavor; if let MacaddrValue::Unknown = input { if condition_flavor_83_4 < 1 { condition_flavor_83_4 = 1; }; }; if let MacaddrValue::Unimplemented = input { condition_flavor_83_4 = 2; }; if (input == MacaddrValue::Unknown || input == MacaddrValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_83_4);
    }
    if input == MacaddrValue::Null {
        return ByteaValue::Null;
    }
    if let MacaddrValue::Value(address) = input {
        let result = mac_output_bytes(address, 6);
        return ByteaValue::Value(result);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashmacaddr__ih2y(input: MacaddrValue, byte_order: i32) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = input { unresolved_flavor = 1; };
    if let MacaddrValue::Unimplemented = input { unresolved_flavor = 2; };
    if let MacaddrValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_103_4: i32 = unresolved_flavor; if let MacaddrValue::Unknown = input { if condition_flavor_103_4 < 1 { condition_flavor_103_4 = 1; }; }; if let MacaddrValue::Unimplemented = input { condition_flavor_103_4 = 2; }; if (input == MacaddrValue::Unknown || input == MacaddrValue::Unimplemented) {
        return int4_unresolved(condition_flavor_103_4);
    }
    if input == MacaddrValue::Null {
        return Int4Value::Null;
    }
    if let MacaddrValue::Value(address) = input {
        let bytes = mac_hash_bytes(address, 6);
        return hash_native32(bytes, byte_order, 1);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashmacaddrextended__94rh(
    left: MacaddrValue,
    right: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let MacaddrValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let MacaddrValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_132_4: i32 = unresolved_flavor; if let MacaddrValue::Unknown = left { if condition_flavor_132_4 < 1 { condition_flavor_132_4 = 1; }; }; if let MacaddrValue::Unimplemented = left { condition_flavor_132_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_132_4 < 1 { condition_flavor_132_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_132_4 = 2; }; if (left == MacaddrValue::Unknown || left == MacaddrValue::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_132_4);
    }
    if left == MacaddrValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let MacaddrValue::Value(address) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = mac_hash_bytes(address, 6);
            return hash_native64(bytes, seed, byte_order, 1);
        }
    }
    int8_unresolved(unresolved_flavor)
}

pub fn macaddr8_to_text(input: Macaddr8Value) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = input { unresolved_flavor = 1; };
    if let Macaddr8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Macaddr8Value::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_154_4: i32 = unresolved_flavor; if let Macaddr8Value::Unknown = input { if condition_flavor_154_4 < 1 { condition_flavor_154_4 = 1; }; }; if let Macaddr8Value::Unimplemented = input { condition_flavor_154_4 = 2; }; if (input == Macaddr8Value::Unknown || input == Macaddr8Value::Unimplemented) {
        return text_unresolved(condition_flavor_154_4);
    }
    if input == Macaddr8Value::Null {
        return TextValue::Null;
    }
    if let Macaddr8Value::Value(address) = input {
        let result = mac_output_text(address, 8);
        return TextValue::Value(result);
    }
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__macaddr8_send__qten(input: Macaddr8Value) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = input { unresolved_flavor = 1; };
    if let Macaddr8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Macaddr8Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_174_4: i32 = unresolved_flavor; if let Macaddr8Value::Unknown = input { if condition_flavor_174_4 < 1 { condition_flavor_174_4 = 1; }; }; if let Macaddr8Value::Unimplemented = input { condition_flavor_174_4 = 2; }; if (input == Macaddr8Value::Unknown || input == Macaddr8Value::Unimplemented) {
        return bytea_unresolved(condition_flavor_174_4);
    }
    if input == Macaddr8Value::Null {
        return ByteaValue::Null;
    }
    if let Macaddr8Value::Value(address) = input {
        let result = mac_output_bytes(address, 8);
        return ByteaValue::Value(result);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashmacaddr8__72kw(input: Macaddr8Value, byte_order: i32) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = input { unresolved_flavor = 1; };
    if let Macaddr8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Macaddr8Value::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_194_4: i32 = unresolved_flavor; if let Macaddr8Value::Unknown = input { if condition_flavor_194_4 < 1 { condition_flavor_194_4 = 1; }; }; if let Macaddr8Value::Unimplemented = input { condition_flavor_194_4 = 2; }; if (input == Macaddr8Value::Unknown || input == Macaddr8Value::Unimplemented) {
        return int4_unresolved(condition_flavor_194_4);
    }
    if input == Macaddr8Value::Null {
        return Int4Value::Null;
    }
    if let Macaddr8Value::Value(address) = input {
        let bytes = mac_hash_bytes(address, 8);
        return hash_native32(bytes, byte_order, 1);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashmacaddr8extended__63o8(
    left: Macaddr8Value,
    right: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Macaddr8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Macaddr8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_223_4: i32 = unresolved_flavor; if let Macaddr8Value::Unknown = left { if condition_flavor_223_4 < 1 { condition_flavor_223_4 = 1; }; }; if let Macaddr8Value::Unimplemented = left { condition_flavor_223_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_223_4 < 1 { condition_flavor_223_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_223_4 = 2; }; if (left == Macaddr8Value::Unknown || left == Macaddr8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_223_4);
    }
    if left == Macaddr8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Macaddr8Value::Value(address) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = mac_hash_bytes(address, 8);
            return hash_native64(bytes, seed, byte_order, 1);
        }
    }
    int8_unresolved(unresolved_flavor)
}
