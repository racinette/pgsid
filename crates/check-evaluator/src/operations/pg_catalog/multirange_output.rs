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

pub fn multirange_output_initial(input: MultirangeValue) -> TextValue {
    if let MultirangeValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return TextValue::Null;
    };
    if let MultirangeValue::Value(_payload) = input {
        return make_text_value("{");
    };
    TextValue::Unknown
}

pub fn multirange_output_continues(count: Int4Value, index: Int4Value, output: TextValue) -> bool {
    if let TextValue::Value(_text) = output {
        if let Int4Value::Value(length) = count {
            if let Int4Value::Value(position) = index {
                return position >= 0 && position < length;
            };
        };
    };
    false
}

pub fn multirange_output_append(
    output: TextValue,
    member: TextValue,
    index: Int4Value,
) -> TextValue {
    if let TextValue::Error(error) = output {
        return TextValue::Error(error);
    };
    if let TextValue::Null = output {
        return TextValue::Null;
    };
    if let TextValue::Value(initial) = output {
        let mut text = initial;
        if let TextValue::Error(error) = member {
            return TextValue::Error(error);
        };
        if let TextValue::Value(value) = member {
            if let Int4Value::Value(position) = index {
                if position > 0 {
                    text.push(',');
                };
                text.push_str(value.as_str());
                return TextValue::Value(text);
            };
        };
    };
    TextValue::Unknown
}

pub fn multirange_output_finish(input: TextValue) -> TextValue {
    if let TextValue::Value(initial) = input {
        let mut text = initial;
        text.push('}');
        return TextValue::Value(text);
    };
    input
}
