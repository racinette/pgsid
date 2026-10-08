fn numeric_size_below(value: &str, limit: &str) -> bool {
    numeric_work_magnitude(
        numeric_work_from_value(value),
        numeric_work_from_value(limit),
    ) < 0
}

pub fn sql__pg_catalog__pg_size_pretty__axtn(input: NumericValue) -> TextValue {
    if let NumericValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == NumericValue::Unknown {
        return TextValue::Unknown;
    }
    if input == NumericValue::Null {
        return TextValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return TextValue::Unknown;
        }
        let mut amount = numeric_work_text(work.clone());
        let mut unit: usize = 0;
        if work.special != 1 {
            unit = 5;
        } else {
            if numeric_size_below(amount.as_str(), "10240") == false {
                let divided = numeric_division(
                    make_numeric_value(amount.as_str()),
                    make_numeric_value("512"),
                    1,
                );
                if let NumericValue::Error(error) = divided {
                    return TextValue::Error(error);
                }
                if let NumericValue::Value(number) = divided {
                    amount = number;
                }
                unit = 1;
                while unit < 5 && numeric_size_below(amount.as_str(), "20479") == false {
                    let divided = numeric_division(
                        make_numeric_value(amount.as_str()),
                        make_numeric_value("1024"),
                        1,
                    );
                    if let NumericValue::Error(error) = divided {
                        return TextValue::Error(error);
                    }
                    if let NumericValue::Value(number) = divided {
                        amount = number;
                    }
                    unit += 1;
                }
                let layout = numeric_parts(amount.as_str());
                let mut subtract: i32 = 0;
                if layout.sign < 0 {
                    subtract = 1;
                }
                let adjusted = numeric_arithmetic(
                    make_numeric_value(amount.as_str()),
                    make_numeric_value("1"),
                    subtract,
                );
                let rounded = numeric_division(adjusted, make_numeric_value("2"), 1);
                if let NumericValue::Error(error) = rounded {
                    return TextValue::Error(error);
                }
                if let NumericValue::Value(number) = rounded {
                    amount = number;
                }
            }
        };
        amount.push(' ');
        amount.push_str(INTEGER_SIZE_UNITS[unit]);
        return TextValue::Value(amount);
    }
    TextValue::Unknown
}
