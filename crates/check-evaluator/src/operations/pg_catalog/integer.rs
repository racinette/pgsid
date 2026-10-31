pub fn sql__pg_catalog__int4gt__5vlv(left: Int4Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_16_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_16_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_16_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_16_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value > right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4eq__lrxe(left: Int4Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_42_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_42_4 < 1 { condition_flavor_42_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_42_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_42_4 < 1 { condition_flavor_42_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_42_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_42_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value == right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4ge__2xvk(left: Int4Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_68_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_68_4 < 1 { condition_flavor_68_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_68_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_68_4 < 1 { condition_flavor_68_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_68_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_68_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value >= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4le__9wb6(left: Int4Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_94_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_94_4 < 1 { condition_flavor_94_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_94_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_94_4 < 1 { condition_flavor_94_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_94_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_94_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value <= right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4lt__9gej(left: Int4Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_120_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_120_4 < 1 { condition_flavor_120_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_120_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_120_4 < 1 { condition_flavor_120_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_120_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_120_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value < right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4ne__qhun(left: Int4Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_146_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_146_4 < 1 { condition_flavor_146_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_146_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_146_4 < 1 { condition_flavor_146_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_146_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_146_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            return BoolValue::Value(left_value != right_value);
        }
    }
    bool_unresolved(unresolved_flavor)
}

const SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE: u32 = 3452547;

pub fn sql__pg_catalog__int4pl__sj3s(left: Int4Value, right: Int4Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    let mut condition_flavor_174_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_174_4 < 1 { condition_flavor_174_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_174_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_174_4 < 1 { condition_flavor_174_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_174_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_174_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let min_value = -2147483647 - 1;
            if right_value > 0 && left_value > 2147483647 - right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if right_value < 0 && left_value < min_value - right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int4Value::Value(left_value + right_value);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4mi__dtqk(left: Int4Value, right: Int4Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    let mut condition_flavor_207_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_207_4 < 1 { condition_flavor_207_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_207_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_207_4 < 1 { condition_flavor_207_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_207_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_207_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let min_value = -2147483647 - 1;
            if right_value < 0 && left_value > 2147483647 + right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if right_value > 0 && left_value < min_value + right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int4Value::Value(left_value - right_value);
        }
    }
    int4_unresolved(unresolved_flavor)
}

const SQLSTATE_DIVISION_BY_ZERO: u32 = 3452582;

pub fn sql__pg_catalog__int4mul__284v(left: Int4Value, right: Int4Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    let mut condition_flavor_242_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_242_4 < 1 { condition_flavor_242_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_242_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_242_4 < 1 { condition_flavor_242_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_242_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_242_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let min_value = -2147483647 - 1;
            if left_value > 0 && right_value > 0 && left_value > 2147483647 / right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if left_value > 0 && right_value < 0 && right_value < min_value / left_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if left_value < 0 && right_value > 0 && left_value < min_value / right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            if left_value < 0 && right_value < 0 && left_value < 2147483647 / right_value {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int4Value::Value(left_value * right_value);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4div__8ogr(left: Int4Value, right: Int4Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    let mut condition_flavor_281_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_281_4 < 1 { condition_flavor_281_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_281_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_281_4 < 1 { condition_flavor_281_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_281_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_281_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            if right_value == 0 {
                return Int4Value::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
            }
            if left_value == -2147483647 - 1 && right_value == -1 {
                return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
            }
            return Int4Value::Value(left_value / right_value);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4mod__j4pe(left: Int4Value, right: Int4Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    let mut condition_flavor_313_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_313_4 < 1 { condition_flavor_313_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_313_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_313_4 < 1 { condition_flavor_313_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_313_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_313_4);
    }
    if let Int4Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            if right_value == 0 {
                return Int4Value::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
            }
            if right_value == -1 {
                return Int4Value::Value(0);
            }
            return Int4Value::Value(left_value % right_value);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__abs__5ajw(input: Int4Value) -> Int4Value {
    if let Int4Value::Value(value) = input {
        if value == -2147483647 - 1 {
            return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        if value < 0 {
            return Int4Value::Value(0 - value);
        }
    }
    input
}
