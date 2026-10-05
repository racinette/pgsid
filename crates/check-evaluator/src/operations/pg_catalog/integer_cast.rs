pub fn sql__pg_catalog__int4__1z1k(input: Int2Value) -> Int4Value {
    int2_to_int4(input)
}

pub fn sql__pg_catalog__int8__sxtp(input: Int2Value) -> Int8Value {
    int2_to_int8(input)
}

pub fn sql__pg_catalog__int2__15a3(input: Int4Value) -> Int2Value {
    smallint_result(input)
}

pub fn sql__pg_catalog__int8__mzac(input: Int4Value) -> Int8Value {
    if let Int4Value::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == Int4Value::Null {
        return Int8Value::Null;
    }
    if let Int4Value::Value(payload) = input {
        let widened = payload as i64;
        return Int8Value::Value(widened);
    }
    Int8Value::Unknown
}
