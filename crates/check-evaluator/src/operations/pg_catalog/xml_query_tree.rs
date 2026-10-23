#[derive(Clone)]
struct XmlQueryName { qualified: String, local: String, namespace: String, resolved: bool }

fn xml_query_qname_valid(tree: &XmlTree, name: XmlSpan) -> bool {
    if name.start >= name.end || tree.characters[name.start] == ':' { return false; };
    let mut colon = false;
    let mut position = name.start;
    while position < name.end {
        if tree.characters[position] == ':' {
            if colon || position+1 >= name.end { return false; };
            let next = tree.characters[position+1];
            if next == ':' || xml_name_start(next) == false { return false; };
            colon = true;
        };
        position += 1;
    }
    true
}

fn xml_query_content(input: &str) -> String {
    let source = XmlSource { characters: input.chars().collect() };
    let declaration = xml_parse_declaration(&source,0,false);
    let mut start: usize = 0;
    if declaration.valid { start = declaration.next; };
    let span = XmlSpan { start, end: source.characters.len() };
    xml_source_range(&source,span)
}

fn xml_query_visible(tree: &XmlTree, index: usize) -> bool {
    let kind = tree.nodes[index].kind;
    kind >= 1 && kind <= 5
}

fn xml_query_child(tree: &XmlTree, index: usize) -> usize {
    let mut child = tree.nodes[index].first;
    while child > 0 && xml_query_visible(tree,child) == false { child = tree.nodes[child].next; }
    child
}

fn xml_query_next(tree: &XmlTree, index: usize) -> usize {
    let mut next = tree.nodes[index].next;
    while next > 0 && xml_query_visible(tree,next) == false { next = tree.nodes[next].next; }
    next
}

fn xml_query_previous(tree: &XmlTree, index: usize) -> usize {
    let mut previous = tree.nodes[index].previous;
    while previous > 0 && xml_query_visible(tree,previous) == false { previous = tree.nodes[previous].previous; }
    previous
}

fn xml_query_following_node(tree: &XmlTree, index: usize) -> usize {
    let child = xml_query_child(tree,index);
    if child > 0 { return child; };
    let mut cursor = index;
    while cursor > 0 {
        let next = xml_query_next(tree,cursor);
        if next > 0 { return next; };
        cursor = tree.nodes[cursor].parent;
    }
    0
}

fn xml_query_namespace_attribute(tree: &XmlTree, name: XmlSpan) -> bool {
    let text = xml_tree_text(tree,name);
    if text.as_str() == "xmlns" { return true; };
    let source = XmlSource { characters: text.as_str().chars().collect() };
    xml_at(&source,0,"xmlns:")
}

fn xml_query_expand_name(tree: &XmlTree, owner: usize, name: XmlSpan, attribute: bool) -> XmlQueryName {
    let qualified = xml_tree_text(tree,name);
    let mut position = name.start;
    let mut local_start = name.start;
    let mut prefix_end = name.start;
    while position < name.end {
        if tree.characters[position] == ':' { prefix_end = position; local_start = position+1; };
        position += 1;
    }
    let prefix_span = XmlSpan { start: name.start, end: prefix_end };
    let prefix = xml_tree_text(tree,prefix_span);
    let local_span = XmlSpan { start: local_start, end: name.end };
    let local = xml_tree_text(tree,local_span);
    let valid = xml_query_qname_valid(tree,name);
    if prefix.as_str() == "xml" {
        return XmlQueryName { qualified, local, namespace: "http://www.w3.org/XML/1998/namespace".to_owned(), resolved: valid };
    };
    if attribute && local_start == name.start {
        return XmlQueryName { qualified, local, namespace: String::new(), resolved: valid };
    };
    let mut declaration = "xmlns".to_owned();
    if local_start != name.start { declaration.push(':'); declaration.push_str(prefix.as_str()); };
    let mut cursor = owner;
    while cursor > 0 {
        let node = tree.nodes[cursor];
        if node.kind == 7 { return XmlQueryName { qualified, local, namespace: String::new(), resolved: valid && local_start == name.start }; };
        let mut index = node.attribute_start;
        while index < node.attribute_end {
            let item = tree.attributes[index];
            let spelling = xml_tree_text(tree,item.name);
            if spelling == declaration {
                let namespace = xml_tree_text(tree,item.value);
                let resolved = valid && (local_start == name.start || namespace.as_str() != "");
                return XmlQueryName { qualified, local, namespace, resolved };
            };
            index += 1;
        }
        cursor = node.parent;
    }
    XmlQueryName { qualified, local, namespace: String::new(), resolved: valid && local_start == name.start }
}

fn xml_query_node_name(tree: &XmlTree, index: usize) -> XmlQueryName {
    let node = tree.nodes[index];
    if node.kind == 1 { return xml_query_expand_name(tree,index,node.name,false); };
    if node.kind == 5 {
        let qualified = xml_tree_text(tree,node.name);
        return XmlQueryName { local: qualified.clone(), qualified, namespace: String::new(), resolved: true };
    };
    XmlQueryName { qualified: String::new(), local: String::new(), namespace: String::new(), resolved: true }
}

fn xml_query_names_valid(tree: &XmlTree) -> bool {
    let mut cursor: usize = 1;
    while cursor < tree.nodes.len() {
        let node = tree.nodes[cursor];
        let name = xml_query_node_name(tree,cursor);
        if name.resolved == false { return false; };
        let mut index = node.attribute_start;
        while index < node.attribute_end {
            let attribute = tree.attributes[index];
            if xml_query_namespace_attribute(tree,attribute.name) {
                let name = xml_tree_text(tree,attribute.name);
                let uri = xml_tree_text(tree,attribute.value);
                if xml_query_uri_valid(uri.as_str()) == false { return false; };
                if xml_query_qname_valid(tree,attribute.name) == false || name.as_str() == "xmlns:xmlns" { return false; };
                if name.as_str() == "xmlns:xml" {
                    if uri.as_str() != "http://www.w3.org/XML/1998/namespace" { return false; };
                } else {
                    if uri.as_str() == "http://www.w3.org/XML/1998/namespace" || uri.as_str() == "http://www.w3.org/2000/xmlns/" { return false; };
                    if name.as_str() != "xmlns" && uri.as_str() == "" { return false; };
                };
            } else {
                let name = xml_query_expand_name(tree,cursor,attribute.name,true);
                if name.resolved == false { return false; };
                let mut previous = node.attribute_start;
                while previous < index {
                    let prior = tree.attributes[previous];
                    if xml_query_namespace_attribute(tree,prior.name) == false {
                        let other = xml_query_expand_name(tree,cursor,prior.name,true);
                        if name.local == other.local && name.namespace == other.namespace { return false; };
                    };
                    previous += 1;
                }
            };
            index += 1;
        }
        cursor += 1;
    }
    true
}
