pub fn sql__pg_catalog__factorial__tah6(input: Int8Value) -> NumericValue {
    if let Int8Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == Int8Value::Unknown {
        return NumericValue::Unknown;
    }
    if input == Int8Value::Null {
        return NumericValue::Null;
    }
    if let Int8Value::Value(value) = input {
        if value < 0i64 || value > 32177i64 {
            return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        let limit = value as i32;
        let mut words: Vec<NumericWireDigit> = Vec::new();
        words.push(NumericWireDigit { value: 1 });
        let mut factor: i32 = 2;
        while factor <= limit {
            let mut carry: i32 = 0;
            let mut index: usize = 0;
            while index < words.len() {
                let product = words[index].value * factor + carry;
                words[index] = NumericWireDigit {
                    value: product % 10000,
                };
                carry = product / 10000;
                index += 1;
            }
            while carry > 0 {
                words.push(NumericWireDigit {
                    value: carry % 10000,
                });
                carry = carry / 10000;
            }
            factor = factor + 1;
        }
        let mut index = words.len();
        let mut output = String::new();
        while index > 0 {
            index = index - 1;
            let word = words[index].value;
            if index + 1 == words.len() {
                output.push_str(text_number(word, 10).as_str());
            } else {
                let thousands = word / 1000;
                let hundreds = (word / 100) % 10;
                let tens = (word / 10) % 10;
                let ones = word % 10;
                output.push(char::from_u32((thousands + 48) as u32).unwrap_or('0'));
                output.push(char::from_u32((hundreds + 48) as u32).unwrap_or('0'));
                output.push(char::from_u32((tens + 48) as u32).unwrap_or('0'));
                output.push(char::from_u32((ones + 48) as u32).unwrap_or('0'));
            };
        }
        return NumericValue::Value(output);
    }
    NumericValue::Unknown
}
