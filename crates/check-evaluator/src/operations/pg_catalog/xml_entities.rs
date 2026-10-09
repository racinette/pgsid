#[derive(Clone, Copy)]
struct XmlDtdFlags {
    valid: bool,
    external: bool,
    standalone: bool,
    parameter_seen: bool,
}

#[derive(Clone, Copy)]
struct XmlEntityIndex {
    name: XmlSpan,
    value: XmlSpan,
    parameter: bool,
    external: bool,
    unparsed: bool,
}

#[derive(Clone, Copy)]
struct XmlDefaultIndex {
    element: XmlSpan,
    name: XmlSpan,
    value: XmlSpan,
    tokenized: bool,
    has_default: bool,
    cost: i64,
}

fn xml_collapse_space(input: &str) -> String {
    let characters: Vec<char> = input.chars().collect();
    let mut output = String::new();
    let mut written = false;
    let mut pending = false;
    let mut position: usize = 0;
    while position < characters.len() {
        let character = characters[position];
        if character == ' ' {
            pending = written;
        } else {
            if pending {
                output.push(' ');
            }
            output.push(character);
            written = true;
            pending = false;
        };
        position += 1;
    }
    output
}

fn xml_register_attributes(
    input: XmlEntityArena,
    item: XmlDtdItem,
    depth: usize,
    input_start: usize,
) -> XmlEntityArena {
    let text = input.arena.as_str();
    let source = XmlSource {
        characters: text.chars().collect(),
    };
    let mut state = input;
    let mut position = xml_skip_space(&source, item.name.end);
    while position < item.next - 1 && state.flags.valid {
        let attribute = xml_parse_dtd_attribute(&source, position);
        if attribute.valid == false {
            return xml_dtd_invalid(state);
        }
        position = xml_skip_space(&source, attribute.next);
        let mut value = attribute.value;
        if attribute.has_default {
            let checked = xml_parse_attribute(
                &source,
                value.start - 1,
                &state,
                depth,
                state.cost,
                input_start,
                false,
                true,
            );
            if checked.valid == false {
                return xml_dtd_invalid(state);
            }
            state = xml_arena_cost(state, checked.cost);
            let mut decoded = xml_attribute_text(&source, value, &state);
            if attribute.tokenized {
                decoded = xml_collapse_space(decoded.as_str());
            }
            let mut storage = state.arena;
            let storage_characters: Vec<char> = storage.as_str().chars().collect();
            let start = storage_characters.len();
            let decoded_characters: Vec<char> = decoded.as_str().chars().collect();
            value = XmlSpan {
                start: start,
                end: start + decoded_characters.len(),
            };
            storage.push_str(decoded.as_str());
            state = XmlEntityArena {
                arena: storage,
                entities: state.entities,
                defaults: state.defaults,
                flags: state.flags,
                cost: state.cost,
            };
        }
        let mut declared = false;
        let mut index: usize = 0;
        while index < state.defaults.len() {
            let previous = state.defaults[index];
            if xml_span_equal(&source, previous.element, item.name)
                && xml_span_equal(&source, previous.name, attribute.name)
            {
                declared = true;
            }
            index += 1;
        }
        if declared == false {
            let mut defaults = state.defaults;
            let name_text = xml_source_range(&source, attribute.name);
            let prefix = xml_attribute_prefix(&source, attribute.name);
            let mut default_cost = xml_octets(name_text.as_str());
            if prefix.end > prefix.start {
                default_cost = default_cost - 1i64;
            }
            if attribute.has_default {
                let stored_text = state.arena.as_str();
                let stored_source = XmlSource {
                    characters: stored_text.chars().collect(),
                };
                let stored_value = xml_source_range(&stored_source, value);
                default_cost = default_cost + xml_octets(stored_value.as_str());
            }
            defaults.push(XmlDefaultIndex {
                element: item.name,
                name: attribute.name,
                value: value,
                tokenized: attribute.tokenized,
                has_default: attribute.has_default,
                cost: default_cost,
            });
            state = XmlEntityArena {
                arena: state.arena,
                entities: state.entities,
                defaults: defaults,
                flags: state.flags,
                cost: state.cost,
            };
        }
    }
    state
}

#[derive(Clone)]
struct XmlEntityArena {
    arena: String,
    entities: Vec<XmlEntityIndex>,
    defaults: Vec<XmlDefaultIndex>,
    flags: XmlDtdFlags,
    cost: i64,
}

#[derive(Clone)]
struct XmlExpansion {
    text: String,
    valid: bool,
    cost: i64,
}

fn xml_new_arena(input: &str, standalone: bool) -> XmlEntityArena {
    let entities: Vec<XmlEntityIndex> = Vec::new();
    let defaults: Vec<XmlDefaultIndex> = Vec::new();
    XmlEntityArena {
        arena: input.to_owned(),
        entities: entities,
        defaults: defaults,
        flags: XmlDtdFlags {
            valid: true,
            external: false,
            standalone: standalone,
            parameter_seen: false,
        },
        cost: 0i64,
    }
}

fn xml_dtd_with_flags(input: XmlEntityArena, flags: XmlDtdFlags) -> XmlEntityArena {
    XmlEntityArena {
        arena: input.arena,
        entities: input.entities,
        defaults: input.defaults,
        flags: flags,
        cost: input.cost,
    }
}

fn xml_arena_cost(input: XmlEntityArena, cost: i64) -> XmlEntityArena {
    XmlEntityArena {
        arena: input.arena,
        entities: input.entities,
        defaults: input.defaults,
        flags: input.flags,
        cost: cost,
    }
}

fn xml_dtd_invalid(input: XmlEntityArena) -> XmlEntityArena {
    let flags = input.flags;
    xml_dtd_with_flags(
        input,
        XmlDtdFlags {
            valid: false,
            external: flags.external,
            standalone: flags.standalone,
            parameter_seen: flags.parameter_seen,
        },
    )
}

fn xml_source_range(source: &XmlSource, span: XmlSpan) -> String {
    let mut output = String::new();
    let mut position = span.start;
    while position < span.end {
        output.push(source.characters[position]);
        position += 1;
    }
    output
}

fn xml_entity_lookup(arena: &XmlEntityArena, name: &str, parameter: bool) -> usize {
    let text = arena.arena.as_str();
    let source = XmlSource {
        characters: text.chars().collect(),
    };
    let mut index: usize = 0;
    while index < arena.entities.len() {
        let entity = arena.entities[index];
        if entity.parameter == parameter && xml_span_is(&source, entity.name, name) {
            return index;
        }
        index += 1;
    }
    index
}

fn xml_reference_scalar(source: &XmlSource, start: usize) -> char {
    if xml_at(source, start, "&#") {
        let mut position = start + 2;
        let mut radix: i32 = 10;
        if source.characters[position] == 'x' {
            radix = 16;
            position += 1;
        }
        let mut code: i32 = 0;
        while position < source.characters.len() && source.characters[position] != ';' {
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
        return char::from_u32(code as u32).unwrap_or(' ');
    }
    if xml_at(source, start, "&amp;") {
        return '&';
    }
    if xml_at(source, start, "&lt;") {
        return '<';
    }
    if xml_at(source, start, "&gt;") {
        return '>';
    }
    if xml_at(source, start, "&quot;") {
        return '"';
    }
    '\''
}

#[derive(Clone)]
struct XmlEntityValue {
    text: String,
    valid: bool,
    parameter_seen: bool,
}

fn xml_decode_entity_value(
    source: &XmlSource,
    arena: &XmlEntityArena,
    value: XmlSpan,
) -> XmlEntityValue {
    let invalid = XmlEntityValue {
        text: String::new(),
        valid: false,
        parameter_seen: false,
    };
    let mut output = String::new();
    let mut position = value.start;
    let mut bytes: i64 = 0i64;
    while position < value.end {
        let character = source.characters[position];
        if xml_character(character) == false {
            return invalid;
        }
        if character == '&' && xml_at(source, position, "&#") {
            let reference = xml_reference(source, position);
            if reference.valid == false || reference.next > value.end {
                return invalid;
            }
            if bytes > 9999996i64 {
                return invalid;
            }
            let scalar = xml_reference_scalar(source, position);
            let width = xml_character_octets(scalar);
            bytes = bytes + width as i64;
            output.push(scalar);
            position = reference.next;
        } else if character == '&' {
            let reference = xml_reference(source, position);
            if reference.valid == false || reference.next > value.end {
                return invalid;
            }
            while position < reference.next {
                let width = xml_character_octets(source.characters[position]);
                bytes = bytes + width as i64;
                if bytes > 10000000i64 {
                    return invalid;
                }
                output.push(source.characters[position]);
                position += 1;
            }
        } else if character == '%' {
            let name = xml_name(source, position + 1);
            if name.valid == false || name.next >= value.end || source.characters[name.next] != ';'
            {
                return invalid;
            }
            let spelling = xml_source_range(
                source,
                XmlSpan {
                    start: position + 1,
                    end: name.next,
                },
            );
            let entity = xml_entity_lookup(arena, spelling.as_str(), true);
            if entity < arena.entities.len() || arena.flags.standalone {
                return invalid;
            }
            return XmlEntityValue {
                text: output,
                valid: true,
                parameter_seen: true,
            };
        } else {
            let width = xml_character_octets(character);
            bytes = bytes + width as i64;
            if bytes > 10000000i64 {
                return invalid;
            }
            output.push(character);
            position += 1;
        };
    }
    XmlEntityValue {
        text: output,
        valid: true,
        parameter_seen: false,
    }
}

fn xml_register_entity(input: XmlEntityArena, item: XmlDtdItem, depth: usize) -> XmlEntityArena {
    let text = input.arena.as_str();
    let source = XmlSource {
        characters: text.chars().collect(),
    };
    let name = xml_source_range(&source, item.name);
    let parameter = item.kind == 4;
    let mut state = input;
    let mut value = item.value;
    if item.external == false {
        if depth >= 19 {
            return xml_dtd_invalid(state);
        }
        let decoded = xml_decode_entity_value(&source, &state, item.value);
        if decoded.valid == false {
            return xml_dtd_invalid(state);
        }
        if decoded.parameter_seen {
            let flags = state.flags;
            state = xml_dtd_with_flags(
                state,
                XmlDtdFlags {
                    valid: flags.valid,
                    external: flags.external,
                    standalone: flags.standalone,
                    parameter_seen: true,
                },
            );
        }
        let mut storage = state.arena;
        let start = source.characters.len();
        storage.push_str(decoded.text.as_str());
        let decoded_characters: Vec<char> = decoded.text.chars().collect();
        value = XmlSpan {
            start: start,
            end: start + decoded_characters.len(),
        };
        state = XmlEntityArena {
            arena: storage,
            entities: state.entities,
            defaults: state.defaults,
            flags: state.flags,
            cost: state.cost,
        };
    }
    if xml_entity_lookup(&state, name.as_str(), parameter) < state.entities.len() {
        return state;
    }
    if item.external && xml_normalized_octets(&source, item.value.start, item.value.end) > 2000i64 {
        if parameter == false
            && (name == "amp" || name == "lt" || name == "gt" || name == "apos" || name == "quot")
        {
            return state;
        }
        return xml_dtd_invalid(state);
    }
    let mut entries = state.entities;
    entries.push(XmlEntityIndex {
        name: item.name,
        value: value,
        parameter: parameter,
        external: item.external,
        unparsed: item.unparsed,
    });
    XmlEntityArena {
        arena: state.arena,
        entities: entries,
        defaults: state.defaults,
        flags: state.flags,
        cost: state.cost,
    }
}

fn xml_expand_entity(
    arena: &XmlEntityArena,
    name: &str,
    attribute: bool,
    depth: usize,
    prior_cost: i64,
    consumed: i64,
) -> XmlExpansion {
    let invalid = XmlExpansion {
        text: String::new(),
        valid: false,
        cost: 0i64,
    };
    if depth >= 19 {
        return invalid;
    }
    let index = xml_entity_lookup(arena, name, false);
    if index == arena.entities.len() {
        if arena.flags.standalone
            || (arena.flags.external == false && arena.flags.parameter_seen == false)
        {
            return invalid;
        }
        return XmlExpansion {
            text: String::new(),
            valid: true,
            cost: 0i64,
        };
    }
    let entity = arena.entities[index];
    if entity.unparsed || (attribute && entity.external) {
        return invalid;
    }
    if entity.external {
        return XmlExpansion {
            text: String::new(),
            valid: true,
            cost: 20i64,
        };
    }
    let text = arena.arena.as_str();
    let source = XmlSource {
        characters: text.chars().collect(),
    };
    if attribute == false {
        let value = xml_source_range(&source, entity.value);
        let cost = xml_octets(value.as_str()) + 20i64;
        return XmlExpansion {
            text: value,
            valid: true,
            cost: cost,
        };
    }
    let mut output = String::new();
    let mut position = entity.value.start;
    let raw = xml_source_range(&source, entity.value);
    let mut cost = xml_octets(raw.as_str()) + 20i64;
    if prior_cost + cost > 1000000i64 && (prior_cost + cost) / 5i64 > consumed {
        return invalid;
    }
    while position < entity.value.end {
        let character = source.characters[position];
        if character == '&' {
            let reference = xml_reference(&source, position);
            if reference.valid == false || reference.next > entity.value.end {
                return invalid;
            }
            if xml_predefined_reference(&source, position) {
                if attribute {
                    output.push(xml_reference_scalar(&source, position));
                } else {
                    let spelling = xml_source_range(
                        &source,
                        XmlSpan {
                            start: position,
                            end: reference.next,
                        },
                    );
                    output.push_str(spelling.as_str());
                };
            } else {
                let spelling = xml_source_range(
                    &source,
                    XmlSpan {
                        start: position + 1,
                        end: reference.next - 1,
                    },
                );
                let expanded = xml_expand_entity(
                    arena,
                    spelling.as_str(),
                    attribute,
                    depth + 1,
                    prior_cost + cost,
                    consumed,
                );
                if expanded.valid == false {
                    return invalid;
                }
                output.push_str(expanded.text.as_str());
                cost = cost + expanded.cost;
            };
            position = reference.next;
        } else {
            if attribute && character == '<' {
                return invalid;
            }
            if attribute && xml_space(character) {
                output.push(' ');
                if character == '\r'
                    && position + 1 < entity.value.end
                    && source.characters[position + 1] == '\n'
                {
                    position += 1;
                }
            } else {
                output.push(character);
            };
            position += 1;
        };
        if prior_cost + cost > 1000000i64 && (prior_cost + cost) / 5i64 > consumed {
            return invalid;
        }
    }
    if prior_cost + cost > 1000000i64 && (prior_cost + cost) / 5i64 > consumed {
        return invalid;
    }
    XmlExpansion {
        text: output,
        valid: true,
        cost: cost,
    }
}
