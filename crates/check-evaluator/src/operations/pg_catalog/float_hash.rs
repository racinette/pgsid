fn float_hash_bytes(bits: i64) -> Vec<HashByte> {
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut word = bits;
    let mut count: i32 = 0;
    while count < 8 {
        let mut octet = word % 256i64;
        if octet < 0i64 {
            octet = octet + 256i64;
        };
        bytes.push(HashByte { value: octet });
        word = (word - octet) / 256i64;
        count = count + 1;
    }
    bytes
}

pub fn sql__pg_catalog__hashfloat8__p4el(input: Float8Value, byte_order: i32) -> Int4Value {
    if let Float8Value::Error(error) = input {
        return Int4Value::Error(error);
    };
    if input == Float8Value::Null {
        return Int4Value::Null;
    };
    if let Float8Value::Value(bits) = input {
        let value = float8_number(bits);
        if value != value {
            return Int4Value::Unknown;
        };
        if value == 0.0f64 {
            return Int4Value::Value(0);
        };
        let bytes = float_hash_bytes(bits);
        return hash_native32(bytes, byte_order, 8);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashfloat8extended__7sph(
    input: Float8Value,
    seed: Int8Value,
    byte_order: i32,
) -> Int8Value {
    if let Float8Value::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    };
    if input == Float8Value::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    };
    if input == Float8Value::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    };
    if let Float8Value::Value(bits) = input {
        if let Int8Value::Value(salt) = seed {
            let value = float8_number(bits);
            if value != value {
                return Int8Value::Unknown;
            };
            if value == 0.0f64 {
                return Int8Value::Value(salt);
            };
            let bytes = float_hash_bytes(bits);
            return hash_native64(bytes, salt, byte_order, 8);
        };
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__hashfloat4__vwxf(input: Float4Value, byte_order: i32) -> Int4Value {
    let widened = float4_widen(input);
    sql__pg_catalog__hashfloat8__p4el(widened, byte_order)
}

pub fn sql__pg_catalog__hashfloat4extended__ijgq(
    input: Float4Value,
    seed: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let widened = float4_widen(input);
    sql__pg_catalog__hashfloat8extended__7sph(widened, seed, byte_order)
}
