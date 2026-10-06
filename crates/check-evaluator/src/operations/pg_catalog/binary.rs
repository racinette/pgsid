pub fn sql__pg_catalog__byteaeq__z0yh(left: ByteaValue, right: ByteaValue) -> BoolValue {
    if let ByteaValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return BoolValue::Null;
    }
    if let ByteaValue::Value(a) = left {
        if let ByteaValue::Value(b) = right {
            return BoolValue::Value(a == b);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__byteane__volo(left: ByteaValue, right: ByteaValue) -> BoolValue {
    if let ByteaValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return BoolValue::Null;
    }
    if let ByteaValue::Value(a) = left {
        if let ByteaValue::Value(b) = right {
            return BoolValue::Value(a != b);
        }
    }
    BoolValue::Unknown
}
