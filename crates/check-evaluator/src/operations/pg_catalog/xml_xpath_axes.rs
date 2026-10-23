fn xpath_namespace_shadowed(tree: &XmlTree, owner: usize, declaration: usize, prefix: &str) -> bool {
    let mut cursor = owner;
    while cursor > 0 && cursor != declaration {
        let node = tree.nodes[cursor];
        let mut index = node.attribute_start;
        while index < node.attribute_end {
            let attribute = tree.attributes[index];
            if xml_query_namespace_attribute(tree,attribute.name) {
                let name = xpath_namespace_prefix(tree,index+1);
                if name.as_str() == prefix { return true; };
            };
            index += 1;
        }
        cursor = node.parent;
    }
    false
}

fn xpath_namespace_axis(tree: &XmlTree, owner: usize) -> XPathNodes {
    let mut found = xpath_nodes_empty();
    let mut cursor = owner;
    while cursor > 0 {
        let node = tree.nodes[cursor];
        let mut index = node.attribute_start;
        while index < node.attribute_end {
            let attribute = tree.attributes[index];
            if xml_query_namespace_attribute(tree,attribute.name) {
                let prefix = xpath_namespace_prefix(tree,index+1);
                if prefix.as_str() != "xml" && xpath_namespace_shadowed(tree,owner,cursor,prefix.as_str()) == false {
                    let value = XPathReference { kind: 2, node: owner, index: index+1 };
                    found = xpath_nodes_push(found,value);
                };
            };
            index += 1;
        }
        cursor = node.parent;
    }
    let implicit = XPathReference { kind: 2, node: owner, index: 0 };
    found = xpath_nodes_push(found,implicit);
    xpath_nodes_reverse(found)
}

fn xpath_local_axis(tree: &XmlTree, context: XPathReference, axis: i32) -> XPathNodes {
    let mut result = xpath_nodes_empty();
    if context.kind < 0 { return result; };
    if axis == 3 || axis == 6 || axis == 8 { result = xpath_nodes_push(result,context); };
    if axis == 4 || axis == 7 || axis == 8 {
        let mut parent = xpath_reference_parent(tree,context);
        while parent.kind >= 0 {
            result = xpath_nodes_push(result,parent);
            if axis == 4 { return result; };
            parent = xpath_reference_parent(tree,parent);
        }
        return result;
    };
    if axis == 2 || axis == 13 {
        if context.kind != 0 || tree.nodes[context.node].kind != 1 { return result; };
        if axis == 13 { return xpath_namespace_axis(tree,context.node); };
        let owner = tree.nodes[context.node];
        let mut index = owner.attribute_start;
        while index < owner.attribute_end {
            let attribute = tree.attributes[index];
            if xml_query_namespace_attribute(tree,attribute.name) == false {
                let value = XPathReference { kind: 1, node: context.node, index };
                result = xpath_nodes_push(result,value);
            };
            index += 1;
        }
        return result;
    };
    if context.kind != 0 { return result; };
    if axis == 1 {
        let mut cursor = xml_query_child(tree,context.node);
        while cursor > 0 {
            let value = xpath_reference_node(cursor);
            result = xpath_nodes_push(result,value);
            cursor = xml_query_next(tree,cursor);
        }
    };
    if axis == 5 || axis == 6 {
        let mut cursor = xml_query_child(tree,context.node);
        while cursor > 0 && xpath_node_ancestor(tree,context.node,cursor) {
            let value = xpath_reference_node(cursor);
            result = xpath_nodes_push(result,value);
            cursor = xml_query_following_node(tree,cursor);
        }
    };
    if axis == 9 || axis == 10 {
        let mut cursor = context.node;
        let mut scanning = cursor > 0;
        while scanning {
            if axis == 9 { cursor = xml_query_next(tree,cursor); }
            else { cursor = xml_query_previous(tree,cursor); };
            if cursor == 0 { scanning = false; }
            else {
                let value = xpath_reference_node(cursor);
                result = xpath_nodes_push(result,value);
            };
        }
    };
    result
}
