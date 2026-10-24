#[derive(Clone, Copy)]
struct XPathCursor { node: usize, ancestor: usize, started: bool, done: bool }

#[derive(Clone, Copy)]
struct XPathVisit { node: usize, ancestor: usize, offset: usize }

#[derive(Clone)]
struct XPathSequence { values: Vec<XPathReference>, cyclic: bool, cycle: usize }

#[derive(Clone, Copy)]
struct XPathSelection { value: XPathReference, known: bool }

fn xpath_graph_following(graph: &XPathGraph, input: XPathCursor) -> XPathCursor {
    let current = graph.nodes[input.node];
    if input.started && current.first > 0 {
        return XPathCursor { node: current.first, ancestor: input.ancestor, started: true, done: false };
    };
    let mut cursor = input.node;
    while cursor > 0 {
        let next = graph.nodes[cursor].next;
        if next > 0 { return XPathCursor { node: next, ancestor: input.ancestor, started: true, done: false }; };
        cursor = graph.nodes[cursor].parent;
    }
    XPathCursor { node: 0, ancestor: input.ancestor, started: true, done: true }
}

fn xpath_graph_preceding(graph: &XPathGraph, input: XPathCursor) -> XPathCursor {
    if input.node == 0 { return XPathCursor { node: 0, ancestor: input.ancestor, started: true, done: true }; };
    let mut cursor = input.node;
    let mut ancestor = input.ancestor;
    let previous = graph.nodes[cursor].previous;
    if previous > 0 && graph.nodes[previous].kind == 6 { cursor = previous; };
    while graph.nodes[cursor].previous == 0 {
        cursor = graph.nodes[cursor].parent;
        if cursor == 0 || cursor == graph.nodes[0].first {
            return XPathCursor { node: 0, ancestor, started: true, done: true };
        };
        if cursor != ancestor { return XPathCursor { node: cursor, ancestor, started: true, done: false }; };
        ancestor = graph.nodes[cursor].parent;
    }
    cursor = graph.nodes[cursor].previous;
    let mut last = graph.nodes[cursor].last;
    while last > 0 { cursor = last; last = graph.nodes[cursor].last; }
    XPathCursor { node: cursor, ancestor, started: true, done: false }
}

fn xpath_graph_axis_test(tree: &XmlTree, graph: &XPathGraph, context: XPathReference, axis: i32, test: &XPathNodeTest) -> XPathSequence {
    if axis != 11 && axis != 12 {
        let candidates = xpath_window_candidates(tree,graph,context,axis);
        let mut found = xpath_nodes_empty(); let mut index: usize = 0;
        while index < candidates.values.len() {
            let value = candidates.values[index];
            if xpath_node_matches(tree,test,value) { found = xpath_nodes_push(found,value); };
            index += 1;
        }
        return XPathSequence { values: found.values, cyclic: false, cycle: 0 };
    };
    let mut values: Vec<XPathReference> = Vec::new();
    if context.kind < 0 { return XPathSequence { values, cyclic: false, cycle: 0 }; };
    let mut visited: Vec<XPathVisit> = Vec::new();
    let mut index: usize = 0;
    while index < graph.nodes.len() {
        visited.push(XPathVisit { node: 0, ancestor: 0, offset: 0 }); index += 1;
    }
    let ancestor = graph.nodes[context.node].parent;
    let mut cursor = XPathCursor { node: context.node, ancestor, started: false, done: false };
    while cursor.done == false {
        if axis == 11 { cursor = xpath_graph_following(graph,cursor); }
        else { cursor = xpath_graph_preceding(graph,cursor); };
        if cursor.done == false {
            let previous = visited[cursor.node];
            if previous.node == cursor.node && previous.ancestor == cursor.ancestor {
                return XPathSequence { values, cyclic: true, cycle: previous.offset };
            };
            visited[cursor.node] = XPathVisit { node: cursor.node, ancestor: cursor.ancestor, offset: values.len() };
            let value = xpath_reference_node(cursor.node);
            if xpath_node_matches(tree,test,value) { values.push(value); };
        };
    }
    XPathSequence { values, cyclic: false, cycle: 0 }
}

fn xpath_sequence_position(input: &XPathSequence, position: i32) -> XPathSelection {
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    if position <= 0 { return XPathSelection { value: absent, known: true }; };
    let requested = position-1;
    let mut index = usize::try_from(requested).unwrap_or(0);
    if index >= input.values.len() && input.cyclic {
        let count = input.values.len() as i32;
        let first = input.cycle as i32;
        let length = count-first;
        if length > 0 {
            let reduced = first+(requested-first)%length;
            index = usize::try_from(reduced).unwrap_or(0);
        } else { return XPathSelection { value: absent, known: false }; };
    };
    if index >= input.values.len() { return XPathSelection { value: absent, known: true }; };
    XPathSelection { value: input.values[index], known: true }
}
