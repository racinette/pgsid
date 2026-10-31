pub fn sql__pg_catalog__int48lt__65ji(left: Int4Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_16_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_16_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_16_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_16_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left < right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int84lt__z0bo(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_43_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_43_4 < 1 { condition_flavor_43_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_43_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_43_4 < 1 { condition_flavor_43_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_43_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_43_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value < wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8lt__cryd(left: Int8Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_70_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_70_4 < 1 { condition_flavor_70_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_70_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_70_4 < 1 { condition_flavor_70_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_70_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_70_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int48le__532p(left: Int4Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_96_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_96_4 < 1 { condition_flavor_96_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_96_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_96_4 < 1 { condition_flavor_96_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_96_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_96_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left <= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int84le__0gdr(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_123_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_123_4 < 1 { condition_flavor_123_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_123_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_123_4 < 1 { condition_flavor_123_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_123_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_123_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value <= wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8le__9fr4(left: Int8Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_150_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_150_4 < 1 { condition_flavor_150_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_150_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_150_4 < 1 { condition_flavor_150_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_150_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_150_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int48ne__inar(left: Int4Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_176_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_176_4 < 1 { condition_flavor_176_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_176_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_176_4 < 1 { condition_flavor_176_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_176_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_176_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int84ne__6b8h(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_203_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_203_4 < 1 { condition_flavor_203_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_203_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_203_4 < 1 { condition_flavor_203_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_203_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_203_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value != wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8ne__ur2k(left: Int8Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_230_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_230_4 < 1 { condition_flavor_230_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_230_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_230_4 < 1 { condition_flavor_230_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_230_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_230_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int48eq__7ot5(left: Int4Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_256_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_256_4 < 1 { condition_flavor_256_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_256_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_256_4 < 1 { condition_flavor_256_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_256_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_256_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int84eq__bnoq(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_283_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_283_4 < 1 { condition_flavor_283_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_283_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_283_4 < 1 { condition_flavor_283_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_283_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_283_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value == wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8eq__jdhd(left: Int8Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_310_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_310_4 < 1 { condition_flavor_310_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_310_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_310_4 < 1 { condition_flavor_310_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_310_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_310_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int48gt__srgr(left: Int4Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_336_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_336_4 < 1 { condition_flavor_336_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_336_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_336_4 < 1 { condition_flavor_336_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_336_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_336_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left > right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int84gt__p7f5(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_363_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_363_4 < 1 { condition_flavor_363_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_363_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_363_4 < 1 { condition_flavor_363_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_363_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_363_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value > wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8gt__3ehj(left: Int8Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_390_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_390_4 < 1 { condition_flavor_390_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_390_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_390_4 < 1 { condition_flavor_390_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_390_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_390_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int48ge__d53z(left: Int4Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_416_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_416_4 < 1 { condition_flavor_416_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_416_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_416_4 < 1 { condition_flavor_416_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_416_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_416_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            let wide_left = left_value as i64;
            return BoolValue::Value(wide_left >= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int84ge__biti(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_443_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_443_4 < 1 { condition_flavor_443_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_443_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_443_4 < 1 { condition_flavor_443_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_443_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_443_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value >= wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8ge__qfhv(left: Int8Value, right: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_470_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_470_4 < 1 { condition_flavor_470_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_470_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_470_4 < 1 { condition_flavor_470_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_470_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_470_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int8Value::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}
