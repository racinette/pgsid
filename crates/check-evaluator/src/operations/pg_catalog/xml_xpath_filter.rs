pub(crate) fn xpath_filter_values(input: XPathValue, program: &XPathProgram, predicate: usize, minimum: i32, maximum: i32, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    if input.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
    if input.state != 0 { return input; };
    let size = input.nodes.values.len() as i32;
    let mut values: Vec<XPathReference> = Vec::new();
    if size < minimum { return xpath_value_nodes(XPathSequence { values, cyclic: false, cycle: 0 }); };
    let mut index: usize = 0; let mut matched: i32 = 0; let mut finished = false;
    while index < input.nodes.values.len() && finished == false {
        let node = input.nodes.values[index]; let context = XPathContext { node, position: index as i32+1, size };
        let result = xpath_eval_node(program,predicate,context,1,tree,graph,namespaces,powers);
        if result.state != 0 { return xpath_value_empty(XPATH_KIND_NODES,result.state); };
        let mut keep = xpath_value_truth(&result);
        if result.kind == XPATH_KIND_NUMBER { keep = f64::from_bits(result.number as u64) == context.position as f64; };
        if keep {
            matched = matched+1;
            if matched >= minimum && matched <= maximum { values.push(node); };
            if matched == maximum { finished = true; };
        };
        index += 1;
    }
    xpath_value_nodes(XPathSequence { values, cyclic: false, cycle: 0 })
}

pub(crate) fn xpath_collect(input: XPathValue, program: &XPathProgram, root: usize, mode: i32, bound: XPathReference, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    if input.state < 0 || input.state == 2 || input.state == 3 { return input; };
    if input.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
    let mut predicates: Vec<usize> = Vec::new(); let mut index = root;
    while program.nodes[index].kind == XPATH_PREDICATE { predicates.push(program.nodes[index].right); index = program.nodes[index].left; }
    let step = program.nodes[index];
    let test = xpath_node_test(program,step,namespaces);
    if test.valid == false { return xpath_value_fault(19); };
    if input.state != 0 { return input; };
    let mut position_range = XPathPosition { valid: false, value: 0 };
    if predicates.len() > 0 { position_range = xpath_constant_position(program,predicates[0],powers); };
    let mut result = xpath_nodes_empty(); let mut visited: i32 = 0; let mut context_index: usize = 0; let mut finished = false;
    while context_index < input.nodes.values.len() && finished == false {
        let mut maximum: i32 = 0; if position_range.valid && predicates.len() == 1 { maximum = position_range.value; };
        let window = xpath_axis_window(tree,graph,input.nodes.values[context_index],step.operation,&test,mode,bound,visited,maximum);
        visited = window.visited; let bounded = window.bounded; let sequence = window.sequence;
        if sequence.cyclic && bounded { return xpath_value_empty(XPATH_KIND_NODES,2); };
        let mut selected = xpath_value_empty(XPATH_KIND_NODES,0);
        if position_range.valid && predicates.len() == 1 {
            if sequence.cyclic && position_range.value <= 0 { return xpath_value_empty(XPATH_KIND_NODES,2); };
            let found = xpath_sequence_position(&sequence,position_range.value);
            if found.known == false { return xpath_value_empty(XPATH_KIND_NODES,2); };
            selected = xpath_value_single(found.value);
        } else if mode == 1 && predicates.len() == 0 && sequence.values.len() > 0 {
            selected = xpath_value_single(sequence.values[0]);
        } else {
            selected = xpath_value_nodes(sequence);
            if selected.state != 0 { return selected; };
            let mut remaining = predicates.len();
            while remaining > 0 {
                remaining = remaining-1;
                let mut minimum: i32 = 1; let mut maximum = selected.nodes.values.len() as i32;
                if position_range.valid && remaining == 1 { minimum = position_range.value; maximum = position_range.value; };
                selected = xpath_filter_values(selected,program,predicates[remaining],minimum,maximum,tree,graph,namespaces,powers);
                if selected.state != 0 { return selected; };
                if position_range.valid && remaining == 1 { remaining = 0; };
            }
        };
        let chosen = XPathNodes { values: selected.nodes.values }; result = xpath_nodes_merge(result,&chosen,tree);
        if mode == 1 && result.values.len() > 0 { finished = true; };
        context_index += 1;
    }
    xpath_value_nodes(XPathSequence { values: result.values, cyclic: false, cycle: 0 })
}
