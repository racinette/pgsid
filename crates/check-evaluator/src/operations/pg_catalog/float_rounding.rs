const RADIANS_PER_DEGREE: f64 = 0.0174532925199432957692f64;

// Removes the fraction below the binary point from the bit pattern, which keeps the sign of zero,
// integral values, infinities and NaN payloads exactly as C's trunc does. The dialect has no
// bitwise operators, so the sign and fraction are separated arithmetically.
fn float8_trunc_bits(bits: i64) -> i64 {
    let minimum: i64 = 0i64 - 9223372036854775807i64 - 1i64;
    let mut magnitude: i64 = bits;
    if bits < 0i64 {
        magnitude = bits - minimum;
    };
    let exponent: i64 = magnitude / 4503599627370496i64 - 1023i64;
    if exponent >= 52i64 {
        return bits;
    };
    let mut truncated: i64 = 0i64;
    if exponent >= 0i64 {
        let mut unit: i64 = 1i64;
        let mut shift: i64 = 52i64 - exponent;
        while shift > 0i64 {
            unit = unit * 2i64;
            shift = shift - 1i64;
        }
        truncated = magnitude - magnitude % unit;
    };
    if bits < 0i64 {
        return truncated + minimum;
    };
    truncated
}

fn float8_rounded(input: Float8Value, mode: i32) -> Float8Value {
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        let truncated_bits: i64 = float8_trunc_bits(bits);
        let truncated = float8_number(truncated_bits);
        if truncated == number {
            return input;
        };
        // Below 2^52 the remainder and the neighbouring integers are exact.
        if mode == 1 && number < 0.0f64 {
            return make_float8_value(truncated - 1.0f64);
        };
        if mode == 2 && number > 0.0f64 {
            return make_float8_value(truncated + 1.0f64);
        };
        if mode == 3 {
            let remainder = (number - truncated).abs();
            let mut step = 1.0f64;
            if number < 0.0f64 {
                step = -1.0f64;
            };
            let half = truncated * 0.5f64;
            let odd = float8_number(float8_trunc_bits(half.to_bits() as i64)) != half;
            if remainder > 0.5f64 || (remainder == 0.5f64 && odd) {
                return make_float8_value(truncated + step);
            };
        };
        return make_float8_bits(truncated_bits);
    };
    input
}

pub fn sql__pg_catalog__dtrunc__1lg2(input: Float8Value) -> Float8Value {
    float8_rounded(input, 0)
}

pub fn sql__pg_catalog__trunc__6i9f(input: Float8Value) -> Float8Value {
    float8_rounded(input, 0)
}

pub fn sql__pg_catalog__floor__239f(input: Float8Value) -> Float8Value {
    float8_rounded(input, 1)
}

pub fn sql__pg_catalog__ceil__4g34(input: Float8Value) -> Float8Value {
    float8_rounded(input, 2)
}

pub fn sql__pg_catalog__ceiling__4qew(input: Float8Value) -> Float8Value {
    float8_rounded(input, 2)
}

// round(float8) is C's rint, which rounds halfway cases to even in the default rounding mode.
pub fn sql__pg_catalog__dround__7iwz(input: Float8Value) -> Float8Value {
    float8_rounded(input, 3)
}

pub fn sql__pg_catalog__round__e4jt(input: Float8Value) -> Float8Value {
    float8_rounded(input, 3)
}

// NaN compares neither above nor below zero, so it gives zero, as does negative zero.
pub fn sql__pg_catalog__sign__6cgs(input: Float8Value) -> Float8Value {
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number > 0.0f64 {
            return make_float8_value(1.0f64);
        };
        if number < 0.0f64 {
            return make_float8_value(-1.0f64);
        };
        return make_float8_value(0.0f64);
    };
    if input == Float8Value::UnspecifiedNan {
        return make_float8_value(0.0f64);
    };
    input
}

pub fn sql__pg_catalog__pi__rrpi() -> Float8Value {
    make_float8_value(3.14159265358979323846f64)
}

// degrees and radians divide or multiply by the same constant as PostgreSQL, with its checks for
// a finite argument overflowing or a nonzero argument underflowing.
fn float8_scaled(input: Float8Value, divide: bool) -> Float8Value {
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        let mut result = number * RADIANS_PER_DEGREE;
        if divide {
            result = number / RADIANS_PER_DEGREE;
        };
        let infinity = 1.0f64 / 0.0f64;
        if result.abs() == infinity && number.abs() != infinity {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if result == 0.0f64 && number != 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        return make_float8_value(result);
    };
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    input
}

pub fn sql__pg_catalog__degrees__qosk(input: Float8Value) -> Float8Value {
    float8_scaled(input, true)
}

pub fn sql__pg_catalog__radians__vm8j(input: Float8Value) -> Float8Value {
    float8_scaled(input, false)
}
