fn oid_units(input: OidValue) -> Int8Value {
    if let OidValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == OidValue::Null {
        return Int8Value::Null;
    };
    if let OidValue::Value(value) = input {
        return Int8Value::Value(value);
    };
    Int8Value::Unknown
}
fn oid_compare(left: OidValue, right: OidValue) -> Int4Value {
    if let OidValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let OidValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    if left == OidValue::Unknown || right == OidValue::Unknown {
        return Int4Value::Unknown;
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
    Int4Value::Unknown
}
fn oid_relation(left: OidValue, right: OidValue, mode: i32) -> BoolValue {
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
    BoolValue::Unknown
}
fn oid_select(left: OidValue, right: OidValue, larger: bool) -> OidValue {
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
    OidValue::Unknown
}

pub fn oid_to_int4(input: OidValue) -> Int4Value {
    if let OidValue::Error(error) = input { return Int4Value::Error(error); };
    if input == OidValue::Null { return Int4Value::Null; };
    if let OidValue::Value(value) = input {
        let mut signed = value;
        if signed > 2147483647i64 { signed = signed - 4294967296i64; };
        return make_int4_value(signed as i32);
    };
    Int4Value::Unknown
}
pub fn oid_from_int4(input: Int4Value) -> OidValue {
    if let Int4Value::Error(error) = input { return OidValue::Error(error); };
    if input == Int4Value::Null { return OidValue::Null; };
    if let Int4Value::Value(value) = input {
        let mut units = value as i64;
        if units < 0i64 { units = units + 4294967296i64; };
        return make_oid_value(units);
    };
    OidValue::Unknown
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
    if let Int8Value::Error(error) = left { return OidValue::Error(error); };
    if left == Int8Value::Null { return OidValue::Null; };
    if let Int8Value::Value(value) = left {
        if value < 0i64 || value > 4294967295i64 { return OidValue::Error(SqlError { state: SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE }); };
        return make_oid_value(value);
    };
    OidValue::Unknown
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
