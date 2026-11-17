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

fn numeric_arithmetic(left: NumericValue, right: NumericValue, mode: i32) -> NumericValue {
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
    let mut condition_flavor_285_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_285_4 < 1 { condition_flavor_285_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_285_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_285_4 < 1 { condition_flavor_285_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_285_4 = 2; }; if (numeric_unknown_left_1 || numeric_unimplemented_left_2) || (numeric_unknown_right_3 || numeric_unimplemented_right_4) {
        return numeric_unresolved(condition_flavor_285_4);
    }
    let mut numeric_null_left_5 = false; if let NumericValue::Null = left { numeric_null_left_5 = true; }; let mut numeric_null_right_6 = false; if let NumericValue::Null = right { numeric_null_right_6 = true; };
    if numeric_null_left_5 || numeric_null_right_6 {
        return NumericValue::Null;
    }
    if let NumericValue::Value(left_var) = left {
        if let NumericValue::Value(right_var) = right {
            let first_kind = numeric_var_kind(&left_var);
            let second_kind = numeric_var_kind(&right_var);
            if first_kind == 3 || second_kind == 3 {
                return make_numeric_value("NaN");
            }
            if first_kind != 1 || second_kind != 1 {
                let mut left_sign = numeric_var_signum(&left_var);
                let mut right_sign = numeric_var_signum(&right_var);
                if first_kind == 0 {
                    left_sign = -1;
                }
                if first_kind == 2 {
                    left_sign = 1;
                }
                if second_kind == 0 {
                    right_sign = -1;
                }
                if second_kind == 2 {
                    right_sign = 1;
                }
                if mode == 1 {
                    right_sign = 0 - right_sign;
                }
                let mut result_sign = left_sign;
                if mode == 2 {
                    result_sign = left_sign * right_sign;
                } else {
                    if first_kind == 1 {
                        result_sign = right_sign;
                    } else {
                        if second_kind != 1 && left_sign != right_sign {
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
                let rscale = left_var.dscale + right_var.dscale;
                let product = numeric_var_mul(&left_var, &right_var, rscale);
                if product.dscale > 16383 {
                    return numeric_var_result(numeric_var_round(product, 16383));
                }
                return numeric_var_result(product);
            }
            if mode == 1 {
                let result = numeric_var_sub(&left_var, &right_var);
                return numeric_var_result(result);
            }
            let result = numeric_var_add(&left_var, &right_var);
            return numeric_var_result(result);
        }
    }
    numeric_unresolved(unresolved_flavor)
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
