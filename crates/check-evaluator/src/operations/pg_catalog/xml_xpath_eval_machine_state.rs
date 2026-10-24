const XPATH_VALUE_STACK_LIMIT: i32 = 1000000;
const XPATH_EVAL_EXPRESSION: i32 = 1;
const XPATH_EVAL_GROUP: i32 = 2;
const XPATH_EVAL_NEGATE: i32 = 3;
const XPATH_EVAL_LEFT: i32 = 4;
const XPATH_EVAL_RIGHT: i32 = 5;
const XPATH_EVAL_BOOLEAN: i32 = 6;
const XPATH_EVAL_PATH: i32 = 7;
const XPATH_EVAL_FILTER: i32 = 8;
const XPATH_EVAL_ARGUMENT: i32 = 9;
const XPATH_EVAL_FILTER_START: i32 = 10;
const XPATH_EVAL_FILTER_NEXT: i32 = 11;
const XPATH_EVAL_FILTER_RESULT: i32 = 12;
const XPATH_EVAL_COLLECT_START: i32 = 13;
const XPATH_EVAL_COLLECT_NEXT: i32 = 14;
const XPATH_EVAL_COLLECT_PREDICATE: i32 = 15;

#[derive(Clone, Copy)]
struct XPathEvalHeader {
    kind: i32, root: usize, context: XPathContext, mode: i32, bound: XPathReference, depth: i32, cells: i32,
    index: usize, cursor: usize, step: usize, minimum: i32, maximum: i32, matched: i32, visited: i32, position_range: XPathPosition,
}

#[derive(Clone)]
struct XPathEvalTask { header: XPathEvalHeader, input: XPathValue, output: XPathValue, parameters: XPathArguments, predicates: Vec<usize> }

#[derive(Clone)]
struct XPathEvalStack { values: Vec<XPathEvalTask>, count: usize }

fn xpath_eval_header(kind: i32, root: usize, context: XPathContext, mode: i32, bound: XPathReference) -> XPathEvalHeader {
    let position_range = XPathPosition { valid: false, value: 0 };
    XPathEvalHeader { kind, root, context, mode, bound, depth: 0, cells: 0, index: 0, cursor: 0, step: 0, minimum: 0, maximum: 0, matched: 0, visited: 0, position_range }
}

fn xpath_eval_state(input: XPathEvalHeader, kind: i32, index: usize, cursor: usize, step: usize, minimum: i32, maximum: i32, matched: i32, visited: i32, position_range: XPathPosition) -> XPathEvalHeader {
    XPathEvalHeader { kind, root: input.root, context: input.context, mode: input.mode, bound: input.bound, depth: input.depth, cells: input.cells, index, cursor, step, minimum, maximum, matched, visited, position_range }
}

pub(crate) fn xpath_eval_task(header: XPathEvalHeader, input: XPathValue, output: XPathValue, parameters: XPathArguments, predicates: Vec<usize>) -> XPathEvalTask {
    XPathEvalTask { header, input, output, parameters, predicates }
}

fn xpath_eval_start(kind: i32, root: usize, context: XPathContext, mode: i32, bound: XPathReference) -> XPathEvalTask {
    let header = xpath_eval_header(kind,root,context,mode,bound);
    let input = xpath_value_empty(0,0); let output = xpath_value_empty(0,0);
    let parameters = xpath_arguments_empty(); let predicates: Vec<usize> = Vec::new();
    xpath_eval_task(header,input,output,parameters,predicates)
}

pub(crate) fn xpath_eval_input_task(kind: i32, root: usize, context: XPathContext, mode: i32, bound: XPathReference, input: XPathValue) -> XPathEvalTask {
    let header = xpath_eval_header(kind,root,context,mode,bound);
    let output = xpath_value_empty(0,0); let parameters = xpath_arguments_empty(); let predicates: Vec<usize> = Vec::new();
    xpath_eval_task(header,input,output,parameters,predicates)
}

pub(crate) fn xpath_eval_stack_push(input: XPathEvalStack, task: XPathEvalTask) -> XPathEvalStack {
    let mut values = input.values;
    if input.count < values.len() { values[input.count] = task; } else { values.push(task); };
    XPathEvalStack { values, count: input.count+1 }
}

pub(crate) fn xpath_eval_stack_pop(input: XPathEvalStack) -> XPathEvalStack {
    let mut values = input.values; let count = input.count-1;
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    let context = XPathContext { node: absent, position: -1, size: -1 };
    values[count] = xpath_eval_start(0,0,context,0,absent);
    XPathEvalStack { values, count }
}

pub(crate) fn xpath_eval_function_finish(program: &XPathProgram, root: usize, parameters: XPathArguments, context: XPathContext, tree: &XmlTree, graph: &XPathGraph, namespaces: &XPathNamespaces, powers: &XPathPowers) -> XPathValue {
    let node = program.runtime.nodes[root]; let name = xpath_parse_text(program,node.name);
    if node.prefix.start != node.prefix.end {
        let prefix = xpath_parse_text(program,node.prefix);
        if xpath_namespace_defined(namespaces,prefix.as_str()) == false { return xpath_value_fault(19); };
        return xpath_value_fault(9);
    };
    let spec = xpath_function_spec(name.as_str()); if spec.kind == 0 { return xpath_value_fault(9); };
    if node.operation < spec.minimum || (spec.maximum >= 0 && node.operation > spec.maximum) { return xpath_value_fault(12); };
    xpath_apply_function(parameters,spec.kind,context,tree,graph,powers)
}

pub(crate) fn xpath_eval_binary_finish(left: XPathValue, right: XPathValue, operation: i32, tree: &XmlTree, graph: &XPathGraph, powers: &XPathPowers) -> XPathValue {
    if operation >= 3 && operation <= 8 { return xpath_values_compare(&left,&right,operation,tree,graph,powers); };
    if operation == 14 {
        if left.kind != XPATH_KIND_NODES || right.kind != XPATH_KIND_NODES { return xpath_value_fault(11); };
        if left.state != 0 { return left; }; if right.state != 0 { return right; };
        let a = XPathNodes { values: left.nodes.values }; let b = XPathNodes { values: right.nodes.values };
        let merged = xpath_nodes_merge(a,&b,tree);
        return xpath_value_nodes(XPathSequence { values: merged.values, cyclic: false, cycle: 0 });
    };
    xpath_binary_arithmetic(left,right,operation,tree,graph,powers)
}

pub(crate) fn xpath_eval_append(input: XPathValue, node: XPathReference) -> XPathValue {
    let mut values = input.nodes.values; values.push(node);
    xpath_value_nodes(XPathSequence { values, cyclic: false, cycle: 0 })
}

fn xpath_eval_depth(input: XPathEvalHeader, depth: i32) -> XPathEvalHeader {
    XPathEvalHeader { kind: input.kind, root: input.root, context: input.context, mode: input.mode, bound: input.bound, depth, cells: input.cells, index: input.index, cursor: input.cursor, step: input.step, minimum: input.minimum, maximum: input.maximum, matched: input.matched, visited: input.visited, position_range: input.position_range }
}

fn xpath_eval_depth_fault(depth: i32, count: i32, declared_limit: i32) -> i32 {
    let mut limit = declared_limit; if limit <= 0 { limit = XPATH_MIN_RECURSION_LIMIT; };
    if count > 0 && (depth > limit || count > limit-depth) {
        if declared_limit <= 0 { return 4; }; return -26;
    };
    0
}

pub(crate) fn xpath_eval_stack_child(input: XPathEvalStack, task: XPathEvalTask, depth: i32, cells: i32) -> XPathEvalStack {
    let header = xpath_eval_cells(xpath_eval_depth(task.header,depth),cells);
    xpath_eval_stack_push(input,xpath_eval_task(header,task.input,task.output,task.parameters,task.predicates))
}

fn xpath_eval_cells(input: XPathEvalHeader, cells: i32) -> XPathEvalHeader {
    XPathEvalHeader { kind: input.kind, root: input.root, context: input.context, mode: input.mode, bound: input.bound, depth: input.depth, cells, index: input.index, cursor: input.cursor, step: input.step, minimum: input.minimum, maximum: input.maximum, matched: input.matched, visited: input.visited, position_range: input.position_range }
}

pub(crate) fn xpath_eval_push_value(input: XPathValue, cells: i32) -> XPathValue {
    if input.state >= 0 && input.state <= 1 && input.kind > 0 && cells >= XPATH_VALUE_STACK_LIMIT { return xpath_value_fault(15); };
    input
}
