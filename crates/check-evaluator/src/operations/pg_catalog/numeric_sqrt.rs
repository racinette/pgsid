const NUMERIC_SQRT_INVALID_ARGUMENT: u32 = 3452595;

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
    let mut weight = work.weight / 2;
    if work.weight % 2 < 0 {
        weight = weight - 1;
    }
    let characters: Vec<char> = work.digits.chars().collect();
    let mut input_index: usize = 0;
    let mut root: Vec<NumericWireDigit> = Vec::new();
    root.push(NumericWireDigit { value: 0 });
    let mut remainder: Vec<NumericWireDigit> = Vec::new();
    remainder.push(NumericWireDigit { value: 0 });
    let mut remainder_length: usize = 1;
    let mut coefficient = String::new();
    let mut position = weight;
    while position >= 0 - scale - 1 && work.sign != 0 {
        let mut pair: i32 = 0;
        let mut source_position = position * 2 + 1;
        let mut step: i32 = 0;
        while step < 2 {
            pair = pair * 10;
            if source_position <= work.weight && input_index < characters.len() {
                pair = pair + numeric_wire_decimal_digit(characters[input_index]);
                input_index += 1;
            }
            source_position = source_position - 1;
            step = step + 1;
        }
        let mut carry = pair;
        let mut cursor: usize = 0;
        while cursor < remainder_length {
            let word = remainder[cursor].value * 100 + carry;
            remainder[cursor] = NumericWireDigit {
                value: word % 10000,
            };
            carry = word / 10000;
            cursor += 1;
        }
        if carry > 0 {
            if remainder_length == remainder.len() {
                remainder.push(NumericWireDigit { value: carry });
            } else {
                remainder[remainder_length] = NumericWireDigit { value: carry };
            };
            remainder_length += 1;
        }
        let mut digit: i32 = 9;
        let mut searching = true;
        while searching {
            let mut candidate: Vec<NumericWireDigit> = Vec::new();
            carry = digit * digit;
            cursor = 0;
            while cursor < root.len() {
                let word = root[cursor].value * (20 * digit) + carry;
                candidate.push(NumericWireDigit {
                    value: word % 10000,
                });
                carry = word / 10000;
                cursor += 1;
            }
            if carry > 0 {
                candidate.push(NumericWireDigit { value: carry });
            }
            let mut candidate_length = candidate.len();
            while candidate_length > 1 && candidate[candidate_length - 1].value == 0 {
                candidate_length = candidate_length - 1;
            }
            let mut order: i32 = 0;
            if remainder_length < candidate_length {
                order = -1;
            }
            if remainder_length > candidate_length {
                order = 1;
            }
            cursor = candidate_length;
            while order == 0 && cursor > 0 {
                cursor = cursor - 1;
                if remainder[cursor].value < candidate[cursor].value {
                    order = -1;
                }
                if remainder[cursor].value > candidate[cursor].value {
                    order = 1;
                }
            }
            if order >= 0 {
                let mut borrow: i32 = 0;
                cursor = 0;
                while cursor < remainder_length {
                    let mut word = remainder[cursor].value - borrow;
                    if cursor < candidate_length {
                        word = word - candidate[cursor].value;
                    }
                    borrow = 0;
                    if word < 0 {
                        word = word + 10000;
                        borrow = 1;
                    }
                    remainder[cursor] = NumericWireDigit { value: word };
                    cursor += 1;
                }
                while remainder_length > 1 && remainder[remainder_length - 1].value == 0 {
                    remainder_length = remainder_length - 1;
                }
                searching = false;
            } else {
                digit = digit - 1;
            };
        }
        carry = digit;
        cursor = 0;
        while cursor < root.len() {
            let word = root[cursor].value * 10 + carry;
            root[cursor] = NumericWireDigit {
                value: word % 10000,
            };
            carry = word / 10000;
            cursor += 1;
        }
        if carry > 0 {
            root.push(NumericWireDigit { value: carry });
        }
        coefficient.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
        if input_index >= characters.len() && remainder_length == 1 && remainder[0].value == 0 {
            position = 0 - scale - 1;
        }
        position = position - 1;
    }
    let mut sign: i32 = 1;
    if coefficient == String::new() {
        sign = 0;
        weight = 0;
    }
    numeric_work_round(
        NumericWork {
            valid: true,
            special: 1,
            sign: sign,
            weight: weight,
            scale: scale,
            digits: coefficient,
        },
        scale,
        1,
    )
}

pub fn sql__pg_catalog__numeric_sqrt__t0uy(input: NumericValue) -> NumericValue {
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == NumericValue::Unknown {
        return NumericValue::Unknown;
    }
    if input == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return NumericValue::Unknown;
        }
        if work.special == 0 || (work.special == 1 && work.sign < 0) {
            return NumericValue::Error(make_sql_error(NUMERIC_SQRT_INVALID_ARGUMENT));
        }
        if work.special != 1 {
            return NumericValue::Value(numeric_work_text(work));
        }
        return numeric_square_root(work);
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__sqrt__2lic(input: NumericValue) -> NumericValue {
    sql__pg_catalog__numeric_sqrt__t0uy(input)
}
