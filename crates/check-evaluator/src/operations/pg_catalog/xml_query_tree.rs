#[derive(Clone)]
struct XmlQueryName { qualified: String, local: String, namespace: String, resolved: bool }

fn xml_query_qname_source(source: &XmlSource, name: XmlSpan) -> bool {
    if name.start >= name.end || source.characters[name.start] == ':' { return false; };
    let mut colon = false;
    let mut position = name.start;
    while position < name.end {
        if source.characters[position] == ':' {
            if colon || position+1 >= name.end { return false; };
            let next = source.characters[position+1];
            if next == ':' || xml_name_start(next) == false { return false; };
            colon = true;
        };
        position += 1;
    }
    true
}

fn xml_query_qname_valid(tree: &XmlTree, name: XmlSpan) -> bool {
    let text = xml_tree_text(tree,name); let source = XmlSource { characters: text.as_str().chars().collect() };
    xml_query_qname_source(&source,XmlSpan { start: 0, end: source.characters.len() })
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

fn xml_query_expand_text(tree: &XmlTree, owner: usize, text: &str, attribute: bool) -> XmlQueryName {
    let qualified = text.to_owned();
    let source = XmlSource { characters: text.chars().collect() }; let name = XmlSpan { start: 0, end: source.characters.len() };
    let mut position = name.start;
    let mut local_start = name.start;
    let mut prefix_end = name.start;
    while position < name.end {
        if source.characters[position] == ':' { prefix_end = position; local_start = position+1; };
        position += 1;
    }
    let prefix_span = XmlSpan { start: name.start, end: prefix_end };
    let prefix = xml_source_range(&source,prefix_span);
    let local_span = XmlSpan { start: local_start, end: name.end };
    let local = xml_source_range(&source,local_span);
    let valid = xml_query_qname_source(&source,name);
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

fn xml_query_expand_name(tree: &XmlTree, owner: usize, name: XmlSpan, attribute: bool) -> XmlQueryName {
    let text = xml_tree_text(tree,name); xml_query_expand_text(tree,owner,text.as_str(),attribute)
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
    if tree.flags.query_names_valid == false { return false; };
    let mut cursor: usize = 1;
    while cursor < tree.nodes.len() {
        let node = tree.nodes[cursor];
        let name = xml_query_node_name(tree,cursor);
        if name.resolved == false { return false; };
        let mut index = node.attribute_start;
        while index < node.attribute_end {
            let attribute = tree.attributes[index];
            if xml_query_namespace_attribute(tree,attribute.name) {
                if attribute.defaulted == false {
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

fn xml_query_default_names_valid(tree: &XmlTree, owner: usize, arena: &XmlEntityArena, source: &XmlSource) -> bool {
    if arena.defaults.len() == 0 { return true; };
    let node = tree.nodes[owner]; let element_name = xml_tree_text(tree,node.name);
    let mut names: Vec<XmlQueryName> = Vec::new(); let mut explicit = node.attribute_start;
    while explicit < node.attribute_end {
        let attribute = tree.attributes[explicit];
        if xml_query_namespace_attribute(tree,attribute.name) == false { names.push(xml_query_expand_name(tree,owner,attribute.name,true)); };
        explicit += 1;
    }
    let mut index: usize = 0;
    while index < arena.defaults.len() {
        let item = arena.defaults[index]; let element = xml_source_range(source,item.element);
        if item.has_default && element == element_name {
            let spelling = xml_source_range(source,item.name); let mut present = false;
            explicit = node.attribute_start;
            while explicit < node.attribute_end { let attribute = tree.attributes[explicit]; if xml_tree_text(tree,attribute.name) == spelling { present = true; }; explicit += 1; }
            if present == false && xml_query_namespace_attribute_text(spelling.as_str()) == false {
                let name = xml_query_default_name(tree,owner,spelling.as_str());
                if name.resolved == false { return false; };
                let mut prior: usize = 0;
                while prior < names.len() { let other = names[prior].clone(); if other.local == name.local && other.namespace == name.namespace { return false; }; prior += 1; }
                names.push(name);
            };
        };
        index += 1;
    }
    true
}

pub(crate) fn xml_query_invalid_names(input: XmlTree) -> XmlTree {
    let old = input.flags;
    let flags = XmlTreeFlags { document: old.document, declaration: old.declaration, unicode: old.unicode, query: old.query, query_ids_valid: old.query_ids_valid, query_names_valid: false, standalone: old.standalone, version: old.version, doctype_end: old.doctype_end };
    XmlTree { declarations: input.declarations, nodes: input.nodes, attributes: input.attributes, characters: input.characters, current: input.current, written: input.written, flags, serialization_known: input.serialization_known }
}

fn xml_query_default_name(tree: &XmlTree, owner: usize, text: &str) -> XmlQueryName {
    let source = XmlSource { characters: text.chars().collect() }; let mut colon: usize = 0;
    while colon < source.characters.len() && source.characters[colon] != ':' { colon += 1; }
    let qualified = text.to_owned();
    if colon == 0 || colon+1 >= source.characters.len() {
        return XmlQueryName { local: qualified.clone(), qualified, namespace: String::new(), resolved: true };
    };
    let mut probe = xml_source_range(&source,XmlSpan { start: 0, end: colon }); probe.push_str(":x");
    let named = xml_query_expand_text(tree,owner,probe.as_str(),true);
    let local = xml_source_range(&source,XmlSpan { start: colon+1, end: source.characters.len() });
    XmlQueryName { qualified, local, namespace: named.namespace, resolved: named.resolved }
}
