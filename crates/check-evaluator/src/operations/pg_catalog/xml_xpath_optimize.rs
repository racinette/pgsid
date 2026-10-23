pub(crate) fn xpath_optimize(input: XPathProgram, root: usize) -> XPathProgram {
    let mut program = input; let node = program.nodes[root];
    if node.kind == XPATH_PATH && program.nodes[node.right].kind == XPATH_STEP {
        let next = program.nodes[node.right]; let previous = program.nodes[node.left];
        let mut previous_step: usize = 0;
        if previous.kind == XPATH_PATH { previous_step = previous.right; };
        if previous.kind == XPATH_STEP { previous_step = node.left; };
        let prior = program.nodes[previous_step];
        if prior.kind == XPATH_STEP && prior.operation == 6 && prior.right == 2 {
            let mut axis: i32 = 0;
            if next.operation == 1 || next.operation == 5 { axis = 5; };
            if next.operation == 3 || next.operation == 6 { axis = 6; };
            if axis != 0 {
                let mut nodes = program.nodes;
                nodes[node.right] = XPathExpression { kind: next.kind, operation: axis, left: next.left, right: next.right, prefix: next.prefix, name: next.name };
                if previous.kind == XPATH_PATH {
                    nodes[root] = XPathExpression { kind: node.kind, operation: node.operation, left: previous.left, right: node.right, prefix: node.prefix, name: node.name };
                } else {
                    nodes[node.left] = XPathExpression { kind: prior.kind, operation: 3, left: prior.left, right: prior.right, prefix: prior.prefix, name: prior.name };
                };
                program = XPathProgram { source: program.source, nodes, cursor: program.cursor, root: program.root, valid: program.valid };
            };
        };
    };
    let selected = program.nodes[root];
    if selected.kind == XPATH_PATH || selected.kind == XPATH_BINARY || selected.kind == XPATH_PREDICATE || selected.kind == XPATH_FILTER || selected.kind == XPATH_ARGUMENT {
        if selected.left > 0 { program = xpath_optimize(program,selected.left); };
        if selected.right > 0 { program = xpath_optimize(program,selected.right); };
    } else if selected.kind == XPATH_NEGATE || selected.kind == XPATH_GROUP || selected.kind == XPATH_FUNCTION {
        if selected.left > 0 { program = xpath_optimize(program,selected.left); };
    };
    program
}
