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

pub(crate) fn xpath_parse_prefix(input: XPathProgram, minimum: i32) -> XPathProgram {
    let mut program = input;
    let position = xpath_parse_space(&program,program.cursor);
    program = xpath_parse_cursor(program,position);
    if position >= program.source.len() { return xpath_parse_fail(program); };
    let empty = XmlSpan { start: 0, end: 0 };
    let character = program.source[position];
    if character == '-' {
        if minimum > 7 { return xpath_parse_fail(program); };
        program = xpath_parse_cursor(program,position+1);
        program = xpath_parse_expression(program,7);
        if program.valid == false { return program; };
        let node = xpath_parse_node(XPATH_NEGATE,0,program.root,0,empty,empty);
        return xpath_parse_push(program,node);
    };
    if xml_query_uri_digit(character) || (character == '.' && position+1 < program.source.len() && xml_query_uri_digit(program.source[position+1])) {
        program = xpath_parse_number(program);
        return xpath_parse_predicates(program,XPATH_FILTER);
    };
    if character == '\'' || character == '"' {
        program = xpath_parse_literal(program);
        return xpath_parse_predicates(program,XPATH_FILTER);
    };
    if character == '$' {
        let name = xpath_parse_qname(&program,position+1,false,false);
        if name.valid == false { return xpath_parse_fail(program); };
        program = xpath_parse_cursor(program,name.next);
        let node = xpath_parse_node(XPATH_VARIABLE,0,0,0,name.prefix,name.local);
        program = xpath_parse_push(program,node);
        return xpath_parse_predicates(program,XPATH_FILTER);
    };
    if character == '(' {
        program = xpath_parse_cursor(program,position+1);
        program = xpath_parse_expression(program,1);
        if program.valid == false { return program; };
        let close = xpath_parse_space(&program,program.cursor);
        if xpath_parse_at(&program,close,")") == false { return xpath_parse_fail(program); };
        let value = program.root;
        program = xpath_parse_cursor(program,close+1);
        let node = xpath_parse_node(XPATH_GROUP,0,value,0,empty,empty);
        program = xpath_parse_push(program,node);
        return xpath_parse_predicates(program,XPATH_FILTER);
    };
    if character == '/' {
        let mut width: usize = 1;
        if xpath_parse_at(&program,position,"//") { width = 2; };
        program = xpath_parse_cursor(program,position+width);
        let root = xpath_parse_node(XPATH_ROOT,0,0,0,empty,empty);
        program = xpath_parse_push(program,root);
        if width == 2 {
            let left = program.root;
            let step = xpath_parse_node(XPATH_STEP,6,0,2,empty,empty);
            program = xpath_parse_push(program,step);
            let path = xpath_parse_node(XPATH_PATH,0,left,program.root,empty,empty);
            program = xpath_parse_push(program,path);
        };
        let next = xpath_parse_space(&program,program.cursor);
        if width == 2 || xpath_parse_step_start(&program,next) {
            let left = program.root;
            program = xpath_parse_step(program);
            if program.valid == false { return program; };
            let path = xpath_parse_node(XPATH_PATH,0,left,program.root,empty,empty);
            program = xpath_parse_push(program,path);
        };
        return program;
    };
    let name = xpath_parse_qname(&program,position,false,false);
    if name.valid {
        let after = xpath_parse_space(&program,name.next);
        if xpath_parse_at(&program,after,"(") {
            let text = xpath_parse_text(&program,name.local);
            if name.prefix.start != name.prefix.end || xpath_parse_node_type(text.as_str()) == 0 {
                return xpath_parse_function(program,name);
            };
        };
    };
    xpath_parse_step(program)
}

pub(crate) fn xpath_parse_expression(input: XPathProgram, minimum: i32) -> XPathProgram {
    let mut program = xpath_parse_prefix(input,minimum);
    let empty = XmlSpan { start: 0, end: 0 };
    let mut scanning = true;
    while program.valid && scanning {
        let position = xpath_parse_space(&program,program.cursor);
        if xpath_parse_at(&program,position,"/") {
            let mut left = program.root;
            let mut width: usize = 1;
            if xpath_parse_at(&program,position,"//") { width = 2; };
            program = xpath_parse_cursor(program,position+width);
            if width == 2 {
                let step = xpath_parse_node(XPATH_STEP,6,0,2,empty,empty);
                program = xpath_parse_push(program,step);
                let path = xpath_parse_node(XPATH_PATH,0,left,program.root,empty,empty);
                program = xpath_parse_push(program,path);
                left = program.root;
            };
            program = xpath_parse_step(program);
            if program.valid == false { return program; };
            let path = xpath_parse_node(XPATH_PATH,0,left,program.root,empty,empty);
            program = xpath_parse_push(program,path);
        } else {
            let operation = xpath_parse_operator(&program,position);
            let precedence = xpath_parse_precedence(operation);
            if operation == 0 || precedence < minimum { scanning = false; }
            else {
                let left = program.root;
                let width = xpath_parse_operator_width(operation);
                program = xpath_parse_cursor(program,position+width);
                program = xpath_parse_expression(program,precedence+1);
                if program.valid == false { return program; };
                let node = xpath_parse_node(XPATH_BINARY,operation,left,program.root,empty,empty);
                program = xpath_parse_push(program,node);
            };
        };
    }
    program
}

fn xpath_compile(input: &str) -> XPathProgram {
    let source: Vec<char> = input.chars().collect();
    let empty = XmlSpan { start: 0, end: 0 };
    let mut nodes: Vec<XPathExpression> = Vec::new();
    nodes.push(xpath_parse_node(0,0,0,0,empty,empty));
    let program = XPathProgram { source, nodes, cursor: 0, root: 0, valid: true };
    let parsed = xpath_parse_expression(program,1);
    let end = xpath_parse_space(&parsed,parsed.cursor);
    if end != parsed.source.len() { return xpath_parse_fail(parsed); };
    let root = parsed.root;
    xpath_optimize(parsed,root)
}
