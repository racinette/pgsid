#[derive(Clone)]
struct XPathNamespaceBinding { prefix: String, uri: String }

#[derive(Clone)]
struct XPathNamespaces { values: Vec<XPathNamespaceBinding> }

#[derive(Clone)]
struct XPathNodeTest { kind: usize, principal: i32, name: String, uri: String, prefixed: bool, valid: bool }

fn xpath_namespaces_empty() -> XPathNamespaces {
    let values: Vec<XPathNamespaceBinding> = Vec::new();
    XPathNamespaces { values }
}

pub(crate) fn xpath_namespaces_push(input: XPathNamespaces, prefix: &str, uri: &str) -> XPathNamespaces {
    let mut values = input.values;
    let value = XPathNamespaceBinding { prefix: prefix.to_owned(), uri: uri.to_owned() };
    values.push(value);
    XPathNamespaces { values }
}

fn xpath_node_test(program: &XPathProgram, step: XPathExpression, namespaces: &XPathNamespaces) -> XPathNodeTest {
    let name = xpath_parse_text(program,step.name);
    let prefix = xpath_parse_text(program,step.prefix);
    let mut principal: i32 = 1;
    if step.operation == 2 { principal = 8; };
    if step.operation == 13 { principal = 9; };
    let mut uri = String::new();
    let mut valid = true;
    if step.right == 1 && prefix.as_str() != "" {
        valid = false;
        let mut position = namespaces.values.len();
        while position > 0 && valid == false {
            position = position-1;
            let value = namespaces.values[position].clone();
            if value.prefix == prefix { uri = value.uri.clone(); valid = true; };
        }
        if prefix.as_str() == "xml" { uri = "http://www.w3.org/XML/1998/namespace".to_owned(); valid = true; };
    };
    XPathNodeTest { kind: step.right, principal, name, uri, prefixed: prefix.as_str() != "", valid }
}

fn xpath_node_matches(tree: &XmlTree, test: &XPathNodeTest, value: XPathReference) -> bool {
    if test.valid == false { return false; };
    let kind = xpath_reference_type(tree,value);
    if test.kind == 2 { return (kind >= 0 && kind <= 5) || kind == 8 || kind == 9; };
    if test.kind == 3 { return kind == 2 || kind == 3; };
    if test.kind == 4 { return kind == 4; };
    if test.kind == 5 || test.kind == 6 {
        if kind != 5 { return false; };
        if test.kind == 5 { return true; };
        let name = xpath_reference_name(tree,value);
        return name.qualified == test.name;
    };
    if kind != test.principal { return false; };
    let name = xpath_reference_name(tree,value);
    if test.name.as_str() != "*" && name.local != test.name { return false; };
    if kind == 9 { return true; };
    if test.name.as_str() == "*" && test.prefixed == false { return true; };
    if test.prefixed && test.uri.as_str() == "" { return false; };
    name.namespace == test.uri
}

fn xpath_local_axis_test(tree: &XmlTree, context: XPathReference, axis: i32, test: &XPathNodeTest) -> XPathNodes {
    let candidates = xpath_local_axis(tree,context,axis);
    let mut result = xpath_nodes_empty();
    let mut position: usize = 0;
    while position < candidates.values.len() {
        let value = candidates.values[position];
        if xpath_node_matches(tree,test,value) { result = xpath_nodes_push(result,value); };
        position += 1;
    }
    result
}
