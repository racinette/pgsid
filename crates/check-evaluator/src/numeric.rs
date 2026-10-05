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

fn numeric_space(value: char) -> bool {
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
