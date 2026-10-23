const SQLSTATE_XML_DATETIME_RANGE: u32 = 3452552;

pub fn xml_element_value_escape(input: TextValue, escape: bool) -> TextValue {
    if escape == false { return input; };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.as_str().chars().collect();
        let mut output = String::new();
        let mut index: usize = 0;
        while index < characters.len() {
            let character = characters[index];
            if character == '&' { output.push_str("&amp;"); }
            else if character == '<' { output.push_str("&lt;"); }
            else if character == '>' { output.push_str("&gt;"); }
            else if character == '\r' { output.push_str("&#x0d;"); }
            else { output.push(character); };
            index += 1;
        }
        return TextValue::Value(output);
    };
    input
}

pub fn xml_element_append(left: TextValue, right: TextValue) -> TextValue {
    if let TextValue::Error(error) = left { return TextValue::Error(error); };
    if let TextValue::Error(error) = right { return TextValue::Error(error); };
    if let TextValue::Null = right { return left; };
    if let TextValue::Null = left { return right; };
    if let TextValue::Value(a) = left {
        if let TextValue::Value(b) = right {
            let mut result = a;
            result.push_str(b.as_str());
            return TextValue::Value(result);
        };
    };
    TextValue::Unknown
}

fn xml_element_character_reference(code: i32) -> String {
    let hex: Vec<char> = "0123456789ABCDEF".chars().collect();
    let mut divisor: i32 = 1048576;
    while divisor > 1 && divisor > code { divisor = divisor / 16; }
    let mut output = "&#x".to_owned();
    while divisor > 0 {
        let word = (code / divisor) % 16;
        let digit = usize::try_from(word).unwrap_or(0);
        output.push(hex[digit]);
        divisor = divisor / 16;
    }
    output.push(';');
    output
}

pub fn xml_element_attribute(name: &str, mapped: bool, implicit: bool, input: TextValue, utf8: bool) -> TextValue {
    if let TextValue::Value(value) = input {
        if xml_text_encoding_available(value.as_str(),utf8) == false { return TextValue::Unknown; };
        let mut target = name.to_owned();
        if mapped == false { target = xml_constructor_mapped_name(name,implicit); };
        let mut output = " ".to_owned();
        output.push_str(target.as_str());
        output.push_str("=\"");
        let characters: Vec<char> = value.as_str().chars().collect();
        let mut index: usize = 0;
        while index < characters.len() {
            let character = characters[index];
            let code = character as i32;
            if character == '&' { output.push_str("&amp;"); }
            else if character == '<' { output.push_str("&lt;"); }
            else if character == '>' { output.push_str("&gt;"); }
            else if character == '"' { output.push_str("&quot;"); }
            else if character == '\r' { output.push_str("&#13;"); }
            else if character == '\n' { output.push_str("&#10;"); }
            else if character == '\t' { output.push_str("&#9;"); }
            else if code < 32 || code == 65534 || code == 65535 { output.push_str("&#xFFFD;"); }
            else if code >= 128 {
                let reference = xml_element_character_reference(code);
                output.push_str(reference.as_str());
            }
            else { output.push(character); };
            index += 1;
        }
        output.push('"');
        return TextValue::Value(output);
    };
    input
}

pub fn xml_forest_part(name: &str, mapped: bool, implicit: bool, input: TextValue) -> TextValue {
    if let TextValue::Value(value) = input {
        let mut target = name.to_owned();
        if mapped == false { target = xml_constructor_mapped_name(name,implicit); };
        let mut output = "<".to_owned();
        output.push_str(target.as_str());
        output.push('>');
        output.push_str(value.as_str());
        output.push_str("</");
        output.push_str(target.as_str());
        output.push('>');
        return TextValue::Value(output);
    };
    input
}

pub fn xml_element_finish(name: &str, mapped: bool, attributes: TextValue, content: TextValue, validity: CheckOutcome) -> XmlValue {
    if let CheckOutcome::Error(error) = validity { return XmlValue::Error(error); };
    if let TextValue::Error(error) = attributes { return XmlValue::Error(error); };
    if let TextValue::Error(error) = content { return XmlValue::Error(error); };
    if validity == CheckOutcome::Unknown { return XmlValue::Unknown; };
    let mut target = name.to_owned();
    if mapped == false { target = xml_constructor_name(name); };
    if let TextValue::Value(attrs) = attributes {
        let mut output = "<".to_owned();
        output.push_str(target.as_str());
        output.push_str(attrs.as_str());
        if let TextValue::Null = content {
            output.push_str("/>");
            return make_xml_value(output.as_str());
        };
        if let TextValue::Value(body) = content {
            output.push('>');
            output.push_str(body.as_str());
            output.push_str("</");
            output.push_str(target.as_str());
            output.push('>');
            return make_xml_value(output.as_str());
        };
    };
    XmlValue::Unknown
}

pub fn xml_forest_finish(content: TextValue, validity: CheckOutcome) -> XmlValue {
    if let CheckOutcome::Error(error) = validity { return XmlValue::Error(error); };
    if let TextValue::Error(error) = content { return XmlValue::Error(error); };
    if validity == CheckOutcome::Unknown { return XmlValue::Unknown; };
    if let TextValue::Null = content { return XmlValue::Null; };
    if let TextValue::Value(value) = content { return make_xml_value(value.as_str()); };
    XmlValue::Unknown
}

pub fn xml_value_boolean(input: BoolValue) -> TextValue {
    if let BoolValue::Error(error) = input { return TextValue::Error(error); };
    if let BoolValue::Null = input { return TextValue::Null; };
    if let BoolValue::Value(value) = input {
        if value { return make_text_value("true"); };
        return make_text_value("false");
    };
    TextValue::Unknown
}

fn xml_value_calendar_text(input: JsonbInput) -> TextValue {
    if let JsonbInput::Error(error) = input { return TextValue::Error(error); };
    if let JsonbInput::Null = input { return TextValue::Null; };
    if let JsonbInput::Text(value) = input { return TextValue::Value(value); };
    TextValue::Unknown
}

pub fn xml_value_date(input: DateValue) -> TextValue {
    if let DateValue::Value(value) = input {
        if value == (-2147483647 - 1) || value == 2147483647 { return TextValue::Error(make_sql_error(SQLSTATE_XML_DATETIME_RANGE)); };
    };
    let text = jsonb_input_from_date(input);
    xml_value_calendar_text(text)
}

pub fn xml_value_timestamp(input: TimestampValue) -> TextValue {
    if let TimestampValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 { return TextValue::Error(make_sql_error(SQLSTATE_XML_DATETIME_RANGE)); };
    };
    let text = jsonb_input_from_timestamp(input);
    xml_value_calendar_text(text)
}

pub fn xml_value_timestamptz(input: TimestamptzValue) -> TextValue {
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 { return TextValue::Error(make_sql_error(SQLSTATE_XML_DATETIME_RANGE)); };
    };
    let text = jsonb_input_from_timestamptz(input);
    xml_value_calendar_text(text)
}

pub fn xml_value_binary(input: ByteaValue, mode: i32) -> TextValue {
    if let ByteaValue::Error(error) = input { return TextValue::Error(error); };
    if let ByteaValue::Null = input { return TextValue::Null; };
    if let ByteaValue::Value(value) = input {
        let characters: Vec<char> = value.as_str().chars().collect();
        if characters.len() == 0 { return make_text_value(""); };
        if mode == 1 {
            let mut output = String::new();
            let mut index: usize = 0;
            while index < characters.len() {
                let mut character = characters[index];
                let code = character as i32;
                if code >= 97 && code <= 102 {
                    let upper = code - 32;
                    character = char::from_u32(upper as u32).unwrap_or('0');
                };
                output.push(character);
                index += 1;
            }
            return TextValue::Value(output);
        };
        if mode == 2 {
            let encoded = bytea_base64_encode(value.as_str());
            let characters: Vec<char> = encoded.as_str().chars().collect();
            let mut output = String::new();
            let mut column: i32 = 0;
            let mut index: usize = 0;
            while index < characters.len() {
                let character = characters[index];
                if character != '\n' {
                    if column == 72 { output.push_str("\r\n"); column = 0; };
                    output.push(character);
                    column = column + 1;
                };
                index += 1;
            }
            return TextValue::Value(output);
        };
    };
    TextValue::Unknown
}

pub fn xml_array_output_initial(input: ArrayValue) -> TextValue {
    if let ArrayValue::Error(error) = input { return TextValue::Error(error); };
    if let ArrayValue::Null = input { return TextValue::Null; };
    if let ArrayValue::Value(_) = input { return make_text_value(""); };
    TextValue::Unknown
}
