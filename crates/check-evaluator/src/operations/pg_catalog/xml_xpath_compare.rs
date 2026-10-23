fn xpath_compare_numbers(left: &XPathValue, right: &XPathValue, operation: i32) -> XPathValue {
    if left.state < 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,left.state); };
    if right.state < 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,right.state); };
    if left.state == 2 || right.state == 2 { return xpath_value_empty(XPATH_KIND_BOOLEAN,2); };
    let a = f64::from_bits(left.number as u64); let b = f64::from_bits(right.number as u64);
    if (left.state == 0 && a != a) || (right.state == 0 && b != b) { return xpath_value_boolean(operation == 4); };
    if left.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,left.state); };
    if right.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,right.state); };
    if operation == 3 { return xpath_value_boolean(a == b); };
    if operation == 4 { return xpath_value_boolean(a != b); };
    if operation == 5 { return xpath_value_boolean(a < b); };
    if operation == 6 { return xpath_value_boolean(a <= b); };
    if operation == 7 { return xpath_value_boolean(a > b); };
    xpath_value_boolean(a >= b)
}

fn xpath_compare_scalars(left: &XPathValue, right: &XPathValue, operation: i32, powers: &XPathPowers) -> XPathValue {
    if (operation == 3 || operation == 4) && (left.kind == XPATH_KIND_BOOLEAN || right.kind == XPATH_KIND_BOOLEAN) {
        let a = xpath_value_to_boolean(left); let b = xpath_value_to_boolean(right);
        if a.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,a.state); };
        if b.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,b.state); };
        if operation == 3 { return xpath_value_boolean(a.boolean == b.boolean); };
        return xpath_value_boolean(a.boolean != b.boolean);
    };
    if (operation == 3 || operation == 4) && left.kind == XPATH_KIND_STRING && right.kind == XPATH_KIND_STRING {
        if left.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,left.state); };
        if right.state != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,right.state); };
        if operation == 3 { return xpath_value_boolean(left.text == right.text); };
        return xpath_value_boolean(left.text != right.text);
    };
    let a = xpath_scalar_number(left,powers); let b = xpath_scalar_number(right,powers);
    xpath_compare_numbers(&a,&b,operation)
}

fn xpath_comparison_text(input: &XPathValue, index: usize, tree: &XmlTree, graph: &XPathGraph) -> XPathValue {
    if input.kind == XPATH_KIND_NODES {
        return xpath_value_string(xpath_reference_string(tree,graph,input.nodes.values[index]));
    };
    if input.state != 0 { return xpath_value_empty(input.kind,input.state); };
    if input.kind == XPATH_KIND_NUMBER { return xpath_value_number(f64::from_bits(input.number as u64)); };
    if input.kind == XPATH_KIND_BOOLEAN { return xpath_value_boolean(input.boolean); };
    xpath_value_string(input.text.clone())
}

fn xpath_values_compare(left: &XPathValue, right: &XPathValue, operation: i32, tree: &XmlTree, graph: &XPathGraph, powers: &XPathPowers) -> XPathValue {
    if left.state < 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,left.state); };
    if right.state < 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,right.state); };
    if left.state == 2 || right.state == 2 { return xpath_value_empty(XPATH_KIND_BOOLEAN,2); };
    if left.kind != XPATH_KIND_NODES && right.kind != XPATH_KIND_NODES {
        return xpath_compare_scalars(left,right,operation,powers);
    };
    if left.kind == XPATH_KIND_BOOLEAN || right.kind == XPATH_KIND_BOOLEAN {
        let a = xpath_value_to_boolean(left); let b = xpath_value_to_boolean(right);
        return xpath_compare_scalars(&a,&b,operation,powers);
    };
    let mut left_count: usize = 1; let mut right_count: usize = 1;
    if left.kind == XPATH_KIND_NODES { left_count = left.nodes.values.len(); };
    if right.kind == XPATH_KIND_NODES { right_count = right.nodes.values.len(); };
    let mut unknown: i32 = 0; let mut a: usize = 0;
    while a < left_count {
        let first = xpath_comparison_text(left,a,tree,graph); let mut b: usize = 0;
        while b < right_count {
            let second = xpath_comparison_text(right,b,tree,graph);
            let compared = xpath_compare_scalars(&first,&second,operation,powers);
            if compared.state != 0 { unknown = compared.state; }
            else if compared.boolean { return xpath_value_boolean(true); };
            b += 1;
        }
        a += 1;
    }
    if unknown != 0 { return xpath_value_empty(XPATH_KIND_BOOLEAN,unknown); };
    xpath_value_boolean(false)
}
