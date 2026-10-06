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
    if let MacaddrValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == MacaddrValue::Unknown {
        return TextValue::Unknown;
    }
    if input == MacaddrValue::Null {
        return TextValue::Null;
    }
    if let MacaddrValue::Value(address) = input {
        let result = mac_output_text(address, 6);
        return TextValue::Value(result);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__macaddr_send__fk4p(input: MacaddrValue) -> ByteaValue {
    if let MacaddrValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == MacaddrValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == MacaddrValue::Null {
        return ByteaValue::Null;
    }
    if let MacaddrValue::Value(address) = input {
        let result = mac_output_bytes(address, 6);
        return ByteaValue::Value(result);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__hashmacaddr__ih2y(input: MacaddrValue) -> Int4Value {
    if let MacaddrValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == MacaddrValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == MacaddrValue::Null {
        return Int4Value::Null;
    }
    if let MacaddrValue::Value(address) = input {
        let bytes = mac_hash_bytes(address, 6);
        let result = hash_bytes32(bytes);
        return Int4Value::Value(result);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashmacaddrextended__94rh(left: MacaddrValue, right: Int8Value) -> Int8Value {
    if let MacaddrValue::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == MacaddrValue::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == MacaddrValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let MacaddrValue::Value(address) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = mac_hash_bytes(address, 6);
            let result = hash_bytes64(bytes, seed);
            return Int8Value::Value(result);
        }
    }
    Int8Value::Unknown
}

pub fn macaddr8_to_text(input: Macaddr8Value) -> TextValue {
    if let Macaddr8Value::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == Macaddr8Value::Unknown {
        return TextValue::Unknown;
    }
    if input == Macaddr8Value::Null {
        return TextValue::Null;
    }
    if let Macaddr8Value::Value(address) = input {
        let result = mac_output_text(address, 8);
        return TextValue::Value(result);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__macaddr8_send__qten(input: Macaddr8Value) -> ByteaValue {
    if let Macaddr8Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Macaddr8Value::Unknown {
        return ByteaValue::Unknown;
    }
    if input == Macaddr8Value::Null {
        return ByteaValue::Null;
    }
    if let Macaddr8Value::Value(address) = input {
        let result = mac_output_bytes(address, 8);
        return ByteaValue::Value(result);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__hashmacaddr8__72kw(input: Macaddr8Value) -> Int4Value {
    if let Macaddr8Value::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == Macaddr8Value::Unknown {
        return Int4Value::Unknown;
    }
    if input == Macaddr8Value::Null {
        return Int4Value::Null;
    }
    if let Macaddr8Value::Value(address) = input {
        let bytes = mac_hash_bytes(address, 8);
        let result = hash_bytes32(bytes);
        return Int4Value::Value(result);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashmacaddr8extended__63o8(left: Macaddr8Value, right: Int8Value) -> Int8Value {
    if let Macaddr8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Macaddr8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Macaddr8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Macaddr8Value::Value(address) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = mac_hash_bytes(address, 8);
            let result = hash_bytes64(bytes, seed);
            return Int8Value::Value(result);
        }
    }
    Int8Value::Unknown
}

