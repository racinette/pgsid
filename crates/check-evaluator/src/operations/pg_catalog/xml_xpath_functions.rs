pub(crate) fn xpath_apply_function(input: XPathArguments, kind: i32, context: XPathContext, tree: &XmlTree, graph: &XPathGraph, powers: &XPathPowers) -> XPathValue {
    let count = input.count;
    let mut first = input.first; let second = input.second; let third = input.third; let rest = input.rest;
    if count == 0 { first = xpath_value_single(context.node); };
    if kind == 1 { if context.position < 0 { return xpath_value_fault(14); }; return xpath_value_number(context.position as f64); };
    if kind == 2 { if context.size < 0 { return xpath_value_fault(13); }; return xpath_value_number(context.size as f64); };
    if kind == 8 { return xpath_value_boolean(true); }; if kind == 9 { return xpath_value_boolean(false); };
    if kind == 3 || kind == 22 {
        if first.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
        if first.state != 0 { return xpath_value_empty(XPATH_KIND_NUMBER,first.state); };
        if kind == 3 { return xpath_value_number((first.nodes.values.len() as i32) as f64); };
        let mut total = 0.0f64; let mut unknown: i32 = 0; let mut index: usize = 0;
        while index < first.nodes.values.len() {
            let text = xpath_reference_string(tree,graph,first.nodes.values[index]); let number = xpath_number_text(text.as_str(),powers);
            if number.state != 0 { unknown = number.state; }
            else { total = total+f64::from_bits(number.number as u64); };
            if total != total { return xpath_value_number(total); }; index += 1;
        }
        if unknown != 0 { return xpath_value_empty(XPATH_KIND_NUMBER,unknown); };
        return xpath_value_number(total);
    };
    if kind >= 10 && kind <= 12 {
        if first.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
        if first.state != 0 { return xpath_value_empty(XPATH_KIND_STRING,first.state); };
        if first.nodes.values.len() == 0 { return xpath_value_string(String::new()); };
        let name = xpath_reference_name(tree,first.nodes.values[0]);
        if kind == 10 { return xpath_value_string(name.qualified); };
        if kind == 11 { return xpath_value_string(name.local); };
        return xpath_value_string(name.namespace);
    };
    if kind == 4 { return xpath_value_to_string(first,tree,graph); };
    if kind == 5 || (kind >= 23 && kind <= 25) {
        let number = xpath_value_to_number(first,tree,graph,powers);
        if number.state != 0 || kind == 5 { return number; };
        let value = f64::from_bits(number.number as u64);
        if kind == 23 { return xpath_value_number(xpath_number_floor(value)); };
        if kind == 24 { return xpath_value_number(xpath_number_ceiling(value)); };
        return xpath_value_number(xpath_number_round(value));
    };
    if kind == 6 || kind == 7 {
        let value = xpath_value_to_boolean(&first);
        if value.state != 0 || kind == 6 { return value; };
        return xpath_value_boolean(value.boolean == false);
    };
    if kind == 26 { return xpath_function_language(first,context,tree,graph); };
    if kind == 27 { return xpath_value_empty(XPATH_KIND_NODES,3); };
    let a = xpath_value_to_string(first,tree,graph);
    if a.state != 0 { return a; };
    if kind == 19 { let characters: Vec<char> = a.text.as_str().chars().collect(); return xpath_value_number((characters.len() as i32) as f64); };
    if kind == 20 { return xpath_value_string(xpath_string_normalize(a.text.as_str())); };
    if kind == 18 {
        let b = xpath_value_to_number(second,tree,graph,powers);
        if b.state != 0 { return xpath_value_empty(XPATH_KIND_STRING,b.state); };
        let mut length = 0.0f64;
        if count == 3 {
            let c = xpath_value_to_number(third,tree,graph,powers);
            if c.state != 0 { return xpath_value_empty(XPATH_KIND_STRING,c.state); };
            length = f64::from_bits(c.number as u64);
        };
        let result = xpath_string_substring(a.text.as_str(),f64::from_bits(b.number as u64),length,count == 3);
        return xpath_value_string(result);
    };
    let b = xpath_value_to_string(second,tree,graph);
    if b.state != 0 { return b; };
    if kind == 13 {
        let mut output = a.text; output.push_str(b.text.as_str());
        if count >= 3 {
            let c = xpath_value_to_string(third,tree,graph); if c.state != 0 { return c; }; output.push_str(c.text.as_str());
        };
        let mut index: usize = 0;
        while index < rest.len() {
            let argument = rest[index].clone(); let text = xpath_value_to_string(argument,tree,graph);
            if text.state != 0 { return text; }; output.push_str(text.text.as_str()); index += 1;
        }
        return xpath_value_string(output);
    };
    if kind == 21 {
        let c = xpath_value_to_string(third,tree,graph); if c.state != 0 { return c; };
        return xpath_value_string(xpath_string_translate(a.text.as_str(),b.text.as_str(),c.text.as_str()));
    };
    let found = xpath_string_find(a.text.as_str(),b.text.as_str());
    if kind == 14 { return xpath_value_boolean(found == 0); };
    if kind == 15 { return xpath_value_boolean(found >= 0); };
    if found < 0 { return xpath_value_string(String::new()); };
    let position = usize::try_from(found).unwrap_or(0);
    if kind == 16 { return xpath_value_string(xpath_string_slice(a.text.as_str(),0,position)); };
    let source: Vec<char> = a.text.as_str().chars().collect(); let needle: Vec<char> = b.text.as_str().chars().collect();
    xpath_value_string(xpath_string_slice(a.text.as_str(),position+needle.len(),source.len()))
}
