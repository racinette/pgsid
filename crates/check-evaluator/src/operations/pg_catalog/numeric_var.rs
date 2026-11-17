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

// PostgreSQL's numeric algorithms on NumericVar. Where PostgreSQL computes an exact result,
// any exact method yields the same digits, so these routines use PostgreSQL's 32-bit forms and
// keep the translated targets on plain numbers. Where it approximates, by truncating a product
// or estimating a quotient, they reproduce PostgreSQL's arithmetic step for step.

// A result, the numeric overflow PostgreSQL raises while computing it, or a result that
// depends on the deployment's math library.
#[derive(Clone)]
struct NumericVarOutcome {
    overflow: bool,
    uncertain: bool,
    value: NumericVar,
}

// An integer PostgreSQL truncates from a floating-point logarithm, uncertain when the math
// library could have truncated it differently.
#[derive(Clone, Copy)]
struct NumericVarEstimate {
    uncertain: bool,
    value: i32,
}

#[derive(Clone)]
struct NumericVarDivision {
    quotient: NumericVar,
    remainder: NumericVar,
}

const NUMERIC_VAR_NBASE: i32 = 10000;
const NUMERIC_VAR_HALF_NBASE: i32 = 5000;
const NUMERIC_VAR_DEC_DIGITS: i32 = 4;
const NUMERIC_VAR_MUL_GUARD_DIGITS: i32 = 2;
const NUMERIC_VAR_DIV_GUARD_DIGITS: i32 = 4;
const NUMERIC_VAR_MIN_SIG_DIGITS: i32 = 16;
const NUMERIC_VAR_MAX_DISPLAY_SCALE: i32 = 1000;

#[derive(Clone, Copy)]
struct NumericVarWide {
    value: i64,
}

fn numeric_var_zero(dscale: i32) -> NumericVar {
    let digits: Vec<usize> = Vec::new();
    NumericVar {
        sign: 1,
        weight: 0,
        dscale: dscale,
        digits: digits,
    }
}

fn numeric_var_count(value: &NumericVar) -> i32 {
    value.digits.len() as i32
}

fn numeric_var_digit(value: &NumericVar, index: i32) -> i32 {
    if index < 0 || index >= numeric_var_count(value) {
        return 0;
    }
    (value.digits[usize::try_from(index).unwrap_or(0)] as i32)
}

fn numeric_var_zeros(count: i32) -> Vec<usize> {
    let mut digits: Vec<usize> = Vec::new();
    let mut index: i32 = 0;
    while index < count {
        digits.push(0);
        index = index + 1;
    }
    digits
}

fn numeric_var_round_power(decimals: i32) -> i32 {
    if decimals == 1 {
        return 1000;
    }
    if decimals == 2 {
        return 100;
    }
    10
}

fn numeric_var_from_work(work: &NumericWork) -> NumericVar {
    if work.sign == 0 {
        return numeric_var_zero(work.scale);
    }
    let characters: Vec<char> = work.digits.chars().collect();
    let mut weight = work.weight / NUMERIC_VAR_DEC_DIGITS;
    if work.weight % NUMERIC_VAR_DEC_DIGITS < 0 {
        weight = weight - 1;
    }
    // Leading zeros place the first decimal digit within the first NBASE digit, and trailing
    // zeros complete the last one.
    let mut leading = weight * NUMERIC_VAR_DEC_DIGITS + NUMERIC_VAR_DEC_DIGITS - 1 - work.weight;
    let mut emitted: i32 = 0;
    let mut digits: Vec<usize> = Vec::new();
    let mut value: i32 = 0;
    let mut index: usize = 0;
    while index < characters.len() || emitted % NUMERIC_VAR_DEC_DIGITS != 0 {
        let mut decimal: i32 = 0;
        if leading > 0 {
            leading = leading - 1;
        } else if index < characters.len() {
            decimal = numeric_wire_decimal_digit(characters[index]);
            index += 1;
        }
        value = value * 10 + decimal;
        emitted = emitted + 1;
        if emitted % NUMERIC_VAR_DEC_DIGITS == 0 {
            digits.push(usize::try_from(value).unwrap_or(0));
            value = 0;
        };
    }
    numeric_var_strip(NumericVar {
        sign: work.sign,
        weight: weight,
        dscale: work.scale,
        digits: digits,
    })
}

fn numeric_work_from_var(value: &NumericVar) -> NumericWork {
    let mut scale = value.dscale;
    if scale < 0 {
        scale = 0;
    }
    let mut decimals = String::new();
    let mut weight = value.weight * NUMERIC_VAR_DEC_DIGITS + NUMERIC_VAR_DEC_DIGITS - 1;
    let mut index: usize = 0;
    while index < value.digits.len() {
        let mut word = (value.digits[index] as i32);
        let mut place: i32 = 1000;
        while place > 0 {
            let digit = word / place;
            word = word % place;
            if decimals == String::new() && digit == 0 {
                weight = weight - 1;
            } else {
                decimals.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
            }
            place = place / 10;
        }
        index += 1;
    }
    let characters: Vec<char> = decimals.chars().collect();
    let mut end = characters.len();
    while end > 0 && characters[end - 1] == '0' {
        end = end - 1;
    }
    let mut digits = String::new();
    index = 0;
    while index < end {
        digits.push(characters[index]);
        index += 1;
    }
    let mut sign = value.sign;
    if end == 0 {
        sign = 0;
        weight = 0;
    }
    NumericWork {
        valid: true,
        special: 1,
        sign: sign,
        weight: weight,
        scale: scale,
        digits: digits,
    }
}

fn numeric_var_from_i64(value: i64) -> NumericVar {
    let mut sign: i32 = 1;
    let mut magnitude = value;
    if value < 0i64 {
        sign = -1;
        magnitude = 0i64 - value;
    }
    let mut reversed: Vec<usize> = Vec::new();
    while magnitude > 0i64 {
        let next = magnitude / 10000i64;
        reversed.push(usize::try_from((magnitude - next * 10000i64) as i32).unwrap_or(0));
        magnitude = next;
    }
    let mut digits: Vec<usize> = Vec::new();
    let mut index = reversed.len();
    while index > 0 {
        index = index - 1;
        digits.push(reversed[index]);
    }
    let count = digits.len() as i32;
    if count == 0 {
        return numeric_var_zero(0);
    }
    NumericVar {
        sign: sign,
        weight: count - 1,
        dscale: 0,
        digits: digits,
    }
}

fn numeric_var_strip(value: NumericVar) -> NumericVar {
    let mut weight = value.weight;
    let mut start: usize = 0;
    while start < value.digits.len() && (value.digits[start] as i32) == 0 {
        start += 1;
        weight = weight - 1;
    }
    let mut end = value.digits.len();
    while end > start && (value.digits[end - 1] as i32) == 0 {
        end = end - 1;
    }
    let mut digits: Vec<usize> = Vec::new();
    let mut index = start;
    while index < end {
        digits.push(value.digits[index]);
        index += 1;
    }
    let mut sign = value.sign;
    if end == start {
        sign = 1;
        weight = 0;
    }
    NumericVar {
        sign: sign,
        weight: weight,
        dscale: value.dscale,
        digits: digits,
    }
}

fn numeric_var_shifted(value: &NumericVar, places: i32) -> NumericVar {
    let mut digits: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < value.digits.len() {
        digits.push(value.digits[index]);
        index += 1;
    }
    NumericVar {
        sign: value.sign,
        weight: value.weight + places,
        dscale: value.dscale,
        digits: digits,
    }
}

fn numeric_var_cmp_abs(left: &NumericVar, right: &NumericVar) -> i32 {
    let left_count = numeric_var_count(left);
    let right_count = numeric_var_count(right);
    let mut left_weight = left.weight;
    let mut right_weight = right.weight;
    let mut i1: i32 = 0;
    let mut i2: i32 = 0;
    while left_weight > right_weight && i1 < left_count {
        if numeric_var_digit(left, i1) != 0 {
            return 1;
        }
        i1 = i1 + 1;
        left_weight = left_weight - 1;
    }
    while right_weight > left_weight && i2 < right_count {
        if numeric_var_digit(right, i2) != 0 {
            return -1;
        }
        i2 = i2 + 1;
        right_weight = right_weight - 1;
    }
    if left_weight == right_weight {
        while i1 < left_count && i2 < right_count {
            let stat = numeric_var_digit(left, i1) - numeric_var_digit(right, i2);
            i1 = i1 + 1;
            i2 = i2 + 1;
            if stat > 0 {
                return 1;
            }
            if stat < 0 {
                return -1;
            };
        }
    }
    while i1 < left_count {
        if numeric_var_digit(left, i1) != 0 {
            return 1;
        }
        i1 = i1 + 1;
    }
    while i2 < right_count {
        if numeric_var_digit(right, i2) != 0 {
            return -1;
        }
        i2 = i2 + 1;
    }
    0
}

fn numeric_var_cmp(left: &NumericVar, right: &NumericVar) -> i32 {
    if numeric_var_count(left) == 0 {
        if numeric_var_count(right) == 0 {
            return 0;
        }
        if right.sign < 0 {
            return 1;
        }
        return -1;
    }
    if numeric_var_count(right) == 0 {
        if left.sign > 0 {
            return 1;
        }
        return -1;
    }
    if left.sign > 0 {
        if right.sign < 0 {
            return 1;
        }
        return numeric_var_cmp_abs(left, right);
    }
    if right.sign > 0 {
        return -1;
    }
    numeric_var_cmp_abs(right, left)
}

fn numeric_var_add_abs(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let left_count = numeric_var_count(left);
    let right_count = numeric_var_count(right);
    let mut res_weight = left.weight;
    if right.weight > res_weight {
        res_weight = right.weight;
    }
    res_weight = res_weight + 1;
    let mut res_dscale = left.dscale;
    if right.dscale > res_dscale {
        res_dscale = right.dscale;
    }
    let rscale1 = left_count - left.weight - 1;
    let rscale2 = right_count - right.weight - 1;
    let mut res_rscale = rscale1;
    if rscale2 > res_rscale {
        res_rscale = rscale2;
    }
    let mut res_ndigits = res_rscale + res_weight + 1;
    if res_ndigits <= 0 {
        res_ndigits = 1;
    }
    let mut digits = numeric_var_zeros(res_ndigits);
    let mut i1 = res_rscale + left.weight + 1;
    let mut i2 = res_rscale + right.weight + 1;
    let mut carry: i32 = 0;
    let mut i = res_ndigits - 1;
    while i >= 0 {
        i1 = i1 - 1;
        i2 = i2 - 1;
        carry = carry + numeric_var_digit(left, i1) + numeric_var_digit(right, i2);
        let mut digit = carry;
        carry = 0;
        if digit >= NUMERIC_VAR_NBASE {
            digit = digit - NUMERIC_VAR_NBASE;
            carry = 1;
        }
        digits[usize::try_from(i).unwrap_or(0)] = usize::try_from(digit).unwrap_or(0);
        i = i - 1;
    }
    numeric_var_strip(NumericVar {
        sign: 1,
        weight: res_weight,
        dscale: res_dscale,
        digits: digits,
    })
}

// The caller orders the operands so that the left magnitude is at least the right.
fn numeric_var_sub_abs(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let left_count = numeric_var_count(left);
    let right_count = numeric_var_count(right);
    let res_weight = left.weight;
    let mut res_dscale = left.dscale;
    if right.dscale > res_dscale {
        res_dscale = right.dscale;
    }
    let rscale1 = left_count - left.weight - 1;
    let rscale2 = right_count - right.weight - 1;
    let mut res_rscale = rscale1;
    if rscale2 > res_rscale {
        res_rscale = rscale2;
    }
    let mut res_ndigits = res_rscale + res_weight + 1;
    if res_ndigits <= 0 {
        res_ndigits = 1;
    }
    let mut digits = numeric_var_zeros(res_ndigits);
    let mut i1 = res_rscale + left.weight + 1;
    let mut i2 = res_rscale + right.weight + 1;
    let mut borrow: i32 = 0;
    let mut i = res_ndigits - 1;
    while i >= 0 {
        i1 = i1 - 1;
        i2 = i2 - 1;
        borrow = borrow + numeric_var_digit(left, i1) - numeric_var_digit(right, i2);
        let mut digit = borrow;
        borrow = 0;
        if digit < 0 {
            digit = digit + NUMERIC_VAR_NBASE;
            borrow = -1;
        }
        digits[usize::try_from(i).unwrap_or(0)] = usize::try_from(digit).unwrap_or(0);
        i = i - 1;
    }
    numeric_var_strip(NumericVar {
        sign: 1,
        weight: res_weight,
        dscale: res_dscale,
        digits: digits,
    })
}

fn numeric_var_signed(value: NumericVar, sign: i32) -> NumericVar {
    NumericVar {
        sign: sign,
        weight: value.weight,
        dscale: value.dscale,
        digits: value.digits,
    }
}

// PostgreSQL's add_var and sub_var share their cases: subtraction adds the right operand
// with its sign reversed.
fn numeric_var_sum(left: &NumericVar, right: &NumericVar, right_sign: i32) -> NumericVar {
    let mut dscale = left.dscale;
    if right.dscale > dscale {
        dscale = right.dscale;
    }
    if left.sign == right_sign {
        return numeric_var_signed(numeric_var_add_abs(left, right), left.sign);
    }
    let order = numeric_var_cmp_abs(left, right);
    if order == 0 {
        return numeric_var_zero(dscale);
    }
    if order > 0 {
        return numeric_var_signed(numeric_var_sub_abs(left, right), left.sign);
    }
    numeric_var_signed(numeric_var_sub_abs(right, left), right_sign)
}

fn numeric_var_add(left: &NumericVar, right: &NumericVar) -> NumericVar {
    numeric_var_sum(left, right, right.sign)
}

fn numeric_var_sub(left: &NumericVar, right: &NumericVar) -> NumericVar {
    numeric_var_sum(left, right, 0 - right.sign)
}

fn numeric_var_round(value: NumericVar, rscale: i32) -> NumericVar {
    let sign = value.sign;
    let mut weight = value.weight;
    let mut digits = value.digits;
    let mut di = (weight + 1) * NUMERIC_VAR_DEC_DIGITS + rscale;
    if di < 0 {
        return numeric_var_zero(rscale);
    }
    let ndigits = (di + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    di = di % NUMERIC_VAR_DEC_DIGITS;
    let mut kept = digits.len() as i32;
    // A carry out of the kept digits becomes a new leading digit.
    let mut leading: i32 = 0;
    if ndigits < kept || (ndigits == kept && di > 0) {
        kept = ndigits;
        let mut position = ndigits;
        let mut carry: i32 = 0;
        if di == 0 {
            if (digits[usize::try_from(ndigits).unwrap_or(0)] as i32) >= NUMERIC_VAR_HALF_NBASE {
                carry = 1;
            }
        } else {
            position = position - 1;
            let last = usize::try_from(position).unwrap_or(0);
            let mut pow10 = numeric_var_round_power(di);
            let extra = (digits[last] as i32) % pow10;
            digits[last] = usize::try_from((digits[last] as i32) - extra).unwrap_or(0);
            if extra >= pow10 / 2 {
                pow10 = pow10 + (digits[last] as i32);
                if pow10 >= NUMERIC_VAR_NBASE {
                    pow10 = pow10 - NUMERIC_VAR_NBASE;
                    carry = 1;
                }
                digits[last] = usize::try_from(pow10).unwrap_or(0);
            };
        };
        while carry > 0 {
            position = position - 1;
            if position < 0 {
                leading = carry;
                weight = weight + 1;
                carry = 0;
            } else {
                let at = usize::try_from(position).unwrap_or(0);
                carry = carry + (digits[at] as i32);
                if carry >= NUMERIC_VAR_NBASE {
                    digits[at] = usize::try_from(carry - NUMERIC_VAR_NBASE).unwrap_or(0);
                    carry = 1;
                } else {
                    digits[at] = usize::try_from(carry).unwrap_or(0);
                    carry = 0;
                };
            };
        }
    }
    let mut rounded: Vec<usize> = Vec::new();
    if leading > 0 {
        rounded.push(usize::try_from(leading).unwrap_or(0));
    }
    let end = usize::try_from(kept).unwrap_or(0);
    let mut index: usize = 0;
    while index < end {
        rounded.push(digits[index]);
        index += 1;
    }
    NumericVar {
        sign: sign,
        weight: weight,
        dscale: rscale,
        digits: rounded,
    }
}

fn numeric_var_trunc(value: NumericVar, rscale: i32) -> NumericVar {
    let sign = value.sign;
    let weight = value.weight;
    let mut digits = value.digits;
    let mut di = (weight + 1) * NUMERIC_VAR_DEC_DIGITS + rscale;
    if di <= 0 {
        return numeric_var_zero(rscale);
    }
    let ndigits = (di + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    let mut kept = digits.len() as i32;
    if ndigits <= kept {
        kept = ndigits;
        di = di % NUMERIC_VAR_DEC_DIGITS;
        if di > 0 {
            let last = usize::try_from(ndigits - 1).unwrap_or(0);
            let pow10 = numeric_var_round_power(di);
            let extra = (digits[last] as i32) % pow10;
            digits[last] = usize::try_from((digits[last] as i32) - extra).unwrap_or(0);
        }
    }
    let mut truncated: Vec<usize> = Vec::new();
    let end = usize::try_from(kept).unwrap_or(0);
    let mut index: usize = 0;
    while index < end {
        truncated.push(digits[index]);
        index += 1;
    }
    NumericVar {
        sign: sign,
        weight: weight,
        dscale: rscale,
        digits: truncated,
    }
}

// PostgreSQL's mul_var. A product that needs more fractional digits than rscale plus guard
// digits is truncated: PostgreSQL multiplies pairs of NBASE digits and keeps only the pair
// products that land within the computed digits, so the same pair products are summed here,
// each split into its four digit products to stay within 32 bits.
fn numeric_var_mul(left: &NumericVar, right: &NumericVar, rscale: i32) -> NumericVar {
    if numeric_var_count(left) > numeric_var_count(right) {
        return numeric_var_mul(right, left, rscale);
    }
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    if var1ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    if var1ndigits <= 6 && rscale == left.dscale + right.dscale {
        return numeric_var_mul_exact(left, right);
    }
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let mut var1ndigitpairs = (var1ndigits + 1) / 2;
    let mut var2ndigitpairs = (var2ndigits + 1) / 2;
    let mut res_ndigits = var1ndigits + var2ndigits;
    let mut res_ndigitpairs = res_ndigits / 2 + 1;
    let pair_offset = res_ndigitpairs - var1ndigitpairs - var2ndigitpairs + 1;
    let res_weight = left.weight + right.weight + 1 + 2 * res_ndigitpairs
        - res_ndigits
        - var1ndigits % 2
        - var2ndigits % 2;
    let maxdigits = res_weight
        + 1
        + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS
        + NUMERIC_VAR_MUL_GUARD_DIGITS;
    let maxdigitpairs = maxdigits / 2 + 1;
    if maxdigitpairs < res_ndigitpairs {
        res_ndigitpairs = maxdigitpairs;
    }
    res_ndigits = 2 * res_ndigitpairs;
    if res_ndigitpairs <= pair_offset {
        return numeric_var_zero(rscale);
    }
    if res_ndigitpairs - pair_offset < var1ndigitpairs {
        var1ndigitpairs = res_ndigitpairs - pair_offset;
    }
    if res_ndigitpairs - pair_offset < var2ndigitpairs {
        var2ndigitpairs = res_ndigitpairs - pair_offset;
    }
    // Pair p of the product covers result digits 2p and 2p + 1; its high digit product
    // carries into digit 2p - 1, so slot s + 1 holds result digit s and slot 0 the carry.
    let mut slots = numeric_var_zeros(res_ndigits + 1);
    let mut high: Vec<usize> = Vec::new();
    let mut low: Vec<usize> = Vec::new();
    let mut i2: i32 = 0;
    while i2 < var2ndigitpairs {
        high.push(usize::try_from(numeric_var_digit(right, 2 * i2)).unwrap_or(0));
        low.push(usize::try_from(numeric_var_digit(right, 2 * i2 + 1)).unwrap_or(0));
        i2 = i2 + 1;
    }
    // A row adds at most two digit products to a slot, so ten rows stay below the 32-bit
    // maximum together with a normalised digit and its incoming carry.
    let mut rows: i32 = 0;
    let mut i1 = var1ndigitpairs - 1;
    while i1 >= 0 {
        let a = numeric_var_digit(left, 2 * i1);
        let b = numeric_var_digit(left, 2 * i1 + 1);
        if a != 0 || b != 0 {
            if rows == 10 {
                // Carries leave every slot but the first holding one NBASE digit.
                let mut carry: i32 = 0;
                let mut slot = slots.len();
                while slot > 0 {
                    slot = slot - 1;
                    let mut digit = (slots[slot] as i32) + carry;
                    carry = 0;
                    if slot > 0 && digit >= NUMERIC_VAR_NBASE {
                        carry = digit / NUMERIC_VAR_NBASE;
                        digit = digit - carry * NUMERIC_VAR_NBASE;
                    }
                    slots[slot] = usize::try_from(digit).unwrap_or(0);
                }
                rows = 0;
            }
            rows = rows + 1;
            let mut i2limit = var2ndigitpairs;
            if res_ndigitpairs - i1 - pair_offset < i2limit {
                i2limit = res_ndigitpairs - i1 - pair_offset;
            }
            let limit = usize::try_from(i2limit).unwrap_or(0);
            let base = usize::try_from(2 * (i1 + pair_offset)).unwrap_or(0);
            let mut index: usize = 0;
            while index < limit {
                let c = (high[index] as i32);
                let d = (low[index] as i32);
                let at = base + index + index;
                slots[at] = usize::try_from((slots[at] as i32) + a * c).unwrap_or(0);
                slots[at + 1] =
                    usize::try_from((slots[at + 1] as i32) + a * d + b * c).unwrap_or(0);
                slots[at + 2] = usize::try_from((slots[at + 2] as i32) + b * d).unwrap_or(0);
                index += 1;
            }
        }
        i1 = i1 - 1;
    }
    // Carries leave every slot but the first holding one NBASE digit.
    let mut carry: i32 = 0;
    let mut slot = slots.len();
    while slot > 0 {
        slot = slot - 1;
        let mut digit = (slots[slot] as i32) + carry;
        carry = 0;
        if slot > 0 && digit >= NUMERIC_VAR_NBASE {
            carry = digit / NUMERIC_VAR_NBASE;
            digit = digit - carry * NUMERIC_VAR_NBASE;
        }
        slots[slot] = usize::try_from(digit).unwrap_or(0);
    }
    let mut digits: Vec<usize> = Vec::new();
    let mut weight = res_weight;
    if (slots[0] as i32) != 0 {
        digits.push(slots[0]);
        weight = weight + 1;
    }
    let mut index: usize = 1;
    while index < slots.len() {
        digits.push(slots[index]);
        index += 1;
    }
    let product = NumericVar {
        sign: res_sign,
        weight: weight,
        dscale: rscale,
        digits: digits,
    };
    numeric_var_strip(numeric_var_round(product, rscale))
}

// PostgreSQL's mul_var_short: the exact product of a multiplier of at most six digits,
// computed in one pass from the last digit with a running carry. Each column sums at most six
// digit products, so it stays within 32 bits.
fn numeric_var_mul_exact(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let res_ndigits = var1ndigits + var2ndigits;
    // Least significant digit first, so the result's zeros can be dropped while it is copied
    // into place.
    let mut reversed: Vec<usize> = Vec::new();
    let mut carry: i32 = 0;
    let mut k = res_ndigits - 1;
    while k >= 1 {
        let mut term = carry;
        let mut i1 = k - var2ndigits;
        if i1 < 0 {
            i1 = 0;
        }
        while i1 < var1ndigits && i1 <= k - 1 {
            term = term + numeric_var_digit(left, i1) * numeric_var_digit(right, k - 1 - i1);
            i1 = i1 + 1;
        }
        reversed.push(usize::try_from(term % NUMERIC_VAR_NBASE).unwrap_or(0));
        carry = term / NUMERIC_VAR_NBASE;
        k = k - 1;
    }
    reversed.push(usize::try_from(carry).unwrap_or(0));
    let mut low: usize = 0;
    while low < reversed.len() && reversed[low] == 0 {
        low += 1;
    }
    let mut high = reversed.len();
    while high > low && reversed[high - 1] == 0 {
        high = high - 1;
    }
    let dscale = left.dscale + right.dscale;
    if high == low {
        return numeric_var_zero(dscale);
    }
    let mut digits: Vec<usize> = Vec::new();
    let mut index = high;
    while index > low {
        index = index - 1;
        digits.push(reversed[index]);
    }
    let dropped = (reversed.len() - high) as i32;
    NumericVar {
        sign: res_sign,
        weight: left.weight + right.weight + 1 - dropped,
        dscale: dscale,
        digits: digits,
    }
}

// Short division by a divisor of one or two NBASE digits. PostgreSQL keeps a 32-bit carry
// when the divisor allows it; one 64-bit carry serves every divisor.
fn numeric_var_div_int(
    value: &NumericVar,
    ival: i32,
    ival_weight: i32,
    rscale: i32,
    round: bool,
) -> NumericVar {
    let var_ndigits = numeric_var_count(value);
    if var_ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    let mut res_sign: i32 = 1;
    if value.sign > 0 {
        if ival < 0 {
            res_sign = -1;
        };
    } else if ival > 0 {
        res_sign = -1;
    }
    let res_weight = value.weight - ival_weight;
    let mut res_ndigits =
        res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    if round {
        res_ndigits = res_ndigits + 1;
    }
    let mut divisor = ival as i64;
    if divisor < 0i64 {
        divisor = 0i64 - divisor;
    }
    let mut digits: Vec<usize> = Vec::new();
    let mut carry: i64 = 0i64;
    let mut i: i32 = 0;
    while i < res_ndigits {
        let digit = numeric_var_digit(value, i) as i64;
        carry = carry * 10000i64 + digit;
        digits.push(usize::try_from((carry / divisor) as i32).unwrap_or(0));
        carry = carry % divisor;
        i = i + 1;
    }
    let quotient = NumericVar {
        sign: res_sign,
        weight: res_weight,
        dscale: rscale,
        digits: digits,
    };
    if round {
        return numeric_var_strip(numeric_var_round(quotient, rscale));
    }
    numeric_var_strip(numeric_var_trunc(quotient, rscale))
}

// PostgreSQL's div_var, to rscale fractional digits, rounded or truncated. An inexact
// quotient estimates its digits as PostgreSQL does whenever the divisor is long enough for
// PostgreSQL to take that path. Callers never divide by zero.
fn numeric_var_div(
    left: &NumericVar,
    right: &NumericVar,
    rscale: i32,
    round: bool,
    exact: bool,
) -> NumericVar {
    if exact
        || numeric_var_count(right) <= 2 * (NUMERIC_VAR_DIV_GUARD_DIGITS + 2)
        || numeric_var_count(left) == 0
    {
        return numeric_var_div_exact(left, right, rscale, round);
    }
    numeric_var_div_approximate(left, right, rscale, round)
}

// Knuth's algorithm D, figured to exactly rscale fractional digits.
fn numeric_var_div_exact(
    left: &NumericVar,
    right: &NumericVar,
    rscale: i32,
    round: bool,
) -> NumericVar {
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    if var2ndigits <= 2 {
        let mut idivisor = numeric_var_digit(right, 0);
        let mut idivisor_weight = right.weight;
        if var2ndigits == 2 {
            idivisor = idivisor * NUMERIC_VAR_NBASE + numeric_var_digit(right, 1);
            idivisor_weight = idivisor_weight - 1;
        }
        if right.sign < 0 {
            idivisor = 0 - idivisor;
        }
        return numeric_var_div_int(left, idivisor, idivisor_weight, rscale, round);
    }
    if var1ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let res_weight = left.weight - right.weight;
    let mut res_ndigits =
        res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    if round {
        res_ndigits = res_ndigits + 1;
    }
    let mut div_ndigits = res_ndigits + var2ndigits;
    if var1ndigits > div_ndigits {
        div_ndigits = var1ndigits;
    }
    // Index zero of both arrays is a spare digit, as in Knuth's notation.
    let mut dividend = numeric_var_zeros(div_ndigits + 1);
    let mut divisor = numeric_var_zeros(var2ndigits + 1);
    let mut index: usize = 0;
    while index < left.digits.len() {
        dividend[index + 1] = left.digits[index];
        index += 1;
    }
    index = 0;
    while index < right.digits.len() {
        divisor[index + 1] = right.digits[index];
        index += 1;
    }
    let divisor_end = usize::try_from(var2ndigits).unwrap_or(0);
    // The first divisor digit must be at least NBASE / 2; scale both operands to make it so.
    if (divisor[1] as i32) < NUMERIC_VAR_HALF_NBASE {
        let d = NUMERIC_VAR_NBASE / ((divisor[1] as i32) + 1);
        let mut carry: i32 = 0;
        let mut i = divisor_end;
        while i > 0 {
            carry = carry + (divisor[i] as i32) * d;
            divisor[i] = usize::try_from(carry % NUMERIC_VAR_NBASE).unwrap_or(0);
            carry = carry / NUMERIC_VAR_NBASE;
            i = i - 1;
        }
        carry = 0;
        let mut j = usize::try_from(var1ndigits).unwrap_or(0) + 1;
        while j > 0 {
            j = j - 1;
            carry = carry + (dividend[j] as i32) * d;
            dividend[j] = usize::try_from(carry % NUMERIC_VAR_NBASE).unwrap_or(0);
            carry = carry / NUMERIC_VAR_NBASE;
        }
    }
    let divisor1 = (divisor[1] as i32);
    let divisor2 = (divisor[2] as i32);
    let mut res_digits: Vec<usize> = Vec::new();
    let res_end = usize::try_from(res_ndigits).unwrap_or(0);
    let mut j: usize = 0;
    while j < res_end {
        let next2digits = (dividend[j] as i32) * NUMERIC_VAR_NBASE + (dividend[j + 1] as i32);
        let mut qhat: i32 = 0;
        if next2digits != 0 {
            if (dividend[j] as i32) == divisor1 {
                qhat = NUMERIC_VAR_NBASE - 1;
            } else {
                qhat = next2digits / divisor1;
            }
            // Knuth proves the estimate is then exact or one too large.
            while divisor2 * qhat
                > (next2digits - qhat * divisor1) * NUMERIC_VAR_NBASE + (dividend[j + 2] as i32)
            {
                qhat = qhat - 1;
            }
            if qhat > 0 {
                let mut borrow: i32 = 0;
                let mut i = divisor_end + 1;
                while i > 0 {
                    i = i - 1;
                    let tmp_result = (dividend[j + i] as i32) - borrow - (divisor[i] as i32) * qhat;
                    borrow = (NUMERIC_VAR_NBASE - 1 - tmp_result) / NUMERIC_VAR_NBASE;
                    dividend[j + i] =
                        usize::try_from(tmp_result + borrow * NUMERIC_VAR_NBASE).unwrap_or(0);
                }
                if borrow != 0 {
                    // qhat was one too large: add the divisor back once.
                    qhat = qhat - 1;
                    let mut carry: i32 = 0;
                    i = divisor_end + 1;
                    while i > 0 {
                        i = i - 1;
                        carry = carry + (dividend[j + i] as i32) + (divisor[i] as i32);
                        if carry >= NUMERIC_VAR_NBASE {
                            dividend[j + i] =
                                usize::try_from(carry - NUMERIC_VAR_NBASE).unwrap_or(0);
                            carry = 1;
                        } else {
                            dividend[j + i] = usize::try_from(carry).unwrap_or(0);
                            carry = 0;
                        };
                    }
                };
            };
        }
        res_digits.push(usize::try_from(qhat).unwrap_or(0));
        j += 1;
    }
    let quotient = NumericVar {
        sign: res_sign,
        weight: res_weight,
        dscale: rscale,
        digits: res_digits,
    };
    if round {
        return numeric_var_strip(numeric_var_round(quotient, rscale));
    }
    numeric_var_strip(numeric_var_trunc(quotient, rscale))
}

// The exact double nearest a 64-bit integer, as a C conversion gives: the parts are exact
// doubles, so their sum rounds once.
fn numeric_var_wide_double(value: i64) -> f64 {
    let high = value / 4294967296i64;
    let rest = value - high * 4294967296i64;
    let middle = rest / 65536i64;
    let low = rest - middle * 65536i64;
    let upper = (high as i32) as f64;
    let lower = ((middle as i32) as f64) * 65536.0f64 + ((low as i32) as f64);
    upper * 4294967296.0f64 + lower
}

// PostgreSQL truncates a negative estimate towards zero and then subtracts one.
fn numeric_var_quotient_digit(estimate: f64) -> i32 {
    if estimate >= 0.0f64 {
        return estimate as i32;
    }
    (estimate as i32) - 1
}

// Splits a carry out of a base-NBASE^2 digit, rounding towards minus infinity.
fn numeric_var_wide_carry(digit: i64) -> i64 {
    if digit < 0i64 {
        return 0i64 - ((0i64 - digit - 1i64) / 100000000i64) - 1i64;
    }
    if digit >= 100000000i64 {
        return digit / 100000000i64;
    }
    0i64
}

// PostgreSQL's inexact div_var: base-NBASE^2 digits with 64-bit accumulators, quotient digits
// estimated in double precision from the leading two dividend and divisor digits, carries
// propagated only when an accumulator could overflow, and rscale plus guard digits computed
// without correcting the estimates.
fn numeric_var_div_approximate(
    left: &NumericVar,
    right: &NumericVar,
    rscale: i32,
    round: bool,
) -> NumericVar {
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let res_weight = left.weight - right.weight + 1;
    let mut res_ndigits =
        res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    if round {
        res_ndigits = res_ndigits + 1;
    }
    res_ndigits = res_ndigits + NUMERIC_VAR_DIV_GUARD_DIGITS;
    let mut var1ndigitpairs = (var1ndigits + 1) / 2;
    let mut var2ndigitpairs = (var2ndigits + 1) / 2;
    let res_ndigitpairs = (res_ndigits + 1) / 2;
    let div_ndigitpairs = res_ndigitpairs;
    if div_ndigitpairs < var1ndigitpairs {
        var1ndigitpairs = div_ndigitpairs;
    }
    if div_ndigitpairs < var2ndigitpairs {
        var2ndigitpairs = div_ndigitpairs;
    }
    // One spare dividend digit lets every step read and write the digit after it.
    let mut dividend: Vec<NumericVarWide> = Vec::new();
    let mut i: i32 = 0;
    while i <= div_ndigitpairs {
        let mut pair: i64 = 0i64;
        if i < var1ndigitpairs {
            let first = numeric_var_digit(left, 2 * i) as i64;
            let second = numeric_var_digit(left, 2 * i + 1) as i64;
            pair = first * 10000i64 + second;
        }
        dividend.push(NumericVarWide { value: pair });
        i = i + 1;
    }
    let mut divisor: Vec<NumericVarWide> = Vec::new();
    i = 0;
    while i < var2ndigitpairs {
        let first = numeric_var_digit(right, 2 * i) as i64;
        let second = numeric_var_digit(right, 2 * i + 1) as i64;
        divisor.push(NumericVarWide {
            value: first * 10000i64 + second,
        });
        i = i + 1;
    }
    let mut fdivisor = numeric_var_wide_double(divisor[0].value) * 100000000.0f64;
    if var2ndigitpairs > 1 {
        fdivisor = fdivisor + numeric_var_wide_double(divisor[1].value);
    }
    let fdivisorinverse = 1.0f64 / fdivisor;
    let limit =
        (9223372036854775807i64 - 9223372036854775807i64 / 100000000i64 - 1i64) / 99999999i64;
    let mut maxdiv: i64 = 1i64;
    let mut qi: i32 = 0;
    while qi < res_ndigitpairs {
        let at = usize::try_from(qi).unwrap_or(0);
        let mut fdividend = numeric_var_wide_double(dividend[at].value) * 100000000.0f64;
        fdividend = fdividend + numeric_var_wide_double(dividend[at + 1].value);
        let mut qdigit = numeric_var_quotient_digit(fdividend * fdivisorinverse);
        if qdigit != 0 {
            let mut magnitude = qdigit as i64;
            if magnitude < 0i64 {
                magnitude = 0i64 - magnitude;
            }
            maxdiv = maxdiv + magnitude;
            if maxdiv > limit {
                let mut carry: i64 = 0i64;
                let mut j = qi + var2ndigitpairs - 2;
                if div_ndigitpairs - 1 < j {
                    j = div_ndigitpairs - 1;
                }
                while j > qi {
                    let index = usize::try_from(j).unwrap_or(0);
                    let mut newdig = dividend[index].value + carry;
                    carry = numeric_var_wide_carry(newdig);
                    newdig = newdig - carry * 100000000i64;
                    dividend[index] = NumericVarWide { value: newdig };
                    j = j - 1;
                }
                dividend[at] = NumericVarWide {
                    value: dividend[at].value + carry,
                };
                maxdiv = 1i64;
                fdividend = numeric_var_wide_double(dividend[at].value) * 100000000.0f64;
                fdividend = fdividend + numeric_var_wide_double(dividend[at + 1].value);
                qdigit = numeric_var_quotient_digit(fdividend * fdivisorinverse);
                magnitude = qdigit as i64;
                if magnitude < 0i64 {
                    magnitude = 0i64 - magnitude;
                }
                maxdiv = maxdiv + magnitude;
            }
            if qdigit != 0 {
                let mut istop = var2ndigitpairs;
                if div_ndigitpairs - qi < istop {
                    istop = div_ndigitpairs - qi;
                }
                let stop = usize::try_from(istop).unwrap_or(0);
                let wide_qdigit = qdigit as i64;
                let mut k: usize = 0;
                while k < stop {
                    dividend[at + k] = NumericVarWide {
                        value: dividend[at + k].value - wide_qdigit * divisor[k].value,
                    };
                    k += 1;
                }
            };
        }
        // PostgreSQL folds this digit into the next one and relies on a cancelling overflow
        // when the product leaves 64 bits; splitting the next digit avoids the overflow.
        let current = dividend[at].value;
        let next = dividend[at + 1].value;
        let next_high = next / 100000000i64;
        let next_low = next - next_high * 100000000i64;
        dividend[at + 1] = NumericVarWide {
            value: (current + next_high) * 100000000i64 + next_low,
        };
        dividend[at] = NumericVarWide {
            value: qdigit as i64,
        };
        qi = qi + 1;
    }
    let mut digits = numeric_var_zeros(2 * res_ndigitpairs);
    let mut carry: i64 = 0i64;
    let mut j = res_ndigitpairs - 1;
    while j >= 0 {
        let index = usize::try_from(j).unwrap_or(0);
        let mut newdig = dividend[index].value + carry;
        carry = numeric_var_wide_carry(newdig);
        newdig = newdig - carry * 100000000i64;
        let pair = newdig as i32;
        digits[index + index] = usize::try_from(pair / NUMERIC_VAR_NBASE).unwrap_or(0);
        digits[index + index + 1] = usize::try_from(pair % NUMERIC_VAR_NBASE).unwrap_or(0);
        j = j - 1;
    }
    let quotient = NumericVar {
        sign: res_sign,
        weight: res_weight,
        dscale: rscale,
        digits: digits,
    };
    if round {
        return numeric_var_strip(numeric_var_round(quotient, rscale));
    }
    numeric_var_strip(numeric_var_trunc(quotient, rscale))
}

// The truncated integer quotient and the remainder, precise to the divisor's scale.
fn numeric_var_div_mod(left: &NumericVar, right: &NumericVar) -> NumericVarDivision {
    let one = numeric_var_from_i64(1i64);
    let mut q = numeric_var_div(left, right, 0, false, true);
    let product = numeric_var_mul(right, &q, right.dscale);
    let mut r = numeric_var_sub(left, &product);
    while numeric_var_count(&r) != 0 && r.sign != left.sign {
        if left.sign == right.sign {
            q = numeric_var_sub(&q, &one);
            r = numeric_var_add(&r, right);
        } else {
            q = numeric_var_add(&q, &one);
            r = numeric_var_sub(&r, right);
        };
    }
    while numeric_var_cmp_abs(&r, right) >= 0 {
        if left.sign == right.sign {
            q = numeric_var_add(&q, &one);
            r = numeric_var_sub(&r, right);
        } else {
            q = numeric_var_sub(&q, &one);
            r = numeric_var_add(&r, right);
        };
    }
    NumericVarDivision {
        quotient: q,
        remainder: r,
    }
}

// PostgreSQL's mod_var: x - trunc(x / y) * y.
fn numeric_var_mod(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let quotient = numeric_var_div(left, right, 0, false, true);
    let product = numeric_var_mul(right, &quotient, right.dscale);
    numeric_var_sub(left, &product)
}

// PostgreSQL's make_result: the stored weight and display scale must fit their header fields.
fn numeric_var_result(value: NumericVar) -> NumericValue {
    let stripped = numeric_var_strip(value);
    if (numeric_var_count(&stripped) > 0 && (stripped.weight > 32767 || stripped.weight < -32768))
        || stripped.dscale > 16383
    {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    NumericValue::Value(stripped)
}

fn numeric_var_rescaled(value: NumericVar, dscale: i32) -> NumericVar {
    NumericVar {
        sign: value.sign,
        weight: value.weight,
        dscale: dscale,
        digits: value.digits,
    }
}

// PostgreSQL's numericvar_to_double_no_overflow: the decimal text read as a double, which
// becomes an infinity when it is out of range.
fn numeric_var_to_double(value: &NumericVar) -> f64 {
    let text = numeric_work_text(numeric_work_from_var(value));
    text.as_str().parse::<f64>().unwrap_or(0.0f64)
}

fn numeric_var_from_text(text: &str) -> NumericVar {
    let work = numeric_work_from_value(text);
    numeric_var_from_work(&work)
}

fn numeric_var_succeeded(value: NumericVar) -> NumericVarOutcome {
    NumericVarOutcome {
        overflow: false,
        uncertain: false,
        value: value,
    }
}

fn numeric_var_overflow() -> NumericVarOutcome {
    NumericVarOutcome {
        overflow: true,
        uncertain: false,
        value: numeric_var_zero(0),
    }
}

fn numeric_var_uncertain() -> NumericVarOutcome {
    NumericVarOutcome {
        overflow: false,
        uncertain: true,
        value: numeric_var_zero(0),
    }
}

fn numeric_var_outcome_result(outcome: NumericVarOutcome) -> NumericValue {
    if outcome.uncertain {
        return numeric_unresolved(1);
    }
    if outcome.overflow {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    numeric_var_result(outcome.value)
}

// PostgreSQL's ceil_var and floor_var: truncate, then step away from zero when the
// argument lay beyond the truncation in that direction.
fn numeric_var_ceil(value: &NumericVar) -> NumericVar {
    let one = numeric_var_from_i64(1i64);
    let truncated = numeric_var_trunc(numeric_var_shifted(value, 0), 0);
    if value.sign > 0 && numeric_var_cmp(value, &truncated) != 0 {
        return numeric_var_add(&truncated, &one);
    }
    truncated
}

fn numeric_var_floor(value: &NumericVar) -> NumericVar {
    let one = numeric_var_from_i64(1i64);
    let truncated = numeric_var_trunc(numeric_var_shifted(value, 0), 0);
    if value.sign < 0 && numeric_var_cmp(value, &truncated) != 0 {
        return numeric_var_sub(&truncated, &one);
    }
    truncated
}

// The special-value code the decimal helpers use: 0 for -Infinity, 1 for a finite value, 2 for
// Infinity and 3 for NaN.
fn numeric_var_kind(value: &NumericVar) -> i32 {
    if value.sign == NUMERIC_SIGN_NAN {
        return 3;
    }
    if value.sign == NUMERIC_SIGN_PINF {
        return 2;
    }
    if value.sign == NUMERIC_SIGN_NINF {
        return 0;
    }
    1
}

// -1, 0 or 1 for a finite value.
fn numeric_var_signum(value: &NumericVar) -> i32 {
    if numeric_var_count(value) == 0 {
        return 0;
    }
    value.sign
}

// PostgreSQL's numeric_abs: the infinities become Infinity.
fn numeric_var_absolute(value: NumericVar) -> NumericVar {
    if value.sign == NUMERIC_SIGN_NINF {
        return numeric_var_special(NUMERIC_SIGN_PINF);
    }
    if value.sign == -1 {
        return numeric_var_signed(value, 1);
    }
    value
}

// PostgreSQL's numeric_uminus: zero and NaN keep their sign.
fn numeric_var_negated(value: NumericVar) -> NumericVar {
    if value.sign == NUMERIC_SIGN_NINF {
        return numeric_var_special(NUMERIC_SIGN_PINF);
    }
    if value.sign == NUMERIC_SIGN_PINF {
        return numeric_var_special(NUMERIC_SIGN_NINF);
    }
    if value.sign == NUMERIC_SIGN_NAN || numeric_var_count(&value) == 0 {
        return value;
    }
    let sign = 0 - value.sign;
    numeric_var_signed(value, sign)
}

// PostgreSQL's get_min_scale: the fractional digits up to the last nonzero one.
fn numeric_var_min_scale(value: &NumericVar) -> i32 {
    let mut last_digit_pos = numeric_var_count(value) - 1;
    while last_digit_pos >= 0 && numeric_var_digit(value, last_digit_pos) == 0 {
        last_digit_pos = last_digit_pos - 1;
    }
    if last_digit_pos < 0 {
        return 0;
    }
    let mut min_scale = (last_digit_pos - value.weight) * NUMERIC_VAR_DEC_DIGITS;
    if min_scale <= 0 {
        return 0;
    }
    let mut last_digit = numeric_var_digit(value, last_digit_pos);
    while last_digit % 10 == 0 {
        min_scale = min_scale - 1;
        last_digit = last_digit / 10;
    }
    min_scale
}

// PostgreSQL's cmp_numerics: NaN above everything, the infinities at the ends.
fn numeric_var_compare_values(left: &NumericVar, right: &NumericVar) -> i32 {
    let left_kind = numeric_var_kind(left);
    let right_kind = numeric_var_kind(right);
    if left_kind == 3 {
        if right_kind == 3 {
            return 0;
        }
        return 1;
    }
    if left_kind == 2 {
        if right_kind == 3 {
            return -1;
        }
        if right_kind == 2 {
            return 0;
        }
        return 1;
    }
    if left_kind == 0 {
        if right_kind == 0 {
            return 0;
        }
        return -1;
    }
    if right_kind == 0 {
        return 1;
    }
    if right_kind != 1 {
        return -1;
    }
    numeric_var_cmp(left, right)
}

// Math libraries agree on a logarithm only to within a few units in its last place, so an
// estimate this close to an integer may truncate to either side of it, depending on the library.
fn numeric_var_near_integer(value: f64, margin: f64) -> bool {
    let truncated = value as i32;
    let below = (truncated as f64) - value;
    let above = ((truncated + 1) as f64) - value;
    let under = ((truncated - 1) as f64) - value;
    below.abs() <= margin || above.abs() <= margin || under.abs() <= margin
}

// (int) log10(digit) for an NBASE digit: its decimal digits less one, which every math library
// computes exactly because powers of ten have exact logarithms.
fn numeric_var_digit_log10(digit: i32) -> i32 {
    if digit >= 1000 {
        return 3;
    }
    if digit >= 100 {
        return 2;
    }
    if digit >= 10 {
        return 1;
    }
    0
}
