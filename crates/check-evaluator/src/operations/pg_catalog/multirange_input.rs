fn multirange_text_payload(
    characters: Vec<char>,
    position: usize,
    member: String,
    started: bool,
    ranges: Vec<RangeValue>,
    state: i32,
    error: SqlError,
) -> MultirangeTextPayload {
    MultirangeTextPayload {
        characters,
        position,
        member,
        started,
        ranges,
        state,
        error,
    }
}

fn multirange_text_failure(input: MultirangeTextPayload, error: SqlError) -> MultirangeTextPayload {
    multirange_text_payload(
        input.characters,
        input.position,
        input.member,
        input.started,
        input.ranges,
        -2,
        error,
    )
}

fn multirange_text_advance(input: MultirangeTextPayload) -> MultirangeTextPayload {
    if input.state != 1 {
        return input;
    };
    let characters = input.characters;
    let mut position = input.position;
    let ranges = input.ranges;
    while position < characters.len() && range_input_space(characters[position]) {
        position += 1;
    }
    if input.started && position < characters.len() && characters[position] == ',' {
        position += 1;
        while position < characters.len() && range_input_space(characters[position]) {
            position += 1;
        }
    } else if position < characters.len() && characters[position] == '}' {
        position += 1;
        while position < characters.len() && range_input_space(characters[position]) {
            position += 1;
        }
        let mut state: i32 = 2;
        if position != characters.len() {
            state = -2;
        };
        return multirange_text_payload(
            characters,
            position,
            String::new(),
            input.started,
            ranges,
            state,
            make_sql_error(RANGE_INPUT_SYNTAX),
        );
    } else if input.started {
        return multirange_text_payload(
            characters,
            position,
            String::new(),
            true,
            ranges,
            -2,
            make_sql_error(RANGE_INPUT_SYNTAX),
        );
    };
    let mut member = String::new();
    let mut state: i32 = 0;
    if position < characters.len() && (characters[position] == '[' || characters[position] == '(') {
        state = 1;
        member.push(characters[position]);
        position += 1;
        while position < characters.len() && state != 5 {
            let ch = characters[position];
            member.push(ch);
            if range_input_space(ch) == false {
                if state == 1 {
                    if ch == ')' || ch == ']' {
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
                        if position + 1 < characters.len() && characters[position + 1] == '"' {
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
                };
            };
            position += 1;
        }
    } else if position + 4 < characters.len() {
        let empty = (characters[position] == 'e' || characters[position] == 'E')
            && (characters[position + 1] == 'm' || characters[position + 1] == 'M')
            && (characters[position + 2] == 'p' || characters[position + 2] == 'P')
            && (characters[position + 3] == 't' || characters[position + 3] == 'T')
            && (characters[position + 4] == 'y' || characters[position + 4] == 'Y');
        if empty {
            member = "empty".to_owned();
            position += 5;
            state = 5;
        };
    };
    let mut result_state: i32 = -2;
    if state == 5 {
        result_state = 1;
    };
    multirange_text_payload(
        characters,
        position,
        member,
        true,
        ranges,
        result_state,
        make_sql_error(RANGE_INPUT_SYNTAX),
    )
}

pub(crate) fn prepare_multirange_text(input: TextValue) -> MultirangeTextPayload {
    let characters: Vec<char> = Vec::new();
    let ranges: Vec<RangeValue> = Vec::new();
    let initial = multirange_text_payload(
        characters,
        0,
        String::new(),
        false,
        ranges,
        -1,
        make_sql_error(RANGE_INPUT_SYNTAX),
    );
    if let TextValue::Error(error) = input {
        return multirange_text_failure(initial, error);
    };
    if let TextValue::Null = input {
        return multirange_text_payload(
            initial.characters,
            0,
            initial.member,
            false,
            initial.ranges,
            0,
            initial.error,
        );
    };
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < characters.len() && range_input_space(characters[position]) {
            position += 1;
        }
        if position < characters.len() && characters[position] == '{' {
            return multirange_text_advance(multirange_text_payload(
                characters,
                position + 1,
                String::new(),
                false,
                initial.ranges,
                1,
                initial.error,
            ));
        };
        return multirange_text_failure(initial, make_sql_error(RANGE_INPUT_SYNTAX));
    };
    initial
}

pub(crate) fn multirange_text_has_member(input: &MultirangeTextPayload) -> bool {
    input.state == 1
}

pub(crate) fn multirange_text_member(input: &MultirangeTextPayload) -> TextValue {
    if input.state == 1 {
        return TextValue::Value(input.member.clone());
    };
    TextValue::Null
}

pub(crate) fn append_multirange_text(
    input: MultirangeTextPayload,
    member: RangeValue,
) -> MultirangeTextPayload {
    if input.state != 1 {
        return input;
    };
    if let RangeValue::Error(error) = member {
        return multirange_text_failure(input, error);
    };
    if let RangeValue::Value(payload) = member {
        let mut ranges = input.ranges;
        if payload.empty == false {
            ranges.push(RangeValue::Value(payload));
        };
        return multirange_text_advance(multirange_text_payload(
            input.characters,
            input.position,
            String::new(),
            true,
            ranges,
            1,
            input.error,
        ));
    };
    multirange_text_payload(
        input.characters,
        input.position,
        input.member,
        input.started,
        input.ranges,
        -1,
        input.error,
    )
}

pub(crate) fn finish_multirange_text(
    input: MultirangeTextPayload,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    support: RangeSupport,
) -> MultirangeValue {
    if input.state == -2 {
        return MultirangeValue::Error(input.error);
    };
    if input.state == 0 {
        return MultirangeValue::Null;
    };
    if input.state != 2 {
        return MultirangeValue::Unknown;
    };
    let typed = multirange_from_profiled_ranges(
        type_name,
        range_type,
        element_type,
        element_kind,
        input.ranges,
        support,
    );
    if let MultirangeValue::Value(payload) = typed {
        return multirange_construct_normalize(payload);
    };
    typed
}

pub(crate) fn finish_multirange_stored_text(
    input: MultirangeTextPayload,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    support: RangeSupport,
) -> MultirangeValue {
    if input.state == 0 {
        return MultirangeValue::Null;
    };
    if input.state != 2 {
        return MultirangeValue::Unknown;
    };
    multirange_from_profiled_ranges(
        type_name,
        range_type,
        element_type,
        element_kind,
        input.ranges,
        support,
    )
}

pub fn multirange_from_text(
    input: TextValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> MultirangeValue {
    let mut cursor = prepare_multirange_text(input);
    while multirange_text_has_member(&cursor) {
        let text = multirange_text_member(&cursor);
        let member = range_from_text(text, range_type, element_type, element_kind);
        cursor = append_multirange_text(cursor, member);
    }
    finish_multirange_text(
        cursor,
        type_name,
        range_type,
        element_type,
        element_kind,
        range_builtin_support(range_type, element_type, element_kind),
    )
}
