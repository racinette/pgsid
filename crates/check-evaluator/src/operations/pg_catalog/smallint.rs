pub fn sql__pg_catalog__int24eq__cfkl(left: Int2Value, right: Int4Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    sql__pg_catalog__int4eq__lrxe(left_wide, right)
}

pub fn sql__pg_catalog__int24ge__hurd(left: Int2Value, right: Int4Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    sql__pg_catalog__int4ge__2xvk(left_wide, right)
}

pub fn sql__pg_catalog__int24gt__98sb(left: Int2Value, right: Int4Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    sql__pg_catalog__int4gt__5vlv(left_wide, right)
}

pub fn sql__pg_catalog__int24le__56y6(left: Int2Value, right: Int4Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    sql__pg_catalog__int4le__9wb6(left_wide, right)
}

pub fn sql__pg_catalog__int24lt__guxt(left: Int2Value, right: Int4Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    sql__pg_catalog__int4lt__9gej(left_wide, right)
}

pub fn sql__pg_catalog__int24ne__11ts(left: Int2Value, right: Int4Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    sql__pg_catalog__int4ne__qhun(left_wide, right)
}

pub fn sql__pg_catalog__int28eq__47dr(left: Int2Value, right: Int8Value) -> BoolValue {
    let left_wide = int2_to_int8(left);
    sql__pg_catalog__int8eq__jdhd(left_wide, right)
}

pub fn sql__pg_catalog__int28ge__xhie(left: Int2Value, right: Int8Value) -> BoolValue {
    let left_wide = int2_to_int8(left);
    sql__pg_catalog__int8ge__qfhv(left_wide, right)
}

pub fn sql__pg_catalog__int28gt__xmpc(left: Int2Value, right: Int8Value) -> BoolValue {
    let left_wide = int2_to_int8(left);
    sql__pg_catalog__int8gt__3ehj(left_wide, right)
}

pub fn sql__pg_catalog__int28le__jsoj(left: Int2Value, right: Int8Value) -> BoolValue {
    let left_wide = int2_to_int8(left);
    sql__pg_catalog__int8le__9fr4(left_wide, right)
}

pub fn sql__pg_catalog__int28lt__f4ka(left: Int2Value, right: Int8Value) -> BoolValue {
    let left_wide = int2_to_int8(left);
    sql__pg_catalog__int8lt__cryd(left_wide, right)
}

pub fn sql__pg_catalog__int28ne__4fh8(left: Int2Value, right: Int8Value) -> BoolValue {
    let left_wide = int2_to_int8(left);
    sql__pg_catalog__int8ne__ur2k(left_wide, right)
}

pub fn sql__pg_catalog__int2eq__u7zv(left: Int2Value, right: Int2Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4eq__lrxe(left_wide, right_wide)
}

pub fn sql__pg_catalog__int2ge__ld2i(left: Int2Value, right: Int2Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4ge__2xvk(left_wide, right_wide)
}

pub fn sql__pg_catalog__int2gt__681i(left: Int2Value, right: Int2Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4gt__5vlv(left_wide, right_wide)
}

pub fn sql__pg_catalog__int2le__ep4u(left: Int2Value, right: Int2Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4le__9wb6(left_wide, right_wide)
}

pub fn sql__pg_catalog__int2lt__qvze(left: Int2Value, right: Int2Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4lt__9gej(left_wide, right_wide)
}

pub fn sql__pg_catalog__int2ne__uz14(left: Int2Value, right: Int2Value) -> BoolValue {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4ne__qhun(left_wide, right_wide)
}

pub fn sql__pg_catalog__int42eq__rd78(left: Int4Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4eq__lrxe(left, right_wide)
}

pub fn sql__pg_catalog__int42ge__t5ib(left: Int4Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4ge__2xvk(left, right_wide)
}

pub fn sql__pg_catalog__int42gt__bicd(left: Int4Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4gt__5vlv(left, right_wide)
}

pub fn sql__pg_catalog__int42le__570s(left: Int4Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4le__9wb6(left, right_wide)
}

pub fn sql__pg_catalog__int42lt__etdm(left: Int4Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4lt__9gej(left, right_wide)
}

pub fn sql__pg_catalog__int42ne__beca(left: Int4Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int4(right);
    sql__pg_catalog__int4ne__qhun(left, right_wide)
}

pub fn sql__pg_catalog__int82eq__jdpt(left: Int8Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int8(right);
    sql__pg_catalog__int8eq__jdhd(left, right_wide)
}

pub fn sql__pg_catalog__int82ge__eh8t(left: Int8Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int8(right);
    sql__pg_catalog__int8ge__qfhv(left, right_wide)
}

pub fn sql__pg_catalog__int82gt__7e3o(left: Int8Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int8(right);
    sql__pg_catalog__int8gt__3ehj(left, right_wide)
}

pub fn sql__pg_catalog__int82le__jth3(left: Int8Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int8(right);
    sql__pg_catalog__int8le__9fr4(left, right_wide)
}

pub fn sql__pg_catalog__int82lt__xt99(left: Int8Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int8(right);
    sql__pg_catalog__int8lt__cryd(left, right_wide)
}

pub fn sql__pg_catalog__int82ne__6rol(left: Int8Value, right: Int2Value) -> BoolValue {
    let right_wide = int2_to_int8(right);
    sql__pg_catalog__int8ne__ur2k(left, right_wide)
}

fn smallint_result(value: Int4Value) -> Int2Value {
    if let Int4Value::Value(payload) = value {
        if payload < -32768 || payload > 32767 {
            return Int2Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        return Int2Value::Value(payload);
    }
    if let Int4Value::Error(error) = value {
        return Int2Value::Error(error);
    }
    if value == Int4Value::Null {
        return Int2Value::Null;
    }
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int2pl__yujm(left: Int2Value, right: Int2Value) -> Int2Value {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    let result = sql__pg_catalog__int4pl__sj3s(left_wide, right_wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__int2mi__uxzm(left: Int2Value, right: Int2Value) -> Int2Value {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    let result = sql__pg_catalog__int4mi__dtqk(left_wide, right_wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__int2mul__k2lr(left: Int2Value, right: Int2Value) -> Int2Value {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    let result = sql__pg_catalog__int4mul__284v(left_wide, right_wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__int2div__fnwp(left: Int2Value, right: Int2Value) -> Int2Value {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    let result = sql__pg_catalog__int4div__8ogr(left_wide, right_wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__int2mod__zds7(left: Int2Value, right: Int2Value) -> Int2Value {
    let left_wide = int2_to_int4(left);
    let right_wide = int2_to_int4(right);
    let result = sql__pg_catalog__int4mod__j4pe(left_wide, right_wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__int2abs__tyad(input: Int2Value) -> Int2Value {
    let wide = int2_to_int4(input);
    let result = sql__pg_catalog__abs__5ajw(wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__abs__43i0(input: Int2Value) -> Int2Value {
    sql__pg_catalog__int2abs__tyad(input)
}

pub fn sql__pg_catalog__mod__mzjb(left: Int2Value, right: Int2Value) -> Int2Value {
    sql__pg_catalog__int2mod__zds7(left, right)
}

pub fn sql__pg_catalog__int2um__8puj(input: Int2Value) -> Int2Value {
    let zero = make_int4_value(0);
    let wide = int2_to_int4(input);
    let result = sql__pg_catalog__int4mi__dtqk(zero, wide);
    smallint_result(result)
}

pub fn sql__pg_catalog__int2up__ne4g(input: Int2Value) -> Int2Value {
    input
}
