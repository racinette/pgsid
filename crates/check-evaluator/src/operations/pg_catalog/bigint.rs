pub fn sql__pg_catalog__int48lt__65ji(left: Int4Value, right: Int8Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left < right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int84lt__z0bo(left: Int8Value, right: Int4Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value < wide_right);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int8lt__cryd(left: Int8Value, right: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int48le__532p(left: Int4Value, right: Int8Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left <= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int84le__0gdr(left: Int8Value, right: Int4Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value <= wide_right);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int8le__9fr4(left: Int8Value, right: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int48ne__inar(left: Int4Value, right: Int8Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left != right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int84ne__6b8h(left: Int8Value, right: Int4Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value != wide_right);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int8ne__ur2k(left: Int8Value, right: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int48eq__7ot5(left: Int4Value, right: Int8Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left == right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int84eq__bnoq(left: Int8Value, right: Int4Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value == wide_right);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int8eq__jdhd(left: Int8Value, right: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int48gt__srgr(left: Int4Value, right: Int8Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left > right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int84gt__p7f5(left: Int8Value, right: Int4Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value > wide_right);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int8gt__3ehj(left: Int8Value, right: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int48ge__d53z(left: Int4Value, right: Int8Value) -> BoolValue {
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left >= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int84ge__biti(left: Int8Value, right: Int4Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value >= wide_right);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int8ge__qfhv(left: Int8Value, right: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    BoolValue::Unknown
}
