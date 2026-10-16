#[derive(Clone, Copy)]
struct JsonpathExecutionScope {
    current: JsonpathReference,
    size: i32,
    depth: usize,
    base: usize,
    unwrap: bool,
    exists_stop: usize,
    exists_depth: usize,
}

#[derive(Clone, Copy)]
struct JsonpathPredicateValue {
    state: i32,
    deferred: bool,
}

fn jsonpath_execution_empty_scope() -> JsonpathExecutionScope {
    JsonpathExecutionScope {
        current: JsonpathReference { source: 0, node: 0 },
        size: -1,
        depth: 0,
        base: 0,
        unwrap: false,
        exists_stop: 0,
        exists_depth: 0,
    }
}

fn jsonpath_execution_saved_scope(
    current: JsonpathReference,
    size: i32,
    depth: usize,
    base: usize,
    unwrap: bool,
    exists_stop: usize,
    exists_depth: usize,
) -> JsonpathExecutionScope {
    JsonpathExecutionScope {
        current: current,
        size: size,
        depth: depth,
        base: base,
        unwrap: unwrap,
        exists_stop: exists_stop,
        exists_depth: exists_depth,
    }
}

fn jsonpath_execution_predicate_task(
    mode: i32,
    step: usize,
    reference: JsonpathReference,
    ignore: bool,
    mark: usize,
    level: usize,
    from: i32,
    scope: JsonpathExecutionScope,
) -> JsonpathExecutionTask {
    JsonpathExecutionTask {
        mode: mode,
        step: step,
        reference: reference,
        unwrap: false,
        ignore: ignore,
        level: level,
        spec: 0,
        from: from,
        to: 0,
        mark: mark,
        scope: scope,
    }
}

fn jsonpath_predicate_kind(kind: i32) -> bool {
    kind == JSONPATH_NODE_REGEX
        || kind == JSONPATH_NODE_EXISTS
        || kind == JSONPATH_NODE_NOT
        || kind == JSONPATH_NODE_IS_UNKNOWN
        || (kind >= JSONPATH_NODE_EQ && kind <= JSONPATH_NODE_STARTS)
}

fn jsonpath_predicate_pair(
    context: &JsonpathExecutionContext,
    kind: i32,
    left: JsonpathReference,
    right: JsonpathReference,
    left_number: NumericValue,
    right_number: NumericValue,
    left_text: TextValue,
    right_text: TextValue,
) -> JsonpathPredicateValue {
    let a = jsonpath_execution_node(context, left);
    let b = jsonpath_execution_node(context, right);
    let boolean_a = a.kind == 1 || a.kind == 2;
    let boolean_b = b.kind == 1 || b.kind == 2;
    let same_type = a.kind == b.kind || (boolean_a && boolean_b);
    if kind == JSONPATH_NODE_STARTS {
        if a.kind != 4 || b.kind != 4 {
            return JsonpathPredicateValue {
                state: 0,
                deferred: false,
            };
        };
    } else if same_type == false {
        if a.kind == 0 || b.kind == 0 {
            let mut result: i32 = 1;
            if kind == JSONPATH_NODE_NE {
                result = 2;
            };
            return JsonpathPredicateValue {
                state: result,
                deferred: false,
            };
        };
        return JsonpathPredicateValue {
            state: 0,
            deferred: false,
        };
    };
    if a.kind >= 5 {
        return JsonpathPredicateValue {
            state: 0,
            deferred: false,
        };
    };
    let mut order: i32 = 0;
    if boolean_a {
        order = a.kind - b.kind;
    };
    if a.kind == 3 {
        let result = numeric_compare(left_number, right_number);
        let mut known = false;
        if let Int4Value::Value(value) = result {
            order = value;
            known = true;
        };
        if known == false {
            return JsonpathPredicateValue {
                state: 0,
                deferred: true,
            };
        };
    };
    if a.kind == 4 {
        if left.source == 5 || right.source == 5 {
            let mut first = left_text;
            let mut second = right_text;
            if left.source != 5 {
                first = jsonpath_method_text(context, left);
            };
            if right.source != 5 {
                second = jsonpath_method_text(context, right);
            };
            return jsonpath_conversion_text_predicate(kind, first, second, context.utf8);
        };
        let mut first = a.text_start;
        let mut second = b.text_start;
        let mut unicode = false;
        while first < a.text_end {
            if jsonpath_execution_character(context, left.source, first) as i32 > 127 {
                unicode = true;
            };
            first += 1;
        }
        while second < b.text_end {
            if jsonpath_execution_character(context, right.source, second) as i32 > 127 {
                unicode = true;
            };
            second += 1;
        }
        if unicode && context.utf8 == false {
            return JsonpathPredicateValue {
                state: 0,
                deferred: true,
            };
        };
        if kind == JSONPATH_NODE_STARTS {
            let mut result: i32 = 2;
            if b.text_end - b.text_start > a.text_end - a.text_start {
                result = 1;
            } else {
                let mut offset: usize = 0;
                while offset < b.text_end - b.text_start {
                    if jsonpath_execution_character(context, left.source, a.text_start + offset)
                        != jsonpath_execution_character(
                            context,
                            right.source,
                            b.text_start + offset,
                        )
                    {
                        result = 1;
                    };
                    offset += 1;
                }
            };
            return JsonpathPredicateValue {
                state: result,
                deferred: false,
            };
        };
        first = a.text_start;
        second = b.text_start;
        while first < a.text_end && second < b.text_end && order == 0 {
            let code_a = jsonpath_execution_character(context, left.source, first) as i32;
            let code_b = jsonpath_execution_character(context, right.source, second) as i32;
            if code_a < code_b {
                order = -1;
            } else if code_a > code_b {
                order = 1;
            };
            first += 1;
            second += 1;
        }
        if order == 0 {
            if first < a.text_end {
                order = 1;
            };
            if second < b.text_end {
                order = -1;
            };
        };
    };
    let mut result = false;
    if kind == JSONPATH_NODE_EQ {
        result = order == 0;
    };
    if kind == JSONPATH_NODE_NE {
        result = order != 0;
    };
    if kind == JSONPATH_NODE_LT {
        result = order < 0;
    };
    if kind == JSONPATH_NODE_LE {
        result = order <= 0;
    };
    if kind == JSONPATH_NODE_GT {
        result = order > 0;
    };
    if kind == JSONPATH_NODE_GE {
        result = order >= 0;
    };
    let mut state: i32 = 1;
    if result {
        state = 2;
    };
    JsonpathPredicateValue {
        state: state,
        deferred: false,
    }
}
