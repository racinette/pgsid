const TID_INPUT_INVALID: u32 = 3484946;

#[derive(Clone)]
struct TidInputText {
    chars: Vec<char>,
}

#[derive(Clone, Copy)]
struct TidInputWord {
    high: i64,
    low: i64,
    negative: bool,
    end: usize,
    digits: bool,
    overflow: bool,
}

fn tid_parse_word(input: &TidInputText, first: usize) -> TidInputWord {
    let mut index = first;
    while index < input.chars.len() && oid_input_space(input.chars[index]) { index += 1; };
    let mut negative = false;
    if index < input.chars.len() && (input.chars[index] == '+' || input.chars[index] == '-') { negative = input.chars[index] == '-'; index += 1; };
    let mut high = 0i64;
    let mut low = 0i64;
    let mut digits = false;
    let mut overflow = false;
    while index < input.chars.len() {
        let digit = oid_input_digit(input.chars[index]);
        if digit < 0i64 || digit > 9i64 { break; };
        digits = true;
        if overflow == false {
            let next = low * 10i64 + digit;
            low = next % 4294967296i64;
            high = high * 10i64 + next / 4294967296i64;
            if high > 4294967295i64 { overflow = true; };
        };
        index += 1;
    };
    if digits == false { index = first; };
    TidInputWord { high: high, low: low, negative: negative, end: index, digits: digits, overflow: overflow }
}

fn tid_input_block(word: TidInputWord) -> Int8Value {
    if word.overflow { return Int8Value::Error(make_sql_error(TID_INPUT_INVALID)); };
    if word.digits == false { return Int8Value::Unknown; };
    if word.high != 0i64 {
        if word.high == 4294967295i64 && ((word.negative && word.low != 0i64) || (word.negative == false && word.low >= 2147483648i64)) { return Int8Value::Unknown; };
        return Int8Value::Error(make_sql_error(TID_INPUT_INVALID));
    };
    if word.negative && word.low > 2147483648i64 { return Int8Value::Unknown; };
    if word.negative && word.low != 0i64 { return make_int8_value(4294967296i64 - word.low); };
    make_int8_value(word.low)
}

fn tid_input_offset(word: TidInputWord) -> Int4Value {
    if word.overflow { return Int4Value::Error(make_sql_error(TID_INPUT_INVALID)); };
    if word.digits == false { return Int4Value::Unknown; };
    if word.negative && word.low >= 4294901761i64 && (word.high == 0i64 || word.high == 4294967295i64) { return Int4Value::Unknown; };
    if word.high != 0i64 || word.low > 65535i64 || (word.negative && word.low != 0i64) { return Int4Value::Error(make_sql_error(TID_INPUT_INVALID)); };
    make_int4_value(word.low as i32)
}

pub fn tid_from_text(input: TextValue) -> TidValue {
    if let TextValue::Error(error) = input { return TidValue::Error(error); };
    if input == TextValue::Null { return TidValue::Null; };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let data = TidInputText { chars: chars };
        if data.chars.len() > 4096 { return TidValue::Unknown; };
        let mut index: usize = 0;
        let mut count = 0;
        let mut first: usize = 0;
        let mut second: usize = 0;
        while index < data.chars.len() && count < 2 && data.chars[index] != ')' {
            if data.chars[index] == ',' || (data.chars[index] == '(' && count == 0) {
                if count == 0 { first = index + 1; } else { second = index + 1; };
                count = count + 1;
            };
            index += 1;
        };
        if count != 2 { return TidValue::Error(make_sql_error(TID_INPUT_INVALID)); };
        let block_word = tid_parse_word(&data, first);
        let offset_word = tid_parse_word(&data, second);
        if block_word.end >= data.chars.len() || data.chars[block_word.end] != ',' || offset_word.end >= data.chars.len() || data.chars[offset_word.end] != ')' { return TidValue::Error(make_sql_error(TID_INPUT_INVALID)); };
        let block = tid_input_block(block_word);
        let offset = tid_input_offset(offset_word);
        if let Int8Value::Error(error) = block { return TidValue::Error(error); };
        if let Int4Value::Error(error) = offset { return TidValue::Error(error); };
        if let Int8Value::Value(high) = block {
            if let Int4Value::Value(low) = offset { return make_tid_parts(high, low); };
        };
    };
    TidValue::Unknown
}
