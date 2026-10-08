const NUMERIC_EXP_LOG10_E: f64 = 0.434294481903252f64;

fn numeric_exponential_scale(input: NumericWork) -> i32 {
    let value = numeric_work_text(input.clone());
    let parsed = value.as_str().parse::<f64>().unwrap_or(0.0f64);
    let mut estimate = parsed * NUMERIC_EXP_LOG10_E;
    if estimate < -2000.0f64 {
        estimate = -2000.0f64;
    }
    if estimate > 2000.0f64 {
        estimate = 2000.0f64;
    }
    let mut scale = 16 - estimate as i32;
    if scale < input.scale {
        scale = input.scale;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    scale
}

fn numeric_exponential_work(input: NumericWork, scale: i32) -> NumericWork {
    let text = numeric_work_text(input.clone());
    let mut estimate = text.as_str().parse::<f64>().unwrap_or(0.0f64);
    if estimate.abs() >= 6000.0f64 {
        if estimate > 0.0f64 {
            return NumericWork {
                valid: false,
                special: 1,
                sign: 0,
                weight: 0,
                scale: scale,
                digits: String::new(),
            };
        }
        return numeric_work_rounded(numeric_work_from_value("0"), scale, 1);
    }
    let weight = (estimate * NUMERIC_EXP_LOG10_E) as i32;
    let mut divisions: i32 = 0;
    let mut divisor: i32 = 1;
    let mut x = input;
    while estimate.abs() > 0.01f64 {
        divisions = divisions + 1;
        divisor = divisor * 2;
        estimate = estimate / 2.0f64;
    }
    if divisions > 0 {
        let local_scale = x.scale + divisions;
        let denominator = numeric_work_from_value(text_number(divisor, 10).as_str());
        x = numeric_work_rounded(
            numeric_division_work(x, denominator, local_scale, true),
            local_scale,
            1,
        );
    }
    let extra = (divisions as f64 * 0.301029995663981f64) as i32;
    let mut significant = 1 + weight + scale + extra;
    if significant < 0 {
        significant = 0;
    }
    significant = significant + 8;
    let local_scale = significant - 1;
    let mut result = numeric_work_sum(numeric_work_from_value("1"), x.clone(), false);
    let product = numeric_work_product(x.clone(), x.clone());
    let mut term = numeric_work_rounded(product, local_scale, 1);
    let mut number: i32 = 2;
    term = numeric_work_rounded(
        numeric_division_work(term, numeric_work_from_value("2"), local_scale, true),
        local_scale,
        1,
    );
    while term.sign != 0 {
        result = numeric_work_sum(result, term.clone(), false);
        term = numeric_work_rounded(numeric_work_product(term, x.clone()), local_scale, 1);
        number = number + 1;
        let denominator = numeric_work_from_value(text_number(number, 10).as_str());
        term = numeric_work_rounded(
            numeric_division_work(term, denominator, local_scale, true),
            local_scale,
            1,
        );
    }
    while divisions > 0 {
        let mut square_scale = significant - numeric_math_group_weight(result.clone()) * 8;
        if square_scale < 0 {
            square_scale = 0;
        }
        result = numeric_work_rounded(
            numeric_work_product(result.clone(), result),
            square_scale,
            1,
        );
        divisions = divisions - 1;
    }
    numeric_work_rounded(result, scale, 1)
}

pub fn sql__pg_catalog__numeric_exp__fi9j(input: NumericValue) -> NumericValue {
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == NumericValue::Unknown {
        return NumericValue::Unknown;
    }
    if input == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return NumericValue::Unknown;
        }
        if work.special == 0 {
            return NumericValue::Value("0".to_owned());
        }
        if work.special != 1 {
            return NumericValue::Value(numeric_work_text(work));
        }
        let scale = numeric_exponential_scale(work.clone());
        let result = numeric_exponential_work(work, scale);
        if result.valid == false {
            return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        return numeric_work_round(result, scale, 1);
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__exp__ao9b(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_exp__fi9j(input)
}
