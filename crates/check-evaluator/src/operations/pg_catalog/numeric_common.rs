// PostgreSQL's gcd_var: Euclid's algorithm on the larger magnitude first, skipping the
// modulo when the magnitudes are equal or the smaller one is zero.
fn numeric_common_gcd(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let mut res_dscale = left.dscale;
    if right.dscale > res_dscale {
        res_dscale = right.dscale;
    }
    let cmp = numeric_var_cmp_abs(left, right);
    let mut larger = numeric_var_shifted(left, 0);
    let mut smaller = numeric_var_shifted(right, 0);
    if cmp < 0 {
        larger = numeric_var_shifted(right, 0);
        smaller = numeric_var_shifted(left, 0);
    }
    if cmp == 0 || numeric_var_count(&smaller) == 0 {
        return numeric_var_signed(numeric_var_rescaled(larger, res_dscale), 1);
    }
    let mut searching = true;
    while searching {
        let remainder = numeric_var_mod(&larger, &smaller);
        if numeric_var_count(&remainder) == 0 {
            searching = false;
        } else {
            larger = smaller;
            smaller = remainder;
        };
    }
    numeric_var_signed(numeric_var_rescaled(smaller, res_dscale), 1)
}

fn numeric_common(left: NumericValue, right: NumericValue, multiple: bool) -> NumericValue {
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
    let mut condition_flavor_28_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_28_4 < 1 { condition_flavor_28_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_28_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_28_4 < 1 { condition_flavor_28_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_28_4 = 2; }; if (numeric_unknown_left_1 || numeric_unimplemented_left_2) || (numeric_unknown_right_3 || numeric_unimplemented_right_4) {
        return numeric_unresolved(condition_flavor_28_4);
    }
    let mut numeric_null_left_5 = false; if let NumericValue::Null = left { numeric_null_left_5 = true; }; let mut numeric_null_right_6 = false; if let NumericValue::Null = right { numeric_null_right_6 = true; };
    if numeric_null_left_5 || numeric_null_right_6 {
        return NumericValue::Null;
    }
    if let NumericValue::Value(arg1) = left {
        if let NumericValue::Value(arg2) = right {
            if numeric_var_kind(&arg1) != 1 || numeric_var_kind(&arg2) != 1 {
                return make_numeric_value("NaN");
            }
            let mut dscale = arg1.dscale;
            if arg2.dscale > dscale {
                dscale = arg2.dscale;
            }
            if multiple == false {
                return numeric_var_result(numeric_common_gcd(&arg1, &arg2));
            }
            if numeric_var_count(&arg1) == 0 || numeric_var_count(&arg2) == 0 {
                return numeric_var_result(numeric_var_zero(dscale));
            }
            let divisor = numeric_common_gcd(&arg1, &arg2);
            let quotient = numeric_var_div(&arg1, &divisor, 0, false, true);
            let product = numeric_var_mul(&arg2, &quotient, arg2.dscale);
            return numeric_var_result(numeric_var_signed(numeric_var_rescaled(product, dscale), 1));
        }
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__gcd__bke6(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_common(left, right, false)
}

pub fn sql__pg_catalog__lcm__pjls(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_common(left, right, true)
}
