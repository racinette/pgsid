fn integer_support_compare(left: Int8Value, right: Int8Value) -> Int4Value {
    if let Int8Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int4Value::Null;
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
    Int4Value::Unknown
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
    if let BoolValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == BoolValue::Unknown || right == BoolValue::Unknown {
        return BoolValue::Unknown;
    }
    if left == BoolValue::Null || right == BoolValue::Null {
        return BoolValue::Null;
    }
    if let BoolValue::Value(a) = left {
        if let BoolValue::Value(b) = right {
            if conjunction {
                return BoolValue::Value(a && b);
            }
            return BoolValue::Value(a || b);
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__booland_statefunc__dxg8(left: BoolValue, right: BoolValue) -> BoolValue {
    integer_boolean_merge(left, right, true)
}

pub fn sql__pg_catalog__boolor_statefunc__1p3g(left: BoolValue, right: BoolValue) -> BoolValue {
    integer_boolean_merge(left, right, false)
}

pub fn sql__pg_catalog__int2larger__9kfl(left: Int2Value, right: Int2Value) -> Int2Value {
    if let Int2Value::Error(error) = left {
        return Int2Value::Error(error);
    }
    if let Int2Value::Error(error) = right {
        return Int2Value::Error(error);
    }
    if left == Int2Value::Unknown || right == Int2Value::Unknown {
        return Int2Value::Unknown;
    }
    if left == Int2Value::Null || right == Int2Value::Null {
        return Int2Value::Null;
    }
    if let Int2Value::Value(a) = left {
        if let Int2Value::Value(b) = right {
            if a > b {
                return left;
            }
            return right;
        }
    }
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int2smaller__ng6s(left: Int2Value, right: Int2Value) -> Int2Value {
    if let Int2Value::Error(error) = left {
        return Int2Value::Error(error);
    }
    if let Int2Value::Error(error) = right {
        return Int2Value::Error(error);
    }
    if left == Int2Value::Unknown || right == Int2Value::Unknown {
        return Int2Value::Unknown;
    }
    if left == Int2Value::Null || right == Int2Value::Null {
        return Int2Value::Null;
    }
    if let Int2Value::Value(a) = left {
        if let Int2Value::Value(b) = right {
            if a < b {
                return left;
            }
            return right;
        }
    }
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int4larger__fm8j(left: Int4Value, right: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    if let Int4Value::Value(a) = left {
        if let Int4Value::Value(b) = right {
            if a > b {
                return left;
            }
            return right;
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int4smaller__ip0x(left: Int4Value, right: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Int4Value::Unknown || right == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Int4Value::Null || right == Int4Value::Null {
        return Int4Value::Null;
    }
    if let Int4Value::Value(a) = left {
        if let Int4Value::Value(b) = right {
            if a < b {
                return left;
            }
            return right;
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int8larger__uf9y(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(a) = left {
        if let Int8Value::Value(b) = right {
            if a > b {
                return left;
            }
            return right;
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int8smaller__weow(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(a) = left {
        if let Int8Value::Value(b) = right {
            if a < b {
                return left;
            }
            return right;
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__bool__gxv7(input: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = input {
        return BoolValue::Error(error);
    }
    if input == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if input == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(value) = input {
        return BoolValue::Value(value != 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__int4__i3jf(input: BoolValue) -> Int4Value {
    if let BoolValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == BoolValue::Unknown {
        return Int4Value::Unknown;
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
    Int4Value::Unknown
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
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
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
    Int8Value::Unknown
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
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    }
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    }
    if left == Int8Value::Unknown || right == Int8Value::Unknown {
        return Int8Value::Unknown;
    }
    if left == Int8Value::Null || right == Int8Value::Null {
        return Int8Value::Null;
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
    Int8Value::Unknown
}

pub fn sql__pg_catalog__lcm__90j8(left: Int4Value, right: Int4Value) -> Int4Value {
    let first = sql__pg_catalog__int8__mzac(left);
    let second = sql__pg_catalog__int8__mzac(right);
    let result = sql__pg_catalog__lcm__wnc0(first, second);
    sql__pg_catalog__int4__5ywh(result)
}
