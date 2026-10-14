fn xid_to_oid(input: XidValue) -> OidValue {
    if let XidValue::Error(error) = input { return OidValue::Error(error); };
    if input == XidValue::Null { return OidValue::Null; };
    if let XidValue::Value(value) = input { return make_oid_value(value); };
    OidValue::Unknown
}
fn xid_from_oid(input: OidValue) -> XidValue {
    if let OidValue::Error(error) = input { return XidValue::Error(error); };
    if input == OidValue::Null { return XidValue::Null; };
    if let OidValue::Value(value) = input { return make_xid_value(value); };
    XidValue::Unknown
}
pub fn xid_from_text(input: TextValue) -> XidValue { xid_from_oid(oid_from_text(input)) }
pub fn xid_to_text(input: XidValue) -> TextValue { oid_to_text(xid_to_oid(input)) }

fn cid_to_oid(input: CidValue) -> OidValue {
    if let CidValue::Error(error) = input { return OidValue::Error(error); };
    if input == CidValue::Null { return OidValue::Null; };
    if let CidValue::Value(value) = input { return make_oid_value(value); };
    OidValue::Unknown
}
fn cid_from_oid(input: OidValue) -> CidValue {
    if let OidValue::Error(error) = input { return CidValue::Error(error); };
    if input == OidValue::Null { return CidValue::Null; };
    if let OidValue::Value(value) = input { return make_cid_value(value); };
    CidValue::Unknown
}
pub fn cid_from_text(input: TextValue) -> CidValue { cid_from_oid(oid_from_text(input)) }
pub fn cid_to_text(input: CidValue) -> TextValue { oid_to_text(cid_to_oid(input)) }

fn xid8_compare(left: Xid8Value, right: Xid8Value) -> Int4Value {
    if let Xid8Value::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let Xid8Value::Error(error) = right {
        return Int4Value::Error(error);
    };
    if left == Xid8Value::Unknown || right == Xid8Value::Unknown {
        return Int4Value::Unknown;
    };
    if left == Xid8Value::Null || right == Xid8Value::Null {
        return Int4Value::Null;
    };
    if let Xid8Value::Value(a) = left {
        if let Xid8Value::Value(b) = right {
            if a < 0i64 && b >= 0i64 { return Int4Value::Value(1); };
            if a >= 0i64 && b < 0i64 { return Int4Value::Value(-1); };
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
fn xid8_relation(left: Xid8Value, right: Xid8Value, mode: i32) -> BoolValue {
    let comparison = xid8_compare(left, right);
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
fn xid8_select(left: Xid8Value, right: Xid8Value, larger: bool) -> Xid8Value {
    let comparison = xid8_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return Xid8Value::Error(error);
    };
    if comparison == Int4Value::Null {
        return Xid8Value::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        };
        return right;
    };
    Xid8Value::Unknown
}


fn xid8_bits(input: Xid8Value) -> Int8Value {
    if let Xid8Value::Error(error) = input { return Int8Value::Error(error); };
    if input == Xid8Value::Null { return Int8Value::Null; };
    if let Xid8Value::Value(value) = input { return make_int8_value(value); };
    Int8Value::Unknown
}
pub fn xid8_to_text(input: Xid8Value) -> TextValue { integer_base_text(xid8_bits(input), true, 10i64) }

pub fn sql__pg_catalog__cidsend__7b3z(left: CidValue) -> ByteaValue {
    sql__pg_catalog__oidsend__kq2v(cid_to_oid(left))
}

pub fn sql__pg_catalog__xid8send__iu1c(left: Xid8Value) -> ByteaValue {
    sql__pg_catalog__int8send__pjz0(xid8_bits(left))
}

pub fn sql__pg_catalog__xidsend__ca8a(left: XidValue) -> ByteaValue {
    sql__pg_catalog__oidsend__kq2v(xid_to_oid(left))
}

pub fn sql__pg_catalog__cideq__cniv(left: CidValue, right: CidValue) -> BoolValue {
    sql__pg_catalog__oideq__5dkx(cid_to_oid(left), cid_to_oid(right))
}

pub fn sql__pg_catalog__hashcid__a8z6(left: CidValue) -> Int4Value {
    sql__pg_catalog__hashoid__pp7a(cid_to_oid(left))
}

pub fn sql__pg_catalog__hashcidextended__eeef(left: CidValue, right: Int8Value) -> Int8Value {
    sql__pg_catalog__hashoidextended__v555(cid_to_oid(left), right)
}

pub fn sql__pg_catalog__hashxid__5s1i(left: XidValue) -> Int4Value {
    sql__pg_catalog__hashoid__pp7a(xid_to_oid(left))
}

pub fn sql__pg_catalog__hashxid8__l6u3(left: Xid8Value) -> Int4Value {
    sql__pg_catalog__hashint8__3wid(xid8_bits(left))
}

pub fn sql__pg_catalog__hashxid8extended__h8is(left: Xid8Value, right: Int8Value) -> Int8Value {
    sql__pg_catalog__hashint8extended__frvh(xid8_bits(left), right)
}

pub fn sql__pg_catalog__hashxidextended__3a8s(left: XidValue, right: Int8Value) -> Int8Value {
    sql__pg_catalog__hashoidextended__v555(xid_to_oid(left), right)
}

pub fn sql__pg_catalog__xid__lwyo(left: Xid8Value) -> XidValue {
    let bits = xid8_bits(left);
    if let Int8Value::Error(error) = bits { return XidValue::Error(error); };
    if bits == Int8Value::Null { return XidValue::Null; };
    if let Int8Value::Value(value) = bits { return xid_from_oid(oid_from_int4(make_int4_value(value as i32))); };
    XidValue::Unknown
}

pub fn sql__pg_catalog__xid8_larger__92s8(left: Xid8Value, right: Xid8Value) -> Xid8Value {
    xid8_select(left, right, true)
}

pub fn sql__pg_catalog__xid8_smaller__ww2e(left: Xid8Value, right: Xid8Value) -> Xid8Value {
    xid8_select(left, right, false)
}

pub fn sql__pg_catalog__xid8cmp__d6ry(left: Xid8Value, right: Xid8Value) -> Int4Value {
    xid8_compare(left, right)
}

pub fn sql__pg_catalog__xid8eq__swjx(left: Xid8Value, right: Xid8Value) -> BoolValue {
    xid8_relation(left, right, 0)
}

pub fn sql__pg_catalog__xid8ge__41iy(left: Xid8Value, right: Xid8Value) -> BoolValue {
    xid8_relation(left, right, 5)
}

pub fn sql__pg_catalog__xid8gt__1b0u(left: Xid8Value, right: Xid8Value) -> BoolValue {
    xid8_relation(left, right, 4)
}

pub fn sql__pg_catalog__xid8le__pyad(left: Xid8Value, right: Xid8Value) -> BoolValue {
    xid8_relation(left, right, 3)
}

pub fn sql__pg_catalog__xid8lt__zusi(left: Xid8Value, right: Xid8Value) -> BoolValue {
    xid8_relation(left, right, 2)
}

pub fn sql__pg_catalog__xid8ne__cbvq(left: Xid8Value, right: Xid8Value) -> BoolValue {
    xid8_relation(left, right, 1)
}

pub fn sql__pg_catalog__xideq__bmjv(left: XidValue, right: XidValue) -> BoolValue {
    sql__pg_catalog__oideq__5dkx(xid_to_oid(left), xid_to_oid(right))
}

pub fn sql__pg_catalog__xideqint4__0glx(left: XidValue, right: Int4Value) -> BoolValue {
    sql__pg_catalog__oideq__5dkx(xid_to_oid(left), oid_from_int4(right))
}

pub fn sql__pg_catalog__xidneq__5eig(left: XidValue, right: XidValue) -> BoolValue {
    sql__pg_catalog__oidne__c1mg(xid_to_oid(left), xid_to_oid(right))
}

pub fn sql__pg_catalog__xidneqint4__27b3(left: XidValue, right: Int4Value) -> BoolValue {
    sql__pg_catalog__oidne__c1mg(xid_to_oid(left), oid_from_int4(right))
}
