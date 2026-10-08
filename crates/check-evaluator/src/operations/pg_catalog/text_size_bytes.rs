const SIZE_BYTES_PARAMETER_ERROR: u32 = 3452619;
const SIZE_BYTES_NUMERIC_SYNTAX_ERROR: u32 = 3484946;

pub fn sql__pg_catalog__pg_size_bytes__ggrt(input: TextValue) -> Int8Value {
    if let TextValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == TextValue::Unknown {
        return Int8Value::Unknown;
    }
    if input == TextValue::Null {
        return Int8Value::Null;
    }
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut index: usize = 0;
        while index < characters.len() && numeric_space(characters[index]) {
            index += 1;
        }
        let mut sign: i32 = 1;
        if index < characters.len() && characters[index] == '-' {
            sign = -1;
            index += 1;
        } else if index < characters.len() && characters[index] == '+' {
            index += 1;
        };
        let mut point = false;
        let mut digits: i32 = 0;
        let mut before: i32 = 0;
        let mut fractional: i32 = 0;
        let mut leading: i32 = 0;
        let mut first = characters.len();
        let mut last = characters.len();
        while index < characters.len() {
            let digit = numeric_wire_decimal_digit(characters[index]);
            if digit >= 0 {
                if digit > 0 {
                    if first == characters.len() {
                        first = index;
                        leading = digits;
                    }
                    last = index;
                }
                digits = digits + 1;
                if point {
                    fractional = fractional + 1;
                } else {
                    before = before + 1;
                };
                index += 1;
            } else if characters[index] == '.' && point == false {
                point = true;
                index += 1;
            } else {
                break;
            };
        }
        if digits == 0 {
            return Int8Value::Error(make_sql_error(SIZE_BYTES_PARAMETER_ERROR));
        }
        let mut exponent: i32 = 0;
        if index < characters.len() && (characters[index] == 'e' || characters[index] == 'E') {
            let mut cursor = index + 1;
            let mut whitespace = false;
            while cursor < characters.len() && numeric_space(characters[cursor]) {
                whitespace = true;
                cursor += 1;
            }
            let mut negative = false;
            if cursor < characters.len() && characters[cursor] == '-' {
                negative = true;
                cursor += 1;
            } else if cursor < characters.len() && characters[cursor] == '+' {
                cursor += 1;
            };
            let begin = cursor;
            let mut overflow = false;
            while cursor < characters.len() && numeric_wire_decimal_digit(characters[cursor]) >= 0 {
                let digit = numeric_wire_decimal_digit(characters[cursor]);
                if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
                    overflow = true;
                }
                if overflow == false {
                    exponent = exponent * 10 + digit;
                }
                cursor += 1;
            }
            if cursor > begin {
                index = cursor;
                if whitespace {
                    return Int8Value::Error(make_sql_error(SIZE_BYTES_NUMERIC_SYNTAX_ERROR));
                }
                if overflow {
                    return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
                }
                if negative {
                    exponent = 0 - exponent;
                }
            }
        }
        let mut scale = fractional - exponent;
        if scale < 0 {
            scale = 0;
        }
        if scale > 16383 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        let mut weight = before - leading - 1 + exponent;
        if first == characters.len() {
            sign = 0;
            weight = 0;
        }
        if weight > 131071 || weight < -131072 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        while index < characters.len() && numeric_space(characters[index]) {
            index += 1;
        }
        let mut end = characters.len();
        while end > index && numeric_space(characters[end - 1]) {
            end = end - 1;
        }
        let mut unit = String::new();
        while index < end {
            unit.push(characters[index].to_ascii_lowercase());
            index += 1;
        }
        let mut power: i32 = 0;
        if unit == "kb" {
            power = 1;
        } else if unit == "mb" {
            power = 2;
        } else if unit == "gb" {
            power = 3;
        } else if unit == "tb" {
            power = 4;
        } else if unit == "pb" {
            power = 5;
        } else if unit != "" && unit != "b" && unit != "bytes" {
            return Int8Value::Error(make_sql_error(SIZE_BYTES_PARAMETER_ERROR));
        };
        if sign != 0 && weight > 18 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        let mut coefficient = String::new();
        index = first;
        while index < characters.len() && index <= last {
            if numeric_wire_decimal_digit(characters[index]) >= 0 {
                coefficient.push(characters[index]);
            }
            index += 1;
        }
        let quantity = NumericWork {
            valid: true,
            special: 1,
            sign: sign,
            weight: weight,
            scale: scale,
            digits: coefficient,
        };
        let mut value = NumericValue::Value(numeric_work_text(quantity));
        if power > 0 {
            let mut multiplier: i64 = 1i64;
            while power > 0 {
                multiplier = multiplier * 1024i64;
                power = power - 1;
            }
            let factor = NumericValue::Value(text_signed_number(multiplier));
            value = numeric_arithmetic(value, factor, 2);
        }
        return numeric_integer_value(value);
    }
    Int8Value::Unknown
}
