fn macaddr_compare(left: MacaddrValue, right: MacaddrValue) -> Int4Value {
    if let MacaddrValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let MacaddrValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == MacaddrValue::Unknown || right == MacaddrValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == MacaddrValue::Null || right == MacaddrValue::Null {
        return Int4Value::Null;
    }
    if let MacaddrValue::Value(a) = left {
        if let MacaddrValue::Value(b) = right {
            return Int4Value::Value(mac_address_compare(a, b));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__macaddr_eq__uthl(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let result = macaddr_compare(left, right);
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

pub fn sql__pg_catalog__macaddr_ne__etmb(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let result = macaddr_compare(left, right);
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

pub fn sql__pg_catalog__macaddr_lt__8vk5(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let result = macaddr_compare(left, right);
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

pub fn sql__pg_catalog__macaddr_le__6qq0(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let result = macaddr_compare(left, right);
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

pub fn sql__pg_catalog__macaddr_gt__4kss(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let result = macaddr_compare(left, right);
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

pub fn sql__pg_catalog__macaddr_ge__iuvk(left: MacaddrValue, right: MacaddrValue) -> BoolValue {
    let result = macaddr_compare(left, right);
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

pub fn sql__pg_catalog__macaddr_cmp__jv7y(left: MacaddrValue, right: MacaddrValue) -> Int4Value {
    macaddr_compare(left, right)
}
fn macaddr8_compare(left: Macaddr8Value, right: Macaddr8Value) -> Int4Value {
    if let Macaddr8Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Macaddr8Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Macaddr8Value::Unknown || right == Macaddr8Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Macaddr8Value::Null || right == Macaddr8Value::Null {
        return Int4Value::Null;
    }
    if let Macaddr8Value::Value(a) = left {
        if let Macaddr8Value::Value(b) = right {
            return Int4Value::Value(mac_address_compare(a, b));
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__macaddr8_eq__wy3p(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let result = macaddr8_compare(left, right);
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

pub fn sql__pg_catalog__macaddr8_ne__j20a(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let result = macaddr8_compare(left, right);
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

pub fn sql__pg_catalog__macaddr8_lt__5tsr(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let result = macaddr8_compare(left, right);
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

pub fn sql__pg_catalog__macaddr8_le__dmol(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let result = macaddr8_compare(left, right);
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

pub fn sql__pg_catalog__macaddr8_gt__o95h(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let result = macaddr8_compare(left, right);
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

pub fn sql__pg_catalog__macaddr8_ge__054u(left: Macaddr8Value, right: Macaddr8Value) -> BoolValue {
    let result = macaddr8_compare(left, right);
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

pub fn sql__pg_catalog__macaddr8_cmp__id7f(left: Macaddr8Value, right: Macaddr8Value) -> Int4Value {
    macaddr8_compare(left, right)
}
