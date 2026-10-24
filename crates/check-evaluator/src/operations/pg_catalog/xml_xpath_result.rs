const SQLSTATE_INVALID_XPATH: u32 = 1687400;
const SQLSTATE_XML_NODE_COPY: u32 = 8540640;
const XPATH_RESULT_SQL_ERROR: i32 = 5;
const XPATH_RESULT_FLOAT_CONTEXT: i32 = 6;
const XPATH_RESULT_NOTATION_CONTEXT: i32 = 7;

#[derive(Clone)]
struct XPathXmlResult { state: i32, error: SqlError, shaped: bool, values: Vec<XmlValue> }

fn xpath_xml_result_empty(state: i32, shaped: bool) -> XPathXmlResult {
    let values: Vec<XmlValue> = Vec::new();
    let error = make_sql_error(0);
    XPathXmlResult { state, error, shaped, values }
}

fn xpath_xml_result_error(error: SqlError) -> XPathXmlResult {
    let values: Vec<XmlValue> = Vec::new();
    XPathXmlResult { state: XPATH_RESULT_SQL_ERROR, error, shaped: false, values }
}

pub(crate) fn xpath_xml_result_push(input: XPathXmlResult, value: XmlValue, state: i32) -> XPathXmlResult {
    let mut values = input.values; values.push(value);
    let mut next = input.state;
    if state != 0 && (next == 0 || state == 3) { next = state; };
    XPathXmlResult { state: next, error: input.error, shaped: input.shaped, values }
}

fn xpath_result_count(input: &XPathValue) -> Int4Value {
    if input.state < 0 { return Int4Value::Error(make_sql_error(SQLSTATE_INVALID_XPATH)); };
    if input.state != 0 { return Int4Value::Unknown; };
    if input.kind == XPATH_KIND_NODES { return Int4Value::Value(input.nodes.values.len() as i32); };
    if input.kind == XPATH_KIND_BOOLEAN || input.kind == XPATH_KIND_NUMBER || input.kind == XPATH_KIND_STRING { return Int4Value::Value(1); };
    Int4Value::Unknown
}

fn xpath_result_exists(input: &XPathValue) -> BoolValue {
    let count = xpath_result_count(input);
    if let Int4Value::Error(error) = count { return BoolValue::Error(error); };
    if let Int4Value::Value(value) = count { return BoolValue::Value(value > 0); };
    BoolValue::Unknown
}

pub(crate) fn xpath_result_to_xml(input: XPathValue, tree: &XmlTree, graph: &XPathGraph, extra: i32, known: bool) -> XPathXmlResult {
    if input.state != 0 { return xpath_xml_result_empty(input.state,false); };
    let mut result = xpath_xml_result_empty(0,true);
    if input.kind == XPATH_KIND_NODES {
        let mut index: usize = 0;
        while index < input.nodes.values.len() {
            let value = xpath_node_to_xml(tree,graph,input.nodes.values[index]);
            if let XmlValue::Error(error) = value { return xpath_xml_result_error(error); };
            let mut state: i32 = 0;
            if let XmlValue::Unknown = value {
                state = XPATH_RESULT_NOTATION_CONTEXT;
                if tree.serialization_gap { state = 3; };
            };
            result = xpath_xml_result_push(result,value,state);
            index += 1;
        }
        return result;
    };
    let mut text = TextValue::Unknown;
    if input.kind == XPATH_KIND_BOOLEAN {
        text = make_text_value("false"); if input.boolean { text = make_text_value("true"); };
    } else if input.kind == XPATH_KIND_STRING {
        let string = TextValue::Value(input.text); text = xml_element_value_escape(string,true);
    } else if input.kind == XPATH_KIND_NUMBER {
        let number = Float8Value::Value(input.number); text = float8_output_context(number,extra,known);
    } else { return xpath_xml_result_empty(3,false); };
    if let TextValue::Error(error) = text { return xpath_xml_result_error(error); };
    if let TextValue::Value(value) = text {
        let xml = XmlValue::Value(value);
        return xpath_xml_result_push(result,xml,0);
    };
    let mut state = XPATH_RESULT_FLOAT_CONTEXT;
    if input.kind != XPATH_KIND_NUMBER || (known && extra >= -15 && extra <= 3) { state = 3; };
    xpath_xml_result_push(result,XmlValue::Unknown,state)
}

#[derive(Clone)]
struct XPathCopyNamespace { prefix: String, uri: String, next: usize }

#[derive(Clone, Copy)]
struct XPathCopyNamespaceScope { first: usize, last: usize }

#[derive(Clone)]
struct XPathCopyNamespaces { entries: Vec<XPathCopyNamespace>, scopes: Vec<XPathCopyNamespaceScope> }

#[derive(Clone, Copy)]
struct XPathCopyWrite { node: usize, closing: bool, newline: bool }

fn xpath_copy_prefix(qualified: &str) -> String {
    let source = XmlSource { characters: qualified.chars().collect() };
    let mut end: usize = 0;
    while end < source.characters.len() && source.characters[end] != ':' { end += 1; }
    if end == source.characters.len() { return String::new(); };
    xml_source_range(&source,XmlSpan { start: 0, end })
}

pub(crate) fn xpath_copy_namespace_add(input: XPathCopyNamespaces, owner: usize, prefix: String, uri: String) -> XPathCopyNamespaces {
    let mut entries = input.entries;
    let mut scopes = input.scopes; let scope = scopes[owner]; let next = entries.len()+1;
    if scope.last > 0 {
        let old = entries[scope.last-1].clone();
        entries[scope.last-1] = XPathCopyNamespace { prefix: old.prefix, uri: old.uri, next };
    };
    let mut first = scope.first; if first == 0 { first = next; };
    scopes[owner] = XPathCopyNamespaceScope { first, last: next };
    entries.push(XPathCopyNamespace { prefix, uri, next: 0 });
    XPathCopyNamespaces { entries, scopes }
}

fn xpath_copy_namespace_find(input: &XPathCopyNamespaces, tree: &XmlTree, node: usize, root: usize, prefix: &str) -> usize {
    let mut cursor = node;
    let mut scanning = true;
    while scanning {
        let mut index = input.scopes[cursor].first;
        while index > 0 {
            let entry = input.entries[index-1].clone();
            if entry.prefix.as_str() == prefix { return index-1; };
            index = entry.next;
        }
        if cursor == root || cursor == 0 { scanning = false; }
        else { cursor = tree.nodes[cursor].parent; };
    }
    input.entries.len()
}

fn xpath_copy_next(tree: &XmlTree, node: usize, root: usize) -> usize {
    let item = tree.nodes[node];
    if (item.kind == 0 || item.kind == 1) && item.first > 0 { return item.first; };
    let mut cursor = node;
    while cursor != root {
        if tree.nodes[cursor].next > 0 { return tree.nodes[cursor].next; };
        cursor = tree.nodes[cursor].parent;
    }
    0
}

pub(crate) fn xpath_copy_require_namespace(input: XPathCopyNamespaces, tree: &XmlTree, owner: usize, root: usize, name: XmlQueryName) -> XPathCopyNamespaces {
    let prefix = xpath_copy_prefix(name.qualified.as_str());
    if name.namespace.as_str() == "" || prefix.as_str() == "xml" { return input; };
    let found = xpath_copy_namespace_find(&input,tree,owner,root,prefix.as_str());
    if found < input.entries.len() { return input; };
    xpath_copy_namespace_add(input,root,prefix,name.namespace)
}

fn xpath_copy_namespaces(tree: &XmlTree, root: usize) -> XPathCopyNamespaces {
    let entries: Vec<XPathCopyNamespace> = Vec::new();
    let mut scopes: Vec<XPathCopyNamespaceScope> = Vec::new(); let mut index: usize = 0;
    while index < tree.nodes.len() { scopes.push(XPathCopyNamespaceScope { first: 0, last: 0 }); index += 1; }
    let mut result = XPathCopyNamespaces { entries, scopes };
    let mut cursor = root;
    let mut scanning = true;
    while scanning {
        let node = tree.nodes[cursor];
        if node.kind == 1 {
            let mut index = node.attribute_start;
            while index < node.attribute_end {
                let attribute = tree.attributes[index];
                let name = xml_tree_text(tree,attribute.name);
                if xml_query_namespace_attribute_text(name.as_str()) && name.as_str() != "xmlns:xml" {
                    let prefix = xpath_namespace_prefix(tree,index+1);
                    let uri = xml_tree_text(tree,attribute.value);
                    result = xpath_copy_namespace_add(result,cursor,prefix,uri);
                };
                index += 1;
            }
            let name = xml_query_node_name(tree,cursor);
            result = xpath_copy_require_namespace(result,tree,cursor,root,name);
            index = node.attribute_start;
            while index < node.attribute_end {
                let attribute = tree.attributes[index];
                if xml_query_namespace_attribute(tree,attribute.name) == false {
                    let name = xml_query_expand_name(tree,cursor,attribute.name,true);
                    result = xpath_copy_require_namespace(result,tree,cursor,root,name);
                };
                index += 1;
            }
        };
        cursor = xpath_copy_next(tree,cursor,root);
        if cursor == 0 { scanning = false; };
    }
    result
}

fn xpath_copy_escape_character(character: char, attribute: bool) -> String {
    if character == '&' { return "&amp;".to_owned(); };
    if character == '<' { return "&lt;".to_owned(); };
    if character == '>' { return "&gt;".to_owned(); };
    if character == '\r' { return "&#13;".to_owned(); };
    if attribute && character == '"' { return "&quot;".to_owned(); };
    if attribute && character == '\n' { return "&#10;".to_owned(); };
    if attribute && character == '\t' { return "&#9;".to_owned(); };
    let mut output = String::new(); output.push(character); output
}

fn xpath_copy_escape(input: &str, attribute: bool) -> String {
    let characters: Vec<char> = input.chars().collect();
    let mut output = String::new(); let mut index: usize = 0;
    while index < characters.len() {
        let escaped = xpath_copy_escape_character(characters[index],attribute);
        output.push_str(escaped.as_str()); index += 1;
    }
    output
}

fn xpath_copy_attribute(tree: &XmlTree, attribute: XmlTreeAttribute) -> String {
    let text = xml_tree_text(tree,attribute.query_source);
    let source = XmlSource { characters: text.as_str().chars().collect() };
    let mut output = String::new(); let mut index: usize = 0;
    while index < source.characters.len() {
        if source.characters[index] == '&' {
            let reference = xml_reference(&source,index);
            if xml_predefined_reference(&source,index) {
                let character = xml_reference_scalar(&source,index);
                let escaped = xpath_copy_escape_character(character,true);
                output.push_str(escaped.as_str());
            } else {
                let span = XmlSpan { start: index, end: reference.next };
                let literal = xml_source_range(&source,span); output.push_str(literal.as_str());
            };
            index = reference.next;
        } else {
            let escaped = xpath_copy_escape_character(source.characters[index],true);
            output.push_str(escaped.as_str()); index += 1;
        };
    }
    output
}

fn xpath_copy_doctype(tree: &XmlTree, node: XmlTreeNode) -> String {
    let text = xml_tree_text(tree,node.value);
    let source = XmlSource { characters: text.as_str().chars().collect() };
    let mut position: usize = 9; let mut quote = ' ';
    while position < source.characters.len() && (quote != ' ' || (source.characters[position] != '[' && source.characters[position] != '>')) {
        let character = source.characters[position];
        if quote != ' ' { if character == quote { quote = ' '; }; }
        else if character == '"' || character == '\'' { quote = character; };
        position += 1;
    }
    let mut end = position;
    while end > 0 && xml_space(source.characters[end-1]) { end = end-1; }
    let mut output = xml_source_range(&source,XmlSpan { start: 0, end });
    let mut entries: usize = 0; let mut index: usize = 0;
    while index < tree.declarations.len() { if tree.declarations[index].kind <= 5 { entries += 1; }; index += 1; }
    if entries > 0 {
        output.push_str(" [\n"); let mut pass: usize = 0;
        while pass < 2 {
            index = 0;
            while index < tree.declarations.len() {
                let entry = tree.declarations[index];
                if (pass == 0 && entry.kind == 5) || (pass == 1 && entry.kind != 5 && entry.kind != 7) {
                    let line = xml_tree_text(tree,entry.line); output.push_str(line.as_str());
                };
                index += 1;
            }
            pass += 1;
        }
        output.push(']');
    };
    output.push('>'); output
}

fn xpath_node_to_xml(tree: &XmlTree, graph: &XPathGraph, value: XPathReference) -> XmlValue {
    if value.kind != 0 || tree.nodes[value.node].kind == 2 {
        let text = xpath_reference_string(tree,graph,value);
        let escaped = xml_element_value_escape(TextValue::Value(text),true);
        if let TextValue::Value(output) = escaped { return XmlValue::Value(output); };
        return XmlValue::Unknown;
    };
    let namespaces = xpath_copy_namespaces(tree,value.node);
    let mut stack: Vec<XPathCopyWrite> = Vec::new();
    stack.push(XPathCopyWrite { node: value.node, closing: false, newline: false });
    let mut count: usize = 1; let mut output = String::new();
    while count > 0 {
        count = count-1; let task = stack[count]; let node = tree.nodes[task.node];
        let name = xml_tree_text(tree,node.name);
        if task.closing {
            output.push_str("</"); output.push_str(name.as_str()); output.push('>');
            if task.newline { output.push('\n'); };
        } else if node.kind == 0 {
            let version = xml_tree_text(tree,tree.flags.version);
            output.push_str("<?xml version=\""); output.push_str(version.as_str()); output.push_str("\" encoding=\"UTF-8\"");
            if tree.flags.standalone == 1 { output.push_str(" standalone=\"yes\""); };
            if tree.flags.standalone == 0 { output.push_str(" standalone=\"no\""); };
            output.push_str("?>\n");
            let mut child = node.last;
            while child > 0 {
                let next = XPathCopyWrite { node: child, closing: false, newline: true };
                if count < stack.len() { stack[count] = next; } else { stack.push(next); };
                count += 1; child = tree.nodes[child].previous;
            }
        } else if node.kind == 1 {
            output.push('<'); output.push_str(name.as_str());
            let mut index = namespaces.scopes[task.node].first;
            while index > 0 {
                let namespace = namespaces.entries[index-1].clone();
                output.push_str(" xmlns");
                if namespace.prefix.as_str() != "" { output.push(':'); output.push_str(namespace.prefix.as_str()); };
                let uri = xpath_copy_escape(namespace.uri.as_str(),true);
                output.push_str("=\""); output.push_str(uri.as_str()); output.push('"');
                index = namespace.next;
            }
            index = node.attribute_start;
            while index < node.attribute_end {
                let attribute = tree.attributes[index];
                if xml_query_namespace_attribute(tree,attribute.name) == false {
                    let name = xml_tree_text(tree,attribute.name); let value = xpath_copy_attribute(tree,attribute);
                    output.push(' '); output.push_str(name.as_str()); output.push_str("=\""); output.push_str(value.as_str()); output.push('"');
                };
                index += 1;
            }
            if node.first == 0 {
                output.push_str("/>"); if task.newline { output.push('\n'); };
            } else {
                output.push('>');
                let close = XPathCopyWrite { node: task.node, closing: true, newline: task.newline };
                if count < stack.len() { stack[count] = close; } else { stack.push(close); };
                count += 1;
                let mut child = node.last;
                while child > 0 {
                    let next = XPathCopyWrite { node: child, closing: false, newline: false };
                    if count < stack.len() { stack[count] = next; } else { stack.push(next); };
                    count += 1; child = tree.nodes[child].previous;
                }
            };
        } else {
            let text = xml_tree_text(tree,node.value);
            if node.kind == 2 { let escaped = xpath_copy_escape(text.as_str(),false); output.push_str(escaped.as_str()); }
            else if node.kind == 3 { output.push_str("<![CDATA["); output.push_str(text.as_str()); output.push_str("]]>"); }
            else if node.kind == 4 { output.push_str("<!--"); output.push_str(text.as_str()); output.push_str("-->"); }
            else if node.kind == 5 {
                output.push_str("<?"); output.push_str(name.as_str());
                if node.content_present { output.push(' '); output.push_str(text.as_str()); };
                output.push_str("?>");
            } else if node.kind == 7 { output.push('&'); output.push_str(name.as_str()); output.push(';'); }
            else if node.kind == 6 && value.node == 0 {
                if tree.serialization_known == false { return XmlValue::Unknown; };
                let doctype = xpath_copy_doctype(tree,node); output.push_str(doctype.as_str());
            } else { return XmlValue::Error(make_sql_error(SQLSTATE_XML_NODE_COPY)); };
            if task.newline { output.push('\n'); };
        };
    }
    XmlValue::Value(output)
}
