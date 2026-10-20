pub fn multirange_to_text(input: MultirangeValue) -> TextValue {
    if let MultirangeValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return TextValue::Null;
    };
    if let MultirangeValue::Value(payload) = input {
        let mut output = String::new();
        output.push('{');
        let mut index: usize = 0;
        while index < payload.ranges.len() {
            let member = range_to_text(payload.ranges[index].clone());
            if let TextValue::Error(error) = member {
                return TextValue::Error(error);
            };
            let mut known = false;
            if let TextValue::Value(text) = member {
                if index > 0 {
                    output.push(',');
                };
                output.push_str(text.as_str());
                known = true;
            };
            if known == false {
                return TextValue::Unknown;
            };
            index += 1;
        }
        output.push('}');
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
