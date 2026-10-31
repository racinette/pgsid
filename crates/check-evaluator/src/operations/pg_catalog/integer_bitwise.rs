#[derive(Clone, Copy)]
struct IntegerBits {
    high: i64,
    low: i64,
}

fn integer_bits_from_value(value: i64) -> IntegerBits {
    let lower = value as i32;
    let mut low = lower as i64;
    if low < 0i64 {
        low = low + 4294967296i64;
    }
    let mut high = value / 4294967296i64;
    if value < 0i64 && value % 4294967296i64 != 0i64 {
        high = high - 1i64;
    }
    if high < 0i64 {
        high = high + 4294967296i64;
    }
    IntegerBits {
        high: high,
        low: low,
    }
}

fn integer_bits_value(bits: IntegerBits) -> i64 {
    let mut high = bits.high;
    if high >= 2147483648i64 {
        high = high - 4294967296i64;
    }
    high * 4294967296i64 + bits.low
}

fn integer_bits_combine(left: i64, right: i64, operation: i32) -> i64 {
    let xor = hash_xor(left, right);
    if operation == 2 {
        return xor;
    }
    let both = (left + right - xor) / 2i64;
    if operation == 0 {
        return both;
    }
    left + right - both
}

fn integer_bitwise(left: Int8Value, right: Int8Value, operation: i32) -> Int8Value {
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
    let mut condition_flavor_61_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_61_4 < 1 { condition_flavor_61_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_61_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_61_4 < 1 { condition_flavor_61_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_61_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_61_4);
    }
    if let Int8Value::Value(first) = left {
        if let Int8Value::Value(second) = right {
            let a = integer_bits_from_value(first);
            let b = integer_bits_from_value(second);
            let high = integer_bits_combine(a.high, b.high, operation);
            let low = integer_bits_combine(a.low, b.low, operation);
            return Int8Value::Value(integer_bits_value(IntegerBits {
                high: high,
                low: low,
            }));
        }
    }
    int8_unresolved(unresolved_flavor)
}

fn integer_complement(input: Int8Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_86_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_86_4 < 1 { condition_flavor_86_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_86_4 = 2; }; if (input == Int8Value::Unknown || input == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_86_4);
    }
    if input == Int8Value::Null {
        return Int8Value::Null;
    }
    if let Int8Value::Value(value) = input {
        return Int8Value::Value(-1i64 - value);
    }
    int8_unresolved(unresolved_flavor)
}

fn integer_shift(input: Int8Value, amount: Int4Value, width: i32, left: bool) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = amount { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = amount { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return Int8Value::Error(error);
    }
    if let Int4Value::Error(error) = amount {
        return Int8Value::Error(error);
    }
    if input == Int8Value::Null || amount == Int4Value::Null {
        return Int8Value::Null;
    }
    let mut condition_flavor_113_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_113_4 < 1 { condition_flavor_113_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_113_4 = 2; }; if let Int4Value::Unknown = amount { if condition_flavor_113_4 < 1 { condition_flavor_113_4 = 1; }; }; if let Int4Value::Unimplemented = amount { condition_flavor_113_4 = 2; }; if (input == Int8Value::Unknown || input == Int8Value::Unimplemented) || (amount == Int4Value::Unknown || amount == Int4Value::Unimplemented) {
        return int8_unresolved(condition_flavor_113_4);
    }
    if let Int8Value::Value(value) = input {
        if let Int4Value::Value(distance) = amount {
            let bits = integer_bits_from_value(value);
            let mut high = bits.high;
            let mut low = bits.low;
            let mut remaining = distance % width;
            if remaining < 0 {
                remaining = remaining + width;
            }
            while remaining > 0 {
                if left {
                    let carry = low / 2147483648i64;
                    low = low * 2i64 % 4294967296i64;
                    high = (high * 2i64 + carry) % 4294967296i64;
                } else {
                    let carry = high % 2i64;
                    low = low / 2i64 + carry * 2147483648i64;
                    let mut sign: i64 = 0i64;
                    if high >= 2147483648i64 {
                        sign = 2147483648i64;
                    }
                    high = high / 2i64 + sign;
                };
                remaining = remaining - 1;
            }
            return Int8Value::Value(integer_bits_value(IntegerBits {
                high: high,
                low: low,
            }));
        }
    }
    int8_unresolved(unresolved_flavor)
}

fn integer_bits_int4(input: Int8Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_157_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_157_4 < 1 { condition_flavor_157_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_157_4 = 2; }; if (input == Int8Value::Unknown || input == Int8Value::Unimplemented) {
        return int4_unresolved(condition_flavor_157_4);
    }
    if input == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(value) = input {
        return Int4Value::Value(value as i32);
    }
    int4_unresolved(unresolved_flavor)
}

fn integer_bits_int2(input: Int8Value) -> Int2Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return Int2Value::Error(error);
    }
    let mut condition_flavor_176_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_176_4 < 1 { condition_flavor_176_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_176_4 = 2; }; if (input == Int8Value::Unknown || input == Int8Value::Unimplemented) {
        return int2_unresolved(condition_flavor_176_4);
    }
    if input == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(value) = input {
        let mut remainder = value % 65536i64;
        if remainder < 0i64 {
            remainder = remainder + 65536i64;
        }
        if remainder >= 32768i64 {
            remainder = remainder - 65536i64;
        }
        return Int2Value::Value(remainder as i32);
    }
    int2_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int2and__etfs(left: Int2Value, right: Int2Value) -> Int2Value {
    let first = sql__pg_catalog__int8__sxtp(left);
    let second = sql__pg_catalog__int8__sxtp(right);
    let result = integer_bitwise(first, second, 0);
    integer_bits_int2(result)
}

pub fn sql__pg_catalog__int2or__iy76(left: Int2Value, right: Int2Value) -> Int2Value {
    let first = sql__pg_catalog__int8__sxtp(left);
    let second = sql__pg_catalog__int8__sxtp(right);
    let result = integer_bitwise(first, second, 1);
    integer_bits_int2(result)
}

pub fn sql__pg_catalog__int2xor__t18e(left: Int2Value, right: Int2Value) -> Int2Value {
    let first = sql__pg_catalog__int8__sxtp(left);
    let second = sql__pg_catalog__int8__sxtp(right);
    let result = integer_bitwise(first, second, 2);
    integer_bits_int2(result)
}

pub fn sql__pg_catalog__int2not__n5dv(input: Int2Value) -> Int2Value {
    let widened = sql__pg_catalog__int8__sxtp(input);
    let result = integer_complement(widened);
    integer_bits_int2(result)
}

pub fn sql__pg_catalog__int2shl__0kk0(input: Int2Value, amount: Int4Value) -> Int2Value {
    let widened = sql__pg_catalog__int8__sxtp(input);
    let result = integer_shift(widened, amount, 32, true);
    integer_bits_int2(result)
}

pub fn sql__pg_catalog__int2shr__sejt(input: Int2Value, amount: Int4Value) -> Int2Value {
    let widened = sql__pg_catalog__int8__sxtp(input);
    let result = integer_shift(widened, amount, 32, false);
    integer_bits_int2(result)
}

pub fn sql__pg_catalog__int4and__jkbd(left: Int4Value, right: Int4Value) -> Int4Value {
    let first = sql__pg_catalog__int8__mzac(left);
    let second = sql__pg_catalog__int8__mzac(right);
    let result = integer_bitwise(first, second, 0);
    integer_bits_int4(result)
}

pub fn sql__pg_catalog__int4or__bxn6(left: Int4Value, right: Int4Value) -> Int4Value {
    let first = sql__pg_catalog__int8__mzac(left);
    let second = sql__pg_catalog__int8__mzac(right);
    let result = integer_bitwise(first, second, 1);
    integer_bits_int4(result)
}

pub fn sql__pg_catalog__int4xor__6j8h(left: Int4Value, right: Int4Value) -> Int4Value {
    let first = sql__pg_catalog__int8__mzac(left);
    let second = sql__pg_catalog__int8__mzac(right);
    let result = integer_bitwise(first, second, 2);
    integer_bits_int4(result)
}

pub fn sql__pg_catalog__int4not__vcqn(input: Int4Value) -> Int4Value {
    let widened = sql__pg_catalog__int8__mzac(input);
    let result = integer_complement(widened);
    integer_bits_int4(result)
}

pub fn sql__pg_catalog__int4shl__31iu(input: Int4Value, amount: Int4Value) -> Int4Value {
    let widened = sql__pg_catalog__int8__mzac(input);
    let result = integer_shift(widened, amount, 32, true);
    integer_bits_int4(result)
}

pub fn sql__pg_catalog__int4shr__3uh0(input: Int4Value, amount: Int4Value) -> Int4Value {
    let widened = sql__pg_catalog__int8__mzac(input);
    let result = integer_shift(widened, amount, 32, false);
    integer_bits_int4(result)
}

pub fn sql__pg_catalog__int8and__ea1e(left: Int8Value, right: Int8Value) -> Int8Value {
    let first = left;
    let second = right;
    let result = integer_bitwise(first, second, 0);
    result
}

pub fn sql__pg_catalog__int8or__37oj(left: Int8Value, right: Int8Value) -> Int8Value {
    let first = left;
    let second = right;
    let result = integer_bitwise(first, second, 1);
    result
}

pub fn sql__pg_catalog__int8xor__4v56(left: Int8Value, right: Int8Value) -> Int8Value {
    let first = left;
    let second = right;
    let result = integer_bitwise(first, second, 2);
    result
}

pub fn sql__pg_catalog__int8not__62wp(input: Int8Value) -> Int8Value {
    let widened = input;
    let result = integer_complement(widened);
    result
}

pub fn sql__pg_catalog__int8shl__zi4n(input: Int8Value, amount: Int4Value) -> Int8Value {
    let widened = input;
    let result = integer_shift(widened, amount, 64, true);
    result
}

pub fn sql__pg_catalog__int8shr__xhle(input: Int8Value, amount: Int4Value) -> Int8Value {
    let widened = input;
    let result = integer_shift(widened, amount, 64, false);
    result
}
