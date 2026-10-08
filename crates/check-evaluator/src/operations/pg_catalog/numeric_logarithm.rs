const NUMERIC_LOG_INVALID_ARGUMENT: u32 = 3452594;
const NUMERIC_LN_TEN_ESTIMATE: f64 = 2.302585092994046f64;

fn numeric_math_group_weight(work: NumericWork) -> i32 {
    let mut group = work.weight / 4;
    if work.weight % 4 < 0 {
        group = group - 1;
    }
    group
}

fn numeric_logarithm_weight(work: NumericWork) -> i32 {
    let lower = numeric_work_from_value("0.9");
    let upper = numeric_work_from_value("1.1");
    if numeric_work_magnitude(work.clone(), lower) >= 0
        && numeric_work_magnitude(work.clone(), upper) <= 0
    {
        let difference = numeric_work_sum(work, numeric_work_from_value("1"), true);
        if difference.sign == 0 {
            return 0;
        }
        return difference.weight;
    }
    let group_weight = numeric_math_group_weight(work.clone());
    let mut width = work.weight - group_weight * 4 + 1;
    let mut exponent = group_weight * 4;
    let characters: Vec<char> = work.digits.chars().collect();
    let mut index: usize = 0;
    let mut leading: i32 = 0;
    while width > 0 {
        leading = leading * 10;
        if index < characters.len() {
            leading = leading + numeric_wire_decimal_digit(characters[index]);
            index += 1;
        }
        width = width - 1;
    }
    if index < characters.len() {
        width = 4;
        exponent = exponent - 4;
        while width > 0 {
            leading = leading * 10;
            if index < characters.len() {
                leading = leading + numeric_wire_decimal_digit(characters[index]);
                index += 1;
            }
            width = width - 1;
        }
    }
    let coefficient = leading as f64;
    let decimal_weight = exponent as f64;
    let estimate = coefficient.ln() + decimal_weight * NUMERIC_LN_TEN_ESTIMATE;
    estimate.abs().log10() as i32
}

fn numeric_logarithm_work(input: NumericWork, scale: i32) -> NumericWork {
    let one = numeric_work_from_value("1");
    let lower = numeric_work_from_value("0.9");
    let upper = numeric_work_from_value("1.1");
    let mut work = input;
    let mut roots: i32 = 0;
    let mut factor: i32 = 2;
    while numeric_work_magnitude(work.clone(), lower.clone()) <= 0 {
        let local_scale = scale - numeric_math_group_weight(work.clone()) * 2 + 8;
        work = numeric_square_root_scaled(work, local_scale);
        factor = factor * 2;
        roots = roots + 1;
    }
    while numeric_work_magnitude(work.clone(), upper.clone()) >= 0 {
        let local_scale = scale - numeric_math_group_weight(work.clone()) * 2 + 8;
        work = numeric_square_root_scaled(work, local_scale);
        factor = factor * 2;
        roots = roots + 1;
    }
    let extra = ((roots + 1) as f64 * 0.301029995663981f64) as i32;
    let local_scale = scale + extra + 8;
    let numerator = numeric_work_sum(work.clone(), one.clone(), true);
    let denominator = numeric_work_sum(work, one, false);
    let quotient = numeric_division_work(numerator, denominator, local_scale, true);
    let mut result = numeric_work_rounded(quotient, local_scale, 1);
    let mut term = result.clone();
    let product = numeric_work_product(result.clone(), result.clone());
    let square = numeric_work_rounded(product, local_scale, 1);
    let mut divisor: i32 = 1;
    let mut advancing = true;
    while advancing {
        divisor = divisor + 2;
        let product = numeric_work_product(term, square.clone());
        term = numeric_work_rounded(product, local_scale, 1);
        let denominator = numeric_work_from_value(text_number(divisor, 10).as_str());
        let quotient = numeric_division_work(term.clone(), denominator, local_scale, true);
        let element = numeric_work_rounded(quotient, local_scale, 1);
        if element.sign == 0 {
            advancing = false;
        } else {
            result = numeric_work_sum(result, element.clone(), false);
            if numeric_math_group_weight(element)
                < numeric_math_group_weight(result.clone()) - local_scale * 2 / 4
            {
                advancing = false;
            }
        };
    }
    let multiplier = numeric_work_from_value(text_number(factor, 10).as_str());
    numeric_work_rounded(numeric_work_product(result, multiplier), scale, 1)
}

pub fn sql__pg_catalog__numeric_ln__okv6(input: NumericValue) -> NumericValue {
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
        if work.special == 0 || (work.special == 1 && work.sign <= 0) {
            return NumericValue::Error(make_sql_error(NUMERIC_LOG_INVALID_ARGUMENT));
        }
        if work.special != 1 {
            return NumericValue::Value(numeric_work_text(work));
        }
        let mut scale = 16 - numeric_logarithm_weight(work.clone());
        if scale < work.scale {
            scale = work.scale;
        }
        if scale < 0 {
            scale = 0;
        }
        if scale > 1000 {
            scale = 1000;
        }
        return NumericValue::Value(numeric_work_text(numeric_logarithm_work(work, scale)));
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__ln__05bs(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_ln__okv6(input)
}
