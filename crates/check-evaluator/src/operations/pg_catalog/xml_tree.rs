#[derive(Clone, Copy)]
struct XmlTreeAttribute { name: XmlSpan, value: XmlSpan, defaulted: bool, id_candidate: bool }

#[derive(Clone, Copy)]
struct XmlTreeNode {
    kind: i32, name: XmlSpan, value: XmlSpan, parent: usize,
    next: usize, previous: usize, first: usize, last: usize, attribute_start: usize,
    attribute_end: usize, preserve: bool, textual: bool, text_seen: bool, blank_policy: i32,
}

#[derive(Clone, Copy)]
struct XmlTreeFlags {
    document: bool, declaration: bool, unicode: bool, query: bool, query_ids_valid: bool,
    standalone: i32, version: XmlSpan, doctype_end: usize,
}

#[derive(Clone)]
struct XmlTree {
    declarations: Vec<XmlTreeDtdEntry>,
    nodes: Vec<XmlTreeNode>, attributes: Vec<XmlTreeAttribute>, characters: Vec<char>,
    current: usize, written: XmlSpan, flags: XmlTreeFlags, serialization_known: bool,
}

fn xml_tree_text(tree: &XmlTree, span: XmlSpan) -> String {
    let mut output = String::new();
    let mut position = span.start;
    while position < span.end { output.push(tree.characters[position]); position += 1; }
    output
}

fn xml_tree_normalize(source: &XmlSource, start: usize, end: usize) -> String {
    let mut output = String::new();
    let mut position = start;
    while position < end {
        let mut character = source.characters[position];
        if character == '\r' {
            character = '\n';
            if position + 1 < end && source.characters[position + 1] == '\n' { position += 1; };
        };
        output.push(character); position += 1;
    }
    output
}

pub(crate) fn xml_tree_store(input: XmlTree, text: &str) -> XmlTree {
    let mut characters = input.characters;
    let begin = characters.len();
    let values: Vec<char> = text.chars().collect();
    let mut position: usize = 0;
    while position < values.len() { characters.push(values[position]); position += 1; }
    let written = XmlSpan { start: begin, end: characters.len() };
    XmlTree { nodes: input.nodes, attributes: input.attributes, characters, current: input.current,
        written, declarations: input.declarations, flags: input.flags, serialization_known: input.serialization_known }
}

pub(crate) fn xml_tree_links(input: XmlTreeNode, next: usize, first: usize, last: usize, value: XmlSpan, textual: bool, text_seen: bool) -> XmlTreeNode {
    XmlTreeNode { kind: input.kind, name: input.name, value, parent: input.parent,
        next, previous: input.previous, first, last, attribute_start: input.attribute_start, attribute_end: input.attribute_end,
        preserve: input.preserve, textual, text_seen, blank_policy: input.blank_policy }
}

pub(crate) fn xml_tree_append(input: XmlTree, node: XmlTreeNode) -> XmlTree {
    let mut nodes = input.nodes;
    let index = nodes.len();
    let parent = nodes[input.current];
    let mut first = parent.first;
    if first == 0 { first = index; }
    if parent.last > 0 {
        let previous = nodes[parent.last];
        nodes[parent.last] = xml_tree_links(previous,index,previous.first,previous.last,previous.value,previous.textual,previous.text_seen);
    };
    let textual = parent.textual || node.kind == 2 || node.kind == 3;
    nodes[input.current] = xml_tree_links(parent,parent.next,first,index,parent.value,textual,parent.text_seen || node.kind == 2);
    nodes.push(node);
    XmlTree { nodes, attributes: input.attributes, characters: input.characters, current: input.current,
        written: input.written, declarations: input.declarations, flags: input.flags, serialization_known: input.serialization_known }
}

pub(crate) fn xml_tree_current(input: XmlTree, current: usize) -> XmlTree {
    XmlTree { nodes: input.nodes, attributes: input.attributes, characters: input.characters,
        current, written: input.written, declarations: input.declarations, flags: input.flags, serialization_known: input.serialization_known }
}

pub(crate) fn xml_tree_space(input: XmlTree, index: usize, preserve: bool, text_seen: bool, blank_policy: i32) -> XmlTree {
    let mut nodes = input.nodes;
    let node = nodes[index];
    nodes[index] = XmlTreeNode { kind: node.kind, name: node.name, value: node.value, parent: node.parent,
        next: node.next, previous: node.previous, first: node.first, last: node.last, attribute_start: node.attribute_start,
        attribute_end: node.attribute_end, preserve, textual: node.textual, text_seen, blank_policy };
    XmlTree { nodes, attributes: input.attributes, characters: input.characters, current: input.current,
        written: input.written, declarations: input.declarations, flags: input.flags, serialization_known: input.serialization_known }
}

pub(crate) fn xml_tree_unsupported(input: XmlTree) -> XmlTree {
    XmlTree { nodes: input.nodes, attributes: input.attributes, characters: input.characters,
        current: input.current, written: input.written, declarations: input.declarations, flags: input.flags, serialization_known: false }
}

pub(crate) fn xml_tree_add_attribute(input: XmlTree, name: XmlSpan, value: XmlSpan, defaulted: bool, id_candidate: bool) -> XmlTree {
    let mut attributes = input.attributes;
    attributes.push(XmlTreeAttribute { name, value, defaulted, id_candidate });
    XmlTree { nodes: input.nodes, attributes, characters: input.characters,
        current: input.current, written: input.written, declarations: input.declarations, flags: input.flags, serialization_known: input.serialization_known }
}

pub(crate) fn xml_tree_leaf(input: XmlTree, kind: i32, name: XmlSpan, value: XmlSpan) -> XmlTree {
    let node = XmlTreeNode { kind, name, value, parent: input.current, next: 0, previous: input.nodes[input.current].last, first: 0, last: 0,
        attribute_start: 0, attribute_end: 0, preserve: false, textual: false, text_seen: false, blank_policy: -1 };
    xml_tree_append(input,node)
}

pub(crate) fn xml_tree_add_text(input: XmlTree, text: &str, forced: bool, closing: bool, end: bool) -> XmlTree {
    let values: Vec<char> = text.chars().collect();
    if values.len() == 0 { return input; };
    let parent = input.nodes[input.current];
    let mut blank = true;
    let mut position: usize = 0;
    while position < values.len() { if xml_space(values[position]) == false { blank = false; }; position += 1; }
    if blank && input.current == 0 && input.flags.document { return input; };
    if blank && forced == false && parent.preserve == false && input.flags.query == false {
        if parent.blank_policy == 0 { return input; };
        if parent.blank_policy != 1 && parent.text_seen == false && end == false && (closing == false || parent.first > 0) { return input; };
    };
    let stored = xml_tree_store(input,text);
    let value = stored.written;
    if parent.last > 0 && stored.nodes[parent.last].kind == 2 {
        let previous = stored.nodes[parent.last];
        if previous.value.end == value.start {
            let mut nodes = stored.nodes;
            let span = XmlSpan { start: previous.value.start, end: value.end };
            nodes[parent.last] = xml_tree_links(previous,previous.next,previous.first,previous.last,span,previous.textual,previous.text_seen);
            nodes[stored.current] = xml_tree_links(parent,parent.next,parent.first,parent.last,parent.value,true,true);
            return XmlTree { nodes, attributes: stored.attributes, characters: stored.characters,
                current: stored.current, written: value, declarations: stored.declarations, flags: stored.flags, serialization_known: stored.serialization_known };
        };
    };
    let empty = XmlSpan { start: 0, end: 0 };
    xml_tree_leaf(stored,2,empty,value)
}

pub(crate) fn xml_tree_parse_nodes(source: &XmlSource, stored: &XmlSource, arena: &XmlEntityArena, start: usize, input: XmlTree, entity: bool, preserve_carriage: bool) -> XmlTree {
    let mut tree = input;
    let root = tree.current;
    let outside = tree.nodes[root];
    if entity { tree = xml_tree_space(tree,root,false,false,-1); };
    let mut position = start;
    while position < source.characters.len() {
        let character = source.characters[position];
        if xml_at(source,position,"<!DOCTYPE") {
            tree = xml_tree_doctype(tree,source,stored,arena,position);
            let value = tree.written;
            let empty = XmlSpan { start: 0, end: 0 };
            tree = xml_tree_leaf(tree,6,empty,value);
            position = tree.flags.doctype_end;
        } else if xml_at(source,position,"<!--") {
            let scanned = xml_comment(source,position);
            let text = xml_tree_source_text(source,position+4,scanned.next-3,preserve_carriage);
            tree = xml_tree_store(tree,text.as_str());
            let value = tree.written;
            let empty = XmlSpan { start: 0, end: 0 };
            tree = xml_tree_leaf(tree,4,empty,value);
            position = scanned.next;
        } else if xml_at(source,position,"<?") {
            let scanned = xml_processing_instruction(source,position);
            let name = xml_name(source,position+2);
            let span = XmlSpan { start: position+2, end: name.next };
            let text = xml_source_range(source,span);
            tree = xml_tree_store(tree,text.as_str());
            let name_span = tree.written;
            let begin = xml_skip_space(source,name.next);
            let value_text = xml_tree_source_text(source,begin,scanned.next-2,preserve_carriage);
            tree = xml_tree_store(tree,value_text.as_str());
            let value = tree.written;
            tree = xml_tree_leaf(tree,5,name_span,value);
            position = scanned.next;
        } else if xml_at(source,position,"<![CDATA[") {
            let scanned = xml_cdata(source,position);
            let text = xml_tree_source_text(source,position+9,scanned.next-3,preserve_carriage);
            tree = xml_tree_store(tree,text.as_str());
            let value = tree.written;
            let empty = XmlSpan { start: 0, end: 0 };
            tree = xml_tree_leaf(tree,3,empty,value);
            position = scanned.next;
        } else if xml_at(source,position,"</") {
            let name = xml_name(source,position+2);
            position = xml_skip_space(source,name.next)+1;
            let parent = tree.nodes[tree.current].parent;
            tree = xml_tree_current(tree,parent);
        } else if character == '<' {
            let scanned = xml_name(source,position+1);
            let spelling = XmlSpan { start: position+1, end: scanned.next };
            let name_text = xml_source_range(source,spelling);
            tree = xml_tree_store(tree,name_text.as_str());
            let name = tree.written;
            let attribute_start = tree.attributes.len();
            position = xml_skip_space(source,scanned.next);
            while source.characters[position] != '/' && source.characters[position] != '>' {
                let attribute = xml_name(source,position);
                let attribute_span = XmlSpan { start: position, end: attribute.next };
                let equals = xml_skip_space(source,attribute.next);
                let quote = xml_skip_space(source,equals+1);
                let quoted = xml_parse_quoted(source,quote);
                let attribute_text = xml_source_range(source,attribute_span);
                let mut value = xml_attribute_text(source,quoted.value,arena);
                let mut tokenized = false;
                if arena.defaults.len() > 0 { tokenized = xml_attribute_tokenized(source,arena,spelling,attribute_span); };
                if tree.flags.query && xml_query_namespace_attribute_text(attribute_text.as_str()) == false {
                    value = xml_query_attribute_value(source,quoted.value,arena,tokenized);
                } else if tokenized { value = xml_collapse_space(value.as_str()); };
                tree = xml_tree_store(tree,attribute_text.as_str());
                let attribute_name = tree.written;
                tree = xml_tree_store(tree,value.as_str());
                let attribute_value = tree.written;
                let id_candidate = xml_query_id_candidate(source,quoted.value);
                tree = xml_tree_add_attribute(tree,attribute_name,attribute_value,false,id_candidate);
                position = xml_skip_space(source,quoted.next);
            }
            let explicit_end = tree.attributes.len();
            let mut index: usize = 0;
            while index < arena.defaults.len() {
                let item = arena.defaults[index];
                let element = xml_source_range(stored,item.element);
                if item.has_default && element == name_text {
                    let attribute_text = xml_source_range(stored,item.name);
                    let attribute_source = XmlSource { characters: attribute_text.as_str().chars().collect() };
                    let allowed = tree.flags.query == false || attribute_text.as_str() == "xmlns" || xml_at(&attribute_source,0,"xmlns:");
                    let mut present = false;
                    let mut attribute = attribute_start;
                    while attribute < tree.attributes.len() {
                        let current = tree.attributes[attribute];
                        let existing = xml_tree_text(&tree,current.name);
                        if existing == attribute_text { present = true; };
                        attribute += 1;
                    }
                    if present == false && allowed {
                        let mut value_text = xml_source_range(stored,item.value);
                        if tree.flags.query { value_text = xml_query_attribute_source(stored,item.raw_value,item.tokenized); };
                        tree = xml_tree_store(tree,attribute_text.as_str());
                        let attribute_name = tree.written;
                        tree = xml_tree_store(tree,value_text.as_str());
                        let attribute_value = tree.written;
                        tree = xml_tree_add_attribute(tree,attribute_name,attribute_value,true,false);
                    };
                };
                index += 1;
            }
            let attribute_end = tree.attributes.len();
            let mut preserve = tree.nodes[tree.current].preserve;
            index = attribute_start;
            while index < explicit_end {
                let attribute = tree.attributes[index];
                let attribute_name = xml_tree_text(&tree,attribute.name);
                if attribute_name.as_str() == "xml:space" {
                    let value = xml_tree_text(&tree,attribute.value);
                    if value.as_str() == "preserve" { preserve = true; };
                    if value.as_str() == "default" { preserve = false; };
                };
                index += 1;
            }
            let empty = source.characters[position] == '/';
            position += 1;
            if empty { position += 1; };
            let blank_policy = xml_tree_blank_policy(&tree,name_text.as_str());
            let span = XmlSpan { start: 0, end: 0 };
            let node = XmlTreeNode { kind: 1, name, value: span, parent: tree.current, next: 0, previous: tree.nodes[tree.current].last, first: 0, last: 0,
                attribute_start, attribute_end, preserve, textual: false, text_seen: false, blank_policy };
            let child = tree.nodes.len();
            tree = xml_tree_append(tree,node);
            if empty == false { tree = xml_tree_current(tree,child); };
        } else if character == '&' {
            let reference = xml_reference(source,position);
            if xml_predefined_reference(source,position) {
                let value = xml_reference_scalar(source,position);
                let mut text = String::new(); text.push(value);
                tree = xml_tree_add_text(tree,text.as_str(),true,false,false);
            } else {
                let name = XmlSpan { start: position+1, end: reference.next-1 };
                let spelling = xml_source_range(source,name);
                let expanded = xml_expand_entity(arena,spelling.as_str(),false,0,0i64,0i64);
                if tree.flags.query {
                    let parent = tree.current;
                    tree = xml_tree_store(tree,spelling.as_str());
                    let name = tree.written;
                    let content = xml_query_entity_content(arena,spelling.as_str());
                    tree = xml_tree_store(tree,content.as_str());
                    let value = tree.written;
                    let child = tree.nodes.len();
                    tree = xml_tree_leaf(tree,7,name,value);
                    tree = xml_tree_current(tree,child);
                    let nested = XmlSource { characters: content.as_str().chars().collect() };
                    let preserve = xml_query_preserve_entity(arena,spelling.as_str());
                    tree = xml_tree_parse_nodes(&nested,stored,arena,0,tree,true,preserve);
                    tree = xml_tree_current(tree,parent);
                } else {
                    let nested = XmlSource { characters: expanded.text.as_str().chars().collect() };
                    tree = xml_tree_parse_nodes(&nested,stored,arena,0,tree,true,false);
                };
            };
            position = reference.next;
        } else {
            let begin = position;
            while position < source.characters.len() && source.characters[position] != '<' && source.characters[position] != '&' { position += 1; }
            let text = xml_tree_source_text(source,begin,position,preserve_carriage);
            let closing = xml_at(source,position,"</");
            let end = position == source.characters.len();
            let reference = end == false && source.characters[position] == '&' && tree.nodes[tree.current].blank_policy != 0;
            tree = xml_tree_add_text(tree,text.as_str(),reference,closing,end);
        };
    }
    if entity {
        let text_seen = outside.text_seen || tree.nodes[root].text_seen;
        tree = xml_tree_space(tree,root,outside.preserve,text_seen,outside.blank_policy);
    };
    tree
}

fn xml_tree_parse(input: &str, document: bool, query: bool) -> XmlTree {
    let source = XmlSource { characters: input.chars().collect() };
    let mut begin: usize = 0;
    if document && source.characters.len() > 0 && source.characters[0] as i32 == 65279 { begin = 1; };
    let declaration = xml_parse_declaration(&source,begin,document);
    let actual_declaration = declaration.next > begin;
    let mut version = "1.0".to_owned();
    let mut standalone: i32 = -1;
    if actual_declaration {
        let start = xml_skip_space(&source,begin+5);
        let value = xml_declaration_value(&source,start,"version");
        version = xml_source_range(&source,value.value);
        let mut position = xml_skip_space(&source,value.next);
        if xml_at(&source,position,"encoding") { let encoding = xml_declaration_value(&source,position,"encoding"); position = xml_skip_space(&source,encoding.next); };
        if xml_at(&source,position,"standalone") { standalone = 0; if declaration.standalone { standalone = 1; }; };
    };
    let mut cursor = declaration.next;
    let mut scanning = true;
    while scanning {
        cursor = xml_skip_space(&source,cursor);
        if xml_at(&source,cursor,"<!--") { let comment = xml_comment(&source,cursor); cursor = comment.next; }
        else if xml_at(&source,cursor,"<?") { let instruction = xml_processing_instruction(&source,cursor); cursor = instruction.next; }
        else { scanning = false; };
    }
    let mut arena = xml_new_arena(input,declaration.standalone);
    let mut effective_document = document;
    let mut doctype_end: usize = 0;
    if xml_at(&source,cursor,"<!DOCTYPE") {
        let parsed = xml_read_doctype(input,cursor,declaration.standalone);
        arena = parsed.state; doctype_end = parsed.next; effective_document = true;
    };
    if query && doctype_end > 0 { arena = xml_query_prepare_entities(arena,&source,doctype_end,false); };
    let characters: Vec<char> = version.as_str().chars().collect();
    let version_span = XmlSpan { start: 0, end: characters.len() };
    let empty = XmlSpan { start: 0, end: 0 };
    let mut nodes: Vec<XmlTreeNode> = Vec::new();
    nodes.push(XmlTreeNode { kind: 0, name: empty, value: empty, parent: 0, next: 0, previous: 0, first: 0, last: 0,
        attribute_start: 0, attribute_end: 0, preserve: false, textual: false, text_seen: false, blank_policy: -1 });
    let attributes: Vec<XmlTreeAttribute> = Vec::new();
    let flags = XmlTreeFlags { document: effective_document, declaration: actual_declaration && begin == 0,
        unicode: effective_document && actual_declaration && begin == 0, query, query_ids_valid: true, standalone, version: version_span, doctype_end };
    let declarations: Vec<XmlTreeDtdEntry> = Vec::new();
    let tree = XmlTree { declarations, nodes, attributes, characters, current: 0, written: empty, flags, serialization_known: true };
    let stored_source = XmlSource { characters: arena.arena.as_str().chars().collect() };
    xml_tree_parse_nodes(&source,&stored_source,&arena,declaration.next,tree,false,false)
}
