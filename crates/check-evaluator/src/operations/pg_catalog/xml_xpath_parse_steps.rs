fn xpath_parse_node_type(name: &str) -> usize {
    if name == "node" { return 2; };
    if name == "text" { return 3; };
    if name == "comment" { return 4; };
    if name == "processing-instruction" { return 5; };
    0
}

pub(crate) fn xpath_parse_predicates(input: XPathProgram, kind: i32) -> XPathProgram {
    let mut program = input;
    let empty = XmlSpan { start: 0, end: 0 };
    let mut scanning = true;
    while program.valid && scanning {
        let position = xpath_parse_space(&program,program.cursor);
        if xpath_parse_at(&program,position,"[") {
            let left = program.root;
            program = xpath_parse_cursor(program,position+1);
            program = xpath_parse_expression(program,1);
            if program.valid == false { return program; };
            let right = program.root;
            let close = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,close,"]") == false { return xpath_parse_fail(program); };
            program = xpath_parse_cursor(program,close+1);
            let node = xpath_parse_node(kind,0,left,right,empty,empty);
            program = xpath_parse_push(program,node);
        } else { scanning = false; };
    }
    program
}

pub(crate) fn xpath_parse_literal(input: XPathProgram) -> XPathProgram {
    let begin = input.cursor;
    let quote = input.source[begin];
    let mut position = begin+1;
    while position < input.source.len() && input.source[position] != quote {
        if xml_character(input.source[position]) == false { return xpath_parse_fail(input); };
        position += 1;
    }
    if position >= input.source.len() { return xpath_parse_fail(input); };
    let span = XmlSpan { start: begin+1, end: position };
    let empty = XmlSpan { start: 0, end: 0 };
    let program = xpath_parse_cursor(input,position+1);
    let node = xpath_parse_node(XPATH_STRING,0,0,0,empty,span);
    xpath_parse_push(program,node)
}

pub(crate) fn xpath_parse_number(input: XPathProgram) -> XPathProgram {
    let begin = input.cursor;
    let mut position = begin;
    while position < input.source.len() && xml_query_uri_digit(input.source[position]) { position += 1; }
    if xpath_parse_at(&input,position,".") {
        position += 1;
        while position < input.source.len() && xml_query_uri_digit(input.source[position]) { position += 1; }
    };
    let mut end = position;
    if xpath_parse_at(&input,position,"e") || xpath_parse_at(&input,position,"E") {
        position += 1;
        if xpath_parse_at(&input,position,"+") || xpath_parse_at(&input,position,"-") { position += 1; };
        let exponent = position;
        while position < input.source.len() && xml_query_uri_digit(input.source[position]) { position += 1; }
        if position > exponent { end = position; };
    };
    let span = XmlSpan { start: begin, end };
    let empty = XmlSpan { start: 0, end: 0 };
    let program = xpath_parse_cursor(input,position);
    let node = xpath_parse_node(XPATH_NUMBER,0,0,0,empty,span);
    xpath_parse_push(program,node)
}

fn xpath_parse_step_start(program: &XPathProgram, position: usize) -> bool {
    if position >= program.source.len() { return false; };
    let character = program.source[position];
    character == '.' || character == '@' || character == '*' || xpath_name_start(character)
}

pub(crate) fn xpath_parse_step(input: XPathProgram) -> XPathProgram {
    let mut program = input;
    let empty = XmlSpan { start: 0, end: 0 };
    let mut position = xpath_parse_space(&program,program.cursor);
    if xpath_parse_at(&program,position,".") {
        let mut axis: i32 = 3;
        let mut width: usize = 1;
        if xpath_parse_at(&program,position,"..") { axis = 4; width = 2; };
        program = xpath_parse_cursor(program,position+width);
        let node = xpath_parse_node(XPATH_STEP,axis,0,2,empty,empty);
        return xpath_parse_push(program,node);
    };
    let mut axis: i32 = 1;
    let mut gap = true;
    if xpath_parse_at(&program,position,"@") {
        axis = 2; position = xpath_parse_space(&program,position+1); gap = false;
    } else {
        let first = xpath_parse_ncname(&program,position);
        if first.valid {
            let after = xpath_parse_space(&program,first.next);
            if xpath_parse_at(&program,after,"::") {
                let span = XmlSpan { start: position, end: first.next };
                let text = xpath_parse_text(&program,span);
                axis = xpath_parse_axis(text.as_str());
                if axis == 0 { return xpath_parse_fail(program); };
                position = xpath_parse_space(&program,after+2); gap = false;
            };
        };
    };
    let scanned = xpath_parse_qname(&program,position,true,gap);
    if scanned.valid == false { return xpath_parse_fail(program); };
    let mut test: usize = 1;
    let mut name = scanned.local;
    position = xpath_parse_space(&program,scanned.next);
    if xpath_parse_at(&program,position,"(") {
        if scanned.prefix.end != scanned.prefix.start || scanned.wildcard { return xpath_parse_fail(program); };
        let spelling = xpath_parse_text(&program,name);
        test = xpath_parse_node_type(spelling.as_str());
        if test == 0 { return xpath_parse_fail(program); };
        position = xpath_parse_space(&program,position+1);
        if test == 5 && (xpath_parse_at(&program,position,"'") || xpath_parse_at(&program,position,"\"")) {
            program = xpath_parse_cursor(program,position);
            program = xpath_parse_literal(program);
            if program.valid == false { return program; };
            name = program.nodes[program.root].name;
            position = xpath_parse_space(&program,program.cursor); test = 6;
        };
        if xpath_parse_at(&program,position,")") == false { return xpath_parse_fail(program); };
        position += 1;
    };
    program = xpath_parse_cursor(program,position);
    let node = xpath_parse_node(XPATH_STEP,axis,0,test,scanned.prefix,name);
    program = xpath_parse_push(program,node);
    xpath_parse_predicates(program,XPATH_PREDICATE)
}

pub(crate) fn xpath_parse_function(input: XPathProgram, scanned: XPathNameScan) -> XPathProgram {
    let mut program = input;
    let empty = XmlSpan { start: 0, end: 0 };
    let open = xpath_parse_space(&program,scanned.next);
    let mut position = xpath_parse_space(&program,open+1);
    let mut first: usize = 0;
    let mut last: usize = 0;
    let mut count: i32 = 0;
    program = xpath_parse_cursor(program,position);
    if xpath_parse_at(&program,position,")") == false {
        let mut scanning = true;
        while program.valid && scanning {
            program = xpath_parse_expression(program,1);
            if program.valid == false { return program; };
            let argument = program.root;
            let link = xpath_parse_node(XPATH_ARGUMENT,0,argument,0,empty,empty);
            program = xpath_parse_push(program,link);
            let next = program.root;
            if first == 0 { first = next; } else { program = xpath_parse_link(program,last,next); };
            last = next; count = count + 1;
            position = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,position,",") {
                program = xpath_parse_cursor(program,position+1);
            } else { scanning = false; };
        }
    };
    position = xpath_parse_space(&program,program.cursor);
    if xpath_parse_at(&program,position,")") == false { return xpath_parse_fail(program); };
    program = xpath_parse_cursor(program,position+1);
    let node = xpath_parse_node(XPATH_FUNCTION,count,first,0,scanned.prefix,scanned.local);
    program = xpath_parse_push(program,node);
    xpath_parse_predicates(program,XPATH_FILTER)
}
