fn jsonpath_regex_locale_neutral(pattern: &str, flags: i32) -> bool {
    if flags % 2 == 1 {
        return false;
    };
    if flags >= 16 {
        return true;
    };
    let characters: Vec<char> = pattern.chars().collect();
    let mut index: usize = 0;
    while index < characters.len() {
        if characters[index] == '[' || characters[index] == '\\' {
            return false;
        };
        if characters[index] == '(' && index + 1 < characters.len() && characters[index + 1] == '?'
        {
            return false;
        };
        index += 1;
    }
    true
}

fn jsonpath_regex_ascii_pattern(pattern: &str, quoted: bool) -> bool {
    let characters: Vec<char> = pattern.chars().collect();
    let mut index: usize = 0;
    while index < characters.len() {
        let character = characters[index];
        if character as i32 > 127 {
            return false;
        };
        if quoted == false && character == '\\' && index + 1 < characters.len() {
            let escaped = characters[index + 1];
            if escaped == 'u' || escaped == 'U' || escaped == 'x' || escaped == '0' {
                return false;
            };
            if numeric_wire_decimal_digit(escaped) >= 0
                && index + 2 < characters.len()
                && numeric_wire_decimal_digit(characters[index + 2]) >= 0
            {
                return false;
            };
            index += 1;
        };
        index += 1;
    }
    true
}

fn jsonpath_regex_predicate(
    context: &JsonpathExecutionContext,
    step: JsonpathNode,
    reference: JsonpathReference,
    input: TextValue,
) -> BoolValue {
    let node = jsonpath_execution_node(context, reference);
    if node.kind != 4 {
        return BoolValue::Null;
    };
    let insensitive = step.flags % 2 == 1;
    let quoted = step.flags >= 16;
    if context.c_collation == false && (quoted == false || insensitive) {
        return BoolValue::Unknown;
    };
    if let TextValue::Value(subject) = input {
        let mut pattern = String::new();
        let mut position = step.text_start;
        while position < step.text_end {
            pattern.push(context.path_characters[position]);
            position += 1;
        }
        let text: Vec<char> = subject.chars().collect();
        let mut ascii_subject = true;
        position = 0;
        while position < text.len() {
            if text[position] as i32 > 127 {
                ascii_subject = false;
            };
            position += 1;
        }
        let ascii_pattern = jsonpath_regex_ascii_pattern(pattern.as_str(), quoted);
        if context.utf8 == false && (ascii_subject == false || ascii_pattern == false) {
            return BoolValue::Unknown;
        };
        if jsonpath_regex_locale_neutral(pattern.as_str(), step.flags) == false {
            if context.ctype != 1 && (context.ctype == 2 && ascii_subject && ascii_pattern) == false
            {
                return BoolValue::Unknown;
            };
        };
        let result = find(
            pattern.as_str(),
            subject.as_str(),
            0,
            jsonpath_regex_options(step.flags),
        );
        if result == MatchOutcome::InvalidPattern {
            return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
        };
        if result == MatchOutcome::Uncertain {
            return BoolValue::Unknown;
        };
        return BoolValue::Value(result != MatchOutcome::NoMatch);
    };
    BoolValue::Unknown
}
