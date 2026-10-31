pub fn sql__pg_catalog__bpchar_larger__clri(left: TextValue, right: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    let compared = text_binary_compare(left.clone(), right.clone(), true);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return text_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, true);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left.clone(), right.clone(), true);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return text_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left.clone(), right.clone(), false);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return text_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left, right, false);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return bool_unresolved(unresolved_flavor);
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
    let compared = text_binary_compare(left.clone(), right.clone(), false);
    if let Int4Value::Error(error) = compared {
        return TextValue::Error(error);
    }
    if compared == Int4Value::Unknown {
        return text_unresolved(unresolved_flavor);
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
