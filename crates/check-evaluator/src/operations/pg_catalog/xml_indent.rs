#[derive(Clone, Copy)]
struct XmlTreeWrite { node: usize, depth: usize, format: bool, padding: bool, closing: bool, siblings: bool }

fn xml_tree_escape(tree: &XmlTree, span: XmlSpan, attribute: bool) -> String {
    let mut output = String::new();
    let mut position = span.start;
    while position < span.end {
        let character = tree.characters[position];
        let code = character as i32;
        if character == '&' { output.push_str("&amp;"); }
        else if character == '<' { output.push_str("&lt;"); }
        else if character == '>' { output.push_str("&gt;"); }
        else if character == '"' && attribute { output.push_str("&quot;"); }
        else if character == '\r' { output.push_str("&#13;"); }
        else if character == '\n' && attribute { output.push_str("&#10;"); }
        else if character == '\t' && attribute { output.push_str("&#9;"); }
        else if code >= 128 && tree.flags.unicode == false && tree.flags.query == false {
            let reference = xml_element_character_reference(code); output.push_str(reference.as_str());
        } else { output.push(character); };
        position += 1;
    }
    output
}

fn xml_tree_padding(input: String, depth: usize) -> String {
    let mut output = input;
    let mut index: usize = 0;
    while index < depth { output.push_str("  "); index += 1; }
    output
}

fn xml_tree_write_node(tree: &XmlTree, node: usize) -> String {
    let mut output = String::new();
    let mut stack: Vec<XmlTreeWrite> = Vec::new();
    stack.push(XmlTreeWrite { node, depth: 0, format: true, padding: false, closing: false, siblings: false });
    let mut count: usize = 1;
    while count > 0 {
        count = count - 1;
        let task = stack[count];
        let node = tree.nodes[task.node];
        if task.closing {
            if task.format { output = xml_tree_padding(output,task.depth); };
            let name = xml_tree_text(tree,node.name);
            output.push_str("</"); output.push_str(name.as_str()); output.push('>');
            if task.padding { output.push('\n'); };
        } else {
            if task.siblings && node.next > 0 {
                let next = XmlTreeWrite { node: node.next, depth: task.depth, format: task.format, padding: task.padding, closing: false, siblings: true };
                if count < stack.len() { stack[count] = next; } else { stack.push(next); };
                count += 1;
            };
            if task.padding { output = xml_tree_padding(output,task.depth); };
            if node.kind == 1 {
                let name = xml_tree_text(tree,node.name);
                output.push('<'); output.push_str(name.as_str());
                let mut namespace = true;
                let mut pass: usize = 0;
                while pass < 2 {
                    let mut index = node.attribute_start;
                    while index < node.attribute_end {
                        let attribute = tree.attributes[index];
                        let name = xml_tree_text(tree,attribute.name);
                        let spelling = XmlSource { characters: name.as_str().chars().collect() };
                        let is_namespace = name.as_str() == "xmlns" || xml_at(&spelling,0,"xmlns:");
                        if is_namespace == namespace && name.as_str() != "xmlns:xml" {
                            let value = xml_tree_escape(tree,attribute.value,true);
                            output.push(' '); output.push_str(name.as_str()); output.push_str("=\""); output.push_str(value.as_str()); output.push('"');
                        };
                        index += 1;
                    }
                    namespace = false; pass += 1;
                }
                if node.first == 0 {
                    output.push_str("/>");
                    if task.padding { output.push('\n'); };
                } else {
                    let format = task.format && node.textual == false;
                    output.push('>'); if format { output.push('\n'); };
                    let close = XmlTreeWrite { node: task.node, depth: task.depth, format, padding: task.padding, closing: true, siblings: false };
                    if count < stack.len() { stack[count] = close; } else { stack.push(close); };
                    count += 1;
                    let child = XmlTreeWrite { node: node.first, depth: task.depth+1, format, padding: format, closing: false, siblings: true };
                    if count < stack.len() { stack[count] = child; } else { stack.push(child); };
                    count += 1;
                };
            } else {
                let value = xml_tree_text(tree,node.value);
                if node.kind == 2 { let escaped = xml_tree_escape(tree,node.value,false); output.push_str(escaped.as_str()); }
                else if node.kind == 3 { output.push_str("<![CDATA["); output.push_str(value.as_str()); output.push_str("]]>"); }
                else if node.kind == 4 { output.push_str("<!--"); output.push_str(value.as_str()); output.push_str("-->"); }
                else if node.kind == 6 { output.push_str(value.as_str()); }
                else if node.kind == 5 {
                    let name = xml_tree_text(tree,node.name); output.push_str("<?"); output.push_str(name.as_str());
                    if node.content_present { output.push(' '); output.push_str(value.as_str()); };
                    output.push_str("?>");
                };
                if task.padding { output.push('\n'); };
            };
        };
    }
    output
}

pub fn xml_indent_utf8(input: XmlValue, document: bool, utf8: bool) -> TextValue {
    if let XmlValue::Error(error) = input { return TextValue::Error(error); };
    if let XmlValue::Null = input { return TextValue::Null; };
    if let XmlValue::RenderedText(value) = input {
        if document && xml_text_encoding_available(value.as_str(),utf8) && xml_well_formed(value.as_str(),true) == false {
            return TextValue::Error(make_sql_error(SQLSTATE_NOT_XML_DOCUMENT));
        };
        return TextValue::Unknown;
    };
    if let XmlValue::Value(value) = input {
        if xml_text_encoding_available(value.as_str(),utf8) == false { return TextValue::Unknown; };
        if xml_well_formed(value.as_str(),document) == false { return TextValue::Error(make_sql_error(SQLSTATE_NOT_XML_DOCUMENT)); };
        let tree = xml_tree_parse(value.as_str(),document,false);
        if tree.serialization_known == false { return TextValue::Unknown; };
        let mut output = String::new();
        if tree.flags.document && tree.flags.declaration {
            let version = xml_tree_text(&tree,tree.flags.version);
            output.push_str("<?xml version=\""); output.push_str(version.as_str()); output.push_str("\" encoding=\"UTF-8\"");
            if tree.flags.standalone == 1 { output.push_str(" standalone=\"yes\""); };
            if tree.flags.standalone == 0 { output.push_str(" standalone=\"no\""); };
            output.push_str("?>\n");
        };
        let mut cursor = tree.nodes[0].first;
        let mut previous = false;
        while cursor > 0 {
            let node = tree.nodes[cursor];
            if tree.flags.document == false && previous && node.kind != 2 { output.push('\n'); };
            let value = xml_tree_write_node(&tree,cursor); output.push_str(value.as_str());
            if tree.flags.document && (document == false || node.next > 0) { output.push('\n'); };
            previous = true; cursor = node.next;
        }
        if xml_text_encoding_available(output.as_str(),utf8) == false { return TextValue::Unknown; };
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
