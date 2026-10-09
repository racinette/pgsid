pub fn sql__pg_catalog__enum_eq__w63e(left: EnumValue, right: EnumValue) -> BoolValue {
    if let EnumValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let EnumValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == EnumValue::Unknown || right == EnumValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == EnumValue::Null || right == EnumValue::Null {
        return BoolValue::Null;
    }
    if let EnumValue::Value(left_value) = left {
        if let EnumValue::Value(right_value) = right {
            return BoolValue::Value(left_value.ordinal == right_value.ordinal);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__enum_ne__tph2(left: EnumValue, right: EnumValue) -> BoolValue {
    if let EnumValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let EnumValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == EnumValue::Unknown || right == EnumValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == EnumValue::Null || right == EnumValue::Null {
        return BoolValue::Null;
    }
    if let EnumValue::Value(left_value) = left {
        if let EnumValue::Value(right_value) = right {
            return BoolValue::Value(left_value.ordinal != right_value.ordinal);
        }
    }
    BoolValue::Unknown
}
