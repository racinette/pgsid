fn money_units(input: MoneyValue) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = input { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = input { unresolved_flavor = 2; };
    if let MoneyValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == MoneyValue::Null {
        return Int8Value::Null;
    };
    if let MoneyValue::Value(value) = input {
        return Int8Value::Value(value);
    };
    int8_unresolved(unresolved_flavor)
}
fn money_from_units(input: Int8Value) -> MoneyValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return MoneyValue::Error(error);
    };
    if input == Int8Value::Null {
        return MoneyValue::Null;
    };
    if let Int8Value::Value(value) = input {
        return make_money_value(value);
    };
    money_unresolved(unresolved_flavor)
}
fn money_compare(left: MoneyValue, right: MoneyValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = left { unresolved_flavor = 1; };
    if let MoneyValue::Unknown = right { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = left { unresolved_flavor = 2; };
    if let MoneyValue::Unimplemented = right { unresolved_flavor = 2; };
    if let MoneyValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let MoneyValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    let mut condition_flavor_43_4: i32 = unresolved_flavor; if let MoneyValue::Unknown = left { if condition_flavor_43_4 < 1 { condition_flavor_43_4 = 1; }; }; if let MoneyValue::Unimplemented = left { condition_flavor_43_4 = 2; }; if let MoneyValue::Unknown = right { if condition_flavor_43_4 < 1 { condition_flavor_43_4 = 1; }; }; if let MoneyValue::Unimplemented = right { condition_flavor_43_4 = 2; }; if (left == MoneyValue::Unknown || left == MoneyValue::Unimplemented) || (right == MoneyValue::Unknown || right == MoneyValue::Unimplemented) {
        return int4_unresolved(condition_flavor_43_4);
    };
    if left == MoneyValue::Null || right == MoneyValue::Null {
        return Int4Value::Null;
    };
    if let MoneyValue::Value(a) = left {
        if let MoneyValue::Value(b) = right {
            if a < b {
                return Int4Value::Value(-1);
            };
            if a > b {
                return Int4Value::Value(1);
            };
            return Int4Value::Value(0);
        };
    };
    int4_unresolved(unresolved_flavor)
}
fn money_relation(left: MoneyValue, right: MoneyValue, mode: i32) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = left { unresolved_flavor = 1; };
    if let MoneyValue::Unknown = right { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = left { unresolved_flavor = 2; };
    if let MoneyValue::Unimplemented = right { unresolved_flavor = 2; };
    let comparison = money_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return BoolValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return BoolValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if mode == 0 {
            return make_bool_value(order == 0);
        };
        if mode == 1 {
            return make_bool_value(order != 0);
        };
        if mode == 2 {
            return make_bool_value(order < 0);
        };
        if mode == 3 {
            return make_bool_value(order <= 0);
        };
        if mode == 4 {
            return make_bool_value(order > 0);
        };
        return make_bool_value(order >= 0);
    };
    let mut local_flavor_93_4: i32 = unresolved_flavor; if let Int4Value::Unknown = comparison { if local_flavor_93_4 < 1 { local_flavor_93_4 = 1; }; }; if let Int4Value::Unimplemented = comparison { local_flavor_93_4 = 2; }; bool_unresolved(local_flavor_93_4)
}
fn money_select(left: MoneyValue, right: MoneyValue, larger: bool) -> MoneyValue {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = left { unresolved_flavor = 1; };
    if let MoneyValue::Unknown = right { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = left { unresolved_flavor = 2; };
    if let MoneyValue::Unimplemented = right { unresolved_flavor = 2; };
    let comparison = money_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return MoneyValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return MoneyValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        };
        return right;
    };
    let mut local_flavor_114_4: i32 = unresolved_flavor; if let Int4Value::Unknown = comparison { if local_flavor_114_4 < 1 { local_flavor_114_4 = 1; }; }; if let Int4Value::Unimplemented = comparison { local_flavor_114_4 = 2; }; money_unresolved(local_flavor_114_4)
}
fn money_float_scale(
    input: MoneyValue,
    factor: Float8Value,
    divide: bool,
    reverse: bool,
) -> MoneyValue {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = input { unresolved_flavor = 1; };
    if let Float8Value::Unknown = factor { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = factor { unresolved_flavor = 2; };
    if reverse {
        if let Float8Value::Error(error) = factor {
            return MoneyValue::Error(error);
        };
    };
    if let MoneyValue::Error(error) = input {
        return MoneyValue::Error(error);
    };
    if let Float8Value::Error(error) = factor {
        return MoneyValue::Error(error);
    };
    let mut condition_flavor_138_4: i32 = unresolved_flavor; if let MoneyValue::Unknown = input { if condition_flavor_138_4 < 1 { condition_flavor_138_4 = 1; }; }; if let MoneyValue::Unimplemented = input { condition_flavor_138_4 = 2; }; if let Float8Value::Unknown = factor { if condition_flavor_138_4 < 1 { condition_flavor_138_4 = 1; }; }; if let Float8Value::Unimplemented = factor { condition_flavor_138_4 = 2; }; if (input == MoneyValue::Unknown || input == MoneyValue::Unimplemented) || (factor == Float8Value::Unknown || factor == Float8Value::Unimplemented) {
        return money_unresolved(condition_flavor_138_4);
    };
    if input == MoneyValue::Null || factor == Float8Value::Null {
        return MoneyValue::Null;
    };
    let amount = sql__pg_catalog__float8__1dvp(money_units(input));
    let mut scaled = Float8Value::Unknown;
    if divide {
        scaled = sql__pg_catalog__float8div__kumj(amount, factor);
    } else {
        scaled = sql__pg_catalog__float8mul__d3nd(amount, factor);
    };
    money_from_units(sql__pg_catalog__int8__kmmw(scaled))
}
fn money_ratio(left: MoneyValue, right: MoneyValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = left { unresolved_flavor = 1; };
    if let MoneyValue::Unknown = right { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = left { unresolved_flavor = 2; };
    if let MoneyValue::Unimplemented = right { unresolved_flavor = 2; };
    let status = money_compare(left, right);
    if let Int4Value::Error(error) = status {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_163_4: i32 = unresolved_flavor; if let Int4Value::Unknown = status { if condition_flavor_163_4 < 1 { condition_flavor_163_4 = 1; }; }; if let Int4Value::Unimplemented = status { condition_flavor_163_4 = 2; }; if (status == Int4Value::Unknown || status == Int4Value::Unimplemented) {
        return float8_unresolved(condition_flavor_163_4);
    };
    if status == Int4Value::Null {
        return Float8Value::Null;
    };
    sql__pg_catalog__float8div__kumj(
        sql__pg_catalog__float8__1dvp(money_units(left)),
        sql__pg_catalog__float8__1dvp(money_units(right)),
    )
}

pub fn sql__pg_catalog__cash_send__p2u1(left: MoneyValue) -> ByteaValue {
    sql__pg_catalog__int8send__pjz0(money_units(left))
}

pub fn sql__pg_catalog__cash_cmp__uvwe(left: MoneyValue, right: MoneyValue) -> Int4Value {
    money_compare(left, right)
}

pub fn sql__pg_catalog__cash_div_cash__h9fi(left: MoneyValue, right: MoneyValue) -> Float8Value {
    money_ratio(left, right)
}

pub fn sql__pg_catalog__cash_div_flt4__y5xp(left: MoneyValue, right: Float4Value) -> MoneyValue {
    money_float_scale(left, sql__pg_catalog__float8__qcwm(right), true, false)
}

pub fn sql__pg_catalog__cash_div_flt8__6g71(left: MoneyValue, right: Float8Value) -> MoneyValue {
    money_float_scale(left, right, true, false)
}

pub fn sql__pg_catalog__cash_div_int2__yp7r(left: MoneyValue, right: Int2Value) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8div__8s66(
        money_units(left),
        int2_to_int8(right),
    ))
}

pub fn sql__pg_catalog__cash_div_int4__3op1(left: MoneyValue, right: Int4Value) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8div__8s66(
        money_units(left),
        sql__pg_catalog__int8__mzac(right),
    ))
}

pub fn sql__pg_catalog__cash_div_int8__sl5w(left: MoneyValue, right: Int8Value) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8div__8s66(money_units(left), right))
}

pub fn sql__pg_catalog__cash_eq__je3y(left: MoneyValue, right: MoneyValue) -> BoolValue {
    money_relation(left, right, 0)
}

pub fn sql__pg_catalog__cash_ge__ugo5(left: MoneyValue, right: MoneyValue) -> BoolValue {
    money_relation(left, right, 5)
}

pub fn sql__pg_catalog__cash_gt__xt5i(left: MoneyValue, right: MoneyValue) -> BoolValue {
    money_relation(left, right, 4)
}

pub fn sql__pg_catalog__cash_le__rcrv(left: MoneyValue, right: MoneyValue) -> BoolValue {
    money_relation(left, right, 3)
}

pub fn sql__pg_catalog__cash_lt__f73x(left: MoneyValue, right: MoneyValue) -> BoolValue {
    money_relation(left, right, 2)
}

pub fn sql__pg_catalog__cash_mi__7yce(left: MoneyValue, right: MoneyValue) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mi__jasl(
        money_units(left),
        money_units(right),
    ))
}

pub fn sql__pg_catalog__cash_mul_flt4__q24l(left: MoneyValue, right: Float4Value) -> MoneyValue {
    money_float_scale(left, sql__pg_catalog__float8__qcwm(right), false, false)
}

pub fn sql__pg_catalog__cash_mul_flt8__0u49(left: MoneyValue, right: Float8Value) -> MoneyValue {
    money_float_scale(left, right, false, false)
}

pub fn sql__pg_catalog__cash_mul_int2__nkic(left: MoneyValue, right: Int2Value) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mul__6t1m(
        money_units(left),
        int2_to_int8(right),
    ))
}

pub fn sql__pg_catalog__cash_mul_int4__pvtl(left: MoneyValue, right: Int4Value) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mul__6t1m(
        money_units(left),
        sql__pg_catalog__int8__mzac(right),
    ))
}

pub fn sql__pg_catalog__cash_mul_int8__p531(left: MoneyValue, right: Int8Value) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mul__6t1m(money_units(left), right))
}

pub fn sql__pg_catalog__cash_ne__jd85(left: MoneyValue, right: MoneyValue) -> BoolValue {
    money_relation(left, right, 1)
}

pub fn sql__pg_catalog__cash_pl__foc4(left: MoneyValue, right: MoneyValue) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8pl__1v1h(
        money_units(left),
        money_units(right),
    ))
}

pub fn sql__pg_catalog__cashlarger__v6lj(left: MoneyValue, right: MoneyValue) -> MoneyValue {
    money_select(left, right, true)
}

pub fn sql__pg_catalog__cashsmaller__rxz4(left: MoneyValue, right: MoneyValue) -> MoneyValue {
    money_select(left, right, false)
}

pub fn sql__pg_catalog__flt4_mul_cash__gb7j(left: Float4Value, right: MoneyValue) -> MoneyValue {
    money_float_scale(right, sql__pg_catalog__float8__qcwm(left), false, true)
}

pub fn sql__pg_catalog__flt8_mul_cash__flum(left: Float8Value, right: MoneyValue) -> MoneyValue {
    money_float_scale(right, left, false, true)
}

pub fn sql__pg_catalog__int2_mul_cash__p4kk(left: Int2Value, right: MoneyValue) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mul__6t1m(
        int2_to_int8(left),
        money_units(right),
    ))
}

pub fn sql__pg_catalog__int4_mul_cash__rag1(left: Int4Value, right: MoneyValue) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mul__6t1m(
        sql__pg_catalog__int8__mzac(left),
        money_units(right),
    ))
}

pub fn sql__pg_catalog__int8_mul_cash__bg8e(left: Int8Value, right: MoneyValue) -> MoneyValue {
    money_from_units(sql__pg_catalog__int8mul__6t1m(left, money_units(right)))
}
