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
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__ln__05bs(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_ln__okv6(input)
}
