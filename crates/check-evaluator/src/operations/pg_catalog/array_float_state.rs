const FLOAT_ARRAY_STATE_ERROR: u32 = 56966976;

fn float_array_state_valid(input: &ArrayPayload, width: usize) -> BoolValue {
    if input.element_kind != 20 || input.element_type.as_str() != "pg_catalog.float8" {
        return BoolValue::Unknown;
    };
    if input.dimensions.len() != 1
        || input.elements.len() != width
        || input.null_bitmap == BoolValue::Value(true)
    {
        return BoolValue::Error(make_sql_error(FLOAT_ARRAY_STATE_ERROR));
    };
    if input.dimensions[0].length != width as i32 {
        return BoolValue::Error(make_sql_error(FLOAT_ARRAY_STATE_ERROR));
    };
    if input.null_bitmap == BoolValue::Value(false) {
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}

fn float_state_field(input: &ArrayPayload, index: usize) -> Float8Value {
    array_element_to_float8(input.elements[index].clone())
}

fn float_state_result(value: f64) -> Float8Value {
    if value != value {
        return Float8Value::UnspecifiedNan;
    };
    make_float8_value(value)
}

fn float_state_arithmetic(left: Float8Value, right: Float8Value, operation: i32) -> Float8Value {
    if let Float8Value::Error(error) = left {
        return Float8Value::Error(error);
    };
    if let Float8Value::Error(error) = right {
        return Float8Value::Error(error);
    };
    let first = float8_semantic(left);
    let second = float8_semantic(right);
    if let Float8Value::Value(a_bits) = first {
        if let Float8Value::Value(b_bits) = second {
            let a = float8_number(a_bits);
            let b = float8_number(b_bits);
            let mut result = 0.0f64;
            if operation == 0 {
                result = a + b;
            };
            if operation == 1 {
                result = a - b;
            };
            if operation == 2 {
                result = a * b;
            };
            if operation == 3 {
                result = a / b;
            };
            if operation == 4 {
                result = a.sqrt();
            };
            return float_state_result(result);
        };
    };
    Float8Value::Unknown
}

fn float_state_is_zero(input: Float8Value) -> bool {
    let value = float8_semantic(input);
    if let Float8Value::Value(bits) = value {
        return float8_number(bits) == 0.0f64;
    };
    false
}

fn float_array_final(input: ArrayValue, operation: i32) -> Float8Value {
    if let ArrayValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if let ArrayValue::Null = input {
        return Float8Value::Null;
    };
    if let ArrayValue::Value(value) = input {
        let mut width: usize = 3;
        if operation >= 5 {
            width = 6;
        };
        let validity = float_array_state_valid(&value, width);
        if let BoolValue::Error(error) = validity {
            return Float8Value::Error(error);
        };
        if validity != BoolValue::Value(true) {
            return Float8Value::Unknown;
        };
        let count = float_state_field(&value, 0);
        let known_count = float8_semantic(count);
        if let Float8Value::Value(bits) = known_count {
            let n = float8_number(bits);
            let mut sample = operation == 2 || operation == 4;
            if width == 3 {
                if sample {
                    if n <= 1.0f64 {
                        return Float8Value::Null;
                    };
                } else if n == 0.0f64 {
                    return Float8Value::Null;
                };
            } else {
                sample = operation == 11;
                let mut minimum = 1.0f64;
                if sample {
                    minimum = 2.0f64;
                };
                if n < minimum {
                    return Float8Value::Null;
                };
            };
            if operation == 5 {
                return float_state_field(&value, 2);
            };
            if operation == 6 {
                return float_state_field(&value, 4);
            };
            if operation == 7 {
                return float_state_field(&value, 5);
            };
            if operation <= 4
                || operation == 8
                || operation == 9
                || operation == 10
                || operation == 11
            {
                let mut index: usize = 2;
                if operation == 0 || operation == 8 {
                    index = 1;
                };
                if operation == 9 {
                    index = 3;
                };
                if operation == 10 || operation == 11 {
                    index = 5;
                };
                let numerator = float_state_field(&value, index);
                let mut denominator = count;
                if sample {
                    denominator = float_state_arithmetic(count, make_float8_value(1.0f64), 1);
                };
                let quotient = float_state_arithmetic(numerator, denominator, 3);
                if operation == 3 || operation == 4 {
                    return float_state_arithmetic(quotient, make_float8_value(1.0f64), 4);
                };
                return quotient;
            };
            let sxx = float_state_field(&value, 2);
            if float_state_is_zero(sxx) {
                return Float8Value::Null;
            };
            let sxy = float_state_field(&value, 5);
            if operation == 12 {
                let syy = float_state_field(&value, 4);
                if float_state_is_zero(syy) {
                    return Float8Value::Null;
                };
                let product = float_state_arithmetic(sxx, syy, 2);
                let root = float_state_arithmetic(product, make_float8_value(1.0f64), 4);
                return float_state_arithmetic(sxy, root, 3);
            };
            if operation == 13 {
                let known_sxx = float8_semantic(sxx);
                if let Float8Value::Value(_) = known_sxx {
                    let syy = float_state_field(&value, 4);
                    if float_state_is_zero(syy) {
                        return make_float8_value(1.0f64);
                    };
                    let numerator = float_state_arithmetic(sxy, sxy, 2);
                    let denominator = float_state_arithmetic(sxx, syy, 2);
                    return float_state_arithmetic(numerator, denominator, 3);
                };
                return Float8Value::Unknown;
            };
            if operation == 14 {
                return float_state_arithmetic(sxy, sxx, 3);
            };
            let sx = float_state_field(&value, 1);
            let sy = float_state_field(&value, 3);
            let product = float_state_arithmetic(sx, sxy, 2);
            let correction = float_state_arithmetic(product, sxx, 3);
            let difference = float_state_arithmetic(sy, correction, 1);
            return float_state_arithmetic(difference, count, 3);
        };
    };
    Float8Value::Unknown
}

pub fn sql__pg_catalog__float8_avg__zn36(input: ArrayValue) -> Float8Value {
    float_array_final(input, 0)
}

pub fn sql__pg_catalog__float8_var_pop__fml0(input: ArrayValue) -> Float8Value {
    float_array_final(input, 1)
}

pub fn sql__pg_catalog__float8_var_samp__6u1n(input: ArrayValue) -> Float8Value {
    float_array_final(input, 2)
}

pub fn sql__pg_catalog__float8_stddev_pop__mt1l(input: ArrayValue) -> Float8Value {
    float_array_final(input, 3)
}

pub fn sql__pg_catalog__float8_stddev_samp__duzt(input: ArrayValue) -> Float8Value {
    float_array_final(input, 4)
}

pub fn sql__pg_catalog__float8_regr_sxx__n77a(input: ArrayValue) -> Float8Value {
    float_array_final(input, 5)
}

pub fn sql__pg_catalog__float8_regr_syy__9soz(input: ArrayValue) -> Float8Value {
    float_array_final(input, 6)
}

pub fn sql__pg_catalog__float8_regr_sxy__16cy(input: ArrayValue) -> Float8Value {
    float_array_final(input, 7)
}

pub fn sql__pg_catalog__float8_regr_avgx__fe05(input: ArrayValue) -> Float8Value {
    float_array_final(input, 8)
}

pub fn sql__pg_catalog__float8_regr_avgy__29af(input: ArrayValue) -> Float8Value {
    float_array_final(input, 9)
}

pub fn sql__pg_catalog__float8_covar_pop__704y(input: ArrayValue) -> Float8Value {
    float_array_final(input, 10)
}

pub fn sql__pg_catalog__float8_covar_samp__eicx(input: ArrayValue) -> Float8Value {
    float_array_final(input, 11)
}

pub fn sql__pg_catalog__float8_corr__8af8(input: ArrayValue) -> Float8Value {
    float_array_final(input, 12)
}

pub fn sql__pg_catalog__float8_regr_r2__e7fd(input: ArrayValue) -> Float8Value {
    float_array_final(input, 13)
}

pub fn sql__pg_catalog__float8_regr_slope__qjk2(input: ArrayValue) -> Float8Value {
    float_array_final(input, 14)
}

pub fn sql__pg_catalog__float8_regr_intercept__m3ss(input: ArrayValue) -> Float8Value {
    float_array_final(input, 15)
}
