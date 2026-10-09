#[derive(Clone, Copy)]
struct XmlValueBuffer {
    bytes: i64,
    pending: i64,
    allocated: bool,
    in_space: bool,
    valid: bool,
}

fn xml_new_value(owned: bool) -> XmlValueBuffer {
    XmlValueBuffer {
        bytes: 0i64,
        pending: 0i64,
        allocated: owned,
        in_space: true,
        valid: true,
    }
}

fn xml_flush_value(input: XmlValueBuffer) -> XmlValueBuffer {
    let bytes = input.bytes + input.pending;
    XmlValueBuffer {
        bytes: bytes,
        pending: 0i64,
        allocated: input.allocated || input.pending > 0i64,
        in_space: input.in_space,
        valid: input.valid && bytes <= 10000000i64,
    }
}

fn xml_value_character(
    input: XmlValueBuffer,
    character: char,
    direct: bool,
    numeric: bool,
    normalize: bool,
) -> XmlValueBuffer {
    let mut state = input;
    let whitespace = character == ' ' || (direct == false && xml_space(character));
    if whitespace && normalize && state.in_space {
        if state.pending > 0i64 {
            state = xml_flush_value(state);
        }
        return state;
    }
    let mut scalar = character;
    if direct == false && whitespace {
        scalar = ' ';
    }
    let width = xml_character_octets(scalar);
    let mut bytes = state.bytes;
    let mut pending = state.pending;
    let mut allocated = state.allocated;
    let mut valid = state.valid;
    if direct || (whitespace && character != ' ') {
        state = xml_flush_value(state);
        let mut reserve = width;
        if numeric && scalar != ' ' {
            reserve = 4;
        }
        let needed = reserve as i64;
        valid = state.valid && state.bytes + needed <= 10000000i64;
        bytes = state.bytes + width as i64;
        pending = 0i64;
        allocated = true;
    } else {
        pending = pending + width as i64;
    };
    XmlValueBuffer {
        bytes: bytes,
        pending: pending,
        allocated: allocated,
        in_space: scalar == ' ',
        valid: valid,
    }
}

fn xml_walk_value(
    source: &XmlSource,
    value: XmlSpan,
    input: XmlValueBuffer,
    arena: &XmlEntityArena,
    normalize: bool,
    depth: usize,
    entity: bool,
) -> XmlValueBuffer {
    let mut state = input;
    let mut position = value.start;
    while position < value.end && state.valid {
        let character = source.characters[position];
        if character == '&' {
            if state.pending > 0i64 {
                state = xml_flush_value(state);
            }
            let reference = xml_reference(source, position);
            if xml_predefined_reference(source, position) {
                let scalar = xml_reference_scalar(source, position);
                state = xml_value_character(
                    state,
                    scalar,
                    true,
                    xml_at(source, position, "&#"),
                    normalize,
                );
            } else {
                let name = xml_source_range(
                    source,
                    XmlSpan {
                        start: position + 1,
                        end: reference.next - 1,
                    },
                );
                let index = xml_entity_lookup(arena, name.as_str(), false);
                if index < arena.entities.len() && depth < 19 {
                    let definition = arena.entities[index];
                    if definition.external == false {
                        let stored = XmlSource {
                            characters: arena.arena.as_str().chars().collect(),
                        };
                        state = xml_walk_value(
                            &stored,
                            definition.value,
                            state,
                            arena,
                            normalize,
                            depth + 1,
                            true,
                        );
                    }
                }
            };
            position = reference.next;
        } else {
            state = xml_value_character(state, character, false, false, normalize);
            if character == '\r'
                && position + 1 < value.end
                && source.characters[position + 1] == '\n'
            {
                position += 1;
            }
            position += 1;
        };
    }
    if entity || state.allocated {
        state = xml_flush_value(state);
    }
    state
}

fn xml_attribute_tokenized(
    source: &XmlSource,
    arena: &XmlEntityArena,
    element: XmlSpan,
    attribute: XmlSpan,
) -> bool {
    let owner = xml_source_range(source, element);
    let name = xml_source_range(source, attribute);
    let mut position: usize = 0;
    while position < arena.defaults.len() {
        let definition = arena.defaults[position];
        if definition.tokenized {
            let expected_owner = xml_origin_span(source, arena, definition.element, true);
            let expected_name = xml_origin_span(source, arena, definition.name, true);
            if owner == expected_owner && name == expected_name {
                return true;
            }
        }
        position += 1;
    }
    false
}
