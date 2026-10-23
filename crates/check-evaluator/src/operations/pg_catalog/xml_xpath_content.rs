fn xpath_reference_string(tree: &XmlTree, graph: &XPathGraph, value: XPathReference) -> String {
    if value.kind != 0 { return xpath_reference_leaf(tree,value); };
    let kind = tree.nodes[value.node].kind;
    if kind >= 2 && kind <= 5 { return xpath_reference_leaf(tree,value); };
    if kind != 0 && kind != 1 && kind != 14 && kind != 7 { return String::new(); };
    let mut root = value.node;
    if kind == 7 { root = graph.nodes[root].first; if root == 0 { return String::new(); }; };
    let mut cursor = graph.nodes[root].first;
    let mut output = String::new();
    let mut returns: Vec<usize> = Vec::new();
    let mut depth: usize = 0;
    while cursor > 0 || depth > 0 {
        if cursor == 0 {
            depth = depth-1; cursor = returns[depth];
        } else {
            let node = graph.nodes[cursor];
            let mut child: usize = 0;
            if node.kind == 2 || node.kind == 3 {
                let content = tree.nodes[cursor].value;
                let mut position = content.start;
                while position < content.end { output.push(tree.characters[position]); position += 1; }
            } else if node.kind == 7 {
                let declaration = node.first;
                if declaration > 0 { child = graph.nodes[declaration].first; };
            } else if node.kind != 4 && node.kind != 5 { child = node.first; };
            if child > 0 {
                if depth < returns.len() { returns[depth] = node.next; }
                else { returns.push(node.next); };
                depth += 1; cursor = child;
            } else { cursor = node.next; };
        };
    }
    output
}
