#[derive(Clone, Copy)]
struct XPathReference { kind: i32, node: usize, index: usize }

#[derive(Clone)]
struct XPathNodes { values: Vec<XPathReference> }

fn xpath_reference_node(node: usize) -> XPathReference {
    XPathReference { kind: 0, node, index: 0 }
}

fn xpath_reference_equal(left: XPathReference, right: XPathReference) -> bool {
    left.kind == right.kind && left.node == right.node && left.index == right.index
}

fn xpath_nodes_empty() -> XPathNodes {
    let values: Vec<XPathReference> = Vec::new();
    XPathNodes { values }
}

pub(crate) fn xpath_nodes_push(input: XPathNodes, value: XPathReference) -> XPathNodes {
    let mut values = input.values;
    values.push(value);
    XPathNodes { values }
}

pub(crate) fn xpath_nodes_unique(input: XPathNodes, value: XPathReference) -> XPathNodes {
    let mut position: usize = 0;
    while position < input.values.len() {
        if xpath_reference_equal(input.values[position],value) { return input; };
        position += 1;
    }
    xpath_nodes_push(input,value)
}

pub(crate) fn xpath_nodes_reverse(input: XPathNodes) -> XPathNodes {
    let mut values = input.values;
    let mut first: usize = 0;
    let mut end = values.len();
    while first < end {
        end = end-1;
        let saved = values[first]; values[first] = values[end]; values[end] = saved;
        first += 1;
    }
    XPathNodes { values }
}

fn xpath_namespace_prefix(tree: &XmlTree, index: usize) -> String {
    if index == 0 { return "xml".to_owned(); };
    let attribute = tree.attributes[index-1];
    let mut begin = attribute.name.start;
    if attribute.name.end-begin > 5 { begin += 6; } else { begin = attribute.name.end; };
    let span = XmlSpan { start: begin, end: attribute.name.end };
    xml_tree_text(tree,span)
}

fn xpath_reference_name(tree: &XmlTree, value: XPathReference) -> XmlQueryName {
    if value.kind == 0 { return xml_query_node_name(tree,value.node); };
    if value.kind == 1 {
        let attribute = tree.attributes[value.index];
        return xml_query_expand_name(tree,value.node,attribute.name,true);
    };
    let qualified = xpath_namespace_prefix(tree,value.index);
    XmlQueryName { local: qualified.clone(), qualified, namespace: String::new(), resolved: true }
}

fn xpath_reference_parent(tree: &XmlTree, value: XPathReference) -> XPathReference {
    if value.kind != 0 { return xpath_reference_node(value.node); };
    if value.node == 0 { return XPathReference { kind: -1, node: 0, index: 0 }; };
    xpath_reference_node(tree.nodes[value.node].parent)
}

fn xpath_reference_type(tree: &XmlTree, value: XPathReference) -> i32 {
    if value.kind == 1 { return 8; };
    if value.kind == 2 { return 9; };
    tree.nodes[value.node].kind
}

fn xpath_reference_leaf(tree: &XmlTree, value: XPathReference) -> String {
    if value.kind == 1 {
        let attribute = tree.attributes[value.index];
        return xml_tree_text(tree,attribute.value);
    };
    if value.kind == 2 {
        if value.index == 0 { return "http://www.w3.org/XML/1998/namespace".to_owned(); };
        let attribute = tree.attributes[value.index-1];
        return xml_tree_text(tree,attribute.value);
    };
    let node = tree.nodes[value.node];
    if node.kind >= 2 && node.kind <= 5 { return xml_tree_text(tree,node.value); };
    String::new()
}

fn xpath_node_ancestor(tree: &XmlTree, ancestor: usize, node: usize) -> bool {
    let mut cursor = node;
    while cursor > 0 {
        cursor = tree.nodes[cursor].parent;
        if cursor == ancestor { return true; };
    }
    false
}
