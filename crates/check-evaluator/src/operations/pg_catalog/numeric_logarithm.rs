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

const NUMERIC_LOG_INVALID_ARGUMENT: u32 = 3452594;
const NUMERIC_LN_TEN_ESTIMATE: f64 = 2.302585092994046f64;

// PostgreSQL's estimate_ln_dweight: the decimal weight of ln(value), exact near one and
// estimated in double precision elsewhere.
fn numeric_var_ln_dweight(value: &NumericVar) -> i32 {
    if value.sign < 0 {
        return 0;
    }
    let one = numeric_var_from_i64(1i64);
    let zero_point_nine = numeric_var_from_text("0.9");
    let one_point_one = numeric_var_from_text("1.1");
    if numeric_var_cmp(value, &zero_point_nine) >= 0 && numeric_var_cmp(value, &one_point_one) <= 0 {
        let x = numeric_var_sub(value, &one);
        if numeric_var_count(&x) > 0 {
            let leading = numeric_var_digit(&x, 0) as f64;
            return x.weight * NUMERIC_VAR_DEC_DIGITS + (leading.log10() as i32);
        }
        return 0;
    }
    if numeric_var_count(value) > 0 {
        let mut digits = numeric_var_digit(value, 0);
        let mut dweight = value.weight * NUMERIC_VAR_DEC_DIGITS;
        if numeric_var_count(value) > 1 {
            digits = digits * NUMERIC_VAR_NBASE + numeric_var_digit(value, 1);
            dweight = dweight - NUMERIC_VAR_DEC_DIGITS;
        }
        let ln_value = (digits as f64).ln() + (dweight as f64) * NUMERIC_LN_TEN_ESTIMATE;
        return ln_value.abs().log10() as i32;
    }
    0
}

// PostgreSQL's ln_var: square roots bring the argument within 0.9 and 1.1, then the series
// ln(x) = 2 * atanh((x - 1) / (x + 1)) runs to rscale, and the factor restores the roots.
fn numeric_var_ln(arg: &NumericVar, rscale: i32) -> NumericVar {
    let one = numeric_var_from_i64(1i64);
    let two = numeric_var_from_i64(2i64);
    let zero_point_nine = numeric_var_from_text("0.9");
    let one_point_one = numeric_var_from_text("1.1");
    let mut x = numeric_var_shifted(arg, 0);
    let mut fact = numeric_var_from_i64(2i64);
    let mut nsqrt: i32 = 0;
    while numeric_var_cmp(&x, &zero_point_nine) <= 0 {
        let local_rscale = rscale - x.weight * NUMERIC_VAR_DEC_DIGITS / 2 + 8;
        x = numeric_var_sqrt(&x, local_rscale);
        fact = numeric_var_mul(&fact, &two, 0);
        nsqrt = nsqrt + 1;
    }
    while numeric_var_cmp(&x, &one_point_one) >= 0 {
        let local_rscale = rscale - x.weight * NUMERIC_VAR_DEC_DIGITS / 2 + 8;
        x = numeric_var_sqrt(&x, local_rscale);
        fact = numeric_var_mul(&fact, &two, 0);
        nsqrt = nsqrt + 1;
    }
    let local_rscale = rscale + (((nsqrt + 1) as f64) * 0.301029995663981f64) as i32 + 8;
    let numerator = numeric_var_sub(&x, &one);
    let denominator = numeric_var_add(&x, &one);
    let mut result = numeric_var_div(&numerator, &denominator, local_rscale, true, false);
    let mut xx = numeric_var_shifted(&result, 0);
    let square = numeric_var_mul(&result, &result, local_rscale);
    let mut ni: i32 = 1;
    let mut advancing = true;
    while advancing {
        ni = ni + 2;
        xx = numeric_var_mul(&xx, &square, local_rscale);
        let elem = numeric_var_div_int(&xx, ni, 0, local_rscale, true);
        if numeric_var_count(&elem) == 0 {
            advancing = false;
        } else {
            result = numeric_var_add(&result, &elem);
            if elem.weight < result.weight - local_rscale * 2 / NUMERIC_VAR_DEC_DIGITS {
                advancing = false;
            }
        };
    }
    numeric_var_mul(&result, &fact, rscale)
}

pub fn sql__pg_catalog__numeric_ln__okv6(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_115_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_115_4 < 1 { condition_flavor_115_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_115_4 = 2; }; if input == NumericValue::Unknown || input == NumericValue::Unimplemented {
        return numeric_unresolved(condition_flavor_115_4);
    }
    if input == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return numeric_unresolved(unresolved_flavor);
        }
        if work.special == 0 || (work.special == 1 && work.sign <= 0) {
            return NumericValue::Error(make_sql_error(NUMERIC_LOG_INVALID_ARGUMENT));
        }
        if work.special != 1 {
            return NumericValue::Value(numeric_work_text(work));
        }
        let arg = numeric_var_from_work(&work);
        let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - numeric_var_ln_dweight(&arg);
        if rscale < arg.dscale {
            rscale = arg.dscale;
        }
        if rscale < 0 {
            rscale = 0;
        }
        if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
            rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
        }
        return numeric_var_result(numeric_var_ln(&arg, rscale));
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__ln__05bs(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_ln__okv6(input)
}
