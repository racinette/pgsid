pub fn enum_to_text(input: EnumValue, labels: &str, count: i32) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = input { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = input { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let EnumValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let EnumValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if (input == EnumValue::Unknown || input == EnumValue::Unimplemented) {
        return text_unresolved(condition_flavor_8_4);
    }
    if input == EnumValue::Null {
        return TextValue::Null;
    }
    if let EnumValue::Value(value) = input {
        // An ordinal outside the captured labels names a label only the database knows.
        if value.ordinal < 0 || value.ordinal >= count {
            return text_unresolved(resolution_context(unresolved_flavor));
        }
        let chars: Vec<char> = labels.chars().collect();
        let mut index: usize = 0;
        let mut ordinal: i32 = 0;
        let mut output = String::new();
        while index < chars.len() {
            let character = chars[index];
            if character == '\0' {
                if ordinal == value.ordinal {
                    return TextValue::Value(output);
                }
                ordinal = ordinal + 1;
            } else if ordinal == value.ordinal {
                output.push(character);
            }
            index += 1;
        }
        if ordinal == value.ordinal {
            return TextValue::Value(output);
        }
    }
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__enum_eq__w63e(left: EnumValue, right: EnumValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = left { unresolved_flavor = 1; };
    if let EnumValue::Unknown = right { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = left { unresolved_flavor = 2; };
    if let EnumValue::Unimplemented = right { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let EnumValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_53_4: i32 = unresolved_flavor; if let EnumValue::Unknown = left { if condition_flavor_53_4 < 1 { condition_flavor_53_4 = 1; }; }; if let EnumValue::Unimplemented = left { condition_flavor_53_4 = 2; }; if let EnumValue::Unknown = right { if condition_flavor_53_4 < 1 { condition_flavor_53_4 = 1; }; }; if let EnumValue::Unimplemented = right { condition_flavor_53_4 = 2; }; if (left == EnumValue::Unknown || left == EnumValue::Unimplemented) || (right == EnumValue::Unknown || right == EnumValue::Unimplemented) {
        return bool_unresolved(condition_flavor_53_4);
    }
    if left == EnumValue::Null || right == EnumValue::Null {
        return BoolValue::Null;
    }
    if let EnumValue::Value(left_value) = left {
        if let EnumValue::Value(right_value) = right {
            return BoolValue::Value(left_value.ordinal == right_value.ordinal);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__enum_ne__tph2(left: EnumValue, right: EnumValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = left { unresolved_flavor = 1; };
    if let EnumValue::Unknown = right { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = left { unresolved_flavor = 2; };
    if let EnumValue::Unimplemented = right { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let EnumValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_79_4: i32 = unresolved_flavor; if let EnumValue::Unknown = left { if condition_flavor_79_4 < 1 { condition_flavor_79_4 = 1; }; }; if let EnumValue::Unimplemented = left { condition_flavor_79_4 = 2; }; if let EnumValue::Unknown = right { if condition_flavor_79_4 < 1 { condition_flavor_79_4 = 1; }; }; if let EnumValue::Unimplemented = right { condition_flavor_79_4 = 2; }; if (left == EnumValue::Unknown || left == EnumValue::Unimplemented) || (right == EnumValue::Unknown || right == EnumValue::Unimplemented) {
        return bool_unresolved(condition_flavor_79_4);
    }
    if left == EnumValue::Null || right == EnumValue::Null {
        return BoolValue::Null;
    }
    if let EnumValue::Value(left_value) = left {
        if let EnumValue::Value(right_value) = right {
            return BoolValue::Value(left_value.ordinal != right_value.ordinal);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__enum_cmp__hjt6(left: EnumValue, right: EnumValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = left { unresolved_flavor = 1; };
    if let EnumValue::Unknown = right { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = left { unresolved_flavor = 2; };
    if let EnumValue::Unimplemented = right { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let EnumValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_105_4: i32 = unresolved_flavor; if let EnumValue::Unknown = left { if condition_flavor_105_4 < 1 { condition_flavor_105_4 = 1; }; }; if let EnumValue::Unimplemented = left { condition_flavor_105_4 = 2; }; if let EnumValue::Unknown = right { if condition_flavor_105_4 < 1 { condition_flavor_105_4 = 1; }; }; if let EnumValue::Unimplemented = right { condition_flavor_105_4 = 2; }; if (left == EnumValue::Unknown || left == EnumValue::Unimplemented) || (right == EnumValue::Unknown || right == EnumValue::Unimplemented) {
        return int4_unresolved(condition_flavor_105_4);
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
    int4_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = left { unresolved_flavor = 1; };
    if let EnumValue::Unknown = right { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = left { unresolved_flavor = 2; };
    if let EnumValue::Unimplemented = right { unresolved_flavor = 2; };
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
    let mut local_flavor_164_4: i32 = unresolved_flavor; if let Int4Value::Unknown = comparison { if local_flavor_164_4 < 1 { local_flavor_164_4 = 1; }; }; if let Int4Value::Unimplemented = comparison { local_flavor_164_4 = 2; }; enum_unresolved(local_flavor_164_4)
}

pub fn sql__pg_catalog__enum_smaller__whhx(left: EnumValue, right: EnumValue) -> EnumValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = left { unresolved_flavor = 1; };
    if let EnumValue::Unknown = right { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = left { unresolved_flavor = 2; };
    if let EnumValue::Unimplemented = right { unresolved_flavor = 2; };
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
    let mut local_flavor_186_4: i32 = unresolved_flavor; if let Int4Value::Unknown = comparison { if local_flavor_186_4 < 1 { local_flavor_186_4 = 1; }; }; if let Int4Value::Unimplemented = comparison { local_flavor_186_4 = 2; }; enum_unresolved(local_flavor_186_4)
}

pub fn sql__pg_catalog__hashenum__z4zk(input: EnumValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = input { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = input { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_196_4: i32 = unresolved_flavor; if let EnumValue::Unknown = input { if condition_flavor_196_4 < 1 { condition_flavor_196_4 = 1; }; }; if let EnumValue::Unimplemented = input { condition_flavor_196_4 = 2; }; if (input == EnumValue::Unknown || input == EnumValue::Unimplemented) {
        return int4_unresolved(condition_flavor_196_4);
    }
    if input == EnumValue::Null {
        return Int4Value::Null;
    }
    if let EnumValue::Value(value) = input {
        // The hash reads the label's deployment OID.
        if value.label_oid == 0i64 {
            return int4_unresolved(resolution_context(unresolved_flavor));
        }
        let word = value.label_oid as i32;
        return sql__pg_catalog__hashint4__zr00(make_int4_value(word));
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashenumextended__18hh(input: EnumValue, seed: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unknown = seed { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = seed { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_224_4: i32 = unresolved_flavor; if let EnumValue::Unknown = input { if condition_flavor_224_4 < 1 { condition_flavor_224_4 = 1; }; }; if let EnumValue::Unimplemented = input { condition_flavor_224_4 = 2; }; if let Int8Value::Unknown = seed { if condition_flavor_224_4 < 1 { condition_flavor_224_4 = 1; }; }; if let Int8Value::Unimplemented = seed { condition_flavor_224_4 = 2; }; if (input == EnumValue::Unknown || input == EnumValue::Unimplemented) || (seed == Int8Value::Unknown || seed == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_224_4);
    }
    if input == EnumValue::Null || seed == Int8Value::Null {
        return Int8Value::Null;
    }
    if let EnumValue::Value(value) = input {
        // The hash reads the label's deployment OID.
        if value.label_oid == 0i64 {
            return int8_unresolved(resolution_context(unresolved_flavor));
        }
        let word = value.label_oid as i32;
        return sql__pg_catalog__hashint4extended__xf6v(make_int4_value(word), seed);
    }
    int8_unresolved(unresolved_flavor)
}
