fn numeric_division_scale(left: NumericWork, right: NumericWork) -> i32 {
    let mut first_weight: i32 = 0;
    let mut second_weight: i32 = 0;
    let mut first_digit: i32 = 0;
    let mut second_digit: i32 = 0;
    let first: Vec<char> = left.digits.chars().collect();
    let second: Vec<char> = right.digits.chars().collect();
    if left.sign != 0 {
        first_weight = left.weight / 4;
        let mut width = left.weight % 4;
        if width < 0 {
            first_weight = first_weight - 1;
            width = width + 4;
        }
        width = width + 1;
        let mut index: usize = 0;
        while width > 0 {
            first_digit = first_digit * 10;
            if index < first.len() {
                first_digit = first_digit + numeric_wire_decimal_digit(first[index]);
            }
            index += 1;
            width = width - 1;
        }
    }
    if right.sign != 0 {
        second_weight = right.weight / 4;
        let mut width = right.weight % 4;
        if width < 0 {
            second_weight = second_weight - 1;
            width = width + 4;
        }
        width = width + 1;
        let mut index: usize = 0;
        while width > 0 {
            second_digit = second_digit * 10;
            if index < second.len() {
                second_digit = second_digit + numeric_wire_decimal_digit(second[index]);
            }
            index += 1;
            width = width - 1;
        }
    }
    let mut quotient_weight = first_weight - second_weight;
    if first_digit <= second_digit {
        quotient_weight = quotient_weight - 1;
    }
    let mut scale = 16 - quotient_weight * 4;
    if scale < left.scale {
        scale = left.scale;
    }
    if scale < right.scale {
        scale = right.scale;
    }
    if scale < 0 {
        scale = 0;
    }
    if scale > 1000 {
        scale = 1000;
    }
    scale
}

fn numeric_division_work(
    left: NumericWork,
    right: NumericWork,
    scale: i32,
    rounding: bool,
) -> NumericWork {
    let first: Vec<char> = left.digits.chars().collect();
    let second: Vec<char> = right.digits.chars().collect();
    let mut denominator: Vec<NumericWireDigit> = Vec::new();
    let mut remainder: Vec<NumericWireDigit> = Vec::new();
    remainder.push(NumericWireDigit { value: 0 });
    let mut second_exponent = right.weight + 1;
    let mut index: usize = 0;
    while index < second.len() {
        denominator.push(NumericWireDigit {
            value: numeric_wire_decimal_digit(second[index]),
        });
        remainder.push(NumericWireDigit { value: 0 });
        second_exponent = second_exponent - 1;
        index += 1;
    }
    let mut position = left.weight - second_exponent;
    let mut boundary = 0 - scale;
    if rounding {
        boundary = boundary - 1;
    }
    let mut coefficient = String::new();
    let mut weight: i32 = 0;
    let mut sign: i32 = 0;
    index = 0;
    while position >= boundary && left.sign != 0 {
        let mut cursor: usize = 0;
        while cursor + 1 < remainder.len() {
            remainder[cursor] = remainder[cursor + 1];
            cursor += 1;
        }
        let mut digit: i32 = 0;
        if index < first.len() {
            digit = numeric_wire_decimal_digit(first[index]);
        }
        remainder[cursor] = NumericWireDigit { value: digit };
        index += 1;
        let mut quotient: i32 = 0;
        let mut subtract = true;
        while subtract {
            subtract = remainder[0].value != 0;
            if subtract == false {
                let mut order: i32 = 0;
                cursor = 0;
                while cursor < denominator.len() && order == 0 {
                    if remainder[cursor + 1].value < denominator[cursor].value {
                        order = -1;
                    }
                    if remainder[cursor + 1].value > denominator[cursor].value {
                        order = 1;
                    }
                    cursor += 1;
                }
                subtract = order >= 0;
            }
            if subtract {
                let mut borrow: i32 = 0;
                cursor = denominator.len();
                while cursor > 0 {
                    let mut difference =
                        remainder[cursor].value - denominator[cursor - 1].value - borrow;
                    borrow = 0;
                    if difference < 0 {
                        difference = difference + 10;
                        borrow = 1;
                    }
                    remainder[cursor] = NumericWireDigit { value: difference };
                    cursor = cursor - 1;
                }
                remainder[0] = NumericWireDigit {
                    value: remainder[0].value - borrow,
                };
                quotient = quotient + 1;
            }
        }
        if quotient != 0 && sign == 0 {
            sign = left.sign * right.sign;
            weight = position;
        }
        if sign != 0 {
            coefficient.push(char::from_u32((quotient + 48) as u32).unwrap_or('0'));
        }
        let mut nonzero = false;
        cursor = 0;
        while cursor < remainder.len() {
            if remainder[cursor].value != 0 {
                nonzero = true;
            }
            cursor += 1;
        }
        if index >= first.len() && nonzero == false {
            position = boundary;
        }
        position = position - 1;
    }
    NumericWork {
        valid: true,
        special: 1,
        sign: sign,
        weight: weight,
        scale: scale,
        digits: coefficient,
    }
}

fn numeric_division(left: NumericValue, right: NumericValue, mode: i32) -> NumericValue {
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
    if let NumericValue::Value(first) = left {
        if let NumericValue::Value(second) = right {
            let a = numeric_work_from_value(first.as_str());
            let b = numeric_work_from_value(second.as_str());
            if a.valid == false || b.valid == false {
                return NumericValue::Unknown;
            }
            if a.special == 3 || b.special == 3 {
                return NumericValue::Value("NaN".to_owned());
            }
            if b.special == 1 && b.sign == 0 {
                return NumericValue::Error(make_sql_error(SQLSTATE_DIVISION_BY_ZERO));
            }
            if a.special != 1 {
                if mode == 2 || b.special != 1 {
                    return NumericValue::Value("NaN".to_owned());
                }
                let mut sign = b.sign;
                if a.special == 0 {
                    sign = 0 - sign;
                }
                if sign < 0 {
                    return NumericValue::Value("-Infinity".to_owned());
                }
                return NumericValue::Value("Infinity".to_owned());
            }
            if b.special != 1 {
                if mode == 2 {
                    return NumericValue::Value(first);
                }
                return NumericValue::Value("0".to_owned());
            }
            if mode == 2 {
                let quotient = numeric_division_work(a.clone(), b.clone(), 0, false);
                let product = numeric_work_multiply(quotient, b);
                if let NumericValue::Value(multiplied) = product {
                    return numeric_work_add(a, numeric_work_from_value(multiplied.as_str()), true);
                }
                return product;
            }
            let mut scale: i32 = 0;
            let mut rounding = false;
            if mode == 0 {
                scale = numeric_division_scale(a.clone(), b.clone());
                rounding = true;
            }
            let quotient = numeric_division_work(a, b, scale, rounding);
            let mut round_mode: i32 = 0;
            if rounding {
                round_mode = 1;
            }
            return numeric_work_round(quotient, scale, round_mode);
        }
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric_div__pnzm(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 0)
}

pub fn sql__pg_catalog__numeric_div_trunc__5o9b(
    left: NumericValue,
    right: NumericValue,
) -> NumericValue {
    numeric_division(left, right, 1)
}

pub fn sql__pg_catalog__div__n5y4(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 1)
}

pub fn sql__pg_catalog__numeric_mod__8ywz(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 2)
}

pub fn sql__pg_catalog__mod__4p6l(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 2)
}
