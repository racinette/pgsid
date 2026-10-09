fn xml_well_formed(input: &str, document: bool) -> bool {
    let source = XmlSource {
        characters: input.chars().collect(),
    };
    let mut beginning: usize = 0;
    if document && source.characters.len() > 0 && source.characters[0] == '\u{feff}' {
        beginning = 1;
    }
    let mut declaration = xml_parse_declaration(&source, beginning, document);
    if declaration.valid == false {
        return false;
    }
    let mut cursor = declaration.next;
    let mut scanning = true;
    while scanning {
        cursor = xml_skip_space(&source, cursor);
        if xml_at(&source, cursor, "<!--") {
            let comment = xml_comment(&source, cursor);
            if comment.valid == false {
                return false;
            }
            cursor = comment.next;
        } else if xml_at(&source, cursor, "<?") {
            let instruction = xml_processing_instruction(&source, cursor);
            if instruction.valid == false {
                return false;
            }
            cursor = instruction.next;
        } else {
            scanning = false;
        };
    }
    let mut arena = xml_new_arena(input, declaration.standalone);
    let mut mode = document;
    let mut start = declaration.next;
    if xml_at(&source, cursor, "<!DOCTYPE") {
        if mode == false {
            declaration = xml_parse_declaration(&source, beginning, true);
            if declaration.valid == false {
                return false;
            }
        }
        mode = true;
        let doctype = xml_read_doctype(input, cursor, declaration.standalone);
        if doctype.state.flags.valid == false {
            return false;
        }
        arena = doctype.state;
        start = doctype.next;
    }
    let markup = xml_markup(&source, start, mode, &arena, 0, 0, xml_new_entity_cache());
    markup.valid
}
