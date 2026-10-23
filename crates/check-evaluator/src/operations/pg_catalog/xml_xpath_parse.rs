fn xpath_parse_operator(program: &XPathProgram, position: usize) -> i32 {
    if xpath_parse_at(program,position,"or") { return 1; };
    if xpath_parse_at(program,position,"and") { return 2; };
    if xpath_parse_at(program,position,"!=") { return 4; };
    if xpath_parse_at(program,position,"<=") { return 6; };
    if xpath_parse_at(program,position,">=") { return 8; };
    if xpath_parse_at(program,position,"=") { return 3; };
    if xpath_parse_at(program,position,"<") { return 5; };
    if xpath_parse_at(program,position,">") { return 7; };
    if xpath_parse_at(program,position,"+") { return 9; };
    if xpath_parse_at(program,position,"-") { return 10; };
    if xpath_parse_at(program,position,"*") { return 11; };
    if xpath_parse_at(program,position,"div") { return 12; };
    if xpath_parse_at(program,position,"mod") { return 13; };
    if xpath_parse_at(program,position,"|") { return 14; };
    0
}

fn xpath_parse_precedence(operation: i32) -> i32 {
    if operation == 1 { return 1; };
    if operation == 2 { return 2; };
    if operation <= 4 { return 3; };
    if operation <= 8 { return 4; };
    if operation <= 10 { return 5; };
    if operation <= 13 { return 6; };
    8
}

fn xpath_parse_operator_width(operation: i32) -> usize {
    if operation == 2 || operation == 12 || operation == 13 { return 3; };
    if operation == 1 || operation == 4 || operation == 6 || operation == 8 { return 2; };
    1
}

fn xpath_compile_with_limit(input: &str, limit: i32) -> XPathProgram {
    let source: Vec<char> = input.chars().collect();
    let empty = XmlSpan { start: 0, end: 0 };
    let mut nodes: Vec<XPathExpression> = Vec::new();
    nodes.push(xpath_parse_node(0,0,0,0,empty,empty));
    let budget = XPathCompileBudget { depth: 0, limit, fault: 0 };
    let program = XPathProgram { source, nodes, cursor: 0, root: 0, valid: true, budget };
    let parsed = xpath_parse_expression(program,1);
    if parsed.valid == false { return parsed; };
    let end = xpath_parse_space(&parsed,parsed.cursor);
    if end != parsed.source.len() { return xpath_parse_fail(parsed); };
    let root = parsed.root;
    xpath_optimize(parsed,root)
}


fn xpath_compile(input: &str) -> XPathProgram { xpath_compile_with_limit(input,0) }
