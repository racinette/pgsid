const MONEY_TEXT_INVALID: u32 = 3484946;
const MONEY_TEXT_RANGE: u32 = 3452547;

fn money_text_digit(value: i64, digit: i64) -> Int8Value {
    if value < -922337203685477580i64 || (value == -922337203685477580i64 && digit > 8i64) {
        return Int8Value::Error(make_sql_error(MONEY_TEXT_RANGE));
    };
    Int8Value::Value(value * 10i64 - digit)
}

pub fn money_from_text_context(input: TextValue, c_locale: bool) -> MoneyValue {
    if c_locale == false { return money_from_text(input); };
    if let TextValue::Error(error) = input { return MoneyValue::Error(error); };
    if let TextValue::Null = input { return MoneyValue::Null; };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        while index < characters.len() && numeric_space(characters[index]) { index += 1; }
        if index < characters.len() && characters[index] == '$' { index += 1; };
        while index < characters.len() && numeric_space(characters[index]) { index += 1; }
        let mut negative = false;
        if index < characters.len() {
            if characters[index] == '-' || characters[index] == '(' { negative = true; index += 1; }
            else if characters[index] == '+' { index += 1; };
        };
        while index < characters.len() && numeric_space(characters[index]) { index += 1; }
        if index < characters.len() && characters[index] == '$' { index += 1; };
        while index < characters.len() && numeric_space(characters[index]) { index += 1; }
        let mut amount: i64 = 0i64;
        let mut decimals: i32 = 0;
        let mut decimal_point = false;
        let mut scanning = true;
        while index < characters.len() && scanning {
            let character = characters[index];
            let digit = numeric_wire_decimal_digit(character);
            if digit >= 0 && (decimal_point == false || decimals < 2) {
                let next = money_text_digit(amount,digit as i64);
                if let Int8Value::Error(error) = next { return MoneyValue::Error(error); };
                if let Int8Value::Value(stored) = next { amount = stored; };
                if decimal_point { decimals = decimals + 1; };
                index += 1;
            } else if character == '.' && decimal_point == false { decimal_point = true; index += 1; }
            else if character == ',' { index += 1; }
            else { scanning = false; };
        }
        if index < characters.len() {
            let digit = numeric_wire_decimal_digit(characters[index]);
            if digit >= 5 {
                if amount == -9223372036854775808i64 { return MoneyValue::Error(make_sql_error(MONEY_TEXT_RANGE)); };
                amount = amount - 1i64;
            };
        };
        while decimals < 2 {
            let next = money_text_digit(amount,0i64);
            if let Int8Value::Error(error) = next { return MoneyValue::Error(error); };
            if let Int8Value::Value(stored) = next { amount = stored; };
            decimals = decimals + 1;
        }
        while index < characters.len() && numeric_wire_decimal_digit(characters[index]) >= 0 { index += 1; }
        while index < characters.len() {
            let character = characters[index];
            if numeric_space(character) || character == ')' || character == '+' || character == '$' { index += 1; }
            else if character == '-' { negative = true; index += 1; }
            else { return MoneyValue::Error(make_sql_error(MONEY_TEXT_INVALID)); };
        }
        if negative { return make_money_value(amount); };
        if amount == -9223372036854775808i64 { return MoneyValue::Error(make_sql_error(MONEY_TEXT_RANGE)); };
        return make_money_value(0i64 - amount);
    };
    MoneyValue::Unknown
}

pub fn money_to_text_context(input: MoneyValue, c_locale: bool) -> TextValue {
    if let MoneyValue::Error(error) = input { return TextValue::Error(error); };
    if let MoneyValue::Null = input { return TextValue::Null; };
    if c_locale == false { return TextValue::Unknown; };
    if let MoneyValue::Value(value) = input {
        let raw = text_signed_number(value);
        let characters: Vec<char> = raw.chars().collect();
        let mut start: usize = 0;
        let mut output = String::new();
        if value < 0i64 { start = 1; output.push('-'); };
        output.push('$');
        let width = characters.len() - start;
        if width <= 2 {
            output.push('0');
        } else {
            let end = characters.len() - 2;
            let mut index = start;
            while index < end {
                let remaining = (end-index) as i32;
                if index > start && remaining%3 == 0 { output.push(','); };
                output.push(characters[index]); index += 1;
            }
        };
        output.push('.');
        if width > 1 { output.push(characters[characters.len()-2]); } else { output.push('0'); };
        output.push(characters[characters.len()-1]);
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
