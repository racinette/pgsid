pub fn bit_from_literal(value: &str) -> BitValue {
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut hexadecimal = false;
    if chars.len() > 0 {
        if chars[0] == 'b' || chars[0] == 'B' {
            index = 1;
        }
        if chars[0] == 'x' || chars[0] == 'X' {
            index = 1;
            hexadecimal = true;
        }
    }
    if chars.len() > 536870910 {
        return BitValue::Unknown;
    }
    let mut output = String::new();
    while index < chars.len() {
        let ch = chars[index];
        if hexadecimal {
            let digit = hex_digit(ch);
            if digit == 16 {
                return BitValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
            }
            let mut weight: i32 = 8;
            while weight > 0 {
                if digit / weight % 2 == 0 {
                    output.push('0');
                } else {
                    output.push('1');
                }
                weight = weight / 2;
            }
        } else {
            if ch != '0' && ch != '1' {
                return BitValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
            }
            output.push(ch);
        }
        index += 1;
    }
    BitValue::Value(output)
}

pub fn bit_payload_length(value: &str) -> i32 {
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut length: i32 = 0;
    while index < chars.len() {
        index += 1;
        length = length + 1;
    }
    length
}

pub fn bit_from_text(input: TextValue) -> BitValue {
    if let TextValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if input == TextValue::Unknown {
        return BitValue::Unknown;
    }
    if input == TextValue::Null {
        return BitValue::Null;
    }
    if let TextValue::Value(value) = input {
        return bit_from_literal(value.as_str());
    }
    BitValue::Unknown
}

pub fn bit_to_text(input: BitValue) -> TextValue {
    if let BitValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == BitValue::Unknown {
        return TextValue::Unknown;
    }
    if input == BitValue::Null {
        return TextValue::Null;
    }
    if let BitValue::Value(value) = input {
        return TextValue::Value(value);
    }
    TextValue::Unknown
}
