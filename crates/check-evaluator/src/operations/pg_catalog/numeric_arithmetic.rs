fn numeric_work_magnitude(left: NumericWork, right: NumericWork) -> i32 {
    if left.sign == 0 {
        if right.sign == 0 {
            return 0;
        }
        return -1;
    }
    if right.sign == 0 {
        return 1;
    }
    if left.weight < right.weight {
        return -1;
    }
    if left.weight > right.weight {
        return 1;
    }
    let first: Vec<char> = left.digits.chars().collect();
    let second: Vec<char> = right.digits.chars().collect();
    let mut index: usize = 0;
    while index < first.len() || index < second.len() {
        let mut a: i32 = 0;
        let mut b: i32 = 0;
        if index < first.len() {
            a = numeric_wire_decimal_digit(first[index]);
        }
        if index < second.len() {
            b = numeric_wire_decimal_digit(second[index]);
        }
        if a < b {
            return -1;
        }
        if a > b {
            return 1;
        }
        index += 1;
    }
    0
}

fn numeric_work_sum(left: NumericWork, right: NumericWork, subtract: bool) -> NumericWork {
    let mut scale = left.scale;
    if right.scale > scale {
        scale = right.scale;
    }
    let mut sign = left.sign;
    let mut other_sign = right.sign;
    if subtract {
        other_sign = 0 - other_sign;
    }
    let adding = sign == other_sign;
    let mut swap = false;
    if adding == false {
        let order = numeric_work_magnitude(left.clone(), right.clone());
        if order < 0 {
            swap = true;
            sign = other_sign;
        }
        if order == 0 {
            sign = 0;
        }
    }
    let mut weight = left.weight;
    if right.weight > weight {
        weight = right.weight;
    }
    weight = weight + 1;
    let first: Vec<char> = left.digits.chars().collect();
    let second: Vec<char> = right.digits.chars().collect();
    let mut a_index: usize = 0;
    let mut b_index: usize = 0;
    let mut a_digits: Vec<NumericWireDigit> = Vec::new();
    let mut b_digits: Vec<NumericWireDigit> = Vec::new();
    let mut position = weight;
    while position >= 0 - scale {
        let mut a: i32 = 0;
        let mut b: i32 = 0;
        if position <= left.weight && a_index < first.len() {
            a = numeric_wire_decimal_digit(first[a_index]);
            a_index += 1;
        }
        if position <= right.weight && b_index < second.len() {
            b = numeric_wire_decimal_digit(second[b_index]);
            b_index += 1;
        }
        a_digits.push(NumericWireDigit { value: a });
        b_digits.push(NumericWireDigit { value: b });
        position = position - 1;
    }
    let mut result: Vec<NumericWireDigit> = Vec::new();
    let mut index: usize = 0;
    while index < a_digits.len() {
        result.push(NumericWireDigit { value: 0 });
        index += 1;
    }
    let mut carry: i32 = 0;
    while index > 0 {
        index = index - 1;
        let mut a = a_digits[index].value;
        let mut b = b_digits[index].value;
        if swap {
            a = b_digits[index].value;
            b = a_digits[index].value;
        }
        let mut digit = a + b + carry;
        if adding {
            carry = digit / 10;
            digit = digit % 10;
        } else {
            digit = a - b - carry;
            carry = 0;
            if digit < 0 {
                digit = digit + 10;
                carry = 1;
            }
        };
        result[index] = NumericWireDigit { value: digit };
    }
    let mut end = result.len();
    while end > 0 && result[end - 1].value == 0 {
        end = end - 1;
    }
    let mut start: usize = 0;
    while start < end && result[start].value == 0 {
        start += 1;
        weight = weight - 1;
    }
    let mut digits = String::new();
    index = start;
    while index < end {
        digits.push(char::from_u32((result[index].value + 48) as u32).unwrap_or('0'));
        index += 1;
    }
    if start == end {
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

fn numeric_work_add(left: NumericWork, right: NumericWork, subtract: bool) -> NumericValue {
    let work = numeric_work_sum(left, right, subtract);
    if work.weight > 131071 {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    NumericValue::Value(numeric_work_text(work))
}

fn numeric_product_words(characters: Vec<char>) -> Vec<NumericWireDigit> {
    let mut words: Vec<NumericWireDigit> = Vec::new();
    let mut end = characters.len();
    while end > 0 {
        let mut value: i32 = 0;
        let mut factor: i32 = 1;
        let mut width: i32 = 0;
        while end > 0 && width < 4 {
            end = end - 1;
            value = value + numeric_wire_decimal_digit(characters[end]) * factor;
            factor = factor * 10;
            width = width + 1;
        }
        words.push(NumericWireDigit { value: value });
    }
    words
}

fn numeric_work_product(left: NumericWork, right: NumericWork) -> NumericWork {
    let scale = left.scale + right.scale;
    let sign = left.sign * right.sign;
    let first: Vec<char> = left.digits.chars().collect();
    let second: Vec<char> = right.digits.chars().collect();
    let mut a_count: i32 = 0;
    let mut b_count: i32 = 0;
    let mut index: usize = 0;
    while index < first.len() {
        a_count = a_count + 1;
        index += 1;
    }
    index = 0;
    while index < second.len() {
        b_count = b_count + 1;
        index += 1;
    }
    let a = numeric_product_words(first);
    let b = numeric_product_words(second);
    let mut result: Vec<NumericWireDigit> = Vec::new();
    index = 0;
    while index < a.len() + b.len() + 1 {
        result.push(NumericWireDigit { value: 0 });
        index += 1;
    }
    let mut a_index: usize = 0;
    while a_index < a.len() {
        let mut b_index: usize = 0;
        let mut carry: i32 = 0;
        while b_index < b.len() {
            let offset = a_index + b_index;
            let product = a[a_index].value * b[b_index].value + result[offset].value + carry;
            result[offset] = NumericWireDigit {
                value: product % 10000,
            };
            carry = product / 10000;
            b_index += 1;
        }
        let mut offset = a_index + b_index;
        while carry > 0 {
            let word = result[offset].value + carry;
            result[offset] = NumericWireDigit {
                value: word % 10000,
            };
            carry = word / 10000;
            offset += 1;
        }
        a_index += 1;
    }
    let mut end = result.len();
    while end > 0 && result[end - 1].value == 0 {
        end = end - 1;
    }
    let mut coefficient = String::new();
    let mut count: i32 = 0;
    while end > 0 {
        end = end - 1;
        let mut word = result[end].value;
        let mut place: i32 = 1000;
        while place > 0 {
            let digit = word / place;
            word = word % place;
            if coefficient != String::new() || digit != 0 {
                coefficient.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
                count = count + 1;
            }
            place = place / 10;
        }
    }
    let mut weight = left.weight + right.weight + count - a_count - b_count + 1;
    let characters: Vec<char> = coefficient.chars().collect();
    end = characters.len();
    while end > 0 && characters[end - 1] == '0' {
        end = end - 1;
    }
    let mut digits = String::new();
    index = 0;
    while index < end {
        digits.push(characters[index]);
        index += 1;
    }
    if sign == 0 {
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

fn numeric_work_multiply(left: NumericWork, right: NumericWork) -> NumericValue {
    let work = numeric_work_product(left, right);
    let scale = work.scale;
    numeric_work_round(work, scale, 1)
}

fn numeric_arithmetic(left: NumericValue, right: NumericValue, mode: i32) -> NumericValue {
    if let NumericValue::Error(error) = left {
        return NumericValue::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return NumericValue::Error(error);
    }
    if left == NumericValue::Unknown || right == NumericValue::Unknown {
        return NumericValue::Unknown;
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(a) = left {
        if let NumericValue::Value(b) = right {
            let first = numeric_work_from_value(a.as_str());
            let second = numeric_work_from_value(b.as_str());
            if first.valid == false || second.valid == false {
                return NumericValue::Unknown;
            }
            if first.special == 3 || second.special == 3 {
                return make_numeric_value("NaN");
            }
            if first.special != 1 || second.special != 1 {
                let mut left_sign = first.sign;
                let mut right_sign = second.sign;
                if first.special == 0 {
                    left_sign = -1;
                }
                if first.special == 2 {
                    left_sign = 1;
                }
                if second.special == 0 {
                    right_sign = -1;
                }
                if second.special == 2 {
                    right_sign = 1;
                }
                if mode == 1 {
                    right_sign = 0 - right_sign;
                }
                let mut result_sign = left_sign;
                if mode == 2 {
                    result_sign = left_sign * right_sign;
                } else {
                    if first.special == 1 {
                        result_sign = right_sign;
                    } else {
                        if second.special != 1 && left_sign != right_sign {
                            result_sign = 0;
                        }
                    };
                };
                if result_sign == 0 {
                    return make_numeric_value("NaN");
                }
                if result_sign < 0 {
                    return make_numeric_value("-Infinity");
                }
                return make_numeric_value("Infinity");
            }
            if mode == 2 {
                return numeric_work_multiply(first, second);
            }
            return numeric_work_add(first, second, mode == 1);
        }
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric_add__o3d7(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_arithmetic(left, right, 0)
}

pub fn sql__pg_catalog__numeric_sub__ys09(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_arithmetic(left, right, 1)
}

pub fn sql__pg_catalog__numeric_mul__bj4l(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_arithmetic(left, right, 2)
}

pub fn sql__pg_catalog__numeric_inc__6dcf(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_add__o3d7(input, make_numeric_value("1"))
}
