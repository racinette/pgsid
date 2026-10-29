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
