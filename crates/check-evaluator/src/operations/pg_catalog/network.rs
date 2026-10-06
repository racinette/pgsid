fn network_compare(left: NetworkValue, right: NetworkValue) -> Int4Value {
    if let NetworkValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return Int4Value::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family < b.family {
                return Int4Value::Value(-1);
            }
            if a.family > b.family {
                return Int4Value::Value(1);
            }
            let mut bits = a.prefix;
            if b.prefix < bits {
                bits = b.prefix;
            }
            let order = network_prefix_compare(a, b, bits);
            if order != 0 {
                return Int4Value::Value(order);
            }
            if a.prefix < b.prefix {
                return Int4Value::Value(-1);
            }
            if a.prefix > b.prefix {
                return Int4Value::Value(1);
            }
            let mut width: i32 = 32;
            if a.family == 6 {
                width = 128;
            }
            let full_order = network_prefix_compare(a, b, width);
            return Int4Value::Value(full_order);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__network_eq__i7hn(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_ne__vmql(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order != 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_lt__0kbr(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order < 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_le__n61s(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order <= 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_gt__i6x7(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order > 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_ge__q7pc(left: NetworkValue, right: NetworkValue) -> BoolValue {
    let result = network_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order >= 0);
    }
    BoolValue::Unknown
}

fn network_contains(left: NetworkValue, right: NetworkValue, strict: bool) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return BoolValue::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family || a.prefix < b.prefix {
                return BoolValue::Value(false);
            }
            if strict && a.prefix == b.prefix {
                return BoolValue::Value(false);
            }
            let order = network_prefix_compare(a, b, b.prefix);
            return BoolValue::Value(order == 0);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__network_sub__y7j2(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(left, right, true)
}

pub fn sql__pg_catalog__network_subeq__9psu(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(left, right, false)
}

pub fn sql__pg_catalog__network_sup__1zu4(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(right, left, true)
}

pub fn sql__pg_catalog__network_supeq__utj6(left: NetworkValue, right: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    network_contains(right, left, false)
}

pub fn sql__pg_catalog__network_overlap__zbdv(
    left: NetworkValue,
    right: NetworkValue,
) -> BoolValue {
    if let NetworkValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let NetworkValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == NetworkValue::Unknown || right == NetworkValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == NetworkValue::Null || right == NetworkValue::Null {
        return BoolValue::Null;
    }
    if let NetworkValue::Value(a) = left {
        if let NetworkValue::Value(b) = right {
            if a.family != b.family {
                return BoolValue::Value(false);
            }
            let mut bits = a.prefix;
            if b.prefix < bits {
                bits = b.prefix;
            }
            let order = network_prefix_compare(a, b, bits);
            return BoolValue::Value(order == 0);
        }
    }
    BoolValue::Unknown
}
