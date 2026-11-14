use super::checkruntime::*;
const SQLSTATE_DIVISION_BY_ZERO: u32 = 3452582;

const JSONPATH_PARSE_RANGE: u32 = 3452547;

#[derive(Clone)]
struct JsonpathScanSource {
    characters: Vec<char>,
}

#[derive(Clone)]
struct JsonpathScanRead {
    kind: i32,
    end: usize,
    text: Vec<char>,
    error: u32,
}

const JSONPATH_SCAN_INT: i32 = 259;

const JSONPATH_SCAN_NUMERIC: i32 = 260;

const JSONPATH_SCAN_SYNTAX: u32 = 6819553;

fn jsonpath_scan_space(character: char) -> bool {
    character == ' '
        || character == '\t'
        || character == '\n'
        || character == '\r'
        || character == '\u{000c}'
}

fn jsonpath_scan_special(character: char) -> bool {
    character == '?'
        || character == '%'
        || character == '$'
        || character == '.'
        || character == '['
        || character == ']'
        || character == '{'
        || character == '}'
        || character == '('
        || character == ')'
        || character == '|'
        || character == '&'
        || character == '!'
        || character == '='
        || character == '<'
        || character == '>'
        || character == '@'
        || character == '#'
        || character == ','
        || character == '*'
        || character == ':'
        || character == '-'
        || character == '+'
        || character == '/'
}

fn jsonpath_scan_other(character: char) -> bool {
    jsonpath_scan_space(character) == false
        && jsonpath_scan_special(character) == false
        && character != '\\'
        && character != '"'
}

fn jsonpath_scan_hex(character: char) -> i32 {
    let code = character as i32;
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

fn jsonpath_scan_digits(source: &JsonpathScanSource, begin: usize, radix: i32) -> usize {
    let mut position = begin;
    while position < source.characters.len() {
        let digit = jsonpath_scan_hex(source.characters[position]);
        if digit < 0 || digit >= radix {
            return position;
        };
        position += 1;
        if position + 1 < source.characters.len() && source.characters[position] == '_' {
            let next = jsonpath_scan_hex(source.characters[position + 1]);
            if next >= 0 && next < radix {
                position += 1;
            };
        };
    }
    position
}

fn jsonpath_scan_empty_read(kind: i32, end: usize, error: u32) -> JsonpathScanRead {
    let text: Vec<char> = Vec::new();
    JsonpathScanRead {
        kind: kind,
        end: end,
        text: text,
        error: error,
    }
}

fn jsonpath_scan_number(source: &JsonpathScanSource, begin: usize) -> JsonpathScanRead {
    let mut integer = begin;
    if source.characters[begin] == '0' {
        integer += 1;
    } else {
        integer = jsonpath_scan_digits(source, begin, 10);
    };
    let mut decimal = begin;
    if integer < source.characters.len() && source.characters[integer] == '.' {
        decimal = jsonpath_scan_digits(source, integer + 1, 10);
    };
    let mut base = integer;
    if decimal > base {
        base = decimal;
    };
    let mut real = begin;
    let mut failed_real = begin;
    if base > begin
        && base < source.characters.len()
        && (source.characters[base] == 'e' || source.characters[base] == 'E')
    {
        let mut digits = base + 1;
        if digits < source.characters.len()
            && (source.characters[digits] == '+' || source.characters[digits] == '-')
        {
            digits += 1;
            failed_real = digits;
        };
        let end = jsonpath_scan_digits(source, digits, 10);
        if end > digits {
            real = end;
        };
    };
    let mut prefixed = begin;
    if begin + 2 < source.characters.len() && source.characters[begin] == '0' {
        let prefix = source.characters[begin + 1];
        let mut radix: i32 = 0;
        if prefix == 'x' || prefix == 'X' {
            radix = 16;
        };
        if prefix == 'o' || prefix == 'O' {
            radix = 8;
        };
        if prefix == 'b' || prefix == 'B' {
            radix = 2;
        };
        if radix > 0 {
            let end = jsonpath_scan_digits(source, begin + 2, radix);
            if end > begin + 2 {
                prefixed = end;
            };
        };
    };
    let mut kind = JSONPATH_SCAN_INT;
    let mut end = integer;
    if decimal > end {
        end = decimal;
        kind = JSONPATH_SCAN_NUMERIC;
    };
    if real > end {
        end = real;
        kind = JSONPATH_SCAN_NUMERIC;
    };
    if prefixed > end {
        end = prefixed;
        kind = JSONPATH_SCAN_INT;
    };
    let mut junk = begin;
    if integer > begin
        && integer < source.characters.len()
        && jsonpath_scan_other(source.characters[integer])
    {
        junk = integer + 1;
    };
    if decimal > begin
        && decimal < source.characters.len()
        && jsonpath_scan_other(source.characters[decimal])
        && decimal + 1 > junk
    {
        junk = decimal + 1;
    };
    if real > begin
        && real < source.characters.len()
        && jsonpath_scan_other(source.characters[real])
        && real + 1 > junk
    {
        junk = real + 1;
    };
    let mut error: u32 = 0;
    if failed_real > end {
        end = failed_real;
        error = JSONPATH_SCAN_SYNTAX;
    };
    if junk > end {
        end = junk;
        error = JSONPATH_SCAN_SYNTAX;
    };
    let mut other = begin;
    while other < source.characters.len() && jsonpath_scan_other(source.characters[other]) {
        other += 1;
    }
    // A trailing-junk rule consumes one byte; a non-ASCII character lets the
    // complete identifier win the byte-length comparison.
    if other > end
        || (other == end
            && other > begin
            && error != 0
            && (source.characters[end - 1] as i32) >= 128)
    {
        return jsonpath_scan_empty_read(0, begin, 0);
    };
    jsonpath_scan_empty_read(kind, end, error)
}

fn jsonpath_radix_literal(source: &JsonpathScanSource, radix: i32) -> TextValue {
    let mut position: usize = 2;
    while position < source.characters.len()
        && (source.characters[position] == '0' || source.characters[position] == '_')
    {
        position += 1;
    }
    if position == source.characters.len() {
        return TextValue::Value("0".to_owned());
    };
    let mut words: Vec<usize> = Vec::new();
    words.push(0);
    while position < source.characters.len() {
        let mut factor: i64 = 1i64;
        let mut chunk: i64 = 0i64;
        let base = radix as i64;
        while position < source.characters.len() && factor <= 268435456i64 / base {
            let character = source.characters[position];
            position += 1;
            if character != '_' {
                let digit = jsonpath_scan_hex(character) as i64;
                chunk = chunk * base + digit;
                factor = factor * base;
            };
        }
        let mut index: usize = 0;
        let mut carry = chunk;
        while index < words.len() {
            let word = words[index] as i32;
            let combined = (word as i64) * factor + carry;
            words[index] = usize::try_from((combined % 10000i64) as i32).unwrap_or(0);
            carry = combined / 10000i64;
            index += 1;
        }
        while carry > 0i64 {
            words.push(usize::try_from((carry % 10000i64) as i32).unwrap_or(0));
            carry = carry / 10000i64;
        }
        if words.len() > 32768 {
            return TextValue::Error(make_sql_error(JSONPATH_PARSE_RANGE));
        };
    }
    let mut output = String::new();
    let mut index = words.len();
    let mut leading = true;
    while index > 0 {
        index = index - 1;
        let word = words[index] as i32;
        let mut divisor: i32 = 1000;
        while divisor > 0 {
            let digit = (word / divisor) % 10;
            if leading == false || digit > 0 || divisor == 1 {
                output.push(char::from_u32((48 + digit) as u32).unwrap_or(' '));
                leading = false;
            };
            divisor = divisor / 10;
        }
    }
    TextValue::Value(output)
}

fn jsonpath_numeric_literal(input: &str) -> TextValue {
    let source = JsonpathScanSource {
        characters: input.chars().collect(),
    };
    if source.characters.len() > 2 && source.characters[0] == '0' {
        let prefix = source.characters[1];
        let mut radix: i32 = 0;
        if prefix == 'x' || prefix == 'X' {
            radix = 16;
        };
        if prefix == 'o' || prefix == 'O' {
            radix = 8;
        };
        if prefix == 'b' || prefix == 'B' {
            radix = 2;
        };
        if radix > 0 {
            return jsonpath_radix_literal(&source, radix);
        };
    };
    let mut clean = String::new();
    if source.characters[0] == '.' {
        clean.push('0');
    };
    let mut position: usize = 0;
    while position < source.characters.len() {
        let character = source.characters[position];
        let mut append_character = character != '_';
        if character == '.'
            && (position + 1 == source.characters.len()
                || source.characters[position + 1] == 'e'
                || source.characters[position + 1] == 'E')
        {
            append_character = false;
        };
        if append_character {
            clean.push(character);
        };
        position += 1;
    }
    let parsed = jsonb_from_text(TextValue::Value(clean));
    jsonb_to_text(parsed)
}

fn numeric_compare(left: NumericValue, right: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return int4_unresolved(condition_flavor_13_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return Int4Value::Null;
    }
    if let NumericValue::Value(left_value) = left {
        if let NumericValue::Value(right_value) = right {
            let a = numeric_parts(left_value.as_str());
            let b = numeric_parts(right_value.as_str());
            if a.valid == false || b.valid == false {
                return int4_unresolved(unresolved_flavor);
            }
            if a.special < b.special {
                return Int4Value::Value(-1);
            }
            if a.special > b.special {
                return Int4Value::Value(1);
            }
            if a.special != 1 {
                return Int4Value::Value(0);
            }
            if a.sign < b.sign {
                return Int4Value::Value(-1);
            }
            if a.sign > b.sign {
                return Int4Value::Value(1);
            }
            if a.sign == 0 {
                return Int4Value::Value(0);
            }
            if a.weight < b.weight {
                return Int4Value::Value(0 - a.sign);
            }
            if a.weight > b.weight {
                return Int4Value::Value(a.sign);
            }
            let left_chars: Vec<char> = left_value.chars().collect();
            let right_chars: Vec<char> = right_value.chars().collect();
            let mut i = a.first;
            let mut j = b.first;
            while i < a.end || j < b.end {
                while i < a.end && (left_chars[i] == '.' || left_chars[i] == '_') {
                    i += 1;
                }
                while j < b.end && (right_chars[j] == '.' || right_chars[j] == '_') {
                    j += 1;
                }
                let mut x = '0';
                let mut y = '0';
                if i < a.end {
                    x = left_chars[i];
                    i += 1;
                }
                if j < b.end {
                    y = right_chars[j];
                    j += 1;
                }
                let x_code = x as u32;
                let y_code = y as u32;
                if x_code < y_code {
                    return Int4Value::Value(0 - a.sign);
                }
                if x_code > y_code {
                    return Int4Value::Value(a.sign);
                }
            }
            return Int4Value::Value(0);
        }
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_eq__fw7r(left: NumericValue, right: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = left { unresolved_flavor = 1; };
    if let NumericValue::Unknown = right { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = left { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = right { unresolved_flavor = 2; };
    let result = numeric_compare(left, right);
    if let Int4Value::Error(error) = result {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_96_4: i32 = unresolved_flavor; if let Int4Value::Unknown = result { if condition_flavor_96_4 < 1 { condition_flavor_96_4 = 1; }; }; if let Int4Value::Unimplemented = result { condition_flavor_96_4 = 2; }; if result == Int4Value::Unknown || result == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_96_4);
    }
    if result == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(order) = result {
        return BoolValue::Value(order == 0);
    }
    bool_unresolved(unresolved_flavor)
}

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
    let mut condition_flavor_285_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_285_4 < 1 { condition_flavor_285_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_285_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_285_4 < 1 { condition_flavor_285_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_285_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return numeric_unresolved(condition_flavor_285_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(a) = left {
        if let NumericValue::Value(b) = right {
            let first = numeric_work_from_value(a.as_str());
            let second = numeric_work_from_value(b.as_str());
            if first.valid == false || second.valid == false {
                return numeric_unresolved(unresolved_flavor);
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
    let mut condition_flavor_186_4: i32 = unresolved_flavor; if let NumericValue::Unknown = left { if condition_flavor_186_4 < 1 { condition_flavor_186_4 = 1; }; }; if let NumericValue::Unimplemented = left { condition_flavor_186_4 = 2; }; if let NumericValue::Unknown = right { if condition_flavor_186_4 < 1 { condition_flavor_186_4 = 1; }; }; if let NumericValue::Unimplemented = right { condition_flavor_186_4 = 2; }; if (left == NumericValue::Unknown || left == NumericValue::Unimplemented) || (right == NumericValue::Unknown || right == NumericValue::Unimplemented) {
        return numeric_unresolved(condition_flavor_186_4);
    }
    if left == NumericValue::Null || right == NumericValue::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(first) = left {
        if let NumericValue::Value(second) = right {
            let a = numeric_work_from_value(first.as_str());
            let b = numeric_work_from_value(second.as_str());
            if a.valid == false || b.valid == false {
                return numeric_unresolved(unresolved_flavor);
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
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_div__pnzm(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 0)
}

pub fn sql__pg_catalog__numeric_mod__8ywz(left: NumericValue, right: NumericValue) -> NumericValue {
    numeric_division(left, right, 2)
}

pub fn sql__pg_catalog__numeric_abs__6g5e(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_42_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_42_0 < 1 { condition_flavor_42_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_42_0 = 2; }; if input == NumericValue::Unknown || input == NumericValue::Unimplemented { return numeric_unresolved(condition_flavor_42_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
if sign < 0 { sign = 1; }
if special == 0 { special = 2; }
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric_cmp__6h4s(input: NumericValue, right: NumericValue) -> Int4Value {
let result = numeric_compare(input.clone(), right.clone());
return result;
}

pub fn sql__pg_catalog__numeric_uminus__wcmy(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_95_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_95_0 < 1 { condition_flavor_95_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_95_0 = 2; }; if input == NumericValue::Unknown || input == NumericValue::Unimplemented { return numeric_unresolved(condition_flavor_95_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
let mut special = work.special;
let mut sign = work.sign;
let output_scale = work.scale;
sign = 0 - sign;
if special == 0 { special = 2; } else if special == 2 { special = 0; };
return NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: special, sign: sign, weight: work.weight, scale: output_scale, digits: work.digits }));
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__sign__2rsu(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut condition_flavor_149_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_149_0 < 1 { condition_flavor_149_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_149_0 = 2; }; if input == NumericValue::Unknown || input == NumericValue::Unimplemented { return numeric_unresolved(condition_flavor_149_0); }
if input == NumericValue::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if work.special == 3 { return NumericValue::Value("NaN".to_owned()); }
if work.special == 0 || work.sign < 0 { return NumericValue::Value("-1".to_owned()); }
if work.special == 2 || work.sign > 0 { return NumericValue::Value("1".to_owned()); }
return NumericValue::Value("0".to_owned());
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__round__otcq(input: NumericValue, scale: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = scale { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = scale { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
let mut condition_flavor_69_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_69_0 < 1 { condition_flavor_69_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_69_0 = 2; }; if let Int4Value::Unknown = scale { if condition_flavor_69_0 < 1 { condition_flavor_69_0 = 1; }; }; if let Int4Value::Unimplemented = scale { condition_flavor_69_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) || (scale == Int4Value::Unknown || scale == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_69_0); }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 1); }
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trunc__hay3(input: NumericValue, scale: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = scale { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = scale { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
let mut condition_flavor_102_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_102_0 < 1 { condition_flavor_102_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_102_0 = 2; }; if let Int4Value::Unknown = scale { if condition_flavor_102_0 < 1 { condition_flavor_102_0 = 1; }; }; if let Int4Value::Unimplemented = scale { condition_flavor_102_0 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) || (scale == Int4Value::Unknown || scale == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_102_0); }
if input == NumericValue::Null || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(value) = input {
let work = numeric_work_from_value(value.as_str());
if work.valid == false { return numeric_unresolved(unresolved_flavor); }
if let Int4Value::Value(precision) = scale { return numeric_work_round(work, precision, 0); }
}
numeric_unresolved(unresolved_flavor)
}

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

const NUMERIC_SUPPORT_RANGE_ERROR: u32 = 3452547;

#[derive(Clone)]
struct NumericWork {
    valid: bool,
    special: i32,
    sign: i32,
    weight: i32,
    scale: i32,
    digits: String,
}

fn numeric_work_from_value(value: &str) -> NumericWork {
    let layout = numeric_parts(value);
    let mut digits = String::new();
    let mut scale: i32 = 0;
    if layout.valid && layout.special == 1 {
        scale = numeric_wire_scale(value);
        let characters: Vec<char> = value.chars().collect();
        let mut index = layout.first;
        while index < layout.end {
            let character = characters[index];
            if numeric_wire_decimal_digit(character) >= 0 {
                digits.push(character);
            }
            index += 1;
        }
    }
    NumericWork {
        valid: layout.valid,
        special: layout.special,
        sign: layout.sign,
        weight: layout.weight,
        scale: scale,
        digits: digits,
    }
}

fn numeric_work_zeros(count: i32) -> String {
    let mut remaining = count;
    let mut block = "0".to_owned();
    let mut output = String::new();
    while remaining > 0 {
        if remaining % 2 == 1 {
            output.push_str(block.as_str());
        }
        remaining = remaining / 2;
        if remaining > 0 {
            let copy = block.clone();
            block.push_str(copy.as_str());
        }
    }
    output
}

fn numeric_work_text(work: NumericWork) -> String {
    if work.special == 0 {
        return "-Infinity".to_owned();
    }
    if work.special == 2 {
        return "Infinity".to_owned();
    }
    if work.special == 3 {
        return "NaN".to_owned();
    }
    let digits: Vec<char> = work.digits.chars().collect();
    let mut output = String::new();
    if work.sign < 0 {
        output.push('-');
    }
    if work.sign == 0 {
        output.push('0');
        if work.scale > 0 {
            output.push('.');
            output.push_str(numeric_work_zeros(work.scale).as_str());
        }
        return output;
    }
    let mut index: usize = 0;
    if work.weight >= 0 {
        let mut length: i32 = 0;
        while index < digits.len() {
            length = length + 1;
            index += 1;
        }
        index = 0;
        let mut positions = work.weight + 1;
        if length <= positions {
            output.push_str(work.digits.as_str());
            output.push_str(numeric_work_zeros(positions - length).as_str());
            index = digits.len();
        } else {
            while positions > 0 {
                output.push(digits[index]);
                index += 1;
                positions = positions - 1;
            }
        };
    } else {
        output.push('0');
    };
    if work.scale > 0 {
        output.push('.');
        let mut positions = work.scale;
        if work.weight < -1 {
            let mut leading = 0 - work.weight - 1;
            if leading > positions {
                leading = positions;
            }
            output.push_str(numeric_work_zeros(leading).as_str());
            positions = positions - leading;
        }
        while positions > 0 && index < digits.len() {
            output.push(digits[index]);
            index += 1;
            positions = positions - 1;
        }
        output.push_str(numeric_work_zeros(positions).as_str());
    }
    output
}

fn numeric_work_rounded(work: NumericWork, scale: i32, mode: i32) -> NumericWork {
    let original: Vec<char> = work.digits.chars().collect();
    let boundary = 0 - scale;
    let mut digits: Vec<char> = Vec::new();
    let mut position = work.weight;
    let mut index: usize = 0;
    while index < original.len() && position >= boundary {
        digits.push(original[index]);
        index += 1;
        position = position - 1;
    }
    let mut increase = false;
    if index < original.len() {
        if mode == 1 && position == boundary - 1 && numeric_wire_decimal_digit(original[index]) >= 5
        {
            increase = true;
        }
        if mode == 2 && work.sign > 0 {
            increase = true;
        }
        if mode == 3 && work.sign < 0 {
            increase = true;
        }
    }
    let mut weight = work.weight;
    let mut leading_carry = false;
    if increase {
        if digits.len() == 0 {
            digits.push('1');
            weight = boundary;
        } else {
            let mut carry = true;
            let mut cursor = digits.len();
            let symbols: Vec<char> = "0123456789".chars().collect();
            while cursor > 0 && carry {
                cursor = cursor - 1;
                if digits[cursor] == '9' {
                    digits[cursor] = '0';
                } else {
                    let mut symbol: usize = 0;
                    while symbols[symbol] != digits[cursor] {
                        symbol += 1;
                    }
                    digits[cursor] = symbols[symbol + 1];
                    carry = false;
                };
            }
            if carry {
                leading_carry = true;
                weight = weight + 1;
            }
        };
    }
    let mut end = digits.len();
    while end > 0 && digits[end - 1] == '0' {
        end = end - 1;
    }
    let mut coefficient = String::new();
    let mut cursor: usize = 0;
    if leading_carry {
        coefficient.push('1');
    } else {
        while cursor < end {
            coefficient.push(digits[cursor]);
            cursor += 1;
        }
    };
    let mut sign = work.sign;
    if end == 0 && leading_carry == false {
        sign = 0;
        weight = 0;
    }
    let mut output_scale = scale;
    if output_scale < 0 {
        output_scale = 0;
    }
    NumericWork {
        valid: true,
        special: 1,
        sign: sign,
        weight: weight,
        scale: output_scale,
        digits: coefficient,
    }
}

fn numeric_work_round(work: NumericWork, requested: i32, mode: i32) -> NumericValue {
    let unresolved_flavor: i32 = 0;
    if work.valid == false {
        return numeric_unresolved(unresolved_flavor);
    }
    if work.special != 1 {
        return NumericValue::Value(numeric_work_text(work));
    }
    let mut scale = requested;
    let mut minimum: i32 = -131072;
    if mode == 1 {
        minimum = minimum - 1;
    }
    if scale < minimum {
        scale = minimum;
    }
    if scale > 16383 {
        scale = 16383;
    }
    let rounded = numeric_work_rounded(work, scale, mode);
    if rounded.weight > 131071 {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    NumericValue::Value(numeric_work_text(rounded))
}

const SCALAR_INPUT_INVALID: u32 = 3484946;

pub fn scalar_numeric_from_text(input: TextValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
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
    numeric_unresolved(unresolved_flavor)
}

fn tsquery_priority(kind: i32) -> i32 {
    if kind == 1 { return 4; };
    if kind == 2 { return 2; };
    if kind == 3 { return 1; };
    if kind == 4 { return 3; };
    0
}

#[derive(Clone, Copy)]
struct TsqueryRenderFrame {
    node: usize,
    priority: i32,
    right_phrase: bool,
    step: i32,
}

pub fn tsquery_to_text(input: TsqueryValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsqueryValue::Unknown = input { unresolved_flavor = 1; };
    if let TsqueryValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TsqueryValue::Error(error) = input { return TextValue::Error(error); };
    if let TsqueryValue::Null = input { return TextValue::Null; };
    if let TsqueryValue::Value(value) = input { return tsquery_render(&value,value.root); };
    text_unresolved(unresolved_flavor)
}

fn tsquery_render(value: &TsqueryPayload, root: usize) -> TextValue {
    let mut output = String::new();
    if value.nodes.len() == 0 { return TextValue::Value(output); };
    let mut frames: Vec<TsqueryRenderFrame> = Vec::new();
    frames.push(TsqueryRenderFrame {node:root,priority:0,right_phrase:false,step:0});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let frame = frames[depth];
        let node = value.nodes[frame.node].clone();
        if frame.step == 2 { output.push_str(" )"); }
        else if frame.step == 1 {
            if node.kind == 2 { output.push_str(" & "); }
            else if node.kind == 3 { output.push_str(" | "); }
            else if node.distance == 1 { output.push_str(" <-> "); }
            else {
                output.push_str(" <");
                let distance = text_signed_number(node.distance as i64);
                output.push_str(distance.as_str());
                output.push_str("> ");
            };
        } else if node.kind == 0 {
            output.push('\'');
            let chars: Vec<char> = node.text.chars().collect();
            let mut index: usize = 0;
            while index < chars.len() {
                let ch = chars[index];
                if ch == '\'' || ch == '\\' { output.push(ch); };
                output.push(ch);
                index += 1;
            }
            output.push('\'');
            if node.prefix || node.weight != 0 {
                output.push(':');
                if node.prefix { output.push('*'); };
                if (node.weight / 8 % 2) != 0 { output.push('A'); };
                if (node.weight / 4 % 2) != 0 { output.push('B'); };
                if (node.weight / 2 % 2) != 0 { output.push('C'); };
                if (node.weight / 1 % 2) != 0 { output.push('D'); };
            };
        } else {
            let priority = tsquery_priority(node.kind);
            if priority < frame.priority || (node.kind == 4 && frame.right_phrase) {
                output.push_str("( ");
                let closing = TsqueryRenderFrame {node:frame.node,priority:0,right_phrase:false,step:2};
                if depth < frames.len() { frames[depth] = closing; } else { frames.push(closing); };
                depth += 1;
            };
            if node.kind == 1 { output.push('!'); }
            else {
                let right = TsqueryRenderFrame {node:node.right,priority:priority,right_phrase:node.kind == 4,step:0};
                if depth < frames.len() { frames[depth] = right; } else { frames.push(right); };
                depth += 1;
                let separator = TsqueryRenderFrame {node:frame.node,priority:0,right_phrase:false,step:1};
                if depth < frames.len() { frames[depth] = separator; } else { frames.push(separator); };
                depth += 1;
            };
            let left = TsqueryRenderFrame {node:node.left,priority:priority,right_phrase:false,step:0};
            if depth < frames.len() { frames[depth] = left; } else { frames.push(left); };
            depth += 1;
        };
    }
    TextValue::Value(output)
}

pub fn tsvector_to_text(input: TsvectorValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsvectorValue::Unknown = input { unresolved_flavor = 1; };
    if let TsvectorValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TsvectorValue::Error(error) = input { return TextValue::Error(error); };
    if let TsvectorValue::Null = input { return TextValue::Null; };
    if let TsvectorValue::Value(value) = input {
        let mut text = String::new();
        let mut i: usize = 0;
        while i < value.lexemes.len() {
            if i > 0 { text.push(' '); };
            text.push('\'');
            let chars: Vec<char> = value.lexemes[i].text.chars().collect();
            let mut c: usize = 0;
            while c < chars.len() {
                if chars[c] == '\'' || chars[c] == '\\' { text.push(chars[c]); };
                text.push(chars[c]); c += 1;
            }
            text.push('\'');
            let mut p: usize = 0;
            while p < value.lexemes[i].positions.len() {
                if p == 0 { text.push(':'); } else { text.push(','); };
                let position = value.lexemes[i].positions[p];
                let digits = text_number(position.position,10);
                text.push_str(digits.as_str());
                if position.weight == 3 { text.push('A'); };
                if position.weight == 2 { text.push('B'); };
                if position.weight == 1 { text.push('C'); };
                p += 1;
            }
            i += 1;
        }
        return TextValue::Value(text);
    };
    text_unresolved(unresolved_flavor)
}
