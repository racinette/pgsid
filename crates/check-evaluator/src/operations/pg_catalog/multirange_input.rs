pub fn multirange_from_text(
    input: TextValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> MultirangeValue {
    if let TextValue::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    if let TextValue::Null = input {
        return MultirangeValue::Null;
    };
    if let TextValue::Value(text) = input {
        let chars: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < chars.len() && range_input_space(chars[position]) {
            position += 1;
        }
        if position >= chars.len() {
            return MultirangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        if chars[position] != '{' {
            return MultirangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        position += 1;
        let mut state: i32 = 0;
        let mut seen = false;
        let mut member = String::new();
        let mut ranges: Vec<RangeValue> = Vec::new();
        while position < chars.len() && state != 6 {
            let ch = chars[position];
            if state >= 1 && state <= 4 {
                member.push(ch);
            };
            if range_input_space(ch) == false {
                if state == 0 {
                    if ch == '[' || ch == '(' {
                        member = String::new();
                        member.push(ch);
                        state = 1;
                    } else {
                        if ch == '}' && seen == false {
                            state = 6;
                        } else {
                            let mut empty = false;
                            if position + 4 < chars.len() {
                                empty = (chars[position] == 'e' || chars[position] == 'E')
                                    && (chars[position + 1] == 'm' || chars[position + 1] == 'M')
                                    && (chars[position + 2] == 'p' || chars[position + 2] == 'P')
                                    && (chars[position + 3] == 't' || chars[position + 3] == 'T')
                                    && (chars[position + 4] == 'y' || chars[position + 4] == 'Y');
                            };
                            if empty == false {
                                return MultirangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                            };
                            position += 4;
                            seen = true;
                            state = 5;
                        };
                    };
                } else if state == 1 {
                    if ch == ')' || ch == ']' {
                        let parsed = range_from_text(
                            TextValue::Value(member.clone()),
                            range_type,
                            element_type,
                            element_kind,
                        );
                        if let RangeValue::Error(error) = parsed {
                            return MultirangeValue::Error(error);
                        };
                        let mut known = false;
                        if let RangeValue::Value(payload) = parsed {
                            known = true;
                            if payload.empty == false {
                                ranges.push(RangeValue::Value(payload));
                            };
                        };
                        if known == false {
                            return MultirangeValue::Unknown;
                        };
                        seen = true;
                        state = 5;
                    } else if ch == '"' {
                        state = 3;
                    } else if ch == '\\' {
                        state = 2;
                    };
                } else if state == 2 {
                    state = 1;
                } else if state == 3 {
                    if ch == '"' {
                        if position + 1 < chars.len() && chars[position + 1] == '"' {
                            member.push('"');
                            position += 1;
                        } else {
                            state = 1;
                        };
                    } else if ch == '\\' {
                        state = 4;
                    };
                } else if state == 4 {
                    state = 3;
                } else {
                    if ch == ',' {
                        state = 0;
                    } else if ch == '}' {
                        state = 6;
                    } else {
                        return MultirangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
                    };
                };
            };
            position += 1;
        }
        if state != 6 {
            return MultirangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        while position < chars.len() && range_input_space(chars[position]) {
            position += 1;
        }
        if position != chars.len() {
            return MultirangeValue::Error(make_sql_error(RANGE_INPUT_SYNTAX));
        };
        return multirange_construct_normalize(MultirangePayload {
            type_name: type_name.to_owned(),
            range_type: range_type.to_owned(),
            element_type: element_type.to_owned(),
            element_kind,
            support: range_builtin_support(range_type, element_type, element_kind),
            ranges,
        });
    };
    MultirangeValue::Unknown
}
