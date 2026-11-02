fn integer_support_compare(left: Int8Value, right: Int8Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int4Value::Null;
    }
    let mut condition_flavor_16_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_16_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_16_4 < 1 { condition_flavor_16_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_16_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int4_unresolved(condition_flavor_16_4);
    }
    if let Int8Value::Value(a) = left {
        if let Int8Value::Value(b) = right {
            if a < b {
                return Int4Value::Value(-1);
            }
            if a > b {
                return Int4Value::Value(1);
            }
            return Int4Value::Value(0);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__btint24cmp__3e3r(left: Int2Value, right: Int4Value) -> Int4Value {
    let left_value = sql__pg_catalog__int8__sxtp(left);
    let right_value = sql__pg_catalog__int8__mzac(right);
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint28cmp__zz4j(left: Int2Value, right: Int8Value) -> Int4Value {
    let left_value = sql__pg_catalog__int8__sxtp(left);
    let right_value = right;
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint2cmp__2zqn(left: Int2Value, right: Int2Value) -> Int4Value {
    let left_value = sql__pg_catalog__int4__1z1k(left);
    let right_value = sql__pg_catalog__int4__1z1k(right);
    sql__pg_catalog__int4mi__dtqk(left_value, right_value)
}

pub fn sql__pg_catalog__btint42cmp__ogrx(left: Int4Value, right: Int2Value) -> Int4Value {
    let left_value = sql__pg_catalog__int8__mzac(left);
    let right_value = sql__pg_catalog__int8__sxtp(right);
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint48cmp__9ntl(left: Int4Value, right: Int8Value) -> Int4Value {
    let left_value = sql__pg_catalog__int8__mzac(left);
    let right_value = right;
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint4cmp__e3r7(left: Int4Value, right: Int4Value) -> Int4Value {
    let left_value = sql__pg_catalog__int8__mzac(left);
    let right_value = sql__pg_catalog__int8__mzac(right);
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint82cmp__gl3p(left: Int8Value, right: Int2Value) -> Int4Value {
    let left_value = left;
    let right_value = sql__pg_catalog__int8__sxtp(right);
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint84cmp__4vgw(left: Int8Value, right: Int4Value) -> Int4Value {
    let left_value = left;
    let right_value = sql__pg_catalog__int8__mzac(right);
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__btint8cmp__tevi(left: Int8Value, right: Int8Value) -> Int4Value {
    let left_value = left;
    let right_value = right;
    integer_support_compare(left_value, right_value)
}

pub fn sql__pg_catalog__int4abs__zd8f(input: Int4Value) -> Int4Value {
    sql__pg_catalog__abs__5ajw(input)
}

pub fn sql__pg_catalog__int4inc__f5m2(input: Int4Value) -> Int4Value {
    sql__pg_catalog__int4pl__sj3s(input, Int4Value::Value(1))
}

pub fn sql__pg_catalog__int8inc__ke95(input: Int8Value) -> Int8Value {
    sql__pg_catalog__int8pl__1v1h(input, Int8Value::Value(1i64))
}

pub fn sql__pg_catalog__int8dec__rhae(input: Int8Value) -> Int8Value {
    sql__pg_catalog__int8mi__jasl(input, Int8Value::Value(1i64))
}

pub fn sql__pg_catalog__mod__2som(left: Int8Value, right: Int8Value) -> Int8Value {
    sql__pg_catalog__int8mod__2t8f(left, right)
}

pub fn sql__pg_catalog__mod__wchm(left: Int4Value, right: Int4Value) -> Int4Value {
    sql__pg_catalog__int4mod__j4pe(left, right)
}

fn integer_boolean_merge(left: BoolValue, right: BoolValue, conjunction: bool) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_126_4: i32 = unresolved_flavor; if let BoolValue::Unknown = left { if condition_flavor_126_4 < 1 { condition_flavor_126_4 = 1; }; }; if let BoolValue::Unimplemented = left { condition_flavor_126_4 = 2; }; if let BoolValue::Unknown = right { if condition_flavor_126_4 < 1 { condition_flavor_126_4 = 1; }; }; if let BoolValue::Unimplemented = right { condition_flavor_126_4 = 2; }; if (left == BoolValue::Unknown || left == BoolValue::Unimplemented) || (right == BoolValue::Unknown || right == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_126_4);
    }
    if let BoolValue::Value(a) = left {
        if let BoolValue::Value(b) = right {
            if conjunction {
                return BoolValue::Value(a && b);
            }
            return BoolValue::Value(a || b);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__booland_statefunc__dxg8(left: BoolValue, right: BoolValue) -> BoolValue {
    integer_boolean_merge(left, right, true)
}

pub fn sql__pg_catalog__boolor_statefunc__1p3g(left: BoolValue, right: BoolValue) -> BoolValue {
    integer_boolean_merge(left, right, false)
}

pub fn sql__pg_catalog__int2larger__9kfl(left: Int2Value, right: Int2Value) -> Int2Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = left { unresolved_flavor = 1; };
    if let Int2Value::Unknown = right { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int2Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = left {
        return Int2Value::Error(error);
    }
    if let Int2Value::Error(error) = right {
        return Int2Value::Error(error);
    }
    if left == Int2Value::Null || right == Int2Value::Null {
        return Int2Value::Null;
    }
    let mut condition_flavor_163_4: i32 = unresolved_flavor; if let Int2Value::Unknown = left { if condition_flavor_163_4 < 1 { condition_flavor_163_4 = 1; }; }; if let Int2Value::Unimplemented = left { condition_flavor_163_4 = 2; }; if let Int2Value::Unknown = right { if condition_flavor_163_4 < 1 { condition_flavor_163_4 = 1; }; }; if let Int2Value::Unimplemented = right { condition_flavor_163_4 = 2; }; if (left == Int2Value::Unknown || left == Int2Value::Unimplemented) || (right == Int2Value::Unknown || right == Int2Value::Unimplemented) {
        return int2_unresolved(condition_flavor_163_4);
    }
    if let Int2Value::Value(a) = left {
        if let Int2Value::Value(b) = right {
            if a > b {
                return left;
            }
            return right;
        }
    }
    int2_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int2smaller__ng6s(left: Int2Value, right: Int2Value) -> Int2Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = left { unresolved_flavor = 1; };
    if let Int2Value::Unknown = right { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int2Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = left {
        return Int2Value::Error(error);
    }
    if let Int2Value::Error(error) = right {
        return Int2Value::Error(error);
    }
    if left == Int2Value::Null || right == Int2Value::Null {
        return Int2Value::Null;
    }
    let mut condition_flavor_192_4: i32 = unresolved_flavor; if let Int2Value::Unknown = left { if condition_flavor_192_4 < 1 { condition_flavor_192_4 = 1; }; }; if let Int2Value::Unimplemented = left { condition_flavor_192_4 = 2; }; if let Int2Value::Unknown = right { if condition_flavor_192_4 < 1 { condition_flavor_192_4 = 1; }; }; if let Int2Value::Unimplemented = right { condition_flavor_192_4 = 2; }; if (left == Int2Value::Unknown || left == Int2Value::Unimplemented) || (right == Int2Value::Unknown || right == Int2Value::Unimplemented) {
        return int2_unresolved(condition_flavor_192_4);
    }
    if let Int2Value::Value(a) = left {
        if let Int2Value::Value(b) = right {
            if a < b {
                return left;
            }
            return right;
        }
    }
    int2_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4larger__fm8j(left: Int4Value, right: Int4Value) -> Int4Value {
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
    let mut condition_flavor_221_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_221_4 < 1 { condition_flavor_221_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_221_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_221_4 < 1 { condition_flavor_221_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_221_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_221_4);
    }
    if let Int4Value::Value(a) = left {
        if let Int4Value::Value(b) = right {
            if a > b {
                return left;
            }
            return right;
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4smaller__ip0x(left: Int4Value, right: Int4Value) -> Int4Value {
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
    let mut condition_flavor_250_4: i32 = unresolved_flavor; if let Int4Value::Unknown = left { if condition_flavor_250_4 < 1 { condition_flavor_250_4 = 1; }; }; if let Int4Value::Unimplemented = left { condition_flavor_250_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_250_4 < 1 { condition_flavor_250_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_250_4 = 2; }; if (left == Int4Value::Unknown || left == Int4Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return int4_unresolved(condition_flavor_250_4);
    }
    if let Int4Value::Value(a) = left {
        if let Int4Value::Value(b) = right {
            if a < b {
                return left;
            }
            return right;
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8larger__uf9y(left: Int8Value, right: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    let mut condition_flavor_279_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_279_4 < 1 { condition_flavor_279_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_279_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_279_4 < 1 { condition_flavor_279_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_279_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_279_4);
    }
    if let Int8Value::Value(a) = left {
        if let Int8Value::Value(b) = right {
            if a > b {
                return left;
            }
            return right;
        }
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8smaller__weow(left: Int8Value, right: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    let mut condition_flavor_308_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_308_4 < 1 { condition_flavor_308_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_308_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_308_4 < 1 { condition_flavor_308_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_308_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_308_4);
    }
    if let Int8Value::Value(a) = left {
        if let Int8Value::Value(b) = right {
            if a < b {
                return left;
            }
            return right;
        }
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bool__gxv7(input: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = input {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_329_4: i32 = unresolved_flavor; if let Int4Value::Unknown = input { if condition_flavor_329_4 < 1 { condition_flavor_329_4 = 1; }; }; if let Int4Value::Unimplemented = input { condition_flavor_329_4 = 2; }; if input == Int4Value::Unknown || input == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_329_4);
    }
    if input == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = input {
        return BoolValue::Value(value != 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4__i3jf(input: BoolValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_348_4: i32 = unresolved_flavor; if let BoolValue::Unknown = input { if condition_flavor_348_4 < 1 { condition_flavor_348_4 = 1; }; }; if let BoolValue::Unimplemented = input { condition_flavor_348_4 = 2; }; if input == BoolValue::Unknown || input == BoolValue::Unimplemented {
        return int4_unresolved(condition_flavor_348_4);
    }
    if input == BoolValue::Null {
        return Int4Value::Null;
    }
    if let BoolValue::Value(value) = input {
        if value {
            return Int4Value::Value(1);
        }
        return Int4Value::Value(0);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__btboolcmp__i7aj(left: BoolValue, right: BoolValue) -> Int4Value {
    let first = sql__pg_catalog__int4__i3jf(left);
    let second = sql__pg_catalog__int4__i3jf(right);
    sql__pg_catalog__int4mi__dtqk(first, second)
}

pub fn sql__pg_catalog__int4up__8u1c(input: Int4Value) -> Int4Value {
    input
}

pub fn sql__pg_catalog__int4um__shsd(input: Int4Value) -> Int4Value {
    sql__pg_catalog__int4mi__dtqk(Int4Value::Value(0), input)
}

fn integer_support_gcd(left: Int8Value, right: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    let mut condition_flavor_392_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_392_4 < 1 { condition_flavor_392_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_392_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_392_4 < 1 { condition_flavor_392_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_392_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_392_4);
    }
    if let Int8Value::Value(first) = left {
        if let Int8Value::Value(second) = right {
            let mut a = first;
            let mut b = second;
            if a > 0i64 {
                a = 0i64 - a;
            }
            if b > 0i64 {
                b = 0i64 - b;
            }
            if a > b {
                let swap = a;
                a = b;
                b = swap;
            }
            if a == -9223372036854775808i64 {
                if b == 0i64 || b == -9223372036854775808i64 {
                    return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
                }
                if b == -1i64 {
                    return Int8Value::Value(1i64);
                }
            }
            while b != 0i64 {
                let remainder = a % b;
                a = b;
                b = remainder;
            }
            return Int8Value::Value(0i64 - a);
        }
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__gcd__ih0m(left: Int8Value, right: Int8Value) -> Int8Value {
    integer_support_gcd(left, right)
}

pub fn sql__pg_catalog__gcd__5cjb(left: Int4Value, right: Int4Value) -> Int4Value {
    let first = sql__pg_catalog__int8__mzac(left);
    let second = sql__pg_catalog__int8__mzac(right);
    let result = integer_support_gcd(first, second);
    sql__pg_catalog__int4__5ywh(result)
}

pub fn sql__pg_catalog__lcm__wnc0(left: Int8Value, right: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    let mut condition_flavor_455_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_455_4 < 1 { condition_flavor_455_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_455_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_455_4 < 1 { condition_flavor_455_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_455_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_455_4);
    }
    if let Int8Value::Value(first) = left {
        if let Int8Value::Value(second) = right {
            if first == 0i64 || second == 0i64 {
                return Int8Value::Value(0i64);
            }
            let divisor = integer_support_gcd(left, right);
            let reduced = sql__pg_catalog__int8div__8s66(left, divisor);
            let product = sql__pg_catalog__int8mul__6t1m(reduced, right);
            return sql__pg_catalog__abs__36t4(product);
        }
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__lcm__90j8(left: Int4Value, right: Int4Value) -> Int4Value {
    let first = sql__pg_catalog__int8__mzac(left);
    let second = sql__pg_catalog__int8__mzac(right);
    let result = sql__pg_catalog__lcm__wnc0(first, second);
    sql__pg_catalog__int4__5ywh(result)
}
