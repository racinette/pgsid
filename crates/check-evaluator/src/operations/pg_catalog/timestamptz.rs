pub fn sql__pg_catalog__timestamptz_eq__k4n3(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
