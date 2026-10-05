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

pub fn sql__pg_catalog__int4__5ywh(input: Int8Value) -> Int4Value {
    if let Int8Value::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(payload) = input {
        if payload < -2147483648i64 || payload > 2147483647i64 {
            return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        let narrowed = payload as i32;
        return Int4Value::Value(narrowed);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int2__gmpv(input: Int8Value) -> Int2Value {
    if let Int8Value::Error(error) = input {
        return Int2Value::Error(error);
    }
    if input == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(payload) = input {
        if payload < -32768i64 || payload > 32767i64 {
            return Int2Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        let narrowed = payload as i32;
        return Int2Value::Value(narrowed);
    }
    Int2Value::Unknown
}
