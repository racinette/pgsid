pub fn sql__pg_catalog__timestamptz_eq__k4n3(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_16_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_16_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_16_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_16_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_ge__p2rz(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_45_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_45_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_45_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_45_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_gt__89jo(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_74_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_74_4 < 1 { condition_flavor_74_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_74_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_74_4 < 1 { condition_flavor_74_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_74_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_74_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_le__0urp(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_103_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_103_4 < 1 { condition_flavor_103_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_103_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_103_4 < 1 { condition_flavor_103_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_103_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_103_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_lt__b2w5(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_132_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_132_4 < 1 { condition_flavor_132_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_132_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_132_4 < 1 { condition_flavor_132_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_132_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_132_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_ne__4iy1(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_161_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = left { if condition_flavor_161_4 < 1 { condition_flavor_161_4 = 1; }; }; if let TimestamptzValue::Unimplemented = left { condition_flavor_161_4 = 2; }; if let TimestamptzValue::Unknown = right { if condition_flavor_161_4 < 1 { condition_flavor_161_4 = 1; }; }; if let TimestamptzValue::Unimplemented = right { condition_flavor_161_4 = 2; }; if (left == TimestamptzValue::Unknown || left == TimestamptzValue::Unimplemented) || (right == TimestamptzValue::Unknown || right == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_161_4);
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}
