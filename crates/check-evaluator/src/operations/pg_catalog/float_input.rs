const FLOAT_INPUT_INVALID: u32 = 3484946;
const FLOAT_INPUT_RANGE: u32 = 3452547;

#[derive(Clone)]
struct FloatInputLayout {
    kind: i32,
    negative: bool,
    zero: bool,
    weight: i32,
    digits: String,
    text: String,
}

fn float_input_terminal(kind: i32) -> FloatInputLayout {
    FloatInputLayout {
        kind: kind,
        negative: false,
        zero: true,
        weight: 0,
        digits: String::new(),
        text: String::new(),
    }
}

fn decode_float_input(value: &str) -> FloatInputLayout {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 1000000 {
        return float_input_terminal(4);
    }
    let mut begin: usize = 0;
    let mut end = chars.len();
    while begin < end && numeric_space(chars[begin]) {
        begin += 1;
    }
    while begin < end && numeric_space(chars[end - 1]) {
        end = end - 1;
    }
    if begin == end {
        return float_input_terminal(5);
    }
    let mut index = begin;
    let mut negative = false;
    let mut signed = false;
    if chars[index] == '-' || chars[index] == '+' {
        negative = chars[index] == '-';
        signed = true;
        index += 1;
    }
    if index == end {
        return float_input_terminal(5);
    }
    let start = index;
    let mut word = String::new();
    while index < end {
        word.push(chars[index].to_ascii_lowercase());
        index += 1;
    }
    if word == "inf".to_owned() || word == "infinity".to_owned() {
        if negative {
            return float_input_terminal(2);
        }
        return float_input_terminal(1);
    }
    if word == "nan".to_owned() {
        if signed {
            return float_input_terminal(4);
        }
        return float_input_terminal(3);
    }
    if end - start >= 2 && chars[start] == '0' && chars[start + 1].to_ascii_lowercase() == 'x' {
        return float_input_terminal(4);
    }
    if end - start >= 4
        && chars[start].to_ascii_lowercase() == 'n'
        && chars[start + 1].to_ascii_lowercase() == 'a'
        && chars[start + 2].to_ascii_lowercase() == 'n'
        && chars[start + 3] == '('
    {
        return float_input_terminal(4);
    }
    index = start;
    let mut point = false;
    let mut any = false;
    let mut started = false;
    let mut before: i32 = 0;
    let mut leading: i32 = 0;
    let mut digits = String::new();
    while index < end {
        let code = chars[index] as i32;
        if code >= 48 && code <= 57 {
            any = true;
            if point == false {
                before = before + 1;
            }
            if started == false && code == 48 {
                leading = leading + 1;
            } else {
                started = true;
                digits.push(chars[index]);
            };
            index += 1;
        } else {
            if chars[index] == '.' && point == false {
                point = true;
                index += 1;
            } else {
                break;
            };
        };
    }
    if any == false {
        return float_input_terminal(5);
    }
    let mut exponent: i32 = 0;
    if index < end && chars[index].to_ascii_lowercase() == 'e' {
        index += 1;
        let mut minus = false;
        if index < end && (chars[index] == '-' || chars[index] == '+') {
            minus = chars[index] == '-';
            index += 1;
        }
        let first = index;
        while index < end {
            let code = chars[index] as i32;
            if code < 48 || code > 57 {
                break;
            }
            if exponent < 100000000 {
                exponent = exponent * 10 + code - 48;
            }
            index += 1;
        }
        if index == first {
            return float_input_terminal(5);
        }
        if minus {
            exponent = 0 - exponent;
        }
    }
    if index != end {
        return float_input_terminal(5);
    }
    index = begin;
    let mut text = String::new();
    while index < end {
        text.push(chars[index]);
        index += 1;
    }
    FloatInputLayout {
        kind: 0,
        negative: negative,
        zero: started == false,
        weight: before - leading - 1 + exponent,
        digits: digits,
        text: text,
    }
}

fn float_exact_decimal(value: f64) -> NumericWork {
    if value == 0.0f64 {
        return numeric_work_from_value("0");
    }
    let bits = value.to_bits() as i64;
    let exponent = (bits / 4503599627370496i64) as i32;
    let mut coefficient = bits % 4503599627370496i64;
    let mut power = exponent - 1075;
    if exponent == 0 {
        power = -1074;
    } else {
        coefficient = coefficient + 4503599627370496i64;
    };
    while coefficient % 2i64 == 0i64 {
        coefficient = coefficient / 2i64;
        power = power + 1;
    }
    let text = text_signed_number(coefficient);
    let mut result = numeric_work_from_value(text.as_str());
    let mut count = power;
    let mut factor = numeric_work_from_value("2");
    let mut scale: i32 = 0;
    if power < 0 {
        count = 0 - power;
        scale = count;
        factor = numeric_work_from_value("5");
    }
    while count > 0 {
        result = numeric_work_product(result, factor.clone());
        count = count - 1;
    }
    NumericWork {
        valid: result.valid,
        special: 1,
        sign: 1,
        weight: result.weight - scale,
        scale: scale,
        digits: result.digits,
    }
}

fn float_input_single(layout: FloatInputLayout) -> Float4Value {
    if layout.zero {
        let mut bits: i32 = 0;
        if layout.negative {
            bits = -2147483647 - 1;
        }
        return make_float4_bits(bits);
    }
    let magnitude = NumericWork {
        valid: true,
        special: 1,
        sign: 1,
        weight: layout.weight,
        scale: 0,
        digits: layout.digits.clone(),
    };
    let upper = float_exact_decimal(340282356779733661637539395458142568448.0f64);
    let lower = float_exact_decimal(float4_number(1) / 2.0f64);
    if numeric_work_magnitude(magnitude.clone(), upper) >= 0
        || numeric_work_magnitude(magnitude.clone(), lower) <= 0
    {
        return Float4Value::Error(make_sql_error(FLOAT_INPUT_RANGE));
    }
    let estimate = layout.text.as_str().parse::<f64>().unwrap_or(0.0f64).abs();
    let mut bits = (estimate as f32).to_bits() as i32;
    if bits == 0 {
        bits = 1;
    }
    if bits == 2139095040 {
        bits = 2139095039;
    }
    let center = float4_number(bits);
    let previous = float4_number(bits - 1);
    let below = float_exact_decimal((center + previous) / 2.0f64);
    let mut above = float_exact_decimal(340282356779733661637539395458142568448.0f64);
    if bits < 2139095039 {
        above = float_exact_decimal((center + float4_number(bits + 1)) / 2.0f64);
    }
    let low_order = numeric_work_magnitude(magnitude.clone(), below);
    let high_order = numeric_work_magnitude(magnitude, above);
    if low_order < 0 || (low_order == 0 && bits % 2 != 0) {
        bits = bits - 1;
    } else {
        if high_order > 0 || (high_order == 0 && bits % 2 != 0) {
            bits = bits + 1;
        };
    };
    if layout.negative {
        bits = (bits as i64 - 2147483648i64) as i32;
    }
    make_float4_bits(bits)
}

pub fn float4_from_text(input: TextValue) -> Float4Value {
    if let TextValue::Error(error) = input {
        return Float4Value::Error(error);
    }
    if input == TextValue::Null {
        return Float4Value::Null;
    }
    if let TextValue::Value(text) = input {
        let layout = decode_float_input(text.as_str());
        if layout.kind == 5 {
            return Float4Value::Error(make_sql_error(FLOAT_INPUT_INVALID));
        }
        if layout.kind == 1 {
            return make_float4_bits(2139095040);
        }
        if layout.kind == 2 {
            return make_float4_bits(-8388608);
        }
        if layout.kind == 3 {
            return Float4Value::UnspecifiedNan;
        }
        if layout.kind == 0 {
            return float_input_single(layout);
        }
    };
    Float4Value::Unknown
}

pub fn float8_from_text(input: TextValue) -> Float8Value {
    if let TextValue::Error(error) = input {
        return Float8Value::Error(error);
    }
    if input == TextValue::Null {
        return Float8Value::Null;
    }
    if let TextValue::Value(text) = input {
        let layout = decode_float_input(text.as_str());
        if layout.kind == 5 {
            return Float8Value::Error(make_sql_error(FLOAT_INPUT_INVALID));
        }
        if layout.kind == 1 {
            return make_float8_bits(9218868437227405312i64);
        }
        if layout.kind == 2 {
            return make_float8_bits(-4503599627370496i64);
        }
        if layout.kind == 3 {
            return Float8Value::UnspecifiedNan;
        }
        if layout.kind == 0 {
            if layout.zero {
                let mut bits: i64 = 0i64;
                if layout.negative {
                    bits = -9223372036854775808i64;
                }
                return make_float8_bits(bits);
            }
            let value = layout.text.as_str().parse::<f64>().unwrap_or(0.0f64);
            let infinity = 1.0f64 / 0.0f64;
            if value == 0.0f64 || value.abs() == infinity {
                return Float8Value::Error(make_sql_error(FLOAT_INPUT_RANGE));
            }
            return make_float8_value(value);
        }
    };
    Float8Value::Unknown
}
