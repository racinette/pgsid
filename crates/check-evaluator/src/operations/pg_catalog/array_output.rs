pub fn array_boolean_output(input: BoolValue) -> TextValue {
    if let BoolValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == BoolValue::Null {
        return TextValue::Null;
    };
    if let BoolValue::Value(value) = input {
        if value {
            return make_text_value("t");
        };
        return make_text_value("f");
    };
    TextValue::Unknown
}

pub fn array_numeric_output(input: NumericValue) -> TextValue {
    if let NumericValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == NumericValue::Null {
        return TextValue::Null;
    };
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid {
            return TextValue::Value(numeric_work_text(work));
        };
    };
    TextValue::Unknown
}

fn array_float_number_output(number: f64, negative: bool) -> TextValue {
    if number != number {
        return make_text_value("NaN");
    };
    let infinity = 1.0f64 / 0.0f64;
    if number == infinity {
        return make_text_value("Infinity");
    };
    if number == 0.0f64 - infinity {
        return make_text_value("-Infinity");
    };
    if number == 0.0f64 {
        if negative {
            return make_text_value("-0");
        };
        return make_text_value("0");
    };
    let absolute = number.abs();
    if absolute >= 1.0f64 && absolute <= 9.0f64 {
        let digit = absolute as i32;
        if (digit as f64) == absolute {
            let mut output = String::new();
            if negative {
                output.push('-');
            };
            let text = text_number(digit, 10);
            output.push_str(text.as_str());
            return TextValue::Value(output);
        };
    };
    TextValue::Unknown
}

pub fn array_float4_output(input: Float4Value) -> TextValue {
    if let Float4Value::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == Float4Value::Null {
        return TextValue::Null;
    };
    if input == Float4Value::UnspecifiedNan {
        return make_text_value("NaN");
    };
    if let Float4Value::Value(bits) = input {
        return array_float_number_output(float4_number(bits), bits < 0);
    };
    TextValue::Unknown
}

pub fn array_float8_output(input: Float8Value) -> TextValue {
    if let Float8Value::Error(error) = input {
        return TextValue::Error(error);
    };
    if input == Float8Value::Null {
        return TextValue::Null;
    };
    if input == Float8Value::UnspecifiedNan {
        return make_text_value("NaN");
    };
    if let Float8Value::Value(bits) = input {
        return array_float_number_output(float8_number(bits), bits < 0i64);
    };
    TextValue::Unknown
}

pub fn array_contextual_output(input: ArrayElement) -> TextValue {
    if let ArrayElement::Error(error) = input {
        return TextValue::Error(error);
    };
    if let ArrayElement::Null = input {
        return TextValue::Null;
    };
    TextValue::Unknown
}

pub fn array_network_output(input: NetworkValue, cidr: bool) -> TextValue {
    if cidr {
        return network_output(input, 1);
    };
    network_output(input, 2)
}

fn array_output_quote(input: &str, delimiter: char) -> String {
    let characters: Vec<char> = input.chars().collect();
    let mut quote = characters.len() == 0;
    if characters.len() == 4 {
        quote = characters[0].to_ascii_lowercase() == 'n'
            && characters[1].to_ascii_lowercase() == 'u'
            && characters[2].to_ascii_lowercase() == 'l'
            && characters[3].to_ascii_lowercase() == 'l';
    };
    let mut position: usize = 0;
    while position < characters.len() {
        let ch = characters[position];
        if ch == '"'
            || ch == '\\'
            || ch == '{'
            || ch == '}'
            || ch == delimiter
            || ch == ' '
            || ch == '\t'
            || ch == '\n'
            || ch == '\r'
            || ch == '\x0b'
            || ch == '\x0c'
        {
            quote = true;
        };
        position += 1;
    }
    let mut output = String::new();
    if quote {
        output.push('"');
    };
    position = 0;
    while position < characters.len() {
        let ch = characters[position];
        if ch == '"' || ch == '\\' {
            output.push('\\');
        };
        output.push(ch);
        position += 1;
    }
    if quote {
        output.push('"');
    };
    output
}

pub fn finish_array_output(
    input: ArrayOutputPayload,
    rendered: ArrayArguments,
    box_delimiter: bool,
) -> TextValue {
    if input.state == -2 {
        return TextValue::Error(input.error);
    };
    if input.state == 0 {
        return TextValue::Null;
    };
    if input.state != 1 {
        return TextValue::Unknown;
    };
    if let ArrayArguments::Error(error) = rendered {
        return TextValue::Error(error);
    };
    if let ArrayArguments::Value(values) = rendered {
        if values.elements.len() != input.elements.len() {
            return TextValue::Unknown;
        };
        if values.elements.len() == 0 {
            return make_text_value("{}");
        };
        let mut partial = false;
        let mut pending: usize = 0;
        while pending < values.elements.len() {
            let text = array_element_to_text(values.elements[pending].clone());
            if text == TextValue::NonNull { partial = true; };
            if text == TextValue::Unknown { return TextValue::Unknown; };
            if let TextValue::Error(error) = text { return TextValue::Error(error); };
            pending += 1;
        }
        if partial { return TextValue::NonNull; };
        let mut delimiter = ',';
        if box_delimiter {
            delimiter = ';';
        };
        let mut bounds = false;
        let mut depth: usize = 0;
        while depth < input.dimensions.len() {
            if input.dimensions[depth].lower != 1 {
                bounds = true;
            };
            depth += 1;
        }
        let mut output = String::new();
        if bounds {
            depth = 0;
            while depth < input.dimensions.len() {
                let dimension = input.dimensions[depth];
                let lower = int8_to_text(make_int8_value(dimension.lower as i64));
                let upper = int8_to_text(make_int8_value(
                    (dimension.lower as i64) + (dimension.length as i64) - 1i64,
                ));
                if let TextValue::Value(first) = lower {
                    if let TextValue::Value(last) = upper {
                        output.push('[');
                        output.push_str(first.as_str());
                        output.push(':');
                        output.push_str(last.as_str());
                        output.push(']');
                    };
                };
                depth += 1;
            }
            output.push('=');
        };
        let mut position: usize = 0;
        let mut reopen = input.dimensions.len();
        while position < values.elements.len() {
            while reopen > 0 {
                output.push('{');
                reopen = reopen - 1;
            }
            let element = values.elements[position].clone();
            let mut is_null = false;
            if let ArrayElement::Null = element {
                output.push_str("NULL");
                is_null = true;
            };
            if is_null == false {
                let text = array_element_to_text(element);
                let mut known = false;
                if let TextValue::Value(value) = text {
                    let escaped = array_output_quote(value.as_str(), delimiter);
                    output.push_str(escaped.as_str());
                    known = true;
                };
                if known == false {
                    return TextValue::Unknown;
                };
            };
            position += 1;
            depth = input.dimensions.len();
            let mut stride: i32 = 1;
            while depth > 0 {
                depth = depth - 1;
                let length = input.dimensions[depth].length;
                stride = stride * length;
                if (position as i32) % stride != 0 {
                    output.push(delimiter);
                    break;
                };
                output.push('}');
                reopen += 1;
            }
        }
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
