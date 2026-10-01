pub fn sql__pg_catalog__timestamptz_eq__k4n3(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_ge__p2rz(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_gt__89jo(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_le__0urp(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_lt__b2w5(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_ne__4iy1(
    left: TimestamptzValue,
    right: TimestamptzValue,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == TimestamptzValue::Unknown || right == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == TimestamptzValue::Null || right == TimestamptzValue::Null {
        return BoolValue::Null;
    }
    if let TimestamptzValue::Value(left_value) = left {
        if let TimestamptzValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    BoolValue::Unknown
}
