pub fn sql__pg_catalog__booleq__y6qu(left: BoolValue, right: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_13_4);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__boolne__zlce(left: BoolValue, right: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_39_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_39_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_39_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_39_4);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__boollt__cgkk(left: BoolValue, right: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_65_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_65_4 < 1 { condition_flavor_65_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_65_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_65_4 < 1 { condition_flavor_65_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_65_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_65_4);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == false && right_value == true);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__boolle__0cme(left: BoolValue, right: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_91_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_91_4 < 1 { condition_flavor_91_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_91_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_91_4 < 1 { condition_flavor_91_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_91_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_91_4);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == false || right_value == true);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__boolgt__6vb2(left: BoolValue, right: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_117_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_117_4 < 1 { condition_flavor_117_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_117_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_117_4 < 1 { condition_flavor_117_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_117_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_117_4);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == true && right_value == false);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__boolge__gviq(left: BoolValue, right: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_143_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_143_4 < 1 { condition_flavor_143_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_143_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_143_4 < 1 { condition_flavor_143_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_143_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_143_4);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == true || right_value == false);
        }
    }
    bool_unresolved(unresolved_flavor)
}
