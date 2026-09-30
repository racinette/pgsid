pub fn sql__pg_catalog__booleq__y6qu(left: BoolValue, right: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__boolne__zlce(left: BoolValue, right: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__boollt__cgkk(left: BoolValue, right: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == false && right_value == true);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__boolle__0cme(left: BoolValue, right: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == false || right_value == true);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__boolgt__6vb2(left: BoolValue, right: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == true && right_value == false);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__boolge__gviq(left: BoolValue, right: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(left_value) = left {
        if let BoolValue::Value(right_value) = right {
            return BoolValue::Value(left_value == true || right_value == false);
        }
    }
    BoolValue::Unknown
}
