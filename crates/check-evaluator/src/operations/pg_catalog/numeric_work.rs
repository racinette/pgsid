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
            if numeric_wire_decimal_digit(character) >= 0 { digits.push(character); }
            index += 1;
        }
    }
    NumericWork { valid: layout.valid, special: layout.special, sign: layout.sign, weight: layout.weight, scale: scale, digits: digits }
}

fn numeric_work_text(work: NumericWork) -> String {
    if work.special == 0 { return "-Infinity".to_owned(); }
    if work.special == 2 { return "Infinity".to_owned(); }
    if work.special == 3 { return "NaN".to_owned(); }
    let digits: Vec<char> = work.digits.chars().collect();
    let mut output = String::new();
    if work.sign < 0 { output.push('-'); }
    let mut position = work.weight;
    if position < 0 || work.sign == 0 { position = 0; }
    let mut index: usize = 0;
    while position >= 0 - work.scale {
        if position == -1 { output.push('.'); }
        if work.sign != 0 && position <= work.weight && index < digits.len() {
            output.push(digits[index]);
            index += 1;
        } else { output.push('0'); };
        position = position - 1;
    }
    output
}

fn numeric_work_min_scale(work: NumericWork) -> i32 {
    if work.sign == 0 { return 0; }
    let digits: Vec<char> = work.digits.chars().collect();
    let mut position = work.weight;
    let mut index: usize = 0;
    while index < digits.len() { position = position - 1; index += 1; }
    let scale = 0 - position - 1;
    if scale < 0 { return 0; }
    scale
}

fn numeric_work_round(work: NumericWork, requested: i32, mode: i32) -> NumericValue {
    if work.valid == false { return NumericValue::Unknown; }
    if work.special != 1 { return NumericValue::Value(numeric_work_text(work)); }
    let mut scale = requested;
    let mut minimum: i32 = -131072;
    if mode == 1 { minimum = minimum - 1; }
    if scale < minimum { scale = minimum; }
    if scale > 16383 { scale = 16383; }
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
        if mode == 1 && position == boundary - 1 && numeric_wire_decimal_digit(original[index]) >= 5 { increase = true; }
        if mode == 2 && work.sign > 0 { increase = true; }
        if mode == 3 && work.sign < 0 { increase = true; }
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
                if digits[cursor] == '9' { digits[cursor] = '0'; }
                else {
                    let mut symbol: usize = 0;
                    while symbols[symbol] != digits[cursor] { symbol += 1; }
                    digits[cursor] = symbols[symbol + 1];
                    carry = false;
                };
            }
            if carry { leading_carry = true; weight = weight + 1; }
        };
    }
    let mut end = digits.len();
    while end > 0 && digits[end - 1] == '0' { end = end - 1; }
    let mut coefficient = String::new();
    let mut cursor: usize = 0;
    if leading_carry { coefficient.push('1'); }
    else { while cursor < end { coefficient.push(digits[cursor]); cursor += 1; } };
    let mut sign = work.sign;
    if end == 0 && leading_carry == false { sign = 0; weight = 0; }
    if weight > 131071 { return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR)); }
    let mut output_scale = scale;
    if output_scale < 0 { output_scale = 0; }
    NumericValue::Value(numeric_work_text(NumericWork { valid: true, special: 1, sign: sign, weight: weight, scale: output_scale, digits: coefficient }))
}
