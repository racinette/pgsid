#[derive(Clone, Copy)]
struct NumericWireDigit {
    value: i32,
}

fn numeric_wire_decimal_digit(character: char) -> i32 {
    let code = character as i32;
    if code >= 48 && code <= 57 {
        return code - 48;
    }
    -1
}

fn numeric_wire_scale(input: &str) -> i32 {
    let chars: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    let mut point = false;
    let mut power = false;
    let mut fractional: i32 = 0;
    let mut exponent: i32 = 0;
    let mut sign: i32 = 1;
    while index < chars.len() {
        let digit = numeric_wire_decimal_digit(chars[index]);
        if digit >= 0 {
            if power {
                exponent = exponent * 10 + digit;
            } else if point {
                fractional = fractional + 1;
            };
        } else if chars[index] == '.' {
            point = true;
        } else if chars[index] == 'e' || chars[index] == 'E' {
            power = true;
        } else if power && chars[index] == '-' {
            sign = -1;
        }
        index += 1;
    }
    let scale = fractional - exponent * sign;
    if scale < 0 {
        return 0;
    }
    scale
}

fn numeric_wire_word(output: String, word: i32) -> String {
    let mut unsigned = word;
    if word < 0 {
        unsigned = word + 65536;
    }
    let result = bytea_append_byte(output, unsigned / 256);
    bytea_append_byte(result, unsigned % 256)
}

pub fn sql__pg_catalog__numeric_send__3mnb(input: NumericValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
    let mut condition_flavor_62_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_62_4 < 1 { condition_flavor_62_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_62_4 = 2; }; if numeric_unknown_input_1 || numeric_unimplemented_input_2 {
        return bytea_unresolved(condition_flavor_62_4);
    }
    let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
    if numeric_null_input_3 {
        return ByteaValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let kind = numeric_var_kind(&value);
        let mut sign: i32 = 0;
        if kind == 0 {
            sign = 61440;
        } else if kind == 2 {
            sign = 53248;
        } else if kind == 3 {
            sign = 49152;
        } else if numeric_var_signum(&value) < 0 {
            sign = 16384;
        }
        let mut scale: i32 = value.dscale;
        if kind == 0 || kind == 2 {
            scale = 32;
        } else if kind == 3 {
            scale = 0;
        }
        let weight = value.weight;
        let count = value.digits.len() as i32;
        let mut output = String::new();
        output = numeric_wire_word(output, count);
        output = numeric_wire_word(output, weight);
        output = numeric_wire_word(output, sign);
        output = numeric_wire_word(output, scale);
        let mut index: usize = 0;
        while index < value.digits.len() {
            output = numeric_wire_word(output, value.digits[index] as i32);
            index += 1;
        }
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}
