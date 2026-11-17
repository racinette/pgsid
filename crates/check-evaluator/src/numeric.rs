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

#[derive(Clone, Copy)]
pub struct NumericLayout {
    pub valid: bool,
    pub special: i32,
    pub sign: i32,
    pub weight: i32,
    pub first: usize,
    pub end: usize,
}

fn invalid_numeric_parts() -> NumericLayout {
    NumericLayout {
        valid: false,
        special: 1,
        sign: 0,
        weight: 0,
        first: 0,
        end: 0,
    }
}

pub fn numeric_space(value: char) -> bool {
    value == ' '
        || value == '\t'
        || value == '\n'
        || value == '\r'
        || value == '\x0b'
        || value == '\x0c'
}

fn numeric_digit(value: char) -> i32 {
    if value == '0' {
        return 0;
    }
    if value == '1' {
        return 1;
    }
    if value == '2' {
        return 2;
    }
    if value == '3' {
        return 3;
    }
    if value == '4' {
        return 4;
    }
    if value == '5' {
        return 5;
    }
    if value == '6' {
        return 6;
    }
    if value == '7' {
        return 7;
    }
    if value == '8' {
        return 8;
    }
    if value == '9' {
        return 9;
    }
    -1
}

pub fn numeric_parts(value: &str) -> NumericLayout {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 1000000 {
        return invalid_numeric_parts();
    }
    let mut begin: usize = 0;
    let mut end = chars.len();
    while begin < end && numeric_space(chars[begin]) {
        begin += 1;
    }
    while end > begin && numeric_space(chars[end - 1]) {
        end = end - 1;
    }
    if begin == end {
        return invalid_numeric_parts();
    }
    let mut index = begin;
    let mut sign: i32 = 1;
    if chars[index] == '-' {
        sign = -1;
        index += 1;
    } else if chars[index] == '+' {
        index += 1;
    }
    if index == end {
        return invalid_numeric_parts();
    }
    if end - begin == 3
        && chars[begin].to_ascii_lowercase() == 'n'
        && chars[begin + 1].to_ascii_lowercase() == 'a'
        && chars[begin + 2].to_ascii_lowercase() == 'n'
    {
        return NumericLayout {
            valid: true,
            special: 3,
            sign: 0,
            weight: 0,
            first: 0,
            end: 0,
        };
    }
    if (end - index == 3 || end - index == 8)
        && chars[index].to_ascii_lowercase() == 'i'
        && chars[index + 1].to_ascii_lowercase() == 'n'
        && chars[index + 2].to_ascii_lowercase() == 'f'
    {
        if end - index == 8
            && (chars[index + 3].to_ascii_lowercase() != 'i'
                || chars[index + 4].to_ascii_lowercase() != 'n'
                || chars[index + 5].to_ascii_lowercase() != 'i'
                || chars[index + 6].to_ascii_lowercase() != 't'
                || chars[index + 7].to_ascii_lowercase() != 'y')
        {
            return invalid_numeric_parts();
        }
        let mut special: i32 = 2;
        if sign < 0 {
            special = 0;
        }
        return NumericLayout {
            valid: true,
            special: special,
            sign: 0,
            weight: 0,
            first: 0,
            end: 0,
        };
    }
    let mut point = false;
    let mut digits: i32 = 0;
    let mut before: i32 = 0;
    let mut fractional: i32 = 0;
    let mut first = end;
    let mut last: usize = 0;
    let mut leading: i32 = 0;
    while index < end {
        let digit = numeric_digit(chars[index]);
        if digit >= 0 {
            if first == end && digit == 0 {
                leading = leading + 1;
            }
            if digit != 0 {
                if first == end {
                    first = index;
                }
                last = index + 1;
            }
            digits = digits + 1;
            if point {
                fractional = fractional + 1;
            } else {
                before = before + 1;
            }
            index += 1;
        } else if chars[index] == '.' {
            if point {
                return invalid_numeric_parts();
            }
            point = true;
            index += 1;
            if index < end && chars[index] == '_' {
                return invalid_numeric_parts();
            }
        } else if chars[index] == '_' {
            if index == begin
                || numeric_digit(chars[index - 1]) < 0
                || index + 1 == end
                || numeric_digit(chars[index + 1]) < 0
            {
                return invalid_numeric_parts();
            }
            index += 1;
        } else {
            break;
        };
    }
    if digits == 0 {
        return invalid_numeric_parts();
    }
    let mut exponent: i32 = 0;
    if index < end && (chars[index] == 'e' || chars[index] == 'E') {
        index += 1;
        let mut negative = false;
        if index < end && chars[index] == '-' {
            negative = true;
            index += 1;
        } else if index < end && chars[index] == '+' {
            index += 1;
        }
        let start = index;
        if index == end || numeric_digit(chars[index]) < 0 {
            return invalid_numeric_parts();
        }
        while index < end {
            let digit = numeric_digit(chars[index]);
            if digit >= 0 {
                if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
                    return invalid_numeric_parts();
                }
                exponent = exponent * 10 + digit;
                index += 1;
            } else if chars[index] == '_' {
                if index == start
                    || numeric_digit(chars[index - 1]) < 0
                    || index + 1 == end
                    || numeric_digit(chars[index + 1]) < 0
                {
                    return invalid_numeric_parts();
                }
                index += 1;
            } else {
                break;
            };
        }
        if negative {
            exponent = 0 - exponent;
        }
    }
    if index != end || fractional - exponent > 16383 {
        return invalid_numeric_parts();
    }
    let weight = before - leading - 1 + exponent;
    if first == end {
        return NumericLayout {
            valid: true,
            special: 1,
            sign: 0,
            weight: 0,
            first: 0,
            end: 0,
        };
    }
    if weight > 131071 || weight < -131072 {
        return invalid_numeric_parts();
    }
    NumericLayout {
        valid: true,
        special: 1,
        sign: sign,
        weight: weight,
        first: first,
        end: last,
    }
}

// NumericVar sign values for the special numerics, which carry no digits.
pub const NUMERIC_SIGN_PINF: i32 = 2;
pub const NUMERIC_SIGN_NINF: i32 = 4;
pub const NUMERIC_SIGN_NAN: i32 = 3;

// PostgreSQL's NumericVar, the form numeric values take between operations: base-NBASE
// digits, most significant first, the weight of the first digit, the display scale, and a sign
// of 1 or -1, or one of the special signs. A zero has no digits.
#[derive(Clone)]
pub struct NumericVar {
    pub sign: i32,
    pub weight: i32,
    pub dscale: i32,
    pub digits: Vec<usize>,
}

pub fn numeric_var_special(sign: i32) -> NumericVar {
    let digits: Vec<usize> = Vec::new();
    NumericVar {
        sign: sign,
        weight: 0,
        dscale: 0,
        digits: digits,
    }
}

// PostgreSQL's get_str_from_var: the integer digits without leading zeros, then dscale
// fractional digits.
pub fn numeric_text(value: &NumericVar) -> String {
    if value.sign == NUMERIC_SIGN_NAN {
        return "NaN".to_owned();
    }
    if value.sign == NUMERIC_SIGN_PINF {
        return "Infinity".to_owned();
    }
    if value.sign == NUMERIC_SIGN_NINF {
        return "-Infinity".to_owned();
    }
    let mut output = String::new();
    if value.sign < 0 {
        output.push('-');
    }
    let count = value.digits.len() as i32;
    if value.weight < 0 {
        output.push('0');
    } else {
        let mut d: i32 = 0;
        while d <= value.weight {
            let mut dig: i32 = 0;
            if d < count {
                dig = value.digits[usize::try_from(d).unwrap_or(0)] as i32;
            }
            let mut putit = d > 0;
            let mut place: i32 = 1000;
            while place > 1 {
                let d1 = dig / place;
                dig = dig - d1 * place;
                if d1 > 0 {
                    putit = true;
                }
                if putit {
                    output.push(char::from_u32((d1 + 48) as u32).unwrap_or('0'));
                }
                place = place / 10;
            }
            output.push(char::from_u32((dig + 48) as u32).unwrap_or('0'));
            d = d + 1;
        }
    };
    if value.dscale > 0 {
        output.push('.');
        let mut written: i32 = 0;
        let mut d = value.weight + 1;
        while written < value.dscale {
            let mut dig: i32 = 0;
            if d >= 0 && d < count {
                dig = value.digits[usize::try_from(d).unwrap_or(0)] as i32;
            }
            let mut place: i32 = 1000;
            while place > 0 && written < value.dscale {
                let d1 = dig / place;
                dig = dig - d1 * place;
                output.push(char::from_u32((d1 + 48) as u32).unwrap_or('0'));
                written = written + 1;
                place = place / 10;
            }
            d = d + 1;
        }
    }
    output
}
