pub fn sql__pg_catalog__int4gt__5vlv(left: Int4Value, right: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int4eq__lrxe(left: Int4Value, right: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int4ge__2xvk(left: Int4Value, right: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int4le__9wb6(left: Int4Value, right: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int4lt__9gej(left: Int4Value, right: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int4ne__qhun(left: Int4Value, right: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    BoolValue::Unknown
}

const SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE: u32 = 3452547;

pub fn sql__pg_catalog__int4pl__sj3s(left: Int4Value, right: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let min_value = -2147483647 - 1;
            if right_value > 0 && left_value > 2147483647 - right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if right_value < 0 && left_value < min_value - right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int4Value::Value(left_value + right_value);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int4mi__dtqk(left: Int4Value, right: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let min_value = -2147483647 - 1;
            if right_value < 0 && left_value > 2147483647 + right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if right_value > 0 && left_value < min_value + right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int4Value::Value(left_value - right_value);
        }
    }
    Int4Value::Unknown
}
