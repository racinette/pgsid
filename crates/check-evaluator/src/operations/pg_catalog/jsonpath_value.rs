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

fn jsonpath_value_from_tree(tree: JsonpathParseTree) -> JsonpathValue {
    let mut characters: Vec<char> = Vec::new();
    let mut nodes: Vec<JsonpathNode> = Vec::new();
    let mut position: usize = 0;
    while position < tree.text.len() {
        characters.push(tree.text[position]);
        position += 1;
    }
    position = 0;
    while position < tree.nodes.len() {
        let node = tree.nodes[position];
        nodes.push(JsonpathNode {
            kind: node.kind,
            next: node.next,
            left: node.left,
            right: node.right,
            text_start: node.text_start,
            text_end: node.text_end,
            first: node.first,
            last: node.last,
            flags: node.flags,
        });
        position += 1;
    }
    let mut index: usize = 0;
    while index < tree.validation.len() {
        let number = tree.validation[index];
        let node = nodes[number];
        let mut literal = String::new();
        position = node.text_start;
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
                return JsonpathValue::Error(error);
            };
            if let TextValue::Unknown = result {
                return JsonpathValue::Unknown;
            };
            if let TextValue::Value(normalized) = result {
                let text: Vec<char> = normalized.chars().collect();
                let begin = characters.len();
                position = 0;
                while position < text.len() {
                    characters.push(text[position]);
                    position += 1;
                }
                nodes[number] = jsonpath_number_node(node.next, begin, characters.len());
            };
        };
        index += 1;
    }
    if tree.error != 0 {
        return JsonpathValue::Error(make_sql_error(tree.error));
    };
    index = 1;
    while index < nodes.len() {
        let node = nodes[index];
        if node.kind == JSONPATH_NODE_PLUS || node.kind == JSONPATH_NODE_MINUS {
            let child = nodes[node.left];
            if child.kind == JSONPATH_NODE_NUMBER && child.next == 0 {
                let mut begin = child.text_start;
                let mut end = child.text_end;
                if node.kind == JSONPATH_NODE_MINUS {
                    let mut number = String::new();
                    position = begin;
                    while position < end {
                        number.push(characters[position]);
                        position += 1;
                    }
                    let result = sql__pg_catalog__numeric_uminus__wcmy(NumericValue::Value(number));
                    let mut valid = false;
                    if let NumericValue::Value(negated) = result {
                        valid = true;
                        let text: Vec<char> = negated.chars().collect();
                        begin = characters.len();
                        position = 0;
                        while position < text.len() {
                            characters.push(text[position]);
                            position += 1;
                        }
                        end = characters.len();
                    };
                    if valid == false {
                        return JsonpathValue::Unknown;
                    };
                };
                nodes[index] = jsonpath_number_node(node.next, begin, end);
            };
        };
        index += 1;
    }
    JsonpathValue::Value(JsonpathPayload {
        characters: characters,
        nodes: nodes,
        root: tree.root,
        lax: tree.lax,
    })
}

fn jsonpath_number_node(next: usize, begin: usize, end: usize) -> JsonpathNode {
    JsonpathNode {
        kind: JSONPATH_NODE_NUMBER,
        next: next,
        left: 0,
        right: 0,
        text_start: begin,
        text_end: end,
        first: 0,
        last: 0,
        flags: 0,
    }
}

pub fn jsonpath_from_coerced_text_utf8(input: TextValue) -> JsonpathValue {
    if let TextValue::Error(error) = input {
        return JsonpathValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonpathValue::Null;
    };
    if let TextValue::Value(value) = input {
        let tree = jsonpath_parse(value.as_str());
        let result = jsonpath_value_from_tree(tree);
        if let JsonpathValue::Error(_) = result {
            return JsonpathValue::Unknown;
        };
        return result;
    };
    JsonpathValue::Unknown
}
