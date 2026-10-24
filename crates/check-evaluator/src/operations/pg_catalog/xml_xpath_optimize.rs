#[derive(Clone, Copy)]
struct XPathRuntimeVisit { node: usize, depth: i32 }

pub(crate) fn xpath_runtime_optimize(input: XPathRuntimePlan, declared_limit: i32) -> XPathRuntimePlan {
    let mut plan = input; let mut limit = declared_limit; if limit <= 0 { limit = XPATH_MIN_RECURSION_LIMIT; };
    let mut pending: Vec<XPathRuntimeVisit> = Vec::new(); pending.push(XPathRuntimeVisit { node: plan.root, depth: 0 });
    let mut head: usize = 1;
    while head > 0 {
        let frame = pending[head-1]; head = head-1; let node = plan.nodes[frame.node];
        if node.kind == XPATH_PATH && plan.nodes[node.right].kind == XPATH_STEP {
            let step = plan.nodes[node.right]; let prior = plan.nodes[node.left];
            if prior.kind == XPATH_PATH && plan.nodes[prior.right].kind == XPATH_STEP {
                let previous = plan.nodes[prior.right]; let mut axis: i32 = 0;
                if previous.operation == 6 && previous.right == 2 {
                    if step.operation == 1 || step.operation == 5 { axis = 5; };
                    if step.operation == 3 || step.operation == 6 { axis = 6; };
                };
                if axis > 0 {
                    plan = xpath_runtime_push(plan,xpath_parse_node(XPATH_STEP,axis,step.left,step.right,step.prefix,step.name)); let data = plan.last;
                    plan = xpath_runtime_replace(plan,frame.node,xpath_parse_node(node.kind,node.operation,prior.left,data,node.prefix,node.name));
                };
            };
        };
        let selected = plan.nodes[frame.node];
        if frame.depth < limit && selected.kind != XPATH_NUMBER && selected.kind != XPATH_STRING && selected.kind != XPATH_STEP {
            let next_depth = frame.depth+1; let mut right = selected.right;
            if selected.kind == XPATH_PATH && plan.nodes[right].kind == XPATH_STEP { right = 0; };
            if right > 0 {
                let visit = XPathRuntimeVisit { node: right, depth: next_depth };
                if head < pending.len() { pending[head] = visit; } else { pending.push(visit); }; head += 1;
            };
            let left = selected.left;
            if left > 0 && (selected.kind != XPATH_PREDICATE || plan.nodes[left].kind != XPATH_STEP) {
                let visit = XPathRuntimeVisit { node: left, depth: next_depth };
                if head < pending.len() { pending[head] = visit; } else { pending.push(visit); }; head += 1;
            };
        };
    }
    plan
}
