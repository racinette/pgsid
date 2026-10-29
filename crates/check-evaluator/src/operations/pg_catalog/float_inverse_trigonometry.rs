/*
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 */

// Transcribed from musl's asin, acos, atan and atan2, which PostgreSQL calls through dasin,
// dacos, datan and datan2. Sign tests use the bit pattern so that negative zero keeps its sign.

const INVERSE_PIO2_HI: f64 = 1.57079632679489655800e+00f64;
const INVERSE_PIO2_LO: f64 = 6.12323399573676603587e-17f64;
const INVERSE_PI: f64 = 3.1415926535897931160e+00f64;
const INVERSE_PI_LO: f64 = 1.2246467991473531772e-16f64;

fn float8_negative(value: f64) -> bool {
    (value.to_bits() as i64) < 0i64
}

fn float8_inverse_rational(z: f64) -> f64 {
    let p = z
        * (1.66666666666666657415e-01f64
            + z * (-3.25565818622400915405e-01f64
                + z * (2.01212532134862925881e-01f64
                    + z * (-4.00555345006794114027e-02f64
                        + z * (7.91534994289814532176e-04f64
                            + z * 3.47933107596021167570e-05f64)))));
    let q = 1.0f64
        + z * (-2.40339491173441421878e+00f64
            + z * (2.02094576023350569471e+00f64
                + z * (-6.88283971605453293030e-01f64 + z * 7.70381505559019352791e-02f64)));
    p / q
}

// Arguments are within [-1, 1]; PostgreSQL rejects others first.
fn float8_asin_kernel(x: f64) -> f64 {
    let high = circle_math_high_word(x);
    if high >= 1072693248 {
        if float8_negative(x) {
            return -INVERSE_PIO2_HI;
        };
        return INVERSE_PIO2_HI;
    };
    if high < 1071644672 {
        if high < 1045430272 {
            return x;
        };
        return x + x * float8_inverse_rational(x * x);
    };
    let z = (1.0f64 - x.abs()) * 0.5f64;
    let s = z.sqrt();
    let r = float8_inverse_rational(z);
    let mut result = 0.0f64;
    if high >= 1072640819 {
        result = INVERSE_PIO2_HI - (2.0f64 * (s + s * r) - INVERSE_PIO2_LO);
    } else {
        let f = float8_clear_low_word(s);
        let c = (z - f * f) / (s + f);
        result = 0.5f64 * INVERSE_PIO2_HI
            - (2.0f64 * s * r
                - (INVERSE_PIO2_LO - 2.0f64 * c)
                - (0.5f64 * INVERSE_PIO2_HI - 2.0f64 * f));
    };
    if float8_negative(x) {
        return -result;
    };
    result
}

fn float8_acos_kernel(x: f64) -> f64 {
    let high = circle_math_high_word(x);
    if high >= 1072693248 {
        if float8_negative(x) {
            return 2.0f64 * INVERSE_PIO2_HI;
        };
        return 0.0f64;
    };
    if high < 1071644672 {
        if high <= 1012924416 {
            return INVERSE_PIO2_HI;
        };
        return INVERSE_PIO2_HI - (x - (INVERSE_PIO2_LO - x * float8_inverse_rational(x * x)));
    };
    if float8_negative(x) {
        let z = (1.0f64 + x) * 0.5f64;
        let s = z.sqrt();
        let w = float8_inverse_rational(z) * s - INVERSE_PIO2_LO;
        return 2.0f64 * (INVERSE_PIO2_HI - (s + w));
    };
    let z = (1.0f64 - x) * 0.5f64;
    let s = z.sqrt();
    let df = float8_clear_low_word(s);
    let c = (z - df * df) / (s + df);
    let w = float8_inverse_rational(z) * s + c;
    2.0f64 * (df + w)
}

fn float8_atan_kernel(input: f64) -> f64 {
    let high = circle_math_high_word(input);
    let negative = float8_negative(input);
    if high >= 1141899264 {
        if negative {
            return -INVERSE_PIO2_HI;
        };
        return INVERSE_PIO2_HI;
    };
    let mut x = input;
    let mut id: i32 = -1;
    let mut atan_hi = 0.0f64;
    let mut atan_lo = 0.0f64;
    if high < 1071382528 {
        if high < 1044381696 {
            return x;
        };
    } else {
        x = x.abs();
        if high < 1072889856 {
            if high < 1072037888 {
                id = 0;
                atan_hi = 4.63647609000806093515e-01f64;
                atan_lo = 2.26987774529616870924e-17f64;
                x = (2.0f64 * x - 1.0f64) / (2.0f64 + x);
            } else {
                id = 1;
                atan_hi = 7.85398163397448278999e-01f64;
                atan_lo = 3.06161699786838301793e-17f64;
                x = (x - 1.0f64) / (x + 1.0f64);
            };
        } else {
            if high < 1073971200 {
                id = 2;
                atan_hi = 9.82793723247329054082e-01f64;
                atan_lo = 1.39033110312309984516e-17f64;
                x = (x - 1.5f64) / (1.0f64 + 1.5f64 * x);
            } else {
                id = 3;
                atan_hi = INVERSE_PIO2_HI;
                atan_lo = INVERSE_PIO2_LO;
                x = -1.0f64 / x;
            };
        };
    };
    let z = x * x;
    let w = z * z;
    let s1 = z
        * (3.33333333333329318027e-01f64
            + w * (1.42857142725034663711e-01f64
                + w * (9.09088713343650656196e-02f64
                    + w * (6.66107313738753120669e-02f64
                        + w * (4.97687799461593236017e-02f64
                            + w * 1.62858201153657823623e-02f64)))));
    let s2 = w
        * (-1.99999999998764832476e-01f64
            + w * (-1.11111104054623557880e-01f64
                + w * (-7.69187620504482999495e-02f64
                    + w * (-5.83357013379057348645e-02f64 + w * -3.65315727442169155270e-02f64))));
    if id < 0 {
        return x - x * (s1 + s2);
    };
    let result = atan_hi - (x * (s1 + s2) - atan_lo - x);
    if negative {
        return -result;
    };
    result
}

fn float8_atan2_kernel(y: f64, x: f64) -> f64 {
    if x == 1.0f64 {
        return float8_atan_kernel(y);
    };
    let mut quadrant: i32 = 0;
    if float8_negative(y) {
        quadrant = quadrant + 1;
    };
    if float8_negative(x) {
        quadrant = quadrant + 2;
    };
    let infinity = 1.0f64 / 0.0f64;
    if y == 0.0f64 {
        if quadrant < 2 {
            return y;
        };
        if quadrant == 2 {
            return INVERSE_PI;
        };
        return -INVERSE_PI;
    };
    if x == 0.0f64 {
        if quadrant % 2 == 1 {
            return -INVERSE_PI / 2.0f64;
        };
        return INVERSE_PI / 2.0f64;
    };
    if x.abs() == infinity {
        if y.abs() == infinity {
            if quadrant == 0 {
                return INVERSE_PI / 4.0f64;
            };
            if quadrant == 1 {
                return -INVERSE_PI / 4.0f64;
            };
            if quadrant == 2 {
                return 3.0f64 * INVERSE_PI / 4.0f64;
            };
            return -3.0f64 * INVERSE_PI / 4.0f64;
        };
        if quadrant == 0 {
            return 0.0f64;
        };
        if quadrant == 1 {
            return -0.0f64;
        };
        if quadrant == 2 {
            return INVERSE_PI;
        };
        return -INVERSE_PI;
    };
    let x_high = circle_math_high_word(x) as i64;
    let y_high = circle_math_high_word(y) as i64;
    if x_high + 67108864i64 < y_high || y.abs() == infinity {
        if quadrant % 2 == 1 {
            return -INVERSE_PI / 2.0f64;
        };
        return INVERSE_PI / 2.0f64;
    };
    let mut z = 0.0f64;
    if quadrant < 2 || y_high + 67108864i64 >= x_high {
        z = float8_atan_kernel((y / x).abs());
    };
    if quadrant == 0 {
        return z;
    };
    if quadrant == 1 {
        return -z;
    };
    if quadrant == 2 {
        return INVERSE_PI - (z - INVERSE_PI_LO);
    };
    (z - INVERSE_PI_LO) - INVERSE_PI
}

fn float8_inverse_trigonometry(input: Float8Value, fdlibm: bool, operation: i32) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if operation < 2 && (number < -1.0f64 || number > 1.0f64) {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if fdlibm == false {
            return Float8Value::Unknown;
        };
        if operation == 0 {
            return make_float8_value(float8_asin_kernel(number));
        };
        if operation == 1 {
            return make_float8_value(float8_acos_kernel(number));
        };
        return make_float8_value(float8_atan_kernel(number));
    };
    input
}

pub fn sql__pg_catalog__asin__texy(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_inverse_trigonometry(input, fdlibm, 0)
}

pub fn sql__pg_catalog__acos__h2s5(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_inverse_trigonometry(input, fdlibm, 1)
}

pub fn sql__pg_catalog__atan__qn3s(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_inverse_trigonometry(input, fdlibm, 2)
}

pub fn sql__pg_catalog__atan2__re5y(
    left: Float8Value,
    right: Float8Value,
    fdlibm: bool,
) -> Float8Value {
    if let Float8Value::Error(error) = left {
        return Float8Value::Error(error);
    };
    if let Float8Value::Error(error) = right {
        return Float8Value::Error(error);
    };
    if left == Float8Value::Unknown || right == Float8Value::Unknown {
        return Float8Value::Unknown;
    };
    if left == Float8Value::Null || right == Float8Value::Null {
        return Float8Value::Null;
    };
    let known_left = float8_semantic(left);
    let known_right = float8_semantic(right);
    if let Float8Value::Value(left_bits) = known_left {
        if let Float8Value::Value(right_bits) = known_right {
            let y = float8_number(left_bits);
            let x = float8_number(right_bits);
            if y != y || x != x {
                return Float8Value::UnspecifiedNan;
            };
            if fdlibm == false {
                return Float8Value::Unknown;
            };
            return make_float8_value(float8_atan2_kernel(y, x));
        };
    };
    Float8Value::Unknown
}

// The degree variants follow PostgreSQL's dasind, dacosd, datand and datan2d, which scale by
// asin(0.5), acos(0.5) and atan(1.0) so that 0.5 and 1 give exact multiples of 30 and 45 degrees.
fn float8_asind_q1(x: f64) -> f64 {
    if x <= 0.5f64 {
        return (float8_asin_kernel(x) / float8_asin_kernel(0.5f64)) * 30.0f64;
    };
    90.0f64 - (float8_acos_kernel(x) / float8_acos_kernel(0.5f64)) * 60.0f64
}

fn float8_acosd_q1(x: f64) -> f64 {
    if x <= 0.5f64 {
        return 90.0f64 - (float8_asin_kernel(x) / float8_asin_kernel(0.5f64)) * 30.0f64;
    };
    (float8_acos_kernel(x) / float8_acos_kernel(0.5f64)) * 60.0f64
}

fn float8_inverse_degrees(input: Float8Value, fdlibm: bool, operation: i32) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if operation < 2 && (number < -1.0f64 || number > 1.0f64) {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if fdlibm == false {
            return Float8Value::Unknown;
        };
        if operation == 0 {
            if number >= 0.0f64 {
                return make_float8_value(float8_asind_q1(number));
            };
            return make_float8_value(-float8_asind_q1(-number));
        };
        if operation == 1 {
            if number >= 0.0f64 {
                return make_float8_value(float8_acosd_q1(number));
            };
            return make_float8_value(90.0f64 + float8_asind_q1(-number));
        };
        return make_float8_value(
            (float8_atan_kernel(number) / float8_atan_kernel(1.0f64)) * 45.0f64,
        );
    };
    input
}

pub fn sql__pg_catalog__asind__6yjl(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_inverse_degrees(input, fdlibm, 0)
}

pub fn sql__pg_catalog__acosd__djhi(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_inverse_degrees(input, fdlibm, 1)
}

pub fn sql__pg_catalog__atand__otu6(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_inverse_degrees(input, fdlibm, 2)
}

pub fn sql__pg_catalog__atan2d__9uaz(
    left: Float8Value,
    right: Float8Value,
    fdlibm: bool,
) -> Float8Value {
    let radians = sql__pg_catalog__atan2__re5y(left, right, fdlibm);
    if let Float8Value::Value(bits) = radians {
        return make_float8_value((float8_number(bits) / float8_atan_kernel(1.0f64)) * 45.0f64);
    };
    radians
}
