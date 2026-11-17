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

const NUMERIC_EXP_LOG10_E: f64 = 0.434294481903252f64;

// PostgreSQL's exp_var: the argument is halved until it is at most 0.01, the Taylor series
// runs to the significant digits the result needs, and the halvings are undone by squaring.
fn numeric_var_exp(arg: &NumericVar, rscale: i32) -> NumericVarOutcome {
    let one = numeric_var_from_i64(1i64);
    let mut x = numeric_var_shifted(arg, 0);
    let mut val = numeric_var_to_double(&x);
    if val.abs() >= 6000.0f64 {
        if val > 0.0f64 {
            return numeric_var_overflow();
        }
        return numeric_var_succeeded(numeric_var_zero(rscale));
    }
    let dweight = (val * NUMERIC_EXP_LOG10_E) as i32;
    let mut ndiv2: i32 = 0;
    if val.abs() > 0.01f64 {
        ndiv2 = 1;
        val = val / 2.0f64;
        while val.abs() > 0.01f64 {
            ndiv2 = ndiv2 + 1;
            val = val / 2.0f64;
        }
        let local_rscale = x.dscale + ndiv2;
        let mut divisor: i32 = 1;
        let mut shift: i32 = 0;
        while shift < ndiv2 {
            divisor = divisor * 2;
            shift = shift + 1;
        }
        x = numeric_var_div_int(&x, divisor, 0, local_rscale, true);
    }
    let mut sig_digits = 1 + dweight + rscale + ((ndiv2 as f64) * 0.301029995663981f64) as i32;
    if sig_digits < 0 {
        sig_digits = 0;
    }
    sig_digits = sig_digits + 8;
    let local_rscale = sig_digits - 1;
    let mut result = numeric_var_add(&one, &x);
    let square = numeric_var_mul(&x, &x, local_rscale);
    let mut ni: i32 = 2;
    let mut elem = numeric_var_div_int(&square, ni, 0, local_rscale, true);
    while numeric_var_count(&elem) != 0 {
        result = numeric_var_add(&result, &elem);
        let product = numeric_var_mul(&elem, &x, local_rscale);
        ni = ni + 1;
        elem = numeric_var_div_int(&product, ni, 0, local_rscale, true);
    }
    while ndiv2 > 0 {
        ndiv2 = ndiv2 - 1;
        let mut square_rscale = sig_digits - result.weight * 2 * NUMERIC_VAR_DEC_DIGITS;
        if square_rscale < 0 {
            square_rscale = 0;
        }
        result = numeric_var_mul(&result, &result, square_rscale);
    }
    numeric_var_succeeded(numeric_var_round(result, rscale))
}

pub fn sql__pg_catalog__numeric_exp__fi9j(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_109_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_109_4 < 1 { condition_flavor_109_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_109_4 = 2; }; if input == NumericValue::Unknown || input == NumericValue::Unimplemented {
        return numeric_unresolved(condition_flavor_109_4);
    }
    if input == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return numeric_unresolved(unresolved_flavor);
        }
        if work.special == 0 {
            return NumericValue::Value("0".to_owned());
        }
        if work.special != 1 {
            return NumericValue::Value(numeric_work_text(work));
        }
        let arg = numeric_var_from_work(&work);
        let mut val = numeric_var_to_double(&arg) * NUMERIC_EXP_LOG10_E;
        if val < -2000.0f64 {
            val = -2000.0f64;
        }
        if val > 2000.0f64 {
            val = 2000.0f64;
        }
        let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - val as i32;
        if rscale < arg.dscale {
            rscale = arg.dscale;
        }
        if rscale < 0 {
            rscale = 0;
        }
        if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
            rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
        }
        return numeric_var_outcome_result(numeric_var_exp(&arg, rscale));
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__exp__ao9b(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_exp__fi9j(input)
}
