fn xpath_value_to_boolean(input: &XPathValue) -> XPathValue {
    if input.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,input.state); };
    xpath_value_boolean(xpath_value_truth(input))
}

pub(crate) fn xpath_value_to_string(input: XPathValue, tree: &XmlTree, graph: &XPathGraph) -> XPathValue {
    if input.state != 0 { return xpath_value_empty(XPATH_KIND_STRING,input.state); };
    if input.kind == XPATH_KIND_STRING { return input; };
    if input.kind == XPATH_KIND_NUMBER { return xpath_value_string(xpath_number_string(input.number)); };
    if input.kind == XPATH_KIND_BOOLEAN {
        if input.boolean { return xpath_value_string("true".to_owned()); };
        return xpath_value_string("false".to_owned());
    };
    let nodes = XPathNodes { values: input.nodes.values };
    let sorted = xpath_nodes_sort(nodes,tree);
    if sorted.values.len() == 0 { return xpath_value_string(String::new()); };
    let text = xpath_reference_string(tree,graph,sorted.values[0]);
    xpath_value_string(text)
}

fn xpath_scalar_number(input: &XPathValue, powers: &XPathPowers) -> XPathValue {
    if input.state != 0 { return xpath_value_empty(XPATH_KIND_NUMBER,input.state); };
    if input.kind == XPATH_KIND_NUMBER { return xpath_value_number(f64::from_bits(input.number as u64)); };
    if input.kind == XPATH_KIND_BOOLEAN {
        if input.boolean { return xpath_value_number(1.0f64); };
        return xpath_value_number(0.0f64);
    };
    xpath_number_text(input.text.as_str(),powers)
}

pub(crate) fn xpath_value_to_number(input: XPathValue, tree: &XmlTree, graph: &XPathGraph, powers: &XPathPowers) -> XPathValue {
    if input.kind != XPATH_KIND_NODES { return xpath_scalar_number(&input,powers); };
    let text = xpath_value_to_string(input,tree,graph);
    xpath_scalar_number(&text,powers)
}
