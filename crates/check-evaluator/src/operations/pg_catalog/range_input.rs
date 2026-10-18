const RANGE_INPUT_SYNTAX: u32 = 3484946;

fn range_input_space(ch: char) -> bool {
    ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\x0b' || ch == '\x0c'
}

fn range_input_bound(input: TextValue, kind: i32) -> ArrayElement {
    if kind == 2 || kind == 3 {
        return array_integer_text_element(input, kind);
    };
    if kind == 10 {
        return array_element_from_numeric(scalar_numeric_from_text(input));
    };
    if kind == 7 {
        return array_element_from_date(date_from_text(input));
    };
    if kind == 4 {
        return array_element_from_timestamp(timestamp_from_text(input));
    };
    if kind == 5 {
        return array_element_from_timestamptz(timestamptz_from_text(input));
    };
    ArrayElement::Unknown
}

pub fn range_from_text(
    input: TextValue,
    type_name: &str,
    element_type: &str,
    kind: i32,
) -> RangeValue {
    if let TextValue::Error(error) = input {
        return RangeValue::Error(error);
    };
    if let TextValue::Null = input {
        return RangeValue::Null;
    };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < chars.len() && range_input_space(chars[position]) {
            position += 1;
        }
        let mut end = chars.len();
        while end > position && range_input_space(chars[end - 1]) {
            end = end - 1;
        }
        if end - position == 5 {
            if (chars[position] == 'e' || chars[position] == 'E')
                && (chars[position + 1] == 'm' || chars[position + 1] == 'M')
                && (chars[position + 2] == 'p' || chars[position + 2] == 'P')
                && (chars[position + 3] == 't' || chars[position + 3] == 'T')
                && (chars[position + 4] == 'y' || chars[position + 4] == 'Y')
            {
                return range_from_coerced_bounds(
                    type_name,
                    element_type,
                    kind,
                    true,
                    false,
                    false,
                    ArrayElement::Null,
                    ArrayElement::Null,
                );
            };
        };
        if position >= end {
            return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        let opening = chars[position];
        if opening != '[' && opening != '(' {
            return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        position += 1;
        let mut lower_text = TextValue::Null;
        let mut upper_text = TextValue::Null;
        let mut bound: usize = 0;
        while bound < 2 {
            if position >= end {
                return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
            };
            let first = chars[position];
            let mut value = TextValue::Null;
            if first != ',' && first != ')' && first != ']' {
                let mut content = String::new();
                let mut quoted = false;
                let mut scanning = true;
                while scanning {
                    if position >= end {
                        return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                    };
                    let ch = chars[position];
                    if quoted == false && (ch == ',' || ch == ')' || ch == ']') {
                        scanning = false;
                    } else {
                        position += 1;
                        if ch == '\\' {
                            if position >= end {
                                return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                            };
                            content.push(chars[position]);
                            position += 1;
                        } else if ch == '"' {
                            if quoted && position < end && chars[position] == '"' {
                                content.push('"');
                                position += 1;
                            } else {
                                quoted = quoted == false;
                            };
                        } else {
                            content.push(ch);
                        };
                    };
                }
                value = TextValue::Value(content);
            };
            if bound == 0 {
                lower_text = value;
                if chars[position] != ',' {
                    return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                };
                position += 1;
            } else {
                upper_text = value;
            };
            bound += 1;
        }
        let closing = chars[position];
        if (closing != ')' && closing != ']') || position + 1 != end {
            return RangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        let lower = range_input_bound(lower_text, kind);
        if let ArrayElement::Error(error) = lower {
            return RangeValue::Error(error);
        };
        if let ArrayElement::Unknown = lower {
            return RangeValue::Unknown;
        };
        let upper = range_input_bound(upper_text, kind);
        if let ArrayElement::Error(error) = upper {
            return RangeValue::Error(error);
        };
        if let ArrayElement::Unknown = upper {
            return RangeValue::Unknown;
        };
        let mut flags = String::new();
        flags.push(opening);
        flags.push(closing);
        return range_builtin_construct(
            type_name,
            element_type,
            kind,
            lower,
            upper,
            make_text_value(flags.as_str()),
        );
    };
    RangeValue::Unknown
}
