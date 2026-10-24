fn float_output_dyadic(input: i64, exponent: i32) -> NumericWork {
    if input == 0i64 { return numeric_work_from_value("0"); };
    let mut coefficient = input; let mut power = exponent;
    while coefficient%2i64 == 0i64 { coefficient = coefficient/2i64; power = power+1; }
    let text = text_signed_number(coefficient);
    let mut result = numeric_work_from_value(text.as_str());
    let mut count = power; let mut scale: i32 = 0;
    let mut factor = numeric_work_from_value("2");
    if power < 0 { count = 0-power; scale = count; factor = numeric_work_from_value("5"); };
    while count > 0 {
        if count%2 == 1 { result = numeric_work_product(result,factor.clone()); };
        count = count/2;
        if count > 0 { factor = numeric_work_product(factor.clone(),factor); };
    }
    NumericWork { valid: result.valid, special: 1, sign: 1, weight: result.weight-scale, scale, digits: result.digits }
}

fn float_output_rounded(work: NumericWork, precision: i32) -> NumericWork {
    let digits: Vec<char> = work.digits.chars().collect();
    let index = usize::try_from(precision).unwrap_or(0);
    let mut mode: i32 = 1;
    if index > 0 && index < digits.len() && digits[index] == '5' {
        let mut cursor = index+1; let mut tie = true;
        while cursor < digits.len() { if digits[cursor] != '0' { tie = false; }; cursor += 1; }
        if tie && numeric_wire_decimal_digit(digits[index-1])%2 == 0 { mode = 0; };
    };
    let scale = precision-1-work.weight;
    numeric_work_rounded(work,scale,mode)
}

fn float_output_inside(candidate: NumericWork, lower: NumericWork, upper: NumericWork) -> bool {
    numeric_work_magnitude(candidate.clone(),lower) > 0 && numeric_work_magnitude(candidate,upper) < 0
}

fn float_output_shortest(exact: NumericWork, coefficient: i64, power: i32, mantissa: i64, exponent: i32, single: bool) -> NumericWork {
    let mut shift = 0i64;
    if mantissa != 0i64 || exponent <= 1 { shift = 1i64; };
    let lower = float_output_dyadic(coefficient*4i64-1i64-shift,power-2);
    let upper = float_output_dyadic(coefficient*4i64+2i64,power-2);
    let mut maximum: i32 = 17; if single { maximum = 9; };
    let mut precision: i32 = 1;
    while precision <= maximum {
        let nearest = float_output_rounded(exact.clone(),precision);
        if float_output_inside(nearest.clone(),lower.clone(),upper.clone()) { return nearest; };
        let scale = precision-1-exact.weight;
        let below = numeric_work_rounded(exact.clone(),scale,0);
        if float_output_inside(below.clone(),lower.clone(),upper.clone()) { return below; };
        let quantum = NumericWork { valid: true, special: 1, sign: 1, weight: 0-scale, scale: 0, digits: "1".to_owned() };
        let above = numeric_work_sum(below,quantum,false);
        if float_output_inside(above.clone(),lower.clone(),upper.clone()) { return above; };
        precision = precision+1;
    }
    NumericWork { valid: false, special: 1, sign: 1, weight: 0, scale: 0, digits: String::new() }
}

fn float_output_decimal(work: NumericWork, negative: bool, threshold: i32) -> String {
    let mut output = String::new(); if negative { output.push('-'); };
    if work.weight < -4 || work.weight >= threshold {
        let digits: Vec<char> = work.digits.chars().collect();
        if digits.len() > 0 { output.push(digits[0]); };
        if digits.len() > 1 {
            output.push('.'); let mut index: usize = 1;
            while index < digits.len() { output.push(digits[index]); index += 1; }
        };
        output.push('e'); let mut exponent = work.weight;
        if exponent < 0 { output.push('-'); exponent = 0-exponent; } else { output.push('+'); };
        if exponent < 10 { output.push('0'); };
        let text = text_number(exponent,10); output.push_str(text.as_str());
    } else {
        let scale = numeric_work_min_scale(work.clone());
        let value = NumericWork { valid: work.valid, special: 1, sign: 1, weight: work.weight, scale, digits: work.digits };
        let text = numeric_work_text(value); output.push_str(text.as_str());
    };
    output
}

fn float_output_bits(bits: i64, single: bool, negative: bool, extra: i32, known: bool) -> TextValue {
    let mut unit = 4503599627370496i64; let mut bias: i32 = 1023;
    let mut width: i32 = 52; let mut special: i32 = 2047; let mut digits: i32 = 15;
    if single { unit = 8388608i64; bias = 127; width = 23; special = 255; digits = 6; };
    let exponent = (bits/unit) as i32; let mantissa = bits%unit;
    if exponent == special {
        if mantissa != 0i64 { return make_text_value("NaN"); };
        if negative { return make_text_value("-Infinity"); };
        return make_text_value("Infinity");
    };
    if bits == 0i64 {
        if negative { return make_text_value("-0"); };
        return make_text_value("0");
    };
    if known && (extra < -15 || extra > 3) { return TextValue::Unknown; };
    let mut coefficient = mantissa; let mut power = 1-bias-width;
    if exponent > 0 { coefficient = coefficient+unit; power = exponent-bias-width; };
    let exact = float_output_dyadic(coefficient,power);
    if known && extra <= 0 {
        let mut precision = digits+extra; if precision < 1 { precision = 1; };
        let rounded = float_output_rounded(exact,precision);
        let text = float_output_decimal(rounded,negative,precision);
        return TextValue::Value(text);
    };
    let shortest = float_output_shortest(exact.clone(),coefficient,power,mantissa,exponent,single);
    if shortest.valid == false { return TextValue::Unknown; };
    let text = float_output_decimal(shortest,negative,digits);
    if known { return TextValue::Value(text); };
    let first_value = float_output_rounded(exact.clone(),1);
    let first = float_output_decimal(first_value,negative,1);
    let last_value = float_output_rounded(exact,digits);
    let last = float_output_decimal(last_value,negative,digits);
    if first == text && last == text { return TextValue::Value(text); };
    TextValue::Unknown
}

pub fn float8_output_context(input: Float8Value, extra: i32, known: bool) -> TextValue {
    if let Float8Value::Error(error) = input { return TextValue::Error(error); };
    if let Float8Value::Null = input { return TextValue::Null; };
    if let Float8Value::UnspecifiedNan = input { return make_text_value("NaN"); };
    if let Float8Value::Value(bits) = input {
        let negative = bits < 0i64; let mut magnitude = bits;
        if negative { magnitude = bits-(-9223372036854775808i64); };
        return float_output_bits(magnitude,false,negative,extra,known);
    };
    TextValue::Unknown
}

pub fn float4_output_context(input: Float4Value, extra: i32, known: bool) -> TextValue {
    if let Float4Value::Error(error) = input { return TextValue::Error(error); };
    if let Float4Value::Null = input { return TextValue::Null; };
    if let Float4Value::UnspecifiedNan = input { return make_text_value("NaN"); };
    if let Float4Value::Value(bits) = input {
        let negative = bits < 0; let mut magnitude = bits as i64;
        if negative { magnitude = magnitude-(-2147483648i64); };
        return float_output_bits(magnitude,true,negative,extra,known);
    };
    TextValue::Unknown
}
