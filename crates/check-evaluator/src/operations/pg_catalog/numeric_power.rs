/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */

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

// PostgreSQL's power_var_int: repeated squaring, each product truncated to the significant
// digits the result needs, and a reciprocal for a negative exponent.
fn numeric_var_power_int(base: &NumericVar, exp: i32, exp_dscale: i32) -> NumericVarOutcome {
    let one = numeric_var_from_i64(1i64);
    let mut f: f64 = 0.0f64;
    if numeric_var_count(base) != 0 {
        f = numeric_var_digit(base, 0) as f64;
        let mut p = base.weight * NUMERIC_VAR_DEC_DIGITS;
        let mut i: i32 = 1;
        while i < numeric_var_count(base) && i * NUMERIC_VAR_DEC_DIGITS < 16 {
            f = f * 10000.0f64 + (numeric_var_digit(base, i) as f64);
            p = p - NUMERIC_VAR_DEC_DIGITS;
            i = i + 1;
        }
        f = (exp as f64) * (f.log10() + (p as f64));
    }
    if f > 131072.0f64 {
        return numeric_var_overflow();
    }
    if f + 1.0f64 < -1000.0f64 {
        return numeric_var_succeeded(numeric_var_zero(NUMERIC_VAR_MAX_DISPLAY_SCALE));
    }
    let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - f as i32;
    if rscale < base.dscale {
        rscale = base.dscale;
    }
    if rscale < exp_dscale {
        rscale = exp_dscale;
    }
    if rscale < 0 {
        rscale = 0;
    }
    if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
        rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
    }
    if exp == 0 {
        return numeric_var_succeeded(numeric_var_rescaled(one, rscale));
    }
    if exp == 1 {
        return numeric_var_succeeded(numeric_var_round(numeric_var_shifted(base, 0), rscale));
    }
    if exp == -1 {
        return numeric_var_succeeded(numeric_var_div(&one, base, rscale, true, true));
    }
    if exp == 2 {
        return numeric_var_succeeded(numeric_var_mul(base, base, rscale));
    }
    if numeric_var_count(base) == 0 {
        return numeric_var_succeeded(numeric_var_zero(rscale));
    }
    let mut sig_digits = 1 + rscale + f as i32;
    sig_digits = sig_digits + ((exp as f64).abs().ln()) as i32 + 8;
    let mut neg = exp < 0;
    let mut mask = exp as i64;
    if mask < 0i64 {
        mask = 0i64 - mask;
    }
    let mut base_prod = numeric_var_shifted(base, 0);
    let mut result = numeric_var_shifted(&one, 0);
    if mask % 2i64 == 1i64 {
        result = numeric_var_shifted(base, 0);
    }
    mask = mask / 2i64;
    while mask > 0i64 {
        let mut local_rscale = sig_digits - 2 * base_prod.weight * NUMERIC_VAR_DEC_DIGITS;
        if 2 * base_prod.dscale < local_rscale {
            local_rscale = 2 * base_prod.dscale;
        }
        if local_rscale < 0 {
            local_rscale = 0;
        }
        base_prod = numeric_var_mul(&base_prod, &base_prod, local_rscale);
        if mask % 2i64 == 1i64 {
            let mut product_rscale =
                sig_digits - (base_prod.weight + result.weight) * NUMERIC_VAR_DEC_DIGITS;
            if base_prod.dscale + result.dscale < product_rscale {
                product_rscale = base_prod.dscale + result.dscale;
            }
            if product_rscale < 0 {
                product_rscale = 0;
            }
            result = numeric_var_mul(&base_prod, &result, product_rscale);
        }
        if base_prod.weight > 32767 || result.weight > 32767 {
            if neg == false {
                return numeric_var_overflow();
            }
            result = numeric_var_zero(0);
            neg = false;
            mask = 0i64;
        } else {
            mask = mask / 2i64;
        };
    }
    if neg {
        return numeric_var_succeeded(numeric_var_div(&one, &result, rscale, true, false));
    }
    numeric_var_succeeded(numeric_var_round(result, rscale))
}

// PostgreSQL's power_var: an integral exponent within 32 bits uses repeated squaring;
// otherwise exp(ln(base) * exp), with ln figured first roughly to size the result and then to
// the precision it needs. Callers have already rejected a negative base with a fractional
// exponent.
fn numeric_var_power(base_arg: &NumericVar, exp: &NumericVar) -> NumericVarOutcome {
    if numeric_var_count(exp) == 0 || numeric_var_count(exp) <= exp.weight + 1 {
        if numeric_var_count(exp) == 0 {
            return numeric_var_power_int(base_arg, 0, exp.dscale);
        }
        if exp.weight <= 2 {
            let mut value: i64 = 0i64;
            let mut i: i32 = 0;
            while i <= exp.weight {
                let digit = numeric_var_digit(exp, i) as i64;
                value = value * 10000i64 + digit;
                i = i + 1;
            }
            if exp.sign < 0 {
                value = 0i64 - value;
            }
            if value >= -2147483648i64 && value <= 2147483647i64 {
                return numeric_var_power_int(base_arg, value as i32, exp.dscale);
            }
        }
    }
    let zero = numeric_var_zero(0);
    if numeric_var_cmp(base_arg, &zero) == 0 {
        return numeric_var_succeeded(numeric_var_zero(NUMERIC_VAR_MIN_SIG_DIGITS));
    }
    let mut res_sign: i32 = 1;
    if base_arg.sign < 0
        && numeric_var_count(exp) > 0
        && numeric_var_count(exp) == exp.weight + 1
        && numeric_var_digit(exp, numeric_var_count(exp) - 1) % 2 == 1
    {
        res_sign = -1;
    }
    let base = numeric_var_signed(numeric_var_shifted(base_arg, 0), 1);
    let ln_dweight = numeric_var_ln_dweight(&base);
    let mut local_rscale = 8 - ln_dweight;
    if local_rscale < 0 {
        local_rscale = 0;
    }
    let rough_ln_base = numeric_var_ln(&base, local_rscale);
    let rough_ln_num = numeric_var_mul(&rough_ln_base, exp, local_rscale);
    let mut val = numeric_var_to_double(&rough_ln_num);
    if val.abs() > 6020.0f64 {
        if val > 0.0f64 {
            return numeric_var_overflow();
        }
        return numeric_var_succeeded(numeric_var_zero(NUMERIC_VAR_MAX_DISPLAY_SCALE));
    }
    val = val * NUMERIC_EXP_LOG10_E;
    let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - val as i32;
    if rscale < base.dscale {
        rscale = base.dscale;
    }
    if rscale < exp.dscale {
        rscale = exp.dscale;
    }
    if rscale < 0 {
        rscale = 0;
    }
    if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
        rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
    }
    let mut sig_digits = rscale + val as i32;
    if sig_digits < 0 {
        sig_digits = 0;
    }
    local_rscale = sig_digits - ln_dweight + 8;
    if local_rscale < 0 {
        local_rscale = 0;
    }
    let ln_base = numeric_var_ln(&base, local_rscale);
    let ln_num = numeric_var_mul(&ln_base, exp, local_rscale);
    let outcome = numeric_var_exp(&ln_num, rscale);
    if outcome.overflow {
        return outcome;
    }
    let result = outcome.value;
    if res_sign < 0 && numeric_var_count(&result) > 0 {
        return numeric_var_succeeded(numeric_var_signed(result, -1));
    }
    numeric_var_succeeded(result)
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
    let base_var = numeric_var_from_work(&base);
    let exp_var = numeric_var_from_work(&exponent);
    numeric_var_outcome_result(numeric_var_power(&base_var, &exp_var))
}

pub fn sql__pg_catalog__numeric_power__n7g8(
    left: NumericValue,
    right: NumericValue,
) -> NumericValue {
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
    let mut condition_flavor_336_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_336_4 < 1 { condition_flavor_336_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_336_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_336_4 < 1 { condition_flavor_336_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_336_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return numeric_unresolved(condition_flavor_336_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(base) = left {
        if let NumericValue::Value(exponent) = right {
            let first = numeric_work_from_value(base.as_str());
            let second = numeric_work_from_value(exponent.as_str());
            if first.valid == false || second.valid == false {
                return numeric_unresolved(unresolved_flavor);
            }
            return numeric_power_values(first, second);
        }
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__power__jfdf(left: NumericValue, right: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_power__n7g8(left, right)
}

pub fn sql__pg_catalog__pow__8fdt(left: NumericValue, right: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_power__n7g8(left, right)
}
