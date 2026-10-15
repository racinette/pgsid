fn jsonpath_radix_literal(source: &JsonpathScanSource, radix: i32) -> TextValue {
    let mut position: usize = 2;
    while position < source.characters.len()
        && (source.characters[position] == '0' || source.characters[position] == '_')
    {
        position += 1;
    }
    if position == source.characters.len() {
        return TextValue::Value("0".to_owned());
    };
    let mut words: Vec<usize> = Vec::new();
    words.push(0);
    while position < source.characters.len() {
        let mut factor: i64 = 1i64;
        let mut chunk: i64 = 0i64;
        let base = radix as i64;
        while position < source.characters.len() && factor <= 268435456i64 / base {
            let character = source.characters[position];
            position += 1;
            if character != '_' {
                let digit = jsonpath_scan_hex(character) as i64;
                chunk = chunk * base + digit;
                factor = factor * base;
            };
        }
        let mut index: usize = 0;
        let mut carry = chunk;
        while index < words.len() {
            let word = words[index] as i32;
            let combined = (word as i64) * factor + carry;
            words[index] = usize::try_from((combined % 10000i64) as i32).unwrap_or(0);
            carry = combined / 10000i64;
            index += 1;
        }
        while carry > 0i64 {
            words.push(usize::try_from((carry % 10000i64) as i32).unwrap_or(0));
            carry = carry / 10000i64;
        }
        if words.len() > 32768 {
            return TextValue::Error(make_sql_error(JSONPATH_PARSE_RANGE));
        };
    }
    let mut output = String::new();
    let mut index = words.len();
    let mut leading = true;
    while index > 0 {
        index = index - 1;
        let word = words[index] as i32;
        let mut divisor: i32 = 1000;
        while divisor > 0 {
            let digit = (word / divisor) % 10;
            if leading == false || digit > 0 || divisor == 1 {
                output.push(char::from_u32((48 + digit) as u32).unwrap_or(' '));
                leading = false;
            };
            divisor = divisor / 10;
        }
    }
    TextValue::Value(output)
}

fn jsonpath_numeric_literal(input: &str) -> TextValue {
    let source = JsonpathScanSource {
        characters: input.chars().collect(),
    };
    if source.characters.len() > 2 && source.characters[0] == '0' {
        let prefix = source.characters[1];
        let mut radix: i32 = 0;
        if prefix == 'x' || prefix == 'X' {
            radix = 16;
        };
        if prefix == 'o' || prefix == 'O' {
            radix = 8;
        };
        if prefix == 'b' || prefix == 'B' {
            radix = 2;
        };
        if radix > 0 {
            return jsonpath_radix_literal(&source, radix);
        };
    };
    let mut clean = String::new();
    if source.characters[0] == '.' {
        clean.push('0');
    };
    let mut position: usize = 0;
    while position < source.characters.len() {
        let character = source.characters[position];
        let mut append_character = character != '_';
        if character == '.'
            && (position + 1 == source.characters.len()
                || source.characters[position + 1] == 'e'
                || source.characters[position + 1] == 'E')
        {
            append_character = false;
        };
        if append_character {
            clean.push(character);
        };
        position += 1;
    }
    let parsed = jsonb_from_text(TextValue::Value(clean));
    jsonb_to_text(parsed)
}

fn jsonpath_regex_literal(pattern: &str, flags: i32, c_collation: bool) -> BoolValue {
    let quoted = flags >= 16;
    if quoted == false && c_collation == false {
        return BoolValue::Unknown;
    };
    let mut syntax = Syntax::Advanced;
    let mut newline = NewlineMode::Stop;
    if quoted {
        syntax = Syntax::Literal;
        newline = NewlineMode::Ordinary;
    } else {
        let dotall = (flags / 2) % 2 == 1;
        let multiline = (flags / 4) % 2 == 1;
        if dotall && multiline {
            newline = NewlineMode::Anchors;
        } else if dotall {
            newline = NewlineMode::Ordinary;
        } else if multiline {
            newline = NewlineMode::Sensitive;
        };
    };
    let result = compile(
        pattern,
        RegexOptions {
            syntax: syntax,
            case_sensitive: flags % 2 == 0,
            expanded: false,
            newline: newline,
        },
    );
    if let CompileOutcome::InvalidPattern = result {
        return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
    };
    if let CompileOutcome::Compiled(_) = result {
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}

pub fn jsonpath_validate_utf8(input: TextValue, c_collation: bool) -> BoolValue {
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let TextValue::Null = input {
        return BoolValue::Null;
    };
    if let TextValue::Value(value) = input {
        let tree = jsonpath_parse(value.as_str());
        let mut index: usize = 0;
        while index < tree.validation.len() {
            let node = tree.nodes[tree.validation[index]];
            let mut literal = String::new();
            let mut position = node.text_start;
            while position < node.text_end {
                if node.kind == JSONPATH_NODE_NUMBER {
                    literal.push(tree.source[position]);
                } else {
                    literal.push(tree.text[position]);
                };
                position += 1;
            }
            if node.kind == JSONPATH_NODE_NUMBER {
                let result = jsonpath_numeric_literal(literal.as_str());
                if let TextValue::Error(error) = result {
                    return BoolValue::Error(error);
                };
                if let TextValue::Unknown = result {
                    return BoolValue::Unknown;
                };
            } else {
                let result = jsonpath_regex_literal(literal.as_str(), node.flags, c_collation);
                if let BoolValue::Error(error) = result {
                    return BoolValue::Error(error);
                };
                if let BoolValue::Unknown = result {
                    return BoolValue::Unknown;
                };
            };
            index += 1;
        }
        if tree.error != 0 {
            return BoolValue::Error(make_sql_error(tree.error));
        };
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}
