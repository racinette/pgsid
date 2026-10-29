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
