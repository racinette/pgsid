const NUMERIC_POWER_INVALID_ARGUMENT: u32 = 3452595;

fn numeric_power_sign(work: NumericWork) -> i32 {
    if work.special == 0 {
        return -1;
    }
    if work.special == 2 {
        return 1;
    }
    work.sign
}

fn numeric_power_integral(work: NumericWork) -> bool {
    if work.special == 3 {
        return false;
    }
    if work.special != 1 {
        return true;
    }
    numeric_work_min_scale(work) == 0
}

fn numeric_power_odd(work: NumericWork) -> bool {
    let characters: Vec<char> = work.digits.chars().collect();
    let mut position = work.weight;
    let mut index: usize = 0;
    while index < characters.len() {
        if position == 0 {
            return numeric_wire_decimal_digit(characters[index]) % 2 != 0;
        }
        index += 1;
        position = position - 1;
    }
    false
}

fn numeric_power_positive(work: NumericWork) -> NumericWork {
    let mut sign = work.sign;
    if sign < 0 {
        sign = 1;
    }
    NumericWork {
        valid: work.valid,
        special: work.special,
        sign: sign,
        weight: work.weight,
        scale: work.scale,
        digits: work.digits,
    }
}

fn numeric_power_decimal_estimate(work: NumericWork) -> f64 {
    if work.sign == 0 {
        return 0.0f64;
    }
    let characters: Vec<char> = work.digits.chars().collect();
    let group_weight = numeric_math_group_weight(work.clone());
    let mut exponent = group_weight * 4;
    let mut width = work.weight - exponent + 1;
    let mut index: usize = 0;
    let mut leading: f64 = 0.0f64;
    let mut groups: i32 = 0;
    let mut advancing = true;
    while advancing {
        let mut digit: i32 = 0;
        while width > 0 {
            digit = digit * 10;
            if index < characters.len() {
                digit = digit + numeric_wire_decimal_digit(characters[index]);
                index += 1;
            }
            width = width - 1;
        }
        leading = leading * 10000.0f64 + digit as f64;
        groups = groups + 1;
        if index < characters.len() && groups < 4 {
            width = 4;
            exponent = exponent - 4;
        } else {
            advancing = false;
        };
    }
    leading.log10() + exponent as f64
}

fn numeric_power_scale(estimate: f64, base_scale: i32, exponent_scale: i32) -> i32 {
    let mut scale = 16 - estimate as i32;
    if scale < base_scale {
        scale = base_scale;
    }
    if scale < exponent_scale {
        scale = exponent_scale;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    scale
}

fn numeric_power_integer(base: NumericWork, exponent: i32, exponent_scale: i32) -> NumericValue {
    let estimate = exponent as f64 * numeric_power_decimal_estimate(base.clone());
    if estimate > 131072.0f64 {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    if estimate + 1.0f64 < -1000.0f64 {
        return NumericValue::Value(numeric_work_text(numeric_work_rounded(
            numeric_work_from_value("0"),
            1000,
            1,
        )));
    }
    let scale = numeric_power_scale(estimate, base.scale, exponent_scale);
    if exponent == 0 {
        return numeric_work_round(numeric_work_from_value("1"), scale, 1);
    }
    if exponent == 1 {
        return numeric_work_round(base, scale, 1);
    }
    if exponent == -1 {
        return numeric_work_round(
            numeric_division_work(numeric_work_from_value("1"), base, scale, true),
            scale,
            1,
        );
    }
    if exponent == 2 {
        return numeric_work_round(numeric_work_product(base.clone(), base), scale, 1);
    }
    if base.sign == 0 {
        return numeric_work_round(base, scale, 1);
    }
    let mut significant = 1 + scale + estimate as i32;
    significant = significant + ((exponent as f64).abs().ln()) as i32 + 8;
    let mut negative = exponent < 0;
    let mut mask = exponent as i64;
    if negative {
        mask = 0i64 - mask;
    }
    let mut product = base.clone();
    let mut result = numeric_work_from_value("1");
    if mask % 2i64 != 0i64 {
        result = base;
    }
    mask = mask / 2i64;
    while mask > 0i64 {
        let mut local_scale = significant - numeric_math_group_weight(product.clone()) * 8;
        if local_scale > product.scale * 2 {
            local_scale = product.scale * 2;
        }
        if local_scale < 0 {
            local_scale = 0;
        }
        product = numeric_work_rounded(
            numeric_work_product(product.clone(), product),
            local_scale,
            1,
        );
        if mask % 2i64 != 0i64 {
            local_scale = significant
                - (numeric_math_group_weight(product.clone())
                    + numeric_math_group_weight(result.clone()))
                    * 4;
            if local_scale > product.scale + result.scale {
                local_scale = product.scale + result.scale;
            }
            if local_scale < 0 {
                local_scale = 0;
            }
            result = numeric_work_rounded(
                numeric_work_product(product.clone(), result),
                local_scale,
                1,
            );
        }
        if numeric_math_group_weight(product.clone()) > 32767
            || numeric_math_group_weight(result.clone()) > 32767
        {
            if negative == false {
                return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
            }
            result = numeric_work_from_value("0");
            negative = false;
            mask = 0i64;
        }
        mask = mask / 2i64;
    }
    if negative {
        return numeric_work_round(
            numeric_division_work(numeric_work_from_value("1"), result, scale, true),
            scale,
            1,
        );
    }
    numeric_work_round(result, scale, 1)
}

fn numeric_power_fractional(base: NumericWork, exponent: NumericWork) -> NumericValue {
    if base.sign == 0 {
        return numeric_work_round(base, 16, 1);
    }
    let negative = base.sign < 0 && numeric_power_odd(exponent.clone());
    let positive = numeric_power_positive(base);
    let logarithm_weight = numeric_logarithm_weight(positive.clone());
    let mut local_scale = 8 - logarithm_weight;
    if local_scale < 0 {
        local_scale = 0;
    }
    let preliminary_logarithm = numeric_logarithm_work(positive.clone(), local_scale);
    let preliminary = numeric_work_rounded(
        numeric_work_product(preliminary_logarithm, exponent.clone()),
        local_scale,
        1,
    );
    let text = numeric_work_text(preliminary);
    let mut estimate = text.as_str().parse::<f64>().unwrap_or(0.0f64);
    if estimate.abs() > 6020.0f64 {
        if estimate > 0.0f64 {
            return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        return numeric_work_round(numeric_work_from_value("0"), 1000, 1);
    }
    estimate = estimate * NUMERIC_EXP_LOG10_E;
    let scale = numeric_power_scale(estimate, positive.scale, exponent.scale);
    let mut significant = scale + estimate as i32;
    if significant < 0 {
        significant = 0;
    }
    local_scale = significant - logarithm_weight + 8;
    if local_scale < 0 {
        local_scale = 0;
    }
    let logarithm = numeric_logarithm_work(positive, local_scale);
    let argument = numeric_work_rounded(numeric_work_product(logarithm, exponent), local_scale, 1);
    let result = numeric_exponential_work(argument, scale);
    if result.valid == false {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    let mut sign = result.sign;
    if negative && sign != 0 {
        sign = -1;
    }
    let signed = NumericWork {
        valid: true,
        special: 1,
        sign: sign,
        weight: result.weight,
        scale: result.scale,
        digits: result.digits,
    };
    numeric_work_round(signed, scale, 1)
}

fn numeric_power_values(base: NumericWork, exponent: NumericWork) -> NumericValue {
    let one = numeric_work_from_value("1");
    if base.special == 3 {
        if exponent.special == 1 && exponent.sign == 0 {
            return NumericValue::Value("1".to_owned());
        }
        return NumericValue::Value("NaN".to_owned());
    }
    if exponent.special == 3 {
        if base.special == 1
            && base.sign == 1
            && numeric_work_magnitude(base.clone(), one.clone()) == 0
        {
            return NumericValue::Value("1".to_owned());
        }
        return NumericValue::Value("NaN".to_owned());
    }
    let base_sign = numeric_power_sign(base.clone());
    let exponent_sign = numeric_power_sign(exponent.clone());
    if (base_sign == 0 && exponent_sign < 0)
        || (base_sign < 0 && numeric_power_integral(exponent.clone()) == false)
    {
        return NumericValue::Error(make_sql_error(NUMERIC_POWER_INVALID_ARGUMENT));
    }
    if base.special != 1 || exponent.special != 1 {
        if (base.special == 1
            && base_sign == 1
            && numeric_work_magnitude(base.clone(), one.clone()) == 0)
            || exponent_sign == 0
        {
            return NumericValue::Value("1".to_owned());
        }
        if base_sign == 0 && exponent_sign > 0 {
            return NumericValue::Value("0".to_owned());
        }
        if exponent.special != 1 {
            if base.special == 1 && numeric_work_magnitude(base.clone(), one.clone()) == 0 {
                return NumericValue::Value("1".to_owned());
            }
            let greater = base.special != 1 || numeric_work_magnitude(base, one) > 0;
            if greater == (exponent_sign > 0) {
                return NumericValue::Value("Infinity".to_owned());
            }
            return NumericValue::Value("0".to_owned());
        }
        if exponent_sign < 0 {
            return NumericValue::Value("0".to_owned());
        }
        if base.special == 0 && numeric_power_odd(exponent) {
            return NumericValue::Value("-Infinity".to_owned());
        }
        return NumericValue::Value("Infinity".to_owned());
    }
    if numeric_power_integral(exponent.clone()) && (exponent.sign == 0 || exponent.weight <= 9) {
        let converted =
            numeric_integer_value(NumericValue::Value(numeric_work_text(exponent.clone())));
        if let Int8Value::Value(value) = converted {
            if value >= -2147483648i64 && value <= 2147483647i64 {
                return numeric_power_integer(base, value as i32, exponent.scale);
            }
        }
    }
    numeric_power_fractional(base, exponent)
}

pub fn sql__pg_catalog__numeric_power__n7g8(
    left: NumericValue,
    right: NumericValue,
) -> NumericValue {
    if let NumericValue::Error(error) = left {
        return NumericValue::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return NumericValue::Error(error);
    }
    if left == NumericValue::Unknown || right == NumericValue::Unknown {
        return NumericValue::Unknown;
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(base) = left {
        if let NumericValue::Value(exponent) = right {
            let first = numeric_work_from_value(base.as_str());
            let second = numeric_work_from_value(exponent.as_str());
            if first.valid == false || second.valid == false {
                return NumericValue::Unknown;
            }
            return numeric_power_values(first, second);
        }
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__power__jfdf(left: NumericValue, right: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_power__n7g8(left, right)
}

pub fn sql__pg_catalog__pow__8fdt(left: NumericValue, right: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_power__n7g8(left, right)
}
