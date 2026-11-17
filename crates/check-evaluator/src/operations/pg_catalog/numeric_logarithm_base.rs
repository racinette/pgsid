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
    // PostgreSQL's log_var: ln(num) / ln(base), each logarithm figured to the precision
    // the quotient needs.
    let base_var = numeric_var_from_work(&base);
    let num_var = numeric_var_from_work(&input);
    let ln_base_dweight = numeric_var_ln_dweight(&base_var);
    let ln_num_dweight = numeric_var_ln_dweight(&num_var);
    let result_dweight = ln_num_dweight - ln_base_dweight;
    let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - result_dweight;
    if rscale < base_var.dscale {
        rscale = base_var.dscale;
    }
    if rscale < num_var.dscale {
        rscale = num_var.dscale;
    }
    if rscale < 0 {
        rscale = 0;
    }
    if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
        rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
    }
    let mut ln_base_rscale = rscale + result_dweight - ln_base_dweight + 8;
    if ln_base_rscale < 0 {
        ln_base_rscale = 0;
    }
    let mut ln_num_rscale = rscale + result_dweight - ln_num_dweight + 8;
    if ln_num_rscale < 0 {
        ln_num_rscale = 0;
    }
    let ln_base = numeric_var_ln(&base_var, ln_base_rscale);
    let ln_num = numeric_var_ln(&num_var, ln_num_rscale);
    if numeric_var_count(&ln_base) == 0 {
        return NumericValue::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
    }
    numeric_var_result(numeric_var_div(&ln_num, &ln_base, rscale, true, false))
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
