pub(crate) fn xpath_filter_values(input: XPathValue, program: &XPathProgram, predicate: usize, minimum: i32, maximum: i32, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let absent = XPathReference { kind: -1, node: 0, index: 0 }; let context = XPathContext { node: absent, position: -1, size: -1 };
    let header = xpath_eval_header(XPATH_EVAL_FILTER_START,predicate,context,0,absent);
    let state = xpath_eval_state(header,XPATH_EVAL_FILTER_START,0,0,0,minimum,maximum,0,0,header.position_range);
    let output = xpath_value_empty(0,0); let parameters = xpath_arguments_empty(); let predicates: Vec<usize> = Vec::new();
    let task = xpath_eval_task(state,input,output,parameters,predicates);
    xpath_eval_run(task,program,tree,graph,namespaces,powers)
}

pub(crate) fn xpath_collect(input: XPathValue, program: &XPathProgram, root: usize, mode: i32, bound: XPathReference, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let context = XPathContext { node: XPathReference { kind: -1, node: 0, index: 0 }, position: -1, size: -1 };
    let task = xpath_eval_input_task(XPATH_EVAL_COLLECT_START,root,context,mode,bound,input);
    xpath_eval_run(task,program,tree,graph,namespaces,powers)
}
