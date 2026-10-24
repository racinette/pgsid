#[derive(Clone, Copy)]
struct XPathRuntimeRoot { value: usize, data: usize }

#[derive(Clone)]
struct XPathRuntimePlan { nodes: Vec<XPathExpression>, roots: Vec<XPathRuntimeRoot>, root: usize, last: usize }

fn xpath_runtime_empty() -> XPathRuntimePlan {
    let nodes: Vec<XPathExpression> = Vec::new(); let roots: Vec<XPathRuntimeRoot> = Vec::new();
    XPathRuntimePlan { nodes, roots, root: 0, last: 0 }
}

pub(crate) fn xpath_runtime_push(input: XPathRuntimePlan, node: XPathExpression) -> XPathRuntimePlan {
    let mut nodes = input.nodes; let last = nodes.len(); nodes.push(node);
    XPathRuntimePlan { nodes, roots: input.roots, root: input.root, last }
}

pub(crate) fn xpath_runtime_map(input: XPathRuntimePlan, mapped: XPathRuntimeRoot) -> XPathRuntimePlan {
    let mut roots = input.roots; roots.push(mapped);
    XPathRuntimePlan { nodes: input.nodes, roots, root: input.root, last: input.last }
}

pub(crate) fn xpath_runtime_replace(input: XPathRuntimePlan, index: usize, node: XPathExpression) -> XPathRuntimePlan {
    let mut nodes = input.nodes; nodes[index] = node;
    XPathRuntimePlan { nodes, roots: input.roots, root: input.root, last: input.last }
}

pub(crate) fn xpath_runtime_sort(input: XPathRuntimePlan, root: usize) -> XPathRuntimePlan {
    let node = input.nodes[root];
    if node.kind == XPATH_NUMBER || node.kind == XPATH_STRING {
        return XPathRuntimePlan { nodes: input.nodes, roots: input.roots, root: input.root, last: root };
    };
    let empty = XmlSpan { start: 0, end: 0 };
    xpath_runtime_push(input,xpath_parse_node(XPATH_GROUP,0,root,0,empty,empty))
}

pub(crate) fn xpath_runtime_compile(input: XPathProgram) -> XPathProgram {
    let empty = XmlSpan { start: 0, end: 0 };
    let mut plan = xpath_runtime_push(xpath_runtime_empty(),xpath_parse_node(0,0,0,0,empty,empty));
    plan = xpath_runtime_map(plan,XPathRuntimeRoot { value: 0, data: 0 });
    let mut index: usize = 1;
    while index < input.nodes.len() {
        let node = input.nodes[index]; let mut data: usize = 0; let mut value: usize = 0;
        if node.kind == XPATH_STEP || node.kind == XPATH_PREDICATE {
            let mut left = node.left; let mut right = node.right;
            if node.kind == XPATH_PREDICATE { left = plan.roots[node.left].data; right = plan.roots[node.right].value; };
            plan = xpath_runtime_push(plan,xpath_parse_node(node.kind,node.operation,left,right,node.prefix,node.name)); data = plan.last;
            plan = xpath_runtime_push(plan,xpath_parse_node(XPATH_CONTEXT,0,0,0,empty,empty)); let context = plan.last;
            if node.kind == XPATH_STEP && node.operation == 3 && node.name.start == node.name.end { value = context; }
            else { plan = xpath_runtime_push(plan,xpath_parse_node(XPATH_PATH,0,context,data,empty,empty)); value = plan.last; };
        } else if node.kind == XPATH_ARGUMENT { value = plan.roots[node.left].value; }
        else if node.kind == XPATH_GROUP {
            let child = plan.roots[node.left].value; plan = xpath_runtime_sort(plan,child); value = plan.last;
        } else if node.kind == XPATH_PATH {
            let child = plan.roots[node.left].value; data = plan.roots[node.right].data;
            let step = plan.nodes[data];
            if step.kind == XPATH_STEP && step.operation == 3 && step.name.start == step.name.end { value = child; }
            else { plan = xpath_runtime_push(plan,xpath_parse_node(XPATH_PATH,0,child,data,empty,empty)); value = plan.last; };
        } else if node.kind == XPATH_FUNCTION {
            let name = xpath_parse_text(&input,node.name); let sort = name.as_str() != "count" || node.prefix.start != node.prefix.end;
            let mut cursor = node.left; let mut previous: usize = 0;
            while cursor > 0 {
                let argument = input.nodes[cursor]; let mut child = plan.roots[argument.left].value;
                if sort { plan = xpath_runtime_sort(plan,child); child = plan.last; };
                plan = xpath_runtime_push(plan,xpath_parse_node(XPATH_ARGUMENT,0,previous,child,empty,empty)); previous = plan.last;
                cursor = argument.right;
            }
            plan = xpath_runtime_push(plan,xpath_parse_node(node.kind,node.operation,previous,0,node.prefix,node.name)); value = plan.last;
        } else {
            let mut left: usize = 0; let mut right: usize = 0;
            if node.left > 0 { left = plan.roots[node.left].value; };
            if node.right > 0 { right = plan.roots[node.right].value; };
            if node.kind == XPATH_FILTER { plan = xpath_runtime_sort(plan,right); right = plan.last; };
            plan = xpath_runtime_push(plan,xpath_parse_node(node.kind,node.operation,left,right,node.prefix,node.name)); value = plan.last;
        };
        plan = xpath_runtime_map(plan,XPathRuntimeRoot { value, data }); index += 1;
    }
    let unsorted_root = plan.roots[input.root].value; plan = xpath_runtime_sort(plan,unsorted_root); let root = plan.last;
    plan = XPathRuntimePlan { nodes: plan.nodes, roots: plan.roots, root, last: root };
    let runtime = xpath_runtime_optimize(plan,input.budget.limit);
    XPathProgram { source: input.source, nodes: input.nodes, cursor: input.cursor, root: input.root, valid: input.valid, budget: input.budget, runtime }
}
