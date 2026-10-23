pub(crate) fn xpath_eval_demand(program: &XPathProgram, root: usize, context: XPathContext, mode: i32, bound: XPathReference, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let node = program.nodes[root];
    if node.kind == XPATH_NUMBER { let text = xpath_parse_text(program,node.name); return xpath_number_text(text.as_str(),powers); };
    if node.kind == XPATH_STRING { return xpath_value_string(xpath_parse_text(program,node.name)); };
    if node.kind == XPATH_VARIABLE {
        if node.prefix.start != node.prefix.end { let prefix = xpath_parse_text(program,node.prefix); if xpath_namespace_defined(namespaces,prefix.as_str()) == false { return xpath_value_fault(19); }; };
        return xpath_value_fault(5);
    };
    if node.kind == XPATH_ROOT { return xpath_value_single(xpath_reference_node(0)); };
    if node.kind == XPATH_GROUP {
        let value = xpath_eval_demand(program,node.left,context,mode,bound,tree,graph,namespaces,powers);
        if mode == 1 { return value; }; return xpath_value_sorted(value,tree);
    };
    if node.kind == XPATH_STEP || node.kind == XPATH_PREDICATE {
        return xpath_collect(xpath_value_single(context.node),program,root,mode,bound,tree,graph,namespaces,powers);
    };
    if node.kind == XPATH_PATH {
        let left = xpath_eval_node(program,node.left,context,0,tree,graph,namespaces,powers);
        return xpath_collect(left,program,node.right,mode,bound,tree,graph,namespaces,powers);
    };
    if node.kind == XPATH_FILTER {
        let left_kind = program.nodes[node.left].kind;
        let position = xpath_constant_position(program,node.right,powers);
        let first = mode != 2 && position.valid && position.value == 1 && (left_kind == XPATH_GROUP || left_kind == XPATH_FILTER);
        let predicate = program.nodes[node.right];
        let mut last = false;
        if left_kind == XPATH_GROUP && predicate.kind == XPATH_FUNCTION && predicate.operation == 0 && predicate.prefix.start == predicate.prefix.end {
            let name = xpath_parse_text(program,predicate.name); last = name.as_str() == "last";
        };
        let mut demand: i32 = 0; if first { demand = 2; }; if last { demand = 3; };
        let input = xpath_eval_node(program,node.left,context,demand,tree,graph,namespaces,powers);
        if input.state < 0 || input.state == 2 || input.state == 3 { return input; };
        if input.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
        if input.state != 0 { return input; };
        let size = input.nodes.values.len() as i32;
        if first || last {
            if size == 0 { return input; };
            let mut index: usize = 0; if last { index = input.nodes.values.len()-1; };
            return xpath_value_single(input.nodes.values[index]);
        };
        let mut maximum = size; if mode == 2 { maximum = 1; };
        return xpath_filter_values(input,program,node.right,1,maximum,tree,graph,namespaces,powers);
    };
    if node.kind == XPATH_NEGATE {
        let input = xpath_eval_node(program,node.left,context,0,tree,graph,namespaces,powers);
        let value = xpath_value_to_number(input,tree,graph,powers);
        if value.state != 0 { return value; };
        return xpath_value_number(-f64::from_bits(value.number as u64));
    };
    if node.kind == XPATH_BINARY {
        let mut demand: i32 = 0; if node.operation == 14 && (mode == 2 || mode == 3) { demand = mode; };
        let mut left = xpath_eval_demand(program,node.left,context,demand,bound,tree,graph,namespaces,powers);
        if node.operation == 14 && demand != 0 { left = xpath_value_sorted(left,tree); };
        if left.state < 0 || left.state == 2 || left.state == 3 { return left; };
        if node.operation == 1 || node.operation == 2 {
            let boolean = xpath_value_to_boolean(&left); if boolean.state != 0 { return boolean; };
            if (node.operation == 1 && boolean.boolean) || (node.operation == 2 && boolean.boolean == false) { return boolean; };
            let right = xpath_eval_node(program,node.right,context,0,tree,graph,namespaces,powers);
            return xpath_value_to_boolean(&right);
        };
        let mut next_bound = bound;
        if demand != 0 && left.kind == XPATH_KIND_NODES && left.state == 0 && left.nodes.values.len() > 0 {
            let mut index: usize = 0; if demand == 3 { index = left.nodes.values.len()-1; };
            next_bound = left.nodes.values[index];
        };
        let right = xpath_eval_demand(program,node.right,context,demand,next_bound,tree,graph,namespaces,powers);
        if right.state < 0 || right.state == 2 || right.state == 3 { return right; };
        if node.operation >= 3 && node.operation <= 8 { return xpath_values_compare(&left,&right,node.operation,tree,graph,powers); };
        if node.operation == 14 {
            if left.kind != XPATH_KIND_NODES || right.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
            if left.state != 0 { return left; }; if right.state != 0 { return right; };
            let a = XPathNodes { values: left.nodes.values }; let b = XPathNodes { values: right.nodes.values };
            let merged = xpath_nodes_merge(a,&b,tree);
            return xpath_value_nodes(XPathSequence { values: merged.values, cyclic: false, cycle: 0 });
        };
        return xpath_binary_arithmetic(left,right,node.operation,tree,graph,powers);
    };
    if node.kind == XPATH_FUNCTION {
        let name = xpath_parse_text(program,node.name);
        let mut parameters = xpath_arguments_empty(); let mut cursor = node.left;
        while cursor > 0 {
            let link = program.nodes[cursor]; let mut value = xpath_eval_node(program,link.left,context,0,tree,graph,namespaces,powers);
            if value.state < 0 || value.state == 2 || value.state == 3 { return value; };
            if name.as_str() != "count" || node.prefix.start != node.prefix.end { value = xpath_value_sorted(value,tree); };
            parameters = xpath_arguments_add(parameters,value); cursor = link.right;
        }
        if node.prefix.start != node.prefix.end {
            let prefix = xpath_parse_text(program,node.prefix);
            if xpath_namespace_defined(namespaces,prefix.as_str()) == false { return xpath_value_fault(19); };
            return xpath_value_fault(9);
        };
        let spec = xpath_function_spec(name.as_str()); if spec.kind == 0 { return xpath_value_fault(9); };
        if node.operation < spec.minimum || (spec.maximum >= 0 && node.operation > spec.maximum) { return xpath_value_fault(12); };
        return xpath_apply_function(parameters,spec.kind,context,tree,graph,powers);
    };
    xpath_value_fault(10)
}

fn xpath_evaluate(program: &XPathProgram, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    if program.valid == false { return xpath_value_fault(7); };
    let context = XPathContext { node: xpath_reference_node(0), position: -1, size: -1 };
    let result = xpath_eval_node(program,program.root,context,0,tree,graph,namespaces,powers);
    xpath_value_sorted(result,tree)
}

pub(crate) fn xpath_eval_node(program: &XPathProgram, root: usize, context: XPathContext, mode: i32, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    xpath_eval_demand(program,root,context,mode,absent,tree,graph,namespaces,powers)
}
