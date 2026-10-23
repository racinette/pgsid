#[derive(Clone, Copy)]
struct XmlTreeDtdEntry { kind: i32, owner: XmlSpan, name: XmlSpan, line: XmlSpan, mixed: i32 }
#[derive(Clone)]
struct XmlTreeExternal { text: String, next: usize }

fn xml_tree_dtd_quote(input: &str) -> String {
    let characters: Vec<char> = input.chars().collect();
    let mut quote = '"';
    let mut index: usize = 0;
    while index < characters.len() { if characters[index] == '"' { quote = '\''; }; index += 1; }
    let mut output = String::new(); output.push(quote); output.push_str(input); output.push(quote); output
}

fn xml_tree_external_id(source: &XmlSource, start: usize) -> XmlTreeExternal {
    let is_public = xml_at(source,start,"PUBLIC");
    let mut position = start+6;
    let mut output = "SYSTEM ".to_owned();
    if is_public { output = "PUBLIC ".to_owned(); };
    position = xml_skip_space(source,position);
    let first = xml_parse_quoted(source,position);
    let text = xml_tree_normalize(source,first.value.start,first.value.end);
    let quoted = xml_tree_dtd_quote(text.as_str()); output.push_str(quoted.as_str());
    position = first.next;
    if is_public {
        let next = xml_skip_space(source,position);
        if next < source.characters.len() && (source.characters[next] == '"' || source.characters[next] == '\'') {
            let second = xml_parse_quoted(source,next);
            let text = xml_tree_normalize(source,second.value.start,second.value.end);
            let quoted = xml_tree_dtd_quote(text.as_str()); output.push(' '); output.push_str(quoted.as_str());
            position = second.next;
        };
    };
    XmlTreeExternal { text: output, next: position }
}

pub(crate) fn xml_tree_dtd_add(input: XmlTree, kind: i32, owner: &str, name: &str, line: &str, mixed: i32) -> XmlTree {
    let mut index: usize = 0;
    while index < input.declarations.len() {
        let entry = input.declarations[index];
        if kind <= 5 && entry.kind == kind {
            let old_name = xml_tree_text(&input,entry.name);
            let old_owner = xml_tree_text(&input,entry.owner);
            if old_name.as_str() == name && old_owner.as_str() == owner { return input; };
        };
        index += 1;
    }
    let mut tree = xml_tree_store(input,owner);
    let owner_span = tree.written;
    tree = xml_tree_store(tree,name);
    let name_span = tree.written;
    tree = xml_tree_store(tree,line);
    let line_span = tree.written;
    let mut declarations = tree.declarations;
    declarations.push(XmlTreeDtdEntry { kind, owner: owner_span, name: name_span, line: line_span, mixed });
    XmlTree { declarations, nodes: tree.nodes, attributes: tree.attributes, characters: tree.characters,
        current: tree.current, written: line_span, flags: tree.flags, serialization_known: tree.serialization_known }
}

fn xml_tree_blank_policy(tree: &XmlTree, name: &str) -> i32 {
    let mut index: usize = 0;
    while index < tree.declarations.len() {
        let entry = tree.declarations[index];
        if entry.kind == 1 {
            let old_name = xml_tree_text(tree,entry.name);
            if old_name.as_str() == name { return entry.mixed; };
        };
        index += 1;
    }
    -1
}

fn xml_tree_enumeration(source: &XmlSource, start: usize) -> XmlTreeExternal {
    let mut position = xml_skip_space(source,start+1);
    let mut output = "(".to_owned();
    let mut first = true;
    while source.characters[position] != ')' {
        let begin = position;
        while position < source.characters.len() && xml_space(source.characters[position]) == false && source.characters[position] != '|' && source.characters[position] != ')' { position += 1; }
        let span = XmlSpan { start: begin, end: position };
        let text = xml_source_range(source,span);
        if first == false { output.push_str(" | "); };
        output.push_str(text.as_str()); first = false;
        position = xml_skip_space(source,position);
        if source.characters[position] == '|' { position = xml_skip_space(source,position+1); };
    }
    output.push(')');
    XmlTreeExternal { text: output, next: position+1 }
}

pub(crate) fn xml_tree_dtd_attributes(input: XmlTree, source: &XmlSource, stored: &XmlSource, arena: &XmlEntityArena, item: XmlDtdItem) -> XmlTree {
    let mut tree = input;
    let owner = xml_source_range(source,item.name);
    let mut position = xml_skip_space(source,item.name.end);
    while position < item.next-1 {
        let attribute = xml_parse_dtd_attribute(source,position);
        let name = xml_source_range(source,attribute.name);
        let mut at = xml_skip_space(source,attribute.name.end);
        let mut type_name = String::new();
        let mut id: i32 = -1;
        if source.characters[at] == '(' {
            let parsed = xml_tree_enumeration(source,at); type_name = parsed.text; at = parsed.next;
        } else {
            let token = xml_name(source,at);
            let span = XmlSpan { start: at, end: token.next };
            type_name = xml_source_range(source,span); at = token.next;
            if type_name.as_str() == "ID" { id = 2; };
            if type_name.as_str() == "NOTATION" {
                at = xml_skip_space(source,at);
                let parsed = xml_tree_enumeration(source,at);
                type_name.push(' '); type_name.push_str(parsed.text.as_str()); at = parsed.next;
            };
        };
        at = xml_skip_space(source,at);
        let mut line = "<!ATTLIST ".to_owned(); line.push_str(owner.as_str()); line.push(' '); line.push_str(name.as_str()); line.push(' '); line.push_str(type_name.as_str()); line.push(' ');
        if xml_at(source,at,"#REQUIRED") { line.push_str("#REQUIRED"); }
        else if xml_at(source,at,"#IMPLIED") { line.push_str("#IMPLIED"); }
        else {
            if xml_at(source,at,"#FIXED") { line.push_str("#FIXED "); };
            let mut found = false;
            let mut index: usize = 0;
            while index < arena.defaults.len() && found == false {
                let value = arena.defaults[index];
                let defined_owner = xml_source_range(stored,value.element);
                let defined_name = xml_source_range(stored,value.name);
                if defined_owner == owner && defined_name == name {
                    let text = xml_source_range(stored,value.value);
                    tree = xml_tree_store(tree,text.as_str());
                    let encoded = xml_tree_escape(&tree,tree.written,true);
                    line.push('"'); line.push_str(encoded.as_str()); line.push('"'); found = true;
                };
                index += 1;
            }
            if found == false { tree = xml_tree_unsupported(tree); };
        };
        line.push_str(">\n");
        tree = xpath_id_declaration(tree,owner.as_str(),name.as_str(),id == 2);
        tree = xml_tree_dtd_add(tree,2,owner.as_str(),name.as_str(),line.as_str(),id);
        position = xml_skip_space(source,attribute.next);
    }
    tree
}

pub(crate) fn xml_tree_dtd_subset(input: XmlTree, source: &XmlSource, stored: &XmlSource, arena: &XmlEntityArena, start: usize, end: usize) -> XmlTree {
    let mut tree = input;
    let mut position = xml_skip_space(source,start);
    while position < end {
        if xml_at(source,position,"<!--") {
            let parsed = xml_comment(source,position);
            let text = xml_tree_normalize(source,position+4,parsed.next-3);
            let mut line = "<!--".to_owned(); line.push_str(text.as_str()); line.push_str("-->");
            tree = xml_tree_dtd_add(tree,6,"","",line.as_str(),-1); position = parsed.next;
        } else if xml_at(source,position,"<?") {
            let parsed = xml_processing_instruction(source,position);
            let name = xml_name(source,position+2);
            let name_span = XmlSpan { start: position+2, end: name.next };
            let name_text = xml_source_range(source,name_span);
            let begin = xml_skip_space(source,name.next);
            let text = xml_tree_normalize(source,begin,parsed.next-2);
            let mut line = "<?".to_owned(); line.push_str(name_text.as_str());
            if begin < parsed.next-2 { line.push(' '); line.push_str(text.as_str()); };
            line.push_str("?>");
            tree = xml_tree_dtd_add(tree,7,"","",line.as_str(),-1); position = parsed.next;
        } else if source.characters[position] == '%' {
            let name = xml_name(source,position+1);
            let span = XmlSpan { start: position+1, end: name.next };
            let spelling = xml_source_range(source,span);
            let index = xml_entity_lookup(arena,spelling.as_str(),true);
            if index < arena.entities.len() && arena.entities[index].external == false {
                let value = xml_source_range(stored,arena.entities[index].value);
                let nested = XmlSource { characters: value.as_str().chars().collect() };
                tree = xml_tree_dtd_subset(tree,&nested,stored,arena,0,nested.characters.len());
            };
            position = name.next+1;
        } else {
            let item = xml_parse_dtd_item(source,position);
            if item.valid == false { return xml_tree_unsupported(tree); };
            let name = xml_source_range(source,item.name);
            let begin = xml_skip_space(source,item.name.end);
            if item.kind == 1 {
                let model = xml_tree_dtd_model(source,begin);
                let mut mixed: i32 = 0;
                if model.as_str() == "ANY" { mixed = 1; };
                let model_source = XmlSource { characters: model.as_str().chars().collect() };
                let mut at: usize = 0;
                while at < model_source.characters.len() { if xml_at(&model_source,at,"#PCDATA") { mixed = 1; }; at += 1; }
                let mut line = "<!ELEMENT ".to_owned(); line.push_str(name.as_str()); line.push(' '); line.push_str(model.as_str()); line.push_str(">\n");
                tree = xml_tree_dtd_add(tree,1,"",name.as_str(),line.as_str(),mixed);
            } else if item.kind == 2 {
                tree = xml_tree_dtd_attributes(tree,source,stored,arena,item);
            } else if item.kind == 3 || item.kind == 4 {
                let mut line = "<!ENTITY ".to_owned();
                if item.kind == 4 { line.push_str("% "); };
                line.push_str(name.as_str()); line.push(' ');
                if item.external {
                    let external = xml_tree_external_id(source,begin); line.push_str(external.text.as_str());
                    if item.unparsed {
                        let keyword = xml_skip_space(source,external.next);
                        let at = xml_skip_space(source,keyword+5);
                        let notation = xml_name(source,at);
                        let span = XmlSpan { start: at, end: notation.next };
                        let value = xml_source_range(source,span);
                        line.push_str(" NDATA "); line.push_str(value.as_str());
                    };
                } else {
                    let text = xml_tree_normalize(source,item.value.start,item.value.end);
                    let quoted = xml_tree_dtd_quote(text.as_str()); line.push_str(quoted.as_str());
                };
                line.push_str(">\n");
                tree = xml_tree_dtd_add(tree,item.kind,"",name.as_str(),line.as_str(),-1);
            } else if item.kind == 5 {
                let external = xml_tree_external_id(source,begin);
                let mut line = "<!NOTATION ".to_owned(); line.push_str(name.as_str()); line.push(' '); line.push_str(external.text.as_str()); line.push_str(" >\n");
                tree = xml_tree_dtd_add(tree,5,"",name.as_str(),line.as_str(),-1);
            };
            position = item.next;
        };
        position = xml_skip_space(source,position);
    }
    tree
}

pub(crate) fn xml_tree_doctype(input: XmlTree, source: &XmlSource, stored: &XmlSource, arena: &XmlEntityArena, start: usize) -> XmlTree {
    let mut tree = input;
    let begin = xml_skip_space(source,start+9);
    let name = xml_name(source,begin);
    let span = XmlSpan { start: begin, end: name.next };
    let spelling = xml_source_range(source,span);
    let mut output = "<!DOCTYPE ".to_owned(); output.push_str(spelling.as_str());
    let mut position = xml_skip_space(source,name.next);
    if xml_at(source,position,"SYSTEM") || xml_at(source,position,"PUBLIC") {
        let external = xml_tree_external_id(source,position); output.push(' '); output.push_str(external.text.as_str()); position = xml_skip_space(source,external.next);
    };
    if source.characters[position] == '[' {
        let mut end = tree.flags.doctype_end-1;
        while end > position && xml_space(source.characters[end-1]) { end = end-1; };
        let close = end-1;
        tree = xml_tree_dtd_subset(tree,source,stored,arena,position+1,close);
    };
    let mut notations: usize = 0;
    let mut index: usize = 0;
    while index < tree.declarations.len() { if tree.declarations[index].kind == 5 { notations += 1; }; index += 1; }
    if notations > 1 { tree = xml_tree_unsupported(tree); };
    if tree.declarations.len() > 0 {
        output.push_str(" [\n");
        let mut pass: usize = 0;
        while pass < 2 {
            index = 0;
            while index < tree.declarations.len() {
                let entry = tree.declarations[index];
                if (pass == 0 && entry.kind == 5) || (pass == 1 && entry.kind != 5) {
                    let line = xml_tree_text(&tree,entry.line); output.push_str(line.as_str());
                };
                index += 1;
            }
            pass += 1;
        }
        output.push(']');
    };
    output.push('>');
    xml_tree_store(tree,output.as_str())
}
