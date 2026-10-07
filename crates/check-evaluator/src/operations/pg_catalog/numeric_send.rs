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
    if let NumericValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == NumericValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == NumericValue::Null {
        return ByteaValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let layout = numeric_parts(value.as_str());
        if layout.valid == false {
            return ByteaValue::Unknown;
        }
        let mut sign: i32 = 0;
        if layout.special == 0 {
            sign = 61440;
        } else if layout.special == 2 {
            sign = 53248;
        } else if layout.special == 3 {
            sign = 49152;
        } else if layout.sign < 0 {
            sign = 16384;
        }
        let mut scale: i32 = 0;
        if layout.special == 0 || layout.special == 2 {
            scale = 32;
        }
        let mut weight: i32 = 0;
        let mut count: i32 = 0;
        let mut words: Vec<NumericWireDigit> = Vec::new();
        if layout.special == 1 {
            scale = numeric_wire_scale(value.as_str());
            if layout.sign != 0 {
                weight = layout.weight / 4;
                let mut remainder = layout.weight % 4;
                if remainder < 0 {
                    weight = weight - 1;
                    remainder = remainder + 4;
                }
                let chars: Vec<char> = value.chars().collect();
                let mut index = layout.first;
                let mut position = 3 - remainder;
                let mut group: i32 = 0;
                while index < layout.end {
                    let digit = numeric_wire_decimal_digit(chars[index]);
                    if digit >= 0 {
                        group = group * 10 + digit;
                        position = position + 1;
                        if position == 4 {
                            words.push(NumericWireDigit { value: group });
                            count = count + 1;
                            position = 0;
                            group = 0;
                        }
                    }
                    index += 1;
                }
                if position > 0 {
                    while position < 4 {
                        group = group * 10;
                        position = position + 1;
                    }
                    words.push(NumericWireDigit { value: group });
                    count = count + 1;
                }
            }
        }
        let mut output = String::new();
        output = numeric_wire_word(output, count);
        output = numeric_wire_word(output, weight);
        output = numeric_wire_word(output, sign);
        output = numeric_wire_word(output, scale);
        let mut index: usize = 0;
        while index < words.len() {
            output = numeric_wire_word(output, words[index].value);
            index += 1;
        }
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}
