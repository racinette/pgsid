fn xpath_language_prefix(actual: &str, wanted: &str) -> bool {
    let source: Vec<char> = actual.chars().collect(); let needle: Vec<char> = wanted.chars().collect();
    if source.len() < needle.len() { return false; };
    let mut index: usize = 0;
    while index < needle.len() {
        let mut a = source[index] as i32; let mut b = needle[index] as i32;
        if a >= 65 && a <= 90 { a = a+32; }; if b >= 65 && b <= 90 { b = b+32; };
        if a != b { return false; }; index += 1;
    }
    source.len() == needle.len() || source[needle.len()] == '-'
}

pub(crate) fn xpath_function_language(input: XPathValue, context: XPathContext, tree: &XmlTree, graph: &XPathGraph) -> XPathValue {
    let text = xpath_value_to_string(input,tree,graph);
    if text.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,text.state); };
    if context.node.kind == 2 { return xpath_value_boolean(false); };
    let mut cursor = context.node.node;
    while cursor > 0 {
        let node = tree.nodes[cursor]; let mut index = node.attribute_start;
        while index < node.attribute_end {
            let attribute = tree.attributes[index]; let name = xml_query_expand_name(tree,cursor,attribute.name,true);
            if name.local.as_str() == "lang" && name.namespace.as_str() == "http://www.w3.org/XML/1998/namespace" {
                let language = xml_tree_text(tree,attribute.value);
                return xpath_value_boolean(xpath_language_prefix(language.as_str(),text.text.as_str()));
            };
            index += 1;
        }
        cursor = node.parent;
    }
    xpath_value_boolean(false)
}
