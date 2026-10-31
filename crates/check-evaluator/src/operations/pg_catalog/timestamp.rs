pub fn sql__pg_catalog__timestamp_eq__jd79(
    left: TimestampValue,
    right: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = left { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = right { unresolved_flavor = 1; };
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    if let TimestampValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestampValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestampValue::Unknown || right == TimestampValue::Unknown {
        return bool_unresolved(unresolved_flavor);
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
