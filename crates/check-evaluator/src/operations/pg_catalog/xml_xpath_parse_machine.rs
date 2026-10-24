const XPATH_PARSE_ENTER: i32 = 1;
const XPATH_PARSE_LEAVE: i32 = 2;
const XPATH_PARSE_LOOP: i32 = 3;
const XPATH_PARSE_PREFIX: i32 = 4;
const XPATH_PARSE_BINARY: i32 = 5;
const XPATH_PARSE_PATH: i32 = 6;
const XPATH_PARSE_UNARY: i32 = 7;
const XPATH_PARSE_GROUP: i32 = 8;
const XPATH_PARSE_PREDICATES: i32 = 9;
const XPATH_PARSE_PREDICATE: i32 = 10;
const XPATH_PARSE_STEP: i32 = 11;
const XPATH_PARSE_ARGUMENT: i32 = 12;
const XPATH_PARSE_COLLECT: i32 = 13;

#[derive(Clone, Copy)]
struct XPathParseTask {
    kind: i32, minimum: i32, operation: i32, left: usize,
    first: usize, last: usize, count: i32, prefix: XmlSpan, name: XmlSpan,
}

#[derive(Clone)]
struct XPathParseStack { values: Vec<XPathParseTask>, count: usize }

fn xpath_parse_task(kind: i32, minimum: i32, operation: i32, left: usize) -> XPathParseTask {
    let empty = XmlSpan { start: 0, end: 0 };
    XPathParseTask { kind, minimum, operation, left, first: 0, last: 0, count: 0, prefix: empty, name: empty }
}

fn xpath_parse_argument_task(prefix: XmlSpan, name: XmlSpan, first: usize, last: usize, count: i32) -> XPathParseTask {
    XPathParseTask { kind: XPATH_PARSE_ARGUMENT, minimum: 0, operation: 0, left: 0, first, last, count, prefix, name }
}

pub(crate) fn xpath_parse_stack_push(input: XPathParseStack, task: XPathParseTask) -> XPathParseStack {
    let mut values = input.values;
    if input.count < values.len() { values[input.count] = task; } else { values.push(task); };
    XPathParseStack { values, count: input.count+1 }
}

pub(crate) fn xpath_parse_stack_pop(input: XPathParseStack) -> XPathParseStack {
    XPathParseStack { values: input.values, count: input.count-1 }
}

pub(crate) fn xpath_parse_expression(input: XPathProgram, minimum: i32) -> XPathProgram {
    let initial_depth = input.budget.depth; let mut program = input;
    let values: Vec<XPathParseTask> = Vec::new(); let mut stack = XPathParseStack { values, count: 0 };
    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,minimum,1,0));
    let empty = XmlSpan { start: 0, end: 0 };
    while stack.count > 0 && program.valid {
        let task = stack.values[stack.count-1]; stack = xpath_parse_stack_pop(stack);
        if task.kind == XPATH_PARSE_ENTER {
            if task.minimum == 1 {
                program = xpath_compile_enter(program);
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_LEAVE,0,task.operation,0));
            };
            stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_LOOP,task.minimum,0,0));
            stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREFIX,task.minimum,0,0));
        } else if task.kind == XPATH_PARSE_LEAVE {
            program = xpath_compile_sort(program,task.operation);
            program = xpath_compile_leave(program);
        } else if task.kind == XPATH_PARSE_COLLECT { program = xpath_compile_emit(program,XPATH_PATH); }
        else if task.kind == XPATH_PARSE_LOOP {
            let position = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,position,"/") {
                let mut left = program.root; let mut width: usize = 1;
                if xpath_parse_at(&program,position,"//") { width = 2; };
                program = xpath_parse_cursor(program,position+width);
                if width == 2 {
                    program = xpath_compile_emit(program,XPATH_PATH);
                    program = xpath_parse_push(program,xpath_parse_node(XPATH_STEP,6,0,2,empty,empty));
                    let right = program.root;
                    program = xpath_parse_push(program,xpath_parse_node(XPATH_PATH,0,left,right,empty,empty)); left = program.root;
                };
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PATH,task.minimum,0,left));
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_STEP,0,0,0));
            } else {
                let operation = xpath_parse_operator(&program,position); let precedence = xpath_parse_precedence(operation);
                if operation != 0 && precedence >= task.minimum {
                    let left = program.root; let width = xpath_parse_operator_width(operation);
                    if operation == 14 { program = xpath_compile_emit(program,XPATH_CONTEXT); };
                    program = xpath_parse_cursor(program,position+width);
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_BINARY,task.minimum,operation,left));
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,precedence+1,0,0));
                };
            };
        } else if task.kind == XPATH_PARSE_BINARY || task.kind == XPATH_PARSE_PATH {
            let mut kind = XPATH_BINARY; if task.kind == XPATH_PARSE_PATH { kind = XPATH_PATH; };
            let right = program.root;
            if kind == XPATH_BINARY { program = xpath_compile_emit(program,XPATH_BINARY); };
            program = xpath_parse_push(program,xpath_parse_node(kind,task.operation,task.left,right,empty,empty));
            if task.minimum > 0 { stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_LOOP,task.minimum,0,0)); };
        } else if task.kind == XPATH_PARSE_PREFIX {
            let position = xpath_parse_space(&program,program.cursor); program = xpath_parse_cursor(program,position);
            if position >= program.source.len() { program = xpath_parse_fail(program); }
            else {
                let character = program.source[position];
                if character == '-' {
                    if task.minimum > 7 { program = xpath_parse_fail(program); }
                    else {
                        let mut cursor = position; let mut negative: i32 = 0;
                        while xpath_parse_at(&program,cursor,"-") { negative = 1-negative; cursor = xpath_parse_space(&program,cursor+1); }
                        program = xpath_parse_cursor(program,cursor);
                        stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_UNARY,0,negative,0));
                        stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,7,0,0));
                    };
                } else if xml_query_uri_digit(character) || (character == '.' && position+1 < program.source.len() && xml_query_uri_digit(program.source[position+1])) {
                    program = xpath_parse_number(program); if program.valid { program = xpath_compile_emit(program,XPATH_NUMBER); };
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
                } else if character == '\'' || character == '"' {
                    program = xpath_parse_literal(program); if program.valid { program = xpath_compile_emit(program,XPATH_STRING); };
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
                } else if character == '$' {
                    let name = xpath_parse_qname(&program,position+1,false,false);
                    if name.valid == false { program = xpath_parse_fail(program); }
                    else {
                        program = xpath_parse_cursor(program,name.next);
                        program = xpath_compile_emit(program,XPATH_VARIABLE);
                        program = xpath_parse_push(program,xpath_parse_node(XPATH_VARIABLE,0,0,0,name.prefix,name.local));
                        stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
                    };
                } else if character == '(' {
                    program = xpath_parse_cursor(program,position+1);
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_GROUP,0,0,0));
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,1,1,0));
                } else if character == '/' {
                    let mut width: usize = 1; if xpath_parse_at(&program,position,"//") { width = 2; };
                    program = xpath_parse_cursor(program,position+width);
                    program = xpath_compile_emit(program,XPATH_ROOT);
                    program = xpath_parse_push(program,xpath_parse_node(XPATH_ROOT,0,0,0,empty,empty));
                    if width == 2 {
                        program = xpath_compile_emit(program,XPATH_PATH);
                        let left = program.root;
                        program = xpath_parse_push(program,xpath_parse_node(XPATH_STEP,6,0,2,empty,empty));
                        let right = program.root;
                        program = xpath_parse_push(program,xpath_parse_node(XPATH_PATH,0,left,right,empty,empty));
                    };
                    let next = xpath_parse_space(&program,program.cursor);
                    if width == 2 || xpath_parse_step_start(&program,next) {
                        stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PATH,0,0,program.root));
                        stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_STEP,0,0,0));
                    };
                } else {
                    let name = xpath_parse_qname(&program,position,false,false); let mut callable = false;
                    if name.valid {
                        let after = xpath_parse_space(&program,name.next);
                        if xpath_parse_at(&program,after,"(") {
                            let text = xpath_parse_text(&program,name.local);
                            if name.prefix.start != name.prefix.end || xpath_parse_node_type(text.as_str()) == 0 {
                                callable = true; let argument = xpath_parse_space(&program,after+1);
                                program = xpath_parse_cursor(program,argument);
                                if xpath_parse_at(&program,argument,")") || argument == program.source.len() {
                                    if argument < program.source.len() { program = xpath_parse_cursor(program,argument+1); };
                                    program = xpath_compile_emit(program,XPATH_FUNCTION);
                                    program = xpath_parse_push(program,xpath_parse_node(XPATH_FUNCTION,0,0,0,name.prefix,name.local));
                                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
                                } else {
                                    stack = xpath_parse_stack_push(stack,xpath_parse_argument_task(name.prefix,name.local,0,0,0));
                                    let mut sort: i32 = 1; if text.as_str() == "count" && name.prefix.start == name.prefix.end { sort = 0; };
                                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,1,sort,0));
                                };
                            };
                        };
                    };
                    if callable == false {
                        if xpath_parse_step_start(&program,position) {
                            program = xpath_compile_emit(program,XPATH_CONTEXT);
                            stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_STEP,0,0,0));
                        } else { program = xpath_parse_fail(program); };
                    };
                };
            };
        } else if task.kind == XPATH_PARSE_UNARY {
            let root = program.root;
            program = xpath_compile_emit(program,XPATH_NEGATE);
            program = xpath_parse_push(program,xpath_parse_node(XPATH_NEGATE,task.operation,root,0,empty,empty));
        } else if task.kind == XPATH_PARSE_GROUP {
            let close = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,close,")") == false { program = xpath_parse_fail(program); }
            else {
                let value = program.root; program = xpath_parse_cursor(program,close+1);
                program = xpath_parse_push(program,xpath_parse_node(XPATH_GROUP,0,value,0,empty,empty));
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
            };
        } else if task.kind == XPATH_PARSE_PREDICATES {
            let position = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,position,"[") {
                let left = program.root; program = xpath_parse_cursor(program,position+1);
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATE,0,task.operation,left));
                let mut sort: i32 = 0; if task.operation == XPATH_FILTER { sort = 1; };
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,1,sort,0));
            };
        } else if task.kind == XPATH_PARSE_PREDICATE {
            let right = program.root; let close = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,close,"]") == false { program = xpath_parse_fail(program); }
            else {
                program = xpath_compile_emit(program,task.operation);
                program = xpath_parse_cursor(program,close+1);
                program = xpath_parse_push(program,xpath_parse_node(task.operation,0,task.left,right,empty,empty));
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,task.operation,0));
            };
        } else if task.kind == XPATH_PARSE_STEP {
            let position = xpath_parse_space(&program,program.cursor); let abbreviated = xpath_parse_at(&program,position,".");
            program = xpath_parse_step_leaf(program);
            if program.valid && abbreviated == false {
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_COLLECT,0,0,0));
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_PREDICATE,0));
            } else if program.valid && program.nodes[program.root].operation == 4 { program = xpath_compile_emit(program,XPATH_PATH); };
        } else if task.kind == XPATH_PARSE_ARGUMENT {
            let argument = program.root;
            program = xpath_compile_emit(program,XPATH_ARGUMENT);
            program = xpath_parse_push(program,xpath_parse_node(XPATH_ARGUMENT,0,argument,0,empty,empty));
            let next = program.root; let mut first = task.first;
            if first == 0 { first = next; } else { program = xpath_parse_link(program,task.last,next); };
            let count = task.count+1; let position = xpath_parse_space(&program,program.cursor);
            if xpath_parse_at(&program,position,",") {
                program = xpath_parse_cursor(program,position+1);
                let argument_start = xpath_parse_space(&program,program.cursor); program = xpath_parse_cursor(program,argument_start);
                if argument_start == program.source.len() {
                    program = xpath_compile_emit(program,XPATH_FUNCTION);
                    program = xpath_parse_push(program,xpath_parse_node(XPATH_FUNCTION,count,first,0,task.prefix,task.name));
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
                } else {
                    stack = xpath_parse_stack_push(stack,xpath_parse_argument_task(task.prefix,task.name,first,next,count));
                    let name = xpath_parse_text(&program,task.name); let mut sort: i32 = 1;
                    if name.as_str() == "count" && task.prefix.start == task.prefix.end { sort = 0; };
                    stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_ENTER,1,sort,0));
                };
            } else if xpath_parse_at(&program,position,")") {
                program = xpath_compile_emit(program,XPATH_FUNCTION);
                program = xpath_parse_cursor(program,position+1);
                program = xpath_parse_push(program,xpath_parse_node(XPATH_FUNCTION,count,first,0,task.prefix,task.name));
                stack = xpath_parse_stack_push(stack,xpath_parse_task(XPATH_PARSE_PREDICATES,0,XPATH_FILTER,0));
            } else { program = xpath_parse_fail(program); };
        };
    }
    while stack.count > 0 && program.budget.fault <= 0 && program.budget.fault != -15 {
        let pending = stack.values[stack.count-1]; stack = xpath_parse_stack_pop(stack);
        if pending.kind == XPATH_PARSE_COLLECT || (pending.kind == XPATH_PARSE_BINARY && pending.operation == 14) { program = xpath_compile_emit(program,XPATH_PATH); };
    }
    let fault = program.budget.fault;
    xpath_parse_budget(program,initial_depth,fault)
}
