fn xpath_evaluate(program: &XPathProgram, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    if program.budget.fault < 0 { return xpath_value_fault(0-program.budget.fault); };
    if program.budget.fault > 0 { return xpath_value_empty(0,program.budget.fault); };
    if program.valid == false { return xpath_value_fault(7); };
    let context = XPathContext { node: xpath_reference_node(0), position: -1, size: -1 };
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    let task = xpath_eval_start(XPATH_EVAL_EXPRESSION,program.runtime.root,context,0,absent);
    xpath_eval_run(task,program,tree,graph,namespaces,powers)
}

pub(crate) fn xpath_eval_node(program: &XPathProgram, root: usize, context: XPathContext, mode: i32, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    xpath_eval_demand(program,root,context,mode,absent,tree,graph,namespaces,powers)
}


pub(crate) fn xpath_eval_demand(program: &XPathProgram, root: usize, context: XPathContext, mode: i32, bound: XPathReference, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let task = xpath_eval_start(XPATH_EVAL_EXPRESSION,program.runtime.roots[root].value,context,mode,bound);
    xpath_eval_run(task,program,tree,graph,namespaces,powers)
}
