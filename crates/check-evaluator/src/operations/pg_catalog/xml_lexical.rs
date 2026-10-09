struct XmlSource {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct XmlScan {
    next: usize,
    valid: bool,
}

#[derive(Clone, Copy)]
struct XmlSpan {
    start: usize,
    end: usize,
}

#[derive(Clone, Copy)]
struct XmlAttribute {
    name: XmlSpan,
    value: XmlSpan,
    arena: bool,
}

#[derive(Clone, Copy)]
struct XmlNamespace {
    prefix: XmlSpan,
    depth: usize,
    arena: bool,
}

fn xml_origin_span(
    source: &XmlSource,
    arena: &XmlEntityArena,
    span: XmlSpan,
    in_arena: bool,
) -> String {
    if in_arena {
        let text = arena.arena.as_str();
        let stored = XmlSource {
            characters: text.chars().collect(),
        };
        return xml_source_range(&stored, span);
    }
    xml_source_range(source, span)
}

fn xml_character(character: char) -> bool {
    let code = character as i32;
    code == 9
        || code == 10
        || code == 13
        || (code >= 32 && code <= 55295)
        || (code >= 57344 && code <= 65533)
        || (code >= 65536 && code <= 1114111)
}

fn xml_space(character: char) -> bool {
    character == ' ' || character == '\t' || character == '\n' || character == '\r'
}

fn xml_character_octets(character: char) -> i32 {
    let code = character as i32;
    if code < 128 {
        return 1;
    }
    if code < 2048 {
        return 2;
    }
    if code < 65536 {
        return 3;
    }
    4
}

fn xml_consumed(source: &XmlSource, start: usize, end: usize) -> i64 {
    let mut consumed: i64 = 0i64;
    let mut index = start;
    while index < end {
        let bytes = xml_character_octets(source.characters[index]);
        consumed = consumed + bytes as i64;
        index += 1;
    }
    consumed
}

fn xml_amplified(source: &XmlSource, end: usize, cost: i64) -> bool {
    cost > 1000000i64 && cost / 5i64 > xml_consumed(source, 0, end)
}

#[derive(Clone, Copy)]
struct XmlAttributeScan {
    next: usize,
    valid: bool,
    cost: i64,
}

#[derive(Clone, Copy)]
struct XmlParsedEntity {
    index: usize,
    nodes: XmlNodeList,
    cost: i64,
}

#[derive(Clone)]
struct XmlEntityCache {
    entries: Vec<XmlParsedEntity>,
}

fn xml_new_entity_cache() -> XmlEntityCache {
    let entries: Vec<XmlParsedEntity> = Vec::new();
    XmlEntityCache { entries: entries }
}

#[derive(Clone)]
struct XmlMarkupResult {
    valid: bool,
    cost: i64,
    nodes: XmlNodeList,
    cache: Vec<XmlParsedEntity>,
}

fn xml_markup_invalid() -> XmlMarkupResult {
    XmlMarkupResult {
        valid: false,
        cost: 0i64,
        nodes: xml_empty_nodes(),
        cache: xml_new_entity_cache().entries,
    }
}

fn xml_octets(input: &str) -> i64 {
    let characters: Vec<char> = input.chars().collect();
    let mut bytes: i64 = 0i64;
    let mut index: usize = 0;
    while index < characters.len() {
        let code = characters[index] as i32;
        if code < 128 {
            bytes = bytes + 1i64;
        } else if code < 2048 {
            bytes = bytes + 2i64;
        } else if code < 65536 {
            bytes = bytes + 3i64;
        } else {
            bytes = bytes + 4i64;
        };
        index += 1;
    }
    bytes
}

fn xml_name_start(character: char) -> bool {
    let code = character as i32;
    character == ':'
        || character == '_'
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || (code >= 192 && code <= 214)
        || (code >= 216 && code <= 246)
        || (code >= 248 && code <= 767)
        || (code >= 880 && code <= 893)
        || (code >= 895 && code <= 8191)
        || (code >= 8204 && code <= 8205)
        || (code >= 8304 && code <= 8591)
        || (code >= 11264 && code <= 12271)
        || (code >= 12289 && code <= 55295)
        || (code >= 63744 && code <= 64975)
        || (code >= 65008 && code <= 65533)
        || (code >= 65536 && code <= 983039)
}

fn xml_name_character(character: char) -> bool {
    let code = character as i32;
    xml_name_start(character)
        || character == '-'
        || character == '.'
        || (code >= 48 && code <= 57)
        || code == 183
        || (code >= 768 && code <= 879)
        || (code >= 8255 && code <= 8256)
}

fn xml_at(source: &XmlSource, position: usize, literal: &str) -> bool {
    let expected: Vec<char> = literal.chars().collect();
    if position > source.characters.len() || expected.len() > source.characters.len() - position {
        return false;
    }
    let mut index: usize = 0;
    while index < expected.len() {
        if source.characters[position + index] != expected[index] {
            return false;
        }
        index += 1;
    }
    true
}

fn xml_skip_space(source: &XmlSource, start: usize) -> usize {
    let mut position = start;
    while position < source.characters.len() && xml_space(source.characters[position]) {
        position += 1;
    }
    position
}

fn xml_name(source: &XmlSource, start: usize) -> XmlScan {
    let mut position = start;
    if position >= source.characters.len() || xml_name_start(source.characters[position]) == false {
        return XmlScan {
            next: position,
            valid: false,
        };
    }
    position += 1;
    while position < source.characters.len() && xml_name_character(source.characters[position]) {
        position += 1;
    }
    let mut bytes: i32 = 0;
    let mut index = start;
    while index < position {
        let code = source.characters[index] as i32;
        if code < 128 {
            bytes = bytes + 1;
        } else if code < 2048 {
            bytes = bytes + 2;
        } else if code < 65536 {
            bytes = bytes + 3;
        } else {
            bytes = bytes + 4;
        };
        if bytes > 50000 {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        index += 1;
    }
    XmlScan {
        next: position,
        valid: true,
    }
}

fn xml_span_equal(source: &XmlSource, left: XmlSpan, right: XmlSpan) -> bool {
    if left.end - left.start != right.end - right.start {
        return false;
    }
    let mut position: usize = 0;
    while position < left.end - left.start {
        if source.characters[left.start + position] != source.characters[right.start + position] {
            return false;
        }
        position += 1;
    }
    true
}

fn xml_span_is(source: &XmlSource, span: XmlSpan, literal: &str) -> bool {
    let characters: Vec<char> = literal.chars().collect();
    span.end - span.start == characters.len() && xml_at(source, span.start, literal)
}

fn xml_attribute_prefix(source: &XmlSource, name: XmlSpan) -> XmlSpan {
    let empty = XmlSpan {
        start: name.start,
        end: name.start,
    };
    let mut colon = name.end;
    let mut position = name.start;
    while position < name.end {
        if source.characters[position] == ':' {
            if colon != name.end {
                return empty;
            }
            colon = position;
        }
        position += 1;
    }
    if colon == name.start || colon + 1 >= name.end {
        return empty;
    }
    if xml_name_start(source.characters[colon + 1]) == false {
        return empty;
    }
    XmlSpan {
        start: name.start,
        end: colon,
    }
}

fn xml_attribute_text(source: &XmlSource, value: XmlSpan, arena: &XmlEntityArena) -> String {
    let mut output = String::new();
    let mut position = value.start;
    while position < value.end {
        let mut character = source.characters[position];
        let mut append_character = true;
        if character == '&' {
            let reference = xml_reference(source, position);
            if xml_predefined_reference(source, position) == false {
                let name = xml_source_range(
                    source,
                    XmlSpan {
                        start: position + 1,
                        end: reference.next - 1,
                    },
                );
                let expanded = xml_expand_entity(
                    arena,
                    name.as_str(),
                    true,
                    0,
                    0i64,
                    xml_octets(arena.arena.as_str()),
                );
                output.push_str(expanded.text.as_str());
                position = reference.next;
                append_character = false;
            } else if xml_at(source, position, "&#") {
                position += 2;
                let mut radix: i32 = 10;
                if source.characters[position] == 'x' {
                    radix = 16;
                    position += 1;
                }
                let mut code: i32 = 0;
                while position + 1 < reference.next {
                    let number = source.characters[position] as i32;
                    let mut digit = number - 48;
                    if number >= 97 {
                        digit = number - 87;
                    } else if number >= 65 {
                        digit = number - 55;
                    };
                    code = code * radix + digit;
                    position += 1;
                }
                character = char::from_u32(code as u32).unwrap_or(' ');
            } else if xml_at(source, position, "&amp;") {
                character = '&';
            } else if xml_at(source, position, "&lt;") {
                character = '<';
            } else if xml_at(source, position, "&gt;") {
                character = '>';
            } else if xml_at(source, position, "&quot;") {
                character = '"';
            } else {
                character = '\'';
            };
            position = reference.next;
        } else {
            if character == '\r' {
                if position + 1 < value.end && source.characters[position + 1] == '\n' {
                    position += 1;
                }
                character = ' ';
            } else if character == '\n' || character == '\t' {
                character = ' ';
            };
            position += 1;
        };
        if append_character {
            output.push(character);
        }
    }
    output
}

#[derive(Clone, Copy)]
struct XmlCommentBuffer {
    bytes: i32,
    capacity: i32,
    allocated: bool,
    valid: bool,
}

fn xml_comment_flush(buffer: XmlCommentBuffer, pending: i32) -> XmlCommentBuffer {
    if pending == 0 {
        return buffer;
    }
    let bytes = buffer.bytes + pending;
    if bytes > 10000000 {
        return XmlCommentBuffer {
            bytes: bytes,
            capacity: buffer.capacity,
            allocated: buffer.allocated,
            valid: false,
        };
    }
    let mut capacity = buffer.capacity;
    if buffer.allocated == false {
        capacity = pending + 4096;
    } else if bytes + 1 >= capacity {
        capacity = capacity + bytes + 4096;
    };
    XmlCommentBuffer {
        bytes: bytes,
        capacity: capacity,
        allocated: true,
        valid: true,
    }
}

fn xml_comment_append(buffer: XmlCommentBuffer, character: char) -> XmlCommentBuffer {
    let mut capacity = buffer.capacity;
    if buffer.bytes + 5 >= capacity {
        if capacity >= 10000000 {
            return XmlCommentBuffer {
                bytes: buffer.bytes,
                capacity: capacity,
                allocated: true,
                valid: false,
            };
        }
        capacity = capacity + (capacity + 1) / 2;
        if capacity > 10000000 {
            capacity = 10000000;
        }
    }
    XmlCommentBuffer {
        bytes: buffer.bytes + xml_character_octets(character),
        capacity: capacity,
        allocated: true,
        valid: true,
    }
}

fn xml_comment(source: &XmlSource, start: usize) -> XmlScan {
    let mut position = start + 4;
    let mut buffer = XmlCommentBuffer {
        bytes: 0,
        capacity: 4096,
        allocated: false,
        valid: true,
    };
    let mut pending: i32 = 0;
    let mut slow = false;
    while position < source.characters.len() {
        if source.characters[position] == '-' && xml_at(source, position, "--") {
            if slow == false {
                buffer = xml_comment_flush(buffer, pending);
            }
            return XmlScan {
                next: position + 3,
                valid: buffer.valid && xml_at(source, position, "-->"),
            };
        }
        let character = source.characters[position];
        if xml_character(character) == false {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        if slow == false && character == '-' {
            buffer = xml_comment_flush(buffer, pending);
            pending = 0;
        }
        let crlf = character == '\r'
            && position + 1 < source.characters.len()
            && source.characters[position + 1] == '\n';
        if slow == false && (character as i32 >= 128 || character == '\r') {
            buffer = xml_comment_flush(buffer, pending);
            pending = 0;
            if crlf == false {
                slow = true;
            }
        }
        if slow {
            buffer = xml_comment_append(buffer, character);
        } else {
            pending = pending + 1;
        };
        if buffer.valid == false {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        if crlf {
            position += 1;
        }
        position += 1;
    }
    XmlScan {
        next: position,
        valid: false,
    }
}

fn xml_processing_instruction(source: &XmlSource, start: usize) -> XmlScan {
    let target = xml_name(source, start + 2);
    if target.valid == false {
        return target;
    }
    let mut position = target.next;
    if position - start == 5 {
        let first = source.characters[start + 2];
        let second = source.characters[start + 3];
        let third = source.characters[start + 4];
        if (first == 'x' || first == 'X')
            && (second == 'm' || second == 'M')
            && (third == 'l' || third == 'L')
        {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
    }
    if position < source.characters.len()
        && source.characters[position] == '?'
        && xml_at(source, position, "?>")
    {
        return XmlScan {
            next: position + 2,
            valid: true,
        };
    }
    if position >= source.characters.len() || xml_space(source.characters[position]) == false {
        return XmlScan {
            next: position,
            valid: false,
        };
    }
    position = xml_skip_space(source, position);
    let mut bytes: i32 = 0;
    while position < source.characters.len() {
        if position < source.characters.len()
            && source.characters[position] == '?'
            && xml_at(source, position, "?>")
        {
            return XmlScan {
                next: position + 2,
                valid: true,
            };
        }
        let character = source.characters[position];
        if xml_character(character) == false {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        if bytes >= 9999995 {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        let code = character as i32;
        if code < 128 {
            bytes = bytes + 1;
        } else if code < 2048 {
            bytes = bytes + 2;
        } else if code < 65536 {
            bytes = bytes + 3;
        } else {
            bytes = bytes + 4;
        };
        if character == '\r'
            && position + 1 < source.characters.len()
            && source.characters[position + 1] == '\n'
        {
            position += 1;
        }
        position += 1;
    }
    XmlScan {
        next: position,
        valid: false,
    }
}

fn xml_cdata(source: &XmlSource, start: usize) -> XmlScan {
    let mut position = start + 9;
    let mut bytes: i32 = 0;
    while position < source.characters.len() {
        if source.characters[position] == ']' && xml_at(source, position, "]]>") {
            return XmlScan {
                next: position + 3,
                valid: true,
            };
        }
        if xml_character(source.characters[position]) == false {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        if bytes >= 9999995 {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        bytes = bytes + xml_character_octets(source.characters[position]);
        if source.characters[position] == '\r'
            && position + 1 < source.characters.len()
            && source.characters[position + 1] == '\n'
        {
            position += 1;
        }
        position += 1;
    }
    XmlScan {
        next: position,
        valid: false,
    }
}

fn xml_reference(source: &XmlSource, start: usize) -> XmlScan {
    let mut position = start + 1;
    if position < source.characters.len() && source.characters[position] == '#' {
        position += 1;
        let mut radix: i32 = 10;
        if position < source.characters.len() && source.characters[position] == 'x' {
            radix = 16;
            position += 1;
        }
        let begin = position;
        let mut code: i32 = 0;
        while position < source.characters.len() && source.characters[position] != ';' {
            let character = source.characters[position];
            let number = character as i32;
            let mut digit: i32 = 16;
            if number >= 48 && number <= 57 {
                digit = character as i32 - 48;
            } else if number >= 97 && number <= 102 {
                digit = character as i32 - 87;
            } else if number >= 65 && number <= 70 {
                digit = character as i32 - 55;
            };
            if digit >= radix || code > 1114111 / radix {
                return XmlScan {
                    next: position,
                    valid: false,
                };
            }
            code = code * radix + digit;
            if code > 1114111 {
                return XmlScan {
                    next: position,
                    valid: false,
                };
            }
            position += 1;
        }
        if position == begin
            || position >= source.characters.len()
            || (code >= 55296 && code <= 57343)
            || xml_character(char::from_u32(code as u32).unwrap_or('\0')) == false
        {
            return XmlScan {
                next: position,
                valid: false,
            };
        }
        return XmlScan {
            next: position + 1,
            valid: true,
        };
    }
    let name = xml_name(source, position);
    if name.valid == false
        || name.next >= source.characters.len()
        || source.characters[name.next] != ';'
    {
        return XmlScan {
            next: name.next,
            valid: false,
        };
    }
    XmlScan {
        next: name.next + 1,
        valid: true,
    }
}

fn xml_predefined_reference(source: &XmlSource, start: usize) -> bool {
    xml_at(source, start, "&#")
        || xml_at(source, start, "&amp;")
        || xml_at(source, start, "&lt;")
        || xml_at(source, start, "&gt;")
        || xml_at(source, start, "&quot;")
        || xml_at(source, start, "&apos;")
}

fn xml_parse_attribute(
    source: &XmlSource,
    start: usize,
    arena: &XmlEntityArena,
    entity_depth: usize,
    prior_cost: i64,
    input_start: usize,
    normalize: bool,
    owned: bool,
) -> XmlAttributeScan {
    let mut position = start;
    let mut cost = prior_cost;
    if position >= source.characters.len()
        || (source.characters[position] != '\'' && source.characters[position] != '"')
    {
        return XmlAttributeScan {
            next: position,
            valid: false,
            cost: cost,
        };
    }
    let quote = source.characters[position];
    position += 1;
    while position < source.characters.len() && source.characters[position] != quote {
        let character = source.characters[position];
        if character == '<' || xml_character(character) == false {
            return XmlAttributeScan {
                next: position,
                valid: false,
                cost: cost,
            };
        }
        if character == '&' {
            let reference = xml_reference(source, position);
            if reference.valid == false {
                return XmlAttributeScan {
                    next: reference.next,
                    valid: false,
                    cost: cost,
                };
            }
            if xml_predefined_reference(source, position) == false {
                let name = xml_source_range(
                    source,
                    XmlSpan {
                        start: position + 1,
                        end: reference.next - 1,
                    },
                );
                let consumed = xml_consumed(source, input_start, reference.next);
                let expanded =
                    xml_expand_entity(arena, name.as_str(), true, entity_depth, cost, consumed);
                cost = cost + expanded.cost;
                if expanded.valid == false {
                    return XmlAttributeScan {
                        next: reference.next,
                        valid: false,
                        cost: cost,
                    };
                }
            }
            position = reference.next;
        } else {
            position += 1;
        };
    }
    let mut valid = position < source.characters.len();
    let bound = xml_consumed(source, start + 1, position) + cost - prior_cost;
    if valid && bound > 9999996i64 {
        let buffer = xml_walk_value(
            source,
            XmlSpan {
                start: start + 1,
                end: position,
            },
            xml_new_value(owned),
            arena,
            normalize,
            0,
            false,
        );
        valid = buffer.valid;
    }
    XmlAttributeScan {
        next: position + 1,
        valid: valid,
        cost: cost,
    }
}

fn xml_markup(
    source: &XmlSource,
    start: usize,
    document: bool,
    arena: &XmlEntityArena,
    base_depth: usize,
    entity_depth: usize,
    input_cache: XmlEntityCache,
) -> XmlMarkupResult {
    if entity_depth >= 20 || base_depth >= 256 {
        return xml_markup_invalid();
    }
    let mut position = start;
    let mut stack: Vec<XmlSpan> = Vec::new();
    let mut depth: usize = 0;
    let mut roots: usize = 0;
    let mut cost: i64 = 0i64;
    if entity_depth == 0 {
        cost = arena.cost;
    }
    let mut namespaces: Vec<XmlNamespace> = Vec::new();
    let mut namespace_count: usize = 0;
    let mut text = xml_new_text();
    let mut cache = input_cache;
    while position < source.characters.len() {
        let character = source.characters[position];
        if xml_character(character) == false {
            return xml_markup_invalid();
        }
        if character == '<' {
            if xml_at(source, position, "<!--") {
                let comment = xml_comment(source, position);
                if comment.valid == false {
                    return xml_markup_invalid();
                }
                position = comment.next;
                text = xml_text_event(text, 0, 0i64, depth == 0);
            } else if xml_at(source, position, "<?") {
                let instruction = xml_processing_instruction(source, position);
                if instruction.valid == false {
                    return xml_markup_invalid();
                }
                position = instruction.next;
                text = xml_text_event(text, 0, 0i64, depth == 0);
            } else if xml_at(source, position, "<![CDATA[") {
                if document && depth == 0 {
                    return xml_markup_invalid();
                }
                let cdata = xml_cdata(source, position);
                if cdata.valid == false {
                    return xml_markup_invalid();
                }
                let bytes = xml_normalized_octets(source, position + 9, cdata.next - 3);
                text = xml_text_event(text, 2, bytes, depth == 0);
                position = cdata.next;
            } else if xml_at(source, position, "</") {
                let begin = position + 2;
                let name = xml_name(source, begin);
                if name.valid == false || depth == 0 {
                    return xml_markup_invalid();
                }
                let closing = XmlSpan {
                    start: begin,
                    end: name.next,
                };
                if xml_span_equal(source, stack[depth - 1], closing) == false {
                    return xml_markup_invalid();
                }
                position = xml_skip_space(source, name.next);
                if position >= source.characters.len() || source.characters[position] != '>' {
                    return xml_markup_invalid();
                }
                depth = depth - 1;
                text = xml_reset_text(text);
                while namespace_count > 0 && namespaces[namespace_count - 1].depth > depth {
                    namespace_count = namespace_count - 1;
                }
                position += 1;
            } else {
                let begin = position + 1;
                let name = xml_name(source, begin);
                if name.valid == false
                    || depth + base_depth >= 256
                    || (document == false && depth + base_depth >= 255)
                {
                    return xml_markup_invalid();
                }
                let opening = XmlSpan {
                    start: begin,
                    end: name.next,
                };
                text = xml_text_event(text, 0, 0i64, depth == 0);
                if depth == 0 {
                    roots += 1;
                    if document && roots > 1 {
                        return xml_markup_invalid();
                    }
                }
                position = name.next;
                let mut attributes: Vec<XmlAttribute> = Vec::new();
                let mut ended = false;
                let mut empty = false;
                while ended == false {
                    let spaced = xml_skip_space(source, position);
                    if xml_at(source, spaced, "/>") {
                        position = spaced + 2;
                        ended = true;
                        empty = true;
                    } else if spaced < source.characters.len() && source.characters[spaced] == '>' {
                        if depth < stack.len() {
                            stack[depth] = opening;
                        } else {
                            stack.push(opening);
                        };
                        depth += 1;
                        position = spaced + 1;
                        ended = true;
                    } else {
                        if spaced == position {
                            return xml_markup_invalid();
                        }
                        let attribute = xml_name(source, spaced);
                        if attribute.valid == false {
                            return xml_markup_invalid();
                        }
                        let attribute_name = XmlSpan {
                            start: spaced,
                            end: attribute.next,
                        };
                        let equals = xml_skip_space(source, attribute.next);
                        if equals >= source.characters.len() || source.characters[equals] != '=' {
                            return xml_markup_invalid();
                        }
                        let quoted = xml_skip_space(source, equals + 1);
                        let tokenized =
                            xml_attribute_tokenized(source, arena, opening, attribute_name);
                        let value = xml_parse_attribute(
                            source,
                            quoted,
                            arena,
                            entity_depth,
                            cost,
                            0,
                            tokenized,
                            false,
                        );
                        cost = value.cost;
                        if value.valid == false {
                            return xml_markup_invalid();
                        }
                        position = value.next;
                        attributes.push(XmlAttribute {
                            name: attribute_name,
                            value: XmlSpan {
                                start: quoted + 1,
                                end: value.next - 1,
                            },
                            arena: false,
                        });
                    };
                }
                let element_name = xml_source_range(source, opening);
                let mut default_index: usize = 0;
                while default_index < arena.defaults.len() {
                    let attribute = arena.defaults[default_index];
                    let element = xml_origin_span(source, arena, attribute.element, true);
                    if attribute.has_default && element == element_name {
                        let default_name = xml_origin_span(source, arena, attribute.name, true);
                        let default_source = XmlSource {
                            characters: default_name.as_str().chars().collect(),
                        };
                        let mut present = false;
                        let mut explicit: usize = 0;
                        while explicit < attributes.len() {
                            let name = xml_origin_span(
                                source,
                                arena,
                                attributes[explicit].name,
                                attributes[explicit].arena,
                            );
                            if name == default_name && xml_at(&default_source, 0, "xmlns:") == false
                            {
                                present = true;
                            }
                            explicit += 1;
                        }
                        if present == false {
                            cost = cost + attribute.cost + 20i64;
                            if xml_amplified(source, position, cost) {
                                return xml_markup_invalid();
                            }
                            attributes.push(XmlAttribute {
                                name: attribute.name,
                                value: attribute.value,
                                arena: true,
                            });
                        }
                    }
                    default_index += 1;
                }
                let previous_namespaces = namespace_count;
                let mut index: usize = 0;
                let mut binding_depth = depth;
                if empty {
                    binding_depth += 1;
                }
                while index < attributes.len() {
                    let attribute = attributes[index];
                    let attribute_name =
                        xml_origin_span(source, arena, attribute.name, attribute.arena);
                    let attribute_source = XmlSource {
                        characters: attribute_name.as_str().chars().collect(),
                    };
                    let prefix = xml_attribute_prefix(
                        &attribute_source,
                        XmlSpan {
                            start: 0,
                            end: attribute_source.characters.len(),
                        },
                    );
                    if xml_span_is(&attribute_source, prefix, "xmlns") {
                        let declared = XmlSpan {
                            start: attribute.name.start + prefix.end + 1,
                            end: attribute.name.end,
                        };
                        let declared_name =
                            xml_origin_span(source, arena, declared, attribute.arena);
                        let mut uri = String::new();
                        if attribute.arena {
                            uri = xml_origin_span(source, arena, attribute.value, true);
                        } else {
                            uri = xml_attribute_text(source, attribute.value, arena);
                            let mut declaration: usize = 0;
                            while declaration < arena.defaults.len() {
                                let declared = arena.defaults[declaration];
                                if declared.tokenized {
                                    let owner =
                                        xml_origin_span(source, arena, declared.element, true);
                                    let declared_attribute =
                                        xml_origin_span(source, arena, declared.name, true);
                                    if owner == element_name && declared_attribute == attribute_name
                                    {
                                        uri = xml_collapse_space(uri.as_str());
                                    }
                                }
                                declaration += 1;
                            }
                        };
                        if declared_name != "xml"
                            && (attribute.arena
                                || (declared_name != "xmlns"
                                    && uri != ""
                                    && uri != "http://www.w3.org/XML/1998/namespace"
                                    && uri != "http://www.w3.org/2000/xmlns/"))
                        {
                            let mut previous = previous_namespaces;
                            let mut present = false;
                            while previous < namespace_count {
                                let previous_name = xml_origin_span(
                                    source,
                                    arena,
                                    namespaces[previous].prefix,
                                    namespaces[previous].arena,
                                );
                                if previous_name == declared_name {
                                    if attribute.arena == false {
                                        return xml_markup_invalid();
                                    }
                                    present = true;
                                }
                                previous += 1;
                            }
                            if present == false {
                                let binding = XmlNamespace {
                                    prefix: declared,
                                    depth: binding_depth,
                                    arena: attribute.arena,
                                };
                                if namespace_count < namespaces.len() {
                                    namespaces[namespace_count] = binding;
                                } else {
                                    namespaces.push(binding);
                                };
                                namespace_count += 1;
                            }
                        }
                    }
                    index += 1;
                }
                index = 0;
                while index < attributes.len() {
                    let attribute = attributes[index];
                    let name = xml_origin_span(source, arena, attribute.name, attribute.arena);
                    let attribute_source = XmlSource {
                        characters: name.as_str().chars().collect(),
                    };
                    let prefix = xml_attribute_prefix(
                        &attribute_source,
                        XmlSpan {
                            start: 0,
                            end: attribute_source.characters.len(),
                        },
                    );
                    let prefix_name = xml_source_range(&attribute_source, prefix);
                    let mut bound = prefix.start == prefix.end || prefix_name == "xml";
                    let mut namespace: usize = 0;
                    while namespace < namespace_count {
                        let namespace_name = xml_origin_span(
                            source,
                            arena,
                            namespaces[namespace].prefix,
                            namespaces[namespace].arena,
                        );
                        if namespace_name == prefix_name {
                            bound = true;
                        }
                        namespace += 1;
                    }
                    if bound && prefix_name != "xmlns" {
                        let mut previous: usize = 0;
                        while previous < index {
                            let previous_name = xml_origin_span(
                                source,
                                arena,
                                attributes[previous].name,
                                attributes[previous].arena,
                            );
                            if previous_name == name {
                                return xml_markup_invalid();
                            }
                            previous += 1;
                        }
                    }
                    index += 1;
                }
                if empty {
                    namespace_count = previous_namespaces;
                }
            };
        } else if character == '&' {
            if document && depth == 0 {
                return xml_markup_invalid();
            }
            let reference = xml_reference(source, position);
            if reference.valid == false {
                return xml_markup_invalid();
            }
            if xml_predefined_reference(source, position) == false {
                let name = xml_source_range(
                    source,
                    XmlSpan {
                        start: position + 1,
                        end: reference.next - 1,
                    },
                );
                let index = xml_entity_lookup(arena, name.as_str(), false);
                let mut entry: usize = 0;
                while entry < cache.entries.len() && cache.entries[entry].index != index {
                    entry += 1;
                }
                if entry < cache.entries.len() {
                    let cached = cache.entries[entry];
                    text = xml_text_entity(text, cached.nodes, depth == 0);
                    cost = cost + cached.cost;
                } else {
                    let expanded =
                        xml_expand_entity(arena, name.as_str(), false, entity_depth, 0i64, 0i64);
                    if expanded.valid == false {
                        return xml_markup_invalid();
                    }
                    let content = expanded.text.as_str();
                    let fragment = XmlSource {
                        characters: content.chars().collect(),
                    };
                    let mut parent_depth = base_depth + depth;
                    if document == false {
                        parent_depth += 1;
                    }
                    let nested = xml_markup(
                        &fragment,
                        0,
                        false,
                        arena,
                        parent_depth,
                        entity_depth + 1,
                        cache,
                    );
                    if nested.valid == false {
                        return xml_markup_invalid();
                    }
                    text = xml_text_entity(text, nested.nodes, depth == 0);
                    let expansion_cost = nested.cost + expanded.cost;
                    cost = cost + expansion_cost;
                    let mut entries = nested.cache;
                    if nested.nodes.count > 0 && index < arena.entities.len() {
                        entries.push(XmlParsedEntity {
                            index: index,
                            nodes: nested.nodes,
                            cost: expansion_cost,
                        });
                    }
                    cache = XmlEntityCache { entries: entries };
                };
                if xml_amplified(source, reference.next, cost) {
                    return xml_markup_invalid();
                }
            } else {
                let scalar = xml_reference_scalar(source, position);
                let width = xml_character_octets(scalar);
                text = xml_text_event(text, 1, width as i64, depth == 0);
            };
            position = reference.next;
        } else {
            if (character == ']' && xml_at(source, position, "]]>"))
                || (document && depth == 0 && xml_space(character) == false)
            {
                return xml_markup_invalid();
            }
            if document && depth == 0 {
                position += 1;
            } else {
                let scanned = xml_text_plain(source, position, text, depth == 0);
                text = scanned.state;
                position = scanned.next;
            };
        };
        if text.valid == false {
            return xml_markup_invalid();
        }
    }
    XmlMarkupResult {
        valid: depth == 0 && (document == false || roots == 1),
        cost: cost,
        nodes: text.nodes,
        cache: cache.entries,
    }
}
