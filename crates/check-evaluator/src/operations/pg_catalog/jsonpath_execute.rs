const JSONPATH_EXEC_SUBSCRIPT: u32 = 3452655;
const JSONPATH_EXEC_ARRAY: u32 = 3452661;
const JSONPATH_EXEC_MEMBER: u32 = 3452662;
const JSONPATH_EXEC_OBJECT: u32 = 3452664;
const JSONPATH_EXEC_SINGLETON: u32 = 3452660;
const JSONPATH_EXEC_VARIABLE: u32 = 6820852;
const JSONPATH_EXEC_PARAMETER: u32 = 3452619;

#[derive(Clone, Copy)]
struct JsonpathReference {
    source: i32,
    node: usize,
}

#[derive(Clone)]
struct JsonpathExecutionContext {
    document_characters: Vec<char>,
    document_nodes: Vec<JsonbNode>,
    document_root: usize,
    variables_characters: Vec<char>,
    variables_nodes: Vec<JsonbNode>,
    variables_root: usize,
    literal_nodes: Vec<JsonbNode>,
    path_characters: Vec<char>,
    path_nodes: Vec<JsonpathNode>,
    path_root: usize,
    lax: bool,
    utf8: bool,
    ordered_result: bool,
}

#[derive(Clone, Copy)]
struct JsonpathExecutionTask {
    mode: i32,
    step: usize,
    reference: JsonpathReference,
    unwrap: bool,
    ignore: bool,
    level: usize,
    spec: usize,
    from: i32,
    to: i32,
}

#[derive(Clone)]
struct JsonpathSequence {
    items: Vec<JsonpathReference>,
    error: u32,
    unknown: bool,
}

fn jsonpath_execution_node(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
) -> JsonbNode {
    if reference.source == 1 {
        return context.variables_nodes[reference.node];
    };
    if reference.source == 2 {
        return context.literal_nodes[reference.node];
    };
    context.document_nodes[reference.node]
}

fn jsonpath_execution_character(
    context: &JsonpathExecutionContext,
    source: i32,
    index: usize,
) -> char {
    if source == 1 {
        return context.variables_characters[index];
    };
    if source == 2 {
        return context.path_characters[index];
    };
    context.document_characters[index]
}

fn jsonpath_execution_member(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
    step: usize,
) -> usize {
    let key = context.path_nodes[step];
    let object = jsonpath_execution_node(context, reference);
    let mut child = object.child;
    while child > 0 {
        let node = jsonpath_execution_node(
            context,
            JsonpathReference {
                source: reference.source,
                node: child,
            },
        );
        if node.key_end - node.key_start == key.text_end - key.text_start {
            let mut offset: usize = 0;
            let mut equal = true;
            while offset < key.text_end - key.text_start {
                if jsonpath_execution_character(context, reference.source, node.key_start + offset)
                    != context.path_characters[key.text_start + offset]
                {
                    equal = false;
                };
                offset += 1;
            }
            if equal {
                return child;
            };
        };
        child = node.next;
    }
    0
}

fn jsonpath_execution_ordered(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
    continuation: usize,
) -> bool {
    if context.utf8 || (context.ordered_result == false && continuation == 0) {
        return true;
    };
    let node = jsonpath_execution_node(context, reference);
    if node.kind != 6 {
        return true;
    };
    let mut child = node.child;
    let mut nonempty: usize = 0;
    let mut unicode = false;
    while child > 0 {
        let entry = jsonpath_execution_node(
            context,
            JsonpathReference {
                source: reference.source,
                node: child,
            },
        );
        if entry.key_end > entry.key_start {
            nonempty += 1;
        };
        let mut position = entry.key_start;
        while position < entry.key_end {
            if jsonpath_execution_character(context, reference.source, position) as i32 > 127 {
                unicode = true;
            };
            position += 1;
        }
        child = entry.next;
    }
    unicode == false || nonempty <= 1
}

fn jsonpath_execution_utf8_payload(input: JsonbPayload) -> JsonbPayload {
    let mut nodes: Vec<JsonbNode> = Vec::new();
    let mut position: usize = 0;
    while position < input.nodes.len() {
        nodes.push(input.nodes[position]);
        position += 1;
    }
    let mut index: usize = 1;
    while index < nodes.len() {
        let node = nodes[index];
        if node.kind == 6 {
            let children = jsonb_order_children(&input, node);
            if children.len() > 0 {
                nodes[index] = jsonb_format_child(node, children[0]);
                let mut position: usize = 0;
                while position < children.len() {
                    let mut next: usize = 0;
                    if position + 1 < children.len() {
                        next = children[position + 1];
                    };
                    let child = children[position];
                    nodes[child] = jsonb_edit_link(nodes[child], next);
                    position += 1;
                }
            };
        };
        index += 1;
    }
    JsonbPayload {
        characters: input.characters,
        nodes: nodes,
        root: input.root,
    }
}

fn jsonpath_execution_make_task(
    mode: i32,
    step: usize,
    reference: JsonpathReference,
    unwrap: bool,
    ignore: bool,
) -> JsonpathExecutionTask {
    JsonpathExecutionTask {
        mode: mode,
        step: step,
        reference: reference,
        unwrap: unwrap,
        ignore: ignore,
        level: 0,
        spec: 0,
        from: 0,
        to: 0,
    }
}

fn jsonpath_execution_stored(input: JsonpathValue) -> JsonpathValue {
    if let JsonpathValue::StoredText(text) = input {
        let parsed = jsonpath_from_coerced_source_utf8(TextValue::Value(text));
        if let JsonpathValue::Value(path) = parsed {
            let mut index: usize = 1;
            while index < path.nodes.len() {
                let node = path.nodes[index];
                if node.kind != JSONPATH_NODE_ROOT
                    && node.kind != JSONPATH_NODE_VARIABLE
                    && node.kind != JSONPATH_NODE_STRING
                    && node.kind != JSONPATH_NODE_NUMBER
                    && node.kind != JSONPATH_NODE_NULL
                    && node.kind != JSONPATH_NODE_TRUE
                    && node.kind != JSONPATH_NODE_FALSE
                    && node.kind != JSONPATH_NODE_LAST
                    && node.kind != JSONPATH_NODE_KEY
                    && node.kind != JSONPATH_NODE_ANY_KEY
                    && node.kind != JSONPATH_NODE_ANY_ARRAY
                    && node.kind != JSONPATH_NODE_INDEX
                    && node.kind != JSONPATH_NODE_SUBSCRIPT
                    && node.kind != JSONPATH_NODE_DESCENDANT
                {
                    return JsonpathValue::Unknown;
                };
                index += 1;
            }
            return JsonpathValue::Value(path);
        };
        return JsonpathValue::Unknown;
    };
    input
}

fn jsonpath_execution_index(
    context: &JsonpathExecutionContext,
    step: usize,
    size: i32,
) -> Int4Value {
    let expression = context.path_nodes[step];
    if expression.next > 0 {
        return Int4Value::Unknown;
    };
    if expression.kind == JSONPATH_NODE_LAST {
        return Int4Value::Value(size - 1);
    };
    let mut number = NumericValue::Unknown;
    if expression.kind == JSONPATH_NODE_NUMBER {
        let mut text = String::new();
        let mut position = expression.text_start;
        while position < expression.text_end {
            text.push(context.path_characters[position]);
            position += 1;
        }
        number = NumericValue::Value(text);
    } else if expression.kind == JSONPATH_NODE_VARIABLE || expression.kind == JSONPATH_NODE_ROOT {
        let mut reference = JsonpathReference {
            source: 0,
            node: context.document_root,
        };
        if expression.kind == JSONPATH_NODE_VARIABLE {
            let root = JsonpathReference {
                source: 1,
                node: context.variables_root,
            };
            let selected = jsonpath_execution_member(context, root, step);
            if selected == 0 {
                return Int4Value::Error(make_sql_error(JSONPATH_EXEC_VARIABLE));
            };
            reference = JsonpathReference {
                source: 1,
                node: selected,
            };
        };
        let node = jsonpath_execution_node(context, reference);
        if node.kind != 3 {
            return Int4Value::Error(make_sql_error(JSONPATH_EXEC_SUBSCRIPT));
        };
        let mut text = String::new();
        let mut position = node.text_start;
        while position < node.text_end {
            text.push(jsonpath_execution_character(
                context,
                reference.source,
                position,
            ));
            position += 1;
        }
        number = NumericValue::Value(text);
    } else if expression.kind == JSONPATH_NODE_STRING
        || expression.kind == JSONPATH_NODE_NULL
        || expression.kind == JSONPATH_NODE_TRUE
        || expression.kind == JSONPATH_NODE_FALSE
    {
        return Int4Value::Error(make_sql_error(JSONPATH_EXEC_SUBSCRIPT));
    };
    let truncated = sql__pg_catalog__trunc__dghz(number);
    let converted = sql__pg_catalog__int4__z4rh(truncated);
    if let Int4Value::Error(_) = converted {
        return Int4Value::Error(make_sql_error(JSONPATH_EXEC_SUBSCRIPT));
    };
    converted
}

fn jsonpath_execution_walk(
    context: &JsonpathExecutionContext,
    existence: bool,
) -> JsonpathSequence {
    let mut tasks: Vec<JsonpathExecutionTask> = Vec::new();
    let mut count: usize = 1;
    tasks.push(jsonpath_execution_make_task(
        0,
        context.path_root,
        JsonpathReference {
            source: 0,
            node: context.document_root,
        },
        context.lax,
        context.lax,
    ));
    let mut items: Vec<JsonpathReference> = Vec::new();
    let mut error: u32 = 0;
    let mut unknown = false;
    while count > 0 && error == 0 && unknown == false {
        count = count - 1;
        let task = tasks[count];
        let value = jsonpath_execution_node(context, task.reference);
        let mut pending: Vec<JsonpathExecutionTask> = Vec::new();
        if task.mode == 1 || task.mode == 3 || task.mode == 5 {
            let mut following = value.next;
            if task.mode == 5 && task.from >= task.to {
                following = 0;
            };
            if following > 0 {
                pending.push(JsonpathExecutionTask {
                    reference: JsonpathReference {
                        source: task.reference.source,
                        node: following,
                    },
                    from: task.from + 1,
                    mode: task.mode,
                    step: task.step,
                    unwrap: task.unwrap,
                    ignore: task.ignore,
                    level: task.level,
                    spec: task.spec,
                    to: task.to,
                });
            };
            let mut mode: i32 = 0;
            if task.mode == 3 {
                mode = 2;
            };
            let mut selected = jsonpath_execution_make_task(
                mode,
                task.step,
                task.reference,
                task.unwrap,
                task.ignore,
            );
            selected = JsonpathExecutionTask {
                level: task.level,
                mode: selected.mode,
                step: selected.step,
                reference: selected.reference,
                unwrap: selected.unwrap,
                ignore: selected.ignore,
                spec: 0,
                from: 0,
                to: 0,
            };
            pending.push(selected);
        } else if task.mode == 2 {
            let step = context.path_nodes[task.step];
            let within = step.last < 0 || task.level <= usize::try_from(step.last).unwrap_or(0);
            if within {
                if value.child > 0
                    && (step.last < 0 || task.level < usize::try_from(step.last).unwrap_or(0))
                {
                    pending.push(JsonpathExecutionTask {
                        mode: 6,
                        step: task.step,
                        reference: task.reference,
                        level: task.level,
                        unwrap: context.lax,
                        ignore: true,
                        spec: 0,
                        from: 0,
                        to: 0,
                    });
                };
                let eligible = (step.first >= 0
                    && task.level >= usize::try_from(step.first).unwrap_or(0))
                    || (step.first < 0 && step.last < 0 && task.level > 0 && value.kind < 5);
                if eligible {
                    pending.push(jsonpath_execution_make_task(
                        0,
                        step.next,
                        task.reference,
                        context.lax,
                        true,
                    ));
                };
            };
        } else if task.mode == 6 {
            if jsonpath_execution_ordered(
                context,
                task.reference,
                context.path_nodes[task.step].next,
            ) == false
            {
                unknown = true;
            } else {
                pending.push(JsonpathExecutionTask {
                    mode: 3,
                    step: task.step,
                    reference: JsonpathReference {
                        source: task.reference.source,
                        node: value.child,
                    },
                    level: task.level + 1,
                    unwrap: context.lax,
                    ignore: true,
                    spec: 0,
                    from: 0,
                    to: 0,
                });
            };
        } else if task.mode == 4 {
            let step = context.path_nodes[task.step];
            let spec = context.path_nodes[task.spec];
            let mut size: i32 = 1;
            if value.kind == 5 {
                size = 0;
                let mut child = value.child;
                while child > 0 {
                    size = size + 1;
                    child = jsonpath_execution_node(
                        context,
                        JsonpathReference {
                            source: task.reference.source,
                            node: child,
                        },
                    )
                    .next;
                }
            };
            let first = jsonpath_execution_index(context, spec.left, size);
            let mut last = first;
            if let Int4Value::Value(_) = first {
                if spec.right > 0 {
                    last = jsonpath_execution_index(context, spec.right, size);
                };
            };
            if let Int4Value::Error(failure) = first {
                error = failure.state;
            };
            if let Int4Value::Error(failure) = last {
                error = failure.state;
            };
            if let Int4Value::Unknown = first {
                unknown = true;
            };
            if let Int4Value::Unknown = last {
                unknown = true;
            };
            if let Int4Value::Value(begin) = first {
                if let Int4Value::Value(end) = last {
                    if task.ignore == false && (begin < 0 || begin > end || end >= size) {
                        error = JSONPATH_EXEC_SUBSCRIPT;
                    } else {
                        if spec.next > 0 {
                            pending.push(JsonpathExecutionTask {
                                spec: spec.next,
                                mode: 4,
                                step: task.step,
                                reference: task.reference,
                                unwrap: task.unwrap,
                                ignore: task.ignore,
                                level: 0,
                                from: 0,
                                to: 0,
                            });
                        };
                        let mut from = begin;
                        let mut to = end;
                        if from < 0 {
                            from = 0;
                        };
                        if to >= size {
                            to = size - 1;
                        };
                        if from <= to {
                            let mut child = task.reference.node;
                            if value.kind == 5 {
                                child = value.child;
                                let mut offset: i32 = 0;
                                while child > 0 && offset < from {
                                    child = jsonpath_execution_node(
                                        context,
                                        JsonpathReference {
                                            source: task.reference.source,
                                            node: child,
                                        },
                                    )
                                    .next;
                                    offset = offset + 1;
                                }
                            };
                            if child > 0 {
                                let mut mode: i32 = 0;
                                if value.kind == 5 {
                                    mode = 5;
                                };
                                pending.push(JsonpathExecutionTask {
                                    mode: mode,
                                    step: step.next,
                                    reference: JsonpathReference {
                                        source: task.reference.source,
                                        node: child,
                                    },
                                    unwrap: context.lax,
                                    ignore: task.ignore,
                                    level: 0,
                                    spec: 0,
                                    from: from,
                                    to: to,
                                });
                            };
                        };
                    };
                };
            };
        } else if task.step == 0 {
            items.push(task.reference);
            if existence && context.lax {
                count = 0;
            };
        } else {
            let step = context.path_nodes[task.step];
            if step.kind == JSONPATH_NODE_ROOT {
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.next,
                    JsonpathReference {
                        source: 0,
                        node: context.document_root,
                    },
                    context.lax,
                    task.ignore,
                ));
            } else if step.kind == JSONPATH_NODE_VARIABLE {
                let selected = jsonpath_execution_member(
                    context,
                    JsonpathReference {
                        source: 1,
                        node: context.variables_root,
                    },
                    task.step,
                );
                if selected == 0 {
                    error = JSONPATH_EXEC_VARIABLE;
                } else {
                    pending.push(jsonpath_execution_make_task(
                        0,
                        step.next,
                        JsonpathReference {
                            source: 1,
                            node: selected,
                        },
                        context.lax,
                        task.ignore,
                    ));
                };
            } else if step.kind == JSONPATH_NODE_STRING
                || step.kind == JSONPATH_NODE_NUMBER
                || step.kind == JSONPATH_NODE_NULL
                || step.kind == JSONPATH_NODE_TRUE
                || step.kind == JSONPATH_NODE_FALSE
            {
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.next,
                    JsonpathReference { source: 2, node: 1 },
                    context.lax,
                    task.ignore,
                ));
            } else if step.kind == JSONPATH_NODE_KEY || step.kind == JSONPATH_NODE_ANY_KEY {
                if value.kind == 6 {
                    if step.kind == JSONPATH_NODE_KEY {
                        let selected =
                            jsonpath_execution_member(context, task.reference, task.step);
                        if selected > 0 {
                            pending.push(jsonpath_execution_make_task(
                                0,
                                step.next,
                                JsonpathReference {
                                    source: task.reference.source,
                                    node: selected,
                                },
                                context.lax,
                                task.ignore,
                            ));
                        } else if task.ignore == false {
                            error = JSONPATH_EXEC_MEMBER;
                        };
                    } else if jsonpath_execution_ordered(context, task.reference, step.next)
                        == false
                    {
                        unknown = true;
                    } else if value.child > 0 {
                        pending.push(jsonpath_execution_make_task(
                            1,
                            step.next,
                            JsonpathReference {
                                source: task.reference.source,
                                node: value.child,
                            },
                            context.lax,
                            task.ignore,
                        ));
                    };
                } else if value.kind == 5 && task.unwrap {
                    if value.child > 0 {
                        pending.push(jsonpath_execution_make_task(
                            1,
                            task.step,
                            JsonpathReference {
                                source: task.reference.source,
                                node: value.child,
                            },
                            false,
                            task.ignore,
                        ));
                    };
                } else if task.ignore == false {
                    error = JSONPATH_EXEC_MEMBER;
                    if step.kind == JSONPATH_NODE_ANY_KEY {
                        error = JSONPATH_EXEC_OBJECT;
                    };
                };
            } else if step.kind == JSONPATH_NODE_ANY_ARRAY {
                if value.kind == 5 {
                    if value.child > 0 {
                        pending.push(jsonpath_execution_make_task(
                            1,
                            step.next,
                            JsonpathReference {
                                source: task.reference.source,
                                node: value.child,
                            },
                            context.lax,
                            task.ignore,
                        ));
                    };
                } else if context.lax {
                    pending.push(jsonpath_execution_make_task(
                        0,
                        step.next,
                        task.reference,
                        true,
                        task.ignore,
                    ));
                } else if task.ignore == false {
                    error = JSONPATH_EXEC_ARRAY;
                };
            } else if step.kind == JSONPATH_NODE_INDEX {
                if value.kind == 5 || context.lax {
                    pending.push(JsonpathExecutionTask {
                        mode: 4,
                        step: task.step,
                        spec: step.left,
                        reference: task.reference,
                        unwrap: task.unwrap,
                        ignore: task.ignore,
                        level: 0,
                        from: 0,
                        to: 0,
                    });
                } else if task.ignore == false {
                    error = JSONPATH_EXEC_ARRAY;
                };
            } else if step.kind == JSONPATH_NODE_DESCENDANT {
                pending.push(jsonpath_execution_make_task(
                    2,
                    task.step,
                    task.reference,
                    context.lax,
                    true,
                ));
            } else {
                unknown = true;
            };
        };
        let mut index: usize = 0;
        while index < pending.len() {
            if count < tasks.len() {
                tasks[count] = pending[index];
            } else {
                tasks.push(pending[index]);
            };
            count += 1;
            index += 1;
        }
    }
    JsonpathSequence {
        items: items,
        error: error,
        unknown: unknown,
    }
}

#[derive(Clone, Copy)]
struct JsonpathCopyTask {
    reference: JsonpathReference,
    parent: usize,
    siblings: bool,
}

fn jsonpath_execution_output(
    context: &JsonpathExecutionContext,
    sequence: &JsonpathSequence,
    array: bool,
) -> JsonbValue {
    if array == false && sequence.items.len() == 0 {
        return JsonbValue::Null;
    };
    let mut nodes: Vec<JsonbNode> = Vec::new();
    let mut characters: Vec<char> = Vec::new();
    let empty = JsonbNode {
        kind: 0,
        child: 0,
        next: 0,
        key_start: 0,
        key_end: 0,
        text_start: 0,
        text_end: 0,
    };
    nodes.push(empty);
    let mut tails: Vec<usize> = Vec::new();
    tails.push(0);
    if array {
        nodes.push(JsonbNode {
            kind: 5,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        });
        tails.push(0);
    };
    let mut item: usize = 0;
    while item < sequence.items.len() && (array || item == 0) {
        let mut tasks: Vec<JsonpathCopyTask> = Vec::new();
        let mut count: usize = 1;
        let mut parent: usize = 0;
        if array {
            parent = 1;
        };
        tasks.push(JsonpathCopyTask {
            reference: sequence.items[item],
            parent: parent,
            siblings: false,
        });
        while count > 0 {
            count = count - 1;
            let task = tasks[count];
            let node = jsonpath_execution_node(context, task.reference);
            let key_start = characters.len();
            if task.parent > 0 && nodes[task.parent].kind == 6 {
                let mut position = node.key_start;
                while position < node.key_end {
                    characters.push(jsonpath_execution_character(
                        context,
                        task.reference.source,
                        position,
                    ));
                    position += 1;
                }
            };
            let key_end = characters.len();
            let text_start = characters.len();
            let mut position = node.text_start;
            while position < node.text_end {
                characters.push(jsonpath_execution_character(
                    context,
                    task.reference.source,
                    position,
                ));
                position += 1;
            }
            let index = nodes.len();
            nodes.push(JsonbNode {
                kind: node.kind,
                child: 0,
                next: 0,
                key_start: key_start,
                key_end: key_end,
                text_start: text_start,
                text_end: characters.len(),
            });
            tails.push(0);
            if task.parent > 0 {
                if tails[task.parent] == 0 {
                    nodes[task.parent] = jsonb_format_child(nodes[task.parent], index);
                } else {
                    let tail = tails[task.parent];
                    nodes[tail] = jsonb_edit_link(nodes[tail], index);
                };
                tails[task.parent] = index;
            };
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
        item += 1;
    }
    jsonb_rebuild(
        JsonbValue::Value(JsonbPayload {
            characters: characters,
            nodes: nodes,
            root: 1,
        }),
        true,
    )
}

fn jsonpath_execution_boolean(value: bool) -> JsonbValue {
    if value {
        return jsonb_from_text(TextValue::Value("true".to_owned()));
    };
    jsonb_from_text(TextValue::Value("false".to_owned()))
}

fn jsonpath_evaluate(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
    mode: i32,
    utf8: bool,
) -> JsonbValue {
    if let JsonbValue::Error(error) = document {
        return JsonbValue::Error(error);
    };
    if let JsonpathValue::Error(error) = path {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Error(error) = variables {
        return JsonbValue::Error(error);
    };
    if let BoolValue::Error(error) = silent {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Null = document {
        return JsonbValue::Null;
    };
    if let JsonpathValue::Null = path {
        return JsonbValue::Null;
    };
    if let JsonbValue::Null = variables {
        return JsonbValue::Null;
    };
    if let BoolValue::Null = silent {
        return JsonbValue::Null;
    };
    if let JsonbValue::Value(input) = document {
        if let JsonbValue::Value(vars) = variables {
            if let BoolValue::Value(suppress) = silent {
                if let JsonpathValue::Unknown = path {
                    return JsonbValue::Unknown;
                };
                if vars.nodes[vars.root].kind != 6 {
                    return JsonbValue::Error(make_sql_error(JSONPATH_EXEC_PARAMETER));
                };
                let resolved = jsonpath_execution_stored(path);
                if let JsonpathValue::Value(query) = resolved {
                    let root = query.nodes[query.root];
                    let mut literal_kind: i32 = 0;
                    if root.kind == JSONPATH_NODE_STRING {
                        literal_kind = 4;
                    };
                    if root.kind == JSONPATH_NODE_NUMBER {
                        literal_kind = 3;
                    };
                    if root.kind == JSONPATH_NODE_TRUE {
                        literal_kind = 2;
                    };
                    if root.kind == JSONPATH_NODE_FALSE {
                        literal_kind = 1;
                    };
                    let mut nodes: Vec<JsonbNode> = Vec::new();
                    let literal = JsonbNode {
                        kind: literal_kind,
                        child: 0,
                        next: 0,
                        key_start: 0,
                        key_end: 0,
                        text_start: root.text_start,
                        text_end: root.text_end,
                    };
                    nodes.push(literal);
                    nodes.push(literal);
                    let mut document = input;
                    let mut variables = vars;
                    if utf8 {
                        document = jsonpath_execution_utf8_payload(document);
                        variables = jsonpath_execution_utf8_payload(variables);
                    };
                    let context = JsonpathExecutionContext {
                        document_characters: document.characters,
                        document_nodes: document.nodes,
                        document_root: document.root,
                        variables_characters: variables.characters,
                        variables_nodes: variables.nodes,
                        variables_root: variables.root,
                        literal_nodes: nodes,
                        path_characters: query.characters,
                        path_nodes: query.nodes,
                        path_root: query.root,
                        lax: query.lax,
                        utf8: utf8,
                        ordered_result: mode >= 2,
                    };
                    let sequence = jsonpath_execution_walk(&context, mode == 0);
                    if sequence.unknown {
                        return JsonbValue::Unknown;
                    };
                    if sequence.error > 0
                        && (suppress == false || sequence.error == JSONPATH_EXEC_VARIABLE)
                    {
                        return JsonbValue::Error(make_sql_error(sequence.error));
                    };
                    if mode == 0 {
                        if sequence.error > 0 {
                            return JsonbValue::Null;
                        };
                        return jsonpath_execution_boolean(sequence.items.len() > 0);
                    };
                    if mode == 1 {
                        if sequence.items.len() == 1 {
                            let node = jsonpath_execution_node(&context, sequence.items[0]);
                            if node.kind == 0 {
                                return JsonbValue::Null;
                            };
                            if node.kind == 1 || node.kind == 2 {
                                return jsonpath_execution_boolean(node.kind == 2);
                            };
                        };
                        if suppress {
                            return JsonbValue::Null;
                        };
                        return JsonbValue::Error(make_sql_error(JSONPATH_EXEC_SINGLETON));
                    };
                    return jsonpath_execution_output(&context, &sequence, mode == 2);
                };
            };
        };
    };
    JsonbValue::Unknown
}

fn jsonpath_execution_bool_result(input: JsonbValue) -> BoolValue {
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return BoolValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        return BoolValue::Value(value.nodes[value.root].kind == 2);
    };
    BoolValue::Unknown
}

pub fn jsonpath_exists_utf8(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> BoolValue {
    jsonpath_execution_bool_result(jsonpath_evaluate(
        document, path, variables, silent, 0, true,
    ))
}

pub fn sql__pg_catalog__jsonb_path_exists__81t5(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> BoolValue {
    jsonpath_execution_bool_result(jsonpath_evaluate(
        document, path, variables, silent, 0, false,
    ))
}

pub fn jsonpath_match_utf8(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> BoolValue {
    jsonpath_execution_bool_result(jsonpath_evaluate(
        document, path, variables, silent, 1, true,
    ))
}

pub fn sql__pg_catalog__jsonb_path_match__421e(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> BoolValue {
    jsonpath_execution_bool_result(jsonpath_evaluate(
        document, path, variables, silent, 1, false,
    ))
}

pub fn jsonpath_query_array_utf8(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> JsonbValue {
    jsonpath_evaluate(document, path, variables, silent, 2, true)
}

pub fn sql__pg_catalog__jsonb_path_query_array__qidf(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> JsonbValue {
    jsonpath_evaluate(document, path, variables, silent, 2, false)
}

pub fn jsonpath_query_first_utf8(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> JsonbValue {
    jsonpath_evaluate(document, path, variables, silent, 3, true)
}

pub fn sql__pg_catalog__jsonb_path_query_first__w0y6(
    document: JsonbValue,
    path: JsonpathValue,
    variables: JsonbValue,
    silent: BoolValue,
) -> JsonbValue {
    jsonpath_evaluate(document, path, variables, silent, 3, false)
}

pub fn jsonpath_exists_opr_utf8(document: JsonbValue, path: JsonpathValue) -> BoolValue {
    jsonpath_exists_utf8(
        document,
        path,
        jsonb_from_text(TextValue::Value("{}".to_owned())),
        BoolValue::Value(true),
    )
}

pub fn sql__pg_catalog__jsonb_path_exists_opr__8snd(
    document: JsonbValue,
    path: JsonpathValue,
) -> BoolValue {
    sql__pg_catalog__jsonb_path_exists__81t5(
        document,
        path,
        jsonb_from_text(TextValue::Value("{}".to_owned())),
        BoolValue::Value(true),
    )
}

pub fn jsonpath_match_opr_utf8(document: JsonbValue, path: JsonpathValue) -> BoolValue {
    jsonpath_match_utf8(
        document,
        path,
        jsonb_from_text(TextValue::Value("{}".to_owned())),
        BoolValue::Value(true),
    )
}

pub fn sql__pg_catalog__jsonb_path_match_opr__juo6(
    document: JsonbValue,
    path: JsonpathValue,
) -> BoolValue {
    sql__pg_catalog__jsonb_path_match__421e(
        document,
        path,
        jsonb_from_text(TextValue::Value("{}".to_owned())),
        BoolValue::Value(true),
    )
}
