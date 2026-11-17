// PostgreSQL's select_div_scale: at least NUMERIC_MIN_SIG_DIGITS significant digits, and no
// fewer fractional digits than either input displays.
fn numeric_division_scale(left: &NumericVar, right: &NumericVar) -> i32 {
    let mut weight1: i32 = 0;
    let mut firstdigit1: i32 = 0;
    let mut i: i32 = 0;
    while i < numeric_var_count(left) {
        firstdigit1 = numeric_var_digit(left, i);
        if firstdigit1 != 0 {
            weight1 = left.weight - i;
            i = numeric_var_count(left);
        }
        i = i + 1;
    }
    let mut weight2: i32 = 0;
    let mut firstdigit2: i32 = 0;
    i = 0;
    while i < numeric_var_count(right) {
        firstdigit2 = numeric_var_digit(right, i);
        if firstdigit2 != 0 {
            weight2 = right.weight - i;
            i = numeric_var_count(right);
        }
        i = i + 1;
    }
    let mut qweight = weight1 - weight2;
    if firstdigit1 <= firstdigit2 {
        qweight = qweight - 1;
    }
    let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - qweight * NUMERIC_VAR_DEC_DIGITS;
    if rscale < left.dscale {
        rscale = left.dscale;
    }
    if rscale < right.dscale {
        rscale = right.dscale;
    }
    if rscale < 0 {
        rscale = 0;
    }
    if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
        rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
    }
    rscale
}

fn numeric_division(left: NumericValue, right: NumericValue, mode: i32) -> NumericValue {
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
    let mut numeric_unknown_left_1 = false; if let NumericValue::Unknown = left { numeric_unknown_left_1 = true; }; let mut numeric_unimplemented_left_2 = false; if let NumericValue::Unimplemented = left { numeric_unimplemented_left_2 = true; }; let mut numeric_unknown_right_3 = false; if let NumericValue::Unknown = right { numeric_unknown_right_3 = true; }; let mut numeric_unimplemented_right_4 = false; if let NumericValue::Unimplemented = right { numeric_unimplemented_right_4 = true; };
    let mut condition_flavor_186_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_186_4 < 1 { condition_flavor_186_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_186_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_186_4 < 1 { condition_flavor_186_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_186_4 = 2; }; if (numeric_unknown_left_1 || numeric_unimplemented_left_2) || (numeric_unknown_right_3 || numeric_unimplemented_right_4) {
        return numeric_unresolved(condition_flavor_186_4);
    }
    let mut numeric_null_left_5 = false; if let NumericValue::Null = left { numeric_null_left_5 = true; }; let mut numeric_null_right_6 = false; if let NumericValue::Null = right { numeric_null_right_6 = true; };
    if numeric_null_left_5 || numeric_null_right_6 {
        return NumericValue::Null;
    }
    if let NumericValue::Value(dividend) = left {
        if let NumericValue::Value(divisor) = right {
            let a_kind = numeric_var_kind(&dividend);
            let b_kind = numeric_var_kind(&divisor);
            if a_kind == 3 || b_kind == 3 {
                return make_numeric_value("NaN");
            }
            if b_kind == 1 && numeric_var_signum(&divisor) == 0 {
                return NumericValue::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
            }
            if a_kind != 1 {
                if mode == 2 || b_kind != 1 {
                    return make_numeric_value("NaN");
                }
                let mut sign = numeric_var_signum(&divisor);
                if a_kind == 0 {
                    sign = 0 - sign;
                }
                if sign < 0 {
                    return make_numeric_value("-Infinity");
                }
                return make_numeric_value("Infinity");
            }
            if b_kind != 1 {
                if mode == 2 {
                    return NumericValue::Value(dividend);
                }
                return make_numeric_value("0");
            }
            if mode == 2 {
                let result = numeric_var_mod(&dividend, &divisor);
                return numeric_var_result(result);
            }
            if mode == 1 {
                let result = numeric_var_div(&dividend, &divisor, 0, false, true);
                return numeric_var_result(result);
            }
            let rscale = numeric_division_scale(&dividend, &divisor);
            let result = numeric_var_div(&dividend, &divisor, rscale, true, true);
            return numeric_var_result(result);
        }
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_div__pnzm(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 0)
}

pub fn sql__pg_catalog__numeric_div_trunc__5o9b(
    left: NumericValue,
    right: NumericValue,
) -> NumericValue {
    numeric_division(left, right, 1)
}

pub fn sql__pg_catalog__div__n5y4(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 1)
}

pub fn sql__pg_catalog__numeric_mod__8ywz(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 2)
}

pub fn sql__pg_catalog__mod__4p6l(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 2)
}
