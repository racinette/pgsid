#[derive(Clone, Copy)]
struct XPathGraphNode { kind: i32, parent: usize, next: usize, previous: usize, first: usize, last: usize }

#[derive(Clone)]
struct XPathGraph { nodes: Vec<XPathGraphNode> }

#[derive(Clone)]
struct XPathDocument { tree: XmlTree, graph: XPathGraph }

#[derive(Clone)]
struct XPathEntityUses { entries: Vec<usize> }

#[derive(Clone)]
struct XPathDefinition { name: String, node: usize }

#[derive(Clone)]
struct XPathDefinitions { entries: Vec<XPathDefinition> }

pub(crate) fn xpath_entity_use(input: XPathEntityUses, index: usize) -> XPathEntityUses {
    let mut position: usize = 0;
    while position < input.entries.len() {
        if input.entries[position] == index { return input; };
        position += 1;
    }
    let mut entries = input.entries; entries.push(index);
    XPathEntityUses { entries }
}

pub(crate) fn xpath_entity_uses(input: XPathEntityUses, source: &XmlSource, arena: &XmlEntityArena, start: usize) -> XPathEntityUses {
    let mut uses = input;
    let mut position = start;
    while position < source.characters.len() {
        if xml_at(source,position,"<!--") { let end = xml_comment(source,position); position = end.next; }
        else if xml_at(source,position,"<?") { let end = xml_processing_instruction(source,position); position = end.next; }
        else if xml_at(source,position,"<![CDATA[") { let end = xml_cdata(source,position); position = end.next; }
        else if source.characters[position] == '&' {
            let reference = xml_reference(source,position);
            if reference.valid == false { return uses; };
            if xml_predefined_reference(source,position) == false {
                let name = XmlSpan { start: position+1, end: reference.next-1 };
                let spelling = xml_source_range(source,name);
                let index = xml_entity_lookup(arena,spelling.as_str(),false);
                if index < arena.entities.len() { uses = xpath_entity_use(uses,index); };
            };
            position = reference.next;
        } else { position += 1; };
    }
    uses
}

pub(crate) fn xpath_graph_declaration(input: XmlTree, entry: XmlTreeDtdEntry) -> XmlTree {
    let mut tree = input;
    let mut kind: i32 = 14;
    if entry.kind == 1 { kind = 15; };
    if entry.kind == 2 { kind = 16; };
    if entry.kind == 4 { kind = 17; };
    let mut name = entry.name;
    let mut value = entry.line;
    if entry.kind == 6 || entry.kind == 7 {
        let text = xml_tree_text(&tree,entry.line);
        let source = XmlSource { characters: text.as_str().chars().collect() };
        let mut begin: usize = 4;
        let mut end = source.characters.len()-3;
        kind = 4;
        if entry.kind == 7 {
            kind = 5;
            let scanned = xml_name(&source,2);
            let span = XmlSpan { start: 2, end: scanned.next };
            let spelling = xml_source_range(&source,span);
            tree = xml_tree_store(tree,spelling.as_str()); name = tree.written;
            begin = xml_skip_space(&source,scanned.next); end = source.characters.len()-2;
        };
        let span = XmlSpan { start: begin, end };
        let value_text = xml_source_range(&source,span);
        tree = xml_tree_store(tree,value_text.as_str()); value = tree.written;
    };
    xml_tree_leaf(tree,kind,name,value)
}

fn xpath_graph_definitions(tree: &XmlTree) -> XPathDefinitions {
    let mut entries: Vec<XPathDefinition> = Vec::new();
    let mut position: usize = 1;
    while position < tree.nodes.len() {
        let node = tree.nodes[position];
        if node.kind == 14 {
            let name = xml_tree_text(tree,node.name);
            entries.push(XPathDefinition { name, node: position });
        };
        position += 1;
    }
    XPathDefinitions { entries }
}

fn xpath_graph_entity(definitions: &XPathDefinitions, name: &str) -> usize {
    let mut position: usize = 0;
    while position < definitions.entries.len() {
        let definition = definitions.entries[position].clone();
        if definition.name.as_str() == name { return definition.node; };
        position += 1;
    }
    0
}

fn xpath_graph_from_tree(tree: &XmlTree) -> XPathGraph {
    let definitions = xpath_graph_definitions(tree);
    let mut nodes: Vec<XPathGraphNode> = Vec::new();
    let mut position: usize = 0;
    while position < tree.nodes.len() {
        let node = tree.nodes[position];
        let mut first = node.first; let mut last = node.last;
        if node.kind == 7 {
            let name = xml_tree_text(tree,node.name);
            first = xpath_graph_entity(&definitions,name.as_str()); last = first;
        };
        nodes.push(XPathGraphNode { kind: node.kind, parent: node.parent, next: node.next, previous: node.previous, first, last });
        position += 1;
    }
    XPathGraph { nodes }
}

fn xpath_document_parse(input: &str) -> XPathDocument {
    let mut tree = xml_tree_parse(input,true,true);
    let source = XmlSource { characters: input.chars().collect() };
    let mut position: usize = 0;
    if source.characters.len() > 0 && source.characters[0] as i32 == 65279 { position = 1; };
    let declaration = xml_parse_declaration(&source,position,true);
    position = declaration.next;
    let mut scanning = true;
    while scanning {
        position = xml_skip_space(&source,position);
        if xml_at(&source,position,"<!--") { let end = xml_comment(&source,position); position = end.next; }
        else if xml_at(&source,position,"<?") { let end = xml_processing_instruction(&source,position); position = end.next; }
        else { scanning = false; };
    }
    if xml_at(&source,position,"<!DOCTYPE") == false {
        let graph = xpath_graph_from_tree(&tree);
        return XPathDocument { tree, graph };
    };
    let parsed = xml_read_doctype(input,position,declaration.standalone);
    let arena = xml_query_prepare_entities(parsed.state,&source,parsed.next,false);
    let stored = XmlSource { characters: arena.arena.as_str().chars().collect() };
    let entries: Vec<usize> = Vec::new();
    let mut uses = XPathEntityUses { entries };
    uses = xpath_entity_uses(uses,&source,&arena,parsed.next);
    let mut index: usize = 0;
    while index < uses.entries.len() {
        let entity = arena.entities[uses.entries[index]];
        if entity.external == false && entity.unparsed == false {
            let text = xml_source_range(&stored,entity.value);
            let source = XmlSource { characters: text.as_str().chars().collect() };
            uses = xpath_entity_uses(uses,&source,&arena,0);
        };
        index += 1;
    }
    let mut doctype: usize = 1;
    while doctype < tree.nodes.len() && tree.nodes[doctype].kind != 6 { doctype += 1; }
    if doctype >= tree.nodes.len() {
        let graph = xpath_graph_from_tree(&tree);
        return XPathDocument { tree, graph };
    };
    tree = xml_tree_current(tree,doctype);
    index = 0;
    let declaration_count = tree.declarations.len();
    while index < declaration_count {
        let entry = tree.declarations[index];
        if entry.kind != 5 { tree = xpath_graph_declaration(tree,entry); };
        index += 1;
    }
    let definitions = xpath_graph_definitions(&tree);
    index = 0;
    while index < uses.entries.len() {
        let entity = arena.entities[uses.entries[index]];
        if entity.external == false && entity.unparsed == false {
            let name = xml_source_range(&stored,entity.name);
            let owner = xpath_graph_entity(&definitions,name.as_str());
            if owner > 0 {
                let text = xml_query_entity_content(&arena,name.as_str());
                let source = XmlSource { characters: text.as_str().chars().collect() };
                tree = xml_tree_current(tree,owner);
                tree = xml_tree_parse_nodes(&source,&stored,&arena,0,tree,true,entity.query_attribute);
            };
        };
        index += 1;
    }
    tree = xml_tree_current(tree,0);
    let graph = xpath_graph_from_tree(&tree);
    XPathDocument { tree, graph }
}
