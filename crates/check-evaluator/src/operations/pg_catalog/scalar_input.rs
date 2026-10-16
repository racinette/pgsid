const SCALAR_INPUT_INVALID: u32 = 3484946;
const SCALAR_INPUT_RANGE: u32 = 3452547;

pub fn money_from_captured_text(
    input: TextValue,
    texts: &str,
    units: &str,
    count: i32,
) -> MoneyValue {
    if let TextValue::Error(error) = input {
        return MoneyValue::Error(error);
    };
    if let TextValue::Null = input {
        return MoneyValue::Null;
    };
    let selected = scalar_enum_from_text(input, texts, count);
    if let EnumValue::Value(_) = selected {
        let encoded = enum_to_text(selected, units, count);
        let parsed = scalar_integer_from_text(encoded, 64);
        if let Int8Value::Value(value) = parsed {
            return make_money_value(value);
        };
    };
    MoneyValue::Unknown
}

fn scalar_input_digit(ch: char) -> i32 {
    let code = ch as i32;
    if code >= 48 && code <= 57 {
        return code - 48;
    };
    if code >= 65 && code <= 70 {
        return code - 55;
    };
    if code >= 97 && code <= 102 {
        return code - 87;
    };
    -1
}

pub fn scalar_integer_from_text(input: TextValue, bits: i32) -> Int8Value {
    if let TextValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let TextValue::Null = input {
        return Int8Value::Null;
    };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut position: usize = 0;
        while position < chars.len() && numeric_space(chars[position]) {
            position += 1;
        }
        let mut negative = false;
        if position < chars.len() && (chars[position] == '+' || chars[position] == '-') {
            negative = chars[position] == '-';
            position += 1;
        };
        let mut radix: i64 = 10i64;
        let mut prefixed = false;
        if position + 1 < chars.len() && chars[position] == '0' {
            let prefix = chars[position + 1].to_ascii_lowercase();
            if prefix == 'x' {
                radix = 16i64;
                prefixed = true;
            };
            if prefix == 'o' {
                radix = 8i64;
                prefixed = true;
            };
            if prefix == 'b' {
                radix = 2i64;
                prefixed = true;
            };
            if prefixed {
                position += 2;
            };
        };
        let mut minimum: i64 = -9223372036854775808i64;
        if bits == 16 {
            minimum = -32768i64;
        };
        if bits == 32 {
            minimum = -2147483648i64;
        };
        let first = position;
        let mut number: i64 = 0i64;
        let mut over = false;
        let mut digits = false;
        let mut finished = false;
        while position < chars.len() && finished == false {
            let character = chars[position];
            let digit = scalar_input_digit(character) as i64;
            if digit >= 0i64 && digit < radix {
                if over || number < minimum / radix {
                    return Int8Value::Error(make_sql_error(SCALAR_INPUT_RANGE));
                };
                if number == minimum / radix && digit > 0i64 - minimum % radix {
                    over = true;
                    number = minimum;
                } else {
                    number = number * radix - digit;
                };
                digits = true;
                position += 1;
            } else if character == '_' {
                if (position == first && prefixed == false) || position + 1 >= chars.len() {
                    return Int8Value::Error(make_sql_error(SCALAR_INPUT_INVALID));
                };
                let next = scalar_input_digit(chars[position + 1]) as i64;
                if next < 0i64 || next >= radix {
                    return Int8Value::Error(make_sql_error(SCALAR_INPUT_INVALID));
                };
                position += 1;
            } else {
                finished = true;
            };
        }
        if digits == false {
            return Int8Value::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        while position < chars.len() && numeric_space(chars[position]) {
            position += 1;
        }
        if position != chars.len() {
            return Int8Value::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        if over || (negative == false && number == minimum) {
            return Int8Value::Error(make_sql_error(SCALAR_INPUT_RANGE));
        };
        if negative == false {
            number = 0i64 - number;
        };
        return Int8Value::Value(number);
    };
    Int8Value::Unknown
}

pub fn scalar_boolean_from_text(input: TextValue) -> BoolValue {
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let TextValue::Null = input {
        return BoolValue::Null;
    };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut first: usize = 0;
        let mut end = chars.len();
        while first < end && numeric_space(chars[first]) {
            first += 1;
        }
        while end > first && numeric_space(chars[end - 1]) {
            end = end - 1;
        }
        let mut clean = String::new();
        while first < end {
            clean.push(chars[first]);
            first += 1;
        }
        let result = scalar_boolean_word(TextValue::Value(clean));
        if let BoolValue::Error(_) = result {
            return BoolValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        return result;
    };
    BoolValue::Unknown
}

pub fn scalar_enum_from_text(input: TextValue, labels: &str, count: i32) -> EnumValue {
    if let TextValue::Error(error) = input {
        return EnumValue::Error(error);
    };
    if let TextValue::Null = input {
        return EnumValue::Null;
    };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = labels.chars().collect();
        let mut position: usize = 0;
        let mut ordinal: i32 = 0;
        let mut label = String::new();
        while position < chars.len() {
            if chars[position] == '\0' {
                if ordinal < count && label == value {
                    return make_enum_value(ordinal);
                };
                ordinal = ordinal + 1;
                label = String::new();
            } else {
                label.push(chars[position]);
            };
            position += 1;
        }
        if ordinal < count && label == value {
            return make_enum_value(ordinal);
        };
        return EnumValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
    };
    EnumValue::Unknown
}

pub fn scalar_numeric_from_text(input: TextValue) -> NumericValue {
    if let TextValue::Error(error) = input {
        return NumericValue::Error(error);
    };
    if let TextValue::Null = input {
        return NumericValue::Null;
    };
    if let TextValue::Value(value) = input {
        let parts = numeric_parts(value.as_str());
        if parts.valid && parts.special != 1 {
            if parts.special == 0 {
                return NumericValue::Value("-Infinity".to_owned());
            };
            if parts.special == 2 {
                return NumericValue::Value("Infinity".to_owned());
            };
            return NumericValue::Value("NaN".to_owned());
        };
        let characters: Vec<char> = value.chars().collect();
        let mut start: usize = 0;
        let mut end = characters.len();
        while start < end && numeric_space(characters[start]) {
            start += 1;
        }
        while end > start && numeric_space(characters[end - 1]) {
            end = end - 1;
        }
        let mut negative = false;
        if start < end && (characters[start] == '+' || characters[start] == '-') {
            negative = characters[start] == '-';
            start += 1;
        };
        if start == end {
            return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        let mut radix: i32 = 10;
        let mut prefix_end = start;
        if start + 1 < end && characters[start] == '0' {
            let prefix = characters[start + 1].to_ascii_lowercase();
            if prefix == 'x' {
                radix = 16;
                prefix_end = start + 2;
            };
            if prefix == 'o' {
                radix = 8;
                prefix_end = start + 2;
            };
            if prefix == 'b' {
                radix = 2;
                prefix_end = start + 2;
            };
        };
        let mut clean = String::new();
        let mut position = start;
        while position < end {
            let character = characters[position];
            if character == '_' {
                if position == start || position + 1 == end {
                    return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
                };
                let before = jsonpath_scan_hex(characters[position - 1]);
                let after = jsonpath_scan_hex(characters[position + 1]);
                if (position != prefix_end && (before < 0 || before >= radix))
                    || after < 0
                    || after >= radix
                {
                    return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
                };
            } else {
                clean.push(character);
            };
            position += 1;
        }
        let content: Vec<char> = clean.chars().collect();
        let mut begin: usize = 0;
        if radix == 10 {
            while begin + 1 < content.len()
                && content[begin] == '0'
                && numeric_wire_decimal_digit(content[begin + 1]) >= 0
            {
                begin += 1;
            }
        };
        let mut normalized = String::new();
        position = begin;
        while position < content.len() {
            normalized.push(content[position]);
            position += 1;
        }
        let source = JsonpathScanSource {
            characters: normalized.chars().collect(),
        };
        if source.characters.len() == 0 {
            return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        let first = source.characters[0];
        if first == '.'
            && (source.characters.len() < 2 || numeric_wire_decimal_digit(source.characters[1]) < 0)
        {
            return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        if numeric_wire_decimal_digit(first) < 0 && first != '.' {
            return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        let token = jsonpath_scan_number(&source, 0);
        if token.error != 0
            || token.end != source.characters.len()
            || (token.kind != JSONPATH_SCAN_INT && token.kind != JSONPATH_SCAN_NUMERIC)
        {
            return NumericValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        };
        let parsed = jsonpath_numeric_literal(normalized.as_str());
        if let TextValue::Error(error) = parsed {
            return NumericValue::Error(error);
        };
        if let TextValue::Value(number) = parsed {
            let mut result = NumericValue::Value(number);
            if negative {
                result = sql__pg_catalog__numeric_uminus__wcmy(result);
            };
            return result;
        };
    };
    NumericValue::Unknown
}

fn scalar_boolean_word(input: TextValue) -> BoolValue {
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let start: usize = 0;
        let end = characters.len();
        if end - start == 1 && characters[start] == '1' {
            return BoolValue::Value(true);
        };
        if end - start == 1 && characters[start] == '0' {
            return BoolValue::Value(false);
        };
        let mut result = BoolValue::Error(make_sql_error(SCALAR_INPUT_INVALID));
        let words: Vec<char> = "truefalseyesnoonoff".chars().collect();
        let mut word: usize = 0;
        while word < 6 {
            let mut begin: usize = 0;
            let mut length: usize = 4;
            let mut minimum: usize = 1;
            let mut state = true;
            if word == 1 {
                begin = 4;
                length = 5;
                state = false;
            };
            if word == 2 {
                begin = 9;
                length = 3;
            };
            if word == 3 {
                begin = 12;
                length = 2;
                state = false;
            };
            if word == 4 {
                begin = 14;
                length = 2;
                minimum = 2;
            };
            if word == 5 {
                begin = 16;
                length = 3;
                minimum = 2;
                state = false;
            };
            if end - start >= minimum && end - start <= length {
                let mut offset: usize = 0;
                let mut equal = true;
                while offset < end - start {
                    if characters[start + offset].to_ascii_lowercase() != words[begin + offset] {
                        equal = false;
                    };
                    offset += 1;
                }
                if equal {
                    result = BoolValue::Value(state);
                };
            };
            word += 1;
        }
        return result;
    };
    BoolValue::Unknown
}
