pub fn money_from_text(input: TextValue) -> MoneyValue {
    if let TextValue::Error(error) = input {
        return MoneyValue::Error(error);
    };
    if input == TextValue::Null {
        return MoneyValue::Null;
    };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        while index < chars.len() && numeric_space(chars[index]) {
            index += 1;
        }
        while index < chars.len() && chars[index] == '0' {
            index += 1;
        }
        while index < chars.len() && numeric_space(chars[index]) {
            index += 1;
        }
        if index == chars.len() {
            return make_money_value(0i64);
        };
    };
    MoneyValue::Unknown
}
