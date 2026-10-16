const JSONPATH_EXEC_SUBSCRIPT: u32 = 3452655;
const JSONPATH_EXEC_ARRAY: u32 = 3452661;
const JSONPATH_EXEC_MEMBER: u32 = 3452662;
const JSONPATH_EXEC_OBJECT: u32 = 3452664;
const JSONPATH_EXEC_SINGLETON: u32 = 3452660;
const JSONPATH_EXEC_VARIABLE: u32 = 6820852;
const JSONPATH_EXEC_PARAMETER: u32 = 3452619;
const JSONPATH_EXEC_INTERNAL: u32 = 56966976;

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
    mark: usize,
    scope: JsonpathExecutionScope,
}

#[derive(Clone)]
struct JsonpathSequence {
    items: Vec<JsonpathReference>,
    numbers: Vec<NumericValue>,
    error: u32,
    unknown: bool,
}

fn jsonpath_execution_node(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
) -> JsonbNode {
    if reference.source == 4 {
        return JsonbNode {
            kind: reference.node as i32,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        };
    };
    if reference.source == 3 {
        return JsonbNode {
            kind: 3,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        };
    };
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
    collecting: bool,
) -> bool {
    if context.utf8 || (context.ordered_result == false && continuation == 0 && collecting == false)
    {
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
        mark: 0,
        scope: jsonpath_execution_empty_scope(),
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
                    && node.kind != JSONPATH_NODE_CURRENT
                    && node.kind != JSONPATH_NODE_FILTER
                    && node.kind != JSONPATH_NODE_EXISTS
                    && node.kind != JSONPATH_NODE_NOT
                    && node.kind != JSONPATH_NODE_IS_UNKNOWN
                    && (node.kind < JSONPATH_NODE_PLUS || node.kind > JSONPATH_NODE_STARTS)
                {
                    return JsonpathValue::Unknown;
                };
                if jsonpath_predicate_kind(node.kind) && node.next > 0 {
                    return JsonpathValue::Unknown;
                };
                if node.kind >= JSONPATH_NODE_PLUS && node.kind <= JSONPATH_NODE_MOD {
                    if node.next > 0 || path.nodes[node.left].next > 0 {
                        return JsonpathValue::Unknown;
                    };
                    if node.right > 0 && path.nodes[node.right].next > 0 {
                        return JsonpathValue::Unknown;
                    };
                };
                index += 1;
            }
            return JsonpathValue::Value(path);
        };
        return JsonpathValue::Unknown;
    };
    input
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
    let mut item_count: usize = 0;
    let mut numbers: Vec<NumericValue> = Vec::new();
    let mut operands: Vec<JsonpathReference> = Vec::new();
    let mut collect_depth: usize = 0;
    let mut collect_base: usize = 0;
    let mut collect_unwrap = false;
    let mut innermost_size: i32 = -1;
    let mut current = JsonpathReference {
        source: 0,
        node: context.document_root,
    };
    let mut exists_stop: usize = 0;
    let mut exists_depth: usize = 0;
    let mut caught_error = false;
    let mut error: u32 = 0;
    let mut unknown = false;
    while count > 0 && error == 0 && unknown == false {
        count = count - 1;
        let task = tasks[count];
        let value = jsonpath_execution_node(context, task.reference);
        let mut pending: Vec<JsonpathExecutionTask> = Vec::new();
        let mut computed = NumericValue::Unknown;
        let computed_index = numbers.len();
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
                    mark: 0,
                    scope: jsonpath_execution_empty_scope(),
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
                mark: 0,
                scope: jsonpath_execution_empty_scope(),
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
                        mark: 0,
                        scope: jsonpath_execution_empty_scope(),
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
                collect_depth > 0,
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
                    mark: 0,
                    scope: jsonpath_execution_empty_scope(),
                });
            };
        } else if task.mode == 4 {
            let spec = context.path_nodes[task.spec];
            pending.push(JsonpathExecutionTask {
                mode: 11,
                step: task.step,
                reference: task.reference,
                unwrap: collect_unwrap,
                ignore: task.ignore,
                level: task.level,
                spec: task.spec,
                from: 0,
                to: 0,
                mark: item_count,
                scope: jsonpath_execution_empty_scope(),
            });
            if collect_depth == 0 {
                collect_base = item_count;
            };
            collect_depth += 1;
            collect_unwrap = false;
            pending.push(jsonpath_execution_make_task(
                0,
                spec.left,
                task.reference,
                context.lax,
                task.ignore,
            ));
        } else if task.mode == 7 {
            let step = context.path_nodes[task.step];
            pending.push(JsonpathExecutionTask {
                mode: 8,
                step: task.step,
                reference: task.reference,
                unwrap: task.unwrap,
                ignore: task.ignore,
                level: item_count,
                spec: 0,
                from: 0,
                to: 0,
                mark: task.mark,
                scope: jsonpath_execution_empty_scope(),
            });
            pending.push(jsonpath_execution_make_task(
                0,
                step.right,
                task.reference,
                context.lax,
                task.ignore,
            ));
        } else if task.mode == 8 {
            collect_depth = collect_depth - 1;
            collect_unwrap = task.unwrap;
            if task.level - task.mark != 1 || item_count - task.level != 1 {
                error = JSONPATH_EXEC_SINGLETON;
            } else {
                let first = items[task.mark];
                let second = items[task.level];
                let mut left = jsonpath_execution_numeric(context, first);
                let mut right = jsonpath_execution_numeric(context, second);
                if first.source == 3 {
                    left = numbers[first.node].clone();
                };
                if second.source == 3 {
                    right = numbers[second.node].clone();
                };
                computed =
                    jsonpath_arithmetic_binary(context.path_nodes[task.step].kind, left, right);
                pending.push(jsonpath_execution_make_task(
                    0,
                    context.path_nodes[task.step].next,
                    JsonpathReference {
                        source: 3,
                        node: numbers.len(),
                    },
                    context.lax,
                    task.ignore,
                ));
            };
            item_count = task.mark;
        } else if task.mode == 9 {
            collect_depth = collect_depth - 1;
            collect_unwrap = task.unwrap;
            let start = operands.len();
            let mut index = task.mark;
            while index < item_count {
                operands.push(items[index]);
                index += 1;
            }
            item_count = task.mark;
            if operands.len() > start {
                pending.push(JsonpathExecutionTask {
                    mode: 10,
                    step: task.step,
                    reference: task.reference,
                    unwrap: context.lax,
                    ignore: task.ignore,
                    level: start,
                    spec: operands.len(),
                    from: 0,
                    to: 0,
                    mark: 0,
                    scope: jsonpath_execution_empty_scope(),
                });
            };
        } else if task.mode == 10 {
            let step = context.path_nodes[task.step];
            if task.level + 1 < task.spec {
                pending.push(JsonpathExecutionTask {
                    mode: 10,
                    step: task.step,
                    reference: task.reference,
                    unwrap: task.unwrap,
                    ignore: task.ignore,
                    level: task.level + 1,
                    spec: task.spec,
                    from: 0,
                    to: 0,
                    mark: 0,
                    scope: jsonpath_execution_empty_scope(),
                });
            };
            let selected = operands[task.level];
            let mut number = jsonpath_execution_numeric(context, selected);
            if selected.source == 3 {
                number = numbers[selected.node].clone();
            };
            let mut numeric = false;
            if let NumericValue::Value(_) = number {
                numeric = true;
            };
            if numeric {
                computed = number;
                if step.kind == JSONPATH_NODE_MINUS {
                    computed = sql__pg_catalog__numeric_uminus__wcmy(computed);
                };
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.next,
                    JsonpathReference {
                        source: 3,
                        node: numbers.len(),
                    },
                    context.lax,
                    task.ignore,
                ));
            } else if context.lax == false
                || step.next > 0
                || ((existence == false || collect_depth > 0)
                    && (exists_stop == 0 || collect_depth != exists_depth))
            {
                error = JSONPATH_EXEC_NUMBER;
            };
        } else if task.mode == 11 || task.mode == 12 {
            collect_depth = collect_depth - 1;
            collect_unwrap = task.unwrap;
            let mut index = Int4Value::Error(make_sql_error(JSONPATH_EXEC_SUBSCRIPT));
            if item_count - task.mark == 1 {
                let selected = items[task.mark];
                let mut number = jsonpath_execution_numeric(context, selected);
                if selected.source == 3 {
                    number = numbers[selected.node].clone();
                };
                let mut numeric = false;
                if let NumericValue::Value(_) = number {
                    numeric = true;
                };
                if numeric {
                    index = sql__pg_catalog__int4__z4rh(sql__pg_catalog__trunc__dghz(number));
                    if let Int4Value::Error(_) = index {
                        index = Int4Value::Error(make_sql_error(JSONPATH_EXEC_SUBSCRIPT));
                    };
                };
            };
            item_count = task.mark;
            if let Int4Value::Error(failure) = index {
                error = failure.state;
            };
            if let Int4Value::Unknown = index {
                unknown = true;
            };
            if let Int4Value::Value(position) = index {
                let spec = context.path_nodes[task.spec];
                if task.mode == 11 && spec.right > 0 {
                    pending.push(JsonpathExecutionTask {
                        mode: 12,
                        step: task.step,
                        reference: task.reference,
                        unwrap: collect_unwrap,
                        ignore: task.ignore,
                        level: task.level,
                        spec: task.spec,
                        from: position,
                        to: 0,
                        mark: item_count,
                        scope: jsonpath_execution_empty_scope(),
                    });
                    if collect_depth == 0 {
                        collect_base = item_count;
                    };
                    collect_depth += 1;
                    collect_unwrap = false;
                    pending.push(jsonpath_execution_make_task(
                        0,
                        spec.right,
                        task.reference,
                        context.lax,
                        task.ignore,
                    ));
                } else {
                    let mut begin = task.from;
                    if task.mode == 11 {
                        begin = position;
                    };
                    pending.push(JsonpathExecutionTask {
                        mode: 13,
                        step: task.step,
                        reference: task.reference,
                        unwrap: context.lax,
                        ignore: task.ignore,
                        level: task.level,
                        spec: task.spec,
                        from: begin,
                        to: position,
                        mark: 0,
                        scope: jsonpath_execution_empty_scope(),
                    });
                };
            };
        } else if task.mode == 13 {
            let step = context.path_nodes[task.step];
            let spec = context.path_nodes[task.spec];
            let size = task.level as i32;
            if task.ignore == false && (task.from < 0 || task.from > task.to || task.to >= size) {
                error = JSONPATH_EXEC_SUBSCRIPT;
            } else {
                if spec.next > 0 {
                    pending.push(JsonpathExecutionTask {
                        mode: 4,
                        step: task.step,
                        reference: task.reference,
                        unwrap: task.unwrap,
                        ignore: task.ignore,
                        level: task.level,
                        spec: spec.next,
                        from: 0,
                        to: 0,
                        mark: 0,
                        scope: jsonpath_execution_empty_scope(),
                    });
                };
                let mut from = task.from;
                let mut to = task.to;
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
                        mark: 0,
                        scope: jsonpath_execution_empty_scope(),
                    });
                };
            };
        } else if task.mode == 14 {
            innermost_size = task.from;
        } else if task.mode == 15 || task.mode == 16 || task.mode == 17 {
            let step = context.path_nodes[task.step];
            let mut predicate: i32 = 1;
            let mut ready = true;
            if caught_error {
                predicate = 0;
                caught_error = false;
            } else if task.mode == 15 {
                let scope = task.scope;
                pending.push(jsonpath_execution_predicate_task(
                    16,
                    task.step,
                    task.reference,
                    task.ignore,
                    task.mark,
                    item_count,
                    0,
                    scope,
                ));
                collect_unwrap = step.kind != JSONPATH_NODE_STARTS;
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.right,
                    task.reference,
                    context.lax,
                    task.ignore,
                ));
                ready = false;
            } else if task.mode == 17 {
                if item_count > task.mark {
                    predicate = 2;
                };
            } else {
                let mut left_index = task.mark;
                let mut error_pair = false;
                let mut found_pair = false;
                while left_index < task.level && ready && unknown == false {
                    let mut right_index = task.level;
                    while right_index < item_count && ready && unknown == false {
                        let first = items[left_index];
                        let second = items[right_index];
                        let mut left_number = jsonpath_execution_numeric(context, first);
                        let mut right_number = jsonpath_execution_numeric(context, second);
                        if first.source == 3 {
                            left_number = numbers[first.node].clone();
                        };
                        if second.source == 3 {
                            right_number = numbers[second.node].clone();
                        };
                        let result = jsonpath_predicate_pair(
                            context,
                            step.kind,
                            first,
                            second,
                            left_number,
                            right_number,
                        );
                        if result.deferred {
                            unknown = true;
                        } else if result.state == 0 {
                            error_pair = true;
                            if context.lax == false {
                                predicate = 0;
                                ready = false;
                            };
                        } else if result.state == 2 {
                            found_pair = true;
                            if context.lax {
                                predicate = 2;
                                ready = false;
                            };
                        };
                        right_index += 1;
                    }
                    left_index += 1;
                }
                if ready {
                    if found_pair {
                        predicate = 2;
                    } else if error_pair {
                        predicate = 0;
                    };
                };
                ready = true;
            };
            if ready {
                item_count = task.mark;
                collect_depth = task.scope.depth;
                collect_base = task.scope.base;
                collect_unwrap = task.scope.unwrap;
                innermost_size = task.scope.size;
                current = task.scope.current;
                exists_stop = task.scope.exists_stop;
                exists_depth = task.scope.exists_depth;
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.next,
                    JsonpathReference {
                        source: 4,
                        node: usize::try_from(predicate).unwrap_or(0),
                    },
                    context.lax,
                    task.ignore,
                ));
            };
        } else if task.mode == 18 || task.mode == 19 || task.mode == 20 || task.mode == 21 {
            let step = context.path_nodes[task.step];
            let mut predicate: i32 = 0;
            if item_count - task.mark == 1 {
                predicate = jsonpath_execution_node(context, items[task.mark]).kind;
            } else {
                error = JSONPATH_EXEC_INTERNAL;
            };
            item_count = task.mark;
            collect_depth = task.scope.depth;
            collect_base = task.scope.base;
            collect_unwrap = task.scope.unwrap;
            innermost_size = task.scope.size;
            current = task.scope.current;
            exists_stop = task.scope.exists_stop;
            exists_depth = task.scope.exists_depth;
            let mut ready = true;
            if task.mode == 18 {
                if (step.kind == JSONPATH_NODE_AND && predicate == 1)
                    || (step.kind == JSONPATH_NODE_OR && predicate == 2)
                {
                } else {
                    if context.path_nodes[step.right].next > 0 {
                        error = JSONPATH_EXEC_INTERNAL;
                    } else {
                        pending.push(jsonpath_execution_predicate_task(
                            19,
                            task.step,
                            task.reference,
                            task.ignore,
                            item_count,
                            0,
                            predicate,
                            task.scope,
                        ));
                        if collect_depth == 0 {
                            collect_base = item_count;
                        };
                        collect_depth += 1;
                        collect_unwrap = false;
                        exists_stop = 0;
                        exists_depth = 0;
                        pending.push(jsonpath_execution_make_task(
                            0,
                            step.right,
                            task.reference,
                            context.lax,
                            task.ignore,
                        ));
                    };
                    ready = false;
                };
            } else if task.mode == 19 {
                if (step.kind == JSONPATH_NODE_AND && predicate == 2)
                    || (step.kind == JSONPATH_NODE_OR && predicate == 1)
                {
                    predicate = task.from;
                };
            } else if task.mode == 20 {
                if step.kind == JSONPATH_NODE_NOT {
                    if predicate == 1 {
                        predicate = 2;
                    } else if predicate == 2 {
                        predicate = 1;
                    };
                } else {
                    if predicate == 0 {
                        predicate = 2;
                    } else {
                        predicate = 1;
                    };
                };
            } else {
                if predicate == 2 {
                    pending.push(jsonpath_execution_make_task(
                        0,
                        step.next,
                        task.reference,
                        context.lax,
                        task.ignore,
                    ));
                };
                ready = false;
            };
            if ready {
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.next,
                    JsonpathReference {
                        source: 4,
                        node: usize::try_from(predicate).unwrap_or(0),
                    },
                    context.lax,
                    task.ignore,
                ));
            };
        } else if task.step == 0 {
            if collect_depth > 0 && collect_unwrap && context.lax && task.unwrap && value.kind == 5
            {
                if value.child > 0 {
                    pending.push(jsonpath_execution_make_task(
                        1,
                        0,
                        JsonpathReference {
                            source: task.reference.source,
                            node: value.child,
                        },
                        false,
                        task.ignore,
                    ));
                };
            } else {
                if item_count < items.len() {
                    items[item_count] = task.reference;
                } else {
                    items.push(task.reference);
                };
                item_count += 1;
                if context.lax && exists_stop > 0 && collect_depth == exists_depth {
                    count = exists_stop;
                } else if existence && context.lax && collect_depth == 0 {
                    count = 0;
                };
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
                    JsonpathReference {
                        source: 2,
                        node: task.step,
                    },
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
                    } else if jsonpath_execution_ordered(
                        context,
                        task.reference,
                        step.next,
                        collect_depth > 0,
                    ) == false
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
                    pending.push(JsonpathExecutionTask {
                        mode: 14,
                        step: 0,
                        reference: task.reference,
                        unwrap: false,
                        ignore: task.ignore,
                        level: 0,
                        spec: 0,
                        from: innermost_size,
                        to: 0,
                        mark: 0,
                        scope: jsonpath_execution_empty_scope(),
                    });
                    innermost_size = size;
                    pending.push(JsonpathExecutionTask {
                        mode: 4,
                        step: task.step,
                        reference: task.reference,
                        unwrap: context.lax,
                        ignore: task.ignore,
                        level: usize::try_from(size).unwrap_or(0),
                        spec: step.left,
                        from: 0,
                        to: 0,
                        mark: 0,
                        scope: jsonpath_execution_empty_scope(),
                    });
                } else if task.ignore == false {
                    error = JSONPATH_EXEC_ARRAY;
                };
            } else if step.kind == JSONPATH_NODE_LAST {
                if innermost_size < 0 {
                    unknown = true;
                } else {
                    let text = int4_to_text(Int4Value::Value(innermost_size - 1));
                    if let TextValue::Value(number) = text {
                        computed = NumericValue::Value(number);
                    };
                    pending.push(jsonpath_execution_make_task(
                        0,
                        step.next,
                        JsonpathReference {
                            source: 3,
                            node: numbers.len(),
                        },
                        context.lax,
                        task.ignore,
                    ));
                };
            } else if step.kind >= JSONPATH_NODE_PLUS && step.kind <= JSONPATH_NODE_MOD {
                let mut mode: i32 = 7;
                if step.kind == JSONPATH_NODE_PLUS || step.kind == JSONPATH_NODE_MINUS {
                    mode = 9;
                };
                pending.push(JsonpathExecutionTask {
                    mode: mode,
                    step: task.step,
                    reference: task.reference,
                    unwrap: collect_unwrap,
                    ignore: task.ignore,
                    level: 0,
                    spec: 0,
                    from: 0,
                    to: 0,
                    mark: item_count,
                    scope: jsonpath_execution_empty_scope(),
                });
                if collect_depth == 0 {
                    collect_base = item_count;
                };
                collect_depth += 1;
                collect_unwrap = true;
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.left,
                    task.reference,
                    context.lax,
                    task.ignore,
                ));
            } else if step.kind == JSONPATH_NODE_CURRENT {
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.next,
                    current,
                    context.lax,
                    task.ignore,
                ));
            } else if (step.kind >= JSONPATH_NODE_EQ && step.kind <= JSONPATH_NODE_GE)
                || step.kind == JSONPATH_NODE_STARTS
                || step.kind == JSONPATH_NODE_EXISTS
            {
                let scope = jsonpath_execution_saved_scope(
                    current,
                    innermost_size,
                    collect_depth,
                    collect_base,
                    collect_unwrap,
                    exists_stop,
                    exists_depth,
                );
                let mut mode: i32 = 15;
                if step.kind == JSONPATH_NODE_EXISTS {
                    mode = 17;
                };
                pending.push(jsonpath_execution_predicate_task(
                    mode,
                    task.step,
                    task.reference,
                    task.ignore,
                    item_count,
                    0,
                    0,
                    scope,
                ));
                if collect_depth == 0 {
                    collect_base = item_count;
                };
                collect_depth += 1;
                collect_unwrap = step.kind != JSONPATH_NODE_EXISTS;
                exists_stop = 0;
                exists_depth = 0;
                if step.kind == JSONPATH_NODE_EXISTS && context.lax {
                    exists_stop = count + 1;
                    exists_depth = collect_depth;
                };
                pending.push(jsonpath_execution_make_task(
                    0,
                    step.left,
                    task.reference,
                    context.lax,
                    task.ignore,
                ));
            } else if step.kind == JSONPATH_NODE_AND
                || step.kind == JSONPATH_NODE_OR
                || step.kind == JSONPATH_NODE_NOT
                || step.kind == JSONPATH_NODE_IS_UNKNOWN
                || step.kind == JSONPATH_NODE_FILTER
            {
                if step.kind == JSONPATH_NODE_FILTER && task.unwrap && value.kind == 5 {
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
                } else if context.path_nodes[step.left].next > 0 {
                    error = JSONPATH_EXEC_INTERNAL;
                } else {
                    let scope = jsonpath_execution_saved_scope(
                        current,
                        innermost_size,
                        collect_depth,
                        collect_base,
                        collect_unwrap,
                        exists_stop,
                        exists_depth,
                    );
                    let mut mode: i32 = 18;
                    if step.kind == JSONPATH_NODE_NOT || step.kind == JSONPATH_NODE_IS_UNKNOWN {
                        mode = 20;
                    };
                    if step.kind == JSONPATH_NODE_FILTER {
                        mode = 21;
                        current = task.reference;
                    };
                    pending.push(jsonpath_execution_predicate_task(
                        mode,
                        task.step,
                        task.reference,
                        task.ignore,
                        item_count,
                        0,
                        0,
                        scope,
                    ));
                    if collect_depth == 0 {
                        collect_base = item_count;
                    };
                    collect_depth += 1;
                    collect_unwrap = false;
                    exists_stop = 0;
                    exists_depth = 0;
                    pending.push(jsonpath_execution_make_task(
                        0,
                        step.left,
                        task.reference,
                        context.lax,
                        task.ignore,
                    ));
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
        if let NumericValue::Error(failure) = computed {
            error = failure.state;
        };
        let mut computed_unknown = false;
        if let NumericValue::Unknown = computed {
            computed_unknown = true;
        };
        if let NumericValue::Value(number) = computed {
            numbers.push(NumericValue::Value(number));
        };
        let mut index: usize = 0;
        while index < pending.len() {
            if computed_unknown {
                if pending[index].reference.source == 3
                    && pending[index].reference.node == computed_index
                {
                    unknown = true;
                };
            };
            if count < tasks.len() {
                tasks[count] = pending[index];
            } else {
                tasks.push(pending[index]);
            };
            count += 1;
            index += 1;
        }
        if error > 0 && error != JSONPATH_EXEC_VARIABLE && error != JSONPATH_EXEC_INTERNAL {
            let mut position = count;
            let mut handled = false;
            while position > 0 && handled == false {
                position = position - 1;
                let frame = tasks[position];
                if frame.mode == 15 || frame.mode == 16 || frame.mode == 17 {
                    item_count = frame.mark;
                    collect_depth = frame.scope.depth;
                    collect_base = frame.scope.base;
                    collect_unwrap = frame.scope.unwrap;
                    innermost_size = frame.scope.size;
                    current = frame.scope.current;
                    exists_stop = frame.scope.exists_stop;
                    exists_depth = frame.scope.exists_depth;
                    count = position + 1;
                    caught_error = true;
                    error = 0;
                    handled = true;
                };
            }
        };
    }
    if collect_depth > 0 {
        item_count = collect_base;
    };
    let mut selected: Vec<JsonpathReference> = Vec::new();
    let mut index: usize = 0;
    while index < item_count {
        selected.push(items[index]);
        index += 1;
    }
    JsonpathSequence {
        items: selected,
        numbers: numbers,
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
            if task.reference.source == 3 {
                let number = sequence.numbers[task.reference.node].clone();
                if let NumericValue::Value(text) = number {
                    let content: Vec<char> = text.chars().collect();
                    let mut position: usize = 0;
                    while position < content.len() {
                        characters.push(content[position]);
                        position += 1;
                    }
                };
            };
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
                    let nodes = jsonpath_execution_literals(&query);
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
