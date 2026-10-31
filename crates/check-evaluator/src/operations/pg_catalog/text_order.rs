pub fn sql__pg_catalog__bpchar_larger__clri(left: TextValue, right: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left.clone(), right.clone(), true);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    let mut condition_flavor_11_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_11_4 < 1 { condition_flavor_11_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_11_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return text_unresolved(condition_flavor_11_4);
    }
    if compared == Int4Value::Null {
        return TextValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        if order >= 0 {
            return left;
        }
        return right;
    };
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bpchar_pattern_ge__dv6p(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_36_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_36_4 < 1 { condition_flavor_36_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_36_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_36_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order >= 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bpchar_pattern_gt__tnmi(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_58_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_58_4 < 1 { condition_flavor_58_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_58_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_58_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order > 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bpchar_pattern_le__5vh3(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_80_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_80_4 < 1 { condition_flavor_80_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_80_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_80_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order <= 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bpchar_pattern_lt__5798(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_102_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_102_4 < 1 { condition_flavor_102_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_102_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_102_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order < 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bpchar_smaller__0mnx(left: TextValue, right: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left.clone(), right.clone(), true);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    let mut condition_flavor_124_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_124_4 < 1 { condition_flavor_124_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_124_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return text_unresolved(condition_flavor_124_4);
    }
    if compared == Int4Value::Null {
        return TextValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        if order <= 0 {
            return left;
        }
        return right;
    };
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bpcharcmp__b8vl(left: TextValue, right: TextValue) -> Int4Value {
    text_binary_compare(left, right, true)
}

pub fn sql__pg_catalog__btbpchar_pattern_cmp__jjb6(left: TextValue, right: TextValue) -> Int4Value {
    text_binary_compare(left, right, true)
}

pub fn sql__pg_catalog__bttext_pattern_cmp__jgxm(left: TextValue, right: TextValue) -> Int4Value {
    text_binary_compare(left, right, false)
}

pub fn sql__pg_catalog__bttextcmp__puxw(left: TextValue, right: TextValue) -> Int4Value {
    text_binary_compare(left, right, false)
}

pub fn sql__pg_catalog__text_larger__ssmm(left: TextValue, right: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left.clone(), right.clone(), false);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    let mut condition_flavor_165_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_165_4 < 1 { condition_flavor_165_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_165_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return text_unresolved(condition_flavor_165_4);
    }
    if compared == Int4Value::Null {
        return TextValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        if order > 0 {
            return left;
        }
        return right;
    };
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_pattern_ge__v6bi(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_190_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_190_4 < 1 { condition_flavor_190_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_190_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_190_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order >= 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_pattern_gt__99dz(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_212_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_212_4 < 1 { condition_flavor_212_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_212_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_212_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order > 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_pattern_le__dpvx(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_234_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_234_4 < 1 { condition_flavor_234_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_234_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_234_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order <= 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_pattern_lt__qftf(left: TextValue, right: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_256_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_256_4 < 1 { condition_flavor_256_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_256_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_256_4);
    }
    if compared == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        return BoolValue::Value(order < 0);
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__text_smaller__t2nd(left: TextValue, right: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    let compared = text_binary_compare(left.clone(), right.clone(), false);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    let mut condition_flavor_278_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_278_4 < 1 { condition_flavor_278_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_278_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
        return text_unresolved(condition_flavor_278_4);
    }
    if compared == Int4Value::Null {
        return TextValue::Null;
    }
    if let Int4Value::Value(order) = compared {
        if order < 0 {
            return left;
        }
        return right;
    };
    text_unresolved(unresolved_flavor)
}
