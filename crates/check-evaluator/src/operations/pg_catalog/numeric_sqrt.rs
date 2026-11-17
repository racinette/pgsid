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

const NUMERIC_SQRT_INVALID_ARGUMENT: u32 = 3452595;

// PostgreSQL's sqrt_var: Paul Zimmermann's Karatsuba square root, computed iteratively over
// NBASE digits and rounded to rscale, which may be negative. Callers reject negative inputs.
fn numeric_square_root_scaled(work: NumericWork, rscale: i32) -> NumericWork {
    let arg = numeric_var_from_work(&work);
    let arg_ndigits = numeric_var_count(&arg);
    if arg_ndigits == 0 {
        let zero = numeric_var_zero(rscale);
        return numeric_work_from_var(&zero);
    }
    // The result weight is half the input weight, rounded towards minus infinity.
    let mut res_weight = arg.weight / 2;
    if arg.weight < 0 {
        res_weight = 0 - ((0 - arg.weight - 1) / 2 + 1);
    }
    // At least one decimal digit beyond rscale ensures correct rounding.
    let mut res_ndigits = res_weight + 1 - (0 - rscale - 1) / NUMERIC_VAR_DEC_DIGITS;
    if rscale + 1 >= 0 {
        res_ndigits = res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS) / NUMERIC_VAR_DEC_DIGITS;
    }
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    let mut src_ndigits = arg.weight + 1 + (res_ndigits - res_weight - 1) * 2;
    if src_ndigits < 1 {
        src_ndigits = 1;
    }
    // The input digits used by the end of each iteration, outermost first. Each inner square
    // root takes the input written as a3*b^3 + a2*b^2 + a1*b + a0 with a3 >= b/4.
    let mut ndigits: Vec<NumericWireDigit> = Vec::new();
    ndigits.push(NumericWireDigit { value: src_ndigits });
    let mut step: i32 = 0;
    while src_ndigits > 4 {
        let mut blen = src_ndigits / 4;
        if blen * 4 == src_ndigits && numeric_var_digit(&arg, 0) < NUMERIC_VAR_NBASE / 4 {
            blen = blen - 1;
        }
        src_ndigits = src_ndigits - 2 * blen;
        step = step + 1;
        ndigits.push(NumericWireDigit { value: src_ndigits });
    }
    // The innermost root of at most four NBASE digits, estimated in double precision and
    // corrected by Newton's method. The root of four NBASE digits fits in 32 bits.
    let mut arg_int64 = numeric_var_digit(&arg, 0) as i64;
    let mut src_idx: i32 = 1;
    while src_idx < src_ndigits {
        let digit = numeric_var_digit(&arg, src_idx) as i64;
        arg_int64 = arg_int64 * 10000i64 + digit;
        src_idx = src_idx + 1;
    }
    // Both halves and the high half's scaled value are exact doubles, so their sum rounds the
    // input once, as a direct conversion would.
    let high = (arg_int64 / 100000000i64) as i32;
    let low = (arg_int64 % 100000000i64) as i32;
    let estimate = (high as f64) * 100000000.0f64 + (low as f64);
    let mut s_int64 = (estimate.sqrt() as i32) as i64;
    let mut r_int64 = arg_int64 - s_int64 * s_int64;
    while r_int64 < 0i64 || r_int64 > 2i64 * s_int64 {
        s_int64 = (s_int64 + arg_int64 / s_int64) / 2i64;
        r_int64 = arg_int64 - s_int64 * s_int64;
    }
    // Iterations whose result still fits in 64 bits.
    step = step - 1;
    while step >= 0 && ndigits[usize::try_from(step).unwrap_or(0)].value <= 8 {
        src_ndigits = ndigits[usize::try_from(step).unwrap_or(0)].value;
        let blen = (src_ndigits - src_idx) / 2;
        let mut a0: i32 = 0;
        let mut a1: i32 = 0;
        let mut b: i32 = 1;
        let mut i: i32 = 0;
        while i < blen {
            b = b * NUMERIC_VAR_NBASE;
            a1 = a1 * NUMERIC_VAR_NBASE + numeric_var_digit(&arg, src_idx);
            src_idx = src_idx + 1;
            i = i + 1;
        }
        i = 0;
        while i < blen {
            a0 = a0 * NUMERIC_VAR_NBASE + numeric_var_digit(&arg, src_idx);
            src_idx = src_idx + 1;
            i = i + 1;
        }
        let b_int64 = b as i64;
        let a1_int64 = a1 as i64;
        let a0_int64 = a0 as i64;
        // (q, u) = DivRem(r*b + a1, 2*s); s = s*b + q; r = u*b + a0 - q^2
        let numer = r_int64 * b_int64 + a1_int64;
        let denom = 2i64 * s_int64;
        let q = numer / denom;
        let u = numer - q * denom;
        s_int64 = s_int64 * b_int64 + q;
        r_int64 = u * b_int64 + a0_int64 - q * q;
        if r_int64 < 0i64 {
            // s is too large by one.
            r_int64 = r_int64 + s_int64;
            s_int64 = s_int64 - 1i64;
            r_int64 = r_int64 + s_int64;
        }
        step = step - 1;
    }
    let one = numeric_var_from_i64(1i64);
    let mut s_var = numeric_var_from_i64(s_int64);
    let mut r_var = numeric_var_zero(0);
    if step >= 0 {
        r_var = numeric_var_from_i64(r_int64);
    }
    while step >= 0 {
        src_ndigits = ndigits[usize::try_from(step).unwrap_or(0)].value;
        let blen = (src_ndigits - src_idx) / 2;
        let a1_var = numeric_square_root_part(&arg, src_idx, blen);
        src_idx = src_idx + blen;
        let a0_var = numeric_square_root_part(&arg, src_idx, blen);
        src_idx = src_idx + blen;
        let r_scaled = numeric_var_shifted(&r_var, blen);
        let numer = numeric_var_add(&r_scaled, &a1_var);
        let denom = numeric_var_add(&s_var, &s_var);
        let division = numeric_var_div_mod(&numer, &denom);
        let remainder = division.remainder.clone();
        let q_var = division.quotient;
        let u_scaled = numeric_var_shifted(&remainder, blen);
        let u_var = numeric_var_add(&u_scaled, &a0_var);
        let s_scaled = numeric_var_shifted(&s_var, blen);
        s_var = numeric_var_add(&s_scaled, &q_var);
        let square = numeric_var_mul(&q_var, &q_var, 0);
        if step > 0 {
            r_var = numeric_var_sub(&u_var, &square);
            if r_var.sign < 0 {
                r_var = numeric_var_add(&r_var, &s_var);
                s_var = numeric_var_sub(&s_var, &one);
                r_var = numeric_var_add(&r_var, &s_var);
            };
        } else if numeric_var_cmp(&u_var, &square) < 0 {
            // The last remainder matters only for its sign.
            s_var = numeric_var_sub(&s_var, &one);
        }
        step = step - 1;
    }
    let root = NumericVar {
        sign: 1,
        weight: res_weight,
        dscale: s_var.dscale,
        digits: s_var.digits,
    };
    let rounded = numeric_var_strip(numeric_var_round(root, rscale));
    numeric_work_from_var(&rounded)
}

// blen input digits from start, as an integer; digits past the input are zeros.
fn numeric_square_root_part(arg: &NumericVar, start: i32, blen: i32) -> NumericVar {
    let count = numeric_var_count(arg);
    if start >= count {
        return numeric_var_zero(0);
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut index = start;
    while index < start + blen && index < count {
        digits.push(NumericWireDigit {
            value: numeric_var_digit(arg, index),
        });
        index = index + 1;
    }
    numeric_var_strip(NumericVar {
        sign: 1,
        weight: blen - 1,
        dscale: 0,
        digits: digits,
    })
}

fn numeric_square_root(work: NumericWork) -> NumericValue {
    let mut group_weight = work.weight / 4;
    if work.weight % 4 < 0 {
        group_weight = group_weight - 1;
    }
    let mut scale = 15 - group_weight * 2;
    if scale < work.scale {
        scale = work.scale;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    let rounded = numeric_square_root_scaled(work, scale);
    NumericValue::Value(numeric_work_text(rounded))
}

pub fn sql__pg_catalog__numeric_sqrt__t0uy(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_174_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_174_4 < 1 { condition_flavor_174_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_174_4 = 2; }; if input == NumericValue::Unknown || input == NumericValue::Unimplemented {
        return numeric_unresolved(condition_flavor_174_4);
    }
    if input == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return numeric_unresolved(unresolved_flavor);
        }
        if work.special == 0 || (work.special == 1 && work.sign < 0) {
            return NumericValue::Error(make_sql_error(NUMERIC_SQRT_INVALID_ARGUMENT));
        }
        if work.special != 1 {
            return NumericValue::Value(numeric_work_text(work));
        }
        return numeric_square_root(work);
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__sqrt__2lic(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_sqrt__t0uy(input)
}
