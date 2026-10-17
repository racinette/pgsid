fn float_transition_test(input: Float8Value, operation: i32) -> CheckOutcome {
    let value = float8_semantic(input);
    if let Float8Value::Value(bits) = value {
        let number = float8_number(bits);
        let infinity = 1.0f64 / 0.0f64;
        if operation == 0 {
            return check_from_bool(make_bool_value(number > 0.0f64));
        };
        if operation == 1 {
            return check_from_bool(make_bool_value(number == 0.0f64));
        };
        if operation == 2 {
            return check_from_bool(make_bool_value(number.abs() == infinity));
        };
        return check_from_bool(make_bool_value(
            number != number || number.abs() == infinity,
        ));
    };
    CheckOutcome::Unknown
}

fn float_transition_nan(input: Float8Value, condition: CheckOutcome) -> Float8Value {
    if condition == CheckOutcome::True {
        return Float8Value::UnspecifiedNan;
    };
    if condition == CheckOutcome::False {
        return input;
    };
    let value = float8_semantic(input);
    if let Float8Value::Value(bits) = value {
        let number = float8_number(bits);
        if number != number {
            return Float8Value::UnspecifiedNan;
        };
    };
    Float8Value::Unknown
}

fn float_transition_output(
    n: Float8Value,
    sx: Float8Value,
    sxx: Float8Value,
    sy: Float8Value,
    syy: Float8Value,
    sxy: Float8Value,
    regression: bool,
) -> ArrayValue {
    let mut elements: Vec<ArrayElement> = Vec::new();
    elements.push(array_element_from_float8(n));
    elements.push(array_element_from_float8(sx));
    elements.push(array_element_from_float8(sxx));
    let mut width = 3;
    if regression {
        width = 6;
        elements.push(array_element_from_float8(sy));
        elements.push(array_element_from_float8(syy));
        elements.push(array_element_from_float8(sxy));
    };
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    dimensions.push(ArrayDimension {
        lower: 1,
        length: width,
    });
    make_array_value(ArrayPayload {
        element_type: "pg_catalog.float8".to_owned(),
        element_kind: 20,
        dimensions: dimensions,
        elements: elements,
        null_bitmap: BoolValue::Value(false),
    })
}

fn float_transition_overflow(
    infinite: CheckOutcome,
    old: Float8Value,
    incoming: Float8Value,
) -> CheckOutcome {
    let finite_old = not_finish(float_transition_test(old, 2));
    let finite_new = not_finish(float_transition_test(incoming, 2));
    and_finish(infinite, and_finish(finite_old, finite_new))
}

fn float_array_accumulate(
    input: ArrayValue,
    y: Float8Value,
    x: Float8Value,
    regression: bool,
) -> ArrayValue {
    if let ArrayValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let Float8Value::Error(error) = y {
        return ArrayValue::Error(error);
    };
    if let Float8Value::Error(error) = x {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayValue::Null;
    };
    if x == Float8Value::Null || y == Float8Value::Null {
        return ArrayValue::Null;
    };
    if x == Float8Value::Unknown || y == Float8Value::Unknown {
        return ArrayValue::Unknown;
    };
    if let ArrayValue::Value(value) = input {
        let mut width: usize = 3;
        if regression {
            width = 6;
        };
        let validity = float_array_state_valid(&value, width);
        if let BoolValue::Error(error) = validity {
            return ArrayValue::Error(error);
        };
        if validity != BoolValue::Value(true) {
            return ArrayValue::Unknown;
        };
        let old_n = float_state_field(&value, 0);
        let positive = float_transition_test(old_n, 0);
        if positive == CheckOutcome::Unknown {
            return ArrayValue::Unknown;
        };
        let old_sx = float_state_field(&value, 1);
        let n = float_state_arithmetic(old_n, make_float8_value(1.0f64), 0);
        let sx = float_state_arithmetic(old_sx, x, 0);
        let mut sxx = float_state_field(&value, 2);
        let mut old_sy = make_float8_value(0.0f64);
        let mut sy = old_sy;
        let mut syy = old_sy;
        let mut sxy = old_sy;
        if regression {
            old_sy = float_state_field(&value, 3);
            sy = float_state_arithmetic(old_sy, y, 0);
            syy = float_state_field(&value, 4);
            sxy = float_state_field(&value, 5);
        };
        if positive == CheckOutcome::True {
            let tx = float_state_arithmetic(float_state_arithmetic(x, n, 2), sx, 1);
            let denominator = float_state_arithmetic(n, old_n, 2);
            let square = float_state_arithmetic(tx, tx, 2);
            let mut correction = float_state_arithmetic(square, denominator, 3);
            let mut scale = make_float8_value(0.0f64);
            if regression {
                scale = float_state_arithmetic(make_float8_value(1.0f64), denominator, 3);
                correction = float_state_arithmetic(square, scale, 2);
            };
            sxx = float_state_arithmetic(sxx, correction, 0);
            let x_infinite = or_finish(float_transition_test(sx, 2), float_transition_test(sxx, 2));
            let mut overflow = float_transition_overflow(x_infinite, old_sx, x);
            if regression {
                let ty = float_state_arithmetic(float_state_arithmetic(y, n, 2), sy, 1);
                let y_square = float_state_arithmetic(ty, ty, 2);
                syy = float_state_arithmetic(syy, float_state_arithmetic(y_square, scale, 2), 0);
                let product = float_state_arithmetic(tx, ty, 2);
                sxy = float_state_arithmetic(sxy, float_state_arithmetic(product, scale, 2), 0);
                let y_infinite =
                    or_finish(float_transition_test(sy, 2), float_transition_test(syy, 2));
                overflow = or_finish(overflow, float_transition_overflow(y_infinite, old_sy, y));
                let xy_overflow =
                    float_transition_overflow(float_transition_test(sxy, 2), old_sx, x);
                overflow = or_finish(overflow, float_transition_overflow(xy_overflow, old_sy, y));
                syy = float_transition_nan(syy, float_transition_test(syy, 2));
                sxy = float_transition_nan(sxy, float_transition_test(sxy, 2));
                sxx = float_transition_nan(sxx, float_transition_test(sxx, 2));
            } else {
                sxx = float_transition_nan(sxx, x_infinite);
            };
            if overflow == CheckOutcome::True {
                return ArrayValue::Error(make_sql_error(FLOAT_CORE_RANGE));
            };
            if overflow != CheckOutcome::False {
                return ArrayValue::Unknown;
            };
        } else {
            let special_x = float_transition_test(x, 3);
            sxx = float_transition_nan(sxx, special_x);
            if regression {
                let special_y = float_transition_test(y, 3);
                syy = float_transition_nan(syy, special_y);
                sxy = float_transition_nan(sxy, or_finish(special_x, special_y));
            };
        };
        return float_transition_output(n, sx, sxx, sy, syy, sxy, regression);
    };
    ArrayValue::Unknown
}

fn float_transition_copy(input: &ArrayPayload, regression: bool) -> ArrayValue {
    let mut sy = make_float8_value(0.0f64);
    let mut syy = sy;
    let mut sxy = sy;
    if regression {
        sy = float_state_field(input, 3);
        syy = float_state_field(input, 4);
        sxy = float_state_field(input, 5);
    };
    float_transition_output(
        float_state_field(input, 0),
        float_state_field(input, 1),
        float_state_field(input, 2),
        sy,
        syy,
        sxy,
        regression,
    )
}

fn float_combine_variance(
    first: Float8Value,
    second: Float8Value,
    counts: Float8Value,
    tx: Float8Value,
    ty: Float8Value,
    n: Float8Value,
) -> Float8Value {
    let product = float_state_arithmetic(float_state_arithmetic(counts, tx, 2), ty, 2);
    let correction = float_state_arithmetic(product, n, 3);
    let sum = float_state_arithmetic(first, second, 0);
    let result = float_state_arithmetic(sum, correction, 0);
    let overflow = float_transition_overflow(float_transition_test(result, 2), first, second);
    if overflow == CheckOutcome::True {
        return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
    };
    if overflow != CheckOutcome::False {
        return Float8Value::Unknown;
    };
    result
}

fn float_array_combine(left: ArrayValue, right: ArrayValue, regression: bool) -> ArrayValue {
    if let ArrayValue::Error(error) = left {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Error(error) = right {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = left {
        return ArrayValue::Null;
    };
    if let ArrayValue::Null = right {
        return ArrayValue::Null;
    };
    if let ArrayValue::Value(first) = left {
        if let ArrayValue::Value(second) = right {
            let mut width: usize = 3;
            if regression {
                width = 6;
            };
            let first_valid = float_array_state_valid(&first, width);
            let second_valid = float_array_state_valid(&second, width);
            if let BoolValue::Error(error) = first_valid {
                return ArrayValue::Error(error);
            };
            if let BoolValue::Error(error) = second_valid {
                return ArrayValue::Error(error);
            };
            if first_valid != BoolValue::Value(true) || second_valid != BoolValue::Value(true) {
                return ArrayValue::Unknown;
            };
            let n1 = float_state_field(&first, 0);
            let n2 = float_state_field(&second, 0);
            let first_empty = float_transition_test(n1, 1);
            if first_empty == CheckOutcome::True {
                return float_transition_copy(&second, regression);
            };
            if first_empty != CheckOutcome::False {
                return ArrayValue::Unknown;
            };
            let second_empty = float_transition_test(n2, 1);
            if second_empty == CheckOutcome::True {
                return float_transition_copy(&first, regression);
            };
            if second_empty != CheckOutcome::False {
                return ArrayValue::Unknown;
            };
            let n = float_state_arithmetic(n1, n2, 0);
            let counts = float_state_arithmetic(n1, n2, 2);
            let mut results: Vec<Float8Value> = Vec::new();
            let mut tx = make_float8_value(0.0f64);
            let mut ty = tx;
            let mut index: usize = 1;
            while index < width {
                let a = float_state_field(&first, index);
                let b = float_state_field(&second, index);
                let mut result = Float8Value::Unknown;
                if index == 1 || index == 3 {
                    result = sql__pg_catalog__float8pl__g3ou(a, b);
                    let difference = float_state_arithmetic(
                        float_state_arithmetic(a, n1, 3),
                        float_state_arithmetic(b, n2, 3),
                        1,
                    );
                    if index == 1 {
                        tx = difference;
                    } else {
                        ty = difference;
                    };
                } else {
                    let mut x = tx;
                    let mut y = tx;
                    if index == 4 {
                        x = ty;
                        y = ty;
                    };
                    if index == 5 {
                        y = ty;
                    };
                    result = float_combine_variance(a, b, counts, x, y, n);
                };
                if let Float8Value::Error(error) = result {
                    return ArrayValue::Error(error);
                };
                if result == Float8Value::Unknown {
                    return ArrayValue::Unknown;
                };
                results.push(result);
                index += 1;
            }
            let mut sy = make_float8_value(0.0f64);
            let mut syy = sy;
            let mut sxy = sy;
            if regression {
                sy = results[2];
                syy = results[3];
                sxy = results[4];
            };
            return float_transition_output(n, results[0], results[1], sy, syy, sxy, regression);
        };
    };
    ArrayValue::Unknown
}

pub fn sql__pg_catalog__float4_accum__nnxi(input: ArrayValue, amount: Float4Value) -> ArrayValue {
    float_array_accumulate(
        input,
        make_float8_value(0.0f64),
        float4_widen(amount),
        false,
    )
}

pub fn sql__pg_catalog__float8_accum__ma58(input: ArrayValue, amount: Float8Value) -> ArrayValue {
    float_array_accumulate(input, make_float8_value(0.0f64), amount, false)
}

pub fn sql__pg_catalog__float8_regr_accum__iufl(
    input: ArrayValue,
    y: Float8Value,
    x: Float8Value,
) -> ArrayValue {
    float_array_accumulate(input, y, x, true)
}

pub fn sql__pg_catalog__float8_combine__5got(left: ArrayValue, right: ArrayValue) -> ArrayValue {
    float_array_combine(left, right, false)
}

pub fn sql__pg_catalog__float8_regr_combine__nbvr(
    left: ArrayValue,
    right: ArrayValue,
) -> ArrayValue {
    float_array_combine(left, right, true)
}
