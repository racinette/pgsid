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

fn numeric_base_logarithm(base_var: NumericVar, num_var: NumericVar, musl: bool) -> NumericValue {
    let base_kind = numeric_var_kind(&base_var);
    let input_kind = numeric_var_kind(&num_var);
    if base_kind == 3 || input_kind == 3 {
        return make_numeric_value("NaN");
    }
    if base_kind == 0
        || input_kind == 0
        || (base_kind == 1 && numeric_var_signum(&base_var) <= 0)
        || (input_kind == 1 && numeric_var_signum(&num_var) <= 0)
    {
        return NumericValue::Error(make_sql_error(NUMERIC_LOG_INVALID_ARGUMENT));
    }
    if base_kind == 2 {
        if input_kind == 2 {
            return make_numeric_value("NaN");
        }
        return make_numeric_value("0");
    }
    if input_kind == 2 {
        return make_numeric_value("Infinity");
    }
    // PostgreSQL's log_var: ln(num) / ln(base), each logarithm figured to the precision
    // the quotient needs.
    let ln_base_estimate = numeric_var_ln_dweight(&base_var, musl);
    let ln_num_estimate = numeric_var_ln_dweight(&num_var, musl);
    if ln_base_estimate.uncertain || ln_num_estimate.uncertain {
        return numeric_unresolved(1);
    }
    let ln_base_dweight = ln_base_estimate.value;
    let ln_num_dweight = ln_num_estimate.value;
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

pub fn sql__pg_catalog__numeric_log__8gwh(
    left: NumericValue,
    right: NumericValue,
    musl: bool,
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
    let mut numeric_unknown_left_1 = false; if let NumericValue::Unknown = left { numeric_unknown_left_1 = true; }; let mut numeric_unimplemented_left_2 = false; if let NumericValue::Unimplemented = left { numeric_unimplemented_left_2 = true; }; let mut numeric_unknown_right_3 = false; if let NumericValue::Unknown = right { numeric_unknown_right_3 = true; }; let mut numeric_unimplemented_right_4 = false; if let NumericValue::Unimplemented = right { numeric_unimplemented_right_4 = true; };
    let mut condition_flavor_66_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_66_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_66_4 = 2; }; if (numeric_unknown_left_1 || numeric_unimplemented_left_2) || (numeric_unknown_right_3 || numeric_unimplemented_right_4) {
        return numeric_unresolved(condition_flavor_66_4);
    }
    let mut numeric_null_left_5 = false; if let NumericValue::Null = left { numeric_null_left_5 = true; }; let mut numeric_null_right_6 = false; if let NumericValue::Null = right { numeric_null_right_6 = true; };
    if numeric_null_left_5 || numeric_null_right_6 {
        return NumericValue::Null;
    }
    if let NumericValue::Value(base) = left {
        if let NumericValue::Value(input) = right {
            return numeric_base_logarithm(base, input, musl);
        }
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__log__94cu(left: NumericValue, right: NumericValue, musl: bool) -> NumericValue {
    sql__pg_catalog__numeric_log__8gwh(left, right, musl)
}

pub fn sql__pg_catalog__log__wnnd(input: NumericValue, musl: bool) -> NumericValue {
    sql__pg_catalog__numeric_log__8gwh(make_numeric_value("10"), input, musl)
}

pub fn sql__pg_catalog__log10__dgh7(input: NumericValue, musl: bool) -> NumericValue {
    sql__pg_catalog__log__wnnd(input, musl)
}
