fn xml_subset_origin(start: usize, internal: bool) -> usize {
    if internal {
        return 0;
    }
    start
}

struct XmlSubsetResult {
    state: XmlEntityArena,
    next: usize,
}

fn xml_subset(
    input: XmlEntityArena,
    start: usize,
    end: usize,
    depth: usize,
    internal: bool,
) -> XmlSubsetResult {
    let mut state = input;
    let mut position = start;
    if depth >= 20 {
        return XmlSubsetResult {
            state: xml_dtd_invalid(state),
            next: position,
        };
    }
    let mut ended = false;
    while position < end && state.flags.valid && ended == false {
        let text = state.arena.as_str();
        let source = XmlSource {
            characters: text.chars().collect(),
        };
        position = xml_skip_space(&source, position);
        if position >= end {
            ended = true;
        } else if source.characters[position] == ']' && internal {
            ended = true;
        } else if xml_at(&source, position, "<!--") {
            let comment = xml_comment(&source, position);
            if comment.valid == false || comment.next > end {
                state = xml_dtd_invalid(state);
            } else {
                position = comment.next;
            };
        } else if xml_at(&source, position, "<?") {
            let instruction = xml_processing_instruction(&source, position);
            if instruction.valid == false || instruction.next > end {
                state = xml_dtd_invalid(state);
            } else {
                position = instruction.next;
            };
        } else if source.characters[position] == '%' {
            let name = xml_name(&source, position + 1);
            if name.valid == false || name.next >= end || source.characters[name.next] != ';' {
                state = xml_dtd_invalid(state);
            } else {
                let spelling = xml_source_range(
                    &source,
                    XmlSpan {
                        start: position + 1,
                        end: name.next,
                    },
                );
                let index = xml_entity_lookup(&state, spelling.as_str(), true);
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
                position = name.next + 1;
                if index == state.entities.len() {
                    if state.flags.standalone {
                        state = xml_dtd_invalid(state);
                    } else {
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
                    };
                } else {
                    let entity = state.entities[index];
                    if entity.external == false {
                        let parent_cost = state.cost;
                        let replacement = xml_source_range(&source, entity.value);
                        state = xml_arena_cost(state, 0i64);
                        let nested = xml_subset(
                            state,
                            entity.value.start,
                            entity.value.end,
                            depth + 1,
                            false,
                        );
                        state = nested.state;
                        let cost =
                            parent_cost + state.cost + xml_octets(replacement.as_str()) + 20i64;
                        state = xml_arena_cost(state, cost);
                        let consumed =
                            xml_consumed(&source, xml_subset_origin(start, internal), position);
                        if cost > 1000000i64 && cost / 5i64 > consumed {
                            state = xml_dtd_invalid(state);
                        }
                        if nested.next != entity.value.end {
                            state = xml_dtd_invalid(state);
                        }
                    } else {
                        let cost = state.cost + 20i64;
                        state = xml_arena_cost(state, cost);
                        let consumed =
                            xml_consumed(&source, xml_subset_origin(start, internal), position);
                        if cost > 1000000i64 && cost / 5i64 > consumed {
                            state = xml_dtd_invalid(state);
                        }
                    };
                };
            };
        } else {
            let item = xml_parse_dtd_item(&source, position);
            if item.valid == false || item.next > end {
                state = xml_dtd_invalid(state);
            } else {
                position = item.next;
                if item.kind == 3 || item.kind == 4 {
                    state = xml_register_entity(state, item, depth);
                } else if item.kind == 2 {
                    state = xml_register_attributes(
                        state,
                        item,
                        depth,
                        xml_subset_origin(start, internal),
                    );
                };
            };
        };
    }
    XmlSubsetResult {
        state: state,
        next: position,
    }
}

fn xml_read_doctype(input: &str, start: usize, standalone: bool) -> XmlSubsetResult {
    let mut state = xml_new_arena(input, standalone);
    let source = XmlSource {
        characters: input.chars().collect(),
    };
    let original_end = source.characters.len();
    let mut position = start + 9;
    let mut spaced = xml_skip_space(&source, position);
    if xml_at(&source, start, "<!DOCTYPE") == false || spaced == position {
        return XmlSubsetResult {
            state: xml_dtd_invalid(state),
            next: position,
        };
    }
    let name = xml_name(&source, spaced);
    if name.valid == false {
        return XmlSubsetResult {
            state: xml_dtd_invalid(state),
            next: position,
        };
    }
    position = name.next;
    spaced = xml_skip_space(&source, position);
    if xml_at(&source, spaced, "SYSTEM") || xml_at(&source, spaced, "PUBLIC") {
        if spaced == position {
            return XmlSubsetResult {
                state: xml_dtd_invalid(state),
                next: position,
            };
        }
        let identifier = xml_external_id(&source, spaced, false);
        if identifier.valid == false
            || xml_normalized_octets(&source, identifier.value.start, identifier.value.end)
                > 2000i64
        {
            return XmlSubsetResult {
                state: xml_dtd_invalid(state),
                next: position,
            };
        }
        position = identifier.next;
        let flags = state.flags;
        state = xml_dtd_with_flags(
            state,
            XmlDtdFlags {
                valid: flags.valid,
                external: true,
                standalone: flags.standalone,
                parameter_seen: flags.parameter_seen,
            },
        );
    }
    position = xml_skip_space(&source, position);
    if position < original_end && source.characters[position] == '[' {
        let subset = xml_subset(state, position + 1, original_end, 0, true);
        state = subset.state;
        position = subset.next;
        if state.flags.valid == false
            || position >= original_end
            || source.characters[position] != ']'
        {
            return XmlSubsetResult {
                state: xml_dtd_invalid(state),
                next: position,
            };
        }
        position = xml_skip_space(&source, position + 1);
    }
    if position >= original_end || source.characters[position] != '>' {
        return XmlSubsetResult {
            state: xml_dtd_invalid(state),
            next: position,
        };
    }
    XmlSubsetResult {
        state: state,
        next: position + 1,
    }
}
