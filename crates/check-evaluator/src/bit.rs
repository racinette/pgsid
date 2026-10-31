pub fn bit_from_literal(value: &str) -> BitValue {
    let unresolved_flavor: i32 = 0;
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
        return bit_unresolved(unresolved_flavor);
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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return BitValue::Error(error);
    }
    let mut condition_flavor_64_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_64_4 < 1 { condition_flavor_64_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_64_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) {
        return bit_unresolved(condition_flavor_64_4);
    }
    if input == TextValue::Null {
        return BitValue::Null;
    }
    if let TextValue::Value(value) = input {
        return bit_from_literal(value.as_str());
    }
    bit_unresolved(unresolved_flavor)
}

pub fn bit_to_text(input: BitValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_83_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_83_4 < 1 { condition_flavor_83_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_83_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) {
        return text_unresolved(condition_flavor_83_4);
    }
    if input == BitValue::Null {
        return TextValue::Null;
    }
    if let BitValue::Value(value) = input {
        return TextValue::Value(value);
    }
    text_unresolved(unresolved_flavor)
}
