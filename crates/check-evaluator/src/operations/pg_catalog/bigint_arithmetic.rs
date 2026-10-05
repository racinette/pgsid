pub fn sql__pg_catalog__int8pl__1v1h(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            if right_value > 0i64 && left_value > 9223372036854775807i64 - right_value {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if right_value < 0i64 && left_value < -9223372036854775808i64 - right_value {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int8Value::Value(left_value + right_value);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int8mi__jasl(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            if right_value < 0i64 && left_value > 9223372036854775807i64 + right_value {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if right_value > 0i64 && left_value < -9223372036854775808i64 + right_value {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int8Value::Value(left_value - right_value);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int8um__cthl(input: Int8Value) -> Int8Value {
    if let Int8Value::Value(payload) = input {
        if payload == -9223372036854775808i64 {
            return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        return Int8Value::Value(0i64 - payload);
    }
    input
}

pub fn sql__pg_catalog__int8up__9qey(input: Int8Value) -> Int8Value {
    input
}

pub fn sql__pg_catalog__int8abs__cmj6(input: Int8Value) -> Int8Value {
    if let Int8Value::Value(payload) = input {
        if payload < 0i64 {
            return sql__pg_catalog__int8um__cthl(input);
        }
    }
    input
}

pub fn sql__pg_catalog__abs__36t4(input: Int8Value) -> Int8Value {
    sql__pg_catalog__int8abs__cmj6(input)
}

pub fn sql__pg_catalog__int28pl__bh5j(left: Int2Value, right: Int8Value) -> Int8Value {
    let widened = int2_to_int8(left);
    sql__pg_catalog__int8pl__1v1h(widened, right)
}

pub fn sql__pg_catalog__int82pl__e0uq(left: Int8Value, right: Int2Value) -> Int8Value {
    let widened = int2_to_int8(right);
    sql__pg_catalog__int8pl__1v1h(left, widened)
}

pub fn sql__pg_catalog__int28mi__ujbh(left: Int2Value, right: Int8Value) -> Int8Value {
    let widened = int2_to_int8(left);
    sql__pg_catalog__int8mi__jasl(widened, right)
}

pub fn sql__pg_catalog__int82mi__uovj(left: Int8Value, right: Int2Value) -> Int8Value {
    let widened = int2_to_int8(right);
    sql__pg_catalog__int8mi__jasl(left, widened)
}

pub fn sql__pg_catalog__int48pl__y1r4(left: Int4Value, right: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(left);
    sql__pg_catalog__int8pl__1v1h(widened, right)
}

pub fn sql__pg_catalog__int84pl__2n77(left: Int8Value, right: Int4Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(right);
    sql__pg_catalog__int8pl__1v1h(left, widened)
}

pub fn sql__pg_catalog__int48mi__neop(left: Int4Value, right: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(left);
    sql__pg_catalog__int8mi__jasl(widened, right)
}

pub fn sql__pg_catalog__int84mi__867a(left: Int8Value, right: Int4Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(right);
    sql__pg_catalog__int8mi__jasl(left, widened)
}

pub fn sql__pg_catalog__int8mul__6t1m(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            if left_value > 0i64
                && right_value > 0i64
                && left_value > 9223372036854775807i64 / right_value
            {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if left_value > 0i64
                && right_value < 0i64
                && right_value < -9223372036854775808i64 / left_value
            {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if left_value < 0i64
                && right_value > 0i64
                && left_value < -9223372036854775808i64 / right_value
            {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if left_value < 0i64
                && right_value < 0i64
                && left_value < 9223372036854775807i64 / right_value
            {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int8Value::Value(left_value * right_value);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int8div__8s66(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            if right_value == 0i64 {
                return Int8Value::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
            }
            if left_value == -9223372036854775808i64 && right_value == -1i64 {
                return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int8Value::Value(left_value / right_value);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int8mod__2t8f(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            if right_value == 0i64 {
                return Int8Value::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
            }
            if right_value == -1i64 {
                return Int8Value::Value(0i64);
            }
            return Int8Value::Value(left_value % right_value);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int28mul__lmrp(left: Int2Value, right: Int8Value) -> Int8Value {
    let widened = int2_to_int8(left);
    sql__pg_catalog__int8mul__6t1m(widened, right)
}

pub fn sql__pg_catalog__int28div__yfcw(left: Int2Value, right: Int8Value) -> Int8Value {
    let widened = int2_to_int8(left);
    sql__pg_catalog__int8div__8s66(widened, right)
}

pub fn sql__pg_catalog__int82mul__60eu(left: Int8Value, right: Int2Value) -> Int8Value {
    let widened = int2_to_int8(right);
    sql__pg_catalog__int8mul__6t1m(left, widened)
}

pub fn sql__pg_catalog__int82div__bfmp(left: Int8Value, right: Int2Value) -> Int8Value {
    let widened = int2_to_int8(right);
    sql__pg_catalog__int8div__8s66(left, widened)
}

pub fn sql__pg_catalog__int48mul__kykj(left: Int4Value, right: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(left);
    sql__pg_catalog__int8mul__6t1m(widened, right)
}

pub fn sql__pg_catalog__int48div__xx1r(left: Int4Value, right: Int8Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(left);
    sql__pg_catalog__int8div__8s66(widened, right)
}

pub fn sql__pg_catalog__int84mul__636w(left: Int8Value, right: Int4Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(right);
    sql__pg_catalog__int8mul__6t1m(left, widened)
}

pub fn sql__pg_catalog__int84div__w65p(left: Int8Value, right: Int4Value) -> Int8Value {
    let widened = sql__pg_catalog__int8__mzac(right);
    sql__pg_catalog__int8div__8s66(left, widened)
}
