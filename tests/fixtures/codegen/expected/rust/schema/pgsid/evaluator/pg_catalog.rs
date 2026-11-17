use super::checkruntime::*;
pub fn sql__pg_catalog__int84gt__p7f5(left: Int8Value, right: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = left { unresolved_flavor = 1; };
    if let Int4Value::Unknown = right { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let Int4Value::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == Int8Value::Null || right == Int4Value::Null {
        return BoolValue::Null;
    }
    let mut condition_flavor_363_4: i32 = unresolved_flavor; if let Int8Value::Unknown = left { if condition_flavor_363_4 < 1 { condition_flavor_363_4 = 1; }; }; if let Int8Value::Unimplemented = left { condition_flavor_363_4 = 2; }; if let Int4Value::Unknown = right { if condition_flavor_363_4 < 1 { condition_flavor_363_4 = 1; }; }; if let Int4Value::Unimplemented = right { condition_flavor_363_4 = 2; }; if (left == Int8Value::Unknown || left == Int8Value::Unimplemented) || (right == Int4Value::Unknown || right == Int4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_363_4);
    }
    if let Int8Value::Value(left_value) = left {
        if let Int4Value::Value(right_value) = right {
            let wide_right = right_value as i64;
            return BoolValue::Value(left_value > wide_right);
        }
    }
    bool_unresolved(unresolved_flavor)
}

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
            let left_var = numeric_var_from_work(&first);
            let right_var = numeric_var_from_work(&second);
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

// PostgreSQL's select_div_scale: at least NUMERIC_MIN_SIG_DIGITS significant digits, and no
// fewer fractional digits than either input displays.
fn numeric_division_scale(left: &NumericVar, right: &NumericVar) -> i32 {
    let mut weight1: i32 = 0;
    let mut firstdigit1: i32 = 0;
    let mut i: i32 = 0;
    while i < numeric_var_count(left) {
        firstdigit1 = numeric_var_digit(left, i);
        if firstdigit1 != 0 {
            weight1 = left.weight - i;
            i = numeric_var_count(left);
        }
        i = i + 1;
    }
    let mut weight2: i32 = 0;
    let mut firstdigit2: i32 = 0;
    i = 0;
    while i < numeric_var_count(right) {
        firstdigit2 = numeric_var_digit(right, i);
        if firstdigit2 != 0 {
            weight2 = right.weight - i;
            i = numeric_var_count(right);
        }
        i = i + 1;
    }
    let mut qweight = weight1 - weight2;
    if firstdigit1 <= firstdigit2 {
        qweight = qweight - 1;
    }
    let mut rscale = NUMERIC_VAR_MIN_SIG_DIGITS - qweight * NUMERIC_VAR_DEC_DIGITS;
    if rscale < left.dscale {
        rscale = left.dscale;
    }
    if rscale < right.dscale {
        rscale = right.dscale;
    }
    if rscale < 0 {
        rscale = 0;
    }
    if rscale > NUMERIC_VAR_MAX_DISPLAY_SCALE {
        rscale = NUMERIC_VAR_MAX_DISPLAY_SCALE;
    }
    rscale
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
            let dividend = numeric_var_from_work(&a);
            let divisor = numeric_var_from_work(&b);
            if mode == 2 {
                let result = numeric_var_mod(&dividend, &divisor);
                return numeric_var_result(result);
            }
            if mode == 1 {
                let result = numeric_var_div(&dividend, &divisor, 0, false, true);
                return numeric_var_result(result);
            }
            let rscale = numeric_division_scale(&dividend, &divisor);
            let result = numeric_var_div(&dividend, &divisor, rscale, true, true);
            return numeric_var_result(result);
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

// PostgreSQL's numeric_round, numeric_trunc, numeric_ceil and numeric_floor: mode 1 rounds,
// 0 truncates, 2 takes the ceiling and 3 the floor. Scales are clamped as PostgreSQL clamps
// them, and a negative scale displays no fractional digits.
fn numeric_round_value(work: NumericWork, requested: i32, mode: i32) -> NumericValue {
    if work.valid == false {
        return numeric_unresolved(0);
    }
    if work.special != 1 {
        return NumericValue::Value(numeric_work_text(work));
    }
    let arg = numeric_var_from_work(&work);
    if mode == 2 {
        return numeric_var_result(numeric_var_ceil(&arg));
    }
    if mode == 3 {
        return numeric_var_result(numeric_var_floor(&arg));
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
    let mut result = numeric_var_zero(0);
    if mode == 1 {
        result = numeric_var_round(arg, scale);
    } else {
        result = numeric_var_trunc(arg, scale);
    };
    if scale < 0 {
        result = numeric_var_rescaled(result, 0);
    }
    numeric_var_result(result)
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
if let Int4Value::Value(precision) = scale { return numeric_round_value(work, precision, 1); }
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
if let Int4Value::Value(precision) = scale { return numeric_round_value(work, precision, 0); }
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

/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */

// PostgreSQL's NumericVar, so its numeric algorithms port as written: base-NBASE digits,
// most significant first, the weight of the first digit, and the display scale. A zero has
// no digits. Where PostgreSQL computes an exact result, any exact method yields the same
// digits, so these routines use PostgreSQL's 32-bit forms and keep the translated targets on
// plain numbers. Where it approximates, by truncating a product or estimating a quotient, they
// reproduce PostgreSQL's arithmetic step for step.
#[derive(Clone)]
struct NumericVar {
    sign: i32,
    weight: i32,
    dscale: i32,
    digits: Vec<NumericWireDigit>,
}

const NUMERIC_VAR_NBASE: i32 = 10000;

const NUMERIC_VAR_HALF_NBASE: i32 = 5000;

const NUMERIC_VAR_DEC_DIGITS: i32 = 4;

const NUMERIC_VAR_MUL_GUARD_DIGITS: i32 = 2;

const NUMERIC_VAR_DIV_GUARD_DIGITS: i32 = 4;

const NUMERIC_VAR_MIN_SIG_DIGITS: i32 = 16;

const NUMERIC_VAR_MAX_DISPLAY_SCALE: i32 = 1000;

#[derive(Clone, Copy)]
struct NumericVarWide {
    value: i64,
}

fn numeric_var_zero(dscale: i32) -> NumericVar {
    let digits: Vec<NumericWireDigit> = Vec::new();
    NumericVar {
        sign: 1,
        weight: 0,
        dscale: dscale,
        digits: digits,
    }
}

fn numeric_var_count(value: &NumericVar) -> i32 {
    value.digits.len() as i32
}

fn numeric_var_digit(value: &NumericVar, index: i32) -> i32 {
    if index < 0 || index >= numeric_var_count(value) {
        return 0;
    }
    value.digits[usize::try_from(index).unwrap_or(0)].value
}

fn numeric_var_zeros(count: i32) -> Vec<NumericWireDigit> {
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut index: i32 = 0;
    while index < count {
        digits.push(NumericWireDigit { value: 0 });
        index = index + 1;
    }
    digits
}

fn numeric_var_round_power(decimals: i32) -> i32 {
    if decimals == 1 {
        return 1000;
    }
    if decimals == 2 {
        return 100;
    }
    10
}

fn numeric_var_from_work(work: &NumericWork) -> NumericVar {
    if work.sign == 0 {
        return numeric_var_zero(work.scale);
    }
    let characters: Vec<char> = work.digits.chars().collect();
    let mut weight = work.weight / NUMERIC_VAR_DEC_DIGITS;
    if work.weight % NUMERIC_VAR_DEC_DIGITS < 0 {
        weight = weight - 1;
    }
    // Leading zeros place the first decimal digit within the first NBASE digit, and trailing
    // zeros complete the last one.
    let mut leading = weight * NUMERIC_VAR_DEC_DIGITS + NUMERIC_VAR_DEC_DIGITS - 1 - work.weight;
    let mut emitted: i32 = 0;
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut value: i32 = 0;
    let mut index: usize = 0;
    while index < characters.len() || emitted % NUMERIC_VAR_DEC_DIGITS != 0 {
        let mut decimal: i32 = 0;
        if leading > 0 {
            leading = leading - 1;
        } else if index < characters.len() {
            decimal = numeric_wire_decimal_digit(characters[index]);
            index += 1;
        }
        value = value * 10 + decimal;
        emitted = emitted + 1;
        if emitted % NUMERIC_VAR_DEC_DIGITS == 0 {
            digits.push(NumericWireDigit { value: value });
            value = 0;
        };
    }
    numeric_var_strip(NumericVar {
        sign: work.sign,
        weight: weight,
        dscale: work.scale,
        digits: digits,
    })
}

fn numeric_work_from_var(value: &NumericVar) -> NumericWork {
    let mut scale = value.dscale;
    if scale < 0 {
        scale = 0;
    }
    let mut decimals = String::new();
    let mut weight = value.weight * NUMERIC_VAR_DEC_DIGITS + NUMERIC_VAR_DEC_DIGITS - 1;
    let mut index: usize = 0;
    while index < value.digits.len() {
        let mut word = value.digits[index].value;
        let mut place: i32 = 1000;
        while place > 0 {
            let digit = word / place;
            word = word % place;
            if decimals == String::new() && digit == 0 {
                weight = weight - 1;
            } else {
                decimals.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
            }
            place = place / 10;
        }
        index += 1;
    }
    let characters: Vec<char> = decimals.chars().collect();
    let mut end = characters.len();
    while end > 0 && characters[end - 1] == '0' {
        end = end - 1;
    }
    let mut digits = String::new();
    index = 0;
    while index < end {
        digits.push(characters[index]);
        index += 1;
    }
    let mut sign = value.sign;
    if end == 0 {
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

fn numeric_var_from_i64(value: i64) -> NumericVar {
    let mut sign: i32 = 1;
    let mut magnitude = value;
    if value < 0i64 {
        sign = -1;
        magnitude = 0i64 - value;
    }
    let mut reversed: Vec<NumericWireDigit> = Vec::new();
    while magnitude > 0i64 {
        let next = magnitude / 10000i64;
        reversed.push(NumericWireDigit {
            value: (magnitude - next * 10000i64) as i32,
        });
        magnitude = next;
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut index = reversed.len();
    while index > 0 {
        index = index - 1;
        digits.push(reversed[index]);
    }
    let count = digits.len() as i32;
    if count == 0 {
        return numeric_var_zero(0);
    }
    NumericVar {
        sign: sign,
        weight: count - 1,
        dscale: 0,
        digits: digits,
    }
}

fn numeric_var_strip(value: NumericVar) -> NumericVar {
    let mut weight = value.weight;
    let mut start: usize = 0;
    while start < value.digits.len() && value.digits[start].value == 0 {
        start += 1;
        weight = weight - 1;
    }
    let mut end = value.digits.len();
    while end > start && value.digits[end - 1].value == 0 {
        end = end - 1;
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut index = start;
    while index < end {
        digits.push(value.digits[index]);
        index += 1;
    }
    let mut sign = value.sign;
    if end == start {
        sign = 1;
        weight = 0;
    }
    NumericVar {
        sign: sign,
        weight: weight,
        dscale: value.dscale,
        digits: digits,
    }
}

fn numeric_var_shifted(value: &NumericVar, places: i32) -> NumericVar {
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut index: usize = 0;
    while index < value.digits.len() {
        digits.push(value.digits[index]);
        index += 1;
    }
    NumericVar {
        sign: value.sign,
        weight: value.weight + places,
        dscale: value.dscale,
        digits: digits,
    }
}

fn numeric_var_cmp_abs(left: &NumericVar, right: &NumericVar) -> i32 {
    let left_count = numeric_var_count(left);
    let right_count = numeric_var_count(right);
    let mut left_weight = left.weight;
    let mut right_weight = right.weight;
    let mut i1: i32 = 0;
    let mut i2: i32 = 0;
    while left_weight > right_weight && i1 < left_count {
        if numeric_var_digit(left, i1) != 0 {
            return 1;
        }
        i1 = i1 + 1;
        left_weight = left_weight - 1;
    }
    while right_weight > left_weight && i2 < right_count {
        if numeric_var_digit(right, i2) != 0 {
            return -1;
        }
        i2 = i2 + 1;
        right_weight = right_weight - 1;
    }
    if left_weight == right_weight {
        while i1 < left_count && i2 < right_count {
            let stat = numeric_var_digit(left, i1) - numeric_var_digit(right, i2);
            i1 = i1 + 1;
            i2 = i2 + 1;
            if stat > 0 {
                return 1;
            }
            if stat < 0 {
                return -1;
            };
        }
    }
    while i1 < left_count {
        if numeric_var_digit(left, i1) != 0 {
            return 1;
        }
        i1 = i1 + 1;
    }
    while i2 < right_count {
        if numeric_var_digit(right, i2) != 0 {
            return -1;
        }
        i2 = i2 + 1;
    }
    0
}

fn numeric_var_cmp(left: &NumericVar, right: &NumericVar) -> i32 {
    if numeric_var_count(left) == 0 {
        if numeric_var_count(right) == 0 {
            return 0;
        }
        if right.sign < 0 {
            return 1;
        }
        return -1;
    }
    if numeric_var_count(right) == 0 {
        if left.sign > 0 {
            return 1;
        }
        return -1;
    }
    if left.sign > 0 {
        if right.sign < 0 {
            return 1;
        }
        return numeric_var_cmp_abs(left, right);
    }
    if right.sign > 0 {
        return -1;
    }
    numeric_var_cmp_abs(right, left)
}

fn numeric_var_add_abs(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let left_count = numeric_var_count(left);
    let right_count = numeric_var_count(right);
    let mut res_weight = left.weight;
    if right.weight > res_weight {
        res_weight = right.weight;
    }
    res_weight = res_weight + 1;
    let mut res_dscale = left.dscale;
    if right.dscale > res_dscale {
        res_dscale = right.dscale;
    }
    let rscale1 = left_count - left.weight - 1;
    let rscale2 = right_count - right.weight - 1;
    let mut res_rscale = rscale1;
    if rscale2 > res_rscale {
        res_rscale = rscale2;
    }
    let mut res_ndigits = res_rscale + res_weight + 1;
    if res_ndigits <= 0 {
        res_ndigits = 1;
    }
    let mut digits = numeric_var_zeros(res_ndigits);
    let mut i1 = res_rscale + left.weight + 1;
    let mut i2 = res_rscale + right.weight + 1;
    let mut carry: i32 = 0;
    let mut i = res_ndigits - 1;
    while i >= 0 {
        i1 = i1 - 1;
        i2 = i2 - 1;
        carry = carry + numeric_var_digit(left, i1) + numeric_var_digit(right, i2);
        let mut digit = carry;
        carry = 0;
        if digit >= NUMERIC_VAR_NBASE {
            digit = digit - NUMERIC_VAR_NBASE;
            carry = 1;
        }
        digits[usize::try_from(i).unwrap_or(0)] = NumericWireDigit { value: digit };
        i = i - 1;
    }
    numeric_var_strip(NumericVar {
        sign: 1,
        weight: res_weight,
        dscale: res_dscale,
        digits: digits,
    })
}

// The caller orders the operands so that the left magnitude is at least the right.
fn numeric_var_sub_abs(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let left_count = numeric_var_count(left);
    let right_count = numeric_var_count(right);
    let res_weight = left.weight;
    let mut res_dscale = left.dscale;
    if right.dscale > res_dscale {
        res_dscale = right.dscale;
    }
    let rscale1 = left_count - left.weight - 1;
    let rscale2 = right_count - right.weight - 1;
    let mut res_rscale = rscale1;
    if rscale2 > res_rscale {
        res_rscale = rscale2;
    }
    let mut res_ndigits = res_rscale + res_weight + 1;
    if res_ndigits <= 0 {
        res_ndigits = 1;
    }
    let mut digits = numeric_var_zeros(res_ndigits);
    let mut i1 = res_rscale + left.weight + 1;
    let mut i2 = res_rscale + right.weight + 1;
    let mut borrow: i32 = 0;
    let mut i = res_ndigits - 1;
    while i >= 0 {
        i1 = i1 - 1;
        i2 = i2 - 1;
        borrow = borrow + numeric_var_digit(left, i1) - numeric_var_digit(right, i2);
        let mut digit = borrow;
        borrow = 0;
        if digit < 0 {
            digit = digit + NUMERIC_VAR_NBASE;
            borrow = -1;
        }
        digits[usize::try_from(i).unwrap_or(0)] = NumericWireDigit { value: digit };
        i = i - 1;
    }
    numeric_var_strip(NumericVar {
        sign: 1,
        weight: res_weight,
        dscale: res_dscale,
        digits: digits,
    })
}

fn numeric_var_signed(value: NumericVar, sign: i32) -> NumericVar {
    NumericVar {
        sign: sign,
        weight: value.weight,
        dscale: value.dscale,
        digits: value.digits,
    }
}

// PostgreSQL's add_var and sub_var share their cases: subtraction adds the right operand
// with its sign reversed.
fn numeric_var_sum(left: &NumericVar, right: &NumericVar, right_sign: i32) -> NumericVar {
    let mut dscale = left.dscale;
    if right.dscale > dscale {
        dscale = right.dscale;
    }
    if left.sign == right_sign {
        return numeric_var_signed(numeric_var_add_abs(left, right), left.sign);
    }
    let order = numeric_var_cmp_abs(left, right);
    if order == 0 {
        return numeric_var_zero(dscale);
    }
    if order > 0 {
        return numeric_var_signed(numeric_var_sub_abs(left, right), left.sign);
    }
    numeric_var_signed(numeric_var_sub_abs(right, left), right_sign)
}

fn numeric_var_add(left: &NumericVar, right: &NumericVar) -> NumericVar {
    numeric_var_sum(left, right, right.sign)
}

fn numeric_var_sub(left: &NumericVar, right: &NumericVar) -> NumericVar {
    numeric_var_sum(left, right, 0 - right.sign)
}

fn numeric_var_round(value: NumericVar, rscale: i32) -> NumericVar {
    let sign = value.sign;
    let mut weight = value.weight;
    let mut digits = value.digits;
    let mut di = (weight + 1) * NUMERIC_VAR_DEC_DIGITS + rscale;
    if di < 0 {
        return numeric_var_zero(rscale);
    }
    let ndigits = (di + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    di = di % NUMERIC_VAR_DEC_DIGITS;
    let mut kept = digits.len() as i32;
    // A carry out of the kept digits becomes a new leading digit.
    let mut leading: i32 = 0;
    if ndigits < kept || (ndigits == kept && di > 0) {
        kept = ndigits;
        let mut position = ndigits;
        let mut carry: i32 = 0;
        if di == 0 {
            if digits[usize::try_from(ndigits).unwrap_or(0)].value >= NUMERIC_VAR_HALF_NBASE {
                carry = 1;
            }
        } else {
            position = position - 1;
            let last = usize::try_from(position).unwrap_or(0);
            let mut pow10 = numeric_var_round_power(di);
            let extra = digits[last].value % pow10;
            digits[last] = NumericWireDigit {
                value: digits[last].value - extra,
            };
            if extra >= pow10 / 2 {
                pow10 = pow10 + digits[last].value;
                if pow10 >= NUMERIC_VAR_NBASE {
                    pow10 = pow10 - NUMERIC_VAR_NBASE;
                    carry = 1;
                }
                digits[last] = NumericWireDigit { value: pow10 };
            };
        };
        while carry > 0 {
            position = position - 1;
            if position < 0 {
                leading = carry;
                weight = weight + 1;
                carry = 0;
            } else {
                let at = usize::try_from(position).unwrap_or(0);
                carry = carry + digits[at].value;
                if carry >= NUMERIC_VAR_NBASE {
                    digits[at] = NumericWireDigit {
                        value: carry - NUMERIC_VAR_NBASE,
                    };
                    carry = 1;
                } else {
                    digits[at] = NumericWireDigit { value: carry };
                    carry = 0;
                };
            };
        }
    }
    let mut rounded: Vec<NumericWireDigit> = Vec::new();
    if leading > 0 {
        rounded.push(NumericWireDigit { value: leading });
    }
    let end = usize::try_from(kept).unwrap_or(0);
    let mut index: usize = 0;
    while index < end {
        rounded.push(digits[index]);
        index += 1;
    }
    NumericVar {
        sign: sign,
        weight: weight,
        dscale: rscale,
        digits: rounded,
    }
}

fn numeric_var_trunc(value: NumericVar, rscale: i32) -> NumericVar {
    let sign = value.sign;
    let weight = value.weight;
    let mut digits = value.digits;
    let mut di = (weight + 1) * NUMERIC_VAR_DEC_DIGITS + rscale;
    if di <= 0 {
        return numeric_var_zero(rscale);
    }
    let ndigits = (di + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    let mut kept = digits.len() as i32;
    if ndigits <= kept {
        kept = ndigits;
        di = di % NUMERIC_VAR_DEC_DIGITS;
        if di > 0 {
            let last = usize::try_from(ndigits - 1).unwrap_or(0);
            let pow10 = numeric_var_round_power(di);
            let extra = digits[last].value % pow10;
            digits[last] = NumericWireDigit {
                value: digits[last].value - extra,
            };
        }
    }
    let mut truncated: Vec<NumericWireDigit> = Vec::new();
    let end = usize::try_from(kept).unwrap_or(0);
    let mut index: usize = 0;
    while index < end {
        truncated.push(digits[index]);
        index += 1;
    }
    NumericVar {
        sign: sign,
        weight: weight,
        dscale: rscale,
        digits: truncated,
    }
}

// PostgreSQL's mul_var. A product that needs more fractional digits than rscale plus guard
// digits is truncated: PostgreSQL multiplies pairs of NBASE digits and keeps only the pair
// products that land within the computed digits, so the same pair products are summed here,
// each split into its four digit products to stay within 32 bits.
fn numeric_var_mul(left: &NumericVar, right: &NumericVar, rscale: i32) -> NumericVar {
    if numeric_var_count(left) > numeric_var_count(right) {
        return numeric_var_mul(right, left, rscale);
    }
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    if var1ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    if var1ndigits <= 6 && rscale == left.dscale + right.dscale {
        return numeric_var_mul_exact(left, right);
    }
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let mut var1ndigitpairs = (var1ndigits + 1) / 2;
    let mut var2ndigitpairs = (var2ndigits + 1) / 2;
    let mut res_ndigits = var1ndigits + var2ndigits;
    let mut res_ndigitpairs = res_ndigits / 2 + 1;
    let pair_offset = res_ndigitpairs - var1ndigitpairs - var2ndigitpairs + 1;
    let res_weight = left.weight + right.weight + 1 + 2 * res_ndigitpairs
        - res_ndigits
        - var1ndigits % 2
        - var2ndigits % 2;
    let maxdigits = res_weight
        + 1
        + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS
        + NUMERIC_VAR_MUL_GUARD_DIGITS;
    let maxdigitpairs = maxdigits / 2 + 1;
    if maxdigitpairs < res_ndigitpairs {
        res_ndigitpairs = maxdigitpairs;
    }
    res_ndigits = 2 * res_ndigitpairs;
    if res_ndigitpairs <= pair_offset {
        return numeric_var_zero(rscale);
    }
    if res_ndigitpairs - pair_offset < var1ndigitpairs {
        var1ndigitpairs = res_ndigitpairs - pair_offset;
    }
    if res_ndigitpairs - pair_offset < var2ndigitpairs {
        var2ndigitpairs = res_ndigitpairs - pair_offset;
    }
    // Pair p of the product covers result digits 2p and 2p + 1; its high digit product
    // carries into digit 2p - 1, so slot s + 1 holds result digit s and slot 0 the carry.
    let mut slots = numeric_var_zeros(res_ndigits + 1);
    let mut high: Vec<NumericWireDigit> = Vec::new();
    let mut low: Vec<NumericWireDigit> = Vec::new();
    let mut i2: i32 = 0;
    while i2 < var2ndigitpairs {
        high.push(NumericWireDigit {
            value: numeric_var_digit(right, 2 * i2),
        });
        low.push(NumericWireDigit {
            value: numeric_var_digit(right, 2 * i2 + 1),
        });
        i2 = i2 + 1;
    }
    // A row adds at most two digit products to a slot, so ten rows stay below the 32-bit
    // maximum together with a normalised digit and its incoming carry.
    let mut rows: i32 = 0;
    let mut i1 = var1ndigitpairs - 1;
    while i1 >= 0 {
        let a = numeric_var_digit(left, 2 * i1);
        let b = numeric_var_digit(left, 2 * i1 + 1);
        if a != 0 || b != 0 {
            if rows == 10 {
                // Carries leave every slot but the first holding one NBASE digit.
                let mut carry: i32 = 0;
                let mut slot = slots.len();
                while slot > 0 {
                    slot = slot - 1;
                    let mut digit = slots[slot].value + carry;
                    carry = 0;
                    if slot > 0 && digit >= NUMERIC_VAR_NBASE {
                        carry = digit / NUMERIC_VAR_NBASE;
                        digit = digit - carry * NUMERIC_VAR_NBASE;
                    }
                    slots[slot] = NumericWireDigit { value: digit };
                }
                rows = 0;
            }
            rows = rows + 1;
            let mut i2limit = var2ndigitpairs;
            if res_ndigitpairs - i1 - pair_offset < i2limit {
                i2limit = res_ndigitpairs - i1 - pair_offset;
            }
            let limit = usize::try_from(i2limit).unwrap_or(0);
            let base = usize::try_from(2 * (i1 + pair_offset)).unwrap_or(0);
            let mut index: usize = 0;
            while index < limit {
                let c = high[index].value;
                let d = low[index].value;
                let at = base + index + index;
                slots[at] = NumericWireDigit {
                    value: slots[at].value + a * c,
                };
                slots[at + 1] = NumericWireDigit {
                    value: slots[at + 1].value + a * d + b * c,
                };
                slots[at + 2] = NumericWireDigit {
                    value: slots[at + 2].value + b * d,
                };
                index += 1;
            }
        }
        i1 = i1 - 1;
    }
    // Carries leave every slot but the first holding one NBASE digit.
    let mut carry: i32 = 0;
    let mut slot = slots.len();
    while slot > 0 {
        slot = slot - 1;
        let mut digit = slots[slot].value + carry;
        carry = 0;
        if slot > 0 && digit >= NUMERIC_VAR_NBASE {
            carry = digit / NUMERIC_VAR_NBASE;
            digit = digit - carry * NUMERIC_VAR_NBASE;
        }
        slots[slot] = NumericWireDigit { value: digit };
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut weight = res_weight;
    if slots[0].value != 0 {
        digits.push(slots[0]);
        weight = weight + 1;
    }
    let mut index: usize = 1;
    while index < slots.len() {
        digits.push(slots[index]);
        index += 1;
    }
    let product = NumericVar {
        sign: res_sign,
        weight: weight,
        dscale: rscale,
        digits: digits,
    };
    numeric_var_strip(numeric_var_round(product, rscale))
}

// PostgreSQL's mul_var_short computes the exact product; so does schoolbook multiplication.
fn numeric_var_mul_exact(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let mut slots = numeric_var_zeros(var1ndigits + var2ndigits);
    let mut rows: i32 = 0;
    let mut i1 = var1ndigits - 1;
    while i1 >= 0 {
        let a = numeric_var_digit(left, i1);
        if a != 0 {
            if rows == 20 {
                // Carries leave every slot but the first holding one NBASE digit.
                let mut carry: i32 = 0;
                let mut slot = slots.len();
                while slot > 0 {
                    slot = slot - 1;
                    let mut digit = slots[slot].value + carry;
                    carry = 0;
                    if slot > 0 && digit >= NUMERIC_VAR_NBASE {
                        carry = digit / NUMERIC_VAR_NBASE;
                        digit = digit - carry * NUMERIC_VAR_NBASE;
                    }
                    slots[slot] = NumericWireDigit { value: digit };
                }
                rows = 0;
            }
            rows = rows + 1;
            let base = usize::try_from(i1 + 1).unwrap_or(0);
            let mut index: usize = 0;
            while index < right.digits.len() {
                slots[base + index] = NumericWireDigit {
                    value: slots[base + index].value + a * right.digits[index].value,
                };
                index += 1;
            }
        }
        i1 = i1 - 1;
    }
    // Carries leave every slot but the first holding one NBASE digit.
    let mut carry: i32 = 0;
    let mut slot = slots.len();
    while slot > 0 {
        slot = slot - 1;
        let mut digit = slots[slot].value + carry;
        carry = 0;
        if slot > 0 && digit >= NUMERIC_VAR_NBASE {
            carry = digit / NUMERIC_VAR_NBASE;
            digit = digit - carry * NUMERIC_VAR_NBASE;
        }
        slots[slot] = NumericWireDigit { value: digit };
    }
    numeric_var_strip(NumericVar {
        sign: res_sign,
        weight: left.weight + right.weight + 1,
        dscale: left.dscale + right.dscale,
        digits: slots,
    })
}

// Short division by a divisor of one or two NBASE digits. PostgreSQL keeps a 32-bit carry
// when the divisor allows it; one 64-bit carry serves every divisor.
fn numeric_var_div_int(
    value: &NumericVar,
    ival: i32,
    ival_weight: i32,
    rscale: i32,
    round: bool,
) -> NumericVar {
    let var_ndigits = numeric_var_count(value);
    if var_ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    let mut res_sign: i32 = 1;
    if value.sign > 0 {
        if ival < 0 {
            res_sign = -1;
        };
    } else if ival > 0 {
        res_sign = -1;
    }
    let res_weight = value.weight - ival_weight;
    let mut res_ndigits =
        res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    if round {
        res_ndigits = res_ndigits + 1;
    }
    let mut divisor = ival as i64;
    if divisor < 0i64 {
        divisor = 0i64 - divisor;
    }
    let mut digits: Vec<NumericWireDigit> = Vec::new();
    let mut carry: i64 = 0i64;
    let mut i: i32 = 0;
    while i < res_ndigits {
        let digit = numeric_var_digit(value, i) as i64;
        carry = carry * 10000i64 + digit;
        digits.push(NumericWireDigit {
            value: (carry / divisor) as i32,
        });
        carry = carry % divisor;
        i = i + 1;
    }
    let quotient = NumericVar {
        sign: res_sign,
        weight: res_weight,
        dscale: rscale,
        digits: digits,
    };
    if round {
        return numeric_var_strip(numeric_var_round(quotient, rscale));
    }
    numeric_var_strip(numeric_var_trunc(quotient, rscale))
}

// PostgreSQL's div_var, to rscale fractional digits, rounded or truncated. An inexact
// quotient estimates its digits as PostgreSQL does whenever the divisor is long enough for
// PostgreSQL to take that path. Callers never divide by zero.
fn numeric_var_div(
    left: &NumericVar,
    right: &NumericVar,
    rscale: i32,
    round: bool,
    exact: bool,
) -> NumericVar {
    if exact
        || numeric_var_count(right) <= 2 * (NUMERIC_VAR_DIV_GUARD_DIGITS + 2)
        || numeric_var_count(left) == 0
    {
        return numeric_var_div_exact(left, right, rscale, round);
    }
    numeric_var_div_approximate(left, right, rscale, round)
}

// Knuth's algorithm D, figured to exactly rscale fractional digits.
fn numeric_var_div_exact(
    left: &NumericVar,
    right: &NumericVar,
    rscale: i32,
    round: bool,
) -> NumericVar {
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    if var2ndigits <= 2 {
        let mut idivisor = numeric_var_digit(right, 0);
        let mut idivisor_weight = right.weight;
        if var2ndigits == 2 {
            idivisor = idivisor * NUMERIC_VAR_NBASE + numeric_var_digit(right, 1);
            idivisor_weight = idivisor_weight - 1;
        }
        if right.sign < 0 {
            idivisor = 0 - idivisor;
        }
        return numeric_var_div_int(left, idivisor, idivisor_weight, rscale, round);
    }
    if var1ndigits == 0 {
        return numeric_var_zero(rscale);
    }
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let res_weight = left.weight - right.weight;
    let mut res_ndigits =
        res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    if round {
        res_ndigits = res_ndigits + 1;
    }
    let mut div_ndigits = res_ndigits + var2ndigits;
    if var1ndigits > div_ndigits {
        div_ndigits = var1ndigits;
    }
    // Index zero of both arrays is a spare digit, as in Knuth's notation.
    let mut dividend = numeric_var_zeros(div_ndigits + 1);
    let mut divisor = numeric_var_zeros(var2ndigits + 1);
    let mut index: usize = 0;
    while index < left.digits.len() {
        dividend[index + 1] = left.digits[index];
        index += 1;
    }
    index = 0;
    while index < right.digits.len() {
        divisor[index + 1] = right.digits[index];
        index += 1;
    }
    let divisor_end = usize::try_from(var2ndigits).unwrap_or(0);
    // The first divisor digit must be at least NBASE / 2; scale both operands to make it so.
    if divisor[1].value < NUMERIC_VAR_HALF_NBASE {
        let d = NUMERIC_VAR_NBASE / (divisor[1].value + 1);
        let mut carry: i32 = 0;
        let mut i = divisor_end;
        while i > 0 {
            carry = carry + divisor[i].value * d;
            divisor[i] = NumericWireDigit {
                value: carry % NUMERIC_VAR_NBASE,
            };
            carry = carry / NUMERIC_VAR_NBASE;
            i = i - 1;
        }
        carry = 0;
        let mut j = usize::try_from(var1ndigits).unwrap_or(0) + 1;
        while j > 0 {
            j = j - 1;
            carry = carry + dividend[j].value * d;
            dividend[j] = NumericWireDigit {
                value: carry % NUMERIC_VAR_NBASE,
            };
            carry = carry / NUMERIC_VAR_NBASE;
        }
    }
    let divisor1 = divisor[1].value;
    let divisor2 = divisor[2].value;
    let mut res_digits: Vec<NumericWireDigit> = Vec::new();
    let res_end = usize::try_from(res_ndigits).unwrap_or(0);
    let mut j: usize = 0;
    while j < res_end {
        let next2digits = dividend[j].value * NUMERIC_VAR_NBASE + dividend[j + 1].value;
        let mut qhat: i32 = 0;
        if next2digits != 0 {
            if dividend[j].value == divisor1 {
                qhat = NUMERIC_VAR_NBASE - 1;
            } else {
                qhat = next2digits / divisor1;
            }
            // Knuth proves the estimate is then exact or one too large.
            while divisor2 * qhat
                > (next2digits - qhat * divisor1) * NUMERIC_VAR_NBASE + dividend[j + 2].value
            {
                qhat = qhat - 1;
            }
            if qhat > 0 {
                let mut borrow: i32 = 0;
                let mut i = divisor_end + 1;
                while i > 0 {
                    i = i - 1;
                    let tmp_result = dividend[j + i].value - borrow - divisor[i].value * qhat;
                    borrow = (NUMERIC_VAR_NBASE - 1 - tmp_result) / NUMERIC_VAR_NBASE;
                    dividend[j + i] = NumericWireDigit {
                        value: tmp_result + borrow * NUMERIC_VAR_NBASE,
                    };
                }
                if borrow != 0 {
                    // qhat was one too large: add the divisor back once.
                    qhat = qhat - 1;
                    let mut carry: i32 = 0;
                    i = divisor_end + 1;
                    while i > 0 {
                        i = i - 1;
                        carry = carry + dividend[j + i].value + divisor[i].value;
                        if carry >= NUMERIC_VAR_NBASE {
                            dividend[j + i] = NumericWireDigit {
                                value: carry - NUMERIC_VAR_NBASE,
                            };
                            carry = 1;
                        } else {
                            dividend[j + i] = NumericWireDigit { value: carry };
                            carry = 0;
                        };
                    }
                };
            };
        }
        res_digits.push(NumericWireDigit { value: qhat });
        j += 1;
    }
    let quotient = NumericVar {
        sign: res_sign,
        weight: res_weight,
        dscale: rscale,
        digits: res_digits,
    };
    if round {
        return numeric_var_strip(numeric_var_round(quotient, rscale));
    }
    numeric_var_strip(numeric_var_trunc(quotient, rscale))
}

// The exact double nearest a 64-bit integer, as a C conversion gives: the parts are exact
// doubles, so their sum rounds once.
fn numeric_var_wide_double(value: i64) -> f64 {
    let high = value / 4294967296i64;
    let rest = value - high * 4294967296i64;
    let middle = rest / 65536i64;
    let low = rest - middle * 65536i64;
    let upper = (high as i32) as f64;
    let lower = ((middle as i32) as f64) * 65536.0f64 + ((low as i32) as f64);
    upper * 4294967296.0f64 + lower
}

// PostgreSQL truncates a negative estimate towards zero and then subtracts one.
fn numeric_var_quotient_digit(estimate: f64) -> i32 {
    if estimate >= 0.0f64 {
        return estimate as i32;
    }
    (estimate as i32) - 1
}

// Splits a carry out of a base-NBASE^2 digit, rounding towards minus infinity.
fn numeric_var_wide_carry(digit: i64) -> i64 {
    if digit < 0i64 {
        return 0i64 - ((0i64 - digit - 1i64) / 100000000i64) - 1i64;
    }
    if digit >= 100000000i64 {
        return digit / 100000000i64;
    }
    0i64
}

// PostgreSQL's inexact div_var: base-NBASE^2 digits with 64-bit accumulators, quotient digits
// estimated in double precision from the leading two dividend and divisor digits, carries
// propagated only when an accumulator could overflow, and rscale plus guard digits computed
// without correcting the estimates.
fn numeric_var_div_approximate(
    left: &NumericVar,
    right: &NumericVar,
    rscale: i32,
    round: bool,
) -> NumericVar {
    let var1ndigits = numeric_var_count(left);
    let var2ndigits = numeric_var_count(right);
    let mut res_sign: i32 = 1;
    if left.sign != right.sign {
        res_sign = -1;
    }
    let res_weight = left.weight - right.weight + 1;
    let mut res_ndigits =
        res_weight + 1 + (rscale + NUMERIC_VAR_DEC_DIGITS - 1) / NUMERIC_VAR_DEC_DIGITS;
    if res_ndigits < 1 {
        res_ndigits = 1;
    }
    if round {
        res_ndigits = res_ndigits + 1;
    }
    res_ndigits = res_ndigits + NUMERIC_VAR_DIV_GUARD_DIGITS;
    let mut var1ndigitpairs = (var1ndigits + 1) / 2;
    let mut var2ndigitpairs = (var2ndigits + 1) / 2;
    let res_ndigitpairs = (res_ndigits + 1) / 2;
    let div_ndigitpairs = res_ndigitpairs;
    if div_ndigitpairs < var1ndigitpairs {
        var1ndigitpairs = div_ndigitpairs;
    }
    if div_ndigitpairs < var2ndigitpairs {
        var2ndigitpairs = div_ndigitpairs;
    }
    // One spare dividend digit lets every step read and write the digit after it.
    let mut dividend: Vec<NumericVarWide> = Vec::new();
    let mut i: i32 = 0;
    while i <= div_ndigitpairs {
        let mut pair: i64 = 0i64;
        if i < var1ndigitpairs {
            let first = numeric_var_digit(left, 2 * i) as i64;
            let second = numeric_var_digit(left, 2 * i + 1) as i64;
            pair = first * 10000i64 + second;
        }
        dividend.push(NumericVarWide { value: pair });
        i = i + 1;
    }
    let mut divisor: Vec<NumericVarWide> = Vec::new();
    i = 0;
    while i < var2ndigitpairs {
        let first = numeric_var_digit(right, 2 * i) as i64;
        let second = numeric_var_digit(right, 2 * i + 1) as i64;
        divisor.push(NumericVarWide {
            value: first * 10000i64 + second,
        });
        i = i + 1;
    }
    let mut fdivisor = numeric_var_wide_double(divisor[0].value) * 100000000.0f64;
    if var2ndigitpairs > 1 {
        fdivisor = fdivisor + numeric_var_wide_double(divisor[1].value);
    }
    let fdivisorinverse = 1.0f64 / fdivisor;
    let limit =
        (9223372036854775807i64 - 9223372036854775807i64 / 100000000i64 - 1i64) / 99999999i64;
    let mut maxdiv: i64 = 1i64;
    let mut qi: i32 = 0;
    while qi < res_ndigitpairs {
        let at = usize::try_from(qi).unwrap_or(0);
        let mut fdividend = numeric_var_wide_double(dividend[at].value) * 100000000.0f64;
        fdividend = fdividend + numeric_var_wide_double(dividend[at + 1].value);
        let mut qdigit = numeric_var_quotient_digit(fdividend * fdivisorinverse);
        if qdigit != 0 {
            let mut magnitude = qdigit as i64;
            if magnitude < 0i64 {
                magnitude = 0i64 - magnitude;
            }
            maxdiv = maxdiv + magnitude;
            if maxdiv > limit {
                let mut carry: i64 = 0i64;
                let mut j = qi + var2ndigitpairs - 2;
                if div_ndigitpairs - 1 < j {
                    j = div_ndigitpairs - 1;
                }
                while j > qi {
                    let index = usize::try_from(j).unwrap_or(0);
                    let mut newdig = dividend[index].value + carry;
                    carry = numeric_var_wide_carry(newdig);
                    newdig = newdig - carry * 100000000i64;
                    dividend[index] = NumericVarWide { value: newdig };
                    j = j - 1;
                }
                dividend[at] = NumericVarWide {
                    value: dividend[at].value + carry,
                };
                maxdiv = 1i64;
                fdividend = numeric_var_wide_double(dividend[at].value) * 100000000.0f64;
                fdividend = fdividend + numeric_var_wide_double(dividend[at + 1].value);
                qdigit = numeric_var_quotient_digit(fdividend * fdivisorinverse);
                magnitude = qdigit as i64;
                if magnitude < 0i64 {
                    magnitude = 0i64 - magnitude;
                }
                maxdiv = maxdiv + magnitude;
            }
            if qdigit != 0 {
                let mut istop = var2ndigitpairs;
                if div_ndigitpairs - qi < istop {
                    istop = div_ndigitpairs - qi;
                }
                let stop = usize::try_from(istop).unwrap_or(0);
                let wide_qdigit = qdigit as i64;
                let mut k: usize = 0;
                while k < stop {
                    dividend[at + k] = NumericVarWide {
                        value: dividend[at + k].value - wide_qdigit * divisor[k].value,
                    };
                    k += 1;
                }
            };
        }
        // PostgreSQL folds this digit into the next one and relies on a cancelling overflow
        // when the product leaves 64 bits; splitting the next digit avoids the overflow.
        let current = dividend[at].value;
        let next = dividend[at + 1].value;
        let next_high = next / 100000000i64;
        let next_low = next - next_high * 100000000i64;
        dividend[at + 1] = NumericVarWide {
            value: (current + next_high) * 100000000i64 + next_low,
        };
        dividend[at] = NumericVarWide {
            value: qdigit as i64,
        };
        qi = qi + 1;
    }
    let mut digits = numeric_var_zeros(2 * res_ndigitpairs);
    let mut carry: i64 = 0i64;
    let mut j = res_ndigitpairs - 1;
    while j >= 0 {
        let index = usize::try_from(j).unwrap_or(0);
        let mut newdig = dividend[index].value + carry;
        carry = numeric_var_wide_carry(newdig);
        newdig = newdig - carry * 100000000i64;
        let pair = newdig as i32;
        digits[index + index] = NumericWireDigit {
            value: pair / NUMERIC_VAR_NBASE,
        };
        digits[index + index + 1] = NumericWireDigit {
            value: pair % NUMERIC_VAR_NBASE,
        };
        j = j - 1;
    }
    let quotient = NumericVar {
        sign: res_sign,
        weight: res_weight,
        dscale: rscale,
        digits: digits,
    };
    if round {
        return numeric_var_strip(numeric_var_round(quotient, rscale));
    }
    numeric_var_strip(numeric_var_trunc(quotient, rscale))
}

// PostgreSQL's mod_var: x - trunc(x / y) * y.
fn numeric_var_mod(left: &NumericVar, right: &NumericVar) -> NumericVar {
    let quotient = numeric_var_div(left, right, 0, false, true);
    let product = numeric_var_mul(right, &quotient, right.dscale);
    numeric_var_sub(left, &product)
}

// PostgreSQL's make_result: the stored weight and display scale must fit their header fields.
fn numeric_var_result(value: NumericVar) -> NumericValue {
    let stripped = numeric_var_strip(value);
    if (numeric_var_count(&stripped) > 0 && (stripped.weight > 32767 || stripped.weight < -32768))
        || stripped.dscale > 16383
    {
        return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
    }
    NumericValue::Value(numeric_work_text(numeric_work_from_var(&stripped)))
}

fn numeric_var_rescaled(value: NumericVar, dscale: i32) -> NumericVar {
    NumericVar {
        sign: value.sign,
        weight: value.weight,
        dscale: dscale,
        digits: value.digits,
    }
}

// PostgreSQL's ceil_var and floor_var: truncate, then step away from zero when the
// argument lay beyond the truncation in that direction.
fn numeric_var_ceil(value: &NumericVar) -> NumericVar {
    let one = numeric_var_from_i64(1i64);
    let truncated = numeric_var_trunc(numeric_var_shifted(value, 0), 0);
    if value.sign > 0 && numeric_var_cmp(value, &truncated) != 0 {
        return numeric_var_add(&truncated, &one);
    }
    truncated
}

fn numeric_var_floor(value: &NumericVar) -> NumericVar {
    let one = numeric_var_from_i64(1i64);
    let truncated = numeric_var_trunc(numeric_var_shifted(value, 0), 0);
    if value.sign < 0 && numeric_var_cmp(value, &truncated) != 0 {
        return numeric_var_sub(&truncated, &one);
    }
    truncated
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
