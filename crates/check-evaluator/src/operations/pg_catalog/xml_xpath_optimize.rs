#[derive(Clone, Copy)]
struct XPathOptimizeStep { node: usize, next: usize }

pub(crate) fn xpath_optimize(input: XPathProgram, root: usize) -> XPathProgram {
    let mut program = input;
    let mut pending: Vec<XPathOptimizeStep> = Vec::new(); pending.push(XPathOptimizeStep { node: root, next: 0 }); let mut head: usize = 1;
    while head > 0 {
        let frame = pending[head-1]; head = frame.next; let selected_root = frame.node; let node = program.nodes[selected_root];
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
                        nodes[selected_root] = XPathExpression { kind: node.kind, operation: node.operation, left: previous.left, right: node.right, prefix: node.prefix, name: node.name };
                    } else {
                        nodes[node.left] = XPathExpression { kind: prior.kind, operation: 3, left: prior.left, right: prior.right, prefix: prior.prefix, name: prior.name };
                    };
                    program = XPathProgram { source: program.source, nodes, cursor: program.cursor, root: program.root, valid: program.valid, budget: program.budget };
                };
            };
        };
        let selected = program.nodes[selected_root];
        if selected.kind == XPATH_PATH || selected.kind == XPATH_BINARY || selected.kind == XPATH_PREDICATE || selected.kind == XPATH_FILTER || selected.kind == XPATH_ARGUMENT {
            if selected.right > 0 { pending.push(XPathOptimizeStep { node: selected.right, next: head }); head = pending.len(); };
            if selected.left > 0 { pending.push(XPathOptimizeStep { node: selected.left, next: head }); head = pending.len(); };
        } else if selected.kind == XPATH_NEGATE || selected.kind == XPATH_GROUP || selected.kind == XPATH_FUNCTION {
            if selected.left > 0 { pending.push(XPathOptimizeStep { node: selected.left, next: head }); head = pending.len(); };
        };
    }
    program
}
