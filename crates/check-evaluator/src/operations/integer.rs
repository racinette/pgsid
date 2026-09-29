fn sql__pg_catalog__int4gt__5vlv(left: Int4Value, right: Int4Value) -> BoolValue {
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

fn sql__pg_catalog__int4eq__lrxe(left: Int4Value, right: Int4Value) -> BoolValue {
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

fn sql__pg_catalog__int4ge__2xvk(left: Int4Value, right: Int4Value) -> BoolValue {
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

fn sql__pg_catalog__int4le__9wb6(left: Int4Value, right: Int4Value) -> BoolValue {
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

fn sql__pg_catalog__int4lt__9gej(left: Int4Value, right: Int4Value) -> BoolValue {
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

fn sql__pg_catalog__int4ne__qhun(left: Int4Value, right: Int4Value) -> BoolValue {
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
