#[derive(Clone)]
struct XPathAxisWindow { sequence: XPathSequence, visited: i32, bounded: bool }

fn xpath_window_stop(tree: &XmlTree, current: XPathReference, bound: XPathReference, mode: i32, visited: i32) -> bool {
    if xpath_reference_equal(current,bound) { return true; };
    if visited%256 != 0 { return false; };
    if mode == 2 { return xpath_reference_order(tree,bound,current) <= 0; };
    xpath_reference_order(tree,current,bound) <= 0
}

fn xpath_window_descendant(graph: &XPathGraph, context: XPathReference, current: XPathReference, started: bool) -> XPathReference {
    let absent = XPathReference { kind: -1, node: 0, index: 0 };
    if started == false {
        if context.kind != 0 { return absent; };
        let child = graph.nodes[context.node].first;
        if child > 0 { return xpath_reference_node(child); }; return absent;
    };
    if current.kind != 0 { return absent; };
    let child = graph.nodes[current.node].first;
    let mut cursor = current.node;
    if child > 0 && graph.nodes[child].kind != 14 {
        cursor = child;
        if graph.nodes[child].kind != 6 { return xpath_reference_node(child); };
    };
    if cursor == context.node { return absent; };
    while graph.nodes[cursor].next > 0 {
        cursor = graph.nodes[cursor].next;
        if graph.nodes[cursor].kind != 14 && graph.nodes[cursor].kind != 6 { return xpath_reference_node(cursor); };
    }
    while cursor > 0 {
        cursor = graph.nodes[cursor].parent;
        if cursor == context.node { return absent; };
        let next = graph.nodes[cursor].next;
        if next > 0 { return xpath_reference_node(next); };
    }
    absent
}

fn xpath_window_candidates(tree: &XmlTree, graph: &XPathGraph, context: XPathReference, axis: i32) -> XPathNodes {
    if axis != 1 && axis != 5 && axis != 6 && axis != 9 && axis != 10 { return xpath_local_axis(tree,context,axis); };
    let mut result = xpath_nodes_empty();
    if context.kind < 0 { return result; };
    if axis == 5 || axis == 6 {
        let mut current = context; let mut started = false;
        if axis == 6 { result = xpath_nodes_push(result,current); started = true; };
        let mut scanning = true;
        while scanning {
            current = xpath_window_descendant(graph,context,current,started); started = true;
            if current.kind < 0 { scanning = false; } else { result = xpath_nodes_push(result,current); };
        }
        return result;
    };
    if context.kind != 0 || (context.node == 0 && axis != 1) { return result; };
    let mut cursor: usize = 0;
    if axis == 1 { cursor = graph.nodes[context.node].first; };
    if axis == 9 { cursor = graph.nodes[context.node].next; };
    if axis == 10 { cursor = graph.nodes[context.node].previous; };
    while cursor > 0 {
        result = xpath_nodes_push(result,xpath_reference_node(cursor));
        if axis == 10 {
            cursor = graph.nodes[cursor].previous;
            if cursor > 0 && graph.nodes[cursor].kind == 6 { cursor = graph.nodes[cursor].previous; };
        } else { cursor = graph.nodes[cursor].next; };
    }
    result
}

fn xpath_axis_window(tree: &XmlTree, graph: &XPathGraph, context: XPathReference, axis: i32, test: &XPathNodeTest, mode: i32, bound: XPathReference, visited: i32, maximum: i32) -> XPathAxisWindow {
    let mut active = false;
    if mode == 2 { active = axis == 1 || axis == 5 || axis == 6 || axis == 9 || axis == 11; };
    if mode == 3 { active = axis == 4 || axis == 7 || axis == 8 || axis == 10 || axis == 12; };
    if bound.kind < 0 || active == false {
        return XPathAxisWindow { sequence: xpath_graph_axis_test(tree,graph,context,axis,test), visited, bounded: false };
    };
    let mut values: Vec<XPathReference> = Vec::new(); let mut total = visited;
    if axis == 11 || axis == 12 {
        let mut visits: Vec<XPathVisit> = Vec::new(); let mut index: usize = 0;
        while index < graph.nodes.len() { visits.push(XPathVisit { node: 0, ancestor: 0, offset: 0 }); index += 1; }
        let ancestor = graph.nodes[context.node].parent;
        let mut cursor = XPathCursor { node: context.node, ancestor, started: false, done: false };
        while cursor.done == false {
            if axis == 11 { cursor = xpath_graph_following(graph,cursor); }
            else { cursor = xpath_graph_preceding(graph,cursor); };
            if cursor.done == false {
                let current = xpath_reference_node(cursor.node);
                if xpath_window_stop(tree,current,bound,mode,total) {
                    return XPathAxisWindow { sequence: XPathSequence { values, cyclic: false, cycle: 0 }, visited: total, bounded: true };
                };
                total = total+1;
                let previous = visits[cursor.node];
                if previous.node == cursor.node && previous.ancestor == cursor.ancestor {
                    return XPathAxisWindow { sequence: XPathSequence { values, cyclic: true, cycle: previous.offset }, visited: total, bounded: true };
                };
                visits[cursor.node] = XPathVisit { node: cursor.node, ancestor: cursor.ancestor, offset: values.len() };
                if xpath_node_matches(tree,test,current) { values.push(current); };
                if maximum > 0 && values.len() as i32 >= maximum {
                    return XPathAxisWindow { sequence: XPathSequence { values, cyclic: false, cycle: 0 }, visited: total, bounded: true };
                };
            };
        }
    } else {
        let candidates = xpath_window_candidates(tree,graph,context,axis);
        let mut index: usize = 0; let mut finished = false;
        while index < candidates.values.len() && finished == false {
            let current = candidates.values[index]; let mut eligible = true;
            if axis == 1 && test.kind == 1 { eligible = xpath_reference_type(tree,current) == 1; };
            if eligible {
                if xpath_window_stop(tree,current,bound,mode,total) { finished = true; }
                else { total = total+1; if xpath_node_matches(tree,test,current) { values.push(current); }; if maximum > 0 && values.len() as i32 >= maximum { finished = true; }; };
            };
            index += 1;
        }
    };
    XPathAxisWindow { sequence: XPathSequence { values, cyclic: false, cycle: 0 }, visited: total, bounded: true }
}
