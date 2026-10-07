fn integer_hash_fold(value: i64) -> i64 {
    let lower = value as i32;
    let mut low = lower as i64;
    if low < 0i64 {
        low = low + 4294967296i64;
    }
    let mut high = value / 4294967296i64;
    if value < 0i64 && value % 4294967296i64 != 0i64 {
        high = high - 1i64;
    }
    if high < 0i64 {
        high = high + 4294967296i64;
    }
    if value < 0i64 {
        high = 4294967295i64 - high;
    }
    hash_xor(low, high)
}

fn integer_hash_extended(input: Int8Value, seed: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    if input == Int8Value::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if input == Int8Value::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(value) = input {
        if let Int8Value::Value(initial) = seed {
            let mut folded = integer_hash_fold(value);
            let mut bytes: Vec<HashByte> = Vec::new();
            let mut count: i32 = 0;
            while count < 4 {
                let byte = folded % 256i64;
                bytes.push(HashByte { value: byte });
                folded = folded / 256i64;
                count = count + 1;
            }
            return Int8Value::Value(hash_bytes64(bytes, initial));
        }
    }
    Int8Value::Unknown
}

fn integer_hash(input: Int8Value) -> Int4Value {
    let result = integer_hash_extended(input, Int8Value::Value(0i64));
    if let Int8Value::Error(error) = result {
        return Int4Value::Error(error);
    }
    if result == Int8Value::Unknown {
        return Int4Value::Unknown;
    }
    if result == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(value) = result {
        return Int4Value::Value(value as i32);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashint2__076p(input: Int2Value) -> Int4Value {
    let widened = sql__pg_catalog__int8__sxtp(input);
    integer_hash(widened)
}

pub fn sql__pg_catalog__hashint2extended__u33n(input: Int2Value, seed: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__sxtp(input);
    integer_hash_extended(widened, seed)
}

pub fn sql__pg_catalog__hashint4__zr00(input: Int4Value) -> Int4Value {
    let widened = sql__pg_catalog__int8__mzac(input);
    integer_hash(widened)
}

pub fn sql__pg_catalog__hashint4extended__xf6v(input: Int4Value, seed: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(input);
    integer_hash_extended(widened, seed)
}

pub fn sql__pg_catalog__hashint8__3wid(input: Int8Value) -> Int4Value {
    let widened = input;
    integer_hash(widened)
}

pub fn sql__pg_catalog__hashint8extended__frvh(input: Int8Value, seed: Int8Value) -> Int8Value {
    let widened = input;
    integer_hash_extended(widened, seed)
}

pub fn sql__pg_catalog__hashbool__82il(input: BoolValue) -> Int4Value {
    let widened = sql__pg_catalog__int8__mzac(sql__pg_catalog__int4__i3jf(input));
    integer_hash(widened)
}

pub fn sql__pg_catalog__hashboolextended__hsk8(input: BoolValue, seed: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(sql__pg_catalog__int4__i3jf(input));
    integer_hash_extended(widened, seed)
}
