fn numeric_size_below(value: &str, limit: &str) -> bool {
    numeric_work_magnitude(
        numeric_work_from_value(value),
        numeric_work_from_value(limit),
    ) < 0
}

pub fn sql__pg_catalog__pg_size_pretty__axtn(input: NumericValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
    let mut condition_flavor_15_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_15_4 < 1 { condition_flavor_15_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_15_4 = 2; }; if numeric_unknown_input_1 || numeric_unimplemented_input_2 {
        return text_unresolved(condition_flavor_15_4);
    }
    let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
    if numeric_null_input_3 {
        return TextValue::Null;
    }
    if let NumericValue::Value(value_numeric) = input {
        let value = numeric_text(&value_numeric);
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return text_unresolved(unresolved_flavor);
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
                if let NumericValue::Value(number_numeric) = divided {
                    let number = numeric_text(&number_numeric);
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
                    if let NumericValue::Value(number_numeric) = divided {
                        let number = numeric_text(&number_numeric);
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
                if let NumericValue::Value(number_numeric) = rounded {
                    let number = numeric_text(&number_numeric);
                    amount = number;
                }
            }
        };
        amount.push(' ');
        amount.push_str(INTEGER_SIZE_UNITS[unit]);
        return TextValue::Value(amount);
    }
    text_unresolved(unresolved_flavor)
}
