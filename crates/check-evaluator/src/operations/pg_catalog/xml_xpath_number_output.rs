fn xpath_number_rounded(work: NumericWork, scale: i32) -> NumericWork {
    let digits: Vec<char> = work.digits.chars().collect();
    let wanted = work.weight+scale+1;
    let mut mode: i32 = 1;
    if wanted > 0 {
        let index = usize::try_from(wanted).unwrap_or(0);
        if index < digits.len() && digits[index] == '5' {
            let mut cursor = index+1; let mut tie = true;
            while cursor < digits.len() { if digits[cursor] != '0' { tie = false; }; cursor += 1; }
            if tie && numeric_wire_decimal_digit(digits[index-1])%2 == 0 { mode = 0; };
        };
    };
    numeric_work_rounded(work,scale,mode)
}

fn xpath_number_string(bits: i64) -> String {
    let number = f64::from_bits(bits as u64);
    if number != number { return "NaN".to_owned(); };
    let infinity = 1.0f64/0.0f64;
    if number == infinity { return "Infinity".to_owned(); };
    if number == -infinity { return "-Infinity".to_owned(); };
    if number == 0.0f64 { return "0".to_owned(); };
    if number > -2147483648.0f64 && number < 2147483647.0f64 {
        let integer = number as i32;
        if number == integer as f64 { return text_signed_number(integer as i64); };
    };
    let absolute = number.abs();
    let exact = float_exact_decimal(absolute);
    let scientific = absolute > 1000000000.0f64 || absolute < 0.00001f64;
    let mut places = exact.weight;
    if absolute < 1.0f64 { places = places+1; };
    let mut scale = 15-places;
    if places > 0 { scale = scale-1; };
    if scientific { scale = 14-exact.weight; };
    let rounded = xpath_number_rounded(exact,scale);
    let mut output = String::new();
    if number < 0.0f64 { output.push('-'); };
    if scientific {
        let digits: Vec<char> = rounded.digits.as_str().chars().collect();
        if digits.len() > 0 { output.push(digits[0]); };
        if digits.len() > 1 {
            output.push('.'); let mut position: usize = 1;
            while position < digits.len() { output.push(digits[position]); position += 1; }
        };
        output.push('e');
        let mut exponent = rounded.weight;
        if exponent >= 0 { output.push('+'); } else { output.push('-'); exponent = 0-exponent; };
        if exponent < 10 { output.push('0'); };
        let text = text_number(exponent,10); output.push_str(text.as_str());
        return output;
    };
    let minimum = numeric_work_min_scale(rounded.clone());
    let result = NumericWork { valid: true, special: 1, sign: 1, weight: rounded.weight, scale: minimum, digits: rounded.digits };
    let text = numeric_work_text(result); output.push_str(text.as_str()); output
}
