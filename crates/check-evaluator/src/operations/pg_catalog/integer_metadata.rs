pub fn sql__pg_catalog__gist_translate_cmptype_common__ai1r(input: Int4Value) -> Int2Value {
    if let Int4Value::Error(error) = input {
        return Int2Value::Error(error);
    }
    if input == Int4Value::Unknown {
        return Int2Value::Unknown;
    }
    if input == Int4Value::Null {
        return Int2Value::Null;
    }
    if let Int4Value::Value(value) = input {
        if value == 1 {
            return Int2Value::Value(20);
        }
        if value == 2 {
            return Int2Value::Value(21);
        }
        if value == 3 {
            return Int2Value::Value(18);
        }
        if value == 4 {
            return Int2Value::Value(23);
        }
        if value == 5 {
            return Int2Value::Value(22);
        }
        if value == 7 {
            return Int2Value::Value(3);
        }
        if value == 8 {
            return Int2Value::Value(8);
        }
        return Int2Value::Value(0);
    }
    Int2Value::Unknown
}

pub fn sql__pg_catalog__pg_encoding_max_length__aj1r(input: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == Int4Value::Unknown {
        return Int4Value::Unknown;
    }
    if input == Int4Value::Null {
        return Int4Value::Null;
    }
    if let Int4Value::Value(value) = input {
        if value < 0 || value >= 42 {
            return Int4Value::Null;
        }
        if value == 4 || value == 6 || value == 7 || value == 39 {
            return Int4Value::Value(4);
        }
        if value == 1 || value == 2 || value == 3 || value == 5 || value == 40 {
            return Int4Value::Value(3);
        }
        if value >= 35 {
            return Int4Value::Value(2);
        }
        return Int4Value::Value(1);
    }
    Int4Value::Unknown
}

const INTEGER_SIZE_UNITS: &[&str] = &["bytes", "kB", "MB", "GB", "TB", "PB"];

pub fn sql__pg_catalog__pg_size_pretty__24qt(input: Int8Value) -> TextValue {
    if let Int8Value::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == Int8Value::Unknown {
        return TextValue::Unknown;
    }
    if input == Int8Value::Null {
        return TextValue::Null;
    }
    if let Int8Value::Value(value) = input {
        let mut amount = value;
        let mut unit: usize = 0;
        if amount <= -10240i64 || amount >= 10240i64 {
            amount = amount / 512i64;
            unit = 1;
            while unit < 5 && (amount <= -20479i64 || amount >= 20479i64) {
                amount = amount / 1024i64;
                unit += 1;
            }
            if amount < 0i64 {
                amount = (amount - 1i64) / 2i64;
            } else {
                amount = (amount + 1i64) / 2i64;
            };
        }
        let mut output = String::new();
        if amount < 0i64 {
            output.push('-');
            amount = 0i64 - amount;
        }
        let number = amount as i32;
        let formatted = text_number(number, 10);
        output.push_str(formatted.as_str());
        output.push(' ');
        output.push_str(INTEGER_SIZE_UNITS[unit]);
        return TextValue::Value(output);
    }
    TextValue::Unknown
}
