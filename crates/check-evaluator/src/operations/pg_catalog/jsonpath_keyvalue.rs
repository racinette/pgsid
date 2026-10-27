const JSONPATH_METHOD_KEYVALUE: i32 = 129;

fn jsonpath_execution_make_context(
    input: JsonbPayload,
    vars: JsonbPayload,
    query: JsonpathPayload,
    ordered_result: bool,
    utf8: bool,
    variable_base: bool,
    c_collation: bool,
    ctype: i32,
    use_timezone: bool,
    session: &str,
) -> JsonpathExecutionContext {
    let mut needs_objects = false;
    let mut index: usize = 1;
    while index < query.nodes.len() {
        if query.nodes[index].kind == JSONPATH_METHOD_KEYVALUE {
            needs_objects = true;
        };
        index += 1;
    }
    let mut nodes = jsonpath_execution_literals(&query);
    let mut characters = query.characters;
    index = 0;
    while index < JSONPATH_METHOD_TYPE_NAMES.len() {
        let name = JSONPATH_METHOD_TYPE_NAMES[index];
        let content: Vec<char> = name.chars().collect();
        let start = characters.len();
        let mut position: usize = 0;
        while position < content.len() {
            characters.push(content[position]);
            position += 1;
        }
        nodes.push(JsonbNode {
            kind: 4,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: start,
            text_end: characters.len(),
        });
        index += 1;
    }
    let mut document = input;
    let mut variables = vars;
    if utf8 {
        document = jsonpath_execution_utf8_payload(document);
        variables = jsonpath_execution_utf8_payload(variables);
    };
    let document_ids = jsonpath_keyvalue_offsets(&document, needs_objects, utf8);
    let variables_ids = jsonpath_keyvalue_offsets(&variables, needs_objects, utf8);
    let mut generated_nodes: Vec<JsonbNode> = Vec::new();
    generated_nodes.push(JsonbNode {
        kind: -1,
        child: 0,
        next: 0,
        key_start: 0,
        key_end: 0,
        text_start: 0,
        text_end: 0,
    });
    let generated_characters: Vec<char> = Vec::new();
    let mut generated_ids: Vec<NumericValue> = Vec::new();
    generated_ids.push(NumericValue::Unknown);
    let mut next_identity: i64 = 1i64;
    if variable_base {
        next_identity = 2i64;
    };
    JsonpathExecutionContext {
        document_characters: document.characters,
        document_nodes: document.nodes,
        document_root: document.root,
        variables_characters: variables.characters,
        variables_nodes: variables.nodes,
        variables_root: variables.root,
        literal_nodes: nodes,
        path_characters: characters,
        path_nodes: query.nodes,
        path_root: query.root,
        lax: query.lax,
        utf8: utf8,
        c_collation: c_collation,
        ctype: ctype,
        use_timezone: use_timezone,
        session_timezone: session.to_owned(),
        ordered_result: ordered_result,
        document_ids: document_ids,
        variables_ids: variables_ids,
        generated_nodes: generated_nodes,
        generated_characters: generated_characters,
        generated_ids: generated_ids,
        next_generated_id: next_identity,
    }
}

fn jsonpath_keyvalue_offsets(
    source: &JsonbPayload,
    enabled: bool,
    utf8: bool,
) -> Vec<NumericValue> {
    if enabled {
        return jsonb_ordered_object_offsets(source, utf8);
    };
    let empty: Vec<NumericValue> = Vec::new();
    empty
}

fn jsonpath_keyvalue_next_identity(identity: i64) -> i64 {
    if identity == 2147483647i64 {
        return -2147483648i64;
    };
    identity + 1i64
}

fn jsonpath_keyvalue_add_base(offset: NumericValue, identity: i64) -> NumericValue {
    if identity < -2147483648i64 || identity > 2147483647i64 {
        return NumericValue::Unknown;
    };
    let converted = sql__pg_catalog__int8__xy54(offset);
    if let Int8Value::Error(error) = converted {
        return NumericValue::Error(error);
    };
    if let Int8Value::Null = converted {
        return NumericValue::Null;
    };
    if let Int8Value::Value(number) = converted {
        if number < 0i64 || number > 4294967295i64 {
            return NumericValue::Unknown;
        };
        let mut word = identity;
        if word < 0i64 {
            word = word + 4294967296i64;
        };
        let product = word * 1410065408i64 + number;
        let low = product % 4294967296i64;
        let mut high = word * 2i64 + product / 4294967296i64;
        if identity < 0i64 {
            high = high - 1410065408i64;
        };
        high = high % 4294967296i64;
        if high < 0i64 {
            high = high + 4294967296i64;
        };
        if high >= 2147483648i64 {
            high = high - 4294967296i64;
        };
        return NumericValue::Value(text_signed_number(high * 4294967296i64 + low));
    };
    NumericValue::Unknown
}

fn jsonpath_keyvalue_identity(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
) -> NumericValue {
    if reference.source == 0 {
        return context.document_ids[reference.node].clone();
    };
    if reference.source == 1 {
        return jsonpath_keyvalue_add_base(context.variables_ids[reference.node].clone(), 1i64);
    };
    if reference.source == 6 {
        return context.generated_ids[reference.node].clone();
    };
    NumericValue::Unknown
}

fn jsonpath_keyvalue_task(
    step: usize,
    reference: JsonpathReference,
    child: usize,
    ignore: bool,
) -> JsonpathExecutionTask {
    JsonpathExecutionTask {
        mode: 22,
        step: step,
        reference: reference,
        unwrap: false,
        ignore: ignore,
        level: 0,
        spec: child,
        from: 0,
        to: 0,
        mark: 0,
        scope: jsonpath_execution_empty_scope(),
    }
}

fn jsonpath_keyvalue_build(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
    child: usize,
) -> JsonbPayload {
    let mut nodes: Vec<JsonbNode> = Vec::new();
    let mut characters: Vec<char> = "idkeyvalue".chars().collect();
    let mut tails: Vec<usize> = Vec::new();
    nodes.push(JsonbNode {
        kind: -1,
        child: 0,
        next: 0,
        key_start: 0,
        key_end: 0,
        text_start: 0,
        text_end: 0,
    });
    tails.push(0);
    nodes.push(JsonbNode {
        kind: 6,
        child: 2,
        next: 0,
        key_start: 0,
        key_end: 0,
        text_start: 0,
        text_end: 0,
    });
    tails.push(3);
    let identity_start = characters.len();
    let identity = jsonpath_keyvalue_identity(context, reference);
    if let NumericValue::Value(text) = identity {
        let content: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < content.len() {
            characters.push(content[position]);
            position += 1;
        }
    };
    nodes.push(JsonbNode {
        kind: 3,
        child: 0,
        next: 3,
        key_start: 0,
        key_end: 2,
        text_start: identity_start,
        text_end: characters.len(),
    });
    tails.push(0);
    let entry = jsonpath_execution_node(
        context,
        JsonpathReference {
            source: reference.source,
            node: child,
        },
    );
    let start = characters.len();
    let mut position = entry.key_start;
    while position < entry.key_end {
        characters.push(jsonpath_execution_character(
            context,
            reference.source,
            position,
        ));
        position += 1;
    }
    nodes.push(JsonbNode {
        kind: 4,
        child: 0,
        next: 0,
        key_start: 2,
        key_end: 5,
        text_start: start,
        text_end: characters.len(),
    });
    tails.push(0);
    let mut tasks: Vec<JsonpathCopyTask> = Vec::new();
    tasks.push(JsonpathCopyTask {
        reference: JsonpathReference {
            source: reference.source,
            node: child,
        },
        parent: 1,
        siblings: false,
    });
    let mut source_start: usize = 0;
    let mut source_end: usize = 0;
    let mut has_text = false;
    let mut count: usize = 1;
    while count > 0 {
        count = count - 1;
        let task = tasks[count];
        let node = jsonpath_execution_node(context, task.reference);
        let mut key_start = node.key_start;
        let mut key_end = node.key_end;
        if task.parent == 1 {
            key_start = 5;
            key_end = 10;
        } else if nodes[task.parent].kind == 6 && node.key_start < node.key_end {
            if has_text == false || node.key_start < source_start {
                source_start = node.key_start;
            };
            if node.key_end > source_end {
                source_end = node.key_end;
            };
            has_text = true;
        };
        if node.text_start < node.text_end {
            if has_text == false || node.text_start < source_start {
                source_start = node.text_start;
            };
            if node.text_end > source_end {
                source_end = node.text_end;
            };
            has_text = true;
        };
        let index = nodes.len();
        nodes.push(JsonbNode {
            kind: node.kind,
            child: 0,
            next: 0,
            key_start: key_start,
            key_end: key_end,
            text_start: node.text_start,
            text_end: node.text_end,
        });
        tails.push(0);
        if tails[task.parent] == 0 {
            nodes[task.parent] = jsonb_format_child(nodes[task.parent], index);
        } else {
            let tail = tails[task.parent];
            nodes[tail] = jsonb_edit_link(nodes[tail], index);
        };
        tails[task.parent] = index;
        if task.siblings && node.next > 0 {
            let next = JsonpathCopyTask {
                reference: JsonpathReference {
                    source: task.reference.source,
                    node: node.next,
                },
                parent: task.parent,
                siblings: true,
            };
            if count < tasks.len() {
                tasks[count] = next;
            } else {
                tasks.push(next);
            };
            count += 1;
        };
        if node.child > 0 {
            let next = JsonpathCopyTask {
                reference: JsonpathReference {
                    source: task.reference.source,
                    node: node.child,
                },
                parent: index,
                siblings: true,
            };
            if count < tasks.len() {
                tasks[count] = next;
            } else {
                tasks.push(next);
            };
            count += 1;
        };
    }
    let character_base = characters.len();
    position = source_start;
    while position < source_end {
        characters.push(jsonpath_execution_character(
            context,
            reference.source,
            position,
        ));
        position += 1;
    }
    position = 4;
    while position < nodes.len() {
        let node = nodes[position];
        let mut key_start: usize = 0;
        let mut key_end: usize = 0;
        let mut text_start: usize = 0;
        let mut text_end: usize = 0;
        if node.key_start < node.key_end {
            if position == 4 {
                key_start = 5;
                key_end = 10;
            } else {
                key_start = character_base + node.key_start - source_start;
                key_end = character_base + node.key_end - source_start;
            };
        };
        if node.text_start < node.text_end {
            text_start = character_base + node.text_start - source_start;
            text_end = character_base + node.text_end - source_start;
        };
        nodes[position] = JsonbNode {
            kind: node.kind,
            child: node.child,
            next: node.next,
            key_start: key_start,
            key_end: key_end,
            text_start: text_start,
            text_end: text_end,
        };
        position += 1;
    }
    JsonbPayload {
        characters: characters,
        nodes: nodes,
        root: 1,
    }
}

fn jsonpath_execution_result_node(
    context: &JsonpathExecutionContext,
    sequence: &JsonpathSequence,
    reference: JsonpathReference,
) -> JsonbNode {
    if reference.source == 6 {
        return sequence.generated_nodes[reference.node];
    };
    jsonpath_execution_node(context, reference)
}

fn jsonpath_execution_result_character(
    context: &JsonpathExecutionContext,
    sequence: &JsonpathSequence,
    source: i32,
    index: usize,
) -> char {
    if source == 6 {
        return sequence.generated_characters[index];
    };
    jsonpath_execution_character(context, source, index)
}
