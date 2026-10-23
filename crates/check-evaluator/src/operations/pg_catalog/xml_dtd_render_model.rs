#[derive(Clone, Copy)]
struct XmlTreeModelNode { name: XmlSpan, kind: i32, left: usize, right: usize, repeat: i32 }
#[derive(Clone)]
struct XmlTreeModel { nodes: Vec<XmlTreeModelNode>, root: usize, next: usize }

fn xml_tree_model_repeat(inner: i32, outer: i32) -> i32 {
    if outer == 0 { return inner; };
    if inner == 0 { return outer; };
    if inner == outer { return inner; };
    2
}

pub(crate) fn xml_tree_model_parse(source: &XmlSource, start: usize, input: Vec<XmlTreeModelNode>) -> XmlTreeModel {
    let mut parsed = XmlTreeModel { nodes: input, root: 0, next: start };
    let mut position = xml_skip_space(source,start);
    let mut root: usize = 0;
    if source.characters[position] == '(' {
        let first = xml_tree_model_parse(source,position+1,parsed.nodes);
        parsed = first; root = parsed.root; position = xml_skip_space(source,parsed.next);
        while source.characters[position] != ')' {
            let mut kind: i32 = 1;
            if source.characters[position] == '|' { kind = 2; };
            let child = xml_tree_model_parse(source,position+1,parsed.nodes);
            let mut nodes = child.nodes;
            let next = nodes.len();
            let empty = XmlSpan { start: 0, end: 0 };
            nodes.push(XmlTreeModelNode { name: empty, kind, left: root, right: child.root, repeat: 0 });
            root = next; position = xml_skip_space(source,child.next);
            parsed = XmlTreeModel { nodes, root, next: position };
        }
        position += 1;
    } else {
        let begin = position;
        if xml_at(source,position,"#PCDATA") { position += 7; }
        else { let name = xml_name(source,position); position = name.next; };
        let mut nodes = parsed.nodes;
        root = nodes.len();
        let name = XmlSpan { start: begin, end: position };
        nodes.push(XmlTreeModelNode { name, kind: 0, left: 0, right: 0, repeat: 0 });
        parsed = XmlTreeModel { nodes, root, next: position };
    };
    let mut repeat: i32 = 0;
    if position < source.characters.len() {
        if source.characters[position] == '?' { repeat = 1; }
        else if source.characters[position] == '*' { repeat = 2; }
        else if source.characters[position] == '+' { repeat = 3; };
    };
    if repeat > 0 {
        let mut nodes = parsed.nodes;
        let previous = nodes[root];
        let combined = xml_tree_model_repeat(previous.repeat,repeat);
        nodes[root] = XmlTreeModelNode { name: previous.name, kind: previous.kind, left: previous.left, right: previous.right, repeat: combined };
        position += 1;
        parsed = XmlTreeModel { nodes, root, next: position };
    };
    XmlTreeModel { nodes: parsed.nodes, root, next: position }
}

fn xml_tree_model_write(source: &XmlSource, model: &XmlTreeModel, index: usize, parent: i32, root: bool) -> String {
    let node = model.nodes[index];
    let bracket = root || (node.kind != 0 && (node.kind != parent || node.repeat != 0));
    let mut output = String::new();
    if bracket { output.push('('); };
    if node.kind == 0 {
        let name = xml_source_range(source,node.name); output.push_str(name.as_str());
    } else {
        let left = xml_tree_model_write(source,model,node.left,node.kind,false);
        let right = xml_tree_model_write(source,model,node.right,node.kind,false);
        output.push_str(left.as_str());
        if node.kind == 1 { output.push_str(" , "); } else { output.push_str(" | "); };
        output.push_str(right.as_str());
    };
    if bracket { output.push(')'); };
    if node.repeat == 1 { output.push('?'); };
    if node.repeat == 2 { output.push('*'); };
    if node.repeat == 3 { output.push('+'); };
    output
}

fn xml_tree_dtd_model(source: &XmlSource, start: usize) -> String {
    if xml_at(source,start,"EMPTY") { return "EMPTY".to_owned(); };
    if xml_at(source,start,"ANY") { return "ANY".to_owned(); };
    let nodes: Vec<XmlTreeModelNode> = Vec::new();
    let model = xml_tree_model_parse(source,start,nodes);
    xml_tree_model_write(source,&model,model.root,0,true)
}
