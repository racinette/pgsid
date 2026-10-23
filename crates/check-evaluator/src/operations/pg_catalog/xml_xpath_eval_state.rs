#[derive(Clone)]
struct XPathArguments { first: XPathValue, second: XPathValue, third: XPathValue, rest: Vec<XPathValue>, count: i32 }

#[derive(Clone, Copy)]
struct XPathFunctionSpec { kind: i32, minimum: i32, maximum: i32 }

#[derive(Clone, Copy)]
struct XPathPosition { valid: bool, value: i32 }

fn xpath_value_fault(code: i32) -> XPathValue { xpath_value_empty(0,0-code) }

fn xpath_value_single(node: XPathReference) -> XPathValue {
    let mut values: Vec<XPathReference> = Vec::new(); if node.kind >= 0 { values.push(node); };
    xpath_value_nodes(XPathSequence { values, cyclic: false, cycle: 0 })
}

pub(crate) fn xpath_value_sorted(input: XPathValue, tree: &XmlTree) -> XPathValue {
    if input.kind != XPATH_KIND_NODES || input.state != 0 { return input; };
    let nodes = XPathNodes { values: input.nodes.values }; let sorted = xpath_nodes_sort(nodes,tree);
    xpath_value_nodes(XPathSequence { values: sorted.values, cyclic: false, cycle: 0 })
}

fn xpath_arguments_empty() -> XPathArguments {
    let rest: Vec<XPathValue> = Vec::new();
    XPathArguments { first: xpath_value_empty(0,0), second: xpath_value_empty(0,0), third: xpath_value_empty(0,0), rest, count: 0 }
}

pub(crate) fn xpath_arguments_add(input: XPathArguments, value: XPathValue) -> XPathArguments {
    if input.count == 0 { return XPathArguments { first: value, second: input.second, third: input.third, rest: input.rest, count: 1 }; };
    if input.count == 1 { return XPathArguments { first: input.first, second: value, third: input.third, rest: input.rest, count: 2 }; };
    if input.count == 2 { return XPathArguments { first: input.first, second: input.second, third: value, rest: input.rest, count: 3 }; };
    let mut rest = input.rest; rest.push(value);
    XPathArguments { first: input.first, second: input.second, third: input.third, rest, count: input.count+1 }
}

fn xpath_function_spec(name: &str) -> XPathFunctionSpec {
    let mut kind: i32 = 0; let mut minimum: i32 = 1; let mut maximum: i32 = 1;
    if name == "position" { kind = 1; minimum = 0; maximum = 0; }
    else if name == "last" { kind = 2; minimum = 0; maximum = 0; }
    else if name == "count" { kind = 3; }
    else if name == "string" { kind = 4; minimum = 0; }
    else if name == "number" { kind = 5; minimum = 0; }
    else if name == "boolean" { kind = 6; }
    else if name == "not" { kind = 7; }
    else if name == "true" { kind = 8; minimum = 0; maximum = 0; }
    else if name == "false" { kind = 9; minimum = 0; maximum = 0; }
    else if name == "name" { kind = 10; minimum = 0; }
    else if name == "local-name" { kind = 11; minimum = 0; }
    else if name == "namespace-uri" { kind = 12; minimum = 0; }
    else if name == "concat" { kind = 13; minimum = 2; maximum = -1; }
    else if name == "starts-with" { kind = 14; minimum = 2; maximum = 2; }
    else if name == "contains" { kind = 15; minimum = 2; maximum = 2; }
    else if name == "substring-before" { kind = 16; minimum = 2; maximum = 2; }
    else if name == "substring-after" { kind = 17; minimum = 2; maximum = 2; }
    else if name == "substring" { kind = 18; minimum = 2; maximum = 3; }
    else if name == "string-length" { kind = 19; minimum = 0; }
    else if name == "normalize-space" { kind = 20; minimum = 0; }
    else if name == "translate" { kind = 21; minimum = 3; maximum = 3; }
    else if name == "sum" { kind = 22; }
    else if name == "floor" { kind = 23; }
    else if name == "ceiling" { kind = 24; }
    else if name == "round" { kind = 25; }
    else if name == "lang" { kind = 26; }
    else if name == "id" { kind = 27; };
    XPathFunctionSpec { kind, minimum, maximum }
}

fn xpath_constant_position(program: &XPathProgram, root: usize, powers: &XPathPowers) -> XPathPosition {
    let mut index = root;
    while program.nodes[index].kind == XPATH_GROUP { index = program.nodes[index].left; }
    let node = program.nodes[index];
    if node.kind == XPATH_NUMBER {
        let text = xpath_parse_text(program,node.name); let parsed = xpath_number_text(text.as_str(),powers);
        if parsed.state == 0 {
            let value = f64::from_bits(parsed.number as u64);
            if value > -2147483648.0f64 && value < 2147483647.0f64 {
                let position = value as i32;
                if value == position as f64 { return XPathPosition { valid: true, value: position }; };
            };
        };
    };
    XPathPosition { valid: false, value: 0 }
}

fn xpath_namespace_defined(namespaces: &XPathNamespaces, prefix: &str) -> bool {
    if prefix == "xml" { return true; };
    let mut index: usize = 0;
    while index < namespaces.values.len() { let binding = namespaces.values[index].clone(); if binding.prefix.as_str() == prefix { return true; }; index += 1; }
    false
}
