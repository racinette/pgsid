const FLOAT_CORE_RANGE: u32 = 3452547;

fn float4_widen(input: Float4Value) -> Float8Value {
    if let Float4Value::Error(error) = input {
        return Float8Value::Error(error);
    }
    if input == Float4Value::Null {
        return Float8Value::Null;
    }
    if let Float4Value::Value(bits) = input {
        return make_float8_value(float4_number(bits));
    };
    Float8Value::Unknown
}

fn float8_narrow(input: Float8Value) -> Float4Value {
    if let Float8Value::Error(error) = input {
        return Float4Value::Error(error);
    }
    if input == Float8Value::Null {
        return Float4Value::Null;
    }
    if let Float8Value::Value(bits) = input {
        let value = float8_number(bits);
        let rounded_bits = (value as f32).to_bits() as i32;
        let rounded = float4_number(rounded_bits);
        let infinity = 1.0f64 / 0.0f64;
        if (value.abs() != infinity && rounded.abs() == infinity)
            || (value != 0.0f64 && rounded == 0.0f64)
        {
            return Float4Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        return make_float4_bits(rounded_bits);
    };
    Float4Value::Unknown
}

fn float8_compare(left: Float8Value, right: Float8Value) -> Int4Value {
    if let Float8Value::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let Float8Value::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == Float8Value::Unknown || right == Float8Value::Unknown {
        return Int4Value::Unknown;
    }
    if left == Float8Value::Null || right == Float8Value::Null {
        return Int4Value::Null;
    }
    if let Float8Value::Value(a_bits) = left {
        if let Float8Value::Value(b_bits) = right {
            let a = float8_number(a_bits);
            let b = float8_number(b_bits);
            if a != a {
                if b != b {
                    return Int4Value::Value(0);
                }
                return Int4Value::Value(1);
            }
            if b != b {
                return Int4Value::Value(-1);
            }
            if a < b {
                return Int4Value::Value(-1);
            }
            if a > b {
                return Int4Value::Value(1);
            }
            return Int4Value::Value(0);
        };
    };
    Int4Value::Unknown
}

fn float_comparison_finish(result: Int4Value, strategy: i32) -> BoolValue {
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        if strategy == 0 {
            return BoolValue::Value(order == 0);
        }
        if strategy == 1 {
            return BoolValue::Value(order != 0);
        }
        if strategy == 2 {
            return BoolValue::Value(order < 0);
        }
        if strategy == 3 {
            return BoolValue::Value(order <= 0);
        }
        if strategy == 4 {
            return BoolValue::Value(order > 0);
        }
        if strategy == 5 {
            return BoolValue::Value(order >= 0);
        }
    };
    BoolValue::Unknown
}

fn float8_integer(input: Float8Value) -> Int8Value {
    if let Float8Value::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == Float8Value::Null {
        return Int8Value::Null;
    }
    if let Float8Value::Value(raw) = input {
        let mut bits = raw;
        let negative = raw < 0i64;
        if negative {
            bits = raw - -9223372036854775808i64;
        }
        let exponent = (bits / 4503599627370496i64) as i32 - 1023;
        let fraction = bits % 4503599627370496i64;
        if exponent >= 63 {
            if exponent == 63 && negative && fraction == 0i64 {
                return Int8Value::Value(-9223372036854775808i64);
            }
            return Int8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        }
        if exponent < -1 {
            return Int8Value::Value(0i64);
        }
        let mut coefficient = fraction + 4503599627370496i64;
        let mut power = exponent - 52;
        if power >= 0 {
            while power > 0 {
                coefficient = coefficient * 2i64;
                power = power - 1;
            }
        } else {
            let mut divisor: i64 = 1i64;
            while power < 0 {
                divisor = divisor * 2i64;
                power = power + 1;
            }
            let remainder = coefficient % divisor;
            coefficient = coefficient / divisor;
            let half = divisor / 2i64;
            if remainder > half || (remainder == half && coefficient % 2i64 != 0i64) {
                coefficient = coefficient + 1i64;
            }
        };
        if negative {
            coefficient = 0i64 - coefficient;
        }
        return Int8Value::Value(coefficient);
    };
    Int8Value::Unknown
}

fn integer_float4(input: Int8Value) -> Float4Value {
    if let Int8Value::Error(error) = input {
        return Float4Value::Error(error);
    }
    if input == Int8Value::Null {
        return Float4Value::Null;
    }
    if let Int8Value::Value(number) = input {
        if number == -9223372036854775808i64 {
            return make_float4_value(-9223372036854775808.0f64);
        }
        let mut magnitude = number;
        if number < 0i64 {
            magnitude = 0i64 - number;
        }
        let mut coefficient = magnitude;
        let mut divisor: i64 = 1i64;
        let mut scale = 1.0f64;
        while coefficient > 16777215i64 {
            coefficient = coefficient / 2i64;
            divisor = divisor * 2i64;
            scale = scale * 2.0f64;
        }
        if divisor > 1i64 {
            let remainder = magnitude % divisor;
            let half = divisor / 2i64;
            if remainder > half || (remainder == half && coefficient % 2i64 != 0i64) {
                coefficient = coefficient + 1i64;
            }
        }
        let small = coefficient as i32;
        let mut result = small as f64 * scale;
        if number < 0i64 {
            result = -result;
        }
        return make_float4_value(result);
    };
    Float4Value::Unknown
}

fn integer_float8(input: Int8Value) -> Float8Value {
    if let Int8Value::Error(error) = input {
        return Float8Value::Error(error);
    }
    if input == Int8Value::Null {
        return Float8Value::Null;
    }
    if let Int8Value::Value(number) = input {
        let text = text_signed_number(number);
        let value = text.as_str().parse::<f64>().unwrap_or(0.0f64);
        return make_float8_value(value);
    };
    Float8Value::Unknown
}

pub fn sql__pg_catalog__btfloat48cmp__r29z(left: Float4Value, right: Float8Value) -> Int4Value {
    float8_compare(float4_widen(left), right)
}

pub fn sql__pg_catalog__btfloat4cmp__yfof(left: Float4Value, right: Float4Value) -> Int4Value {
    float8_compare(float4_widen(left), float4_widen(right))
}

pub fn sql__pg_catalog__btfloat84cmp__hm5k(left: Float8Value, right: Float4Value) -> Int4Value {
    float8_compare(left, float4_widen(right))
}

pub fn sql__pg_catalog__btfloat8cmp__adn1(left: Float8Value, right: Float8Value) -> Int4Value {
    float8_compare(left, right)
}

pub fn sql__pg_catalog__float48eq__2e8s(left: Float4Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), right), 0)
}

pub fn sql__pg_catalog__float48ge__61xk(left: Float4Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), right), 5)
}

pub fn sql__pg_catalog__float48gt__w41b(left: Float4Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), right), 4)
}

pub fn sql__pg_catalog__float48le__w73b(left: Float4Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), right), 3)
}

pub fn sql__pg_catalog__float48lt__q05v(left: Float4Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), right), 2)
}

pub fn sql__pg_catalog__float48ne__0nmh(left: Float4Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), right), 1)
}

pub fn sql__pg_catalog__float4eq__36g8(left: Float4Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), float4_widen(right)), 0)
}

pub fn sql__pg_catalog__float4ge__74ah(left: Float4Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), float4_widen(right)), 5)
}

pub fn sql__pg_catalog__float4gt__t0ms(left: Float4Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), float4_widen(right)), 4)
}

pub fn sql__pg_catalog__float4le__g1uf(left: Float4Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), float4_widen(right)), 3)
}

pub fn sql__pg_catalog__float4lt__339k(left: Float4Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), float4_widen(right)), 2)
}

pub fn sql__pg_catalog__float4ne__frlm(left: Float4Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(float4_widen(left), float4_widen(right)), 1)
}

pub fn sql__pg_catalog__float84eq__be8b(left: Float8Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, float4_widen(right)), 0)
}

pub fn sql__pg_catalog__float84ge__fudn(left: Float8Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, float4_widen(right)), 5)
}

pub fn sql__pg_catalog__float84gt__gpd6(left: Float8Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, float4_widen(right)), 4)
}

pub fn sql__pg_catalog__float84le__5od9(left: Float8Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, float4_widen(right)), 3)
}

pub fn sql__pg_catalog__float84lt__f2id(left: Float8Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, float4_widen(right)), 2)
}

pub fn sql__pg_catalog__float84ne__xkja(left: Float8Value, right: Float4Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, float4_widen(right)), 1)
}

pub fn sql__pg_catalog__float8eq__tpae(left: Float8Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, right), 0)
}

pub fn sql__pg_catalog__float8ge__la0k(left: Float8Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, right), 5)
}

pub fn sql__pg_catalog__float8gt__m76q(left: Float8Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, right), 4)
}

pub fn sql__pg_catalog__float8le__9qw7(left: Float8Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, right), 3)
}

pub fn sql__pg_catalog__float8lt__vp07(left: Float8Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, right), 2)
}

pub fn sql__pg_catalog__float8ne__bqr8(left: Float8Value, right: Float8Value) -> BoolValue {
    float_comparison_finish(float8_compare(left, right), 1)
}

pub fn sql__pg_catalog__float4__l0dp(input: Int2Value) -> Float4Value {
    integer_float4(int2_to_int8(input))
}

pub fn sql__pg_catalog__float8__q72n(input: Int2Value) -> Float8Value {
    integer_float8(int2_to_int8(input))
}

pub fn sql__pg_catalog__float4__hmza(input: Int4Value) -> Float4Value {
    integer_float4(sql__pg_catalog__int8__mzac(input))
}

pub fn sql__pg_catalog__float8__yt2i(input: Int4Value) -> Float8Value {
    integer_float8(sql__pg_catalog__int8__mzac(input))
}

pub fn sql__pg_catalog__float4__trtc(input: Int8Value) -> Float4Value {
    integer_float4(input)
}

pub fn sql__pg_catalog__float8__1dvp(input: Int8Value) -> Float8Value {
    integer_float8(input)
}

pub fn sql__pg_catalog__int2__pv8l(input: Float4Value) -> Int2Value {
    let result = float8_integer(float4_widen(input));
    if let Int8Value::Error(error) = result {
        return Int2Value::Error(error);
    }
    if result == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(number) = result {
        if number < -32768i64 || number > 32767i64 {
            return Int2Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        }
        return Int2Value::Value(number as i32);
    };
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int4__tbuy(input: Float4Value) -> Int4Value {
    let result = float8_integer(float4_widen(input));
    if let Int8Value::Error(error) = result {
        return Int4Value::Error(error);
    }
    if result == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(number) = result {
        if number < -2147483648i64 || number > 2147483647i64 {
            return Int4Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        }
        return Int4Value::Value(number as i32);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int8__85by(input: Float4Value) -> Int8Value {
    float8_integer(float4_widen(input))
}

pub fn sql__pg_catalog__float8__qcwm(input: Float4Value) -> Float8Value {
    float4_widen(input)
}

pub fn sql__pg_catalog__int2__68cf(input: Float8Value) -> Int2Value {
    let result = float8_integer(input);
    if let Int8Value::Error(error) = result {
        return Int2Value::Error(error);
    }
    if result == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(number) = result {
        if number < -32768i64 || number > 32767i64 {
            return Int2Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        }
        return Int2Value::Value(number as i32);
    };
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int4__nc79(input: Float8Value) -> Int4Value {
    let result = float8_integer(input);
    if let Int8Value::Error(error) = result {
        return Int4Value::Error(error);
    }
    if result == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(number) = result {
        if number < -2147483648i64 || number > 2147483647i64 {
            return Int4Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        }
        return Int4Value::Value(number as i32);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int8__kmmw(input: Float8Value) -> Int8Value {
    float8_integer(input)
}

pub fn sql__pg_catalog__float4__frus(input: Float8Value) -> Float4Value {
    float8_narrow(input)
}
