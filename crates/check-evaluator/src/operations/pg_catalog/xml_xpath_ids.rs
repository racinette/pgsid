fn xml_query_id_candidate(source: &XmlSource, value: XmlSpan) -> bool {
    let mut position = value.start;
    while position < value.end {
        if source.characters[position] == '&' {
            if xml_predefined_reference(source,position) == false { return false; };
            let reference = xml_reference(source,position); position = reference.next;
        } else { position += 1; };
    }
    true
}

#[derive(Clone)]
struct XPathId { value: String, owner: usize }

#[derive(Clone)]
struct XPathIds { entries: Vec<XPathId>, valid: bool }

fn xpath_id_name_valid(input: &str) -> bool {
    let source: Vec<char> = input.chars().collect(); let mut position: usize = 0;
    while position < source.len() && xml_space(source[position]) { position += 1; }
    if position >= source.len() || xpath_name_start(source[position]) == false { return false; };
    position += 1;
    while position < source.len() && xpath_name_character(source[position]) { position += 1; }
    while position < source.len() && xml_space(source[position]) { position += 1; }
    position == source.len()
}

pub(crate) fn xml_tree_ids_invalid(input: XmlTree) -> XmlTree {
    let flags = input.flags;
    let next = XmlTreeFlags { document: flags.document, declaration: flags.declaration, unicode: flags.unicode,
        query: flags.query, query_ids_valid: false, standalone: flags.standalone, version: flags.version, doctype_end: flags.doctype_end };
    XmlTree { declarations: input.declarations, nodes: input.nodes, attributes: input.attributes, characters: input.characters,
        current: input.current, written: input.written, flags: next, serialization_known: input.serialization_known }
}

pub(crate) fn xpath_id_declaration(input: XmlTree, owner: &str, name: &str, id: bool) -> XmlTree {
    if input.flags.query == false { return input; };
    if name == "xml:id" && id == false { return xml_tree_ids_invalid(input); };
    if id == false { return input; };
    let mut count: i32 = 0; let mut duplicate = false; let mut index: usize = 0;
    while index < input.declarations.len() {
        let entry = input.declarations[index];
        if entry.kind == 2 {
            let declared_owner = xml_tree_text(&input,entry.owner);
            if declared_owner.as_str() == owner {
                let declared_name = xml_tree_text(&input,entry.name);
                if declared_name.as_str() == name { duplicate = true; };
                if entry.mixed == 2 { count = count+1; };
            };
        };
        index += 1;
    }
    if duplicate == false && count > 0 { return xml_tree_ids_invalid(input); };
    input
}

fn xpath_id_main_node(tree: &XmlTree, index: usize) -> bool {
    if tree.nodes[index].kind != 1 { return false; };
    let mut cursor = tree.nodes[index].parent;
    while cursor > 0 {
        if tree.nodes[cursor].kind != 1 { return false; };
        cursor = tree.nodes[cursor].parent;
    }
    true
}

fn xpath_id_declared(tree: &XmlTree, owner: usize, name: &str) -> bool {
    let element = xml_tree_text(tree,tree.nodes[owner].name); let mut index: usize = 0;
    while index < tree.declarations.len() {
        let entry = tree.declarations[index];
        if entry.kind == 2 && entry.mixed == 2 {
            let declared_owner = xml_tree_text(tree,entry.owner); let declared_name = xml_tree_text(tree,entry.name);
            if declared_owner == element && declared_name.as_str() == name { return true; };
        };
        index += 1;
    }
    false
}

fn xpath_ids_build(tree: &XmlTree) -> XPathIds {
    let mut entries: Vec<XPathId> = Vec::new(); let mut valid = tree.flags.query_ids_valid; let mut node_index: usize = 1;
    while node_index < tree.nodes.len() {
        if xpath_id_main_node(tree,node_index) {
            let node = tree.nodes[node_index]; let mut index = node.attribute_start;
            while index < node.attribute_end {
                let attribute = tree.attributes[index]; let name = xml_tree_text(tree,attribute.name);
                let builtin = name.as_str() == "xml:id";
                if attribute.id_candidate && (builtin || xpath_id_declared(tree,node_index,name.as_str())) {
                    let value = xml_tree_text(tree,attribute.value);
                    if value.as_str() == "" || (builtin && xpath_id_name_valid(value.as_str()) == false) { valid = false; };
                    let mut previous: usize = 0;
                    while previous < entries.len() { let entry = entries[previous].clone(); if entry.value == value { valid = false; }; previous += 1; }
                    entries.push(XPathId { value, owner: node_index });
                };
                index += 1;
            }
        };
        node_index += 1;
    }
    XPathIds { entries, valid }
}

pub(crate) fn xpath_ids_tokens(input: XPathNodes, text: &str, graph: &XPathGraph) -> XPathNodes {
    let source: Vec<char> = text.chars().collect(); let mut result = input;
    let mut position: usize = 0; let mut begin: usize = 0;
    while position < source.len() && xml_space(source[position]) { position += 1; }
    while position < source.len() {
        while position < source.len() && xml_space(source[position]) == false { position += 1; }
        let mut token = String::new(); let mut at = begin;
        while at < position { token.push(source[at]); at += 1; }
        let mut index: usize = 0;
        while index < graph.ids.entries.len() {
            let entry = graph.ids.entries[index].clone();
            if entry.value == token { let reference = xpath_reference_node(entry.owner); result = xpath_nodes_unique(result,reference); };
            index += 1;
        }
        while position < source.len() && xml_space(source[position]) { position += 1; }
        begin = position;
    }
    result
}

pub(crate) fn xpath_function_ids(input: XPathValue, tree: &XmlTree, graph: &XPathGraph) -> XPathValue {
    if input.state != 0 { return xpath_value_empty(XPATH_KIND_NODES,input.state); };
    let mut result = xpath_nodes_empty();
    if input.kind == XPATH_KIND_NODES {
        let mut index: usize = 0;
        while index < input.nodes.values.len() {
            let text = xpath_reference_string(tree,graph,input.nodes.values[index]);
            result = xpath_ids_tokens(result,text.as_str(),graph); index += 1;
        }
    } else {
        let value = xpath_value_to_string(input,tree,graph); if value.state != 0 { return xpath_value_empty(XPATH_KIND_NODES,value.state); };
        result = xpath_ids_tokens(result,value.text.as_str(),graph);
    };
    let values = result.values;
    xpath_value_nodes(XPathSequence { values, cyclic: false, cycle: 0 })
}
