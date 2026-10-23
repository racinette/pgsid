fn xml_query_namespace_attribute_text(name: &str) -> bool {
    let source = XmlSource { characters: name.chars().collect() };
    name == "xmlns" || xml_at(&source,0,"xmlns:")
}

fn xml_query_attribute_source(source: &XmlSource, value: XmlSpan, tokenized: bool) -> String {
    let mut output = String::new(); let mut position = value.start;
    while position < value.end {
        let character = source.characters[position];
        if character == '&' {
            let reference = xml_reference(source,position);
            if xml_predefined_reference(source,position) {
                let scalar = xml_reference_scalar(source,position);
                if scalar == '&' { output.push_str("&#38;"); } else { output.push(scalar); };
            } else {
                let span = XmlSpan { start: position, end: reference.next };
                let text = xml_source_range(source,span); output.push_str(text.as_str());
            };
            position = reference.next;
        } else {
            if xml_space(character) {
                output.push(' ');
                if character == '\r' && position+1 < value.end && source.characters[position+1] == '\n' { position += 1; };
            } else { output.push(character); };
            position += 1;
        };
    }
    if tokenized { return xml_collapse_space(output.as_str()); };
    output
}

fn xml_query_entity_content(arena: &XmlEntityArena, name: &str) -> String {
    let index = xml_entity_lookup(arena,name,false);
    if index == arena.entities.len() { return String::new(); };
    let entity = arena.entities[index];
    if entity.external { return String::new(); };
    let source = XmlSource { characters: arena.arena.as_str().chars().collect() };
    if entity.query_used && entity.query_attribute == false {
        return xml_tree_normalize(&source,entity.value.start,entity.value.end);
    };
    xml_source_range(&source,entity.value)
}

fn xml_query_attribute_entities(source: &XmlSource, value: XmlSpan, arena: &XmlEntityArena) -> String {
    let mut output = String::new(); let mut position = value.start;
    while position < value.end {
        let character = source.characters[position];
        if character == '&' {
            let reference = xml_reference(source,position);
            if xml_predefined_reference(source,position) { output.push(xml_reference_scalar(source,position)); }
            else {
                let name_span = XmlSpan { start: position+1, end: reference.next-1 };
                let name = xml_source_range(source,name_span);
                let expanded = xml_query_entity_content(arena,name.as_str());
                let nested = XmlSource { characters: expanded.as_str().chars().collect() };
                let body_span = XmlSpan { start: 0, end: nested.characters.len() };
                let text = xml_query_attribute_entities(&nested,body_span,arena); output.push_str(text.as_str());
            };
            position = reference.next;
        } else {
            output.push(character);
            position += 1;
        };
    }
    output
}

fn xml_query_attribute_value(source: &XmlSource, value: XmlSpan, arena: &XmlEntityArena, tokenized: bool) -> String {
    let text = xml_query_attribute_source(source,value,tokenized);
    let normalized = XmlSource { characters: text.as_str().chars().collect() };
    let span = XmlSpan { start: 0, end: normalized.characters.len() };
    xml_query_attribute_entities(&normalized,span,arena)
}

pub(crate) fn xml_query_entity_mark(input: XmlEntityArena, index: usize, attribute: bool) -> XmlEntityArena {
    let mut entities = input.entities;
    let entry = entities[index];
    entities[index] = XmlEntityIndex { name: entry.name, value: entry.value,
        query_used: true, query_attribute: attribute, parameter: entry.parameter, external: entry.external, unparsed: entry.unparsed };
    XmlEntityArena { arena: input.arena, entities, defaults: input.defaults, flags: input.flags, cost: input.cost }
}

pub(crate) fn xml_query_prepare_entities(input: XmlEntityArena, source: &XmlSource, start: usize, attribute: bool) -> XmlEntityArena {
    let mut arena = input;
    let mut position = start;
    let mut tag = false; let mut quote = ' ';
    while position < source.characters.len() {
        let character = source.characters[position];
        if attribute == false && quote == ' ' && xml_at(source,position,"<!--") {
            let end = xml_comment(source,position); position = end.next;
        } else if attribute == false && quote == ' ' && xml_at(source,position,"<![CDATA[") {
            let end = xml_cdata(source,position); position = end.next;
        } else if attribute == false && quote == ' ' && xml_at(source,position,"<?") {
            let end = xml_processing_instruction(source,position); position = end.next;
        } else if character == '&' {
            let reference = xml_reference(source,position);
            if reference.valid == false { return arena; };
            if xml_predefined_reference(source,position) == false {
                let span = XmlSpan { start: position+1, end: reference.next-1 };
                let name = xml_source_range(source,span);
                let index = xml_entity_lookup(&arena,name.as_str(),false);
                if index < arena.entities.len() && arena.entities[index].query_used == false {
                    let in_attribute = attribute || quote != ' ';
                    arena = xml_query_entity_mark(arena,index,in_attribute);
                    let text = xml_query_entity_content(&arena,name.as_str());
                    let nested = XmlSource { characters: text.as_str().chars().collect() };
                    arena = xml_query_prepare_entities(arena,&nested,0,in_attribute);
                };
            };
            position = reference.next;
        } else {
            if attribute == false {
                if quote != ' ' { if character == quote { quote = ' '; }; }
                else if tag && (character == '\'' || character == '"') { quote = character; }
                else if character == '<' { tag = true; }
                else if character == '>' { tag = false; };
            };
            position += 1;
        };
    }
    arena
}

fn xml_query_preserve_entity(arena: &XmlEntityArena, name: &str) -> bool {
    let index = xml_entity_lookup(arena,name,false);
    index < arena.entities.len() && arena.entities[index].query_attribute
}

fn xml_tree_source_text(source: &XmlSource, start: usize, end: usize, preserve_carriage: bool) -> String {
    if preserve_carriage { return xml_source_range(source,XmlSpan { start, end }); };
    xml_tree_normalize(source,start,end)
}
