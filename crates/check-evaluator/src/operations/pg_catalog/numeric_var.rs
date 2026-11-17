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

// PostgreSQL's NumericVar, so its numeric algorithms port as written: base-NBASE digits,
// most significant first, the weight of the first digit, and the display scale. A zero has
// no digits. The digit primitives follow the 32-bit forms PostgreSQL used before its 64-bit
// accumulators; both compute the same exact integers, and 32-bit limbs keep the translated
// targets on plain numbers.
#[derive(Clone)]
struct NumericVar {
    sign: i32,
    weight: i32,
    dscale: i32,
    digits: Vec<NumericWireDigit>,
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
const NUMERIC_VAR_INT_MAX: i32 = 2147483647;

fn numeric_var_zero(dscale: i32) -> NumericVar {
    let digits: Vec<NumericWireDigit> = Vec::new();
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
    value.digits[usize::try_from(index).unwrap_or(0)].value
}

fn numeric_var_zeros(count: i32) -> Vec<NumericWireDigit> {
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut index: i32 = 0;
    while index < count {
        digits.push(NumericWireDigit { value: 0 });
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
    let mut digits: Vec<NumericWireDigit> = Vec::new();
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
            digits.push(NumericWireDigit { value: value });
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
        let mut word = value.digits[index].value;
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
    let mut reversed: Vec<NumericWireDigit> = Vec::new();
    while magnitude > 0i64 {
        let next = magnitude / 10000i64;
        reversed.push(NumericWireDigit {
            value: (magnitude - next * 10000i64) as i32,
        });
        magnitude = next;
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
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
    while start < value.digits.len() && value.digits[start].value == 0 {
        start += 1;
        weight = weight - 1;
    }
    let mut end = value.digits.len();
    while end > start && value.digits[end - 1].value == 0 {
        end = end - 1;
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
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
    let mut digits: Vec<NumericWireDigit> = Vec::new();
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
        digits[usize::try_from(i).unwrap_or(0)] = NumericWireDigit { value: digit };
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
        digits[usize::try_from(i).unwrap_or(0)] = NumericWireDigit { value: digit };
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
            if digits[usize::try_from(ndigits).unwrap_or(0)].value >= NUMERIC_VAR_HALF_NBASE {
                carry = 1;
            }
        } else {
            position = position - 1;
            let last = usize::try_from(position).unwrap_or(0);
            let mut pow10 = numeric_var_round_power(di);
            let extra = digits[last].value % pow10;
            digits[last] = NumericWireDigit {
                value: digits[last].value - extra,
            };
            if extra >= pow10 / 2 {
                pow10 = pow10 + digits[last].value;
                if pow10 >= NUMERIC_VAR_NBASE {
                    pow10 = pow10 - NUMERIC_VAR_NBASE;
                    carry = 1;
                }
                digits[last] = NumericWireDigit { value: pow10 };
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
                carry = carry + digits[at].value;
                if carry >= NUMERIC_VAR_NBASE {
                    digits[at] = NumericWireDigit {
                        value: carry - NUMERIC_VAR_NBASE,
                    };
                    carry = 1;
                } else {
                    digits[at] = NumericWireDigit { value: carry };
                    carry = 0;
                };
            };
        }
    }
    let mut rounded: Vec<NumericWireDigit> = Vec::new();
    if leading > 0 {
        rounded.push(NumericWireDigit { value: leading });
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
            let extra = digits[last].value % pow10;
            digits[last] = NumericWireDigit {
                value: digits[last].value - extra,
            };
        }
    }
    let mut truncated: Vec<NumericWireDigit> = Vec::new();
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

fn numeric_var_mul(left: &NumericVar, right: &NumericVar, rscale: i32) -> NumericVar {
    // The shorter operand drives the outer loop.
    if numeric_var_count(left) > numeric_var_count(right) {
        return numeric_var_mul(right, left, rscale);
    }
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    if var1ndigits == 0 || var2ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let res_weight = left.weight + right.weight + 2;
    let mut res_ndigits = var1ndigits + var2ndigits + 1;
    let maxdigits = res_weight
        + 1
        + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS
        + NUMERIC_VAR_MUL_GUARD_DIGITS;
    if maxdigits < res_ndigits {
        res_ndigits = maxdigits;
    }
    if res_ndigits < 3 {
        return numeric_var_zero(rscale);
    }
    // Accumulated columns stay below the 32-bit maximum: maxdig bounds every column divided
    // by NBASE - 1, and carries are propagated before it could pass that bound.
    let mut dig = numeric_var_zeros(res_ndigits);
    let normalize_limit =
        (NUMERIC_VAR_INT_MAX - NUMERIC_VAR_INT_MAX / NUMERIC_VAR_NBASE) / (NUMERIC_VAR_NBASE - 1);
    let mut maxdig: i32 = 0;
    let mut i1 = var1ndigits - 1;
    if res_ndigits - 3 < i1 {
        i1 = res_ndigits - 3;
    }
    while i1 >= 0 {
        let var1digit = numeric_var_digit(left, i1);
        if var1digit != 0 {
            maxdig = maxdig + var1digit;
            if maxdig > normalize_limit {
                let mut carry: i32 = 0;
                let mut i = res_ndigits - 1;
                while i >= 0 {
                    let at = usize::try_from(i).unwrap_or(0);
                    let mut newdig = dig[at].value + carry;
                    carry = 0;
                    if newdig >= NUMERIC_VAR_NBASE {
                        carry = newdig / NUMERIC_VAR_NBASE;
                        newdig = newdig - carry * NUMERIC_VAR_NBASE;
                    }
                    dig[at] = NumericWireDigit { value: newdig };
                    i = i - 1;
                }
                maxdig = 1 + var1digit;
            }
            let mut i2limit = var2ndigits;
            if res_ndigits - i1 - 2 < i2limit {
                i2limit = res_ndigits - i1 - 2;
            }
            let offset = usize::try_from(i1 + 2).unwrap_or(0);
            let limit = usize::try_from(i2limit).unwrap_or(0);
            let mut i2: usize = 0;
            while i2 < limit {
                dig[offset + i2] = NumericWireDigit {
                    value: dig[offset + i2].value + var1digit * right.digits[i2].value,
                };
                i2 += 1;
            }
        }
        i1 = i1 - 1;
    }
    let mut carry: i32 = 0;
    let mut i = res_ndigits - 1;
    while i >= 0 {
        let at = usize::try_from(i).unwrap_or(0);
        let mut newdig = dig[at].value + carry;
        carry = 0;
        if newdig >= NUMERIC_VAR_NBASE {
            carry = newdig / NUMERIC_VAR_NBASE;
            newdig = newdig - carry * NUMERIC_VAR_NBASE;
        }
        dig[at] = NumericWireDigit { value: newdig };
        i = i - 1;
    }
    let rounded = numeric_var_round(
        NumericVar {
            sign: res_sign,
            weight: res_weight,
            dscale: rscale,
            digits: dig,
        },
        rscale,
    );
    numeric_var_strip(rounded)
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
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut carry: i64 = 0i64;
    let mut i: i32 = 0;
    while i < res_ndigits {
        let digit = numeric_var_digit(value, i) as i64;
        carry = carry * 10000i64 + digit;
        digits.push(NumericWireDigit {
            value: (carry / divisor) as i32,
        });
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

// Knuth's algorithm D, figured to exactly rscale fractional digits. Callers never divide by
// zero: the square root divides by twice a positive partial root.
fn numeric_var_div(left: &NumericVar, right: &NumericVar, rscale: i32, round: bool) -> NumericVar {
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
    if divisor[1].value < NUMERIC_VAR_HALF_NBASE {
        let d = NUMERIC_VAR_NBASE / (divisor[1].value + 1);
        let mut carry: i32 = 0;
        let mut i = divisor_end;
        while i > 0 {
            carry = carry + divisor[i].value * d;
            divisor[i] = NumericWireDigit {
                value: carry % NUMERIC_VAR_NBASE,
            };
            carry = carry / NUMERIC_VAR_NBASE;
            i = i - 1;
        }
        carry = 0;
        let mut j = usize::try_from(var1ndigits).unwrap_or(0) + 1;
        while j > 0 {
            j = j - 1;
            carry = carry + dividend[j].value * d;
            dividend[j] = NumericWireDigit {
                value: carry % NUMERIC_VAR_NBASE,
            };
            carry = carry / NUMERIC_VAR_NBASE;
        }
    }
    let divisor1 = divisor[1].value;
    let divisor2 = divisor[2].value;
    let mut res_digits: Vec<NumericWireDigit> = Vec::new();
    let res_end = usize::try_from(res_ndigits).unwrap_or(0);
    let mut j: usize = 0;
    while j < res_end {
        let next2digits = dividend[j].value * NUMERIC_VAR_NBASE + dividend[j + 1].value;
        let mut qhat: i32 = 0;
        if next2digits != 0 {
            if dividend[j].value == divisor1 {
                qhat = NUMERIC_VAR_NBASE - 1;
            } else {
                qhat = next2digits / divisor1;
            }
            // Knuth proves the estimate is then exact or one too large.
            while divisor2 * qhat
                > (next2digits - qhat * divisor1) * NUMERIC_VAR_NBASE + dividend[j + 2].value
            {
                qhat = qhat - 1;
            }
            if qhat > 0 {
                let mut borrow: i32 = 0;
                let mut i = divisor_end + 1;
                while i > 0 {
                    i = i - 1;
                    let tmp_result = dividend[j + i].value - borrow - divisor[i].value * qhat;
                    borrow = (NUMERIC_VAR_NBASE - 1 - tmp_result) / NUMERIC_VAR_NBASE;
                    dividend[j + i] = NumericWireDigit {
                        value: tmp_result + borrow * NUMERIC_VAR_NBASE,
                    };
                }
                if borrow != 0 {
                    // qhat was one too large: add the divisor back once.
                    qhat = qhat - 1;
                    let mut carry: i32 = 0;
                    i = divisor_end + 1;
                    while i > 0 {
                        i = i - 1;
                        carry = carry + dividend[j + i].value + divisor[i].value;
                        if carry >= NUMERIC_VAR_NBASE {
                            dividend[j + i] = NumericWireDigit {
                                value: carry - NUMERIC_VAR_NBASE,
                            };
                            carry = 1;
                        } else {
                            dividend[j + i] = NumericWireDigit { value: carry };
                            carry = 0;
                        };
                    }
                };
            };
        }
        res_digits.push(NumericWireDigit { value: qhat });
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

// The truncated integer quotient and the remainder, precise to the divisor's scale.
fn numeric_var_div_mod(left: &NumericVar, right: &NumericVar) -> NumericVarDivision {
    let one = numeric_var_from_i64(1i64);
    let mut q = numeric_var_div(left, right, 0, false);
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
