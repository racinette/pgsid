const XPATH_COMPILE_STEP_LIMIT: i32 = 1000000;
const XPATH_MIN_RECURSION_LIMIT: i32 = 500;
const XPATH_NUMBER: i32 = 1;
const XPATH_STRING: i32 = 2;
const XPATH_VARIABLE: i32 = 3;
const XPATH_FUNCTION: i32 = 4;
const XPATH_ROOT: i32 = 5;
const XPATH_STEP: i32 = 6;
const XPATH_PREDICATE: i32 = 7;
const XPATH_PATH: i32 = 8;
const XPATH_BINARY: i32 = 9;
const XPATH_NEGATE: i32 = 10;
const XPATH_FILTER: i32 = 11;
const XPATH_ARGUMENT: i32 = 12;
const XPATH_GROUP: i32 = 13;
const XPATH_CONTEXT: i32 = 14;

#[derive(Clone, Copy)]
struct XPathExpression { kind: i32, operation: i32, left: usize, right: usize, prefix: XmlSpan, name: XmlSpan }

#[derive(Clone, Copy)]
struct XPathCompileBudget { depth: i32, limit: i32, fault: i32, steps: i32, last: i32 }

#[derive(Clone)]
struct XPathProgram { source: Vec<char>, nodes: Vec<XPathExpression>, cursor: usize, root: usize, valid: bool, budget: XPathCompileBudget, runtime: XPathRuntimePlan }

#[derive(Clone, Copy)]
struct XPathNameScan { prefix: XmlSpan, local: XmlSpan, next: usize, valid: bool, wildcard: bool }

fn xpath_parse_node(kind: i32, operation: i32, left: usize, right: usize, prefix: XmlSpan, name: XmlSpan) -> XPathExpression {
    XPathExpression { kind, operation, left, right, prefix, name }
}

pub(crate) fn xpath_parse_push(input: XPathProgram, node: XPathExpression) -> XPathProgram {
    let mut nodes = input.nodes;
    let root = nodes.len(); nodes.push(node);
    XPathProgram { source: input.source, nodes, cursor: input.cursor, root, valid: input.valid, budget: input.budget, runtime: input.runtime }
}

pub(crate) fn xpath_parse_cursor(input: XPathProgram, cursor: usize) -> XPathProgram {
    XPathProgram { source: input.source, nodes: input.nodes, cursor, root: input.root, valid: input.valid, budget: input.budget, runtime: input.runtime }
}

pub(crate) fn xpath_parse_fail(input: XPathProgram) -> XPathProgram {
    XPathProgram { source: input.source, nodes: input.nodes, cursor: input.cursor, root: input.root, valid: false, budget: input.budget, runtime: input.runtime }
}

pub(crate) fn xpath_parse_link(input: XPathProgram, tail: usize, next: usize) -> XPathProgram {
    let mut nodes = input.nodes; let old = nodes[tail];
    nodes[tail] = XPathExpression { kind: old.kind, operation: old.operation, left: old.left, right: next, prefix: old.prefix, name: old.name };
    XPathProgram { source: input.source, nodes, cursor: input.cursor, root: input.root, valid: input.valid, budget: input.budget, runtime: input.runtime }
}

fn xpath_parse_at(program: &XPathProgram, position: usize, text: &str) -> bool {
    let expected: Vec<char> = text.chars().collect();
    if position + expected.len() > program.source.len() { return false; };
    let mut index: usize = 0;
    while index < expected.len() {
        if program.source[position+index] != expected[index] { return false; };
        index += 1;
    }
    true
}

fn xpath_parse_space(program: &XPathProgram, start: usize) -> usize {
    let mut position = start;
    while position < program.source.len() && xml_space(program.source[position]) { position += 1; }
    position
}

fn xpath_parse_text(program: &XPathProgram, span: XmlSpan) -> String {
    let mut output = String::new(); let mut position = span.start;
    while position < span.end { output.push(program.source[position]); position += 1; }
    output
}

fn xpath_parse_ncname(program: &XPathProgram, start: usize) -> XmlScan {
    let mut position = start;
    if position >= program.source.len() || xpath_name_start(program.source[position]) == false {
        return XmlScan { next: start, valid: false };
    };
    position += 1;
    while position < program.source.len() && xpath_name_character(program.source[position]) { position += 1; }
    XmlScan { next: position, valid: true }
}

fn xpath_parse_qname(program: &XPathProgram, start: usize, wildcard: bool, gap: bool) -> XPathNameScan {
    let empty = XmlSpan { start: 0, end: 0 };
    if wildcard && xpath_parse_at(program,start,"*") {
        let local = XmlSpan { start, end: start+1 };
        return XPathNameScan { prefix: empty, local, next: start+1, valid: true, wildcard: true };
    };
    let first = xpath_parse_ncname(program,start);
    let span = XmlSpan { start, end: first.next };
    if first.valid == false { return XPathNameScan { prefix: empty, local: span, next: start, valid: false, wildcard: false }; };
    let mut colon = first.next;
    if gap { colon = xpath_parse_space(program,first.next); };
    if xpath_parse_at(program,colon,":") && xpath_parse_at(program,colon,"::") == false {
        let position = colon+1;
        if wildcard && xpath_parse_at(program,position,"*") {
            let local = XmlSpan { start: position, end: position+1 };
            return XPathNameScan { prefix: span, local, next: position+1, valid: true, wildcard: true };
        };
        let second = xpath_parse_ncname(program,position);
        let local = XmlSpan { start: position, end: second.next };
        return XPathNameScan { prefix: span, local, next: second.next, valid: second.valid, wildcard: false };
    };
    XPathNameScan { prefix: empty, local: span, next: first.next, valid: true, wildcard: false }
}

fn xpath_parse_axis(name: &str) -> i32 {
    if name == "child" { return 1; };
    if name == "attribute" { return 2; };
    if name == "self" { return 3; };
    if name == "parent" { return 4; };
    if name == "descendant" { return 5; };
    if name == "descendant-or-self" { return 6; };
    if name == "ancestor" { return 7; };
    if name == "ancestor-or-self" { return 8; };
    if name == "following-sibling" { return 9; };
    if name == "preceding-sibling" { return 10; };
    if name == "following" { return 11; };
    if name == "preceding" { return 12; };
    if name == "namespace" { return 13; };
    0
}


pub(crate) fn xpath_parse_budget(input: XPathProgram, depth: i32, fault: i32) -> XPathProgram {
    let budget = XPathCompileBudget { depth, limit: input.budget.limit, fault, steps: input.budget.steps, last: input.budget.last };
    XPathProgram { source: input.source, nodes: input.nodes, cursor: input.cursor, root: input.root, valid: input.valid && fault == 0, budget, runtime: input.runtime }
}

pub(crate) fn xpath_compile_enter(input: XPathProgram) -> XPathProgram {
    let budget = input.budget; let mut maximum = budget.limit;
    if maximum <= 0 { maximum = XPATH_MIN_RECURSION_LIMIT; };
    if budget.depth >= maximum {
        let mut fault: i32 = -26; if budget.limit <= 0 { fault = 4; };
        return xpath_parse_budget(input,budget.depth,fault);
    };
    xpath_parse_budget(input,budget.depth+10,budget.fault)
}

pub(crate) fn xpath_compile_leave(input: XPathProgram) -> XPathProgram {
    let budget = input.budget;
    xpath_parse_budget(input,budget.depth-10,budget.fault)
}

pub(crate) fn xpath_compile_emit(input: XPathProgram, kind: i32) -> XPathProgram {
    let prior = input.budget;
    if prior.steps >= XPATH_COMPILE_STEP_LIMIT { return xpath_parse_budget(input,prior.depth,-15); };
    let budget = XPathCompileBudget { depth: prior.depth, limit: prior.limit, fault: prior.fault, steps: prior.steps+1, last: kind };
    XPathProgram { source: input.source, nodes: input.nodes, cursor: input.cursor, root: input.root, valid: input.valid, budget, runtime: input.runtime }
}

pub(crate) fn xpath_compile_sort(input: XPathProgram, sort: i32) -> XPathProgram {
    if sort > 0 && input.budget.last != XPATH_NUMBER && input.budget.last != XPATH_STRING { return xpath_compile_emit(input,XPATH_GROUP); };
    input
}
