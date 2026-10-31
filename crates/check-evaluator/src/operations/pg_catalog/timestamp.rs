pub fn sql__pg_catalog__timestamp_eq__jd79(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_16_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_16_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_16_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_16_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_ge__80hi(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_45_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_45_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_45_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_45_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_gt__hxfo(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_74_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_74_4 < 1 { condition_flavor_74_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_74_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_74_4 < 1 { condition_flavor_74_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_74_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_74_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_le__1qj4(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_103_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_103_4 < 1 { condition_flavor_103_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_103_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_103_4 < 1 { condition_flavor_103_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_103_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_103_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_lt__ogss(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_132_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_132_4 < 1 { condition_flavor_132_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_132_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_132_4 < 1 { condition_flavor_132_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_132_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_132_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_ne__qsye(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_161_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = left { if condition_flavor_161_4 < 1 { condition_flavor_161_4 = 1; }; }; if let TimestampValue::Unimplemented = left { condition_flavor_161_4 = 2; }; if let TimestampValue::Unknown = right { if condition_flavor_161_4 < 1 { condition_flavor_161_4 = 1; }; }; if let TimestampValue::Unimplemented = right { condition_flavor_161_4 = 2; }; if (left == TimestampValue::Unknown || left == TimestampValue::Unimplemented) || (right == TimestampValue::Unknown || right == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_161_4);
    }
    if left == TimestampValue::Null || right == TimestampValue::Null {
        return BoolValue::Null;
    }
    if let TimestampValue::Value(left_value) = left {
        if let TimestampValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}
