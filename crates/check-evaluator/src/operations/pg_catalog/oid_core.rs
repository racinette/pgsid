fn oid_units(input: OidValue) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == OidValue::Null {
        return Int8Value::Null;
    };
    if let OidValue::Value(value) = input {
        return Int8Value::Value(value);
    };
    int8_unresolved(unresolved_flavor)
}
fn oid_compare(left: OidValue, right: OidValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = left { unresolved_flavor = 1; };
    if let OidValue::Unknown = right { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let OidValue::Unimplemented = right { unresolved_flavor = 2; };
    if let OidValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let OidValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    let mut condition_flavor_28_4: i32 = unresolved_flavor; if let OidValue::Unknown = left { if condition_flavor_28_4 < 1 { condition_flavor_28_4 = 1; }; }; if let OidValue::Unimplemented = left { condition_flavor_28_4 = 2; }; if let OidValue::Unknown = right { if condition_flavor_28_4 < 1 { condition_flavor_28_4 = 1; }; }; if let OidValue::Unimplemented = right { condition_flavor_28_4 = 2; }; if (left == OidValue::Unknown || left == OidValue::Unimplemented) || (right == OidValue::Unknown || right == OidValue::Unimplemented) {
        return int4_unresolved(condition_flavor_28_4);
    };
    if left == OidValue::Null || right == OidValue::Null {
        return Int4Value::Null;
    };
    if let OidValue::Value(a) = left {
        if let OidValue::Value(b) = right {
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
fn oid_relation(left: OidValue, right: OidValue, mode: i32) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = left { unresolved_flavor = 1; };
    if let OidValue::Unknown = right { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let OidValue::Unimplemented = right { unresolved_flavor = 2; };
    let comparison = oid_compare(left, right);
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
    bool_unresolved(unresolved_flavor)
}
fn oid_select(left: OidValue, right: OidValue, larger: bool) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = left { unresolved_flavor = 1; };
    if let OidValue::Unknown = right { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let OidValue::Unimplemented = right { unresolved_flavor = 2; };
    let comparison = oid_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return OidValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return OidValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        };
        return right;
    };
    oid_unresolved(unresolved_flavor)
}

pub fn oid_to_int4(input: OidValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input { return Int4Value::Error(error); };
    if input == OidValue::Null { return Int4Value::Null; };
    if let OidValue::Value(value) = input {
        let mut signed = value;
        if signed > 2147483647i64 { signed = signed - 4294967296i64; };
        return make_int4_value(signed as i32);
    };
    int4_unresolved(unresolved_flavor)
}
pub fn oid_from_int4(input: Int4Value) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = input { return OidValue::Error(error); };
    if input == Int4Value::Null { return OidValue::Null; };
    if let Int4Value::Value(value) = input {
        let mut units = value as i64;
        if units < 0i64 { units = units + 4294967296i64; };
        return make_oid_value(units);
    };
    oid_unresolved(unresolved_flavor)
}
pub fn oid_to_text(input: OidValue) -> TextValue { int8_to_text(oid_units(input)) }

pub fn sql__pg_catalog__oidsend__kq2v(left: OidValue) -> ByteaValue {
    sql__pg_catalog__int4send__fjzt(oid_to_int4(left))
}

pub fn sql__pg_catalog__btoidcmp__48b8(left: OidValue, right: OidValue) -> Int4Value {
    oid_compare(left, right)
}

pub fn sql__pg_catalog__hashoid__pp7a(left: OidValue) -> Int4Value {
    sql__pg_catalog__hashint4__zr00(oid_to_int4(left))
}

pub fn sql__pg_catalog__hashoidextended__v555(left: OidValue, right: Int8Value) -> Int8Value {
    sql__pg_catalog__hashint4extended__xf6v(oid_to_int4(left), right)
}

pub fn sql__pg_catalog__int8__egit(left: OidValue) -> Int8Value {
    oid_units(left)
}

pub fn sql__pg_catalog__oid__h1d6(left: Int8Value) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left { return OidValue::Error(error); };
    if left == Int8Value::Null { return OidValue::Null; };
    if let Int8Value::Value(value) = left {
        if value < 0i64 || value > 4294967295i64 { return OidValue::Error(SqlError { state: SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE }); };
        return make_oid_value(value);
    };
    oid_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__oideq__5dkx(left: OidValue, right: OidValue) -> BoolValue {
    oid_relation(left, right, 0)
}

pub fn sql__pg_catalog__oidge__aoq3(left: OidValue, right: OidValue) -> BoolValue {
    oid_relation(left, right, 5)
}

pub fn sql__pg_catalog__oidgt__g4ck(left: OidValue, right: OidValue) -> BoolValue {
    oid_relation(left, right, 4)
}

pub fn sql__pg_catalog__oidlarger__i7ib(left: OidValue, right: OidValue) -> OidValue {
    oid_select(left, right, true)
}

pub fn sql__pg_catalog__oidle__fl7z(left: OidValue, right: OidValue) -> BoolValue {
    oid_relation(left, right, 3)
}

pub fn sql__pg_catalog__oidlt__d1du(left: OidValue, right: OidValue) -> BoolValue {
    oid_relation(left, right, 2)
}

pub fn sql__pg_catalog__oidne__c1mg(left: OidValue, right: OidValue) -> BoolValue {
    oid_relation(left, right, 1)
}

pub fn sql__pg_catalog__oidsmaller__gygc(left: OidValue, right: OidValue) -> OidValue {
    oid_select(left, right, false)
}
