// sin and cos follow PostgreSQL's dsin and dcos: NaN returns NaN and an infinite argument is out
// of range whatever the libm, and other results come from the fdlibm kernels that the trigonometry
// setting declares as the deployment's libm. fdlibm reduces |x| and restores the sign, so sine is
// odd and cosine even; arguments beyond the medium reduction range, which needs Payne-Hanek
// reduction, defer.
fn float8_trigonometry(input: Float8Value, fdlibm: bool, cosine: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        let magnitude = number.abs();
        if magnitude == 1.0f64 / 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if fdlibm == false || circle_math_high_word(magnitude) >= 1094263291 {
            return Float8Value::Unknown;
        };
        let mut result = circle_trigonometry(magnitude, cosine);
        if cosine == false && bits < 0i64 {
            result = -result;
        };
        return make_float8_value(result);
    };
    input
}

pub fn sql__pg_catalog__sin__vhu2(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_trigonometry(input, fdlibm, false)
}

pub fn sql__pg_catalog__cos__xj1c(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_trigonometry(input, fdlibm, true)
}

// C's fmod is exact: subtracting halving power-of-two multiples of the divisor never rounds, and
// the result keeps the dividend's sign, including negative zero.
fn float8_fmod_360(number: f64) -> f64 {
    let mut remainder = number.abs();
    let mut step = 360.0f64;
    while step * 2.0f64 <= remainder {
        step = step * 2.0f64;
    }
    while step >= 360.0f64 {
        if remainder >= step {
            remainder = remainder - step;
        };
        step = step * 0.5f64;
    }
    if number < 0.0f64 || (number == 0.0f64 && 1.0f64 / number < 0.0f64) {
        return -remainder;
    };
    remainder
}

fn float8_degree_sine(x: f64) -> f64 {
    let sin_x = circle_trigonometry(x * RADIANS_PER_DEGREE, false);
    let sin_30 = circle_trigonometry(30.0f64 * RADIANS_PER_DEGREE, false);
    (sin_x / sin_30) / 2.0f64
}

fn float8_degree_cosine(x: f64) -> f64 {
    let one_minus_cos_x = 1.0f64 - circle_trigonometry(x * RADIANS_PER_DEGREE, true);
    let one_minus_cos_60 = 1.0f64 - circle_trigonometry(60.0f64 * RADIANS_PER_DEGREE, true);
    1.0f64 - (one_minus_cos_x / one_minus_cos_60) / 2.0f64
}

// sind and cosd follow PostgreSQL's dsind and dcosd: reduce modulo 360 degrees, fold into the
// first quadrant while tracking the sign, and splice exact endpoints at 30 and 60 degrees.
fn float8_degree_trigonometry(input: Float8Value, fdlibm: bool, cosine: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if number.abs() == 1.0f64 / 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if fdlibm == false {
            return Float8Value::Unknown;
        };
        let mut angle = float8_fmod_360(number);
        let mut sign = 1.0f64;
        if angle < 0.0f64 {
            angle = -angle;
            if cosine == false {
                sign = -sign;
            };
        };
        if angle > 180.0f64 {
            angle = 360.0f64 - angle;
            if cosine == false {
                sign = -sign;
            };
        };
        if angle > 90.0f64 {
            angle = 180.0f64 - angle;
            if cosine {
                sign = -sign;
            };
        };
        let mut quadrant = 0.0f64;
        if cosine {
            if angle <= 60.0f64 {
                quadrant = float8_degree_cosine(angle);
            } else {
                quadrant = float8_degree_sine(90.0f64 - angle);
            };
        } else {
            if angle <= 30.0f64 {
                quadrant = float8_degree_sine(angle);
            } else {
                quadrant = float8_degree_cosine(90.0f64 - angle);
            };
        };
        return make_float8_value(sign * quadrant);
    };
    input
}

pub fn sql__pg_catalog__sind__n2je(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_degree_trigonometry(input, fdlibm, false)
}

pub fn sql__pg_catalog__cosd__ykq9(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_degree_trigonometry(input, fdlibm, true)
}

// SET_LOW_WORD(x, 0): keeps the sign, exponent and high fraction bits of the double.
fn float8_clear_low_word(value: f64) -> f64 {
    let bits = value.to_bits() as i64;
    let low = ((bits % 4294967296i64) + 4294967296i64) % 4294967296i64;
    f64::from_bits((bits - low) as u64)
}

// musl's __tan kernel for |x| <= pi/4 with tail y; odd selects -1/tan.
fn float8_tan_kernel(head: f64, tail: f64, odd: bool) -> f64 {
    let mut x = head;
    let mut y = tail;
    let big = circle_math_high_word(x) >= 1072010280;
    let mut negative = false;
    if big {
        if x < 0.0f64 || (x == 0.0f64 && 1.0f64 / x < 0.0f64) {
            negative = true;
            x = -x;
            y = -y;
        };
        x = (7.85398163397448278999e-01f64 - x) + (3.06161699786838301793e-17f64 - y);
        y = 0.0f64;
    };
    let z = x * x;
    let mut w = z * z;
    let mut r = 1.33333333333201242699e-01f64
        + w * (2.18694882948595424599e-02f64
            + w * (3.59207910759131235356e-03f64
                + w * (5.88041240820264096874e-04f64
                    + w * (7.81794442939557092300e-05f64 + w * -1.85586374855275456654e-05f64))));
    let mut v = z
        * (5.39682539762260521377e-02f64
            + w * (8.86323982359930005737e-03f64
                + w * (1.45620945432529025516e-03f64
                    + w * (2.46463134818469906812e-04f64
                        + w * (7.14072491382608190305e-05f64
                            + w * 2.59073051863633712884e-05f64)))));
    let mut s = z * x;
    r = y + z * (s * (r + v) + y) + s * 3.33333333333334091986e-01f64;
    w = x + r;
    if big {
        s = 1.0f64;
        if odd {
            s = -1.0f64;
        };
        v = s - 2.0f64 * (x + (r - w * w / (w + s)));
        if negative {
            return -v;
        };
        return v;
    };
    if odd == false {
        return w;
    };
    let w0 = float8_clear_low_word(w);
    v = r - (w0 - x);
    let a = -1.0f64 / w;
    let a0 = float8_clear_low_word(a);
    a0 + a * (1.0f64 + a0 * w0 + a0 * v)
}

// tan and cot follow PostgreSQL's dtan and dcot over musl's tan, which is odd in its argument,
// so |x| is reduced and the sign restored; cot is 1/tan, infinite at zero as in PostgreSQL.
fn float8_tangent(input: Float8Value, fdlibm: bool, cotangent: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        let magnitude = number.abs();
        if magnitude == 1.0f64 / 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        let high = circle_math_high_word(magnitude);
        if fdlibm == false || high >= 1094263291 {
            return Float8Value::Unknown;
        };
        let mut result = magnitude;
        if high <= 1072243195 {
            if high >= 1044381696 {
                result = float8_tan_kernel(magnitude, 0.0f64, false);
            };
        } else {
            let reduced = circle_reduce_angle(magnitude);
            result = float8_tan_kernel(
                f64::from_bits(reduced.head as u64),
                f64::from_bits(reduced.tail as u64),
                reduced.quadrant % 2 != 0,
            );
        };
        if bits < 0i64 {
            result = -result;
        };
        if cotangent {
            result = 1.0f64 / result;
        };
        return make_float8_value(result);
    };
    input
}

pub fn sql__pg_catalog__tan__9kzu(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_tangent(input, fdlibm, false)
}

pub fn sql__pg_catalog__cot__8cml(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_tangent(input, fdlibm, true)
}

fn float8_degree_sine_q1(x: f64) -> f64 {
    if x <= 30.0f64 {
        return float8_degree_sine(x);
    };
    float8_degree_cosine(90.0f64 - x)
}

fn float8_degree_cosine_q1(x: f64) -> f64 {
    if x <= 60.0f64 {
        return float8_degree_cosine(x);
    };
    float8_degree_sine(90.0f64 - x)
}

// tand and cotd follow PostgreSQL's dtand and dcotd: the sine and cosine folds, a quotient scaled
// by tan(45) or cot(45) so that 45 degrees is exactly one, and zero normalized to positive zero.
fn float8_degree_tangent(input: Float8Value, fdlibm: bool, cotangent: bool) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return Float8Value::UnspecifiedNan;
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
        if number.abs() == 1.0f64 / 0.0f64 {
            return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
        };
        if fdlibm == false {
            return Float8Value::Unknown;
        };
        let mut angle = float8_fmod_360(number);
        let mut sign = 1.0f64;
        if angle < 0.0f64 {
            angle = -angle;
            sign = -sign;
        };
        if angle > 180.0f64 {
            angle = 360.0f64 - angle;
            sign = -sign;
        };
        if angle > 90.0f64 {
            angle = 180.0f64 - angle;
            sign = -sign;
        };
        let tan_45 = float8_degree_sine_q1(45.0f64) / float8_degree_cosine_q1(45.0f64);
        let mut result = 0.0f64;
        if cotangent {
            let cot_45 = float8_degree_cosine_q1(45.0f64) / float8_degree_sine_q1(45.0f64);
            result =
                sign * ((float8_degree_cosine_q1(angle) / float8_degree_sine_q1(angle)) / cot_45);
        } else {
            result =
                sign * ((float8_degree_sine_q1(angle) / float8_degree_cosine_q1(angle)) / tan_45);
        };
        if result == 0.0f64 {
            result = 0.0f64;
        };
        return make_float8_value(result);
    };
    input
}

pub fn sql__pg_catalog__tand__3ov2(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_degree_tangent(input, fdlibm, false)
}

pub fn sql__pg_catalog__cotd__alh0(input: Float8Value, fdlibm: bool) -> Float8Value {
    float8_degree_tangent(input, fdlibm, true)
}
