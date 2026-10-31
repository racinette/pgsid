fn numeric_base_logarithm(base: NumericWork, input: NumericWork) -> NumericValue {
    if base.special == 3 || input.special == 3 {
        return NumericValue::Value("NaN".to_owned());
    }
    if base.special == 0
        || input.special == 0
        || (base.special == 1 && base.sign <= 0)
        || (input.special == 1 && input.sign <= 0)
    {
        return NumericValue::Error(make_sql_error(NUMERIC_LOG_INVALID_ARGUMENT));
    }
    if base.special == 2 {
        if input.special == 2 {
            return NumericValue::Value("NaN".to_owned());
        }
        return NumericValue::Value("0".to_owned());
    }
    if input.special == 2 {
        return NumericValue::Value("Infinity".to_owned());
    }
    let base_weight = numeric_logarithm_weight(base.clone());
    let input_weight = numeric_logarithm_weight(input.clone());
    let result_weight = input_weight - base_weight;
    let mut scale = 16 - result_weight;
    if scale < base.scale {
        scale = base.scale;
    }
    if scale < input.scale {
        scale = input.scale;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    let mut base_scale = scale + result_weight - base_weight + 8;
    if base_scale < 0 {
        base_scale = 0;
    }
    let mut input_scale = scale + result_weight - input_weight + 8;
    if input_scale < 0 {
        input_scale = 0;
    }
    let denominator = numeric_logarithm_work(base, base_scale);
    let numerator = numeric_logarithm_work(input, input_scale);
    if denominator.sign == 0 {
        return NumericValue::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
    }
    let quotient = numeric_division_work(numerator, denominator, scale, true);
    numeric_work_round(quotient, scale, 1)
}

pub fn sql__pg_catalog__numeric_log__8gwh(left: NumericValue, right: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = left {
        return NumericValue::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_66_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_66_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_66_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return numeric_unresolved(condition_flavor_66_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(base) = left {
        if let NumericValue::Value(input) = right {
            let first = numeric_work_from_value(base.as_str());
            let second = numeric_work_from_value(input.as_str());
            if first.valid == false || second.valid == false {
                return numeric_unresolved(unresolved_flavor);
            }
            return numeric_base_logarithm(first, second);
        }
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__log__94cu(left: NumericValue, right: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_log__8gwh(left, right)
}

pub fn sql__pg_catalog__log__wnnd(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_log__8gwh(NumericValue::Value("10".to_owned()), input)
}

pub fn sql__pg_catalog__log10__dgh7(input: NumericValue) -> NumericValue {
    sql__pg_catalog__log__wnnd(input)
}
