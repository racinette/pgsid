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

pub fn sql__pg_catalog__enum_cmp__hjt6(left: EnumValue, right: EnumValue) -> Int4Value {
    if let EnumValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let EnumValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == EnumValue::Unknown || right == EnumValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == EnumValue::Null || right == EnumValue::Null {
        return Int4Value::Null;
    }
    if let EnumValue::Value(left_value) = left {
        if let EnumValue::Value(right_value) = right {
            if left_value.ordinal < right_value.ordinal {
                return Int4Value::Value(-1);
            }
            if left_value.ordinal > right_value.ordinal {
                return Int4Value::Value(1);
            }
            return Int4Value::Value(0);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__enum_lt__5af2(left: EnumValue, right: EnumValue) -> BoolValue {
    let comparison = sql__pg_catalog__enum_cmp__hjt6(left, right);
    sql__pg_catalog__int4lt__9gej(comparison, make_int4_value(0))
}

pub fn sql__pg_catalog__enum_le__xl1v(left: EnumValue, right: EnumValue) -> BoolValue {
    let comparison = sql__pg_catalog__enum_cmp__hjt6(left, right);
    sql__pg_catalog__int4le__9wb6(comparison, make_int4_value(0))
}

pub fn sql__pg_catalog__enum_gt__1jsh(left: EnumValue, right: EnumValue) -> BoolValue {
    let comparison = sql__pg_catalog__enum_cmp__hjt6(left, right);
    sql__pg_catalog__int4gt__5vlv(comparison, make_int4_value(0))
}

pub fn sql__pg_catalog__enum_ge__0b8h(left: EnumValue, right: EnumValue) -> BoolValue {
    let comparison = sql__pg_catalog__enum_cmp__hjt6(left, right);
    sql__pg_catalog__int4ge__2xvk(comparison, make_int4_value(0))
}

pub fn sql__pg_catalog__enum_larger__em2s(left: EnumValue, right: EnumValue) -> EnumValue {
    let comparison = sql__pg_catalog__enum_cmp__hjt6(left, right);
    if let Int4Value::Error(error) = comparison {
        return EnumValue::Error(error);
    }
    if comparison == Int4Value::Null {
        return EnumValue::Null;
    }
    if let Int4Value::Value(value) = comparison {
        if value > 0 {
            return left;
        }
        return right;
    }
    EnumValue::Unknown
}

pub fn sql__pg_catalog__enum_smaller__whhx(left: EnumValue, right: EnumValue) -> EnumValue {
    let comparison = sql__pg_catalog__enum_cmp__hjt6(left, right);
    if let Int4Value::Error(error) = comparison {
        return EnumValue::Error(error);
    }
    if comparison == Int4Value::Null {
        return EnumValue::Null;
    }
    if let Int4Value::Value(value) = comparison {
        if value < 0 {
            return left;
        }
        return right;
    }
    EnumValue::Unknown
}

pub fn sql__pg_catalog__hashenum__z4zk(input: EnumValue) -> Int4Value {
    if let EnumValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == EnumValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == EnumValue::Null {
        return Int4Value::Null;
    }
    if let EnumValue::Value(value) = input {
        if value.label_oid == 0i64 {
            return Int4Value::Unknown;
        }
        let word = value.label_oid as i32;
        return sql__pg_catalog__hashint4__zr00(make_int4_value(word));
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hashenumextended__18hh(input: EnumValue, seed: Int8Value) -> Int8Value {
    if let EnumValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    if input == EnumValue::Unknown || seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if input == EnumValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let EnumValue::Value(value) = input {
        if value.label_oid == 0i64 {
            return Int8Value::Unknown;
        }
        let word = value.label_oid as i32;
        return sql__pg_catalog__hashint4extended__xf6v(make_int4_value(word), seed);
    }
    Int8Value::Unknown
}
