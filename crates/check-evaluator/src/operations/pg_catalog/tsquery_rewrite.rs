fn tsquery_rewrite_match(input: TsqueryRewriteTree, root: usize, target: usize, replacement: usize, utf8: bool) -> TsqueryRewriteTree {
    let node = input.nodes[root].clone();
    let pattern = input.nodes[target].clone();
    if node.frozen || node.value.kind != pattern.value.kind { return TsqueryRewriteTree {nodes:input.nodes,root:root,known:true}; };
    if node.children.len() == pattern.children.len() {
        if tsquery_rewrite_equal(&input,root,target) { return TsqueryRewriteTree {nodes:input.nodes,root:replacement,known:true}; };
    } else if node.children.len() > pattern.children.len() && pattern.children.len() > 0 {
        let mut matched: Vec<usize> = Vec::new();
        let mut index: usize = 0;
        while index < node.children.len() { matched.push(0); index += 1; }
        let mut member: usize = 0;
        while member < pattern.children.len() {
            index = 0;
            let mut found = false;
            while index < node.children.len() && found == false {
                if matched[index] == 0 && tsquery_rewrite_equal(&input,node.children[index],pattern.children[member]) {
                    matched[index] = 1;
                    found = true;
                };
                index += 1;
            }
            if found == false { return TsqueryRewriteTree {nodes:input.nodes,root:root,known:true}; };
            member += 1;
        }
        let mut children: Vec<usize> = Vec::new();
        index = 0;
        while index < node.children.len() {
            if matched[index] == 0 { children.push(node.children[index]); };
            index += 1;
        }
        if replacement != 0 { children.push(replacement); };
        let mut nodes = input.nodes;
        nodes[root] = TsqueryRewriteNode {value:node.value,children:children,frozen:false};
        let tree = TsqueryRewriteTree {nodes:nodes,root:root,known:true};
        return tsquery_rewrite_sort_tree(tree,root,utf8);
    };
    TsqueryRewriteTree {nodes:input.nodes,root:root,known:true}
}

fn tsquery_rewrite_visit(input: TsqueryRewriteTree, root: usize, target: usize, replacement: usize, utf8: bool) -> TsqueryRewriteTree {
    let mut tree = input;
    let mut results: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < tree.nodes.len() { results.push(0); index += 1; }
    let mut tasks: Vec<TsqueryRewriteTask> = Vec::new();
    tasks.push(TsqueryRewriteTask {node:root,finish:false});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        if task.finish {
            let node = tree.nodes[task.node].clone();
            let mut children: Vec<usize> = Vec::new();
            index = 0;
            while index < node.children.len() {
                let child = results[node.children[index]];
                if child != 0 { children.push(child); };
                index += 1;
            }
            if children.len() == 0 { results[task.node] = 0; }
            else if children.len() == 1 && node.value.kind != 1 { results[task.node] = children[0]; }
            else {
                results[task.node] = task.node;
                let mut nodes = tree.nodes;
                nodes[task.node] = TsqueryRewriteNode {value:node.value,children:children,frozen:node.frozen};
                tree = TsqueryRewriteTree {nodes:nodes,root:root,known:true};
            };
        } else {
            tree = tsquery_rewrite_match(tree,task.node,target,replacement,utf8);
            if tree.known == false { return tree; };
            let node = tree.nodes[task.node].clone();
            if tree.root != task.node || node.frozen || node.value.kind == 0 { results[task.node] = tree.root; }
            else {
                let finish = TsqueryRewriteTask {node:task.node,finish:true};
                if depth < tasks.len() { tasks[depth] = finish; } else { tasks.push(finish); };
                depth += 1;
                index = node.children.len();
                while index > 0 {
                    index = index - 1;
                    let child = TsqueryRewriteTask {node:node.children[index],finish:false};
                    if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                    depth += 1;
                }
            };
        };
    }
    TsqueryRewriteTree {nodes:tree.nodes,root:results[root],known:true}
}

fn tsquery_rewrite_binary(input: TsqueryRewriteTree) -> TsqueryRewriteTree {
    let root = input.root;
    let mut nodes = input.nodes;
    let mut visited: Vec<usize> = Vec::new();
    let mut position: usize = 0;
    while position < nodes.len() { visited.push(0); position += 1; }
    let mut tasks: Vec<TsqueryRewriteTask> = Vec::new();
    tasks.push(TsqueryRewriteTask {node:root,finish:false});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        let node = nodes[task.node].clone();
        if task.finish {
            visited[task.node] = 1;
            let mut children = node.children;
            let mut count = children.len();
            while count > 2 {
                let mut pair: Vec<usize> = Vec::new();
                pair.push(children[0]); pair.push(children[1]);
                let next = nodes.len();
                nodes.push(TsqueryRewriteNode {value:TsqueryNode {kind:node.value.kind,text:String::new(),weight:0,prefix:false,distance:0,left:0,right:0},children:pair,frozen:false});
                children[0] = next;
                children[1] = children[count-1];
                count = count - 1;
            }
            let mut output: Vec<usize> = Vec::new();
            let mut index: usize = 0;
            while index < count { output.push(children[index]); index += 1; }
            nodes[task.node] = TsqueryRewriteNode {value:node.value,children:output,frozen:node.frozen};
        } else if visited[task.node] == 0 {
            let finish = TsqueryRewriteTask {node:task.node,finish:true};
            if depth < tasks.len() { tasks[depth] = finish; } else { tasks.push(finish); };
            depth += 1;
            let mut index = node.children.len();
            while index > 0 {
                index = index - 1;
                let child = TsqueryRewriteTask {node:node.children[index],finish:false};
                if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                depth += 1;
            }
        };
    }
    TsqueryRewriteTree {nodes:nodes,root:root,known:true}
}

#[derive(Clone, Copy)]
struct TsqueryRewriteSize { count: i64, pool: i64 }

fn tsquery_rewrite_output(tree: &TsqueryRewriteTree) -> TsqueryValue {
    if tree.root == 0 { return make_tsquery_value(make_tsquery_payload(8)); };
    let mut sizes: Vec<TsqueryRewriteSize> = Vec::new();
    let mut index: usize = 0;
    while index < tree.nodes.len() { sizes.push(TsqueryRewriteSize {count:0i64,pool:0i64}); index += 1; }
    let mut tasks: Vec<TsqueryRewriteTask> = Vec::new();
    tasks.push(TsqueryRewriteTask {node:tree.root,finish:false});
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        let node = tree.nodes[task.node].clone();
        if task.finish {
            let mut count: i64 = 1i64;
            let mut pool: i64 = 0i64;
            if node.value.kind == 0 { pool = (tsvector_lexeme_bytes(node.value.text.as_str()) as i64) + 1i64; };
            index = 0;
            while index < node.children.len() {
                let child = sizes[node.children[index]];
                count = count + child.count;
                pool = pool + child.pool;
                index += 1;
            }
            if 8i64 + 12i64 * count + pool > 1073741823i64 { return TsqueryValue::Error(make_sql_error(TSQUERY_PROGRAM_LIMIT)); };
            sizes[task.node] = TsqueryRewriteSize {count:count,pool:pool};
        } else if sizes[task.node].count == 0i64 {
            let finish = TsqueryRewriteTask {node:task.node,finish:true};
            if depth < tasks.len() { tasks[depth] = finish; } else { tasks.push(finish); };
            depth += 1;
            index = 0;
            while index < node.children.len() {
                let child = TsqueryRewriteTask {node:node.children[index],finish:false};
                if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                depth += 1;
                index += 1;
            }
        };
    }
    let mut nodes: Vec<TsqueryNode> = Vec::new();
    let mut roots: Vec<usize> = Vec::new();
    let mut count: usize = 0;
    depth = 1;
    tasks[0] = TsqueryRewriteTask {node:tree.root,finish:false};
    while depth > 0 {
        depth = depth - 1;
        let task = tasks[depth];
        let node = tree.nodes[task.node].clone();
        if task.finish {
            let mut left: usize = 0;
            let mut right: usize = 0;
            if node.value.kind == 1 { count = count - 1; left = roots[count]; }
            else if node.value.kind > 1 { count = count - 2; left = roots[count]; right = roots[count+1]; };
            let root = nodes.len();
            nodes.push(TsqueryNode {kind:node.value.kind,text:node.value.text,weight:node.value.weight,prefix:node.value.prefix,distance:node.value.distance,left:left,right:right});
            if count < roots.len() { roots[count] = root; } else { roots.push(root); };
            count += 1;
        } else {
            let finish = TsqueryRewriteTask {node:task.node,finish:true};
            if depth < tasks.len() { tasks[depth] = finish; } else { tasks.push(finish); };
            depth += 1;
            index = 0;
            while index < node.children.len() {
                let child = TsqueryRewriteTask {node:node.children[index],finish:false};
                if depth < tasks.len() { tasks[depth] = child; } else { tasks.push(child); };
                depth += 1;
                index += 1;
            }
        };
    }
    tsquery_rebuild(TsqueryPayload {nodes:nodes,root:roots[0],native_bytes:-1})
}

pub fn sql__pg_catalog__ts_rewrite__2hpb(input: TsqueryValue, target: TsqueryValue, replacement: TsqueryValue, utf8: bool) -> TsqueryValue {
    if let TsqueryValue::Error(error) = input { return TsqueryValue::Error(error); };
    if let TsqueryValue::Error(error) = target { return TsqueryValue::Error(error); };
    if let TsqueryValue::Error(error) = replacement { return TsqueryValue::Error(error); };
    if let TsqueryValue::Unknown = input { return TsqueryValue::Unknown; };
    if let TsqueryValue::Unknown = target { return TsqueryValue::Unknown; };
    if let TsqueryValue::Unknown = replacement { return TsqueryValue::Unknown; };
    if let TsqueryValue::Null = input { return TsqueryValue::Null; };
    if let TsqueryValue::Null = target { return TsqueryValue::Null; };
    if let TsqueryValue::Null = replacement { return TsqueryValue::Null; };
    if let TsqueryValue::Value(a) = input {
        if let TsqueryValue::Value(b) = target {
            if let TsqueryValue::Value(c) = replacement {
                if a.nodes.len() == 0 || b.nodes.len() == 0 { return TsqueryValue::Value(a); };
                let empty: Vec<usize> = Vec::new();
                let mut nodes: Vec<TsqueryRewriteNode> = Vec::new();
                nodes.push(TsqueryRewriteNode {value:TsqueryNode {kind:0,text:String::new(),weight:0,prefix:false,distance:0,left:0,right:0},children:empty,frozen:false});
                let initial = TsqueryRewriteTree {nodes:nodes,root:0,known:true};
                let mut tree = tsquery_rewrite_import(initial,a,true,utf8);
                if tree.known == false { return TsqueryValue::Unknown; };
                let root = tree.root;
                tree = tsquery_rewrite_import(tree,b,true,utf8);
                if tree.known == false { return TsqueryValue::Unknown; };
                let pattern = tree.root;
                let mut subst: usize = 0;
                if c.nodes.len() != 0 {
                    tree = tsquery_rewrite_import(tree,c,false,utf8);
                    subst = tree.root;
                    let mut nodes = tree.nodes;
                    let node = nodes[subst].clone();
                    nodes[subst] = TsqueryRewriteNode {value:node.value,children:node.children,frozen:true};
                    tree = TsqueryRewriteTree {nodes:nodes,root:root,known:true};
                };
                tree = tsquery_rewrite_visit(tree,root,pattern,subst,utf8);
                if tree.known == false { return TsqueryValue::Unknown; };
                if tree.root == 0 { return make_tsquery_value(make_tsquery_payload(8)); };
                tree = tsquery_rewrite_binary(tree);
                return tsquery_rewrite_output(&tree);
            };
        };
    };
    TsqueryValue::Unknown
}
