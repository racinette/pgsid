const JSONPATH_EXEC_NUMBER: u32 = 3452663;

fn jsonpath_execution_numeric(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
) -> NumericValue {
    let unresolved_flavor: i32 = 0;
    if reference.source == 3 {
        return numeric_unresolved(unresolved_flavor);
    };
    let node = jsonpath_execution_node(context, reference);
    if node.kind != 3 {
        return NumericValue::Null;
    };
    // A number without text is a keyvalue id, a byte offset that waits on the server's encoding.
    if node.text_start == node.text_end {
        return numeric_unresolved(resolution_context(unresolved_flavor));
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
    NumericValue::Value(text)
}

fn jsonpath_arithmetic_binary(kind: i32, left: NumericValue, right: NumericValue) -> NumericValue {
    if let NumericValue::Null = left {
        return NumericValue::Error(make_sql_error(JSONPATH_EXEC_SINGLETON));
    };
    if let NumericValue::Null = right {
        return NumericValue::Error(make_sql_error(JSONPATH_EXEC_SINGLETON));
    };
    if kind == JSONPATH_NODE_ADD {
        return sql__pg_catalog__numeric_add__o3d7(left, right);
    };
    if kind == JSONPATH_NODE_SUB {
        return sql__pg_catalog__numeric_sub__ys09(left, right);
    };
    if kind == JSONPATH_NODE_MUL {
        return sql__pg_catalog__numeric_mul__bj4l(left, right);
    };
    if kind == JSONPATH_NODE_DIV {
        return sql__pg_catalog__numeric_div__pnzm(left, right);
    };
    sql__pg_catalog__numeric_mod__8ywz(left, right)
}

fn jsonpath_execution_literals(path: &JsonpathPayload) -> Vec<JsonbNode> {
    let mut nodes: Vec<JsonbNode> = Vec::new();
    let mut index: usize = 0;
    while index < path.nodes.len() {
        let node = path.nodes[index];
        let mut kind: i32 = 0;
        if node.kind == JSONPATH_NODE_STRING {
            kind = 4;
        };
        if node.kind == JSONPATH_NODE_NUMBER {
            kind = 3;
        };
        if node.kind == JSONPATH_NODE_TRUE {
            kind = 2;
        };
        if node.kind == JSONPATH_NODE_FALSE {
            kind = 1;
        };
        nodes.push(JsonbNode {
            kind: kind,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: node.text_start,
            text_end: node.text_end,
        });
        index += 1;
    }
    nodes
}
